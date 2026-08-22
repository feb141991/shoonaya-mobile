import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getVisibleProfileSuggestions, type ProfileSuggestion } from '../lib/profile-suggestions';

const suggestions: ProfileSuggestion[] = [
  {
    key: 'life_stage',
    label: 'Life Stage',
    reason: 'Tailor your practice',
    route: '/settings/personal-details',
    priority: 11,
    context: 'personal_details',
  },
  {
    key: 'rashi',
    label: 'Birth Rashi',
    reason: 'Personalise your reading',
    route: '/settings/personalisation',
    priority: 2,
    context: 'personalisation',
  },
  {
    key: 'calendar_profile',
    label: 'Regional Calendar',
    reason: 'Use your family calendar',
    route: '/settings/personalisation',
    priority: 1,
    context: 'personalisation',
  },
];

describe('Profile suggestion presentation', () => {
  it('shows only the two highest-priority backend suggestions', () => {
    assert.deepEqual(
      getVisibleProfileSuggestions(suggestions).map((item) => item.key),
      ['calendar_profile', 'rashi'],
    );
  });

  it('does not mutate the API response order', () => {
    getVisibleProfileSuggestions(suggestions);
    assert.deepEqual(suggestions.map((item) => item.key), ['life_stage', 'rashi', 'calendar_profile']);
  });

  it('returns no rows for absent suggestions or a zero limit', () => {
    assert.deepEqual(getVisibleProfileSuggestions(undefined), []);
    assert.deepEqual(getVisibleProfileSuggestions(suggestions, 0), []);
  });
});
