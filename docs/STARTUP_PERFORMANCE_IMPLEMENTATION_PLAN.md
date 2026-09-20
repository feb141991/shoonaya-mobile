# Startup Performance Implementation Plan

## Objective

Render safe cached content as soon as the owning app identity is known, keep one
network owner per surface, and preserve correct behavior across sign-out,
account changes, spiritual-date rollover, app resume, and failed refreshes.

## Phase 0 — Measurement and contract gate

Phase 0 is required before Phase 1 is declared complete. Collect release-build
measurements on a real iPhone for authenticated and guest sessions across:

- cold process with empty, fresh, stale, and corrupt caches;
- warm resume and tab return;
- offline and constrained-network launches; and
- account switch, sign-out, and spiritual-date rollover.

Record identity-resolution time, cache-read duration, first useful Home paint,
network request count, cache hit/miss, and refresh failure. Report p50 and p95
for the previous release and the Phase 1 build using the same device and data.

Acceptance requires:

- no cross-account frame;
- no stale Calendar data classified as fresh;
- at most one Home disk read and one Home request for a startup identity;
- cached content remains visible when background refresh fails; and
- a measured improvement in first useful paint without a regression in p95.

## Shared cache and identity contract

- Root is the sole owner of Supabase session restoration and publishes an
  explicit guest, authenticated, unauthenticated, or loading identity.
- Every cache entry is keyed by the exact app identity and carries its schema,
  saved timestamp, Calendar timestamp, timezone, and spiritual date.
- A synchronous memory snapshot retains the complete validated cache envelope.
  Spiritual-date freshness is recalculated whenever the snapshot is consumed.
- Clearing a cache invalidates reads already in flight. An older completion may
  neither restore memory nor unregister a newer read.
- Sign-out/account-switch clearing is a barrier: reads started after it begins
  wait until persisted keys have been removed.
- A spiritual-date mismatch forces a full Calendar request even when the prior
  Calendar timestamp is inside the ordinary 12-hour freshness window.
- Network revalidation remains owned by each surface coordinator. Root cache
  prewarming performs no network request.

## Phase 1 — Home

- Prewarm the identity-scoped Home cache while startup work continues.
- Hydrate Home synchronously when an exact in-process snapshot exists.
- Deduplicate concurrent disk reads.
- Preserve real cache freshness metadata in the coordinator.
- Retain bounded Panchang retry timing and stale-generation guards.

Phase 1 implementation is covered by the Home prewarming and SWR suites. It is
ready for device validation after Phase 0 evidence is collected.

## Phase 2 — Japa and Mandali

- Reuse the existing Japa and Mandali identity-scoped caches.
- Consume the root-owned app identity instead of repeating `getSession()` or
  `getUser()` during initial rendering.
- Preserve Mandali realtime generation guards and Japa completion
  reconciliation outside the first-paint path.
- Measure before and after using the Phase 0 matrix.

## Phase 3 — Profile

- Cache only render-safe profile and progress-summary fields.
- Never treat cached subscription, permission, or security state as
  authoritative.
- Invalidate or update the cache after profile/avatar mutations, sign-out, and
  account switch.
- Preserve cached content on background refresh failure and expose freshness
  where it affects user decisions.

## Cross-tab follow-up

Measure Bhakti, Pathshala, and the remaining top-level destinations using the
same instrumentation before creating additional caches. A new cache is added
only when measurements identify storage or network blocking as the cause.
