import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { COLORS, FONTS, RADII, TYPE, themeColor } from '@/lib/constants';
import { BirthPanchangSnapshot, isValidBirthPanchangSnapshot } from '@/lib/kundali-contract';
import { AppLanguage, normalizeContentLanguage } from '@/lib/language-runtime';

interface BirthPanchangCardProps {
  snapshot: BirthPanchangSnapshot | null;
  isDark: boolean;
  timeUnknown?: boolean;
  language?: AppLanguage;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Nomenclature & Localization Policy:
 * 
 * - Panchanga limb names (e.g. "Shukla Pratipada", "Ashwini", "Vishkambha", "Bava")
 *   are canonical astronomical/Sanskrit terms preserved identically across
 *   astronomical software to prevent ambiguity or corrupted liturgical lookups.
 * - All structural titles, descriptions, transitions, limb identifiers (Tithi,
 *   Vara, Nakshatra, Yoga, Karana), and weekday equivalents are fully localized
 *   for English (en), Hindi (hi), and Punjabi (pa).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const LABELS: Record<AppLanguage, {
  title: string;
  subtitle: string;
  unknownNotice: string;
  tithi: string;
  vara: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  endsAt: string;
  precision: string;
  pada: string;
  halfTithi: string;
}> = {
  en: {
    title: 'Birth Panchanga (5 Sacred Limbs)',
    subtitle: 'Astronomical snapshot calculated at exact birth moment',
    unknownNotice: 'Precise birth time is required to calculate the sacred Panchanga limbs (Tithi, Nakshatra, Yoga, Karana).',
    tithi: '1. Tithi (Lunar Phase)',
    vara: '2. Vara (Solar Day)',
    nakshatra: '3. Nakshatra (Lunar Mansion)',
    yoga: '4. Yoga (Luni-Solar Angle)',
    karana: '5. Karana (Half-Tithi)',
    endsAt: 'Transitions at',
    precision: 'High Precision Instant',
    pada: 'Pada',
    halfTithi: 'Half-Tithi',
  },
  hi: {
    title: 'जन्म पञ्चाङ्ग (पंच पवित्र अंग)',
    subtitle: 'सटीक जन्म समय पर आधारित खगोलीय पञ्चाङ्ग स्थिति',
    unknownNotice: 'पवित्र पञ्चाङ्ग अंगों (तिथि, नक्षत्र, योग, करण) की सटीक गणना के लिए जन्म समय आवश्यक है।',
    tithi: '१. तिथि (चन्द्र चरण)',
    vara: '२. वार (सौर दिवस)',
    nakshatra: '३. नक्षत्र (चन्द्र नक्षत्र)',
    yoga: '४. योग (सूर्य-चन्द्र योग)',
    karana: '५. करण (अर्ध तिथि)',
    endsAt: 'समाप्ति समय',
    precision: 'उच्च परिशुद्धता क्षण',
    pada: 'पद',
    halfTithi: 'अर्ध-तिथि',
  },
  pa: {
    title: 'ਜਨਮ ਪੰਚਾਂਗ (ਪੰਜ ਪਵਿੱਤਰ ਅੰਗ)',
    subtitle: 'ਸਹੀ ਜਨਮ ਸਮੇਂ ਤੇ ਆਧਾਰਿਤ ਖਗੋਲੀ ਪੰਚਾਂਗ ਸਥਿਤੀ',
    unknownNotice: 'ਪਵਿੱਤਰ ਪੰਚਾਂਗ ਅੰਗਾਂ (ਤਿਥੀ, ਨਕਸ਼ਤਰ, ਯੋਗ, ਕਰਣ) ਦੀ ਸਹੀ ਗਣਨਾ ਲਈ ਜਨਮ ਸਮਾਂ ਲਾਜ਼ਮੀ ਹੈ।',
    tithi: '੧. ਤਿਥੀ (ਚੰਦਰਮਾ ਪੜਾਅ)',
    vara: '੨. ਵਾਰ (ਸੂਰਜੀ ਦਿਨ)',
    nakshatra: '੩. ਨਕਸ਼ਤਰ (ਚੰਦਰ ਨਿਵਾਸ)',
    yoga: '੪. ਯੋਗ (ਸੂਰਜ-ਚੰਦਰ ਯੋਗ)',
    karana: '੫. ਕਰਣ (ਅੱਧੀ ਤਿਥੀ)',
    endsAt: 'ਸਮਾਪਤੀ ਸਮਾਂ',
    precision: 'ਉੱਚ ਸ਼ੁੱਧਤਾ ਪਲ',
    pada: 'ਪਦ',
    halfTithi: 'ਅੱਧੀ-ਤਿਥੀ',
  },
};

const VARA_TRANSLATIONS: Record<string, Record<AppLanguage, string>> = {
  Ravivara: { en: 'Sunday (Ravivara)', hi: 'रविवार (रविवसर)', pa: 'ਐਤਵਾਰ (ਰਵਿਵਾਰ)' },
  Somavara: { en: 'Monday (Somavara)', hi: 'सोमवार (सोमवसर)', pa: 'ਸੋਮਵਾਰ (ਸੋਮਵਾਰ)' },
  Mangalavara: { en: 'Tuesday (Mangalavara)', hi: 'मंगलवार (भौमवसर)', pa: 'ਮੰਗਲਵਾਰ (ਮੰਗਲਵਾਰ)' },
  Budhavara: { en: 'Wednesday (Budhavara)', hi: 'बुधवार (सौम्यवसर)', pa: 'ਬੁੱਧਵਾਰ (ਬੁੱਧਵਾਰ)' },
  Guruvara: { en: 'Thursday (Guruvara)', hi: 'गुरुवार (बृहस्पतिवसर)', pa: 'ਵੀਰਵਾਰ (ਗੁਰੂਵਾਰ)' },
  Shukravara: { en: 'Friday (Shukravara)', hi: 'शुक्रवार (भृगुवसर)', pa: 'ਸ਼ੁੱਕਰਵਾਰ (ਸ਼ੁੱਕਰਵਾਰ)' },
  Shanivara: { en: 'Saturday (Shanivara)', hi: 'शनिवार (स्थिरवसर)', pa: 'ਸ਼ਨਿੱਚਰਵਾਰ (ਸ਼ਨਿਵਾਰ)' },
};

function formatTransitionTime(isoUtc: string | null, timezone: string): string | null {
  if (!isoUtc) return null;
  try {
    const d = new Date(isoUtc);
    if (isNaN(d.getTime())) return null;

    const timeFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
    });

