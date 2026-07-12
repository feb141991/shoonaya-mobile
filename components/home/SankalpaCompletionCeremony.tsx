import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS } from '@/lib/constants';

/**
 * SankalpaCompletionCeremony — calm, premium completion celebration.
 *
 * Native port of the PWA's src/components/home/SankalpaCompletionCeremony.tsx.
 * Purely presentational: it never itself awards karma or writes anything —
 * the caller (app/sankalpa.tsx) already awaits a successful response from
 * POST /api/sankalpa/complete (the real, server-side karma award) before
 * ever showing this component, and passes the *server's* returned
 * `karmaAwarded` value through as a prop rather than this component assuming
 * a fixed number. That keeps the reward write entirely server-trusted; this
 * is just the celebratory UI layer on top of it.
 *
 * Follows the same absolute-overlay + Animated.spring/timing convention
 * app/shloka.tsx's own streak celebration already established in this repo
 * (COLORS.celebrationScrim backdrop, scale+opacity entrance, backdrop-tap to
 * dismiss) rather than introducing React Native's Modal API as a second
 * pattern. Unlike shloka.tsx's celebration, this one checks
 * AccessibilityInfo.isReduceMotionEnabled() and skips the spring/fade
 * entrance entirely when reduced motion is on, per this task's explicit
 * requirement.
 *
 * This overlay is always a dark, fixed-takeover surface regardless of the
 * app's own light/dark theme (matching the PWA ceremony, which is a static
 * bg-black/90 overlay either way) — so it deliberately reads colour tokens
 * off their *Dark variants (brandGoldDark, homeShlokaGlassDark, textDimDark,
 * creamBg) rather than branching on useColorScheme().
 */

const TRADITION_COPY: Record<string, { heading: string; body: string }> = {
  hindu: { heading: 'Sankalpa Purna', body: 'Your vow is fulfilled. The divine witnessed every step.' },
  sikh: { heading: 'Ardas Poori', body: 'Waheguru witnessed your dedication. The vow is complete.' },
  buddhist: { heading: 'Sankalpa Sampanna', body: 'Your intention ripens into wisdom. Well done.' },
  jain: { heading: 'Pratijna Poori', body: 'Your commitment held. Ahimsa and discipline both honored.' },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  sankalpaTitle: string;
  durationDays: number;
  karmaAwarded: number | null;
  tradition?: string | null;
}

export function SankalpaCompletionCeremony({ visible, onClose, sankalpaTitle, durationDays, karmaAwarded, tradition }: Props) {
  const copy = TRADITION_COPY[tradition ?? 'hindu'] ?? TRADITION_COPY.hindu;
  const accent = COLORS.brandGoldDark;

  const [reducedMotion, setReducedMotion] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (reducedMotion) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }

    opacity.setValue(0);
    scale.setValue(0.9);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 55 }),
    ]).start();
  }, [visible, reducedMotion, opacity, scale]);

  const dismiss = () => {
    if (reducedMotion) {
      onClose();
      return;
    }
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      style={{
        position: 'absolute',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.celebrationScrim,
        opacity,
        paddingHorizontal: 24,
      }}
    >
      <ConfettiOverlay show={visible} density="soft" />
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismiss} style={{ position: 'absolute', inset: 0 }} />

      <PressableSurface
        haptic="selection"
        accessibilityLabel="Close"
        hitSlop={10}
        onPress={dismiss}
        style={{ position: 'absolute', top: 24, right: 24, padding: 6, minHeight: 0 }}
      >
        <Feather name="x" size={22} color={COLORS.textDimDark} />
      </PressableSurface>

      <Animated.View style={{ transform: [{ scale }], alignItems: 'center', maxWidth: 420 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${accent}26`,
            borderWidth: 1,
            borderColor: `${accent}4d`,
            marginBottom: 20,
          }}
        >
          <Feather name="star" size={40} color={accent} />
        </View>

        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 26, color: COLORS.creamBg, textAlign: 'center' }}>
          {copy.heading}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Feather name="star" size={13} color={accent} />
          <Text
            style={{
              fontFamily: FONTS.sansSemiBold,
              fontSize: 12,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {karmaAwarded ? `+${karmaAwarded} Karma · ` : ''}Sankalpa Fulfilled
          </Text>
          <Feather name="star" size={13} color={accent} />
        </View>

        <View
          style={{
            marginTop: 24,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: COLORS.homeShlokaGlassBorderDark,
            backgroundColor: COLORS.homeShlokaGlassDark,
            paddingHorizontal: 20,
            paddingVertical: 18,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: `${accent}99` }}>
            {durationDays} days held
          </Text>
          <Text style={{ fontFamily: FONTS.serif, fontSize: 17, fontStyle: 'italic', color: COLORS.creamBg, textAlign: 'center', lineHeight: 24 }}>
            &ldquo;{sankalpaTitle}&rdquo;
          </Text>
          <Text style={{ marginTop: 6, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textDimDark, textAlign: 'center', lineHeight: 20 }}>
            {copy.body}
          </Text>
        </View>

        <PressableSurface
          accessibilityLabel="Complete journey"
          onPress={dismiss}
          style={{
            marginTop: 28,
            minHeight: 44,
            borderRadius: 999,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${accent}33`,
            borderWidth: 1,
            borderColor: `${accent}4d`,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: accent }}>Complete Journey →</Text>
        </PressableSurface>
      </Animated.View>
    </Animated.View>
  );
}
