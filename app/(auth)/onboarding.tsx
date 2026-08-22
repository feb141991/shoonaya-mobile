import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { FounderNoteInterlude } from '@/components/onboarding/FounderNoteInterlude';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, TRADITION_ACCENT, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, checkNotificationPermission, registerPushToken } from '@/lib/notifications';
import {
  type Step,
  type NotificationChoice,
  buildSteps,
  getActiveSteps,
  stepEyebrow,
  buildOnboardingProfilePayload,
  getOnboardingReadyPracticeCta,
  computeFinalNotificationState,
} from '@/lib/onboarding-contract';
import { saveOnboardingDraft, readOnboardingDraft, clearOnboardingDraft, type OnboardingDraftData } from '@/lib/onboardingDraft';
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

const TRADITIONS = [
  { key: 'hindu', label: 'Hindu', labelHi: 'हिंदू', icon: 'sun' as const, emoji: '🪔', description: 'Mantras, panchang and daily sadhana', descriptionHi: 'मंत्र, पंचांग और दैनिक साधना' },
  { key: 'sikh', label: 'Sikh', labelHi: 'सिख', icon: 'book-open' as const, emoji: '☬', description: 'Gurbani, nitnem and daily practice', descriptionHi: 'गुरबाणी, नितनेम और दैनिक अभ्यास' },
  { key: 'buddhist', label: 'Buddhist', labelHi: 'बौद्ध', icon: 'circle' as const, emoji: '☸️', description: 'Sutras, mindfulness and daily practice', descriptionHi: 'सूत्र, सजगता और दैनिक अभ्यास' },
  { key: 'jain', label: 'Jain', labelHi: 'जैन', icon: 'droplet' as const, emoji: '🤲', description: 'Sutras, tattva and daily practice', descriptionHi: 'सूत्र, तत्त्व और दैनिक अभ्यास' },
] as const;

type TraditionKey = (typeof TRADITIONS)[number]['key'];

const LANGUAGES = [
  { key: 'en', label: 'English', native: 'English' },
  { key: 'hi', label: 'Hindi', native: 'हिन्दी' },
] as const;

type LanguageKey = (typeof LANGUAGES)[number]['key'];

const RASHIS = [
  { key: 'mesha', label: 'Mesha', sanskrit: 'मेष', symbol: '♈', dates: 'Apr 14 - May 14', datesHi: '14 अप्रैल - 14 मई' },
  { key: 'vrishabha', label: 'Vrishabha', sanskrit: 'वृषभ', symbol: '♉', dates: 'May 15 - Jun 14', datesHi: '15 मई - 14 जून' },
  { key: 'mithuna', label: 'Mithuna', sanskrit: 'मिथुन', symbol: '♊', dates: 'Jun 15 - Jul 14', datesHi: '15 जून - 14 जुलाई' },
  { key: 'karka', label: 'Karka', sanskrit: 'कर्क', symbol: '♋', dates: 'Jul 15 - Aug 14', datesHi: '15 जुलाई - 14 अगस्त' },
  { key: 'simha', label: 'Simha', sanskrit: 'सिंह', symbol: '♌', dates: 'Aug 15 - Sep 15', datesHi: '15 अगस्त - 15 सितंबर' },
  { key: 'kanya', label: 'Kanya', sanskrit: 'कन्या', symbol: '♍', dates: 'Sep 16 - Oct 15', datesHi: '16 सितंबर - 15 अक्टूबर' },
  { key: 'tula', label: 'Tula', sanskrit: 'तुला', symbol: '♎', dates: 'Oct 16 - Nov 14', datesHi: '16 अक्टूबर - 14 नवंबर' },
  { key: 'vrishchika', label: 'Vrishchika', sanskrit: 'वृश्चिक', symbol: '♏', dates: 'Nov 15 - Dec 14', datesHi: '15 नवंबर - 14 दिसंबर' },
  { key: 'dhanu', label: 'Dhanu', sanskrit: 'धनु', symbol: '♐', dates: 'Dec 15 - Jan 13', datesHi: '15 दिसंबर - 13 जनवरी' },
  { key: 'makara', label: 'Makara', sanskrit: 'मकर', symbol: '♑', dates: 'Jan 14 - Feb 12', datesHi: '14 जनवरी - 12 फरवरी' },
  { key: 'kumbha', label: 'Kumbha', sanskrit: 'कुम्भ', symbol: '♒', dates: 'Feb 13 - Mar 13', datesHi: '13 फरवरी - 13 मार्च' },
  { key: 'meena', label: 'Meena', sanskrit: 'मीन', symbol: '♓', dates: 'Mar 14 - Apr 13', datesHi: '14 मार्च - 13 अप्रैल' },
] as const;

