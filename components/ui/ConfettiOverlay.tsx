import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { COLORS } from '@/lib/constants';

export type ConfettiKind = 'cannon' | 'petal' | 'stardust';
export type ConfettiShape =
  | 'ribbon'
  | 'streamer'
  | 'foil_square'
  | 'marigold_petal'
  | 'lotus_petal'
  | 'star'
  | 'bindu'
  | 'diamond'
  | 'circle'
  | 'square'
  | 'flower';

export type ConfettiParticle = {
  id: string;
  kind: ConfettiKind;
  color: string;
  shape: ConfettiShape;
  // Positioning & Dimensions
  side?: 'left' | 'right';
  leftPct: number;
  widthSize: number;
  heightSize: number;
  startY: number;
  endY: number;
  apexY: number;
  targetXRatio: number;
  drift: number;
  wobble: number;
  angle: number;
  radius: number;
  // 3D Rotations
  spinX: number;
  spinY: number;
  spinZ: number;
  scale: number;
};

type ConfettiOverlayProps = {
  show: boolean;
  onComplete?: () => void;
  density?: 'soft' | 'full' | 'burst';
};

// Canonical Sacred Confetti Palette (strictly preserves PWA parity colors for tests)
const SACRED_COLORS = [
  '#E88C35', // saffron
  '#C5A059', // gold
  '#F0A830', // amber
  '#D4784A', // terracotta
  '#F2EAD6', // cream
  '#D4926A', // rose-gold
  '#FABE5A', // light amber
  '#FFD700', // radiant 24k gold
  '#F472B6', // sacred lotus pink
  '#E11D48', // lotus crimson
  '#FFFDF0', // jasmine ivory
];

const GOLD_FOIL_COLORS = ['#FFD700', '#C5A059', '#E88C35', '#F0A830', '#FABE5A', '#D4926A'];
const PETAL_COLORS = ['#E88C35', '#F0A830', '#D4784A', '#F472B6', '#E11D48', '#F2EAD6'];
const STARDUST_COLORS = ['#FFFDF0', '#FFD700', '#FFE066', '#FABE5A', '#F2EAD6'];

const SHAPES: ConfettiShape[] = [
  'ribbon',
  'streamer',
  'foil_square',
  'marigold_petal',
  'lotus_petal',
  'star',
  'bindu',
  'diamond',
  'circle',
  'square',
  'flower',
];

