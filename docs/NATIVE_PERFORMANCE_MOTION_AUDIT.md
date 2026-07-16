# Native Performance And Motion Audit

Date: 2026-07-16

## Scope

This document tracks native-wide performance and motion polish without turning it into decorative animation work.

Rules for every screen pass:

- Reduce duplicate code where a shared primitive already exists.
- Avoid new dependencies unless there is a specific native capability gap.
- Avoid layout shift: animate only `opacity` and `transform`.
- Keep touch targets at least 44dp.
- Remove or reduce expensive render patterns when they are visible in the touched screen.
- Run `npm run typecheck`.
- Confirm only intended files changed.

## Shared First Pass

Implemented:

- `components/ui/Motion.tsx`
  - `useReducedMotion()`
  - `MotionView`
  - `RouteTransition`
- Root route transition in `app/_layout.tsx`.
- Reduced-motion-safe skeleton shimmer in `components/ui/SkeletonLoader.tsx`.
- Bounded staggered card entry in:
  - `components/pathshala/PathCard.tsx`
  - `app/(tabs)/bhakti.tsx`
  - `app/live-darshan.tsx`

Why this is safe:

- No new dependency.
- No domain logic change.
- No route or API contract change.
- Motion uses native-driver-supported `opacity` and `translateY`.
- Reduced motion disables route/card entrance and skeleton shimmer.
- Stagger is capped to the first six items, so long lists do not accumulate delayed animation work.

## Hotspot Audit

### Render / List Hotspots

- `app/(tabs)/japa.tsx`
  - Heavy animation screen: multiple scene loops and particle renderers.
  - Already uses native-driver transform/opacity and has received prior cleanup.
  - Remaining work should be scene-specific only; do not add global decorative animation here.
- `app/(tabs)/pathshala.tsx`
  - Several bounded `.map()` sections for tabs, enrolled paths, paths, explore cards.
  - First pass adds shared bounded entry motion through `PathCard`.
- `app/(tabs)/bhakti.tsx`
  - Bounded 2-column grid.
  - First pass adds shared bounded entry motion.
- `app/live-darshan.tsx`
  - Image-heavy cards.
  - First pass adds shared bounded entry motion; no embedded player added.
- `app/my-progress.tsx`
  - Dense heatmap and chart-like map rendering.
  - Candidate for a later focused pass, not touched here.
- `app/(tabs)/mandali.tsx`
  - Realtime reload already debounced.
  - Candidate for FlatList evaluation if feed size grows; not touched here.
- `app/mood.tsx`
  - Existing shimmer loop and horizontal recommendation rails.
  - Candidate for a later focused visual/performance pass.

### API Hotspots

- Home, Pathshala, Progress, Nitya, Live Darshan already use API aggregation for major reads.
- Direct Supabase reads remain in several feature screens by previous product/security decisions; this pass did not alter data contracts.
- Avoid adding extra per-route API calls only for animation or visual polish.

### Image Hotspots

- `components/ui/SacredIcon.tsx` uses local `expo-image` assets, safe.
- `app/live-darshan.tsx` uses YouTube thumbnails, intentionally opens external YouTube rather than embedding video.
- `app/(tabs)/index.tsx` hero/avatar images are existing Home contract behavior and were not touched.
- `app/(tabs)/profile.tsx` avatar/relic images need separate profile-specific QA, not part of this pass.

## Route Checklist

Status legend:

- Done: shared first pass already improves this route.
- Watch: audited, no change made in this pass.
- Later: needs a focused screen-specific pass.

| Route | Status | Notes |
|---|---:|---|
| `/` Home | Watch | Root route transition applies. Home hero intentionally untouched. |
| `/bhakti` | Done | Bounded grid entry motion added. |
| `/pathshala` | Done | `PathCard` entry motion added. |
| `/live-darshan` | Done | Image card entry motion added. |
| `/japa` | Watch | Already heavy but uses native-driver motion; no extra animation added. |
| `/quiz` | Later | Candidate for answer-option feedback review only. |
| `/sankalpa` | Watch | Already has hero motion; no duplicate animation added. |
| `/mood` | Later | Candidate for recommendation rail and shimmer audit. |
| `/my-progress` | Later | Candidate for heatmap/chart rendering audit. |
| `/mandali` | Watch | Realtime reload is debounced; FlatList may be needed later. |
| `/tirtha` | Watch | Map/native module screen; do not animate map chrome blindly. |
| `/panchang` | Later | Date strip and festival rows need focused polish. |
| `/vrat` | Later | Vrat cards need focused polish after Panchang. |
| `/nitya-karma` | Watch | Existing time update interval is scoped to screen. |
| `/nitya-dincharya` | Later | Step list can adopt shared motion. |
| `/nitya-plans` | Later | Plan cards can adopt shared motion. |
| `/nitya-ashrama` | Later | Selection cards can adopt shared motion. |
| `/kosh` | Watch | Existing per-relic animation exists; avoid more until measured. |
| `/profile` | Later | Avatar/images and large sections need profile-specific pass. |
| `/settings` | Watch | Mostly form/settings; prioritize clarity over motion. |
| `/notifications` | Watch | Inbox updates should not animate every realtime refresh. |
| `/ai-chat` | Watch | Chat uses FlatList; avoid route-level message animation churn. |
| `/dharm-veer` | Watch | Gesture-driven card already has Reanimated motion. |
| `/dharm-veer/[id]` | Later | Detail sections can adopt shared entrance if visually abrupt. |
| `/shloka` | Watch | Already has verse entrance/icon pulse. |
| `/rashiphala` | Later | Jyotish content cards need focused pass. |
| `/kundali` | Later | Chart/profile cards need focused pass. |
| `/mantras` | Later | List cards can adopt shared motion. |
| `/bhakti/*` detail routes | Later | Katha/stotram/zen need route-specific review. |
| `/pathshala/*` detail routes | Later | Lesson reader should prioritize readability, not motion. |
| `/vichaar-sabha*` | Watch | Feed/detail should avoid animating realtime changes. |
| Auth routes | Watch | Root transition applies after render; do not animate auth logic. |

## Before / After Checklist For This Pass

- Did we reduce duplicate code? Yes. Shared route/reduced-motion/card-entry primitives replace repeated local entrance patterns for future screens.
- Did we avoid new dependency? Yes.
- Did we avoid layout shift? Yes. Only `opacity` and `translateY` are animated.
- Did we keep touch targets? Yes. No touch target geometry was reduced.
- Did we remove or reduce any expensive render pattern? Yes. Skeleton shimmer now stops under reduced-motion; list/card entry stagger is capped.
- Did typecheck pass? Yes, `npm run typecheck`.
- Did only intended files change? Yes: root layout, shared UI primitives, PathCard, Bhakti, Live Darshan, and this audit doc.
