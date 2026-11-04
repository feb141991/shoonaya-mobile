import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';
import {
  describeSanskaraFailure,
  executeSanskaraWrite,
  fetchEarlyHandoverStatus,
  type SanskaraEarlyHandoverStatus,
} from '@/lib/sanskara';
import {
  earlyConfirmWarning,
  earlyConfirmedMessage,
  earlyHandoverView,
  earlyStartWarning,
  type EarlyActionId,
} from '@/lib/sanskaraEarlyHandover';

type Props = {
  userId: string;
  subjectId: string;
  dependentName: string;
  /** Called after the records moved, so the screen can reload and leave the child that no longer exists. */
  onHandedOver: () => void;
};

/** Shows a native confirmation and resolves true only if the person chose the action. */
function confirmDialog(title: string, body: string, action: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, body, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/**
 * The early hand-over card for one managed child. The parent component keys it by identity and child, so a different person or
 * child always starts from nothing (AGENTS 22/24). The status is read here on demand and never persisted; the one-time code lives
 * only in this component's memory and is dropped when the card goes away.
 *
 * A failed status read offers no action at all (AGENTS 18): "could not read" is not "nothing is happening".
 */
export function SanskaraEarlyHandover({ userId, subjectId, dependentName, onHandedOver }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [status, setStatus] = useState<SanskaraEarlyHandoverStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<EarlyActionId | null>(null);
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mounted = useRef(true);
  const loadSeq = useRef(0);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const next = await fetchEarlyHandoverStatus(userId, subjectId);
      if (!mounted.current || seq !== loadSeq.current) return;
      setStatus(next);
      setFailed(false);
    } catch {
      if (!mounted.current || seq !== loadSeq.current) return;
      // Keep what was last read for this same child; with nothing read, offer nothing.
      setFailed(true);
    }
  }, [userId, subjectId]);

  useEffect(() => { void load(); }, [load]);

  const run = useCallback(async (id: EarlyActionId) => {
    if (busy) return;
    setBusy(id);
    try {
      if (id === 'start' || id === 'restart') {
        const warning = earlyStartWarning(dependentName);
        if (!(await confirmDialog(warning.title, warning.body, 'Start hand-over'))) return;
        const res = await executeSanskaraWrite(userId, 'start-early-handover', { subjectId });
        if (mounted.current && res.token) setCode(res.token);
      } else if (id === 'approve') {
        const warning = earlyStartWarning(dependentName);
        if (!(await confirmDialog(warning.title, warning.body, 'I agree'))) return;
        await executeSanskaraWrite(userId, 'approve-early-handover', { subjectId });
      } else if (id === 'cancel') {
        await executeSanskaraWrite(userId, 'cancel-early-handover', { subjectId });
        if (mounted.current) setCode(null);
      } else {
        const acceptor = status?.acceptor;
        const label = acceptor?.full_name?.trim() || (acceptor?.username ? `@${acceptor.username}` : 'this account');
        const warning = earlyConfirmWarning(dependentName, label);
        if (!(await confirmDialog(warning.title, warning.body, 'Hand over'))) return;
        const result = await executeSanskaraWrite(userId, 'confirm-early-handover', { subjectId });
        if (mounted.current) setCode(null);
        Alert.alert('Handed over', earlyConfirmedMessage(result));
        onHandedOver();
        return;
      }
      await load();
    } catch (error) {
      Alert.alert(
        'Could not do that',
        describeSanskaraFailure(error, 'Could not update the hand-over. Please try again.'),
      );
      // The server's answer may have changed what is possible (someone cancelled, a manager was added): show it.
      await load();
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [busy, dependentName, load, onHandedOver, status?.acceptor, subjectId, userId]);

  const copyCode = useCallback(async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => { if (mounted.current) setCopied(false); }, 2500);
  }, [code]);

  if (!status) return null;
  const view = earlyHandoverView(status, dependentName);
  if (!view) return null;

  const open = expanded ?? view.needsAttention;
  // A shown code stays visible until the person leaves or cancels: it is never shown again.
  const showCode = code !== null && (status.state === 'awaiting_approval' || status.state === 'ready');

  return (
    <Card
      tone="auto"
      style={[styles.card, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}
    >
      <PressableSurface
        haptic="selection"
        onPress={() => setExpanded(!open)}
        accessibilityLabel={view.title}
        accessibilityHint={open ? 'Hides the details' : 'Shows the details'}
        accessibilityState={{ expanded: open }}
        style={styles.row}
      >
        <Feather name={view.icon} size={18} color={theme.brand} />
        <Text style={[styles.title, { color: theme.text }]}>{view.title}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.dim} />
      </PressableSurface>

      {open ? (
        <View style={styles.details}>
          <Text style={[styles.body, { color: theme.dim }]}>{view.body}</Text>

          {failed ? (
            <Text style={[styles.body, { color: theme.dim }]}>
              This could not be refreshed just now, so what you see may be out of date.
            </Text>
          ) : null}

          {showCode ? (
            <View style={styles.codeBlock}>
              <Text style={[styles.body, { color: theme.text }]}>
                This code is shown only once. Give it privately to {dependentName}. It works for 7 days, and only after every manager has agreed.
              </Text>
              <View style={[styles.codeBox, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text selectable style={[styles.codeText, { color: theme.brand }]}>{code}</Text>
              </View>
              <PressableSurface
                onPress={copyCode}
                accessibilityLabel="Copy the hand-over code"
                style={[styles.button, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              >
                <Feather name={copied ? 'check' : 'copy'} size={14} color={theme.brand} />
                <Text style={[styles.buttonText, { color: theme.brand }]}>{copied ? 'Copied' : 'Copy code'}</Text>
              </PressableSurface>
            </View>
          ) : null}

          {view.actions.map((action) => (
            <PressableSurface
              key={action.id}
              onPress={() => run(action.id)}
              disabled={busy !== null}
              accessibilityLabel={action.label}
              style={[
                styles.button,
                action.primary
                  ? { backgroundColor: theme.brand }
                  : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
              ]}
            >
              {busy === action.id ? (
                <ActivityIndicator size="small" color={action.primary ? theme.textOnBrand : theme.brand} />
              ) : (
                <Text style={[styles.buttonText, { color: action.primary ? theme.textOnBrand : theme.brand }]}>{action.label}</Text>
              )}
            </PressableSurface>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: MIN_TOUCH_TARGET,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.serifBold,
    fontSize: 16,
    lineHeight: 22,
  },
  details: {
    gap: 12,
    paddingBottom: 10,
  },
  body: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  codeBlock: {
    gap: 10,
  },
  codeBox: {
    padding: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADII.pill,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
});
