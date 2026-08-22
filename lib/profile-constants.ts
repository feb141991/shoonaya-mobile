/**
 * Shared profile field constants — extracted from onboarding.tsx so the
 * post-onboarding personal-details and personalisation settings screens
 * use the exact same options rather than a second, driftable copy.
 */

export const LIFE_STAGES = [
  { key: 'brahmacharya', label: 'Brahmacharya', age: '0-25', description: 'Student - learn, build, purify', emoji: '⭐' },
  { key: 'grihastha', label: 'Grihastha', age: '25-50', description: 'Householder - work, family, dharma', emoji: '🏡' },
  { key: 'vanaprastha', label: 'Vanaprastha', age: '50-75', description: 'Forest Dweller - mentor, withdraw', emoji: '🌳' },
  { key: 'sannyasa', label: 'Sannyasa', age: '75+', description: 'Renunciate - release, liberation', emoji: '💨' },
] as const;

export type LifeStageKey = (typeof LIFE_STAGES)[number]['key'];

export const GENDERS = [
  { key: 'male', label: 'Male', emoji: '♂' },
  { key: 'female', label: 'Female', emoji: '♀' },
  { key: 'prefer_not', label: 'Prefer not to say', emoji: '·' },
] as const;

export type GenderKey = (typeof GENDERS)[number]['key'];

export function genderContext(value: GenderKey) {
  return value === 'female' ? 'female' : 'general';
}

export function ageFromDob(value: string) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function suggestedLifeStage(value: string): LifeStageKey | null {
  const age = ageFromDob(value);
  if (age === null) return null;
  if (age <= 25) return 'brahmacharya';
  if (age <= 50) return 'grihastha';
  if (age <= 75) return 'vanaprastha';
  return 'sannyasa';
}

/**
 * Regional calendar-convention profiles, mirrored from the web app's
 * onboarding (OnboardingClient.tsx step 11 "Which regional calendar?") so
 * both clients offer the identical reviewed copy. Matches
 * `calendar_profiles.slug` in the shared Supabase project.
 */
export const CALENDAR_PROFILES = [
  { slug: 'north_indian_purnimanta', label: 'North Indian', system: 'Purnimanta (Month ends on Purnima)', era: 'Vikram Samvat' },
  { slug: 'gujarati_amanta', label: 'Gujarati', system: 'Amanta (Month ends on Amavasya)', era: 'Vikram Samvat' },
  { slug: 'marathi_amanta', label: 'Marathi', system: 'Amanta', era: 'Śaka Samvat' },
  { slug: 'kannada_amanta', label: 'Kannada', system: 'Amanta', era: 'Śaka Samvat' },
  { slug: 'telugu_amanta', label: 'Telugu', system: 'Amanta', era: 'Śaka Samvat' },
  { slug: 'tamil_solar', label: 'Tamil', system: 'Solar (Month begins on Sankranti)', era: 'Tamil Era' },
  { slug: 'malayalam_solar', label: 'Malayalam', system: 'Solar', era: 'Kollam Era' },
  { slug: 'bengali_solar', label: 'Bengali', system: 'Solar', era: 'Bengali San' },
  { slug: 'odia', label: 'Odia', system: 'Amanta / Solar Rule', era: 'Śaka Samvat' },
  { slug: 'nepali_bikram', label: 'Nepali', system: 'Purnimanta', era: 'Bikram Sambat (Nepal)' },
  { slug: 'global_sanatan', label: 'Global', system: 'Amanta (English Transliterated)', era: 'Vikram Samvat' },
] as const;

export type CalendarProfileSlug = (typeof CALENDAR_PROFILES)[number]['slug'];

/**
 * Mirrored from web's onboarding step 13 "Choose Calendar Scope".
 */
export const CALENDAR_SCOPES = [
  { slug: 'major_only', label: 'Major Observances Only', desc: 'Clutter-free default focusing on primary festivals, vrats, and major fast days.' },
  { slug: 'all_observances', label: 'All Observances', desc: 'Complete listings including minor astronomical conjunctions, local events, and standard tithis.' },
] as const;

export type CalendarScopeSlug = (typeof CALENDAR_SCOPES)[number]['slug'];

export const RASHIS = [
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

export type RashiKey = (typeof RASHIS)[number]['key'];

export const NAKSHATRAS = [
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

export type NakshatraKey = (typeof NAKSHATRAS)[number]['key'];

export const ONBOARDING_GOALS = [
  { key: 'daily_practice', emoji: '🪔', label: 'Deepen my daily practice', labelHi: 'दैनिक अभ्यास गहरा करना', sub: 'Prayer, meditation and sacred routine', subHi: 'प्रार्थना, ध्यान और पवित्र दिनचर्या' },
  { key: 'deeper_faith', emoji: '✨', label: 'Deepen my faith and path', labelHi: 'अपनी आस्था और मार्ग को गहरा करना', sub: "Discover your tradition's heart", subHi: 'अपनी परंपरा के मर्म को जानें' },
  { key: 'community', emoji: '👥', label: 'Find my community', labelHi: 'अपना समुदाय खोजना', sub: 'Sangat, community and belonging', subHi: 'संगत, समुदाय और अपनापन' },
  { key: 'peace', emoji: '🌌', label: 'Find peace and meaning', labelHi: 'शांति और अर्थ खोजना', sub: 'Philosophy, reflection and inner clarity', subHi: 'दर्शन, चिंतन और आंतरिक स्पष्टता' },
  { key: 'knowledge', emoji: '📚', label: 'Study sacred texts', labelHi: 'पवित्र ग्रंथों का अध्ययन', sub: 'Read texts from your selected tradition', subHi: 'अपनी चुनी परंपरा के ग्रंथ पढ़ें' },
  { key: 'new_guide', emoji: '🌱', label: "I'm new - guide me gently", labelHi: 'मैं नया हूँ — सहज मार्गदर्शन चाहिए', sub: 'Begin from the first step', subHi: 'पहले कदम से शुरू करें' },
] as const;

export type GoalKey = (typeof ONBOARDING_GOALS)[number]['key'];
