import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE, RADII, themeColor } from '@/lib/constants';
import { lookupFestivalContent } from '@/lib/festival-content.generated';
import { resolveFestivalText, resolveFestivalList, isFestivalPublishable } from '@/lib/festival-content-helpers';
import type { ClientObservanceResult } from '@/lib/calendar-contract';
import { ReaderShell } from '@/components/reader/ReaderShell';

export default function FestivalDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug ?? '';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColor(isDark);

  const [occurrence, setOccurrence] = useState<ClientObservanceResult | null>(null);
  const [occurrenceLoading, setOccurrenceLoading] = useState(true);

  const festival = useMemo(() => lookupFestivalContent(slug), [slug]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setOccurrenceLoading(true);
    setOccurrence(null);

    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    apiFetch(`/api/calendar/upcoming?days=60&tz=${encodeURIComponent(deviceTimezone)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || controller.signal.aborted) return;
        const observances: ClientObservanceResult[] = Array.isArray(data?.observances) ? data.observances : [];
        const matching = observances.filter((o) => o.route_slug === slug || o.slug === slug);
        setOccurrence(matching.find((o) => o.isPrimary) ?? matching[0] ?? null);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) setOccurrence(null);
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) setOccurrenceLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug]);

  if (!festival) {
    return (
      <ReaderShell title="Festival" fallbackBackUrl="/(tabs)" themeColor={theme.brand} ambientGlowColor={theme.brand}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ ...TYPE.body, color: theme.dim }}>This festival's content isn't available yet.</Text>
        </View>
      </ReaderShell>
    );
  }

  const name = resolveFestivalText(festival.name) || festival.definitionKey;
  const tagline = resolveFestivalText(festival.tagline);
  const significance = resolveFestivalText(festival.significance);
  const rituals = resolveFestivalList(festival.rituals);
  const dos = resolveFestivalList(festival.dos);
  const donts = resolveFestivalList(festival.donts);
  const pujaItems = resolveFestivalList(festival.pujaItems);
  const mantraTranslation = festival.mantra ? resolveFestivalText(festival.mantra.translation) : '';
  const publishable = isFestivalPublishable(festival);

  return (
    <ReaderShell
      title={name}
      subtitle={tagline}
      fallbackBackUrl="/(tabs)"
      themeColor={theme.brand}
      ambientGlowColor={theme.brand}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!publishable ? (
          <Card style={{ padding: 12, marginBottom: 16, backgroundColor: isDark ? COLORS.warningBgDark : COLORS.warningBgLight }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Feather name="alert-triangle" size={14} color={isDark ? COLORS.warningDark : COLORS.warningLight} style={{ marginTop: 2 }} />
              <Text style={{ ...TYPE.body, fontSize: 12, color: isDark ? COLORS.warningDark : COLORS.warningLight, flex: 1 }}>
                This festival's content is still pending editorial/source review and is not yet shown to regular readers.
              </Text>
            </View>
          </Card>
        ) : null}

        <Card style={{ padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 36 }}>{festival.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.title, color: theme.text }}>{name}</Text>
              {tagline ? <Text style={{ ...TYPE.body, color: theme.dim, marginTop: 2 }}>{tagline}</Text> : null}
            </View>
          </View>

          {occurrenceLoading ? (
            <View style={{ marginTop: 16, padding: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.brand} />
            </View>
          ) : occurrence ? (
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
                  <View style={{ backgroundColor: COLORS.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' }}>
                    <Text style={{ fontSize: 11, color: COLORS.success, fontFamily: FONTS.sansSemiBold }}>Canonical</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: isDark ? COLORS.warningBgDark : COLORS.warningBgLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' }}>
                    <Text style={{ fontSize: 11, color: isDark ? COLORS.warningDark : COLORS.warningLight, fontFamily: FONTS.sansSemiBold }}>Under Review</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 12, padding: 8, borderRadius: RADII.sm, backgroundColor: theme.cardSoft }}>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim, textAlign: 'center' }}>
                Educational Overview · See Panchang for the next dated occurrence
              </Text>
            </View>
          )}
        </Card>

        {significance ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Significance</Text>
            <Text style={{ ...TYPE.body, color: theme.text, lineHeight: 22 }}>{significance}</Text>
          </Card>
        ) : null}

        {rituals.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Rituals</Text>
            {rituals.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="circle" size={6} color={theme.brand} style={{ marginTop: 8 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {dos.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: COLORS.success, marginBottom: 8 }}>Do's</Text>
            {dos.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="check" size={14} color={COLORS.success} style={{ marginTop: 3 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {donts.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: COLORS.danger, marginBottom: 8 }}>Don'ts</Text>
            {donts.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="x" size={14} color={COLORS.danger} style={{ marginTop: 3 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {pujaItems.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Puja Items</Text>
            <Text style={{ ...TYPE.body, color: theme.text, lineHeight: 20 }}>{pujaItems.join(', ')}</Text>
          </Card>
        ) : null}

        {festival.mantra && mantraTranslation ? (
          <Card style={{ padding: 16, marginBottom: 16, backgroundColor: theme.brandSoft, borderColor: theme.brand }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 6 }}>Sacred Mantra</Text>
            <Text style={{ fontFamily: FONTS.serif, fontSize: 16, color: theme.text, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
              {festival.mantra.sanskrit}
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim, textAlign: 'center' }}>
              {festival.mantra.transliteration}
            </Text>
            <Text style={{ ...TYPE.body, color: theme.text, textAlign: 'center', marginTop: 6 }}>{mantraTranslation}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </ReaderShell>
  );
}
