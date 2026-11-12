import { startJapaReflection } from '@/lib/japaTimers';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { JapaCompletionDetails } from '@/components/japa/JapaCompletionDetails';
import { JapaMalaArtwork } from '@/components/japa/JapaMalaArtwork';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';
import { formatDuration, getCompletionTitle } from '@/lib/japaPresentation';
import type { MalaSkin } from '@/lib/mala-skins';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import type { JapaCompletionStats } from '@/hooks/useJapaCompletionInsight';

type Theme = ReturnType<typeof themeColor>;

type Props = {
  completionStats: JapaCompletionStats | null;
  completionVisible: boolean;
  completionInsight: string | null;
  completionInsightLoading: boolean;
  confettiVisible: boolean;
  tradition: string | null;
  malaSkin: MalaSkin;
  isDark: boolean;
  cardBg: string;
  border: string;
  text: string;
  dim: string;
  bg: string;
  theme: Theme;
  ceremonyScale: Animated.AnimatedInterpolation<number>;
  ceremonyTranslate: Animated.AnimatedInterpolation<number>;
  autoAdvance?: boolean;
  onAutoAdvance: () => void;
  onConfettiComplete: () => void;
  // The parent owns sign-in prompts and the session state these actions reset.
  onAnotherMala: () => void;
  onDone: () => void;
};

// The completion ceremony: an off-screen share card for capture, and the
// overlay with the practice summary. Moved out of app/(tabs)/japa.tsx as is.
export function JapaCompletionCeremony({
  completionStats,
  completionVisible,
  completionInsight,
  completionInsightLoading,
  confettiVisible,
  tradition,
  malaSkin,
  isDark,
  cardBg,
  border,
  text,
  dim,
  bg,
  theme,
  ceremonyScale,
  ceremonyTranslate,
  autoAdvance = false,
  onAutoAdvance,
  onConfettiComplete,
  onAnotherMala,
  onDone,
}: Props) {
  const japaShareCardRef = useRef<View>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownCancelled, setCountdownCancelled] = useState(false);
  const cancelReflection = useRef<(() => void) | null>(null);
  const stay = () => {
    cancelReflection.current?.();
    setCountdownCancelled(true);
  };

  useEffect(() => {
    if (!completionVisible) {
      setCountdown(null);
      setCountdownCancelled(false);
      return;
    }
    if (!autoAdvance || countdownCancelled) {
      setCountdown(null);
      return;
    }
    const cancel = startJapaReflection(setCountdown, onAutoAdvance);
    cancelReflection.current = cancel;
    return cancel;
  }, [autoAdvance, completionVisible, countdownCancelled, onAutoAdvance]);

  return (
    <>
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
          <ConfettiOverlay show={confettiVisible} density="burst" onComplete={onConfettiComplete} />
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

            <JapaCompletionDetails
              stats={completionStats}
              insight={completionInsight}
              insightLoading={completionInsightLoading}
              text={text}
              dim={dim}
              theme={theme}
              isDark={isDark}
            />

            <PressableSurface
              haptic="impact"
              onPress={() => {
                stay();
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
                  stay();
                  onAnotherMala();
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
                  stay();
                  onDone();
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

            {countdown !== null && !countdownCancelled ? (
              <PressableSurface
                haptic="selection"
                onPress={stay}
                accessibilityLabel="Stay in reflection"
                hitSlop={8}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                }}
              >
                <Text style={{ ...TYPE.caption, color: dim, textAlign: 'center' }}>
                  Auto-closing in {countdown}s · <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold }}>Stay</Text>
                </Text>
              </PressableSurface>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}
