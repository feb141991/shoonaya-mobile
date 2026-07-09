import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

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
  kul_id: string | null;
  kul_name: string | null;
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
  const [reportLoading, setReportLoading] = useState(false);
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

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('kul_id, kuls(name)')
      .eq('id', payload.profile.id)
      .single();

    const kulName = profileRow?.kuls ? (profileRow.kuls as any).name : null;

    const nextProfile: ProfileData = {
      id: payload.profile.id,
      full_name: payload.profile.fullName,
      tradition: payload.profile.tradition,
      app_language: payload.profile.appLanguage,
      active_symbol_id: payload.profile.activeSymbolId,
      seva_score: payload.profile.sevaScore,
      is_pro: payload.profile.isPro,
      subscription_status: payload.profile.subscriptionStatus,
      kul_id: profileRow?.kul_id ?? null,
      kul_name: kulName,
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

  const inviteCode = useMemo(() => profile ? profile.id.replace(/-/g, '').slice(0, 8).toUpperCase() : '', [profile]);

  const copyInvite = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert('Copied', 'Your invite code is copied to clipboard.');
  };

  const shareWhatsApp = async () => {
    const text = `Join me on Shoonaya. Use my invite code: ${inviteCode}`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        await Sharing.shareAsync(API_BASE, { dialogTitle: 'Share Shoonaya' });
      }
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  const downloadReport = async () => {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      const res = await apiFetch('/api/user/report');
      if (!res.ok) throw new Error('Could not generate report');
      const data = await res.json();
      
      const tradition = data.profile?.tradition ?? 'hindu';
      const tEmoji = TRADITION_META[tradition as Tradition]?.emoji ?? '🙏';

      const formatMins = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
      const heatmapHtml = (data.heatmap ?? []).map((d: any) => {
        const level = d.nitya >= 7 ? '#d4a030' : d.nitya > 0 ? '#d4a03066' : d.japa ? '#7B1A1A66' : '#e5e7eb';
        return `<div title="${d.date}" style="width:18px;height:18px;border-radius:4px;background:${level}"></div>`;
      }).join('');
      const mantrasHtml = (data.japa?.top_mantras ?? []).map(([name, count]: [string, number]) =>
        `<li>${name} — <strong>${count}</strong> session${count !== 1 ? 's' : ''}</li>`
      ).join('');

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Sadhana Report – ${data.profile?.name}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f5ef; color: #2c2a25; padding: 24px; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 24px; font-weight: 700; color: #1c1c1a; }
  h2 { font-size: 15px; font-weight: 700; color: #7B1A1A; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  .card { background: #fff; border-radius: 16px; padding: 18px; margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.07); box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
  .meta { font-size: 13px; color: #888; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .stat { text-align: center; padding: 12px; background: #fef9ef; border-radius: 12px; border: 1px solid rgba(197, 160, 89,0.2); }
  .stat .num { font-size: 28px; font-weight: 800; color: #c8920a; }
  .stat .label { font-size: 11px; color: #888; margin-top: 3px; }
  .heatmap { display: flex; flex-wrap: wrap; gap: 3px; }
  ul { padding-left: 18px; font-size: 14px; line-height: 2; }
  .badge { display: inline-block; background: rgba(197, 160, 89,0.15); color: #7B1A1A; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; margin-left: 8px; }
  .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
</style>
</head>
<body>
<div style="margin-bottom:20px">
  <h1>${tEmoji} Sadhana Report</h1>
  <p class="meta">${data.profile?.name} · ${data.period?.from} to ${data.period?.to}</p>
</div>

<div class="card">
  <h2>Japa</h2>
  <div class="grid">
    <div class="stat"><div class="num">${data.japa?.sessions ?? 0}</div><div class="label">Sessions</div></div>
    <div class="stat"><div class="num">${data.japa?.total_malas ?? 0}</div><div class="label">Malas (108 beads)</div></div>
    <div class="stat"><div class="num">${formatMins(data.japa?.duration_minutes ?? 0)}</div><div class="label">Time in Japa</div></div>
  </div>
  ${mantrasHtml ? '<ul style="margin-top:12px">' + mantrasHtml + '</ul>' : ''}
</div>

<div class="card">
  <h2>Nitya Karma</h2>
  <div class="grid">
    <div class="stat"><div class="num">${data.nitya?.active_days ?? 0}</div><div class="label">Active days</div></div>
    <div class="stat"><div class="num">${data.nitya?.full_days ?? 0}</div><div class="label">Full sequences</div></div>
    <div class="stat"><div class="num">${data.nitya?.current_streak ?? 0}</div><div class="label">Current streak</div></div>
  </div>
  <p style="font-size:13px;color:#888;margin-top:10px">Longest streak in period: <strong>${data.nitya?.longest_streak ?? 0} days</strong></p>
</div>

<div class="card">
  <h2>30-Day Heatmap</h2>
  <div class="heatmap">${heatmapHtml}</div>
  <div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:#888">
    <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#d4a030;margin-right:4px;vertical-align:middle"></span>Full Nitya</span>
    <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#d4a03066;margin-right:4px;vertical-align:middle"></span>Partial Nitya</span>
    <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#7B1A1A66;margin-right:4px;vertical-align:middle"></span>Japa only</span>
  </div>
</div>

<div class="card">
  <h2>Community</h2>
  <div class="grid">
    <div class="stat"><div class="num">${data.community?.posts ?? 0}</div><div class="label">Posts</div></div>
    <div class="stat"><div class="num">${data.community?.threads ?? 0}</div><div class="label">Discussions started</div></div>
  </div>
</div>

<div class="footer">Generated by Shoonaya</div>
</body>
</html>`;

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'Your device does not support saving or sharing this file.');
        return;
      }

      const targetFile = new FileSystem.File(FileSystem.Paths.cache, 'sadhana-report.html');
      targetFile.write(html);
      await Sharing.shareAsync(targetFile.uri);
    } catch {
      Alert.alert('Error', 'Could not generate report.');
    } finally {
      setReportLoading(false);
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

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>
                {profile.kul_id ? profile.kul_name : 'Join your Kul'}
              </Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                {profile.kul_id ? 'Lineage & community' : 'Connect with your heritage'}
              </Text>
            </View>
            <Pressable
              onPress={() => Alert.alert('Coming Soon', 'Kul features are coming soon.')}
              style={{
                borderRadius: 18,
                backgroundColor: COLORS.brandGold,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                {profile.kul_id ? 'Invite' : 'Join'}
              </Text>
            </Pressable>
          </View>
        </Card>

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
          <View>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>
              Invite Friends
            </Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, marginTop: 4 }}>
              Share your invite code: <Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.text }}>{inviteCode}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => { void shareWhatsApp(); }}
              style={{
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#25D366',
                backgroundColor: 'rgba(37,211,102,0.1)',
                paddingVertical: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Feather name="message-circle" size={18} color="#25D366" />
              <Text style={{ color: '#25D366', fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>WhatsApp</Text>
            </Pressable>
            <Pressable
              onPress={() => { void copyInvite(); }}
              style={{
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.bg,
                paddingVertical: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Feather name="copy" size={18} color={theme.text} />
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Copy Link</Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => { void downloadReport(); }}
            disabled={reportLoading}
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
              opacity: reportLoading ? 0.7 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Feather name="pie-chart" size={18} color={theme.text} />
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                {reportLoading ? 'Generating...' : 'Sadhana Report'}
              </Text>
            </View>
            {reportLoading ? <ActivityIndicator size="small" color={theme.dim} /> : <Feather name="download" size={18} color={theme.dim} />}
          </Pressable>
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

        <View style={{ marginTop: 24, alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable onPress={async () => {
              const url = `${API_BASE}/terms`;
              try {
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) throw new Error('Cannot open URL');
                await Linking.openURL(url);
              } catch {
                Alert.alert('Error', 'Could not open Terms of Service.');
              }
            }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Terms</Text>
            </Pressable>
            <Pressable onPress={async () => {
              const url = `${API_BASE}/privacy`;
              try {
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) throw new Error('Cannot open URL');
                await Linking.openURL(url);
              } catch {
                Alert.alert('Error', 'Could not open Privacy Policy.');
              }
            }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Privacy</Text>
            </Pressable>
          </View>
          <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11 }}>Shoonaya · Built with 🙏</Text>
        </View>
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
