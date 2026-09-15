import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, TYPE, RADII, themeColor } from '@/lib/constants';
import { lookupFestivalContent } from '@/lib/festival-content.generated';
import {
  resolveFestivalText,
  resolveFestivalList,
  isFestivalPublishable,
  resolveFestivalShareHeadline,
} from '@/lib/festival-content-helpers';
import type { ClientObservanceResult } from '@/lib/calendar-contract';
import { ReaderShell } from '@/components/reader/ReaderShell';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';

// Labels match app/dharm-veer/[id].tsx's FONT_PRESETS exactly -- both
// screens share the same ReaderShell toolbar component, this is just the
// label set each passes in, per explicit request to bring the two in line.
const FONT_PRESETS = [
  { label: 'A-', value: 0 },
  { label: 'A', value: 1 },
  { label: 'A+', value: 2 },
  { label: 'A++', value: 3 },
];

type LiveObservanceStory = {
  id: string;
  definitionId: string;
  slug: string;
  displayName: string;
  tradition: string;
  version: number;
  publishedAt?: string;
  translations: Record<string, {
    title?: string;
    teaser?: string;
    origin?: string;
    significance?: string;
    rituals?: string[];
    verse?: { original?: string; transliteration?: string; translation?: string };
    personalPractice?: string;
  }>;
};

