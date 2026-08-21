import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { COLORS, FONTS, RADII, TRADITION_ACCENT } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, registerPushToken } from '@/lib/notifications';
import {
  LIFE_STAGES,
  GENDERS,
  CALENDAR_PROFILES,
  CALENDAR_SCOPES,
  genderContext,
  ageFromDob,
  suggestedLifeStage,
  type LifeStageKey,
  type GenderKey,
  type CalendarProfileSlug,
  type CalendarScopeSlug,
} from '@/lib/profile-constants';

// 'founderNote' is a preface, not a counted step — it sits before the
// tracked STEPS array on purpose (see below) so the "Step X of Y" progress
// dots still start counting at Tradition, the first real question. This is
// a brief, honest note from the founder shown once, before Shoonaya asks
// anything of the user — the "why" before the "what."
//
// 'calendarProfile' and 'calendarScope' are Hindu-only steps (regional
// amanta/purnimanta month-system convention + observance density), mirroring
// web onboarding's steps 11/13 -- see STEPS below for the conditional insert.
type Step = 'founderNote' | 'tradition' | 'personal' | 'nakshatra' | 'calendarProfile' | 'calendarScope' | 'goals' | 'name' | 'nameStory' | 'language' | 'notifications' | 'ready';

const TRADITIONS = [
  { key: 'hindu', label: 'Hindu', icon: 'sun' as const, emoji: '🪔', description: 'Mantras, panchang and daily sadhana' },
  { key: 'sikh', label: 'Sikh', icon: 'book-open' as const, emoji: '☬', description: 'Gurbani, nitnem and daily practice' },
  { key: 'buddhist', label: 'Buddhist', icon: 'circle' as const, emoji: '☸️', description: 'Sutras, mindfulness and daily practice' },
  { key: 'jain', label: 'Jain', icon: 'droplet' as const, emoji: '🤲', description: 'Sutras, tattva and daily practice' },
] as const;

type TraditionKey = (typeof TRADITIONS)[number]['key'];

const LANGUAGES = [
  { key: 'en', label: 'English', native: 'English' },
  { key: 'hi', label: 'Hindi', native: 'हिन्दी' },
] as const;

type LanguageKey = (typeof LANGUAGES)[number]['key'];

const RASHIS = [
  { key: 'mesha', label: 'Mesha', sanskrit: 'मेष', symbol: '♈', dates: 'Apr 14 - May 14' },
  { key: 'vrishabha', label: 'Vrishabha', sanskrit: 'वृषभ', symbol: '♉', dates: 'May 15 - Jun 14' },
  { key: 'mithuna', label: 'Mithuna', sanskrit: 'मिथुन', symbol: '♊', dates: 'Jun 15 - Jul 14' },
  { key: 'karka', label: 'Karka', sanskrit: 'कर्क', symbol: '♋', dates: 'Jul 15 - Aug 14' },
  { key: 'simha', label: 'Simha', sanskrit: 'सिंह', symbol: '♌', dates: 'Aug 15 - Sep 15' },
  { key: 'kanya', label: 'Kanya', sanskrit: 'कन्या', symbol: '♍', dates: 'Sep 16 - Oct 15' },
  { key: 'tula', label: 'Tula', sanskrit: 'तुला', symbol: '♎', dates: 'Oct 16 - Nov 14' },
  { key: 'vrishchika', label: 'Vrishchika', sanskrit: 'वृश्चिक', symbol: '♏', dates: 'Nov 15 - Dec 14' },
  { key: 'dhanu', label: 'Dhanu', sanskrit: 'धनु', symbol: '♐', dates: 'Dec 15 - Jan 13' },
  { key: 'makara', label: 'Makara', sanskrit: 'मकर', symbol: '♑', dates: 'Jan 14 - Feb 12' },
  { key: 'kumbha', label: 'Kumbha', sanskrit: 'कुम्भ', symbol: '♒', dates: 'Feb 13 - Mar 13' },
  { key: 'meena', label: 'Meena', sanskrit: 'मीन', symbol: '♓', dates: 'Mar 14 - Apr 13' },
] as const;

