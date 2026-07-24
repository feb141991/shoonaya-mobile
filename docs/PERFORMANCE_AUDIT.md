# Native app performance + health audit

Date: 2026-07-17
Scope: source-level audit of `shoonaya-mobile` (Expo SDK 56, React Native, expo-router).

This is a real audit against the current codebase — every finding below was verified by reading the actual files, not generic advice. Two automated checks (`expo-doctor`, `depcheck`) could not be run reliably from this environment (see "Tooling I couldn't verify" at the bottom) — run those yourself locally for the most trustworthy dead-dependency signal.

## Phase 4 checkpoint — high-risk feeds measured after fixes

Date: 2026-07-17

The two highest-risk growing feeds from this audit have now been addressed and smoke-checked:

- `app/notifications.tsx`: now uses `FlatList`, a memoized `NotificationListRow`, and stable row handlers.
- `app/(tabs)/mandali.tsx`: now uses `FlatList` for the vertical feed, pre-indexes comments/RSVPs by `post_id`, uses an O(1) upvote lookup set, and stabilizes FlatList render/key/header/footer callbacks.

Validation run after the two fixes:

- `npm run typecheck` passed.
- `npx expo-doctor` ran successfully but reports SDK patch-version drift only (`expo` 56.0.15 vs expected 56.0.16, plus related Expo package patch mismatches). This is not caused by the feed changes.
- AVD smoke opened `shoonaya://notifications`; process stayed alive and logcat showed no fatal Android, React Native, `VirtualizedLists`, or `FlatList` error signatures.
- AVD smoke opened `shoonaya://mandali`; process stayed alive and logcat showed no fatal Android, React Native, `VirtualizedLists`, or `FlatList` error signatures.

Source-level status after Phase 4:

- The original "unbounded + unvirtualized" risk is closed for Notifications and Mandali.
- Notifications still has small intentional array work for unread counts and optimistic read-state updates.
- Mandali still has bounded `.map()` usage for normalization, filter chips, compose chips, and the member list inside the members card. The main post/blended-post feed is no longer mounted all at once.
- Real frame-time proof still requires an instrumented production/dev-client profile on device. These checks prove route health and code-shape improvement, not exact FPS.

## Priority 1 — likely the actual cause of "pages loading slowly"

