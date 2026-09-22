import type { FailureReason } from './telemetry';
import { isFetchCancelled } from './fetch-error';

/** A profile response that has already passed apiFetch's single 401 replay. */
export class ProfileLoadError extends Error {
  readonly reason: FailureReason;

  constructor(reason: FailureReason, message: string) {
    super(message);
    this.name = 'ProfileLoadError';
    this.reason = reason;
  }
}

/**
 * Classifies the failure that remains after the shared API auth policy has
 * restored the session and performed its one safe 401 replay.
 */
export function classifyProfileLoadFailure(error: unknown): FailureReason {
  if (error instanceof ProfileLoadError) return error.reason;
  if (isFetchCancelled(error)) return 'timeout';
  if (error instanceof Error && error.message === 'Profile response owner did not match the active account') {
    return 'owner_mismatch';
  }
  if (error instanceof Error && error.message === 'Could not load progress summary') {
    return 'server_error';
  }
  return 'network';
}

export type ProfileFailureCopy = {
  title: string;
  subtitle: string;
  ctaLabel: string;
};

export function getProfileFailureCopy(reason: FailureReason): ProfileFailureCopy {
  switch (reason) {
    case 'timeout':
      return {
        title: 'Profile is taking longer than expected',
        subtitle: 'Your connection may be slow. Your saved profile will remain available when it loads.',
        ctaLabel: 'Retry',
      };
    case 'server_error':
      return {
        title: 'Profile is temporarily unavailable',
        subtitle: 'Shoonaya could not refresh your milestones. Please try again shortly.',
        ctaLabel: 'Retry',
      };
    case 'owner_mismatch':
      return {
        title: 'Profile changed',
        subtitle: 'Your account changed while the profile was loading. Please retry to continue.',
        ctaLabel: 'Retry',
      };
    case 'network':
    default:
      return {
        title: 'Could not connect to your profile',
        subtitle: 'Check your connection, then try again.',
        ctaLabel: 'Retry',
      };
  }
}
