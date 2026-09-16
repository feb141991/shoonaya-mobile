import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

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
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = themeColor(isDark);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const [occurrence, setOccurrence] = useState<ClientObservanceResult | null>(null);
  const [occurrenceLoading, setOccurrenceLoading] = useState(true);
  const [liveStory, setLiveStory] = useState<LiveObservanceStory | null>(null);
  const [storyLoading, setStoryLoading] = useState(true);
  const [lang, setLang] = useState<'en' | 'local'>('en');
  const [fontStep, setFontStep] = useState(1);
  const [sharing, setSharing] = useState(false);
  const [copiedMantra, setCopiedMantra] = useState(false);
  const [activeJumpSection, setActiveJumpSection] = useState<string>('essence');
  const [sectionPositions, setSectionPositions] = useState<Record<string, number>>({});
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

  const name =
    liveTranslation?.title ||
    liveStory?.displayName ||
    (festival ? resolveFestivalText(festival.name, resolvedLang) : '') ||
    festival?.definitionKey ||
    slug;

  const tagline = liveTranslation?.teaser || (festival ? resolveFestivalText(festival.tagline, resolvedLang) : '');
  const significance = liveTranslation?.significance || (festival ? resolveFestivalText(festival.significance, resolvedLang) : '');
  const publishable = Boolean(liveStory) || (festival ? isFestivalPublishable(festival) : false);

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

  const rituals = (liveTranslation?.rituals && liveTranslation.rituals.length > 0)
    ? liveTranslation.rituals
    : (festival ? resolveListContent(festival.rituals) : []);

  const canonicalDos = festival ? resolveListContent(festival.dos) : [];
  const dos = canonicalDos.length > 0 ? canonicalDos : (liveTranslation?.personalPractice ? [liveTranslation.personalPractice] : []);
  const donts = festival ? resolveListContent(festival.donts) : [];
  const pujaItems = festival ? resolveListContent(festival.pujaItems) : [];
  const mantraText = liveTranslation?.verse?.original || festival?.mantra?.sanskrit || '';
  const mantraTranslation = liveTranslation?.verse?.translation || (festival?.mantra ? resolveFestivalText(festival.mantra.translation, resolvedLang) : '');

  const traditionKey = festival?.tradition || liveStory?.tradition || '';
  const traditionLabel =
    traditionKey === 'hindu'
      ? (resolvedLang === 'hi' ? 'सनातन परंपरा' : 'Sanatana Tradition')
      : traditionKey === 'sikh'
      ? (resolvedLang === 'hi' ? 'सिख परंपरा' : 'Sikh Tradition')
      : traditionKey === 'jain'
      ? (resolvedLang === 'hi' ? 'जैन परंपरा' : 'Jain Tradition')
      : traditionKey === 'buddhist'
      ? (resolvedLang === 'hi' ? 'बौद्ध परंपरा' : 'Buddhist Tradition')
      : (resolvedLang === 'hi' ? 'पावन पर्व' : 'Sacred Observance');

  const hasLocalFestival = Boolean(
    liveStory?.translations?.hi?.significance ||
    (festival && resolveFestivalText(festival.name, 'hi') && resolveFestivalText(festival.significance, 'hi'))
  );

  const availableSections = useMemo(() => {
    const list: { key: string; label: string; icon: string }[] = [];
    if (significance) list.push({ key: 'essence', label: resolvedLang === 'hi' ? 'महत्व' : 'Essence', icon: '📖' });
    if (rituals.length > 0) list.push({ key: 'rituals', label: resolvedLang === 'hi' ? 'विधि' : 'Rituals', icon: '🪔' });
    if (dos.length > 0 || donts.length > 0) list.push({ key: 'conduct', label: resolvedLang === 'hi' ? 'नियम' : 'Conduct', icon: '⚖️' });
    if (pujaItems.length > 0) list.push({ key: 'samagri', label: resolvedLang === 'hi' ? 'सामग्री' : 'Samagri', icon: '🌸' });
    if (mantraText || mantraTranslation) list.push({ key: 'mantra', label: resolvedLang === 'hi' ? 'मंत्र' : 'Mantra', icon: '🕉️' });
    return list;
  }, [significance, rituals.length, dos.length, donts.length, pujaItems.length, mantraText, mantraTranslation, resolvedLang]);

  if (!festival && !liveStory && !storyLoading) {
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
    if (total === 1) return resolvedLang === 'hi' ? 'प्रधान विधि' : 'Sacred Rite';
    if (idx === 0) return resolvedLang === 'hi' ? 'प्रातः · प्रभात' : 'Prabhat · Dawn';
    if (idx === 1 && total > 2) return resolvedLang === 'hi' ? 'मध्याह्न · पूजा' : 'Madhyahna · Noon';
    if (idx === total - 1) return resolvedLang === 'hi' ? 'सायंकाल · संध्या' : 'Sandhya · Evening';
    return resolvedLang === 'hi' ? 'भोग व अर्पण' : 'Bhog · Offering';
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
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Altar Card */}
        <Card style={{ padding: 18, marginBottom: 14, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {/* Deity / Sacred Medallion */}
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.brandSoft,
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 32 }}>{festival?.emoji ?? '🪔'}</Text>
            </View>

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
            <View style={{ marginTop: 14, padding: 8, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.brand} />
            </View>
          ) : occurrence ? (
            <View
              style={{
                marginTop: 14,
                paddingVertical: 9,
                paddingHorizontal: 12,
                borderRadius: RADII.md,
                backgroundColor: theme.brandSoft,
                borderWidth: 1,
                borderColor: theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
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
