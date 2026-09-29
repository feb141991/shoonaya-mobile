import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';
import {
  getNotificationPermissionState,
  openNotificationSettings,
  registerPushToken,
  requestNotificationPermission,
} from '@/lib/notifications';
import type { NotificationPermissionState } from '@/lib/notificationPermissionState';
import {
  claimContextualReminderPrompt,
  resolveContextualReminderPromptAction,
  type ContextualReminderFeature,
} from '@/lib/contextualNotificationPrompt';

type Props = {
  userId: string;
  feature: Exclude<ContextualReminderFeature, 'japa'>;
  reminderEnabled: boolean | null;
  title: string;
  body: string;
  settingsTitle: string;
};

export function ContextualReminderPrompt({
  userId,
  feature,
  reminderEnabled,
  title,
  body,
  settingsTitle,
}: Props) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshPermission = useCallback(async () => {
    setPermission(await getNotificationPermissionState());
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getNotificationPermissionState().then((next) => {
      if (active) setPermission(next);
    });
    return () => { active = false; };
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const action = resolveContextualReminderPromptAction(reminderEnabled, permission);
  useEffect(() => {
    let active = true;
    if (!action) {
      setVisible(false);
      return () => { active = false; };
    }
    void claimContextualReminderPrompt(userId, feature).then((claimed) => {
      if (active && claimed) setVisible(true);
    });
    return () => { active = false; };
  }, [action, feature, userId]);

  if (!visible || !action) return null;

  const cta = action === 'configure'
    ? settingsTitle
    : action === 'open_settings'
      ? 'Open device settings'
      : 'Allow notifications';

  const handlePress = async () => {
    if (busy) return;
    if (action === 'configure') {
      setVisible(false);
      router.push('/settings/notifications');
      return;
    }
    if (action === 'open_settings') {
      setVisible(false);
      await openNotificationSettings().catch(() => {});
      return;
    }
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) await registerPushToken(userId);
      const next = await getNotificationPermissionState();
      setPermission(next);
      if (next === 'granted') setVisible(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      tone="auto"
      accessibilityLabel={`${feature} reminder suggestion`}
      style={{ backgroundColor: theme.cardSoft, borderColor: theme.premiumBorder, padding: 14, gap: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: 16, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="bell" size={18} color={theme.brand} />
        </View>
        <View style={{ flex: 1, gap: 3, paddingTop: 2 }}>
          <Text style={{ ...TYPE.label, color: theme.text }}>{action === 'configure' ? title : action === 'open_settings' ? 'Notifications are paused on this device' : title}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>
            {action === 'configure'
              ? body
              : action === 'open_settings'
                ? 'Your reminder choice is saved in Shoonaya. Re-enable notifications in device settings to receive it.'
                : 'Allow notifications on this device to receive the reminder you chose.'}
          </Text>
        </View>
        <PressableSurface
          haptic="none"
          accessibilityLabel={`Dismiss ${feature} reminder suggestion`}
          onPress={() => setVisible(false)}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 }}
        >
          <Feather name="x" size={17} color={theme.dim} />
        </PressableSurface>
      </View>
      <Button label={cta} size="sm" loading={busy} onPress={() => { void handlePress(); }} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}