function buildParticles(count: number, density: NonNullable<ConfettiOverlayProps['density']>): ConfettiParticle[] {
  // Proportions for the 3-stream celebration cocktail:
  // 45% Swarna Varsha Dual Cannons, 35% Pushpa Vrishti Petals, 20% Nakshatra Stardust
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const isBurst = density === 'burst';
    const isSoft = density === 'soft';

    // Determine Stream Kind
    const streamMod = index % 10;
    let kind: ConfettiKind = 'cannon';
    if (streamMod >= 5 && streamMod <= 7) {
      kind = 'petal';
    } else if (streamMod >= 8) {
      kind = 'stardust';
    }

    if (kind === 'cannon') {
      // ── Stream 1: Swarna Varsha (Dual Cannon Gold Foil & Saffron Streamers) ──
      const side: 'left' | 'right' = seed % 2 === 0 ? 'left' : 'right';
      const shapeChoice = seed % 3;
      const shape: ConfettiShape = shapeChoice === 0 ? 'ribbon' : shapeChoice === 1 ? 'streamer' : 'foil_square';
      const color = GOLD_FOIL_COLORS[index % GOLD_FOIL_COLORS.length];
      const widthSize = shape === 'streamer' ? 4.5 : shape === 'ribbon' ? 7 : 8.5;
      const heightSize = shape === 'streamer' ? 22 + (seed % 8) : shape === 'ribbon' ? 15 + (seed % 6) : 8.5;

      return {
        id: `confetti-cannon-${seed}`,
        kind: 'cannon',
        side,
        color,
        shape,
        leftPct: side === 'left' ? 2 + (seed % 6) : 92 + (seed % 6),
        widthSize,
        heightSize,
        startY: 0.92,
        apexY: 0.08 + ((seed * 13) % 22) / 100, // launch apex between 8% - 30% of screen height
        endY: 70 + ((seed * 17) % 90),
        targetXRatio: 0.28 + ((seed * 19) % 45) / 100, // travels 28% - 73% across screen
        drift: ((seed % 2 === 0 ? 1 : -1) * (20 + ((seed * 7) % 40))),
        wobble: 18 + ((seed * 11) % 24),
        angle: 0,
        radius: 0,
        spinX: (seed % 2 === 0 ? 1 : -1) * (720 + ((seed * 29) % 720)),
        spinY: (seed % 2 === 0 ? 1 : -1) * (540 + ((seed * 31) % 720)),
        spinZ: (seed % 2 === 0 ? 1 : -1) * (360 + ((seed * 23) % 540)),
        scale: 0.85 + ((seed * 3) % 4) / 10,
      };
    }

    if (kind === 'petal') {
      // ── Stream 2: Pushpa Vrishti (Sacred Marigold & Lotus Petals) ──────────
      const shape: ConfettiShape = seed % 2 === 0 ? 'marigold_petal' : 'lotus_petal';
      const color = PETAL_COLORS[index % PETAL_COLORS.length];
      const widthSize = shape === 'marigold_petal' ? 12 : 10;
      const heightSize = shape === 'marigold_petal' ? 16 : 18;

      return {
        id: `confetti-petal-${seed}`,
        kind: 'petal',
        color,
        shape,
        leftPct: (seed * 37) % 100,
        widthSize,
        heightSize,
        startY: -30 - ((seed * 13) % 60),
        apexY: 0,
        endY: 80 + ((seed * 19) % 90),
        targetXRatio: 0,
        drift: (seed % 2 === 0 ? 1 : -1) * (30 + ((seed * 17) % 55)),
        wobble: 22 + ((seed * 9) % 28),
        angle: 0,
        radius: 0,
        spinX: (seed % 2 === 0 ? 1 : -1) * (180 + ((seed * 17) % 360)),
        spinY: (seed % 2 === 0 ? 1 : -1) * (360 + ((seed * 23) % 540)),
        spinZ: (seed % 2 === 0 ? 1 : -1) * (120 + ((seed * 19) % 240)),
        scale: 0.9 + ((seed * 5) % 4) / 10,
      };
    }

    // ── Stream 3: Nakshatra Stardust (Celestial 4-Point Stars & Shimmering Bindus) ──
    const shapeChoice = seed % 3;
    const shape: ConfettiShape = shapeChoice === 0 ? 'star' : shapeChoice === 1 ? 'bindu' : 'diamond';
    const color = STARDUST_COLORS[index % STARDUST_COLORS.length];
    const widthSize = shape === 'star' ? 14 : shape === 'bindu' ? 5.5 : 7.5;
    const heightSize = widthSize;
    const angle = ((seed * 47) % 360) * (Math.PI / 180);
    const radius = isBurst ? 90 + ((seed * 29) % 150) : isSoft ? 50 + ((seed * 23) % 90) : 70 + ((seed * 23) % 120);

    return {
      id: `confetti-stardust-${seed}`,
      kind: 'stardust',
      color,
      shape,
      leftPct: 50,
      widthSize,
      heightSize,
      startY: 0.34, // center celebration focal height
      apexY: 0,
      endY: 0,
      targetXRatio: 0,
      drift: ((seed % 2 === 0 ? 1 : -1) * (15 + (seed % 25))),
      wobble: 0,
      angle,
      radius,
      spinX: 0,
      spinY: 0,
      spinZ: (seed % 2 === 0 ? 1 : -1) * (180 + ((seed * 37) % 360)),
      scale: 0.8 + ((seed * 3) % 5) / 10,
    };
  });
}

