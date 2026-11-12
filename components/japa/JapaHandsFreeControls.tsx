import { Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, themeColor } from '@/lib/constants';
import type { JapaChantingMode } from '@/lib/japaPreferences';

type Theme = ReturnType<typeof themeColor>;

type Props = {
  isDark: boolean;
  theme: Theme;
  textColor: string;
  mutedColor: string;
  chantingMode: JapaChantingMode;
  isPaused: boolean;
  paceSeconds: number;
  onToggleMode: () => void;
  onTogglePause: () => void;
  onCyclePace: () => void;
};

export function JapaHandsFreeControls({
  isDark,
  theme,
  textColor,
  mutedColor,
  chantingMode,
  isPaused,
  paceSeconds,
  onToggleMode,
  onTogglePause,
  onCyclePace,
}: Props) {
  const isHandsFree = chantingMode === 'hands_free';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 12,
      }}
    >
      {/* Mode Switcher Pill */}
      <PressableSurface
        haptic="selection"
        accessibilityLabel={isHandsFree ? 'Switch to manual tap counting' : 'Switch to hands-free automatic counting'}
        onPress={onToggleMode}
        hitSlop={8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
          minHeight: MIN_TOUCH_TARGET,
          borderRadius: 999,
          backgroundColor: isDark ? 'rgba(8,6,4,0.72)' : 'rgba(255,253,248,0.88)',
          borderWidth: 1,
          borderColor: isHandsFree ? theme.brand : `${theme.brand}35`,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        }}
      >
        <Feather
          name={isHandsFree ? 'zap' : 'radio'}
          size={13}
          color={isHandsFree ? theme.brand : mutedColor}
        />
        <Text
          style={{
            fontFamily: FONTS.sansMedium,
            fontSize: 12,
            letterSpacing: 0.3,
            lineHeight: 16,
            color: isHandsFree ? theme.brand : textColor,
          }}
        >
          {isHandsFree ? (isPaused ? 'Paused' : 'Chanting') : 'Manual tap'}
        </Text>
      </PressableSurface>

      {/* When Hands-free: Play/Pause button + Pace Selector */}
      {isHandsFree ? (
        <>
          <PressableSurface
            haptic="impact"
            accessibilityLabel={isPaused ? 'Resume hands-free chanting' : 'Pause hands-free chanting'}
            onPress={onTogglePause}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: MIN_TOUCH_TARGET / 2,
              backgroundColor: isPaused ? theme.brand : (isDark ? 'rgba(8,6,4,0.72)' : 'rgba(255,253,248,0.88)'),
              borderWidth: 1,
              borderColor: theme.brand,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Feather
              name={isPaused ? 'play' : 'pause'}
              size={14}
              color={isPaused ? (isDark ? COLORS.darkBg : COLORS.creamBg) : theme.brand}
            />
          </PressableSurface>

          <PressableSurface
            haptic="selection"
            accessibilityLabel={`Pacing: ${paceSeconds} seconds per bead. Tap to change.`}
            onPress={onCyclePace}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: 999,
              backgroundColor: isDark ? 'rgba(8,6,4,0.72)' : 'rgba(255,253,248,0.88)',
              borderWidth: 1,
              borderColor: `${theme.brand}40`,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Feather name="clock" size={12} color={mutedColor} />
            <Text
              style={{
                fontFamily: FONTS.sansMedium,
                fontSize: 12,
                letterSpacing: 0.2,
                lineHeight: 16,
                color: textColor,
              }}
            >
              {paceSeconds.toFixed(1)}s
            </Text>
          </PressableSurface>
        </>
      ) : null}
    </View>
  );
}
