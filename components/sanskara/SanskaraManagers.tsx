import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';
import {
  describeSanskaraFailure,
  executeSanskaraWrite,
  fetchSanskaraManagers,
  type SanskaraManagerPicker,
} from '@/lib/sanskara';
import { addManagerWarning, managerLabel, managersView, stepDownWarning } from '@/lib/sanskaraManagers';

type Props = {
  userId: string;
  subjectId: string;
  dependentName: string;
  /** Called after the caller stepped down, so the screen can reload and leave a child it can no longer see. */
  onSteppedDown: () => void;
};

function confirmDialog(title: string, body: string, action: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, body, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/**
 * Who manages one child, and the offer to add another adult from the same Kul (G4, contract E10). The parent keys it by identity and
 * child, so a different person or child always starts from nothing (AGENTS 22/24). The list is read here on demand and never
 * persisted. A failed read offers no action (AGENTS 18): "could not read" is not "you are the only manager".
 */
export function SanskaraManagers({ userId, subjectId, dependentName, onSteppedDown }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [picker, setPicker] = useState<SanskaraManagerPicker | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [choosing, setChoosing] = useState(false);

  const mounted = useRef(true);
  const loadSeq = useRef(0);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const next = await fetchSanskaraManagers(userId, subjectId);
      if (!mounted.current || seq !== loadSeq.current) return;
      setPicker(next);
      setFailed(false);
    } catch {
      if (!mounted.current || seq !== loadSeq.current) return;
      setFailed(true);
    }
  }, [userId, subjectId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (accountId: string, who: string) => {
    if (busy) return;
    setBusy(accountId);
    try {
      const warning = addManagerWarning(dependentName, who);
      if (!(await confirmDialog(warning.title, warning.body, 'Add manager'))) return;
      await executeSanskaraWrite(userId, 'add-manager', { subjectId, accountId });
      if (mounted.current) setChoosing(false);
      await load();
    } catch (error) {
      Alert.alert('Could not do that', describeSanskaraFailure(error, 'Could not add that manager. Please try again.'));
      await load();
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [busy, dependentName, load, subjectId, userId]);

  const stepDown = useCallback(async () => {
    if (busy) return;
    setBusy('step-down');
    try {
      const warning = stepDownWarning(dependentName);
      if (!(await confirmDialog(warning.title, warning.body, 'Stop managing'))) return;
      await executeSanskaraWrite(userId, 'remove-manager', { subjectId, accountId: userId });
      onSteppedDown();
    } catch (error) {
      Alert.alert('Could not do that', describeSanskaraFailure(error, 'Could not update the managers. Please try again.'));
      await load();
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [busy, dependentName, load, onSteppedDown, subjectId, userId]);

  if (!picker) return null;
  const view = managersView(picker, dependentName);
  // A sole manager is shown the offer without having to open the card: it is the one case where doing nothing deletes the timeline.
  const open = expanded ?? view.isSoleManager;

  return (
    <Card tone="auto" style={[styles.card, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
      <PressableSurface
        haptic="selection"
        onPress={() => setExpanded(!open)}
        accessibilityLabel={view.title}
        accessibilityHint={open ? 'Hides the details' : 'Shows the details'}
        accessibilityState={{ expanded: open }}
        style={styles.row}
      >
        <Feather name="users" size={18} color={theme.brand} />
        <Text style={[styles.title, { color: theme.text }]}>{view.title}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.dim} />
      </PressableSurface>

      {open ? (
        <View style={styles.details}>
          <Text style={[styles.body, { color: theme.dim }]}>{view.body}</Text>
          {failed ? (
            <Text style={[styles.body, { color: theme.dim }]}>This could not be refreshed just now, so what you see may be out of date.</Text>
          ) : null}

          {picker.managers.map((m) => (
            <View key={m.id} style={styles.person}>
              <Feather name="user" size={14} color={theme.dim} />
              <Text style={[styles.personText, { color: theme.text }]}>{m.is_me ? 'You' : managerLabel(m)}</Text>
            </View>
          ))}

          {view.canAdd ? (
            <PressableSurface
              onPress={() => setChoosing(!choosing)}
              disabled={busy !== null}
              accessibilityLabel={choosing ? 'Hide the list of Kul members' : 'Add a manager from your Kul'}
              style={[styles.button, { backgroundColor: view.isSoleManager ? theme.brand : theme.card, borderColor: theme.border, borderWidth: view.isSoleManager ? 0 : 1 }]}
            >
              <Text style={[styles.buttonText, { color: view.isSoleManager ? theme.textOnBrand : theme.brand }]}>
                {choosing ? 'Hide list' : 'Add a manager from your Kul'}
              </Text>
            </PressableSurface>
          ) : view.addHint ? (
            <Text style={[styles.body, { color: theme.dim }]}>{view.addHint}</Text>
          ) : null}

          {choosing && view.canAdd ? picker.candidates.map((c) => {
            const label = managerLabel(c);
            return (
              <PressableSurface
                key={c.id}
                onPress={() => add(c.id, label)}
                disabled={busy !== null}
                accessibilityLabel={`Add ${label} as a manager`}
                style={[styles.candidate, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Text style={[styles.personText, { color: theme.text }]}>{label}</Text>
                {busy === c.id ? <ActivityIndicator size="small" color={theme.brand} /> : <Feather name="plus" size={16} color={theme.brand} />}
              </PressableSurface>
            );
          }) : null}

          {view.canStepDown ? (
            <PressableSurface
              onPress={stepDown}
              disabled={busy !== null}
              accessibilityLabel={`Stop managing ${dependentName}`}
              style={[styles.button, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
            >
              {busy === 'step-down' ? <ActivityIndicator size="small" color={theme.brand} /> : <Text style={[styles.buttonText, { color: theme.brand }]}>Stop managing {dependentName}</Text>}
            </PressableSurface>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH_TARGET },
  title: { flex: 1, fontFamily: FONTS.serifBold, fontSize: 16, lineHeight: 22 },
  details: { gap: 12, paddingBottom: 10 },
  body: { fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personText: { flex: 1, fontFamily: FONTS.sansMedium, fontSize: 14, lineHeight: 20 },
  candidate: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADII.sm, borderWidth: 1, paddingHorizontal: 14,
  },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADII.pill, paddingHorizontal: 20,
  },
  buttonText: { fontFamily: FONTS.sansSemiBold, fontSize: 13, lineHeight: 18 },
});
