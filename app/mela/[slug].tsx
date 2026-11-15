import { useMemo, type ReactNode } from 'react';
import { Linking, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { ReaderShell } from '@/components/reader/ReaderShell';
import { COLORS, FONTS, MIN_TOUCH_TARGET, OVERLAYS, RADII, TYPE } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { MELA_SCHEDULE_SNAPSHOT } from '@/lib/mela-schedule.generated';
import { civilDateIn, findMela, isAmritSnan, melaList, melaText, publishedMelaDays } from '@/lib/melaSchedule';
import { useReaderAppearance } from '@/lib/useReaderAppearance';
import type { ObservanceSeriesSourceReference } from '@/lib/observance-series-contract.generated';

// A Kumbh (or other mela) page. Every date and line of text comes from the
// state Mela authority's official website through lib/mela-schedule.generated.ts;
// nothing here calculates a date, and an unconfirmed day is never listed
// (AGENTS.md sections 2 and 3). Content is English until a Hindi rendering is
// reviewed; the section headings follow the app language.

type Lang = 'en' | 'hi' | 'pa';

const LABELS = {
  en: { significance: 'Significance', places: 'Where it happens', days: 'Bathing days', rituals: 'Rituals & traditions', guidance: 'Before you go', sources: 'Sources', amrit: 'Amrit Snan', principal: 'Principal Amrit Snan', event: 'Event', next: 'Next', notFound: "This mela's details aren't available.", period: 'Mela period' },
  hi: { significance: 'महत्व', places: 'कहाँ होता है', days: 'स्नान तिथियाँ', rituals: 'अनुष्ठान व परंपराएँ', guidance: 'जाने से पहले', sources: 'स्रोत', amrit: 'अमृत स्नान', principal: 'प्रमुख अमृत स्नान', event: 'आयोजन', next: 'अगला', notFound: 'इस मेले की जानकारी उपलब्ध नहीं है।', period: 'मेला अवधि' },
} as const;

function formatCivilDate(iso: string, lang: Lang, withWeekday = true): string {
  // A civil date at the mela, formatted as that same calendar day wherever the reader is.
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'UTC', weekday: withWeekday ? 'short' : undefined, day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${iso}T00:00:00Z`));
}

function uniqueSources(refs: ObservanceSeriesSourceReference[]): ObservanceSeriesSourceReference[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = ref.url ?? ref.sourceName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function MelaDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>();
  const mela = findMela(params.slug ?? '');
  const { isDark, theme } = useReaderAppearance();
  const { language } = useLanguage();
  const lang: Lang = language === 'hi' ? 'hi' : 'en';
  const labels = LABELS[lang];
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const content = useMemo(() => {
    if (!mela) return null;
    const fields = [mela.name, mela.tagline, mela.significance, mela.places, mela.rituals, mela.guidance].filter((f) => f !== undefined);
    return {
      name: melaText(mela, mela.name, lang),
      tagline: melaText(mela, mela.tagline, lang),
      significance: melaText(mela, mela.significance, lang),
      places: melaList(mela, mela.places, lang),
      rituals: melaList(mela, mela.rituals, lang),
      guidance: melaList(mela, mela.guidance, lang),
      days: publishedMelaDays(mela),
      today: civilDateIn(mela.timezone),
      sources: uniqueSources(fields.flatMap((f) => f.sourceRefs)),
    };
  }, [mela, lang]);

  if (!mela || !content || !content.name) {
    return (
      <ReaderShell title="Kumbh" fallbackBackUrl="/(tabs)" themeColor={theme.brand} ambientGlowColor={theme.brand}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ ...TYPE.body, color: theme.dim }}>{labels.notFound}</Text>
        </View>
      </ReaderShell>
    );
  }

  const nextDay = content.days.find((day) => day.date >= content.today) ?? null;

  const section = (icon: string, title: string, children: ReactNode) => (
    <Card style={{ padding: 16, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ ...TYPE.section, color: theme.brand, flex: 1 }}>{title}</Text>
      </View>
      {children}
    </Card>
  );

  const bulletList = (items: string[]) => items.map((item, idx) => (
    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: idx === items.length - 1 ? 0 : 10 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.brandSoft, borderWidth: 1.5, borderColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand }}>{String(idx + 1).padStart(2, '0')}</Text>
      </View>
      <Text style={{ ...TYPE.body, color: theme.text, fontSize: 14, lineHeight: 21, flex: 1 }}>{item}</Text>
    </View>
  ));

  return (
    <ReaderShell
      progressId={`mela:${mela.slug}`}
      title={content.name}
      subtitle={content.tagline}
      fallbackBackUrl="/(tabs)"
      themeColor={theme.brand}
      ambientGlowColor={theme.brand}
    >
      <View style={{ paddingBottom: 40 }}>
        <Card style={{ padding: 18, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28 }}>{mela.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10.5, color: theme.brand, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Hindu · Kumbh Mela
              </Text>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text, lineHeight: 26 }}>{content.name}</Text>
              <Text style={{ ...TYPE.body, color: theme.dim, fontSize: 13, lineHeight: 19, marginTop: 4 }}>{content.tagline}</Text>
            </View>
          </View>
          {mela.periodStart && mela.periodEnd ? (
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: theme.dim, marginTop: 12 }}>
              {labels.period}: {formatCivilDate(mela.periodStart, lang)} – {formatCivilDate(mela.periodEnd, lang)}
            </Text>
          ) : null}
        </Card>

        {content.significance ? section('📖', labels.significance, (
          <Text style={{ ...TYPE.body, color: theme.text, fontSize: 14, lineHeight: 22 }}>{content.significance}</Text>
        )) : null}

        {content.places.length > 0 ? section('📍', labels.places, bulletList(content.places)) : null}

        {content.days.length > 0 ? section('📅', labels.days, content.days.map((day, idx) => {
          const past = day.date < content.today;
          const isNext = nextDay?.date === day.date && nextDay?.place === day.place;
          const badge = day.kind === 'principal_amrit_snan' ? labels.principal : isAmritSnan(day) ? labels.amrit : day.kind === 'event' ? labels.event : null;
          return (
            <View
              key={`${day.date}-${day.place}`}
              accessible
              accessibilityLabel={`${formatCivilDate(day.date, lang)}, ${day.title}, ${day.place}${badge ? `, ${badge}` : ''}${isNext ? `, ${labels.next}` : ''}`}
              style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: theme.borderSoft, opacity: past ? 0.55 : 1 }}
            >
              <View style={{ width: 4, borderRadius: 2, backgroundColor: isAmritSnan(day) ? accent : (isDark ? OVERLAYS.metallicGold[0.25] : OVERLAYS.metallicGold[0.35]) }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>{formatCivilDate(day.date, lang)}</Text>
                  {badge ? (
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADII.pill, backgroundColor: theme.brandSoft }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: theme.brand, textTransform: 'uppercase' }}>{badge}</Text>
                    </View>
                  ) : null}
                  {isNext ? (
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADII.pill, borderWidth: 1, borderColor: theme.brand }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: theme.brand, textTransform: 'uppercase' }}>{labels.next}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ ...TYPE.body, color: theme.text, fontSize: 14, lineHeight: 20, marginTop: 2 }}>{day.title}</Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17, color: theme.dim }}>{day.place}</Text>
              </View>
            </View>
          );
        })) : null}

        {content.rituals.length > 0 ? section('🪔', labels.rituals, bulletList(content.rituals)) : null}

        {content.guidance.length > 0 ? section('🧭', labels.guidance, bulletList(content.guidance)) : null}

        {section('📜', labels.sources, (
          <View>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18, color: theme.dim, marginBottom: 8 }}>
              Dates and details from the official website of the state Mela authority, read {formatCivilDate(MELA_SCHEDULE_SNAPSHOT.accessedOn, 'en', false)}. The authorities and the akharas make the final announcements, so check the official site before you travel.
            </Text>
            {content.sources.map((ref) => (
              <PressableSurface
                key={ref.url ?? ref.sourceName}
                haptic="selection"
                accessibilityRole="link"
                accessibilityLabel={`${ref.sourceName}, ${ref.pageOrSection ?? ''}. Opens the official website`}
                onPress={() => { if (ref.url) void Linking.openURL(ref.url); }}
                style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
              >
                <Feather name="external-link" size={14} color={theme.brand} />
                <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12.5, lineHeight: 18, color: theme.text, flex: 1 }}>
                  {ref.pageOrSection ? `${ref.pageOrSection} · ` : ''}{ref.publisher ?? ref.sourceName}
                </Text>
              </PressableSurface>
            ))}
          </View>
        ))}
      </View>
    </ReaderShell>
  );
}
