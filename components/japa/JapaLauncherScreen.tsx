import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { ContextualJapaReminderPrompt } from '@/components/japa/ContextualJapaReminderPrompt';
import { TargetRoundSelector } from '@/components/japa/JapaSelectionControls';
import { COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import type { JapaSoundTrack } from '@/lib/japa-audio';
import { getMantraScriptFont } from '@/lib/japaPresentation';
import type { pickDharmaFact } from '@/lib/dharma-facts';
import type { MalaSkin } from '@/lib/mala-skins';
import type { getMalaVolumeMilestone } from '@/lib/mala-milestones';
import type { getNityaRankProgress } from '@/lib/nitya-rank';
import { navScrollHandler } from '@/lib/navScrollBus';
import type { JapaMantra } from '@/lib/traditions';

type Theme = ReturnType<typeof themeColor>;

type Props = {
  isDark: boolean;
  cardBg: string;
  text: string;
  dim: string;
  theme: Theme;
  loading: boolean;
  traditionLabel: string;
  // Set only for a signed-in person; it is what the reminder prompt is keyed by.
  authenticatedUserId: string | null;
  japaReminderEnabled: boolean | null;
  japaAlreadyDoneToday: boolean;
  syncPendingCount: number;
  syncFailedCount: number;
  syncQueueUnavailable: boolean;
  mantra: JapaMantra;
  malaSkin: MalaSkin;
  targetRounds: number;
  streak: number;
  selectedSoundId: string;
  activeSound: JapaSoundTrack;
  rank: ReturnType<typeof getNityaRankProgress>;
  volume: ReturnType<typeof getMalaVolumeMilestone>;
  fact: ReturnType<typeof pickDharmaFact>;
  reduceMotion: boolean;
  onConfigureReminder: () => void;
  onReviewSync: () => void;
  onSelectTargetRounds: (rounds: number) => void;
  onChangeMala: () => void;
  onOpenSound: () => void;
  onOpenInsights: () => void;
  onStart: () => void;
};

// The "Choose your practice" screen. Moved out of app/(tabs)/japa.tsx as is;
// the parent keeps the data and the actions, this only draws them.
export function JapaLauncherScreen({
  isDark,
  cardBg,
  text,
  dim,
  theme,
  loading,
  traditionLabel,
  authenticatedUserId,
  japaReminderEnabled,
  japaAlreadyDoneToday,
  syncPendingCount,
  syncFailedCount,
  syncQueueUnavailable,
  mantra,
  malaSkin,
  targetRounds,
  streak,
  selectedSoundId,
  activeSound,
  rank,
  volume,
  fact,
  reduceMotion,
  onConfigureReminder,
  onReviewSync,
  onSelectTargetRounds,
  onChangeMala,
  onOpenSound,
  onOpenInsights,
  onStart,
}: Props) {
  const [beginPressed, setBeginPressed] = useState(false);

  return (
      <>
        <View pointerEvents="none" style={{ position: 'absolute', top: 90, right: -86, width: 220, height: 220, borderRadius: 110, backgroundColor: theme.brandSoft, opacity: 0.72 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 420, left: -96, width: 240, height: 240, borderRadius: 120, backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowGoldLight, opacity: 0.66 }} />
        <ScrollView
          contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 150, gap: 16 }}
          onScroll={navScrollHandler}
          scrollEventThrottle={16}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <BackButton showLabel={false} fallbackHref="/(tabs)" handleHardwareBack />

            <PressableSurface
              haptic="selection"
              accessibilityLabel="Japa insights"
              onPress={onOpenInsights}
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
            <SacredLoader
              icon="japa"
              title="Preparing Sacred Japa Mala"
              subtitle="Centering your breath and intention..."
            />
          ) : (
            <>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: theme.brand }}>
                Japa Mala · {traditionLabel}
              </Text>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 34, lineHeight: 40, color: text, marginTop: 2 }}>
                Choose your practice
              </Text>

              {authenticatedUserId ? (
                <ContextualJapaReminderPrompt
                  userId={authenticatedUserId}
                  reminderEnabled={japaReminderEnabled}
                  onConfigureReminder={onConfigureReminder}
                />
              ) : null}

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

              {syncPendingCount > 0 || syncFailedCount > 0 || syncQueueUnavailable ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: syncFailedCount > 0 ? COLORS.dangerBorder : theme.premiumBorder,
                    backgroundColor: syncFailedCount > 0 ? COLORS.dangerBg : theme.brandSoft,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  {syncPendingCount > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="refresh-cw" size={13} color={theme.brand} />
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 12.5, color: text, flex: 1 }}>
                        {syncPendingCount} {syncPendingCount === 1 ? 'round is' : 'rounds are'} waiting to sync.
                      </Text>
                    </View>
                  ) : null}
                  {syncFailedCount > 0 ? (
                    <PressableSurface
                      haptic="selection"
                      accessibilityLabel={`${syncFailedCount} ${syncFailedCount === 1 ? 'round' : 'rounds'} could not be saved. Review`}
                      onPress={onReviewSync}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <Feather name="alert-circle" size={13} color={COLORS.danger} />
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 12.5, color: COLORS.danger, flex: 1 }}>
                        {syncFailedCount} {syncFailedCount === 1 ? 'round' : 'rounds'} couldn't be saved.
                      </Text>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12.5, color: COLORS.danger, textDecorationLine: 'underline' }}>
                        Review
                      </Text>
                    </PressableSurface>
                  ) : null}
                  {syncQueueUnavailable ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="wifi-off" size={13} color={dim} />
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, flex: 1 }}>
                        Could not check pending saves.
                      </Text>
                    </View>
                  ) : null}
                </View>
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
                <Text
                  style={{
                    fontFamily: getMantraScriptFont(mantra.devanagari, FONTS),
                    fontSize: 36,
                    lineHeight: 52,
                    paddingTop: 8,
                    paddingBottom: 2,
                    color: theme.brand,
                    marginTop: 4,
                  }}
                >
                  {mantra.devanagari}
                </Text>
                {mantra.transliteration ? (
                  <Text style={{ ...TYPE.body, color: dim, fontStyle: 'italic', marginTop: 2 }}>
                    {mantra.transliteration}
                  </Text>
                ) : null}
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
                onChange={onSelectTargetRounds}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <PressableSurface
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={`Change mala. Current mala is ${malaSkin.label}`}
                  onPress={onChangeMala}
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
                  accessibilityLabel={`Ambient sound. Current sound is ${selectedSoundId !== 'off' ? activeSound.label : 'Off'}`}
                  onPress={onOpenSound}
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
                    <Feather name={selectedSoundId !== 'off' ? 'music' : 'volume-x'} size={16} color={theme.brand} />
                  </View>
                  <View style={{ minWidth: 0 }}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }} numberOfLines={1}>
                      Ambient sound
                    </Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim, marginTop: 2 }} numberOfLines={1}>
                      {selectedSoundId !== 'off' ? activeSound.label : 'Sound: Off'}
                    </Text>
                  </View>
                </PressableSurface>
              </View>

              <PressableSurface
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel="View recent Japa sessions"
                onPress={onOpenInsights}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                  backgroundColor: cardBg,
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                  <View>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>
                      Recent sessions
                    </Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim, marginTop: 2 }}>
                      Beads and rounds history
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={dim} />
              </PressableSurface>

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
                onPress={onStart}
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
  );
}
