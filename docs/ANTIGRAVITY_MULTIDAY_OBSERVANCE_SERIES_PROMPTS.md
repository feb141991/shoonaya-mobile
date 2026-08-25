# Antigravity: Canonical Multi-Day Observance Series

Run these prompts **sequentially**. Stop after each prompt and report its
verification receipt. Do not start the next prompt until the previous prompt
has been independently reviewed.

This work spans two repositories:

- Backend/PWA and canonical calendar ownership:
  `/Users/Business(C)/Sanatan Sangam/Shoonaya`
- Native application:
  `/Users/Business(C)/shoonaya-mobile`

Preserve every unrelated dirty file in both repositories. One scoped commit per
prompt. Do not push, deploy, apply a production migration, flip an engine flag,
materialise production occurrences, or send production notifications without
explicit approval.

## Execution Status — 2026-08-24 (revised)

Do not rerun completed prompts unless an independent review identifies a
regression.

| Prompt | Status | Remaining gate |
|---|---|---|
| 1. Naraka Chaturdashi | Migration applied to production 2026-08-24 (definition + Tier-1 golden fixture, no occurrence row yet, as designed) | Occurrence materialisation is blocked by an **unrelated pre-existing bug**: `materializeApprovedFixtures` processes the entire approved-fixtures manifest atomically, and a different, already-approved fixture (`guru-gobind-singh-gurpurab__2027__ujjain_india__unspecified`, approved 2026-08-19) has `profile.calendar: null`, which throws and blocks the whole manifest — including Naraka. Needs its own fix/decision before any approved fixture (not just Naraka) can be materialised through the proper tool. |
| 2. Observance-series contract | Complete | Verified byte-identical again 2026-08-24 |
| 3. Sourced daily content | Complete | Unratified deity, ritual, significance, and early Navratri titles remain `pending_source` and fail closed, confirmed still true 2026-08-24 |
| 4. Premium series cards | **Code-verified on PWA 2026-08-24**, native (Android/iOS) visual QA still outstanding | PWA: upcoming/active/concluding/same-date-cluster/Hindi/Punjabi/fail-closed-upcoming all confirmed correct via a real dev-server pass against the actual `VratCarousel` component (`src/app/qa-series/page.tsx`). **New finding**: an already-*active* series that becomes `under_review` renders nothing at all on Home (silently disappears) rather than showing the review-pending state — `isSeriesStartWithinWindow` only admits series that haven't started yet (`daysUntilStart >= 0`), so a mid-sequence break has no card at all. Native wasn't visually verified this pass (only a stale Release build with an embedded old JS bundle was available; a fresh build was judged too costly for this pass) — the underlying card-selection logic is byte-identical between web and native (confirmed earlier), so risk is lower than a cold check, but this is not a substitute for actually looking at it on device/simulator. Android untested. Dark mode, text scaling, and reduced-motion not verified on either platform this pass. |
| 5. Notifications and observation writes | **Core implementation done and verified against live data 2026-08-24** | Series-completeness gating implemented for both the notification cron (`fetchIncompleteSeriesOccurrenceIds`, canonical-profile proxy) and the observation-write path (`isOccurrenceObservableInItsSeries`, full per-user precision) — see `src/lib/calendar/observance-series-eligibility.ts`. Proven against real production data: the Diwali cluster is *currently* incomplete (Naraka has no occurrence row) and the gate correctly identifies all 4 existing sibling occurrences as suppressed. `vrat-reminder`/`festival-reminder` dry-run against production succeeded end-to-end with the new gate wired in. **Not done**: the 30-day multi-timezone dry-run (India/Bedford/New York/Sydney/DST), and real-device push evidence (no physical device access — simulator cannot prove this per this doc's own release gate). Expansion catalogue below. |

Naraka Chaturdashi is now an `included` canonical rule. Its ratified policy is
Krishna Chaturdashi prevailing through the full local Arunodaya window. The
Ujjain 2026-11-08 fixture is source-backed; Bedford 2026-11-07 is a computed,
location-qualified result. The migration registers the definition and fixture
but deliberately inserts no occurrence. **The migration is now applied to
production** (2026-08-24); occurrence materialisation is still blocked by the
unrelated Gurpurab fixture bug described above, so production still returns
no Naraka row for now.

## Prompt 5 Expansion Catalogue — generated 2026-08-24

Machine-derived from `packages/dharma-rules/src/festivals/{rules,series,
series-content}.json`. No new dates, prose, or series definitions were
written — gap report only, per Prompt 5's own scope.

| Tradition | Series | Mode | Gate |
|---|---|---|---|
| Hindu | Chaitra Navratri | daily journey | Rule (`chaitra-navratri-begins`) exists and is sourced, but evaluator `launch_status: deferred` — no occurrence rows possible until included |
| Hindu | Magha/Ashadha Gupt Navratri | daily journey | Rules exist, evaluator `deferred`, **and unsourced** (no `ratification_note`) — needs source before evaluator work is even worth doing |
| Hindu | Chhath Puja | daily journey (4 canonical children) | Rule (`chhath-puja`) exists, sourced, evaluator `deferred`; no per-child rule breakdown exists yet (single rule, not four) |
| Hindu | Ganeshotsav | festival period | `ganesh-chaturthi` itself is `included`/sourced/live today as a single occurrence; no begin/end rule pair exists for the full period through Anant Chaturdashi — needs rule authoring, not just a series wrapper |
| Hindu | Pitru Paksha | lunar period | No rule entry exists at all — blocked before the rule-authoring stage |
| Hindu | Holika Dahan + Holi | festival cluster | `holi` rule is `included`/sourced, but its own `ratification_note` flags an **unresolved content question**: whether the rule's date represents Holika Dahan or the following Rangwali Holi day. A 2-day cluster needs that resolved first — a council/product decision, not an engineering one |
| Hindu | Shravan Somvar | recurring series | Rule exists, evaluator `deferred`, unsourced. Also a shape mismatch: this is a weekly-recurring vrat, not a bounded multi-day journey — needs product framing for what "series" even means here before a gate matters |
| Hindu | Mangala Gauri | recurring series | Same profile as Shravan Somvar: rule exists, `deferred`, unsourced, same shape-mismatch question |
| Sikh | Hola Mohalla | festival period | No rule entry exists at all. Needs its own source track (SGPC), not the Rashtriya Panchang source already in use for Hindu content — flagged as a known gap earlier this session too |
| Buddhist | Vassa | season | Both `vassa-begins-rains-retreat` (sourced) and `pavarana-end-of-vassa` (**unsourced**) exist as rule stubs, both `deferred`. A real 3-month season needs both ends sourced and included before this is meaningful |
| Buddhist | Losar | festival period | Rule exists, `deferred`, unsourced. Also needs confirmation this is genuinely multi-day rather than a single new-year date — not established either way yet |
| Jain | Paryushana | 8-day daily journey | **Best-positioned candidate.** Both `paryushana-parva-begins` and `samvatsari-paryushana-ends` are `included`, sourced, and live today as individual occurrences. Only the `series.json` definition and `series-content.json` editorial rows are missing — no rule or sourcing work needed to start |
| Jain | Das Lakshana | 10-day daily journey | `das-lakshana-dharma-begins` exists but `deferred` and unsourced; only a "begins" rule exists, no end-date rule at all (Digambara profile) |

Kathina remains omitted for the India launch, consistent with the original
instruction — not evaluated here.

**Reading this table**: Paryushana is the only candidate where the source
and evaluator gates are already clear — it needs series/content authoring
only. Ganeshotsav and Holi are blocked on a specific, nameable next step
(a begin/end rule pair; a content dispute) rather than a broad "needs
sourcing." Everything else is blocked earlier, at the source or
rule-authoring stage, before series work would even be relevant.

## Binding Engineering Contract

Before every prompt, read:

- Backend `AGENTS.md`, `SHOONAYA_WORKFLOW.md`, and `SHOONAYA_RULES.md`
- Backend `docs/REVIEW_CHECKLIST.md`
- Backend `docs/calendar-domain-model.md`
- Backend `docs/festival-rule-schema.md`
- Backend `docs/source-governance.md`
- Backend `docs/CALENDAR_ENGINE_ASSESSMENT.md`
- Backend `docs/sources/rashtriya-panchang-saka-1948.manifest.md`
- Relevant `.claude/agents/` role files for calendar, Supabase, QA, product,
  ritual practice, and pramana/content review

Required behavior:

1. Inspect both repositories and the database contract before asserting parity.
2. Print every count and date conclusion from a committed one-command script.
3. A passing engine test is not religious approval.
4. Never fabricate a date, daily ritual, deity association, colour, mantra,
   source, or council decision.
5. Never derive canonical child dates with `startDate + N days` when tithi spans
   can contain kshaya or vrddhi behavior.
6. A series may contain two distinct observances on the same civil date. Never
   deduplicate by date alone.
7. Unresolved, disputed, deferred, withheld, unaudited, or unverified children
   must fail closed and must not trigger observation writes, karma, or push.
8. Backend owns dates and series identity. PWA and Native only render the typed
   contract.
9. Do not hand-edit Native vendored calendar packages. Re-vendor from canonical
   backend packages when a package release is required.
10. For every code change run targeted tests, TypeScript, `git diff --check`,
    `git status --short`, and backend `graphify update .`.

## Historical Starting Evidence

This was the baseline before Prompts 1–2. It is retained as an audit record,
not as current-state guidance:

- `naraka-chaturdashi`, `choti-diwali`, `chhoti-diwali`, `kali-chaudas`, and
  `roop-chaudas` currently have no canonical `observance_definitions` row and no
  stored occurrence.
- The current Diwali cluster contains `dhanteras`, `diwali`,
  `govardhan-puja`, and `bhai-dooj`.
- The Tier-1 Rashtriya Panchang evidence already names **Naraka Chaturdasi
  (Purvarunodaya)** alongside Dipavali for 2026-11-08. This evidence was attached
  to the `diwali` fixture, not modelled as a distinct observance.
- Diwali is evaluated by Amavasya touching pradosha. Naraka Chaturdashi is a
  distinct Chaturdashi/pre-dawn ownership question and must not be implemented
  as `diwali - 1 day`.
- Sharad Navratri already has a real `lunar_tithi_span` and ten child
  sub-observances, but the API and cards flatten those children into unrelated
  single-date cards.

---

## Prompt 1: Prove and Model Naraka Chaturdashi Without Publishing It

### Objective

Create a sourced, data-defined Naraka Chaturdashi rule and prove its evaluator
behavior in shadow/test paths. Do **not** publish or materialise it to production.

### Required audit before editing

1. Programmatically search canonical rules, definitions, migrations, live
   occurrence rows, PWA content, Native content, notification filters, and route
   aliases for every known name:
   - Naraka Chaturdashi / Naraka Chaturdasi
   - Choti/Chhoti Diwali
   - Kali Chaudas
   - Roop Chaudas
2. Inspect the user-provided source PDF at:
   `/Users/princesharma/Downloads/RP 1948 SE Final.pdf`
   and reconcile it with
   `docs/sources/rashtriya-panchang-saka-1948.manifest.md`.
3. Print a machine-generated baseline showing rule count, definition count,
   occurrence count, and aliases found. No narrative-only conclusions.
4. Trace Diwali and Dhanteras through rule data, evaluator, materialiser,
   occurrence storage, formatter, API, PWA, Native, notifications, and ICS export.

### Required implementation

1. Add one canonical identity: `naraka-chaturdashi`. Treat regional names as
   aliases/display metadata, not duplicate observances.
2. Represent the rule in versioned rule data using the existing condition
   vocabulary. The source states `Purvarunodaya`; determine whether the correct
   evaluator expression is `at`, `touches`, or another already-supported policy
   from the specifications and source evidence. Do not guess.
3. The intended domain ingredients to verify are:
   - Ashwin/Kartika naming under the explicitly stated month system
   - Krishna paksha
   - Chaturdashi
   - pre-dawn/arunodaya ownership
4. Do not add a slug-specific date calculation or a fixed Gregorian offset.
5. If the production evaluator still requires hardcoded `EVALUATOR_RULES`, do
   not add another permanent hardcoded entry silently. Either consume the
   conditions from versioned rule data through the generic evaluator, or record
   a narrowly scoped transitional duplicate in the assessment with an explicit
   retirement gate and test both paths for equality.
6. Add typed Tier-1 source metadata with exact publication, page/index, and
   source wording. Do not reuse the Diwali source reference as an untyped label.
7. Keep publication/review state fail-closed. Existing approval of the Diwali
   fixture does not automatically approve a newly separated Naraka rule.
8. Add aliases to the canonical Vrat content resolver only after identity is
   fixed. Do not duplicate the full content object in both repositories.

### Required tests

- 2026 Ujjain resolves Naraka Chaturdashi to the RP-sourced civil date.
- Naraka Chaturdashi and Diwali can resolve to the same civil date while
  remaining two distinct identities.
- Reverting the Naraka evaluator condition makes the golden test fail.
- A date-only map/set does not collapse the pair.
- Null/ambiguous evaluator output enters review flow and cannot publish.
- Ujjain and Bedford use their own coordinates/timezones as one unit.
- DST, year boundary, adhika masa, kshaya tithi, and vrddhi tithi are either
  exercised or explicitly reported `not-applicable-because` under the review
  checklist.
- Existing Diwali, Dhanteras, Govardhan Puja, and Bhai Dooj dates do not move.
- `masaName`, engine flags, locked rows, and manual overrides remain unchanged.

### Verification receipt

Report:

- Exact generated baseline and post-change inventory
- Source extraction evidence and checksum/page reference
- Evaluator reasons and diagnostics, not only the final date
- Passed/failed/skipped counts for every suite
- `npm run validate:rules`
- `npm run verify:calendar`
- `npm run verify:harness`, with baseline reconciliation if it changes
- `npx tsc --noEmit --pretty false`
- `git diff --check`
- Every touched file, including out-of-scope files
- Explicit statement: production DB and flags untouched
- REVIEW_CHECKLIST section-by-section sign-off

Stop after Prompt 1.

---

## Prompt 2: Create the Canonical Observance-Series Contract

### Objective

Create a backend-owned `ObservanceSeries` read contract that preserves the
canonical child occurrences and supports four distinct modes:

- `daily_journey`
- `festival_cluster`
- `season`
- `recurring_series`

Do not build the visual cards yet.

### Required contract

The exact naming may follow repository conventions, but the contract must carry:

```ts
type ObservanceSeries = {
  seriesKey: string;
  definitionKey: string;
  mode: 'daily_journey' | 'festival_cluster' | 'season' | 'recurring_series';
  name: string;
  tradition: string;
  profile: { calendar: string; tradition: string };
  location: { label: string; lat: number; lon: number; tz: string };
  status: 'upcoming' | 'active' | 'concluding' | 'complete' | 'under_review';
  startDate: string | null;
  endDate: string | null;
  currentDay: number | null;
  totalDays: number | null;
  children: Array<{
    occurrenceId: string;
    slug: string;
    civilDate: string | null;
    sequence: number;
    title: string;
    routeKind: string | null;
    routeSlug: string | null;
    status: string;
    diagnostics: string[];
    sourceRefs: SourceReference[];
    editorial?: {
      deityOrTheme?: string | null;
      rituals?: string[];
      colour?: string | null;
      mantraId?: string | null;
    };
  }>;
  diagnostics: string[];
  sourceRefs: SourceReference[];
  versions: Record<string, string>;
};
```

### Architecture requirements

1. Decide whether persisted parent/cluster identity needs a new column or table,
   or can be derived losslessly from versioned rule data plus existing occurrence
   identity. Prove the decision against reruns, variants, recurring instances,
   and two children sharing one date.
2. Do not overload `series_instance_key` without proving its current semantics.
3. The API must never derive canonical dates from editorial content.
4. The client must never infer membership from names such as `includes('navratri')`.
5. A missing/unresolved required child makes the series incomplete or
   `under_review`; it must not be silently shortened and relabelled “Day 4 of 8.”
6. Current day must be resolved from the user’s local spiritual date and the
   canonical child sequence, not milliseconds divided by 86,400,000.
7. Preserve individually addressable child routes and observation identities.
8. Keep single observances on the existing `ClientObservanceResult`; do not force
   every festival into a series wrapper.

### Pilot data

- `daily_journey`: Sharad Navratri
- `festival_cluster`: Diwali, including Naraka Chaturdashi only after Prompt 1
  is reviewed and approved
- Do not activate Jain/Buddhist series yet

### Required tests

- Sharad Navratri includes all canonical children in sequence, including real
  kshaya/vrddhi handling.
- Diwali retains distinct Naraka and Diwali children when dates coincide.
- Missing child, duplicate sequence, duplicate identity, unresolved child,
  profile mismatch, location mismatch, cross-year series, DST, and date-line
  cases fail safely.
- Same civil date does not imply same occurrence.
- PWA and Native generated/shared DTO types agree.
- Existing `/api/calendar/upcoming`, day, and month consumers remain compatible.

Stop after Prompt 2.

---

## Prompt 3: Add Sourced Daily Content Without Fabrication

### Objective

Create one canonical editorial series-content model and populate only content
supported by approved sources.

### Required scope

1. Sharad Navratri daily children:
   - day/sequence
   - canonical title
   - Devi form where sourced
   - sourced ritual labels
   - optional colour/mantra only when the applicable year/region/tradition and
     source are explicit
2. Diwali cluster:
   - Dhanteras
   - Naraka Chaturdashi
   - Diwali/Lakshmi Puja
   - Govardhan Puja
   - Bhai Dooj
3. Do not describe a five-entry cluster as five distinct civil dates. Preserve
   same-day children.
4. Generate a versioned Native offline snapshot from backend-owned content;
   never resume manual dual editing of `lib/vrat-data.ts` copies.
5. Hindi/Punjabi/localised content must preserve source and translation status.

### Explicit exclusions

- No invented “colour of the day.” These conventions can change by year and
  publisher and must not be presented as universal without a source-qualified
  schedule.
- No invented daily mantras, fasting severity, health advice, or ritual steps.
- No Jain/Buddhist/Sikh daily series content until its own source gate passes.

### Required proof

- Machine-generated parity report for backend and Native content keys
- Missing-field report by child and language
- Rights/source metadata report
- Negative retrieval test proving one child cannot receive another child’s copy
- Typecheck, lint, tests, diff check, graph update, and dirty-file accounting

Stop after Prompt 3.

---

## Prompt 4: Build Premium PWA and Native Series Cards

### Mandatory preflight

1. Read the canonical backend contract and generated Native snapshot. Prove they
   are byte-identical with `npm run verify:native-observance-series-contract`.
2. Consume `currentCivilDate` and `activeChildOccurrenceIds`; do not reduce an
   active date to `currentDay` or a single child.
3. Render editorial fields only through a shared status/applicability guard.
   `pending_source` and `withheld` must never appear. A
   `council_reviewed_editorial` field without `reviewRef` also remains hidden.
4. Use the occurrence title as the safe fallback when an editorial title is
   withheld. Never substitute another child's content.
5. Trace the real Home data path in each repository and prove `series` reaches
   the card. Do not construct series membership, dates, progress, or active
   children in UI code.

### Objective

Render platform-appropriate cards from the canonical series DTO without changing
unrelated Home, Hero, navigation, or profile surfaces.

### Required states

For `daily_journey`:

- Upcoming: `Sharad Navratri · 9 sacred nights · begins in 2 days`
- Active: `Day 4 of 9 · Maa Kushmanda`
- Concluding: `Vijayadashami · concludes today`

For `festival_cluster`:

- Upcoming: `Diwali festival · five observances · begins in 2 days`
- Active: today’s child plus a compact cluster progress indicator
- Same-day children: both visible and independently addressable

For `under_review` or incomplete series:

- Do not show final progress, celebratory language, observation actions, or a
  guessed active child.
- Show one restrained unavailable/review state with diagnostics accessible to
  the user; preserve independently valid single-observance cards.

For `season`:

- Start/end and meaningful phase only; never render `Day 37 of 90`

For `recurring_series`:

- `3 of 5 Shravan Mondays observed`, not a contiguous date-range progress bar

### UX requirements

1. PWA uses its established horizontal carousel behavior.
2. Native uses a virtualized/paged card implementation only if more than one
   card is actually shown; preserve 44px targets and platform scrolling.
3. The active child is the visual focus; the entire series must not become a
   giant dashboard card.
4. No decorative animation. Restrained content transition only, reduced-motion
   safe.
5. Light/dark, Hindi/Punjabi/English, text scaling, loading, cached, offline,
   unresolved, incomplete, empty, and error states.
6. No layout shift when a single card becomes a series card.
7. Accessibility labels include series name, current child, sequence, and status.
8. PWA must wire the series DTO into the existing Home carousel rather than only
   declaring an unused component.
9. Native must wire the series DTO through the existing Home summary state into
   `SacredDaysCard` (or a narrowly extracted sibling). Call hooks unconditionally
   before any series/single-observance render branch.
10. Preserve the existing single-observance spotlight when no publishable series
    exists. Do not redesign unrelated Home cards or navigation.

### Required tests

- PWA and Native: upcoming, active, concluding, complete, under-review, missing
  child, and empty states.
- Diwali 2026-11-08 exposes and routes both Naraka Chaturdashi and Diwali by
  their distinct occurrence IDs.
- Pending editorial copy and region-mismatched rituals do not render.
- Source-backed localized titles render in English, Hindi, and Punjabi with
  English fallback only when the requested translation is unavailable and not
  marked pending.
- Switching between a single observance and a series does not alter hook order.
- Existing Home request count and API shape remain unchanged.

### Visual verification

Capture and compare PWA, Android, and iOS at compact and large text sizes for:

- Navratri before start, active middle day, and concluding day
- Diwali where Naraka and Diwali share the same civil date
- incomplete/under-review series
- dark and light mode

Stop after Prompt 4.

---

## Prompt 5: Series Notifications, Observation Writes, and Expansion Gate

### Objective

Integrate series-aware notifications and observation writes without duplicating
existing D-7/D-1/D0 delivery or awarding progress for unopened/unverified days.

### Notification requirements

1. Trace eligibility through canonical occurrence, publication/review state,
   user tradition/profile, timezone, quiet hours, preference, OS permission,
   token, provider ticket, receipt, and tap route.
2. Keep child occurrence IDs in dedupe keys. A series key alone would suppress
   later days.
3. When two children share a date, preserve both in-app identities. Define and
   test an explicit push policy:
   - one bundled OS notification with both names, or
   - two intentionally separate notifications
   Never let accidental dedupe choose.
4. D0 remains same-local-day. Pre-series and next-day guidance are separate keys.
5. Taps must open the exact child inside the series reader.
6. Observation writes remain occurrence-ID based, atomic, and idempotent.

### Expansion catalogue and gates

After the pilots are proven, produce a generated readiness table for:

| Tradition | Series | Mode | Gate |
|---|---|---|---|
| Hindu | Chaitra Navratri | daily journey | full sourced span |
| Hindu | Magha/Ashadha Gupt Navratri | daily journey | source + council |
| Hindu | Chhath Puja | daily journey | four canonical children |
| Hindu | Ganeshotsav | festival period | start/end + regional semantics |
| Hindu | Pitru Paksha | lunar period | canonical child/phase model |
| Hindu | Holika Dahan + Holi | festival cluster | explicit sourced pairing |
| Hindu | Shravan Somvar | recurring series | evaluator/publication gate |
| Hindu | Mangala Gauri | recurring series | evaluator/publication gate |
| Sikh | Hola Mohalla | festival period | SGPC/source-qualified model |
| Buddhist | Vassa | season | Buddhist tradition profiles |
| Buddhist | Losar | festival period | Tibetan calendar authority |
| Jain | Paryushana | 8-day daily journey | Shvetambara profile + source |
| Jain | Das Lakshana | 10-day daily journey | Digambara profile + source |

Kathina remains omitted for the India launch and externally curated if revisited.
Do not invent a Sikh multi-day sequence merely to create visual parity; most
Gurpurabs remain correct as single observances.

### Final release gate

- No production migration or materialisation without explicit approval
- Shadow/Supabase branch migration proof and rollback
- PWA and Native contract tests
- Notification dry-run for 30 days across India, Bedford, New York, Sydney, and
  a DST boundary
- No duplicate or missing notification when children share a civil date
- Android and iOS real-device push evidence before release-ready claim
- Exact passed/failed/skipped counts and REVIEW_CHECKLIST sign-off

Stop after Prompt 5 and request an independent review before rollout.
