import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SPACING, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import {
  describeSanskaraFailure,
  executeSanskaraWrite,
  fetchSanskaraExport,
  generateSanskaraUuid,
  purgeSanskaraExportFiles,
  type SanskaraExport,
} from '@/lib/sanskara';
import {
  DOWNLOAD_NOTE,
  EMPTY_MESSAGE,
  SHARING_UNAVAILABLE_MESSAGE,
  STALE_DELETE_MESSAGE,
  dataSubjects,
  deleteCall,
  deleteHeading,
  deleteWarning,
  confirmLabel,
  deletedMessage,
  milestoneCount,
  roleLabel,
  type DataSubject,
} from '@/lib/sanskaraData';
import { SharingUnavailableError } from '@/lib/sanskaraExportShare';
import { shareSanskaraExport } from '@/lib/sanskaraExportDevice';
import { ApiRequestError } from '@/lib/user-facing-error';

export interface SanskaraDataSheetProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
  /**
   * Something changed on the server: `deletedId` is the timeline that was deleted, or null when a delete found the timeline
   * already gone or no longer the caller's. The screen reloads and leaves a tab that no longer exists.
   */
  onChanged: (deletedId: string | null) => void;
}

/**
 * "Your Sanskāra data": see what Shoonaya holds in the tracker, download a copy, delete a timeline (AGENTS 25).
 *
 * Works without religious-data consent: the list comes from the export, which the server allows whatever the consent state,
 * and so do the two delete actions. A person who withdrew consent must still be able to take their data or remove it.
 *
 * The export holds private notes. It lives in this component's state only while the sheet is open for one signed-in identity,
 * is never written to storage by this component, and is dropped when the sheet closes or the identity changes. A response that
 * arrives after either is discarded (AGENTS 22).
 */
