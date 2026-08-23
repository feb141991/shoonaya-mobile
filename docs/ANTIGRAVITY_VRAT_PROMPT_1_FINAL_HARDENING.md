# Antigravity Vrat Prompt 1: Final Hardening

Run this prompt before Prompt 2. Stop after scoped commits and a verification report. Do not push, deploy, or apply the Vrat ledger migration to production.

The execution contract in `docs/ANTIGRAVITY_VRAT_SYSTEM_PARITY_PROMPTS.md` remains binding. Preserve unrelated working-tree changes in the web repository.

## Objective

Close the remaining gaps in the occurrence-qualified Vrat observation contract. The current implementation improves identity, idempotency, direct-table security, and atomic karma, but it is not yet safe to migrate.

## Reproduce These Findings First

1. `record_vrat_observation` accepts states that must fail closed:
   - it does not select or require `publication_status = 'published'`;
   - `COALESCE(review_status, 'reviewed')` accepts null review state;
   - verification rejects only `mismatch`, so null, pending, or other non-verified values pass;
   - it does not validate the occurrence's materialisation batch completeness;
   - it fetches the user's profile but never proves the occurrence belongs to the resolved calendar profile, tradition/sampradaya, variant, or permitted legacy fallback;
   - a missing profile silently becomes Asia/Kolkata + legacy-ujjain + hindu instead of failing closed.
2. The authenticated RPC is directly callable. That is safe only if its database validation is semantically identical to canonical read-time eligibility; it currently is not.
3. PWA fetches 60 days, selects the first matching primary occurrence, and shows `Mark as Observed` for any resolved occurrence ID without requiring its civil date to equal the API-provided current spiritual date. A future occurrence therefore receives an enabled CTA that only fails after POST.
4. PWA does not clear `calendarObservance`, `observedToday`, `observeCount`, `observeStatusLoaded`, and loading state synchronously when the Vrat identity changes. A previous occurrence can remain actionable while the next request is in flight.
5. Native uses `new Date().toISOString().split('T')[0]` for CTA eligibility. This is UTC, not the canonical timezone-aware 4 AM spiritual date.
6. Native still computes `calculatePanchang` + `getTithiReminder` + `tithiIndexToVratId`. It must not contribute identity or CTA eligibility; Prompt 2 may remove the display fallback, but Prompt 1 must prove it cannot authorize a write.
7. `__tests__/vrat-observation-contract.test.ts` defines duplicate helper implementations inside the test. It does not import or execute the shipped Native logic.
8. Route tests mock RPC success/failure. No real-Postgres test proves grants, RLS, canonical rejection, concurrency, one karma award, or rollback.
9. GET ignores profile-read errors and silently calculates an India spiritual date. Its general `vrat_id` branch also ignores ledger and legacy query errors.
10. POST accepts additional caller-supplied authoritative fields and silently discards them. Reject unknown fields so contract drift and hostile payloads fail visibly.

If any item no longer reproduces, print the exact file/line or real database result proving it before editing.

## Required Design Decision

Do not duplicate the calendar resolver incompletely in SQL.

Use one of these designs, documenting why it is equivalent to the canonical read path:

- **Preferred:** route authenticates with `getApiUser(req)`, invokes the shared server-side canonical occurrence/profile resolver, then calls a service-role-only transaction RPC with only the authenticated `user_id` and validated `occurrence_id`. The transaction must recheck immutable database eligibility and current spiritual date before insert/karma. Revoke RPC execution from `authenticated`, `anon`, and `PUBLIC`.
- Keep an authenticated one-argument RPC only if the implementation can prove exact parity with the shared profile/fallback, sampradaya/variant, withholding, publication, and batch-completeness semantics. Partial SQL approximations are forbidden.

The server must derive all snapshots and fixed karma. No client may choose date, profile, tradition, timezone, name, slug, user, or amount.

## Required Fixes

### Canonical eligibility

- Require exact positive states: published, reviewed, verified, audited/completed, active Vrat, non-fallback, non-withheld/non-disputed.
- Require complete materialisation where the occurrence contract requires it. Validate the linked batch status and produced/expected counts, including legacy fallback semantics.
- Resolve the authenticated user's calendar profile and tradition/sampradaya using the same shared code as calendar routes.
- Prove the occurrence is a valid selected primary/alternative for that user at read time. Do not trust stored `is_primary_variant` as user-specific truth.
- Require the user's stored timezone and profile read to succeed; no India/Hindu fallback on database failure or missing identity.
- Require occurrence civil date to equal the canonical local spiritual date at the 4 AM boundary.

### PWA and Native CTA

- Expose the server's canonical `today` spiritual-date string with the occurrence response or status response and use it in both clients.
- PWA must choose a matching occurrence for **today**, not merely the first match in 60 days.
- Both clients show the CTA only for a resolved, primary, eligible occurrence ID whose civil date equals canonical `today`.
- Clear occurrence-qualified state synchronously before fetching a newly selected Vrat.
- Remove UTC `toISOString()` from eligibility.
- Extract production payload and eligibility helpers into imported modules used by the actual screens and tests. Delete test-only duplicate implementations.

### Route behavior

- Strictly parse `{ occurrence_id }`; reject unknown keys and malformed JSON.
- Fail closed on profile, ledger, legacy-history, resolver, RPC, and database errors.
- Return stable error codes/messages without leaking raw database internals.
- Preserve legacy history as read-only; never use it to authorize a new observation.

## Real Database Verification

Create a dedicated one-command shadow harness for this migration. It must apply the real forward migration and rollback and exercise the production mutation path, not a fake Supabase client.

Prove at minimum:

1. unauthenticated and unauthorized function execution fails;
2. authenticated direct INSERT/UPDATE/DELETE fails;
3. cross-user SELECT/mutation fails;
4. non-Vrat, inactive, unpublished, null/pending review, null/pending verification, unaudited, fallback, withheld/disputed, incomplete batch, wrong profile, wrong tradition/sampradaya, wrong variant, past date, and future date all fail;
5. missing profile/timezone fails rather than defaulting;
6. London, Kolkata, Los Angeles, and Sydney 4 AM boundary cases select the same date as `localSpiritualDate`;
7. two concurrent valid calls produce one observation, one +25 profile update, and one karma-ledger row;
8. retry returns already-observed and adds zero karma;
9. two legitimate recurring occurrence IDs can each be observed once;
10. rollback restores schema and grants cleanly.

Run Supabase security/performance advisors against the migrated shadow/branch environment and report findings. Production must remain unchanged.

## Required Product Tests

- PWA future occurrence never shows an enabled CTA.
- PWA identity switch cannot submit the previous occurrence.
- Native and PWA use the same canonical `today` and occurrence-only payload.
- Test files import production helpers.
- UTC-midnight and 4 AM rollover fixtures cover London, Kolkata, Los Angeles, and Sydney.
- Client tithi fallback cannot produce an observation payload or enabled CTA.

## Verification Receipt

Report exact commands and counts for:

- real shadow database/security/concurrency/rollback harness;
- Vrat route tests;
- calendar formatter/API contract tests;
- Native and PWA production-helper tests;
- `npx tsc --noEmit` in both repositories;
- `git diff --check` and `git status --short` in both repositories.

Report every touched file, including files outside intended scope. One scoped commit per repository. Do not push or proceed to Prompt 2.

## Completion Gate

Prompt 1 closes only when real Postgres proves the contract, both product surfaces gate by canonical spiritual date, and no authenticated caller can record a noncanonical occurrence or gain duplicate karma.
