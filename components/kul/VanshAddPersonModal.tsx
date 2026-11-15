import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import {
  COLORS,
  FONTS,
  MIN_TOUCH_TARGET,
  RADII,
  themeColor,
} from '@/lib/constants';
import { DatePickerField } from '@/components/ui/DatePickerField';
import type { KulFamilyMember } from '@/lib/kul';
import { STANDARD_ROLES, type StandardRole } from '@/lib/vanshRoles';

export interface VanshAddPersonModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    relationship: string;
    generation: number;
    parentId?: string | null;
    spouseId?: string | null;
    isAlive: boolean;
    dateOfBirth?: string | null;
    anniversaryDate?: string | null;
  }) => Promise<boolean | void>;
  editingMember?: KulFamilyMember | null;
  existingMembers: KulFamilyMember[];
  isDark: boolean;
}

export function VanshAddPersonModal(props: VanshAddPersonModalProps) {
  if (!props.visible) return null;
  return (
    <VanshAddPersonModalContent
      key={props.editingMember?.id ?? 'new-person'}
      {...props}
    />
  );
}

function VanshAddPersonModalContent({
  visible,
  onClose,
  onSave,
  editingMember,
  existingMembers,
  isDark,
}: VanshAddPersonModalProps) {
  const theme = themeColor(isDark);

  const [name, setName] = useState(editingMember?.name ?? '');
  const [selectedRole, setSelectedRole] = useState(() => {
    if (!editingMember) return '';
    const matchingRole = STANDARD_ROLES.find((r) => r.role === editingMember.role);
    return matchingRole ? matchingRole.role : '';
  });
  const [customRole, setCustomRole] = useState(() => {
    if (!editingMember) return '';
    const matchingRole = STANDARD_ROLES.find((r) => r.role === editingMember.role);
    return matchingRole ? '' : (editingMember.role || '');
  });
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [generation, setGeneration] = useState(editingMember?.generation ?? 3);
  const [parentId, setParentId] = useState<string | null>(editingMember?.parent_id ?? null);
  const [spouseId, setSpouseId] = useState<string | null>(editingMember?.spouse_id ?? null);
  const [isAlive, setIsAlive] = useState(editingMember ? editingMember.is_alive : true);

  // Additional Sacred Dates & Milestones section
  const [showMoreDetails, setShowMoreDetails] = useState(Boolean(editingMember));
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectRole = (item: StandardRole) => {
    setSelectedRole(item.role);
    if (item.role) {
      setCustomRole('');
      setGeneration(item.defaultGen);
    }
    setShowRoleDropdown(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const finalRole = selectedRole || customRole.trim();
    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        relationship: finalRole,
        generation,
        parentId,
        spouseId,
        isAlive,
        dateOfBirth,
        anniversaryDate,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleParents = useMemo(() => {
    return existingMembers.filter((m) => m.id !== editingMember?.id);
  }, [existingMembers, editingMember]);

  const eligibleSpouses = useMemo(() => {
    return existingMembers.filter((m) => m.id !== editingMember?.id);
  }, [existingMembers, editingMember]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Floating Pop Card Dialog */}
        <View style={[styles.popCard, { backgroundColor: theme.card, borderColor: theme.brand, shadowColor: theme.brand }]}>
          {/* Pop Card Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitles}>
              <View style={styles.badgeRow}>
                <View style={[styles.omBadge, { backgroundColor: theme.brandSoft }]}>
                  <Text style={[styles.omText, { color: theme.brand }]}>ॐ</Text>
                </View>
                <Text style={[styles.kickerText, { color: theme.dim }]}>
                  {editingMember ? 'EDIT RECORD' : 'KUTUMB VANSH'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, { color: theme.text, fontFamily: FONTS.serifBold }]} numberOfLines={1}>
                {editingMember ? 'Edit Family Record' : 'Add Family Member'}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Close add person card"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color={theme.dim} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ── Section 1: Quick Core Info ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.brand, fontFamily: FONTS.sansSemiBold }]}>
                1. Core Lineage Details
              </Text>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.dim }]}>Full Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Pt. Ramdas Sharma"
                placeholderTextColor={theme.dim}
                style={[styles.textInput, { backgroundColor: theme.cardSoft, borderColor: name.trim() ? theme.brand : theme.border, color: theme.text }]}
                maxLength={80}
                accessibilityLabel="Family member's full name"
              />
            </View>

            {/* Relationship / Role Dropdown Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.dim }]}>Relationship / Role *</Text>
              <Pressable
                onPress={() => setShowRoleDropdown((v) => !v)}
                style={[styles.dropdownButton, { backgroundColor: theme.cardSoft, borderColor: (selectedRole || customRole) ? theme.brand : theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Choose relationship role"
              >
                <Text style={[styles.dropdownText, { color: (selectedRole || customRole) ? theme.text : theme.dim, fontFamily: (selectedRole || customRole) ? FONTS.sansSemiBold : FONTS.sans }]} numberOfLines={1}>
                  {selectedRole || customRole || 'Select relationship (e.g. Father, Mother…)'}
                </Text>
                <Feather name={showRoleDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={theme.dim} />
              </Pressable>

              {/* Dropdown Menu Overlay */}
              {showRoleDropdown ? (
                <View style={[styles.dropdownMenu, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {STANDARD_ROLES.map((item) => {
                      const isSelected = selectedRole === item.role;
                      return (
                        <Pressable key={item.label} onPress={() => handleSelectRole(item)} style={[styles.dropdownItem, isSelected && { backgroundColor: theme.brandSoft }]}>
                          <Text style={[styles.dropdownItemText, { color: isSelected ? theme.brand : theme.text, fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sans }]}>
                            {item.hindi} · {item.label}
                          </Text>
                          {isSelected ? <Feather name="check" size={14} color={theme.brand} /> : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {selectedRole === '' && (
                <TextInput
                  value={customRole}
                  onChangeText={setCustomRole}
                  placeholder="Specify custom role (e.g. Mentor, Elder…)"
                  placeholderTextColor={theme.dim}
                  style={[styles.textInput, { marginTop: 6, backgroundColor: theme.cardSoft, borderColor: theme.border, color: theme.text }]}
                  maxLength={50}
                />
              )}
            </View>

            {/* Lineage Generation Tier */}
            <View style={styles.inputGroup}>
              <View style={styles.tierHeaderRow}>
                <Text style={[styles.inputLabel, { color: theme.dim }]}>Generational Tier</Text>
                <Text style={[styles.tierHeaderHint, { color: theme.brand }]}>
                  {generation === 1
                    ? 'Grandparents & earlier'
                    : generation === 2
                    ? 'Parents generation'
                    : generation === 3
                    ? 'Self & contemporaries'
                    : 'Children generation'}
                </Text>
              </View>
              <View style={styles.pillRow}>
                {[
                  { gen: 1, label: 'Gen 1', desc: 'पूर्वज (Grandparents+)' },
                  { gen: 2, label: 'Gen 2', desc: 'माता-पिता' },
                  { gen: 3, label: 'Gen 3', desc: 'आप / समकालीन' },
                  { gen: 4, label: 'Gen 4', desc: 'नवीन पीढ़ी' },
                ].map((tier) => {
                  const isActive = generation === tier.gen;
                  return (
                    <Pressable
                      key={tier.gen}
                      onPress={() => setGeneration(tier.gen)}
                      style={[styles.genPill, { backgroundColor: isActive ? theme.brand : theme.cardSoft, borderColor: isActive ? theme.brand : theme.border }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`${tier.label}: ${tier.gen === 1 ? 'पूर्वज (Grandparents & earlier)' : tier.desc}`}
                    >
                      <Text style={[styles.genPillTitle, { color: isActive ? COLORS.darkBg : theme.text }]}>{tier.label}</Text>
                      <Text style={[styles.genPillDesc, { color: isActive ? COLORS.darkBg : theme.dim }]} numberOfLines={1}>{tier.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.tierExplanation, { color: theme.dim }]}>
                {generation === 1
                  ? 'Gen 1: पूर्वज represents grandparents & earlier ancestors (दादा-दादी, नाना-नानी व पूर्वज).'
                  : generation === 2
                  ? 'Gen 2: माता-पिता represents parents, uncles & aunts (माता, पिता, ताऊ, चाचा, मामा, मौसी).'
                  : generation === 3
                  ? 'Gen 3: आप represents you, spouse, siblings & cousins (स्वयं, जीवनसाथी, भाई, बहन).'
                  : 'Gen 4: नवीन पीढ़ी represents children & descendants (पुत्र, पुत्री, भांजा, भतीजा).'}
              </Text>
            </View>

            {/* Status: Living vs Smriti */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.dim }]}>Living / Smriti Status</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setIsAlive(true)}
                  style={[styles.toggleBtn, { backgroundColor: isAlive ? theme.brandSoft : theme.cardSoft, borderColor: isAlive ? theme.brand : theme.border }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isAlive }}
                >
                  <View style={[styles.statusDot, { backgroundColor: COLORS.tileGreen }]} />
                  <Text style={[styles.toggleText, { color: isAlive ? theme.text : theme.dim, fontFamily: isAlive ? FONTS.sansSemiBold : FONTS.sans }]}>Living Member</Text>
                </Pressable>

                <Pressable
                  onPress={() => setIsAlive(false)}
                  style={[styles.toggleBtn, { backgroundColor: !isAlive ? theme.brandSoft : theme.cardSoft, borderColor: !isAlive ? theme.brand : theme.border }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !isAlive }}
                >
                  <Text style={{ fontSize: 13, marginRight: 4 }}>🪔</Text>
                  <Text style={[styles.toggleText, { color: !isAlive ? theme.text : theme.dim, fontFamily: !isAlive ? FONTS.sansSemiBold : FONTS.sans }]}>Smriti (Memorial)</Text>
                </Pressable>
              </View>
            </View>

            {/* Parent & Spouse Links */}
            {eligibleParents.length > 0 ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.dim }]}>Parent in Family Tree (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  <Pressable
                    onPress={() => setParentId(null)}
                    style={[styles.chip, { backgroundColor: parentId === null ? theme.brand : theme.cardSoft, borderColor: parentId === null ? theme.brand : theme.border }]}
                  >
                    <Text style={{ color: parentId === null ? COLORS.darkBg : theme.text, fontSize: 11.5 }}>None</Text>
                  </Pressable>
                  {eligibleParents.map((p) => {
                    const isSelected = parentId === p.id;
                    return (
                      <Pressable
                        key={`parent-${p.id}`}
                        onPress={() => setParentId(p.id)}
                        style={[styles.chip, { backgroundColor: isSelected ? theme.brand : theme.cardSoft, borderColor: isSelected ? theme.brand : theme.border }]}
                      >
                        <Text style={{ color: isSelected ? COLORS.darkBg : theme.text, fontSize: 11.5 }}>{p.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {eligibleSpouses.length > 0 ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.dim }]}>Spouse / Partner Link (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  <Pressable
                    onPress={() => setSpouseId(null)}
                    style={[styles.chip, { backgroundColor: spouseId === null ? theme.brand : theme.cardSoft, borderColor: spouseId === null ? theme.brand : theme.border }]}
                  >
                    <Text style={{ color: spouseId === null ? COLORS.darkBg : theme.text, fontSize: 11.5 }}>None</Text>
                  </Pressable>
                  {eligibleSpouses.map((s) => {
                    const isSelected = spouseId === s.id;
                    return (
                      <Pressable
                        key={`spouse-${s.id}`}
                        onPress={() => setSpouseId(s.id)}
                        style={[styles.chip, { backgroundColor: isSelected ? theme.brand : theme.cardSoft, borderColor: isSelected ? theme.brand : theme.border }]}
                      >
                        <Text style={{ color: isSelected ? COLORS.darkBg : theme.text, fontSize: 11.5 }}>{s.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* ── Section 2: Expandable Dates & Celebrations ── */}
            <Pressable
              onPress={() => setShowMoreDetails((v) => !v)}
              style={[styles.expandableToggle, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}
              accessibilityRole="button"
              accessibilityLabel="Toggle sacred dates section"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="calendar" size={15} color={theme.brand} />
                <Text style={[styles.expandableTitle, { color: theme.brand, fontFamily: FONTS.sansSemiBold }]}>
                  {showMoreDetails ? '2. Sacred Dates & Milestones' : '+ Add Dates (DOB, Anniversary)'}
                </Text>
              </View>
              <Feather name={showMoreDetails ? 'chevron-up' : 'chevron-down'} size={16} color={theme.dim} />
            </Pressable>

            {showMoreDetails ? (
              <View style={[styles.datesCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                {/* Date of Birth */}
                <View style={{ gap: 4 }}>
                  <Text style={[styles.dateFieldLabel, { color: theme.text }]}>Date of Birth (DOB)</Text>
                  <DatePickerField placeholder="Choose Date of Birth" value={dateOfBirth} onChangeDate={setDateOfBirth} modalTitle="Select Date of Birth" />
                  <Text style={[styles.dateHint, { color: theme.dim }]}>
                    Automatically adds recurring birthday observance to your Kutumb calendar.
                  </Text>
                </View>

                {/* Wedding Anniversary */}
                <View style={{ gap: 4, marginTop: 10 }}>
                  <Text style={[styles.dateFieldLabel, { color: theme.text }]}>Marriage / Wedding Anniversary</Text>
                  <DatePickerField placeholder="Choose Anniversary Date" value={anniversaryDate} onChangeDate={setAnniversaryDate} modalTitle="Select Wedding Anniversary" />
                  <Text style={[styles.dateHint, { color: theme.dim }]}>
                    Preserves annual anniversary celebration in sacred family reminders.
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
            <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: theme.border }]} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={[styles.cancelBtnText, { color: theme.dim }]}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={submitting || !name.trim()}
              style={[
                styles.saveBtn,
                { backgroundColor: name.trim() ? theme.brand : theme.border, opacity: submitting || !name.trim() ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save family member"
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.darkBg} />
              ) : (
                <Text style={[styles.saveBtnText, { color: COLORS.darkBg, fontFamily: FONTS.sansSemiBold }]}>
                  {editingMember ? 'Save Changes' : 'Add to Lineage'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.familyModalScrim },
  popCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: RADII.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitles: { flex: 1, marginRight: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  omBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  omText: { fontSize: 10, fontFamily: FONTS.serifBold },
  kickerText: { fontSize: 9.5, fontFamily: FONTS.sansSemiBold, letterSpacing: 0.8 },
  headerTitle: { fontSize: 18, lineHeight: 24 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },
  formScroll: { maxHeight: 460 },
  formContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.5 },
  inputGroup: { gap: 5 },
  inputLabel: { fontSize: 11.5, fontFamily: FONTS.sansMedium },
  textInput: { minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.md, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, fontFamily: FONTS.sans },
  dropdownButton: { minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.md, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 13.5, flex: 1, marginRight: 8 },
  dropdownMenu: { borderRadius: RADII.md, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, minHeight: 38 },
  dropdownItemText: { fontSize: 12.5, flex: 1 },
  pillRow: { flexDirection: 'row', gap: 6 },
  tierHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tierHeaderHint: { fontSize: 10, fontFamily: FONTS.sansMedium },
  tierExplanation: { fontSize: 11, fontFamily: FONTS.sans, lineHeight: 15, marginTop: 2 },
  genPill: { flex: 1, borderRadius: RADII.md, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  genPillTitle: { fontSize: 11.5, fontFamily: FONTS.sansSemiBold },
  genPillDesc: { fontSize: 9.5, marginTop: 1 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADII.md, borderWidth: 1, paddingHorizontal: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  toggleText: { fontSize: 12.5 },
  chipsScroll: { flexDirection: 'row', paddingVertical: 2 },
  chip: { minHeight: 32, borderRadius: RADII.pill, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  expandableToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADII.md, borderWidth: 1, marginTop: 4 },
  expandableTitle: { fontSize: 12.5 },
  datesCard: { padding: 12, borderRadius: RADII.md, borderWidth: 1, marginTop: 2 },
  dateFieldLabel: { fontSize: 12, fontFamily: FONTS.sansMedium },
  dateHint: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  cancelBtn: { minHeight: MIN_TOUCH_TARGET, minWidth: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: RADII.pill, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontFamily: FONTS.sansMedium },
  saveBtn: { minHeight: MIN_TOUCH_TARGET, minWidth: 120, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderRadius: RADII.pill },
  saveBtnText: { fontSize: 13.5 },
});
