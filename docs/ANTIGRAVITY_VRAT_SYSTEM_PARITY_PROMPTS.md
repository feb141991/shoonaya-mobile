# Antigravity: Vrat System Correctness, Content, Notifications, and Native/PWA Parity

Run these prompts **sequentially**. Execute exactly one numbered prompt per Antigravity run. Do not combine prompts or begin the next prompt until the current diff, tests, evidence, and scoped commit have been independently reviewed.

## Antigravity Execution Contract

These instructions bind every numbered prompt below.

1. **Work from evidence, not this plan's assumptions.** Before editing, read the named implementation, its callers, its tests, current migrations, and `git status --short` in both repositories. Reproduce every claimed defect where feasible. If current code contradicts this document, stop and report the exact drift with file/line evidence before choosing a new design.
2. **One prompt, one scope, one commit.** Do not perform cleanup, visual redesign, dependency upgrades, schema refactors, calendar-rule changes, or adjacent feature work unless the active prompt explicitly requires it. Never bundle another task's dirty files into the commit.
3. **Do not invent contracts.** Reuse existing route names, database vocabulary, review states, theme tokens, navigation patterns, authentication helpers, and notification infrastructure after verifying them in source. If a required contract does not exist, define it explicitly, test it, and document the migration rather than fabricating a convenient field or endpoint.
4. **Do not invent spiritual or editorial content.** Never fabricate dates, parana windows, mantras, translations, citations, ritual instructions, fasting rules, health claims, source tiers, rights status, council approval, or review state. Missing evidence must produce a withheld/unavailable state or a council work item.
5. **Preserve user trust boundaries.** Derive user identity server-side. Keep private/profile-qualified data out of shared caches. Never expose service credentials, individual observer identities, another user's profile, or precise private location.
6. **Parity means equivalent product capability, content contract, state handling, and quality.** It does not mean copying DOM composition, CSS, Framer Motion, or every PWA dimension into Native. Native presentation must use established Shoonaya React Native primitives and platform-appropriate behavior while preserving the same information and actions.
7. **Prefer the existing stack.** Use current React Native animation, audio/TTS, image, cache, list, routing, haptic, and reduced-motion infrastructure. Do not add Reanimated, MMKV, a query library, a new audio package, or another dependency without measured evidence that the current stack cannot meet the requirement and explicit user approval.
8. **Fail closed.** Unresolved, disputed, withheld, fallback, inactive, unaudited, unverified, stale-identity, or incomplete-profile data must never silently become a final date, reminder, observation, seeker count, karma award, or authoritative practice instruction.
9. **Do not weaken verification.** Never loosen assertions, replace real integration coverage with mocks, update snapshots blindly, hide skipped tests in a passed-only total, or change calendar baselines merely to make a prompt green. Report passed, failed, and skipped counts separately.
10. **Stop instead of guessing** when source rights, council decisions, production environment values, credentials, schema state, user-facing copy, route ownership, or parallel uncommitted edits cannot be established safely.

### Required Start Report

Before editing, print:

- active prompt number and its exact scope;
- both repository HEADs and `git status --short`;
- files expected to change;
- facts reproduced from current code;
- assumptions still requiring proof;
- explicit non-goals for this run.

### Required Completion Report

Before committing, print:

- every changed file and why it changed;
- before/after behavioral evidence;
- exact test/typecheck/lint/build commands and passed/failed/skipped results;
- database migration state: local, shadow/branch, production applied or unapplied;
- deployment state: committed, pushed, deployed, or intentionally pending;
- residual risks, device/manual checks, and next prompt gate;
- proof that unrelated dirty files were not staged.

If the active prompt cannot meet its completion criteria, do not claim it is complete and do not begin the next prompt.

### Operator Command For Each Run

Use this command, replacing `N` with the next reviewed prompt number:

