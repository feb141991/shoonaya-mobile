import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { getYatraList, YatraCircuit } from '@/lib/yatra-data';
import { COLORS, FONTS, RADII, SHADOWS, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

export function YatraCircuitsSection() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const yatras = getYatraList();

  const handleCardPress = (yatraId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/yatra/${yatraId}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.headerIconContainer,
              { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.16)' : '#FEF3C7' },
            ]}
          >
            <Feather name="compass" size={16} color={theme.brand} />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Sacred Yatra Circuits
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.dim }]}>
              Interactive pilgrimage routes & virtual darshan
            </Text>
          </View>
        </View>
      </View>

      {/* Yatras Horizontal Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {yatras.map((yatra: YatraCircuit) => {
          return (
            <PressableSurface
              key={yatra.id}
              onPress={() => handleCardPress(yatra.id)}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#111827' : '#FFFFFF',
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                },
              ]}
              accessibilityLabel={`Explore ${yatra.title}`}
            >
              {/* Top Tag & Temple Count */}
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.traditionTag,
                    {
                      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
                      borderColor: theme.brandSoft,
                    },
                  ]}
                >
                  <Text style={[styles.traditionText, { color: theme.brand }]}>
                    {yatra.tradition.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.nodeCountBadge}>
                  <Feather name="map-pin" size={12} color={theme.dim} />
                  <Text style={[styles.nodeCountText, { color: theme.dim }]}>
                    {yatra.temples.length} Shrines
                  </Text>
                </View>
              </View>

              {/* Title & Description */}
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                {yatra.title}
              </Text>
              <Text style={[styles.cardSanskrit, { color: theme.brand }]} numberOfLines={1}>
                {yatra.sanskritTitle}
              </Text>
              <Text style={[styles.cardDesc, { color: theme.dim }]} numberOfLines={2}>
                {yatra.subtitle}
              </Text>

              {/* CTA Action */}
              <View style={styles.cardFooter}>
                <Text style={[styles.exploreText, { color: theme.brand }]}>
                  Explore Pilgrimage Route
                </Text>
                <Feather name="arrow-right" size={14} color={theme.brand} />
              </View>
            </PressableSurface>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 16,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginTop: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 4,
  },
  card: {
    width: 270,
    padding: 16,
    borderRadius: RADII.xl,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  traditionTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  traditionText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  nodeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nodeCountText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  cardTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 15,
    lineHeight: 20,
  },
  cardSanskrit: {
    fontFamily: FONTS.serif,
    fontSize: 12,
    marginTop: 2,
  },
  cardDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(156, 163, 175, 0.25)',
    paddingTop: 10,
  },
  exploreText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
});
