import type { GenderKey, LifeStageKey, CalendarProfileSlug, CalendarScopeSlug } from './profile-constants';
import { genderContext } from './profile-constants';

export type TraditionKey = 'hindu' | 'sikh' | 'buddhist' | 'jain';
export type LanguageKey = 'en' | 'hi';

export type Step =
  | 'preferences'
  | 'personal'
  | 'nakshatra'
  | 'calendarProfile'
  | 'calendarScope'
  | 'goals'
  | 'name'
  | 'notifications'
  | 'ready';

export type NotificationChoice = 'enabled' | 'disabled' | 'unset';

export type ReadyPracticeCta = {
  route: string;
  labelEn: string;
  labelHi: string;
};

export function buildSteps(tradition: TraditionKey | null): Step[] {
  if (tradition === 'hindu') {
    return [
      'preferences',
      'personal',
      'nakshatra',
      'calendarProfile',
      'calendarScope',
      'goals',
      'name',
      'notifications',
      'ready',
    ];
  }
  return [
    'preferences',
    'personal',
    'goals',
    'name',
    'notifications',
    'ready',
  ];
}

export function getActiveSteps(steps: Step[]): Step[] {
  return steps.filter((s) => s !== 'ready');
}

export function stepEyebrow(step: Step, steps: Step[], language: LanguageKey | null): string {
  const activeSteps = getActiveSteps(steps);
  const current = activeSteps.indexOf(step) + 1;
  if (current <= 0) return '';
  return language === 'hi' ? `चरण ${current} / ${activeSteps.length}` : `Step ${current} of ${activeSteps.length}`;
}

export function getOnboardingReadyPracticeCta(tradition: TraditionKey | null): ReadyPracticeCta | null {
  if (tradition === 'hindu') {
    return {
      route: '/bhakti/mala',
      labelEn: 'Begin Japa Mala',
      labelHi: 'जाप माला शुरू करें',
    };
  }
  if (tradition === 'buddhist') {
    return {
      route: '/bhakti/zen',
      labelEn: 'Begin Meditation',
      labelHi: 'ध्यान शुरू करें',
    };
  }
  // For Sikh and Jain traditions, no dedicated first-practice screen currently exists.
  // Returning null tells the Ready screen to cleanly omit the primary practice button
  // and offer 'Explore Shoonaya' as the single, clear entry point.
  return null;
}

/**
 * Pure helper determining whether notification reminders should be enabled in the profile.
 *
 * Rules:
 * - User choice 'enabled' AND OS permission granted => true (eligible for reminders & push token)
 * - User choice 'disabled' (e.g. tapped 'Not now' or denied) => false (even if OS permission was already granted)
 * - User choice 'unset' => false
 * - OS permission denied/revoked => false
 */
export function computeFinalNotificationState(
  choice: NotificationChoice,
  osPermissionGranted: boolean
): boolean {
  return choice === 'enabled' && osPermissionGranted;
}

export function getNotificationPersistencePayload(permissionGranted: boolean) {
  return {
    wants_festival_reminders: permissionGranted,
    wants_nitya_reminders: permissionGranted,
    wants_shloka_reminders: permissionGranted,
    wants_community_notifications: permissionGranted,
  };
}

export function buildOnboardingProfilePayload({
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
  notificationsEnabled,
}: {
  displayName: string;
  tradition: TraditionKey;
  language: LanguageKey;
  dateOfBirth: string;
  gender: GenderKey;
  lifeStage: LifeStageKey | null;
  rashi: string;
  nakshatra: string;
  gotra: string;
  calendarProfile: CalendarProfileSlug | '';
  calendarScope: CalendarScopeSlug | '';
  goals: string[];
  notificationsEnabled: boolean;
}) {
  const isHinduProfile = tradition === 'hindu';
  return {
    tradition,
    app_language: language,
    meaning_language: language,
    full_name: displayName,
    date_of_birth: dateOfBirth || null,
    gender_context: genderContext(gender),
    life_stage: lifeStage, // nullable; never defaulted to brahmacharya
    rashi: isHinduProfile && rashi ? rashi : null,
    nakshatra: isHinduProfile && nakshatra ? nakshatra : null,
    gotra: isHinduProfile ? gotra.trim() || null : null,
    calendar_profile: isHinduProfile ? calendarProfile || null : null,
    calendar_scope: isHinduProfile ? calendarScope || null : null,
    onboarding_goal: goals.join(','),
    ...getNotificationPersistencePayload(notificationsEnabled),
    onboarding_completed: true,
  };
}
