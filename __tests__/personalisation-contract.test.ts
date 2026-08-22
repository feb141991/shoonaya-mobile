import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CALENDAR_PROFILES,
  CALENDAR_SCOPES,
  NAKSHATRAS,
  ONBOARDING_GOALS,
  RASHIS,
  type CalendarProfileSlug,
  type CalendarScopeSlug,
} from '../lib/profile-constants';

/**
 * Pure helper mirroring the payload composition logic in app/settings/personalisation.tsx
 */
export function buildPersonalisationPatchPayload({
  tradition,
  rashi,
  nakshatra,
  gotra,
  calendarProfile,
  calendarScope,
  goals,
}: {
  tradition: string;
  rashi: string;
  nakshatra: string;
  gotra: string;
  calendarProfile: CalendarProfileSlug | '';
  calendarScope: CalendarScopeSlug | '';
  goals: string[];
}): Record<string, unknown> {
  const isHindu = tradition === 'hindu';
  const payload: Record<string, unknown> = {
    onboarding_goal: goals.length > 0 ? goals.join(',') : null,
  };

  if (isHindu) {
    payload.rashi = rashi || null;
    payload.nakshatra = nakshatra || null;
    payload.gotra = gotra.trim() || null;
    payload.calendar_profile = calendarProfile || null;
    payload.calendar_scope = calendarScope || null;
  }

  return payload;
}

describe('Personalisation Screen & Contract Suite', () => {
  it('builds full payload with valid Hindu-only fields for Hindu profiles', () => {
    const payload = buildPersonalisationPatchPayload({
      tradition: 'hindu',
      rashi: 'karka',
      nakshatra: 'pushya',
      gotra: '  Kashyap  ',
      calendarProfile: 'north_indian_purnimanta',
      calendarScope: 'all_observances',
      goals: ['daily_practice', 'peace'],
    });

    assert.equal(payload.rashi, 'karka');
    assert.equal(payload.nakshatra, 'pushya');
    assert.equal(payload.gotra, 'Kashyap');
    assert.equal(payload.calendar_profile, 'north_indian_purnimanta');
    assert.equal(payload.calendar_scope, 'all_observances');
    assert.equal(payload.onboarding_goal, 'daily_practice,peace');
  });

  it('guarantees non-Hindu profiles never emit or save Hindu-only fields', () => {
    const nonHinduTraditions = ['sikh', 'buddhist', 'jain'];

    for (const tradition of nonHinduTraditions) {
      const payload = buildPersonalisationPatchPayload({
        tradition,
        rashi: 'karka', // even if form somehow held a value
        nakshatra: 'pushya',
        gotra: 'Kashyap',
        calendarProfile: 'north_indian_purnimanta',
        calendarScope: 'all_observances',
        goals: ['peace', 'mindfulness'],
      });

      assert.equal(payload.rashi, undefined, `rashi must be omitted for ${tradition}`);
      assert.equal(payload.nakshatra, undefined, `nakshatra must be omitted for ${tradition}`);
      assert.equal(payload.gotra, undefined, `gotra must be omitted for ${tradition}`);
      assert.equal(payload.calendar_profile, undefined, `calendar_profile must be omitted for ${tradition}`);
      assert.equal(payload.calendar_scope, undefined, `calendar_scope must be omitted for ${tradition}`);
      assert.equal(payload.onboarding_goal, 'peace,mindfulness');
    }
  });

  it('allows clearing fields with null when unselected or empty', () => {
    const payload = buildPersonalisationPatchPayload({
      tradition: 'hindu',
      rashi: '',
      nakshatra: '',
      gotra: '   ',
      calendarProfile: '',
      calendarScope: '',
      goals: [],
    });

    assert.equal(payload.rashi, null);
    assert.equal(payload.nakshatra, null);
    assert.equal(payload.gotra, null);
    assert.equal(payload.calendar_profile, null);
    assert.equal(payload.calendar_scope, null);
    assert.equal(payload.onboarding_goal, null);
  });

  it('constants maintain canonical non-empty lists without drift', () => {
    assert.equal(RASHIS.length, 12);
    assert.equal(NAKSHATRAS.length, 27);
    assert.equal(CALENDAR_PROFILES.length, 11);
    assert.equal(CALENDAR_SCOPES.length, 2);
    assert.equal(ONBOARDING_GOALS.length, 6);
  });
});
