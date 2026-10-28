import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTraditionGreeting, resolveHomeGreeting } from '../lib/greetings';

describe('shared Home and preparation greeting', () => {
  it('uses a saved greeting by itself, including custom Hindi text', () => {
    assert.equal(resolveHomeGreeting({ override: '  जय जिनेन्द्र  ', tradition: 'jain', now: new Date(2026, 9, 29, 8) }), 'जय जिनेन्द्र');
    assert.equal(resolveHomeGreeting({ override: 'Sat Sri Akal', tradition: 'sikh', now: new Date(2026, 9, 29, 21) }), 'Sat Sri Akal');
  });
  it('matches Home time words rather than the ceremonial startup pool', () => {
    for (const tradition of ['hindu', 'sikh', 'buddhist', 'jain', 'none']) {
      for (const [hour, expected] of [[8, 'Suprabhat'], [18, 'Shubh Sandhya'], [23, 'Shubh Ratri']] as const) {
        assert.equal(resolveHomeGreeting({ tradition, now: new Date(2026, 9, 29, hour) }), expected);
      }
    }
  });
  it('keeps the existing tradition rotation during the afternoon', () => {
    for (const tradition of ['hindu', 'sikh', 'buddhist', 'jain', 'none']) {
      const now = new Date(2026, 9, 29, 13);
      const home = resolveHomeGreeting({ tradition, spiritualDate: '2026-10-29', now });
      const preparation = resolveHomeGreeting({ tradition, now });
      assert.equal(home, getTraditionGreeting(tradition, 29));
      assert.equal(preparation, home);
    }
  });
  it('uses the authoritative day seed when supplied and tolerates an absent/malformed date', () => {
    const now = new Date(2026, 9, 29, 13);
    assert.equal(resolveHomeGreeting({ tradition: 'hindu', spiritualDate: '2026-10-28', now }), getTraditionGreeting('hindu', 28));
    assert.equal(resolveHomeGreeting({ tradition: 'hindu', spiritualDate: 'not-a-date', now }), getTraditionGreeting('hindu', 29));
    assert.equal(resolveHomeGreeting({ override: ' ', tradition: 'hindu', now }), getTraditionGreeting('hindu', 29));
  });
  it('wires both screens to the same resolver without moving personalized warming before save', () => {
    const home = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
    const preparation = readFileSync(new URL('../app/sanctuary-preparing.tsx', import.meta.url), 'utf8');
    const onboarding = readFileSync(new URL('../app/(auth)/onboarding.tsx', import.meta.url), 'utf8');
    assert.ok(home.includes('resolveHomeGreeting({'));
    assert.ok(preparation.includes('resolveHomeGreeting({'));
    assert.ok(!preparation.includes('getStartupGreeting'));
    assert.ok(preparation.includes('getGreetingPick()'));
    assert.ok(!onboarding.includes('prepareSanctuaryHome('));
    assert.ok(onboarding.indexOf('beginSanctuaryPreparation({') > onboarding.indexOf('if (insertError) throw insertError'));
  });
});
