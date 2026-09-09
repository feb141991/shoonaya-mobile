import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

export type FlowerPetalType = 'rose' | 'marigold' | 'lotus' | 'bilva' | 'jasmine';

type FlowerParticle = {
  id: string;
  type: FlowerPetalType;
  color: string;
  leftPct: number;
  size: number;
  delay: number;
  drift: number;
  startY: number;
  endY: number;
  spin: number;
  scale: number;
};

type FlowerShowerOverlayProps = {
  show: boolean;
  onComplete?: () => void;
  count?: number;
};

const PETAL_TYPES: { type: FlowerPetalType; color: string }[] = [
  { type: 'marigold', color: '#F39C12' },
  { type: 'marigold', color: '#E67E22' },
  { type: 'rose', color: '#C0392B' },
  { type: 'rose', color: '#E74C3C' },
  { type: 'lotus', color: '#F48FB1' },
  { type: 'bilva', color: '#27AE60' },
  { type: 'jasmine', color: '#FFF9E6' },
];

function buildPetals(count: number): FlowerParticle[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const item = PETAL_TYPES[index % PETAL_TYPES.length];
    const side = seed % 3 === 0 ? 0 : seed % 3 === 1 ? -1 : 1;
    return {
      id: `petal-${seed}`,
      type: item.type,
      color: item.color,
      leftPct: 8 + ((seed * 31) % 84),
      size: 16 + ((seed * 7) % 12),
      delay: (seed % 14) * 45,
      drift: side === 0 ? (seed % 2 === 0 ? 30 : -30) : side * (40 + ((seed * 11) % 45)),
      startY: -40 - ((seed * 13) % 60),
      endY: 450 + ((seed * 17) % 250),
      spin: (seed % 2 === 0 ? 1 : -1) * (180 + ((seed * 19) % 360)),
      scale: 0.75 + ((seed * 5) % 6) / 10,
    };
  });
}

function PetalShape({ type, color, size }: { type: FlowerPetalType; color: string; size: number }) {
  if (type === 'bilva') {
    return (
      <Svg width={size} height={size * 1.2} viewBox="0 0 24 28">
        {/* Sacred 3-lobed Bilva leaf */}
        <Path
          d="M12 2 C8 6, 8 14, 12 18 C16 14, 16 6, 12 2 Z"
          fill={color}
          opacity={0.92}
        />
        <Path
          d="M6 14 C3 17, 4 23, 10 21 C11 18, 9 14, 6 14 Z"
          fill={color}
          opacity={0.88}
        />
        <Path
          d="M18 14 C21 17, 20 23, 14 21 C13 18, 15 14, 18 14 Z"
          fill={color}
          opacity={0.88}
        />
      </Svg>
    );
  }

  if (type === 'rose') {
    return (
      <Svg width={size} height={size * 1.1} viewBox="0 0 24 26">
        {/* Curved velvet rose petal */}
        <Path
          d="M12 2 C5 4, 2 12, 6 20 C10 24, 14 24, 18 20 C22 12, 19 4, 12 2 Z"
          fill={color}
          opacity={0.94}
        />
      </Svg>
    );
  }

  if (type === 'lotus') {
    return (
      <Svg width={size} height={size * 1.3} viewBox="0 0 20 26">
        {/* Slender lotus petal */}
        <Path
          d="M10 1 C4 7, 3 17, 10 25 C17 17, 16 7, 10 1 Z"
          fill={color}
          opacity={0.9}
        />
      </Svg>
    );
  }

  if (type === 'jasmine') {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {/* Star jasmine flower */}
        <Ellipse cx="10" cy="5" rx="2.5" ry="5" fill={color} opacity={0.95} />
        <Ellipse cx="10" cy="15" rx="2.5" ry="5" fill={color} opacity={0.95} />
        <Ellipse cx="5" cy="10" rx="5" ry="2.5" fill={color} opacity={0.95} />
        <Ellipse cx="15" cy="10" rx="5" ry="2.5" fill={color} opacity={0.95} />
        <Ellipse cx="10" cy="10" rx="2.5" ry="2.5" fill="#F1C40F" opacity={0.9} />
      </Svg>
    );
  }

  // Marigold petal (default)
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 20 24">
      <Path
        d="M10 2 C6 5, 4 14, 10 22 C16 14, 14 5, 10 2 Z"
        fill={color}
        opacity={0.92}
      />
    </Svg>
  );
}

function PetalPiece({
  particle,
  progress,
  height,
  width,
}: {
  particle: FlowerParticle;
  progress: Animated.Value;
  height: number;
  width: number;
}) {
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [particle.startY, height + particle.endY],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, particle.drift, -particle.drift * 0.5, particle.drift * 0.8],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.spin}deg`],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0.3, particle.scale, particle.scale, 0.6],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.8, 1],
    outputRange: [0, 1, 0.95, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (particle.leftPct / 100) * width,
        top: 0,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}
    >
      <PetalShape type={particle.type} color={particle.color} size={particle.size} />
    </Animated.View>
  );
}

export function FlowerShowerOverlay({ show, onComplete, count = 28 }: FlowerShowerOverlayProps) {
  const { width, height } = useWindowDimensions();
  const [active, setActive] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const particles = useMemo(() => buildPetals(count), [count]);

  useEffect(() => {
    if (!show) {
      setActive(false);
      progress.setValue(0);
      return;
    }

    if (reduceMotion) {
      setActive(true);
      const timer = setTimeout(() => {
        setActive(false);
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }

    setActive(true);
    progress.setValue(0);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        setActive(false);
        onComplete?.();
      }
    });

    return () => {
      animation.stop();
    };
  }, [show, reduceMotion, onComplete, progress]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((particle) => (
        <PetalPiece
          key={particle.id}
          particle={particle}
          progress={progress}
          height={height}
          width={width}
        />
      ))}
    </View>
  );
}
