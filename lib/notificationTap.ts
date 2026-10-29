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

export type PendingNotificationTap = { href: Href; key: string; receivedAt: number };

const HANDLED_KEYS_LIMIT = 30;
let pending: PendingNotificationTap | null = null;
let handledKeys: string[] = [];
const acknowledgements = new Map<string, () => void>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Holds a tap for delivery. The same response (same key) is accepted once per session. */
export function enqueueNotificationTap(key: string, data: TapData | null | undefined, now: number = Date.now()): boolean {
  if (handledKeys.includes(key)) return false;
  handledKeys = [...handledKeys, key].slice(-HANDLED_KEYS_LIMIT);
  pending = { href: routeForNotificationTap(data), key, receivedAt: now };
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

/** Navigate before consuming. A thrown router call leaves the intent available for retry. */
export function deliverPendingNotificationTap(navigate: (href: Href) => void, now = Date.now()): boolean {
  const current = pending;
  if (!current) return false;
  if (now - current.receivedAt <= NOTIFICATION_TAP_HOLD_MS) navigate(current.href);
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
  const accept = (response: TapResponse | null | undefined) => {
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
    enqueueNotificationTap(key, response.notification.request.content.data);
  };
  const subscription = source.addNotificationResponseReceivedListener(accept);
  try { accept(source.getLastNotificationResponse()); } catch {
    // A platform read failure must not stop live taps from working.
  }
  return () => subscription.remove();
}
