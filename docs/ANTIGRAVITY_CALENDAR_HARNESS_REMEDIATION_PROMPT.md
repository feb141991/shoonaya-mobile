# Antigravity: Calendar Harness Failure Remediation

Work only in `/Users/Business(C)/Sanatan Sangam/Shoonaya`. This is a diagnostic
and corrective calendar task. Read `AGENTS.md`, `SHOONAYA_WORKFLOW.md`,
`SHOONAYA_RULES.md`, `docs/REVIEW_CHECKLIST.md`, all calendar specifications,
the approved-fixture governance code and the current assessment before edits.

## Observed baseline

On 2026-08-24, `npm run verify:harness` ended with:

- 644 passed
- 652 skipped
- 30 failed
- 7 test files total: 6 passed, 1 failed

Visible failures included approved-fixture rule/date mismatches and Dussehra
snapshot drift. Treat these numbers as a reproduction target, not a permanent
hardcoded conclusion.

## Phase A: reproduce and classify without editing

Create one committed, deterministic command that prints every failing case as
structured JSON/Markdown with:

- case ID, slug, year, location, calendar profile and sampradaya;
- fixture type: approved golden, snapshot, invariant or contract;
- expected date/value and actual date/value;
- selected rule identity and candidate count;
- rule/source/review decision references;
- first commit introducing the divergence when `git bisect` or history can
  establish it;
- classification: stale fixture, missing/renamed rule, engine regression,
  intentional ratified change, duplicate identity, or unresolved.

Do not manually transcribe counts. The command must generate them.

## Phase B: adjudicate each class

1. Approved fixtures are authoritative evidence. Do not change them merely to
   make the engine green.
2. Snapshots are tripwires, not authorities. Regenerate only an individually
   adjudicated snapshot after proving the new result is intentional and
   source/governance-consistent.
3. A fixture that finds zero or multiple rule rows is an identity/schema defect;
   repair deterministic identity rather than loosening the assertion.
4. A one-day date shift requires boundary/window/profile analysis. Never patch
   the tithi index or Gregorian date to force a match.
5. Separate missing rule coverage from incorrect astronomy and from editorial
   naming changes.
6. Negative-check every fix by reverting only that fix and proving the new test
   fails for the intended reason.

## Known cases requiring explicit explanation

- `guru-nanak-gurpurab__2026__bedford_uk__unspecified`: approved fixture
  expects 2026-11-24 while the engine selected 2026-11-25.
- `dussehra__2026__ujjain_india__north_indian_purnimanta`: approved fixture
  found zero matching rule rows.
- Dussehra 2026 snapshots captured 2026-10-20 while current output includes
  2026-10-21 across multiple locations/profiles.

These examples are not permission to assume the remaining failures share the
same root cause.

## Hard constraints

- Do not change `masaName` or flip engine/materialisation flags.
- Do not apply migrations, materialise production, deploy or send notifications.
- Do not modify approved council decisions without explicit founder approval.
- Do not mass-regenerate snapshots.
- Do not weaken tolerances, skip failing cases or convert failures into expected
  skips.
- Preserve unrelated dirty files.

## Completion gate

Run the machine report, focused negative tests, `validate:rules`,
`verify:calendar`, `verify:harness`, root/package typechecks, `git diff --check`
and graphify. Report passed, failed and skipped separately. For every
`REVIEW_CHECKLIST.md` section state clear/finding/not-applicable-because.

Stop after producing the diagnosis if any date requires council adjudication.
Do not commit a guessed calendar correction.