    return `${timeFmt.format(d)} (${dateFmt.format(d)})`;
  } catch {
    return null;
  }
}

export function BirthPanchangCard({ snapshot, isDark, timeUnknown, language }: BirthPanchangCardProps) {
  const theme = themeColor(isDark);
  const langKey = normalizeContentLanguage(language);
  const t = LABELS[langKey] ?? LABELS.en;

  // Defensive fail-closed check: require valid snapshot shape
  if (!snapshot || timeUnknown || !isValidBirthPanchangSnapshot(snapshot)) {
    return (
      <Card
        tone="auto"
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.premiumBorder },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <Feather name="calendar" size={20} color={theme.brand} />
          <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
        </View>
        <Text style={[styles.unknownNoticeText, { color: theme.dim }]}>
          {t.unknownNotice}
        </Text>
      </Card>
    );
  }

  const varaDisplay = VARA_TRANSLATIONS[snapshot.vara.name]?.[langKey] ?? snapshot.vara.name;
  const tithiEnds = formatTransitionTime(snapshot.tithi.endsAtUtc, snapshot.timezone);
  const nakshatraEnds = formatTransitionTime(snapshot.nakshatra.endsAtUtc, snapshot.timezone);
  const yogaEnds = formatTransitionTime(snapshot.yoga.endsAtUtc, snapshot.timezone);
  const karanaEnds = formatTransitionTime(snapshot.karana.endsAtUtc, snapshot.timezone);

  return (
    <Card
      tone="auto"
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.premiumBorder },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Feather name="calendar" size={18} color={theme.brand} />
          <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
        </View>
        <View
          style={[
            styles.precisionBadge,
            {
              backgroundColor: COLORS.successBg,
              borderColor: COLORS.successBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.precisionText,
              { color: COLORS.success },
            ]}
          >
            {t.precision}
          </Text>
        </View>
      </View>

      <Text style={[styles.subtitle, { color: theme.dim }]}>
        {snapshot.localDate} · {snapshot.localTime} ({snapshot.timezone})
      </Text>

      {/* 5 Panchang Limbs Grid */}
      <View style={styles.limbsGrid}>
        {/* 1. Tithi */}
        <View style={[styles.limbItem, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.limbKey, { color: theme.dim }]}>{t.tithi}</Text>
          <Text style={[styles.limbVal, { color: theme.text }]}>{snapshot.tithi.name}</Text>
          <View style={styles.pakshaRow}>
            <View style={[styles.pakshaBadge, { backgroundColor: theme.brandSoft }]}>
              <Text style={[styles.pakshaText, { color: theme.brandStrong }]}>
                {snapshot.tithi.paksha} Paksha (#{snapshot.tithi.index})
              </Text>
            </View>
          </View>
          {tithiEnds ? (
            <Text style={[styles.transitionText, { color: theme.dim }]}>
              {t.endsAt}: {tithiEnds}
            </Text>
          ) : null}
        </View>

        {/* 2. Vara */}
        <View style={[styles.limbItem, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.limbKey, { color: theme.dim }]}>{t.vara}</Text>
          <Text style={[styles.limbVal, { color: theme.text }]}>{snapshot.vara.name}</Text>
          <Text style={[styles.limbSub, { color: theme.dim }]}>{varaDisplay}</Text>
        </View>

        {/* 3. Nakshatra */}
        <View style={[styles.limbItem, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.limbKey, { color: theme.dim }]}>{t.nakshatra}</Text>
          <Text style={[styles.limbVal, { color: theme.brandStrong }]}>{snapshot.nakshatra.name}</Text>
          <Text style={[styles.limbSub, { color: theme.dim }]}>
            {snapshot.nakshatra.pada ? `${t.pada} ${snapshot.nakshatra.pada}` : `Index #${snapshot.nakshatra.index + 1}`}
          </Text>
          {nakshatraEnds ? (
            <Text style={[styles.transitionText, { color: theme.dim }]}>
              {t.endsAt}: {nakshatraEnds}
            </Text>
          ) : null}
        </View>

        {/* 4. Yoga */}
        <View style={[styles.limbItem, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.limbKey, { color: theme.dim }]}>{t.yoga}</Text>
          <Text style={[styles.limbVal, { color: theme.text }]}>{snapshot.yoga.name}</Text>
          <Text style={[styles.limbSub, { color: theme.dim }]}>#{snapshot.yoga.index + 1} / 27</Text>
          {yogaEnds ? (
            <Text style={[styles.transitionText, { color: theme.dim }]}>
              {t.endsAt}: {yogaEnds}
            </Text>
          ) : null}
        </View>

        {/* 5. Karana */}
        <View style={[styles.limbItem, { width: '100%', backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
          <Text style={[styles.limbKey, { color: theme.dim }]}>{t.karana}</Text>
          <Text style={[styles.limbVal, { color: theme.text }]}>{snapshot.karana.name}</Text>
          <Text style={[styles.limbSub, { color: theme.dim }]}>
            {t.halfTithi} #{snapshot.karana.index} / 60
          </Text>
          {karanaEnds ? (
            <Text style={[styles.transitionText, { color: theme.dim }]}>
              {t.endsAt}: {karanaEnds}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Diagnostics */}
      <View style={[styles.diagBox, { borderTopColor: theme.premiumBorder }]}>
        <Text style={[styles.diagText, { color: theme.dim }]}>
          Ayanamsha: {snapshot.calculation.ayanamsa.toUpperCase()} · Engine: v{snapshot.calculation.engineVersion}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: RADII.lg,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPE.cardHeading,
    fontSize: 16,
  },
  subtitle: {
    ...TYPE.caption,
    fontSize: 12,
  },
  unknownNoticeText: {
    ...TYPE.body,
    fontSize: 13,
    lineHeight: 18,
  },
  precisionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.xs,
    borderWidth: 1,
  },
  precisionText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  limbsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  limbItem: {
    width: '48%',
    padding: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
    gap: 4,
  },
  limbKey: {
    ...TYPE.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  limbVal: {
    ...TYPE.body,
    fontSize: 15,
    fontWeight: '700',
  },
  limbSub: {
    ...TYPE.caption,
    fontSize: 11,
  },
  transitionText: {
    ...TYPE.caption,
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  pakshaRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  pakshaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.xs,
  },
  pakshaText: {
    ...TYPE.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  diagBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
  diagText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    textAlign: 'center',
  },
});