> Open `/Users/Business(C)/shoonaya-mobile/docs/ANTIGRAVITY_VRAT_SYSTEM_PARITY_PROMPTS.md`. Execute **Prompt N only**. Treat the Antigravity Execution Contract and Shared Rules as binding. Begin with the Required Start Report, verify every baseline claim against current source, implement only the active prompt, run its required proof, produce the Required Completion Report, and create one scoped local commit. Do not execute another prompt, push, deploy, apply a production migration, change production environment values, or trigger a production notification without explicit approval.

## Current Verified Baseline

- PWA/backend repository: `/Users/Business(C)/Sanatan Sangam/Shoonaya`
- Native repository: `/Users/Business(C)/shoonaya-mobile`
- PWA editorial Vrat catalogue: **49 entries** (`10` recurring + `39` named).
- Native editorial Vrat catalogue: **18 entries** (`8` recurring + `10` named).
- Only **17 entries overlap exactly**. Native `chaturthi` has drifted from PWA, and native is missing 31 PWA entries.
- PWA Home has a swipe carousel of up to five observances inside a three-day window.
- Native Home has one nearest-observance `SacredDaysCard`, not the PWA carousel.
- Native has a `/vrat` hub and inline reader. PWA has `/vrat/[id]` readers but no real `/vrat` index page.
- Native uses the canonical `/api/calendar/upcoming` endpoint for upcoming rows, but still derives the Today card from an independent instant-tithi calculation.
- Native `apiFetch` sends Bearer auth. `/api/vrat/observe` currently reads cookie auth only.
- Native `Set reminder` currently schedules the next 06:00 local time, not the selected occurrence date.
- Backend festival and Vrat reminders currently send only at **D-7** and **D-1**. They do **not** send on D0.
- Existing Vercel Workflow code covers test notifications and receipt checks; festival/Vrat reminder delivery itself is still cron-driven.
- Both reminder crons run once per UTC day while filtering for a local-hour window. This cannot cover all world timezones reliably.

Treat these as hypotheses to verify against current code at the start of the relevant prompt. If the code has changed, report the drift before editing.

## Shared Rules For Every Prompt

- Inspect `git status --short` in both repositories before editing. Parallel work is expected. Never overwrite, reformat, stage, revert, or commit another task's changes.
- Stop and report if an intended file has overlapping uncommitted changes that cannot be preserved safely.
- Read current code, migrations, tests, and API contracts before implementation. Do not implement from this document alone.
- Keep calendar dates sourced from reviewed, verified, audited, published canonical occurrences. Never recreate festival/Vrat dates in UI code.
- Never publish, notify, or award karma for unresolved, withheld, disputed, fallback, inactive, or unreviewed occurrences.
- Preserve calendar profile, sampradaya, location, timezone, publication status, review diagnostics, and variant identity.
- Do not change Panchang calculation rules, `masaName`, materialisation flags, or council decisions in this work.
- Do not add fabricated scripture, mantra, ritual instruction, citation, translation, or rights metadata.
- Do not expose service-role credentials to web or native clients.
- Supabase schema work must be additive, RLS-protected, migration-backed, rollback-documented, tested on a branch/shadow database first, and never applied to production without explicit user approval.
- Use `getApiUser(req)` for routes shared by cookie-authenticated PWA and Bearer-authenticated native clients.
- Preserve PWA browser push while using Expo push for native. Do not restore the OneSignal native SDK.
- Respect notification preferences, OS permission, local timezone, quiet hours, DST, deduplication, delivery receipts, and dead-token pruning.
- Use existing Shoonaya components, tokens, `SacredIcon`, reader primitives, haptics, and reduced-motion behavior. Do not redesign unrelated Home, Hero, Bottom Nav, Panchang, or Settings surfaces.
- Treat PWA/Native parity as feature, content-contract, navigation, accessibility, and state parity with platform-native presentation. Do not promise literal component or pixel identity.
- Minimum touch target: 44x44. Do not use 9–11px essential text. No content-driven layout shift.
- Do not add a dependency unless the prompt explicitly proves the existing stack cannot satisfy the requirement and the user approves it.
- Run relevant targeted tests and `npx tsc --noEmit` in every changed repository.
- Report every changed file, including changes outside scope. One scoped commit per prompt. Do not push until asked.

