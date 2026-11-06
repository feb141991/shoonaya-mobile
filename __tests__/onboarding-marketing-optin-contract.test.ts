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

  it('is NOT part of the profile payload: it is recorded through the backend after the profile is saved', () => {
    const call = source.match(/buildOnboardingProfilePayload\(\{[\s\S]*?\}\)/)?.[0] ?? '';
    assert.ok(call.length > 50, 'expected to find the payload call');
    assert.equal(/marketingOptIn/.test(call), false, 'the payload call must not receive the e-mail choice');
    const record = source.slice(source.indexOf('recordOnboardingEmailOptInWith('));
    assert.match(record, /setEmailPreference\(user\.id, \{ category: 'newsletter', granted: true, source: 'onboarding', wordingVersion: wordingShown \}\)/);
    assert.ok(source.indexOf('recordOnboardingEmailOptInWith(') > source.indexOf('.from(\'profiles\').upsert('), 'recorded only after the profile exists');
  });

  it('records only a real opt-in, never blocks finishing onboarding, and falls back to the old direct write only', () => {
    assert.match(source, /if \(marketingOptIn\) \{\s*const wordingShown = emailWording;/);
    assert.match(source, /void recordOnboardingEmailOptInWith\(/);
    assert.equal(/await recordOnboardingEmailOptInWith/.test(source), false, 'must not hold the finish behind the network');
    assert.match(source, /writeDirect: async \(\) => \{[\s\S]*?getMarketingConsentPayload\(true\)/);
  });

  it('shows the wording the backend names for the region, and the strictest text until it answers', () => {
    assert.match(source, /useState<EmailWordingVersion>\(STRICTEST_EMAIL_WORDING\)/);
    assert.match(source, /fetchEmailConsentPolicy\(lease\.identity\.userId\)/);
    assert.match(source, /lease\.isCurrent\(\)/);
    assert.match(source, /emailWordingCopy\(emailWording, isHindi \? 'hi' : 'en'\)\.newsletter\.help/);
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

  it('is offered in both supported languages, and every wording version says it is optional and how to stop it', () => {
    assert.match(source, /'Occasional email from Shoonaya', 'Shoonaya से कभी-कभार ईमेल'/);
    const copy = readFileSync(join(__dirname, '..', 'lib', 'emailConsentCopy.ts'), 'utf8');
    assert.match(copy, /Optional, and you can unsubscribe at any time/);
    assert.match(copy, /वैकल्पिक, और आप कभी भी सदस्यता छोड़ सकते हैं/);
    assert.match(copy, /Optional: we email you only if you turn this on/);
  });

  it('does not change the reminder permission flow: the choice is not read when asking for notifications', () => {
    const handler = source.slice(source.indexOf('const handleAllowNotifications'), source.indexOf('const handleNotNow'));
    assert.ok(handler.length > 50, 'expected to find the notification handlers');
    assert.equal(/marketingOptIn/.test(handler), false);
  });
});
