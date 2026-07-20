import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/components/ui/Screen';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { JapaMalaArtwork } from '@/components/japa/JapaMalaArtwork';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { getMalaSkin, MALA_SKINS } from '@/lib/mala-skins';
import { navScrollHandler } from '@/lib/navScrollBus';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { supabase } from '@/lib/supabase';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { getJapaMantrasForTradition, getJapaPracticeType, type JapaMantra } from '@/lib/traditions';
import { getNityaRankProgress } from '@/lib/nitya-rank';
import { getMalaVolumeMilestone } from '@/lib/mala-milestones';
import { pickDharmaFact } from '@/lib/dharma-facts';
import { spiritualDate } from '@/lib/spiritualDate';

// Native Japa — rebuilt to mirror PWA's src/app/(main)/japa/JapaClient.tsx
// screen flow (Phase 1 of a phased port; see conversation for phases 2/3):
//   Screen 'launcher' — "Choose your practice": selected mantra, mala/target/
//     streak pills, target-rounds chips, a daily Dharma Reflection, a "Your
//     Path" streak-rank card, a "Lifetime Japa" volume card, and Begin Japa.
//   Screen 'practice' — full-screen bead-ring counting, tap anywhere to
//     count, X (top-left) always opens the exit-confirm sheet, a settings
//     icon (top-right) opens the existing mala/scene/mantra picker.
//   Exit-confirm sheet ("Stop this session?") — End & save / Continue
//     practice / Discard and leave (or "Leave setup" with zero progress),
//     matching JapaClient.tsx's StopPracticeSheet copy and branching exactly.
// Phase 2 adds the dedicated ChooseMala/ChooseMantra screens (opened from
// the in-practice setup flow, chaining mala→mantra→practice exactly as
// JapaClient.tsx does) and richens the
// completion celebration (ripple rings, glow, tradition subtitle line).
// The in-practice "settings" icon still opens the lighter "Customize" sheet,
// now trimmed to just Scene + Mantra audio (quick, non-interrupting tweaks)
// since mala/mantra selection now has its own dedicated flow.
// Deliberately out of scope for this phase (tracked as follow-ups): the
// ambient-sound "Sacred Sounds" sheet, and the ✨-gradient tradition accent
// colour (native uses the app's one consistent `theme.brand` gold everywhere
// else, so this screen keeps that rather than introducing a second,
// screen-local accent system). Japa Insights page is Phase 3.

type ProfileRow = {
  active_symbol_id: string | null;
  tradition: string | null;
  timezone: string | null;
};

type SadhanaTodayRow = {
  japa_done: boolean | null;
  streak_count: number | null;
};

type ToastState = {
  visible: boolean;
  message: string;
};

type JapaLifetimeData = {
  totalBeads: number;
  totalRounds: number;
  lastPracticed: string | null;
};

const EMPTY_LIFETIME: JapaLifetimeData = { totalBeads: 0, totalRounds: 0, lastPracticed: null };

const SVG_SIZE = 320;
const PRACTICE_SVG_SIZE = 382;
const CENTER = SVG_SIZE / 2;
const RADIUS = 120;
const PRACTICE_CENTER = PRACTICE_SVG_SIZE / 2 - 12;
const PRACTICE_RADIUS = 162;
const TARGET_OPTIONS = [1, 3, 5, 11] as const;
const MAX_TARGET_ROUNDS = 108;
const MANTRA_AUDIO_KEY = 'shoonaya.japa.mantraAudio';
const JAPA_MALA_KEY = 'shoonaya.japa.selectedMala';
const JAPA_SCENE_KEY = 'shoonaya.japa.scene';
const JAPA_CUSTOM_MANTRA_KEY = 'shoonaya.japa.customMantra';
const JAPA_TARGET_ROUNDS_KEY = 'shoonaya.japa.targetRounds';
const JAPA_LIFETIME_KEY = 'shoonaya.japa.lifetime';

const BG_SCENES = [
  {
    id: 'midnight',
    name: 'Midnight',
    icon: 'moon',
    colors: [COLORS.darkBg, COLORS.cardBgDark, COLORS.homeHeroDark] as const,
    lightColors: [COLORS.creamBg, COLORS.homeRaisedLight, COLORS.homeHeroLight] as const,
  },
  {
    id: 'himalayan',
    name: 'Himalayan Dawn',
    icon: 'sunrise',
    colors: [COLORS.darkBg, COLORS.brandEarthLight, COLORS.cardBgDark] as const,
    lightColors: [COLORS.homeHeroLight, COLORS.creamBg, COLORS.homeRaisedLight] as const,
  },
  {
    id: 'temple',
    name: 'Temple Lamp',
    icon: 'flame',
    colors: [COLORS.homeHeroDark, COLORS.brandPrimaryStrongLight, COLORS.darkBg] as const,
    lightColors: [COLORS.homeRaisedLight, COLORS.brandSoftLight, COLORS.creamBg] as const,
  },
  {
    id: 'river',
    name: 'River Ghat',
    icon: 'droplet',
    colors: [COLORS.darkBg, COLORS.navy, COLORS.cardBgDark] as const,
    lightColors: [COLORS.brandAccentLight, COLORS.navyBg, COLORS.creamBg] as const,
  },
  {
    id: 'forest',
    name: 'Forest Ashram',
    icon: 'feather',
    colors: [COLORS.darkBg, COLORS.tileGreen, COLORS.cardBgDark] as const,
    lightColors: [COLORS.homeHeroLight, COLORS.tileGreen, COLORS.creamBg] as const,
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    icon: 'star',
    colors: [COLORS.darkBg, COLORS.tileViolet, COLORS.cardBgDark] as const,
    lightColors: [COLORS.homeRaisedLight, COLORS.tileViolet, COLORS.creamBg] as const,
  },
] as const;

type JapaSceneId = typeof BG_SCENES[number]['id'];
type Theme = ReturnType<typeof themeColor>;

const SCENE_BACKDROP_IMAGES: Record<JapaSceneId, number> = {
  midnight: require('../../assets/japa/scenes/midnight.webp'),
  himalayan: require('../../assets/japa/scenes/himalayan-dawn.webp'),
  temple: require('../../assets/japa/scenes/temple-lamp.webp'),
  river: require('../../assets/japa/scenes/river-ghat.webp'),
  forest: require('../../assets/japa/scenes/forest-ashram.webp'),
  cosmos: require('../../assets/japa/scenes/cosmos.webp'),
};

