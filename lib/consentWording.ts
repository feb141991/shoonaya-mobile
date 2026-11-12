/**
 * Which wording a person was shown when they changed a consent, for the consent evidence ledger (backend migration
 * 20261112140000_consent_evidence_ledger). The app sends the version; the database looks the exact text and its checksum up in its own
 * registry, so a client cannot choose either. The checksums below are pinned in BOTH repositories (this app's
 * __tests__/consent-wording.test.ts checks them against the text on screen; the backend's consent-wording.test.ts checks the registry).
 * Change a wording on screen: register a new version in the backend registry first, then bump the version here.
 */
export const CONSENT_WORDING_VERSION = '2026-11-12';

export type ConsentKey = 'religious_data' | 'activity_personalization' | 'product_analytics' | 'notification_taps';
export type ConsentSurface = 'onboarding' | 'settings' | 'inbox_card';

/** SHA-256 of the exact English text shown, per consent and screen. Pinned; see the test. */
export const CONSENT_WORDING_SHA256: Record<string, string> = {
  'religious_data/onboarding': 'd90e70dc7413861fd217ecb876e8bcde81eb7148c57bcd041cb54ef885312e4e',
  'religious_data/settings': '85e994ba01910febea4aa4f935277cae3be41039d407af343cb980346a7725a8',
  'activity_personalization/settings': 'd9efd5b95b51d1e81d22c57e425296f4dd118b4f13503ad12e66c44bbe276030',
  'product_analytics/settings': 'da84fe1733c30d792a80c2a2baef43f3bdeb053a7e7667d4974b17ecd49fd09d',
  'notification_taps/settings': '3f6d241a589a965640fca586f39f6277ca9f374d560adca9af7de4efee5fee6e',
  'notification_taps/onboarding': '68ec3a52eaa1ae51c6ccabe15d19dd7c0ca43c1df7cafb1059553c50f1c0e2b6',
  'notification_taps/inbox_card': '8e982d410ace5221657076d0fe6778786977f0a87007f3b5e7217962dd6e6ca1',
};

/** The profile column each consent is stored in. */
export const CONSENT_COLUMN: Record<ConsentKey, string> = {
  religious_data: 'consent_religious_data',
  activity_personalization: 'consent_activity_personalization',
  product_analytics: 'consent_product_analytics',
  notification_taps: 'consent_notification_taps',
};

export type ConsentContext = {
  surface: ConsentSurface;
  wording_versions: Partial<Record<ConsentKey, string>>;
  platform: string;
  app_version: string;
};

/** The consents whose profile column appears in a write. */
export function consentKeysIn(fields: Record<string, unknown>): ConsentKey[] {
  return (Object.keys(CONSENT_COLUMN) as ConsentKey[]).filter((key) => CONSENT_COLUMN[key] in fields);
}

export type ConsentEnvironment = { platform: string; appVersion: string };

/**
 * The context to send with a consent change on a screen. A consent with no registered wording on that screen is left out, and the ledger
 * records it as having none. Pure: the platform and app version come from `lib/consentContext.ts`, which can import React Native.
 */
export function buildConsentContext(surface: ConsentSurface, keys: ConsentKey[], env: ConsentEnvironment): ConsentContext {
  const versions: Partial<Record<ConsentKey, string>> = {};
  for (const key of keys) {
    if (`${key}/${surface}` in CONSENT_WORDING_SHA256) versions[key] = CONSENT_WORDING_VERSION;
  }
  return { surface, wording_versions: versions, platform: env.platform, app_version: env.appVersion };
}

/** A direct profile write carries the context in the write-only column profiles.consent_context_in; nothing is added when no consent is in the write. */
export function attachConsentContext<T extends Record<string, unknown>>(payload: T, surface: ConsentSurface, env: ConsentEnvironment): T & { consent_context_in?: ConsentContext } {
  const keys = consentKeysIn(payload);
  return keys.length > 0 ? { ...payload, consent_context_in: buildConsentContext(surface, keys, env) } : payload;
}
