import { AppState, Platform } from 'react-native';

import { isNativeAnalyticsEnabled, isNativePracticeAnalyticsEnabled } from '@/lib/analytics';
import { apiFetch } from '@/lib/api';
import { APP_VERSION } from '@/lib/appVersion';
import { getAppIdentity } from '@/lib/appIdentity';
import type { PendingNotificationTap } from '@/lib/notificationTap';
import {
  clearTapQueue,
  createSerialRunner,
  enqueueTap,
  flushTapQueue,
  TAP_UPLOAD_PATH,
  type TapQueueDeps,
} from '@/lib/notificationTapQueue';
import { readUserScoped, USER_SCOPED_NAMES, writeUserScoped } from '@/lib/userScopedStorage';

/**
 * Reports taps on our push notifications (AGENTS.md section 28; backend migration 20261111100000).
 *
 * A tap is counted when it is DELIVERED (lib/notificationTap.ts), because only then is the person signed in and the
 * app interactive. It is queued under the signed-in account, in storage that sign-out and account switches purge, and
 * only if this device's product-measurement consent is on. It is uploaded after a short settle, never at the
 * background edge, and removed from the queue only when the server acknowledges it.
 *
 * Nothing here can make a tap, a notification or the app misbehave: every entry point swallows its own failures.
 */

const FLUSH_AFTER_TAP_MS = 3_000;
const UPLOAD_TIMEOUT_MS = 10_000;

const runner = createSerialRunner();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function deps(): TapQueueDeps {
  return {
    now: () => Date.now(),
    getIdentity: getAppIdentity,
    consent: () => ({ analytics: isNativeAnalyticsEnabled(), practice: isNativePracticeAnalyticsEnabled() }),
    readQueue: (identity) => readUserScoped(identity, USER_SCOPED_NAMES.notificationTapQueue),
    writeQueue: (identity, value) => writeUserScoped(identity, USER_SCOPED_NAMES.notificationTapQueue, value),
    post: (userId, body) => apiFetch(TAP_UPLOAD_PATH, {
      method: 'POST',
      expectedUserId: userId,
      timeoutMs: UPLOAD_TIMEOUT_MS,
      body: JSON.stringify(body),
    }),
    appVersion: APP_VERSION,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : undefined,
  };
}

/** Uploads what is queued for the signed-in account. Safe to call at any time; one flush at a time. */
export function flushNotificationTaps(): Promise<void> {
  return runner.run(() => flushTapQueue(deps())).then(() => undefined, () => undefined);
}

function flushSoon() {
  if (flushTimer !== null || AppState.currentState !== 'active') return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (AppState.currentState === 'active') void flushNotificationTaps();
  }, FLUSH_AFTER_TAP_MS);
}

/** Called once for each tap that was delivered (navigated). Never throws, never waits. */
export function recordDeliveredNotificationTap(tap: PendingNotificationTap): void {
  try {
    void runner.run(() => enqueueTap(deps(), tap)).then((result) => {
      if (result === 'queued') flushSoon();
    }, () => undefined);
  } catch {
    // Measurement must never interrupt the app.
  }
}

/** Deletes queued taps when the person turns product measurement (or the practice setting) off. */
export function clearNotificationTapQueue(userId: string): Promise<void> {
  return runner.run(() => clearTapQueue(deps(), userId)).then(() => undefined, () => undefined);
}