const NAKSHATRAS = [
  { key: 'ashwini', label: 'Ashwini', sanskrit: 'अश्विनी', ruler: 'Ketu', deity: 'Ashwini Kumaras', symbol: '🐴' },
  { key: 'bharani', label: 'Bharani', sanskrit: 'भरणी', ruler: 'Venus', deity: 'Yama', symbol: '⚖️' },
  { key: 'krittika', label: 'Krittika', sanskrit: 'कृत्तिका', ruler: 'Sun', deity: 'Agni', symbol: '🔥' },
  { key: 'rohini', label: 'Rohini', sanskrit: 'रोहिणी', ruler: 'Moon', deity: 'Brahma', symbol: '🌙' },
  { key: 'mrigashira', label: 'Mrigashira', sanskrit: 'मृगशिरा', ruler: 'Mars', deity: 'Soma', symbol: '🦌' },
  { key: 'ardra', label: 'Ardra', sanskrit: 'आर्द्रा', ruler: 'Rahu', deity: 'Rudra', symbol: '💧' },
  { key: 'punarvasu', label: 'Punarvasu', sanskrit: 'पुनर्वसु', ruler: 'Jupiter', deity: 'Aditi', symbol: '⭐' },
  { key: 'pushya', label: 'Pushya', sanskrit: 'पुष्य', ruler: 'Saturn', deity: 'Brihaspati', symbol: '🌸' },
  { key: 'ashlesha', label: 'Ashlesha', sanskrit: 'आश्लेषा', ruler: 'Mercury', deity: 'Naga', symbol: '🐍' },
  { key: 'magha', label: 'Magha', sanskrit: 'मघा', ruler: 'Ketu', deity: 'Pitrs', symbol: '👑' },
  { key: 'purva_phalguni', label: 'Purva Phalguni', sanskrit: 'पूर्व फाल्गुनी', ruler: 'Venus', deity: 'Bhaga', symbol: '🌺' },
  { key: 'uttara_phalguni', label: 'Uttara Phalguni', sanskrit: 'उत्तर फाल्गुनी', ruler: 'Sun', deity: 'Aryaman', symbol: '☀️' },
  { key: 'hasta', label: 'Hasta', sanskrit: 'हस्त', ruler: 'Moon', deity: 'Savitar', symbol: '✋' },
  { key: 'chitra', label: 'Chitra', sanskrit: 'चित्रा', ruler: 'Mars', deity: 'Vishwakarma', symbol: '💎' },
  { key: 'swati', label: 'Swati', sanskrit: 'स्वाती', ruler: 'Rahu', deity: 'Vayu', symbol: '🍃' },
  { key: 'vishakha', label: 'Vishakha', sanskrit: 'विशाखा', ruler: 'Jupiter', deity: 'Indra-Agni', symbol: '⚡' },
  { key: 'anuradha', label: 'Anuradha', sanskrit: 'अनुराधा', ruler: 'Saturn', deity: 'Mitra', symbol: '🤝' },
  { key: 'jyeshtha', label: 'Jyeshtha', sanskrit: 'ज्येष्ठा', ruler: 'Mercury', deity: 'Indra', symbol: '🛡️' },
  { key: 'mula', label: 'Mula', sanskrit: 'मूल', ruler: 'Ketu', deity: 'Nirriti', symbol: '🌿' },
  { key: 'purva_ashadha', label: 'Purva Ashadha', sanskrit: 'पूर्वाषाढ़', ruler: 'Venus', deity: 'Apas', symbol: '🌊' },
  { key: 'uttara_ashadha', label: 'Uttara Ashadha', sanskrit: 'उत्तराषाढ़', ruler: 'Sun', deity: 'Vishwadevas', symbol: '🏆' },
  { key: 'shravana', label: 'Shravana', sanskrit: 'श्रवण', ruler: 'Moon', deity: 'Vishnu', symbol: '👂' },
  { key: 'dhanishta', label: 'Dhanishta', sanskrit: 'धनिष्ठा', ruler: 'Mars', deity: 'Ashta Vasus', symbol: '🥁' },
  { key: 'shatabhisha', label: 'Shatabhisha', sanskrit: 'शतभिषा', ruler: 'Rahu', deity: 'Varuna', symbol: '💫' },
  { key: 'purva_bhadrapada', label: 'Purva Bhadrapada', sanskrit: 'पूर्व भाद्रपद', ruler: 'Jupiter', deity: 'Aja Ekapada', symbol: '⚔️' },
  { key: 'uttara_bhadrapada', label: 'Uttara Bhadrapada', sanskrit: 'उत्तर भाद्रपद', ruler: 'Saturn', deity: 'Ahir Budhnya', symbol: '🌊' },
  { key: 'revati', label: 'Revati', sanskrit: 'रेवती', ruler: 'Mercury', deity: 'Pushan', symbol: '🐟' },
] as const;

