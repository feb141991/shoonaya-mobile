import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, TYPE, RADII, themeColor } from '@/lib/constants';
import { lookupFestivalContent } from '@/lib/festival-content.generated';
import { OBSERVANCE_SERIES_CONTENT_SNAPSHOT } from '@/lib/observance-series-content.generated';
import {
  getSeriesChildContent,
  getSeriesGroupContent,
  formatSeriesDayLabel,
  resolveLocalizedText,
  resolveLocalizedList,
  type SupportedLanguage,
  type EditorialApplicabilityContext,
} from '@/lib/observance-series-content';
import type { LocalizedEditorialField } from '@/lib/observance-series-content.generated';
import {
  resolveFestivalText,
  resolveFestivalList,
  isFestivalPublishable,
  resolveFestivalShareHeadline,
} from '@/lib/festival-content-helpers';
import type { ClientObservanceResult } from '@/lib/calendar-contract';
import { spiritualDate } from '@/lib/spiritualDate';
import { ReaderShell } from '@/components/reader/ReaderShell';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { FestivalEmblem } from '@/components/festivals/FestivalEmblem';

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
  const params = useLocalSearchParams<{ slug: string; day?: string; seq?: string; date?: string; child?: string }>();
  const slug = params.slug ?? '';
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColor(isDark);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const [occurrence, setOccurrence] = useState<ClientObservanceResult | null>(null);
  const [occurrenceLoading, setOccurrenceLoading] = useState(true);
  const [liveStory, setLiveStory] = useState<LiveObservanceStory | null>(null);
  const [storyLoading, setStoryLoading] = useState(true);
  // `language` (global) seeds this page's initial reading language, but the
  // in-page toggle below must stay page-local: it's a "read this one page in
  // a different language" preview, not an account-wide setting, and must not
  // overwrite the user's global app_language/Supabase profile.
  const { language } = useLanguage();
  const [readerLanguageOverride, setReaderLanguageOverride] = useState<typeof language | null>(null);
  const readerLanguage = readerLanguageOverride ?? language;
  const [fontStep, setFontStep] = useState(1);
  const [sharing, setSharing] = useState(false);
  const [copiedMantra, setCopiedMantra] = useState(false);
  const [activeJumpSection, setActiveJumpSection] = useState<string>('essence');
  const [sectionPositions, setSectionPositions] = useState<Record<string, number>>({});
  const shareCardRef = useRef<View | null>(null);

  const resolvedLang: 'en' | 'hi' | 'pa' = readerLanguage;
  const fsScale = fontStep === 0 ? 0.85 : fontStep === 1 ? 1 : fontStep === 2 ? 1.15 : 1.3;

  const festival = useMemo(() => lookupFestivalContent(slug), [slug]);
  const seriesChild = useMemo(() => getSeriesChildContent(slug), [slug]);
  const seriesGroup = useMemo(() => getSeriesGroupContent(slug), [slug]);
  const isNavratriSlug = useMemo(() =>
    slug === 'sharad-navratri' ||
    slug === 'navratri-begins' ||
    slug.startsWith('navratri-day-') ||
    slug === 'durga-ashtami' ||
    slug === 'maha-navami' ||
    slug === 'dussehra' ||
    slug === 'vijayadashami',
  [slug]);

  useEffect(() => {
    if (seriesGroup && seriesGroup.children.length > 0 && slug === seriesGroup.definitionKey) {
      if (params.child) {
        const matchingChild = seriesGroup.children.find((c) => c.slug === params.child);
        if (matchingChild) {
          router.replace(`/festival/${matchingChild.slug}`);
          return;
        }
      }
      const targetSeq = Number(params.day || params.seq);
      if (targetSeq >= 1 && targetSeq <= seriesGroup.children.length) {
        const matchingChild = seriesGroup.children[targetSeq - 1];
        if (matchingChild) {
          router.replace(`/festival/${matchingChild.slug}`);
          return;
        }
      }

      // Check if today falls in the series window
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const today = spiritualDate(deviceTimezone);
      if (seriesGroup.definitionKey === 'pitru-paksha') {
        const startDate = new Date('2026-09-27T00:00:00Z');
        const currDate = new Date(`${today}T00:00:00Z`);
        const diffDays = Math.floor((currDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < seriesGroup.children.length) {
          router.replace(`/festival/${seriesGroup.children[diffDays].slug}`);
          return;
        }
      }
      if (seriesGroup.definitionKey === 'sharad-navratri') {
        const startDate = new Date('2026-10-11T00:00:00Z');
        const currDate = new Date(`${today}T00:00:00Z`);
        const diffDays = Math.floor((currDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < seriesGroup.children.length) {
          router.replace(`/festival/${seriesGroup.children[diffDays].slug}`);
          return;
        }
      }

      router.replace(`/festival/${seriesGroup.children[0].slug}`);
    }
  }, [seriesGroup, slug, router, params.day, params.seq, params.child]);

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
        let found: ClientObservanceResult | null = matching.find((o) => o.isPrimary) ?? matching[0] ?? null;

        // If not in observances, search data.series children
        if (!found && Array.isArray(data?.series)) {
          for (const s of data.series) {
            if (Array.isArray(s.children)) {
              const matchedChild = s.children.find((c: any) => c.slug === slug || c.routeSlug === slug);
              if (matchedChild && matchedChild.civilDate) {
                found = {
                  date: matchedChild.civilDate,
                  civilDate: matchedChild.civilDate,
                  slug: matchedChild.slug,
                  display_name: matchedChild.title,
                  emoji: '🕊️',
                  kind: 'vrat',
                  tradition: (s.tradition as any) || 'hindu',
                  route_kind: matchedChild.routeKind || 'festival',
                  route_slug: matchedChild.routeSlug || matchedChild.slug,
                  description: '',
                  festivalId: matchedChild.occurrenceId || matchedChild.slug,
                  status: matchedChild.status === 'missing' ? 'unresolved' : (matchedChild.status || 'resolved'),
                  candidateDates: [matchedChild.civilDate],
                  reviewPlacementDate: null,
                  location: s.location || { label: 'Ujjain', lat: 23.1765, lon: 75.7885, tz: deviceTimezone },
                  profile: s.profile || { calendar: 'legacy-ujjain', tradition: 'hindu' },
                  versions: s.versions || { panchangaCore: '1.0.0', calendarProfile: '1.0.0', ruleEngine: '1.0.0', rule: '1.0.0' },
                  reasons: [],
                  alternatives: [],
                  confidence: 'high',
                  diagnostics: matchedChild.diagnostics || [],
                  sourceRefs: (matchedChild.sourceRefs as any) || [],
                  reviewStatus: 'verified',
                  isPrimary: true,
                };
                break;
              }
            }
          }
        }

        // Canonical ratified fallback for Pitru Paksha 2026 series days if offline or older backend response
        if (!found && (slug === 'pitru-paksha' || slug.startsWith('pitru-paksha-') || slug === 'mahalaya-amavasya')) {
          const childSeq = seriesChild?.sequence ?? 1;
          const startDate = new Date('2026-09-27T00:00:00Z');
          const dayOffset = childSeq - 1;
          const computedDate = new Date(startDate.getTime() + dayOffset * 86400000).toISOString().split('T')[0];
          found = {
            date: computedDate,
            civilDate: computedDate,
            slug,
            display_name: seriesChild?.canonicalTitle?.value?.en || slug,
            emoji: '🕊️',
            kind: 'vrat',
            tradition: 'hindu',
            route_kind: 'festival',
            route_slug: slug,
            description: '',
            festivalId: slug,
            status: 'resolved',
            candidateDates: [computedDate],
            reviewPlacementDate: null,
            location: { label: 'Ujjain', lat: 23.1765, lon: 75.7885, tz: deviceTimezone },
            profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
            versions: { panchangaCore: '1.0.0', calendarProfile: '1.0.0', ruleEngine: '1.0.0', rule: '1.0.0' },
            reasons: [],
            alternatives: [],
            confidence: 'high',
            diagnostics: [],
            sourceRefs: (seriesChild?.canonicalTitle?.sourceRefs as any) || [],
            reviewStatus: 'verified',
            isPrimary: true,
          };
        }

        // Canonical ratified fallback for Sharad Navratri 2026 if offline or older backend response
        if (!found && isNavratriSlug) {
          const childSeq = seriesChild?.sequence ?? (slug === 'durga-ashtami' ? 8 : (slug === 'maha-navami' ? 9 : (slug === 'dussehra' || slug === 'vijayadashami' ? 10 : 1)));
          const startDate = new Date('2026-10-11T00:00:00Z');
          const dayOffset = childSeq - 1;
          const computedDate = new Date(startDate.getTime() + dayOffset * 86400000).toISOString().split('T')[0];
          found = {
            date: computedDate,
            civilDate: computedDate,
            slug,
            display_name: seriesChild?.canonicalTitle?.value?.en || (slug === 'sharad-navratri' || slug === 'navratri-begins' ? 'Sharad Navratri' : (slug === 'dussehra' ? 'Vijayadashami / Dussehra' : slug)),
            emoji: '🔱',
            kind: 'vrat',
            tradition: 'hindu',
            route_kind: 'festival',
            route_slug: slug,
            description: '',
            festivalId: slug,
            status: 'resolved',
            candidateDates: [computedDate],
            reviewPlacementDate: null,
            location: { label: 'Ujjain', lat: 23.1765, lon: 75.7885, tz: deviceTimezone },
            profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
            versions: { panchangaCore: '1.0.0', calendarProfile: '1.0.0', ruleEngine: '1.0.0', rule: '1.0.0' },
            reasons: [],
            alternatives: [],
            confidence: 'high',
            diagnostics: [],
            sourceRefs: (seriesChild?.canonicalTitle?.sourceRefs as any) || [],
            reviewStatus: 'verified',
            isPrimary: true,
          };
        }

        setOccurrence(found);

        if (seriesGroup && slug === seriesGroup.definitionKey && !params.day && !params.seq && !params.child) {
          const today = spiritualDate(deviceTimezone);
          const targetDate = params.date || today;
          const todayOccurrence = matching.find((o) => o.date === targetDate && seriesGroup.children.some((c) => c.slug === o.slug));
          if (todayOccurrence?.slug) {
            router.replace(`/festival/${todayOccurrence.slug}`);
          }
        }
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          if (slug === 'pitru-paksha' || slug.startsWith('pitru-paksha-') || slug === 'mahalaya-amavasya') {
            const childSeq = seriesChild?.sequence ?? 1;
            const startDate = new Date('2026-09-27T00:00:00Z');
            const dayOffset = childSeq - 1;
            const computedDate = new Date(startDate.getTime() + dayOffset * 86400000).toISOString().split('T')[0];
            setOccurrence({
              date: computedDate,
              civilDate: computedDate,
              slug,
              display_name: seriesChild?.canonicalTitle?.value?.en || slug,
              emoji: '🕊️',
              kind: 'vrat',
              tradition: 'hindu',
              route_kind: 'festival',
              route_slug: slug,
              description: '',
              festivalId: slug,
              status: 'resolved',
              candidateDates: [computedDate],
              reviewPlacementDate: null,
              location: { label: 'Ujjain', lat: 23.1765, lon: 75.7885, tz: deviceTimezone },
              profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
              versions: { panchangaCore: '1.0.0', calendarProfile: '1.0.0', ruleEngine: '1.0.0', rule: '1.0.0' },
              reasons: [],
              alternatives: [],
              confidence: 'high',
              diagnostics: [],
              sourceRefs: (seriesChild?.canonicalTitle?.sourceRefs as any) || [],
              reviewStatus: 'verified',
              isPrimary: true,
            });
          } else if (isNavratriSlug) {
            const childSeq = seriesChild?.sequence ?? (slug === 'durga-ashtami' ? 8 : (slug === 'maha-navami' ? 9 : (slug === 'dussehra' || slug === 'vijayadashami' ? 10 : 1)));
            const startDate = new Date('2026-10-11T00:00:00Z');
            const dayOffset = childSeq - 1;
            const computedDate = new Date(startDate.getTime() + dayOffset * 86400000).toISOString().split('T')[0];
            setOccurrence({
              date: computedDate,
              civilDate: computedDate,
              slug,
              display_name: seriesChild?.canonicalTitle?.value?.en || (slug === 'sharad-navratri' || slug === 'navratri-begins' ? 'Sharad Navratri' : (slug === 'dussehra' ? 'Vijayadashami / Dussehra' : slug)),
              emoji: '🔱',
              kind: 'vrat',
              tradition: 'hindu',
              route_kind: 'festival',
              route_slug: slug,
              description: '',
              festivalId: slug,
              status: 'resolved',
              candidateDates: [computedDate],
              reviewPlacementDate: null,
              location: { label: 'Ujjain', lat: 23.1765, lon: 75.7885, tz: deviceTimezone },
              profile: { calendar: 'legacy-ujjain', tradition: 'hindu' },
              versions: { panchangaCore: '1.0.0', calendarProfile: '1.0.0', ruleEngine: '1.0.0', rule: '1.0.0' },
              reasons: [],
              alternatives: [],
              confidence: 'high',
              diagnostics: [],
              sourceRefs: (seriesChild?.canonicalTitle?.sourceRefs as any) || [],
              reviewStatus: 'verified',
              isPrimary: true,
            });
          } else {
            setOccurrence(null);
          }
        }
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) setOccurrenceLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, seriesChild]);

  const handleSectionLayout = useCallback((key: string, y: number) => {
    setSectionPositions((prev) => ({ ...prev, [key]: y }));
  }, []);

  const scrollToSection = (key: string) => {
    setActiveJumpSection(key);
    const targetY = sectionPositions[key];
    if (typeof targetY === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, targetY - 12), animated: true });
    }
  };

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const entries = Object.entries(sectionPositions).sort((a, b) => a[1] - b[1]);
    for (let i = entries.length - 1; i >= 0; i--) {
      const [key, y] = entries[i];
      if (scrollY >= y - 80) {
        setActiveJumpSection(key);
        break;
      }
    }
  }, [sectionPositions]);

  const seriesContext = useMemo(() => {
    for (const s of OBSERVANCE_SERIES_CONTENT_SNAPSHOT.series) {
      let childIndex = s.children.findIndex((c: any) => c.slug === slug);
      if (childIndex === -1 && s.definitionKey === slug) {
        childIndex = 0;
      }
      if (childIndex !== -1) {
        const currentLang = (resolvedLang as SupportedLanguage) || 'en';
        return {
          seriesKey: s.definitionKey,
          tradition: s.tradition,
          seriesName: (resolvedLang === 'hi' && (s.name as any)?.value?.hi) ? (s.name as any).value.hi : ((s.name as any)?.value?.en || s.definitionKey),
          children: s.children.map((c: any) => ({
            seq: c.sequence,
            slug: c.slug,
            label: formatSeriesDayLabel(c, currentLang),
          })),
          currentIndex: childIndex,
          prevChild: childIndex > 0 ? {
            ...s.children[childIndex - 1],
            label: formatSeriesDayLabel(s.children[childIndex - 1], currentLang),
          } : null,
          nextChild: childIndex < s.children.length - 1 ? {
            ...s.children[childIndex + 1],
            label: formatSeriesDayLabel(s.children[childIndex + 1], currentLang),
          } : null,
        };
      }
    }
    return null;
  }, [slug, resolvedLang]);

  const handleCopyMantra = async () => {
    const textToCopy = mantraText ? `${mantraText}\n\n${mantraTranslation}` : mantraTranslation;
    if (!textToCopy) return;
    await Clipboard.setStringAsync(textToCopy);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedMantra(true);
    setTimeout(() => setCopiedMantra(false), 2000);
  };

  const liveTranslation = liveStory?.translations?.[resolvedLang] ?? liveStory?.translations?.['en'];

  const editorialContext: EditorialApplicabilityContext = {
    tradition: occurrence?.tradition ?? liveStory?.tradition ?? seriesContext?.tradition ?? 'hindu',
    calendarProfile: occurrence?.profile?.calendar ?? 'legacy-ujjain',
  };
  const getSeriesChildValue = (field?: LocalizedEditorialField<{ en: string; hi?: string; pa?: string }>) =>
    resolveLocalizedText(field, resolvedLang as SupportedLanguage, editorialContext);

  const name =
    liveTranslation?.title ||
    liveStory?.displayName ||
    (festival ? resolveFestivalText(festival.name, resolvedLang) : '') ||
    getSeriesChildValue(seriesChild?.canonicalTitle) ||
    (seriesGroup ? resolveLocalizedText(seriesGroup.name, resolvedLang as SupportedLanguage, editorialContext) : '') ||
    festival?.definitionKey ||
    slug;

  const tagline =
    liveTranslation?.teaser ||
    (festival ? resolveFestivalText(festival.tagline, resolvedLang) : '') ||
    getSeriesChildValue(seriesChild?.deityOrTheme);

  const significance =
    liveTranslation?.significance ||
    (festival ? resolveFestivalText(festival.significance, resolvedLang) : '') ||
    getSeriesChildValue(seriesChild?.significance);

  const publishable = Boolean(liveStory) || Boolean(seriesChild) || (festival ? isFestivalPublishable(festival) : false);

  const resolveListContent = (field: any): string[] => {
    if (!field) return [];
    const canonical = resolveFestivalList(field, resolvedLang);
    if (canonical.length > 0) return canonical;
    if (publishable && field.value) {
      if (resolvedLang === 'hi' && Array.isArray(field.value.hi) && field.value.hi.length > 0) return field.value.hi;
      if (Array.isArray(field.value.en) && field.value.en.length > 0) return field.value.en;
    }
    return [];
  };

  const seriesChildRituals = resolveLocalizedList(seriesChild?.rituals,
    resolvedLang as SupportedLanguage, editorialContext);

  const rituals = (liveTranslation?.rituals && liveTranslation.rituals.length > 0)
    ? liveTranslation.rituals
    : (festival ? resolveListContent(festival.rituals) : seriesChildRituals);

  const isPitruSlug = slug === 'pitru-paksha' || slug.startsWith('pitru-paksha-') || slug === 'mahalaya-amavasya';

  const pitruDos = resolvedLang === 'pa'
    ? [
        'ਦੁਪਹਿਰ ਵੇਲੇ (ਕੁਤੁਪ ਜਾਂ ਰੋਹਿਣ ਮੁਹੂਰਤ) ਦੱਖਣ ਵੱਲ ਮੁੱਖ ਕਰਕੇ ਸ਼ਰਧਾ ਨਾਲ ਤਰਪਣ ਕਰੋ',
        'ਸਾਫ ਕੱਪੜੇ ਅਤੇ ਹੱਥ ਵਿੱਚ ਕੁਸ਼ਾ ਧਾਰਨ ਕਰਕੇ ਪਿਤਰਾਂ ਨੂੰ ਯਾਦ ਕਰੋ',
        'ਭੋਜਨ ਤੋਂ ਪਹਿਲਾਂ ਗਊ, ਕਾਂ, ਕੁੱਤੇ ਅਤੇ ਕੀੜੀਆਂ ਨੂੰ ਪੰਚਬਲੀ ਦਾ ਅੰਨ ਅਰਪਣ ਕਰੋ',
        'ਲੋੜਵੰਦਾਂ ਜਾਂ ਬ੍ਰਾਹਮਣ ਨੂੰ ਸਾਤਵਿਕ ਅੰਨ, ਬਸਤਰ ਅਤੇ ਦਾਨ ਦਿਓ',
      ]
    : resolvedLang === 'hi'
      ? [
          'अपराह्न काल (कुतुप या रोहिण मुहूर्त) में दक्षिण दिशा की ओर मुख कर तर्पण करें',
          'श्वेत अथवा सात्विक वस्त्र और अनामिका में कुश की पवित्री धारण करें',
          'भोजन से पूर्व पंचबलि (गाय, कौवा, कुत्ता, देव व चींटियों) का भाग अवश्य निकालें',
          'ब्राह्मण अथवा जरूरतमंदों को श्रद्धापूर्वक अन्नदान व दक्षिणा दें',
        ]
      : [
          'Perform Tarpan in the afternoon during Kutup or Rohina Muhurta facing South',
          'Wear clean white or light-coloured attire with Kusha grass Pavitri on the ring finger',
          'Offer Panchabali (food portions to cow, crow, dog, gods, and ants) before eating',
          'Offer Anna Daan (satvik meal) and dakshina to Brahmins or the needy with deep reverence',
        ];

  const pitruDonts = resolvedLang === 'pa'
    ? [
        'ਸਵੇਰੇ, ਸ਼ਾਮ ਜਾਂ ਰਾਤ ਵੇਲੇ ਸਰਾਧ ਕਰਮ ਨਾ ਕਰੋ; ਸਿਰਫ ਦੁਪਹਿਰ ਵੇਲੇ ਕਰੋ',
        'ਲੋਹੇ ਦੇ ਭਾਂਡਿਆਂ ਦੀ ਵਰਤੋਂ ਤੋਂ ਬਚੋ; ਤਾਂਬਾ, ਪਿੱਤਲ ਜਾਂ ਚਾਂਦੀ ਵਰਤੋ',
        'ਲਸਣ, ਪਿਆਜ਼, ਮਸਰਾਂ ਦੀ ਦਾਲ ਜਾਂ ਤਾਮਸਿਕ ਭੋਜਨ ਨਾ ਖਾਓ',
        'ਸਰਾਧ ਦੇ ਦਿਨ ਕ੍ਰੋਧ, ਲੜਾਈ-ਝਗੜੇ ਅਤੇ ਸ਼ੁਭ ਕਾਰਜਾਂ ਤੋਂ ਪਰਹੇਜ਼ ਕਰੋ',
      ]
    : resolvedLang === 'hi'
      ? [
          'प्रातःकाल, सांध्यकाल अथवा रात्रि में श्राद्ध व तर्पण कदापि न करें',
          'श्राद्ध कर्म में लोहे के बर्तनों का प्रयोग न करें; तांबा, पीतल अथवा चांदी उत्तम है',
          'प्याज, लहसुन, मसूर की दाल अथवा तामसिक अन्न का सेवन न करें',
          'श्राद्ध के दिन क्रोध, कलह, बाल-नाखून काटना व मांगलिक उत्सव वर्जित हैं',
        ]
      : [
          'Do not perform Pitru Shraddha rites during dawn, dusk, or nighttime',
          'Do not use iron utensils for Shraddha cooking or water offerings; prefer copper, brass, or silver',
          'Do not consume or serve tamasic food containing onion, garlic, or masoor dal',
          'Avoid anger, disputes, cutting hair/nails, or celebrating auspicious occasions on Shraddha day',
        ];

  const pitruPujaItems = resolvedLang === 'pa'
    ? ['ਪਵਿੱਤਰ ਜਲ / ਗੰਗਾ ਜਲ', 'ਕਾਲੇ ਤਿਲ (ਕਾਲਾ ਤਿਲ)', 'ਕੁਸ਼ਾ ਘਾਹ ਤੇ ਪਵਿਤਰੀ', 'ਜੌਂ ਅਤੇ ਚੌਲ (ਅਕਸ਼ਤ)', 'ਗਾਂ ਦਾ ਦੁੱਧ, ਦਹੀਂ, ਘਿਓ ਤੇ ਸ਼ਹਿਦ', 'ਚਿੱਟੇ ਫੁੱਲ ਅਤੇ ਚੰਦਨ']
    : resolvedLang === 'hi'
      ? ['शुद्ध जल (गंगाजल अथवा स्वच्छ जल)', 'काले तिल (काला तिल)', 'कुशा एवं कुशा पवित्री', 'जौ (यव) एवं अक्षत', 'गाय का कच्चा दूध, दही, घी व शहद', 'सफेद पुष्प एवं श्वेत चंदन']
      : ['Pure Water (Ganga Jal or well water)', 'Black Sesame Seeds (Kala Til)', 'Kusha Grass and Kusha Pavitri', 'Barley (Jau) and Akshat (unbroken rice)', 'Cow Milk, Curd, Ghee, and Honey', 'White Flowers and White Sandalwood Paste (Chandan)'];

  const pitruMantraSanskrit = 'ॐ देवताभ्यः पितृभ्यश्च महायोगिभ्य एव च। नमः स्वाहायै स्वधायै नित्यमेव नमो नमः॥';
  const pitruMantraTranslation = resolvedLang === 'pa'
    ? 'ਸਾਰੇ ਦੇਵਤਿਆਂ, ਪਿਤਰਾਂ ਅਤੇ ਮਹਾਂਯੋਗੀਆਂ ਨੂੰ ਪ੍ਰਣਾਮ। ਸਵਾਹਾ ਅਤੇ ਸਵਧਾ ਨੂੰ ਸਦਾ ਨਮਸਕਾਰ।'
    : resolvedLang === 'hi'
      ? 'समस्त देवताओं, पितरों और महायोगियों को बारंबार नमस्कार। स्वाहा और स्वधा स्वरूपिणी शक्तियों को नित्य नमन।'
      : 'Salutations to the revered deities, ancestors, and great yogis. Forever reverence to Svaha and Svadha.';

  const navratriDos = resolvedLang === 'pa'
    ? [
        'ਸਾਤਵਿਕ ਆਹਾਰ (ਫਲਾਹਾਰ, ਫਲ, ਦੁੱਧ) ਲਵੋ ਅਤੇ ਨਰਾਤਿਆਂ ਦੇ ਪਵਿੱਤਰ ਨਿਯਮਾਂ ਦੀ ਪਾਲਣਾ ਕਰੋ',
        'ਸਵੇਰੇ ਅਤੇ ਸ਼ਾਮ ਘਿਓ ਦਾ ਦੀਵਾ ਜਗਾ ਕੇ ਮਾਂ ਭਗਵਤੀ ਦੀ ਆਰਤੀ ਤੇ ਪ੍ਰਾਰਥਨਾ ਕਰੋ',
        'ਦੁਰਗਾ ਸਪਤਸ਼ਤੀ, ਦੇਵੀ ਕਵਚ ਜਾਂ ਨਵਾਰਣ ਮੰਤਰ ਦਾ ਸ਼ਰਧਾ ਭਾਵ ਨਾਲ ਪਾਠ ਤੇ ਸਿਮਰਨ ਕਰੋ',
        'ਜੇ ਅਖੰਡ ਜੋਤ ਜਗਾਈ ਹੈ ਤਾਂ ਉਸਦੀ ਲਗਾਤਾਰ ਦੇਖਭਾਲ ਰੱਖੋ',
        'ਅਸ਼ਟਮੀ ਜਾਂ ਨੌਮੀ ਦੇ ਪਵਿੱਤਰ ਦਿਨ ਕੰਜਕ ਪੂਜਨ (ਕੰਨਿਆ ਪੂਜਾ) ਕਰਕੇ ਪ੍ਰਸਾਦ ਅਤੇ ਦੱਛਣਾ ਭੇਟ ਕਰੋ',
      ]
    : resolvedLang === 'hi'
      ? [
          'सात्विक आहार (फलाहार, कुट्टू/सिंघाड़े का आटा, फल, दूध) ग्रहण करें और मन-कर्म-वचन से पवित्रता (ब्रह्मचर्य) रखें',
          'प्रतिदिन प्रातः व सायं शुद्ध घी का दीपक जलाकर शंख-घंटी की ध्वनि के साथ माँ भगवती की आरती करें',
          'दुर्गा सप्तशती (चंडी पाठ), देवी कवच अथवा नवार्ण मंत्र का एकाग्रचित्त होकर नियमित जप करें',
          'यदि अखंड ज्योति स्थापित की हो तो ध्यान रखें कि तेल/घी पर्याप्त रहे और दीप बुझने न पाए',
          'अष्टमी अथवा नवमी पर कन्या पूजन कर नौ कन्याओं को देवी मानकर आदरपूर्वक भोजन, उपहार व दक्षिणा दें',
        ]
      : [
          'Observe a pure sattvic diet (fruits, milk, buckwheat) and maintain self-restraint and celibacy (Brahmacharya)',
          'Perform daily morning and evening Aarti with a pure ghee lamp, incense, and bells before the altar',
          'Recite Durga Saptashati (Chandi Path), Devi Kavacham, or chant the Navarna Mantra with unbroken devotion',
          'If keeping an Akhand Jyot (unbroken flame), ensure it is attended with reverence and never left unmonitored',
          'Perform Kanya Pujan on Ashtami or Navami, honoring young girls as living embodiments of Goddess Durga',
        ];

  const navratriDonts = resolvedLang === 'pa'
    ? [
        'ਮਾਸ, ਸ਼ਰਾਬ, ਪਿਆਜ਼ ਅਤੇ ਲਸਣ ਵਰਗੇ ਤਾਮਸਿਕ ਭੋਜਨ ਤੋਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਪਰਹੇਜ਼ ਰੱਖੋ',
        'ਨਰਾਤਿਆਂ ਦੇ ਪਵਿੱਤਰ ਨੌਂ ਦਿਨਾਂ ਦੌਰਾਨ ਵਾਲ ਜਾਂ ਨਹੁੰ ਕੱਟਣ ਤੋਂ ਬਚੋ',
        'ਜੇ ਅਖੰਡ ਜੋਤ ਜਗਾਈ ਹੋਵੇ ਤਾਂ ਘਰ ਨੂੰ ਇਕੱਲਾ ਜਾਂ ਤਾਲਾ ਲਗਾ ਕੇ ਨਾ ਛੱਡੋ',
        'ਵਰਤ ਦੇ ਦਿਨਾਂ ਵਿੱਚ ਗੁੱਸੇ, ਝੂਠ, ਨਿੰਦਾ ਅਤੇ ਲੜਾਈ-ਝਗੜੇ ਤੋਂ ਦੂਰ ਰਹੋ',
        'ਦਸਮੀ ਤੇ ਵਿਸਰਜਨ ਤੋਂ ਪਹਿਲਾਂ ਸਥਾਪਿਤ ਕਲਸ਼ ਅਤੇ ਬੀਜੇ ਹੋਏ ਜੌਂਆਂ ਨੂੰ ਨਾ ਛੇੜੋ',
      ]
    : resolvedLang === 'hi'
      ? [
          'तामसिक भोजन जैसे मांसाहार, प्याज, लहसुन और मदिरा का नौ दिनों तक पूर्ण त्याग रखें',
          'नवरात्रि के पावन दिनों में बाल कटवाना, दाढ़ी बनाना और नाखून काटना वर्जित माना गया है',
          'यदि घर में अखंड ज्योति प्रज्वलित की हो तो घर में ताला लगाकर उसे अकेला न छोड़ें',
          'व्रत के दौरान क्रोध, कलह, परनिंदा, असत्य भाषण और दिन में सोने से बचें',
          'दशमी पर विसर्जन मुहूर्त से पूर्व स्थापित कलश अथवा बोए गए जौ (जवारे) को न हिलाएं',
        ]
      : [
          'Strictly avoid all tamasic foods: non-vegetarian foods, onion, garlic, and alcohol',
          'Do not cut hair, shave, or clip nails during the nine holy nights of Navratri',
          'Never lock the home or leave it unattended if an Akhand Jyot has been consecrated',
          'Avoid anger, harsh speech, deception, quarrels, and daytime sleeping during fasting days',
          'Do not disturb or move the consecrated Kalash and sown barley until ritual Visarjan on Dashami',
        ];

  const navratriPujaItems = resolvedLang === 'pa'
    ? [
        'ਮਿੱਟੀ ਜਾਂ ਤਾਂਬੇ ਦਾ ਕਲਸ਼, ਜਟਾ ਵਾਲਾ ਨਾਰੀਅਲ, ਲਾਲ ਚੁੰਨੀ, ਮੌਲੀ ਅਤੇ ਅੰਬ ਦੇ ਪੱਤੇ',
        'ਪਵਿੱਤਰ ਮਿੱਟੀ, ਕੱਚਾ ਥਾਲ ਅਤੇ ਬੀਜਣ ਲਈ ਸਾਫ ਜੌਂ',
        'ਰੋਲੀ, ਕੁਮਕੁਮ, ਅਕਸ਼ਤ (ਸਾਬੁਤ ਚੌਲ), ਚੰਦਨ, ਕਪੂਰ ਅਤੇ ਗਾਂ ਦਾ ਸ਼ੁੱਧ ਘਿਓ',
        'ਲਾਲ ਗੁੜਹਲ ਜਾਂ ਗੁਲਾਬ ਦੇ ਫੁੱਲ, ਪਾਨ ਦੇ ਪੱਤੇ, ਸੁਪਾਰੀ, ਲੌਂਗ ਅਤੇ ਇਲਾਇਚੀ',
        'ਮੌਸਮੀ ਫਲ, ਪੰਚਮੇਵਾ, ਮਿਸ਼ਰੀ, ਬਤਾਸ਼ੇ ਅਤੇ ਮਾਂ ਦੇ ਭੋਗ ਲਈ ਸਾਤਵਿਕ ਪ੍ਰਸਾਦ',
      ]
    : resolvedLang === 'hi'
      ? [
          'मिट्टी अथवा तांबे का कलश, जटा वाला नारियल, लाल चुनरी, कलावा (मौली) और आम के पल्लव',
          'शुद्ध मिट्टी, मिट्टी का चौड़ा पात्र और बोने हेतु साफ जौ',
          'रोली, कुमकुम, साबुत अक्षत (चावल), चंदन, धूप, कपूर और शुद्ध गाय का घी',
          'लाल गुड़हल अथवा गुलाब के पुष्प, पान के पत्ते, साबुत सुपारी, लौंग और इलायची',
          'मौसमी फल, पंचमेवा, मिश्री, बताशे और हलवा-पूरी/खीर का सात्विक नैवेद्य',
        ]
      : [
          'Earthen or copper Kalash (pot), raw coconut with husk wrapped in red cloth (Chunari) and sacred thread (Mauli)',
          'Sacred soil (Saptamrittika), clay tray, and clean barley (Jau) seeds for sowing',
          'Fresh mango leaves (Amra Pallav) or Ashoka leaves to adorn the Kalash rim',
          'Roli (kumkum), unbroken rice (Akshat), Chandan, camphor, dhoop, and pure cow ghee',
          'Red hibiscus or rose flowers, betel leaves (Paan), betel nuts (Supari), and cloves',
          'Seasonal satvik fruits, dry fruits, Mishri, batasha, and fresh sweet offerings (Bhog)',
        ];

  const navratriMantraData = useMemo(() => {
    if (slug === 'navratri-day-1-shailaputri') {
      return {
        sanskrit: 'वन्दे वाञ्छितलाभाय चन्द्रार्धकृतशेखराम्। वृषारूढां शूलधरां शैलपुत्रीं यशस्विनीम्॥',
        translation: resolvedLang === 'pa'
          ? 'ਮਨੋਕਾਮਨਾਵਾਂ ਦੀ ਪੂਰਤੀ ਲਈ ਮੈਂ ਅਰਧ-ਚੰਦਰਮਾ ਧਾਰਨ ਕਰਨ ਵਾਲੀ, ਬਲਦ \'ਤੇ ਸਵਾਰ ਅਤੇ ਤ੍ਰਿਸ਼ੂਲਧਾਰੀ ਮਾਂ ਸ਼ੈਲਪੁਤਰੀ ਦੀ ਵੰਦਨਾ ਕਰਦਾ ਹਾਂ।'
          : resolvedLang === 'hi'
            ? 'मनोवांछित फल की प्राप्ति हेतु मैं मस्तक पर अर्धचंद्र धारण करने वाली, वृषभ पर आरूढ़ और त्रिशूलधारिणी यशस्विनी माँ शैलपुत्री की वंदना करता हूँ।'
            : 'I bow to glorious Mother Shailaputri, adorned with the crescent moon upon Her crest, riding the sacred bull, holding the trident to bestow auspicious spiritual fulfillments.',
      };
    }
    if (slug === 'navratri-day-2-brahmacharini') {
      return {
        sanskrit: 'दधाना करपद्माभ्यामक्षमालाकमण्डलू। देवी प्रसीदतु मयि ब्रह्मचारिण्यनुत्तमा॥',
        translation: resolvedLang === 'pa'
          ? 'ਹੱਥਾਂ ਵਿੱਚ ਜਪਮਾਲਾ ਅਤੇ ਕਮੰਡਲ ਧਾਰਨ ਕਰਨ ਵਾਲੀ, ਤਪੱਸਵੀ ਮਾਂ ਬ੍ਰਹਮਚਾਰਿਣੀ ਮੇਰੇ \'ਤੇ ਕ੍ਰਿਪਾ ਕਰਨ।'
          : resolvedLang === 'hi'
            ? 'अपने कर-कमलों में जपमाला और कमंडल धारण करने वाली, अनुपम तपस्विनी माँ ब्रह्मचारिणी मुझ पर प्रसन्न हों।'
            : 'Holding the rosary of sacred beads and the kamandalu in Her lotus hands, may the peerless Goddess Brahmacharini shower Her grace upon me.',
      };
    }
    if (slug === 'navratri-day-3-chandraghanta') {
      return {
        sanskrit: 'पिण्डजप्रवरारूढा चण्डकोपास्त्रकैर्युता। प्रसादिं तनुते मह्यं चन्द्रघण्टेति विश्रुता॥',
        translation: resolvedLang === 'pa'
          ? 'ਸ਼ੇਰ \'ਤੇ ਸਵਾਰ, ਬੁਰਾਈਆਂ ਦਾ ਨਾਸ਼ ਕਰਨ ਵਾਲੀ ਅਤੇ ਘੰਟੇ ਦੀ ਧੁਨੀ ਨਾਲ ਰੱਖਿਆ ਕਰਨ ਵਾਲੀ ਮਾਂ ਚੰਦਰਘੰਟਾ ਸਾਡੇ \'ਤੇ ਮਿਹਰ ਕਰਨ।'
          : resolvedLang === 'hi'
            ? 'सिंह पर सवार, दुष्टों के संहारक अस्त्रों से सुसज्जित और घंटे की घोर ध्वनि से दुखों का नाश करने वाली माँ चंद्रघंटा मुझ पर कृपा बरसाएं।'
            : 'Riding the valiant lion, armed with weapons to dispel all darkness, bearing the crescent bell that rings divine protection, may Goddess Chandraghanta grant Her grace.',
      };
    }
    if (slug === 'navratri-day-4-kushmanda') {
      return {
        sanskrit: 'सुरासम्पूर्णकलशं रुधिराप्लुतमेव च। दधाना हस्तपद्माभ्यां कूष्माण्डा शुभदास्तु मे॥',
        translation: resolvedLang === 'pa'
          ? 'ਆਪਣੇ ਹੱਥਾਂ ਵਿੱਚ ਅੰਮ੍ਰਿਤ ਕਲਸ਼ ਧਾਰਨ ਕਰਨ ਵਾਲੀ ਅਤੇ ਮੁਸਕਾਨ ਨਾਲ ਬ੍ਰਹਿਮੰਡ ਰਚਣ ਵਾਲੀ ਮਾਂ ਕੁਸ਼ਮਾਂਡਾ ਸਭ ਦਾ ਭਲਾ ਕਰਨ।'
          : resolvedLang === 'hi'
            ? 'अपने कर-कमलों में अमृत से परिपूर्ण कलश धारण करने वाली और मंद मुस्कान से ब्रह्मांड की रचना करने वाली माँ कुष्मांडा मुझे मंगल प्रदान करें।'
            : 'Holding in Her lotus hands the vessels of life-force and divine nectar, who brought forth the cosmic egg with Her luminous smile, may Goddess Kushmanda grant auspiciousness.',
      };
    }
    if (slug === 'navratri-day-5-skandamata') {
      return {
        sanskrit: 'सिंहासनगता नित्यं पद्माश्रितकरद्वया। शुभदास्तु सदा देवी स्कन्दमाता यशस्विनी॥',
        translation: resolvedLang === 'pa'
          ? 'ਸ਼ੇਰ ਦੇ ਸਿੰਘਾਸਣ \'ਤੇ ਬਿਰਾਜਮਾਨ, ਦੋਵੇਂ ਹੱਥਾਂ ਵਿੱਚ ਕੰਵਲ ਫੁੱਲ ਅਤੇ ਬਾਲਕ ਕਾਰਤੀਕੇਯ ਨੂੰ ਗੋਦ ਵਿੱਚ ਲਈ ਮਾਂ ਸਕੰਦਮਾਤਾ ਸਦਾ ਖੁਸ਼ੀਆਂ ਬਖਸ਼ਣ।'
          : resolvedLang === 'hi'
            ? 'सदा सिंह के आसन पर विराजमान, अपने दोनों हाथों में कमल पुष्प धारण करने वाली और भगवान कार्तिकेय को गोद में लिए माँ स्कंदमाता सदा शुभ फलदायी हों।'
            : 'Seated ever upon Her lion throne, holding lotus flowers in Her hands with divine child Skanda on Her lap, may glorious Mother Skandamata grant eternal benevolence.',
      };
    }
    if (slug === 'navratri-day-6-katyayani') {
      return {
        sanskrit: 'चन्द्रहासोज्ज्वलकरा शार्दूलवरवाहना। कात्यायनी शुभं दद्याद् देवी दानवघातिनी॥',
        translation: resolvedLang === 'pa'
          ? 'ਚਮਕਦੀ ਤਲਵਾਰ ਧਾਰਨ ਕਰਨ ਵਾਲੀ, ਸ਼ੇਰ \'ਤੇ ਸਵਾਰ ਅਤੇ ਬੁਰਾਈਆਂ ਦਾ ਨਾਸ਼ ਕਰਨ ਵਾਲੀ ਮਾਂ ਕਾਤਿਆਯਨੀ ਸਾਡਾ ਕਲਿਆਣ ਕਰਨ।'
          : resolvedLang === 'hi'
            ? 'चन्द्रहास नामक उज्ज्वल खड्ग धारण करने वाली, श्रेष्ठ सिंह पर सवार और दानवों का संहार करने वाली माँ कात्यायनी हमें मंगल प्रदान करें।'
            : 'Whose hand shines with the luminous Chandrahasa sword, mounted upon the noble lion, destroyer of demonic darkness, may Goddess Katyayani bestow auspicious blessings.',
      };
    }
    if (slug === 'navratri-day-7-kalaratri') {
      return {
        sanskrit: 'करालवदना घोरा मुक्तकेशी चतुर्भुजा। कालरात्रिः कराली च दिव्यरूपा यशस्विनी॥',
        translation: resolvedLang === 'pa'
          ? 'ਅਗਿਆਨਤਾ ਅਤੇ ਹਨੇਰੇ ਨੂੰ ਮਿਟਾਉਣ ਵਾਲੀ, ਸੱਚੇ ਭਗਤਾਂ ਨੂੰ ਅਭੈ ਦਾਨ ਦੇਣ ਵਾਲੀ ਮਾਂ ਕਾਲਰਾਤਰੀ ਸਾਡੀ ਰੱਖਿਆ ਕਰਨ।'
          : resolvedLang === 'hi'
            ? 'अज्ञान और अंधकार का नाश करने वाली, भक्तों को अभय और वरदान देने वाली शुभंकरी माँ कालरात्रि हमारी समस्त बाधाओं से रक्षा करें।'
            : 'The fear-dispelling nocturnal power who destroys darkness and malevolence, granting fearlessness and boons to seekers, may Mother Kalaratri protect us.',
      };
    }
    if (slug === 'durga-ashtami') {
      return {
        sanskrit: 'श्वेते वृषे समारूढा श्वेताम्बरधरा शुचिः। महागौरी शुभं दद्यान्महादेवप्रमोददा॥',
        translation: resolvedLang === 'pa'
          ? 'ਚਿੱਟੇ ਬਲਦ \'ਤੇ ਸਵਾਰ, ਚਿੱਟੇ ਬਸਤਰ ਧਾਰਨ ਕਰਨ ਵਾਲੀ ਅਤੇ ਮਹਾਦੇਵ ਨੂੰ ਪ੍ਰਸੰਨ ਕਰਨ ਵਾਲੀ ਮਾਂ ਮਹਾਗੌਰੀ ਸੁੱਖ-ਸ਼ਾਂਤੀ ਬਖਸ਼ਣ।'
          : resolvedLang === 'hi'
            ? 'श्वेत वृषभ पर सवार, श्वेत वस्त्र धारण करने वाली परम पवित्र और महादेव को आनंदित करने वाली माँ महागौरी सदा शुभ फल प्रदान करें।'
            : 'Riding the pure white bull, clad in pristine white attire, radiating immaculate purity, may Mother Mahagauri who delights Lord Shiva bestow auspicious peace.',
      };
    }
    if (slug === 'maha-navami') {
      return {
        sanskrit: 'सिद्धगन्धर्वयक्षाद्यैरसुरैरमरैरपि। सेव्यमाना सदा भूयात् सिद्धिदा सिद्धिदायिनी॥',
        translation: resolvedLang === 'pa'
          ? 'ਸਿੱਧਾਂ, ਗੰਧਰਵਾਂ ਅਤੇ ਦੇਵਤਿਆਂ ਦੁਆਰਾ ਸਦਾ ਪੂਜੀ ਜਾਣ ਵਾਲੀ, ਸਾਰੀਆਂ ਰਿੱਧੀਆਂ-ਸਿੱਧੀਆਂ ਦੇਣ ਵਾਲੀ ਮਾਂ ਸਿੱਧੀਦਾਤਰੀ ਕ੍ਰਿਪਾ ਕਰਨ।'
          : resolvedLang === 'hi'
            ? 'सिद्धों, गंधर्वों, यक्षों, देवताओं और असुरों द्वारा भी पूजित, समस्त सिद्धियों को प्रदान करने वाली माँ सिद्धिदात्री हम पर प्रसन्न हों।'
            : 'Adored ever by Siddhas, Gandharvas, Yakshas, Gods, and celestial seekers, may Goddess Siddhidatri bestow all spiritual attainments and divine fulfillment.',
      };
    }
    if (slug === 'dussehra' || slug === 'vijayadashami') {
      return {
        sanskrit: 'ॐ जयन्ती मङ्गला काली भद्रकाली कपालिनी। दुर्गा क्षमा शिवा धात्री स्वाहा स्वधा नमोऽस्तु ते॥',
        translation: resolvedLang === 'pa'
          ? 'ਜਯੰਤੀ, ਮੰਗਲਾ, ਕਾਲੀ, ਭੱਦਰਕਾਲੀ, ਕਪਾਲਿਨੀ, ਦੁਰਗਾ, ਖ਼ਿਮਾ, ਸ਼ਿਵਾ, ਧਾਤਰੀ, ਸਵਾਹਾ ਅਤੇ ਸਵਧਾ — ਸਾਰੇ ਰੂਪਾਂ ਵਿੱਚ ਪੂਜੀ ਜਾਣ ਵਾਲੀ ਜਗਤ-ਜਨਨੀ ਮਾਂ ਨੂੰ ਪ੍ਰਣਾਮ।'
          : resolvedLang === 'hi'
            ? 'जयन्ती, मंगला, काली, भद्रकाली, कपालिनी, दुर्गा, क्षमा, शिवा, धात्री, स्वाहा और स्वधा — इन सभी स्वरूपों में पूजित जगज्जननी माँ भगवती को हमारा बारंबार नमन।'
            : 'Salutations to Jayanti, Mangala, Kali, Bhadrakali, Kapalini, Durga, Kshama, Shiva, Dhatri, Svaha, and Svadha — the triumphant protector of the universe.',
      };
    }
    return {
      sanskrit: 'ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे॥',
      translation: resolvedLang === 'pa'
        ? 'ਮਹਾਸਰਸਵਤੀ, ਮਹਾਲਕਸ਼ਮੀ ਅਤੇ ਮਹਾਕਾਲੀ ਦੀ ਸ਼ਕਤੀ ਨੂੰ ਪ੍ਰਣਾਮ ਕਰਦਾ ਪਵਿੱਤਰ ਨਵਾਰਣ ਮੰਤਰ, ਜੋ ਗਿਆਨ, ਖੁਸ਼ਹਾਲੀ ਅਤੇ ਮੁਕਤੀ ਬਖਸ਼ਦਾ ਹੈ।'
        : resolvedLang === 'hi'
          ? 'महासरस्वती, महालक्ष्मी और महाकाली की समन्वित शक्ति को जाग्रत करने वाला परम पावन नवार्ण महामंत्र, जो ज्ञान, समृद्धि और मोक्ष प्रदान करता है।'
          : 'The sacred nine-syllable Navarna Mantra invoking Mahasaraswati, Mahalakshmi, and Mahakali to bestow wisdom, prosperity, and spiritual liberation.',
    };
  }, [slug, resolvedLang]);

  const navratriMantraSanskrit = navratriMantraData.sanskrit;
  const navratriMantraTranslation = navratriMantraData.translation;

  const canonicalDos = festival ? resolveListContent(festival.dos) : [];
  const dos = canonicalDos.length > 0
    ? canonicalDos
    : (liveTranslation?.personalPractice
      ? [liveTranslation.personalPractice]
      : (isPitruSlug ? pitruDos : (isNavratriSlug ? navratriDos : [])));
  const donts = (festival && resolveListContent(festival.donts).length > 0)
    ? resolveListContent(festival.donts)
    : (isPitruSlug ? pitruDonts : (isNavratriSlug ? navratriDonts : []));
  const pujaItems = (festival && resolveListContent(festival.pujaItems).length > 0)
    ? resolveListContent(festival.pujaItems)
    : (isPitruSlug ? pitruPujaItems : (isNavratriSlug ? navratriPujaItems : []));
  const mantraText = liveTranslation?.verse?.original || festival?.mantra?.sanskrit || (isPitruSlug ? pitruMantraSanskrit : (isNavratriSlug ? navratriMantraSanskrit : ''));
  const mantraTranslation = liveTranslation?.verse?.translation || (festival?.mantra ? resolveFestivalText(festival.mantra.translation, resolvedLang) : (isPitruSlug ? pitruMantraTranslation : (isNavratriSlug ? navratriMantraTranslation : '')));

  const traditionKey = festival?.tradition || liveStory?.tradition || seriesContext?.tradition || '';
  const traditionLabel =
    traditionKey === 'hindu'
      ? (resolvedLang === 'pa' ? 'ਸਨਾਤਨ ਪਰੰਪਰਾ' : resolvedLang === 'hi' ? 'सनातन परंपरा' : 'Sanatana Tradition')
      : traditionKey === 'sikh'
      ? (resolvedLang === 'pa' ? 'ਸਿੱਖ ਪਰੰਪਰਾ' : resolvedLang === 'hi' ? 'ਸਿਖ परंपरा' : 'Sikh Tradition')
      : traditionKey === 'jain'
      ? (resolvedLang === 'pa' ? 'ਜੈਨ ਪਰੰਪਰਾ' : resolvedLang === 'hi' ? 'ਜੈਨ परंपरा' : 'Jain Tradition')
      : traditionKey === 'buddhist'
      ? (resolvedLang === 'pa' ? 'ਬੌਧ ਪਰੰਪਰਾ' : resolvedLang === 'hi' ? 'ਬੌਧ परंपरा' : 'Buddhist Tradition')
      : (resolvedLang === 'pa' ? 'ਪਾਵਨ ਪਰਬ' : resolvedLang === 'hi' ? 'पावन पर्व' : 'Sacred Observance');

  const hasHindiFestival = Boolean(
    liveStory?.translations?.hi?.significance ||
    (festival && resolveFestivalText(festival.name, 'hi') && resolveFestivalText(festival.significance, 'hi')) ||
    Boolean(seriesChild?.significance?.value?.hi) ||
    isNavratriSlug
  );

  const hasPunjabiFestival = Boolean(
    liveStory?.translations?.pa?.significance ||
    (festival && resolveFestivalText(festival.name, 'pa') && resolveFestivalText(festival.significance, 'pa')) ||
    Boolean(seriesChild?.significance?.value?.pa) ||
    isNavratriSlug
  );

  const availableLanguages = [
    { code: 'en' as const, label: 'EN' },
    ...(hasHindiFestival ? [{ code: 'hi' as const, label: 'HI' }] : []),
    ...(hasPunjabiFestival ? [{ code: 'pa' as const, label: 'PA' }] : []),
  ];

  const availableSections = useMemo(() => {
    const list: { key: string; label: string; icon: string }[] = [];
    if (significance) list.push({ key: 'essence', label: resolvedLang === 'pa' ? 'ਮਹੱਤਵ' : resolvedLang === 'hi' ? 'महत्व' : 'Essence', icon: '📖' });
    if (rituals.length > 0) list.push({ key: 'rituals', label: resolvedLang === 'pa' ? 'ਵਿਧੀ' : resolvedLang === 'hi' ? 'विधि' : 'Rituals', icon: '🪔' });
    if (dos.length > 0 || donts.length > 0) list.push({ key: 'conduct', label: resolvedLang === 'pa' ? 'ਨਿਯਮ' : resolvedLang === 'hi' ? 'नियम' : 'Conduct', icon: '⚖️' });
    if (pujaItems.length > 0) list.push({ key: 'samagri', label: resolvedLang === 'pa' ? 'ਸਮੱਗਰੀ' : resolvedLang === 'hi' ? 'सामग्री' : 'Samagri', icon: '🌸' });
    if (mantraText || mantraTranslation) list.push({ key: 'mantra', label: resolvedLang === 'pa' ? 'ਮੰਤਰ' : resolvedLang === 'hi' ? 'मंत्र' : 'Mantra', icon: '🕉️' });
    return list;
  }, [significance, rituals.length, dos.length, donts.length, pujaItems.length, mantraText, mantraTranslation, resolvedLang]);

  if (!festival && !liveStory && !seriesChild && !seriesGroup && !storyLoading) {
    return (
      <ReaderShell title="Festival" fallbackBackUrl="/(tabs)" themeColor={theme.brand} ambientGlowColor={theme.brand}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ ...TYPE.body, color: theme.dim }}>This festival's content isn't available yet.</Text>
        </View>
      </ReaderShell>
    );
  }

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

  const getRitualPhase = (idx: number, total: number) => {
    if (total === 1) return resolvedLang === 'pa' ? 'ਪ੍ਰਧਾਨ ਵਿਧੀ' : resolvedLang === 'hi' ? 'प्रधान विधि' : 'Sacred Rite';
    if (idx === 0) return resolvedLang === 'pa' ? 'ਪ੍ਰਭਾਤ · ਸਵੇਰ' : resolvedLang === 'hi' ? 'प्रातः · प्रभात' : 'Prabhat · Dawn';
    if (idx === 1 && total > 2) return resolvedLang === 'pa' ? 'ਦੁਪਹਿਰ · ਪੂਜਾ' : resolvedLang === 'hi' ? 'मध्याह्न · पूजा' : 'Madhyahna · Noon';
    if (idx === total - 1) return resolvedLang === 'pa' ? 'ਸੰਧਿਆ · ਸ਼ਾਮ' : resolvedLang === 'hi' ? 'सायंकाल · संध्या' : 'Sandhya · Evening';
    return resolvedLang === 'pa' ? 'ਭੋਗ ਤੇ ਭੇਟ' : resolvedLang === 'hi' ? 'भोग व अर्पण' : 'Bhog · Offering';
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
      languages={availableLanguages.length > 1 ? availableLanguages : undefined}
      currentLanguage={resolvedLang}
      setLanguage={(code) => setReaderLanguageOverride(code as typeof language)}
      onShare={publishable ? handleShare : undefined}
      scrollViewRef={scrollViewRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={{ paddingBottom: 40 }}>
        {/* Series Day Traversing Bar (For multi-day festival series like Ganeshotsav, Navratri) */}
        {seriesContext ? (
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {seriesContext.seriesName} · {resolvedLang === 'hi' ? 'दैनिक क्रम' : 'Daily Journey'}
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.dim }}>
                {resolvedLang === 'hi' ? `दिन ${seriesContext.currentIndex + 1} / ${seriesContext.children.length}` : `Day ${seriesContext.currentIndex + 1} of ${seriesContext.children.length}`}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
              {seriesContext.children.map((child) => {
                const isSelected = child.slug === slug || (child.seq === 1 && seriesContext.seriesKey === slug);
                const dayLabel = child.label;

                return (
                  <TouchableOpacity
                    key={child.slug}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!isSelected) {
                        router.replace(`/festival/${child.slug}`);
                      }
                    }}
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 13,
                      borderRadius: RADII.pill,
                      backgroundColor: isSelected ? theme.brand : theme.card,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.brand : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sansMedium,
                        fontSize: 12,
                        color: isSelected ? (isDark ? '#000' : '#FFF') : theme.text,
                      }}
                    >
                      {dayLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* 1. Hero Altar Card */}
        <Card style={{ padding: 18, marginBottom: 14, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {/* Deity / Sacred Medallion */}
            <FestivalEmblem
              slug={slug}
              name={name}
              tradition={festival?.tradition}
              size={56}
              isDark={isDark}
            />

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10.5, color: theme.brand, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {traditionLabel}
                </Text>
              </View>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20 * fsScale, color: theme.text, lineHeight: 26 * fsScale }}>
                {name}
              </Text>
              {tagline ? (
                <Text style={{ fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 13 * fsScale, color: theme.dim, marginTop: 3, lineHeight: 18 * fsScale }}>
                  "{tagline}"
                </Text>
              ) : null}
            </View>
          </View>

          {/* Canonical Date & Verification Pill */}
          {occurrenceLoading ? (
            <View style={{ marginTop: 12, padding: 8, borderRadius: RADII.sm, backgroundColor: theme.cardSoft, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.brand} />
            </View>
          ) : occurrence ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.borderSoft,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Feather name="calendar" size={13} color={theme.brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12.5, color: theme.text }}>
                  {occurrence.civilDate ?? occurrence.date}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: occurrence.status === 'resolved' ? COLORS.successBg : (isDark ? COLORS.warningBgDark : COLORS.warningBgLight),
                  paddingHorizontal: 7,
                  paddingVertical: 2.5,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    color: occurrence.status === 'resolved' ? COLORS.success : (isDark ? COLORS.warningDark : COLORS.warningLight),
                    fontFamily: FONTS.sansSemiBold,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}
                >
                  {occurrence.status === 'resolved' ? 'Canonical' : 'Upcoming'}
                </Text>
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

        {/* 2. Horizon Quick-Jump Bar (Non-Linear Navigation) */}
        {availableSections.length > 1 ? (
          <View style={{ marginBottom: 14 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
              {availableSections.map((sec) => {
                const isActive = activeJumpSection === sec.key;
                return (
                  <TouchableOpacity
                    key={sec.key}
                    activeOpacity={0.7}
                    onPress={() => scrollToSection(sec.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingVertical: 7,
                      paddingHorizontal: 13,
                      borderRadius: RADII.pill,
                      backgroundColor: isActive ? theme.brand : theme.card,
                      borderWidth: 1,
                      borderColor: isActive ? theme.brand : theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{sec.icon}</Text>
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 12,
                        color: isActive ? (isDark ? '#000' : '#FFF') : theme.dim,
                      }}
                    >
                      {sec.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* 3. Essence / Significance Card */}
        {significance ? (
          <View onLayout={(e) => handleSectionLayout('essence', e.nativeEvent.layout.y)}>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Text style={{ fontSize: 14 }}>📖</Text>
                <Text style={{ ...TYPE.section, color: theme.brand }}>
                  {resolvedLang === 'hi' ? 'पावन महत्व व रहस्य' : 'Spiritual Significance'}
                </Text>
              </View>
              <Text style={{ ...TYPE.body, color: theme.text, fontSize: 14 * fsScale, lineHeight: 22 * fsScale }}>
                {significance}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* 4. Numbered Ritual Journey Timeline */}
        {rituals.length > 0 ? (
          <View onLayout={(e) => handleSectionLayout('rituals', e.nativeEvent.layout.y)}>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Text style={{ fontSize: 14 }}>🪔</Text>
                <Text style={{ ...TYPE.section, color: theme.brand }}>
                  {resolvedLang === 'hi' ? 'पूजा विधि व अनुष्ठान' : 'Sacred Rituals & Vidhi'}
                </Text>
              </View>

              {rituals.map((item, idx) => {
                const phase = getRitualPhase(idx, rituals.length);
                const isLast = idx === rituals.length - 1;
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
                    {/* Numbered Step Badge with Vertical Line */}
                    <View style={{ width: 32, alignItems: 'center' }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: theme.brandSoft,
                          borderWidth: 1.5,
                          borderColor: theme.brand,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: theme.brand }}>
                          {String(idx + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      {!isLast ? (
                        <View
                          style={{
                            width: 2,
                            flex: 1,
                            minHeight: 26,
                            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.35)',
                            marginVertical: 4,
                          }}
                        />
                      ) : null}
                    </View>

                    {/* Step Description */}
                    <View style={{ flex: 1, paddingBottom: isLast ? 4 : 14, paddingTop: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View
                          style={{
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: theme.cardSoft,
                          }}
                        >
                          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: theme.dim, textTransform: 'uppercase' }}>
                            {phase}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ ...TYPE.body, color: theme.text, fontSize: 13.5 * fsScale, lineHeight: 20 * fsScale }}>
                        {item}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}

        {/* 5. Two-Column Bento Conduct Card (Do's & Don'ts) */}
        {dos.length > 0 || donts.length > 0 ? (
          <View onLayout={(e) => handleSectionLayout('conduct', e.nativeEvent.layout.y)}>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Text style={{ fontSize: 14 }}>⚖️</Text>
                <Text style={{ ...TYPE.section, color: theme.brand }}>
                  {resolvedLang === 'hi' ? 'आचार व नियम' : 'Sacred Conduct & Practices'}
                </Text>
              </View>

              {dos.length > 0 && donts.length > 0 ? (
                /* Dual-Column Bento Grid */
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* Left Column: Do's */}
                  <View
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: RADII.md,
                      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.12)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(34, 197, 94, 0.22)' : 'rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <Feather name="check-circle" size={13} color={COLORS.success} />
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: COLORS.success, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {resolvedLang === 'hi' ? 'विहित नियम' : "Do's"}
                      </Text>
                    </View>
                    {dos.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 6 }}>
                        <Text style={{ color: COLORS.success, fontSize: 11, marginTop: 1 }}>✓</Text>
                        <Text style={{ fontFamily: FONTS.sans, fontSize: 12 * fsScale, lineHeight: 17 * fsScale, color: theme.text, flex: 1 }}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Right Column: Don'ts */}
                  <View
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: RADII.md,
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <Feather name="x-circle" size={13} color={COLORS.danger} />
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: COLORS.danger, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {resolvedLang === 'hi' ? 'वर्जित बातें' : "Don'ts"}
                      </Text>
                    </View>
                    {donts.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 6 }}>
                        <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 1 }}>✕</Text>
                        <Text style={{ fontFamily: FONTS.sans, fontSize: 12 * fsScale, lineHeight: 17 * fsScale, color: theme.text, flex: 1 }}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : dos.length > 0 ? (
                /* Only Do's present */
                <View
                  style={{
                    padding: 12,
                    borderRadius: RADII.md,
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.12)',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(34, 197, 94, 0.22)' : 'rgba(34, 197, 94, 0.3)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Feather name="check-circle" size={14} color={COLORS.success} />
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.success, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {resolvedLang === 'hi' ? 'विहित नियम' : "Do's"}
                    </Text>
                  </View>
                  {dos.map((item, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                      <Text style={{ color: COLORS.success, fontSize: 11, marginTop: 2 }}>✓</Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 12.5 * fsScale, lineHeight: 18 * fsScale, color: theme.text, flex: 1 }}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                /* Only Don'ts present */
                <View
                  style={{
                    padding: 12,
                    borderRadius: RADII.md,
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Feather name="x-circle" size={14} color={COLORS.danger} />
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.danger, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {resolvedLang === 'hi' ? 'वर्जित बातें' : "Don'ts"}
                    </Text>
                  </View>
                  {donts.map((item, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                      <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 2 }}>✕</Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 12.5 * fsScale, lineHeight: 18 * fsScale, color: theme.text, flex: 1 }}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        ) : null}

        {/* 6. Puja Samagri Tag Cloud */}
        {pujaItems.length > 0 ? (
          <View onLayout={(e) => handleSectionLayout('samagri', e.nativeEvent.layout.y)}>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Text style={{ fontSize: 14 }}>🌸</Text>
                <Text style={{ ...TYPE.section, color: theme.brand }}>
                  {resolvedLang === 'hi' ? 'पूजन सामग्री' : 'Puja Samagri & Offerings'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {pujaItems.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: RADII.pill,
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.4)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🌿</Text>
                    <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12.5 * fsScale, color: theme.text }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* 7. Illuminated Mantra Sanctum (Altar Treatment) */}
        {mantraText || mantraTranslation ? (
          <View onLayout={(e) => handleSectionLayout('mantra', e.nativeEvent.layout.y)}>
            <Card
              style={{
                padding: 20,
                marginBottom: 16,
                backgroundColor: isDark ? 'rgba(212, 175, 55, 0.06)' : 'rgba(212, 175, 55, 0.1)',
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.45)',
                alignItems: 'center',
              }}
            >
              {/* Sacred Om Medallion */}
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: theme.brandSoft,
                  borderWidth: 1.5,
                  borderColor: theme.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 22, color: theme.brand, fontFamily: FONTS.serifBold }}>ॐ</Text>
              </View>

              <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 8, letterSpacing: 0.8 }}>
                {resolvedLang === 'hi' ? 'सिद्ध मंत्र' : 'SACRED MANTRA'}
              </Text>

              {mantraText ? (
                <Text
                  style={{
                    fontFamily: FONTS.serifBold,
                    fontSize: 18 * fsScale,
                    lineHeight: 28 * fsScale,
                    color: theme.text,
                    textAlign: 'center',
                    marginVertical: 8,
                    paddingHorizontal: 8,
                  }}
                >
                  {mantraText}
                </Text>
              ) : null}

              {festival?.mantra?.transliteration ? (
                <Text
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 12 * fsScale,
                    lineHeight: 18 * fsScale,
                    color: theme.dim,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  {festival.mantra.transliteration}
                </Text>
              ) : null}

              {mantraTranslation ? (
                <Text
                  style={{
                    ...TYPE.body,
                    fontSize: 13 * fsScale,
                    lineHeight: 20 * fsScale,
                    color: theme.text,
                    textAlign: 'center',
                    marginTop: 4,
                    paddingHorizontal: 12,
                  }}
                >
                  {mantraTranslation}
                </Text>
              ) : null}

              {/* Quick Action buttons: Copy & Chant */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCopyMantra}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: RADII.pill,
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Feather name={copiedMantra ? 'check' : 'copy'} size={13} color={copiedMantra ? COLORS.success : theme.brand} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: copiedMantra ? COLORS.success : theme.text }}>
                    {copiedMantra ? (resolvedLang === 'hi' ? 'कॉपी किया ✓' : 'Copied ✓') : (resolvedLang === 'hi' ? 'मंत्र कॉपी करें' : 'Copy Verse')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/japa')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 15,
                    borderRadius: RADII.pill,
                    backgroundColor: theme.brand,
                  }}
                >
                  <Feather name="play-circle" size={13} color={isDark ? '#000' : '#FFF'} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: isDark ? '#000' : '#FFF' }}>
                    {resolvedLang === 'hi' ? 'जप आरंभ करें' : 'Chant Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        ) : null}

        {/* Next / Previous Day Traversing Controls */}
        {seriesContext && (seriesContext.prevChild || seriesContext.nextChild) ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 16 }}>
            {seriesContext.prevChild ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (seriesContext.prevChild?.slug) {
                    router.replace(`/festival/${seriesContext.prevChild.slug}`);
                  }
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: RADII.md,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Feather name="arrow-left" size={14} color={theme.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: theme.dim, textTransform: 'uppercase' }}>
                    {resolvedLang === 'hi' ? 'पिछला दिन' : 'Previous Day'}
                  </Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }} numberOfLines={1}>
                    {seriesContext.prevChild.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : <View style={{ flex: 1 }} />}

            {seriesContext.nextChild ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (seriesContext.nextChild?.slug) {
                    router.replace(`/festival/${seriesContext.nextChild.slug}`);
                  }
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: RADII.md,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: theme.dim, textTransform: 'uppercase' }}>
                    {resolvedLang === 'hi' ? 'अगला दिन' : 'Next Day'}
                  </Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.text }} numberOfLines={1}>
                    {seriesContext.nextChild.label}
                  </Text>
                </View>
                <Feather name="arrow-right" size={14} color={theme.brand} />
              </TouchableOpacity>
            ) : <View style={{ flex: 1 }} />}
          </View>
        ) : null}
      </View>

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
