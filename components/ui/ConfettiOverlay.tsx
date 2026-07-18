import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, useWindowDimensions, View } from 'react-native';

import { COLORS } from '@/lib/constants';

type ConfettiShape = 'circle' | 'diamond' | 'petal' | 'streamer' | 'star';

type ConfettiParticle = {
  id: string;
  color: string;
  shape: ConfettiShape;
  leftPct: number;
  size: number;
  delay: number;
  drift: number;
  startY: number;
  endY: number;
  spin: number;
  scale: number;
};

type ConfettiOverlayProps = {
  show: boolean;
  onComplete?: () => void;
  density?: 'soft' | 'full' | 'burst';
};

const SACRED_COLORS = [
  COLORS.brandGoldDark,
  COLORS.brandGoldLight,
  COLORS.brandPrimaryStrongDark,
  COLORS.brandEarthDark,
  COLORS.creamBg,
  COLORS.sage,
  COLORS.navy,
];

const SHAPES: ConfettiShape[] = ['petal', 'diamond', 'streamer', 'circle', 'star'];

function buildParticles(count: number, density: NonNullable<ConfettiOverlayProps['density']>): ConfettiParticle[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const isBurst = density === 'burst';
    const shape = SHAPES[index % SHAPES.length];
    const side = seed % 3 === 0 ? 0 : seed % 3 === 1 ? -1 : 1;
    return {
      id: `confetti-${seed}`,
      color: SACRED_COLORS[index % SACRED_COLORS.length],
      shape,
      leftPct: isBurst && side !== 0 ? (side < 0 ? 12 + ((seed * 5) % 16) : 72 + ((seed * 7) % 16)) : (seed * 37) % 100,
      size: shape === 'streamer' ? 14 + ((seed * 7) % 18) : shape === 'star' ? 10 + ((seed * 5) % 8) : 7 + ((seed * 11) % 13),
      delay: isBurst ? (seed % 20) * 24 : (seed % 16) * 38,
      drift: side === 0 ? ((seed % 2 === 0 ? 1 : -1) * (24 + ((seed * 13) % 52))) : side * (70 + ((seed * 17) % 110)),
      startY: isBurst ? 42 + ((seed * 19) % 180) : -48 - ((seed * 17) % 90),
      endY: isBurst ? 520 + ((seed * 23) % 380) : 280 + ((seed * 19) % 280),
      spin: (seed % 2 === 0 ? 1 : -1) * (260 + ((seed * 23) % 520)),
      scale: 0.84 + ((seed * 3) % 7) / 10,
    };
  });
}

function ConfettiPiece({ particle, progress, height, width }: { particle: ConfettiParticle; progress: Animated.Value; height: number; width: number }) {
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [particle.startY, height + particle.endY],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, particle.drift, particle.drift * 0.36],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.spin}deg`],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.14, 0.82, 1],
    outputRange: [0.24, particle.scale, particle.scale, 0.72],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.78, 1],
    outputRange: [0, 1, 0.95, 0],
  });

  const isStreamer = particle.shape === 'streamer';
  const isStar = particle.shape === 'star';
  const baseStyle = {
    width: isStreamer ? particle.size * 0.42 : particle.size,
    height: isStreamer ? particle.size * 1.85 : particle.size,
    backgroundColor: particle.color,
    opacity,
    transform: [{ translateX }, { translateY }, { rotate }, { scale }],
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: (particle.leftPct / 100) * width,
          top: 0,
        },
        baseStyle,
        particle.shape === 'circle'
          ? { borderRadius: particle.size / 2 }
          : particle.shape === 'diamond'
            ? { transform: [...baseStyle.transform, { rotate: '45deg' }] }
            : isStreamer
              ? { borderRadius: particle.size, opacity: opacity }
              : isStar
                ? { borderRadius: 2, transform: [...baseStyle.transform, { rotate: '45deg' }] }
                : { borderTopLeftRadius: particle.size, borderBottomRightRadius: particle.size },
      ]}
    />
  );
}

export function ConfettiOverlay({ show, onComplete, density = 'full' }: ConfettiOverlayProps) {
  const { height, width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const particleCount = density === 'burst' ? 190 : density === 'full' ? 118 : 48;
  const particles = useMemo(() => buildParticles(particleCount, density), [density, particleCount]);
  const glowScale = progress.interpolate({
    inputRange: [0, 0.16, 0.72, 1],
    outputRange: [0.72, 1.28, 1.04, 1.36],
  });
  const glowOpacity = progress.interpolate({
    inputRange: [0, 0.16, 0.58, 1],
    outputRange: [0, density === 'burst' ? 0.42 : 0.22, 0.12, 0],
  });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!show) return;
    progress.setValue(0);

    if (reduceMotion) {
      const timer = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(timer);
    }

    Animated.timing(progress, {
      toValue: 1,
      duration: density === 'burst' ? 6200 : density === 'full' ? 5000 : 3400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  }, [density, onComplete, progress, reduceMotion, show]);

  if (!show) return null;

  if (reduceMotion) {
    return (
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: COLORS.homeSoftDark,
            borderWidth: 1,
            borderColor: COLORS.homeBorderSoftDark,
          }}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: width / 2 - 150,
          top: height * 0.32 - 150,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: COLORS.homeSoftLight,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      />
      {particles.map((particle) => (
        <ConfettiPiece key={particle.id} particle={particle} progress={progress} height={height} width={width} />
      ))}
    </View>
  );
}
