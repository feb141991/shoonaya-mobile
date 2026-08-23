# Antigravity Vrat Prompt 1-2 Review Remediation

Run this prompt as one corrective gate before Prompt 3. Work across both repositories:

- Native: `/Users/Business(C)/shoonaya-mobile`
- Web/backend: `/Users/Business(C)/Sanatan Sangam/Shoonaya`

Do not begin notification workflow work. Do not deploy, push, apply a production migration, alter calendar rules, flip calendar flags, or touch unrelated dirty files. Preserve the untracked multi-day observance runbook unchanged.

## Objective

Close the independently verified Prompt 1 and Prompt 2 defects so the Vrat observation ledger, canonical Native reader, deep links, and verification evidence satisfy the original runbook.

## Start Report

Before editing:

1. Print `git status --short`, current branch, HEAD, and upstream divergence for both repositories.
2. Read the original Prompt 1 and Prompt 2 requirements in `docs/ANTIGRAVITY_VRAT_SYSTEM_PARITY_PROMPTS.md` and `docs/ANTIGRAVITY_VRAT_PROMPT_2_CANONICAL_NATIVE.md`.
3. Confirm from production Supabase, read-only, whether `public.vrat_observations` and `public.record_vrat_observation(uuid,uuid)` exist. Do not apply them.
4. Reproduce every defect below before fixing it. Tests must import production helpers or exercise the real route/database contract; do not duplicate production logic inside tests.

## Required Corrections

### 1. Complete the atomic observation contract

Update the unapplied migration and rollback safely. Because it is not applied to production, amend the existing forward migration rather than stacking a corrective production migration.

The ledger must persist:

- authenticated user ID;
- canonical occurrence and definition identity;
- Vrat slug and display name;
- occurrence date and timezone used;
- calendar profile;
- spiritual tradition;
- sampradaya where applicable;
- variant identity where applicable;
- observed timestamp;
- karma awarded.

The service-role RPC must independently and atomically fail closed unless the occurrence is:

- an active Vrat definition;
- `publication_status = 'published'`;
- `review_status = 'reviewed'`;
- `verification_status = 'verified'`;
- `audit_status = 'completed'`;
- not sourced from fallback;
- not withheld or disputed for the occurrence year;
- backed by a complete materialisation batch whenever batch qualification is required by the canonical reader;
- valid for the user's resolved calendar profile, tradition, sampradaya, variant, timezone, and local spiritual date.

Do not rely on a route-level precheck for these invariants. The transaction is the final authority and must prevent a validation-to-write race. Reuse existing profile-resolution and occurrence identity vocabulary; do not invent spiritual matching rules in SQL. If an invariant cannot be reproduced faithfully inside the RPC, redesign the operation so the canonical server resolver supplies a short-lived or transaction-verifiable identity rather than weakening validation. Document the decision.

Keep `(user_id, occurrence_id)` idempotency and prove that two concurrent calls create one ledger row and award karma once.

Keep the function inaccessible to `PUBLIC`, `anon`, and `authenticated`. Exercise actual role privileges and RLS in PostgreSQL, not only catalog inspection.

### 2. Remove fabricated Native canonical data

In `app/vrat/[slug].tsx`, delete the fallback that constructs a `resolved`, `reviewed`, `high-confidence`, primary occurrence from route-provided `occurrence_id` and `date` when the server cannot find that ID.

Route parameters are hints and opaque identity only. They are never evidence of canonical status, date, profile, confidence, review state, or source provenance.

When an occurrence ID is missing, stale, unknown, outside the fetch window, or withheld:

- keep the editorial reader available when the slug is known;
- show a calm unavailable/stale occurrence notice;
- do not label it canonical;
- do not display the route date as confirmed;
- do not enable observation or reminder actions;
- provide retry/back-to-calendar behavior using existing components.

Prefer an exact server lookup by occurrence ID if an existing canonical endpoint supports it. Do not scan a fixed 60-day window and then invent a fallback.

