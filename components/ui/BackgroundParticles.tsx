import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

// Shared atmospheric-background primitives — extracted from app/(tabs)/japa.tsx's
// per-scene particle field (Midnight/Himalayan Dawn/Temple Lamp/River Ghat/
// Forest Ashram/Cosmos), which pioneered this "app DNA" look on Japa's
// practice screen. Pure RN Animated (no new dependency), useNativeDriver
// throughout. Deterministic per-particle placement/timing via a seeded
// pseudo-random helper, so layout doesn't reshuffle on every re-render.
export function seededRandom(seed: number) {
  const x = Math.sin(seed * 9973.1) * 43758.5453;
  return x - Math.floor(x);
}

export type ParticleMotion = 'twinkle' | 'drift-up' | 'wave';

export function BackgroundParticle({
  seed,
  color,
  size,
  motion,
  duration,
}: {
  seed: number;
  color: string;
  size: number;
  motion: ParticleMotion;
  duration: number;
}) {
  const opacity = useRef(new Animated.Value(seededRandom(seed) * 0.5 + 0.2)).current;
  const translateY = useRef(new Animated.Value(motion === 'drift-up' ? 46 : 0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const left = `${(seededRandom(seed * 1.7) * 92 + 3).toFixed(1)}%` as `${number}%`;
  const top = `${(seededRandom(seed * 2.3) * 88 + 4).toFixed(1)}%` as `${number}%`;

  useEffect(() => {
    const delay = seededRandom(seed * 3.1) * duration;
    let loop: Animated.CompositeAnimation;

    if (motion === 'twinkle') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.5, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.12, duration: duration * 0.5, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    } else if (motion === 'drift-up') {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(translateY, { toValue: -70, duration, delay, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 46, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(translateX, { toValue: seededRandom(seed * 4.4) > 0.5 ? 8 : -8, duration: duration / 2, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: duration * 0.25, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration * 0.75, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ])
      );
    } else {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, { toValue: 14, duration: duration / 2, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -14, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    }

    loop.start();
    return () => loop.stop();
  }, [duration, motion, opacity, seed, translateX, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

// Declarative convenience wrapper around BackgroundParticle for screens that
// just want "N bubbles drifting/twinkling in this color" without hand-rolling
// the useMemo'd particle-list generation Japa's own SceneBackdrop does
// inline. Fills its parent, so wrap it in a `position:'absolute', inset:0`
// container (or render it as the first child of one) to sit behind content.
export function FloatingParticleField({
  count,
  color,
  minSize,
  maxSize,
  motion,
  minDuration,
  maxDuration,
}: {
  count: number;
  color: string;
  minSize: number;
  maxSize: number;
  motion: ParticleMotion;
  minDuration: number;
  maxDuration: number;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const seed = index + 1;
        const size = minSize + seededRandom(seed * 5.2) * (maxSize - minSize);
        const duration = minDuration + seededRandom(seed * 7.7) * (maxDuration - minDuration);
        return { seed, size, duration };
      }),
    [count, minSize, maxSize, minDuration, maxDuration]
  );

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {particles.map((p) => (
        <BackgroundParticle key={p.seed} seed={p.seed} color={color} size={p.size} motion={motion} duration={p.duration} />
      ))}
    </View>
  );
}
