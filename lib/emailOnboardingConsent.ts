import { ApiRequestError } from './user-facing-error';

/**
 * Recording the e-mail opt-in made in onboarding.
 *
 * The preferred path is the backend API, which records the choice with the wording version shown and the region that applied. The
 * backend and the app can ship in either order, so when the backend cannot answer (no network, a 5xx, a route that is not deployed
 * yet) the opt-in is written the way every earlier build wrote it, straight to the profile, where the database records it without
 * that context. A REFUSAL is never worked around: a 400, 401, 403, 409 or 429 is an answer, and writing the flags directly after "this
 * account is being deleted" would defeat it.
 *
 * Nothing here is stored on the device. If neither path works the person simply finds the switch off in Settings, Email.
 */
export type OnboardingConsentOutcome = 'recorded' | 'written_directly' | 'not_recorded';

export type OnboardingConsentWriters = {
  /** Through the backend API, with wording and region. */
  record: () => Promise<unknown>;
  /** The profile write older builds made. */
  writeDirect: () => Promise<void>;
};

/** Is this failure "the backend could not answer" rather than "the backend said no"? */
export function backendUnavailable(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return true; // network failure, timeout, abort
  if (error.status >= 500) return true;
  // A route that is not deployed yet answers 404 with no app code. Our own "no profile" 404 carries one and is an answer.
  return error.status === 404 && error.apiCode === null;
}

export async function recordOnboardingEmailOptInWith(writers: OnboardingConsentWriters, attempts = 2): Promise<OnboardingConsentOutcome> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await writers.record();
      return 'recorded';
    } catch (error) {
      if (!backendUnavailable(error)) return 'not_recorded';
    }
  }
  try {
    await writers.writeDirect();
    return 'written_directly';
  } catch {
    return 'not_recorded';
  }
}
