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
  resolveJapaReminderPromptAction,
} from '@/lib/contextualNotificationPrompt';

type Props = {
  userId: string;
  reminderEnabled: boolean | null;
  onConfigureReminder: () => void;
};

export function ContextualJapaReminderPrompt({ userId, reminderEnabled, onConfigureReminder }: Props) {
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

  const action = resolveJapaReminderPromptAction(reminderEnabled, permission);
  const eligible = action !== null;

  useEffect(() => {
    let active = true;
    if (!eligible) {
      setVisible(false);
      return () => { active = false; };
    }
    void claimContextualReminderPrompt(userId, 'japa').then((claimed) => {
      if (active && claimed) setVisible(true);
    });
    return () => { active = false; };
  }, [eligible, userId]);

  if (!visible || !action) return null;

  const copy = action === 'configure'
    ? {
        title: 'Keep your Japa practice close',
        body: 'Choose a time for a gentle daily reminder. You can change or switch it off whenever you like.',
        cta: 'Set a reminder',
      }
    : action === 'open_settings'
      ? {
          title: 'Your Japa reminder is paused',
          body: 'Notifications are blocked by your device. Turn them back on in device settings to receive the reminder you chose.',
          cta: 'Open device settings',
        }
      : {
          title: 'Your Japa reminder is ready',
          body: 'Allow notifications on this device to receive the daily reminder you chose.',
          cta: 'Allow notifications',
        };

  const handleAction = async () => {
    if (busy) return;
    if (action === 'configure') {
      setVisible(false);
      onConfigureReminder();
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
      const nextPermission = await getNotificationPermissionState();
      setPermission(nextPermission);
      if (nextPermission === 'granted') setVisible(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      tone="auto"
      accessibilityLabel="Japa reminder suggestion"
      style={{
        backgroundColor: theme.cardSoft,
        borderColor: theme.premiumBorder,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: 16, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="bell" size={18} color={theme.brand} />
        </View>
        <View style={{ flex: 1, gap: 3, paddingTop: 2 }}>
          <Text style={{ ...TYPE.label, color: theme.text }}>{copy.title}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.body}</Text>
        </View>
        <PressableSurface
          haptic="none"
          accessibilityLabel="Dismiss Japa reminder suggestion"
          onPress={() => setVisible(false)}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 }}
        >
          <Feather name="x" size={17} color={theme.dim} />
        </PressableSurface>
      </View>
      <Button
        label={copy.cta}
        size="sm"
        loading={busy}
        onPress={() => { void handleAction(); }}
        style={{ alignSelf: 'flex-start' }}
      />
      {action === 'open_settings' ? (
        <Text style={{ ...TYPE.caption, color: isDark ? COLORS.textDimDark : COLORS.textDimLight }}>
          Shoonaya only sends the reminders you enable in Settings.
        </Text>
      ) : null}
    </Card>
  );
}
