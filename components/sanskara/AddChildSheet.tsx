import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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

import { FEATURE_COLORS, COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { describeFailure } from '@/lib/user-facing-error';
import type { KulFamilyMember } from '@/lib/kul';

export interface AddChildSheetProps {
  visible: boolean;
  kulFamilyMembers?: KulFamilyMember[];
  onClose: () => void;
  onSubmit: (params: { name: string; birthDate: string; kulFamilyMemberId?: string | null }) => Promise<void>;
}

export function AddChildSheet({
  visible,
  kulFamilyMembers = [],
  onClose,
  onSubmit,
}: AddChildSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    setName('');
    setBirthDate(null);
    setSelectedFamilyMemberId(null);
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter the child’s name.');
      return;
    }
    if (!birthDate) {
      setErrorMessage('Please select a valid birth date.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (birthDate > today) {
      setErrorMessage('Birth date cannot be in the future.');
      return;
    }
    if (birthDate < '2000-01-01') {
      setErrorMessage('Birth date must be in the year 2000 or later.');
      return;
    }

    // Check minor status (under 18)
    const [year, month, day] = birthDate.split('-').map(Number);
    const majorityDate = new Date(Date.UTC(year + 18, month - 1, day));
    if (majorityDate.toISOString().slice(0, 10) <= today) {
      setErrorMessage('Child must be under 18 years of age.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await onSubmit({
        name: trimmedName,
        birthDate,
        kulFamilyMemberId: selectedFamilyMemberId,
      });
      handleClose();
    } catch (e: any) {
      setErrorMessage(describeFailure(e, 'Could not add child timeline. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [name, birthDate, selectedFamilyMemberId, onSubmit]);

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
              <Text style={[styles.title, { color: theme.text }]}>Add Child Timeline</Text>
              <Text style={[styles.subtitle, { color: theme.dim }]}>
                Nurture and track sacred milestones for your minor child
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
              accessibilityLabel="Close add child sheet"
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {errorMessage ? (
              <View style={[styles.errorCard, { backgroundColor: FEATURE_COLORS.addChildSheet.errorCardSurface, borderColor: COLORS.danger }]}>
                <Feather name="alert-circle" size={14} color={COLORS.danger} />
                <Text style={[styles.errorText, { color: COLORS.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Child's Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.dim }]}>Child's Full Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Aarav Sharma"
                placeholderTextColor={theme.dim}
                maxLength={40}
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.cardSoft, borderColor: theme.border }]}
              />
            </View>

            {/* Birth Date */}
            <View style={styles.inputGroup}>
              <DatePickerField
                label="Date of Birth (Minor) *"
                value={birthDate}
                onChangeDate={(iso) => setBirthDate(iso)}
                placeholder="Select birth date (YYYY-MM-DD)"
                minDate="2000-01-01"
                maxDate={new Date().toISOString().slice(0, 10)}
                modalTitle="Select Child's Birth Date"
              />
              <Text style={[styles.fieldHint, { color: theme.dim }]}>
                Eligible for children born 2000 or later who are under 18 today.
              </Text>
            </View>

            {/* Family Tree Link */}
            {kulFamilyMembers.length > 0 ? (
              <View style={styles.inputGroup}>
                <View style={styles.treeLinkHeader}>
                  <Feather name="git-branch" size={13} color={theme.brand} />
                  <Text style={[styles.inputLabel, { color: theme.brand }]}>
                    Link to Family Tree Person (Optional)
                  </Text>
                </View>
                <Text style={[styles.fieldHint, { color: theme.dim, marginBottom: 8 }]}>
                  Only you see this link. Others in your Kul cannot tell.
                </Text>

                <View style={styles.memberPicker}>
                  <Pressable
                    onPress={() => setSelectedFamilyMemberId(null)}
                    style={[
                      styles.memberChip,
                      {
                        backgroundColor: selectedFamilyMemberId === null ? theme.brandSoft : theme.cardSoft,
                        borderColor: selectedFamilyMemberId === null ? theme.brand : theme.borderSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberChipText,
                        { color: selectedFamilyMemberId === null ? theme.brand : theme.dim },
                      ]}
                    >
                      None
                    </Text>
                  </Pressable>
                  {kulFamilyMembers.map((member) => {
                    const isSelected = selectedFamilyMemberId === member.id;
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => setSelectedFamilyMemberId(member.id)}
                        style={[
                          styles.memberChip,
                          {
                            backgroundColor: isSelected ? theme.brandSoft : theme.cardSoft,
                            borderColor: isSelected ? theme.brand : theme.borderSoft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.memberChipText,
                            { color: isSelected ? theme.brand : theme.text },
                          ]}
                        >
                          {member.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Submit Button */}
            <PressableSurface
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitButton, { backgroundColor: theme.brand }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.textOnBrand} />
              ) : (
                <Text style={[styles.submitButtonText, { color: theme.textOnBrand }]}>
                  Create Child Timeline
                </Text>
              )}
            </PressableSurface>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.deepModalScrim,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
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
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  fieldHint: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.sans,
  },
  treeLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  memberChipText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: MIN_TOUCH_TARGET,
  },
  submitButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
});