const GOALS = [
  { key: 'daily_practice', emoji: '🪔', label: 'Deepen my daily Sadhana', sub: 'Japa, meditation, nitya karma' },
  { key: 'deeper_faith', emoji: '🔱', label: 'Find my Ishta Devata / path', sub: "Discover your tradition's heart" },
  { key: 'community', emoji: '👥', label: 'Find my Mandali', sub: 'Sangat, community, belonging' },
  { key: 'peace', emoji: '🌌', label: "Questions science can't answer", sub: 'Philosophy, meaning, moksha' },
  { key: 'knowledge', emoji: '📚', label: 'Study the sacred texts', sub: 'Gita, Granth, Dhammapada, Agamas' },
  { key: 'new_guide', emoji: '🌱', label: "I'm new - guide me gently", sub: 'Begin from the very first step' },
] as const;

const READY_COPY: Record<TraditionKey, { heading: string; body: string }> = {
  hindu: { heading: '🪔 Hari Om', body: 'Your sadhana path is ready. Begin with Japa.' },
  sikh: { heading: '☬ Waheguru Ji', body: 'Your nitnem awaits. Begin your practice.' },
  buddhist: { heading: '☸️ Namo Buddhaya', body: 'Your meditation path is ready.' },
  jain: { heading: '🤲 Jai Jinendra', body: 'Your samayika path begins now.' },
};

const READY_FEATURES = [
  { emoji: '📿', label: 'Daily Japa', description: 'Mantra & mala' },
  { emoji: '📅', label: 'Panchang', description: 'Tithi & muhurta' },
  { emoji: '👥', label: 'Mandali', description: 'Your sangat' },
] as const;

// calendarProfile/calendarScope only apply to Hindu tradition (amanta/
// purnimanta regional convention has no meaning for Sikh/Buddhist/Jain
// users), mirroring web onboarding's own conditional step branching
// (OnboardingClient.tsx visibleStepsList) -- computed per-render from the
// current tradition selection, not a fixed constant.
function buildSteps(tradition: TraditionKey): Step[] {
  const base: Step[] = ['tradition', 'personal', 'nakshatra'];
  const calendarSteps: Step[] = tradition === 'hindu' ? ['calendarProfile', 'calendarScope'] : [];
  return [...base, ...calendarSteps, 'goals', 'name', 'nameStory', 'language', 'notifications', 'ready'];
}

const STEP_TITLES: Record<Step, string> = {
  founderNote: 'A note from our founder',
  tradition: 'Your tradition',
  personal: 'Personal details',
  nakshatra: 'Your Birth Nakshatra',
  calendarProfile: 'Your regional calendar',
  calendarScope: 'Calendar detail level',
  goals: 'What calls you here?',
  name: 'Your name',
  nameStory: 'Your Name Story',
  language: 'Your language',
  notifications: 'Daily reminders',
  ready: 'Ready',
};

function stepEyebrow(step: Step, steps: Step[]) {
  return `Step ${steps.indexOf(step) + 1} of ${steps.length}`;
}

type NameStory = {
  sacred_meaning?: string | null;
  name_story?: string | null;
  inner_quality?: string | null;
  life_blessing?: string | null;
  practice_suggestion?: string | null;
  name_mantra?: string | null;
  scripture_original?: string | null;
  scripture_translation?: string | null;
  scripture_source?: string | null;
};

function normalizeFirstName(value: string) {
  return value.trim().split(/\s+/)[0] ?? '';
}

function nameStoryTradition(value: TraditionKey) {
  if (value === 'hindu' || value === 'sikh' || value === 'buddhist' || value === 'jain') return value;
  return 'all';
}

