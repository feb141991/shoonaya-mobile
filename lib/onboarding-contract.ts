import type { GenderKey, LifeStageKey, CalendarProfileSlug, CalendarScopeSlug } from './profile-constants';
import { genderContext } from './profile-constants';
import { storableTradition, traditionNeedsReligiousDataConsent } from './religious-data-consent';

export type TraditionKey = 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'none';
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
  | 'location'
  | 'ready';

export type NotificationChoice = 'enabled' | 'disabled' | 'unset';
export type PermissionRecoveryAction = 'request' | 'retry' | 'settings';

/**
 * Keep an OS permission denial distinct from a user deferral. Once the OS
 * stops offering its prompt, recovery must link to Settings instead of retrying
 * a prompt that can no longer appear.
 */
export function getPermissionRecoveryAction(
  wasDenied: boolean,
  canAskAgain: boolean
): PermissionRecoveryAction {
  if (!wasDenied) return 'request';
  return canAskAgain ? 'retry' : 'settings';
}

export type OnboardingLocation = {
  latitude: number;
  longitude: number;
  city: string;
  country: string | null;
};

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
      'location',
      'ready',
    ];
  }
  return [
    'preferences',
    'personal',
    'goals',
    'name',
    'notifications',
    'location',
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
  // For Sikh, Jain, and Universal/None seekers, no single prescribed ritual practice is forced.
  // Returning null omits the optional first-practice recommendation; Welcome still
  // provides the same explicit Enter Shoonaya action for every tradition.
  return null;
}

/**
 * Pure helper determining whether notification reminders should be enabled in the profile.
 *
 * Rules:
 * - User choice 'enabled' => true (in-app reminders enabled in profile)
 * - User choice 'disabled' => false (explicit opt-out)
 * - User choice 'unset' => false (conservative fail-closed default)
 *
 * Note: OS push permission is decoupled from profile in-app reminder preferences.
 * Push token registration requires both user choice 'enabled' AND OS permission granted.
 */
export function computeContentNotificationOptIn(choice: NotificationChoice): boolean {
  return choice === 'enabled';
}

export function computePushNotificationEligibility(
  choice: NotificationChoice,
  osPermissionGranted: boolean
): boolean {
  return choice === 'enabled' && osPermissionGranted;
}

/**
 * Backward-compatible helper for callers that evaluate push eligibility.
 */
export function computeFinalNotificationState(
  choice: NotificationChoice,
  osPermissionGranted: boolean
): boolean {
  return choice === 'enabled' && osPermissionGranted;
}

export function getNotificationPersistencePayload(userWantsReminders: boolean) {
  return {
    wants_festival_reminders: userWantsReminders,
    wants_vrat_reminders: userWantsReminders,
    wants_tithi_reminders: false,
    wants_nitya_reminders: userWantsReminders,
    wants_shloka_reminders: userWantsReminders,
    wants_community_notifications: userWantsReminders,
  };
}

/**
 * Marketing email consent from the optional onboarding switch.
 *
 * It is separate from the reminder choice above and off unless the person turns it on: nothing here is ever
 * inferred from another answer. When they opt in, both columns the campaign audience reads are set together
 * (marketing_consent and email_newsletter) and the consent time is stamped. When they do not, NOTHING is
 * written, so a skip can never overwrite an existing choice and the column defaults (false) apply.
 *
 * Not recorded: which wording was shown. consent_updated_at is the only timestamp the profile has.
 */
export function getMarketingConsentPayload(optedIn: boolean, now: Date = new Date()) {
  if (optedIn !== true) return {};
  return {
    marketing_consent: true,
    email_newsletter: true,
    consent_updated_at: now.toISOString(),
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
  marketingOptIn = false,
  religiousDataConsent,
  consentRecordedAt,
  location,
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
  /** Optional email updates switch. Absent means no consent. */
  marketingOptIn?: boolean;
  /** The switch the person turned on (or not) when choosing a tradition. Required so no caller can forget it. */
  religiousDataConsent: boolean;
  /** When that choice was saved, as an ISO string. Passed in so this stays pure. */
  consentRecordedAt: string;
  location?: OnboardingLocation | null;
}) {
  // A faith tradition, and the details that go with it, are saved only with the person's agreement. Without it
  // the account gets the neutral choice and none of the Hindu-only fields, whatever the screen state says.
  const consented = traditionNeedsReligiousDataConsent(tradition) && religiousDataConsent;
  const savedTradition = storableTradition(tradition, consented);
  const isHinduProfile = savedTradition === 'hindu';
  return {
    tradition: savedTradition,
    consent_religious_data: consented,
    // Stamped only when the person made the choice here; a neutral path leaves any earlier stamp alone.
    ...(traditionNeedsReligiousDataConsent(tradition) ? { consent_updated_at: consentRecordedAt } : {}),
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
    ...getMarketingConsentPayload(marketingOptIn),
    // Omitted entirely (not written as null) when the user skipped or denied
    // location during onboarding -- never overwrite an existing value with
    // nothing, and never substitute a default location here either; a
    // missing value should mean "unknown", handled explicitly downstream
    // (e.g. by skipping location-dependent notifications), not silently
    // computed as if the user were somewhere else.
    ...(location
      ? { latitude: location.latitude, longitude: location.longitude, city: location.city, country: location.country }
      : {}),
    onboarding_completed: true,
  };
}
