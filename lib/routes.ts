import type { Href } from 'expo-router';
import { getSeriesChildContent, getSeriesGroupContent } from './observance-series-content';

// One query value from a web-shaped path ("/home?focus=shloka" -> "shloka"). Matches by hand so it does not depend on
// the URLSearchParams implementation.
function queryParam(path: string, name: string): string | null {
  const search = path.split('#')[0].split('?')[1];
  if (!search) return null;
  for (const pair of search.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key === name) {
      try { return decodeURIComponent(value); } catch { return value; }
    }
  }
  return null;
}

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
// Paths with no native screen at all (the sadhana journal, for one) fall
// back to the caller-supplied default rather than a broken deep link —
// callers pass '/notifications' when resolving a push tap (landing in the
// inbox is a safe, honest fallback) and '/(tabs)/pathshala' when resolving
// a Home tap target (matching the original mapHrefToRoute's own default).
export function resolveNativeRoute(path: string, fallback: Href = '/(tabs)/pathshala'): Href {
  path = path.split('#')[0];
  const [pathname] = path.split('?');

  if (pathname === '/home' || pathname === '/' || pathname === '') {
    // The daily-shloka reminder links to /home?focus=shloka. Home has never read `focus`, so that opened Home and
    // nothing else; the shloka has its own screen.
    if (queryParam(path, 'focus') === 'shloka') return '/shloka' as Href;
    if (queryParam(path, 'focus') === 'weekly-summary') return '/my-progress' as Href;
    return '/(tabs)';
  }
  // Japa (mala counter) and Bhakti (hub) are now two distinct native
  // screens — app/(tabs)/japa.tsx and app/(tabs)/bhakti.tsx respectively —
  // matching PWA's own split (BottomNav.tsx: /bhakti/mala is Japa's own
  // tab, /bhakti is the broader hub, Japa and Bhakti are not the same
  // route there either). Previously both collapsed onto the single
  // '/(tabs)/bhakti' screen, back when that file was actually the Japa
  // counter under a mislabeled name.
  // Insights is its own native screen (app/japa-insights.tsx), ported from
  // PWA's /japa/insights (which itself redirects to /bhakti/mala/insights)
  if (pathname.startsWith('/japa/insights') || pathname.startsWith('/bhakti/mala/insights')) return '/japa-insights' as Href;
  if (pathname.startsWith('/bhakti/mala') || pathname.startsWith('/japa')) return '/japa';
  // Bhakti sub-screens with their own native route at the same path (stotram/
  // katha readers, katha hub, browse, zen, insights) — must be checked before
  // the blanket '/bhakti' fallback below, or a link to any of them lands on
  // the hub tab instead of the actual reader/tool.
  if (
    pathname.startsWith('/bhakti/stotram/') ||
    pathname.startsWith('/bhakti/katha') ||
    pathname.startsWith('/bhakti/browse') ||
    pathname.startsWith('/bhakti/zen') ||
    pathname.startsWith('/bhakti/insights')
  ) return path as Href;
  if (pathname.startsWith('/bhakti')) return '/(tabs)/bhakti';
  if (pathname.startsWith('/pathshala/')) return path as Href;
  if (pathname.startsWith('/pathshala')) return '/(tabs)/pathshala';
  if (pathname.startsWith('/lineage/')) return path as Href;
  if (pathname.startsWith('/lineage')) return '/(tabs)/pathshala';
  if (pathname.startsWith('/yatra/')) return path as Href;
  if (pathname.startsWith('/yatra')) return '/(tabs)/tirtha';
  // The tab is app/(tabs)/tirtha; /yatra is the name the web gave it, and the app's own name has to open it too.
  if (pathname.startsWith('/tirtha')) return '/(tabs)/tirtha';
  if (pathname === '/panchang') return path as Href;
  const datedPanchang = /^\/panchang\/([^/]+)$/.exec(pathname);
  if (datedPanchang) return `/panchang?date=${encodeURIComponent(datedPanchang[1])}` as Href;
  if (pathname.startsWith('/rashiphala') || pathname.startsWith('/rashiphal')) return '/rashiphala' as Href;
  if (pathname.startsWith('/vrat/')) {
    const slug = pathname.slice('/vrat/'.length);
    if (getSeriesChildContent(slug) || getSeriesGroupContent(slug)) {
      const search = path.includes('?') ? `?${path.split('?')[1]}` : '';
      return `/festival/${slug}${search}` as Href;
    }
    return path as Href;
  }
  if (pathname.startsWith('/vrat')) return '/vrat';
  if (pathname.startsWith('/festival/')) return path as Href;
  // The backend's candidate producers (sankranti, series, pradosha) and observance notification source write festival
  // links as /festivals/<slug> in the plural; the screen is /festival/<slug>. Without this a tap on one of those
  // notifications fell through to the fallback and opened Home. A bare /festivals has no slug and keeps the fallback.
  if (pathname.startsWith('/festivals/') && pathname.length > '/festivals/'.length) {
    const search = path.includes('?') ? `?${path.split('?')[1]}` : '';
    return `/festival/${pathname.slice('/festivals/'.length)}${search}` as Href;
  }
  if (pathname.startsWith('/quiz')) return '/quiz';
  if (pathname.startsWith('/kundali/')) return path as Href;
  if (pathname.startsWith('/kundali')) return '/kundali';
  // A specific hero (Home's dharmVeer.href, or a shared/deep link) — routes
  // to the dynamic detail screen at app/dharm-veer/[id].tsx, which fetches
  // the same canonical roster the id was drawn from and renders that exact
  // hero (never a substitute). Bare `/dharm-veer` (no id segment) still
  // means the daily swipe deck at app/dharm-veer.tsx, unchanged.
  if (pathname.startsWith('/dharm-veer/')) return path as Href;
  if (pathname.startsWith('/dharm-veer')) return '/dharm-veer';
  // The guided-plan reminder links to /nitya-karma/plans; the plans list is its own screen (app/nitya-plans.tsx).
  if (pathname === '/nitya-karma/plans' || pathname.startsWith('/nitya-karma/plans/')) return '/nitya-plans' as Href;
  if (pathname.startsWith('/nitya-karma')) return '/nitya-karma';
  if (pathname.startsWith('/nitya-ashrama')) return '/nitya-ashrama' as Href;
  if (pathname.startsWith('/nitya-dincharya')) return '/nitya-dincharya' as Href;
  if (pathname.startsWith('/nitya-plans')) return '/nitya-plans' as Href;
  if (pathname.startsWith('/sankalpa')) return '/sankalpa';
  if (pathname === '/mandali') return path as Href;
  // Annual KUL family-remembrance notifications target this exact route with
  // `?section=family`; preserve its query so the hub opens the family dates
  // section instead of falling back to the notification inbox.
  if (pathname === '/kul') return path as Href;
  // The family-invitation screen exists (app/kul/join.tsx). /kul/sanskara has no screen of its own; the sanskara
  // reminders belong to the Kul hub, so it lands there rather than in the inbox.
  if (pathname === '/kul/join' || pathname.startsWith('/kul/join/')) return path as Href;
  if (pathname === '/kul/sanskara') return '/kul' as Href;
  if (pathname.startsWith('/discover/mood') || pathname.startsWith('/mood')) return '/mood' as Href;
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
  // These native screens exist (app/shloka.tsx, app/my-progress/*, app/mantras.tsx,
  // app/name-story.tsx, app/festival-quiz/[definitionKey].tsx) but had no dispatch
  // line at all, so daily shloka cron reminders, my-progress links, and festival
  // quiz notifications silently fell through to the caller's fallback.
  if (pathname.startsWith('/shloka')) return '/shloka' as Href;
  // The milestone notification links to the bare /my-progress, which the trailing-slash test below missed (it opened
  // the inbox); the screen exists.
  if (pathname === '/my-progress' || pathname.startsWith('/my-progress/')) return path as Href;
  if (pathname.startsWith('/mantras')) return '/mantras' as Href;
  if (pathname.startsWith('/name-story')) return '/name-story' as Href;
  if (pathname.startsWith('/festival-quiz/')) return path as Href;
  // Vichaar Sabha (native) is deprecated/removed for now — deliberately no
  // longer dispatched here, so any deep link or push targeting it falls
  // through to the caller-supplied fallback instead of a dead route.
  // A specific seeker's profile (another user's, via a Mandali/social deep
  // link) — routes to the dynamic detail screen at app/profile/[id].tsx.
  // Bare `/profile` still means the viewer's own profile tab.
  if (pathname.startsWith('/profile/')) return path as Href;
  if (pathname.startsWith('/profile')) return '/(tabs)/profile';
  if (pathname.startsWith('/settings/')) return path as Href;
  if (pathname.startsWith('/settings')) return '/settings' as Href;
  if (pathname === '/notifications') return path as Href;

  return fallback;
}

// Given a full URL string (a push notification's launchURL, a notification
// row's action_url resolved against API_BASE, or a shoonaya:// deep link),
// extract just the pathname+search for resolveNativeRoute. Returns null if
// the string isn't a parseable URL/path at all.
export function pathFromUrlLike(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  value = value.trim();
  if (!value || /[\\\u0000-\u001f]/.test(value) || value.startsWith('//')) return null;
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      if (!['shoonaya.com', 'www.shoonaya.com'].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null;
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

    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
    return (value.startsWith('/') ? value : `/${value}`).split('#')[0];
  } catch {
    return null;
  }
}