function TargetRoundSelector({
  value,
  onChange,
  theme,
  isDark,
}: {
  value: number;
  onChange: (value: number) => void;
  theme: Theme;
  isDark: boolean;
}) {
  const [customValue, setCustomValue] = useState(TARGET_OPTIONS.includes(value as (typeof TARGET_OPTIONS)[number]) ? '' : String(value));
  const customNumber = Number(customValue);
  const customSelected = !TARGET_OPTIONS.includes(value as (typeof TARGET_OPTIONS)[number]);
  const customValid = Number.isInteger(customNumber) && customNumber >= 1 && customNumber <= MAX_TARGET_ROUNDS;

  useEffect(() => {
    if (!TARGET_OPTIONS.includes(value as (typeof TARGET_OPTIONS)[number])) {
      setCustomValue(String(value));
    }
  }, [value]);

  const commitCustomValue = () => {
    if (!customValid) return;
    void Haptics.selectionAsync().catch(() => {});
    onChange(customNumber);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...TYPE.chip, letterSpacing: 1.3, textTransform: 'uppercase', color: theme.dim }}>
        Target rounds
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {TARGET_OPTIONS.map((n) => {
          const selected = value === n;
          return (
            <View
              key={n}
              style={{
                flex: 1,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: selected ? theme.brand : theme.borderSoft,
                backgroundColor: selected
                  ? theme.brandSoft
                  : isDark
                    ? COLORS.selectionWellDark
                    : COLORS.selectionWellLight,
              }}
            >
              <Pressable
                accessibilityLabel={`${n} target round${n > 1 ? 's' : ''}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  void Haptics.selectionAsync().catch(() => {});
                  onChange(n);
                }}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  paddingHorizontal: 8,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 14,
                    color: selected ? theme.brand : theme.text,
                  }}
                >
                  {n}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: customSelected ? theme.brand : theme.premiumBorder,
          backgroundColor: customSelected
            ? theme.brandSoft
            : isDark
              ? COLORS.selectionWellDark
              : COLORS.selectionWellLight,
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: customSelected ? theme.brand : theme.text }}>
              Custom target
            </Text>
            <Text style={{ ...TYPE.caption, color: theme.dim }}>
              1-{MAX_TARGET_ROUNDS} malas
            </Text>
          </View>
          <TextInput
            accessibilityLabel="Custom target rounds"
            keyboardType="number-pad"
            value={customValue}
            onChangeText={(text) => setCustomValue(text.replace(/[^0-9]/g, '').slice(0, 3))}
            onSubmitEditing={commitCustomValue}
            onBlur={commitCustomValue}
            placeholder="e.g. 7"
            placeholderTextColor={theme.dim}
            style={{
              width: 82,
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: customSelected ? theme.brand : theme.premiumBorder,
              backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.cardBgLight,
              color: theme.text,
              textAlign: 'center',
              fontFamily: FONTS.sansSemiBold,
              fontSize: 16,
              paddingHorizontal: 10,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply custom target rounds"
            disabled={!customValid}
            onPress={commitCustomValue}
            style={{
              minWidth: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: customValid ? theme.brand : theme.premiumBorder,
              opacity: customValid ? 1 : 0.55,
            }}
          >
            <Feather name="check" size={18} color={customValid ? COLORS.ink : theme.dim} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Short taglines for the ChooseMala screen's mala list — MALA_SKINS itself
// (lib/mala-skins.ts, shared with the bead-ring renderer) only carries
// color/label fields, so this stays local to the picker's presentation.
const MALA_TAGLINES: Record<string, string> = {
  default: 'Calming · all traditions',
  'sacred-mala': 'Sacred · Shaiva',
  'krishna-flute': 'Clarity · breath practice',
  'tulsi-leaf': 'Pure · Vaishnava',
  'brahma-lotus': 'Soft focus · universal',
  'the-sage-halo': 'Radiant · festival practice',
  'bodhi-leaf': 'Grounding · meditation',
};
type CompletionStats = {
  rounds: number;
  beads: number;
  durationSecs: number;
  mantraName: string;
};

function getCompletionTitle(tradition: string | null) {
  if (tradition === 'sikh') return 'Simran Complete';
  if (tradition === 'buddhist') return 'Meditation Complete';
  if (tradition === 'jain') return 'Japa Complete';
  return 'माला पूर्ण हुई';
}

function getSpiritualTimeWindow() {
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 6) return 'brahma_muhurta';
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 20) return 'sandhya';
  return 'night';
}

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

function capitalize(value: string | null | undefined) {
  if (!value) return 'Dharma';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Animated primitives for the bead ring — mirrors PWA's motion.circle pulse
// ring (JapaClient.tsx: "current-pulse"/"flash ripple") using RN's Animated
// API + react-native-svg's AnimatedComponent, since Reanimated isn't wired
// into this screen and the existing scene/mala Animated.timing calls
// elsewhere in the app already use this same classic-Animated pattern.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Shared selectable-row wrapper for Choose Mala / Choose Mantra — adds a
// brief scale pulse whenever `selected` turns true (on top of
// PressableSurface's own press-scale + haptic), so picking an option reads
// as a deliberate, animated choice rather than a flat list tap. Local to
// this file since it's only used by these two picker screens.
function SelectableCard({
  selected,
  onPress,
  style,
  children,
  haptic = 'selection',
  accessibilityLabel,
}: {
  selected: boolean;
  onPress: () => void;
  style: object;
  children: React.ReactNode;
  haptic?: 'impact' | 'selection' | 'none';
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasSelected = useRef(selected);

  useEffect(() => {
    if (selected && !wasSelected.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.03, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      ]).start();
    }
    wasSelected.current = selected;
  }, [scale, selected]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <PressableSurface
        haptic={haptic}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={style}
      >
        {children}
      </PressableSurface>
    </Animated.View>
  );
}

// ── Practice-screen background animation — one distinct, theme-relevant
// motion per scene (Midnight/Himalayan Dawn/Temple Lamp/River Ghat/Forest
// Ashram/Cosmos), layered over the existing static LinearGradient. Pure RN
// Animated (no new dependency), useNativeDriver throughout. Deterministic
// per-particle placement/timing via a seeded pseudo-random helper, so
// layout doesn't reshuffle on every re-render.
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9973.1) * 43758.5453;
  return x - Math.floor(x);
}

type ParticleMotion = 'twinkle' | 'drift-up' | 'wave';

function BackgroundParticle({
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

function AmbientGlow({
  color,
  size,
  cornerX,
  cornerY,
  seed,
}: {
  color: string;
  size: number;
  cornerX: 'left' | 'right';
  cornerY: 'top' | 'bottom';
  seed: number;
}) {
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translate, { toValue: 1, duration: 9000 + seededRandom(seed) * 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translate, { toValue: 0, duration: 9000 + seededRandom(seed * 1.4) * 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [seed, translate]);

  const dx = translate.interpolate({ inputRange: [0, 1], outputRange: [0, cornerX === 'left' ? 30 : -30] });
  const dy = translate.interpolate({ inputRange: [0, 1], outputRange: [0, cornerY === 'top' ? 22 : -22] });

  const positionStyle: { left?: number; right?: number; top?: number; bottom?: number } = {};
  if (cornerX === 'left') positionStyle.left = -size * 0.35;
  else positionStyle.right = -size * 0.35;
  if (cornerY === 'top') positionStyle.top = -size * 0.3;
  else positionStyle.bottom = -size * 0.3;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        positionStyle,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateX: dx }, { translateY: dy }],
        },
      ]}
    />
  );
}

function SceneBreath({ color }: { color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.32] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: '22%',
        left: '50%',
        marginLeft: -150,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// Temple Lamp — an irregularly flickering warm glow near the top, mimicking
// a diya flame (random-duration opacity/scale jitter rather than a smooth
// loop, since a real flame never pulses evenly).
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
    return () => {
      cancelled = true;
    };
  }, [opacity, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: '14%',
        left: '50%',
        marginLeft: -70,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,150,60,0.35)',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// Himalayan Dawn — a soft light band slowly sweeping side to side, like
// early sun crossing a ridgeline.
function DawnSweep({ color }: { color: string }) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  const tx = translateX.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: '18%',
        left: '50%',
        marginLeft: -110,
        width: 220,
        height: 90,
        borderRadius: 100,
        backgroundColor: color,
        opacity: 0.16,
        transform: [{ translateX: tx }],
      }}
    />
  );
}

// River Ghat — thin horizontal ripple bands drifting sideways at different
// speeds/opacities, layered to suggest moving water.
function WaveBand({ topPct, color, seed }: { topPct: number; color: string; seed: number }) {
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 20, duration: 4200 + seededRandom(seed) * 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -20, duration: 4200 + seededRandom(seed * 1.6) * 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [seed, translateX]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: `${topPct}%`,
        left: '-10%',
        width: '120%',
        height: 2,
        borderRadius: 1,
        backgroundColor: color,
        opacity: 0.16,
        transform: [{ translateX }],
      }}
    />
  );
}

// Cosmos — an occasional shooting star streaking across, on a long random
// interval so it reads as a rare event rather than a constant loop.
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
        const wait = 9000 + seededRandom(delaySeed + (Date.now() % 100)) * 6000;
        timer = setTimeout(run, wait);
      });
    };
    timer = setTimeout(run, 2000 + seededRandom(delaySeed) * 6000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delaySeed, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-60, 220] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-20, 90] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: '18%',
        left: '10%',
        width: 46,
        height: 1.6,
        borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.9)',
        opacity,
        transform: [{ rotate: '24deg' }, { translateX }, { translateY }],
      }}
    />
  );
}

const SCENE_PARTICLES: Record<
  JapaSceneId,
  { count: number; color: string; minSize: number; maxSize: number; motion: ParticleMotion; minDuration: number; maxDuration: number }
> = {
  midnight: { count: 20, color: 'rgba(255,255,255,0.9)', minSize: 1.8, maxSize: 3.8, motion: 'twinkle', minDuration: 2200, maxDuration: 4200 },
  himalayan: { count: 14, color: 'rgba(255,222,175,0.9)', minSize: 2.2, maxSize: 4.2, motion: 'twinkle', minDuration: 2800, maxDuration: 4600 },
  temple: { count: 13, color: 'rgba(255,176,102,0.95)', minSize: 2.4, maxSize: 4.4, motion: 'drift-up', minDuration: 3200, maxDuration: 5200 },
  river: { count: 14, color: 'rgba(190,225,255,0.82)', minSize: 2, maxSize: 3.8, motion: 'wave', minDuration: 2600, maxDuration: 4600 },
  forest: { count: 16, color: 'rgba(198,230,180,0.9)', minSize: 2.2, maxSize: 4.6, motion: 'drift-up', minDuration: 4200, maxDuration: 7200 },
  cosmos: { count: 30, color: 'rgba(255,255,255,0.95)', minSize: 1.3, maxSize: 3.2, motion: 'twinkle', minDuration: 1800, maxDuration: 3600 },
};

const SCENE_GLOW: Record<JapaSceneId, string> = {
  midnight: 'rgba(150,170,255,0.24)',
  himalayan: 'rgba(255,196,120,0.28)',
  temple: 'rgba(255,140,60,0.30)',
  river: 'rgba(120,200,255,0.24)',
  forest: 'rgba(130,210,140,0.26)',
  cosmos: 'rgba(180,140,255,0.30)',
};

function SceneImagePlate({ sceneId }: { sceneId: JapaSceneId }) {
  return (
    <Image
      source={SCENE_BACKDROP_IMAGES[sceneId]}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={180}
      cachePolicy="memory-disk"
      priority="high"
      accessibilityIgnoresInvertColors
    />
  );
}

function SceneReadabilityWash({ isDark }: { isDark: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: '26%',
          left: '50%',
          width: 390,
          height: 390,
          marginLeft: -195,
          borderRadius: 195,
          backgroundColor: isDark ? 'rgba(8,6,4,0.22)' : 'rgba(255,253,248,0.54)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -60,
          left: -30,
          right: -30,
          height: 260,
          backgroundColor: isDark ? 'rgba(0,0,0,0.22)' : 'rgba(45,31,14,0.12)',
        }}
      />
      <LinearGradient
        colors={isDark
          ? ['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.30)']
          : ['rgba(255,253,248,0.40)', 'rgba(255,253,248,0)', 'rgba(45,31,14,0.16)']}
        style={{ position: 'absolute', inset: 0 }}
      />
    </View>
  );
}

// Distinct, theme-relevant motion per scene, on top of the shared
// twinkle/drift particle field: Temple flickers like a real flame,
// Himalayan Dawn gets a slow light sweep, River Ghat gets rippling wave
// bands, Cosmos gets occasional shooting stars.
function SceneBackdrop({ sceneId }: { sceneId: JapaSceneId }) {
  const particleConfig = SCENE_PARTICLES[sceneId];
  const glowColor = SCENE_GLOW[sceneId];

  const particles = useMemo(
    () =>
      Array.from({ length: particleConfig.count }, (_, index) => {
        const seed = index + 1;
        const size = particleConfig.minSize + seededRandom(seed * 5.2) * (particleConfig.maxSize - particleConfig.minSize);
        const duration = particleConfig.minDuration + seededRandom(seed * 7.7) * (particleConfig.maxDuration - particleConfig.minDuration);
        return { seed, size, duration };
      }),
    [particleConfig]
  );

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <SceneBreath color={glowColor} />
      <AmbientGlow color={glowColor} size={230} cornerX="left" cornerY="top" seed={11} />
      <AmbientGlow color={glowColor} size={200} cornerX="right" cornerY="bottom" seed={23} />
      {particles.map((p) => (
        <BackgroundParticle key={p.seed} seed={p.seed} color={particleConfig.color} size={p.size} motion={particleConfig.motion} duration={p.duration} />
      ))}
      {sceneId === 'temple' ? <FlameFlicker /> : null}
      {sceneId === 'himalayan' ? <DawnSweep color="rgba(255,214,150,0.5)" /> : null}
      {sceneId === 'river' ? (
        <>
          <WaveBand topPct={30} color="rgba(190,225,255,0.5)" seed={31} />
          <WaveBand topPct={52} color="rgba(190,225,255,0.4)" seed={37} />
          <WaveBand topPct={74} color="rgba(190,225,255,0.3)" seed={41} />
        </>
      ) : null}
      {sceneId === 'cosmos' ? (
        <>
          <ShootingStar delaySeed={51} />
          <ShootingStar delaySeed={67} />
        </>
      ) : null}
    </View>
  );
}

function StaticSceneBackdrop({ sceneId }: { sceneId: JapaSceneId }) {
  const glowColor = SCENE_GLOW[sceneId];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          left: -82,
          top: -70,
          width: 230,
          height: 230,
          borderRadius: 115,
          backgroundColor: glowColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -74,
          bottom: -62,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: glowColor,
          opacity: 0.72,
        }}
      />
    </View>
  );
}

export default function JapaScreen() {
  const router = useRouter();
  const japaShareCardRef = useRef<View>(null);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const theme = themeColor(isDark);

  // 'launcher' = PWA's "Choose your practice" config screen; 'chooseMala' /
  // 'chooseMantra' = PWA's dedicated ChooseMalaScreen/ChooseMantraScreen
  // (opened from the in-practice setup flow, chained mala→mantra→practice
  // exactly as JapaClient.tsx does); 'practice'
  // = PWA's full-screen bead-ring counting screen. Internal state switch,
  // not a route change — matches JapaClient.tsx's own single-page model.
  const [screen, setScreen] = useState<'launcher' | 'chooseMala' | 'chooseMantra' | 'practice'>('launcher');

  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [mantraIndex, setMantraIndex] = useState(0);
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [tradition, setTradition] = useState<string | null>('hindu');
  const [streak, setStreak] = useState(0);
  const [japaAlreadyDoneToday, setJapaAlreadyDoneToday] = useState(false);
  const [lifetime, setLifetime] = useState<JapaLifetimeData>(EMPTY_LIFETIME);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const [completionVisible, setCompletionVisible] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [roundCelebrateVisible, setRoundCelebrateVisible] = useState(false);
  const [mantraAudioEnabled, setMantraAudioEnabled] = useState(false);
  const [mantraAudioLoading, setMantraAudioLoading] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customMantraOpen, setCustomMantraOpen] = useState(false);
  const [selectedMalaId, setSelectedMalaId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<JapaSceneId>('midnight');
  const [customMantraText, setCustomMantraText] = useState('');
  const [completionInsight, setCompletionInsight] = useState<string | null>(null);
  const [completionInsightLoading, setCompletionInsightLoading] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [beginPressed, setBeginPressed] = useState(false);

  // Exit-confirm sheet — PWA's StopPracticeSheet. Triggered only by the X
  // (close) button on the practice screen, matching JapaClient.tsx exactly
  // (the only other two trigger sites in PWA — a bottom "End" pill and the
  // Settings sheet's "Change Mala & Mantra" — aren't built in this phase).
  const [showStopSheet, setShowStopSheet] = useState(false);
  const [stopSaving, setStopSaving] = useState(false);

  const [targetRounds, setTargetRounds] = useState(1);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [durationSecs, setDurationSecs] = useState(0);

  // ── Bead-ring motion — matches PWA's "current-pulse" breathing ring and
  // per-tap "flash ripple" (JapaClient.tsx), plus a sacred-geometry accent
  // that reveals itself as completedRounds grows (PWA's <SacredGeometry/>).
  const [bloomIndex, setBloomIndex] = useState<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const bloomAnim = useRef(new Animated.Value(0)).current;
  const geometryAnim = useRef(new Animated.Value(0)).current;
  const tapAnim = useRef(new Animated.Value(0)).current;
  const roundAnim = useRef(new Animated.Value(0)).current;
  const ceremonyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (screen !== 'practice' || reduceMotion) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, reduceMotion, screen]);

  useEffect(() => {
    Animated.timing(geometryAnim, {
      toValue: Math.min(completedRounds / 3, 1),
      duration: 650,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [completedRounds, geometryAnim]);

  const triggerBloom = useCallback((index: number) => {
    setBloomIndex(index);
    bloomAnim.setValue(0);
    Animated.timing(bloomAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setBloomIndex(null);
    });
  }, [bloomAnim]);

  const triggerTapMotion = useCallback(() => {
    if (reduceMotion) return;
    tapAnim.stopAnimation();
    tapAnim.setValue(0);
    Animated.sequence([
      Animated.timing(tapAnim, { toValue: 1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(tapAnim, { toValue: 0, friction: 5, tension: 150, useNativeDriver: true }),
    ]).start();
  }, [reduceMotion, tapAnim]);

  const triggerRoundCelebration = useCallback(() => {
    setRoundCelebrateVisible(true);
    roundAnim.stopAnimation();
    roundAnim.setValue(0);
    if (reduceMotion) {
      setTimeout(() => setRoundCelebrateVisible(false), 1400);
      return;
    }
    Animated.sequence([
      Animated.timing(roundAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(roundAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setRoundCelebrateVisible(false));
  }, [reduceMotion, roundAnim]);

  const malaSkin = useMemo(() => getMalaSkin(selectedMalaId ?? activeSymbolId), [activeSymbolId, selectedMalaId]);
  const mantras = useMemo(() => getJapaMantrasForTradition(tradition), [tradition]);
  const customMantra = useMemo<JapaMantra | null>(() => {
    const trimmed = customMantraText.trim();
    if (trimmed.length < 2) return null;
    return {
      key: 'custom',
      label: trimmed.length > 42 ? `${trimmed.slice(0, 39)}...` : trimmed,
      devanagari: trimmed,
      meaning: 'Your personal mantra for this practice.',
      tradition: 'all',
    };
  }, [customMantraText]);
  const mantraOptions = useMemo(() => customMantra ? [...mantras, customMantra] : mantras, [customMantra, mantras]);
  const mantra = mantraOptions[mantraIndex] ?? mantraOptions[0];
  const practiceType = getJapaPracticeType(tradition);
  const scene = BG_SCENES.find((item) => item.id === selectedSceneId) ?? BG_SCENES[0];
  const practiceTextColor = isDark ? COLORS.onMediaWhite : COLORS.ink;
  const practiceMutedColor = isDark ? `${COLORS.onMediaWhite}a6` : COLORS.textDimLight;
  const traditionLabel = capitalize(tradition);
  const rank = useMemo(() => getNityaRankProgress(tradition, streak), [tradition, streak]);
  const volume = useMemo(() => getMalaVolumeMilestone(lifetime.totalBeads), [lifetime.totalBeads]);
  const fact = useMemo(() => pickDharmaFact(tradition), [tradition]);

  const audioPlayer = useAudioPlayer();
  const mantraAudioActive = useRef(false);

  // Load saved local preferences (audio/mala/scene/custom mantra/target
  // rounds/lifetime totals).
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(MANTRA_AUDIO_KEY),
      AsyncStorage.getItem(JAPA_MALA_KEY),
      AsyncStorage.getItem(JAPA_SCENE_KEY),
      AsyncStorage.getItem(JAPA_CUSTOM_MANTRA_KEY),
      AsyncStorage.getItem(JAPA_TARGET_ROUNDS_KEY),
      AsyncStorage.getItem(JAPA_LIFETIME_KEY),
    ])
      .then(([audio, malaId, sceneId, customText, rounds, lifetimeRaw]) => {
        if (audio === 'true') setMantraAudioEnabled(true);
        if (malaId && MALA_SKINS[malaId]) setSelectedMalaId(malaId);
        if (sceneId && BG_SCENES.some((item) => item.id === sceneId)) setSelectedSceneId(sceneId as JapaSceneId);
        if (customText) setCustomMantraText(customText);
        const parsedRounds = rounds ? Number(rounds) : 1;
        if (Number.isInteger(parsedRounds) && parsedRounds >= 1 && parsedRounds <= MAX_TARGET_ROUNDS) {
          setTargetRounds(parsedRounds);
        }
        if (lifetimeRaw) {
          try {
            const parsed = JSON.parse(lifetimeRaw) as Partial<JapaLifetimeData>;
            setLifetime({
              totalBeads: typeof parsed.totalBeads === 'number' ? parsed.totalBeads : 0,
              totalRounds: typeof parsed.totalRounds === 'number' ? parsed.totalRounds : 0,
              lastPracticed: parsed.lastPracticed ?? null,
            });
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mantraIndex >= mantraOptions.length) setMantraIndex(0);
  }, [mantraIndex, mantraOptions.length]);

  const updateLifetime = useCallback(async (beadsToAdd: number) => {
    setLifetime((prev) => {
      const next: JapaLifetimeData = {
        totalBeads: prev.totalBeads + beadsToAdd,
        totalRounds: prev.totalRounds + (beadsToAdd >= 108 ? 1 : 0),
        lastPracticed: new Date().toISOString(),
      };
      void AsyncStorage.setItem(JAPA_LIFETIME_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const loadContext = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const profileResult = await supabase.from('profiles').select('active_symbol_id, tradition, timezone').eq('id', user.id).single();

    const profile = profileResult.data as ProfileRow | null;
    setActiveSymbolId(profile?.active_symbol_id ?? null);
    setTradition(profile?.tradition ?? 'hindu');
    setMantraIndex(0);

    const today = spiritualDate(profile?.timezone ?? 'UTC');
    const { data: sadhanaData } = await supabase
      .from('daily_sadhana')
      .select('japa_done, streak_count')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    const sadhana = sadhanaData as SadhanaTodayRow | null;
    setJapaAlreadyDoneToday(Boolean(sadhana?.japa_done));
    setStreak(sadhana?.streak_count ?? 0);

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast({ visible: false, message: '' }), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!completionVisible || !completionStats) return;
    setCompletionInsight(null);
    setCompletionInsightLoading(true);

    apiFetch('/api/japa/completion-insight', {
      method: 'POST',
      body: JSON.stringify({
        tradition,
        mantraName: completionStats.mantraName,
        rounds: completionStats.rounds,
        totalBeads: completionStats.beads,
        durationMinutes: Math.max(1, Math.round(completionStats.durationSecs / 60)),
        timeOfDay: getSpiritualTimeWindow(),
      }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { insight?: string } | null) => {
        if (data?.insight) setCompletionInsight(data.insight);
      })
      .catch(() => {})
      .finally(() => setCompletionInsightLoading(false));
  }, [completionStats, completionVisible, tradition]);

  // ── Mantra background audio ───────────────────────────────────────
  const startMantraAudio = useCallback(async () => {
    if (mantraAudioLoading || mantraAudioActive.current) return;
    setMantraAudioLoading(true);
    try {
      const response = await apiFetch('/api/tts/generate', {
        method: 'POST',
        body: JSON.stringify({ text: mantra.label }),
      });
      if (!response.ok) throw new Error('tts-failed');
      const data = (await response.json()) as { url?: string; audioUrl?: string };
      const audioUrl = data.url ?? data.audioUrl;
      if (!audioUrl) throw new Error('tts-no-url');
      await audioPlayer.loadAndPlay(audioUrl, true); // loop = true
      mantraAudioActive.current = true;
    } catch {
      // Graceful offline fallback — audio unavailable, continue counting silently
    } finally {
      setMantraAudioLoading(false);
    }
  }, [audioPlayer, mantra.label, mantraAudioLoading]);

  const stopMantraAudio = useCallback(async () => {
    mantraAudioActive.current = false;
    await audioPlayer.stop();
  }, [audioPlayer]);

  // Toggle mantra audio preference
  const toggleMantraAudio = useCallback(async () => {
    const next = !mantraAudioEnabled;
    setMantraAudioEnabled(next);
    void AsyncStorage.setItem(MANTRA_AUDIO_KEY, String(next));

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (next && count > 0 && count < 108) {
      await startMantraAudio();
    } else if (!next) {
      await stopMantraAudio();
    }
  }, [count, mantraAudioEnabled, startMantraAudio, stopMantraAudio]);

  // Start/stop audio when mantra changes and audio is enabled
  useEffect(() => {
    if (mantraAudioEnabled && mantraAudioActive.current) {
      mantraAudioActive.current = false;
      void audioPlayer.stop().then(() => { void startMantraAudio(); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mantraIndex]);

  const completeRound = useCallback(async () => {
    setSaving(true);
    const nextRounds = completedRounds + 1;
    const elapsed = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const goalComplete = nextRounds >= targetRounds;
    setCompletedRounds(nextRounds);
    setCount(0);
    void updateLifetime(108);

    if (elapsed > 0) {
      setDurationSecs(elapsed);
    }

    setToast({
      visible: true,
      message: goalComplete ? `${targetRounds} mala complete` : `Mala ${nextRounds} of ${targetRounds} complete`,
    });
    triggerRoundCelebration();

    // Stop mantra loop on round complete
    await stopMantraAudio();

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // /api/japa/complete owns the mala_sessions insert, daily_sadhana
    // (japa_done/streak_count) upsert, and karma award — see the route's own
    // file header for the full mutation contract.
    try {
      const response = await apiFetch('/api/japa/complete', {
        method: 'POST',
        body: JSON.stringify({
          mantra: mantra.label,
          count: 108,
          rounds: 1,
          tradition,
          practiceType,
          activeSymbolId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'japa-complete-failed');
      }

      if (goalComplete) {
        const stats = {
          rounds: nextRounds,
          beads: nextRounds * 108,
          durationSecs: elapsed,
          mantraName: mantra.label,
        };
        setCompletionStats(stats);
        setCompletionVisible(true);
        setConfettiVisible(true);
      }
    } catch (error) {
      const message = error instanceof Error && error.message !== 'japa-complete-failed'
        ? error.message
        : 'Check your connection and try again.';
      Alert.alert('Could not save japa session', message);
    }

    setSaving(false);
    await loadContext();
  }, [activeSymbolId, completedRounds, loadContext, mantra.label, practiceType, sessionStartTime, stopMantraAudio, targetRounds, tradition, triggerRoundCelebration, updateLifetime]);

  useEffect(() => {
    if (!completionVisible) return;
    ceremonyAnim.setValue(0);
    if (reduceMotion) {
      ceremonyAnim.setValue(1);
      return;
    }
    Animated.spring(ceremonyAnim, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [ceremonyAnim, completionVisible, reduceMotion]);

  const increment = useCallback(async () => {
    if (saving) return;

    if (count === 0 && completedRounds === 0 && sessionStartTime === null) {
      setSessionStartTime(Date.now());
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setCount((current) => {
      const next = current >= 108 ? 108 : current + 1;

      // Flash the bead that was just told (index = pre-increment count) —
      // mirrors PWA's per-tap "flash ripple". Uses `current` from this
      // updater rather than the outer closure's `count`, since `increment`
      // is memoized without a `count` dependency (functional setCount is
      // used precisely to stay stable across renders).
      triggerBloom(current >= 108 ? 107 : current);

      // Start audio on first bead if enabled
      if (next === 1 && mantraAudioEnabled && !mantraAudioActive.current) {
        void startMantraAudio();
      }

      triggerTapMotion();
      return next;
    });
  }, [completedRounds, count, mantraAudioEnabled, saving, sessionStartTime, startMantraAudio, triggerBloom, triggerTapMotion]);

  useEffect(() => {
    if (count === 108 && !saving) {
      void completeRound();
    }
  }, [completeRound, count, saving]);

  // ── Launcher → practice / exit-confirm flow — mirrors JapaClient.tsx's
  // handleStartPractice / StopPracticeSheet actions exactly. ─────────────
  const handleStartPractice = useCallback(() => {
    if (sessionStartTime === null) setSessionStartTime(Date.now());
    setScreen('practice');
  }, [sessionStartTime]);

  // Setup flow — chains ChooseMala → ChooseMantra → practice, mirroring
  // JapaClient.tsx's own handleConfirmMala/handleConfirmMantra sequence.
  const confirmMalaAndChooseMantra = useCallback(() => setScreen('chooseMantra'), []);
  const backToLauncher = useCallback(() => setScreen('launcher'), []);
  const backToChooseMala = useCallback(() => setScreen('chooseMala'), []);
  const confirmMantraAndBegin = useCallback(() => {
    const isCustomSelected = mantraOptions[mantraIndex]?.key === 'custom';
    if (isCustomSelected && customMantra === null) {
      // No saved personal-mantra text yet — open the entry sheet instead of
      // confirming, matching PWA's "Add Your Mantra →" button state.
      setCustomMantraOpen(true);
      return;
    }
    handleStartPractice();
  }, [customMantra, handleStartPractice, mantraIndex, mantraOptions]);

  const hasProgress = completedRounds > 0 || count > 0;

  const handleSaveAndStop = useCallback(async () => {
    setStopSaving(true);
    try {
      // Each finished round already saved itself via completeRound() the
      // moment it hit 108 beads — the only thing that can still be
      // unsaved here is a partial, in-progress round (1-107 beads).
      // /api/japa/complete accepts rounds:0 for exactly this case (see the
      // route's own contract — completionType becomes 'ended_manually').
      if (count > 0) {
        const response = await apiFetch('/api/japa/complete', {
          method: 'POST',
          body: JSON.stringify({
            mantra: mantra.label,
            count,
            rounds: 0,
            tradition,
            practiceType,
            activeSymbolId,
          }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? 'japa-partial-save-failed');
        }
        void updateLifetime(count);
      }
    } catch (error) {
      const message = error instanceof Error && error.message !== 'japa-partial-save-failed'
        ? error.message
        : 'Check your connection and try again.';
      Alert.alert('Could not save japa session', message);
    } finally {
      setCount(0);
      setCompletedRounds(0);
      setDurationSecs(0);
      setSessionStartTime(null);
      setStopSaving(false);
      setShowStopSheet(false);
      setScreen('launcher');
      await loadContext();
    }
  }, [activeSymbolId, count, loadContext, mantra.label, practiceType, tradition, updateLifetime]);

  const handleDiscardAndStop = useCallback(() => {
    setCount(0);
    setCompletedRounds(0);
    setDurationSecs(0);
    setSessionStartTime(null);
    setShowStopSheet(false);
    setScreen('launcher');
  }, []);

  function beadPosition(index: number, center: number, radius: number) {
    const angle = (Math.PI * 2 * index) / 108 - Math.PI / 2;
    return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
  }

  // Three-tier bead state (done / current / upcoming) — previously every
  // non-current bead rendered identically regardless of progress, so the
  // ring never visibly "filled in" as rounds advanced. Done beads now stay
  // lit with the richer `grad-done` gradient as the current bead moves on,
  // giving the same at-a-glance progress read as PWA's bead-done/bead-un
  // split.
  function buildBeadElements(center: number, radius: number) {
    const activeIndex = count >= 108 ? 107 : count;
    return Array.from({ length: 108 }, (_, index) => {
      const { x, y } = beadPosition(index, center, radius);
      const isDone = index < activeIndex;
      const isCurrent = index === activeIndex;
      const isSumeru = index === 54;

      const r = isSumeru ? 16.5 : isCurrent ? 13.4 : isDone ? 9 : 8;
      const gradientId = isSumeru ? 'grad-guru' : isCurrent ? 'grad-active' : isDone ? 'grad-done' : 'grad-inactive';
      const shadowOpacity = isCurrent || isSumeru ? 0.4 : isDone ? 0.3 : 0.22;
      const highlightOpacity = isCurrent || isSumeru ? 0.78 : isDone ? 0.54 : 0.38;

      return (
        <Fragment key={`bead-${index}`}>
          <Circle
            cx={x + r * 0.18}
            cy={y + r * 0.22}
            r={r}
            fill={malaSkin.beadBorder}
            opacity={shadowOpacity}
          />
          <Circle
            cx={x}
            cy={y}
            r={r}
            fill={`url(#${gradientId})`}
            stroke={isCurrent ? theme.brand : isSumeru ? malaSkin.threadColor : isDone ? malaSkin.beadColor : malaSkin.beadBorder}
            strokeWidth={isCurrent ? 1.8 : isSumeru ? 1.6 : 0.8}
            strokeOpacity={isDone || isCurrent || isSumeru ? 0.95 : 0.72}
          />
          <Circle
            cx={x - r * 0.34}
            cy={y - r * 0.38}
            r={Math.max(1.1, r * 0.24)}
            fill={COLORS.onMediaWhite}
            opacity={highlightOpacity}
          />
        </Fragment>
      );
    });
  }

  const currentBeadPos = useMemo(() => beadPosition(count >= 108 ? 107 : count, PRACTICE_CENTER, PRACTICE_RADIUS), [count]);
  const bloomBeadPos = useMemo(() => beadPosition(bloomIndex ?? 0, PRACTICE_CENTER, PRACTICE_RADIUS), [bloomIndex]);

  const pulseRadius = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 22] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.58, 0] });
  const bloomRadius = bloomAnim.interpolate({ inputRange: [0, 1], outputRange: [11, 26] });
  const bloomOpacity = bloomAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const geometryOpacity = geometryAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
  const tapScale = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });
  const tapRotate = tapAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1.4deg'] });
  const tapCountScale = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const tapCountTranslate = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const tapGlowOpacity = tapAnim.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.36] });
  const roundOpacity = roundAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const roundTranslate = roundAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const ceremonyScale = ceremonyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const ceremonyTranslate = ceremonyAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  const beadGradientDefs = (
    <Defs>
      <RadialGradient id="grad-inactive" cx="28%" cy="24%" r="78%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.42" />
        <Stop offset="42%" stopColor={malaSkin.beadColor} stopOpacity="0.5" />
        <Stop offset="100%" stopColor={malaSkin.beadBorder} stopOpacity="0.58" />
      </RadialGradient>
      <RadialGradient id="grad-done" cx="28%" cy="24%" r="78%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.9" />
        <Stop offset="38%" stopColor={malaSkin.beadColor} stopOpacity="1" />
        <Stop offset="100%" stopColor={malaSkin.beadBorder} stopOpacity="1" />
      </RadialGradient>
      <RadialGradient id="grad-active" cx="28%" cy="24%" r="78%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="1" />
        <Stop offset="32%" stopColor={theme.brand} stopOpacity="1" />
        <Stop offset="100%" stopColor={malaSkin.beadBorder} stopOpacity="1" />
      </RadialGradient>
      <RadialGradient id="grad-guru" cx="28%" cy="24%" r="80%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.95" />
        <Stop offset="36%" stopColor={malaSkin.threadColor} stopOpacity="1" />
        <Stop offset="100%" stopColor={malaSkin.beadBorder} stopOpacity="1" />
      </RadialGradient>
    </Defs>
  );

  return (
    <Screen style={{ backgroundColor: bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      {screen === 'launcher' ? (
        <>
          <View pointerEvents="none" style={{ position: 'absolute', top: 90, right: -86, width: 220, height: 220, borderRadius: 110, backgroundColor: theme.brandSoft, opacity: 0.72 }} />
          <View pointerEvents="none" style={{ position: 'absolute', top: 420, left: -96, width: 240, height: 240, borderRadius: 120, backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowGoldLight, opacity: 0.66 }} />
          <ScrollView
            contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 150, gap: 16 }}
            onScroll={navScrollHandler}
            scrollEventThrottle={16}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                hitSlop={16}
                style={{
                  width: 44,
                  height: 44,
                  minHeight: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: cardBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <Feather name="chevron-left" size={20} color={text} />
              </PressableSurface>

              <PressableSurface
                haptic="selection"
                accessibilityLabel="Japa insights"
                onPress={() => router.push('/japa-insights' as Href)}
                hitSlop={16}
                style={{
                  width: 44,
                  height: 44,
                  minHeight: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: cardBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <Feather name="bar-chart-2" size={17} color={theme.brand} />
              </PressableSurface>
            </View>

            {loading ? (
              <ActivityIndicator color={theme.brand} style={{ marginTop: 40 }} />
            ) : (
              <>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: theme.brand }}>
                  Japa Mala · {traditionLabel}
                </Text>
                <Text style={{ fontFamily: FONTS.serif, fontSize: 34, lineHeight: 40, color: text, marginTop: 2 }}>
                  Choose your practice
                </Text>

                {japaAlreadyDoneToday ? (
                  <LinearGradient
                    colors={[theme.brand, COLORS.homeHeroLight, theme.brand]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 999, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                  >
                    <Feather name="check-circle" size={14} color={COLORS.ink} />
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12.5, color: COLORS.ink }}>
                      Japa complete for today
                    </Text>
                  </LinearGradient>
                ) : null}

                {/* Selected Mantra hero card */}
                <View
                  style={{
                    borderRadius: 28,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: cardBg,
                    padding: 18,
                    boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.brand }}>
                    Selected mantra
                  </Text>
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 38, lineHeight: 46, color: theme.brand, marginTop: 10 }}>
                    {mantra.devanagari}
                  </Text>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 15, color: text, marginTop: 4 }}>
                    {mantra.label}
                  </Text>
                  <Text style={{ ...TYPE.caption, color: dim, marginTop: 6 }}>
                    {mantra.meaning}
                  </Text>

                  <View style={{ height: 1, backgroundColor: theme.premiumBorder, marginTop: 16, marginBottom: 12 }} />

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: 'Mala', value: malaSkin.label },
                      { label: 'Target', value: `${targetRounds} × 108` },
                      { label: 'Streak', value: streak > 0 ? `${streak} days` : 'Start' },
                    ].map((pill) => (
                      <View
                        key={pill.label}
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: theme.premiumBorder,
                          backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                          paddingHorizontal: 10,
                          paddingVertical: 9,
                        }}
                      >
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color: dim }}>
                          {pill.label}
                        </Text>
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: text, marginTop: 2 }} numberOfLines={1}>
                          {pill.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TargetRoundSelector
                  value={targetRounds}
                  theme={theme}
                  isDark={isDark}
                  onChange={(n) => {
                    setTargetRounds(n);
                    void AsyncStorage.setItem(JAPA_TARGET_ROUNDS_KEY, String(n));
                  }}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityLabel={`Change mala. Current mala is ${malaSkin.label}`}
                    onPress={() => setScreen('chooseMala')}
                    style={{
                      flex: 1,
                      minHeight: 84,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      backgroundColor: cardBg,
                      boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      justifyContent: 'center',
                      gap: 9,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.brandSoft,
                      }}
                    >
                      <Feather name="sliders" size={16} color={theme.brand} />
                    </View>
                    <View style={{ minWidth: 0 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }} numberOfLines={1}>
                        Change mala
                      </Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim, marginTop: 2 }} numberOfLines={1}>
                        {malaSkin.label}
                      </Text>
                    </View>
                  </PressableSurface>

                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityLabel="View recent Japa sessions"
                    onPress={() => router.push('/japa-insights' as Href)}
                    style={{
                      flex: 1,
                      minHeight: 84,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      backgroundColor: cardBg,
                      boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      justifyContent: 'center',
                      gap: 9,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.brandSoft,
                      }}
                    >
                      <Feather name="clock" size={16} color={theme.brand} />
                    </View>
                    <View style={{ minWidth: 0 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }} numberOfLines={1}>
                        Recent sessions
                      </Text>
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim, marginTop: 2 }} numberOfLines={1}>
                        Beads and rounds
                      </Text>
                    </View>
                  </PressableSurface>
                </View>

                {/* Your Path + Lifetime Japa */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      backgroundColor: cardBg,
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: dim }}>
                      Your path
                    </Text>
                    <Text style={{ fontFamily: FONTS.serifBold, fontSize: 15, color: text }}>{rank.label}</Text>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.premiumBorder, overflow: 'hidden' }}>
                      <View style={{ width: `${rank.progress * 100}%`, height: '100%', backgroundColor: theme.brand, borderRadius: 3 }} />
                    </View>
                    <Text style={{ ...TYPE.caption, fontSize: 10.5, color: dim }}>
                      {rank.next ? `${rank.daysToNext} day${rank.daysToNext === 1 ? '' : 's'} to ${rank.next}` : 'Highest path held'}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: theme.premiumBorder,
                      backgroundColor: cardBg,
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: dim }}>
                      Lifetime japa
                    </Text>
                    <Text style={{ fontFamily: FONTS.serifBold, fontSize: 15, color: theme.brand }}>
                      {volume.totalBeads.toLocaleString('en-IN')}
                    </Text>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.premiumBorder, overflow: 'hidden' }}>
                      <View style={{ width: `${volume.progress * 100}%`, height: '100%', backgroundColor: theme.brand, borderRadius: 3 }} />
                    </View>
                    <Text style={{ ...TYPE.caption, fontSize: 10.5, color: dim }}>
                      {volume.nextLabel ? `${Math.round(volume.progress * 100)}% to ${volume.nextLabel}` : volume.label}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Begin Japa"
                  onPress={handleStartPractice}
                  onPressIn={() => {
                    setBeginPressed(true);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  onPressOut={() => setBeginPressed(false)}
                  style={{
                    borderRadius: 999,
                    backgroundColor: theme.brand,
                    boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
                    minHeight: 52,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: beginPressed ? 0.88 : 1,
                    transform: [{ scale: beginPressed && !reduceMotion ? 0.985 : 1 }],
                  }}
                >
                  <View
                    pointerEvents="none"
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 15,
                        lineHeight: 19,
                        letterSpacing: 0.2,
                        color: COLORS.ink,
                        includeFontPadding: false,
                        textAlign: 'center',
                      }}
                    >
                      Begin Japa
                    </Text>
                  </View>
                </Pressable>

                {/* Dharma Reflection */}
                <View
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: cardBg,
                    padding: 16,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.brand }}>
                    Dharma reflection
                  </Text>
                  <Text style={{ fontFamily: FONTS.serif, fontSize: 13.5, lineHeight: 22, color: text }}>
                    {fact.text}
                  </Text>
                  {fact.source ? (
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim }}>— {fact.source}</Text>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>
        </>
      ) : screen === 'chooseMala' ? (
        // ── Choose Mala — PWA's ChooseMalaScreen: mala list + practice
        // background (scene) picker, confirming chains to Choose Mantra. ──
        <>
          <ScrollView
            contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 150, gap: 18 }}
            onScroll={navScrollHandler}
            scrollEventThrottle={16}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Back"
                onPress={backToLauncher}
                hitSlop={16}
                style={{
                  width: 40,
                  height: 40,
                  minHeight: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: cardBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="chevron-left" size={18} color={theme.brand} />
              </PressableSurface>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: theme.brand }}>
                Japa Mala
              </Text>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 30, lineHeight: 36, color: text }}>
                Choose your mala
              </Text>
              <Text style={{ ...TYPE.caption, color: dim, marginTop: 2 }}>
                The sacred beads carry the energy of your tradition.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {Object.entries(MALA_SKINS).map(([id, skin]) => {
                const selected = (selectedMalaId ?? 'default') === id;
                return (
                  <SelectableCard
                    key={id}
                    selected={selected}
                    accessibilityLabel={`Select ${skin.label} mala`}
                    onPress={() => {
                      setSelectedMalaId(id);
                      void AsyncStorage.setItem(JAPA_MALA_KEY, id);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      borderRadius: 18,
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? skin.glowColor : theme.premiumBorder,
                      backgroundColor: selected ? theme.brandSoft : cardBg,
                      padding: 14,
                      boxShadow: selected
                        ? `0 6px 18px ${skin.glowColor}`
                        : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light),
                    }}
                  >
                    <JapaMalaArtwork skin={skin} size={60} glow={selected} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>{skin.label}</Text>
                      <Text style={{ ...TYPE.caption, color: dim, marginTop: 2 }}>
                        {MALA_TAGLINES[id] ?? 'Traditional prayer beads'}
                      </Text>
                    </View>
                    {selected ? (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="check" size={13} color={isDark ? COLORS.darkBg : COLORS.creamBg} />
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: theme.premiumBorder,
                        }}
                      />
                    )}
                  </SelectableCard>
                );
              })}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: dim }}>
                Practice background
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 2 }}>
                {BG_SCENES.map((item) => {
                  const selected = selectedSceneId === item.id;
                  return (
                    <SelectableCard
                      key={item.id}
                      selected={selected}
                      accessibilityLabel={`Select ${item.name} background`}
                      onPress={() => {
                        setSelectedSceneId(item.id);
                        void AsyncStorage.setItem(JAPA_SCENE_KEY, item.id);
                      }}
                      style={{ alignItems: 'center', width: 64, gap: 6 }}
                    >
                      <LinearGradient
                        colors={isDark ? item.colors : item.lightColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 18,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? theme.brand : theme.premiumBorder,
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: selected
                            ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light)
                            : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light),
                        }}
                      >
                        {selected ? (
                          <View
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: theme.brand,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Feather name="check" size={9} color={isDark ? COLORS.darkBg : COLORS.creamBg} />
                          </View>
                        ) : null}
                        <Feather name={item.icon as keyof typeof Feather.glyphMap} size={18} color={COLORS.onMediaWhite} />
                      </LinearGradient>
                      <Text
                        numberOfLines={1}
                        style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9, color: selected ? theme.brand : dim, textAlign: 'center' }}
                      >
                        {item.name}
                      </Text>
                    </SelectableCard>
                  );
                })}
              </ScrollView>
            </View>

            <PressableSurface
              haptic="impact"
              accessibilityLabel="Choose mantra"
              onPress={confirmMalaAndChooseMantra}
              style={{
                borderRadius: 999,
                minHeight: MIN_TOUCH_TARGET,
                paddingVertical: 17,
                backgroundColor: theme.brand,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, letterSpacing: 0.2, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>
                Choose mantra →
              </Text>
            </PressableSurface>
          </ScrollView>
        </>
      ) : screen === 'chooseMantra' ? (
        // ── Choose Mantra — PWA's ChooseMantraScreen: personal mantra card
        // + preset list + target rounds, confirming begins practice. ──────
        <>
          <ScrollView
            contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 150, gap: 18 }}
            onScroll={navScrollHandler}
            scrollEventThrottle={16}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Back"
                onPress={backToChooseMala}
                hitSlop={16}
                style={{
                  width: 40,
                  height: 40,
                  minHeight: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: cardBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="chevron-left" size={18} color={theme.brand} />
              </PressableSurface>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: theme.brand }}>
                Japa Mala
              </Text>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 30, lineHeight: 36, color: text }}>
                Choose your mantra
              </Text>
            </View>

            {/* Personal mantra card */}
            <SelectableCard
              selected={mantraOptions[mantraIndex]?.key === 'custom'}
              accessibilityLabel={customMantra ? 'Select personal mantra' : 'Add personal mantra'}
              onPress={() => {
                if (customMantra) {
                  setMantraIndex(mantraOptions.length - 1);
                } else {
                  setCustomMantraOpen(true);
                }
              }}
              style={{
                borderRadius: 18,
                borderWidth: mantraOptions[mantraIndex]?.key === 'custom' ? 1.5 : 1,
                borderColor: mantraOptions[mantraIndex]?.key === 'custom' ? theme.brand : theme.premiumBorder,
                backgroundColor: mantraOptions[mantraIndex]?.key === 'custom' ? theme.brandSoft : cardBg,
                padding: 14,
                gap: 4,
                boxShadow: mantraOptions[mantraIndex]?.key === 'custom'
                  ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light)
                  : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13.5, color: text }}>
                  {customMantra ? 'Personal mantra' : 'Add personal mantra'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {customMantra ? (
                    <PressableSurface
                      haptic="selection"
                      onPress={() => setCustomMantraOpen(true)}
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.premiumBorder }}
                    >
                      <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 10.5, color: dim }}>Edit</Text>
                    </PressableSurface>
                  ) : null}
                  {mantraOptions[mantraIndex]?.key === 'custom' ? (
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="check" size={11} color={isDark ? COLORS.darkBg : COLORS.creamBg} />
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={{ ...TYPE.caption, color: dim }}>
                {customMantra ? customMantra.devanagari : 'Use your own mantra in mala practice'}
              </Text>
            </SelectableCard>

            {/* Preset mantras */}
            <View style={{ gap: 12 }}>
              {mantras.map((item, index) => {
                const selected = mantraIndex === index;
                return (
                  <SelectableCard
                    key={item.key}
                    selected={selected}
                    accessibilityLabel={`Select ${item.label} mantra`}
                    onPress={() => setMantraIndex(index)}
                    style={{
                      borderRadius: 18,
                      borderWidth: selected ? 1.5 : 1,
                      borderColor: selected ? theme.brand : theme.premiumBorder,
                      backgroundColor: selected ? theme.brandSoft : cardBg,
                      padding: 14,
                      gap: 4,
                      boxShadow: selected
                        ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light)
                        : (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light),
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: theme.brand }}>{item.devanagari}</Text>
                      {selected ? (
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
                          <Feather name="check" size={12} color={isDark ? COLORS.darkBg : COLORS.creamBg} />
                        </View>
                      ) : (
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: theme.premiumBorder }} />
                      )}
                    </View>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>{item.label}</Text>
                    <Text style={{ ...TYPE.caption, color: dim }}>{item.meaning}</Text>
                  </SelectableCard>
                );
              })}
            </View>

            <View style={{ gap: 10 }}>
              <TargetRoundSelector
                value={targetRounds}
                theme={theme}
                isDark={isDark}
                onChange={(n) => {
                  setTargetRounds(n);
                  void AsyncStorage.setItem(JAPA_TARGET_ROUNDS_KEY, String(n));
                }}
              />
              <Text style={{ ...TYPE.caption, color: dim, textAlign: 'center' }}>
                {targetRounds} mala{targetRounds > 1 ? 's' : ''} = {targetRounds * 108} beads
              </Text>
            </View>

            <PressableSurface
              haptic="impact"
              accessibilityLabel={mantraOptions[mantraIndex]?.key === 'custom' && !customMantra ? 'Add your mantra' : 'Begin practice'}
              onPress={confirmMantraAndBegin}
              style={{
                borderRadius: 999,
                minHeight: MIN_TOUCH_TARGET,
                paddingVertical: 17,
                backgroundColor: theme.brand,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, letterSpacing: 0.2, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>
                {mantraOptions[mantraIndex]?.key === 'custom' && !customMantra ? 'Add your mantra →' : 'Begin practice →'}
              </Text>
            </PressableSurface>
          </ScrollView>
        </>
      ) : (
        // ── Full-screen bead-ring practice screen ──────────────────────
        <View style={{ flex: 1 }}>
          <LinearGradient
            colors={isDark ? scene.colors : scene.lightColors}
            start={{ x: 0.12, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ flex: 1 }}
          >
            <SceneImagePlate sceneId={scene.id} />
            <SceneReadabilityWash isDark={isDark} />
            {reduceMotion ? <StaticSceneBackdrop sceneId={scene.id} /> : <SceneBackdrop sceneId={scene.id} />}
            <LinearGradient
              pointerEvents="none"
              colors={isDark
                ? ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.26)']
                : ['rgba(255,253,248,0.34)', 'rgba(255,253,248,0.12)', 'rgba(45,31,14,0.12)']}
              style={{ position: 'absolute', inset: 0 }}
            />
            <Pressable
              onPress={() => { void increment(); }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Animated.View
                style={{
                  width: PRACTICE_SVG_SIZE,
                  height: PRACTICE_SVG_SIZE + 86,
                  alignItems: 'center',
                  transform: [{ scale: tapScale }, { rotate: tapRotate }],
                }}
              >
                <Svg width={PRACTICE_SVG_SIZE} height={PRACTICE_SVG_SIZE} style={{ position: 'absolute', top: 0 }}>
                  {beadGradientDefs}
                  <AnimatedCircle
                    cx={PRACTICE_CENTER}
                    cy={PRACTICE_CENTER}
                    r={PRACTICE_RADIUS - 26}
                    fill="none"
                    stroke={practiceTextColor}
                    strokeWidth={1}
                    strokeDasharray="2 8"
                    opacity={geometryOpacity}
                  />
                  <AnimatedCircle
                    cx={PRACTICE_CENTER}
                    cy={PRACTICE_CENTER}
                    r={PRACTICE_RADIUS - 46}
                    fill="none"
                    stroke={practiceTextColor}
                    strokeWidth={1}
                    strokeDasharray="1 10"
                    opacity={geometryOpacity}
                  />
                  {buildBeadElements(PRACTICE_CENTER, PRACTICE_RADIUS)}
                  {count < 108 ? (
                    <AnimatedCircle
                      cx={currentBeadPos.x}
                      cy={currentBeadPos.y}
                      r={pulseRadius}
                      fill="none"
                      stroke={theme.brand}
                      strokeWidth={1.5}
                      opacity={pulseOpacity}
                    />
                  ) : null}
                  {bloomIndex !== null ? (
                    <AnimatedCircle
                      cx={bloomBeadPos.x}
                      cy={bloomBeadPos.y}
                      r={bloomRadius}
                      fill="none"
                      stroke={theme.brand}
                      strokeWidth={2}
                      opacity={bloomOpacity}
                    />
                  ) : null}
                </Svg>
                <Image
                  source={require('../../assets/japa/guru-pendant.png')}
                  contentFit="contain"
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: PRACTICE_CENTER + PRACTICE_RADIUS - 17,
                    width: 74,
                    height: 160,
                  }}
                />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: 154,
                  height: 154,
                  borderRadius: 77,
                  backgroundColor: theme.brand,
                  opacity: tapGlowOpacity,
                  transform: [{ scale: tapScale }],
                }}
              />
              <Animated.View
                style={{
                  position: 'absolute',
                  alignItems: 'center',
                  transform: [{ translateY: tapCountTranslate }, { scale: tapCountScale }],
                }}
              >
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: count >= 100 ? 52 : 60, color: practiceTextColor }}>
                  {count} <Text style={{ fontFamily: FONTS.sans, fontSize: 20, color: practiceMutedColor }}>/ 108</Text>
                </Text>
                {count === 0 ? (
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: practiceMutedColor, marginTop: 6 }}>
                    tap anywhere to begin
                  </Text>
                ) : null}
              </Animated.View>
            </Pressable>

            {/* Close (X) — always opens the exit-confirm sheet, matching
                JapaClient.tsx's top-left close button exactly. */}
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Stop session"
              onPress={() => setShowStopSheet(true)}
              hitSlop={10}
              style={{
                position: 'absolute',
                top: 56,
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

            {/* Settings — opens the same mala/scene/mantra customize sheet
                the launcher screen uses ("Practice settings" in PWA). */}
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Practice settings"
              onPress={() => setCustomizeOpen(true)}
              hitSlop={10}
              style={{
                position: 'absolute',
                top: 56,
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

            <View
              style={{
                position: 'absolute',
                top: 56,
                left: 72,
                right: 72,
                alignItems: 'center',
              }}
              pointerEvents="none"
            >
              <Text style={{ ...TYPE.chip, color: practiceTextColor }}>{completedRounds}/{targetRounds} malas</Text>
            </View>

            {roundCelebrateVisible ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 42,
                  right: 42,
                  bottom: 96,
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
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: theme.brand }}>
                    Mala complete
                  </Text>
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 19, color: practiceTextColor }}>
                    108 beads offered
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </LinearGradient>
        </View>
      )}

      {/* ── Exit-confirm sheet — mirrors JapaClient.tsx's StopPracticeSheet
          copy, branching, and button styles exactly. ───────────────────── */}
      <Modal transparent visible={showStopSheet} animationType="slide" onRequestClose={() => setShowStopSheet(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowStopSheet(false)} />
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: isDark ? 'rgba(10,8,14,0.97)' : 'rgba(248,244,236,0.97)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(197,160,89,0.14)' : 'rgba(0,0,0,0.07)',
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 40,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    fontFamily: FONTS.sansSemiBold,
                    fontSize: 10,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: isDark ? '#C5A059' : '#7A4A1E',
                  }}
                >
                  Focused mala
                </Text>
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: isDark ? 'rgba(245,225,185,0.95)' : '#2D1F0E' }}>
                  Stop this session?
                </Text>
              </View>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Continue practice"
                onPress={() => setShowStopSheet(false)}
                hitSlop={10}
                style={{ width: 32, height: 32, minHeight: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={16} color={isDark ? 'rgba(197,160,89,0.60)' : 'rgba(100,65,25,0.60)'} />
              </PressableSurface>
            </View>

            <Text style={{ fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 19, color: isDark ? 'rgba(197,160,89,0.60)' : 'rgba(100,65,25,0.60)' }}>
              {hasProgress
                ? 'Save your current beads before leaving, or discard this unfinished session.'
                : 'No beads have been counted yet. You can leave setup or continue practice.'}
            </Text>

            {hasProgress ? (
              <PressableSurface
                haptic="selection"
                disabled={stopSaving}
                onPress={() => { void handleSaveAndStop(); }}
                style={{ borderRadius: 18, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', opacity: stopSaving ? 0.6 : 1 }}
              >
                <LinearGradient
                  colors={isDark ? ['#C5A059', '#8a5818'] : ['#8B5E3C', '#5a3010']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: '100%', borderRadius: 18, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: isDark ? '#fde8c8' : '#fff8f0' }}>
                    {stopSaving ? 'Saving...' : 'End & save'}
                  </Text>
                </LinearGradient>
              </PressableSurface>
            ) : null}

            <PressableSurface
              haptic="selection"
              onPress={() => setShowStopSheet(false)}
              style={{
                borderRadius: 18,
                minHeight: MIN_TOUCH_TARGET,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(197,160,89,0.14)' : 'rgba(0,0,0,0.07)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: isDark ? 'rgba(245,225,185,0.95)' : '#2D1F0E' }}>
                Continue practice
              </Text>
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              onPress={handleDiscardAndStop}
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: isDark ? 'rgba(197,160,89,0.60)' : 'rgba(100,65,25,0.60)' }}>
                {hasProgress ? 'Discard and leave' : 'Leave setup'}
              </Text>
            </PressableSurface>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={customizeOpen} animationType="slide" onRequestClose={() => setCustomizeOpen(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 18,
              maxHeight: '82%',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ ...TYPE.screenTitle, color: text }}>Practice atmosphere</Text>
              <Text style={{ ...TYPE.caption, color: dim }}>
                Choose the visual atmosphere for this session. Mantra and mala can be changed from setup.
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ gap: 18 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                <Text style={{ ...TYPE.section, color: theme.brand }}>Scene</Text>
                <View style={{ gap: 10 }}>
                  {BG_SCENES.map((item) => {
                    const selected = selectedSceneId === item.id;
                    const sceneText = isDark || item.id === 'midnight' ? COLORS.onMediaWhite : text;
                    const sceneMuted = isDark || item.id === 'midnight' ? COLORS.homePwaPillText : dim;
                    return (
                      <PressableSurface
                        key={item.id}
                        haptic="selection"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setSelectedSceneId(item.id);
                          void AsyncStorage.setItem(JAPA_SCENE_KEY, item.id);
                        }}
                        style={{
                          borderRadius: 18,
                          borderWidth: 1,
                          borderColor: selected ? theme.brand : theme.premiumBorder,
                          backgroundColor: cardBg,
                          overflow: 'hidden',
                          boxShadow: selected ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
                        }}
                      >
                        <LinearGradient
                          colors={isDark ? item.colors : item.lightColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            minHeight: 62,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: selected ? theme.brandSoft : (isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight),
                                borderWidth: 1,
                                borderColor: selected ? theme.brand : theme.premiumBorder,
                              }}
                            >
                              <Feather name={item.icon as keyof typeof Feather.glyphMap} size={16} color={selected ? theme.brand : sceneMuted} />
                            </View>
                            <Text style={{ ...TYPE.label, color: sceneText }}>{item.name}</Text>
                          </View>
                          {selected ? (
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: theme.brand,
                              }}
                            >
                              <Feather name="check" size={17} color={COLORS.ink} />
                            </View>
                          ) : null}
                        </LinearGradient>
                      </PressableSurface>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={{ ...TYPE.section, color: theme.brand }}>Mantra audio</Text>
                <PressableSurface
                  haptic="selection"
                  onPress={() => { void toggleMantraAudio(); }}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: mantraAudioEnabled ? theme.brand : theme.premiumBorder,
                    backgroundColor: cardBg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: MIN_TOUCH_TARGET,
                    boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: mantraAudioEnabled ? theme.brandSoft : (isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight),
                        borderWidth: 1,
                        borderColor: mantraAudioEnabled ? theme.brand : theme.premiumBorder,
                      }}
                    >
                      <Feather name={mantraAudioEnabled ? 'volume-2' : 'volume-x'} size={16} color={theme.brand} />
                    </View>
                    <Text style={{ ...TYPE.label, color: text }}>Spoken mantra loop</Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: mantraAudioEnabled ? theme.brand : theme.premiumBorder,
                      backgroundColor: mantraAudioEnabled ? theme.brandSoft : 'transparent',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ ...TYPE.caption, color: mantraAudioEnabled ? theme.brand : dim }}>
                      {mantraAudioEnabled ? 'On' : 'Off'}
                    </Text>
                  </View>
                </PressableSurface>
              </View>
            </ScrollView>
            <PressableSurface
              haptic="selection"
              onPress={() => setCustomizeOpen(false)}
              style={{
                borderRadius: 18,
                backgroundColor: theme.brand,
                minHeight: MIN_TOUCH_TARGET,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>Done</Text>
            </PressableSurface>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={customMantraOpen} animationType="fade" onRequestClose={() => setCustomMantraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'center', padding: 22 }}>
          <View
            style={{
              borderRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 16,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ ...TYPE.screenTitle, color: text }}>Personal mantra</Text>
              <Text style={{ ...TYPE.caption, color: dim }}>Use this for a guru-given mantra or a short name you repeat privately.</Text>
            </View>
            <TextInput
              value={customMantraText}
              onChangeText={setCustomMantraText}
              placeholder="Enter mantra"
              placeholderTextColor={dim}
              autoCapitalize="none"
              style={{
                minHeight: 54,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                paddingHorizontal: 14,
                color: text,
                fontFamily: FONTS.sansMedium,
                fontSize: 15,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PressableSurface
                haptic="selection"
                onPress={() => setCustomMantraOpen(false)}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: border,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: text }}>Cancel</Text>
              </PressableSurface>
              <PressableSurface
                onPress={() => {
                  const trimmed = customMantraText.trim();
                  void AsyncStorage.setItem(JAPA_CUSTOM_MANTRA_KEY, trimmed);
                  if (trimmed.length >= 2) {
                    setMantraIndex(mantraOptions.length - 1);
                  }
                  setCustomMantraOpen(false);
                }}
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: theme.brand,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: bg }}>Save</Text>
              </PressableSurface>
            </View>
          </View>
        </View>
      </Modal>

      {toast.visible ? (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 20,
            right: 20,
            borderRadius: 16,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: theme.brand,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>{toast.message}</Text>
        </View>
      ) : null}

      {completionStats ? (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{
            position: 'absolute',
            left: -420,
            top: 0,
            opacity: 0.01,
          }}
        >
          <ShoonayaShareCard
            ref={japaShareCardRef}
            data={{
              tradition,
              headlineValue: completionStats.rounds,
              title: tradition === 'sikh' ? 'Days of Simran' : tradition === 'jain' ? 'Days of Ahimsa' : 'Days of Sadhana',
              subtitle: completionStats.mantraName,
              caption: `${completionStats.beads.toLocaleString('en-IN')} beads completed in ${formatDuration(completionStats.durationSecs)}. ${completionInsight ?? 'A steady practice, carried back into the day.'}`,
              date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              artwork: 'japa-mala',
              malaSkin,
            }}
          />
        </View>
      ) : null}

      {completionVisible && completionStats ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.celebrationScrim,
          }}
        >
          <ConfettiOverlay show={confettiVisible} density="burst" onComplete={() => setConfettiVisible(false)} />
          <Animated.View
            style={{
              width: '85%',
              borderRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: theme.brand,
              paddingHorizontal: 28,
              paddingVertical: 32,
              alignItems: 'center',
              gap: 16,
              maxWidth: 420,
              transform: [{ translateY: ceremonyTranslate }, { scale: ceremonyScale }],
            }}
          >
            <View style={{ width: 116, height: 116, alignItems: 'center', justifyContent: 'center' }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: 138,
                  height: 138,
                  borderRadius: 69,
                  backgroundColor: theme.brand,
                  opacity: 0.14,
                }}
              />
              <View
                pointerEvents="none"
                style={{ position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 1, borderColor: `${theme.brand}55` }}
              />
              <View
                pointerEvents="none"
                style={{ position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: `${theme.brand}30` }}
              />
              <JapaMalaArtwork skin={malaSkin} size={104} />
            </View>
            {tradition === 'sikh' ? (
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 19, color: theme.brand, marginTop: -8 }}>
                ਵਾਹਿਗੁਰੂ
              </Text>
            ) : null}
            <Text style={{ ...TYPE.title, color: text, textAlign: 'center' }}>
              {getCompletionTitle(tradition)}
            </Text>
            <Text style={{ ...TYPE.caption, color: dim, textAlign: 'center' }}>
              {completionStats.beads.toLocaleString('en-IN')} beads of {completionStats.mantraName}
            </Text>
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.brandSoft,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.brand }}>
                +5 seva · practice saved
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: dim, textTransform: 'uppercase' }}>Rounds</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, marginTop: 4 }}>{completionStats.rounds}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: dim, textTransform: 'uppercase' }}>Beads</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, marginTop: 4 }}>{completionStats.beads}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 16, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: dim, textTransform: 'uppercase' }}>Duration</Text>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, marginTop: 4 }}>
                  {formatDuration(completionStats.durationSecs)}
                </Text>
              </View>
            </View>

            <View
              style={{
                alignSelf: 'stretch',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
                backgroundColor: isDark ? COLORS.homeShlokaGlassDark : COLORS.homeShlokaSurfaceLight,
                padding: 14,
                gap: 8,
              }}
            >
              <Text style={{ ...TYPE.section, color: theme.brand }}>Dharma Mitra</Text>
              {completionInsightLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color={theme.brand} size="small" />
                  <Text style={{ ...TYPE.caption, color: dim }}>Receiving insight...</Text>
                </View>
              ) : (
                <Text style={{ ...TYPE.caption, color: text }}>
                  {completionInsight ??
                    `${completionStats.rounds} mala${completionStats.rounds > 1 ? 's' : ''} completed. Let the vibration of ${completionStats.mantraName} stay in your breath as you return to the day.`}
                </Text>
              )}
            </View>

            <PressableSurface
              haptic="impact"
              onPress={() => {
                void shareCapturedShoonayaCard(japaShareCardRef, {
                  fileName: 'shoonaya-japa-card.png',
                  dialogTitle: 'Share Japa practice',
                  fallbackMessage: `I completed ${completionStats.rounds} mala${completionStats.rounds > 1 ? 's' : ''} (${completionStats.beads.toLocaleString('en-IN')} beads) with Shoonaya.`,
                });
              }}
              style={{
                marginTop: 12,
                width: '100%',
                borderRadius: 16,
                backgroundColor: theme.brand,
                minHeight: MIN_TOUCH_TARGET,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: bg }}>Share Japa card</Text>
            </PressableSurface>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <PressableSurface
                onPress={() => {
                  setCompletionVisible(false);
                  setConfettiVisible(false);
                  setCompletionInsight(null);
                  setCompletedRounds(0);
                  setCount(0);
                  setDurationSecs(0);
                  setSessionStartTime(Date.now());
                }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: theme.brand }}>Another mala</Text>
              </PressableSurface>
              <PressableSurface
                haptic="selection"
                onPress={() => {
                  setCompletionVisible(false);
                  setConfettiVisible(false);
                  setCompletionInsight(null);
                  setScreen('launcher');
                }}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: border,
                  minHeight: MIN_TOUCH_TARGET,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TYPE.label, color: text }}>Done</Text>
              </PressableSurface>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Screen>
  );
}