export function SanskaraDataSheet({ visible, userId, onClose, onChanged }: SanskaraDataSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<SanskaraExport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'download' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState<DataSubject | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Bumped whenever the sheet closes or the identity changes. Anything started under an older value is discarded.
  const leaseRef = useRef(0);
  // One request id per confirmed delete: a retry after a lost response replays the first answer instead of deleting twice.
  const requestIdRef = useRef<string | null>(null);

  const load = useCallback(async (uid: string, lease: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const exp = await fetchSanskaraExport(uid);
      if (lease !== leaseRef.current) return;
      setData(exp);
    } catch (error) {
      if (lease !== leaseRef.current) return;
      setLoadError(describeSanskaraFailure(error, 'Could not load your Sanskāra data. Please try again.'));
    } finally {
      if (lease === leaseRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    leaseRef.current += 1;
    const lease = leaseRef.current;
    requestIdRef.current = null;
    setData(null);
    setConfirming(null);
    setBusy(null);
    setActionError(null);
    setNotice(null);
    setLoadError(null);
    if (!visible || !userId) {
      setLoading(false);
      return undefined;
    }
    void load(userId, lease);
    return () => {
      leaseRef.current += 1;
    };
  }, [visible, userId, load]);

  const subjects = useMemo(() => (data ? dataSubjects(data) : []), [data]);

  const requestClose = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const handleDownload = useCallback(async () => {
    if (!data || busy) return;
    const lease = leaseRef.current;
    setBusy('download');
    setActionError(null);
    setNotice(null);
    try {
      // No "saved" message afterwards: the system share sheet is the confirmation, and whether the person saved the file
      // or cancelled is not reported back to the app.
      await shareSanskaraExport(data);
    } catch (error) {
      if (lease !== leaseRef.current) return;
      setActionError(
        error instanceof SharingUnavailableError
          ? SHARING_UNAVAILABLE_MESSAGE
          : describeSanskaraFailure(error, 'Could not prepare your download. Please try again.'),
      );
    } finally {
      if (lease === leaseRef.current) setBusy(null);
    }
  }, [data, busy]);

  const startDelete = useCallback((subject: DataSubject) => {
    requestIdRef.current = generateSanskaraUuid();
    setActionError(null);
    setNotice(null);
    setConfirming(subject);
  }, []);

  const cancelDelete = useCallback(() => {
    requestIdRef.current = null;
    setActionError(null);
    setConfirming(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!confirming || !userId || busy) return;
    const call = deleteCall(confirming);
    if (!call) return;
    const lease = leaseRef.current;
    const requestId = requestIdRef.current ?? generateSanskaraUuid();
    requestIdRef.current = requestId;
    const target = confirming;
    setBusy('delete');
    setActionError(null);
    try {
      if (call.action === 'delete-mine') await executeSanskaraWrite(userId, 'delete-mine', call.input, requestId);
      else await executeSanskaraWrite(userId, 'delete-dependent', call.input, requestId);
      if (lease !== leaseRef.current) return;
      // A copy downloaded earlier still holds what was just deleted; it goes too.
      purgeSanskaraExportFiles();
      setData((previous) => (previous ? { ...previous, subjects: previous.subjects.filter((s) => s.id !== target.id) } : previous));
      requestIdRef.current = null;
      setConfirming(null);
      setNotice(deletedMessage(target));
      onChanged(target.id);
    } catch (error) {
      if (lease !== leaseRef.current) return;
      if (error instanceof ApiRequestError && error.status === 404) {
        // Another manager deleted it first, or this person is no longer a manager. The list is stale: reload it.
        requestIdRef.current = null;
        setConfirming(null);
        setNotice(STALE_DELETE_MESSAGE);
        onChanged(null);
        void load(userId, lease);
        return;
      }
      // The confirmation stays open with the same request id, so Try again is safe.
      setActionError(describeSanskaraFailure(error, 'Could not delete this timeline. Please try again.'));
    } finally {
      if (lease === leaseRef.current) setBusy(null);
    }
  }, [confirming, userId, busy, onChanged, load]);

  const bottomPad = Math.max(insets.bottom, SPACING.lg) + SPACING.sm;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={requestClose}>
      <Pressable style={styles.overlay} onPress={requestClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: bottomPad }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text accessibilityRole="header" style={[TYPE.cardHeading, { color: theme.text }]}>
                Your Sanskāra data
              </Text>
              <Text style={[TYPE.caption, { color: theme.dim, marginTop: 2 }]}>
                What Shoonaya holds in your milestone tracker
              </Text>
            </View>
            <Pressable
              onPress={requestClose}
              disabled={busy !== null}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close your Sanskāra data"
              style={[styles.closeButton, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.centerRow} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={theme.brand} />
                <Text style={[TYPE.body, styles.fill, { color: theme.dim }]}>Loading your Sanskāra data…</Text>
              </View>
            ) : loadError ? (
              <View style={styles.block}>
                <View style={[styles.statusBox, { borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg }]}>
                  <Feather name="alert-circle" size={15} color={COLORS.danger} />
                  <Text accessibilityLiveRegion="polite" style={[TYPE.caption, styles.fill, { color: COLORS.danger }]}>
                    {loadError}
                  </Text>
                </View>
                {userId ? (
                  <PressableSurface
                    onPress={() => void load(userId, leaseRef.current)}
                    accessibilityLabel="Try loading your Sanskāra data again"
                    style={[styles.outlineButton, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}
                  >
                    <Text style={[TYPE.label, { color: theme.brand }]}>Try again</Text>
                  </PressableSurface>
                ) : null}
              </View>
            ) : data ? (
              <>
                <View style={styles.block}>
                  <Text style={[TYPE.section, { color: theme.brand }]}>Your timelines</Text>
                  {subjects.length === 0 ? (
                    <Text style={[TYPE.body, { color: theme.dim }]}>{EMPTY_MESSAGE}</Text>
                  ) : (
                    subjects.map((subject) => {
                      const isConfirming = confirming?.id === subject.id;
                      return (
                        <View
                          key={subject.id}
                          style={[
                            styles.row,
                            { backgroundColor: theme.cardSoft, borderColor: isConfirming ? COLORS.dangerBorder : theme.borderSoft },
                          ]}
                        >
                          <View style={styles.rowTop}>
                            <View style={styles.fill}>
                              <Text style={[TYPE.body, { color: theme.text, fontFamily: FONTS.sansSemiBold }]}>{subject.name}</Text>
                              <Text style={[TYPE.caption, { color: theme.dim, marginTop: 2 }]}>
                                {milestoneCount(subject.milestones)} · {roleLabel(subject)}
                              </Text>
                            </View>
                            {subject.deletable && !isConfirming ? (
                              <PressableSurface
                                onPress={() => startDelete(subject)}
                                disabled={busy !== null || confirming !== null}
                                accessibilityLabel={deleteHeading(subject).replace('?', '')}
                                style={[styles.deleteButton, { borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg }]}
                              >
                                <Feather name="trash-2" size={14} color={COLORS.danger} />
                                <Text style={[TYPE.label, { color: COLORS.danger }]}>Delete</Text>
                              </PressableSurface>
                            ) : null}
                          </View>

                          {isConfirming ? (
                            <View style={styles.confirm}>
                              <Text accessibilityRole="header" style={[TYPE.body, { color: COLORS.danger, fontFamily: FONTS.sansSemiBold }]}>
                                {deleteHeading(subject)}
                              </Text>
                              {deleteWarning(subject).map((line) => (
                                <Text key={line} style={[TYPE.body, { color: theme.text }]}>
                                  {line}
                                </Text>
                              ))}
                              <View style={styles.confirmButtons}>
                                <PressableSurface
                                  onPress={cancelDelete}
                                  disabled={busy !== null}
                                  accessibilityLabel="Keep this timeline"
                                  style={[styles.confirmButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                                >
                                  <Text style={[TYPE.label, { color: theme.text }]}>Keep it</Text>
                                </PressableSurface>
                                <PressableSurface
                                  onPress={() => void confirmDelete()}
                                  disabled={busy !== null}
                                  accessibilityLabel={confirmLabel(subject, actionError !== null)}
                                  accessibilityState={{ busy: busy === 'delete' }}
                                  style={[styles.confirmButton, { borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg }]}
                                >
                                  {busy === 'delete' ? (
                                    <ActivityIndicator size="small" color={COLORS.danger} />
                                  ) : (
                                    <Text style={[TYPE.label, { color: COLORS.danger }]}>{actionError ? 'Try again' : 'Delete forever'}</Text>
                                  )}
                                </PressableSurface>
                              </View>
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={styles.block}>
                  <Text style={[TYPE.section, { color: theme.brand }]}>Download a copy</Text>
                  <View style={[styles.statusBox, { borderColor: theme.borderSoft, backgroundColor: theme.cardSoft }]}>
                    <Feather name="shield" size={14} color={theme.brand} />
                    <Text style={[TYPE.caption, styles.fill, { color: theme.dim }]}>{DOWNLOAD_NOTE}</Text>
                  </View>
                  <PressableSurface
                    onPress={() => void handleDownload()}
                    disabled={busy !== null || subjects.length === 0}
                    accessibilityLabel="Download a copy of your Sanskāra data"
                    accessibilityState={{ busy: busy === 'download' }}
                    style={[styles.primaryButton, { backgroundColor: theme.brand }]}
                  >
                    {busy === 'download' ? (
                      <ActivityIndicator size="small" color={theme.textOnBrand} />
                    ) : (
                      <>
                        <Feather name="download" size={16} color={theme.textOnBrand} />
                        <Text style={[TYPE.body, { color: theme.textOnBrand, fontFamily: FONTS.sansSemiBold }]}>Download a copy</Text>
                      </>
                    )}
                  </PressableSurface>
                </View>
              </>
            ) : null}

            {actionError && !confirming ? (
              <View style={[styles.statusBox, { borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg }]}>
                <Feather name="alert-circle" size={15} color={COLORS.danger} />
                <Text accessibilityLiveRegion="polite" style={[TYPE.caption, styles.fill, { color: COLORS.danger }]}>
                  {actionError}
                </Text>
              </View>
            ) : null}
            {actionError && confirming ? (
              <Text accessibilityLiveRegion="polite" style={[TYPE.caption, { color: COLORS.danger }]}>
                {actionError}
              </Text>
            ) : null}
            {notice ? (
              <View style={[styles.statusBox, { borderColor: theme.borderSoft, backgroundColor: theme.cardSoft }]}>
                <Feather name="check-circle" size={15} color={COLORS.success} />
                <Text accessibilityLiveRegion="polite" style={[TYPE.caption, styles.fill, { color: theme.text }]}>
                  {notice}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bottomSheetScrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderTopWidth: 1,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
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
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  fill: {
    flex: 1,
  },
  block: {
    gap: SPACING.md,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md - 2,
    padding: SPACING.md,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  row: {
    padding: SPACING.md,
    borderRadius: RADII.sm,
    borderWidth: 1,
    gap: SPACING.md,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  confirm: {
    gap: SPACING.sm,
  },
  confirmButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  confirmButton: {
    flexGrow: 1,
    flexBasis: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
  },
});
