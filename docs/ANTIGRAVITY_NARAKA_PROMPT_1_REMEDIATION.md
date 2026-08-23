# Antigravity Naraka Chaturdashi Prompt 1 Remediation

Execute this corrective prompt only. Do not begin Prompt 2, add Naraka Chaturdashi to a Diwali cluster, build Native/PWA UI, publish dates, apply database changes, flip calendar flags, change `masaName`, or touch unrelated dirty files.

## Repository

Work in:

`/Users/Business(C)/Sanatan Sangam/Shoonaya`

The governing runbook is:

`/Users/Business(C)/shoonaya-mobile/docs/ANTIGRAVITY_MULTIDAY_OBSERVANCE_SERIES_PROMPTS.md`

Read `AGENTS.md`, `docs/calendar-domain-model.md`, `docs/calendar-profiles.md`, `docs/source-governance.md`, `docs/REVIEW_CHECKLIST.md`, and the Rashtriya Panchang manifest before editing.

## Objective

Repair the independently reviewed Prompt 1 implementation while preserving its valid core result:

- `naraka-chaturdashi` remains a distinct identity from `diwali`;
- RP Saka 1948 Index #55, p.7 remains the source for the Ujjain-reference 2026-11-08 date;
- the rule remains `launch_status: 'deferred'`;
- no production occurrence or definition is created;
- the exact `Purvarunodaya` evaluator semantics remain a council decision, not an engineering assertion.

## Start Report

Before editing, print:

1. `git status --short`, branch, HEAD, and upstream divergence.
2. Every file currently changed or untracked, separating Naraka work from unrelated existing work.
3. Machine-generated counts for total rules, Naraka aliases, and the existing Diwali identities.
4. The live `observance_definitions` columns and constraints using a read-only Supabase query. Do not apply SQL.
5. The current Naraka rule, evaluator entry, source-manifest section, tests, audit script, and SQL draft.

Reproduce these review findings before fixing them:

- the SQL draft references nonexistent `publication_status` and `review_status` columns;
- the SQL draft sits inside `supabase/migrations/` despite being intentionally unapplied;
- Bedford is described as proven correct although it is only a computed result under the proposed rule;
- T10 does not execute the real production rules for all five existing Diwali identities;
- T7 hardcodes timezone offsets instead of testing timezone behavior;
- Naraka aliases and narrative claims lack typed source evidence;
- unrelated Navratri JSON formatting churn is present.

## Required Corrections

### 1. Remove the invalid migration artifact

Delete:

`supabase/migrations/UNAPPLIED_naraka_chaturdashi_definition.sql`

Do not leave intentionally unapplied SQL under `supabase/migrations/`.

If a SQL reference is still useful, place it under:

`docs/sql-drafts/naraka-chaturdashi-definition.sql`

The draft must match the actual `observance_definitions` schema and vocabulary. It must not reference nonexistent columns. Prefer no SQL draft at all until council ratification if the current schema has no honest database-level draft/review state.

Do not use `active = true` as a substitute for publication approval. Do not invent new governance columns in this corrective prompt. Explain whether a definition row should be created only after ratification.

### 2. Correct evidence language

Update tests, comments, manifest text, and completion reporting so they distinguish:

- **sourced fact:** RP Saka 1948 Index #55 lists Naraka Chaturdasi (Purvarunodaya) on 2026-11-08 at its Indian reference basis;
- **implemented convention:** the evaluator defines `arunodaya` as sunrise minus 96 minutes through sunrise;
- **proposed scholarly decision:** Chaturdashi must `prevail` throughout that full window;
- **computed consequence:** under that proposed rule and Bedford coordinates, the engine returns 2026-11-07;
- **unproven claim:** Bedford 2026-11-07 is the ritually authoritative local observance date.

Replace phrases such as “astronomically correct” and “this is correct evaluator behavior” with neutral language:

> “Provisional computed result under the proposed full-window `prevails` interpretation; pending council ratification and external local-calendar validation.”

Do not turn a matching Ujjain fixture into proof that `prevails` is the only valid interpretation. Keep `launch_status: 'deferred'` and the ratification note explicit.

### 3. Make the council question explicit and machine-visible

Record the unresolved decision without pretending prose is an enforcement mechanism:

> For `Purvarunodaya`, should Krishna Chaturdashi:
> 1. prevail throughout the entire 96-minute arunodaya window;
> 2. touch any part of the window;
> 3. prevail at a defined arunodaya instant or boundary;
> 4. follow another sourced day-assignment rule?

Do not mark the rule approved. If the rule schema has an existing structured field for pending ratification, use it. Otherwise keep the rule deferred and document the work item; do not add a new schema concept in this prompt.

### 4. Eliminate dual month-system drift

The rule currently stores Kartika/purnimanta while `EVALUATOR_RULES` hardcodes Ashwin/amanta. Do not silently retain two unexplained representations.

Use one of these approaches, in priority order:

1. Derive the evaluator's equivalent month condition from versioned rule data through an existing conversion helper; or
2. add a production-helper test proving the documented conversion law that Kartika Krishna in purnimanta corresponds to Ashwin Krishna in amanta for the same astronomical day, and explain why the evaluator uses the converted representation.

