import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { COLORS, FONTS, RADII, SHADOWS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, registerUserId } from '@/lib/notifications';

type Step = 'tradition' | 'language' | 'notifications';

// Short, factual tags — not theological claims — describing the kind of
// content each tradition unlocks elsewhere in the app (mantras/panchang:
// app/(tabs)/bhakti.tsx, app/panchang.tsx; daily sadhana: app/nitya-karma.tsx),
// so this reads as real app content, not invented marketing copy.
const TRADITIONS = [
  { key: 'hindu', label: 'Hindu', icon: 'sun' as const, description: 'Mantras, panchang and daily sadhana' },
  { key: 'sikh', label: 'Sikh', icon: 'book-open' as const, description: 'Gurbani, nitnem and daily practice' },
  { key: 'buddhist', label: 'Buddhist', icon: 'circle' as const, description: 'Sutras, mindfulness and daily practice' },
  { key: 'jain', label: 'Jain', icon: 'droplet' as const, description: 'Sutras, tattva and daily practice' },
] as const;

type TraditionKey = (typeof TRADITIONS)[number]['key'];

const LANGUAGES = [
  { key: 'en', label: 'English', native: 'English' },
  { key: 'hi', label: 'Hindi', native: 'हिन्दी' },
] as const;

type LanguageKey = (typeof LANGUAGES)[number]['key'];

const STEPS: Step[] = ['tradition', 'language', 'notifications'];

const STEP_EYEBROW: Record<Step, string> = {
  tradition: 'Step 1 of 3',
  language: 'Step 2 of 3',
  notifications: 'Step 3 of 3',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const wellBg = isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight;
  const wellBgSelected = COLORS.selectionWellSelected;
  const cardShadow = isDark ? SHADOWS.sm.dark : SHADOWS.sm.light;

  const [step, setStep] = useState<Step>('tradition');
  const [tradition, setTradition] = useState<TraditionKey>('hindu');
  const [language, setLanguage] = useState<LanguageKey>('en');
  const [saving, setSaving] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const handleTradition = async (key: TraditionKey) => {
    setTradition(key);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  const handleLanguage = async (key: LanguageKey) => {
    setLanguage(key);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  const goNext = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    if (step === 'tradition') {
      setStep('language');
      return;
    }

    if (step === 'language') {
      setStep('notifications');
      return;
    }

    // Final step — notifications + save profile
    await complete(false);
  };

  const handleAllowNotifications = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    await requestNotificationPermission();
    await complete(true);
  };

  const complete = async (notificationsRequested: boolean) => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            tradition,
            app_language: language,
            meaning_language: language,
            // Canonical completion field the routing gate in _layout.tsx and
            // auth/callback.tsx checks (matches web's profiles.onboarding_completed,
            // NOT NULL DEFAULT false — see ONBOARDING_REDIRECT_LOOP_FOLLOWUP.md).
            onboarding_completed: true,
          },
          { onConflict: 'id' }
        );

        registerUserId(user.id);
      }
    } catch {
      // Non-fatal — let the user into the app anyway
    }

    setSaving(false);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    router.replace('/(tabs)');
  };

  return (
    <Screen style={{ backgroundColor: bg }}>
      {/* Progress dots */}
      <View
        accessible
        accessibilityLabel={STEP_EYEBROW[step]}
        style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}
      >
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 999,
              backgroundColor: i <= stepIndex ? COLORS.brandGold : border,
            }}
          />
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 24, paddingBottom: 32 }}
      >
        {/* ── Step 1: Tradition ──────────────────────────────── */}
        {step === 'tradition' && (
          <>
            <View style={{ gap: 10 }}>
              <SectionHeader label={STEP_EYEBROW.tradition} />
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>
                Your tradition
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
                Shoonaya adapts its guidance to your path. Choose your tradition.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {TRADITIONS.map((t) => {
                const selected = tradition === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => { void handleTradition(t.key); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${t.label}, ${t.description}`}
                    style={{
                      borderRadius: RADII.lg,
                      borderWidth: 1.5,
                      borderColor: selected ? COLORS.brandGold : border,
                      backgroundColor: selected ? cardBg : 'transparent',
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      boxShadow: selected ? cardShadow : undefined,
                    }}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? wellBgSelected : wellBg,
                      }}
                    >
                      <Feather name={t.icon} size={20} color={selected ? COLORS.brandGold : dim} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemiBold,
                          fontSize: 16,
                          color: selected ? COLORS.brandGold : text,
                        }}
                      >
                        {t.label}
                      </Text>
                      <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                        {t.description}
                      </Text>
                    </View>
                    {selected ? <Feather name="check-circle" size={20} color={COLORS.brandGold} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Step 2: Language ───────────────────────────────── */}
        {step === 'language' && (
          <>
            <View style={{ gap: 10 }}>
              <SectionHeader label={STEP_EYEBROW.language} />
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>
                Your language
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
                Choose how you want meanings and explanations displayed.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {LANGUAGES.map((l) => {
                const selected = language === l.key;
                return (
                  <Pressable
                    key={l.key}
                    onPress={() => { void handleLanguage(l.key); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${l.label}, ${l.native}`}
                    style={{
                      borderRadius: RADII.lg,
                      borderWidth: 1.5,
                      borderColor: selected ? COLORS.brandGold : border,
                      backgroundColor: selected ? cardBg : 'transparent',
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      boxShadow: selected ? cardShadow : undefined,
                    }}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? wellBgSelected : wellBg,
                      }}
                    >
                      <Feather name="globe" size={19} color={selected ? COLORS.brandGold : dim} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemiBold,
                          fontSize: 16,
                          color: selected ? COLORS.brandGold : text,
                        }}
                      >
                        {l.label}
                      </Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, marginTop: 2 }}>
                        {l.native}
                      </Text>
                    </View>
                    {selected ? <Feather name="check-circle" size={20} color={COLORS.brandGold} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Step 3: Notifications ──────────────────────────── */}
        {step === 'notifications' && (
          <>
            <View style={{ gap: 10 }}>
              <SectionHeader label={STEP_EYEBROW.notifications} />
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>
                Daily reminders
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
                Receive your daily shloka, streak nudges, and community mentions. You can always adjust this later in Settings.
              </Text>
            </View>

            <View
              style={{
                borderRadius: RADII.xl,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 20,
                gap: 16,
              }}
            >
              {[
                { icon: 'book-open' as const, label: 'Daily shloka notification' },
                { icon: 'zap' as const, label: 'Streak reminders' },
                { icon: 'users' as const, label: 'Mandali mentions' },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: wellBg,
                    }}
                  >
                    <Feather name={item.icon} size={16} color={COLORS.brandGold} />
                  </View>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: text }}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ gap: 10 }}>
              <Button
                label="Allow notifications"
                onPress={() => { void handleAllowNotifications(); }}
                disabled={saving}
                loading={saving}
              />
              <Button
                label="Not now"
                variant="ghost"
                onPress={() => { void complete(false); }}
                disabled={saving}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Continue button (steps 1 and 2) */}
      {step !== 'notifications' ? (
        <Button label="Continue" onPress={() => { void goNext(); }} style={{ marginTop: 16 }} />
      ) : null}
    </Screen>
  );
}
