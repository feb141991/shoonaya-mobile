import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, SOCIAL_LINKS, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import {
  getNotificationPermissionState,
  openNotificationSettings,
  registerPushToken,
  requestNotificationPermission,
} from '@/lib/notifications';
import type { NotificationPermissionState } from '@/lib/notificationPermissionState';
import { supabase } from '@/lib/supabase';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';
import { clearAllHomeCaches } from '@/lib/homeCache';
import { clearAllOnboardingDrafts } from '@/lib/onboardingDraft';
import { SUPPORTED_APP_LANGUAGES, type AppLanguage } from '@/lib/language-runtime';

type ThemePref = 'light' | 'dark' | 'system';
export type SettingsSectionKey = 'account' | 'notifications' | 'appearance' | 'privacy' | 'about';

// Every field below already exists on `profiles` and is already read/written
// by the focused settings screens — no new backend columns introduced.
type SettingsState = {
  wants_festival_reminders: boolean;
  wants_shloka_reminders: boolean;
  wants_nitya_reminders: boolean;
  wants_community_notifications: boolean;
  wants_family_notifications: boolean;
  app_language: AppLanguage;
  transliteration_language: AppLanguage;
  meaning_language: AppLanguage;
  consent_religious_data: boolean;
};

const SETTINGS_STORAGE_KEY = 'shoonaya_mobile_settings';
const THEME_STORAGE_KEY = 'sangam_theme_preference';

const INITIAL_SETTINGS: SettingsState = {
  wants_festival_reminders: true,
  wants_shloka_reminders: true,
  wants_nitya_reminders: true,
  wants_community_notifications: true,
  wants_family_notifications: true,
  app_language: 'en',
  transliteration_language: 'en',
  meaning_language: 'en',
  consent_religious_data: false,
};

const NOTIFICATION_TOGGLES: { key: keyof SettingsState; label: string; subtitle: string }[] = [
  { key: 'wants_shloka_reminders', label: 'Daily wisdom', subtitle: 'Your daily shloka & reflection' },
  { key: 'wants_nitya_reminders', label: 'Nitya reminders', subtitle: 'Morning sadhana nudges' },
  { key: 'wants_festival_reminders', label: 'Festival reminders', subtitle: 'Vrat, tithi & observance alerts' },
  { key: 'wants_community_notifications', label: 'Community', subtitle: 'Mandali posts, reactions & connections' },
  { key: 'wants_family_notifications', label: 'Family', subtitle: 'Kul & lineage activity' },
];

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  pa: 'Punjabi',
};

const LANGUAGES = SUPPORTED_APP_LANGUAGES.map((key) => ({ key, label: LANGUAGE_LABELS[key] }));

const THEME_OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

function toSettingsState(value: Partial<SettingsState> | null | undefined): SettingsState {
  return {
    wants_festival_reminders: value?.wants_festival_reminders ?? INITIAL_SETTINGS.wants_festival_reminders,
    wants_shloka_reminders: value?.wants_shloka_reminders ?? INITIAL_SETTINGS.wants_shloka_reminders,
    wants_nitya_reminders: value?.wants_nitya_reminders ?? INITIAL_SETTINGS.wants_nitya_reminders,
    wants_community_notifications: value?.wants_community_notifications ?? INITIAL_SETTINGS.wants_community_notifications,
    wants_family_notifications: value?.wants_family_notifications ?? INITIAL_SETTINGS.wants_family_notifications,
    app_language: value?.app_language ?? INITIAL_SETTINGS.app_language,
    transliteration_language: value?.transliteration_language ?? INITIAL_SETTINGS.transliteration_language,
    meaning_language: value?.meaning_language ?? INITIAL_SETTINGS.meaning_language,
    consent_religious_data: value?.consent_religious_data ?? INITIAL_SETTINGS.consent_religious_data,
  };
}

