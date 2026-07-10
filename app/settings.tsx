import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { API_BASE, COLORS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { requestNotificationPermission } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

type AppLanguage = 'en' | 'hi' | 'pa';
type ThemePref = 'light' | 'dark' | 'system';

// Every field below already exists on `profiles` and is already read/written
// by this screen — no new backend columns introduced. Kept as the exact same
// contract native's notifications.tsx defers to ("Notification preferences
// ... already exist and work end to end in app/settings.tsx — not
// duplicated here"), so that screen's link to Settings keeps working.
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
  consent_religious_data: true,
};

const NOTIFICATION_TOGGLES: { key: keyof SettingsState; label: string; subtitle: string }[] = [
  { key: 'wants_shloka_reminders', label: 'Daily wisdom', subtitle: 'Your daily shloka & reflection' },
  { key: 'wants_nitya_reminders', label: 'Nitya reminders', subtitle: 'Morning sadhana nudges' },
  { key: 'wants_festival_reminders', label: 'Festival reminders', subtitle: 'Vrat, tithi & observance alerts' },
  { key: 'wants_community_notifications', label: 'Community', subtitle: 'Mandali posts & mentions' },
  { key: 'wants_family_notifications', label: 'Family', subtitle: 'Kul & lineage activity' },
];

const LANGUAGES: { key: AppLanguage; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'Hindi' },
  { key: 'pa', label: 'Punjabi' },
];

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={() => {
        if (!busy) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH_TARGET,
        borderRadius: RADII.lg,
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        backgroundColor: COLORS.dangerBg,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        opacity: busy ? 0.6 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed && !busy ? 0.985 : 1 }],
      })}
    >
      {busy ? (
        <ActivityIndicator color={COLORS.danger} />
      ) : (
        <Text style={{ ...TYPE.label, fontSize: 14.5, color: COLORS.danger }}>{label}</Text>
      )}
    </Pressable>
  );
}

async function openLegalUrl(path: '/terms' | '/privacy') {
  const url = `${API_BASE}${path}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) throw new Error('Cannot open URL');
    await Linking.openURL(url);
  } catch {
    Alert.alert('Error', `Could not open ${path === '/terms' ? 'Terms of Service' : 'Privacy Policy'}.`);
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(INITIAL_SETTINGS);
  const [themePref, setThemePref] = useState<ThemePref>('system');

  const loadSettings = useCallback(async () => {
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

  useEffect(() => {
    runLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSettings = async (nextState: SettingsState) => {
    setSettings(nextState);
    setSaving(true);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextState));
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('profiles').update(toSettingsState(nextState)).eq('id', user.id);
      if (error) throw error;
    } catch {
      Alert.alert('Could not save settings', 'Check your connection and try again.');
      await loadSettings().catch(() => {});
    } finally {
      setSaving(false);
    }
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

  // Preserved exactly: POST /api/user/delete — an immediate, irreversible
  // hard delete (auth user + profile row removed server-side; see the web
  // repo's src/app/api/user/delete/route.ts). Not the same mechanism as
  // PWA's ProfileClient "Delete Account" button, which instead sets a
  // 30-day-cool-off flag directly on `profiles` (is_deleting /
  // deletion_requested_at) and is cancellable. That discrepancy is a
  // product decision, not something to silently paper over here — flagged
  // in the review report. Per this task's explicit instruction, native
  // keeps calling the existing immediate-delete route as-is; the copy below
  // is written for THAT behavior (irreversible, no cool-off), not PWA's.
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const response = await apiFetch('/api/user/delete', { method: 'POST' });
      if (!response.ok) {
        let detail = '';
        try {
          const json: unknown = await response.json();
          if (json && typeof json === 'object' && 'error' in json && typeof json.error === 'string') {
            detail = json.error;
          }
        } catch {
          // Response wasn't JSON — fall through to the generic message below.
        }
        throw new Error(detail || `Request failed (status ${response.status})`);
      }
      await supabase.auth.signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete account. Check your connection and try again.';
      Alert.alert('Could not delete account', message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete account permanently?',
      'This immediately and permanently deletes your Shoonaya account — practice history, streaks, relics, and Kul membership included. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete permanently', style: 'destructive', onPress: () => { void confirmDelete(); } },
      ]
    );
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
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

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 20 }} showsVerticalScrollIndicator={false}>
        <BackButton />

        <View style={{ gap: 2 }}>
          <Text style={{ ...TYPE.screenTitle, color: theme.text }}>Settings</Text>
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
            <SettingsSection label="Account" theme={theme}>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>
                Manage your name and spiritual tradition from Profile.
              </Text>
              <Button
                label={signingOut ? 'Signing out...' : 'Sign out'}
                variant="secondary"
                loading={signingOut}
                onPress={() => { void handleSignOut(); }}
              />
            </SettingsSection>

            {/* ── Notifications ───────────────────────────────────────── */}
            <SettingsSection label="Notifications" theme={theme}>
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
                      if (value) {
                        void requestNotificationPermission();
                      }
                      void persistSettings({ ...settings, [item.key]: value });
                    }}
                    theme={theme}
                  />
                </View>
              ))}
            </SettingsSection>

            {/* ── Language / preferences ──────────────────────────────── */}
            <SettingsSection label="Language / Preferences" theme={theme}>
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
            </SettingsSection>

            {/* ── Privacy & data ──────────────────────────────────────── */}
            <SettingsSection label="Privacy & Data" theme={theme}>
              <ToggleRow
                label="Tradition-aware personalization"
                subtitle="Uses your spiritual preference data to tailor recommendations."
                value={settings.consent_religious_data}
                onChange={(value) => { void persistSettings({ ...settings, consent_religious_data: value }); }}
                theme={theme}
              />
              <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
              <Button
                label={downloading ? 'Preparing export...' : 'Download your data'}
                variant="secondary"
                loading={downloading}
                onPress={() => { void handleDownloadData(); }}
              />
            </SettingsSection>

            {/* ── Danger zone ──────────────────────────────────────────── */}
            <View style={{ gap: 12 }}>
              <SectionHeader label="Danger Zone" />
              <Card
                tone="auto"
                style={{ backgroundColor: theme.card, borderColor: COLORS.dangerBorder, gap: 10 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Feather name="alert-triangle" size={16} color={COLORS.danger} style={{ marginTop: 2 }} />
                  <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1 }}>
                    Deleting your account is permanent and immediate. There is no cool-off period or recovery.
                  </Text>
                </View>
                <DangerButton
                  label="Delete account"
                  loading={deleting}
                  onPress={handleDeletePress}
                  isDark={isDark}
                />
              </Card>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4 }}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Terms of Service"
                hitSlop={10}
                onPress={() => { void openLegalUrl('/terms'); }}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Terms
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
                hitSlop={10}
                onPress={() => { void openLegalUrl('/privacy'); }}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Privacy
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