### 1. Long/growing lists are not virtualized
17 screens render lists with `ScrollView` + `.map()`, which mounts every row at once with no windowing. Only 4 files use `FlatList` (`kosh.tsx`, `my-progress/ledger.tsx`, `pathshala/[pathId].tsx`, `ai-chat.tsx`), and **none use `FlashList`** (Shopify's faster, better-recycling list — not currently a dependency at all).

The screens most at risk are the ones whose list length is genuinely unbounded and grows with usage, not fixed at ~5 rows:

- `app/(tabs)/mandali.tsx` — 13 separate `.map()` calls, zero `FlatList`. This is the community feed (posts, comments, events) — the single screen most likely to visibly slow down as content accumulates.
- `app/notifications.tsx` — notification inbox, unbounded by design, unvirtualized.
- `app/bhakti/katha.tsx`, `app/bhakti/browse.tsx` — content browse lists.
- `app/panchang.tsx`, `app/mantras.tsx`, `app/rashiphala.tsx`, `app/(tabs)/tirtha.tsx`, `app/(tabs)/profile.tsx`, `app/vrat.tsx`, `app/my-progress.tsx` and its `shields.tsx`/`mood.tsx` subpages, `app/(tabs)/japa.tsx`, `app/live-darshan.tsx`, `app/mood.tsx`, `app/bhakti/zen.tsx`, `app/bhakti/insights.tsx` — lower risk if their lists stay short (a handful of festivals, timing rows, etc.), but worth a pass if any of these grow.

**Fix**: swap `ScrollView`+`.map()` for `FlatList` (already in React Native, zero new deps) on `mandali.tsx` and `notifications.tsx` first — those are the two with genuinely unbounded, frequently-updated content. `@shopify/flash-list` is a drop-in upgrade from `FlatList` worth adding once the `FlatList` migration is done everywhere it matters.

### 2. Zero use of `React.memo` anywhere in the app
Not one component in the entire codebase (`grep -r "React.memo\|memo(" — 0 matches`) is memoized. Combined with #1, this means every row inside those mapped lists re-renders on every parent state change — typing in a search box, a timer tick, an animation frame, an unrelated toggle — even though the row's own props didn't change.

**Fix**: wrap the row/card components used inside `mandali.tsx`, `notifications.tsx`, and any `FlatList`'s `renderItem` in `React.memo`. This is cheap and high-leverage — it's the difference between "the whole feed re-paints" and "only the row that changed re-paints."

## Priority 2 — cold start (app launch to first interaction)

`app/_layout.tsx` has a few things worth knowing about, not necessarily bugs:

- There's an explicit **6-second emergency failsafe** (`setTimeout(() => setAppIsReady(true), 6000)`) that force-shows the app if the normal ready sequence hasn't resolved. A failsafe existing isn't itself a problem, but its presence tells you the boot sequence was, at some point, slow enough to need one — worth checking with EAS Observe (now wired in) whether real users are actually hitting anywhere near that 6s window.
- The ready sequence is sequential, not parallel: `Linking.getInitialURL()` → `supabase.auth.getSession()` → `routeForSession()` (which does its own `profiles` table fetch) → only then is `authReady` set. Font loading (`useFonts`) gates on top of that too. None of this is wrong, but every step in that chain adds to time-to-first-paint, and it's worth profiling with Observe's TTR/TTI metrics once you have Private Preview access, rather than guessing.
- Home (`app/(tabs)/index.tsx`) itself is clean here — it makes exactly **one** network call (`/api/native/home-summary`), no direct Supabase queries in the component. That consolidation was already done correctly; it's not a contributor.

## Priority 3 — already fine, no action needed

- **Images**: every screen in the app imports `Image` from `expo-image`, not React Native's core `Image` — zero exceptions found. `expo-image` has disk+memory caching built in; this is the right choice already and needs no change.
- **Bundled asset size**: `assets/` is 2.5MB total, not a bloat problem. `icon.png` and `splash-icon.png` are ~956KB each — larger than they need to be for one-time app-icon/splash assets (1024×1024 PNGs can usually compress to well under 200KB with no visible quality loss), but these load once at the native level, not per-screen, so this is low-priority cosmetic cleanup, not a "pages load slowly" cause.
- **New Architecture + Hermes**: `app.json` already has `newArchEnabled: true` for Android via `expo-build-properties`, and Hermes is Expo's SDK 56 default — both already correctly configured.
- **`console.log`/`console.warn`**: only 15 occurrences across 10 files app-wide — not meaningfully bloating anything, low priority to clean up.

## Dead code / "is everything actually used" checklist

What I could verify from source alone:
- No stray `console.log` sprawl (see above).
- No raw `react-native` `Image` imports left over from before the `expo-image` migration.
- Home's data-fetch path has no leftover direct-Supabase calls bypassing the canonical API.

What still needs tooling I couldn't run reliably here (see below) — run these yourself:
- **Unused npm dependencies**: `npx depcheck` from the repo root.
- **Unused TypeScript exports** (dead components/functions never imported anywhere): `npx ts-prune`.
- **Expo config/native-module health check**: `npx expo-doctor` now runs here, but still reports SDK patch-version drift. Run it locally again after any dependency alignment.

### Tooling I couldn't verify from this sandbox
Earlier in this audit, `npx expo-doctor` failed from a stale shell/node_modules artifact. On the Phase 4 rerun it executed normally and passed 20/21 checks, failing only SDK patch-version alignment. `depcheck` and `ts-prune` were still not run as part of the feed measurement pass. Run them locally (`rm -rf node_modules && npm ci` first if you want a guaranteed-clean baseline) for a trustworthy dead-code/dependency read.

## Suggested order of work

1. Completed: `mandali.tsx` and `notifications.tsx`: `ScrollView`+`.map()` → `FlatList`, plus row/render stability work.
2. Once EAS Observe access comes through, use the per-route TTR/TTI data to confirm which screens are *actually* slow in production rather than guessing further from source alone — that data will tell you definitively whether the cold-start chain in `_layout.tsx` is worth optimizing.
3. Run `npx depcheck` + `npx ts-prune` locally and clean up whatever they surface. Also align Expo SDK patch versions with `npx expo install --check` when you want to close the current `expo-doctor` warning.
4. Broader `FlatList` → `FlashList` migration only if real route metrics or large-list behavior justify adding the dependency.
