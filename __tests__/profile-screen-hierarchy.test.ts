import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const profile = readFileSync(new URL('../app/(tabs)/profile.tsx', import.meta.url), 'utf8');

describe('profile screen hierarchy', () => {
  it('keeps profile completion owned by Settings and removes duplicate progress panels', () => {
    assert.doesNotMatch(profile, /Personalise Shoonaya/);
    assert.doesNotMatch(profile, /Sadhana Highlights/);
    assert.doesNotMatch(profile, /Progress Hub/);
    assert.match(profile, /router\.push\('\/settings\/personalisation'\)/);
    assert.match(profile, /Complete your profile/);
  });

  it('uses a compact three-stat practice summary instead of a wrapped card grid', () => {
    assert.match(profile, /\{ label: 'Beads'/);
    assert.match(profile, /\{ label: 'Rounds'/);
    assert.match(profile, /\{ label: 'Streak'/);
    assert.doesNotMatch(profile, /width: '47\.8%'/);
    assert.doesNotMatch(profile, /function MetricTile/);
  });
});
