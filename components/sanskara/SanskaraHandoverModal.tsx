import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
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

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { describeFailure } from '@/lib/user-facing-error';
import { acceptResultMessage } from '@/lib/sanskaraHandoverCopy';
import { EARLY_ACCEPTED_MESSAGE } from '@/lib/sanskaraEarlyHandover';
import type { AcceptedHandoverCode } from '@/lib/sanskara';
import { SanskaraBirthDateCard } from '@/components/sanskara/SanskaraBirthDateCard';

export interface SanskaraHandoverModalProps {
  visible: boolean;
  mode: 'start' | 'accept';
  subjectId?: string;
  dependentName?: string;
  /** The signed-in person; the date-of-birth card (early hand-over) is offered only with it. */
  userId?: string;
  onClose: () => void;
  onStartClaim?: (subjectId: string) => Promise<{ claim_id: string; expires_at: string; token?: string }>;
  onCancelClaim?: (subjectId: string) => Promise<void>;
  onAcceptClaim?: (token: string) => Promise<AcceptedHandoverCode>;
}

export function SanskaraHandoverModal({
  visible,
  mode,
  subjectId,
  dependentName,
  userId,
  onClose,
  onStartClaim,
  onCancelClaim,
  onAcceptClaim,
}: SanskaraHandoverModalProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleClose = () => {
    setTokenInput('');
    setGeneratedToken(null);
    setTokenExpiresAt(null);
    setCopied(false);
    setResultMessage(null);
    onClose();
  };

  const handleStartClaim = useCallback(async () => {
    if (!subjectId || !onStartClaim) return;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await onStartClaim(subjectId);
      if (res.token) {
        setGeneratedToken(res.token);
        setTokenExpiresAt(res.expires_at);
      }
    } catch (e: any) {
      Alert.alert('Hand-over Failed', describeFailure(e, 'Could not initiate hand-over token.'));
    } finally {
      setLoading(false);
    }
  }, [subjectId, onStartClaim]);

  const handleCopyToken = () => {
    if (!generatedToken) return;
    Clipboard.setString(generatedToken);
    setCopied(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAcceptClaim = useCallback(async () => {
    const cleanToken = tokenInput.trim().toLowerCase();
    if (!cleanToken || cleanToken.length !== 64) {
      Alert.alert('Invalid Token', 'Please enter a valid 64-character hand-over code.');
      return;
    }
    if (!onAcceptClaim) return;

    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const result = await onAcceptClaim(cleanToken);
      setResultMessage(result.kind === 'early' ? EARLY_ACCEPTED_MESSAGE : acceptResultMessage(result));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('Transfer Failed', describeFailure(e, 'Could not accept this code. Check the code. If a parent or guardian started this hand-over before you turned 18, your date of birth must also be saved in your profile and be the one they recorded. Then try again.'));
    } finally {
      setLoading(false);
    }
  }, [tokenInput, onAcceptClaim]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.sheetContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <Text style={[styles.title, { color: theme.text }]}>
                {mode === 'start' ? 'Hand-over at 18' : 'Claim Sacred Timeline'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.dim }]}>
                {mode === 'start'
                  ? `Transition ${dependentName || 'child’s'} milestones to their adult account`
                  : 'Enter the 64-character hand-over code from your parent or guardian'}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
              accessibilityLabel="Close hand-over modal"
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {mode === 'start' ? (
              generatedToken ? (
                <View style={styles.tokenContainer}>
                  <View style={[styles.warningBox, { backgroundColor: theme.brandSoft, borderColor: theme.borderSoft }]}>
                    <Feather name="alert-triangle" size={16} color={theme.brand} />
                    <Text style={[styles.warningText, { color: theme.text }]}>
                      This code is shown only once now. Share it privately with the adult child. It will never be displayed again.
                    </Text>
                  </View>

                  <View style={[styles.codeBox, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                    <Text selectable style={[styles.codeText, { color: theme.brand }]}>
                      {generatedToken}
                    </Text>
                  </View>

                  {tokenExpiresAt ? (
                    <Text style={[styles.expiresText, { color: theme.dim }]}>
                      Expires: {tokenExpiresAt.slice(0, 10)}
                    </Text>
                  ) : null}

                  <PressableSurface
                    onPress={handleCopyToken}
                    style={[styles.copyButton, { backgroundColor: theme.brand }]}
                  >
                    <Feather name={copied ? 'check' : 'copy'} size={14} color={theme.textOnBrand} />
                    <Text style={[styles.copyButtonText, { color: theme.textOnBrand }]}>
                      {copied ? 'Copied to Clipboard' : 'Copy Hand-over Code'}
                    </Text>
                  </PressableSurface>
                </View>
              ) : (
                <View style={styles.infoContainer}>
                  <Text style={[styles.infoText, { color: theme.text }]}>
                    When a child turns 18, their guardian becomes a former manager with read-only view. Starting hand-over generates a secure single-use code that allows the young adult to claim their complete milestone history into their own personal account.
                  </Text>
                  <PressableSurface
                    onPress={handleStartClaim}
                    disabled={loading}
                    style={[styles.primaryButton, { backgroundColor: theme.brand }]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={theme.textOnBrand} />
                    ) : (
                      <>
                        <Feather name="key" size={15} color={theme.textOnBrand} />
                        <Text style={[styles.primaryButtonText, { color: theme.textOnBrand }]}>
                          Generate One-Time Hand-over Code
                        </Text>
                      </>
                    )}
                  </PressableSurface>
                </View>
              )
            ) : resultMessage ? (
              <View style={styles.successContainer}>
                <Feather name="check-circle" size={32} color={COLORS.success} />
                <Text style={[styles.successText, { color: theme.text }]}>{resultMessage}</Text>
                <PressableSurface
                  onPress={handleClose}
                  style={[styles.primaryButton, { backgroundColor: theme.brand, marginTop: 12 }]}
                >
                  <Text style={[styles.primaryButtonText, { color: theme.textOnBrand }]}>Done</Text>
                </PressableSurface>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                {mode === 'accept' && userId ? <SanskaraBirthDateCard key={userId} userId={userId} /> : null}
                <Text style={[styles.inputLabel, { color: theme.dim }]}>Hand-over Token (64 characters)</Text>
                <TextInput
                  value={tokenInput}
                  onChangeText={setTokenInput}
                  placeholder="Paste 64-character token"
                  placeholderTextColor={theme.dim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  numberOfLines={2}
                  style={[styles.tokenInput, { color: theme.text, backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                />
                <PressableSurface
                  onPress={handleAcceptClaim}
                  disabled={loading || tokenInput.trim().length !== 64}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: tokenInput.trim().length === 64 ? theme.brand : theme.borderSoft,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.textOnBrand} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: theme.textOnBrand }]}>
                      Claim Timeline
                    </Text>
                  )}
                </PressableSurface>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderTopWidth: 1,
    paddingBottom: 24,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleColumn: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollBody: {
    maxHeight: 440,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  infoContainer: {
    gap: 16,
  },
  infoText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADII.pill,
    minHeight: MIN_TOUCH_TARGET,
  },
  primaryButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  tokenContainer: {
    gap: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  codeBox: {
    padding: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  expiresText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADII.pill,
    minHeight: MIN_TOUCH_TARGET,
  },
  copyButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  inputContainer: {
    gap: 10,
  },
  inputLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  tokenInput: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    minHeight: 56,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  successText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
