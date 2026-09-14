import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { Screen } from '@/components/ui/Screen';
import { API_BASE, COLORS, FONTS, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';

type PublicProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  tradition: string | null;
  sampradaya: string | null;
  ishta_devata: string | null;
  city: string | null;
  country: string | null;
  seva_score: number | null;
  karma_points: number | null;
  life_stage: string | null;
  active_symbol_id: string | null;
  created_at: string | null;
  streak_count: number | null;
  total_malas: number | null;
  mandali: {
    name: string;
    city: string | null;
    country: string | null;
  } | null;
  relic: {
    id: string;
    name: string;
    imageUrl: string;
    description: string;
  } | null;
};

const TRADITION_META: Record<Tradition, { label: string; emoji: string }> = {
  hindu: { label: 'Hindu', emoji: '🪷' },
  sikh: { label: 'Sikh', emoji: '☬' },
  buddhist: { label: 'Buddhist', emoji: '☸️' },
  jain: { label: 'Jain', emoji: '🤲' },
};

const LIFE_STAGE_LABELS: Record<string, { label: string; sub: string }> = {
  brahmacharya: { label: 'Brahmacharya', sub: 'Student of Wisdom' },
  grihastha: { label: 'Grihastha', sub: 'Householder' },
  vanaprastha: { label: 'Vanaprastha', sub: 'Contemplative' },
  sannyasa: { label: 'Sannyasa', sub: 'Renunciant' },
};

function isTradition(value: string | null): value is Tradition {
  return value === 'hindu' || value === 'sikh' || value === 'buddhist' || value === 'jain';
}

function getSpiritualLevel(sevaScore: number) {
  if (sevaScore >= 500) return { label: 'Acharya', sanskrit: 'आचार्य' };
  if (sevaScore >= 100) return { label: 'Shishya', sanskrit: 'शिष्य' };
  return { label: 'Jigyasu', sanskrit: 'जिज्ञासु' };
}

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || 'S';
}

function formatSeekerSince(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return null;
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `Seeker since ${month} ${year}`;
  } catch {
    return null;
  }
}

function resolveAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

