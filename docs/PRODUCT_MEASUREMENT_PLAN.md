# Native product measurement plan

**Status:** implemented in code, default-off; database migration is applied in production. Backend and Native commits still need deployment/release, and privacy review is required before enabling a user cohort.
**Scope:** Native mobile product reliability and feature discovery. Web/PWA product development is out of scope.

## What this measurement answers

Use a small first-party event set to answer whether the app starts successfully and users reach meaningful practice or optional-profile actions. This is intended to find broken or undiscoverable experiences, not to maximize time in app or push frequency.

| Event | Meaning | What it deliberately excludes |
|---|---|---|
| `app_opened` | A signed-in user opened the app on this UTC day | Route, exact timestamp, device identifier |
| `practice_started` | A supported practice flow was explicitly started | Practice type, mantra, text, count |
| `practice_completed` | A supported practice flow completed | Practice type, count, duration, streak |
| `progressive_profiling` | An optional-profile prompt was shown, dismissed, or completed | Which prompt, action, or profile fields/values |

Only events occurring after consent are eligible; the app never reconstructs
or backfills earlier actions. Events are recorded at most once per account,
event, and UTC day. The current Native call sites are app launch, Japa start
and completion, and the generic progressive-profiling action.

The backend stores at most one row per account, event, and UTC calendar day. It does not receive route names, content identifiers, mood, tradition, city, coordinates, birth data, raw profile fields, client timestamps, or notification tokens. This is account-linked measurement, not anonymous analytics. The settings explanation must state that broad practice events are collected only when both consent choices are enabled, and that the retention period is 90 days.

## Consent and data lifecycle

- Consent is a separate explicit opt-in (`consent_product_analytics`), defaults to `false`, and is unavailable to guest users. Because even a broad practice event can reveal religious activity, `practice_started` and `practice_completed` additionally require the separate `consent_religious_data` choice. All other product events require product-analytics consent only.
- The setting is disabled until the backend migration is present. Server-side database functions check consent at write time; client state is not trusted. Practice events also check `consent_religious_data` in that same transaction.
- Turning product-analytics consent off immediately disables local event recording. The authenticated withdrawal function locks the user's consent row, turns consent off, and deletes existing event rows in the same transaction. Recording uses the same row lock, so a concurrent event either completes before withdrawal and is deleted, or sees consent off and is refused. Turning off religious-data consent also deletes prior broad practice events while preserving unrelated product events.
- Rows cascade on account deletion and are automatically removed after 90 days. Only backend service roles and the consent-checked API functions can access the table; there is no user-facing SELECT policy.
- The API accepts only the fixed event vocabulary. Requests are rate-limited, payload-bounded, identity-derived from the verified session, and stored using the server's UTC date.

## Reporting and decision rules

Aggregate by event and UTC day. The initial admin view reports only event/day account counts. It does not yet calculate conversion rates, retention cohorts, or confidence intervals; do not infer those from event/day totals. Suppress every event/day group with fewer than 20 distinct accounts. Do not segment by religion/tradition, mood, location, birth chart, or other sensitive attributes. Do not interpret raw opens or session frequency as spiritual progress.

The data model can support future version comparisons, but the current report does not expose version-level breakdowns. Do not draw retention conclusions until cohort reporting is separately scoped, privacy-reviewed, and implemented with the same 20-account suppression. Do not claim that the instrumentation represents all users while consent is opt-in.

The initial success criterion is operational: events are only accepted after recorded consent; withdrawal blocks new events and removes prior rows; API and database failures are visible in privacy-safe operational telemetry. Product changes should be evaluated against a user-benefit measure and error/abandonment rates. There is no target to increase notification volume or time spent. Startup/auth/request diagnostics are a separate operational telemetry system; they are not product-usage events and require their own privacy disclosure, access, retention, and aggregation review.

## Rollout sequence

1. Review the consent wording with the privacy owner and confirm it matches the published privacy notice and store disclosures.
2. Apply the migration through the normal backend release process; verify functions, grants, RLS, purge schedule, and contract tests in staging.
3. Ship the Native control default-off. Confirm the toggle stays unavailable against an older backend and is usable after deployment.
4. Opt in only internal testers. Verify one event, duplicate suppression, account isolation, opt-out deletion, post-opt-out rejection, and account deletion in staging.
5. Review aggregate quality and deletion behavior before inviting broader opt-in. Never backfill events from old logs or infer past consent.
