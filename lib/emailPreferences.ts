import { normaliseEmailWording, type EmailWordingVersion } from './emailConsentCopy';

/**
 * E-mail choices (Settings, Email) and the onboarding opt-in. The server is the only record: nothing here is cached or stored on the
 * device, because a stale "on" or "off" would let a screen offer the wrong action (AGENTS 26).
 */
export type EmailChoiceCategory = 'newsletter' | 'festivals';
export type EmailConsentSource = 'onboarding' | 'settings';

export type EmailConsentPolicy = {
  region: string | null;
  regionSource: 'ip_header' | 'device_region' | 'profile_country' | null;
  wordingVersion: EmailWordingVersion;
};

export type EmailPreferences = {
  newsletter: boolean;
  festivals: boolean;
  lastChangedAt: string | null;
  policy: EmailConsentPolicy;
};

export type EmailPreferencesChange = { newsletter: boolean; festivals: boolean; lastChangedAt: string | null };

/** A two-letter uppercase country code, or null. "XX" is the placeholder some systems use for "unknown". */
export function normaliseRegionCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : null;
}

/** The region from a locale tag such as "en-IN" or "zh-Hant-TW", or null. Never guesses a region from the language alone. */
export function regionFromLocale(locale: unknown): string | null {
  if (typeof locale !== 'string') return null;
  const parts = locale.trim().replace(/_/g, '-').split('-').slice(1);
  for (const part of parts) {
    if (/^[A-Za-z]{2}$/.test(part)) return normaliseRegionCode(part);
  }
  return null;
}

/** The device's region, read without a native module (a new one could not ship over the air). */
export function deviceRegionHint(): string | null {
  try {
    return regionFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return null;
  }
}

export function emailPreferencesPath(options: { deviceRegion?: string | null; policyOnly?: boolean } = {}): string {
  const query: string[] = [];
  if (options.policyOnly) query.push('policyOnly=1');
  const region = normaliseRegionCode(options.deviceRegion);
  if (region) query.push(`deviceRegion=${region}`);
  return `/api/native/email-preferences${query.length ? `?${query.join('&')}` : ''}`;
}

export function buildEmailConsentBody(input: {
  category: EmailChoiceCategory;
  granted: boolean;
  source: EmailConsentSource;
  wordingVersion: EmailWordingVersion;
  deviceRegion?: string | null;
}): string {
  if (input.category !== 'newsletter' && input.category !== 'festivals') throw new Error('invalid_email_category');
  if (typeof input.granted !== 'boolean') throw new Error('invalid_email_granted');
  if (input.source !== 'onboarding' && input.source !== 'settings') throw new Error('invalid_email_source');
  const region = normaliseRegionCode(input.deviceRegion);
  return JSON.stringify({
    category: input.category,
    granted: input.granted,
    source: input.source,
    wordingVersion: normaliseEmailWording(input.wordingVersion),
    ...(region ? { deviceRegion: region } : {}),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePolicy(value: unknown): EmailConsentPolicy | null {
  if (!isRecord(value)) return null;
  const region = value.region === null || (typeof value.region === 'string' && /^[A-Z]{2}$/.test(value.region)) ? (value.region as string | null) : undefined;
  if (region === undefined) return null;
  const source = value.regionSource;
  if (source !== null && source !== 'ip_header' && source !== 'device_region' && source !== 'profile_country') return null;
  // An unknown wording version is not an error: this build then shows the strictest text.
  return { region, regionSource: source, wordingVersion: normaliseEmailWording(value.wordingVersion) };
}

/** Strict: anything that is not exactly the shape the server sends is an error, never "everything off". */
export function parseEmailPreferences(payload: unknown): EmailPreferences | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.newsletter !== 'boolean' || typeof payload.festivals !== 'boolean') return null;
  if (payload.lastChangedAt !== null && typeof payload.lastChangedAt !== 'string') return null;
  const policy = parsePolicy(payload.policy);
  if (!policy) return null;
  return { newsletter: payload.newsletter, festivals: payload.festivals, lastChangedAt: payload.lastChangedAt as string | null, policy };
}

export function parseEmailPolicyOnly(payload: unknown): EmailConsentPolicy | null {
  return isRecord(payload) ? parsePolicy(payload.policy) : null;
}

export function parseEmailPreferencesChange(payload: unknown): EmailPreferencesChange | null {
  if (!isRecord(payload) || payload.ok !== true) return null;
  if (typeof payload.newsletter !== 'boolean' || typeof payload.festivals !== 'boolean') return null;
  if (payload.lastChangedAt !== null && typeof payload.lastChangedAt !== 'string') return null;
  return { newsletter: payload.newsletter, festivals: payload.festivals, lastChangedAt: payload.lastChangedAt as string | null };
}
