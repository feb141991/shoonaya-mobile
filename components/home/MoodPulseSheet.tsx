import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Modal, Pressable, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { MOODS_CONFIG, type MoodConfig } from '@/lib/mood-registry';
import { MoodGlyph } from '@/components/mood/MoodGlyph';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { startMoodCheckin } from '@/lib/mood';
import { getMoodSpiritualDate, setMoodPulseDismissedDate } from '@/lib/moodPulsePreference';
import { resolveNativeRoute } from '@/lib/routes';

type MoodPulseSheetProps = {
  visible: boolean;
  firstName?: string;
  onClose: () => void;
  onLogged: (mood: string) => void;
};

// Native port of the PWA's auto-popping MoodPulse (src/components/mood/
// MoodPulse.tsx) -- Home decides WHEN to show this (once per spiritual day,
// gated by lib/moodPulsePreference.ts's AsyncStorage flag, see the effect in
// app/(tabs)/index.tsx), this component owns the picker UI and the actual
// /api/mood/checkin calls once a mood is picked.
//
// Presented as a centered dialog (RN Modal + fade, backdrop scrim, fully
// rounded card) matching the PWA's actual layout (fixed inset-0 flex
// items-center justify-center, rounded-3xl card) rather than this app's
// usual bottom-sheet idiom -- explicit PWA-parity request, not the
// bottom-sheet alternative this component started out as.
//
// Unlike the PWA's completed-state branch, native always keeps the full mood
// picker visible. Backend mood history and per-device dismissal state can
// legitimately differ, but they must not produce different picker layouts.
export function MoodPulseSheet({ visible, firstName, onClose, onLogged }: MoodPulseSheetProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const MOODS = MOODS_CONFIG[isDark ? 'dark' : 'light'] || MOODS_CONFIG.dark;

  const [reducedMotion, setReducedMotion] = useState(false);
  const [pickedMood, setPickedMood] = useState<MoodConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const contentAnim = useRef(new Animated.Value(0)).current;
  const confirmAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducedMotion);
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    if (!visible) return;
    setPickedMood(null);
    setSaving(false);
    contentAnim.setValue(reducedMotion ? 1 : 0);
    if (!reducedMotion) {
      Animated.timing(contentAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    confirmAnim.setValue(0);
    if (pickedMood && !reducedMotion) {
      Animated.timing(confirmAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (pickedMood) {
      confirmAnim.setValue(1);
    }
  }, [pickedMood, reducedMotion, confirmAnim]);

  const handleDismiss = () => {
    void setMoodPulseDismissedDate(getMoodSpiritualDate());
    onClose();
  };

  const handleDone = async () => {
    if (!pickedMood || saving) return;
    setSaving(true);
    await startMoodCheckin(pickedMood.key, undefined, undefined, undefined, true);
    await setMoodPulseDismissedDate(getMoodSpiritualDate());
    setSaving(false);
    onLogged(pickedMood.key);
    onClose();
  };

  const handleExplore = async () => {
    if (!pickedMood || saving) return;
    setSaving(true);
    await startMoodCheckin(pickedMood.key);
    setSaving(false);
    onClose();
    router.push(resolveNativeRoute('/mood', '/(tabs)'));
  };

  return (
    <Modal transparent visible={visible} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={handleDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bottomSheetScrim,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 32,
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 28,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 22,
            gap: 16,
            boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
            opacity: contentAnim,
            transform: [
              { translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              { scale: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
            ],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...TYPE.chip, letterSpacing: 1.3, textTransform: 'uppercase', color: theme.brand }}>
                भावना · Mood check-in
              </Text>
              <Text style={{ ...TYPE.cardHeading, color: theme.text }}>
                How are you feeling{firstName ? `, ${firstName}` : ''}?
              </Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.cardSoft,
              }}
              accessibilityLabel="Dismiss mood check-in"
              accessibilityRole="button"
            >
              <Feather name="x" size={14} color={theme.dim} />
            </Pressable>
          </View>

          <View>
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {MOODS.map((mood, index) => {
                    const isSelected = pickedMood?.key === mood.key;
                    const itemAnim = contentAnim.interpolate({
                      inputRange: [Math.min(index * 0.07, 0.7), Math.min(index * 0.07 + 0.3, 1)],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    });
                    return (
                      <Animated.View
                        key={mood.key}
                        style={{
                          width: '47%',
                          opacity: itemAnim,
                          transform: [{ scale: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                        }}
                      >
                        <PressableSurface
                          haptic="selection"
                          accessibilityLabel={`I feel ${mood.label}`}
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => setPickedMood(mood)}
                          pressedStyle={{ transform: [{ scale: 0.97 }] }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            minHeight: MIN_TOUCH_TARGET,
                            paddingHorizontal: 10,
                            borderRadius: 16,
                            backgroundColor: isSelected ? mood.bg : theme.cardSoft,
                            borderWidth: isSelected ? 1.5 : 1,
                            borderColor: isSelected ? mood.colour : theme.border,
                          }}
                        >
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSelected ? theme.card : mood.bg,
                              borderWidth: 1,
                              borderColor: `${mood.colour}33`,
                            }}
                          >
                            <MoodGlyph mood={mood.key} color={mood.colour} size={16} />
                          </View>
                          <Text
                            style={{
                              fontFamily: FONTS.sansSemiBold,
                              fontSize: 12,
                              lineHeight: 15,
                              color: isSelected ? mood.colour : theme.text,
                              flexShrink: 1,
                            }}
                            numberOfLines={1}
                          >
                            {mood.label}
                          </Text>
                        </PressableSurface>
                      </Animated.View>
                    );
                  })}
                </View>

                {pickedMood ? (
                  <Animated.View
                    style={{
                      opacity: confirmAnim,
                      transform: [{ translateY: confirmAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: SPACING.md,
                      paddingTop: SPACING.md,
                      borderTopWidth: 1,
                      borderTopColor: `${pickedMood.colour}22`,
                    }}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MoodGlyph mood={pickedMood.key} color={pickedMood.colour} size={16} />
                      <Text style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: pickedMood.colour }} numberOfLines={1}>
                        {pickedMood.label} saved
                      </Text>
                    </View>
                    {saving ? (
                      <ActivityIndicator size="small" color={pickedMood.colour} />
                    ) : (
                      <>
                        <PressableSurface
                          haptic="selection"
                          accessibilityLabel="Done, close mood check-in"
                          onPress={handleDone}
                          style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.cardSoft }}
                        >
                          <Text style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: theme.dim }}>Done ✓</Text>
                        </PressableSurface>
                        <PressableSurface
                          haptic="selection"
                          accessibilityLabel={`Explore recommendations for feeling ${pickedMood.label}`}
                          onPress={handleExplore}
                          style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: pickedMood.bg }}
                        >
                          <Text style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: pickedMood.colour }}>Explore →</Text>
                        </PressableSurface>
                      </>
                    )}
                  </Animated.View>
                ) : null}
              </>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
