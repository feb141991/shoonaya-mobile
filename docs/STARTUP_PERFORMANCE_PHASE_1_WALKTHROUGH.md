# Startup Performance Phase 1 Walkthrough

## Implemented behavior

Home now keeps a complete identity-scoped memory snapshot containing the safe
render payload and its original freshness metadata. When Home mounts with a
matching snapshot, it renders that payload without an initial loading reset and
passes the original timestamps to `HomeSummaryCoordinator`.

Root starts an AsyncStorage read immediately before publishing the resolved app
identity. It does not fetch Home data. `HomeSummaryCoordinator` remains the only
owner of Home network revalidation, request deduplication, Calendar freshness,
retry scheduling, and stale-response rejection.

Snapshots re-evaluate their spiritual date whenever they are consumed. A
rollover resets date-sensitive practice state, promotes only eligible cached
upcoming observances, and forces an unqualified Home request so the canonical
Calendar response is refreshed.

Cache clears use invalidation generations. A disk read that completes after a
manual clear, logout, or account change cannot restore the cleared memory
snapshot or remove a newer in-flight read. Reads started during a global purge
wait for that purge to finish.

## Identity behavior

- User A, User B, and Guest have distinct storage and memory keys.
- The coordinator uses the canonical `authenticated:<userId>` or `guest`
  identity key everywhere.
- An incoming identity may hydrate only from its own validated snapshot.
- If no matching snapshot exists, Home resets before loading the new identity.

## Verification

- `npm test`: 633 tests passed across 114 suites.
- `npm run typecheck`: passed with zero TypeScript errors.
- Added coverage for disk-only process startup, timestamp propagation,
  spiritual-date rollover, full Calendar refresh, identity isolation, corrupt
  storage, concurrent read deduplication, and clear-versus-read races.

## Measurement status

Automated verification proves the cache and identity invariants. It does not
prove a specific frame time on production hardware. Phase 0 real-device
baseline and after measurements remain required before describing cold-process
startup as instant or declaring the performance phase complete.
