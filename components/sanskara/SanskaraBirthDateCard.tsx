import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { apiFetch } from '@/lib/api';
import { FONTS, themeColor } from '@/lib/constants';
import { formatLocalDateOnly } from '@/lib/dateOnly';
import { classifySaveError, describeSaveError, requestErrorFromResponse } from '@/lib/save-error';
import {
  BIRTH_DATE_CARD_COPY as COPY,
  BIRTH_DATE_MIN,
  birthDateState,
  birthDateToSave,
  type BirthDateState,
} from '@/lib/sanskaraBirthDate';
import { supabase } from '@/lib/supabase';

type Props = { userId: string };

/**
 * Offered above the hand-over code field when the signed-in profile has no date of birth (see lib/sanskaraBirthDate.ts). Keyed by the parent
 * on the identity, read on demand and never persisted. It renders nothing while loading, when a date is already saved, and when the read
 * failed (AGENTS 18); a late response for a previous identity or an older read is dropped (AGENTS 22).
 */
export function SanskaraBirthDateCard({ userId }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [state, setState] = useState<BirthDateState>('loading');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mounted = useRef(true);
  const readSeq = useRef(0);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    const seq = ++readSeq.current;
    setState('loading');
    setValue('');
    setError(null);
    void (async () => {
      const result = await supabase.from('profiles').select('date_of_birth').eq('id', userId).maybeSingle();
      if (!mounted.current || seq !== readSeq.current) return;
      setState(birthDateState({ data: result.data ?? null, error: result.error }));
    })().catch(() => {
      if (mounted.current && seq === readSeq.current) setState('unknown');
    });
  }, [userId]);

  const save = useCallback(async () => {
    if (saving) return;
    const parsed = birthDateToSave(value);
    if (!parsed.ok) {
      setError(COPY.invalid);
      return;
    }
    const seq = readSeq.current;
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch('/api/native/profile', {
        method: 'PATCH',
        body: JSON.stringify({ date_of_birth: parsed.iso }),
        expectedUserId: userId,
      });
      if (!response.ok) throw await requestErrorFromResponse(response);
      if (mounted.current && seq === readSeq.current) setState('saved');
    } catch (failure) {
      console.warn('[SanskaraBirthDate] save failed', classifySaveError(failure));
      if (mounted.current && seq === readSeq.current) {
        Alert.alert('Could not save', describeSaveError(failure, 'en', 'details'));
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  }, [saving, userId, value]);

  if (state !== 'missing') return null;

  return (
    <Card tone="auto" style={[styles.card, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{COPY.title}</Text>
      <Text style={[styles.body, { color: theme.dim }]}>{COPY.body}</Text>
      <DatePickerField
        label={COPY.field}
        value={value}
        onChangeDate={(next) => { setValue(next); setError(null); }}
        placeholder={COPY.placeholder}
        minDate={BIRTH_DATE_MIN}
        maxDate={formatLocalDateOnly(new Date())}
        modalTitle="Select Date of Birth"
      />
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.text }]}>{error}</Text> : null}
      <Button
        label={saving ? COPY.saving : COPY.save}
        loading={saving}
        disabled={saving || !value}
        onPress={() => { void save(); }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, gap: 10 },
  title: { fontFamily: FONTS.serifBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19 },
  error: { fontFamily: FONTS.sansMedium, fontSize: 13, lineHeight: 19 },
});
