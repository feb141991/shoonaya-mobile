import { Animated, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { JapaBeadCounter } from '@/components/japa/JapaBeadCounter';
import { JapaBeadRing } from '@/components/japa/JapaBeadRing';
import { JapaHandsFreeControls } from '@/components/japa/JapaHandsFreeControls';
import { SceneBackdrop, StaticSceneBackdrop } from '@/components/japa/JapaSceneMotion';
import { SceneImagePlate, SceneReadabilityWash, type JapaSceneId } from '@/components/japa/JapaSceneSurfaces';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import type { MalaSkin } from '@/lib/mala-skins';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import type { JapaSoundTrack } from '@/lib/japa-audio';
import type { JapaChantingMode } from '@/lib/japaPreferences';

type Theme = ReturnType<typeof themeColor>;

type SceneDef = {
  id: string;
  name: string;
  icon: string;
  colors: readonly [string, string, string];
  lightColors: readonly [string, string, string];
};

type RingLayout = {
  scale: number;
  offsetY: number;
  ringCenterOffset: number;
};

type Props = {
  isDark: boolean;
  theme: Theme;
  scene: SceneDef;
  reduceMotion: boolean;
  insets: EdgeInsets;
  ringLayout: RingLayout;
  count: number;
  completedRounds: number;
  targetRounds: number;
  practiceTextColor: string;
  practiceMutedColor: string;
  malaSkin: MalaSkin;
  bloomIndex: number | null;
  pulseRadius: Animated.AnimatedInterpolation<number>;
  pulseOpacity: Animated.AnimatedInterpolation<number>;
  bloomRadius: Animated.AnimatedInterpolation<number>;
  bloomOpacity: Animated.AnimatedInterpolation<number>;
  tapScale: Animated.AnimatedInterpolation<number>;
  tapCountScale: Animated.AnimatedInterpolation<number>;
  tapCountTranslate: Animated.AnimatedInterpolation<number>;
  tapGlowOpacity: Animated.AnimatedInterpolation<number>;
  swayRotate: Animated.AnimatedInterpolation<string>;
  roundCelebrateVisible: boolean;
  roundOpacity: Animated.AnimatedInterpolation<number>;
  roundTranslate: Animated.AnimatedInterpolation<number>;
  activeSound: JapaSoundTrack;
  selectedSoundId: string;
  chantingMode: JapaChantingMode;
  isPaused: boolean;
  handsFreePace: number;
  onIncrement: () => void;
  onStopSession: () => void;
  onOpenSettings: () => void;
  onOpenSound: () => void;
  onToggleChantingMode: () => void;
  onTogglePause: () => void;
  onCyclePace: () => void;
};

export function JapaPracticeScreen({
  isDark,
  theme,
  scene,
  reduceMotion,
  insets,
  ringLayout,
  count,
  completedRounds,
  targetRounds,
  practiceTextColor,
  practiceMutedColor,
  malaSkin,
  bloomIndex,
  pulseRadius,
  pulseOpacity,
  bloomRadius,
  bloomOpacity,
  tapScale,
  tapCountScale,
  tapCountTranslate,
  tapGlowOpacity,
  swayRotate,
  roundCelebrateVisible,
  roundOpacity,
  roundTranslate,
  activeSound,
  selectedSoundId,
  chantingMode,
  isPaused,
  handsFreePace,
  onIncrement,
  onStopSession,
  onOpenSettings,
  onOpenSound,
  onToggleChantingMode,
  onTogglePause,
  onCyclePace,
}: Props) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={isDark ? scene.colors : scene.lightColors}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1 }}
      >
        <SceneImagePlate sceneId={scene.id as JapaSceneId} />
        <SceneReadabilityWash isDark={isDark} haloOffsetY={ringLayout.ringCenterOffset} />
        {reduceMotion ? <StaticSceneBackdrop /> : <SceneBackdrop sceneId={scene.id as JapaSceneId} />}
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.26)']
              : ['rgba(255,253,248,0.34)', 'rgba(255,253,248,0.12)', 'rgba(45,31,14,0.12)']
          }
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <JapaBeadCounter
          count={count}
          textColor={practiceTextColor}
          mutedColor={practiceMutedColor}
          countStyle={{
            position: 'absolute',
            alignItems: 'center',
            transform: [
              { translateY: ringLayout.ringCenterOffset },
              { translateY: tapCountTranslate },
              { scale: tapCountScale },
            ],
          }}
          onTap={onIncrement}
        >
          <JapaBeadRing
            count={count}
            malaSkin={malaSkin}
            brandColor={theme.brand}
            ringScale={ringLayout.scale}
            offsetY={ringLayout.offsetY}
            bloomIndex={bloomIndex}
            pulseRadius={pulseRadius}
            pulseOpacity={pulseOpacity}
            bloomRadius={bloomRadius}
            bloomOpacity={bloomOpacity}
            tapScale={tapScale}
            swayRotate={swayRotate}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: theme.brand,
              opacity: tapGlowOpacity,
              transform: [{ translateY: ringLayout.ringCenterOffset }, { scale: tapScale }],
            }}
          />
        </JapaBeadCounter>

        {/* Close (X) — always opens the exit-confirm sheet */}
        <PressableSurface
          haptic="selection"
          accessibilityLabel="Stop session"
          onPress={onStopSession}
          hitSlop={10}
          style={{
            position: 'absolute',
            top: Math.max(16, insets.top + 8),
            left: 20,
            width: 40,
            height: 40,
            minHeight: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(8,6,4,0.50)' : 'rgba(255,253,248,0.65)',
            borderWidth: 1,
            borderColor: `${theme.brand}30`,
          }}
        >
          <Feather name="x" size={17} color={theme.brand} />
        </PressableSurface>

        {/* Settings — opens the customize sheet */}
        <PressableSurface
          haptic="selection"
          accessibilityLabel="Practice settings"
          onPress={onOpenSettings}
          hitSlop={10}
          style={{
            position: 'absolute',
            top: Math.max(16, insets.top + 8),
            right: 20,
            width: 40,
            height: 40,
            minHeight: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(8,6,4,0.36)' : 'rgba(255,253,248,0.42)',
            borderWidth: 1,
            borderColor: `${theme.brand}28`,
          }}
        >
          <Feather name="sliders" size={15} color={theme.brand} />
        </PressableSurface>

        {/* Round Progress Indicator */}
        <View
          style={{
            position: 'absolute',
            top: Math.max(16, insets.top + 8),
            left: 72,
            right: 72,
            alignItems: 'center',
          }}
          pointerEvents="none"
        >
          <Text style={{ ...TYPE.chip, color: practiceTextColor }}>
            {completedRounds}/{targetRounds} malas
          </Text>
        </View>

        {/* Floating Hands-Free Mode and Transport Controls */}
        <View
          style={{
            position: 'absolute',
            top: Math.max(62, insets.top + 50),
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 40,
          }}
        >
          <JapaHandsFreeControls
            isDark={isDark}
            theme={theme}
            textColor={practiceTextColor}
            mutedColor={practiceMutedColor}
            chantingMode={chantingMode}
            isPaused={isPaused}
            paceSeconds={handsFreePace}
            onToggleMode={onToggleChantingMode}
            onTogglePause={onTogglePause}
            onCyclePace={onCyclePace}
          />
        </View>

        {/* Mala Round Celebration Banner */}
        {roundCelebrateVisible ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 42,
              right: 42,
              bottom: insets.bottom + NAV_BAR_CLEARANCE,
              opacity: roundOpacity,
              transform: [{ translateY: roundTranslate }],
            }}
          >
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(216,138,28,0.58)' : 'rgba(216,138,28,0.46)',
                backgroundColor: isDark ? 'rgba(8,6,4,0.68)' : 'rgba(255,253,248,0.82)',
                paddingHorizontal: 18,
                paddingVertical: 14,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.sansSemiBold,
                  fontSize: 11,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  color: theme.brand,
                }}
              >
                Mala complete
              </Text>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 19, color: practiceTextColor }}>
                108 beads offered
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Floating Sacred Sound Pill */}
        <PressableSurface
          haptic="selection"
          accessibilityLabel={`Sacred ambient sound: ${activeSound.label}`}
          onPress={onOpenSound}
          hitSlop={12}
          style={{
            position: 'absolute',
            bottom: Math.max(26, insets.bottom + 16),
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 16,
            paddingVertical: 10,
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: 999,
            backgroundColor: isDark ? 'rgba(8,6,4,0.72)' : 'rgba(255,253,248,0.92)',
            borderWidth: 1,
            borderColor: selectedSoundId !== 'off' ? theme.brand : `${theme.brand}35`,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            zIndex: 40,
          }}
        >
          <Feather
            name={selectedSoundId !== 'off' ? 'music' : 'volume-x'}
            size={13}
            color={selectedSoundId !== 'off' ? theme.brand : practiceMutedColor}
          />
          <Text
            style={{
              fontFamily: FONTS.sansMedium,
              fontSize: 12,
              letterSpacing: 0.3,
              color: selectedSoundId !== 'off' ? practiceTextColor : practiceMutedColor,
            }}
          >
            {selectedSoundId !== 'off' ? activeSound.label : 'Sound: Off'}
          </Text>
          <Feather name="chevron-up" size={12} color={practiceMutedColor} />
        </PressableSurface>
      </LinearGradient>
    </View>
  );
}
