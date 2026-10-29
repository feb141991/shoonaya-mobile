import { pathFromUrlLike, resolveNativeRoute } from '@/lib/routes';

/**
 * Links the operating system hands to the app (https://www.shoonaya.com/... universal/app links and shoonaya://...)
 * are matched by Expo Router against the files in app/, not by lib/routes.ts. The website and the backend write some
 * paths under other names (/festivals/<slug>, /home, /discover/mood), which have no file and showed Expo's
 * "unmatched route" screen. app/+native-intent.tsx calls this to rename those, and only those.
 *
 * Deliberately narrower than resolveNativeRoute. A tapped notification may fall back to a section hub when its exact
 * target has no screen; a link someone follows must not: /panchang/2026-10-29 opened as today's Panchang would show
 * the wrong date as if it were the right one (AGENTS.md section 2). Any path not renamed here is returned exactly as
 * received, so Expo Router handles it as it always did.
 */

/** Links Expo Router must receive untouched: the sign-in return and the development client's own launch links. */
const PASS_THROUGH = /^\/(?:auth|\(auth\)|expo-development-client|--)(?:[/?#]|$)/;

const RENAMES: Array<[RegExp, (match: RegExpExecArray) => string]> = [
  [/^\/home$/, () => '/'],
  [/^\/festivals\/([^/]+)$/, (m) => `/festival/${m[1]}`],
  [/^\/discover\/mood$/, () => '/mood'],
  [/^\/rashiphal$/, () => '/rashiphala'],
];

export function mapSystemPath(incoming: string): string {
  const path = pathFromUrlLike(incoming);
  if (!path || path === '/' || PASS_THROUGH.test(path)) return incoming;

  const [pathname, ...rest] = path.split('?');
  const search = rest.length ? `?${rest.join('?')}` : '';

  for (const [pattern, rename] of RENAMES) {
    const match = pattern.exec(pathname);
    if (match) return `${rename(match)}${search}`;
  }

  // A series member (a navaratri day, a pradosha) is listed under /vrat/<slug> on the web but shown by the festival
  // screen; the route table already knows which slugs those are.
  if (pathname.startsWith('/vrat/')) {
    const resolved = resolveNativeRoute(path, '/vrat');
    if (typeof resolved === 'string' && resolved.startsWith('/festival/')) return resolved;
  }

  return incoming;
}
