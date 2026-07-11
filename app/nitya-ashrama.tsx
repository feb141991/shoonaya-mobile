import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, MIN_TOUCH_TARGET, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { spiritualDate } from '@/lib/spiritualDate';
import { getAshramaMeta, getAshramaDuties, type LifeStage, type GenderContext, type AshramaDuty } from '@/lib/ashrama';

function getFeatherIcon(name: string): keyof typeof Feather.glyphMap {
  const map: Record<string, keyof typeof Feather.glyphMap> = {
    kul: 'users',
    mandali: 'users',
    landmark: 'map-pin',
    sparkles: 'star',
    activity: 'activity',
  };
  const resolved = map[name] || name;
  return resolved as keyof typeof Feather.glyphMap;
}

const ASHRAMA_OPTIONS: { key: LifeStage; emoji: string; title: string; desc: string }[] = [
  { key: 'brahmacharya', emoji: '⭐', title: 'Vidhyarthi / Student', desc: 'A stage for study, discipline, learning, and self-purification.' },
  { key: 'grihastha', emoji: '🛕', title: 'Grihasthi / Householder', desc: 'A stage for career, family duty, social charity, and work.' },
  { key: 'vanaprastha', emoji: '🌳', title: 'Bujurg / Forest Dweller', desc: 'A stage for gradual withdrawal, mentoring, and simple living.' },
  { key: 'sannyasa', emoji: '💨', title: 'Seva-Mukt / Renunciate', desc: 'A stage for deep contemplation, service, and complete surrender.' },
];

export default function NityaAshramaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    lifeStage: LifeStage | null;
    genderCtx: GenderContext | null;
    tradition: string;
    timezone: string;
  } | null>(null);

  // Setup state
  const [selectedStage, setSelectedStage] = useState<LifeStage | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderContext>('general');
  const [savingSetup, setSavingSetup] = useState(false);

  // Duties Checklist state
  const [duties, setDuties] = useState<AshramaDuty[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [storageKey, setStorageKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      setUserId(user.id);

      const { data: prof } = await supabase
        .from('profiles')
        .select('life_stage, gender_context, tradition, timezone')
        .eq('id', user.id)
        .maybeSingle();

      const stage = prof?.life_stage as LifeStage | null;
      const gc = prof?.gender_context as GenderContext | null;
      const trad = prof?.tradition ?? 'hindu';
      const tz = prof?.timezone ?? 'UTC';

      setProfile({
        lifeStage: stage,
        genderCtx: gc,
        tradition: trad,
        timezone: tz,
      });

      if (stage) {
        const loadedDuties = getAshramaDuties(trad, stage, gc);
        setDuties(loadedDuties);

        const today = spiritualDate(tz);
        const sKey = `ashrama_checks_${user.id}_${today}`;
        setStorageKey(sKey);

        const raw = await AsyncStorage.getItem(sKey);
        setCheckedIds(new Set<string>(raw ? JSON.parse(raw) : []));
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSetup = async () => {
    if (!userId || !selectedStage) return;
    setSavingSetup(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          life_stage: selectedStage,
          gender_context: selectedGender,
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Ashrama Dharma Unlocked 🙏', 'Your daily duties have been personalised.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save setup.');
    } finally {
      setSavingSetup(false);
    }
  };

  const handleResetStage = () => {
    Alert.alert(
      'Reset Stage',
      'Change your current Ashrama life stage duties?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: () => {
            setSelectedStage(null);
            setProfile(prev => prev ? { ...prev, lifeStage: null } : null);
          }
        }
      ]
    );
  };

  const toggleDuty = async (id: string) => {
    if (!storageKey) return;
    const next = new Set(checkedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedIds(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify([...next]));
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  // 1. Render Setup Prompt if lifeStage is null
  if (!profile || !profile.lifeStage) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="chevron-left" size={16} color={theme.dim} />
            <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </Pressable>

          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Ashrama Dharma</Text>
          <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: -8 }}>
            Select the life stage that best matches where you are. Your daily dharma duties will be personalised.
          </Text>

          {/* Gender Context Selection */}
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Practice Context</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['general', 'female'] as const).map((g) => {
                const active = selectedGender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setSelectedGender(g)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? COLORS.brandGold : theme.border,
                      backgroundColor: active ? theme.brandSoft : theme.bg,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: active ? COLORS.brandGold : theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                      {g === 'general' ? 'General' : 'Female'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Life Stages */}
          <View style={{ gap: 10 }}>
            {ASHRAMA_OPTIONS.map((opt) => {
              const active = selectedStage === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSelectedStage(opt.key)}
                  style={{
                    backgroundColor: active ? theme.brandSoft : theme.card,
                    borderColor: active ? COLORS.brandGold : theme.border,
                    borderWidth: active ? 1.5 : 1,
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{opt.emoji}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>{opt.title}</Text>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 16 }}>{opt.desc}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={24} color={COLORS.brandGold} />}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleSaveSetup}
            disabled={savingSetup || !selectedStage}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              backgroundColor: theme.brand,
              paddingVertical: 16,
              borderRadius: 24,
              alignItems: 'center',
              marginTop: 12,
              opacity: savingSetup || !selectedStage ? 0.6 : 1,
            }}
          >
            {savingSetup ? <ActivityIndicator color={COLORS.ink} /> : <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Unlock Ashrama Dharma</Text>}
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  // 2. Render Checklist if lifeStage is set
  const meta = getAshramaMeta(profile.tradition, profile.lifeStage, profile.genderCtx);
  const completedCount = duties.filter(d => checkedIds.has(d.id)).length;

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="chevron-left" size={16} color={theme.dim} />
            <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </Pressable>

          <Pressable onPress={handleResetStage} style={{ backgroundColor: COLORS.dangerBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ color: COLORS.danger, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>Change Stage</Text>
          </Pressable>
        </View>

        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: meta.accent, fontFamily: FONTS.sansSemiBold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
              {meta.label} Stage ({meta.ageRange} years)
            </Text>
          </View>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>
            Ashrama Dharma
          </Text>
          <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14 }}>
            {meta.subtitle}
          </Text>
        </View>

        {/* Progress Card */}
        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
            {completedCount} of {duties.length} reflected today
          </Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight, overflow: 'hidden' }}>
            <View style={{ width: `${duties.length > 0 ? (completedCount / duties.length) * 100 : 0}%`, height: '100%', backgroundColor: meta.accent }} />
          </View>
        </Card>

        {/* Duties list */}
        <View style={{ gap: 10 }}>
          {duties.map((duty) => {
            const isChecked = checkedIds.has(duty.id);
            return (
              <Pressable
                key={duty.id}
                onPress={() => toggleDuty(duty.id)}
                style={{
                  backgroundColor: isChecked ? COLORS.successBg : theme.card,
                  borderColor: isChecked ? COLORS.successBorder : theme.border,
                  borderWidth: 1,
                  borderRadius: 20,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Custom icon mapping if SacredIcon has it, else generic */}
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={getFeatherIcon(duty.icon)} size={18} color={theme.text} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15, textDecorationLine: isChecked ? 'line-through' : 'none' }}>
                    {duty.label}
                  </Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
                    {duty.description}
                    {duty.minutes ? ` · ${duty.minutes} min` : ''}
                  </Text>
                </View>

                {isChecked ? (
                  <Feather name="check-circle" size={22} color={COLORS.success} />
                ) : (
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.dim }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
