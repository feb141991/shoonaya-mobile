import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';

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
import { GENDERS, LIFE_STAGES, ageFromDob, type GenderKey, type LifeStageKey } from '@/lib/profile-constants';

type PersonalDetails = {
  date_of_birth: string;
  city: string;
  country: string;
  gender_context: string | null;
  life_stage: LifeStageKey | null;
};

const EMPTY_DETAILS: PersonalDetails = {
  date_of_birth: '',
  city: '',
  country: '',
  gender_context: null,
  life_stage: null,
};

export default function PersonalDetailsScreen() {
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<PersonalDetails>(EMPTY_DETAILS);
  // gender_context collapses male/prefer_not into "general" on save (same
  // lossy convention onboarding.tsx already uses -- see genderContext() in
  // lib/profile-constants.ts). That means a returning "general" value can't
  // be told apart from "prefer not to say" vs "male" was originally chosen.
  // Only "female" round-trips cleanly; anything else starts unselected here
  // rather than guessing which of the two it was.
  const [selectedGender, setSelectedGender] = useState<GenderKey | null>(null);

  const loadDetails = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('date_of_birth, city, country, gender_context, life_stage')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    setDetails({
      date_of_birth: data?.date_of_birth ?? '',
      city: data?.city ?? '',
      country: data?.country ?? '',
      gender_context: data?.gender_context ?? null,
      life_stage: (data?.life_stage as LifeStageKey) ?? null,
    });
    setSelectedGender(data?.gender_context === 'female' ? 'female' : null);
  }, []);

  const runLoad = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    loadDetails()
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [loadDetails]);

  useEffect(() => {
    runLoad();
  }, [runLoad]);

  const age = ageFromDob(details.date_of_birth);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiFetch('/api/native/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          date_of_birth: details.date_of_birth || null,
          city: details.city || null,
          country: details.country || null,
          gender_context: selectedGender === 'female' ? 'female' : selectedGender ? 'general' : null,
          life_stage: details.life_stage,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      Alert.alert('Saved', 'Your personal details have been updated.');
    } catch {
      Alert.alert('Could not save', 'Check your connection and try again.');
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
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 20 }} showsVerticalScrollIndicator={false}>
        <BackButton />

        <Text style={{ ...TYPE.screenTitle, color: theme.text }}>Personal Details</Text>

        {loadError ? (
          <EmptyState
            icon="wifi-off"
            title="Could not load your details"
            subtitle="Check your connection, then try again."
            ctaLabel="Retry"
            onCta={runLoad}
          />
        ) : (
          <>
            <View style={{ gap: 12 }}>
              <SectionHeader label="Date of birth" />
              <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 8 }}>
                <TextInput
                  value={details.date_of_birth}
                  onChangeText={(value) => setDetails((prev) => ({ ...prev, date_of_birth: value }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.dim}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  style={{
                    minHeight: 52,
                    borderRadius: RADII.lg,
                    borderWidth: 1.5,
                    borderColor: theme.border,
                    paddingHorizontal: 16,
                    color: theme.text,
                    ...TYPE.body,
                  }}
                />
                {age !== null ? (
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>Age {age}</Text>
                ) : null}
              </Card>
            </View>

            <View style={{ gap: 12 }}>
              <SectionHeader label="Location" />
              <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 12 }}>
                <View style={{ gap: 6 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>City</Text>
                  <TextInput
                    value={details.city}
                    onChangeText={(value) => setDetails((prev) => ({ ...prev, city: value }))}
                    placeholder="e.g. Mumbai"
                    placeholderTextColor={theme.dim}
                    style={{
                      minHeight: 52,
                      borderRadius: RADII.lg,
                      borderWidth: 1.5,
                      borderColor: theme.border,
                      paddingHorizontal: 16,
                      color: theme.text,
                      ...TYPE.body,
                    }}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={{ ...TYPE.caption, color: theme.dim }}>Country</Text>
                  <TextInput
                    value={details.country}
                    onChangeText={(value) => setDetails((prev) => ({ ...prev, country: value }))}
                    placeholder="e.g. India"
                    placeholderTextColor={theme.dim}
                    style={{
                      minHeight: 52,
                      borderRadius: RADII.lg,
                      borderWidth: 1.5,
                      borderColor: theme.border,
                      paddingHorizontal: 16,
                      color: theme.text,
                      ...TYPE.body,
                    }}
                  />
                </View>
              </Card>
            </View>

            <View style={{ gap: 12 }}>
              <SectionHeader label="Gender" />
              <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {GENDERS.map((g) => (
                    <Pill
                      key={g.key}
                      label={`${g.emoji} ${g.label}`}
                      selected={selectedGender === g.key}
                      onPress={() => setSelectedGender(g.key)}
                    />
                  ))}
                </View>
              </Card>
            </View>

            <View style={{ gap: 12 }}>
              <SectionHeader label="Stage of life" />
              <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {LIFE_STAGES.map((stage) => (
                    <Pill
                      key={stage.key}
                      label={`${stage.emoji} ${stage.label}`}
                      selected={details.life_stage === stage.key}
                      onPress={() => setDetails((prev) => ({ ...prev, life_stage: stage.key }))}
                    />
                  ))}
                </View>
              </Card>
            </View>

            <Button label={saving ? 'Saving...' : 'Save changes'} loading={saving} onPress={() => { void handleSave(); }} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
