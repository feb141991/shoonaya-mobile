import type { Href } from 'expo-router';

// Maps a web-shaped path — from home-summary's practice/dharmVeer/panchang
// hrefs, or from a push notification's action_url / url data field —
// to the closest native route. This consolidates what used to be a
// Home-only local `mapHrefToRoute` (app/(tabs)/index.tsx) and extends it to
// cover the additional paths the web repo's notification writers use.
// Confirmed by direct read of the web repo: src/app/api/cron/
// {tithi,vrat,shloka,nitya,festival,mood,sattvic,japa,sanskar-milestone,
// guided-plan,brahma-muhurta,pitru-paksha,journal-anniversary}-reminder*/
// route.ts and src/app/api/notifications/{milestone,test}/route.ts.
//
// Paths with no native screen at all (mood/discover journaling, kul
// sanskara ceremonies, sadhana journal, guided-plan sub-list, "my-progress"
// web dashboard) fall back to the caller-supplied default rather than a
// broken deep link — callers pass '/notifications' when resolving a push
// tap (landing in the inbox is a safe, honest fallback) and
// '/(tabs)/pathshala' when resolving a Home tap target (matching the
// original mapHrefToRoute's own default).
export function resolveNativeRoute(path: string, fallback: Href = '/(tabs)/pathshala'): Href {
  const [pathname] = path.split('?');

  if (pathname === '/home' || pathname === '') return '/(tabs)';
  // Japa (mala counter) and Bhakti (hub) are now two distinct native
  // screens — app/(tabs)/japa.tsx and app/(tabs)/bhakti.tsx respectively —
  // matching PWA's own split (BottomNav.tsx: /bhakti/mala is Japa's own
  // tab, /bhakti is the broader hub, Japa and Bhakti are not the same
  // route there either). Previously both collapsed onto the single
  // '/(tabs)/bhakti' screen, back when that file was actually the Japa
  // counter under a mislabeled name.
  // Insights is its own native screen (app/japa-insights.tsx), ported from
  // PWA's /japa/insights (which itself redirects to /bhakti/mala/insights)
  // — must be checked before the general Japa/Bhakti-mala match below.
  if (pathname.startsWith('/japa/insights') || pathname.startsWith('/bhakti/mala/insights')) return '/japa-insights' as Href;
  if (pathname.startsWith('/bhakti/mala') || pathname.startsWith('/japa')) return '/japa';
  if (pathname.startsWith('/bhakti')) return '/(tabs)/bhakti';
  if (pathname.startsWith('/pathshala/')) return path as Href;
  if (pathname.startsWith('/pathshala')) return '/(tabs)/pathshala';
  if (pathname.startsWith('/panchang')) return '/panchang';
  if (pathname.startsWith('/vrat/')) return path as Href;
  if (pathname.startsWith('/vrat')) return '/vrat';
  if (pathname.startsWith('/quiz')) return '/quiz';
  // A specific hero (Home's dharmVeer.href, or a shared/deep link) — routes
  // to the dynamic detail screen at app/dharm-veer/[id].tsx, which fetches
  // the same canonical roster the id was drawn from and renders that exact
  // hero (never a substitute). Bare `/dharm-veer` (no id segment) still
  // means the daily swipe deck at app/dharm-veer.tsx, unchanged.
  if (pathname.startsWith('/dharm-veer/')) return path as Href;
  if (pathname.startsWith('/dharm-veer')) return '/dharm-veer';
  if (pathname.startsWith('/nitya-karma')) return '/nitya-karma';
  if (pathname.startsWith('/sankalpa')) return '/sankalpa';
  if (pathname.startsWith('/mandali')) return '/mandali';
  if (pathname.startsWith('/mood')) return '/mood' as Href;
  // Mood's recommendation stack (lib/mood/engine.ts on web) always includes
  // a fixed "Live Darshan" card with href '/live-darshan' — a real native
  // screen (app/live-darshan.tsx) that had no dispatch line here, so it was
  // silently swallowed by whatever fallback the caller passed (Home, in
  // app/mood.tsx's case) instead of opening Live Darshan. The engine's other
  // fixed-card href, '/mandali', is handled above; '/seva' now has its own
  // native screen (app/seva.tsx), a tradition-filtered seva hub ported from
  // the PWA's /seva page.
  if (pathname.startsWith('/live-darshan')) return '/live-darshan' as Href;
  if (pathname.startsWith('/seva')) return '/seva' as Href;
  // Vichaar Sabha (native) is deprecated/removed for now — deliberately no
  // longer dispatched here, so any deep link or push targeting it falls
  // through to the caller-supplied fallback instead of a dead route.
  if (pathname.startsWith('/profile')) return '/(tabs)/profile';
  if (pathname.startsWith('/notifications')) return '/notifications';

  return fallback;
}

// Given a full URL string (a push notification's launchURL, a notification
// row's action_url resolved against API_BASE, or a shoonaya:// deep link),
// extract just the pathname+search for resolveNativeRoute. Returns null if
// the string isn't a parseable URL/path at all.
export function pathFromUrlLike(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      return `${url.pathname}${url.search}`;
    }

    if (/^shoonaya:\/\//i.test(value)) {
      // Custom-scheme deep links (universal-link fallback, share sheets,
      // OS-level "open with Shoonaya"). The WHATWG URL parser treats
      // whatever sits between "://" and the next "/", "?", or end as the
      // *host*, not the path — for ANY scheme, not just http(s) — so both
      // slash counts a link author might reasonably produce need handling:
      //   shoonaya://notifications        -> host="notifications" pathname=""            -> /notifications
      //   shoonaya://dharm-veer/foo       -> host="dharm-veer"    pathname="/foo"         -> /dharm-veer/foo
      //   shoonaya:///dharm-veer/foo      -> host=""              pathname="/dharm-veer/foo" -> /dharm-veer/foo
      const url = new URL(value);
      const path = url.host ? `/${url.host}${url.pathname}` : url.pathname;
      return `${path || '/'}${url.search}`;
    }

    return value.startsWith('/') ? value : `/${value}`;
  } catch {
    return null;
  }
}
