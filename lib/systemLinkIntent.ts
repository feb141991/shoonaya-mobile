import type { Href } from 'expo-router';

import { enqueueNotificationTap } from './notificationTap';
import { pathFromUrlLike, resolveNativeRoute } from './routes';
import { mapSystemPath } from './systemLinkRoute';

let intentSequence = 0;
const HANDLED_ELSEWHERE = /^\/(?:auth|\(auth\)|expo-development-client|--)(?:[/?#]|$)/;

/**
 * Product links use the same held-intent queue as push taps so login/onboarding cannot erase their destination.
 * Initial links enter through the root startup gate. Warm links return an empty href: the installed Expo Router
 * subscription skips its own navigation for a falsy href, leaving the root's authenticated dispatcher as sole owner.
 * Returning the current screen instead would race that dispatcher and could overwrite the destination it just opened.
 */
export function holdSystemLinkIntent({ path, initial }: { path: string; initial: boolean }): string {
  const incomingPath = pathFromUrlLike(path);
  if (!incomingPath || incomingPath === '/' || HANDLED_ELSEWHERE.test(incomingPath)) return path;

  const mapped = mapSystemPath(path);
  const mappedPath = pathFromUrlLike(mapped);
  const unresolved = '/__unresolved_system_intent__' as Href;
  if (!mappedPath || resolveNativeRoute(mappedPath, unresolved) === unresolved) return mapped;

  // A new OS event is a fresh intent even when someone deliberately opens the same URL a second time.
  enqueueNotificationTap(`system-link:${Date.now()}:${++intentSequence}`, { url: mappedPath });
  return initial ? '/' : '';
}