---

## Prompt 1: Replace The Vrat Observation Write Path With A Canonical, Atomic Contract

Fix observation tracking end to end before doing any visual work.

### Problems to prove first

1. Native calls `/api/vrat/observe` through Bearer-authenticated `apiFetch`, while the route currently uses cookie-only `createServerSupabaseClient().auth.getUser()`.
2. Any static Vrat reader can currently offer `Mark as Observed` even when that Vrat is not a canonical occurrence for the user's local spiritual date.
3. The current check-then-upsert-then-karma sequence is not one atomic transaction. Two concurrent requests can both reach karma award logic.
4. Observation data is stored in the generic `recommendations` table rather than an occurrence-qualified ledger.

### Required architecture

1. Establish a canonical `vrat_observations` ledger or an equivalently explicit existing table. It must identify:
   - authenticated user;
   - canonical occurrence/definition identity;
   - observance slug;
   - local spiritual date and timezone used;
   - calendar profile, tradition/sampradaya, and variant identity where applicable;
   - observed timestamp;
   - karma-award state.
2. Add a uniqueness rule that makes one observation and one karma award idempotent for the same user and canonical occurrence.
3. Add an atomic server-side operation that validates the occurrence is active, published, reviewed, verified, audited, not withheld/disputed, and valid for the user's resolved profile/date before inserting and awarding karma exactly once.
4. Use `getApiUser(req)` for both GET and POST. Never trust a request-body user ID, date, profile, karma value, or review state.
5. Return a typed response used identically by PWA and native.
6. Preserve prior history. If existing `vrat_obs:*` recommendation rows are migrated, make the migration deterministic and auditable. If they cannot be safely occurrence-matched, retain them as legacy history without inventing occurrence IDs.
7. RLS must limit users to their own observation rows. Privileged mutation must not become publicly executable accidentally.
8. Hide or disable `Mark as Observed` when no canonical occurrence is valid today. Browsing educational content must not award karma.
9. Guest attempts must use the existing AuthGate behavior without losing reader state.

### Tests and proof

- Cookie auth and Bearer auth both work.
- Unauthenticated, cross-user, unpublished, unresolved, disputed, wrong-date, wrong-profile, and arbitrary-slug submissions fail closed.
- Two concurrent POSTs produce one row and one karma award.
- Existing observation returns an idempotent success with zero additional karma.
- GET returns the correct user's count/history without leaking another user.
- Migration rollback is documented and tested on a shadow/branch database.
- Typecheck both repositories.

Stop after the scoped commit and report whether a production migration remains unapplied.

---

## Prompt 2: Make Native Today, Detail Identity, And Deep Links Canonical

Remove the remaining parallel date decision and make every card open the exact observance it represents.

### Required work

1. In native `app/vrat.tsx`, stop deriving `todayVrat` from `calculatePanchang(new Date())`, `getTithiReminder`, or `tithiIndexToVratId`.
2. Derive Today exclusively from the already-fetched canonical `/api/calendar/upcoming` result using the user's local spiritual date, resolved calendar profile, tradition/sampradaya, location, and `isPrimary` result.
3. Keep local Panchang calculations only for informational Panchang facts, never for festival/Vrat day attribution.
4. Preserve the full typed `ClientObservanceResult` in native. Remove `any` from occurrence, alternative, reason, diagnostic, and route handling.
5. Fix stale selected-occurrence state: opening Today or a catalogue item must never retain a prior occurrence's date, alternatives, or review notice.
6. Add exact native Vrat routes (`/vrat/[slug]` or the current Expo Router equivalent) and restructure the hub safely if needed. Home, notification, and upcoming rows must deep-link to the exact slug/occurrence, not generic `/vrat`.
7. Make status, candidate dates, alternatives, diagnostics, source references, exact local date, and profile/location basis visible when supplied by the canonical result.
8. An unresolved occurrence may show an educational detail surface but must not present a final date, reminder CTA, or observation CTA.
9. Remove the device-local “next 06:00” reminder implementation. Until Prompt 3 is complete, replace it with an accurate disabled state or route to notification preferences; do not leave a knowingly wrong scheduler.
10. Add a real PWA `/vrat` index route so existing `/vrat` links and breadcrumbs do not 404. Keep detail SEO routes intact.

