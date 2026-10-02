import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Button } from '@/components/ui/Button';

export const DELETION_FEEDBACK_OPTIONS = [
  "I don't use it enough",
  'Too many notifications',
  'Missing features I need',
  'Privacy concerns',
  'Starting fresh',
  'Other reason',
] as const;

export type DeletionFeedbackOption = (typeof DELETION_FEEDBACK_OPTIONS)[number];

export type DeletionJourneySnapshot = {
  userName: string;
  tradition: string;
  streak: number;
  karmaPoints: number;
  sevaScore: number;
  relicsCount: number;
  journalCount: number;
  activeSankalpas?: number;
  isPro?: boolean;
  ownedKuls?: Array<{ id: string; name: string }>;
  ownedMandalis?: Array<{ id: string; name: string }>;
  lang?: 'en' | 'hi' | 'pa';
};

type AccountDeletionSheetProps = {
  visible: boolean;
  snapshot: DeletionJourneySnapshot;
  onClose: () => void;
  onConfirmDeletion: (payload: { reason?: string; otherReason?: string }) => Promise<void>;
  onPauseNotificationsInstead?: () => Promise<void>;
  onExportData?: () => void;
};

function getTraditionSymbol(tradition: string): string {
  switch (tradition.toLowerCase()) {
    case 'sikh':
      return '☬';
    case 'buddhist':
      return '☸️';
    case 'jain':
      return '🤲';
    case 'none':
      return '✨';
    default:
      return '🪔';
  }
}

