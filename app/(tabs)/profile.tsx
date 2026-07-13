import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { decode } from 'base64-arraybuffer';

import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { Screen } from '@/components/ui/Screen';
import { API_BASE, COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { getUnlockedRelics, SACRED_RELICS } from '@/lib/relics';
import { supabase } from '@/lib/supabase';
import {
  getIshtaDevataLabel,
  getSampradayaLabel,
  ISHTA_DEVATAS_BY_TRADITION,
  SAMPRADAYAS_BY_TRADITION,
} from '@/lib/traditions';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';
type AppLanguage = 'en' | 'hi' | 'pa';

type ProfileData = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  tradition: Tradition;
  sampradaya: string;
  ishta_devata: string;
  city: string;
  country: string;
  life_stage: string;
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
  sampradaya: string;
  ishtaDevata: string;
  appLanguage: AppLanguage;
};

type ProgressSummary = {
  profile: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    tradition: Tradition;
    sampradaya: string;
    ishtaDevata: string;
    city: string;
    country: string;
    lifeStage: string;
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
    highlights: {
      totalBeads: number;
      totalRounds: number;
      totalMinutes: number;
      totalSessions: number;
      topMantra: string | null;
      nityaDays: number;
      pathshalaEntriesOpened: number;
      bookmarkedVerses: number;
    };
  };
};

type KulRelation = { name: string | null } | { name: string | null }[] | null;

type ReportHeatmapDay = {
  date?: string;
  nitya?: number;
  japa?: boolean;
};

const INITIAL_EDIT: EditState = {
  fullName: '',
  sampradaya: '',
  ishtaDevata: '',
  appLanguage: 'en',
};

const TRADITION_META: Record<Tradition, { label: string; emoji: string }> = {
  hindu: { label: 'Hindu', emoji: '🕉️' },
  sikh: { label: 'Sikh', emoji: '☬' },
  buddhist: { label: 'Buddhist', emoji: '☸️' },
  jain: { label: 'Jain', emoji: '卐' },
};

const LIFE_STAGE_LABELS: Record<string, string> = {
  brahmacharya: 'Brahmacharya',
  grihastha: 'Grihastha',
  vanaprastha: 'Vanaprastha',
  sannyasa: 'Sannyasa',
};

function formatMinutes(totalMinutes: number) {
  if (totalMinutes >= 60) return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  return `${totalMinutes}m`;
}

function getSpiritualLevel(sevaScore: number) {
  if (sevaScore >= 500) return { label: 'Acharya', sanskrit: 'आचार्य', current: sevaScore, next: sevaScore };
  if (sevaScore >= 100) return { label: 'Shishya', sanskrit: 'शिष्य', current: sevaScore, next: 500 };
  return { label: 'Jigyasu', sanskrit: 'जिज्ञासु', current: sevaScore, next: 100 };
}

function resolveAvatarPath(url: string | null) {
  if (!url) return null;
  const marker = '/storage/v1/object/public/avatars/';
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0] ?? '');
}

function getKulName(kuls: KulRelation): string | null {
  if (Array.isArray(kuls)) {
    return kuls[0]?.name ?? null;
  }
  return kuls?.name ?? null;
}

async function readApiError(response: Response) {
  const body = await response.json().catch(() => null);
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error;
  }
  return `Request failed with status ${response.status}`;
}

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

