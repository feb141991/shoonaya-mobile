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
import { accountDeletionCopy, deletionReasonLabel } from '@/lib/accountDeletionCopy';
import { Button } from '@/components/ui/Button';

// Exit-feedback reasons come from GET /api/user/delete/preview (backend
// DELETION_REASONS, src/lib/account-deletion-reasons.ts) and the chosen `id`
// is sent back -- never a client-side copy of the list.
import type { DeletionReason } from '@/lib/accountDeletionStore';

export type DeletionJourneySnapshot = {
  userName: string;
  tradition: string;
  streak: number;
  karmaPoints: number;
  sevaScore: number;
  relicsCount: number;
  journalCount: number;
  activeSankalpas?: number;
  ownedKuls?: Array<{ id: string; name: string }>;
  ownedMandalis?: Array<{ id: string; name: string }>;
  reasons?: DeletionReason[];
  /** false when the preview could not be loaded: show no numbers rather than guessed ones. */
  summaryAvailable?: boolean;
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
  const copy = accountDeletionCopy(snapshot.lang);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedReason, setSelectedReason] = useState<string>('');
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

  const reasons = snapshot.reasons ?? [];
  const selectedReasonNeedsDetails = reasons.some((r) => r.id === selectedReason && r.requireDetails);
  const summaryAvailable = snapshot.summaryAvailable !== false;

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
      setErrorMessage(err instanceof Error ? err.message : copy.pauseFailed);
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
        otherReason: selectedReasonNeedsDetails && otherReason.trim() ? otherReason.trim() : undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : copy.scheduleFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: copy.stats.streak, value: copy.streakValue(snapshot.streak) },
    { label: copy.stats.karma, value: snapshot.karmaPoints.toLocaleString() },
    { label: copy.stats.seva, value: snapshot.sevaScore.toLocaleString() },
    { label: copy.stats.relics, value: `${snapshot.relicsCount}` },
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
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={copy.dismiss} />
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
                  {copy.headerTag}
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
              accessibilityLabel={copy.close}
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
                    {copy.step1Title(snapshot.userName)}
                  </Text>
                  <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>
                    {copy.step1Body}
                  </Text>
                </View>

                {!summaryAvailable && (
                  <View style={[styles.infoBanner, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                    <Feather name="wifi-off" size={16} color={theme.dim} style={{ marginTop: 1 }} />
                    <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1, lineHeight: 18 }}>
                      {copy.summaryUnavailable}
                    </Text>
                  </View>
                )}

                {/* 4-Stat Grid */}
                {summaryAvailable && (
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
                )}

                {/* Journal entry disclosure */}
                {snapshot.journalCount > 0 && (
                  <View style={[styles.infoBanner, { backgroundColor: COLORS.dangerBg, borderColor: COLORS.dangerBorder }]}>
                    <Feather name="book-open" size={16} color={COLORS.danger} style={{ marginTop: 1 }} />
                    <Text style={{ ...TYPE.caption, color: COLORS.danger, flex: 1, lineHeight: 18 }}>
                      {copy.journalWarning(snapshot.journalCount)}
                    </Text>
                  </View>
                )}

                {/* Kul creator note -- Kul has no leadership hand-over yet. */}
                {snapshot.ownedKuls && snapshot.ownedKuls.length > 0 && (
                  <View
                    style={[
                      styles.infoBanner,
                      {
                        backgroundColor: isDark ? COLORS.warningBgDark : COLORS.warningBgLight,
                        borderColor: isDark ? COLORS.warningBorderDark : COLORS.warningBorderLight,
                      },
                    ]}
                  >
                    <Feather name="users" size={16} color={isDark ? COLORS.warningDark : COLORS.warningLight} style={{ marginTop: 1 }} />
                    <Text style={{ ...TYPE.caption, color: theme.text, flex: 1, lineHeight: 18 }}>
                      {copy.kulCreated(snapshot.ownedKuls.map((kul) => kul.name).join(', '))}
                    </Text>
                  </View>
                )}

                {/* Direct Data Export Off-Ramp */}
                {onExportData && (
                  <PressableSurface
                    haptic="selection"
                    onPress={onExportData}
                    accessibilityRole="button"
                    style={[styles.exportRow, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
                  >
                    <Feather name="download" size={15} color={theme.brand} />
                    <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansMedium, flex: 1 }}>
                      {copy.exportData}
                    </Text>
                    <Feather name="chevron-right" size={14} color={theme.dim} />
                  </PressableSurface>
                )}

                <View style={{ gap: 10, marginTop: 4 }}>
                  <Button label={copy.keepAccount} variant="primary" onPress={onClose} />
                  <Button label={copy.continueNext} variant="ghost" onPress={() => handleNextStep(2)} />
                </View>
              </View>
            )}

            {/* STEP 2: What changes today vs. after 30 days */}
            {step === 2 && (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.step2Title}</Text>
                  <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.step2Intro}</Text>
                </View>

                <View style={[styles.detailBox, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Feather name="bell-off" size={15} color={theme.brand} />
                    <Text style={{ ...TYPE.label, color: theme.text }}>{copy.todayTitle}</Text>
                  </View>
                  <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 18 }}>
                    {copy.todayBullets.map((bullet, index) => (
                      <Text key={bullet.lead}>
                        {index > 0 ? '\n' : ''}• <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>{bullet.lead}</Text>: {bullet.text}
                      </Text>
                    ))}
                  </Text>
                </View>

                <View style={[styles.detailBox, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Feather name="shield" size={15} color={COLORS.success} />
                    <Text style={{ ...TYPE.label, color: theme.text }}>{copy.graceTitle}</Text>
                  </View>
                  <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 18 }}>
                    {copy.graceBullets.map((bullet, index) => (
                      <Text key={bullet.lead}>
                        {index > 0 ? '\n' : ''}• <Text style={{ fontFamily: FONTS.sansMedium, color: theme.text }}>{bullet.lead}</Text>: {bullet.text}
                      </Text>
                    ))}
                  </Text>
                </View>

                <View style={{ gap: 10, marginTop: 4 }}>
                  <Button label={copy.keepAccount} variant="primary" onPress={onClose} />
                  <Button label={copy.continue} variant="secondary" onPress={() => handleNextStep(3)} />
                </View>
              </View>
            )}

            {/* STEP 3: Lighter Alternatives & Exit Reason */}
            {step === 3 && (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{copy.step3Title}</Text>
                  <Text style={{ ...TYPE.body, color: theme.dim }}>{copy.step3Intro}</Text>
                </View>

                {onPauseNotificationsInstead && (
                  <PressableSurface
                    haptic="selection"
                    onPress={handlePauseNotifications}
                    disabled={pausing}
                    accessibilityRole="button"
                    style={[
                      styles.pauseCard,
                      { backgroundColor: theme.brandSoft, borderColor: theme.brand },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather name="bell-off" size={20} color={theme.brand} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...TYPE.label, color: theme.text }}>{copy.pauseTitle}</Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>{copy.pauseBody}</Text>
                      </View>
                      {pausing && <ActivityIndicator size="small" color={theme.brand} />}
                    </View>
                  </PressableSurface>
                )}

                {reasons.length > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ ...TYPE.label, color: theme.text }}>{copy.reasonsTitle}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {reasons.map((reason) => {
                      const selected = selectedReason === reason.id;
                      return (
                        <PressableSurface
                          key={reason.id}
                          haptic="selection"
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedReason(selected ? '' : reason.id)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected ? theme.brandSoft : theme.cardSoft,
                              borderColor: selected ? theme.brand : theme.borderSoft,
                            },
                          ]}
                        >
                          <Text style={{ ...TYPE.caption, color: selected ? theme.brandStrong : theme.text }}>
                            {deletionReasonLabel(copy, reason.id, reason.label)}
                          </Text>
                        </PressableSurface>
                      );
                    })}
                  </View>
                  {selectedReasonNeedsDetails && (
                    <TextInput
                      value={otherReason}
                      onChangeText={setOtherReason}
                      placeholder={copy.otherPlaceholder}
                      placeholderTextColor={theme.dim}
                      maxLength={120}
                      accessibilityLabel={copy.otherPlaceholder}
                      style={[
                        styles.otherInput,
                        { backgroundColor: theme.cardSoft, borderColor: theme.border, color: theme.text },
                      ]}
                    />
                  )}
                </View>
                )}

                <View style={{ gap: 10, marginTop: 4 }}>
                  <Button label={copy.stay} variant="primary" onPress={onClose} />
                  <Button label={copy.proceedFinal} variant="ghost" onPress={() => handleNextStep(4)} />
                </View>
              </View>
            )}

            {/* STEP 4: Final Safeguard & Schedule */}
            {step === 4 && (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ ...TYPE.cardHeading, color: COLORS.danger }}>{copy.step4Title}</Text>
                  <Text style={{ ...TYPE.body, color: theme.dim }}>
                    {copy.step4Before}<Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.text }}>DELETE</Text>{copy.step4After}
                  </Text>
                </View>

                <TextInput
                  value={confirmInput}
                  onChangeText={setConfirmInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="DELETE"
                  placeholderTextColor={theme.dim}
                  accessibilityLabel={`${copy.step4Before}DELETE${copy.step4After}`}
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
                  <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1, lineHeight: 18 }}>{copy.finalNote}</Text>
                </View>

                <View style={{ gap: 10, marginTop: 6 }}>
                  <PressableSurface
                    haptic="none"
                    disabled={confirmInput.trim().toUpperCase() !== 'DELETE' || submitting}
                    onPress={handleFinalSubmit}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: confirmInput.trim().toUpperCase() !== 'DELETE' || submitting, busy: submitting }}
                    accessibilityLabel={copy.scheduleButton}
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
                      <Text style={{ ...TYPE.label, fontSize: 14.5, color: COLORS.onMediaWhite }}>{copy.scheduleButton}</Text>
                    )}
                  </PressableSurface>

                  <Button label={copy.neverMind} variant="ghost" onPress={onClose} />
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
