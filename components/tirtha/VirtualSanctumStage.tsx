import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { TempleSanctumNode } from '@/lib/yatra-data';
import { FEATURE_COLORS, OVERLAYS, COLORS, FONTS } from '@/lib/constants';

type VirtualSanctumStageProps = {
  bellRotation: Animated.AnimatedInterpolation<string>;
  diyaLit: boolean;
  handleLightDiya: () => void;
  handleRingBell: () => void;
  parikramaCount: number;
  sanctumBg: [string, string];
  temple: TempleSanctumNode;
};

export function VirtualSanctumStage({
  bellRotation,
  diyaLit,
  handleLightDiya,
  handleRingBell,
  parikramaCount,
  sanctumBg,
  temple,
}: VirtualSanctumStageProps) {
  return (
    <View style={styles.sanctumOuterFrame}>
      <LinearGradient
        colors={sanctumBg}
        style={styles.sanctumStage}
      >
        {/* Temple Hanging Bell (Interactive) */}
        <Animated.View
          style={[
            styles.hangingBellContainer,
            { transform: [{ rotate: bellRotation }] },
          ]}
        >
          <Pressable
            onPress={handleRingBell}
            hitSlop={10}
            accessibilityLabel="Ring sanctum bell"
            style={styles.bellTouchArea}
          >
            <View style={styles.bellChain} />
            <View style={styles.bellDome}>
              <Text style={styles.bellGlyph}>🔔</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Cosmic Sanctum Aura & Halo */}
        <View style={styles.deityAuraRing}>
          <View style={styles.deityInnerGlow}>
            <Text style={styles.deitySymbolGlyph}>🕉️</Text>
            <Text style={styles.deityTitleText}>{temple.deity}</Text>
          </View>
        </View>

        {/* Left & Right Brass Ghee Diyas */}
        <View style={styles.diyasRow}>
          {/* Left Diya */}
          <Pressable
            onPress={handleLightDiya}
            style={styles.diyaTouchTarget}
            accessibilityLabel="Light left temple diya"
          >
            <View style={styles.diyaBase}>
              <Text style={styles.diyaFlameEmoji}>{diyaLit ? '🔥' : '🪔'}</Text>
              {diyaLit ? (
                <View style={styles.diyaGlowCircle} />
              ) : null}
            </View>
            <Text style={styles.diyaLabel}>{diyaLit ? 'Deepam' : 'Tap to Light'}</Text>
          </Pressable>

          {/* Center Parikrama Counter Ring */}
          <View style={styles.parikramaRing}>
            <Text style={styles.parikramaLabel}>PARIKRAMA</Text>
            <Text style={styles.parikramaCountNumber}>{parikramaCount}</Text>
          </View>

          {/* Right Diya */}
          <Pressable
            onPress={handleLightDiya}
            style={styles.diyaTouchTarget}
            accessibilityLabel="Light right temple diya"
          >
            <View style={styles.diyaBase}>
              <Text style={styles.diyaFlameEmoji}>{diyaLit ? '🔥' : '🪔'}</Text>
              {diyaLit ? (
                <View style={styles.diyaGlowCircle} />
              ) : null}
            </View>
            <Text style={styles.diyaLabel}>{diyaLit ? 'Deepam' : 'Tap to Light'}</Text>
          </Pressable>
        </View>

        {/* Sanctum Floor Floral Border */}
        <View style={styles.sanctumFloor}>
          <Text style={styles.sanctumFloorMantra}>
            ✦ ॐ नमः शिवाय ✦ हर हर महादेव ✦
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  sanctumOuterFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: OVERLAYS.gold[0.4],
    marginVertical: 10,
    boxShadow: FEATURE_COLORS.virtualSanctumModal.sanctumOuterFrameShadow,
  },
  sanctumStage: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 210,
    justifyContent: 'space-between',
  },
  hangingBellContainer: {
    alignItems: 'center',
  },
  bellTouchArea: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  bellChain: {
    width: 2,
    height: 18,
    backgroundColor: COLORS.brandGold,
  },
  bellDome: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: OVERLAYS.gold[0.25],
    borderWidth: 1,
    borderColor: COLORS.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellGlyph: {
    fontSize: 20,
  },
  deityAuraRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: OVERLAYS.gold[0.15],
    borderWidth: 1.5,
    borderColor: COLORS.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  deityInnerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deitySymbolGlyph: {
    fontSize: 32,
  },
  deityTitleText: {
    fontFamily: FONTS.serifBold,
    fontSize: 11,
    color: FEATURE_COLORS.virtualSanctumModal.deityTitleText,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  diyasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  diyaTouchTarget: {
    alignItems: 'center',
    gap: 4,
  },
  diyaBase: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: OVERLAYS.black[0.4],
    borderWidth: 1,
    borderColor: COLORS.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diyaFlameEmoji: {
    fontSize: 22,
  },
  diyaGlowCircle: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: FEATURE_COLORS.virtualSanctumModal.diyaGlowCircleSurface,
  },
  diyaLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    color: FEATURE_COLORS.virtualSanctumModal.handleBarSurfaceLight,
  },
  parikramaRing: {
    alignItems: 'center',
    backgroundColor: OVERLAYS.black[0.5],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: OVERLAYS.gold[0.3],
  },
  parikramaLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 9,
    color: COLORS.brandGold,
    letterSpacing: 1,
  },
  parikramaCountNumber: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    color: COLORS.onMediaWhite,
  },
  sanctumFloor: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: OVERLAYS.gold[0.25],
    width: '100%',
    alignItems: 'center',
  },
  sanctumFloorMantra: {
    fontFamily: FONTS.serif,
    fontSize: 11,
    color: COLORS.brandGold,
    letterSpacing: 1.5,
    opacity: 0.85,
  },
});
