# Antigravity Vrat Prompt 1: Mandatory Closeout

Run this prompt before Prompt 2. The prior hardening pass improved the implementation but did not satisfy its completion gate. Fix only the verified findings below. Do not push, deploy, apply the migration to production, or touch unrelated files.

The execution contract in `docs/ANTIGRAVITY_VRAT_SYSTEM_PARITY_PROMPTS.md` remains binding.

## Objective

Make Vrat observation eligibility exactly match the canonical calendar read path and prove the database contract against real PostgreSQL. Do not create another partial eligibility interpretation in the route or RPC.

## Reproduce First

1. `POST /api/vrat/observe` manually checks a subset of occurrence fields instead of using the shared request-profile, withholding, profile-family completeness, and read-time variant-selection pipeline.
2. Neither the route nor RPC selects/requires `publication_status = 'published'`.
3. Batch validation checks only `status = 'complete'`; it does not require `expected_row_count = produced_row_count`, and null `batch_id` has no explicit permitted-legacy decision.
4. `isEligibleToObserveToday` ignores `isPrimary` and accepts `ambiguous`, null, and unknown statuses.
5. There is no dedicated Vrat real-Postgres shadow harness and no Supabase development branch. Mocked route tests are the only mutation tests.
6. PWA resets state but does not cancel or identity-guard the 60-day calendar request; a stale response can overwrite the newly selected Vrat.
7. The four-timezone test checks only output formatting at the current instant, not fixed UTC-midnight and 03:59/04:00 local spiritual-day boundaries.
8. The route returns raw service RPC error messages to clients.

Print proof for every reproduction before editing. If a finding no longer exists, show exact file/line or executable test evidence.

## Required Implementation

### 1. One canonical eligibility resolver

Extract or reuse one server-side function that answers:

```ts
resolveObservableVratOccurrence(request, occurrenceId)
```

It must reuse the same mechanisms used by `/api/calendar/day`, `/api/calendar/month`, and `/api/calendar/upcoming`, including:

- `resolveRequestProfile` and its authentication/profile failure semantics;
- `publication_status = 'published'`;
- `filterWithheldJoinedRows` and disputed/deferred rule suppression;
- profile-family completeness and legacy fallback semantics from the occurrence reader/formatter;
- read-time calendar-profile and tradition/sampradaya variant selection;
- exactly one resolved `isPrimary: true` occurrence;
- active definition with `kind = 'vrat'`;
- exact positive review, verification, audit, and non-fallback states;
- canonical timezone-aware 4 AM spiritual date.

The mutation route must call this shared resolver. Delete the route's weaker hand-written approximation. Do not copy formatter logic into a second helper.

Return a typed validated DTO containing only server-derived identity and immutable snapshots needed by the transaction.

### 2. Transaction rechecks

Keep the RPC service-role-only. Inside the transaction recheck all immutable database facts that can change between resolver and insert:

- occurrence and active Vrat definition still exist;
- `publication_status = 'published'`;
- exact reviewed/verified/audited/non-fallback state;
- occurrence date still equals the user's stored-timezone spiritual date;
- linked batch, when required, is `complete` and `expected_row_count = produced_row_count`;
- explicitly document and enforce which legacy rows may have null `batch_id`.

Do not attempt to recreate user-specific primary selection in SQL. That belongs to the shared server resolver. The RPC remains callable only by `service_role`.

### 3. Product eligibility helper

Update the shared PWA and Native helper to return true only when:

- ID is a valid canonical UUID;
- status is exactly `resolved`;
- `isPrimary === true`;
- civil date equals the API-provided canonical spiritual date.

Add negative tests for `ambiguous`, `under_review`, `unresolved`, missing status, `isPrimary: false`, missing `isPrimary`, malformed ID, future date, and stale identity.

### 4. PWA race protection

Abort the old calendar/status requests or attach a monotonically increasing identity token. A response may update state only if it still belongs to the current `originalSlug`/`vrat.id`. Test an old request resolving after a new request and prove it cannot restore the previous occurrence ID or observation state.

### 5. Stable error contract

Map resolver and RPC failures to stable internal error codes and safe user messages. Log detailed database errors server-side only. Never return raw RPC/Postgres text to clients.

## Real PostgreSQL Harness

Add one command, for example:

```json
"verify:vrat-observation-shadow": "bash scripts/shadow/verify-vrat-observation-shadow.sh"
```

It must build a local PostgreSQL shadow database, apply the real migration, exercise real SQL privileges/RLS/RPC/concurrency, apply the rollback, and exit nonzero on any failed assertion. A fake Supabase client is forbidden.

Prove:

1. unauthenticated/authenticated RPC execution denied;
2. authenticated INSERT/UPDATE/DELETE denied;
3. cross-user reads denied;
4. unpublished, withheld/disputed, ambiguous/non-primary, incomplete batch, count-mismatched batch, wrong profile, wrong sampradaya/variant, fallback, unreviewed, unverified, unaudited, past, and future occurrences rejected;
5. permitted legacy null-batch behavior matches the canonical reader exactly;
6. two concurrent calls create one observation, one +25 profile increment, and one karma-ledger row;
7. retry adds zero karma;
8. two separate recurring occurrence IDs are independently observable;
9. rollback restores the pre-migration schema and function grants.

If local PostgreSQL cannot model a Supabase role, create the required roles in the harness. Do not create a billable Supabase branch without explicit user approval.

## Deterministic Time Tests

Inject/freeze the instant. For London, Kolkata, Los Angeles, and Sydney, prove expected spiritual dates at:

- 03:59 local;
- 04:00 local;
- both sides of UTC midnight;
- a daylight-saving transition where applicable.

Assertions must compare exact expected dates, not a regex.

## Required Verification

Run and report exact counts for:

- `npm run verify:vrat-observation-shadow`;
- Vrat route and canonical resolver tests;
- calendar formatter/profile-selection tests;
- PWA and Native production-helper/race tests;
- `npx tsc --noEmit` in both repositories;
- `git diff --check` and `git status --short` in both repositories.

Run Supabase advisors only against a migrated branch if one already exists or the user separately approves its cost. Production must remain unchanged.

## Delivery

- One scoped commit per repository.
- Report every touched file, including out-of-scope files.
- Preserve unrelated dirty web files exactly.
- Do not push.
- Do not begin Prompt 2.

Prompt 1 closes only when the canonical resolver is reused and the real PostgreSQL harness proves the complete mutation contract.
