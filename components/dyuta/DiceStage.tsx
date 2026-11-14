import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { IvoryDie } from '@/components/dyuta/IvoryDie';
import type { Theme } from '@/components/dyuta/types';
import { COLORS, RADII, SPACING, TYPE } from '@/lib/constants';
import type { DyutaCopy } from '@/lib/dyuta/copy';
import type { DicePair } from '@/lib/dyuta/engine';

// Cosmetic faces shown while the dice tumble; never a real result.
const TUMBLE_FACES = [3, 6, 2, 5, 1, 4] as const;

/**
 * Throw → tumble → land. While `rolling`, each die spins along a short arc
 * with flickering faces; when the result arrives it drops in and settles with
 * a spring. Reduced motion skips all movement and just shows the result.
 */
export function DiceStage({ dice, rolling: rollingDice, theme, isDark, copy, reducedMotion }: { dice: DicePair | null; rolling: [boolean, boolean] | null; theme: Theme; isDark: boolean; copy: DyutaCopy; reducedMotion: boolean }) {
  const rolling = rollingDice !== null;
  const lastThrown = useRef<[boolean, boolean]>([true, true]);
  const tumble = useRef(new Animated.Value(0)).current;
  const land = useRef(new Animated.Value(1)).current;
  const wasRolling = useRef(rolling);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reducedMotion) { tumble.setValue(0); land.setValue(1); wasRolling.current = rolling; return; }
    if (rolling) {
      land.setValue(0);
      tumble.setValue(0);
      const spin = Animated.loop(Animated.timing(tumble, { toValue: 1, duration: 520, easing: Easing.linear, useNativeDriver: true }));
      spin.start();
      const flicker = setInterval(() => setFrame((value) => value + 1), 90);
      wasRolling.current = true;
      return () => { spin.stop(); clearInterval(flicker); };
    }
    if (wasRolling.current) {
      wasRolling.current = false;
      land.setValue(0);
      Animated.spring(land, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }).start();
    }
    return undefined;
  }, [land, reducedMotion, rolling, tumble]);

  const tumbling = rolling && !reducedMotion;
  const dieMotion = (direction: 1 | -1, delay: number, moving: boolean) => {
    const settle = { transform: [{ translateY: land.interpolate({ inputRange: [0, 1], outputRange: [-34, 0] }) }, { scale: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1.12, 0.96, 1] }) }] };
    // The spin only applies mid-throw; a landed die always rests upright.
    if (!tumbling || !moving) return moving ? settle : {};
    const phase = Animated.modulo(Animated.add(tumble, delay), 1);
    return {
      transform: [
        // airborne arc while tumbling, then a drop that overshoots and settles
        { translateY: Animated.add(phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -26, 0] }), land.interpolate({ inputRange: [0, 1], outputRange: [-34, 0] })) },
        { translateX: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-6 * direction, 6 * direction, -6 * direction] }) },
        { rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * direction}deg`] }) },
        { scale: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1.12, 0.96, 1] }) },
      ],
    };
  };
  const faceFor = (offset: number) => TUMBLE_FACES[(frame + offset) % TUMBLE_FACES.length];
  // A single-die reroll tumbles only that die; the kept die stays visible and still.
  const faceOf = (index: 0 | 1) => { const moving = rollingDice?.[index] ?? false; if (moving) return tumbling ? faceFor(index * 3) : null; return dice?.[index] ?? null; };
  const first = faceOf(0);
  const second = faceOf(1);
  // Remember which dice were thrown so only they replay the landing bounce.
  if (rollingDice) lastThrown.current = rollingDice;
  const [movingFirst, movingSecond] = rollingDice ?? lastThrown.current;

  return <View style={{ alignItems: 'center', gap: SPACING.sm }}>
    <Text style={{ ...TYPE.chip, color: theme.brandStrong, textTransform: 'uppercase', letterSpacing: 1.5, backgroundColor: isDark ? COLORS.dyutaMatDark : COLORS.dyutaMatLight, paddingHorizontal: SPACING.sm, borderRadius: RADII.xs, overflow: 'hidden' }}>{copy.concealedThrow}</Text>
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.lg }}>
      <Animated.View style={dieMotion(1, 0, movingFirst)}><IvoryDie value={first} label={copy.firstDie} tilt="-14deg" airborne={tumbling && movingFirst} /></Animated.View>
      <Animated.View style={[{ marginTop: SPACING.xxl }, dieMotion(-1, 0.35, movingSecond)]}><IvoryDie value={second} label={copy.secondDie} tilt="10deg" airborne={tumbling && movingSecond} /></Animated.View>
    </View>
  </View>;
}
