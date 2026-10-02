import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

type AccountDeletionBannerProps = {
  purgeAfter: string | null;
  daysRemaining: number | null;
  onCancelDeletion: () => Promise<void>;
};

export function AccountDeletionBanner({
  purgeAfter,
  daysRemaining,
  onCancelDeletion,
}: AccountDeletionBannerProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = purgeAfter
    ? new Date(purgeAfter).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await onCancelDeletion();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel deletion.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(220, 38, 38, 0.12)' : 'rgba(220, 38, 38, 0.08)',
          borderColor: COLORS.dangerBorder,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWell,
            { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.20)' : 'rgba(220, 38, 38, 0.14)' },
          ]}
        >
          <Feather name="clock" size={16} color={COLORS.danger} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...TYPE.label, color: COLORS.danger, fontFamily: FONTS.sansSemiBold }}>
            Account Deletion Scheduled
          </Text>
          <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 18 }}>
            All notifications are silenced and your profile is unlisted. Your practice history is safely preserved in cool-off.
          </Text>
        </View>
      </View>

      {formattedDate && (
        <View style={[styles.timelineBox, { backgroundColor: theme.card, borderColor: theme.borderSoft }]}>
          <Feather name="calendar" size={13} color={theme.brand} />
          <Text style={{ ...TYPE.caption, color: theme.text, fontFamily: FONTS.sansMedium }}>
            Permanent purge on <Text style={{ color: COLORS.danger }}>{formattedDate}</Text>
            {daysRemaining !== null ? ` (${daysRemaining} days left)` : ''}
          </Text>
        </View>
      )}

      {error && (
        <Text style={{ ...TYPE.caption, color: COLORS.danger, marginTop: -4 }}>{error}</Text>
      )}

      <PressableSurface
        haptic="selection"
        disabled={cancelling}
        onPress={handleCancel}
        style={[
          styles.cancelButton,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
          },
        ]}
      >
        {cancelling ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="shield" size={14} color={COLORS.success} />
            <Text style={{ ...TYPE.label, color: theme.text, fontFamily: FONTS.sansMedium }}>
              Cancel Deletion & Restore Account
            </Text>
          </View>
        )}
      </PressableSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADII.xl,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  cancelButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADII.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
