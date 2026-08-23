# Antigravity Vrat Prompt 2: Canonical Native Today, Identity, and Deep Links

**Do not execute this prompt until Prompt 1 receives independent approval.** Prompt 1's migration must remain unapplied to production until its transaction and real-Postgres verification are complete.

When unblocked, run only this prompt. Do not push, deploy, apply migrations, begin notification work, or touch unrelated files. The execution contract in `docs/ANTIGRAVITY_VRAT_SYSTEM_PARITY_PROMPTS.md` remains binding.

## Objective

Remove Native's remaining parallel Vrat-day decision path. Make Today, detail identity, routing, diagnostics, alternatives, and action availability derive exclusively from the canonical calendar API while preserving platform-native UX.

## Verify Current Baseline Before Editing

1. `app/vrat.tsx` still imports and runs `calculatePanchang`, `getTithiReminder`, and `tithiIndexToVratId` to create `todayVrat`.
2. Canonical `/api/calendar/upcoming` results already carry occurrence ID, civil date, status, `isPrimary`, alternatives, diagnostics, reasons, profile, location, and routes.
3. Observation CTA now uses a canonical occurrence-only contract. Preserve it; do not weaken or duplicate eligibility.
4. The local `Set reminder` implementation still schedules the next device-local 06:00 rather than the selected canonical occurrence date.
5. Native currently uses one `/vrat` hub/reader state surface rather than an identity-addressable detail route.
6. Home, notifications, carousel/spotlight rows, and internal links may still route to generic `/vrat` rather than a stable slug plus occurrence identity.
7. PWA detail routes exist at `/vrat/[id]`; verify whether a real PWA `/vrat` index now exists before changing web routing.

Print exact file/line evidence and both repository statuses before editing. If current code differs, report the drift and adapt without inventing a new contract.

## Required Architecture

### 1. Canonical Today only

- Delete Vrat-day attribution based on `calculatePanchang(new Date())`, `getTithiReminder`, and `tithiIndexToVratId` from Native Vrat surfaces.
- Local Panchang calculations may remain only where they display informational astronomical facts; they must never select a Vrat, date, reminder, observation, or route.
- Determine Today exclusively from canonical `/api/calendar/upcoming` output for the authenticated/guest request context.
- Match the API-provided canonical spiritual date and require exactly one `status === 'resolved'`, `isPrimary === true` occurrence.
- If no canonical occurrence exists today, render an intentional empty Today state. Do not substitute a client calculation or catalogue guess.

### 2. Typed occurrence contract

- Replace `any` from Native occurrence, alternatives, reasons, diagnostics, source references, route fields, and response handling.
- Mirror the complete `ClientObservanceResult` contract in one Native module or generate it from a shared contract if the repository already supports that safely.
- Preserve opaque occurrence ID, `festivalId`, slug/route slug, civil date, profile, tradition/sampradaya, location, status, candidate dates, alternatives, diagnostics, reasons, source references, and `isPrimary`.
- Unknown or newly added server fields must not silently authorize actions.

### 3. Identity-addressable Native reader

- Add the Expo Router equivalent of `/vrat/[slug]` using established stack/header conventions.
- Pass occurrence identity separately from editorial slug when an exact dated occurrence is known.
- Resolve detail data from route parameters plus canonical cached/fetched results. Never rely on module-global or previous-screen selected state.
- Direct launch, notification tap, Home tap, upcoming-row tap, and internal link must all open the same exact detail.
- A catalogue-only slug may open educational content, but it must not inherit an occurrence date or enable date-sensitive actions.
- Back navigation must return predictably without duplicating reader screens.

### 4. State isolation

- Switching between two Vrats must clear the previous occurrence ID, civil date, alternatives, diagnostics, observation status, and loading state before the new request.
- Cancel stale API requests or identity-guard every response.
- Deep-linking directly into one reader must work after cold launch without first visiting `/vrat`.
- Preserve guest reader position when AuthGate opens.

### 5. Canonical disclosure UI

When supplied by the API, display using existing Shoonaya reader/dialog patterns:

- exact local civil/spiritual date;
- calendar-profile and location basis in concise form;
- alternative dates and sampradaya/tradition labels;
- unresolved/under-review status and candidate dates without presenting a final date;
- diagnostics such as latitude proxy, compressed night, vṛddhi tithi, and extended moonrise;
- typed source references and review status where appropriate.

Do not expose internal batch IDs, raw database errors, service metadata, or precise private coordinates. Essential text must remain readable and accessible.

### 6. Action gating

- Observation action must continue using the approved Prompt 1 helper and occurrence-only payload.
- Reminder action must not schedule “next 06:00.” Remove that scheduler.
- Until Prompt 3 implements canonical worldwide D0 workflows, show a truthful state tied to global Vrat/festival notification preference and OS permission, or route to notification settings.
- Unresolved, ambiguous, non-primary, stale, catalogue-only, fallback, withheld, or future occurrences cannot enable observation or reminder actions.

### 7. PWA index gap

- Verify whether `/vrat` currently resolves in PWA.
- If it still 404s, add a lightweight real index using the canonical editorial/card contract and existing PWA design system.
- Preserve `/vrat/[id]` SEO routes and avoid loading all long-form Vrat prose into the index client bundle.
- Do not redesign PWA detail pages in this prompt.

## Required Tests

Use production modules, not duplicate test helpers.

1. Today comes only from canonical server results.
2. No canonical Today produces the intentional empty state.
3. Client-calculated tithi cannot select a Vrat or enable an action.
4. Resolved primary Today opens the exact slug and occurrence ID.
5. Catalogue-only entry opens educational detail with no dated actions.
6. Two rapid detail selections cannot leak the first occurrence into the second.
7. Direct cold-start deep link resolves without prior hub state.
8. Home, notification, upcoming, and PWA links reach the correct identity.
9. Unresolved, ambiguous, under-review, non-primary, withheld, and alternative states disclose correctly and remain non-actionable.
10. Guest AuthGate preserves reader state.
11. Incorrect next-06:00 scheduling code is absent.
12. Native contract has no `any` on occurrence-critical fields.

## Verification Receipt

Run and report exact passed/failed/skipped counts for:

- targeted Native Vrat route/state/contract tests;
- Home and notification deep-link tests affected by the change;
- relevant PWA route/index tests if web changes;
- `npx tsc --noEmit` in every changed repository;
- `git diff --check` and `git status --short` in both repositories.

Perform a focused simulator smoke test only after tests pass:

- empty Today;
- canonical Today;
- upcoming detail;
- catalogue-only detail;
- rapid switch between two entries;
- direct deep link;
- guest AuthGate return.

Report screenshots or precise observed results. Do not build EAS or update production.

## Delivery

- One scoped commit per changed repository.
- Preserve unrelated dirty web files exactly.
- Report every touched file and why.
- Do not push.
- Do not begin Prompt 3.

Prompt 2 closes only when Native has no independent Vrat-date authority and every entry point resolves an exact, typed, canonical identity.
