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
import { APP_VERSION } from '@/lib/appVersion';
import { getTelemetrySummary, TELEMETRY_SCHEMA_VERSION, type TelemetryIdentity } from '@/lib/telemetry';

const LAST_UPLOAD_KEY = 'shoonaya_telemetry_v1_last_upload';
const UPLOAD_THROTTLE_MS = 60 * 60 * 1000;

/**
 * Best-effort background beacon: sends the current aggregated summary to
 * the backend, throttled to once per hour per install regardless of how
 * often the caller invokes this. Called from app/_layout.tsx on
 * backgrounding. Never throws, never awaited by anything that affects app
 * behavior -- a failed or skipped upload just means this hour's snapshot is
 * read next time instead.
 */
export async function maybeUploadTelemetrySummary(identity: TelemetryIdentity): Promise<void> {
  try {
    const lastUploadRaw = await AsyncStorage.getItem(LAST_UPLOAD_KEY);
    const lastUpload = lastUploadRaw ? Number(lastUploadRaw) : 0;
    if (Number.isFinite(lastUpload) && Date.now() - lastUpload < UPLOAD_THROTTLE_MS) return;

    const summary = await getTelemetrySummary(identity);
    if (summary.totalEvents === 0) return;

    const response = await apiFetch('/api/native/telemetry-summary', {
      method: 'POST',
      body: JSON.stringify({
        schemaVersion: TELEMETRY_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null,
        summary,
      }),
    });

    if (response.ok) {
      await AsyncStorage.setItem(LAST_UPLOAD_KEY, String(Date.now()));
    }
  } catch (error) {
    console.warn('[Telemetry] upload failed', error);
  }
}
