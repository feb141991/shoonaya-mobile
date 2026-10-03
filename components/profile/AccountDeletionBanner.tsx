import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { accountDeletionCopy } from '@/lib/accountDeletionCopy';

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
  const { language } = useLanguage();
  const copy = accountDeletionCopy(language);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = purgeAfter
    ? new Date(purgeAfter).toLocaleDateString(language === 'en' ? undefined : `${language}-IN`, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const effectiveDaysRemaining =
    typeof daysRemaining === 'number'
      ? daysRemaining
      : purgeAfter
        ? Math.max(0, Math.ceil((new Date(purgeAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      await onCancelDeletion();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.cancelFailed);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: COLORS.dangerBg,
          borderColor: COLORS.dangerBorder,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWell,
            { backgroundColor: COLORS.dangerBg },
          ]}
        >
          <Feather name="clock" size={16} color={COLORS.danger} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...TYPE.label, color: COLORS.danger, fontFamily: FONTS.sansSemiBold }}>
            {copy.bannerTitle}
          </Text>
          <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 18 }}>
            {copy.bannerBody}
          </Text>
        </View>
      </View>

      {formattedDate && (
        <View style={[styles.timelineBox, { backgroundColor: theme.card, borderColor: theme.borderSoft }]}>
          <Feather name="calendar" size={13} color={theme.brand} />
          <Text style={{ ...TYPE.caption, color: theme.text, fontFamily: FONTS.sansMedium }}>
            {copy.bannerPurgeOn(formattedDate)}
            {effectiveDaysRemaining !== null ? copy.bannerDaysLeft(effectiveDaysRemaining) : ''}
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
        accessibilityRole="button"
        accessibilityLabel={copy.bannerCancel}
        accessibilityState={{ busy: cancelling, disabled: cancelling }}
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
              {copy.bannerCancel}
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