export function AccountDeletionSheet({
  visible,
  snapshot,
  onClose,
  onConfirmDeletion,
  onPauseNotificationsInstead,
  onExportData,
}: AccountDeletionSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedReason, setSelectedReason] = useState<DeletionFeedbackOption | ''>('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedReason('');
      setOtherReason('');
      setConfirmInput('');
      setErrorMessage(null);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  if (!visible) return null;

  const handleNextStep = (next: 1 | 2 | 3 | 4) => {
    void Haptics.selectionAsync().catch(() => {});
    setErrorMessage(null);
    setStep(next);
  };

  const handlePauseNotifications = async () => {
    if (!onPauseNotificationsInstead || pausing) return;
    setPausing(true);
    setErrorMessage(null);
    try {
      await onPauseNotificationsInstead();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not pause notifications.');
    } finally {
      setPausing(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (confirmInput.trim().toUpperCase() !== 'DELETE' || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirmDeletion({
        reason: selectedReason || undefined,
        otherReason: selectedReason === 'Other reason' ? otherReason.trim() : undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not schedule deletion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: 'Streak', value: `${snapshot.streak}d` },
    { label: 'Karma', value: snapshot.karmaPoints.toLocaleString() },
    { label: 'Seva', value: snapshot.sevaScore.toLocaleString() },
    { label: 'Relics', value: `${snapshot.relicsCount}` },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.scrimContainer}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: COLORS.celebrationScrim, opacity: anim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
        >
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ ...TYPE.chip, color: theme.brand, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  Account Deletion & Cool-off
                </Text>
              </View>
              {/* Step indicator dots */}
              <View style={styles.dotsRow}>
                {[1, 2, 3, 4].map((dot) => (
                  <View
                    key={dot}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          dot === step
                            ? theme.brand
                            : dot < step
                            ? theme.brandSoft
                            : theme.borderSoft,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: theme.cardSoft }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={16} color={theme.dim} />
            </Pressable>
          </View>

          {errorMessage && (
            <View style={[styles.errorBox, { backgroundColor: COLORS.dangerBg, borderColor: COLORS.dangerBorder }]}>
              <Feather name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={[styles.errorText, { color: COLORS.danger }]}>{errorMessage}</Text>
            </View>
          )}

          <ScrollView
            style={{ maxHeight: 460 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 6 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* STEP 1: Practice Impact Snapshot */}
            {step === 1 && (
              <View style={{ gap: 14 }}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={[styles.symbolBadge, { backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder }]}>
                    <Text style={{ fontSize: 26, lineHeight: 30 }}>{getTraditionSymbol(snapshot.tradition)}</Text>
                  </View>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text, textAlign: 'center' }}>
                    Before you go, {snapshot.userName}
                  </Text>
                  <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>
                    Your spiritual journey holds practice history, earned relics, and sacred reflections.
                  </Text>
                </View>

                {/* 4-Stat Grid */}
                <View style={styles.statsGrid}>
                  {stats.map((item) => (
                    <View
                      key={item.label}
                      style={[styles.statCell, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
                    >
                      <Text style={{ ...TYPE.caption, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {item.label}
                      </Text>
                      <Text style={{ ...TYPE.cardHeading, color: theme.text, marginTop: 2 }}>{item.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Journal entry disclosure */}
                {snapshot.journalCount > 0 && (
                  <View style={[styles.infoBanner, { backgroundColor: COLORS.dangerBg, borderColor: COLORS.dangerBorder }]}>
                    <Feather name="book-open" size={16} color={COLORS.danger} style={{ marginTop: 1 }} />
                    <Text style={{ ...TYPE.caption, color: COLORS.danger, flex: 1, lineHeight: 18 }}>
                      You have {snapshot.journalCount} sacred journal {snapshot.journalCount === 1 ? 'reflection' : 'reflections'}. After the 30-day grace period, these will be permanently purged.
                    </Text>
                  </View>
                )}

                {/* Kul leadership warning */}
                {snapshot.ownedKuls && snapshot.ownedKuls.length > 0 && (
                  <View style={[styles.infoBanner, { backgroundColor: 'rgba(234, 179, 8, 0.12)', borderColor: 'rgba(234, 179, 8, 0.35)' }]}>
                    <Feather name="shield" size={16} color={COLORS.brandGold} style={{ marginTop: 1 }} />
                    <Text style={{ ...TYPE.caption, color: theme.text, flex: 1, lineHeight: 18 }}>
                      You lead <Text style={{ fontFamily: FONTS.sansSemiBold }}>{snapshot.ownedKuls[0].name}</Text>. Please transfer family leadership before permanent deletion.
                    </Text>
                  </View>
                )}

                {/* Direct Data Export Off-Ramp */}
                {onExportData && (
                  <PressableSurface
                    haptic="selection"
                    onPress={onExportData}
                    style={[styles.exportRow, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
                  >
                    <Feather name="download" size={15} color={theme.brand} />
                    <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansMedium, flex: 1 }}>
                      Download my sacred practice data (.json) first
                    </Text>
                    <Feather name="chevron-right" size={14} color={theme.dim} />
                  </PressableSurface>
                )}

                <View style={{ gap: 10, marginTop: 4 }}>
                  <Button label="Keep My Account" variant="primary" onPress={onClose} />
                  <Button label="Continue to Next Step" variant="ghost" onPress={() => handleNextStep(2)} />
                </View>
              </View>
            )}

            {/* STEP 2: Immediate Changes vs. 30-Day Cool-off */}
            {step === 2 && (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text }}>What happens next?</Text>
                  <Text style={{ ...TYPE.body, color: theme.dim }}>
                    Here is what changes immediately today versus after 30 days:
                  </Text>
                </View>

                {/* Immediate card */}
                <View style={[styles.detailBox, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Feather name="bell-off" size={15} color={theme.brand} />
                    <Text style={{ ...TYPE.label, color: theme.text }}>Immediate Silence (Today)</Text>
                  </View>
                  <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 18 }}>
                    • <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>All notifications stop 100%</Text>: Japa, Nitya Karma, fastings, and festivals will no longer alert you.{'\n'}
                    • <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>Profile unlisted</Text>: Your profile is hidden from Mandali discovery and community leaderboards.{'\n'}
                    • <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>Practice frozen</Text>: Streaks and karma are safely held in cold storage without penalties.
                  </Text>
                </View>

                {/* 30-Day Safety Net card */}
                <View style={[styles.detailBox, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Feather name="shield" size={15} color={COLORS.success} />
                    <Text style={{ ...TYPE.label, color: theme.text }}>30-Day Safe Grace Period</Text>
                  </View>
                  <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 18 }}>
                    • Your records are <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>retained securely for 30 days</Text>.{'\n'}
                    • Changed your mind? Sign back in anytime and tap <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>"Cancel deletion"</Text> on your Profile to restore everything in 1 tap.{'\n'}
                    • Only after 30 days are your credentials and personal records permanently purged.
                  </Text>
                </View>

                {/* Store Subscriptions Disclosure (Apple Requirement) */}
                <View style={[styles.infoBanner, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                  <Feather name="info" size={15} color={theme.brand} style={{ marginTop: 1 }} />
                  <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1, lineHeight: 18 }}>
                    <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>Store Subscriptions Notice</Text>: Deleting your Shoonaya account does not cancel auto-renewing App Store or Google Play subscriptions. Manage or cancel subscriptions in your device store settings.
                  </Text>
                </View>

                <View style={{ gap: 10, marginTop: 4 }}>
                  <Button label="Keep My Account" variant="primary" onPress={onClose} />
                  <Button label="Continue" variant="secondary" onPress={() => handleNextStep(3)} />
                </View>
              </View>
            )}

            {/* STEP 3: Lighter Alternatives & Exit Reason */}
            {step === 3 && (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Consider a quieter step</Text>
                  <Text style={{ ...TYPE.body, color: theme.dim }}>
                    If notification fatigue or a busy season is the issue, you don't need to delete your journey:
                  </Text>
                </View>

                {onPauseNotificationsInstead && (
                  <PressableSurface
                    haptic="selection"
                    onPress={handlePauseNotifications}
                    disabled={pausing}
                    style={[
                      styles.pauseCard,
                      { backgroundColor: theme.brandSoft, borderColor: theme.brand },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather name="pause-circle" size={20} color={theme.brand} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...TYPE.label, color: theme.text }}>Mute all notifications for 30 days</Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
                          Gives you complete peace without losing your streaks, journal, or relics.
                        </Text>
                      </View>
                      {pausing && <ActivityIndicator size="small" color={theme.brand} />}
                    </View>
                  </PressableSurface>
                )}

                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ ...TYPE.label, color: theme.text }}>Why are you leaving? (Optional)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {DELETION_FEEDBACK_OPTIONS.map((opt) => {
                      const selected = selectedReason === opt;
                      return (
                        <PressableSurface
                          key={opt}
                          haptic="selection"
                          onPress={() => setSelectedReason(selected ? '' : opt)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected ? theme.brandSoft : theme.cardSoft,
                              borderColor: selected ? theme.brand : theme.borderSoft,
                            },
                          ]}
                        >
                          <Text style={{ ...TYPE.caption, color: selected ? theme.brandStrong : theme.text }}>
                            {opt}
                          </Text>
                        </PressableSurface>
                      );
                    })}
                  </View>
                  {selectedReason === 'Other reason' && (
                    <TextInput
                      value={otherReason}
                      onChangeText={setOtherReason}
                      placeholder="Tell us what we can improve..."
                      placeholderTextColor={theme.dim}
                      maxLength={120}
                      style={[
                        styles.otherInput,
                        { backgroundColor: theme.cardSoft, borderColor: theme.border, color: theme.text },
                      ]}
                    />
                  )}
                </View>

                <View style={{ gap: 10, marginTop: 4 }}>
                  <Button label="I'll Stay" variant="primary" onPress={onClose} />
                  <Button label="Proceed to Final Confirmation" variant="ghost" onPress={() => handleNextStep(4)} />
                </View>
              </View>
            )}

            {/* STEP 4: Final Safeguard & Schedule */}
            {step === 4 && (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...TYPE.cardHeading, color: COLORS.danger }}>Confirm Account Deletion</Text>
                  <Text style={{ ...TYPE.body, color: theme.dim }}>
                    To confirm scheduling your 30-day cool-off, please type <Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.text }}>DELETE</Text> below:
                  </Text>
                </View>

                <TextInput
                  value={confirmInput}
                  onChangeText={setConfirmInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="DELETE"
                  placeholderTextColor={theme.dim}
                  style={[
                    styles.confirmInput,
                    {
                      backgroundColor: theme.cardSoft,
                      borderColor: confirmInput.trim().toUpperCase() === 'DELETE' ? COLORS.danger : theme.border,
                      color: theme.text,
                    },
                  ]}
                />

                <View style={[styles.infoBanner, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                  <Feather name="clock" size={15} color={theme.brand} style={{ marginTop: 2 }} />
                  <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1, lineHeight: 18 }}>
                    Your account enters a 30-day cool-off. You can cancel anytime before then by signing in and tapping Cancel on your Profile.
                  </Text>
                </View>

                <View style={{ gap: 10, marginTop: 6 }}>
                  <PressableSurface
                    haptic="none"
                    disabled={confirmInput.trim().toUpperCase() !== 'DELETE' || submitting}
                    onPress={handleFinalSubmit}
                    style={[
                      styles.destructiveButton,
                      {
                        backgroundColor: COLORS.danger,
                        opacity: confirmInput.trim().toUpperCase() === 'DELETE' && !submitting ? 1 : 0.45,
                      },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color={COLORS.onMediaWhite} size="small" />
                    ) : (
                      <Text style={{ ...TYPE.label, fontSize: 14.5, color: COLORS.onMediaWhite }}>Schedule Account Deletion</Text>
                    )}
                  </PressableSurface>

                  <Button label="Never Mind, Keep Account" variant="ghost" onPress={onClose} />
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrimContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADII.xl,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    width: '48%',
    padding: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
  },
  detailBox: {
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    gap: 6,
  },
  pauseCard: {
    padding: 14,
    borderRadius: RADII.lg,
    borderWidth: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  otherInput: {
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: FONTS.sans,
    fontSize: 14,
    marginTop: 4,
  },
  confirmInput: {
    borderWidth: 1.5,
    borderRadius: RADII.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.sansSemiBold,
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
  destructiveButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADII.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  errorText: {
    ...TYPE.caption,
    flex: 1,
  },
});
