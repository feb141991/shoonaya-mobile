import type { Href } from 'expo-router';
import { pathFromUrlLike, resolveNativeRoute } from '@/lib/routes';

// OAuth callbacks (including their fragment) and Expo development links belong to their own handlers.
const PASS_THROUGH = /^\/(?:auth|\(auth\)|expo-development-client|--)(?:[/?#]|$)/;

/** System links and notification taps share aliases and retain the same date/item context. */
export function mapSystemPath(incoming: string): string {
  const path = pathFromUrlLike(incoming);
  if (!path || PASS_THROUGH.test(path)) return incoming;
  const unresolved = '/__unresolved_link__' as Href;
  const mapped = resolveNativeRoute(path, unresolved);
  if (mapped === unresolved || typeof mapped !== 'string') return incoming;
  const publicPath = mapped.replace(/\/\(tabs\)(?=\/|$)/, '') || '/';
  // Keep already-native links intact, including their original scheme.
  return publicPath === path ? incoming : publicPath;
}
