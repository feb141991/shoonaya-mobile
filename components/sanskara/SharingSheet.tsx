import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { describeFailure } from '@/lib/user-facing-error';
import type { SanskaraAccess } from '@/lib/sanskara';
import type { KulMember } from '@/lib/kul';

export interface SharingSheetProps {
  visible: boolean;
  subjectId: string;
  recordId: string | null;
  recordTitle?: string | null;
  kulMembers?: KulMember[];
  currentUserId: string;
  accessList: SanskaraAccess[];
  loadingAccess?: boolean;
  onClose: () => void;
  onGrantView: (params: { subjectId: string; recordId: string | null; granteeId: string }) => Promise<void>;
  onRevokeGrant: (grantId: string) => Promise<void>;
}

export function SharingSheet({
  visible,
  subjectId,
  recordId,
  recordTitle,
  kulMembers = [],
  currentUserId,
  accessList,
  loadingAccess,
  onClose,
  onGrantView,
  onRevokeGrant,
}: SharingSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [sharing, setSharing] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Filter members eligible to share with (not self)
  const eligibleMembers = kulMembers.filter((m) => m.userId !== currentUserId);

  // Grants for this record or whole timeline
  const activeGrants = accessList.filter((a) => {
    if (!recordId) return a.scope === 'timeline';
    return a.record_id === recordId || a.scope === 'timeline';
  });

  const handleGrant = useCallback(
    async (member: KulMember) => {
      setSharing(member.userId);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      try {
        await onGrantView({
          subjectId,
          recordId,
          granteeId: member.userId,
        });
      } catch (e: any) {
        Alert.alert('Sharing Failed', describeFailure(e, 'Could not grant access to this member.'));
      } finally {
        setSharing(null);
      }
    },
    [subjectId, recordId, onGrantView],
  );

  const handleRevoke = useCallback(
    async (grant: SanskaraAccess) => {
      setRevoking(grant.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      try {
        await onRevokeGrant(grant.id);
      } catch (e: any) {
        Alert.alert('Revocation Failed', describeFailure(e, 'Could not revoke access.'));
      } finally {
        setRevoking(null);
      }
    },
    [onRevokeGrant],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
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
              <Text style={[styles.title, { color: theme.text }]}>Kul Family Sharing</Text>
              <Text style={[styles.subtitle, { color: theme.dim }]}>
                {recordTitle ? `Share "${recordTitle}" with your family circle` : 'Share sacred milestones with your Kul'}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
              accessibilityLabel="Close sharing sheet"
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Privacy notice */}
            <View style={[styles.privacyBox, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}>
              <Feather name="shield" size={14} color={theme.brand} />
              <Text style={[styles.privacyText, { color: theme.dim }]}>
                Only members of your current Kul family can be granted access. Personal private notes and sensitive dates remain completely private.
              </Text>
            </View>

            {/* Currently Shared */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: theme.brand }]}>CURRENTLY SHARED WITH</Text>

              {loadingAccess ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.brand} />
                </View>
              ) : activeGrants.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.dim }]}>
                  Not shared with anyone yet. Select a member below to share.
                </Text>
              ) : (
                <View style={styles.grantList}>
                  {activeGrants.map((grant) => (
                    <View
                      key={grant.id}
                      style={[styles.grantItem, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
                    >
                      <View style={styles.grantInfo}>
                        <Text style={[styles.granteeName, { color: theme.text }]}>
                          {grant.grantee.full_name || grant.grantee.username || 'Kul Member'}
                        </Text>
                        <Text style={[styles.grantScope, { color: theme.dim }]}>
                          {grant.scope === 'timeline' ? 'Whole timeline' : 'This milestone only'}
                        </Text>
                      </View>
                      <PressableSurface
                        onPress={() => handleRevoke(grant)}
                        disabled={revoking === grant.id}
                        style={[styles.revokeButton, { borderColor: theme.borderSoft }]}
                      >
                        {revoking === grant.id ? (
                          <ActivityIndicator size="small" color={COLORS.danger} />
                        ) : (
                          <Text style={[styles.revokeText, { color: COLORS.danger }]}>Revoke</Text>
                        )}
                      </PressableSurface>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Available Kul Members */}
            {eligibleMembers.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionHeading, { color: theme.brand }]}>SHARE WITH KUTUMB MEMBER</Text>
                <View style={styles.memberList}>
                  {eligibleMembers.map((member) => {
                    const isAlreadyGranted = activeGrants.some((g) => g.grantee.id === member.userId);
                    return (
                      <View
                        key={member.id}
                        style={[styles.memberItem, { backgroundColor: theme.cardSoft, borderColor: theme.borderSoft }]}
                      >
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, { color: theme.text }]}>
                            {member.profile?.full_name || member.profile?.username || 'Kutumb Member'}
                          </Text>
                          <Text style={[styles.memberRole, { color: theme.dim }]}>
                            {member.role ? `${member.role.toUpperCase()} · ` : ''}Joined {member.joinedAt?.slice(0, 10)}
                          </Text>
                        </View>
                        {isAlreadyGranted ? (
                          <View style={styles.sharedBadge}>
                            <Feather name="check" size={13} color={COLORS.success} />
                            <Text style={[styles.sharedBadgeText, { color: COLORS.success }]}>Shared</Text>
                          </View>
                        ) : (
                          <PressableSurface
                            onPress={() => handleGrant(member)}
                            disabled={sharing === member.userId}
                            style={[styles.shareButton, { backgroundColor: theme.brand }]}
                          >
                            {sharing === member.userId ? (
                              <ActivityIndicator size="small" color={theme.textOnBrand} />
                            ) : (
                              <>
                                <Feather name="user-plus" size={13} color={theme.textOnBrand} />
                                <Text style={[styles.shareButtonText, { color: theme.textOnBrand }]}>Share</Text>
                              </>
                            )}
                          </PressableSurface>
                        )}
                      </View>
                    );
                  })}
                </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  privacyText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  grantList: {
    gap: 8,
  },
  grantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  grantInfo: {
    flex: 1,
    marginRight: 8,
  },
  granteeName: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  grantScope: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    marginTop: 2,
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  revokeText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  memberList: {
    gap: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  memberInfo: {
    flex: 1,
    marginRight: 8,
  },
  memberName: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  memberRole: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    marginTop: 2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    minHeight: MIN_TOUCH_TARGET,
  },
  shareButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sharedBadgeText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
});