Do not implement a new month calculation or move any civil date. Do not alter `masaName`.

### 5. Replace T10 with a real production regression

T10 must call the actual production calendar/materialisation calculation used by the application, not hand-built duplicate conditions and manually calculated offsets.

Capture and assert the full pre-existing 2026 Diwali-family output for:

- `dhanteras`;
- `diwali`;
- `govardhan-puja`;
- `bhai-dooj`;
- `bandhi-chhor-divas`.

Prove that adding deferred Naraka Chaturdashi changes none of their identities, dates, variants, status, source references, or count.

Also prove that a same-date identity key based on `(slug, occurrence instance, profile, tradition/variant)` retains both Naraka and Diwali. Do not assert that a toy `Set` demonstrates the production deduplication path.

If the deferred launch gate means Naraka does not enter the production calculation, assert that explicitly and test the direct evaluator separately.

### 6. Repair timezone/DST testing

Replace the hardcoded offset constants in T7 with actual timezone calculations using the same timezone utility or runtime behavior used by production.

Prove:

- `Asia/Kolkata` has the expected offset for the tested instant;
- `Europe/London` is on GMT for 2026-11-07/08;
- the test dates are not on the UK DST transition;
- changing timezone alone and changing coordinates alone are measured separately where the evaluator contract permits it.

Do not claim timezone alone causes the civil-date difference when longitude-dependent sunrise also participates.

### 7. Source or remove editorial claims

The RP citation supports the name, `Purvarunodaya` qualifier, and 2026-11-08 source date. It does not by itself support every alias, region assignment, Narakasura narrative, or “day before Diwali in most traditions.”

For each of these, either:

- add a typed, permitted source reference with title, publisher/author, URL or document locator, tier, rights/usage status, and exact section/page; or
- remove it from this Prompt 1 rule and use neutral source-backed copy.

Do not treat `Kali Puja` in the RP line as proof of the alias `Kali Chaudas`; they are different names and must not be conflated.

The safest initial description is:

> “A Krishna Chaturdashi observance identified by Rashtriya Panchang with the Purvarunodaya qualifier.”

### 8. Remove unrelated formatting churn

Restore all mechanically reformatted Navratri arrays and any other unrelated `rules.json` formatting to their pre-task form. The final rules diff should contain only the Naraka rule and changes strictly required by this remediation.

Preserve every unrelated dirty file byte-for-byte. Do not stage or commit unrelated Home, Nitya, admin, API-auth, component, or Vercel changes.

### 9. Strengthen the audit script

The one-command audit must print machine-derived evidence for:

- total rule count;
- exact Naraka identity count;
- alias rows count;
- launch status;
- whether a production definition exists;
- whether any Naraka occurrences exist;
- existing Diwali-family identities and dates from the production calculation;
- Ujjain and Bedford computed candidates labelled as sourced vs provisional;
- whether any file under `supabase/migrations/` contains an unapplied Naraka draft;
- whether the evaluator representation and rule representation pass the conversion-law check.

Do not print hardcoded “correct” conclusions. Derive verdicts from printed values.

## Required Tests

Use production modules rather than duplicated test-only rule implementations wherever possible.

Required cases:

1. RP Ujjain fixture: proposed evaluator returns 2026-11-08.
2. Bedford output is 2026-11-07 but explicitly marked provisional.
3. `prevails`, `touches`, and any supported instant/boundary interpretations are compared and printed; no unratified interpretation is called canonical.
4. Rule month-system representation and evaluator representation refer to the same astronomical day under the documented conversion law.
5. Deferred Naraka does not appear in normal production materialisation/API output.
6. Existing five Diwali-family outputs are byte-identical before and after.
7. Same-date Naraka and Diwali retain distinct production identities when Naraka is evaluated in the shadow path.
8. Wrong tithi/month does not qualify.
9. Adhika and kshaya statements are limited to what the evaluator actually proves for 2026.
10. Actual timezone/DST behavior is tested without hardcoded conclusions.

Rename any test whose title claims more than its assertions prove.

## Verification Receipt

Run and report exact passed, failed, and skipped counts:

```bash
node scripts/naraka-baseline-audit.mjs
npm run validate:rules
npm test --workspace=@sangam/dharma-rules -- --run src/conditions/__tests__/naraka-chaturdashi.test.ts
npm run verify:calendar
npm run verify:harness
npx tsc --noEmit
git diff --check
git status --short
```

Confirm explicitly:

- `masaName` unchanged;
- `USE_CONDITION_EVALUATOR` unchanged;
- `USE_CORRECTED_MASA` unchanged;
- production database untouched;
- zero Naraka production definitions and occurrences;
- no intentionally unapplied SQL remains inside `supabase/migrations/`;
- unrelated dirty files remain untouched.

## Delivery

1. One scoped local corrective commit for Naraka Prompt 1 only.
2. Do not push.
3. Do not deploy.
4. Do not apply SQL or migrations.
5. Do not begin Prompt 2.
6. Report every touched file and every unrelated dirty file left untouched.
7. End with the exact council decision still required and whether independent review may now approve Prompt 1.
