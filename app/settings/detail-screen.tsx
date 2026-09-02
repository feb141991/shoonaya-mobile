import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
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
  openNotificationSettings,
  registerPushToken,
  requestNotificationPermission,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';
import { clearAllHomeCaches } from '@/lib/homeCache';
import { clearAllOnboardingDrafts } from '@/lib/onboardingDraft';
import { SUPPORTED_APP_LANGUAGES, type AppLanguage } from '@/lib/language-runtime';
import {
  readSettingsCache,
  writeSettingsCache,
  clearAllSettingsCaches,
  mergeServerWithPending,
  classifyWriteFailure,
  nextBackoffMs,
  type SettingsCacheIdentity,
  type SettingsFields,
  type PendingSettingsWrite,
} from '@/lib/settingsCache';

type ThemePref = 'light' | 'dark' | 'system';
export type SettingsSectionKey = 'account' | 'notifications' | 'appearance' | 'privacy' | 'about';

// Every field below already exists on `profiles` and is already read/written
// by the focused settings screens — no new backend columns introduced.
type SettingsState = SettingsFields;

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
  const [pendingWrite, setPendingWrite] = useState<PendingSettingsWrite | null>(null);

  // Resolved once per load; used both to key the cache and to know which
  // identity a queued write belongs to, so a cold-start resume never
  // drains another account's outbox (see resumePendingWrite below).
  const identityRef = useRef<SettingsCacheIdentity | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearRetryTimer(), [clearRetryTimer]);

  // Sends the pending write's desired fields to the server. On success,
  // clears the pending entry and adopts the server's persisted values
  // (trusting its response over the optimistic local guess). On failure,
  // classifies the error and either reschedules (network/5xx/429) or marks
  // the entry permanently failed (most 4xx) -- never retries forever, and
  // never leaves an indefinite "Saving..." state past the last attempt.
  const attemptPendingWrite = useCallback(async (write: PendingSettingsWrite) => {
    const identity = identityRef.current;
    if (!identity || identity.kind === 'guest') return; // guest writes are local-only, never queued

    setSaving(true);
    try {
      const response = await apiFetch('/api/native/profile', {
        method: 'PATCH',
        body: JSON.stringify(write.fields),
      });

      if (response.ok) {
        const json = await response.json().catch(() => null) as { persisted?: Partial<SettingsState>; updatedAt?: string } | null;
        clearRetryTimer();
        setPendingWrite(null);
        setSettings((current) => ({ ...current, ...(json?.persisted ?? write.fields) }));
        const cached = await readSettingsCache(identity);
        await writeSettingsCache({
          schemaVersion: 2,
          identity,
          savedAt: Date.now(),
          settings: { ...(cached?.settings ?? INITIAL_SETTINGS), ...(json?.persisted ?? write.fields) },
          serverUpdatedAt: json?.updatedAt ?? cached?.serverUpdatedAt ?? null,
          pendingOperations: [],
        });
        return;
      }

      const outcome = classifyWriteFailure(response.status, response.headers.get('Retry-After'));
      if (outcome.kind === 'retry') {
        const attempts = write.attempts + 1;
        const backoff = nextBackoffMs(write.attempts) ?? outcome.afterMs;
        if (backoff === null) {
          // Backoff table exhausted -- stop auto-retrying, surface failure.
          const failed: PendingSettingsWrite = { ...write, attempts, status: 'failed' };
          setPendingWrite(failed);
          await persistPendingWrite(identity, failed);
          return;
        }
        const next: PendingSettingsWrite = { ...write, attempts, nextAttemptAt: Date.now() + backoff, status: 'pending' };
        setPendingWrite(next);
        await persistPendingWrite(identity, next);
        clearRetryTimer();
        retryTimerRef.current = setTimeout(() => { void attemptPendingWrite(next); }, backoff);
        return;
      }

      // Permanent failure (most 4xx) -- do not retry automatically.
      const failed: PendingSettingsWrite = { ...write, attempts: write.attempts + 1, status: 'failed' };
      setPendingWrite(failed);
      await persistPendingWrite(identity, failed);
    } catch {
      // Network error -- same retry treatment as 5xx.
      const attempts = write.attempts + 1;
      const backoff = nextBackoffMs(write.attempts);
      if (backoff === null) {
        const failed: PendingSettingsWrite = { ...write, attempts, status: 'failed' };
        setPendingWrite(failed);
        await persistPendingWrite(identity, failed);
        return;
      }
      const next: PendingSettingsWrite = { ...write, attempts, nextAttemptAt: Date.now() + backoff, status: 'pending' };
      setPendingWrite(next);
      await persistPendingWrite(identity, next);
      clearRetryTimer();
      retryTimerRef.current = setTimeout(() => { void attemptPendingWrite(next); }, backoff);
    } finally {
      setSaving(false);
    }
  }, [clearRetryTimer]);

  async function persistPendingWrite(identity: SettingsCacheIdentity, write: PendingSettingsWrite | null) {
    const cached = await readSettingsCache(identity);
    await writeSettingsCache({
      schemaVersion: 2,
      identity,
      savedAt: Date.now(),
      settings: cached?.settings ?? INITIAL_SETTINGS,
      serverUpdatedAt: cached?.serverUpdatedAt ?? null,
      pendingOperations: write ? [write] : [],
    });
  }

  const loadSettings = useCallback(async () => {
    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      identityRef.current = { kind: 'guest' };
      clearRetryTimer();
      setPendingWrite(null);
      const [cached, localTheme] = await Promise.all([
        readSettingsCache({ kind: 'guest' }),
        AsyncStorage.getItem(THEME_STORAGE_KEY),
      ]);
      setSettings(toSettingsState({ ...INITIAL_SETTINGS, ...cached?.settings }));
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

    const identity: SettingsCacheIdentity = { kind: 'authenticated', userId: user.id };
    identityRef.current = identity;

    const [profileRes, cached, localTheme] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'wants_festival_reminders, wants_shloka_reminders, wants_nitya_reminders, wants_community_notifications, wants_family_notifications, app_language, transliteration_language, meaning_language, consent_religious_data'
        )
        .eq('id', user.id)
        .single(),
      readSettingsCache(identity),
      AsyncStorage.getItem(THEME_STORAGE_KEY),
    ]);

    if (profileRes.error) throw profileRes.error;

    const remote = toSettingsState(profileRes.data ?? INITIAL_SETTINGS);
    const pending = (cached?.pendingOperations ?? []).filter((op) => op.status === 'pending' || op.status === 'failed');
    const merged = mergeServerWithPending(remote, pending);

    setSettings(merged);
    setPendingWrite(pending[0] ?? null);
    await writeSettingsCache({
      schemaVersion: 2,
      identity,
      savedAt: Date.now(),
      settings: remote,
      serverUpdatedAt: cached?.serverUpdatedAt ?? null,
      pendingOperations: pending,
    });

    if (localTheme === 'light' || localTheme === 'dark' || localTheme === 'system') {
      setThemePref(localTheme);
    }

    // Resume on cold start (mirrors the foreground-resume effect below) --
    // a killed app loses any in-memory retry timer, so a queued mutation
    // must resume here too, not only on the next background->foreground
    // transition. Only 'pending' entries auto-resume; 'failed' waits for
    // an explicit user Retry tap.
    const resumable = pending.find((op) => op.status === 'pending');
    if (resumable) void attemptPendingWrite(resumable);
  }, [router, attemptPendingWrite, clearRetryTimer]);

  // Resume a pending write whenever the app returns to the foreground --
  // per the agreed retry policy, retries happen when foregrounded with
  // network available, never via unbounded background work/timers that iOS
  // would kill anyway.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const identity = identityRef.current;
      if (!identity || identity.kind === 'guest') return;
      setPendingWrite((current) => {
        if (current && current.status === 'pending') {
          void attemptPendingWrite(current);
        }
        return current;
      });
    });
    return () => subscription.remove();
  }, [attemptPendingWrite]);

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

  // Guest: local-only, no server round trip, no outbox -- settings.ts's
  // pendingOperations stays permanently empty for a guest identity.
  const persistGuestSettings = async (nextState: SettingsState) => {
    setSettings(nextState);
    await writeSettingsCache({
      schemaVersion: 2,
      identity: { kind: 'guest' },
      savedAt: Date.now(),
      settings: nextState,
      serverUpdatedAt: null,
      pendingOperations: [],
    });
  };

  // Authenticated: desired-state write. Only the fields that actually
  // changed are queued (diffed against current `settings`, not the whole
  // object) -- re-toggling before the first write resolves overwrites the
  // same coalesced pending entry rather than queueing a second one, since
  // Settings tracks "the current desired state," not a log of every toggle.
  const persistSettings = async (nextState: SettingsState) => {
    if (isGuest) {
      await persistGuestSettings(nextState);
      return;
    }
    const identity = identityRef.current;
    if (!identity || identity.kind === 'guest') return;

    const changedFields: Partial<SettingsState> = {};
    (Object.keys(nextState) as Array<keyof SettingsState>).forEach((key) => {
      if (settings[key] !== nextState[key]) {
        (changedFields as Record<string, unknown>)[key] = nextState[key];
      }
    });
    if (Object.keys(changedFields).length === 0) return;

    setSettings(nextState);
    clearRetryTimer();
    const write: PendingSettingsWrite = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fields: { ...(pendingWrite?.status === 'pending' ? pendingWrite.fields : null), ...changedFields },
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: pendingWrite?.status === 'pending' ? pendingWrite.createdAt : Date.now(),
      status: 'pending',
    };
    setPendingWrite(write);
    await persistPendingWrite(identity, write);
    await attemptPendingWrite(write);
  };

  const retryFailedWrite = () => {
    if (pendingWrite && pendingWrite.status === 'failed') {
      const retried: PendingSettingsWrite = { ...pendingWrite, status: 'pending' };
      setPendingWrite(retried);
      void attemptPendingWrite(retried);
    }
  };

  const discardFailedWrite = async () => {
    const identity = identityRef.current;
    if (!pendingWrite || !identity || identity.kind === 'guest') return;
    clearRetryTimer();
    setPendingWrite(null);
    await persistPendingWrite(identity, null);
    // Revert the optimistic UI back to server truth for the discarded
    // fields -- reload rather than guess, since the server may also have
    // changed in the meantime.
    await loadSettings().catch(() => {});
  };

  const enableNotificationReminder = async (nextState: SettingsState) => {
    const allowed = await requestNotificationPermission();
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
      clearRetryTimer();
      await clearAllHomeCaches();
      await clearAllSettingsCaches();
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
          {saving ? <Text style={{ ...TYPE.caption, color: theme.dim }}>Sending...</Text> : null}
        </View>

        {/* Explicit failure state -- never an indefinite "Sending..." past
            the last retry attempt. Retry re-attempts the same desired
            values; Discard drops the queued write and reloads server
            truth for the affected fields. */}
        {pendingWrite?.status === 'failed' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderRadius: RADII.md,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
              backgroundColor: COLORS.dangerBg,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Feather name="alert-circle" size={15} color={COLORS.danger} />
            <Text style={{ ...TYPE.caption, color: COLORS.danger, flex: 1 }}>Could not send</Text>
            <PressableSurface haptic="selection" onPress={retryFailedWrite} style={{ minHeight: 0 }}>
              <Text style={{ ...TYPE.label, fontSize: 12.5, color: COLORS.danger, textDecorationLine: 'underline' }}>Retry</Text>
            </PressableSurface>
            <PressableSurface haptic="selection" onPress={() => { void discardFailedWrite(); }} style={{ minHeight: 0 }}>
              <Text style={{ ...TYPE.label, fontSize: 12.5, color: theme.dim, textDecorationLine: 'underline' }}>Discard</Text>
            </PressableSurface>
          </View>
        ) : null}

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
