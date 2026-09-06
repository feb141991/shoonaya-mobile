# Reliability Implementation Review

Reviewed backend f24dac4..0d0a18b and Native b9158c4..d16998e, plus their
surrounding callers. This is a code review and local verification receipt,
not production deployment or physical-device sign-off.

## Findings Fixed Locally

- P1 Japa: exhausted 500/503/429 responses were clearing durable work.
  Only successful responses acknowledge now. Pending rounds are serialized
  as a queue; acknowledging one ID cannot delete another round. Storage
  write failures stop sending rather than creating untracked operations.
- P1 Japa: private replay used whichever account apiFetch currently held.
  Owner-bound requests now validate the session owner before each dispatch,
  including auth refresh replay. Queued duration is reserved before delivery
  so another round does not include the failed round's duration again.
- P2 Japa: pending recovery blocked cached content rendering. Cached/fresh
  context is rendered before recovery; successful recovery refreshes context.
- P1 Mandali: PWA location joins still used resolver + profile update.
  PWA now uses join_mandali, matching Native. Both reject missing membership
  results rather than presenting success.
- P1 Mandali: unordered LIMIT 1 silently selected a duplicate city. A new
  forward migration rejects ambiguous names and geographically conflicting
  exact matches; explicit by-ID selection remains possible. Existing cities
  and content are preserved. Nearby fallback cannot cross countries.
- P1 Mandali: by-ID joins skipped coordinate validation. The migration now
  validates both paths, verifies actual membership after triggers, and locks
  involved city rows in stable order before changing counts.
- P1 Mandali: the authenticated resolver could break server-created profiles
  through auto-assignment triggers. Optional assignment now skips server-side
  unauthenticated provisioning; known validation/ambiguity cases leave the
  profile intact for explicit selection. Other database errors still fail.
- P1 Mandali: legacy direct profile membership writes could bypass the ban
  check. A narrow trigger blocks banned self-joins while allowing leaving.
- P2 Mandali: API discarded invalid coordinates and mislabeled bans as 500.
  It now rejects invalid inputs and returns forbidden for suspended callers.
  Native displays only whitelisted actionable errors, not arbitrary SQL text.
- P2 Navigation/audio: a second lesson exit callback still used the hub.
  It now uses the parent path when available. Audio initialization is guarded
  against blur/stop/newer playback; stale cleanup cannot clear a newer player.
- P2 Measurement: leaving Pathshala without reopening did not cancel its
  measurement token. Focus cleanup now cancels it; missing auth and thrown
  auth requests do not count as successful content loads.
- P2 Discovery: Replay restarted the three-launch wait and Home did not
  reread it on focus. Explicit replay restores eligibility and focus reloads
  the state. FirstWeekGuide progress/dismissal is now account-scoped and
  reread on focus, without adopting old device-global progress.
- P2 Realtime: failed comment hydration could cause an unhandled rejection.
  The realtime callback now contains that failure; explicit thread opening
  remains a retry path through the existing safe DTO.
- P2 Tests: Apple configuration alerts broke two admin tests. They now
  explicitly test both configured and unconfigured environments.

## Prompt Coverage

0. Baseline: reviewed local commit boundaries and preserved unrelated work.
   Did not independently re-query production deployment identity this turn.
1. Japa: reviewed repair SQL and Native recovery; fixed the delivery defects
   above. Cross-day delayed completion semantics still need explicit release
   testing: existing RPC assigns spiritual date at server receipt, not from
   the local queued timestamp. No calendar/date contract was changed here.
2. Mandali: reviewed both clients, API, resolver, join and counter/assignment
   triggers. New forward migration is UNAPPLIED. No city merges or deletes.
3. Apple: reviewed configuration alert/custody integration; real credentials
   and device sign-in/revocation remain external release gates.
4. Navigation: fixed further callback/audio issues. Device history/swipe
   matrix is still required; no claim that source fallbacks prove all routes.
5. Hero: reviewed retry key, unavailable state and single retry owner.
   Confirm actual device recovery against a materialized bucket before release.
6. Mood: metadata matches content; targeted tests pass. No matching legacy
   hardcoded mood links found in the searched app/components source scope.
7. Names/tips: safe author DTO changes retained; replay/scoping defects fixed.
   This still replays existing cues, not a newly designed comprehensive tour.
8. Release: incomplete until deployment, compatible binaries, Apple setup,
   physical devices and cross-day/retry scenarios are verified.

## Verification

- Native complete suite: 451 passed, 0 failed, 0 skipped.
- Backend targeted suites (Mandali joins, mood vocabulary, admin routes):
  27 passed, 0 failed, 0 skipped.
- scripts/mandali-existing-city.test.ts: isolated local PostgreSQL test using
  the actual forward migration, authenticated role and RLS. It uses a minimal
  fixture schema and test location helpers, not a full production clone.
  Covers reuse, idempotent counters, duplicate rejection, coordinate errors,
  legacy update flow, banned/anonymous calls and server profile provisioning.
- Both repository TypeScript checks passed; git diff --check passed.
- Backend graphify update completed. Native's instructed
  scripts/graphify-update-source.sh is absent, so that refresh is blocked.

## Rollout and Boundaries

The new migration is
supabase/migrations/20260906113108_harden_mandali_existing_city_resolution.sql.
Review and apply it separately; it changes functions/triggers, not existing
city rows. It preserves public RPC signatures and response fields.
Further production-equivalent concurrency/trigger checks remain appropriate
before activation; local fixture tests do not prove production parity.

No commits, pushes, deployments, store builds or production mutations were
performed in this review. Existing login/identity changes, privacy baseline
work and unrelated untracked admin/audit documents were not staged or reverted.
