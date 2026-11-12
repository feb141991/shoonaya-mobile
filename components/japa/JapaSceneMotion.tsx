import { FEATURE_COLORS, OVERLAYS } from '@/lib/constants';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { BackgroundParticle, seededRandom, type ParticleMotion } from '@/components/ui/BackgroundParticles';
import type { JapaSceneId } from './JapaSceneSurfaces';

function FlameFlicker() {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const toOpacity = 0.35 + seededRandom(Date.now() % 997) * 0.5;
      const toScale = 0.92 + seededRandom((Date.now() % 991) + 3) * 0.22;
      Animated.parallel([
        Animated.timing(opacity, { toValue: toOpacity, duration: 140 + seededRandom(Date.now() % 500) * 160, useNativeDriver: true }),
        Animated.timing(scale, { toValue: toScale, duration: 140 + seededRandom((Date.now() % 500) + 7) * 160, useNativeDriver: true }),
      ]).start(() => tick());
    };
    tick();
    return () => { cancelled = true; };
  }, [opacity, scale]);

  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: '14%', left: '50%', marginLeft: -70, width: 140, height: 140, borderRadius: 70, backgroundColor: FEATURE_COLORS.japa.animatedViewSurface, opacity, transform: [{ scale }] }} />;
}

function DawnSweep({ color }: { color: string }) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(translateX, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  const tx = translateX.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] });
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: '18%', left: '50%', marginLeft: -110, width: 220, height: 90, borderRadius: 100, backgroundColor: color, opacity: 0.16, transform: [{ translateX: tx }] }} />;
}

function WaveBand({ topPct, color, seed }: { topPct: number; color: string; seed: number }) {
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(translateX, { toValue: 20, duration: 4200 + seededRandom(seed) * 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -20, duration: 4200 + seededRandom(seed * 1.6) * 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [seed, translateX]);

  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: `${topPct}%`, left: '-10%', width: '120%', height: 2, borderRadius: 1, backgroundColor: color, opacity: 0.16, transform: [{ translateX }] }} />;
}

function ShootingStar({ delaySeed }: { delaySeed: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      if (cancelled) return;
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 750, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        if (cancelled) return;
        timer = setTimeout(run, 9000 + seededRandom(delaySeed + (Date.now() % 100)) * 6000);
      });
    };
    timer = setTimeout(run, 2000 + seededRandom(delaySeed) * 6000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [delaySeed, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-60, 220] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-20, 90] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: '18%', left: '10%', width: 46, height: 1.6, borderRadius: 1, backgroundColor: OVERLAYS.white[0.9], opacity, transform: [{ rotate: '24deg' }, { translateX }, { translateY }] }} />;
}

const SCENE_PARTICLES: Record<JapaSceneId, { count: number; color: string; minSize: number; maxSize: number; motion: ParticleMotion; minDuration: number; maxDuration: number }> = {
  midnight: { count: 20, color: OVERLAYS.white[0.9], minSize: 1.8, maxSize: 3.8, motion: 'twinkle', minDuration: 2200, maxDuration: 4200 },
  himalayan: { count: 14, color: FEATURE_COLORS.japa.himalayanParticle, minSize: 2.2, maxSize: 4.2, motion: 'twinkle', minDuration: 2800, maxDuration: 4600 },
  temple: { count: 13, color: FEATURE_COLORS.japa.templeParticle, minSize: 2.4, maxSize: 4.4, motion: 'drift-up', minDuration: 3200, maxDuration: 5200 },
  river: { count: 14, color: FEATURE_COLORS.japa.riverParticle, minSize: 2, maxSize: 3.8, motion: 'wave', minDuration: 2600, maxDuration: 4600 },
  forest: { count: 16, color: FEATURE_COLORS.japa.forestParticle, minSize: 2.2, maxSize: 4.6, motion: 'drift-up', minDuration: 4200, maxDuration: 7200 },
  cosmos: { count: 30, color: OVERLAYS.white[0.95], minSize: 1.3, maxSize: 3.2, motion: 'twinkle', minDuration: 1800, maxDuration: 3600 },
};

export function SceneBackdrop({ sceneId }: { sceneId: JapaSceneId }) {
  const particleConfig = SCENE_PARTICLES[sceneId];
  const particles = useMemo(() => Array.from({ length: particleConfig.count }, (_, index) => {
    const seed = index + 1;
    return {
      seed,
      size: particleConfig.minSize + seededRandom(seed * 5.2) * (particleConfig.maxSize - particleConfig.minSize),
      duration: particleConfig.minDuration + seededRandom(seed * 7.7) * (particleConfig.maxDuration - particleConfig.minDuration),
    };
  }), [particleConfig]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {particles.map((particle) => <BackgroundParticle key={particle.seed} seed={particle.seed} color={particleConfig.color} size={particle.size} motion={particleConfig.motion} duration={particle.duration} />)}
      {sceneId === 'temple' ? <FlameFlicker /> : null}
      {sceneId === 'himalayan' ? <DawnSweep color={FEATURE_COLORS.japa.dawnSweepText} /> : null}
      {sceneId === 'river' ? <>
        <WaveBand topPct={30} color={FEATURE_COLORS.japa.riverWaveForeground} seed={31} />
        <WaveBand topPct={52} color={FEATURE_COLORS.japa.riverWaveMiddle} seed={37} />
        <WaveBand topPct={74} color={FEATURE_COLORS.japa.riverWaveBackground} seed={41} />
      </> : null}
      {sceneId === 'cosmos' ? <>
        <ShootingStar delaySeed={51} />
        <ShootingStar delaySeed={67} />
      </> : null}
    </View>
  );
}

export function StaticSceneBackdrop() {
  return null;
}
