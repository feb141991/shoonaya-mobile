import type { Href } from 'expo-router';

import { pathFromUrlLike, resolveNativeRoute } from '@/lib/routes';

/**
 * What happens when someone taps a push notification.
 *
 * Kept free of expo-notifications imports so it can be unit-tested. Three jobs:
 *  1. routeForNotificationTap: payload -> screen.
 *  2. A held-tap store: a tap that arrives before the app can navigate (cold start, still signing in) is kept, then
 *     delivered once, instead of being lost or fought over by the startup redirects.
 *  3. observeNotificationResponses: reads the tap that LAUNCHED the app (expo-notifications only hands that one to
 *     getLastNotificationResponse, never to a listener registered after launch) as well as taps while running.
 */

/** expo-notifications' DEFAULT_ACTION_IDENTIFIER: the person tapped the notification itself. */
export const DEFAULT_TAP_ACTION = 'expo.modules.notifications.actions.DEFAULT';

/** A tap that has not been delivered after this long is stale; the person has moved on. */
export const NOTIFICATION_TAP_HOLD_MS = 10 * 60 * 1000;

type TapData = Record<string, unknown>;

export function routeForNotificationTap(data: TapData | null | undefined): Href {
  const payload = data ?? {};
  // Prefer the real destination the backend intended (src/lib/push-server.ts puts it in `data.url`) over the coarser
  // `type` bucket. `url` is untrusted JSON: only a string is a destination.
  const fromUrl = typeof payload.url === 'string' ? pathFromUrlLike(payload.url) : null;
  if (fromUrl) return resolveNativeRoute(fromUrl, '/notifications');
  if (typeof payload.url === 'string' && payload.url.trim()) return '/notifications';

  switch (payload.type) {
    case 'pitru_paksha':
    case 'tithi': return '/panchang';
    case 'weekly_summary': return '/my-progress';
    case 'festival': return '/vrat';
    case 'nitya':
    case 'brahma_muhurta': return '/nitya-karma';
    case 'japa': return '/japa';
    case 'streak': return '/(tabs)';
    case 'mood':
    case 'mood_checkin': return '/mood';
    case 'connection_request':
    case 'connection_accepted':
    case 'connection_rejected':
    case 'connection_cancelled':
    case 'user_blocked':
    case 'content_reported':
    case 'comment_reaction':
    case 'mandali_comment':
    case 'post_reaction': return '/mandali';
    // general/test/milestone/sanskar_milestone/guided-plan/broadcast and anything unrecognised land in the inbox
    // itself rather than guessing: the notification that was tapped is right there, in context.
    default: return '/notifications';
  }
}

// ── Held tap ────────────────────────────────────────────────────────────────

/** `cold_start`: the tap launched the app. `running`: the app was already open (foreground or background). */
export type NotificationTapLaunchState = 'cold_start' | 'running';

export type PendingNotificationTap = {
  href: Href;
  key: string;
  receivedAt: number;
  /**
   * The backend's key for the push that was tapped (`data.notificationKey`), or null for anything that is not one of
   * our pushes (an OS link, an old push sent before the key existed). Only used to tell the server WHICH notification
   * was tapped; the server re-checks it against its own send log.
   */
  notificationKey: string | null;
  /** The push's `data.type`, used only to avoid queueing what the server would refuse. Never sent. */
  notificationType: string | null;
  launchState: NotificationTapLaunchState;
};

const NOTIFICATION_KEY_MAX = 200;

function boundedString(value: unknown, max: number, pattern?: RegExp): string | null {
  if (typeof value !== 'string' || value.length < 1 || value.length > max) return null;
  return pattern && !pattern.test(value) ? null : value;
}

const HANDLED_KEYS_LIMIT = 30;
let pending: PendingNotificationTap | null = null;
let handledKeys: string[] = [];
const acknowledgements = new Map<string, () => void>();
const listeners = new Set<() => void>();

/**
 * Calls every subscriber. One that throws must not stop the others or make `enqueueNotificationTap` throw: that call is
 * made from the operating-system link handler, so a throw there drops the tap or link (the destination is already held in
 * `pending`, so the next render still sees it). The error is logged with its message so a repeat can be diagnosed; the
 * first occurrence (2026-11-12) arrived with a code frame and no message. Nothing from the tap itself is logged.
 */
function notify() {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch (error) {
      console.error('[notificationTap] a subscriber threw:', error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    }
  }
}

/** Holds a tap for delivery. The same response (same key) is accepted once per session. */
export function enqueueNotificationTap(
  key: string,
  data: TapData | null | undefined,
  now: number = Date.now(),
  launchState: NotificationTapLaunchState = 'running',
): boolean {
  if (handledKeys.includes(key)) return false;
  handledKeys = [...handledKeys, key].slice(-HANDLED_KEYS_LIMIT);
  pending = {
    href: routeForNotificationTap(data),
    key,
    receivedAt: now,
    notificationKey: boundedString(data?.notificationKey, NOTIFICATION_KEY_MAX),
    notificationType: boundedString(data?.type, 64, /^[a-z0-9_]+$/),
    launchState,
  };
  notify();
  return true;
}

