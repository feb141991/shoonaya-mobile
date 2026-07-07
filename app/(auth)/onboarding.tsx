import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, registerUserId } from '@/lib/notifications';

type Step = 'tradition' | 'language' | 'notifications';

const TRADITIONS = [
  { key: 'hindu', label: 'Hindu', emoji: '🕉️' },
  { key: 'sikh', label: 'Sikh', emoji: '☬' },
  { key: 'buddhist', label: 'Buddhist', emoji: '☸️' },
  { key: 'jain', label: 'Jain', emoji: '🌀' },
] as const;

type TraditionKey = (typeof TRADITIONS)[number]['key'];

const LANGUAGES = [
  { key: 'en', label: 'English', native: 'English' },
  { key: 'hi', label: 'Hindi', native: 'हिन्दी' },
] as const;

type LanguageKey = (typeof LANGUAGES)[number]['key'];

const STEPS: Step[] = ['tradition', 'language', 'notifications'];

export default function OnboardingScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

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
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 32 }}>
        {/* ── Step 1: Tradition ──────────────────────────────── */}
        {step === 'tradition' && (
          <>
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>
                Your tradition
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: dim }}>
                Shoonaya adapts its guidance to your path. Choose your tradition.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {TRADITIONS.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => { void handleTradition(t.key); }}
                  style={{
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: tradition === t.key ? COLORS.brandGold : border,
                    backgroundColor: tradition === t.key ? cardBg : 'transparent',
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 16,
                      color: tradition === t.key ? COLORS.brandGold : text,
                    }}
                  >
                    {t.label}
                  </Text>
                  {tradition === t.key ? (
                    <View style={{ marginLeft: 'auto' }}>
                      <Feather name="check-circle" size={20} color={COLORS.brandGold} />
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Step 2: Language ───────────────────────────────── */}
        {step === 'language' && (
          <>
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>
                Your language
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: dim }}>
                Choose how you want meanings and explanations displayed.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {LANGUAGES.map((l) => (
                <Pressable
                  key={l.key}
                  onPress={() => { void handleLanguage(l.key); }}
                  style={{
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: language === l.key ? COLORS.brandGold : border,
                    backgroundColor: language === l.key ? cardBg : 'transparent',
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 16,
                        color: language === l.key ? COLORS.brandGold : text,
                      }}
                    >
                      {l.label}
                    </Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, marginTop: 2 }}>
                      {l.native}
                    </Text>
                  </View>
                  {language === l.key ? (
                    <Feather name="check-circle" size={20} color={COLORS.brandGold} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Step 3: Notifications ──────────────────────────── */}
        {step === 'notifications' && (
          <>
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>
                Daily reminders
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: dim }}>
                Receive your daily shloka, streak nudges, and community mentions. You can always adjust this later in Settings.
              </Text>
            </View>

            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 20,
                gap: 14,
              }}
            >
              {[
                { icon: 'book-open' as const, label: 'Daily shloka notification' },
                { icon: 'zap' as const, label: 'Streak reminders' },
                { icon: 'users' as const, label: 'Mandali mentions' },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Feather name={item.icon} size={18} color={COLORS.brandGold} />
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: text }}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => { void handleAllowNotifications(); }}
              disabled={saving}
              style={{
                borderRadius: 22,
                backgroundColor: COLORS.brandGold,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: COLORS.ink }}>
                  Allow notifications
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => { void complete(false); }}
              disabled={saving}
              style={{ paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: dim }}>
                Not now
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Continue button (steps 1 and 2) */}
      {step !== 'notifications' ? (
        <Pressable
          onPress={() => { void goNext(); }}
          style={{
            borderRadius: 22,
            backgroundColor: COLORS.brandGold,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: COLORS.ink }}>
            Continue
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
