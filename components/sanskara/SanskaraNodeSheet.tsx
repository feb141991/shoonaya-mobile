import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { DatePickerField } from '@/components/ui/DatePickerField';
import type { SanskaraRecord } from '@/lib/sanskara';
import { SANSKARA_REMINDERS_LIVE } from '@/lib/sanskara';

export interface SanskaraNodeSheetProps {
  record: SanskaraRecord | null;
  subjectId: string;
  visible: boolean;
  editable: boolean;
  isManagedChild?: boolean;
  onClose: () => void;
  onSaveRecord?: (params: { customTitle?: string | null; plannedDate?: string | null; expectedVersion: number }) => Promise<void>;
  onSavePrivate?: (params: { notes?: string | null; location?: string | null; performedBy?: string | null; expectedDueDate?: string | null; expectedVersion: number }) => Promise<void>;
  onSetCompletion?: (params: { completedDate: string | null; expectedVersion: number }) => Promise<void>;
  onDeleteRecord?: () => Promise<void>;
  onOpenSharing?: () => void;
}

export function SanskaraNodeSheet({
  record,
  visible,
  editable,
  isManagedChild,
  onClose,
  onSaveRecord,
  onSavePrivate,
  onSetCompletion,
  onDeleteRecord,
  onOpenSharing,
}: SanskaraNodeSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [customTitle, setCustomTitle] = useState('');
  const [plannedDate, setPlannedDate] = useState<string | null>(null);
  const [completionDate, setCompletionDate] = useState<string | null>(null);

  // Private fields
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [expectedDueDate, setExpectedDueDate] = useState<string | null>(null);

  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPrivate, setSavingPrivate] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (record) {
      setCustomTitle(record.custom_title ?? '');
      setPlannedDate(record.planned_date);
      setCompletionDate(record.completed_date ?? new Date().toISOString().slice(0, 10));

      setNotes(record.private?.notes ?? '');
      setLocation(record.private?.location ?? '');
      setPerformedBy(record.private?.performed_by ?? '');
      setExpectedDueDate(record.private?.expected_due_date ?? null);
    }
  }, [record]);

  const handleSaveDetails = useCallback(async () => {
    if (!record || !onSaveRecord) return;
    setSavingDetails(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await onSaveRecord({
        customTitle: customTitle.trim() || null,
        plannedDate: plannedDate || null,
        expectedVersion: record.version,
      });
    } catch {
      // non-blocking
    } finally {
      setSavingDetails(false);
    }
  }, [record, customTitle, plannedDate, onSaveRecord]);

  const handleSavePrivate = useCallback(async () => {
    if (!record || !onSavePrivate) return;
    setSavingPrivate(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await onSavePrivate({
        notes: notes.trim() || null,
        location: location.trim() || null,
        performedBy: performedBy.trim() || null,
        expectedDueDate: !isManagedChild ? expectedDueDate : null,
        expectedVersion: record.private?.version ?? 0,
      });
    } catch {
      // non-blocking
    } finally {
      setSavingPrivate(false);
    }
  }, [record, notes, location, performedBy, expectedDueDate, isManagedChild, onSavePrivate]);

  const handleToggleCompletion = useCallback(async () => {
    if (!record || !onSetCompletion) return;
    setSavingCompletion(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const nextDate = record.completed_date ? null : (completionDate || new Date().toISOString().slice(0, 10));
      await onSetCompletion({
        completedDate: nextDate,
        expectedVersion: record.version,
      });
    } catch {
      // non-blocking
    } finally {
      setSavingCompletion(false);
    }
  }, [record, completionDate, onSetCompletion]);

  const handleDelete = useCallback(() => {
    if (!onDeleteRecord) return;
    Alert.alert(
      'Delete Milestone',
      'Are you sure you want to delete this sacred milestone? This action cannot be undone and will remove all private notes and records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await onDeleteRecord();
              onClose();
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [onDeleteRecord, onClose]);

  if (!record) return null;

  const isCompleted = !!record.completed_date;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <Text style={[styles.nodeTitle, { color: theme.text }]}>
                {record.custom_title ?? 'Sacred Milestone'}
              </Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isCompleted ? 'rgba(76, 175, 80, 0.12)' : theme.brandSoft,
                      borderColor: isCompleted ? COLORS.success : theme.borderSoft,
                    },
                  ]}
                >
                  <Feather
                    name={isCompleted ? 'check-circle' : 'clock'}
                    size={12}
                    color={isCompleted ? COLORS.success : theme.brand}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isCompleted ? COLORS.success : theme.brand },
                    ]}
                  >
                    {isCompleted ? 'Completed' : record.planned_date ? 'Planned' : 'Undated Seed'}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
              accessibilityLabel="Close detail sheet"
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Milestone Details */}
            <View style={[styles.sectionCard, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
              <Text style={[styles.sectionHeading, { color: theme.brand }]}>MILESTONE DETAILS</Text>

              {editable ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.dim }]}>Title</Text>
                  <TextInput
                    value={customTitle}
                    onChangeText={setCustomTitle}
                    placeholder="Enter milestone title"
                    placeholderTextColor={theme.dim}
                    maxLength={60}
                    style={[
                      styles.textInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                </View>
              ) : null}

              {editable ? (
                <View style={styles.inputGroup}>
                  <DatePickerField
                    label="Planned Date"
                    value={plannedDate}
                    onChangeDate={(iso) => setPlannedDate(iso)}
                    placeholder="Set planned date"
                    modalTitle="Select Planned Date"
                  />
                </View>
              ) : plannedDate ? (
                <View style={styles.readonlyRow}>
                  <Feather name="calendar" size={14} color={theme.dim} />
                  <Text style={[styles.readonlyText, { color: theme.text }]}>Planned: {plannedDate}</Text>
                </View>
              ) : null}

              {editable ? (
                <PressableSurface
                  onPress={handleSaveDetails}
                  disabled={savingDetails}
                  style={[styles.secondaryButton, { borderColor: theme.border }]}
                >
                  {savingDetails ? (
                    <ActivityIndicator size="small" color={theme.brand} />
                  ) : (
                    <Text style={[styles.secondaryButtonText, { color: theme.brand }]}>Save Details</Text>
                  )}
                </PressableSurface>
              ) : null}
            </View>

            {/* 2. Completion Status Action */}
            {editable ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                <Text style={[styles.sectionHeading, { color: isCompleted ? COLORS.success : theme.brand }]}>
                  PRACTICE COMPLETION
                </Text>

                {isCompleted ? (
                  <View style={styles.completionInfo}>
                    <View style={styles.completionRow}>
                      <Feather name="check" size={16} color={COLORS.success} />
                      <Text style={[styles.completionLabel, { color: theme.text }]}>
                        Completed on {record.completed_date}
                      </Text>
                    </View>
                    <PressableSurface
                      onPress={handleToggleCompletion}
                      disabled={savingCompletion}
                      style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      {savingCompletion ? (
                        <ActivityIndicator size="small" color={theme.dim} />
                      ) : (
                        <Text style={[styles.actionButtonText, { color: theme.dim }]}>Mark as Not Done</Text>
                      )}
                    </PressableSurface>
                  </View>
                ) : (
                  <View style={styles.completionInfo}>
                    <DatePickerField
                      label="Completed Date"
                      value={completionDate}
                      onChangeDate={(iso) => setCompletionDate(iso)}
                      placeholder="Select completion date"
                      modalTitle="When was this completed?"
                    />
                    <PressableSurface
                      onPress={handleToggleCompletion}
                      disabled={savingCompletion}
                      style={[styles.actionButton, { backgroundColor: theme.brand, borderColor: theme.brand }]}
                    >
                      {savingCompletion ? (
                        <ActivityIndicator size="small" color={theme.textOnBrand} />
                      ) : (
                        <Text style={[styles.actionButtonText, { color: theme.textOnBrand }]}>
                          Mark Completed ✓
                        </Text>
                      )}
                    </PressableSurface>
                  </View>
                )}
              </View>
            ) : null}

            {/* 3. Private Details (Only you can see this) */}
            {editable ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                <View style={styles.lockHeader}>
                  <Feather name="lock" size={14} color={theme.brand} />
                  <Text style={[styles.lockTitle, { color: theme.brand }]}>PRIVATE SACRED DETAILS</Text>
                </View>
                <Text style={[styles.lockSubtitle, { color: theme.dim }]}>Only you can see this. Never shared.</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.dim }]}>Location / Temple</Text>
                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. Kashi Vishwanath Temple, Varanasi"
                    placeholderTextColor={theme.dim}
                    maxLength={120}
                    style={[styles.textInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.dim }]}>Performed By (Acharya / Family Elder)</Text>
                  <TextInput
                    value={performedBy}
                    onChangeText={setPerformedBy}
                    placeholder="e.g. Pandit Sharma"
                    placeholderTextColor={theme.dim}
                    maxLength={120}
                    style={[styles.textInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  />
                </View>

                {!isManagedChild ? (
                  <View style={styles.inputGroup}>
                    <DatePickerField
                      label="Expected Due Date (Prenatal)"
                      value={expectedDueDate}
                      onChangeDate={(iso) => setExpectedDueDate(iso)}
                      placeholder="Optional prenatal due date"
                      modalTitle="Select Expected Due Date"
                    />
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.dim }]}>Personal Reflections & Ritual Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add personal notes, sankalpa reflections..."
                    placeholderTextColor={theme.dim}
                    multiline
                    numberOfLines={3}
                    maxLength={2000}
                    style={[styles.textArea, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  />
                </View>

                <PressableSurface
                  onPress={handleSavePrivate}
                  disabled={savingPrivate}
                  style={[styles.secondaryButton, { borderColor: theme.border }]}
                >
                  {savingPrivate ? (
                    <ActivityIndicator size="small" color={theme.brand} />
                  ) : (
                    <Text style={[styles.secondaryButtonText, { color: theme.brand }]}>Save Private Notes</Text>
                  )}
                </PressableSurface>
              </View>
            ) : null}

            {/* 4. Sharing Section */}
            {onOpenSharing && editable ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                <View style={styles.lockHeader}>
                  <Feather name="users" size={14} color={theme.brand} />
                  <Text style={[styles.sectionHeading, { color: theme.brand, marginBottom: 0 }]}>
                    KUL FAMILY SHARING
                  </Text>
                </View>
                <Text style={[styles.sharingDesc, { color: theme.dim }]}>
                  Share this milestone with specific members in your Kul. Custom milestones share their title and completion status, keeping private notes hidden.
                </Text>
                <PressableSurface
                  onPress={onOpenSharing}
                  style={[styles.secondaryButton, { borderColor: theme.brand }]}
                >
                  <Feather name="share-2" size={14} color={theme.brand} />
                  <Text style={[styles.secondaryButtonText, { color: theme.brand }]}>Manage Sharing</Text>
                </PressableSurface>
              </View>
            ) : null}

            {/* 5. Reminders Section (behind constant) */}
            {SANSKARA_REMINDERS_LIVE ? (
              <View style={[styles.sectionCard, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
                <Text style={[styles.sectionHeading, { color: theme.brand }]}>REMINDERS</Text>
              </View>
            ) : null}

            {/* 6. Delete Section */}
            {editable && onDeleteRecord ? (
              <PressableSurface
                onPress={handleDelete}
                disabled={deleting}
                style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(239, 83, 80, 0.12)' : 'rgba(211, 47, 47, 0.08)' }]}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={COLORS.danger} />
                ) : (
                  <>
                    <Feather name="trash-2" size={14} color={COLORS.danger} />
                    <Text style={[styles.deleteButtonText, { color: COLORS.danger }]}>Delete Milestone</Text>
                  </>
                )}
              </PressableSurface>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '90%',
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
  nodeTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 20,
    lineHeight: 26,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
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
    maxHeight: 520,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  sectionCard: {
    borderRadius: RADII.md,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionHeading: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: FONTS.sans,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: FONTS.sans,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readonlyText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
  },
  secondaryButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  completionInfo: {
    gap: 10,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
  },
  actionButton: {
    paddingVertical: 10,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  actionButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  lockSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  sharingDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADII.pill,
    minHeight: MIN_TOUCH_TARGET,
  },
  deleteButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
});

