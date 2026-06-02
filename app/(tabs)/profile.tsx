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
import { Screen } from '@/components/ui/Screen';
import { API_BASE, COLORS, FONTS } from '@/lib/constants';
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

type DailySadhana = {
  streak_count: number | null;
  japa_done?: boolean | null;
  quiz_done?: boolean | null;
  nitya_done?: boolean | null;
  pathshala_done?: boolean | null;
  dharmveer_done?: boolean | null;
};

type EditState = {
  fullName: string;
  tradition: Tradition;
  appLanguage: AppLanguage;
};

const INITIAL_EDIT: EditState = {
  fullName: '',
  tradition: 'hindu',
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
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [todaySadhana, setTodaySadhana] = useState<DailySadhana | null>(null);
  const [bestStreak, setBestStreak] = useState(0);
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const [profileRes, todayRes, streakRows] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, tradition, app_language, active_symbol_id, seva_score, is_pro, subscription_status')
        .eq('id', user.id)
        .single(),
      supabase
        .from('daily_sadhana')
        .select('streak_count, japa_done, quiz_done, nitya_done, pathshala_done, dharmveer_done')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('daily_sadhana')
        .select('streak_count')
        .eq('user_id', user.id)
        .order('streak_count', { ascending: false })
        .limit(1),
    ]);

    const nextProfile = profileRes.data
      ? ({
          id: profileRes.data.id,
          full_name: profileRes.data.full_name,
          tradition: (profileRes.data.tradition ?? 'hindu') as Tradition,
          app_language: (profileRes.data.app_language ?? 'en') as AppLanguage,
          active_symbol_id: profileRes.data.active_symbol_id,
          seva_score: profileRes.data.seva_score ?? 0,
          is_pro: profileRes.data.is_pro ?? false,
          subscription_status: profileRes.data.subscription_status ?? 'free',
        } satisfies ProfileData)
      : null;

    setProfile(nextProfile);
    setTodaySadhana(todayRes.data ?? null);
    setBestStreak(streakRows.data?.[0]?.streak_count ?? 0);

    if (nextProfile) {
      setEditState({
        fullName: nextProfile.full_name,
        tradition: nextProfile.tradition,
        appLanguage: nextProfile.app_language,
      });
    }
  }, [router]);

  useEffect(() => {
    loadProfile()
      .catch(() => {
        Alert.alert('Could not load profile');
      })
      .finally(() => setLoading(false));
  }, [loadProfile]);

  const streak = todaySadhana?.streak_count ?? 0;
  const unlockedRelics = useMemo(() => {
    if (!profile) return [];
    return getUnlockedRelics(streak, profile.seva_score, profile.tradition);
  }, [profile, streak]);
  const activeRelic = useMemo(
    () => SACRED_RELICS.find((relic) => relic.id === profile?.active_symbol_id) ?? null,
    [profile?.active_symbol_id]
  );

  const completionPcts = useMemo(() => {
    const values = [
      todaySadhana?.japa_done,
      todaySadhana?.quiz_done,
      todaySadhana?.nitya_done,
      todaySadhana?.pathshala_done,
      todaySadhana?.dharmveer_done,
    ];
    const doneCount = values.filter(Boolean).length;
    const total = values.length;
    return {
      sadhana: Math.round((doneCount / total) * 100),
      japa: todaySadhana?.japa_done ? 100 : 0,
      study: todaySadhana?.pathshala_done ? 100 : 0,
      quiz: todaySadhana?.quiz_done ? 100 : 0,
    };
  }, [todaySadhana]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editState.fullName.trim(),
          tradition: editState.tradition,
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
          <ActivityIndicator color={COLORS.brandGold} />
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

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
            {[
              ['Streak', `${streak} days`],
              ['Seva', `${profile.seva_score}`],
              ['Best streak', `${bestStreak} days`],
              ['Relics', `${unlockedRelics.length}`],
            ].map(([label, value]) => (
              <View key={label} style={{ width: '50%', gap: 4 }}>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>{label}</Text>
                <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22 }}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 12 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>{"Today's completion"}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ProgressRing label="Overall" value={completionPcts.sadhana} accent={COLORS.brandGold} textColor={theme.text} dimColor={theme.dim} />
            <ProgressRing label="Japa" value={completionPcts.japa} accent={COLORS.brandGold} textColor={theme.text} dimColor={theme.dim} />
            <ProgressRing label="Study" value={completionPcts.study} accent={COLORS.brandGold} textColor={theme.text} dimColor={theme.dim} />
            <ProgressRing label="Quiz" value={completionPcts.quiz} accent={COLORS.brandGold} textColor={theme.text} dimColor={theme.dim} />
          </View>
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

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {(Object.keys(TRADITION_META) as Tradition[]).map((tradition) => {
                const active = editState.tradition === tradition;
                return (
                  <Pressable
                    key={tradition}
                    onPress={() => setEditState((current) => ({ ...current, tradition }))}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? COLORS.brandGold : theme.border,
                      backgroundColor: active ? COLORS.brandGold : theme.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                      {TRADITION_META[tradition].emoji} {TRADITION_META[tradition].label}
                    </Text>
                  </Pressable>
                );
              })}
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
