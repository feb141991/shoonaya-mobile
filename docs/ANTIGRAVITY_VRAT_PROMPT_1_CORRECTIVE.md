# Antigravity Corrective: Close Vrat Prompt 1 Before Continuing

Execute this corrective prompt **instead of Prompt 2**. Stop after one scoped commit per repository and a completion report. Do not push, deploy, apply the migration to production, or begin Prompt 2 without review.

The Antigravity Execution Contract and Shared Rules in `docs/ANTIGRAVITY_VRAT_SYSTEM_PARITY_PROMPTS.md` remain binding.

## Objective

Replace the incomplete Prompt 1 implementation with a genuinely canonical, occurrence-qualified, atomic, non-forgeable Vrat observation contract shared by PWA and Native.

## Verified Findings To Reproduce First

1. Production does **not** contain `public.vrat_observations` or `public.record_vrat_observation`; migration `20260823100000_create_vrat_observations_ledger.sql` is committed but unapplied.
2. The `SECURITY DEFINER` RPC is granted to `authenticated` and trusts caller-controlled `p_vrat_id`, `p_vrat_name`, `p_occurrence_date`, `p_occurrence_id`, `p_calendar_profile`, `p_tradition`, `p_timezone`, and `p_karma`.
3. An authenticated client can call that RPC directly, choose arbitrary Vrat/date/profile metadata, and request up to 100 karma per unique `(vrat_id, date)`.
4. The table has an authenticated INSERT policy, allowing direct forged ledger rows and polluted community counts even without using the RPC.
5. Neither the route nor RPC verifies that the occurrence is:
   - real and canonical;
   - `kind = 'vrat'`;
   - active and published;
   - reviewed, verified, and audited;
   - not fallback, disputed, withheld, unresolved, or incomplete;
   - valid today for the authenticated user's resolved profile, sampradaya, location, timezone, and spiritual date.
6. The route accepts arbitrary past dates and permits a null occurrence ID.
7. RPC failure falls through to direct table writes and then to the legacy `recommendations` table, followed by a separate karma RPC. This recreates the non-atomic path Prompt 1 required removing and can bypass future validation errors.
8. The canonical upcoming response does not expose an occurrence row ID. Native types `observance` as `any`, so `selectedOccurrence?.observance?.id` is normally undefined and Prompt 1 posts a null occurrence ID.
9. Native eligibility still uses UTC `toISOString()` and falls back to the independent client tithi calculation.
10. PWA posts only `{ vrat_id, vrat_name }` and displays `Mark as Observed` on every authenticated Vrat reader, regardless of whether it is occurring today.
11. The Native test reimplements payload/eligibility helpers inside the test file instead of importing production code, so it does not test the shipped implementation.
12. The authored route tests mock Supabase/RPC behavior and do not prove canonical validation, database grants, RLS, concurrency, or atomic karma behavior.
13. No matching rollback exists and generated database types do not include the new ledger/RPC.

If any finding no longer reproduces, show the exact current code or database evidence before editing.

## Required Contract

### 1. Canonical identity only

- The write request must identify one canonical occurrence using a stable opaque occurrence identity exposed by the canonical calendar DTO.
- Do not accept authoritative date, Vrat name, profile, tradition, sampradaya, location, timezone, review state, or karma amount from either client.
- The database/server must derive every snapshot field from the authenticated user profile and canonical occurrence/definition rows.
- `occurrence_id` must be non-null for every new ledger row.
- The primary idempotency constraint must be one observation per `(user_id, occurrence_id)`, not caller-chosen slug/date identity.
- Preserve legacy recommendation rows as read-only historical counts where safely deduplicated. Do not invent occurrence IDs for them and do not write new legacy rows.

### 2. Non-forgeable mutation surface

Choose and document one safe design:

- an authenticated RPC accepting only `p_occurrence_id`, deriving `auth.uid()` and all other values internally; or
- a service-role-only internal RPC accepting server-derived user/occurrence IDs, called only after `getApiUser(req)` authenticates the request.

In either design:

- karma is a fixed server/database constant of 25 and is not a function argument;
- revoke function execution from `PUBLIC` and every role that does not require it;
- clients cannot INSERT, UPDATE, or DELETE ledger rows directly;
- users may SELECT only their own ledger rows;
- `SECURITY DEFINER`, if retained, must set a safe search path and perform explicit authorization/occurrence validation;
- run Supabase security advisors after applying to the shadow/branch database.

### 3. Canonical eligibility validation

Inside the atomic transaction, reject unless all conditions are true at write time:

- occurrence exists and joins to an active definition with `kind = 'vrat'`;
- `publication_status = 'published'`;
- `review_status = 'reviewed'`;
- `verification_status = 'verified'`;
- `audit_status = 'completed'`;
- source is not fallback and the occurrence is not withheld/disputed;
- materialisation batch/profile completeness requirements are satisfied where applicable;
- occurrence belongs to the authenticated user's resolved calendar profile/fallback rules and spiritual tradition/sampradaya;
- occurrence date equals the user's current local spiritual date using the stored timezone and the project's canonical rollover rule;
- variant/series identity is preserved rather than collapsed by slug.

