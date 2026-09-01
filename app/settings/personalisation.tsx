import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { RADII, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import {
  CALENDAR_PROFILES,
  CALENDAR_SCOPES,
  NAKSHATRAS,
  ONBOARDING_GOALS,
  RASHIS,
  type CalendarProfileSlug,
  type CalendarScopeSlug,
} from '@/lib/profile-constants';
import { buildPersonalisationPatchPayload } from '@/lib/profile-personalisation';

type PersonalisationState = {
  tradition: string;
  rashi: string;
  nakshatra: string;
  gotra: string;
  calendar_profile: CalendarProfileSlug | '';
  calendar_scope: CalendarScopeSlug | '';
  goals: string[];
};

const INITIAL_STATE: PersonalisationState = {
  tradition: '',
  rashi: '',
  nakshatra: '',
  gotra: '',
  calendar_profile: '',
  calendar_scope: '',
  goals: [],
};

export default function PersonalisationScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PersonalisationState>(INITIAL_STATE);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('tradition, rashi, nakshatra, gotra, calendar_profile, calendar_scope, onboarding_goal')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    const goalsArray = data?.onboarding_goal
      ? data.onboarding_goal.split(',').map((g: string) => g.trim()).filter(Boolean)
      : [];

    setForm({
      tradition: data?.tradition ?? '',
      rashi: data?.rashi ?? '',
      nakshatra: data?.nakshatra ?? '',
      gotra: data?.gotra ?? '',
      calendar_profile: (data?.calendar_profile as CalendarProfileSlug) ?? '',
      calendar_scope: (data?.calendar_scope as CalendarScopeSlug) ?? '',
      goals: goalsArray,
    });
  }, []);

  const runLoad = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    loadData()
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    runLoad();
  }, [runLoad]);

  const isHindu = form.tradition === 'hindu';

  const toggleGoal = (goalKey: string) => {
    setForm((prev) => {
      const exists = prev.goals.includes(goalKey);
      const nextGoals = exists
        ? prev.goals.filter((g) => g !== goalKey)
        : [...prev.goals, goalKey];
      return { ...prev, goals: nextGoals };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPersonalisationPatchPayload({
        tradition: form.tradition,
        rashi: form.rashi,
        nakshatra: form.nakshatra,
        gotra: form.gotra,
        calendarProfile: form.calendar_profile,
        calendarScope: form.calendar_scope,
        goals: form.goals,
      });

      const response = await apiFetch('/api/native/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Save failed');
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      Alert.alert('Saved', 'Your personalisation preferences have been updated.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Check your connection and try again.';
      Alert.alert('Could not save', msg);
    } finally {
      setSaving(false);
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
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 20 }} showsVerticalScrollIndicator={false}>
        <BackButton fallbackHref="/settings" handleHardwareBack />

        <Text style={{ ...TYPE.screenTitle, color: theme.text }}>Personalisation</Text>

        {loadError ? (
          <EmptyState
            icon="wifi-off"
            title="Could not load your preferences"
            subtitle="Check your connection, then try again."
            ctaLabel="Retry"
            onCta={runLoad}
          />
        ) : (
          <>
            {/* ── Hindu-Only Astrological & Calendar Preferences ──────── */}
            {isHindu && (
              <>
                <View style={{ gap: 12 }}>
                  <SectionHeader label="Regional Calendar" />
                  <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      Select the calendar convention for your family tradition.
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {CALENDAR_PROFILES.map((p) => {
                        const selected = form.calendar_profile === p.slug;
                        return (
                          <Pill
                            key={p.slug}
                            label={p.label}
                            selected={selected}
                            onPress={() => {
                              setForm((prev) => ({
                                ...prev,
                                calendar_profile: selected ? '' : p.slug,
                              }));
                            }}
                          />
                        );
                      })}
                    </View>
                  </Card>
                </View>

                <View style={{ gap: 12 }}>
                  <SectionHeader label="Calendar Scope" />
                  <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      Choose between major festivals only or complete panchang observances.
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {CALENDAR_SCOPES.map((s) => {
                        const selected = form.calendar_scope === s.slug;
                        return (
                          <Pill
                            key={s.slug}
                            label={s.label}
                            selected={selected}
                            onPress={() => {
                              setForm((prev) => ({
                                ...prev,
                                calendar_scope: selected ? '' : s.slug,
                              }));
                            }}
                          />
                        );
                      })}
                    </View>
                  </Card>
                </View>

                <View style={{ gap: 12 }}>
                  <SectionHeader label="Birth Rashi (Moon Sign)" />
                  <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      Your moon sign for rashiphala and panchang timings.
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {RASHIS.map((r) => {
                        const selected = form.rashi === r.key;
                        return (
                          <Pill
                            key={r.key}
                            label={`${r.symbol} ${r.label}`}
                            selected={selected}
                            onPress={() => {
                              setForm((prev) => ({
                                ...prev,
                                rashi: selected ? '' : r.key,
                              }));
                            }}
                          />
                        );
                      })}
                    </View>
                  </Card>
                </View>

                <View style={{ gap: 12 }}>
                  <SectionHeader label="Birth Nakshatra (Star Mansion)" />
                  <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      Your birth star for personalized sacred day timings.
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {NAKSHATRAS.map((n) => {
                        const selected = form.nakshatra === n.key;
                        return (
                          <Pill
                            key={n.key}
                            label={`${n.symbol} ${n.label}`}
                            selected={selected}
                            onPress={() => {
                              setForm((prev) => ({
                                ...prev,
                                nakshatra: selected ? '' : n.key,
                              }));
                            }}
                          />
                        );
                      })}
                    </View>
                  </Card>
                </View>

                <View style={{ gap: 12 }}>
                  <SectionHeader label="Gotra (Lineage)" />
                  <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 8 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>
                      Lineage identifier for sankalpa and kul observances.
                    </Text>
                    <TextInput
                      value={form.gotra}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, gotra: value }))}
                      placeholder="e.g. Kashyap, Bharadvaja, Vasishtha"
                      placeholderTextColor={theme.dim}
                      maxLength={64}
                      style={{
                        minHeight: 52,
                        borderRadius: RADII.lg,
                        borderWidth: 1.5,
                        borderColor: theme.border,
                        paddingHorizontal: 16,
                        color: theme.text,
                        backgroundColor: theme.bg,
                        ...TYPE.body,
                      }}
                    />
                  </Card>
                </View>
              </>
            )}

            {/* ── Spiritual Practice Goals (All Traditions) ──────── */}
            <View style={{ gap: 12 }}>
              <SectionHeader label="Practice Goals" />
              <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
                <Text style={{ ...TYPE.caption, color: theme.dim }}>
                  Select the aspects of spiritual life you want to focus on.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ONBOARDING_GOALS.map((g) => {
                    const selected = form.goals.includes(g.key);
                    return (
                      <Pill
                        key={g.key}
                        label={`${g.emoji} ${g.label}`}
                        selected={selected}
                        onPress={() => toggleGoal(g.key)}
                      />
                    );
                  })}
                </View>
              </Card>
            </View>

            <Button
              label={saving ? 'Saving...' : 'Save preferences'}
              variant="primary"
              loading={saving}
              onPress={() => { void handleSave(); }}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