export default function MemberProfileScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [pranamSent, setPranamSent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await apiFetch(`/api/mandali/member-profile?id=${encodeURIComponent(id)}`);
        if (cancelled) return;
        if (!response.ok) {
          setNotFound(true);
        } else {
          const result = (await response.json()) as { profile: PublicProfile };
          setProfile(result.profile);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSendPranam = async () => {
    if (pranamSent) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setPranamSent(true);
    Alert.alert(
      'प्रणाम Offered 🙏',
      `Your reverent Pranam has been offered to ${profile?.full_name ?? 'this seeker'}.`,
      [{ text: 'Dhanyavad' }]
    );
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `Connect with ${profile.full_name || 'a fellow seeker'} (@${profile.username || 'seeker'}) on Shoonaya — Sacred Sadhana, Panchang & Devotion.`,
      });
    } catch {}
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <SacredLoader
          icon="profile"
          title="Visiting Sacred Profile"
          subtitle="Connecting with fellow seeker's journey..."
          showBack={true}
        />
      </Screen>
    );
  }

  if (notFound || !profile) {
    return (
      <Screen>
        <BackButton variant="glass" />
        <EmptyState
          icon="user-x"
          title="Profile not found"
          subtitle="This member may no longer be on Shoonaya."
        />
      </Screen>
    );
  }

  const displayName = profile.full_name ?? profile.username ?? 'Seeker';
  const traditionKey = isTradition(profile.tradition) ? profile.tradition : null;
  const traditionMeta = traditionKey ? TRADITION_META[traditionKey] : null;
  const spiritualLevel = getSpiritualLevel(profile.seva_score ?? 0);
  const tenureText = formatSeekerSince(profile.created_at);
  const lifeStageMeta = profile.life_stage ? LIFE_STAGE_LABELS[profile.life_stage] : null;
  const relicImageUrl = resolveAssetUrl(profile.relic?.imageUrl);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Top Header Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton variant="glass" />
          <PressableSurface
            haptic="selection"
            onPress={handleShare}
            accessibilityLabel="Share seeker profile"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.cardSoft,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="share-2" size={18} color={theme.text} />
          </PressableSurface>
        </View>

        {/* Hero Identity Section */}
        <View style={{ alignItems: 'center', gap: 12, marginTop: 4 }}>
          <View style={{ width: 124, height: 124, alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient
              colors={[theme.brand, theme.premiumBorder, theme.brand]}
              start={{ x: 0.05, y: 0.1 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', width: 124, height: 124, borderRadius: 62, opacity: isDark ? 0.88 : 1 }}
            />
            <View
              style={{
                width: 108,
                height: 108,
                borderRadius: 54,
                backgroundColor: theme.card,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: theme.accent,
              }}
            >
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ color: theme.brand, fontFamily: FONTS.serifBold, fontSize: 40 }}>
                  {getInitial(displayName)}
                </Text>
              )}
            </View>
          </View>

          {/* Equipped Sacred Relic Seal */}
          {profile.relic ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: RADII.pill,
                backgroundColor: theme.brandSoft,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
              }}
            >
              {relicImageUrl ? (
                <Image source={{ uri: relicImageUrl }} style={{ width: 18, height: 18 }} contentFit="contain" />
              ) : (
                <Feather name="award" size={14} color={theme.brand} />
              )}
              <Text style={{ ...TYPE.micro, fontFamily: FONTS.sansSemiBold, color: theme.brand }}>
                Equipped: {profile.relic.name}
              </Text>
            </View>
          ) : null}

          {/* Names */}
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ ...TYPE.screenTitle, color: theme.text }}>{displayName}</Text>
            {profile.username ? (
              <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>@{profile.username}</Text>
            ) : null}
          </View>

          {/* Level Pill */}
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.accent,
              paddingHorizontal: 16,
              paddingVertical: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {traditionMeta ? <Text>{traditionMeta.emoji}</Text> : null}
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
              {spiritualLevel.label} · {spiritualLevel.sanskrit}
            </Text>
          </View>

          {/* Seeker Journey Tenure & Location */}
          <View style={{ alignItems: 'center', gap: 4 }}>
            {tenureText ? (
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
                {tenureText}
              </Text>
            ) : null}
            {profile.city || profile.country ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Feather name="map-pin" size={12} color={theme.dim} />
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bio / Seeker Note */}
        {profile.bio ? (
          <Card tone="auto" style={{ backgroundColor: theme.glass, borderColor: theme.premiumBorder, borderWidth: 1 }}>
            <Text style={{ ...TYPE.body, fontStyle: 'italic', color: theme.text, textAlign: 'center' }}>
              “{profile.bio}”
            </Text>
          </Card>
        ) : null}

        {/* 4-Card Sadhana & Seva Milestones Grid */}
        <View style={{ gap: 8 }}>
          <Text style={{ ...TYPE.section, color: theme.dim, paddingHorizontal: 4 }}>
            SADHANA & SEVA MILESTONES
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Sadhana Streak */}
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.card,
                padding: 14,
                alignItems: 'center',
                gap: 4,
                ...SHADOWS.sm,
              }}
            >
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={{ ...TYPE.metric, fontSize: 20, color: theme.text }}>
                {profile.streak_count ?? 0}
              </Text>
              <Text style={{ ...TYPE.chip, color: theme.dim }}>DAY STREAK</Text>
            </View>

            {/* Malas Chanted */}
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.card,
                padding: 14,
                alignItems: 'center',
                gap: 4,
                ...SHADOWS.sm,
              }}
            >
              <Text style={{ fontSize: 20 }}>📿</Text>
              <Text style={{ ...TYPE.metric, fontSize: 20, color: theme.text }}>
                {profile.total_malas ?? 0}
              </Text>
              <Text style={{ ...TYPE.chip, color: theme.dim }}>MALAS LOGGED</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Seva Score */}
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.card,
                padding: 14,
                alignItems: 'center',
                gap: 4,
                ...SHADOWS.sm,
              }}
            >
              <Text style={{ fontSize: 20 }}>🤲</Text>
              <Text style={{ ...TYPE.metric, fontSize: 20, color: theme.text }}>
                {profile.seva_score ?? 0}
              </Text>
              <Text style={{ ...TYPE.chip, color: theme.dim }}>SEVA SCORE</Text>
            </View>

            {/* Karma Points */}
            <View
              style={{
                flex: 1,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.borderSoft,
                backgroundColor: theme.card,
                padding: 14,
                alignItems: 'center',
                gap: 4,
                ...SHADOWS.sm,
              }}
            >
              <Text style={{ fontSize: 20 }}>✨</Text>
              <Text style={{ ...TYPE.metric, fontSize: 20, color: theme.text }}>
                {profile.karma_points ?? 0}
              </Text>
              <Text style={{ ...TYPE.chip, color: theme.dim }}>KARMA EARNED</Text>
            </View>
          </View>
        </View>

        {/* Devotional Roots Card */}
        <Card tone="auto" style={{ gap: 12, borderWidth: 1, borderColor: theme.borderSoft }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="compass" size={16} color={theme.brand} />
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Devotional Roots</Text>
          </View>

          <View style={{ gap: 10 }}>
            {/* Tradition */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>Spiritual Path</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {traditionMeta ? <Text>{traditionMeta.emoji}</Text> : null}
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                  {traditionMeta ? traditionMeta.label : (profile.tradition ? profile.tradition.toUpperCase() : 'Universal')}
                </Text>
              </View>
            </View>

            {/* Sampradaya */}
            {profile.sampradaya ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>Sampradaya</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                  {profile.sampradaya}
                </Text>
              </View>
            ) : null}

            {/* Ishta Devata */}
            {profile.ishta_devata ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>Sacred Focus</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                  {profile.ishta_devata}
                </Text>
              </View>
            ) : null}

            {/* Life Stage / Ashrama */}
            {lifeStageMeta ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>Ashrama</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                  {lifeStageMeta.label} ({lifeStageMeta.sub})
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Mandali Fellowship Card */}
        {profile.mandali ? (
          <Card tone="auto" style={{ gap: 10, borderWidth: 1, borderColor: theme.borderSoft }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="users" size={16} color={theme.brand} />
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Sangam Fellowship</Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text }}>
                {profile.mandali.name}
              </Text>
              {profile.mandali.city || profile.mandali.country ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
                  {[profile.mandali.city, profile.mandali.country].filter(Boolean).join(', ')}
                </Text>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Sacred Action: Send Pranam */}
        <View style={{ marginTop: 8, gap: 8 }}>
          <PressableSurface
            haptic="selection"
            onPress={handleSendPranam}
            accessibilityRole="button"
            accessibilityLabel={pranamSent ? 'Pranam offered' : 'Send Pranam'}
            style={{
              minHeight: 52,
              borderRadius: RADII.xl,
              backgroundColor: pranamSent ? theme.cardSoft : theme.brand,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              ...SHADOWS.md,
            }}
          >
            <Text style={{ fontSize: 16 }}>🙏</Text>
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 15,
                color: pranamSent ? theme.text : isDark ? COLORS.cardBgDark : '#FFFFFF',
              }}
            >
              {pranamSent ? 'Pranam Offered with Reverence' : 'Send Pranam • सादर प्रणाम'}
            </Text>
          </PressableSurface>

          <Text style={{ ...TYPE.heroPickerMicro, color: theme.dim, textAlign: 'center', paddingHorizontal: 12 }}>
            Sadhana milestones and devotional roots shared in sacred fellowship.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

