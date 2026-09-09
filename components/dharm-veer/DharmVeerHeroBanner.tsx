import React from 'react';
import { View, Text, Image, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '@/lib/constants';
import { type DharmVeer } from '@/lib/dharm-veer';
import { getDharmVeerArtworkSource } from '@/lib/dharm-veer-artwork';

interface DharmVeerHeroBannerProps {
  hero: DharmVeer;
  title: string;
  era?: string;
  region?: string;
  tagline?: string;
  accentColor: string;
  brandColor: string;
}

export function DharmVeerHeroBanner({
  hero,
  title,
  era,
  region,
  tagline,
  accentColor,
  brandColor,
}: DharmVeerHeroBannerProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const surfaceBg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const textColor = isDark ? COLORS.creamBg : COLORS.ink;
  const textDimColor = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const goldColor = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const artworkSource = getDharmVeerArtworkSource(hero.id);

  if (artworkSource) {
    return (
      <View style={styles.container}>
        {/* Full-width Artwork Banner */}
        <View style={styles.imageContainer}>
          <Image
            source={artworkSource}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={`${hero.name} classical painting`}
          />

          {/* Top subtle vignette */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']}
            style={styles.topVignette}
            pointerEvents="none"
          />

          {/* Bottom Gradient Fade into Page Surface */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', isDark ? 'rgba(10,9,8,0.7)' : 'rgba(250,248,245,0.7)', surfaceBg]}
            locations={[0, 0.65, 1]}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          {/* Floating Era & Region Badges */}
          <View style={styles.floatingBadgesRow}>
            {era ? (
              <View style={[styles.badge, { borderColor: isDark ? 'rgba(197,160,89,0.35)' : 'rgba(197,160,89,0.5)' }]}>
                <Text style={[styles.badgeText, { color: goldColor }]}>{era}</Text>
              </View>
            ) : null}
            {region ? (
              <View style={[styles.badge, { borderColor: isDark ? 'rgba(197,160,89,0.35)' : 'rgba(197,160,89,0.5)' }]}>
                <Text style={[styles.badgeText, { color: goldColor }]}>{region}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Hero Title & Tagline */}
        <View style={styles.heroTextSection}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {tagline ? (
            <Text style={[styles.tagline, { color: textDimColor }]}>
              "{tagline}"
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // Graceful Fallback when no image is available
  return (
    <View style={styles.fallbackContainer}>
      <View
        style={[
          styles.fallbackAvatar,
          {
            backgroundColor: accentColor,
            borderColor: brandColor,
          },
        ]}
      >
        <Text style={styles.fallbackEmoji}>{hero.emoji}</Text>
      </View>
      <View style={styles.fallbackTextSection}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {era || region ? (
          <Text style={[styles.fallbackSubtitle, { color: goldColor }]}>
            {[era, region].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      {tagline ? (
        <Text style={[styles.tagline, { color: textDimColor }]}>
          "{tagline}"
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0a0908',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  floatingBadgesRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 2,
  },
  badge: {
    backgroundColor: 'rgba(20, 18, 16, 0.75)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heroTextSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 8,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: 28,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  fallbackContainer: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  fallbackAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 40,
  },
  fallbackTextSection: {
    alignItems: 'center',
    gap: 4,
  },
  fallbackSubtitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