export function getPendingNotificationTap(): PendingNotificationTap | null {
  return pending;
}

function acknowledge(key: string) {
  acknowledgements.get(key)?.();
  acknowledgements.delete(key);
}

/**
 * Navigate before consuming. A thrown router call leaves the intent available for retry.
 *
 * `onDelivered` runs only for a tap that was actually navigated (not one that went stale while held), after the
 * navigation succeeded, and can never break it: a throwing observer is ignored. This is where a tap is counted: the
 * person is signed in and the app is interactive by the time we get here.
 */
export function deliverPendingNotificationTap(
  navigate: (href: Href) => void,
  now = Date.now(),
  onDelivered?: (tap: PendingNotificationTap) => void,
): boolean {
  const current = pending;
  if (!current) return false;
  if (now - current.receivedAt <= NOTIFICATION_TAP_HOLD_MS) {
    navigate(current.href);
    try { onDelivered?.(current); } catch {
      // Measurement must never interrupt navigation.
    }
  }
  // A synchronous navigation subscriber may enqueue a newer intent; never discard it.
  if (pending?.key === current.key) pending = null;
  acknowledge(current.key);
  notify();
  return true;
}

/** Test compatibility seam; production uses deliverPendingNotificationTap to acknowledge after navigation. */
export function takePendingNotificationTap(now: number = Date.now()): Href | null {
  let href: Href | null = null;
  deliverPendingNotificationTap((destination) => { href = destination; }, now);
  return href;
}

export function subscribePendingNotificationTap(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Test and sign-out seam. */
export function resetNotificationTapState() {
  if (pending) acknowledge(pending.key);
  pending = null;
  handledKeys = [];
  acknowledgements.clear();
  notify();
}

/**
 * True once navigating is safe and will stick: the startup surface is gone, the person is signed in with a resolved
 * profile, and the screen showing is not the sign-in/onboarding flow (a tap must not cut across those).
 */
export function canDeliverNotificationTap(state: {
  appInteractive: boolean;
  identityKind: 'loading' | 'unauthenticated' | 'guest' | 'authenticated';
  profileResolutionFailed: boolean;
  profileValidationPending?: boolean;
  rootSegment: string | undefined;
}): boolean {
  if (!state.appInteractive || state.identityKind !== 'authenticated' || state.profileResolutionFailed || state.profileValidationPending) return false;
  const root = state.rootSegment;
  return root !== undefined && root !== '(auth)' && root !== 'auth' && root !== 'sanctuary-preparing';
}

// ── Reading taps from expo-notifications ────────────────────────────────────

export type TapResponse = {
  actionIdentifier: string;
  notification: {
    date: number;
    request: { identifier: string; content: { data?: TapData | null } };
  };
};

export type ResponseSource = {
  getLastNotificationResponse(): TapResponse | null;
  clearLastNotificationResponse(): void;
  addNotificationResponseReceivedListener(listener: (response: TapResponse) => void): { remove(): void };
};

function responseKey(response: TapResponse): string {
  return `${response.notification.request.identifier}:${response.notification.date}`;
}

/** Listen first, then inspect the launch response; both paths share deduplication and acknowledgement. */
export function observeNotificationResponses(source: ResponseSource): () => void {
  const accept = (response: TapResponse | null | undefined, launchState: NotificationTapLaunchState) => {
    if (!response || response.actionIdentifier !== DEFAULT_TAP_ACTION) return;
    const key = responseKey(response);
    const clearMatchingResponse = () => {
      try {
        const latest = source.getLastNotificationResponse();
        if (latest && responseKey(latest) === key) source.clearLastNotificationResponse();
      } catch {
        // Native cleanup failure must not crash navigation; in-session deduplication still applies.
      }
    };
    if (handledKeys.includes(key)) {
      if (pending?.key !== key) clearMatchingResponse();
      return;
    }
    if (pending) {
      // Latest user intent wins. Do not clear a newer native response while superseding the previous one.
      acknowledge(pending.key);
    }
    acknowledgements.set(key, clearMatchingResponse);
    enqueueNotificationTap(key, response.notification.request.content.data, Date.now(), launchState);
  };
  // A tap delivered to the listener happened while the app was running; the one read from getLastNotificationResponse
  // below is the tap that launched it (expo-notifications never replays that one to a listener registered later).
  const subscription = source.addNotificationResponseReceivedListener((response) => accept(response, 'running'));
  try { accept(source.getLastNotificationResponse(), 'cold_start'); } catch {
    // A platform read failure must not stop live taps from working.
  }
  return () => subscription.remove();
}
