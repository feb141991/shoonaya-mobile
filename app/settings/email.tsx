import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, useColorScheme, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import { captureAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { emailWordingCopy } from '@/lib/emailConsentCopy';
import { fetchEmailPreferences, setEmailPreference } from '@/lib/emailPreferencesApi';
import type { EmailChoiceCategory, EmailPreferences } from '@/lib/emailPreferences';
import { describeFailure } from '@/lib/user-facing-error';

/**
 * Settings, Email: the two optional e-mail choices. Everything here is read from, and written to, the server (AGENTS 26): nothing is
 * stored on the device, a switch only moves after the server has recorded the change, and the screen follows the signed-in account.
 */
export default function EmailSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);
  const identity = useAppIdentity();
  const userId = identity.kind === 'authenticated' ? identity.userId : null;

  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<EmailChoiceCategory | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A different account must never see the previous account's choices, not even for one render.
  useEffect(() => {
    setPrefs(null);
    setLoadError(null);
    setSaveError(null);
    setBusy(null);
    setLoading(userId !== null);
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) return;
    const lease = captureAppIdentity();
    try {
      const next = await fetchEmailPreferences(userId);
      if (!lease.isCurrent()) return;
      setPrefs(next);
      setLoadError(null);
    } catch (error) {
      if (!lease.isCurrent()) return;
      // A failed refresh keeps what is already on screen; with nothing on screen it is a retryable error, never "all off".
      setPrefs((current) => {
        if (current === null) setLoadError(describeFailure(error, 'Could not load your email choices. Please try again.', language));
        return current;
      });
    } finally {
      if (lease.isCurrent()) setLoading(false);
    }
  }, [userId, language]);

  // Re-read whenever the screen comes back into view: a choice may have been changed from an e-mail link meanwhile.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const change = async (category: EmailChoiceCategory, granted: boolean) => {
    if (!userId || !prefs || busy) return;
    const lease = captureAppIdentity();
    setBusy(category);
    setSaveError(null);
    try {
      const result = await setEmailPreference(userId, { category, granted, source: 'settings', wordingVersion: prefs.policy.wordingVersion });
      if (!lease.isCurrent()) return;
      setPrefs((current) => current && {
        ...current,
        newsletter: result.newsletter,
        festivals: result.festivals,
        lastChangedAt: result.lastChangedAt ?? current.lastChangedAt,
      });
    } catch (error) {
      if (lease.isCurrent()) {
        setSaveError(describeFailure(error, 'Could not save your email choice. Please try again.', language, {
          409: 'This account is being deleted, so email choices cannot be changed.',
        }));
      }
    } finally {
      if (lease.isCurrent()) setBusy(null);
    }
  };

  const copy = emailWordingCopy(prefs?.policy.wordingVersion, language);
  const lastChanged = (() => {
    if (!prefs?.lastChangedAt) return null;
    const date = new Date(prefs.lastChangedAt);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  })();

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + NAV_BAR_CLEARANCE + 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <BackButton fallbackHref="/settings" handleHardwareBack />
        <Text accessibilityRole="header" style={{ ...TYPE.screenTitle, color: theme.text }}>Email</Text>

        {identity.kind === 'loading' || (userId !== null && loading && prefs === null && loadError === null) ? (
          <ActivityIndicator accessibilityLabel="Loading your email choices" color={theme.brand} style={{ marginTop: 24 }} />
        ) : userId === null ? (
          <EmptyState icon="mail" title="Sign in to manage email" subtitle="Email choices belong to your account." />
        ) : prefs === null ? (
          <EmptyState icon="wifi-off" title="Could not load your email choices" subtitle={loadError ?? 'Please try again.'} ctaLabel="Retry" onCta={() => { setLoading(true); void load(); }} />
        ) : (
          <>
            <View style={{ gap: 12 }}>
              <SectionHeader label="Optional email" />
              <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
                <ChoiceRow
                  label={copy.festivals.label}
                  help={copy.festivals.help}
                  value={prefs.festivals}
                  busy={busy === 'festivals'}
                  disabled={busy !== null}
                  onChange={(next) => { void change('festivals', next); }}
                  theme={theme}
                />
                <ChoiceRow
                  label={copy.newsletter.label}
                  help={copy.newsletter.help}
                  value={prefs.newsletter}
                  busy={busy === 'newsletter'}
                  disabled={busy !== null}
                  onChange={(next) => { void change('newsletter', next); }}
                  theme={theme}
                />
              </Card>
            </View>

            {saveError ? (
              <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ ...TYPE.caption, color: theme.text, flexShrink: 1, lineHeight: 18 }}>
                {saveError}
              </Text>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={{ ...TYPE.caption, color: theme.dim, flexShrink: 1, lineHeight: 18 }}>{copy.note}</Text>
              {lastChanged ? <Text style={{ ...TYPE.caption, color: theme.dim, flexShrink: 1, lineHeight: 18 }}>{`Last changed ${lastChanged}`}</Text> : null}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function ChoiceRow({
  label,
  help,
  value,
  busy,
  disabled,
  onChange,
  theme,
}: {
  label: string;
  help: string;
  value: boolean;
  busy: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH_TARGET, opacity: disabled && !busy ? 0.6 : 1 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...TYPE.label, color: theme.text, flexShrink: 1, lineHeight: 20 }}>{label}</Text>
        <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2, flexShrink: 1, lineHeight: 18 }}>{help}</Text>
      </View>
      {busy ? <ActivityIndicator color={theme.brand} accessibilityLabel="Saving" /> : null}
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: theme.brand }}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={help}
        accessibilityState={{ checked: value, disabled, busy }}
      />
    </View>
  );
}
