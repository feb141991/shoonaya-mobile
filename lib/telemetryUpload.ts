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
import * as Crypto from 'expo-crypto';
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
  removeReportedTelemetryEvents,
  type TelemetryIdentity,
} from '@/lib/telemetry';
import { isTelemetryUploadThrottled, decideTelemetryUploadAfterSummary } from '@/lib/telemetryUploadPolicy';

const LAST_UPLOAD_KEY = 'shoonaya_telemetry_v1_last_upload';
const UPLOAD_THROTTLE_MS = 60 * 60 * 1000;
const AUTH_DIAGNOSTIC_LAST_UPLOAD_KEY = 'shoonaya_auth_diag_v1_last_upload';
let nativeDiagnosticUpload: Promise<void> | null = null;

const GUEST_INSTALL_ID_KEY = 'shoonaya_telemetry_guest_install_id_v1';
const telemetrySummaryFlights = new Map<string, Promise<void>>();

/**
 * A random, anonymous, locally-generated id -- never an account id, never
 * derived from any device/hardware signal -- that lets backend analysis
 * tell "the same guest install uploaded N summaries" from "N different
 * guest installs uploaded one each", the same thing an authenticated
 * upload already gets for free from the user's id. Reset to a new random
 * value if the app's storage is ever cleared; nothing links it to any
 * other identifier before or after that. Authenticated uploads never
 * generate or send this -- userId already serves this exact purpose for
 * them, and attaching a second device-level token to a real identity's
 * telemetry would be scope creep this fix doesn't need.
 */
async function getOrCreateGuestInstallId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_INSTALL_ID_KEY);
  if (existing) return existing;
  const generated = Crypto.randomUUID();
  await AsyncStorage.setItem(GUEST_INSTALL_ID_KEY, generated);
  return generated;
}

/**
 * Best-effort foreground beacon: sends the current aggregated summary to
 * the backend, throttled to once per hour per install regardless of how
 * often the caller invokes this. Called from app/_layout.tsx after the app
 * is ready and has settled in the foreground. Never throws and never blocks
 * app behavior. A failed or skipped upload leaves the local events for a
 * later foreground attempt.
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
export function maybeUploadTelemetrySummary(identity: TelemetryIdentity): Promise<void> {
  const flightKey = identity.kind === 'guest' ? 'guest' : `authenticated:${identity.userId}`;
  const existing = telemetrySummaryFlights.get(flightKey);
  if (existing) return existing;

  const flight = uploadTelemetrySummary(identity).finally(() => {
    if (telemetrySummaryFlights.get(flightKey) === flight) telemetrySummaryFlights.delete(flightKey);
  });
  telemetrySummaryFlights.set(flightKey, flight);
  return flight;
}

async function uploadTelemetrySummary(identity: TelemetryIdentity): Promise<void> {
  const { isCurrent } = captureAppIdentity();
  try {
    const lastUploadRaw = await AsyncStorage.getItem(LAST_UPLOAD_KEY);
    const lastUpload = lastUploadRaw ? Number(lastUploadRaw) : null;
    if (isTelemetryUploadThrottled(lastUpload, Date.now(), UPLOAD_THROTTLE_MS)) return;

    const summary = await getTelemetrySummary(identity);
    const decision = decideTelemetryUploadAfterSummary(identity, isCurrent, summary.totalEvents);
    if (decision.action === 'skip') return;

    // Only ever generated/sent for guests -- an authenticated upload already
    // has userId for this exact purpose (see getOrCreateGuestInstallId).
    const guestInstallId = identity.kind === 'guest' ? await getOrCreateGuestInstallId() : null;

    const response = await apiFetch('/api/native/telemetry-summary', {
      method: 'POST',
      ...('expectedUserId' in decision ? { expectedUserId: decision.expectedUserId } : { expectedGuest: true }),
      body: JSON.stringify({
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null,
        ...(guestInstallId ? { guestInstallId } : {}),
        summary,
      }),
    });

    if (response.ok) {
      // Gated on the server's confirmed receipt alone, not isCurrent() --
      // these exact events were genuinely recorded server-side under this
      // identity, so it's correct to stop re-reporting them locally
      // regardless of whether the session has since switched. Mirrors
      // removeUploadedApiRequestDiagnostics/removeUploadedAuthDiagnostics
      // below, which are likewise gated on the response alone.
      await removeReportedTelemetryEvents(identity, summary.totalEvents);
      if (isCurrent()) {
        await AsyncStorage.setItem(LAST_UPLOAD_KEY, String(Date.now()));
      }
    }
  } catch (error) {
    console.warn('[Telemetry] upload failed', error);
  }
}

/**
 * Flushes the anonymous, idempotent auth and API diagnostic outboxes. This
 * deliberately bypasses apiFetch/auth readiness so an auth failure can still
 * be reported. Both payloads omit identity, request bodies, query values,
 * tokens, and user content. Called after the app is ready and settles in foreground.
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

    if (response.status === 400) {
      await removeUploadedAuthDiagnostics(events.map((event) => event.requestId));
      await AsyncStorage.setItem(AUTH_DIAGNOSTIC_LAST_UPLOAD_KEY, String(Date.now()));
      return;
    }
    if (response.status !== 202) return;
    await removeUploadedAuthDiagnostics(events.map((event) => event.requestId));
    await AsyncStorage.setItem(AUTH_DIAGNOSTIC_LAST_UPLOAD_KEY, String(Date.now()));
  } catch {
    // Keep the queue for a later foreground attempt. Diagnostics
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

    if (response.status === 400) {
      await removeUploadedApiRequestDiagnostics(events.map((event) => event.clientEventId));
      await AsyncStorage.setItem(API_DIAGNOSTIC_LAST_UPLOAD_KEY, String(Date.now()));
      return;
    }
    if (response.status !== 202) return;
    await removeUploadedApiRequestDiagnostics(events.map((event) => event.clientEventId));
    await AsyncStorage.setItem(API_DIAGNOSTIC_LAST_UPLOAD_KEY, String(Date.now()));
  } catch {
    // Keep events for the next launch or foreground-resume attempt; diagnostics never
    // block startup or any screen's current request.
  }
}