### 3. Establish one timezone authority

Trace the complete path for both PWA and Native:

`reader fetch -> calendar request profile -> canonicalToday -> observation GET -> observation POST -> RPC spiritual date`.

Use one resolved timezone/profile authority throughout. Device timezone, stored profile timezone, and explicit location must not silently disagree between display and write. Preserve worldwide travel behavior according to the existing calendar request-profile contract; do not hardcode `Asia/Kolkata` except as an explicitly documented last-resort state that cannot authorize observation.

Add London, Kolkata, Los Angeles, and Sydney fixtures covering the 03:59/04:00 spiritual-day boundary, plus a test where device timezone differs from stored profile timezone.

### 4. Make the Native upcoming list truthful

Do not render ambiguous, unresolved, under-review, non-primary, withheld, fallback, or null-date results as ordinary confirmed upcoming rows.

Choose one explicit behavior consistent with existing calendar surfaces:

- resolved primary results appear as normal dated rows;
- review states appear in a clearly separated review/unconfirmed section with status disclosure and no date-sensitive CTA; or
- review states are omitted from the consumer list while remaining available in the calendar review surface.

Do not silently pick a candidate date. Do not flatten alternatives into duplicate confirmed rows. Use stable occurrence identity for keys, never array index where an occurrence ID exists.

### 5. Replace weak tests with production-path proof

The real PostgreSQL shadow harness must report an honest assertion count and exercise:

- valid first observation;
- duplicate idempotency;
- two truly concurrent calls producing one row and one karma award;
- unpublished occurrence rejection;
- inactive definition rejection;
- unresolved/unreviewed/unverified/unaudited/fallback rejection;
- disputed or withheld year rejection;
- wrong date rejection;
- wrong calendar profile rejection;
- wrong tradition/sampradaya/variant rejection;
- incomplete materialisation rejection where applicable;
- cross-user read isolation;
- direct mutation denied to `anon` and `authenticated`;
- RPC execution denied to `PUBLIC`, `anon`, and `authenticated`;
- service-role success;
- rollback removes every added artifact.

Native tests must use production modules/components and prove:

- an unknown or stale occurrence ID never becomes a synthetic canonical result;
- rapid navigation A -> B cannot apply A's response or status to B;
- device/profile timezone disagreement remains internally consistent;
- unresolved and alternative states are visibly disclosed and non-actionable;
- catalogue-only detail remains educational and non-actionable;
- Home, notification, upcoming-row, direct cold-start, custom-scheme, and universal-link inputs preserve exact slug plus occurrence identity when available;
- guest AuthGate preserves reader state;
- no occurrence-critical `any` remains.

Do not satisfy these with source-text searches alone when behavioral tests are possible. Rename tests honestly if they test a narrower contract.

## Verification

Run and report exact passed, failed, and skipped counts:

### Web/backend

```bash
npx tsc --noEmit
npx vitest run src/app/api/vrat/observe/observe.test.ts
npm run verify:vrat-observation-shadow
git diff --check
git status --short
```

Also run any production-module resolver tests changed by this work.

### Native

```bash
npm run typecheck
node --test --import tsx __tests__/vrat-canonical-native.test.ts
git diff --check
git status --short
```

Run any existing Home and notification route tests affected by exact occurrence links.

Perform focused simulator verification only after automated checks pass:

- canonical Today;
- no Today;
- resolved upcoming detail;
- ambiguous/under-review result;
- stale fabricated deep link;
- rapid A/B navigation;
- guest observation attempt;
- timezone disagreement fixture.

## Delivery

1. One scoped corrective commit in each repository that actually changed.
2. Do not include unrelated dirty files.
3. Do not push or deploy.
4. Do not apply the production migration.
5. Report every touched file and any pre-existing dirty file left untouched.
6. State explicitly whether production migration remains unapplied.
7. Stop after the report. Prompt 3 remains blocked until independent review approves this remediation.
