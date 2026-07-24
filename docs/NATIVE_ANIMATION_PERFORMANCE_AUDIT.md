# Native Animation and Performance Audit

Date: 2026-07-16

Scope: static audit only. Real frame drops, startup timing, memory pressure, and scroll jank still need a device/AVD profiling pass with Android Studio profiler, Hermes sampling, or equivalent. This pass identifies code-level risks that can be fixed before runtime profiling.

## Summary

The app should not add more animation broadly yet. The highest leverage path is:

1. Fix the shared pressable/button primitive pattern first.
2. Reduce continuous decorative motion on high-traffic screens.
3. Virtualize screens that render feed/list data with `ScrollView` + `.map()`.
4. Avoid full data reloads from realtime events where one row update would do.
5. Pilot richer motion on one screen at a time, using transform/opacity only.

## P0: Shared Pressable Chrome Risk

Files:

- `components/ui/PressableSurface.tsx`
- `components/ui/Button.tsx`

Status: fixed in the shared primitives after this audit. Caller styles now stay on a stable outer surface while press feedback is handled separately, so borders/shadows are no longer transformed on the same node as the press animation.

Finding: both components combine structural chrome (`borderColor`, `boxShadow`, `backgroundColor`) and pressed feedback (`opacity`, `transform`) inside a `Pressable` style callback. This is the same pattern that already caused visible border/shadow loss on specific cards. Continuing to work around it per screen will spread inconsistent code.

Best fix:

- Put card/button chrome on a stable outer `View`.
- Keep `Pressable` responsible only for touch feedback and event handling.
- Preserve haptics, reduced-motion behavior, disabled state, accessibility role, and `MIN_TOUCH_TARGET`.
- Then remove per-screen nested workarounds where they only exist to avoid this bug.

Why first: this improves visual reliability and perceived polish everywhere without changing screen-specific layout.

## P1: Japa Has Too Many Continuous Decorative Loops

File: `app/(tabs)/japa.tsx`

Evidence:

- Multiple `Animated.loop` background effects run for particles, glow blobs, dawn sweep, river bands, and mala pulse.
- These are mostly transform/opacity with `useNativeDriver: true`, which is good.
- The risk is quantity and lifetime, not the animation property choice.

Recommended fix:

- Keep only one ambient scene animation active per selected background.
- Pause ambient loops when the active screen is not focused.
- Respect reduced motion by rendering static scene layers.
- Prefer event-driven motion for taps/completion over always-running decoration.
- Virtualize recent sessions if the history can grow beyond a short list.

Pilot priority: high, because Japa is a core repeated-use screen and currently carries the most live motion.

## P1: Mandali Realtime Reloads Too Much

File: `app/(tabs)/mandali.tsx`

Evidence:

- Realtime subscriptions on posts, post_upvotes, post_comments, event_rsvps, and profiles all call `loadMandali()`.
- `loadMandali()` refetches profile context, safety state, posts, members, comments, RSVPs, blended posts, and upvote rows.
- The feed is rendered with `ScrollView` + `filteredPosts.map(renderPost)`.

Recommended fix:

- Debounce realtime reloads to avoid bursts.
- Use targeted state updates for common events where practical: comment insert, RSVP update, upvote insert/delete.
- Move feed rendering to `FlatList` when post count is not trivially capped.
- Keep initial API/RLS behavior unchanged.

Why: this is the largest network + render churn risk in a community screen.

## P1: Pathshala Hub Should Virtualize Path Lists

File: `app/(tabs)/pathshala.tsx`

Evidence:

- Uses `ScrollView` and several `.map()` blocks for enrolled paths, filtered paths, explore cards, and recommendations.
- `useFocusEffect` reloads path data on every focus.
- Data is currently bounded by product content, but it is exactly the kind of screen expected to grow.

Recommended fix:

- Keep the composed header/hero as `ListHeaderComponent`.
- Render the selected tab's path cards with `FlatList`.
- Keep small fixed sections as normal mapped rows.
- Add a freshness guard so focus reload does not refetch when data is already fresh unless user pulls to refresh.

## P1: Profile Screen Is Too Large for One Scroll Render

File: `app/(tabs)/profile.tsx`

Evidence:

- Large single `ScrollView` renders header, avatar, stats, relic rail, profile strength, progress hub, share/report/invite sections, and edit modal structures.
- Relics are horizontal mapped items. Edit sheet renders several option grids.

Recommended fix:

- Split heavy sections into memoized components.
- Keep avatar/header and primary stats above the fold.
- Lazy mount lower sections after first paint where possible.
- Avoid building share/offscreen content unless the user opens share.

## P2: Home Has Controlled Motion, But Auto-Cycling Still Costs

File: `app/(tabs)/index.tsx`

Evidence:

- Hero pills auto-cycle every 3.5 seconds using opacity with native driver.
- Reduced motion correctly disables auto-cycling.
- Home refetches summary on focus and separately refreshes unread/mood state.

Recommended fix:

- Keep the carousel only if product needs it; otherwise prefer manual cycling.
- If kept, pause timer when app/screen is not active.
- Consider combining home summary + mood/unread freshness into one lightweight focus refresh when backend contract allows.

## P2: Skeleton Loader Starts One Loop Per Block

File: `components/ui/SkeletonLoader.tsx`

Evidence:

- `useShimmer()` creates a separate `Animated.Value` and `Animated.loop` per skeleton block.

Recommended fix:

- Use one parent shimmer value per skeleton group and pass interpolated opacity down.
- Respect reduced motion by rendering static skeletons.

## P2: Long Static Content Screens Need Threshold Rules

Files:

- `app/bhakti/browse.tsx`
- `app/bhakti/katha.tsx`
- `app/bhakti/stotram/[id].tsx`
- `app/live-darshan.tsx`
- `app/(tabs)/tirtha.tsx`
- `app/notifications.tsx`
- `app/vichaar-sabha.tsx` (removed/deferred)

Finding: these screens use `ScrollView` + `.map()` over route/API data. Some are bounded and acceptable today. They need a rule: when a section can exceed roughly 20-30 cards/rows, switch to `FlatList` or cap with a "View all" route.

Recommended priority:

1. Notifications: already caps but should use `FlatList` for inbox feel.
2. Tirtha: temple map/list/passport can grow; virtualize list sections.
3. Vichaar Sabha (removed/deferred)
4. Bhakti browse/katha: if API returns large scripture/story sets, virtualize.

## Animation Policy

Use classic React Native `Animated` for now. Do not introduce Reanimated unless a specific interaction requires it.

Allowed by default:

- opacity
- transform: translate, scale, rotate
- 150-300ms micro-interactions
- one entrance animation per screen
- one subtle icon pulse where it communicates state
- press feedback via shared primitive

Avoid by default:

- animating width, height, top, left, padding, margin
- multiple decorative loops on one screen
- autoplay motion without reduced-motion handling
- adding new native animation dependencies during visual cleanup

## Recommended Execution Order

1. Fix `PressableSurface` and `Button` chrome architecture.
2. Pilot screen: Sankalpa or Japa, not both.
3. Japa: reduce/pause ambient loops, keep tap/completion ceremony.
4. Mandali: debounce realtime reloads and consider feed `FlatList`.
5. Pathshala: `FlatList` for paths tab.
6. Profile: split and memoize heavy sections.
7. Skeleton loader: one shimmer loop per group.

## Verification For Each Follow-Up

Every implementation slice should report:

- exact files touched
- whether any new dependency was added
- typecheck result
- animation properties used
- reduced-motion behavior
- list virtualization status
- before/after count of `Animated.loop`, `setInterval`, direct `.map()` rows, or API calls, depending on the slice