Reuse existing profile-resolution and withheld/publication semantics. Do not create a weaker parallel interpretation merely because it is easier to express in SQL. If exact canonical eligibility cannot be safely reproduced inside a public RPC, use the service-only design and a shared server validator, then recheck immutable eligibility inputs inside the transaction.

### 4. Fail closed at the route

- Use `getApiUser(req)` for cookie and Bearer auth.
- Remove every direct-table and legacy-write fallback from POST.
- A missing/unapplied RPC, schema mismatch, validation error, profile read failure, or database fault must return a truthful 4xx/5xx response and award zero karma.
- Do not mask arbitrary RPC errors as duplicate observations.
- Parse and validate the typed request. Reject additional authoritative fields rather than silently trusting them.
- GET must handle database errors explicitly and return a typed occurrence-qualified status without leaking another user's rows.

### 5. Make the canonical occurrence ID consumable

- Add a typed, safe occurrence identity to `ClientObservanceResult` and populate it from the actual `observance_occurrences.id` for resolved rows only.
- Do not expose an identity for unresolved/review-queue placeholders.
- Update the calendar route contract tests to prove the identity survives formatting without changing grouping/profile selection.
- Replace Native `observance: any` with the shared/locally mirrored typed response contract.
- PWA and Native must post only the canonical occurrence ID required by the new write contract.

### 6. Gate both product surfaces correctly

Until Prompt 2 removes the remaining client tithi path completely:

- show `Mark as Observed` only when a resolved, primary canonical occurrence has a non-null occurrence ID and its canonical civil date matches the API's current local spiritual date;
- never enable observation from the client-tithi fallback, catalogue browsing, unresolved data, stale selected state, or UTC `toISOString()` date comparison;
- PWA and Native must use the same eligibility helper/contract semantics;
- selecting another Vrat must clear occurrence-qualified observation state before loading the new status;
- guest behavior remains AuthGate/read-only and does not lose reader state.

## Migration Requirements

Because the migration is unapplied to production, correct the existing unapplied migration rather than layering an insecure schema into production first. Report if it has been applied to any shared branch/environment before rewriting it.

- Add the matching rollback under `supabase/rollbacks/`.
- Test forward migration, grants/RLS, behavior, and rollback against a real shadow/Supabase branch database.
- Regenerate `src/types/database.ts` from the migrated schema.
- Prove production row counts and schema remain unchanged.
- Do not apply production migration in this run.

## Required Tests

Mocks may supplement but cannot replace real database proof.

### Real database/security tests

Prove:

1. unauthenticated execution fails;
2. direct ledger INSERT/UPDATE/DELETE fails for authenticated users;
3. one authenticated user cannot read or mutate another user's observation;
4. arbitrary slug, date, karma, profile, timezone, and user ID cannot be supplied;
5. nonexistent, non-Vrat, inactive, unpublished, unreviewed, unverified, unaudited, fallback, withheld, disputed, incomplete-profile, wrong-profile, wrong-variant, past-date, and future-date occurrences fail closed;
6. two genuinely concurrent calls for one valid occurrence create one ledger row, add exactly 25 `seva_score`, and create one karma-ledger row;
7. retries return `already_observed` with zero extra karma;
8. two different legitimate recurring occurrences remain independently observable;
9. rollback restores the pre-migration schema cleanly.

### Route and product tests

- Exercise cookie and Bearer requests through the real route contract.
- Import production payload/eligibility helpers in tests; delete duplicate helper implementations living only in test files.
- Prove PWA and Native send the same occurrence-only mutation payload.
- Prove PWA and Native hide/disable the CTA without a valid canonical occurrence today.
- Prove UTC/local-spiritual-date boundary behavior with at least London, Kolkata, Los Angeles, and Sydney fixtures.
- Prove switching details cannot retain the previous occurrence ID or observed state.

## Verification

Run and report exact passed/failed/skipped counts for:

- targeted Vrat route/database tests;
- canonical calendar formatter/API contract tests;
- Native Vrat production-contract tests;
- `npx tsc --noEmit` in both repositories;
- `git diff --check` and `git status --short` in both repositories;
- Supabase security and performance advisors on the shadow/branch database.

Do not claim Prompt 1 complete from mocked RPC success. Completion requires real database concurrency, privilege, RLS, canonical-occurrence, and rollback evidence.

## Completion Gate

Prompt 2 may begin only after independent review confirms:

- no caller can forge an observation or karma amount;
- no noncanonical occurrence can be recorded;
- observation and karma are one atomic idempotent transaction;
- both PWA and Native are occurrence-qualified and fail closed;
- migration/types/rollback are complete but production remains untouched pending approval.
