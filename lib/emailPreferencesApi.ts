import { apiFetch } from '@/lib/api';
import { ApiRequestError, requestErrorFromResponse } from '@/lib/user-facing-error';
import {
  buildEmailConsentBody,
  deviceRegionHint,
  emailPreferencesPath,
  parseEmailPolicyOnly,
  parseEmailPreferences,
  parseEmailPreferencesChange,
  type EmailChoiceCategory,
  type EmailConsentPolicy,
  type EmailConsentSource,
  type EmailPreferences,
  type EmailPreferencesChange,
} from './emailPreferences';
import type { EmailWordingVersion } from './emailConsentCopy';

/**
 * The only two calls the app makes about e-mail consent. Both name the signed-in account (`expectedUserId`) so a response is never
 * applied under a later account, neither result is cached or stored (AGENTS 26), and a failure is an error: never an empty answer.
 */
async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function fetchEmailPreferences(userId: string): Promise<EmailPreferences> {
  const response = await apiFetch(emailPreferencesPath({ deviceRegion: deviceRegionHint() }), { expectedUserId: userId });
  const payload = await readJson(response);
  if (!response.ok) throw await requestErrorFromResponse(response, { parsedBody: payload });
  const parsed = parseEmailPreferences(payload);
  if (!parsed) throw new ApiRequestError(502, 'EMAIL_PREFERENCES_INVALID');
  return parsed;
}

/** The wording policy alone: works before the profile row exists (onboarding), and reads nothing about the person. */
export async function fetchEmailConsentPolicy(userId: string): Promise<EmailConsentPolicy> {
  const response = await apiFetch(emailPreferencesPath({ deviceRegion: deviceRegionHint(), policyOnly: true }), { expectedUserId: userId });
  const payload = await readJson(response);
  if (!response.ok) throw await requestErrorFromResponse(response, { parsedBody: payload });
  const parsed = parseEmailPolicyOnly(payload);
  if (!parsed) throw new ApiRequestError(502, 'EMAIL_PREFERENCES_INVALID');
  return parsed;
}

export async function setEmailPreference(
  userId: string,
  input: { category: EmailChoiceCategory; granted: boolean; source: EmailConsentSource; wordingVersion: EmailWordingVersion },
): Promise<EmailPreferencesChange> {
  const response = await apiFetch(emailPreferencesPath(), {
    method: 'POST',
    body: buildEmailConsentBody({ ...input, deviceRegion: deviceRegionHint() }),
    expectedUserId: userId,
  });
  const payload = await readJson(response);
  if (!response.ok) throw await requestErrorFromResponse(response, { parsedBody: payload });
  const parsed = parseEmailPreferencesChange(payload);
  if (!parsed) throw new ApiRequestError(502, 'EMAIL_PREFERENCES_INVALID');
  return parsed;
}
