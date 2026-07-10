import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, useWindowDimensions, View } from 'react-native';

import { COLORS } from '@/lib/constants';

type ConfettiShape = 'circle' | 'diamond' | 'petal';

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
};

type ConfettiOverlayProps = {
  show: boolean;
  onComplete?: () => void;
  density?: 'soft' | 'full';
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

const SHAPES: ConfettiShape[] = ['circle', 'diamond', 'petal'];

function buildParticles(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    return {
      id: `confetti-${seed}`,
      color: SACRED_COLORS[index % SACRED_COLORS.length],
      shape: SHAPES[index % SHAPES.length],
      leftPct: (seed * 37) % 100,
      size: 5 + ((seed * 11) % 10),
      delay: (seed % 16) * 42,
      drift: ((seed % 2 === 0 ? 1 : -1) * (20 + ((seed * 13) % 58))),
      startY: -36 - ((seed * 17) % 84),
      endY: 240 + ((seed * 19) % 260),
      spin: (seed % 2 === 0 ? 1 : -1) * (180 + ((seed * 23) % 260)),
    };
  });
}

function ConfettiPiece({ particle, progress, height }: { particle: ConfettiParticle; progress: Animated.Value; height: number }) {
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [particle.startY, height + particle.endY],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, particle.drift, particle.drift * 0.4],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.spin}deg`],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.76, 1],
    outputRange: [0, 1, 1, 0],
  });

  const baseStyle = {
    width: particle.size,
    height: particle.size,
    backgroundColor: particle.color,
    opacity,
    transform: [{ translateX }, { translateY }, { rotate }],
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${particle.leftPct}%`,
          top: 0,
        },
        baseStyle,
        particle.shape === 'circle'
          ? { borderRadius: particle.size / 2 }
          : particle.shape === 'diamond'
            ? { transform: [...baseStyle.transform, { rotate: '45deg' }] }
            : { borderTopLeftRadius: particle.size, borderBottomRightRadius: particle.size },
      ]}
    />
  );
}

export function ConfettiOverlay({ show, onComplete, density = 'full' }: ConfettiOverlayProps) {
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const particles = useMemo(() => buildParticles(density === 'full' ? 72 : 36), [density]);

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
      duration: density === 'full' ? 4200 : 3000,
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
      {particles.map((particle) => (
        <ConfettiPiece key={particle.id} particle={particle} progress={progress} height={height} />
      ))}
    </View>
  );
}
