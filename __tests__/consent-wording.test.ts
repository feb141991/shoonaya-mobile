import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { RELIGIOUS_DATA_CONSENT_COPY } from '../lib/religious-data-consent';

// The consent ledger records which wording a person saw by version and SHA-256. The database holds the registry (backend migration
// 20261112140000_consent_evidence_ledger) and the backend's consent-wording.test.ts pins the same checksums. This test ties them to the text
// ACTUALLY ON SCREEN: edit a consent's wording without registering a new version and it fails, so the ledger can never attest to text
// nobody was shown. Origin: 2026-11-12 privacy audit (consents were yes/no flags with no record of the wording).

const PINNED: Record<string, string> = {
  'religious_data/onboarding': 'd90e70dc7413861fd217ecb876e8bcde81eb7148c57bcd041cb54ef885312e4e',
  'religious_data/settings': '85e994ba01910febea4aa4f935277cae3be41039d407af343cb980346a7725a8',
  'activity_personalization/settings': 'd9efd5b95b51d1e81d22c57e425296f4dd118b4f13503ad12e66c44bbe276030',
  'product_analytics/settings': 'da84fe1733c30d792a80c2a2baef43f3bdeb053a7e7667d4974b17ecd49fd09d',
  'notification_taps/settings': '3f6d241a589a965640fca586f39f6277ca9f374d560adca9af7de4efee5fee6e',
  'notification_taps/onboarding': '68ec3a52eaa1ae51c6ccabe15d19dd7c0ca43c1df7cafb1059553c50f1c0e2b6',
  'notification_taps/inbox_card': '8e982d410ace5221657076d0fe6778786977f0a87007f3b5e7217962dd6e6ca1',
};

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
/** The string literal or line of JSX text that begins at `start`, up to `end`. */
const textFrom = (file: string, start: string, end: string) => {
  const source = read(file);
  const at = source.indexOf(start);
  assert.ok(at > -1, `${file} must still contain: ${start}`);
  return source.slice(at, source.indexOf(end, at)).trim();
};

const religious = RELIGIOUS_DATA_CONSENT_COPY.en;
const ON_SCREEN: Record<string, string> = {
  'religious_data/onboarding': [religious.title, religious.body, religious.switchLabel, religious.switchHint, religious.footer].join('\n'),
  'religious_data/settings': textFrom('app/settings/detail-screen.tsx', 'Uses your spiritual preference data', '"'),
  'activity_personalization/settings': textFrom('app/settings/detail-screen.tsx', 'Allow recent practice activity to reorder', "'"),
  'product_analytics/settings': textFrom('app/settings/detail-screen.tsx', 'Optional, account-linked daily events', "'"),
  'notification_taps/settings': textFrom('app/settings/detail-screen.tsx', 'Optional. When on, we record when you tap a reminder', "'"),
  'notification_taps/onboarding': textFrom('app/(auth)/onboarding.tsx', 'Optional. Lets us see which reminders you tap', '\n'),
  'notification_taps/inbox_card': textFrom('components/notifications/TapConsentCard.tsx', 'If you say yes, we record which reminder you tap', '\n'),
};

describe('consent wording on screen matches the registered checksums', () => {
  it('pins the same wordings the module declares', async () => {
    const { CONSENT_WORDING_SHA256 } = await import('../lib/consentWording');
    assert.deepEqual(CONSENT_WORDING_SHA256, PINNED);
  });

  for (const [id, hash] of Object.entries(PINNED)) {
    it(`${id}: the text shown hashes to the registered value`, () => {
      assert.equal(sha(ON_SCREEN[id]), hash, `${id} was edited: register a new wording version in the backend and bump CONSENT_WORDING_VERSION`);
    });
  }

  it('shows every registered consent screen', () => {
    assert.deepEqual(Object.keys(ON_SCREEN).sort(), Object.keys(PINNED).sort());
  });
});

describe('every consent write says which screen and wording it was made on', () => {
  it('builds the context from registered wordings only', async () => {
    const { buildConsentContext, consentKeysIn, attachConsentContext, CONSENT_WORDING_VERSION } = await import('../lib/consentWording');
    const env = { platform: 'ios', appVersion: '1.4.0' };
    const consentContext = (surface: 'onboarding' | 'settings' | 'inbox_card', keys: Parameters<typeof buildConsentContext>[1]) => buildConsentContext(surface, keys, env);
    const settings = consentContext('settings', ['notification_taps', 'product_analytics']);
    assert.equal(settings.surface, 'settings');
    assert.deepEqual([settings.platform, settings.app_version], ['ios', '1.4.0']);
    assert.deepEqual(settings.wording_versions, { notification_taps: CONSENT_WORDING_VERSION, product_analytics: CONSENT_WORDING_VERSION });
    // No religious-data wording exists on the inbox card, so none is claimed.
    assert.deepEqual(consentContext('inbox_card', ['religious_data']).wording_versions, {});
    assert.deepEqual(consentKeysIn({ consent_religious_data: true, tradition: 'hindu' }), ['religious_data']);
    assert.deepEqual(consentKeysIn({ full_name: 'x' }), []);
    const plain = { full_name: 'x' };
    assert.equal(attachConsentContext(plain, 'onboarding', env), plain, 'nothing is added when no consent is in the write');
    assert.equal(attachConsentContext({ consent_religious_data: true }, 'onboarding', env).consent_context_in?.surface, 'onboarding');
  });

  it('Settings sends the context with consent changes', () => {
    const src = read('app/settings/detail-screen.tsx');
    assert.match(src, /consent_context: consentContext\('settings', consentKeysIn\(write\.fields/);
  });

  it('the tap consent save takes the screen from its callers', () => {
    assert.match(read('lib/notificationTapConsent.ts'), /saveNotificationTapConsent\(userId: string, value: boolean, surface: ConsentSurface\)/);
    assert.match(read('lib/notificationTapConsent.ts'), /consent_context: consentContext\(surface, \['notification_taps'\]\)/);
    assert.match(read('components/notifications/TapConsentCard.tsx'), /saveNotificationTapConsent\(userId, true, 'inbox_card'\)/);
    assert.match(read('app/(auth)/onboarding.tsx'), /saveNotificationTapConsent\(user\.id, true, 'onboarding'\)/);
  });

  it('every direct profile write in onboarding goes through withConsentContext', () => {
    const src = read('app/(auth)/onboarding.tsx');
    assert.equal((src.match(/withConsentContext\(/g) ?? []).length, 3, 'early update, early upsert and the final payload');
    assert.match(src, /\.update\(withConsentContext\(payload, 'onboarding'\)\)/);
    assert.match(src, /\.\.\.withConsentContext\(payload, 'onboarding'\)/);
    assert.match(src, /const consentedProfilePayload = withConsentContext\(profilePayload, 'onboarding'\)/);
    assert.match(src, /\.update\(consentedProfilePayload\)/);
    assert.match(src, /\.\.\.consentedProfilePayload,/);
  });
});
