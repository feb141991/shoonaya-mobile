import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Founder decision 2026-11-12: the EXPLANATION of what a consent covers (privacy and policy content) is shown in English
// only until a native speaker and counsel have reviewed any translation (AGENTS.md section 27). Titles, labels, hints,
// buttons and error lines on those screens are ordinary interface text and stay translated (Hindi; Punjabi for Sikh
// profiles where it exists). This guard fails in both directions: Hindi creeping back into an explanation, and a label or
// button losing its translation.

const ROOT = path.join(__dirname, '..');
const DEVANAGARI = /[ऀ-ॿ]/;
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** The JSX element `<Tag ...> ... </Tag>` that contains `needle`. */
function elementAround(source: string, needle: string, tag: string): string {
  const at = source.indexOf(needle);
  assert.ok(at > -1, `missing: ${needle}`);
  const start = source.lastIndexOf(`<${tag}`, at);
  const end = source.indexOf(`</${tag}>`, at);
  assert.ok(start > -1 && end > at, `no <${tag}> around: ${needle}`);
  return source.slice(start, end + tag.length + 3);
}

describe('consent explanations are English only', () => {
  it('the religious-data consent wording (all of it is policy content) has no Hindi and no language switch', () => {
    assert.equal(DEVANAGARI.test(read('lib/religious-data-consent.ts')), false);
    const card = read('components/onboarding/ReligiousDataConsentCard.tsx');
    assert.equal(DEVANAGARI.test(card), false);
    assert.ok(!/isHindi/.test(card), 'the card must not pick wording by language');
  });

  it('the inbox card explanation is plain English text, not a translated pair', () => {
    const body = elementAround(read('components/notifications/TapConsentCard.tsx'), 'If you say yes, we record which reminder you tap', 'Text');
    assert.equal(DEVANAGARI.test(body), false);
    assert.ok(!/\bt\(/.test(body), 'the explanation must not go through t()');
  });

  it('the onboarding tap-consent explanation is plain English text, not a translated pair', () => {
    const body = elementAround(read('app/(auth)/onboarding.tsx'), 'Lets us see which reminders you tap', 'Text');
    assert.equal(DEVANAGARI.test(body), false);
    assert.ok(!/translated\(/.test(body), 'the explanation must not go through translated()');
  });

  it('the onboarding e-mail opt-in explanation is plain English text, not a translated pair', () => {
    const body = elementAround(read('app/(auth)/onboarding.tsx'), 'New features, festival guides and a weekly newsletter', 'Text');
    assert.equal(DEVANAGARI.test(body), false);
    assert.ok(!/translated\(/.test(body), 'the explanation must not go through translated()');
  });

  it('the Settings explanation is English', () => {
    const source = read('app/settings/detail-screen.tsx');
    const at = source.indexOf('label="Help improve reminders"');
    assert.ok(at > -1);
    assert.equal(DEVANAGARI.test(source.slice(at - 200, at + 1500)), false);
  });
});

describe('titles, labels, hints and buttons on those screens stay translated', () => {
  it('the inbox card keeps its heading, buttons and error line in Hindi', () => {
    const card = read('components/notifications/TapConsentCard.tsx');
    assert.match(card, /label=\{t\('Not now', '[^']*[ऀ-ॿ][^']*'\)\}/);
    assert.match(card, /label=\{t\('Yes, help', '[^']*[ऀ-ॿ][^']*'\)\}/);
    assert.match(card, /\{t\('Help improve reminders\?', '[^']*[ऀ-ॿ][^']*'\)\}/);
    assert.match(card, /\{t\('Could not save your choice right now\. Nothing was turned on\.', '[^']*[ऀ-ॿ][^']*'\)\}/);
  });

  it('both onboarding switches keep their title, label and hint in Hindi', () => {
    const source = read('app/(auth)/onboarding.tsx');
    for (const english of ['Help improve reminders', 'Occasional email from Shoonaya']) {
      const pair = new RegExp(`translated\\('${english}', '[^']*[\\u0900-\\u097F][^']*'\\)`, 'g');
      assert.ok((source.match(pair) ?? []).length >= 2, `${english}: title and accessibility label are translated`);
    }
    assert.match(source, /translated\('Optional\. Off unless you turn it on\.', '[^']*[ऀ-ॿ][^']*'\)/);
  });
});
