import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, useColorScheme, View } from 'react-native';

import { FONTS, themeColor } from '@/lib/constants';
import { pickLoadingTips } from '@/lib/dharma-facts';

// Gaming-loading-screen style tip rotator for Home's cold-start skeleton
// (components/home/HomeSkeleton.tsx) -- the one real network wait with a
// dedicated full-screen placeholder already in place. Reuses
// lib/dharma-facts.ts's pool/shape rather than a new content format; timer
// pattern mirrors components/home/BrahmaMuhurtaPrompt.tsx's setInterval
// tick, fade mirrors components/home/MoodPulseSheet.tsx's contentAnim.

const ROTATE_MS = 3500;

type Props = {
  tradition?: string | null;
};

export function LoadingTips({ tradition }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const tips = useMemo(() => pickLoadingTips(tradition), [tradition]);
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (tips.length <= 1) return;
    const id = setInterval(() => {
      if (reducedMotion) {
        setIndex((i) => (i + 1) % tips.length);
        return;
      }
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % tips.length);
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [tips.length, reducedMotion, opacity]);

  if (tips.length === 0) return null;

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 4 }}>
      <Animated.Text
        style={{
          fontFamily: FONTS.sans,
          fontSize: 12,
          lineHeight: 17,
          color: theme.dim,
          textAlign: 'center',
          opacity,
        }}
        numberOfLines={2}
      >
        {tips[index].text}
      </Animated.Text>
    </View>
  );
}