### Tests

- Sunrise/profile-sensitive Today selection comes from server data only.
- No canonical Today occurrence produces the empty Today state.
- Upcoming, Home, notification, and PWA links resolve to the correct slug.
- Switching between two details cannot leak selected-occurrence state.
- Unresolved and alternative-date states render without enabling invalid actions.
- Typecheck both repositories.

---

## Prompt 3: Add Worldwide D0 Festival And Vrat Notification Workflows

Implement same-day notifications and remove the single-UTC-cron timezone coverage gap.

### Current behavior to verify

- `festival-reminder` and `vrat-reminder` only send when `daysAway` is `7` or `1`.
- Vrat cron runs once at 04:30 UTC and festival cron once at 05:30 UTC.
- Both filter users by a local 09:00 window, so one daily invocation cannot cover Europe, the Americas, Australia, and all Asian timezones.
- Existing workflows cover test push and receipt checking, not observance delivery.

### Required delivery contract

1. Support **D-7, D-1, and D0** for both eligible festivals and eligible Vratas.
2. D0 copy must be distinct and useful:
   - Vrat: “Today is {name}” plus one short, sourced preparation/practice cue.
   - Festival: “Today is {name}” plus tradition-appropriate observance copy.
3. D0 must create both the in-app notification row and the native/PWA push, using an exact canonical action route. Preserve the canonical observance kind in notification metadata; do not keep labelling Vrat deliveries as generic `festival` notifications merely because the legacy cron does so.
4. Continue to source only reviewed, verified, audited, published occurrences and apply withheld/disputed protection immediately before send.
5. Replace single-UTC-run local-window filtering with a durable timezone-safe design using the installed Workflow system:
   - a dispatcher may plan the next delivery horizon;
   - group work by effective send instant/timezone and message identity rather than spawning uncontrolled per-user workflows;
   - workflow sleep must not consume compute;
   - every send step must recheck publication state, user preference, token state, quiet hours, and dedupe immediately before insertion/delivery.
6. Use local target times appropriate to the action. Default to an early local morning for D0 Vrat and a local morning for D0 festival, but centralize these as documented product constants. Quiet hours must defer to the first allowed morning time or suppress after a documented cutoff; never silently send at an arbitrary UTC hour.
7. Dedupe keys must distinguish D-7, D-1, and D0 while preventing cron/workflow overlap. Existing legacy `tithi:*` and occurrence-backed categories must remain hard-cut-over to avoid double pushes.
8. After sending, reuse the durable receipt-check step, audit delivery, retry only retryable failures, and prune `DeviceNotRegistered` tokens.
9. Keep the existing crons as an explicitly documented safety net for one release only if both paths share the same dedupe key. Add a removal criterion and do not allow double delivery.
10. Update the Cron Control/admin dry-run preview to show the next 14 days including D0 rows, local send time, timezone, audience, route, source status, and notification key.
11. Native Vrat detail must show truthful reminder state based on the user's global festival/Vrat preference and OS permission. Do not recreate local per-screen schedules.

### Required timezone tests

Cover at least:

- `Asia/Kolkata`
- `Europe/London` in GMT and BST
- `America/Los_Angeles` in standard and daylight time
- `Australia/Sydney` in standard and daylight time
- a user whose quiet hours overlap the default target
- a user changing timezone after dispatch but before send
- D-1 and D0 crossing opposite sides of the UTC date boundary

