import type { CalendarProfileSlug, CalendarScopeSlug } from '@/lib/profile-constants';

export type PersonalisationPatchInput = {
  tradition: string;
  rashi: string;
  nakshatra: string;
  gotra: string;
  calendarProfile: CalendarProfileSlug | '';
  calendarScope: CalendarScopeSlug | '';
  goals: string[];
};

export function buildPersonalisationPatchPayload({
  tradition,
  rashi,
  nakshatra,
  gotra,
  calendarProfile,
  calendarScope,
  goals,
}: PersonalisationPatchInput): Record<string, string | null> {
  const payload: Record<string, string | null> = {
    onboarding_goal: goals.length > 0 ? goals.join(',') : null,
  };

  if (tradition === 'hindu') {
    payload.rashi = rashi || null;
    payload.nakshatra = nakshatra || null;
    payload.gotra = gotra.trim() || null;
    payload.calendar_profile = calendarProfile || null;
    payload.calendar_scope = calendarScope || null;
  }

  return payload;
}
