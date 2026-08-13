/**
 * Shared profile field constants — extracted from onboarding.tsx so the
 * post-onboarding personal-details settings screen uses the exact same
 * options rather than a second, driftable copy.
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