Prove one in-app row and one push attempt per user/key, correct tap routing, and no send for opted-out or unresolved occurrences.

---

## Prompt 4: Create One Canonical Vrat Content Contract For PWA And Native

Eliminate the two handwritten catalogues without putting long-form content into Home bundles.

### Required model

Create one typed canonical editorial model, separate from occurrence dates and user observations. At minimum it must support:

- stable slug and aliases;
- tradition, optional sampradaya, region/family applicability, and observance kind;
- localized field maps rather than `nameLocal`/`mantraLocal` all-or-nothing switches;
- card title, card summary, significance, practice guidance, mantra, transliteration, meaning, fasting options, food guidance, puja items, katha link, and artwork key;
- typed `sourceRefs` with source tier, title, author/editor, publisher, edition/page/section, URL, rights status, and verification state;
- editorial review status, content version, last-reviewed date, and `is_live_in_app`;
- explicit health-safety copy and non-fasting devotional alternatives;
- no static Gregorian date or generic static parana clock time.

### Architecture

1. Keep evergreen editorial content (`VratDefinition`) separate from canonical dated occurrence data (`ObservanceOccurrence`) and user state (`VratObservation`).
2. Build a lightweight Vrat-card DTO and a richer detail DTO. Home must never import or download every long-form article.
3. Extract route/alias resolution from the 1,535-line PWA content module so `VratCarousel` does not pull the complete long-form catalogue into its client bundle merely to resolve links.
4. Expose authenticated/anonymous-safe backend reads with cache rules appropriate to global editorial content and private profile-qualified occurrence data.
5. Generate a versioned native offline snapshot from the same canonical source. The snapshot is a fallback, not a second authoring location. Add a deterministic parity/hash check so manual drift fails CI.
6. Preserve offline reading for content already downloaded. Clearly label timing/date data stale when it cannot be refreshed.
7. Do not silently serve the current generic fallback as verified content. Unknown slugs should render a safe unavailable state and remain observable in diagnostics.

### Migration proof

- Inventory the current 49 PWA and 18 native entries.
- Prove all 17 exact overlaps remain byte/field-equivalent after migration.
- Resolve the divergent `chaturthi`/`sankashti-chaturthi` identity intentionally rather than overwriting one.
- Prove Home's shipped client bundle no longer contains all long-form Vrat prose.
- Typecheck both repositories and run deterministic snapshot parity tests.

---

## Prompt 5: Audit And Optimize All Vrat Editorial Content

Review content quality after Prompt 4 creates a source-aware contract. This is editorial governance, not bulk rewriting.

### Required audit

For every canonical entry, report:

- live/withheld status;
- tradition, sampradaya, region, and intended audience;
- source coverage for significance, mantra, ritual instructions, fasting rules, parana rule, and katha;
- English/Hindi/Punjabi or other available language coverage per field;
- rights status and whether wording is quotation, translation, or Shoonaya-curated explanation;
- potentially absolute, medical, exclusionary, sect-specific, or unsourced claims;
- duplicate/near-duplicate content and alias collisions;
- card-summary and long-form reading length.

### Editorial rules

1. Never invent a source, quotation, Sanskrit verse, translation, ritual rule, or authority.
2. Separate council/source-backed requirements from common practice, regional custom, family practice, and optional devotional suggestions.
3. Replace universal language such as “invalidates the Vrat” or “essential—do not substitute” unless a cited authority and applicable tradition justify it.
4. Do not present spiritual beliefs as medical facts. Add calm safety guidance for pregnancy, childhood, older age, diabetes, eating disorders, medication, and other conditions where fasting may be unsuitable. Offer prayer, charity, japa, reading, and sattvic restraint as non-fasting alternatives.
5. Static content may describe the parana rule, but exact local parana windows must come from the canonical occurrence/location result.
6. Use progressive depth:
   - Home card: one sentence.
   - Detail opening: “Why today” and “What matters now.”
   - Practice modes: beginner, standard, and tradition/family-guided where sourced.
   - Deep read: story, symbolism, mantra, katha, source notes.