const NAKSHATRAS = [
  { key: 'ashwini', label: 'Ashwini', sanskrit: 'अश्विनी', ruler: 'Ketu', rulerHi: 'केतु', deity: 'Ashwini Kumaras', deityHi: 'अश्विनी कुमार', symbol: '🐴' },
  { key: 'bharani', label: 'Bharani', sanskrit: 'भरणी', ruler: 'Venus', rulerHi: 'शुक्र', deity: 'Yama', deityHi: 'यम', symbol: '⚖️' },
  { key: 'krittika', label: 'Krittika', sanskrit: 'कृत्तिका', ruler: 'Sun', rulerHi: 'सूर्य', deity: 'Agni', deityHi: 'अग्नि', symbol: '🔥' },
  { key: 'rohini', label: 'Rohini', sanskrit: 'रोहिणी', ruler: 'Moon', rulerHi: 'चंद्र', deity: 'Brahma', deityHi: 'ब्रह्मा', symbol: '🌙' },
  { key: 'mrigashira', label: 'Mrigashira', sanskrit: 'मृगशिरा', ruler: 'Mars', rulerHi: 'मंगल', deity: 'Soma', deityHi: 'सोम', symbol: '🦌' },
  { key: 'ardra', label: 'Ardra', sanskrit: 'आर्द्रा', ruler: 'Rahu', rulerHi: 'राहु', deity: 'Rudra', deityHi: 'रुद्र', symbol: '💧' },
  { key: 'punarvasu', label: 'Punarvasu', sanskrit: 'पुनर्वसु', ruler: 'Jupiter', rulerHi: 'गुरु', deity: 'Aditi', deityHi: 'अदिति', symbol: '⭐' },
  { key: 'pushya', label: 'Pushya', sanskrit: 'पुष्य', ruler: 'Saturn', rulerHi: 'शनि', deity: 'Brihaspati', deityHi: 'बृहस्पति', symbol: '🌸' },
  { key: 'ashlesha', label: 'Ashlesha', sanskrit: 'आश्लेषा', ruler: 'Mercury', rulerHi: 'बुध', deity: 'Naga', deityHi: 'नाग', symbol: '🐍' },
  { key: 'magha', label: 'Magha', sanskrit: 'मघा', ruler: 'Ketu', rulerHi: 'केतु', deity: 'Pitrs', deityHi: 'पितृ', symbol: '👑' },
  { key: 'purva_phalguni', label: 'Purva Phalguni', sanskrit: 'पूर्व फाल्गुनी', ruler: 'Venus', rulerHi: 'शुक्र', deity: 'Bhaga', deityHi: 'भग', symbol: '🌺' },
  { key: 'uttara_phalguni', label: 'Uttara Phalguni', sanskrit: 'उत्तर फाल्गुनी', ruler: 'Sun', rulerHi: 'सूर्य', deity: 'Aryaman', deityHi: 'अर्यमा', symbol: '☀️' },
  { key: 'hasta', label: 'Hasta', sanskrit: 'हस्त', ruler: 'Moon', rulerHi: 'चंद्र', deity: 'Savitar', deityHi: 'सविता', symbol: '✋' },
  { key: 'chitra', label: 'Chitra', sanskrit: 'चित्रा', ruler: 'Mars', rulerHi: 'मंगल', deity: 'Vishwakarma', deityHi: 'विश्वकर्मा', symbol: '💎' },
  { key: 'swati', label: 'Swati', sanskrit: 'स्वाती', ruler: 'Rahu', rulerHi: 'राहु', deity: 'Vayu', deityHi: 'वायु', symbol: '🍃' },
  { key: 'vishakha', label: 'Vishakha', sanskrit: 'विशाखा', ruler: 'Jupiter', rulerHi: 'गुरु', deity: 'Indra-Agni', deityHi: 'इन्द्राग्नि', symbol: '⚡' },
  { key: 'anuradha', label: 'Anuradha', sanskrit: 'अनुराधा', ruler: 'Saturn', rulerHi: 'शनि', deity: 'Mitra', deityHi: 'मित्र', symbol: '🤝' },
  { key: 'jyeshtha', label: 'Jyeshtha', sanskrit: 'ज्येष्ठा', ruler: 'Mercury', rulerHi: 'बुध', deity: 'Indra', deityHi: 'इंद्र', symbol: '🛡️' },
  { key: 'mula', label: 'Mula', sanskrit: 'मूल', ruler: 'Ketu', rulerHi: 'केतु', deity: 'Nirriti', deityHi: 'निर्ऋति', symbol: '🌿' },
  { key: 'purva_ashadha', label: 'Purva Ashadha', sanskrit: 'पूर्वाषाढ़', ruler: 'Venus', rulerHi: 'शुक्र', deity: 'Apas', deityHi: 'आपः', symbol: '🌊' },
  { key: 'uttara_ashadha', label: 'Uttara Ashadha', sanskrit: 'उत्तराषाढ़', ruler: 'Sun', rulerHi: 'सूर्य', deity: 'Vishwadevas', deityHi: 'विश्वेदेव', symbol: '🏆' },
  { key: 'shravana', label: 'Shravana', sanskrit: 'श्रवण', ruler: 'Moon', rulerHi: 'चंद्र', deity: 'Vishnu', deityHi: 'विष्णु', symbol: '👂' },
  { key: 'dhanishta', label: 'Dhanishta', sanskrit: 'धनिष्ठा', ruler: 'Mars', rulerHi: 'मंगल', deity: 'Ashta Vasus', deityHi: 'अष्ट वसु', symbol: '🥁' },
  { key: 'shatabhisha', label: 'Shatabhisha', sanskrit: 'शतभिषा', ruler: 'Rahu', rulerHi: 'राहु', deity: 'Varuna', deityHi: 'वरुण', symbol: '💫' },
  { key: 'purva_bhadrapada', label: 'Purva Bhadrapada', sanskrit: 'पूर्व भाद्रपद', ruler: 'Jupiter', rulerHi: 'गुरु', deity: 'Aja Ekapada', deityHi: 'अज एकपाद', symbol: '⚔️' },
  { key: 'uttara_bhadrapada', label: 'Uttara Bhadrapada', sanskrit: 'उत्तर भाद्रपद', ruler: 'Saturn', rulerHi: 'शनि', deity: 'Ahir Budhnya', deityHi: 'अहिर्बुध्न्य', symbol: '🌊' },
  { key: 'revati', label: 'Revati', sanskrit: 'रेवती', ruler: 'Mercury', rulerHi: 'बुध', deity: 'Pushan', deityHi: 'पूषा', symbol: '🐟' },
] as const;

const GOALS = [
  { key: 'daily_practice', emoji: '🪔', label: 'Deepen my daily practice', labelHi: 'दैनिक अभ्यास गहरा करना', sub: 'Prayer, meditation and sacred routine', subHi: 'प्रार्थना, ध्यान और पवित्र दिनचर्या' },
  { key: 'deeper_faith', emoji: '✨', label: 'Deepen my faith and path', labelHi: 'अपनी आस्था और मार्ग को गहरा करना', sub: "Discover your tradition's heart", subHi: 'अपनी परंपरा के मर्म को जानें' },
  { key: 'community', emoji: '👥', label: 'Find my community', labelHi: 'अपना समुदाय खोजना', sub: 'Sangat, community and belonging', subHi: 'संगत, समुदाय और अपनापन' },
  { key: 'peace', emoji: '🌌', label: 'Find peace and meaning', labelHi: 'शांति और अर्थ खोजना', sub: 'Philosophy, reflection and inner clarity', subHi: 'दर्शन, चिंतन और आंतरिक स्पष्टता' },
  { key: 'knowledge', emoji: '📚', label: 'Study sacred texts', labelHi: 'पवित्र ग्रंथों का अध्ययन', sub: 'Read texts from your selected tradition', subHi: 'अपनी चुनी परंपरा के ग्रंथ पढ़ें' },
  { key: 'new_guide', emoji: '🌱', label: "I'm new - guide me gently", labelHi: 'मैं नया हूँ — सहज मार्गदर्शन चाहिए', sub: 'Begin from the first step', subHi: 'पहले कदम से शुरू करें' },
] as const;

const LIFE_STAGE_HI: Record<LifeStageKey, { label: string; description: string }> = {
  brahmacharya: { label: 'ब्रह्मचर्य', description: 'विद्यार्थी — सीखना, निर्माण और शुद्धि' },
  grihastha: { label: 'गृहस्थ', description: 'गृहस्थ जीवन — कार्य, परिवार और धर्म' },
  vanaprastha: { label: 'वानप्रस्थ', description: 'मार्गदर्शन, विरक्ति और आत्मचिंतन' },
  sannyasa: { label: 'संन्यास', description: 'त्याग, मुक्ति और समर्पण' },
};

const GENDER_HI: Record<GenderKey, string> = {
  male: 'पुरुष',
  female: 'महिला',
  prefer_not: 'नहीं बताना चाहता/चाहती',
};

