import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Founder decision 2026-11-12: consent declarations are shown in English only until a native speaker and counsel have
// reviewed any translation (AGENTS.md section 27). The Hindi texts written for them were removed; this stops one
// being added back by accident. Account-deletion warnings already follow the same rule through
// REVIEWED_DELETION_LANGUAGES.

const ROOT = path.join(__dirname, '..');
const DEVANAGARI = /[ऀ-ॿ]/;
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** Returns the text of every call `name( ... )` in `source`, balanced on parentheses and ignoring strings' contents. */
function callsOf(source: string, name: string): string[] {
  const calls: string[] = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(`${name}(`, from);
    if (at === -1) return calls;
    let depth = 0;
    let quote: string | null = null;
    let end = at + name.length;
    for (; end < source.length; end++) {
      const ch = source[end];
      if (quote) {
        if (ch === '\\') end++;
        else if (ch === quote) quote = null;
      } else if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')' && --depth === 0) break;
    }
    calls.push(source.slice(at, end + 1));
    from = end + 1;
  }
}

describe('consent declarations are English only', () => {
  it('the religious-data consent wording has no Hindi', () => {
    assert.equal(DEVANAGARI.test(read('lib/religious-data-consent.ts')), false);
    assert.equal(DEVANAGARI.test(read('components/onboarding/ReligiousDataConsentCard.tsx')), false);
  });

  it('the notification-tap consent card has no Hindi and no language switch', () => {
    const card = read('components/notifications/TapConsentCard.tsx');
    assert.equal(DEVANAGARI.test(card), false);
    assert.ok(!/isHindi|useLanguage/.test(card), 'the card must not pick wording by language');
  });

  it('the onboarding "Help improve reminders" switch has no Hindi', () => {
    const source = read('app/(auth)/onboarding.tsx');
    const calls = callsOf(source, 'translated').filter((call) => /Help improve reminders|Lets us see which reminders|Off unless you turn it on|Occasional email from Shoonaya|New features, festival guides/.test(call));
    assert.deepEqual(calls, [], 'declaration text must not go through translated()');
    const at = source.indexOf('Lets us see which reminders you tap');
    assert.ok(at > -1, 'the English declaration is still shown');
    // The switch is one <Pressable> ... </Pressable>; check exactly that element.
    const region = source.slice(source.lastIndexOf('<Pressable', at), source.indexOf('</Pressable>', at));
    assert.ok(region.includes('Help improve reminders'));
    assert.equal(DEVANAGARI.test(region), false);
  });

  it('the onboarding e-mail opt-in switch has no Hindi', () => {
    const source = read('app/(auth)/onboarding.tsx');
    const at = source.indexOf('New features, festival guides and a weekly newsletter');
    assert.ok(at > -1, 'the English declaration is still shown');
    const region = source.slice(source.lastIndexOf('<Pressable', at), source.indexOf('</Pressable>', at));
    assert.ok(region.includes('Occasional email from Shoonaya'));
    assert.equal(DEVANAGARI.test(region), false);
  });

  it('the Settings switch has no Hindi', () => {
    const source = read('app/settings/detail-screen.tsx');
    const at = source.indexOf('label="Help improve reminders"');
    assert.ok(at > -1);
    assert.equal(DEVANAGARI.test(source.slice(at - 200, at + 1500)), false);
  });
});