7. Localized content must be field-level. A missing translated tagline must not hide an otherwise valid translated mantra or significance section.
8. Keep unsupported entries non-live rather than filling them with generic prose.

### Deliverables

- Machine-readable audit report.
- Human council work list for unresolved claims.
- Updated content only where sources support it.
- Tests proving every live entry has required metadata and no bare-string source references.
- No native-specific manual copy changes; native receives the generated snapshot from Prompt 4.

---

## Prompt 6: Build Premium PWA And Native Vrat Discovery/Reader Parity

Apply the canonical contracts without redesigning unrelated screens.

### Home discovery

1. Use one shared product constant for the Home advance window. Set it to **D-2 through D0** to match the agreed product behavior unless current product documentation explicitly supersedes that decision.
2. PWA may keep up to five swipeable cards. Native should replace only the current single `SacredDaysCard` slot with a compact horizontal `FlatList`/snap carousel when multiple eligible entries exist; one entry remains a stable single card.
3. Each card shows artwork/icon, localized name, exact local date, Today/Tomorrow/In 2 days, one short preparation cue, review/variant state when needed, and an exact deep link.
4. Replace emoji-as-primary-art with the existing Shoonaya 3D/SacredIcon visual language or optimized WebP artwork. Keep an accessible textual fallback.
5. Preserve HomeHero, practice cards, Sadhana CTA, mood, Sankalpa, and Bottom Nav unchanged.
6. Ensure cards and pagination controls have 44px targets, readable text, deterministic dimensions, no layout shift, reduced-motion behavior, and dark-mode contrast.

### Hub

1. PWA and native `/vrat` hubs show Today, next eligible observances, filters that use explicit tradition metadata, and the complete live catalogue.
2. Remove prose-search tradition filtering.
3. Use virtualized lists where content is unbounded or growing. Memoize row components and stabilize render callbacks.
4. Show empty, loading, cached-stale, offline, retry, unresolved, and no-location/profile states explicitly.

### Detail reader

1. Put canonical date, location/profile basis, status, and exact parana/moonrise/sunrise window before long prose.
2. Render significance, how to observe, fasting modes, foods, avoidances, puja items, mantra/transliteration/meaning/audio, katha, sources, health alternatives, observation state, and sharing through progressive disclosure.
3. Include exact, availability-aware links to the associated Vrat Katha reader and Live Darshan where canonical metadata supports them. Do not show dead, generic, or invented destinations.
4. Add a privacy-safe aggregate community card such as “X seekers observing today” only when the count comes from canonical, occurrence-qualified observations. Never expose identities or locations. Define suppression/minimum-count behavior so very small cohorts do not imply individual participation, and do not display a fabricated fallback count.
5. Use the shared global reader controls and app typography on both platforms.
6. Make surrounding chrome follow the selected app language. Do not hardcode every reader pipeline as Hindu or every local TTS request as `hi-IN`; use content metadata.
7. Remove the inaccurate unauthenticated claim that anybody can follow every Vrat identically. Use inclusive but precise language about learning and choosing practices respectfully.
8. Observation and reminder CTAs must reflect Prompts 1–3 and never appear actionable for an invalid/unresolved date.

### Visual verification

- PWA mobile and desktop screenshots.
- Native Android and iOS screenshots at small and large text sizes.
- Light, dark, reduced-motion, one-card, multi-card, long Hindi/Punjabi name, unresolved, and offline states.

---

## Prompt 7: Optimize Vrat API, Cache, Bundle, And Rendering Performance

Optimize only after correctness and parity are established.

### Required work

1. Measure before changing:
   - PWA Home Vrat chunk size;
   - native Vrat initial render/mount count;
   - request count for Home, hub, and detail;
   - backend route timing and query count;
   - cache hit/miss behavior.