const CALENDAR_PROFILE_HI: Record<CalendarProfileSlug, { label: string; description: string }> = {
  north_indian_purnimanta: { label: 'उत्तर भारतीय', description: 'पूर्णिमांत (पूर्णिमा पर मास समाप्ति) · विक्रम संवत' },
  gujarati_amanta: { label: 'गुजराती', description: 'अमांत (अमावस्या पर मास समाप्ति) · विक्रम संवत' },
  marathi_amanta: { label: 'मराठी', description: 'अमांत · शक संवत' },
  kannada_amanta: { label: 'कन्नड़', description: 'अमांत · शक संवत' },
  telugu_amanta: { label: 'तेलुगु', description: 'अमांत · शक संवत' },
  tamil_solar: { label: 'तमिल', description: 'सौर (संक्रांति पर मास प्रारंभ) · तमिल कालगणना' },
  malayalam_solar: { label: 'मलयालम', description: 'सौर · कोल्लम कालगणना' },
  bengali_solar: { label: 'बंगाली', description: 'सौर · बंगाली सन' },
  odia: { label: 'ओड़िया', description: 'अमांत / सौर नियम · शक संवत' },
  nepali_bikram: { label: 'नेपाली', description: 'पूर्णिमांत · विक्रम संवत (नेपाल)' },
  global_sanatan: { label: 'वैश्विक सनातन', description: 'अमांत · विक्रम संवत' },
};

const CALENDAR_SCOPE_HI: Record<CalendarScopeSlug, { label: string; description: string }> = {
  major_only: {
    label: 'केवल प्रमुख पर्व',
    description: 'मुख्य त्योहार, व्रत और उपवास दिवसों वाला सरल पंचांग।',
  },
  all_observances: {
    label: 'सभी पर्व और तिथियाँ',
    description: 'छोटी खगोलीय घटनाओं, स्थानीय पर्वों और मानक तिथियों सहित पूर्ण सूची।',
  },
};

const READY_COPY: Record<TraditionKey, { heading: string; body: string; bodyHi: string }> = {
  hindu: { heading: '🪔 Hari Om', body: 'Your sadhana path is ready. Begin with Japa.', bodyHi: 'आपका साधना मार्ग तैयार है। जप से शुरू करें।' },
  sikh: { heading: '☬ Waheguru Ji', body: 'Your nitnem awaits. Begin your practice.', bodyHi: 'आपका नितनेम तैयार है। अपना अभ्यास शुरू करें।' },
  buddhist: { heading: '☸️ Namo Buddhaya', body: 'Your meditation path is ready.', bodyHi: 'आपका ध्यान मार्ग तैयार है।' },
  jain: { heading: '🤲 Jai Jinendra', body: 'Your samayika path begins now.', bodyHi: 'आपका सामायिक मार्ग अब प्रारंभ होता है।' },
};

const READY_FEATURES: Record<TraditionKey, ReadonlyArray<{ emoji: string; label: string; labelHi: string; description: string; descriptionHi: string }>> = {
  hindu: [
    { emoji: '📿', label: 'Daily Japa', labelHi: 'दैनिक जप', description: 'Mantra & mala', descriptionHi: 'मंत्र और माला' },
    { emoji: '📅', label: 'Panchang', labelHi: 'पंचांग', description: 'Tithi & muhurta', descriptionHi: 'तिथि और मुहूर्त' },
    { emoji: '👥', label: 'Mandali', labelHi: 'मंडली', description: 'Your sangat', descriptionHi: 'आपकी संगत' },
  ],
  sikh: [
    { emoji: '📖', label: 'Nitnem', labelHi: 'नितनेम', description: 'Daily bani', descriptionHi: 'दैनिक बाणी' },
    { emoji: '☬', label: 'Gurbani', labelHi: 'गुरबाणी', description: 'Read & reflect', descriptionHi: 'पढ़ें और चिंतन करें' },
    { emoji: '👥', label: 'Mandali', labelHi: 'मंडली', description: 'Your sangat', descriptionHi: 'आपकी संगत' },
  ],
  buddhist: [
    { emoji: '🧘', label: 'Meditation', labelHi: 'ध्यान', description: 'Daily stillness', descriptionHi: 'दैनिक स्थिरता' },
    { emoji: '📖', label: 'Sutras', labelHi: 'सूत्र', description: 'Read & reflect', descriptionHi: 'पढ़ें और चिंतन करें' },
    { emoji: '👥', label: 'Mandali', labelHi: 'मंडली', description: 'Your sangha', descriptionHi: 'आपका संघ' },
  ],
  jain: [
    { emoji: '🧘', label: 'Samayika', labelHi: 'सामायिक', description: 'Daily equanimity', descriptionHi: 'दैनिक समता' },
    { emoji: '📖', label: 'Agamas', labelHi: 'आगम', description: 'Read & reflect', descriptionHi: 'पढ़ें और चिंतन करें' },
    { emoji: '👥', label: 'Mandali', labelHi: 'मंडली', description: 'Your community', descriptionHi: 'आपका समुदाय' },
  ],
};

const STEP_TITLES: Record<Step, string> = {
  preferences: 'Make Shoonaya yours',
  personal: 'Personal details',
  nakshatra: 'Your Birth Nakshatra',
  calendarProfile: 'Your regional calendar',
  calendarScope: 'Calendar detail level',
  goals: 'What calls you here?',
  name: 'Your name',
  notifications: 'Daily reminders',
  ready: 'Ready',
};

const STEP_TITLES_HI: Record<Step, string> = {
  preferences: 'Shoonaya को अपना बनाएं',
  personal: 'व्यक्तिगत विवरण',
  nakshatra: 'आपका जन्म नक्षत्र',
  calendarProfile: 'आपका क्षेत्रीय पंचांग',
  calendarScope: 'पंचांग का विस्तार',
  goals: 'आप यहाँ किसलिए आए हैं?',
  name: 'आपका नाम',
  notifications: 'दैनिक स्मरण',
  ready: 'तैयार',
};

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

