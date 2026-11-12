import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { FEATURE_COLORS, OVERLAYS, COLORS } from '@/lib/constants';

export type JapaSceneId = 'midnight' | 'himalayan' | 'temple' | 'river' | 'forest' | 'cosmos';

export const BG_SCENES = [
  {
    id: 'midnight',
    name: 'Midnight',
    icon: 'moon',
    colors: [COLORS.darkBg, COLORS.cardBgDark, COLORS.homeHeroDark] as const,
    lightColors: [COLORS.creamBg, COLORS.homeRaisedLight, COLORS.homeHeroLight] as const,
  },
  {
    id: 'himalayan',
    name: 'Himalayan Dawn',
    icon: 'sunrise',
    colors: [COLORS.darkBg, COLORS.brandEarthLight, COLORS.cardBgDark] as const,
    lightColors: [COLORS.homeHeroLight, COLORS.creamBg, COLORS.homeRaisedLight] as const,
  },
  {
    id: 'temple',
    name: 'Temple Lamp',
    icon: 'flame',
    colors: [COLORS.homeHeroDark, COLORS.brandPrimaryStrongLight, COLORS.darkBg] as const,
    lightColors: [COLORS.homeRaisedLight, COLORS.brandSoftLight, COLORS.creamBg] as const,
  },
  {
    id: 'river',
    name: 'River Ghat',
    icon: 'droplet',
    colors: [COLORS.darkBg, COLORS.navy, COLORS.cardBgDark] as const,
    lightColors: [COLORS.brandAccentLight, COLORS.navyBg, COLORS.creamBg] as const,
  },
  {
    id: 'forest',
    name: 'Forest Ashram',
    icon: 'feather',
    colors: [COLORS.darkBg, COLORS.tileGreen, COLORS.cardBgDark] as const,
    lightColors: [COLORS.homeHeroLight, COLORS.tileGreen, COLORS.creamBg] as const,
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    icon: 'star',
    colors: [COLORS.darkBg, COLORS.tileViolet, COLORS.cardBgDark] as const,
    lightColors: [COLORS.homeRaisedLight, COLORS.tileViolet, COLORS.creamBg] as const,
  },
] as const;

const SCENE_BACKDROP_IMAGES: Record<JapaSceneId, number> = {
  midnight: require('../../assets/japa/scenes/midnight.webp'),
  himalayan: require('../../assets/japa/scenes/himalayan-dawn.webp'),
  temple: require('../../assets/japa/scenes/temple-lamp.webp'),
  river: require('../../assets/japa/scenes/river-ghat.webp'),
  forest: require('../../assets/japa/scenes/forest-ashram.webp'),
  cosmos: require('../../assets/japa/scenes/cosmos.webp'),
};

export function SceneImagePlate({ sceneId }: { sceneId: JapaSceneId }) {
  return (
    <Image
      source={SCENE_BACKDROP_IMAGES[sceneId]}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={180}
      cachePolicy="memory-disk"
      priority="high"
      accessibilityIgnoresInvertColors
    />
  );
}

// haloOffsetY moves the soft circle behind the counter along with the counter.
export function SceneReadabilityWash({ isDark, haloOffsetY = 0 }: { isDark: boolean; haloOffsetY?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          width: 258,
          height: 258,
          marginLeft: -129,
          borderRadius: 129,
          transform: [{ translateY: haloOffsetY }],
          backgroundColor: isDark ? FEATURE_COLORS.japa.surfaceDark : FEATURE_COLORS.japa.surfaceLight,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -60,
          left: -30,
          right: -30,
          height: 260,
          backgroundColor: isDark ? OVERLAYS.black[0.22] : FEATURE_COLORS.japa.surfaceLight2,
        }}
      />
      <LinearGradient
        colors={isDark
          ? [OVERLAYS.black[0.22], OVERLAYS.black[0], OVERLAYS.black[0.3]]
          : [FEATURE_COLORS.japa.gradientLightStart, FEATURE_COLORS.japa.gradientLightMiddle, FEATURE_COLORS.japa.gradientLightEnd]}
        style={{ position: 'absolute', inset: 0 }}
      />
    </View>
  );
}
