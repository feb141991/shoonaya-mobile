import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ToggleRow } from '@/components/settings/ToggleRow';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { captureAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { TYPE, type themeColor } from '@/lib/constants';
import { DISCREET_MODE_COPY, readDiscreetMode, saveDiscreetMode, type DiscreetModeRead } from '@/lib/discreetMode';

type State = DiscreetModeRead | { state: 'loading' };

export function NotificationDiscretionSetting({
  language,
  theme,
}: {
  language: string;
  theme: ReturnType<typeof themeColor>;
}) {
  const identity = useAppIdentity();
  const userId = identity.kind === 'authenticated' ? identity.userId : null;
  const [result, setResult] = useState<State>({ state: 'loading' });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId || savingRef.current) return;
    const lease = captureAppIdentity();
    const version = ++revision.current;
    setResult({ state: 'loading' });
    const next = await readDiscreetMode((path) => apiFetch(path, { expectedUserId: userId }));
    if (lease.isCurrent() && revision.current === version) setResult(next);
  }, [userId]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { revision.current++; };
  }, [refresh]));

  async function save(value: boolean) {
    if (!userId || result.state !== 'ready' || savingRef.current) return;
    const lease = captureAppIdentity();
    const version = ++revision.current;
    savingRef.current = true;
    setSaving(true);
    let saved = false;
    try {
      saved = await saveDiscreetMode((path, init) => apiFetch(path, { ...init, expectedUserId: userId }), value);
    } catch {
      // A request may have reached the server. A fresh read is required before showing a switch again.
    } finally {
      savingRef.current = false;
      if (lease.isCurrent()) {
        setSaving(false);
        if (revision.current === version) setResult(saved ? { state: 'ready', value } : { state: 'load_failed' });
        else void refresh();
      }
    }
  }

  const label = language === 'hi' ? DISCREET_MODE_COPY.labelHi : DISCREET_MODE_COPY.label;
  if (userId && result.state === 'ready') {
    return <ToggleRow label={label} subtitle={DISCREET_MODE_COPY.subtitle} theme={theme}
      value={result.value} disabled={saving} onChange={(value) => { void save(value); }} />;
  }

  const message = !userId ? 'Sign in to change this setting.'
    : result.state === 'loading' ? 'Checking whether Shoonaya can hide notification details…'
    : result.state === 'not_available' ? 'Available after the server update.'
    : 'Could not confirm this setting. Try again.';
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...TYPE.label, color: theme.text }}>{label}</Text>
      <Text accessibilityLiveRegion="polite" style={{ ...TYPE.caption, color: theme.dim }}>{message}</Text>
      {userId && result.state === 'load_failed' ? <Button variant="ghost" label="Retry" onPress={() => { void refresh(); }} /> : null}
    </View>
  );
}
