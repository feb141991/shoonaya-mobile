import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE, RADII, themeColor } from '@/lib/constants';
import { lookupVratData, getVratData, type VratData } from '@/lib/vrat-data';
import {
  buildVratObservationPayload,
  isEligibleToObserveToday,
  matchesRequestedOccurrence,
} from '@/lib/vrat-observation';
import type { ClientObservanceResult } from '@/lib/calendar-contract';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { ReaderShell } from '@/components/reader/ReaderShell';

const FONT_PRESETS = [
  { label: 'Standard', value: 0 },
  { label: 'Comfortable', value: 1 },
  { label: 'Spacious', value: 2 },
  { label: 'Large', value: 3 },
];

export default function VratDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug: string; occurrence_id?: string; date?: string }>();
  const slug = params.slug || 'ekadashi';
  const occurrenceIdParam = params.occurrence_id || null;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColor(isDark);

  const [isGuest, setIsGuest] = useState(false);
  const [observedToday, setObservedToday] = useState(false);
  const [observeCount, setObserveCount] = useState(0);
  const [observeLoading, setObserveLoading] = useState(false);
  const [observeStatusLoaded, setObserveStatusLoaded] = useState(false);
  const [canonicalToday, setCanonicalToday] = useState<string | null>(null);
  const [occurrence, setOccurrence] = useState<ClientObservanceResult | null>(null);
  const [occurrenceLoading, setOccurrenceLoading] = useState(false);

  const [lang, setLang] = useState<'en' | 'local'>('en');
  const [fontStep, setFontStep] = useState(1);

  const vrat: VratData = useMemo(() => {
    return lookupVratData(slug) ?? getVratData(slug) ?? {
      id: slug,
      emoji: '🌿',
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      tagline: 'Sacred Observance',
      significance: 'A sacred observance in the dharmic calendar.',
      practice: 'Observe fasting and prayer according to your tradition.',
      mantra: 'Om Shanti Shanti Shanti',
    };
  }, [slug]);

  // Check guest state
  useEffect(() => {
    isGuestMode().then(setIsGuest);
  }, []);

  // Fetch occurrence and observation data strictly guarded by slug and occurrenceId
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Reset state synchronously
    setObservedToday(false);
    setObserveCount(0);
    setObserveStatusLoaded(false);
    setObserveLoading(false);
    setCanonicalToday(null);
    setOccurrence(null);

    // 1. Resolve the exact canonical UUID. This remains valid for historical
    // notification/deep links and is not bounded to a rolling calendar window.
    if (occurrenceIdParam) {
      setOccurrenceLoading(true);
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      apiFetch(`/api/vrat/occurrence?occurrence_id=${encodeURIComponent(occurrenceIdParam)}&tz=${encodeURIComponent(deviceTimezone)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || controller.signal.aborted || !data) return;
          const resolvedOccurrence = data.occurrence as ClientObservanceResult | undefined;
          if (matchesRequestedOccurrence(occurrenceIdParam, resolvedOccurrence)) {
            setOccurrence(resolvedOccurrence);
          } else {
            setOccurrence(null);
          }
        })
        .catch(() => {
          if (!cancelled && !controller.signal.aborted) {
            setOccurrence(null);
          }
        })
        .finally(() => {
          if (!cancelled && !controller.signal.aborted) {
            setOccurrenceLoading(false);
          }
        });
    }

    // 2. Query observation status
    const observeUrl = occurrenceIdParam
      ? `/api/vrat/observe?occurrence_id=${encodeURIComponent(occurrenceIdParam)}`
      : `/api/vrat/observe?vrat_id=${encodeURIComponent(vrat.id)}`;

    apiFetch(observeUrl, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || controller.signal.aborted || !data) return;
        setObservedToday(Boolean(data.observed_today));
        setObserveCount(data.total_count ?? 0);
        if (data.today) setCanonicalToday(data.today);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) {
          setObserveStatusLoaded(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, occurrenceIdParam, vrat.id]);

  const isEligibleToday = useMemo(() => {
    if (!occurrenceIdParam || !occurrence) return false;
    return isEligibleToObserveToday({
      occurrence,
      canonicalTodayDate: canonicalToday,
    });
  }, [occurrenceIdParam, occurrence, canonicalToday]);

  const handleObserve = async () => {
    if (!occurrenceIdParam || !isEligibleToday || observedToday || observeLoading) {
      return;
    }

    if (isGuest) {
      Alert.alert('Sign in required', 'Sign in to track your Vrat observances and earn karma.');
      return;
    }

    setObserveLoading(true);
    try {
      const payload = buildVratObservationPayload({ occurrenceId: occurrenceIdParam });
      const res = await apiFetch('/api/vrat/observe', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setObservedToday(true);
        setObserveCount((count) => count + (data.already_observed ? 0 : 1));
        if (!data.already_observed && data.karma_earned > 0) {
          Alert.alert(`🙏 Vrat observed! +${data.karma_earned} karma`);
        } else {
          Alert.alert('Vrat observed');
        }
      } else {
        Alert.alert(data?.error ?? 'Could not record observation');
      }
    } catch {
      Alert.alert('Could not record observation');
    } finally {
      setObserveLoading(false);
    }
  };

  const selectedName = lang === 'local' && vrat.nameLocal ? vrat.nameLocal : vrat.name;
  const selectedTagline = lang === 'local' && vrat.taglineLocal ? vrat.taglineLocal : vrat.tagline;
  const selectedSignificance = lang === 'local' && vrat.significanceLocal ? vrat.significanceLocal : vrat.significance;
  const selectedPractice = lang === 'local' && vrat.practiceLocal ? vrat.practiceLocal : vrat.practice;
  const selectedMantra = lang === 'local' && vrat.mantraLocal ? vrat.mantraLocal : vrat.mantra;
  const hasLocalVrat = Boolean(vrat.nameLocal && vrat.taglineLocal && vrat.significanceLocal && vrat.practiceLocal);

  return (
    <ReaderShell
      title={selectedName}
      subtitle={selectedTagline}
      fallbackBackUrl="/vrat"
      themeColor={theme.brand}
      ambientGlowColor={theme.brand}
      fontPresets={FONT_PRESETS}
      fontStep={fontStep}
      setFontStep={setFontStep}
      languages={hasLocalVrat ? [{ code: 'en', label: 'EN' }, { code: 'local', label: 'हिं/Local' }] : undefined}
      currentLanguage={lang}
      setLanguage={setLang}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 36 }}>{vrat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.title, color: theme.text }}>{selectedName}</Text>
              <Text style={{ ...TYPE.body, color: theme.dim, marginTop: 2 }}>{selectedTagline}</Text>
            </View>
          </View>

          {/* Canonical Occurrence Info Banner */}
          {occurrence ? (
            <View
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: RADII.md,
                backgroundColor: theme.brandSoft,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="calendar" size={14} color={theme.brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                  {occurrence.civilDate ?? occurrence.date}
                </Text>
                {occurrence.status === 'resolved' ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(134,187,110,0.2)',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginLeft: 'auto',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#5aaa38', fontFamily: FONTS.sansSemiBold }}>Canonical</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: 'rgba(235,160,50,0.2)',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginLeft: 'auto',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#c58a20', fontFamily: FONTS.sansSemiBold }}>Under Review</Text>
                  </View>
                )}
              </View>

              {occurrence.profile?.calendar ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, marginTop: 4 }}>
                  Profile: {occurrence.profile.calendar} · Tradition: {occurrence.profile.tradition}
                </Text>
              ) : null}

              {/* Diagnostics if present */}
              {occurrence.diagnostics && occurrence.diagnostics.length > 0 ? (
                <View style={{ marginTop: 6 }}>
                  {occurrence.diagnostics.map((d, i) => (
                    <Text key={i} style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim }}>
                      ℹ {d}
                    </Text>
                  ))}
                </View>
              ) : null}

              {/* Alternatives if present */}
              {occurrence.alternatives && occurrence.alternatives.length > 0 ? (
                <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.borderSoft }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.dim }}>
                    Alternative Traditions / Dates:
                  </Text>
                  {occurrence.alternatives.map((alt, i) => (
                    <Text key={i} style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.text, marginTop: 2 }}>
                      • {alt.profile.tradition} ({alt.profile.calendar}): {alt.civilDate} {alt.note ? `— ${alt.note}` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : occurrenceIdParam ? (
            occurrenceLoading ? (
              <View style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.brand} />
              </View>
            ) : (
              <View
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: RADII.md,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="info" size={16} color={theme.dim} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>
                    Occurrence Details Unavailable
                  </Text>
                </View>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim, marginTop: 4, lineHeight: 18 }}>
                  This specific observance occurrence is not active or could not be verified with the canonical calendar service. You can explore the sacred significance and practices below.
                </Text>
                <PressableSurface
                  onPress={() => router.push('/vrat')}
                  style={{
                    marginTop: 10,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: RADII.sm,
                    backgroundColor: theme.brandSoft,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.brand }}>
                    Back to Fasting Calendar
                  </Text>
                </PressableSurface>
              </View>
            )
          ) : (
            <View
              style={{
                marginTop: 12,
                padding: 8,
                borderRadius: RADII.sm,
                backgroundColor: 'rgba(0,0,0,0.03)',
              }}
            >
              <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, textAlign: 'center' }}>
                Educational Catalogue Overview · See upcoming calendar for dated fasts
              </Text>
            </View>
          )}
        </Card>

        {/* Action CTA: Mark as Observed (only when occurrence is eligible today) */}
        {occurrenceIdParam && isEligibleToday ? (
          <Card style={{ padding: 16, marginBottom: 16, alignItems: 'center' }}>
            {observedToday ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  paddingVertical: 12,
                  borderRadius: RADII.pill,
                  backgroundColor: 'rgba(134,187,110,0.15)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(134,187,110,0.45)',
                }}
              >
                <Feather name="check-circle" size={18} color="#5aaa38" />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: '#5aaa38' }}>
                  Observed today ✓ {observeCount > 1 ? `(${observeCount}× total)` : ''}
                </Text>
              </View>
            ) : (
              <PressableSurface
                onPress={handleObserve}
                disabled={observeLoading || !observeStatusLoaded}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: RADII.pill,
                  backgroundColor: 'rgba(197,160,89,0.92)',
                }}
              >
                {observeLoading ? (
                  <ActivityIndicator size="small" color="#1c1208" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>🙏</Text>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: '#1c1208' }}>
                      Mark as Observed {observeCount > 0 ? `(${observeCount}× before)` : ''}
                    </Text>
                  </>
                )}
              </PressableSurface>
            )}
            <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, marginTop: 8 }}>
              {observedToday ? 'Your practice is recorded' : 'Earn 25 karma for completing this vrat today'}
            </Text>
          </Card>
        ) : null}

        {/* Significance */}
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Significance</Text>
          <Text style={{ ...TYPE.body, color: theme.text, lineHeight: 22 }}>{selectedSignificance}</Text>
        </Card>

        {/* Fasting & Practice */}
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Practice & Fasting Rules</Text>
          <Text style={{ ...TYPE.body, color: theme.text, lineHeight: 22 }}>{selectedPractice}</Text>

          {vrat.fastingType ? (
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }}>Fast Type:</Text>
              <View style={{ backgroundColor: theme.brandSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand, textTransform: 'capitalize' }}>
                  {vrat.fastingType}
                </Text>
              </View>
            </View>
          ) : null}

          {vrat.breakFastTime ? (
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }}>Parana (Breaking Fast):</Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>{vrat.breakFastTime}</Text>
            </View>
          ) : null}
        </Card>

        {/* Do's and Don'ts if present */}
        {vrat.dos && vrat.dos.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: '#5aaa38', marginBottom: 8 }}>Recommended Practices (Do's)</Text>
            {vrat.dos.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="check" size={14} color="#5aaa38" style={{ marginTop: 3 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {vrat.donts && vrat.donts.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: '#d9534f', marginBottom: 8 }}>Restrictions (Don'ts)</Text>
            {vrat.donts.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="x" size={14} color="#d9534f" style={{ marginTop: 3 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Sacred Mantra */}
        <Card style={{ padding: 16, marginBottom: 16, backgroundColor: theme.brandSoft, borderColor: theme.brand }}>
          <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 6 }}>Sacred Mantra</Text>
          <Text style={{ fontFamily: FONTS.serif, fontSize: 16, color: theme.text, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
            {selectedMantra}
          </Text>
        </Card>
      </ScrollView>
    </ReaderShell>
  );
}
