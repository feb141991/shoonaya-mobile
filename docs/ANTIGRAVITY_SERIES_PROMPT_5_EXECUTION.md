# Antigravity Prompt 5: Series Notifications and Observation Writes

Execute only after Prompt 4 has passed independent review and PWA, Android,
and iOS visual QA. Work across:

- Backend/PWA: `/Users/Business(C)/Sanatan Sangam/Shoonaya`
- Native: `/Users/Business(C)/shoonaya-mobile`

Read both `AGENTS.md` files, the backend `SHOONAYA_WORKFLOW.md`,
`SHOONAYA_RULES.md`, `docs/REVIEW_CHECKLIST.md`, and Prompt 5 in
`docs/ANTIGRAVITY_MULTIDAY_OBSERVANCE_SERIES_PROMPTS.md` before editing.

## Objective

Make notification delivery and observation writes series-aware without
duplicating existing D-7/D-1/D0 reminders, losing same-date children, or
awarding participation for unopened, unresolved, or unpublished occurrences.

## Preflight: prove the current path before editing

Trace and report, with exact files and functions:

1. canonical occurrence and `ObservanceSeries` production;
2. review/publication eligibility;
3. user tradition, calendar profile, location, timezone, quiet hours and
   notification preferences;
4. notification-row creation and `notification_key` uniqueness;
5. Expo ticket submission, receipt polling, retry and stale-token pruning;
6. Native tap routing to the exact child occurrence;
7. observation writes, database uniqueness and karma/idempotency behavior.

Print every existing key namespace used by festival, vrat, tithi and series
notifications. Do not infer compatibility from route names.

## Required implementation

1. Use child occurrence identity in dedupe keys. A parent series key must not
   suppress later days.
2. Preserve D-7, D-1 and D0 as distinct local-day intents. Do not overlap
   legacy tithi or OneSignal key namespaces.
3. Define one explicit policy for two children on one civil date. Use one
   bundled OS notification containing both canonical names unless current
   production constraints prove two notifications are safer. Preserve both
   in-app notification identities either way.
4. A tap must open the exact child route and retain series context. Never route
   only to a generic calendar or parent-series page when a child is known.
5. Observation writes remain occurrence-ID based, authenticated, atomic and
   idempotent through a database constraint/RPC or equivalent transaction.
6. Reject unresolved, disputed, fallback, unaudited, unverified, withheld or
   incomplete-series children before notification creation and before writes.
7. Do not create a second scheduler, astronomy calculation, notification
   provider or participation ledger.
8. Keep existing single-observance notifications and writes unchanged when no
   series applies.

## Required tests

- Same child and intent retried twice produces one notification row.
- Two different days in one series both notify.
- D-1 and D0 for one child do not collide.
- Naraka Chaturdashi and Diwali on one civil date follow the chosen explicit
  policy without accidental dedupe or identity loss.
- Tap payload opens each exact child independently.
- Unresolved/under-review/withheld children create no notification and cannot
  be observed.
- Two concurrent observation writes award progress once.
- Guest, denied OS permission, missing token, quiet hours, invalid receipt and
  `DeviceNotRegistered` behavior are covered.
- India, Bedford, New York, Sydney and a DST-boundary dry run use each user's
  spiritual/local date.

## Expansion report, not implementation

Generate a machine-produced readiness table for Chaitra/Gupt Navratri,
Chhath, Ganeshotsav, Pitru Paksha, Holi, Shravan Somvar, Mangala Gauri, Hola
Mohalla, Vassa, Losar, Paryushana and Das Lakshana. Report missing source,
profile, evaluator, occurrence, content, notification and UI gates. Do not add
new festival dates or prose in this prompt.

## Forbidden

- No production sends, migration application, materialisation or deployment.
- No engine flags, `masaName`, council decisions, locked rows or manual
  overrides.
- No invented copy, dates, routes, sources or approvals.
- No blanket snapshot regeneration.
- No unrelated Home, onboarding, navigation or design work.

## Verification receipt

Report every touched file and run targeted tests, both typechecks,
`git diff --check`, contract/content parity, notification dry-run, and the
backend `REVIEW_CHECKLIST.md` sign-off. Report passed, failed and skipped
counts separately. Stop for independent review before any rollout, commit,
push, deployment, migration or real notification send.
