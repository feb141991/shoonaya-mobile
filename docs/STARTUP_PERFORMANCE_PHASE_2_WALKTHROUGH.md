# Startup Performance Phase 2 Walkthrough

## Japa

The Japa tab consumes the root-owned app identity and no longer repeats guest
storage and Supabase session checks before reading its context cache.

- Guest lifetime data loads directly from local storage.
- Authenticated context reads from the existing spiritual-date-aware cache,
  then revalidates through `/api/japa/context` with `expectedUserId`.
- Pending completion reconciliation remains after usable context has rendered.
- A load-generation guard prevents an older cache, response, recovery scan, or
  error handler from updating the screen after an account transition.
- Queue refreshes verify the current identity before updating their indicators.

## Mandali

The Mandali tab consumes the same root-owned identity before reading its
identity-scoped first-page cache.

- Cached profile, posts, comments, members, RSVPs, reactions, and cursor render
  while `/api/mandali/feed?limit=20` revalidates in the background.
- The feed request carries `expectedUserId`; a mismatched response profile is
  rejected before state or cache mutation.
- A per-load generation rejects stale cache and network completions.
- Guest, unauthenticated, and account-switch transitions immediately clear the
  prior profile, feed, reactions, realtime post scope, outbox owner, and related
  identity-bound UI state.
- Route-open and refresh-failure telemetry is attributed only when the identity
  captured at load start is still current.
- Realtime subscriptions and reaction outbox recovery continue only from the
  newly resolved profile.

## Verification

- Architecture tests require Home, Japa, and Mandali to consume
  `useAppIdentity()` and forbid tab-local Supabase auth/session lookups.
- Architecture tests require Japa and Mandali generation guards and
  identity-bound API requests.
- `npm run typecheck` and the complete `npm test` suite are the code-level
  acceptance checks.

Phase 0 real-device baseline and after measurements are still required before
assigning a measured millisecond improvement or declaring startup instant.
