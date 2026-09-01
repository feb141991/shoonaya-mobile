import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { AuthGate } from '@/components/ui/AuthGate';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { useFallbackBackHandler } from '@/components/ui/BackButton';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { FONTS, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { isGuestMode } from '@/lib/guestSession';
import { supabase } from '@/lib/supabase';
import { getTraditionAccent, type TraditionKey } from '@/lib/traditions';

// Ported from the PWA's tradition-filtered seva hub
// (src/app/(main)/seva/SevaClient.tsx) -- same orgs, same per-tradition
// filtering, adapted to this app's card/pill visual language. The native
// Home tile for Seva used to point at '/my-progress' because no dedicated
// screen existed yet (see lib/routes.ts) -- this is that screen.
type SevaOrg = { title: string; description: string; url: string; emoji: string };

const SEVA_ORGS: Record<TraditionKey, SevaOrg[]> = {
  hindu: [
    { title: 'Kamdhenu Gaushala', description: 'Support Gau Seva through direct care, fodder, and shelter contributions.', url: 'https://www.kamdhenufoods.com/gaushala', emoji: '🐄' },
    { title: 'Akshaya Patra Annadaan', description: 'Fund daily meals for children and families through a large-scale annadaan initiative.', url: 'https://www.akshayapatra.org', emoji: '🍲' },
    { title: 'Kashi Vishwanath Trust', description: 'Contribute toward seva and temple support at Kashi Vishwanath Dham.', url: 'https://shrikashivishwanath.org', emoji: '🛕' },
    { title: 'Tirumala Tirupati Devasthanams', description: 'Offer dana and support temple services through the official TTD portal.', url: 'https://tirupatibalaji.ap.gov.in', emoji: '🙏' },
    { title: 'Char Dham Seva', description: 'Support yatri facilities and dharmic upkeep across the Char Dham circuit.', url: 'https://badrinath-kedarnath.gov.in', emoji: '🏔️' },
  ],
  sikh: [
    { title: 'SGPC Darbar Sahib Seva', description: 'Support langar, maintenance, and seva linked to Sri Harmandir Sahib.', url: 'https://sgpc.net/dasvandh/', emoji: '☬' },
    { title: 'Pingalwara Trust', description: 'Serve those in need through medical, shelter, and humanitarian seva.', url: 'https://pingalwara.org', emoji: '🫶' },
    { title: 'Khalsa Aid', description: 'Support disaster relief and humanitarian seva rooted in Sikh values.', url: 'https://www.khalsaaid.org', emoji: '🌍' },
    { title: 'Guru Nanak Nishkam Sewak Jatha', description: 'Contribute to education, langar, and community seva projects.', url: 'https://www.nishkamswat.org', emoji: '🍛' },
  ],
  buddhist: [
    { title: 'Buddhist Society of India', description: 'Support Buddhist learning, practice, and community service initiatives.', url: 'https://www.buddhistsocietyofindia.org', emoji: '☸️' },
    { title: 'Nalanda Trust', description: 'Help sustain Buddhist education and preservation work inspired by Nalanda.', url: 'https://www.nalanda.org.my', emoji: '📚' },
    { title: 'Dr. Ambedkar Foundation', description: 'Support educational and social work aligned with Dhamma-based uplift.', url: 'https://ambedkarfoundation.nic.in', emoji: '🕊️' },
  ],
  jain: [
    { title: 'Jain Vishwa Bharati', description: 'Support Jain learning, ahimsa work, and spiritual education initiatives.', url: 'https://www.jvbharati.org', emoji: '🤲' },
    { title: 'Paryushana Seva Fund', description: 'Contribute to Jain seva and community support around Paryushana observance.', url: 'https://jainsocialgroup.org', emoji: '🌿' },
  ],
};

const SEVA_TYPES = ['Annadaan', 'Gau Seva', 'Shram Daan', 'Daan', 'Rakt Daan', 'Vriksha Ropan', 'Other'] as const;
type SevaType = (typeof SEVA_TYPES)[number];

function isTraditionKey(value: string | null | undefined): value is TraditionKey {
  return value === 'hindu' || value === 'sikh' || value === 'buddhist' || value === 'jain';
}

function traditionLabel(tradition: TraditionKey): string {
  return tradition.charAt(0).toUpperCase() + tradition.slice(1);
}

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export default function SevaScreen() {
  const router = useRouter();
  const handleBack = useFallbackBackHandler('/(tabs)', true);
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [tradition, setTradition] = useState<TraditionKey>('hindu');
  const [sevaType, setSevaType] = useState<SevaType>('Annadaan');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [authGateVisible, setAuthGateVisible] = useState(false);

  const loadState = useCallback(async () => {
    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      setTradition('hindu');
      setMonthlyCount(null);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { startIso, endIso } = monthRange();
    const [{ data: profileRow }, { count }] = await Promise.all([
      supabase.from('profiles').select('tradition').eq('id', user.id).single(),
      supabase
        .from('seva_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('logged_at', startIso)
        .lt('logged_at', endIso),
    ]);

    setTradition(isTraditionKey(profileRow?.tradition) ? profileRow.tradition : 'hindu');
    setMonthlyCount(count ?? 0);
  }, [router]);

  useEffect(() => {
    setLoading(true);
    loadState()
      .catch(() => Alert.alert('Could not load Seva'))
      .finally(() => setLoading(false));
  }, [loadState]);

  const accent = getTraditionAccent(tradition);
  const orgs = SEVA_ORGS[tradition];

  const handleLogSeva = useCallback(async () => {
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      const trimmedNote = note.trim().slice(0, 100);
      const { error } = await supabase.from('seva_log').insert({
        user_id: user.id,
        seva_type: sevaType,
        note: trimmedNote || null,
        logged_at: new Date().toISOString(),
      });

      if (error) throw error;
      setMonthlyCount((current) => (current ?? 0) + 1);
      setNote('');
      setSevaType('Annadaan');
      Alert.alert('Seva logged', 'Thank you for your seva today.');
    } catch {
      Alert.alert('Could not log seva', 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isGuest, submitting, note, sevaType, router]);

  if (loading) {
    return (
      <Screen header={{ title: 'Seva', onBack: handleBack }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen header={{ title: 'Seva', onBack: handleBack }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={{ gap: SPACING.lg, paddingBottom: SPACING.xxl }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.sm }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${accent}1F`,
                borderWidth: 1,
                borderColor: `${accent}40`,
              }}
            >
              <SacredIcon name="seva" fallbackGlyph="heart" size={30} color={accent} />
            </View>
            <Text style={{ ...TYPE.chip, color: accent, letterSpacing: 1.3, textTransform: 'uppercase' }}>Seva Hub</Text>
            <Text style={{ ...TYPE.screenTitle, color: theme.text, textAlign: 'center' }}>
              {traditionLabel(tradition)} Seva
            </Text>
            <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>
              Direct seva paths, a personal seva log, and a monthly view of your dharmic acts.
            </Text>
          </View>

          <View style={{ gap: SPACING.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="heart" size={16} color={accent} />
              <Text style={{ ...TYPE.section, color: theme.text }}>Direct Seva</Text>
            </View>
            {orgs.map((org) => (
              <PressableSurface
                key={org.title}
                onPress={() => {
                  void Linking.openURL(org.url);
                }}
                style={{
                  borderRadius: 22,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  backgroundColor: theme.glass,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${accent}1F`,
                    borderWidth: 1,
                    borderColor: `${accent}3D`,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{org.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ ...TYPE.body, fontFamily: FONTS.sansSemiBold, color: theme.text }}>{org.title}</Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>{org.description}</Text>
                </View>
                <Feather name="external-link" size={16} color={accent} style={{ marginTop: 2 }} />
              </PressableSurface>
            ))}
          </View>

          <Card
            tone="auto"
            style={{ gap: SPACING.md, backgroundColor: theme.glass, borderColor: theme.premiumBorder, borderWidth: 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="star" size={16} color={accent} />
              <Text style={{ ...TYPE.section, color: theme.text }}>Log a Seva today</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SEVA_TYPES.map((option) => (
                <PressableSurface
                  key={option}
                  haptic="selection"
                  onPress={() => setSevaType(option)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: option === sevaType ? accent : theme.premiumBorder,
                    backgroundColor: option === sevaType ? `${accent}1F` : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      ...TYPE.caption,
                      fontFamily: FONTS.sansSemiBold,
                      color: option === sevaType ? accent : theme.dim,
                    }}
                  >
                    {option}
                  </Text>
                </PressableSurface>
              ))}
            </View>

            <View style={{ gap: 6 }}>
              <TextInput
                value={note}
                onChangeText={(text) => setNote(text.slice(0, 100))}
                maxLength={100}
                multiline
                numberOfLines={3}
                placeholder="Optional note about today's seva."
                placeholderTextColor={theme.dim}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  padding: 12,
                  minHeight: 72,
                  textAlignVertical: 'top',
                  color: theme.text,
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                }}
              />
              <Text style={{ ...TYPE.micro, color: theme.dim, textAlign: 'right' }}>{note.length}/100</Text>
            </View>

            <PressableSurface
              onPress={() => {
                void handleLogSeva();
              }}
              disabled={submitting}
              style={{
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: accent,
              }}
            >
              <Text style={{ ...TYPE.body, fontFamily: FONTS.sansSemiBold, color: '#fff' }}>
                {submitting ? 'Logging…' : 'Log Seva'}
              </Text>
            </PressableSurface>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 16,
                padding: 12,
                backgroundColor: `${accent}14`,
                borderWidth: 1,
                borderColor: `${accent}30`,
              }}
            >
              <View>
                <Text
                  style={{
                    ...TYPE.micro,
                    fontFamily: FONTS.sansSemiBold,
                    color: accent,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  This Month
                </Text>
                <Text style={{ ...TYPE.body, color: theme.text }}>
                  {isGuest || monthlyCount === null ? 'Sign in to track' : `${monthlyCount} seva ${monthlyCount === 1 ? 'log' : 'logs'}`}
                </Text>
              </View>
              <Text style={{ fontSize: 20 }}>✦</Text>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Log your seva"
        message="Sign in to save your seva log and track your monthly dharmic acts."
      />
    </Screen>
  );
}