function ConfettiPiece({
  particle,
  progress,
  height,
  width,
}: {
  particle: ConfettiParticle;
  progress: Animated.Value;
  height: number;
  width: number;
}) {
  if (particle.kind === 'cannon') {
    // ── Swarna Varsha Parabolic Launch & 3D Foil Flutter ──
    const startX = particle.side === 'left' ? 0 : width;
    const targetX = particle.side === 'left' ? width * particle.targetXRatio : width * (1 - particle.targetXRatio);

    const translateX = progress.interpolate({
      inputRange: [0, 0.38, 0.72, 1],
      outputRange: [0, targetX - startX, targetX - startX + particle.drift, targetX - startX + particle.drift * 1.3],
    });

    const translateY = progress.interpolate({
      inputRange: [0, 0.38, 0.75, 1],
      outputRange: [
        height * particle.startY,
        height * particle.apexY,
        height * 0.58 + particle.drift,
        height + particle.endY,
      ],
    });

    const rotateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${particle.spinX}deg`],
    });
    const rotateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${particle.spinY}deg`],
    });
    const rotateZ = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${particle.spinZ}deg`],
    });

    const scale = progress.interpolate({
      inputRange: [0, 0.12, 0.82, 1],
      outputRange: [0.15, particle.scale, particle.scale, 0.7],
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.06, 0.84, 1],
      outputRange: [0, 1, 0.95, 0],
    });

    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: startX,
          top: 0,
          width: particle.widthSize,
          height: particle.heightSize,
          backgroundColor: particle.color,
          borderRadius: particle.shape === 'streamer' ? 1.5 : 2,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.42)',
          opacity,
          transform: [
            { perspective: 600 },
            { translateX },
            { translateY },
            { rotateX },
            { rotateY },
            { rotateZ },
            { scale },
          ],
        }}
      />
    );
  }

  if (particle.kind === 'petal') {
    // ── Pushpa Vrishti Sinusoidal Flutter & Organic Petal Drift ──
    const translateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [particle.startY, height + particle.endY],
    });

    const translateX = progress.interpolate({
      inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
      outputRange: [
        0,
        particle.drift + particle.wobble,
        particle.drift - particle.wobble,
        particle.drift + particle.wobble * 0.75,
        particle.drift - particle.wobble * 0.4,
        particle.drift,
      ],
    });

    const rotateZ = progress.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: ['0deg', `${particle.spinZ * 0.4}deg`, `${-particle.spinZ * 0.3}deg`, `${particle.spinZ * 0.6}deg`, `${particle.spinZ}deg`],
    });
    const rotateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${particle.spinY}deg`],
    });

    const scale = progress.interpolate({
      inputRange: [0, 0.14, 0.82, 1],
      outputRange: [0.3, particle.scale, particle.scale, 0.68],
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.08, 0.85, 1],
      outputRange: [0, 0.96, 0.92, 0],
    });

    const isMarigold = particle.shape === 'marigold_petal';

    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: (particle.leftPct / 100) * width,
          top: 0,
          width: particle.widthSize,
          height: particle.heightSize,
          backgroundColor: particle.color,
          borderTopLeftRadius: isMarigold ? 14 : 9,
          borderBottomRightRadius: isMarigold ? 14 : 9,
          borderTopRightRadius: isMarigold ? 4 : 9,
          borderBottomLeftRadius: isMarigold ? 4 : 9,
          opacity,
          transform: [
            { perspective: 500 },
            { translateX },
            { translateY },
            { rotateY },
            { rotateZ },
            { scale },
          ],
        }}
      />
    );
  }

  // ── Nakshatra Stardust Radial Celestial Twinkle Burst ──
  const originX = width / 2;
  const originY = height * particle.startY;
  const radX = Math.cos(particle.angle) * particle.radius;
  const radY = Math.sin(particle.angle) * particle.radius;

  const translateX = progress.interpolate({
    inputRange: [0, 0.32, 0.75, 1],
    outputRange: [0, radX, radX * 1.12 + particle.drift, radX * 1.18 + particle.drift * 1.4],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.32, 0.75, 1],
    outputRange: [0, radY, radY * 1.12 + 25, radY * 1.18 + 65],
  });

  const rotateZ = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${particle.spinZ}deg`],
  });

  // Twinkling sparkle pulse: 0 -> 1.3 -> 0.85 -> 1.15 -> 0
  const scale = progress.interpolate({
    inputRange: [0, 0.16, 0.42, 0.68, 1],
    outputRange: [0.1, particle.scale * 1.35, particle.scale * 0.85, particle.scale * 1.1, 0],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.62, 0.88, 1],
    outputRange: [0, 1, 0.95, 0.6, 0],
  });

  if (particle.shape === 'star') {
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: originX - particle.widthSize / 2,
          top: originY - particle.heightSize / 2,
          width: particle.widthSize,
          height: particle.heightSize,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: rotateZ }, { scale }],
        }}
      >
        <Svg width={particle.widthSize} height={particle.heightSize} viewBox="0 0 14 14">
          <Path
            d="M 7 0 L 8.6 5.4 L 14 7 L 8.6 8.6 L 7 14 L 5.4 8.6 L 0 7 L 5.4 5.4 Z"
            fill={particle.color}
          />
        </Svg>
      </Animated.View>
    );
  }

  if (particle.shape === 'diamond') {
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: originX - particle.widthSize / 2,
          top: originY - particle.heightSize / 2,
          width: particle.widthSize,
          height: particle.heightSize,
          backgroundColor: particle.color,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: '45deg' }, { scale }],
        }}
      />
    );
  }

  // Bindu circular sparkle orb
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: originX - particle.widthSize / 2,
        top: originY - particle.heightSize / 2,
        width: particle.widthSize,
        height: particle.heightSize,
        borderRadius: particle.widthSize / 2,
        backgroundColor: particle.color,
        borderWidth: 0.6,
        borderColor: '#FFFFFF',
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}

export function ConfettiOverlay({ show, onComplete, density = 'full' }: ConfettiOverlayProps) {
  const { height, width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  // Scaled particle counts for the 3-in-1 celebration cocktail
  const particleCount = density === 'burst' ? 220 : density === 'full' ? 130 : 68;
  const particles = useMemo(() => buildParticles(particleCount, density), [density, particleCount]);

  const glowScale = progress.interpolate({
    inputRange: [0, 0.16, 0.72, 1],
    outputRange: [0.72, 1.35, 1.05, 1.42],
  });
  const glowOpacity = progress.interpolate({
    inputRange: [0, 0.14, 0.55, 1],
    outputRange: [0, density === 'burst' ? 0.6 : density === 'full' ? 0.38 : 0.26, 0.18, 0],
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
      duration: density === 'burst' ? 5200 : density === 'full' ? 4200 : 3200,
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
        style={{
          position: 'absolute',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          elevation: 9999,
        }}
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
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      {/* Radiant celebration ambient glow aura in center */}
      <Animated.View
        style={{
          position: 'absolute',
          left: width / 2 - 160,
          top: height * 0.34 - 160,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: COLORS.homeSoftLight,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      />
      {/* The 3-in-1 Celebration Cocktail Particles */}
      {particles.map((particle) => (
        <ConfettiPiece key={particle.id} particle={particle} progress={progress} height={height} width={width} />
      ))}
    </View>
  );
}