function MetricTile({
  label,
  value,
  icon,
  onPress,
  theme,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  theme: ReturnType<typeof themeColor>;
}) {
  const content = (
    <>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: theme.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={icon} size={14} color={theme.brand} />
      </View>
      <Text style={{ ...TYPE.chip, color: theme.dim }}>{label}</Text>
      <Text numberOfLines={1} style={{ ...TYPE.label, color: theme.text }}>
        {value}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View
        style={{
          flex: 1,
          minWidth: 76,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.borderSoft,
          backgroundColor: theme.glass,
          padding: 10,
          alignItems: 'center',
          gap: 5,
        }}
      >
        {content}
      </View>
    );
  }

  return (
    <PressableSurface
      haptic="selection"
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 76,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.borderSoft,
        backgroundColor: theme.glass,
        padding: 10,
        alignItems: 'center',
        gap: 5,
      }}
    >
      {content}
    </PressableSurface>
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
  const [shareLoading, setShareLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [editState, setEditState] = useState<EditState>(INITIAL_EDIT);
  const [email, setEmail] = useState('');

  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const profileShareCardRef = useRef<View>(null);

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

    const { data: authData } = await supabase.auth.getUser();
    setEmail(authData.user?.email ?? '');

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('kul_id, kuls(name)')
      .eq('id', payload.profile.id)
      .single();

    const kulName = getKulName((profileRow?.kuls ?? null) as KulRelation);

    const nextProfile: ProfileData = {
      id: payload.profile.id,
      full_name: payload.profile.fullName,
      username: payload.profile.username,
      avatar_url: payload.profile.avatarUrl,
      tradition: payload.profile.tradition,
      sampradaya: payload.profile.sampradaya,
      ishta_devata: payload.profile.ishtaDevata,
      city: payload.profile.city,
      country: payload.profile.country,
      life_stage: payload.profile.lifeStage,
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
        sampradaya: nextProfile.sampradaya,
        ishtaDevata: nextProfile.ishta_devata,
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
  const sampradayaLabel = profile ? getSampradayaLabel(profile.tradition) : 'Sampradaya';
  const ishtaDevataLabel = profile ? getIshtaDevataLabel(profile.tradition) : 'Ishta Devata';
  const sampradayaOptions = profile ? SAMPRADAYAS_BY_TRADITION[profile.tradition] : [];
  const ishtaDevataOptions = profile ? ISHTA_DEVATAS_BY_TRADITION[profile.tradition] : [];

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
      const response = await apiFetch('/api/native/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: editState.fullName.trim(),
          sampradaya: editState.sampradaya || null,
          ishta_devata: editState.ishtaDevata || null,
          app_language: editState.appLanguage,
        }),
      });

      if (!response.ok) throw new Error('profile update failed');

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

  const updateAvatarUrl = async (avatarUrl: string | null) => {
    if (!profile) throw new Error('Profile is not loaded');

    const response = await apiFetch('/api/native/profile', {
      method: 'PATCH',
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });

    if (response.ok) return;

    const apiError = await readApiError(response);
    console.warn('[profile] avatar API save failed; falling back to RLS profile update', apiError);

    // The PWA still writes avatar_url directly under the user's own-row RLS
    // policy. Keep this fallback so installed native builds do not break when
    // the production API route has not deployed yet.
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profile.id);

    if (error) {
      throw new Error(`${apiError}; direct profile save failed: ${error.message}`);
    }
  };

  const pickAvatar = async () => {
    if (!profile || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.86,
        base64: true,
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) throw new Error('Could not read selected image');
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        throw new Error('Photo must be under 2 MB');
      }

      const contentType = asset.mimeType ?? 'image/jpeg';
      if (!contentType.startsWith('image/')) throw new Error('Please select an image file');
      const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const path = `${profile.id}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, decode(asset.base64), { contentType, upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      await updateAvatarUrl(publicUrl);
      setProfile((current) => current ? { ...current, avatar_url: `${publicUrl}?t=${Date.now()}` } : current);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update profile picture';
      Alert.alert('Photo update failed', message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!profile || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const path = resolveAvatarPath(profile.avatar_url);
      await updateAvatarUrl(null);
      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }
      setProfile((current) => current ? { ...current, avatar_url: null } : current);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not remove profile picture';
      Alert.alert('Photo removal failed', message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const openAvatarActions = () => {
    if (!profile || avatarUploading) return;

    Alert.alert('Profile picture', 'Choose how your public profile photo should appear.', [
      { text: 'Choose photo', onPress: () => { void pickAvatar(); } },
      ...(profile.avatar_url
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => { void removeAvatar(); } }]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const inviteCode = useMemo(() => profile ? profile.id.replace(/-/g, '').slice(0, 8).toUpperCase() : '', [profile]);
  const firstName = profile?.full_name.trim().split(' ')[0] || 'Seeker';
  const inviteLink = profile ? `${API_BASE}/invite/${inviteCode.toLowerCase()}` : API_BASE;
  const pathLabel = profile ? `${TRADITION_META[profile.tradition].label.toUpperCase()} PATH` : 'SHOONAYA PATH';

  const copyInvite = async () => {
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert('Copied', 'Your invite link is copied to clipboard.');
  };

  const shareWhatsApp = async () => {
    const text = `Join me on Shoonaya: ${inviteLink}`;
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

  const shareProfileCard = async () => {
    if (!profile || shareLoading) return;
    setShareLoading(true);
    try {
      const firstName = profile.full_name.trim().split(' ')[0] || 'Seeker';
      const parts: string[] = [];
      if (streak > 0) parts.push(`${streak}-day streak`);
      if (profile.seva_score > 0) parts.push(`${profile.seva_score} Seva`);
      const metricsStr = parts.length > 0 ? ` I have ${parts.join(' and ')}.` : '';
      const fallbackMessage = `${firstName} is on a spiritual journey on Shoonaya.${metricsStr} Join me.`;

      await shareCapturedShoonayaCard(profileShareCardRef, {
        fileName: 'shoonaya-journey-card.png',
        dialogTitle: 'Share your practice',
        fallbackMessage,
      });
    } finally {
      setShareLoading(false);
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
      const heatmap = Array.isArray(data.heatmap) ? (data.heatmap as ReportHeatmapDay[]) : [];
      const heatmapHtml = heatmap.map((day) => {
        const nityaCount = day.nitya ?? 0;
        const level = nityaCount >= 7 ? COLORS.brandGoldLight : nityaCount > 0 ? COLORS.brandSoftLight : day.japa ? COLORS.dangerBg : COLORS.borderLight;
        return `<div title="${day.date ?? ''}" style="width:18px;height:18px;border-radius:4px;background:${level}"></div>`;
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
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${COLORS.creamBg}; color: ${COLORS.ink}; padding: 24px; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 24px; font-weight: 700; color: ${COLORS.heroBgDark}; }
  h2 { font-size: 15px; font-weight: 700; color: ${COLORS.brandPrimaryStrongLight}; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  .card { background: ${COLORS.cardBgLight}; border-radius: 16px; padding: 18px; margin-bottom: 16px; border: 1px solid ${COLORS.borderSoftLight}; box-shadow: 0 1px 4px ${COLORS.borderSoftLight}; }
  .meta { font-size: 13px; color: ${COLORS.textDimLight}; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .stat { text-align: center; padding: 12px; background: ${COLORS.homeRaisedLight}; border-radius: 12px; border: 1px solid ${COLORS.homeBorderSoftLight}; }
  .stat .num { font-size: 28px; font-weight: 800; color: ${COLORS.brandPrimaryStrongLight}; }
  .stat .label { font-size: 11px; color: ${COLORS.textDimLight}; margin-top: 3px; }
  .heatmap { display: flex; flex-wrap: wrap; gap: 3px; }
  ul { padding-left: 18px; font-size: 14px; line-height: 2; }
  .badge { display: inline-block; background: ${COLORS.brandSoftLight}; color: ${COLORS.brandPrimaryStrongLight}; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; margin-left: 8px; }
  .footer { text-align: center; font-size: 11px; color: ${COLORS.textDimLight}; margin-top: 24px; }
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
  <p style="font-size:13px;color:${COLORS.textDimLight};margin-top:10px">Longest streak in period: <strong>${data.nitya?.longest_streak ?? 0} days</strong></p>
</div>

<div class="card">
  <h2>30-Day Heatmap</h2>
  <div class="heatmap">${heatmapHtml}</div>
  <div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:${COLORS.textDimLight}">
    <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${COLORS.brandGoldLight};margin-right:4px;vertical-align:middle"></span>Full Nitya</span>
    <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${COLORS.brandSoftLight};margin-right:4px;vertical-align:middle"></span>Partial Nitya</span>
    <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${COLORS.dangerBg};margin-right:4px;vertical-align:middle"></span>Japa only</span>
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
            <ActivityIndicator color={theme.brand} />
          )}
        </View>
      </Screen>
    );
  }

  const traditionMeta = TRADITION_META[profile.tradition];
  const relicImage = activeRelic ? `${API_BASE}${activeRelic.imageUrl}` : null;
  const unlockedCount = unlockedRelics.length;
  const visibleRelics = SACRED_RELICS.slice(0, 8);
  const totalVisibleRelics = SACRED_RELICS.length;
  const practicesPct = progressData?.practices.total
    ? Math.round((progressData.practices.completed / progressData.practices.total) * 100)
    : 0;
  const initials = profile.full_name.trim().slice(0, 1).toUpperCase() || 'S';
  const subscriptionLabel = profile.is_pro ? 'Pro Member' : 'Free Plan';
  const username = profile.username || profile.id.replace(/-/g, '').slice(0, 10);
  const spiritualLevel = getSpiritualLevel(profile.seva_score);
  const levelPct = spiritualLevel.next > spiritualLevel.current
    ? Math.max(0.08, Math.min(1, spiritualLevel.current / spiritualLevel.next))
    : 1;
  const nextLevelLabel = spiritualLevel.next > spiritualLevel.current ? spiritualLevel.next : spiritualLevel.current;
  const lifeStageLabel = profile.life_stage ? (LIFE_STAGE_LABELS[profile.life_stage] ?? profile.life_stage) : 'Ashrama';
  const highlights = progressData?.highlights;
  const avatarSource = profile.avatar_url
    ? { uri: profile.avatar_url }
    : relicImage
      ? { uri: relicImage }
      : null;

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 34, gap: 16 }}>
        <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.glass,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Feather name="chevron-left" size={24} color={theme.text} />
          </PressableSurface>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Open notifications"
              onPress={() => router.push('/notifications')}
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.glass,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              }}
            >
              <Feather name="message-square" size={21} color={theme.text} />
            </PressableSurface>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Open settings"
              onPress={() => router.push('/settings')}
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.glass,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              }}
            >
              <Feather name="settings" size={21} color={theme.text} />
            </PressableSurface>
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: 14, paddingTop: 4, paddingBottom: 6 }}>
          <View style={{ width: 142, height: 142, alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient
              colors={[theme.brand, theme.premiumBorder, theme.brand]}
              start={{ x: 0.05, y: 0.1 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                width: 140,
                height: 140,
                borderRadius: 70,
                opacity: isDark ? 0.88 : 1,
              }}
            />
            <View
              style={{
                width: 124,
                height: 124,
                borderRadius: 62,
                backgroundColor: theme.card,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: theme.accent,
              }}
            >
              {avatarSource ? (
                <Image source={avatarSource} style={{ width: 124, height: 124 }} />
              ) : (
                <Text style={{ color: theme.brand, fontFamily: FONTS.serifBold, fontSize: 48 }}>{initials}</Text>
              )}
            </View>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Change profile picture"
              onPress={openAvatarActions}
              disabled={avatarUploading}
              style={{
                position: 'absolute',
                right: 0,
                bottom: 6,
                width: 52,
                height: 52,
                borderRadius: 18,
                backgroundColor: theme.brand,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: theme.bg,
                boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
              }}
            >
              {avatarUploading ? (
                <ActivityIndicator color={COLORS.ink} size="small" />
              ) : (
                <Feather name="camera" size={20} color={COLORS.ink} />
              )}
            </PressableSurface>
          </View>

          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ ...TYPE.display, fontSize: 34, lineHeight: 40, color: theme.text, textAlign: 'center' }}>
                {profile.full_name}
              </Text>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Edit profile"
                onPress={() => setEditVisible(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: theme.glass,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="edit-3" size={18} color={theme.brand} />
              </PressableSurface>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              <Text style={{ ...TYPE.label, color: theme.brand, textTransform: 'uppercase', letterSpacing: 1.2 }}>@{username}</Text>
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  backgroundColor: profile.is_pro ? theme.brandSoft : theme.glass,
                  borderWidth: 1,
                  borderColor: profile.is_pro ? theme.premiumBorder : theme.borderSoft,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Feather name="star" size={13} color={profile.is_pro ? theme.brand : theme.dim} />
                <Text style={{ ...TYPE.chip, color: profile.is_pro ? theme.brand : theme.dim }}>{subscriptionLabel}</Text>
              </View>
            </View>
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.accent,
                paddingHorizontal: 18,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>{traditionMeta.emoji}</Text>
              <Text style={{ ...TYPE.label, color: theme.brand }}>
                {spiritualLevel.label} · {spiritualLevel.sanskrit}
              </Text>
            </View>
            <View style={{ width: 250, gap: 5, alignItems: 'center' }}>
              <View style={{ width: '100%', height: 3, borderRadius: 999, backgroundColor: theme.borderSoft, overflow: 'hidden' }}>
                <View style={{ width: `${levelPct * 100}%`, height: 3, borderRadius: 999, backgroundColor: theme.brand }} />
              </View>
              <Text style={{ ...TYPE.caption, color: theme.brand }}>
                {profile.seva_score} / {nextLevelLabel} Seva to {spiritualLevel.next > spiritualLevel.current ? spiritualLevel.label === 'Jigyasu' ? 'Shishya' : 'Acharya' : spiritualLevel.label}
              </Text>
            </View>
          </View>
        </View>

        <Card
          elevated
          tone="auto"
          style={{
            backgroundColor: theme.glass,
            borderColor: theme.premiumBorder,
            gap: 18,
            boxShadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ ...TYPE.section, color: theme.brand }}>Sadhana Highlights</Text>
            <Text style={{ ...TYPE.body, color: theme.dim }}>Lifelong practice at a glance</Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Beads', value: String(highlights?.totalBeads ?? 0), route: '/my-progress' as const },
              { label: 'Day Streak 🔥', value: String(streak), route: '/my-progress' as const },
              { label: 'Rounds', value: String(highlights?.totalRounds ?? 0), route: '/my-progress' as const },
              { label: 'In Practice', value: formatMinutes(highlights?.totalMinutes ?? 0), route: '/my-progress' as const },
              { label: 'Nitya Days', value: `${highlights?.nityaDays ?? 0}/30`, route: '/my-progress' as const },
              { label: 'Saved Verses', value: String(highlights?.bookmarkedVerses ?? 0), route: '/kosh' as const },
            ].map((item) => (
              <PressableSurface
                key={item.label}
                haptic="selection"
                accessibilityLabel={`${item.label}: ${item.value}`}
                onPress={() => router.push(item.route)}
                style={{
                  width: '47.8%',
                  minHeight: 92,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  backgroundColor: theme.glass,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 28 }}>{item.value}</Text>
                <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1.4, textAlign: 'center' }}>
                  {item.label}
                </Text>
              </PressableSurface>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ ...TYPE.body, color: theme.dim }}>
              Favourite mantra: <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold }}>{highlights?.topMantra ?? traditionMeta.emoji}</Text>
            </Text>
            <Text style={{ ...TYPE.body, color: theme.dim }}>
              Pathshala entries opened: <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold }}>{highlights?.pathshalaEntriesOpened ?? 0}</Text>
            </Text>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <MetricTile label="Streak" value={`${streak} 🔥`} icon="zap" onPress={() => router.push('/my-progress')} theme={theme} />
          <MetricTile label="Seva" value={String(profile.seva_score)} icon="heart" onPress={() => router.push('/my-progress')} theme={theme} />
          <MetricTile label="Relics" value={`${unlockedCount}/${totalVisibleRelics}`} icon="star" onPress={() => router.push('/kosh')} theme={theme} />
          <MetricTile label="Ashrama" value={lifeStageLabel} icon="sun" onPress={() => router.push('/settings')} theme={theme} />
        </View>

        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ ...TYPE.section, color: theme.brand }}>Sacred Kosh</Text>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Your relics</Text>
            </View>
            <PressableSurface haptic="selection" style={{ minHeight: 0 }} onPress={() => router.push('/kosh')}>
              <Text style={{ ...TYPE.label, color: theme.brand }}>View all</Text>
            </PressableSurface>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {visibleRelics.map((relic) => {
              const isUnlocked = unlockedRelics.some((item) => item.id === relic.id);
              const isActive = profile.active_symbol_id === relic.id;
              return (
                <PressableSurface
                  key={relic.id}
                  haptic="selection"
                  accessibilityLabel={`${relic.name}. ${isUnlocked ? 'Unlocked' : 'Locked'}`}
                  onPress={() => router.push('/kosh')}
                  style={{ minHeight: 0, width: 62, alignItems: 'center', gap: 7 }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      borderWidth: 1,
                      borderColor: isActive ? theme.brand : isUnlocked ? theme.premiumBorder : theme.borderSoft,
                      backgroundColor: isActive ? theme.brandSoft : theme.glass,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isUnlocked ? (
                      <Image source={{ uri: `${API_BASE}${relic.imageUrl}` }} style={{ width: 38, height: 38 }} />
                    ) : (
                      <Feather name="lock" size={15} color={theme.dim} />
                    )}
                  </View>
                  <Text numberOfLines={2} style={{ ...TYPE.chip, color: isUnlocked ? theme.dim : theme.border, textAlign: 'center' }}>
                    {relic.name}
                  </Text>
                </PressableSurface>
              );
            })}
          </ScrollView>
        </Card>

        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <ProgressRing
              label="Profile"
              value={profileCompletion?.pct ?? 100}
              accent={theme.brand}
              textColor={theme.text}
              dimColor={theme.dim}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...TYPE.section, color: theme.brand }}>Profile Strength</Text>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                {(profileCompletion?.pct ?? 100) >= 100 ? 'Complete profile' : 'Finish your profile'}
              </Text>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>
                {(profileCompletion?.missing.length ?? 0) > 0
                  ? `Add ${profileCompletion?.missing.slice(0, 2).join(', ')}${(profileCompletion?.missing.length ?? 0) > 2 ? ` +${(profileCompletion?.missing.length ?? 0) - 2} more` : ''}`
                  : 'Your core identity is ready.'}
              </Text>
            </View>
            {(profileCompletion?.pct ?? 100) < 100 ? (
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Complete profile"
                onPress={() => router.push('/settings')}
                style={{
                  minHeight: 44,
                  borderRadius: 22,
                  backgroundColor: theme.brand,
                  paddingHorizontal: 14,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: isDark ? COLORS.darkBg : COLORS.ink }}>Complete</Text>
              </PressableSurface>
            ) : null}
          </View>
        </Card>

        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ ...TYPE.section, color: theme.brand }}>Progress Hub</Text>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Sadhana momentum</Text>
            </View>
            <Text style={{ ...TYPE.caption, color: theme.dim }}>
              {progressData?.practices.completed ?? 0}/{progressData?.practices.total ?? 0} today
            </Text>
          </View>

          {progressData ? (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <ProgressRing label="Daily" value={practicesPct} accent={theme.brand} textColor={theme.text} dimColor={theme.dim} />
                <View style={{ flex: 1, gap: 8 }}>
                  {[
                    ['Best Shloka', `${progressData.streaks.bestShloka} days`],
                    ['Best Nitya', `${progressData.streaks.bestNitya} days`],
                    ['Pathshala', `${progressData.pathshala.completedLessons} lessons`],
                    ['Quiz', progressData.quiz.doneToday ? 'Done today' : 'Not started'],
                  ].map(([label, value]) => (
                    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>{label}</Text>
                      <Text style={{ ...TYPE.label, color: theme.text }}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <ActivityIndicator color={theme.brand} />
          )}
        </Card>

        <PressableSurface
          haptic="selection"
          accessibilityLabel={profile.kul_id ? `Invite to ${profile.kul_name ?? 'Kul'}` : 'Join your Kul'}
          onPress={() => Alert.alert('Coming Soon', 'Kul features are coming soon.')}
          style={{
            minHeight: 86,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.borderSoft,
            backgroundColor: theme.card,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: theme.glass,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="shield" size={20} color={theme.dim} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ ...TYPE.section, color: theme.dim }}>Lineage</Text>
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
              {profile.kul_id ? profile.kul_name : 'Join your Kul'}
            </Text>
            <Text style={{ ...TYPE.body, color: theme.dim }}>
              {profile.kul_id ? 'Lineage & community' : 'Connect with your ancestral lineage'}
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color={theme.text} />
        </PressableSurface>

        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="user-plus" size={22} color={theme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{firstName}, bring someone to the path</Text>
              <Text style={{ ...TYPE.body, color: theme.dim }}>Share Shoonaya with a friend or family member</Text>
            </View>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Invite someone to Shoonaya"
              onPress={() => { void shareWhatsApp(); }}
              style={{
                minHeight: 46,
                borderRadius: 18,
                backgroundColor: theme.brand,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Feather name="share-2" size={17} color={isDark ? COLORS.darkBg : COLORS.ink} />
              <Text style={{ ...TYPE.label, color: isDark ? COLORS.darkBg : COLORS.ink }}>Invite</Text>
            </PressableSurface>
          </View>
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Copy invite link"
            onPress={() => { void copyInvite(); }}
            style={{
              minHeight: 48,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              backgroundColor: theme.glass,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text style={{ ...TYPE.body, color: theme.dim }}>Your invite link:</Text>
            <Text numberOfLines={1} style={{ ...TYPE.label, color: theme.brand, flex: 1 }}>
              {inviteLink.replace(/^https?:\/\//, '')}
            </Text>
          </PressableSurface>
        </Card>

        <Card
          elevated
          tone="auto"
          style={{
            backgroundColor: theme.glass,
            borderColor: theme.premiumBorder,
            alignItems: 'center',
            gap: 18,
            paddingVertical: 28,
          }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              backgroundColor: theme.brandSoft,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Text style={{ fontSize: 28 }}>{traditionMeta.emoji}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ ...TYPE.cardHeading, color: theme.text, textAlign: 'center' }}>{profile.full_name}</Text>
            <Text style={{ ...TYPE.section, color: theme.dim, textAlign: 'center' }}>
              {streak}-day streak · {profile.seva_score} seva · {pathLabel}
            </Text>
          </View>
          <View style={{ width: '100%', height: 1, backgroundColor: theme.borderSoft }} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Share journey card"
              onPress={() => { void shareProfileCard(); }}
              disabled={shareLoading}
              style={{
                width: 76,
                minHeight: 78,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: COLORS.whatsAppBorder,
                backgroundColor: COLORS.whatsAppBg,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {shareLoading ? <ActivityIndicator color={COLORS.whatsApp} /> : <Feather name="message-circle" size={24} color={COLORS.whatsApp} />}
              <Text style={{ ...TYPE.chip, color: theme.dim }}>WhatsApp</Text>
            </PressableSurface>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Share journey card"
              onPress={() => { void shareProfileCard(); }}
              disabled={shareLoading}
              style={{
                width: 76,
                minHeight: 78,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.glass,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Feather name="twitter" size={24} color={theme.text} />
              <Text style={{ ...TYPE.chip, color: theme.dim }}>X / Twitter</Text>
            </PressableSurface>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Copy profile invite link"
              onPress={() => { void copyInvite(); }}
              style={{
                width: 76,
                minHeight: 78,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Feather name="link" size={24} color={theme.brand} />
              <Text style={{ ...TYPE.chip, color: theme.dim }}>Copy Link</Text>
            </PressableSurface>
          </View>
        </Card>

        <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ ...TYPE.body, color: theme.dim }}>Connected email</Text>
              <Text numberOfLines={2} style={{ ...TYPE.cardHeading, color: theme.text }}>
                {email || 'Email unavailable'}
              </Text>
            </View>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Sign out"
              onPress={() => { void handleSignOut(); }}
              disabled={signingOut}
              style={{
                width: 54,
                height: 54,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: COLORS.dangerBorder,
                backgroundColor: COLORS.dangerBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {signingOut ? <ActivityIndicator color={COLORS.danger} /> : <Feather name="log-out" size={22} color={COLORS.danger} />}
            </PressableSurface>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Open settings"
              onPress={() => router.push('/settings')}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.glass,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 9,
              }}
            >
              <Feather name="settings" size={18} color={theme.brand} />
              <Text style={{ ...TYPE.label, color: theme.text }}>Settings</Text>
            </PressableSurface>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Download Sadhana report"
              onPress={() => { void downloadReport(); }}
              disabled={reportLoading}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.glass,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 9,
              }}
            >
              {reportLoading ? <ActivityIndicator color={theme.brand} /> : <Feather name="download" size={18} color={theme.brand} />}
              <Text style={{ ...TYPE.label, color: theme.text }}>Report</Text>
            </PressableSurface>
          </View>
        </Card>

        <View style={{ marginTop: 24, alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <PressableSurface haptic="selection" style={{ minHeight: 0 }} onPress={async () => {
              const url = `${API_BASE}/terms`;
              try {
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) throw new Error('Cannot open URL');
                await Linking.openURL(url);
              } catch {
                Alert.alert('Error', 'Could not open Terms of Service.');
              }
            }}>
              <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Terms</Text>
            </PressableSurface>
            <PressableSurface haptic="selection" style={{ minHeight: 0 }} onPress={async () => {
              const url = `${API_BASE}/privacy`;
              try {
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) throw new Error('Cannot open URL');
                await Linking.openURL(url);
              } catch {
                Alert.alert('Error', 'Could not open Privacy Policy.');
              }
            }}>
              <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Privacy</Text>
            </PressableSurface>
          </View>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>Shoonaya · Find your infinity</Text>
        </View>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'flex-end' }}>
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
                  <Feather name="lock" size={10} color={theme.brand} />
                  <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>Secured</Text>
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

            <View style={{ gap: 14 }}>
              <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                Lineage and path
              </Text>

              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>{sampradayaLabel}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {sampradayaOptions.map((option) => {
                    const active = editState.sampradaya === option.value;
                    return (
                      <PressableSurface
                        key={option.value}
                        haptic="selection"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${sampradayaLabel}: ${option.label}`}
                        onPress={() => setEditState((current) => ({ ...current, sampradaya: option.value }))}
                        hitSlop={6}
                        style={{
                          minHeight: 40,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: active ? theme.brand : theme.border,
                          backgroundColor: active ? theme.brandSoft : theme.bg,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: active ? theme.brand : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                          {option.label}
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>{ishtaDevataLabel}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ishtaDevataOptions.map((option) => {
                    const active = editState.ishtaDevata === option.value;
                    return (
                      <PressableSurface
                        key={option.value}
                        haptic="selection"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${ishtaDevataLabel}: ${option.label}`}
                        onPress={() => setEditState((current) => ({ ...current, ishtaDevata: option.value }))}
                        hitSlop={6}
                        style={{
                          minHeight: 40,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: active ? theme.brand : theme.border,
                          backgroundColor: active ? theme.brandSoft : theme.bg,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: active ? theme.brand : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                          {option.emoji} {option.label}
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['en', 'hi', 'pa'] as AppLanguage[]).map((language) => {
                const active = editState.appLanguage === language;
                return (
                  <PressableSurface
                    key={language}
                    haptic="selection"
                    onPress={() => setEditState((current) => ({ ...current, appLanguage: language }))}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: active ? theme.brand : theme.border,
                      backgroundColor: active ? theme.brand : theme.bg,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                      {language.toUpperCase()}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <PressableSurface
                haptic="selection"
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
              </PressableSurface>
              <PressableSurface
                onPress={() => {
                  void handleSave();
                }}
                disabled={saving}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor: theme.brand,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </PressableSurface>
            </View>
          </View>
        </View>
      </Modal>

      {profile ? (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{
            position: 'absolute',
            left: -420,
            top: 0,
            opacity: 0.01,
          }}
        >
          <ShoonayaShareCard
            ref={profileShareCardRef}
            data={{
              tradition: profile.tradition,
              headlineValue: streak > 0 ? streak : (profile.seva_score > 0 ? profile.seva_score : undefined),
              title: streak > 0
                ? (profile.tradition === 'sikh' ? 'Days of Simran' : profile.tradition === 'jain' ? 'Days of Ahimsa' : 'Days of Sadhana')
                : (profile.seva_score > 0
                  ? 'Seva Score'
                  : (profile.tradition === 'sikh' ? 'Days of Simran' : profile.tradition === 'jain' ? 'Days of Ahimsa' : 'Days of Sadhana')),
              caption: (() => {
                const firstName = profile.full_name.trim().split(' ')[0] || 'Seeker';
                const parts: string[] = [];
                if (streak > 0) parts.push(`${streak}-day streak`);
                if (profile.seva_score > 0) parts.push(`${profile.seva_score} Seva`);
                const metricsStr = parts.length > 0 ? ` (${parts.join(' · ')})` : '';
                return `${firstName} is on a spiritual journey with Shoonaya.${metricsStr}`;
              })(),
              userName: profile.full_name.trim().split(' ')[0] || 'Seeker',
              date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              footer: 'Shared from Shoonaya',
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
