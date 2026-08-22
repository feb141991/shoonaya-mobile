import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';

export type PersonalisationSuggestion = {
  key: string;
  label: string;
  reason: string;
  route: string;
  priority: number;
  context: 'personal_details' | 'personalisation' | 'general';
};

/**
 * Pure helper mirroring the server-side suggestions resolver for progress-summary
 */
export function derivePersonalisationSuggestions(profile: {
  tradition: Tradition;
  full_name: string | null;
  app_language: string | null;
  city?: string | null;
  life_stage?: string | null;
  rashi?: string | null;
  nakshatra?: string | null;
  gotra?: string | null;
  calendar_profile?: string | null;
  calendar_scope?: string | null;
  onboarding_goal?: string | null;
}): {
  coreComplete: boolean;
  suggestions: PersonalisationSuggestion[];
} {
  const isCoreComplete = Boolean(profile.full_name?.trim() && profile.tradition && profile.app_language);
  const isHindu = profile.tradition === 'hindu';
  const suggestions: PersonalisationSuggestion[] = [];

  if (isHindu) {
    if (!profile.calendar_profile) {
      suggestions.push({
        key: 'calendar_profile',
        label: 'Regional Calendar',
        reason: 'Select your regional tradition calendar for accurate vrat dates',
        route: '/settings/personalisation',
        priority: 1,
        context: 'personalisation',
      });
    }
    if (!profile.rashi) {
      suggestions.push({
        key: 'rashi',
        label: 'Birth Rashi (Moon Sign)',
        reason: 'Personalise your daily rashiphala and astrological timing',
        route: '/settings/personalisation',
        priority: 2,
        context: 'personalisation',
      });
    }
    if (!profile.nakshatra) {
      suggestions.push({
        key: 'nakshatra',
        label: 'Birth Nakshatra',
        reason: 'Receive nakshatra-specific daily timings',
        route: '/settings/personalisation',
        priority: 3,
        context: 'personalisation',
      });
    }
    if (!profile.gotra) {
      suggestions.push({
        key: 'gotra',
        label: 'Gotra (Lineage)',
        reason: 'Include your lineage in sankalpa prayers',
        route: '/settings/personalisation',
        priority: 4,
        context: 'personalisation',
      });
    }
    if (!profile.calendar_scope) {
      suggestions.push({
        key: 'calendar_scope',
        label: 'Calendar Scope',
        reason: 'Choose major festivals only or complete observances',
        route: '/settings/personalisation',
        priority: 5,
        context: 'personalisation',
      });
    }
  }

  if (!profile.city) {
    suggestions.push({
      key: 'city',
      label: 'Location',
      reason: 'Set your city for accurate sunrise and prayer timings',
      route: '/settings/personal-details',
      priority: 10,
      context: 'personal_details',
    });
  }
  if (!profile.life_stage) {
    suggestions.push({
      key: 'life_stage',
      label: 'Life Stage (Ashrama)',
      reason: 'Tailor spiritual recommendations to your stage of life',
      route: '/settings/personal-details',
      priority: 11,
      context: 'personal_details',
    });
  }
  if (!profile.onboarding_goal) {
    suggestions.push({
      key: 'onboarding_goal',
      label: 'Practice Goals',
      reason: 'Set spiritual priorities for daily practice',
      route: '/settings/personalisation',
      priority: 12,
      context: 'personalisation',
    });
  }

  suggestions.sort((a, b) => a.priority - b.priority);

  return {
    coreComplete: isCoreComplete,
    suggestions,
  };
}

describe('Truthful Profile Completion & Suggestion Invariants', () => {
  it('considers valid onboarding complete for core identity', () => {
    const res = derivePersonalisationSuggestions({
      tradition: 'hindu',
      full_name: 'Aarav Sharma',
      app_language: 'en',
    });
    assert.equal(res.coreComplete, true);
  });

  it('routes Hindu-only personalisation fields directly to /settings/personalisation', () => {
    const res = derivePersonalisationSuggestions({
      tradition: 'hindu',
      full_name: 'Aarav Sharma',
      app_language: 'en',
    });

    const hinduSuggestions = res.suggestions.filter((s) =>
      ['calendar_profile', 'rashi', 'nakshatra', 'gotra', 'calendar_scope'].includes(s.key)
    );
    assert.equal(hinduSuggestions.length, 5);
    for (const s of hinduSuggestions) {
      assert.equal(s.route, '/settings/personalisation');
    }
  });

  it('never emits Hindu suggestions for non-Hindu traditions', () => {
    const nonHinduTraditions: Tradition[] = ['sikh', 'buddhist', 'jain'];
    for (const tradition of nonHinduTraditions) {
      const res = derivePersonalisationSuggestions({
        tradition,
        full_name: 'Devotee',
        app_language: 'en',
      });
      const keys = res.suggestions.map((s) => s.key);
      assert.equal(keys.includes('rashi'), false);
      assert.equal(keys.includes('nakshatra'), false);
      assert.equal(keys.includes('gotra'), false);
      assert.equal(keys.includes('calendar_profile'), false);
      assert.equal(keys.includes('calendar_scope'), false);
      assert.deepEqual(keys, ['city', 'life_stage', 'onboarding_goal']);
    }
  });

  it('returns empty suggestions when all fields are populated', () => {
    const res = derivePersonalisationSuggestions({
      tradition: 'hindu',
      full_name: 'Aarav',
      app_language: 'en',
      city: 'Delhi',
      life_stage: 'grihastha',
      rashi: 'karka',
      nakshatra: 'pushya',
      gotra: 'Kashyap',
      calendar_profile: 'north_indian_purnimanta',
      calendar_scope: 'all_observances',
      onboarding_goal: 'daily_practice',
    });
    assert.equal(res.coreComplete, true);
    assert.equal(res.suggestions.length, 0);
  });
});