function nameStoryLanguage(value: TraditionKey) {
  if (value === 'sikh') return 'pa';
  if (value === 'hindu') return 'hi';
  return 'en';
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const wellBg = isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight;
  const wellBgSelected = COLORS.selectionWellSelected;

  const [step, setStep] = useState<Step>('founderNote');
  const [tradition, setTradition] = useState<TraditionKey>('hindu');
  const [language, setLanguage] = useState<LanguageKey>('en');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<GenderKey>('prefer_not');
  const [lifeStage, setLifeStage] = useState<LifeStageKey>('brahmacharya');
  const [rashi, setRashi] = useState('');
  const [nakshatra, setNakshatra] = useState('');
  const [gotra, setGotra] = useState('');
  const [calendarProfile, setCalendarProfile] = useState<CalendarProfileSlug | ''>('');
  const [calendarScope, setCalendarScope] = useState<CalendarScopeSlug | ''>('');
  const [goals, setGoals] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [notificationsRequested, setNotificationsRequested] = useState(false);
  const [nameStory, setNameStory] = useState<NameStory | null>(null);
  const [nameStoryLoading, setNameStoryLoading] = useState(false);
  const [nameStoryError, setNameStoryError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const STEPS = buildSteps(tradition);
  const stepIndex = STEPS.indexOf(step);
  const age = ageFromDob(dateOfBirth);
  const suggestedStage = suggestedLifeStage(dateOfBirth);
  const readyCopy = READY_COPY[tradition];
  // Drives every selection accent from the 'tradition' step onward (kept
  // static COLORS.brandGold on founderNote, above, since that screen is
  // shown before the user has stated a preference).
  const accent = TRADITION_ACCENT[tradition];
  const traditionLabel = TRADITIONS.find((t) => t.key === tradition)?.label ?? 'your';

  const selectWithHaptic = async (callback: () => void) => {
    callback();
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  const handleDobChange = (value: string) => {
    setDateOfBirth(value);
    const nextStage = suggestedLifeStage(value);
    if (nextStage) setLifeStage(nextStage);
  };

  // Best-effort, non-blocking: saves the tradition choice the moment it's
  // made, so a user who abandons onboarding mid-way still has it recorded
  // instead of it only existing in local state until the final complete()
  // write. Mirrors complete()'s own update-then-upsert-fallback pattern
  // (a fresh sign-up's `profiles` row may not exist yet). Never awaited by
  // the caller and errors are swallowed -- complete() still writes the
  // authoritative full payload at the end, so a failed early write here is
  // a missed nicety, not data loss.
  const persistTraditionEarly = async (value: TraditionKey) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ tradition: value })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;

      if (!updated) {
        const fallbackUsername = `user_${user.id.replace(/-/g, '').slice(0, 12)}`;
        await supabase.from('profiles').upsert(
          { id: user.id, username: fallbackUsername, tradition: value },
          { onConflict: 'id' }
        );
      }
    } catch (error) {
      console.warn('[Onboarding] early tradition save failed', error);
    }
  };

  const goToStep = async (target: Step) => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setStep(target);
  };

  const goNext = async () => {
    const next = STEPS[stepIndex + 1];
    if (next) await goToStep(next);
  };

  const goBack = async () => {
    const previous = STEPS[stepIndex - 1];
    if (previous) await goToStep(previous);
  };

  const generateNameStory = async () => {
    const firstName = normalizeFirstName(name);
    if (!firstName || nameStoryLoading) return;

    setNameStoryLoading(true);
    setNameStoryError('');
    try {
      const response = await apiFetch('/api/name-story/generate', {
        method: 'POST',
        body: JSON.stringify({
          name,
          displayName: name,
          confirmedFirstName: firstName,
          tradition: nameStoryTradition(tradition),
          translationLanguage: nameStoryLanguage(tradition),
          intent: ['sacred_meaning', 'scripture_connection', 'inner_quality', 'name_mantra'],
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? 'Could not generate your Name Story.');
      }

      setNameStory((body?.data ?? null) as NameStory | null);
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (error) {
      setNameStoryError(error instanceof Error ? error.message : 'Could not generate your Name Story.');
    } finally {
      setNameStoryLoading(false);
    }
  };

  const handleAllowNotifications = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    await requestNotificationPermission();
    setNotificationsRequested(true);
    setStep('ready');
  };

  const complete = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const displayName = name.trim() || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Seeker';
        const profilePayload = {
          tradition,
          app_language: language,
          meaning_language: language,
          full_name: displayName,
          date_of_birth: dateOfBirth || null,
          gender_context: genderContext(gender),
          life_stage: lifeStage,
          rashi: rashi || null,
          nakshatra: nakshatra || null,
          gotra: gotra.trim() || null,
          calendar_profile: calendarProfile || null,
          calendar_scope: calendarScope || null,
          onboarding_goal: goals.join(','),
          wants_shloka_reminders: notificationsRequested,
          wants_community_notifications: notificationsRequested,
          onboarding_completed: true,
        };

        const { data: updatedProfile, error } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('id', user.id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!updatedProfile) {
          const fallbackUsername = `user_${user.id.replace(/-/g, '').slice(0, 12)}`;
          const { error: insertError } = await supabase.from('profiles').upsert(
            {
              id: user.id,
              username: fallbackUsername,
              ...profilePayload,
            },
            { onConflict: 'id' }
          );
          if (insertError) throw insertError;
        }

        void registerPushToken(user.id);
      }
    } catch (error) {
      console.error('[Onboarding] profile save failed', error);
      setSaveError(error instanceof Error ? error.message : 'Unable to save onboarding. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    router.replace('/(tabs)');
  };

  const renderSelectRow = ({
    key,
    selected,
    label,
    description,
    icon,
    emoji,
    onPress,
  }: {
    key: string;
    selected: boolean;
    label: string;
    description?: string;
    icon?: React.ComponentProps<typeof Feather>['name'];
    emoji?: string;
    onPress: () => void;
  }) => (
    <Pressable
      key={key}
      onPress={() => { void selectWithHaptic(onPress); }}
      accessibilityState={{ selected }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      accessibilityRole="button"
      style={{
        minHeight: 44,
        borderRadius: RADII.lg,
        borderWidth: 1.5,
        borderColor: selected ? accent : border,
        backgroundColor: selected ? cardBg : 'transparent',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? wellBgSelected : wellBg,
        }}
      >
        {icon ? <Feather name={icon} size={20} color={selected ? accent : dim} /> : null}
        {emoji ? <Text style={{ fontSize: 20 }}>{emoji}</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: selected ? accent : text }}>
          {label}
        </Text>
        {description ? (
          <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? <Feather name="check-circle" size={20} color={accent} /> : null}
    </Pressable>
  );

  return (
    <Screen style={{ backgroundColor: bg }}>
      {step !== 'founderNote' ? (
        <View accessible accessibilityLabel={stepEyebrow(step, STEPS)} style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 999,
                backgroundColor: i <= stepIndex ? accent : border,
              }}
            />
          ))}
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 24, paddingBottom: 32, flexGrow: step === 'founderNote' ? 1 : undefined }}
      >
        {step !== 'ready' && step !== 'founderNote' ? (
          <View style={{ gap: 10 }}>
            <SectionHeader label={stepEyebrow(step, STEPS)} />
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>
              {STEP_TITLES[step]}
            </Text>
          </View>
        ) : null}

        {step === 'founderNote' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 24 }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: wellBgSelected,
                borderWidth: 1.5,
                borderColor: COLORS.brandGold,
              }}
            >
              <Feather name="feather" size={22} color={COLORS.brandGold} />
            </View>

            <View style={{ gap: 4, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: FONTS.sansSemiBold,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: COLORS.brandGold,
                }}
              >
                Before we begin
              </Text>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, color: text, textAlign: 'center' }}>
                A note from our founder
              </Text>
            </View>

            <View style={{ gap: 16, maxWidth: 360 }}>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 17, lineHeight: 27, color: text, textAlign: 'center' }}>
                I didn&apos;t set out to build an app. I noticed I&apos;d quietly stopped doing the
                things that once grounded me — a few minutes of japa, a shloka before sleep — not
                all at once, just the way most things drift over busy years.
              </Text>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 17, lineHeight: 27, color: text, textAlign: 'center' }}>
                Shoonaya isn&apos;t meant to be one more app competing for your attention. It&apos;s
                the one I wished existed when I noticed — small enough to fit into a real day,
                honest enough to know some days you&apos;ll miss.
              </Text>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 17, lineHeight: 27, color: text, textAlign: 'center' }}>
                If it helps you come back to something you thought you&apos;d lost, it&apos;s done
                its job.
              </Text>
            </View>

            <View style={{ alignItems: 'center', gap: 2, marginTop: 4 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 19, letterSpacing: 0.4, color: text }}>
                Prince
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                Founder, Shoonaya
              </Text>
            </View>
          </View>
        )}

        {step === 'tradition' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              This one choice changes everything ahead — colors, calendar, mantras, and guidance all adapt to your path from here.
            </Text>
            <View style={{ gap: 12 }}>
              {TRADITIONS.map((t) => renderSelectRow({
                key: t.key,
                selected: tradition === t.key,
                label: t.label,
                description: t.description,
                icon: t.icon,
                onPress: () => {
                  setTradition(t.key);
                  void persistTraditionEarly(t.key);
                },
              }))}
            </View>
          </>
        )}

        {step === 'personal' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              Most apps make you dig up your birth date every time you check a muhurta. Save it once, and every {traditionLabel} reading — Panchang, life-stage guidance, Jyotish — is already yours.
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                Date of birth
              </Text>
              <TextInput
                value={dateOfBirth}
                onChangeText={handleDobChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={dim}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                style={{
                  minHeight: 52,
                  borderRadius: RADII.lg,
                  borderWidth: 1.5,
                  borderColor: border,
                  paddingHorizontal: 16,
                  color: text,
                  fontFamily: FONTS.sans,
                  fontSize: 16,
                  backgroundColor: cardBg,
                }}
              />
              {age !== null ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                  Age {age} · suggested stage {LIFE_STAGES.find((s) => s.key === suggestedStage)?.label}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: text }}>
                Your stage of life
              </Text>
              {LIFE_STAGES.map((stage) => renderSelectRow({
                key: stage.key,
                selected: lifeStage === stage.key,
                label: `${stage.label} · ${stage.age}`,
                description: stage.description,
                emoji: stage.emoji,
                onPress: () => setLifeStage(stage.key),
              }))}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                Gender
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {GENDERS.map((g) => {
                  const selected = gender === g.key;
                  return (
                    <PressableSurface
                      key={g.key}
                      haptic="none"
                      onPress={() => { void selectWithHaptic(() => setGender(g.key)); }}
                      accessibilityState={{ selected }}
                      style={{
                        flex: 1,
                        minHeight: 50,
                        borderRadius: RADII.lg,
                        borderWidth: 1.5,
                        borderColor: selected ? accent : border,
                        backgroundColor: selected ? cardBg : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 8,
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: selected ? accent : text, textAlign: 'center' }}>
                        {g.emoji} {g.label}
                      </Text>
                    </PressableSurface>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: text }}>
                Your Rashi
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {RASHIS.map((item) => {
                  const selected = rashi === item.key;
                  return (
                    <PressableSurface
                      key={item.key}
                      haptic="none"
                      onPress={() => { void selectWithHaptic(() => setRashi(selected ? '' : item.key)); }}
                      accessibilityState={{ selected }}
                      style={{
                        width: '31.5%',
                        minHeight: 104,
                        borderRadius: RADII.lg,
                        borderWidth: 1.5,
                        borderColor: selected ? accent : border,
                        backgroundColor: selected ? cardBg : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 8,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{item.symbol}</Text>
                      <Text style={{ marginTop: 4, fontFamily: FONTS.sansSemiBold, fontSize: 12, color: selected ? accent : text, textAlign: 'center' }}>
                        {item.label}
                      </Text>
                      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 11, color: dim, textAlign: 'center' }}>
                        {item.sanskrit}
                      </Text>
                      <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 9, color: dim, textAlign: 'center' }}>
                        {item.dates}
                      </Text>
                    </PressableSurface>
                  );
                })}
              </View>
            </View>

            {tradition === 'hindu' ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Gotra (optional)
                </Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19, color: dim }}>
                  You always forget it right when a priest asks. Save it once here, and Shoonaya remembers it for every sankalpa and puja.
                </Text>
                <TextInput
                  value={gotra}
                  onChangeText={setGotra}
                  placeholder="e.g. Bharadwaja"
                  placeholderTextColor={dim}
                  style={{
                    minHeight: 52,
                    borderRadius: RADII.lg,
                    borderWidth: 1.5,
                    borderColor: border,
                    paddingHorizontal: 16,
                    color: text,
                    fontFamily: FONTS.sans,
                    fontSize: 16,
                    backgroundColor: cardBg,
                  }}
                />
              </View>
            ) : null}
          </>
        )}

        {step === 'nakshatra' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              You've probably had to look this up more than once already. Save your Nakshatra now — more precise than your Rashi — and Shoonaya remembers it for every reading, forever. Not sure? Check a Janma Kundali app with your birth date, time and place, or skip for now.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {NAKSHATRAS.map((item) => {
                const selected = nakshatra === item.key;
                return (
                  <PressableSurface
                    key={item.key}
                    haptic="none"
                    onPress={() => { void selectWithHaptic(() => setNakshatra(selected ? '' : item.key)); }}
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${item.label}, ruled by ${item.ruler}, deity ${item.deity}`}
                    style={{
                      width: '31.5%',
                      minHeight: 102,
                      borderRadius: RADII.lg,
                      borderWidth: 1.5,
                      borderColor: selected ? accent : border,
                      backgroundColor: selected ? cardBg : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 8,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{item.symbol}</Text>
                    <Text style={{ marginTop: 4, fontFamily: FONTS.sansSemiBold, fontSize: 11, color: selected ? accent : text, textAlign: 'center' }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontFamily: FONTS.serifBold, fontSize: 10, color: dim, textAlign: 'center' }}>
                      {item.sanskrit}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>
            {nakshatra ? (
              <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: border, backgroundColor: cardBg, padding: 14 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: accent, textAlign: 'center' }}>
                  {NAKSHATRAS.find((n) => n.key === nakshatra)?.label} · Ruled by {NAKSHATRAS.find((n) => n.key === nakshatra)?.ruler} · Deity: {NAKSHATRAS.find((n) => n.key === nakshatra)?.deity}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {step === 'calendarProfile' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              Choose it once and stop second-guessing which date is right — every festival and vrat you see from here will already match your family's own regional convention.
            </Text>
            <View style={{ gap: 12 }}>
              {CALENDAR_PROFILES.map((item) => renderSelectRow({
                key: item.slug,
                selected: calendarProfile === item.slug,
                label: item.label,
                description: `${item.system} · ${item.era}`,
                icon: 'calendar',
                onPress: () => setCalendarProfile(calendarProfile === item.slug ? '' : item.slug),
              }))}
            </View>
          </>
        )}

        {step === 'calendarScope' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              Set it once so your dashboard never feels cluttered or sparse — just the level of detail that actually fits how closely you follow your practice.
            </Text>
            <View style={{ gap: 12 }}>
              {CALENDAR_SCOPES.map((item) => renderSelectRow({
                key: item.slug,
                selected: calendarScope === item.slug,
                label: item.label,
                description: item.desc,
                icon: 'sliders',
                onPress: () => setCalendarScope(item.slug),
              }))}
            </View>
          </>
        )}

        {step === 'goals' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              Tell us once, and stop wading through content that isn't for you — this shapes your entire feed, guidance, and path from here. Choose one or more.
            </Text>
            <View style={{ gap: 12 }}>
              {GOALS.map((item) => renderSelectRow({
                key: item.key,
                selected: goals.includes(item.key),
                label: item.label,
                description: item.sub,
                emoji: item.emoji,
                onPress: () => {
                  setGoals((current) => current.includes(item.key) ? current.filter((goal) => goal !== item.key) : [...current, item.key]);
                },
              }))}
            </View>
          </>
        )}

        {step === 'name' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              This is how you&apos;ll appear to your Mandali — get it right once, and you'll never have to explain who you are again.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name or spiritual name"
              placeholderTextColor={dim}
              style={{
                minHeight: 54,
                borderRadius: RADII.lg,
                borderWidth: 1.5,
                borderColor: border,
                paddingHorizontal: 16,
                color: text,
                fontFamily: FONTS.sans,
                fontSize: 16,
                backgroundColor: cardBg,
              }}
            />
          </>
        )}

        {step === 'nameStory' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              Most people never learn the sacred meaning behind their own name. Shoonaya can reveal it in a gentle, AI-guided reflection — optional, and yours to keep once generated.
            </Text>

            <View style={{ borderRadius: RADII.xl, borderWidth: 1, borderColor: border, backgroundColor: cardBg, padding: 18, gap: 12 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: accent, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                Analyzing significance for
              </Text>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 26, color: text }}>
                {name.trim() || 'Your name'}
              </Text>
              {!name.trim() ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
                  Go back and enter your name first.
                </Text>
              ) : null}
            </View>

            {!nameStory && !nameStoryLoading ? (
              <View style={{ gap: 10 }}>
                <Button
                  label="Reveal my Name Story"
                  onPress={() => { void generateNameStory(); }}
                  disabled={!name.trim()}
                />
                <Button label="Skip for now" variant="ghost" onPress={() => { void goNext(); }} />
              </View>
            ) : null}

            {nameStoryLoading ? (
              <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <ActivityIndicator color={accent} />
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                  Dharma Mitra is reading the sound and meaning of your name...
                </Text>
              </View>
            ) : null}

            {nameStoryError ? (
              <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg, padding: 14 }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: COLORS.danger }}>
                  {nameStoryError}
                </Text>
              </View>
            ) : null}

            {nameStory ? (
              <View style={{ borderRadius: RADII.xl, borderWidth: 1, borderColor: border, backgroundColor: cardBg, padding: 18, gap: 14 }}>
                {nameStory.sacred_meaning ? (
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 22, lineHeight: 28, color: text }}>
                    {nameStory.sacred_meaning}
                  </Text>
                ) : null}
                {nameStory.name_story ? (
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22, color: text }}>
                    {nameStory.name_story}
                  </Text>
                ) : null}
                {nameStory.name_mantra ? (
                  <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.homeBorderSoftLight, backgroundColor: wellBg, padding: 14, gap: 6 }}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Name mantra
                    </Text>
                    <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: text }}>
                      {nameStory.name_mantra}
                    </Text>
                  </View>
                ) : null}
                {nameStory.practice_suggestion ? (
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20, color: dim }}>
                    {nameStory.practice_suggestion}
                  </Text>
                ) : null}
                <Button label="Continue" onPress={() => { void goNext(); }} />
              </View>
            ) : null}
          </>
        )}

        {step === 'language' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              Set it once and every meaning, mantra, and explanation Shoonaya shows you from here speaks in the language you actually think in.
            </Text>
            <View style={{ gap: 12 }}>
              {LANGUAGES.map((l) => renderSelectRow({
                key: l.key,
                selected: language === l.key,
                label: l.label,
                description: l.native,
                icon: 'globe',
                onPress: () => setLanguage(l.key),
              }))}
            </View>
          </>
        )}

        {step === 'notifications' && (
          <>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 21, color: dim }}>
              Sadhana is easy to intend and easy to forget. A gentle nudge at the right moment is the difference — receive your daily shloka, streak reminders, and Mandali mentions. Adjust anytime in Settings.
            </Text>
            <View style={{ borderRadius: RADII.xl, borderWidth: 1, borderColor: border, backgroundColor: cardBg, padding: 20, gap: 16 }}>
              {[
                { icon: 'book-open' as const, label: 'Daily shloka notification' },
                { icon: 'zap' as const, label: 'Streak reminders' },
                { icon: 'users' as const, label: 'Mandali mentions' },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: wellBg }}>
                    <Feather name={item.icon} size={16} color={accent} />
                  </View>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 14, color: text }}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 10 }}>
              <Button label="Allow notifications" onPress={() => { void handleAllowNotifications(); }} disabled={saving} loading={saving} />
              <Button
                label="Not now"
                variant="ghost"
                onPress={() => {
                  setNotificationsRequested(false);
                  setStep('ready');
                }}
                disabled={saving}
              />
            </View>
          </>
        )}

        {step === 'ready' && (
          <View style={{ minHeight: 560, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <View style={{ width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: wellBgSelected, borderWidth: 1.5, borderColor: accent }}>
              <Text style={{ fontSize: 38 }}>{TRADITIONS.find((t) => t.key === tradition)?.emoji}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text, textAlign: 'center' }}>
                {readyCopy.heading}
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22, color: dim, textAlign: 'center' }}>
                {readyCopy.body}
              </Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, textAlign: 'center' }}>
                Your sanctuary awaits.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {READY_FEATURES.map((item) => (
                <View key={item.label} style={{ flex: 1, minHeight: 100, borderRadius: RADII.lg, borderWidth: 1, borderColor: border, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                  <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                  <Text style={{ marginTop: 5, fontFamily: FONTS.sansSemiBold, fontSize: 11, color: text, textAlign: 'center' }}>
                    {item.label}
                  </Text>
                  <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 9, color: dim, textAlign: 'center' }}>
                    {item.description}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ width: '100%', gap: 10 }}>
              <Button label="Begin my Sadhana" onPress={() => { void complete(); }} disabled={saving} loading={saving} />
              <Button label="Explore Shoonaya" variant="ghost" onPress={() => { void complete(); }} disabled={saving} />
              {saveError ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, lineHeight: 18, color: COLORS.danger, textAlign: 'center' }}>
                  {saveError}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {step === 'founderNote' ? (
        <View style={{ marginTop: 16 }}>
          <Button label="Begin your journey" onPress={() => { void goToStep('tradition'); }} />
        </View>
      ) : null}

      {step !== 'notifications' && step !== 'ready' && step !== 'nameStory' && step !== 'founderNote' ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {stepIndex > 0 ? <Button label="Back" variant="ghost" onPress={() => { void goBack(); }} style={{ flex: 1 }} /> : null}
          <Button label={step === 'nakshatra' || step === 'name' || step === 'calendarProfile' || step === 'calendarScope' ? 'Continue / Skip' : 'Continue'} onPress={() => { void goNext(); }} style={{ flex: 1 }} />
        </View>
      ) : null}
    </Screen>
  );
}
