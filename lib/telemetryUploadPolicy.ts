// Pure decision logic for lib/telemetryUpload.ts, extracted so the
// account-switch/sign-out/throttle-timing behavior is directly unit
// testable under this project's plain `tsx --test` runner -- the same
// reason lib/japaCompletionReconciliation.ts exists as its own file.
// telemetryUpload.ts (react-native, apiFetch, AsyncStorage) stays a thin
// wrapper around these two functions; nothing here imports react-native.
import type { TelemetryIdentity } from '@/lib/telemetry';

export function isTelemetryUploadThrottled(
  lastUploadAt: number | null,
  now: number,
  throttleMs: number
): boolean {
  if (lastUploadAt === null || !Number.isFinite(lastUploadAt)) return false;
  return now - lastUploadAt < throttleMs;
}

export type TelemetryUploadDecision =
  | { action: 'skip'; reason: 'empty' | 'identity-changed' }
  | { action: 'send'; expectedUserId: string }
  | { action: 'send'; expectedGuest: true };

/**
 * Called once the summary is already in hand (after the AsyncStorage/
 * getTelemetrySummary awaits in telemetryUpload.ts, which is exactly where
 * an account switch or sign-out has room to land). isCurrent() must be the
 * lease captured at the START of the upload attempt (before those awaits),
 * via lib/appIdentity's captureAppIdentity() -- it expires on ANY identity
 * transition since that capture, including a switch away and back
 * (A -> B -> A), which a plain "is the userId still the same" comparison
 * would miss.
 *
 * The isCurrent() check above only covers up to the point this function
 * returns -- apiFetch itself has its own internal awaits (waitForAuthReady,
 * token resolution) after that, which is a second window for the same
 * class of race. expectedUserId/expectedGuest on the returned decision are
 * what close that second window: apiFetch re-verifies the live session
 * immediately before actually sending, for both the authenticated case
 * (already existed) and the guest case (external review found this half
 * missing -- a guest send had no send-time owner check at all).
 */
export function decideTelemetryUploadAfterSummary(
  identity: TelemetryIdentity,
  isCurrent: () => boolean,
  totalEvents: number
): TelemetryUploadDecision {
  if (totalEvents === 0) return { action: 'skip', reason: 'empty' };
  if (!isCurrent()) return { action: 'skip', reason: 'identity-changed' };
  return identity.kind === 'authenticated'
    ? { action: 'send', expectedUserId: identity.userId }
    : { action: 'send', expectedGuest: true };
}
