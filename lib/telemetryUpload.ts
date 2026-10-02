/**
 * Network side of lib/telemetry.ts, split into its own file so
 * lib/telemetry.ts (covered by __tests__/telemetry.test.ts under this
 * project's plain `tsx --test` runner, which has no React Native
 * transform) never has to import react-native or lib/api.ts, either of
 * which breaks that test file's ability to import it at all.
 *
 * Uploads the aggregated summary only -- see lib/telemetry.ts's header for
 * the privacy classification and the receiving backend contract.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { API_BASE } from '@/lib/constants';
import { APP_VERSION } from '@/lib/appVersion';
import { captureAppIdentity } from '@/lib/appIdentity';
import {
  getTelemetrySummary,
  TELEMETRY_SCHEMA_VERSION,
  readPendingAuthDiagnostics,
  removeUploadedAuthDiagnostics,
  readPendingApiRequestDiagnostics,
  removeUploadedApiRequestDiagnostics,
  type TelemetryIdentity,
} from '@/lib/telemetry';
import { isTelemetryUploadThrottled, decideTelemetryUploadAfterSummary } from '@/lib/telemetryUploadPolicy';

const LAST_UPLOAD_KEY = 'shoonaya_telemetry_v1_last_upload';
const UPLOAD_THROTTLE_MS = 60 * 60 * 1000;
const AUTH_DIAGNOSTIC_LAST_UPLOAD_KEY = 'shoonaya_auth_diag_v1_last_upload';
let nativeDiagnosticUpload: Promise<void> | null = null;

/**
 * Best-effort background beacon: sends the current aggregated summary to
 * the backend, throttled to once per hour per install regardless of how
 * often the caller invokes this. Called from app/_layout.tsx on
 * backgrounding. Never throws, never awaited by anything that affects app
 * behavior -- a failed or skipped upload just means this hour's snapshot is
 * read next time instead.
 *
 * Identity-race guarded the same way app/(tabs)/profile.tsx guards its own
 * writes: captureAppIdentity()'s lease expires on ANY identity transition
 * (including A -> B -> A), checked via decideTelemetryUploadAfterSummary
 * (lib/telemetryUploadPolicy.ts, directly unit tested for account-switch,
 * sign-out and throttle-timing regressions) right before sending, plus
 * expectedUserId on the actual request so apiFetch re-verifies the live
 * session at send time too. Without this, the two awaits below
 * (AsyncStorage read, getTelemetrySummary) give an account switch or
 * sign-out enough of a window to attach this identity's summary to a
 * different session's Bearer token -- apiFetch always sends whatever
 * token is current at the moment it actually fires, not the one active
 * when this function was called.
 */
export async function maybeUploadTelemetrySummary(identity: TelemetryIdentity): Promise<void> {
  const { isCurrent } = captureAppIdentity();
  try {
    const lastUploadRaw = await AsyncStorage.getItem(LAST_UPLOAD_KEY);
    const lastUpload = lastUploadRaw ? Number(lastUploadRaw) : null;
    if (isTelemetryUploadThrottled(lastUpload, Date.now(), UPLOAD_THROTTLE_MS)) return;

    const summary = await getTelemetrySummary(identity);
    const decision = decideTelemetryUploadAfterSummary(identity, isCurrent, summary.totalEvents);
    if (decision.action === 'skip') return;

    const response = await apiFetch('/api/native/telemetry-summary', {
      method: 'POST',
      ...('expectedUserId' in decision ? { expectedUserId: decision.expectedUserId } : { expectedGuest: true }),
      body: JSON.stringify({
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null,
        summary,
      }),
    });

    if (response.ok && isCurrent()) {
      await AsyncStorage.setItem(LAST_UPLOAD_KEY, String(Date.now()));
    }
  } catch (error) {
    console.warn('[Telemetry] upload failed', error);
  }
}

/**
 * Flushes the anonymous, idempotent auth and API diagnostic outboxes. This
 * deliberately bypasses apiFetch/auth readiness so an auth failure can still
 * be reported. Both payloads omit identity, request bodies, query values,
 * tokens, and user content. Called on launch and backgrounding.
 */
export function maybeUploadAuthDiagnostics(): Promise<void> {
  if (nativeDiagnosticUpload) return nativeDiagnosticUpload;
  nativeDiagnosticUpload = Promise.all([uploadAuthDiagnostics(), uploadApiRequestDiagnostics()])
    .then(() => undefined)
    .finally(() => { nativeDiagnosticUpload = null; });
  return nativeDiagnosticUpload;
}

async function uploadAuthDiagnostics(): Promise<void> {
  try {
    const lastUploadRaw = await AsyncStorage.getItem(AUTH_DIAGNOSTIC_LAST_UPLOAD_KEY);
    const lastUpload = lastUploadRaw ? Number(lastUploadRaw) : 0;
    if (Number.isFinite(lastUpload) && Date.now() - lastUpload < 2 * 60 * 1000) return;
    const events = await readPendingAuthDiagnostics();
    if (!events.length) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/native/auth-diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appVersion: APP_VERSION,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null,
          events,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status !== 202) return;
    await removeUploadedAuthDiagnostics(events.map((event) => event.requestId));
    await AsyncStorage.setItem(AUTH_DIAGNOSTIC_LAST_UPLOAD_KEY, String(Date.now()));
  } catch {
    // Keep the queue for a later foreground/background attempt. Diagnostics
    // must never block startup, navigation, or the user's current request.
  }
}

const API_DIAGNOSTIC_LAST_UPLOAD_KEY = 'shoonaya_api_diag_v1_last_upload';
const API_DIAGNOSTIC_BATCH_SIZE = 25;

async function uploadApiRequestDiagnostics(): Promise<void> {
  try {
    const lastUploadRaw = await AsyncStorage.getItem(API_DIAGNOSTIC_LAST_UPLOAD_KEY);
    const lastUpload = lastUploadRaw ? Number(lastUploadRaw) : 0;
    if (Number.isFinite(lastUpload) && Date.now() - lastUpload < 2 * 60 * 1000) return;
    const events = (await readPendingApiRequestDiagnostics()).slice(0, API_DIAGNOSTIC_BATCH_SIZE);
    if (!events.length) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/api/native/api-diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appVersion: APP_VERSION,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null,
          events,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status !== 202) return;
    await removeUploadedApiRequestDiagnostics(events.map((event) => event.clientEventId));
    await AsyncStorage.setItem(API_DIAGNOSTIC_LAST_UPLOAD_KEY, String(Date.now()));
  } catch {
    // Keep events for the next launch/background attempt; diagnostics never
    // block startup or any screen's current request.
  }
}
