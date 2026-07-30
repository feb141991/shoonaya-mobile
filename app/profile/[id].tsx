import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { FONTS, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// Read-only "view another member's public profile" screen — reachable from
// Mandali's post authors, comment authors, and member list (all previously
// dead taps; MemberInfoSheet's own doc comment used to note no such screen
// existed anywhere in the app or the PWA). Only fields already safe to show
// on a public profile are selected; `profiles` has a public-read RLS policy
// so no backend change was needed, just this screen and the tap wiring.
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
};

const TRADITION_META: Record<Tradition, { label: string; emoji: string }> = {
  hindu: { label: 'Hindu', emoji: '🪷' },
  sikh: { label: 'Sikh', emoji: '☬' },
  buddhist: { label: 'Buddhist', emoji: '☸️' },
  jain: { label: 'Jain', emoji: '🤲' },
};

function isTradition(value: string | null): value is Tradition {
  return value === 'hindu' || value === 'sikh' || value === 'buddhist' || value === 'jain';
}

// Same seva-score thresholds as app/(tabs)/profile.tsx's own getSpiritualLevel
// (kept local here too — this repo already has three independent, file-local
// TRADITION_META-style objects rather than one shared module).
function getSpiritualLevel(sevaScore: number) {
  if (sevaScore >= 500) return { label: 'Acharya', sanskrit: 'आचार्य' };
  if (sevaScore >= 100) return { label: 'Shishya', sanskrit: 'शिष्य' };
  return { label: 'Jigyasu', sanskrit: 'जिज्ञासु' };
}

function getInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || 'S';
}

export default function MemberProfileScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, full_name, username, avatar_url, bio, tradition, sampradaya, ishta_devata, city, country, seva_score, karma_points'
        )
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <BackButton variant="glass" />

        <View style={{ alignItems: 'center', gap: 12, marginTop: 8 }}>
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

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ ...TYPE.screenTitle, color: theme.text }}>{displayName}</Text>
            {profile.username ? (
              <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>@{profile.username}</Text>
            ) : null}
          </View>

          {traditionMeta ? (
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
              <Text>{traditionMeta.emoji}</Text>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                {spiritualLevel.label} · {spiritualLevel.sanskrit}
              </Text>
            </View>
          ) : null}

          {profile.city || profile.country ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="map-pin" size={13} color={theme.dim} />
              <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        {profile.bio ? (
          <Card tone="auto" style={{ backgroundColor: theme.glass, borderColor: theme.premiumBorder, borderWidth: 1 }}>
            <Text style={{ ...TYPE.body, color: theme.text }}>{profile.bio}</Text>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              backgroundColor: theme.glass,
              padding: 14,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ ...TYPE.metric, color: theme.text }}>{profile.seva_score ?? 0}</Text>
            <Text style={{ ...TYPE.chip, color: theme.dim }}>SEVA</Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.borderSoft,
              backgroundColor: theme.glass,
              padding: 14,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ ...TYPE.metric, color: theme.text }}>{profile.karma_points ?? 0}</Text>
            <Text style={{ ...TYPE.chip, color: theme.dim }}>KARMA</Text>
          </View>
        </View>

        {profile.sampradaya || profile.ishta_devata ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {profile.sampradaya ? (
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: theme.text }}>{profile.sampradaya}</Text>
              </View>
            ) : null}
            {profile.ishta_devata ? (
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: theme.text }}>{profile.ishta_devata}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
