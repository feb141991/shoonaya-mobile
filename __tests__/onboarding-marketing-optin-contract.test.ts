import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source-level pins for the onboarding marketing-email switch. The screen is not rendered in unit tests, so
 * these guard the wiring that the payload tests cannot see: default off, saved with the profile, never kept
 * in the draft, and reachable by screen readers.
 */
const raw = readFileSync(join(__dirname, '..', 'app', '(auth)', 'onboarding.tsx'), 'utf8');
const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('onboarding marketing email switch', () => {
  it('starts off: consent is never pre-ticked', () => {
    assert.match(source, /const \[marketingOptIn, setMarketingOptIn\] = useState\(false\)/);
  });

  it('is saved with the profile through the shared builder', () => {
    assert.match(source, /buildOnboardingProfilePayload\(\{[\s\S]*?\bmarketingOptIn,[\s\S]*?\}\)/);
  });

  it('is never written to the resumable draft, so a resumed session cannot start from a remembered yes', () => {
    const draftCalls = source.match(/(syncDraft|saveOnboardingDraft)\([^)]*\)/g) ?? [];
    assert.ok(draftCalls.length > 0, 'expected draft calls to exist');
    for (const call of draftCalls) assert.equal(/marketingOptIn/.test(call), false, call);
  });

  it('is a real switch for assistive technology, with a label, a hint and its state', () => {
    const block = source.slice(source.indexOf('setMarketingOptIn((value) => !value)') - 200);
    assert.match(block, /accessibilityRole="switch"/);
    assert.match(block, /accessibilityState=\{\{ checked: marketingOptIn \}\}/);
    assert.match(block, /accessibilityLabel=\{translated\(/);
    assert.match(block, /accessibilityHint=\{translated\(/);
  });

  it('keeps a 44pt-or-larger tap target', () => {
    const block = source.slice(source.indexOf('setMarketingOptIn((value) => !value)'));
    const minHeight = Number(block.match(/minHeight: (\d+)/)?.[1]);
    assert.ok(minHeight >= 44, `minHeight ${minHeight}`);
  });

  it('is offered in both supported languages and says it is optional and can be unsubscribed', () => {
    assert.match(source, /'Occasional email from Shoonaya', 'Shoonaya से कभी-कभार ईमेल'/);
    assert.match(source, /Optional, and you can unsubscribe at any time/);
    assert.match(source, /वैकल्पिक, और आप कभी भी सदस्यता छोड़ सकते हैं/);
  });

  it('does not change the reminder permission flow: the choice is not read when asking for notifications', () => {
    const handler = source.slice(source.indexOf('const handleAllowNotifications'), source.indexOf('const handleNotNow'));
    assert.ok(handler.length > 50, 'expected to find the notification handlers');
    assert.equal(/marketingOptIn/.test(handler), false);
  });
});