export default function OnboardingScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);
  const bg = theme.bg;
  const cardBg = theme.card;
  const border = theme.border;
  const text = theme.text;
  const dim = theme.dim;
  const wellBg = isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight;
  const wellBgSelected = COLORS.selectionWellSelected;

  const [step, setStep] = useState<Step>('preferences');
  const [founderNoteContext, setFounderNoteContext] = useState<{
    tradition: TraditionKey;
    language: LanguageKey;
  } | null>(null);
  const [tradition, setTradition] = useState<TraditionKey | null>(null);
  const [language, setLanguage] = useState<LanguageKey | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<GenderKey>('prefer_not');
  const [lifeStage, setLifeStage] = useState<LifeStageKey | null>(null);
  const [isManualLifeStage, setIsManualLifeStage] = useState(false);
  const [rashi, setRashi] = useState('');
  const [nakshatra, setNakshatra] = useState('');
  const [gotra, setGotra] = useState('');
  const [calendarProfile, setCalendarProfile] = useState<CalendarProfileSlug | ''>('');
  const [calendarScope, setCalendarScope] = useState<CalendarScopeSlug | ''>('');
  const [goals, setGoals] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [notificationChoice, setNotificationChoice] = useState<NotificationChoice>('unset');
  const [notificationsDenied, setNotificationsDenied] = useState(false);
  const [requestingNotifications, setRequestingNotifications] = useState(false);
  const [nameStory, setNameStory] = useState<NameStory | null>(null);
  const [nameStoryLoading, setNameStoryLoading] = useState(false);
  const [nameStoryError, setNameStoryError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const userIdRef = useRef<string | null>(null);

  const getCachedUserId = async (): Promise<string | null> => {
    if (userIdRef.current) return userIdRef.current;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
        return user.id;
      }
    } catch {}
    return null;
  };

  const STEPS = buildSteps(tradition);
  const activeSteps = getActiveSteps(STEPS);
  const stepIndex = STEPS.indexOf(step);
  const age = ageFromDob(dateOfBirth);
  const suggestedStage = suggestedLifeStage(dateOfBirth);
  const readyCopy = tradition ? READY_COPY[tradition] : READY_COPY.hindu;
  const accent = tradition ? TRADITION_ACCENT[tradition] : COLORS.brandGold;
  const traditionLabel = TRADITIONS.find((t) => t.key === tradition)?.label ?? 'spiritual';
  const stepTitle = language === 'hi' ? STEP_TITLES_HI[step] : STEP_TITLES[step];
  const isHindi = language === 'hi';
  const translated = (english: string, hindi: string) => (isHindi ? hindi : english);

  const selectWithHaptic = async (callback: () => void) => {
    callback();
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  useEffect(() => {
    let isMounted = true;
    async function restoreDraft() {
      try {
        const uid = await getCachedUserId();
        if (!uid || !isMounted) return;
        const draft = await readOnboardingDraft(uid);
        if (draft && isMounted) {
          if (draft.tradition) setTradition(draft.tradition);
          if (draft.language) setLanguage(draft.language);
          if (draft.dateOfBirth) setDateOfBirth(draft.dateOfBirth);
          if (draft.gender) setGender(draft.gender);
          if (draft.lifeStage !== undefined) setLifeStage(draft.lifeStage);
          if (draft.isManualLifeStage !== undefined) setIsManualLifeStage(draft.isManualLifeStage);
          if (draft.rashi) setRashi(draft.rashi);
          if (draft.nakshatra) setNakshatra(draft.nakshatra);
          if (draft.gotra) setGotra(draft.gotra);
          if (draft.calendarProfile) setCalendarProfile(draft.calendarProfile);
          if (draft.calendarScope) setCalendarScope(draft.calendarScope);
          if (draft.goals) setGoals(draft.goals);
          if (draft.name) setName(draft.name);
          if (draft.notificationChoice) {
            setNotificationChoice(draft.notificationChoice);
          }
          if (draft.deniedNotificationPromptShown) {
            setNotificationsDenied(true);
          }
          if (draft.step) setStep(draft.step);
        }
      } catch {}
    }
    void restoreDraft();
    return () => {
      isMounted = false;
    };
  }, []);

  const syncDraft = async (targetStep: Step, overrides: Partial<OnboardingDraftData> = {}) => {
    try {
      const uid = await getCachedUserId();
      if (!uid) return;
      await saveOnboardingDraft(uid, {
        step: targetStep,
        tradition,
        language,
        dateOfBirth,
        gender,
        lifeStage,
        isManualLifeStage,
        rashi,
        nakshatra,
        gotra,
        calendarProfile,
        calendarScope,
        goals,
        name,
        notificationChoice,
        deniedNotificationPromptShown: notificationsDenied,
        ...overrides,
      });
    } catch {}
  };

  const handleDobChange = (value: string) => {
    setDateOfBirth(value);
    if (!value) {
      if (!isManualLifeStage) setLifeStage(null);
      return;
    }
    const nextStage = suggestedLifeStage(value);
    if (!isManualLifeStage) {
      setLifeStage(nextStage);
    }
  };

  // Best-effort, non-blocking: these first-screen choices must be available
  // to later server-backed content even if onboarding is abandoned midway.
  const persistPreferenceEarly = async (
    payload: { tradition?: TraditionKey; app_language?: LanguageKey; meaning_language?: LanguageKey }
  ) => {
    try {
      const uid = await getCachedUserId();
      if (!uid) return;

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', uid)
        .select('id')
        .maybeSingle();

      if (updateError) {
        console.warn('[Onboarding] early preference update failed', updateError.message);
      }

      if (!updated && !updateError) {
        const fallbackUsername = `user_${uid.replace(/-/g, '').slice(0, 12)}`;
        const { error: upsertError } = await supabase.from('profiles').upsert(
          { id: uid, username: fallbackUsername, ...payload },
          { onConflict: 'id' }
        );
        if (upsertError) {
          console.warn('[Onboarding] early preference upsert fallback failed', upsertError.message);
        }
      }
    } catch (error) {
      console.warn('[Onboarding] early preference unexpected exception', error);
    }
  };

  const goToStep = (nextStep: Step, overrides: Partial<OnboardingDraftData> = {}) => {
    setStep(nextStep);
    void syncDraft(nextStep, overrides);
  };

  const goNext = () => {
    if (step === 'preferences') {
      if (!tradition || !language) return;
      void persistPreferenceEarly({ tradition, app_language: language, meaning_language: language });
      setFounderNoteContext({ tradition, language });
      return;
    }
    const next = STEPS[stepIndex + 1];
    if (next) goToStep(next);
  };

  const goBack = () => {
    if (stepIndex > 0) {
      const prevStep = STEPS[stepIndex - 1];
      goToStep(prevStep);
    }
  };

  const continueFromFounderNote = () => {
    setFounderNoteContext(null);
    goToStep('personal');
  };

  const generateNameStory = async () => {
    const firstName = normalizeFirstName(name);
    if (!firstName || !tradition || !language || nameStoryLoading) return;

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
          translationLanguage: language,
          intent: ['sacred_meaning', 'scripture_connection', 'inner_quality', 'name_mantra'],
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? (isHindi ? 'आपके नाम की कथा तैयार नहीं हो सकी।' : 'Could not generate your Name Story.'));
      }

      setNameStory((body?.data ?? null) as NameStory | null);
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (error) {
      setNameStoryError(error instanceof Error ? error.message : (isHindi ? 'आपके नाम की कथा तैयार नहीं हो सकी।' : 'Could not generate your Name Story.'));
    } finally {
      setNameStoryLoading(false);
    }
  };

  const handleAllowNotifications = async () => {
    if (requestingNotifications || saving) return;
    setRequestingNotifications(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationChoice('enabled');
        setNotificationsDenied(false);
        goToStep('ready', { notificationChoice: 'enabled' });
      } else {
        setNotificationChoice('disabled');
        setNotificationsDenied(true);
        void syncDraft('notifications', {
          notificationChoice: 'disabled',
          deniedNotificationPromptShown: true,
        });
      }
    } catch {
      setNotificationChoice('disabled');
      setNotificationsDenied(true);
      void syncDraft('notifications', {
        notificationChoice: 'disabled',
        deniedNotificationPromptShown: true,
      });
    } finally {
      setRequestingNotifications(false);
    }
  };

  const handleNotNow = () => {
    if (requestingNotifications || saving) return;
    setNotificationChoice('disabled');
    setNotificationsDenied(false);
    goToStep('ready', { notificationChoice: 'disabled' });
  };

  const complete = async (destination?: Href) => {
    if (saving) return;
    if (!tradition || !language) {
      setSaveError(isHindi ? 'आगे बढ़ने से पहले अपनी भाषा और परंपरा चुनें।' : 'Choose your language and tradition before continuing.');
      goToStep('preferences');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Re-check live OS permission and compute final notification state
        const osPermissionGranted = await checkNotificationPermission();
        const finalNotificationsEnabled = computeFinalNotificationState(notificationChoice, osPermissionGranted);

        const displayName = name.trim() || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Seeker';
        const profilePayload = buildOnboardingProfilePayload({
          displayName,
          tradition,
          language,
          dateOfBirth,
          gender,
          lifeStage,
          rashi,
          nakshatra,
          gotra,
          calendarProfile,
          calendarScope,
          goals,
          notificationsEnabled: finalNotificationsEnabled,
        });

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

        if (finalNotificationsEnabled) {
          void registerPushToken(user.id);
        }

        await clearOnboardingDraft(user.id);
      }
    } catch (error) {
      console.error('[Onboarding] profile save failed', error);
      setSaveError(error instanceof Error ? error.message : (isHindi ? 'ऑनबोर्डिंग सहेजने में असमर्थ। कृपया पुनः प्रयास करें।' : 'Unable to save onboarding. Please try again.'));
      setSaving(false);
      return;
    }

    setSaving(false);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    router.replace(destination ?? '/(tabs)');
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
        minHeight: 52,
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
        <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 16, lineHeight: isHindi ? 22 : 20, color: selected ? accent : text }}>
          {label}
        </Text>
        {description ? (
          <Text style={{ marginTop: 2, fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 12, lineHeight: isHindi ? 18 : 17, color: dim }}>
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? <Feather name="check-circle" size={20} color={accent} /> : null}
    </Pressable>
  );

  if (founderNoteContext) {
    return (
      <FounderNoteInterlude
        key={`${founderNoteContext.language}-${founderNoteContext.tradition}`}
        language={founderNoteContext.language}
        tradition={founderNoteContext.tradition}
        onBack={() => setFounderNoteContext(null)}
        onContinue={continueFromFounderNote}
      />
    );
  }

  return (
    <Screen style={{ backgroundColor: bg }}>
      {step !== 'ready' ? (
        <View accessible accessibilityLabel={stepEyebrow(step, STEPS, language)} style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {activeSteps.map((s, i) => (
            <View
              key={s}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 999,
                backgroundColor: i <= activeSteps.indexOf(step) ? accent : border,
              }}
            />
          ))}
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 24, paddingBottom: 32 }}
      >
        {step !== 'ready' ? (
          <View style={{ gap: 8 }}>
            <SectionHeader
              label={
                step === 'preferences'
                  ? (language === 'hi' ? 'अपनी यात्रा शुरू करें' : 'BEGIN YOUR JOURNEY')
                  : stepEyebrow(step, STEPS, language)
              }
            />
            <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.serifBold, fontSize: 28, lineHeight: isHindi ? 38 : 34, color: text }}>
              {step === 'preferences'
                ? (language === 'hi' ? 'Shoonaya को अपना बनाएं' : 'Make Shoonaya yours')
                : stepTitle}
            </Text>
            {step === 'preferences' ? (
              <Text
                style={{
                  fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.sans,
                  fontSize: 14,
                  lineHeight: 20,
                  color: dim,
                }}
              >
                {language === 'hi'
                  ? 'अपनी भाषा और परंपरा चुनें। आपकी दैनिक साधना, पंचांग और मार्गदर्शन इसी के अनुसार तैयार होंगे।'
                  : 'Choose your language and tradition to personalize your daily sadhana, calendar, and sacred guidance.'}
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 'preferences' && (
          <View style={{ gap: 20 }}>
            {/* Language Segmented Control */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold,
                  fontSize: 12,
                  color: dim,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {language === 'hi' ? 'भाषा' : 'Language'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  borderRadius: RADII.lg,
                  backgroundColor: isDark ? COLORS.cardBgDark : COLORS.surfaceSoftLight,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  padding: 4,
                  gap: 6,
                }}
              >
                {LANGUAGES.map((item) => {
                  const isSelected = language === item.key;
                  return (
                    <PressableSurface
                      key={item.key}
                      onPress={() => {
                        void selectWithHaptic(() => {
                          setLanguage(item.key);
                          setNameStory(null);
                          setNameStoryError('');
                          void persistPreferenceEarly({ app_language: item.key, meaning_language: item.key });
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${item.label}, ${item.native}`}
                      haptic="none"
                      style={{
                        flex: 1,
                        minHeight: MIN_TOUCH_TARGET,
                        borderRadius: RADII.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: isSelected
                          ? (isDark ? COLORS.surfaceSoftDark : COLORS.cardBgLight)
                          : 'transparent',
                        borderWidth: 1,
                        borderColor: isSelected ? theme.brand : 'transparent',
                        boxShadow: isSelected ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: item.key === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold,
                          fontSize: item.key === 'hi' ? 15 : 14,
                          color: isSelected ? theme.brand : dim,
                        }}
                      >
                        {item.native}
                      </Text>
                      {isSelected ? <Feather name="check" size={15} color={theme.brand} /> : null}
                    </PressableSurface>
                  );
                })}
              </View>
            </View>

            {/* Tradition Selector */}
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold,
                  fontSize: 12,
                  color: dim,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {language === 'hi' ? 'परंपरा' : 'Tradition'}
              </Text>
              <View style={{ gap: 10 }}>
                {TRADITIONS.map((t) => {
                  const isSelected = tradition === t.key;
                  const traditionAccent = TRADITION_ACCENT[t.key];
                  const title = language === 'hi' ? t.labelHi : t.label;
                  const desc = language === 'hi' ? t.descriptionHi : t.description;

                  return (
                    <PressableSurface
                      key={t.key}
                      onPress={() => {
                        void selectWithHaptic(() => {
                          setTradition(t.key);
                          setNameStory(null);
                          setNameStoryError('');
                          if (t.key !== 'hindu') {
                            setRashi('');
                            setNakshatra('');
                            setGotra('');
                            setCalendarProfile('');
                            setCalendarScope('');
                          }
                          void persistPreferenceEarly({ tradition: t.key });
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${title}, ${desc}`}
                      haptic="none"
                      style={{
                        minHeight: 58,
                        borderRadius: RADII.lg,
                        borderWidth: 1.5,
                        borderColor: isSelected ? traditionAccent : border,
                        backgroundColor: isSelected
                          ? (isDark ? COLORS.surfaceSoftDark : COLORS.cardBgLight)
                          : cardBg,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 14,
                        boxShadow: isSelected ? (isDark ? SHADOWS.sm.dark : SHADOWS.sm.light) : undefined,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                            : wellBg,
                        }}
                      >
                        <Feather name={t.icon} size={19} color={isSelected ? traditionAccent : dim} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold,
                            fontSize: 15,
                            lineHeight: isHindi ? 21 : 19,
                            color: text,
                          }}
                        >
                          {title}
                        </Text>
                        <Text
                          style={{
                            marginTop: 1,
                            fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.sans,
                            fontSize: 12,
                            color: dim,
                            lineHeight: isHindi ? 18 : 16,
                          }}
                        >
                          {desc}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? traditionAccent : 'transparent',
                          borderWidth: isSelected ? 0 : 1.5,
                          borderColor: border,
                        }}
                      >
                        {isSelected ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
                      </View>
                    </PressableSurface>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {step === 'personal' && (
          <>
            <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: isHindi ? 23 : 21, color: dim }}>
              {language === 'hi'
                ? (tradition === 'hindu'
                    ? 'जन्मतिथि एक बार सहेजें। Shoonaya इसे आपके पंचांग, ज्योतिष और जीवन-चरण मार्गदर्शन के लिए उपयोग करेगा।'
                    : 'कुछ वैकल्पिक विवरण सहेजें ताकि Shoonaya आपके जीवन-चरण और चुनी हुई परंपरा के अनुरूप मार्गदर्शन दे सके।')
                : (tradition === 'hindu'
                    ? 'Save your birth date once so Shoonaya can personalize Panchang, Jyotish and life-stage guidance.'
                    : `Save a few optional details so Shoonaya can adapt ${traditionLabel} guidance to your stage of life.`)}
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 12, color: dim, textTransform: isHindi ? 'none' : 'uppercase', letterSpacing: isHindi ? 0 : 1 }}>
                {translated('Date of birth', 'जन्मतिथि')}
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
                <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 12, color: dim }}>
                  {isHindi
                    ? `आयु ${age} · सुझाया गया चरण ${suggestedStage ? LIFE_STAGE_HI[suggestedStage].label : ''}`
                    : `Age ${age} · suggested stage ${LIFE_STAGES.find((s) => s.key === suggestedStage)?.label}`}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.serifBold, fontSize: 20, lineHeight: isHindi ? 28 : 24, color: text }}>
                {translated('Your stage of life', 'आपका जीवन चरण')}
              </Text>
              {LIFE_STAGES.map((stage) => renderSelectRow({
                key: stage.key,
                selected: lifeStage === stage.key,
                label: `${isHindi ? LIFE_STAGE_HI[stage.key].label : stage.label} · ${isHindi ? `आयु ${stage.age}` : stage.age}`,
                description: isHindi ? LIFE_STAGE_HI[stage.key].description : stage.description,
                emoji: stage.emoji,
                onPress: () => {
                  setLifeStage((prev) => (prev === stage.key ? null : stage.key));
                  setIsManualLifeStage(true);
                },
              }))}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 12, color: dim, textTransform: isHindi ? 'none' : 'uppercase', letterSpacing: isHindi ? 0 : 1 }}>
                {translated('Gender', 'लिंग')}
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
                      <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 13, color: selected ? accent : text, textAlign: 'center' }}>
                        {g.emoji} {isHindi ? GENDER_HI[g.key] : g.label}
                      </Text>
                    </PressableSurface>
                  );
                })}
              </View>
            </View>

            {tradition === 'hindu' ? (
              <View style={{ gap: 12 }}>
                <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.serifBold, fontSize: 20, lineHeight: isHindi ? 28 : 24, color: text }}>
                  {translated('Your Rashi', 'आपकी राशि')}
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
                        <Text style={{ marginTop: 4, fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 12, color: selected ? accent : text, textAlign: 'center' }}>
                          {isHindi ? item.sanskrit : item.label}
                        </Text>
                        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 11, color: dim, textAlign: 'center' }}>
                          {isHindi ? item.label : item.sanskrit}
                        </Text>
                        <Text style={{ marginTop: 2, fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 9, color: dim, textAlign: 'center' }}>
                          {isHindi ? item.datesHi : item.dates}
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {tradition === 'hindu' ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 12, color: dim, textTransform: isHindi ? 'none' : 'uppercase', letterSpacing: isHindi ? 0 : 1 }}>
                  {translated('Gotra (optional)', 'गोत्र (वैकल्पिक)')}
                </Text>
                <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 13, lineHeight: isHindi ? 19 : 18, color: dim }}>
                  {translated(
                    'Save it once here, and Shoonaya can remember it for future sankalpa and puja details.',
                    'इसे एक बार यहाँ सहेजें, ताकि Shoonaya भविष्य के संकल्प और पूजा विवरण में इसे याद रख सके।'
                  )}
                </Text>
                <TextInput
                  value={gotra}
                  onChangeText={setGotra}
                  placeholder={translated('e.g. Bharadwaja', 'जैसे भारद्वाज')}
                  placeholderTextColor={dim}
                  style={{
                    minHeight: 52,
                    borderRadius: RADII.lg,
                    borderWidth: 1.5,
                    borderColor: border,
                    paddingHorizontal: 16,
                    color: text,
                    fontFamily: isHindi ? FONTS.devanagari : FONTS.sans,
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
            <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: isHindi ? 23 : 21, color: dim }}>
              {translated(
                'Save your Nakshatra for more precise readings. If you are unsure, check a Janma Kundali using your birth date, time and place, or skip this step for now.',
                'अधिक सटीक मार्गदर्शन के लिए अपना नक्षत्र सहेजें। यदि निश्चित नहीं हैं, तो जन्मतिथि, समय और स्थान से जन्म कुंडली देखें, या अभी इस चरण को छोड़ दें।'
              )}
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
                    accessibilityLabel={
                      isHindi
                        ? `${item.sanskrit} (${item.label}), स्वामी ${item.rulerHi}, देवता ${item.deityHi}`
                        : `${item.label}, ruled by ${item.ruler}, deity ${item.deity}`
                    }
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
                    <Text style={{ marginTop: 4, fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 12, color: selected ? accent : text, textAlign: 'center' }}>
                      {isHindi ? item.sanskrit : item.label}
                    </Text>
                    <Text style={{ fontFamily: FONTS.serifBold, fontSize: 10, color: dim, textAlign: 'center' }}>
                      {isHindi ? item.label : item.sanskrit}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>
            {nakshatra ? (
              <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: border, backgroundColor: cardBg, padding: 14 }}>
                {(() => {
                  const sel = NAKSHATRAS.find((n) => n.key === nakshatra);
                  if (!sel) return null;
                  return (
                    <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 13, color: accent, textAlign: 'center' }}>
                      {isHindi
                        ? `${sel.sanskrit} · स्वामी: ${sel.rulerHi} · देवता: ${sel.deityHi}`
                        : `${sel.label} · Ruled by ${sel.ruler} · Deity: ${sel.deity}`}
                    </Text>
                  );
                })()}
              </View>
            ) : null}
          </>
        )}

        {step === 'calendarProfile' && (
          <>
            <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: isHindi ? 23 : 21, color: dim }}>
              {translated(
                "Choose the regional calendar convention your family follows. Shoonaya will use it for festival and vrat presentation.",
                'अपने परिवार की क्षेत्रीय पंचांग परंपरा चुनें। Shoonaya त्योहार और व्रत दिखाते समय इसी का उपयोग करेगा।'
              )}
            </Text>
            <View style={{ gap: 12 }}>
              {CALENDAR_PROFILES.map((item) => renderSelectRow({
                key: item.slug,
                selected: calendarProfile === item.slug,
                label: isHindi ? CALENDAR_PROFILE_HI[item.slug].label : item.label,
                description: isHindi ? CALENDAR_PROFILE_HI[item.slug].description : `${item.system} · ${item.era}`,
                icon: 'calendar',
                onPress: () => setCalendarProfile(calendarProfile === item.slug ? '' : item.slug),
              }))}
            </View>
          </>
        )}

        {step === 'calendarScope' && (
          <>
            <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: isHindi ? 23 : 21, color: dim }}>
              {translated(
                'Choose how much calendar detail you want to see. You can change this later in Settings.',
                'चुनें कि पंचांग में कितना विवरण देखना चाहते हैं। इसे बाद में सेटिंग्स में बदला जा सकता है।'
              )}
            </Text>
            <View style={{ gap: 12 }}>
              {CALENDAR_SCOPES.map((item) => renderSelectRow({
                key: item.slug,
                selected: calendarScope === item.slug,
                label: isHindi ? CALENDAR_SCOPE_HI[item.slug].label : item.label,
                description: isHindi ? CALENDAR_SCOPE_HI[item.slug].description : item.desc,
                icon: 'sliders',
                onPress: () => setCalendarScope(item.slug),
              }))}
            </View>
          </>
        )}

        {step === 'goals' && (
          <>
            <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: isHindi ? 23 : 21, color: dim }}>
              {translated(
                'Choose one or more goals so Shoonaya can shape your feed and guidance around what matters to you.',
                'एक या अधिक लक्ष्य चुनें, ताकि Shoonaya आपकी रुचि के अनुसार सामग्री और मार्गदर्शन तैयार कर सके।'
              )}
            </Text>
            <View style={{ gap: 12 }}>
              {GOALS.map((item) => renderSelectRow({
                key: item.key,
                selected: goals.includes(item.key),
                label: language === 'hi' ? item.labelHi : item.label,
                description: language === 'hi' ? item.subHi : item.sub,
                emoji: item.emoji,
                onPress: () => {
                  setGoals((current) => current.includes(item.key) ? current.filter((goal) => goal !== item.key) : [...current, item.key]);
                },
              }))}
            </View>
          </>
        )}

        {step === 'name' && (
          <View style={{ gap: 16 }}>
            <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: isHindi ? 23 : 21, color: dim }}>
              {translated(
                'This is how your name will appear in your Mandali and across Shoonaya.',
                'आपका नाम मंडली और Shoonaya में इसी रूप में दिखाई देगा।'
              )}
            </Text>
            <TextInput
              value={name}
              onChangeText={(textVal) => {
                setName(textVal);
                setNameStory(null);
                setNameStoryError('');
              }}
              placeholder={translated('Your name or spiritual name', 'आपका नाम या आध्यात्मिक नाम')}
              placeholderTextColor={dim}
              style={{
                minHeight: 54,
                borderRadius: RADII.lg,
                borderWidth: 1.5,
                borderColor: border,
                paddingHorizontal: 16,
                color: text,
                fontFamily: isHindi ? FONTS.devanagari : FONTS.sans,
                fontSize: 16,
                backgroundColor: cardBg,
              }}
            />

            {name.trim() ? (
              <View style={{ borderRadius: RADII.xl, borderWidth: 1, borderColor: border, backgroundColor: cardBg, padding: 18, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 11, color: accent, textTransform: isHindi ? 'none' : 'uppercase', letterSpacing: isHindi ? 0 : 1.2 }}>
                    {translated('Optional Name Story', 'वैकल्पिक नाम कथा')}
                  </Text>
                  {!nameStory && !nameStoryLoading ? (
                    <PressableSurface
                      haptic="impact"
                      onPress={() => { void generateNameStory(); }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: RADII.md,
                        backgroundColor: wellBgSelected,
                        borderWidth: 1,
                        borderColor: accent,
                      }}
                    >
                      <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 12, color: accent }}>
                        {translated('Discover meaning', 'अर्थ जानें')}
                      </Text>
                    </PressableSurface>
                  ) : null}
                </View>

                {nameStoryLoading ? (
                  <View style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <ActivityIndicator color={accent} />
                    <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                      {translated(
                        'Dharma Mitra is exploring the sound and sacred meaning of your name…',
                        'धर्म मित्र आपके नाम की ध्वनि और पावन अर्थ को समझ रहा है…'
                      )}
                    </Text>
                  </View>
                ) : null}

                {nameStoryError ? (
                  <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg, padding: 12, gap: 8 }}>
                    <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 13, lineHeight: 19, color: COLORS.danger }}>
                      {nameStoryError}
                    </Text>
                    <PressableSurface onPress={() => { void generateNameStory(); }} style={{ alignSelf: 'flex-start' }}>
                      <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 12, color: COLORS.danger, textDecorationLine: 'underline' }}>
                        {translated('Retry', 'पुनः प्रयास करें')}
                      </Text>
                    </PressableSurface>
                  </View>
                ) : null}

                {nameStory ? (
                  <View style={{ gap: 12, marginTop: 4 }}>
                    {nameStory.sacred_meaning ? (
                      <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.serifBold, fontSize: 20, lineHeight: 26, color: text }}>
                        {nameStory.sacred_meaning}
                      </Text>
                    ) : null}
                    {nameStory.name_story ? (
                      <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 14, lineHeight: 22, color: text }}>
                        {nameStory.name_story}
                      </Text>
                    ) : null}
                    {nameStory.name_mantra ? (
                      <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.homeBorderSoftLight, backgroundColor: wellBg, padding: 12, gap: 4 }}>
                        <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 11, color: accent, textTransform: isHindi ? 'none' : 'uppercase', letterSpacing: isHindi ? 0 : 1 }}>
                          {translated('Name mantra', 'नाम मंत्र')}
                        </Text>
                        <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.serifBold, fontSize: 18, color: text }}>
                          {nameStory.name_mantra}
                        </Text>
                      </View>
                    ) : null}
                    {nameStory.practice_suggestion ? (
                      <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 13, lineHeight: 19, color: dim }}>
                        {nameStory.practice_suggestion}
                      </Text>
                    ) : null}
                  </View>
                ) : !nameStoryLoading ? (
                  <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 13, lineHeight: 19, color: dim }}>
                    {translated(
                      'Discover the sacred meaning, root sound, and spiritual qualities associated with your name.',
                      'अपने नाम से जुड़े पावन अर्थ, मूल ध्वनि और आध्यात्मिक गुणों को जानें।'
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {step === 'notifications' && (
          <>
            <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: isHindi ? 23 : 21, color: dim }}>
              {translated(
                'Receive gentle reminders for daily wisdom, practice streaks and Mandali mentions. You can change this anytime in Settings.',
                'दैनिक ज्ञान, अभ्यास क्रम और मंडली संदेशों के लिए सहज स्मरण पाएँ। इसे कभी भी सेटिंग्स में बदला जा सकता है।'
              )}
            </Text>
            <View style={{ borderRadius: RADII.xl, borderWidth: 1, borderColor: border, backgroundColor: cardBg, padding: 20, gap: 16 }}>
              {[
                { icon: 'book-open' as const, label: translated('Daily wisdom notification', 'दैनिक ज्ञान स्मरण') },
                { icon: 'calendar' as const, label: translated('Sacred day and festival reminders', 'पर्व और पावन दिवस स्मरण') },
                { icon: 'zap' as const, label: translated('Daily practice sequence reminders', 'दैनिक अभ्यास क्रम स्मरण') },
                { icon: 'users' as const, label: translated('Mandali messages and community updates', 'मंडली संदेश और समुदाय सूचनाएँ') },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: wellBg }}>
                    <Feather name={item.icon} size={16} color={accent} />
                  </View>
                  <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sansMedium, fontSize: 14, color: text }}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
            {notificationsDenied ? (
              <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg, padding: 14, gap: 4 }}>
                <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 13, color: COLORS.danger }}>
                  {translated('Notifications not enabled', 'सूचना अनुमति नहीं मिली')}
                </Text>
                <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 12, lineHeight: 18, color: COLORS.danger }}>
                  {translated(
                    'Permission was not granted on this device. You can turn reminders on anytime in Settings.',
                    'इस डिवाइस पर अनुमति नहीं मिली। आप कभी भी सेटिंग्स में जाकर स्मरण चालू कर सकते हैं।'
                  )}
                </Text>
              </View>
            ) : null}
            <View style={{ gap: 10 }}>
              {notificationsDenied ? (
                <Button
                  label={translated('Continue', 'आगे बढ़ें')}
                  onPress={() => {
                    setNotificationChoice('disabled');
                    goToStep('ready', { notificationChoice: 'disabled' });
                  }}
                  disabled={saving || requestingNotifications}
                />
              ) : (
                <>
                  <Button
                    label={translated('Allow notifications', 'सूचनाएँ अनुमति दें')}
                    onPress={() => { void handleAllowNotifications(); }}
                    disabled={saving || requestingNotifications}
                    loading={requestingNotifications}
                  />
                  <Button
                    label={translated('Not now', 'अभी नहीं')}
                    variant="ghost"
                    onPress={() => { void handleNotNow(); }}
                    disabled={saving || requestingNotifications}
                  />
                </>
              )}
            </View>
          </>
        )}

        {step === 'ready' && (
          <View style={{ minHeight: 560, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <View style={{ width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: wellBgSelected, borderWidth: 1.5, borderColor: accent }}>
              <Text style={{ fontSize: 38 }}>{TRADITIONS.find((t) => t.key === tradition)?.emoji}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.serifBold, fontSize: 30, color: text, textAlign: 'center' }}>
                {readyCopy.heading}
              </Text>
              <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 15, lineHeight: 22, color: dim, textAlign: 'center' }}>
                {language === 'hi' ? readyCopy.bodyHi : readyCopy.body}
              </Text>
              <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 12, color: dim, textAlign: 'center' }}>
                {language === 'hi' ? 'आपका पवित्र स्थान आपकी प्रतीक्षा कर रहा है।' : 'Your sanctuary awaits.'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {READY_FEATURES[tradition ?? 'hindu'].map((item) => (
                <View key={item.label} style={{ flex: 1, minHeight: 100, borderRadius: RADII.lg, borderWidth: 1, borderColor: border, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                  <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                  <Text style={{ marginTop: 5, fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 11, color: text, textAlign: 'center' }}>
                    {language === 'hi' ? item.labelHi : item.label}
                  </Text>
                  <Text style={{ marginTop: 2, fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 9, color: dim, textAlign: 'center' }}>
                    {language === 'hi' ? item.descriptionHi : item.description}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ width: '100%', gap: 10 }}>
              {(() => {
                const readyPracticeCta = getOnboardingReadyPracticeCta(tradition);
                if (readyPracticeCta) {
                  return (
                    <>
                      <Button
                        label={isHindi ? readyPracticeCta.labelHi : readyPracticeCta.labelEn}
                        onPress={() => { void complete(readyPracticeCta.route as Href); }}
                        disabled={saving}
                        loading={saving}
                      />
                      <Button
                        label={isHindi ? 'Shoonaya देखें' : 'Explore Shoonaya'}
                        variant="ghost"
                        onPress={() => { void complete('/(tabs)'); }}
                        disabled={saving}
                      />
                    </>
                  );
                }
                return (
                  <Button
                    label={isHindi ? 'Shoonaya देखें' : 'Explore Shoonaya'}
                    onPress={() => { void complete('/(tabs)'); }}
                    disabled={saving}
                    loading={saving}
                  />
                );
              })()}
              {saveError ? (
                <Text style={{ fontFamily: isHindi ? FONTS.devanagari : FONTS.sans, fontSize: 12, lineHeight: 18, color: COLORS.danger, textAlign: 'center' }}>
                  {saveError}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {step !== 'notifications' && step !== 'ready' ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {stepIndex > 0 ? <Button label={language === 'hi' ? 'पीछे' : 'Back'} variant="ghost" onPress={() => { void goBack(); }} style={{ flex: 1 }} /> : null}
          <Button
            label={
              (() => {
                const stepHasValue =
                  step === 'nakshatra'
                    ? Boolean(nakshatra || rashi || gotra.trim())
                    : step === 'calendarProfile'
                    ? Boolean(calendarProfile)
                    : step === 'calendarScope'
                    ? Boolean(calendarScope)
                    : step === 'goals'
                    ? goals.length > 0
                    : step === 'name'
                    ? Boolean(name.trim())
                    : true;

                if (
                  step === 'nakshatra' ||
                  step === 'calendarProfile' ||
                  step === 'calendarScope' ||
                  step === 'goals' ||
                  step === 'name'
                ) {
                  if (isHindi) return stepHasValue ? 'आगे बढ़ें' : 'अभी छोड़ें';
                  return stepHasValue ? 'Continue' : 'Skip for now';
                }
                return isHindi ? 'आगे बढ़ें' : 'Continue';
              })()
            }
            onPress={() => { void goNext(); }}
            disabled={step === 'preferences' && (!tradition || !language)}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </Screen>
  );
}