export default function FestivalDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug ?? '';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColor(isDark);

  const [occurrence, setOccurrence] = useState<ClientObservanceResult | null>(null);
  const [occurrenceLoading, setOccurrenceLoading] = useState(true);
  const [liveStory, setLiveStory] = useState<LiveObservanceStory | null>(null);
  const [storyLoading, setStoryLoading] = useState(true);
  const [lang, setLang] = useState<'en' | 'local'>('en');
  const [fontStep, setFontStep] = useState(1);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View | null>(null);
  const resolvedLang: 'en' | 'hi' = lang === 'local' ? 'hi' : 'en';
  const fsScale = fontStep === 0 ? 0.85 : fontStep === 1 ? 1 : fontStep === 2 ? 1.15 : 1.3;

  const festival = useMemo(() => lookupFestivalContent(slug), [slug]);

  useEffect(() => {
    let cancelled = false;
    setStoryLoading(true);

    const fetchStory = async () => {
      try {
        const { data, error } = await supabase
          .from('observance_story_versions')
          .select('id, version, status, published_at, observance_definitions!inner(id, slug, display_name, tradition), observance_story_translations(*)')
          .eq('observance_definitions.slug', slug)
          .eq('status', 'published')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (data && !error) {
          const row = data as any;
          const def = Array.isArray(row.observance_definitions) ? row.observance_definitions[0] : row.observance_definitions;
          const translations = Array.isArray(row.observance_story_translations) ? row.observance_story_translations : [];
          const translationsMap: Record<string, any> = {};

          for (const t of translations) {
            translationsMap[t.language] = {
              title: def?.display_name,
              teaser: t.teaser,
              origin: t.origin,
              significance: t.significance,
              rituals: t.rituals || [],
              verse: t.verse,
              personalPractice: t.personal_practice,
            };
          }

          setLiveStory({
            id: row.id,
            definitionId: def?.id ?? '',
            slug: def?.slug ?? slug,
            displayName: def?.display_name ?? slug,
            tradition: def?.tradition ?? '',
            version: row.version ?? 1,
            publishedAt: row.published_at,
            translations: translationsMap,
          });
        }
      } catch (err) {
        console.warn('[FestivalDetail] Supabase story fetch failed:', err);
      } finally {
        if (!cancelled) setStoryLoading(false);
      }
    };

    void fetchStory();

    return () => {
      cancelled = true;
    };
  }, [slug]);

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

  if (!festival && !liveStory && !storyLoading) {
    return (
      <ReaderShell title="Festival" fallbackBackUrl="/(tabs)" themeColor={theme.brand} ambientGlowColor={theme.brand}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ ...TYPE.body, color: theme.dim }}>This festival's content isn't available yet.</Text>
        </View>
      </ReaderShell>
    );
  }

  const liveTranslation = liveStory?.translations?.[resolvedLang] ?? liveStory?.translations?.['en'];

  const name =
    liveTranslation?.title ||
    liveStory?.displayName ||
    (festival ? resolveFestivalText(festival.name, resolvedLang) : '') ||
    festival?.definitionKey ||
    slug;

  const tagline = liveTranslation?.teaser || (festival ? resolveFestivalText(festival.tagline, resolvedLang) : '');
  const significance = liveTranslation?.significance || (festival ? resolveFestivalText(festival.significance, resolvedLang) : '');
  const rituals = (liveTranslation?.rituals && liveTranslation.rituals.length > 0)
    ? liveTranslation.rituals
    : (festival ? resolveFestivalList(festival.rituals, resolvedLang) : []);
  const dos = festival ? resolveFestivalList(festival.dos, resolvedLang) : [];
  const donts = festival ? resolveFestivalList(festival.donts, resolvedLang) : [];
  const pujaItems = festival ? resolveFestivalList(festival.pujaItems, resolvedLang) : [];
  const mantraText = liveTranslation?.verse?.original || festival?.mantra?.sanskrit || '';
  const mantraTranslation = liveTranslation?.verse?.translation || (festival?.mantra ? resolveFestivalText(festival.mantra.translation, resolvedLang) : '');
  const publishable = Boolean(liveStory) || (festival ? isFestivalPublishable(festival) : false);

  // Only offer the toggle when real Hindi content actually exists
  const hasLocalFestival = Boolean(
    liveStory?.translations?.hi?.significance ||
    (festival && resolveFestivalText(festival.name, 'hi') && resolveFestivalText(festival.significance, 'hi'))
  );

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await shareCapturedShoonayaCard(shareCardRef, {
        fileName: `shoonaya-festival-${slug}.png`,
        dialogTitle: `Share ${name}`,
        fallbackMessage: `${name}\n\n${tagline}`,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <ReaderShell
      title={name}
      subtitle={tagline}
      fallbackBackUrl="/(tabs)"
      themeColor={theme.brand}
      ambientGlowColor={theme.brand}
      fontPresets={FONT_PRESETS}
      fontStep={fontStep}
      setFontStep={setFontStep}
      languages={hasLocalFestival ? [{ code: 'en', label: 'EN' }, { code: 'local', label: 'हिंदी' }] : undefined}
      currentLanguage={lang}
      setLanguage={setLang}
      onShare={publishable ? handleShare : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <Card style={{ padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 36 }}>{festival?.emoji ?? '🪔'}</Text>
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
            <Text style={{ ...TYPE.body, color: theme.text, fontSize: TYPE.body.fontSize * fsScale, lineHeight: 22 * fsScale }}>{significance}</Text>
          </Card>
        ) : null}

        {rituals.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Rituals</Text>
            {rituals.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <Feather name="circle" size={6} color={theme.brand} style={{ marginTop: 8 }} />
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 * fsScale, lineHeight: TYPE.body.lineHeight * fsScale }}>{item}</Text>
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
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 * fsScale, lineHeight: TYPE.body.lineHeight * fsScale }}>{item}</Text>
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
                <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: 13 * fsScale, lineHeight: TYPE.body.lineHeight * fsScale }}>{item}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {pujaItems.length > 0 ? (
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8 }}>Puja Items</Text>
            <Text style={{ ...TYPE.body, color: theme.text, fontSize: TYPE.body.fontSize * fsScale, lineHeight: 20 * fsScale }}>{pujaItems.join(', ')}</Text>
          </Card>
        ) : null}

        {mantraTranslation ? (
          <Card style={{ padding: 16, marginBottom: 16, backgroundColor: theme.brandSoft, borderColor: theme.brand }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 6 }}>Sacred Mantra</Text>
            {mantraText ? (
              <Text style={{ fontFamily: FONTS.serif, fontSize: 16 * fsScale, lineHeight: 24 * fsScale, color: theme.text, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
                {mantraText}
              </Text>
            ) : null}
            {festival?.mantra?.transliteration ? (
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12 * fsScale, lineHeight: 16 * fsScale, color: theme.dim, textAlign: 'center' }}>
                {festival.mantra.transliteration}
              </Text>
            ) : null}
            <Text style={{ ...TYPE.body, color: theme.text, fontSize: TYPE.body.fontSize * fsScale, lineHeight: TYPE.body.lineHeight * fsScale, textAlign: 'center', marginTop: 6 }}>{mantraTranslation}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Off-screen, rasterized by shareCapturedShoonayaCard via
          react-native-view-shot -- same pattern as app/shloka.tsx. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0, width: 360, height: 640 }}>
        <View collapsable={false}>
          <ShoonayaShareCard
            ref={shareCardRef}
            data={{
              tradition: 'universal',
              layout: 'sacredText',
              headlineValue: resolveFestivalShareHeadline({
                publishable,
                mantraText: mantraText || festival?.mantra?.sanskrit,
                mantraTranslation,
                tagline,
              }),
              title: name,
              subtitle: tagline,
              caption: significance,
              footer: occurrence?.civilDate ?? occurrence?.date ?? undefined,
            }}
          />
        </View>
      </View>
    </ReaderShell>
  );
}
