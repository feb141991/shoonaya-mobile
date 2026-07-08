import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { getUnlockedRelics, SACRED_RELICS } from '@/lib/relics';
import { supabase } from '@/lib/supabase';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';
type AppLanguage = 'en' | 'hi' | 'pa';

type ProfileData = {
  id: string;
  full_name: string;
  tradition: Tradition;
  app_language: AppLanguage;
  active_symbol_id: string | null;
  seva_score: number;
  is_pro: boolean;
  subscription_status: 'free' | 'pro' | 'kul_pro' | 'grace' | 'expired';
};

type EditState = {
  fullName: string;
  appLanguage: AppLanguage;
};

type ProgressSummary = {
  profile: {
    id: string;
    fullName: string;
    tradition: Tradition;
    appLanguage: AppLanguage;
    activeSymbolId: string | null;
    sevaScore: number;
    isPro: boolean;
    subscriptionStatus: ProfileData['subscription_status'];
  };
  completion: {
    pct: number;
    missing: string[];
  };
  progress: {
    practices: {
      completed: number;
      total: number;
    };
    streaks: {
      shloka: number;
      bestShloka: number;
      nitya: number;
      bestNitya: number;
    };
    pathshala: {
      completedLessons: number;
    };
    quiz: {
      doneToday: boolean;
    };
  };
};

const INITIAL_EDIT: EditState = {
  fullName: '',
  appLanguage: 'en',
};

const TRADITION_META: Record<Tradition, { label: string; emoji: string }> = {
  hindu: { label: 'Hindu', emoji: '🕉️' },
  sikh: { label: 'Sikh', emoji: '☬' },
  buddhist: { label: 'Buddhist', emoji: '☸️' },
  jain: { label: 'Jain', emoji: '卐' },
};

