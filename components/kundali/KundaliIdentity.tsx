import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { FONTS, TYPE, themeColor } from '@/lib/constants';
import { BirthProfileDetail } from '@/lib/kundali-contract';
import { RASHI_MAP } from '@/lib/jyotish';

interface KundaliIdentityProps {
  profile: BirthProfileDetail;
  isDark: boolean;
}

export function KundaliIdentity({ profile, isDark }: KundaliIdentityProps) {
  const theme = themeColor(isDark);
  const chart = profile.chart_data;
  const isTimeUnknown = chart.timeUnknown;

  const nakshatra = chart.nakshatra;
  const moonRashiKey = profile.rashi?.toLowerCase() ?? '';
  const moonRashiMeta = RASHI_MAP[moonRashiKey];

  const sunRashiKey = profile.sun_rashi?.toLowerCase() ?? '';
  const sunRashiMeta = RASHI_MAP[sunRashiKey];

  const lagnaRashiKey = chart.lagna?.rashiName?.toLowerCase() ?? '';
  const lagnaRashiMeta = RASHI_MAP[lagnaRashiKey];

  return (
    <View style={styles.container}>
      {/* Primary Triple Pillars (Lagna, Moon, Sun) */}
      <View style={styles.pillarsRow}>
        {/* Lagna (Ascendant) */}
        <Card
          tone="auto"
          style={[
            styles.pillarCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.premiumBorder,
              opacity: isTimeUnknown ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.pillarLabel, { color: theme.dim }]}>Lagna (Ascendant)</Text>
          <Text style={[styles.pillarSymbol, { color: theme.brand }]}>
            {isTimeUnknown ? '—' : (lagnaRashiMeta?.symbol ?? '✨')}
          </Text>
          <Text style={[styles.pillarValue, { color: theme.text }]} numberOfLines={1}>
            {isTimeUnknown ? 'Withheld' : (chart.lagna?.rashiName ?? '—')}
          </Text>
          <Text style={[styles.pillarSub, { color: theme.dim }]}>
            {isTimeUnknown ? 'Time unknown' : `House 1`}
          </Text>
        </Card>

        {/* Moon Sign (Chandra Rashi) */}
        <Card
          tone="auto"
          style={[
            styles.pillarCard,
            { backgroundColor: theme.card, borderColor: theme.premiumBorder },
          ]}
        >
          <Text style={[styles.pillarLabel, { color: theme.dim }]}>Moon Sign (Rashi)</Text>
          <Text style={[styles.pillarSymbol, { color: theme.brand }]}>
            {moonRashiMeta?.symbol ?? '🌙'}
          </Text>
          <Text style={[styles.pillarValue, { color: theme.text }]} numberOfLines={1}>
            {profile.rashi ?? chart.planets['Chandra']?.rashiName ?? '—'}
          </Text>
          <Text style={[styles.pillarSub, { color: theme.dim }]}>
            {moonRashiMeta?.en ?? 'Mind & Soul'}
          </Text>
        </Card>

        {/* Sun Sign (Surya Rashi) */}
        <Card
          tone="auto"
          style={[
            styles.pillarCard,
            { backgroundColor: theme.card, borderColor: theme.premiumBorder },
          ]}
        >
          <Text style={[styles.pillarLabel, { color: theme.dim }]}>Sun Sign (Surya)</Text>
          <Text style={[styles.pillarSymbol, { color: theme.brand }]}>
            {sunRashiMeta?.symbol ?? '☀️'}
          </Text>
          <Text style={[styles.pillarValue, { color: theme.text }]} numberOfLines={1}>
            {profile.sun_rashi ?? chart.planets['Surya']?.rashiName ?? '—'}
          </Text>
          <Text style={[styles.pillarSub, { color: theme.dim }]}>
            {sunRashiMeta?.en ?? 'Vitality & Core'}
          </Text>
        </Card>
      </View>

      {/* Nakshatra & Lineage Attributes Card */}
      {nakshatra ? (
        <Card
          tone="auto"
          style={[
            styles.attributesCard,
            { backgroundColor: theme.card, borderColor: theme.premiumBorder },
          ]}
        >
          <View style={styles.cardHeader}>
            <Feather name="compass" size={18} color={theme.brand} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Nakshatra & Cosmic Alignment
            </Text>
          </View>

          <View style={styles.attributeGrid}>
            <View style={styles.attributeItem}>
              <Text style={[styles.attributeKey, { color: theme.dim }]}>Birth Nakshatra</Text>
              <Text style={[styles.attributeVal, { color: theme.brandStrong }]}>
                {nakshatra.name} {nakshatra.pada ? `(Pada ${nakshatra.pada})` : ''}
              </Text>
            </View>

            <View style={styles.attributeItem}>
              <Text style={[styles.attributeKey, { color: theme.dim }]}>Nakshatra Lord</Text>
              <Text style={[styles.attributeVal, { color: theme.text }]}>
                {nakshatra.lord || '—'}
              </Text>
            </View>

            {nakshatra.devata ? (
              <View style={styles.attributeItem}>
                <Text style={[styles.attributeKey, { color: theme.dim }]}>Presiding Devata</Text>
                <Text style={[styles.attributeVal, { color: theme.text }]}>
                  {nakshatra.devata}
                </Text>
              </View>
            ) : null}

            {nakshatra.gana ? (
              <View style={styles.attributeItem}>
                <Text style={[styles.attributeKey, { color: theme.dim }]}>Gana</Text>
                <Text style={[styles.attributeVal, { color: theme.text }]}>
                  {nakshatra.gana}
                </Text>
              </View>
            ) : null}

            {nakshatra.animalSymbol ? (
              <View style={styles.attributeItem}>
                <Text style={[styles.attributeKey, { color: theme.dim }]}>Yoni / Animal Symbol</Text>
                <Text style={[styles.attributeVal, { color: theme.text }]}>
                  {nakshatra.animalSymbol}
                </Text>
              </View>
            ) : null}

          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  pillarsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillarCard: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  pillarLabel: {
    ...TYPE.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  pillarSymbol: {
    fontSize: 22,
    marginVertical: 2,
  },
  pillarValue: {
    ...TYPE.cardHeading,
    fontSize: 14,
    textAlign: 'center',
  },
  pillarSub: {
    ...TYPE.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  attributesCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...TYPE.cardHeading,
    fontSize: 16,
  },
  attributeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 16,
  },
  attributeItem: {
    width: '46%',
    gap: 2,
  },
  attributeKey: {
    ...TYPE.caption,
    fontSize: 11,
  },
  attributeVal: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
});