function SettingsSection({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <SectionHeader label={label} />
      <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
        {children}
      </Card>
    </View>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onChange,
  theme,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...TYPE.label, color: theme.text }}>{label}</Text>
        {subtitle ? <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.brand }} />
    </View>
  );
}

// Button's variant system (primary/secondary/ghost) has no destructive
// variant, and primary's fixed ink/darkBg text would be near-illegible over
// a translucent danger-red wash in dark mode (near-black on near-black).
// Rather than widen Button's variant contract for one screen, this mirrors
// Button's own shape/press-feedback conventions (44dp min height, RADII.lg,
// boxShadow, haptic + opacity/scale on press) with an explicit danger
// palette so the delete action stays legible in both themes.
function DangerButton({
  label,
  loading,
  onPress,
  isDark,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const busy = !!loading;
  return (
    <PressableSurface
      haptic="none"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={() => {
        if (!busy) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        borderRadius: RADII.lg,
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        backgroundColor: COLORS.dangerBg,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
      }}
    >
      {busy ? (
        <ActivityIndicator color={COLORS.danger} />
      ) : (
        <Text style={{ ...TYPE.label, fontSize: 14.5, color: COLORS.danger }}>{label}</Text>
      )}
    </PressableSurface>
  );
}

async function openLegalUrl(path: '/terms' | '/privacy' | '/sources') {
  const url = `${API_BASE}${path}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) throw new Error('Cannot open URL');
    await Linking.openURL(url);
  } catch {
    const label = path === '/terms' ? 'Terms of Service' : path === '/privacy' ? 'Privacy Policy' : 'Content Sources';
    Alert.alert('Error', `Could not open ${label}.`);
  }
}

export function SettingsDetailScreen({ section }: { section: SettingsSectionKey }) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    isDeleting: boolean;
    deletionRequestedAt: string | null;
    purgeAfter: string | null;
  } | null>(null);
  const [settings, setSettings] = useState<SettingsState>(INITIAL_SETTINGS);
  const [themePref, setThemePref] = useState<ThemePref>('system');
  const [isGuest, setIsGuest] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>('unavailable');

  const loadSettings = useCallback(async () => {
    void getNotificationPermissionState().then(setNotificationPermission);
    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      const [localSettings, localTheme] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
        AsyncStorage.getItem(THEME_STORAGE_KEY),
      ]);
      const local = localSettings ? toSettingsState(JSON.parse(localSettings) as Partial<SettingsState>) : {};
      const merged = toSettingsState({ ...INITIAL_SETTINGS, ...local });
      setSettings(merged);
      if (localTheme === 'light' || localTheme === 'dark' || localTheme === 'system') {
        setThemePref(localTheme);
      }
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const [profileRes, localSettings, localTheme] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'wants_festival_reminders, wants_shloka_reminders, wants_nitya_reminders, wants_community_notifications, wants_family_notifications, app_language, transliteration_language, meaning_language, consent_religious_data'
        )
        .eq('id', user.id)
        .single(),
      AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
      AsyncStorage.getItem(THEME_STORAGE_KEY),
    ]);

    if (profileRes.error) throw profileRes.error;

    const remote = toSettingsState(profileRes.data ?? INITIAL_SETTINGS);
    const local = localSettings ? toSettingsState(JSON.parse(localSettings) as Partial<SettingsState>) : {};
    const merged = toSettingsState({ ...remote, ...local });

    setSettings(merged);
    if (localTheme === 'light' || localTheme === 'dark' || localTheme === 'system') {
      setThemePref(localTheme);
    }
  }, [router]);

  const runLoad = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    loadSettings()
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [loadSettings]);

  // Best-effort: a failure here just leaves the Danger Zone in its default
  // "Delete account" state rather than blocking the rest of Settings from
  // loading (loadSettings/runLoad above already has its own retry UI for
  // the settings it's responsible for).
  const loadDeletionStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/api/user/delete/status');
      if (!response.ok) return;
      const data: unknown = await response.json();
      if (data && typeof data === 'object' && (data as { success?: boolean }).success) {
        const status = data as {
          isDeleting?: boolean;
          deletionRequestedAt?: string | null;
          purgeAfter?: string | null;
        };
        setDeletionStatus({
          isDeleting: !!status.isDeleting,
          deletionRequestedAt: status.deletionRequestedAt ?? null,
          purgeAfter: status.purgeAfter ?? null,
        });
      }
    } catch {
      // Best-effort -- see comment above.
    }
  }, []);

  useEffect(() => {
    runLoad();
    void loadDeletionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSettings = async (nextState: SettingsState) => {
    setSettings(nextState);
    setSaving(true);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextState));
      if (isGuest) {
        setSaving(false);
        return;
      }
      const response = await apiFetch('/api/native/profile', {
        method: 'PATCH',
        body: JSON.stringify(toSettingsState(nextState)),
      });
      if (!response.ok) throw new Error('settings update failed');
    } catch {
      Alert.alert('Could not save settings', 'Check your connection and try again.');
      await loadSettings().catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  const enableNotificationReminder = async (nextState: SettingsState) => {
    const allowed = await requestNotificationPermission();
    void getNotificationPermissionState().then(setNotificationPermission);
    if (!allowed) {
      Alert.alert(
        'Notifications are off',
        'Shoonaya could not enable this reminder without notification permission. You can allow notifications in your device settings and try again.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { void openNotificationSettings(); } },
        ],
      );
      return;
    }

    await persistSettings(nextState);

    if (isGuest) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user.id) {
      void registerPushToken(session.user.id);
    }
  };

  const enableDeviceNotifications = async () => {
    if (notificationPermission === 'denied') {
      await openNotificationSettings();
      return;
    }

    const allowed = await requestNotificationPermission();
    const currentPermission = await getNotificationPermissionState();
    setNotificationPermission(currentPermission);
    if (!allowed || isGuest) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user.id) void registerPushToken(session.user.id);
  };

  const persistTheme = async (nextTheme: ThemePref) => {
    setThemePref(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const response = await apiFetch('/api/user/export');
      if (!response.ok) throw new Error(`Request failed (status ${response.status})`);
      const data = await response.text();

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'Your device does not support saving or sharing this file.');
        return;
      }

      const targetFile = new FileSystem.File(FileSystem.Paths.cache, 'shoonaya-data.json');
      targetFile.write(data);
      await Sharing.shareAsync(targetFile.uri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please check your connection and try again.';
      Alert.alert('Could not download data', message);
    } finally {
      setDownloading(false);
    }
  };

  // Now the same canonical deletion flow as web (ProfileClient.tsx /
  // DeleteAccountClient.tsx): POST /api/user/delete/request starts a 30-day
  // cancellable cool-off (profiles.is_deleting / deletion_requested_at) --
  // it does not delete anything immediately, and does not sign the user
  // out, since the account is still fully usable during the cool-off. The
  // old immediate-hard-delete route (POST /api/user/delete) is no longer
  // called from any user-facing UI; see that route's own comment in the
  // web repo.
  const confirmDeletionRequest = async () => {
    setDeleting(true);
    try {
      const response = await apiFetch('/api/user/delete/request', { method: 'POST' });
      const json: unknown = await response.json().catch(() => null);
      const data = json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
      const success = data?.success === true;
      if (!response.ok || !success) {
        const detail = data && typeof data.error === 'string' ? data.error : '';
        throw new Error(detail || `Request failed (status ${response.status})`);
      }
      setDeletionStatus({
        isDeleting: true,
        deletionRequestedAt: typeof data?.deletionRequestedAt === 'string' ? data.deletionRequestedAt : null,
        purgeAfter: typeof data?.purgeAfter === 'string' ? data.purgeAfter : null,
      });
      Alert.alert('Deletion scheduled', 'You can cancel anytime in the next 30 days from this screen.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not schedule deletion. Check your connection and try again.';
      Alert.alert('Could not schedule deletion', message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setCancelingDeletion(true);
    try {
      const response = await apiFetch('/api/user/delete/cancel', { method: 'POST' });
      if (!response.ok) throw new Error(`Request failed (status ${response.status})`);
      setDeletionStatus({ isDeleting: false, deletionRequestedAt: null, purgeAfter: null });
      Alert.alert('Deletion cancelled', 'Welcome back — your account is safe.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not cancel deletion. Check your connection and try again.';
      Alert.alert('Could not cancel deletion', message);
    } finally {
      setCancelingDeletion(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete account?',
      'This starts a 30-day cancellable cool-off — practice history, streaks, relics, and Kul membership included. Your account is only permanently deleted after 30 days, and you can cancel anytime before then by signing back in and tapping Cancel deletion request here.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Schedule deletion', style: 'destructive', onPress: () => { void confirmDeletionRequest(); } },
      ]
    );
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await clearAllHomeCaches();
      await clearAllOnboardingDrafts();
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  const title = {
    account: 'Account & Profile',
    notifications: 'Notifications',
    appearance: 'Language & Appearance',
    privacy: 'Privacy & Data',
    about: 'About Shoonaya',
  }[section];

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 20 }} showsVerticalScrollIndicator={false}>
        <BackButton fallbackHref="/settings" handleHardwareBack />

        <View style={{ gap: 2 }}>
          <Text style={{ ...TYPE.screenTitle, color: theme.text }}>{title}</Text>
          {saving ? <Text style={{ ...TYPE.caption, color: theme.dim }}>Saving...</Text> : null}
        </View>

        {loadError ? (
          <EmptyState
            icon="wifi-off"
            title="Could not load settings"
            subtitle="Check your connection, then try again."
            ctaLabel="Retry"
            onCta={runLoad}
          />
        ) : (
          <>
            {/* ── Account ─────────────────────────────────────────────── */}
            {section === 'account' ? <SettingsSection label="Account" theme={theme}>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>
                {isGuest ? 'Join Shoonaya to save your sadhana and progress.' : 'Manage your name and spiritual tradition from Profile.'}
              </Text>
              {isGuest ? (
                <Button
                  label="Sign in / Sign up"
                  variant="primary"
                  onPress={async () => {
                    await setGuestMode(false);
                    router.replace('/(auth)/login');
                  }}
                />
              ) : (
                <>
                  <Button
                    label="Personal details"
                    variant="secondary"
                    onPress={() => router.push('/settings/personal-details')}
                  />
                  <Button
                    label="Personalisation"
                    variant="secondary"
                    onPress={() => router.push('/settings/personalisation')}
                  />
                  <Button
                    label={signingOut ? 'Signing out...' : 'Sign out'}
                    variant="secondary"
                    loading={signingOut}
                    onPress={() => { void handleSignOut(); }}
                  />
                </>
              )}
            </SettingsSection> : null}

            {/* ── Notifications ───────────────────────────────────────── */}
            {section === 'notifications' ? <SettingsSection label="Notifications" theme={theme}>
              {notificationPermission !== 'granted' ? (
                <View style={{ gap: 10, paddingBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Feather name="bell" size={18} color={theme.brand} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ ...TYPE.label, color: theme.text }}>
                        {notificationPermission === 'denied' ? 'Notifications are blocked' : 'Allow notifications on this device'}
                      </Text>
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>
                        {notificationPermission === 'denied'
                          ? 'Enable them in device settings to receive the reminders you choose.'
                          : 'Festival, vrat, and daily-practice reminders need your approval.'}
                      </Text>
                    </View>
                  </View>
                  <Button
                    label={notificationPermission === 'denied' ? 'Open device settings' : 'Enable notifications'}
                    variant="primary"
                    onPress={() => { void enableDeviceNotifications(); }}
                  />
                </View>
              ) : (
                <Text style={{ ...TYPE.caption, color: theme.dim }}>Notifications are allowed on this device.</Text>
              )}

              <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
              {NOTIFICATION_TOGGLES.map((item, index) => (
                <View key={item.key}>
                  {index > 0 ? (
                    <View style={{ height: 1, backgroundColor: theme.borderSoft, marginBottom: 16 }} />
                  ) : null}
                  <ToggleRow
                    label={item.label}
                    subtitle={item.subtitle}
                    value={settings[item.key] as boolean}
                    onChange={(value) => {
                      // Turning a reminder ON is exactly the "contextual"
                      // moment to (re-)ask for OS push permission — mirrors
                      // the web app's own contextual push-permission
                      // onboarding (docs/NOTIFICATION_ARCHITECTURE_AUDIT.md)
                      // and closes the gap docs/native-adrs/002-notifications.md
                      // flagged as still "Proposed": previously the only
                      // permission prompt on native was a single ask at the
                      // end of onboarding, so anyone who declined there (or
                      // later revoked it in OS settings) had no way back in.
                      // requestNotificationPermission() is a safe no-op if
                      // permission is already granted, and iOS/Android both
                      // silently no-op a re-prompt after a previous denial
                      // rather than re-showing the OS dialog — so this never
                      // nags, it just gives a path back in for anyone who
                      // can still be prompted.
                      const nextState = { ...settings, [item.key]: value };
                      if (value) {
                        void enableNotificationReminder(nextState);
                        return;
                      }
                      void persistSettings(nextState);
                    }}
                    theme={theme}
                  />
                </View>
              ))}
            </SettingsSection> : null}

            {/* ── Language / preferences ──────────────────────────────── */}
            {section === 'appearance' ? <SettingsSection label="Language / Preferences" theme={theme}>
              {[
                { label: 'App language', key: 'app_language' as const },
                { label: 'Meaning language', key: 'meaning_language' as const },
                { label: 'Transliteration', key: 'transliteration_language' as const },
              ].map((row) => (
                <View key={row.key} style={{ gap: 10 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>{row.label}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {LANGUAGES.map((lang) => (
                      <Pill
                        key={lang.key}
                        label={lang.label}
                        selected={settings[row.key] === lang.key}
                        onPress={() => { void persistSettings({ ...settings, [row.key]: lang.key }); }}
                      />
                    ))}
                  </View>
                </View>
              ))}

              <View style={{ gap: 10 }}>
                <Text style={{ ...TYPE.caption, color: theme.dim }}>Appearance</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {THEME_OPTIONS.map((opt) => (
                    <Pill
                      key={opt.key}
                      label={opt.label}
                      selected={themePref === opt.key}
                      onPress={() => { void persistTheme(opt.key); }}
                    />
                  ))}
                </View>
              </View>
            </SettingsSection> : null}

            {/* ── Community & Socials ─────────────────────────────────── */}
            {section === 'about' ? <SettingsSection label="Community & Socials" theme={theme}>
              {[
                {
                  id: 'instagram',
                  icon: 'instagram',
                  label: 'Instagram',
                  handle: '@shoonaya.fyi',
                  url: SOCIAL_LINKS.instagram,
                },
                {
                  id: 'facebook',
                  icon: 'facebook-square',
                  label: 'Facebook',
                  handle: 'Shoonaya',
                  url: SOCIAL_LINKS.facebook,
                },
                {
                  id: 'linkedin',
                  icon: 'linkedin-square',
                  label: 'LinkedIn',
                  handle: 'Shoonaya',
                  url: SOCIAL_LINKS.linkedin,
                },
                {
                  id: 'website',
                  icon: 'globe',
                  label: 'Official Website',
                  handle: 'shoonaya.com',
                  url: SOCIAL_LINKS.website,
                },
              ].map((social, index) => (
                <View key={social.id}>
                  {index > 0 ? (
                    <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 8 }} />
                  ) : null}
                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="link"
                    accessibilityLabel={social.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      void Linking.openURL(social.url);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: MIN_TOUCH_TARGET,
                      paddingVertical: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: theme.brandSoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FontAwesome name={social.icon as any} size={17} color={theme.brand} />
                      </View>
                      <View>
                        <Text style={{ ...TYPE.body, color: theme.text, fontFamily: FONTS.sansSemiBold }}>
                          {social.label}
                        </Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim }}>
                          {social.handle}
                        </Text>
                      </View>
                    </View>
                    <Feather name="external-link" size={15} color={theme.dim} />
                  </PressableSurface>
                </View>
              ))}
            </SettingsSection> : null}

            {/* ── Privacy & data ──────────────────────────────────────── */}
            {section === 'privacy' ? <SettingsSection label="Privacy & Data" theme={theme}>
              <ToggleRow
                label="Tradition-aware personalization"
                subtitle="Uses your spiritual preference data to tailor recommendations."
                value={settings.consent_religious_data}
                onChange={(value) => { void persistSettings({ ...settings, consent_religious_data: value }); }}
                theme={theme}
              />
              {!isGuest ? (
                <>
                  <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
                  <Button
                    label={downloading ? 'Preparing export...' : 'Download your data'}
                    variant="secondary"
                    loading={downloading}
                    onPress={() => { void handleDownloadData(); }}
                  />
                </>
              ) : null}
            </SettingsSection> : null}

            {/* ── Danger zone ──────────────────────────────────────────── */}
            {section === 'privacy' && !isGuest ? (
              <View style={{ gap: 12 }}>
                <SectionHeader label="Danger Zone" />
                <Card
                  tone="auto"
                  style={{ backgroundColor: theme.card, borderColor: COLORS.dangerBorder, gap: 10 }}
                >
                  {deletionStatus?.isDeleting ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Feather name="clock" size={16} color={COLORS.danger} style={{ marginTop: 2 }} />
                        <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1 }}>
                          Account scheduled for deletion
                          {deletionStatus.purgeAfter
                            ? ` on ${new Date(deletionStatus.purgeAfter).toLocaleDateString()}`
                            : ''}
                          .{deletionStatus.deletionRequestedAt
                            ? ` Requested ${new Date(deletionStatus.deletionRequestedAt).toLocaleDateString()}.`
                            : ''}{' '}
                          Cancel anytime before then to keep your account.
                        </Text>
                      </View>
                      <Button
                        label={cancelingDeletion ? 'Cancelling...' : 'Cancel deletion request'}
                        variant="secondary"
                        loading={cancelingDeletion}
                        onPress={() => { void handleCancelDeletion(); }}
                      />
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Feather name="alert-triangle" size={16} color={COLORS.danger} style={{ marginTop: 2 }} />
                        <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1 }}>
                          Deleting starts a 30-day cancellable cool-off. Your account and data are permanently removed after 30 days unless you cancel first.
                        </Text>
                      </View>
                      <DangerButton
                        label="Delete account"
                        loading={deleting}
                        onPress={handleDeletePress}
                        isDark={isDark}
                      />
                    </>
                  )}
                </Card>
              </View>
            ) : null}

            {(section === 'privacy' || section === 'about') ? <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4 }}>
              <PressableSurface
                haptic="selection"
                accessibilityRole="link"
                accessibilityLabel="Terms of Service"
                hitSlop={10}
                onPress={() => { void openLegalUrl('/terms'); }}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Terms
                </Text>
              </PressableSurface>
              <PressableSurface
                haptic="selection"
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
                hitSlop={10}
                onPress={() => { void openLegalUrl('/privacy'); }}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Privacy
                </Text>
              </PressableSurface>
              <PressableSurface
                haptic="selection"
                accessibilityRole="link"
                accessibilityLabel="Content Sources"
                hitSlop={10}
                onPress={() => { void openLegalUrl('/sources'); }}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Sources
                </Text>
              </PressableSurface>
            </View> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

export default function AccountSettingsScreen() {
  return <SettingsDetailScreen section="account" />;
}