function ProgressRing({
  label,
  value,
  accent,
  textColor,
  dimColor,
}: {
  label: string;
  value: number;
  accent: string;
  textColor: string;
  dimColor: string;
}) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const dash = circumference - (pct / 100) * circumference;

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Svg width={64} height={64}>
        <Circle cx={32} cy={32} r={radius} stroke={dimColor} strokeWidth={6} fill="none" opacity={0.25} />
        <Circle
          cx={32}
          cy={32}
          r={radius}
          stroke={accent}
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          rotation="-90"
          origin="32,32"
        />
      </Svg>
      <View style={{ position: 'absolute', top: 18, alignItems: 'center' }}>
        <Text style={{ color: textColor, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{pct}%</Text>
      </View>
      <Text style={{ color: dimColor, fontFamily: FONTS.sansMedium, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [editState, setEditState] = useState<EditState>(INITIAL_EDIT);

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
    }),
    [isDark]
  );

  const loadProfile = useCallback(async () => {
    const response = await apiFetch('/api/native/progress-summary');

    if (response.status === 401) {
      router.replace('/(auth)/login');
      return;
    }

    if (!response.ok) {
      throw new Error('Could not load progress summary');
    }

    const payload = (await response.json()) as ProgressSummary;
    setSummary(payload);

    const nextProfile: ProfileData = {
      id: payload.profile.id,
      full_name: payload.profile.fullName,
      tradition: payload.profile.tradition,
      app_language: payload.profile.appLanguage,
      active_symbol_id: payload.profile.activeSymbolId,
      seva_score: payload.profile.sevaScore,
      is_pro: payload.profile.isPro,
      subscription_status: payload.profile.subscriptionStatus,
    };

    setProfile(nextProfile);

    if (nextProfile) {
      setEditState({
        fullName: nextProfile.full_name,
        appLanguage: nextProfile.app_language,
      });
    }
  }, [router]);

  useEffect(() => {
    setLoadError(false);
    loadProfile()
      .catch(() => {
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [loadProfile]);

  const streak = summary?.progress?.streaks?.shloka ?? 0;
  const unlockedRelics = useMemo(() => {
    if (!profile) return [];
    return getUnlockedRelics(streak, profile.seva_score, profile.tradition);
  }, [profile, streak]);
  const activeRelic = useMemo(
    () => SACRED_RELICS.find((relic) => relic.id === profile?.active_symbol_id) ?? null,
    [profile?.active_symbol_id]
  );

  const progressData = summary?.progress;
  const profileCompletion = summary?.completion;

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // tradition is locked at signup — never include it in updates, matching
      // web's ProfileClient.tsx saveProfile() (`const { tradition: _locked,
      // ... } = form`). Editing it post-onboarding would silently desync
      // tradition-dependent personalization (sacred text selection, Nitya
      // Karma step content, hero theme, festival/observance filtering)
      // across the app without re-running any of the onboarding logic that
      // normally sets those up.
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editState.fullName.trim(),
          app_language: editState.appLanguage,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await loadProfile();
      setEditVisible(false);
    } catch {
      Alert.alert('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (loading || !profile) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {loadError ? (
            <EmptyState
              icon="wifi-off"
              title="Could not load profile"
              subtitle="Check your connection, then try again."
              ctaLabel="Retry"
              onCta={() => {
                setLoading(true);
                setLoadError(false);
                loadProfile()
                  .catch(() => setLoadError(true))
                  .finally(() => setLoading(false));
              }}
            />
          ) : (
            <ActivityIndicator color={COLORS.brandGold} />
          )}
        </View>
      </Screen>
    );
  }

  const traditionMeta = TRADITION_META[profile.tradition];
  const relicImage = activeRelic ? `${API_BASE}${activeRelic.imageUrl}` : null;

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 16 }}>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: theme.text }}>Profile</Text>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: COLORS.brandGold,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.serifBold, fontSize: 28 }}>
                {profile.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{profile.full_name}</Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: theme.bg,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                  {traditionMeta.emoji} {traditionMeta.label}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setEditVisible(true)}>
              <Feather name="edit-3" size={18} color={theme.dim} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/kosh')}
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.bg,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {relicImage ? (
              <Image source={{ uri: relicImage }} style={{ width: 52, height: 52, borderRadius: 16 }} />
            ) : (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: COLORS.brandGold,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="star" size={20} color={COLORS.ink} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                {activeRelic?.name ?? 'No active relic'}
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                Tap to open Kosh
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme.dim} />
          </Pressable>
        </Card>

        {profileCompletion && profileCompletion.pct < 100 ? (
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ProgressRing label="" value={profileCompletion.pct} accent={COLORS.brandGold} textColor={theme.text} dimColor={theme.dim} />
                <View>
                  <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2 }}>Profile strength</Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, marginTop: 4 }}>
                    Add: {profileCompletion.missing.slice(0, 2).join(', ')}{profileCompletion.missing.length > 2 ? ` +${profileCompletion.missing.length - 2} more` : ''}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Complete profile"
                onPress={() => router.push('/settings')}
                style={{
                  borderRadius: 20,
                  backgroundColor: COLORS.brandGold,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Complete</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 20 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>Progress Hub</Text>

          {progressData ? (
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ProgressRing
                  label="Practices"
                  value={progressData.practices.total > 0 ? Math.round((progressData.practices.completed / progressData.practices.total) * 100) : 0}
                  accent={COLORS.brandGold}
                  textColor={theme.text}
                  dimColor={theme.dim}
                />
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{streak}</Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 11 }}>Streak</Text>
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{profile.seva_score}</Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 11 }}>Seva</Text>
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>{progressData.streaks.bestShloka}</Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 11 }}>Best Streak</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, marginTop: 8 }}>
                <View style={{ width: '50%', gap: 4 }}>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>Nitya Streak</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22 }}>{progressData.streaks.nitya} {progressData.streaks.nitya === 1 ? 'day' : 'days'}</Text>
                </View>
                <View style={{ width: '50%', gap: 4 }}>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>Best Nitya</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22 }}>{progressData.streaks.bestNitya} {progressData.streaks.bestNitya === 1 ? 'day' : 'days'}</Text>
                </View>
                <View style={{ width: '50%', gap: 4 }}>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>Pathshala</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22 }}>{progressData.pathshala.completedLessons} {progressData.pathshala.completedLessons === 1 ? 'lesson' : 'lessons'}</Text>
                </View>
                <View style={{ width: '50%', gap: 4 }}>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>Quiz</Text>
                  <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22 }}>
                    {progressData.quiz.doneToday ? 'Done today' : 'Not started'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <ActivityIndicator color={COLORS.brandGold} />
          )}
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>
                {profile.is_pro ? 'Pro active' : 'Free plan'}
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                Status: {profile.subscription_status}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/settings')}
              style={{
                borderRadius: 18,
                backgroundColor: COLORS.brandGold,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                {profile.is_pro ? 'Manage plan' : 'Upgrade to Pro'}
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          {[
            ['Settings', '/settings'],
            ['Mandali', '/mandali'],
          ].map(([label, route]) => (
            <Pressable
              key={label}
              onPress={() => router.push(route as '/settings' | '/mandali')}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                paddingHorizontal: 16,
                paddingVertical: 15,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>{label}</Text>
              <Feather name="chevron-right" size={18} color={theme.dim} />
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => {
            void handleSignOut();
          }}
          disabled={signingOut}
          style={{
            marginTop: 4,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: signingOut ? 0.7 : 1,
          }}
        >
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              gap: 14,
            }}
          >
            <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 26 }}>Edit profile</Text>

            <TextInput
              value={editState.fullName}
              onChangeText={(fullName) => setEditState((current) => ({ ...current, fullName }))}
              placeholder="Name"
              placeholderTextColor={theme.dim}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.bg,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: theme.text,
                fontFamily: FONTS.sans,
              }}
            />

            {/* Tradition — locked. Matches web's ProfileClient.tsx: chosen once
                at onboarding, never editable afterward (drives sacred text
                selection, Nitya Karma content, hero theme, and festival
                filtering app-wide, so silently changing it post-onboarding
                would desync personalization the rest of the app assumes is
                stable). Read-only display, not a Pressable — no tap target
                to avoid implying it can be changed here. */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>Spiritual tradition</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Feather name="lock" size={10} color={COLORS.brandGold} />
                  <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>Secured</Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
                accessible
                accessibilityLabel={`Spiritual tradition: ${TRADITION_META[profile.tradition].label}. Locked after onboarding.`}
              >
                <Text style={{ fontSize: 22 }}>{TRADITION_META[profile.tradition].emoji}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                  {TRADITION_META[profile.tradition].label}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['en', 'hi', 'pa'] as AppLanguage[]).map((language) => {
                const active = editState.appLanguage === language;
                return (
                  <Pressable
                    key={language}
                    onPress={() => setEditState((current) => ({ ...current, appLanguage: language }))}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: active ? COLORS.brandGold : theme.border,
                      backgroundColor: active ? COLORS.brandGold : theme.bg,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                      {language.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Pressable
                onPress={() => setEditVisible(false)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleSave();
                }}
                disabled={saving}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor: COLORS.brandGold,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