2. Remove the PWA Home dependency on the complete long-form content catalogue.
3. Coalesce detail data so the reader does not independently fetch occurrence status, user observation, and global stats when one typed endpoint can return them safely. Keep public/global and private/profile data cache boundaries correct.
4. Add stale-while-revalidate caching for native upcoming/detail payloads keyed by authenticated identity, profile, timezone/location bucket, language, and content version. Never show one user's profile-qualified calendar to another user.
5. Clear user-bound cache on sign-out/account switch. Preserve an explicitly separate guest cache.
6. Use existing AsyncStorage/cache infrastructure unless measurement proves it inadequate. Do not add MMKV or a query library by default.
7. Use `FlatList` for growing native lists, `React.memo` for rows, stable callbacks/key extractors, and bounded image decoding through `expo-image`.
8. Remove unused animation imports/timers from the PWA carousel. Respect reduced motion and avoid decorative loops.
9. Preserve exact card dimensions between skeleton/cache/live states to prevent layout shift.
10. Use the existing animation and media stack unless profiling proves it insufficient. Do not introduce Reanimated or another native dependency merely to claim smoother motion.

### Report

Provide before/after bundle size, request count, cache behavior, mounted-row count, and server-timing evidence. Do not claim 60fps, 120Hz, frame-rate, battery, CPU, or memory improvement without repeatable real-device profiling evidence.

---

## Prompt 8: Add Contract Tests And Run The Vrat Release Gate

Do not add features in this prompt. Verify the completed system and fix only defects directly exposed by the gate.

### Contract coverage

1. Canonical content parity and native snapshot hash.
2. Alias resolution and `chaturthi`/`sankashti` identity.
3. Calendar profile, tradition/sampradaya, timezone/location, primary/alternative/unresolved result handling.
4. Cookie and Bearer auth for Vrat observation.
5. Observation idempotency, concurrency, ownership, occurrence-date validation, and karma exactly once.
6. D-7, D-1, and D0 festival/Vrat notification eligibility.
7. World-timezone/DST scheduling, quiet hours, preference opt-out, dedupe, receipt retry, dead-token pruning, and exact tap route.
8. PWA `/vrat`, PWA `/vrat/[slug]`, native hub, native detail, Home card, notification tap, and offline routes.
9. No reviewed/unresolved/withheld/fallback leakage into final-date UI, notification, observation, or karma paths.
10. Privacy-safe seeker aggregation: canonical occurrence identity, no cross-occurrence contamination, no individual exposure, and documented suppression for small cohorts.
11. Katha and Live Darshan links: correct route when available, absent/disabled state when unavailable, and no generic or broken fallback.
12. Accessibility: 44px targets, screen-reader labels, text scaling, focus order, contrast, reduced motion.

### Commands and release evidence

- Run repository typechecks and relevant lint/tests.
- Run existing calendar verification gates without changing their expected assertions to make this work pass.
- Run backend route tests and notification workflow dry-runs.
- Run PWA Playwright screenshots.
- Build a local Android app, install to AVD, and smoke-test Home → Vrat → detail → reminder/observation states.
- Build/install the local iOS simulator app and smoke-test the same route, excluding real remote-push receipt claims on simulator.
- Confirm a real-device push remains required before calling native notification delivery release-ready.
- Report dirty files before/after, every commit, unapplied migrations, undeployed backend commits, and any manual credential/device step.

## Final Completion Standard

The Vrat initiative is complete only when:

- PWA and native consume one versioned, source-aware editorial catalogue;
- native no longer carries an independently edited Vrat catalogue;
- all Today/upcoming/date/parana decisions come from canonical profile-qualified occurrence data;
- PWA and native exact routes work;
- observation is occurrence-qualified and atomic;
- D-7, D-1, and D0 notifications reach eligible users in their local timezone without duplicates;
- unresolved/withheld content cannot notify, award karma, or masquerade as final;
- card and detail content is sourced, health-safe, localized by field, accessible, and performant;
- tests, local builds, and real-device push verification provide release evidence.
