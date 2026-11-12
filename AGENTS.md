# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code. (Upgraded from SDK 56 to 57 in commit 204b759, 2026-09-03 — `docs/PERFORMANCE_AUDIT.md` and other dated documents that state "Expo SDK 56" are historical records of that point in time, not stale instructions; only this line, which is a live instruction, needed updating.)

## Shoonaya Project Standards

### 1. Native Product and Backend Contract Ownership
- `shoonaya-mobile` owns the active Native product application and is the
  default scope for product UI and client implementation.
- `Sanatan Sangam/Shoonaya` remains the active backend and canonical owner of
  APIs, data, auth, content, notifications, profiles, calendar services, and
  shared contracts.
- The backend repository's PWA/web-app frontend is retired. Do not propose,
  implement, test, build, or report PWA UI work unless the founder explicitly
  requests it in the current conversation.
- Any Native change affecting a backend service or shared contract must be
  audited in both the Native and backend repositories.
- Never maintain manually edited duplicate catalogues when a generated,
  versioned snapshot can provide Native offline support.

### 2. Calendar Governance
- Never derive an observance date in UI code when canonical,
  profile-qualified occurrence data exists.
- Never change `masaName`, evaluator flags, materialisation flags, council
  decisions, locked rows, or manual overrides outside an explicitly scoped
  calendar task.
- Never publish, notify, award karma, or present a final date for unresolved,
  disputed, fallback, unaudited, unverified, or withheld occurrences.
- Distinguish astronomical instant, local civil date, spiritual date,
  calendar profile, sampradaya, location and timezone.
- Calendar migrations must be tested against a shadow/Supabase branch before
  production.

### 3. Spiritual Content Integrity
- Never fabricate scripture, mantra, quotation, translation, ritual rule,
  source, page number, source tier, rights status or council approval.
- Separate verbatim public-domain text, licensed text, sourced translation
  and Shoonaya-curated explanation.
- Unsupported content must remain withheld or explicitly labelled, never
  filled with generic prose.
- Tradition-specific claims must carry applicable tradition, sampradaya,
  region and source metadata.

### 4. Database and Auth Safety
- Derive user identity server-side; never trust a request-body user ID.
- Backend routes serving Native must explicitly support Bearer and cookie auth
  through the established helper.
- Private writes must be atomic, idempotent and protected by database
  constraints, not only application checks.
- Every migration requires RLS review, privilege review, rollback guidance,
  generated type updates and applied/unapplied environment reporting.
- **Mandatory Migration Root Cause & Impact Warning (ROC Pre-Flight)**:
  Before requesting approval or applying any database migration to production, always present a clear **Root-Cause Risk Assessment** covering:
  1. **Function Overload Trap (`PGRST203`)**: Does the migration alter argument types, names, defaults, or parameter order of an existing PostgreSQL function? In Postgres, `CREATE OR REPLACE FUNCTION` silently leaves the old signature intact if parameter types or positions change, creating an overload. PostgREST resolves RPCs by named arguments and will fail with `PGRST203` (HTTP 500) whenever two overloads share argument names. Any redefined function MUST explicitly include `DROP FUNCTION IF EXISTS <old_signature>` in the same migration.
  2. **Caller Contract & Mobile Client Compatibility**: Do active client versions (Android, iOS, web, background cron jobs) invoke this function or table with arguments matching the new signature? A breaking signature or return type change immediately breaks production devices.
  3. **User Data & Opt-Out Safety (Rule 6)**: Does the migration alter column defaults or execute data updates? Blanket updates (`WHERE col = false OR col IS NULL`) overwrite explicit user opt-outs and are strictly prohibited. Report pre-flight counts of `true`/`false`/`NULL` before any update.
  4. **Lock Contention & Concurrency**: Does the migration execute heavy DDL on active production tables (`ALTER TABLE ... ADD COLUMN NOT NULL`, index creation without `CONCURRENTLY`) that could cause statement timeouts or block live user traffic?
  5. **Rollback & Reversibility**: Verify that a tested, matching rollback file exists in `supabase/rollbacks/`.
- Never expose service-role credentials or production secrets.
- Don’t run `supabase db push`. It would push every unapplied migration, and production already has history drift. Apply migrations individually or through reviewed target scripts only when explicitly approved.

### 5. Cache and Identity Isolation
- Every persisted client cache must define its key dimensions: user, guest,
  profile, tradition, timezone/location, language and content version.
- Clear private caches on sign-out or account switch.
- Never display one user's cached profile-qualified data to another user.
- Offline data must disclose when timing/date information may be stale.
- Treat cache as a resilience fallback, never as the source of truth: render a
  validated same-identity snapshot immediately when available, then revalidate
  in the background. A successful network response replaces it; a failed or
  cancelled refresh must not erase usable cached content or expose raw transport
  errors to the UI.
- Bound persisted caches by schema/version and age. Encrypt private family,
  health, or user-generated content at rest; exclude credentials and reusable
  invitation secrets. Any stale date-sensitive content must be visibly marked,
  and cached state must never authorize a private mutation.

### 6. Notification Delivery
- Trace notification creation through eligibility, canonical occurrence,
  user preference, OS permission, local timezone, quiet hours, dedupe,
  database insertion, provider send, receipt checking and tap routing.
- Distinguish in-app notification creation from OS push delivery.
- Never claim delivery from token registration or a successful provider
  ticket alone.
- D-7, D-1 and D0 keys must not overlap with legacy tithi or OneSignal keys.
- Real-device evidence is required before calling Android/iOS push
  release-ready.

### 7. Platform and Build Precision
- Keep these states distinct: committed, pushed, deployed, built, installed,
  launched and smoke-tested.
- Distinguish local Android APK/AVD, EAS preview standalone APK,
  Play production AAB, local iOS Simulator build and App Store/TestFlight IPA.
- Never claim an AVD or Simulator is updated without reporting the installed
  artifact/build identity.
- iOS Simulator cannot prove remote push delivery.

### 8. UI and Motion Verification
- Preserve established Shoonaya tokens and shared components.
- Do not redesign unrelated Home, Hero, navigation or profile surfaces.
- Verify Android and iOS, light/dark mode, text scaling, reduced motion,
  loading/error/empty/offline states and 44px touch targets.
- Do not use parity with the retired PWA as a Native acceptance criterion;
  require complete content, actions, states, accessibility and
  platform-appropriate quality.
- Do not add animation dependencies or decorative loops without measured need.

### 9. Performance Evidence
- Measure before and after: request count, query count, render/mount count,
  bundle impact, cache behavior and server timing.
- Do not claim 60fps, 120Hz, lower CPU, lower memory or better battery life
  without repeatable device profiling.
- Prefer removal of redundant work over adding caching or infrastructure.

### 10. Delivery and Repository Hygiene
- Inspect the Native working tree and its active worktrees before editing. Also
  inspect the backend working tree when a backend service or shared contract is
  in scope.
- Preserve unrelated and parallel changes.
- One scoped objective and one scoped commit per prompt.
- Report every changed file and prove unrelated dirty files were not staged.
- Never push, deploy, apply production migrations, trigger production
  notifications or start paid infrastructure without explicit approval.
- Report test results as passed, failed and skipped; never present only the
  passed count as the full denominator.

### 11. Image and Binary Asset Integrity
- An image's real format must match its file extension. Android's resource
  compiler (AAPT2) rejects a JPEG named `.png` and fails the whole release
  build; iOS and the web accept it, so nothing else will catch it. Never rename
  a file to change its format; re-export it.
- Cut-out art (`assets/relics/`, `assets/icons/`) must be a real PNG or WebP
  with a true alpha channel. Never commit a generator's checkerboard
  "transparency" preview, a screenshot or a flattened JPEG; open the file on a
  contrasting background before committing it.
- Run `npm run check:assets` before committing or copying any image, including
  from the backend repository. The Android build scripts and `npm run
  eas:update` run it first and refuse to start if it fails: an Android build can
  wait hours in the EAS queue before failing on this, and an OTA update skips
  the native build entirely, so it would ship bad art silently. Publish OTA
  updates with `npm run eas:update -- ...`, not bare `eas update`.
- Do not report image work as done, or call assets "transparent" or "verified"
  in a commit message, until the check passes and the art has been viewed in
  light and dark mode on a device or simulator. A green test suite does not
  cover assets (see 7: committed is not built is not smoke-tested).
- Record provenance for generated or third-party art: tool, date and rights
  status (see 3). Assets copied from the backend or any external source carry
  their defects; always run the check again in this repository.
- `__tests__/asset-formats.test.ts` holds a known-broken list that may only
  shrink. Never add a file to it; fix the artwork and delete the entry.
- Art that arrives with a baked-in checkerboard is cut out with
  `scripts/relic-cutout/`, then must pass `npm run check:assets`, be viewed over
  a bright contrast colour, and compile with `aapt2`. Prefer the generator's
  original export with a real alpha channel.
- Why this rule exists: Android production build 46 (2026-10-06) failed after a
  ~3 hour EAS queue because eight JPEGs named `.png`, each with a checkerboard
  baked into its pixels, were in `assets/relics/`. They entered the web
  repository on 2026-05-14 (`1723fa6`) and were copied here in `8e21e69`
  (2026-10-05) under a message describing them as transparent assets; no step
  checked them. They were replaced with real transparent cut-outs on
  2026-10-08. This applies equally to human and AI-agent contributors.

## Styling — match existing DNA, never invent

`lib/constants.ts` is the single source of truth: `COLORS`, `themeColor(isDark)`
(the `theme.*` object — `bg/card/border/borderSoft/text/dim/brand/brandSoft/
glass/premiumBorder/accent/earth`), `FONTS`, `TYPE`, `RADII`, `SPACING`,
`SHADOWS`. Every color, font, radius, spacing, and shadow value used anywhere
in the app should trace back to a named export in this one file — never a
fresh hex/rgba literal, never inline opacity math on top of an already-alpha
token (e.g. `opacity: 0.6` on a View whose `backgroundColor` is already
`rgba(...,0.12)` — the two multiply, silently producing ~7% effective alpha).
If a token doesn't exist yet for what you need, add it to `lib/constants.ts`
with a comment explaining where the value came from (an existing sibling token,
an established Native pattern, etc.) — don't invent a one-off in the component
file.

**Before styling anything, grep 2-3 existing screens doing something similar
and copy their exact pattern** (colors, radius, shadow, icon treatment) rather
than deriving a new one. Concretely:
- Decorative backdrop glow/bubbles → copy `app/(tabs)/japa.tsx`'s launcher
  backdrop circles (`theme.brandSoft` + `COLORS.navGlow*Light/Dark`,
  `pointerEvents="none"`, absolutely positioned, bleeding off-edge).
- Card/surface → use the `Card` component (`components/ui/Card.tsx`,
  24px radius) or `Surface`, not a bare `View` with hand-rolled
  border/shadow, unless an existing screen's bare-View pattern is what
  you're matching.
- Icon wells / feature-identity icons → check `components/ui/SacredIcon.tsx`
  first (full-color clay-art assets exist for most features); don't drop
  back to a plain `Feather` glyph if a matching asset already exists.
- Pills/chips/buttons → match `TYPE.chip`/`TYPE.section` and the
  `PressableSurface` component, not ad hoc `Text`+`View` styling.

`docs/NATIVE_VISUAL_DEBT_MATRIX.md` inventories known, already-tracked
styling debt (untokenized rgba literals, bare `COLORS.brandGold` instead of
the theme-aware pair, etc.) — check it before "fixing" something that's
already a deliberate, deferred item there, and update it if you fix one.

If a styling change goes through more than one back-and-forth with the user
in a session, that's the signal to stop iterating on values and instead go
find the actual existing precedent to copy — say explicitly which existing
screen/pattern you matched, so it can be verified without another round
trip.

## graphify

This project has a source-scoped graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `./scripts/graphify-update-source.sh` to keep the graph current (AST-only, no API cost)
- Do not run `graphify update .` directly in this repo; it includes node_modules and produces dependency noise instead of saving tokens.

### 12. Typed Input, Save Errors and Bottom-of-Screen Layout
- A date is chosen with `components/ui/DatePickerField` (a plain-JavaScript calendar), not typed into a bare
  `TextInput`. A native date-picker module would not exist in builds that are already installed, so it could not ship
  as an over-the-air update and would crash or vanish for those users; adding any native module needs a build plan
  first (see 7).
- Any other text a person types for a typed column (a time, a number, an enum) goes through a shared parser that
  returns the database's canonical form before it is stored, sent to an API, or used to derive anything such as age or
  life stage. Dates and times use `lib/date-input.ts`. Never send raw typed text to the database or an API, and never
  write a `date_of_birth`-style field from `value || null`.
- Payload builders re-validate: they normalise or throw (`buildOnboardingProfilePayload` does). A screen that forgets
  the check must still not be able to put raw text in the payload.
- A picker's bounds must not be stricter than the contract behind it. Date of birth is 1920 or later; a Kundali can be
  cast for a family member and the chart engine accepts 1800 or later (`KUNDALI_MIN_BIRTH_DATE`).
- A save failure tells the person what to fix. It never shows `error.message` or provider text (it can carry table,
  column and query detail). A Supabase database error is a plain object, not an `Error`: never branch on
  `error instanceof Error` to decide what to show. Classify by SQLSTATE or HTTP status (`lib/save-error.ts`), and show a
  short support reference. "Check your connection" is only for network failures. Every other failure a screen shows
  goes through `describeFailure(error, 'its own sentence')` (`lib/user-facing-error.ts`); `__tests__/user-facing-errors-guard.test.ts`
  fails if a screen puts an error's message, a status code or a database detail on screen.
- Every typed field has a test with malformed input: the exact string from any incident, dates that do not exist,
  wrong separators, empty and whitespace. When one typed field is fixed, sweep every screen for the same kind of field
  and report the sweep.
- The shared `Screen` reserves only the top safe-area edge. A screen with buttons at or near the bottom must reserve
  `useSafeAreaInsets().bottom` itself (onboarding does this in `OnboardingShell`; the login does it in its scroll
  container). On Android's edge-to-edge layout the content otherwise runs under the system navigation bar. Check it
  with 3-button navigation as well as gesture navigation. Do not change `Screen` globally: tab screens render under the
  floating bottom nav by design.
- Why this rule exists: on 2026-10-09 the last onboarding step failed on every retry on a new Android build. A person
  had typed `18081991`; the app sent it as `profiles.date_of_birth`, Postgres rejected it (22008) and the screen showed
  a generic line, because a database error is not an `Error`. The field had accepted free text with no validation since
  2026-07-09 (`bf7321f`) and the same pattern existed in Personal details, Kundali and Kul. The same week a tester
  reported that Continue and Skip sat under the Android navigation bar on every onboarding page. This applies equally
  to human and AI-agent contributors.

### 13. Closing a Defect
- A defect found by a tester, a device or production is not closed by fixing the instance. In the same change: fix the
  class and report the sweep; add a guard test that fails without the fix and prove it by reverting the fix; and add or
  amend the rule here with the origin (date, symptom, cause). Do this when the fix lands, not later: a rule written
  after the next incident would have been read before it.
- Find the cause in logs, the database or the server before naming one. State what was and was not verified on a
  device (see 7); a green test suite does not show that a screen is usable.
- A feature that passes its tests but has no rule describing how it fails is unfinished. When something starts
  working, record what would make it stop.

### 14. Telemetry and Diagnostic Upload Buffers Must Clear on Confirmed Receipt
- A client buffer that aggregates events locally and uploads a periodic summary (not a per-event queue) must remove
  exactly the events included in a successfully uploaded summary before the next upload — the same guarantee the
  per-event diagnostic queues already give (delete by id after a confirmed response). Reading a buffer is not the same
  as consuming it: a non-destructive read that is re-uploaded on every periodic tick re-reports every event still
  sitting in it.
- A fleet-level number computed by summing a value across multiple uploaded rows (a percentage, a total count) is only
  valid once each row is known to represent a disjoint set of underlying events. Confirm that before trusting a
  sum-across-rows query against a telemetry or diagnostics table. If it is not guaranteed, deduplicate by device or
  identity and use the latest row only, and say so explicitly in whatever the number is reported as.
- Why this rule exists: on 2026-10-21 an Android cold-start stall rate ("~1 in 5 cold starts need the 6-second
  emergency fallback") was computed by summing `samples`/`emergencyFallbackCount` across every row in
  `native_startup_telemetry_summaries`. The client (`lib/telemetry.ts`) read its local rolling event buffer
  non-destructively on every hourly upload and never trimmed it, so a device with fewer than `MAX_EVENTS` (500)
  lifetime events had the same events included in every summary row it ever uploaded — the quoted rate was inflated by
  re-counting the same cold starts once per upload they happened to ride along in, not a real per-launch measurement.
  An external review caught this. The fix (`removeReportedTelemetryEvents`, called only after a confirmed upload
  response) mirrors the pattern the auth/API diagnostic queues already used correctly
  (`removeUploadedApiRequestDiagnostics`/`removeUploadedAuthDiagnostics`). This applies equally to human and
  AI-agent contributors.

### 15. Separate Auth Preparation and Network Timeouts
- `apiFetch` must bound auth/session preparation and HTTP transport independently. The requested `timeoutMs` is the network budget and starts immediately before the first fetch; auth readiness/session restoration has its own finite timeout. Retries share the original transport deadline.
- A local Panchang calculation may paint while the server resolves a profile or canonical observances, but it must identify the reference location. It must never replace canonical observance dates or imply an unresolved response is complete.
- AI-backed Name Story requests use `AI_CHAT_TIMEOUT_MS`, including the standalone Profile entry point.
- Why this rule exists: on 2026-10-21 a new-user simulator walkthrough found `apiFetch` started its only timer before `waitForAuthReady()` and token restoration, reducing the network time budget. The Panchang screen also had a local calculation but hid it behind a full-screen loader until profile and observance requests completed. Both defects were fixed while preserving finite auth/network deadlines and visibly labelling Ujjain reference timings.

### 16. Lifecycle-Aware Diagnostic Timing and Uploads
- Upload telemetry and request-diagnostic outboxes only after the app is ready and stable in the foreground; do not start network sends on the transition to background. Keep local events until the server acknowledges receipt.
- Mark a diagnostic when a real `background` transition occurred during its measured wall-clock interval. Do not treat iOS `inactive` alone as background; it also occurs for short interruptions such as Control Center and incoming calls.
- Keep the lifecycle marker nullable at the backend so older installed app versions remain compatible, and display unknown separately from a confirmed `no` in admin diagnostics.
- Why this rule exists: on 2026-10-21, production diagnostics showed client request durations at the 180-second storage cap across unrelated routes. The root layout was starting telemetry uploads as the app entered background, while `Date.now()` included suspension time and no event recorded lifecycle transitions. This applies equally to human and AI-agent contributors.

### 17. Row Text Layout and Wrapping Bounds
- Any `<Text>` rendered inside a horizontal container (`flexDirection: 'row'`) alongside an icon, badge, button, or other sibling element must carry `flex: 1` (or `flexShrink: 1`).
- Without `flex: 1`, React Native does not bound the text node's width to the remaining horizontal space of the row; the text expands past parent container padding and clips or wraps abruptly against the card/screen border.
- Pair multi-line text in row items with explicit `lineHeight` to prevent descender clipping or cramped vertical rhythm on custom fonts.
- Why this rule exists: on 2026-10-23, onboarding Step 9 (Location) had text alignment and clipping issues on iOS devices: labels in the feature card ("Accurate sunrise...", "Brahma Muhurta wake-up reminder at your real dawn") lacked `flex: 1`, causing text to bleed past the 20px card padding and touch the right border. This applies equally to human and AI-agent contributors.

### 18. Query Failures Must Not Become Empty State or Authorize Mutations
- Check both `data` and `error` on every Supabase read. A failed read is not a
  missing row, an empty collection, a completed onboarding state, or an unset
  profile preference. Keep the current identity's cached state when it is
  usable; otherwise show a retryable error state and do not offer dependent
  mutations until a successful read establishes the state.
- Auth routing must have an explicit safe outcome when session/profile
  preparation fails. A thrown startup error before the routing dispatcher runs
  must never mark the app ready on the default protected route. A cached
  onboarding result can keep the fast path, but a confirmed server disagreement
  must hold the startup surface until the corrected route is visible.
- Progress mutations must preserve existing progress unless a clearly named
  restart action intentionally resets it. Never let an empty map produced by a
  failed query drive a Day-1 upsert.
- A repo-wide sweep for the same unchecked-`error` shape is not optional once
  one instance is fixed. Classify each hit by what its failure actually
  changes before calling it cosmetic -- a "generic fallback" can be a wrong
  calendar-day boundary (Panchang's tithi/muhurta, Nitya Dincharya's and the
  daily quiz's `spiritualDate(timezone ?? 'UTC')`), not just a blank label.
  A grep match is a candidate, not a confirmed bug: read the surrounding
  code before fixing it -- Vrat's `if (profile)` presence guard already
  skipped applying defaults on a failed read, so despite matching the same
  grep pattern it needed no change; "fixing" it anyway would have been
  needless churn.
- Why this rule exists: on 2026-10-25 a cold-start review found startup errors
  could mark routing ready before any decision; profile query errors could be
  interpreted as no row; and a failed guided-plan read could show a new-plan
  action whose upsert reset saved progress. A similar Ashrama read could show
  setup again, and the dormant AuthCoordinator had the same ignored-error
  adapter. The same-day follow-up sweep found the identical shape in 13 more
  call sites (Panchang, Nitya Dincharya, the quiz, the profile-recovery Retry
  button, KUL enrichment, Mandali reactions and nearby search, another
  profile's viewer check, Live Darshan, Kundali, Zen, and post-Apple-signin
  login) and one false positive (Vrat, already guarded).
  Follow-up 2026-10-30: an audit of `app/shloka.tsx` found `profileResult.error`
  was ignored in `load()`, rendering a false "0 streak / not read today" state
  and enabling the action button on a broken read. The fix keeps today's verse
  visible, hides streak and completion status, disables "Mark as read", and
  presents a retry affordance with `describeFailure(profileError, ...)` with a
  44px touch target. The accompanying repo-wide sweep fixed 5 additional unchecked
  reads: `app/bhakti/insights.tsx` (overwriting streak and seva score to 0),
  `app/(tabs)/tirtha.tsx` (wiping saved places and visits to empty arrays on failure),
  `app/mantras.tsx` (silently overwriting non-Hindu tradition to 'hindu'),
  `app/nitya-karma.tsx` (zeroing life stage to show the 'Set up' badge), and
  `app/seva.tsx` (zeroing monthly count on count query error and writing 0 to cache).
  Guarded by `__tests__/shloka-profile-error.test.ts` with mutation checks. This applies
  equally to human and AI-agent contributors.

### 19. "Not Now" on the Push Prompt Is Not Consent to Every Reminder Category
- `getNotificationPersistencePayload` must not set every reminder flag
  (`wants_festival_reminders`, `wants_vrat_reminders`, `wants_shloka_reminders`,
  `wants_nitya_reminders`, `wants_community_notifications`,
  `quiz_reminder_enabled`, Japa, Brahma Muhurta, family remembrance, etc.) to
  `true` regardless of whether the seeker tapped "Not now" on the OS push
  prompt or completed onboarding without ever seeing it. The OS prompt answers
  one question -- can this app push at all -- and must never stand in for a
  choice about any specific reminder category.
- Preserving an *existing* in-app preference across a re-prompt (so a later
  "Not now" cannot silently erase a choice someone already made in Settings)
  is correct and must stay. Defaulting every category to `true` for a seeker
  who has never been asked at all is a different, separate decision --
  calendar-governance-grade: it must come from an explicit, visible, per-
  category choice during onboarding or a dismissible later prompt, never
  a blanket write baked into the persistence payload.
- Amended 2026-11-12 (founder decision, superseding an earlier core-tier draft): every reminder category may be ON by default EXCEPT
  Brahma Muhurta, which stays an opt-in. The default is acceptable only because onboarding shows each category as its own visible,
  pre-selected choice the person can untick and Settings has a toggle for each; it is never a silent write on "Not now" or on completing
  onboarding without seeing the choices, and the OS push prompt never stands in for any category. Settings' fallback for a missing
  profile value must read the same way (guard: `__tests__/notification-default-tier.test.ts`). Backend: migrations `20261112100000`
  (defaults) and `20261112110000` (Brahma opt-in reset), unapplied until approved.
- Why this rule exists: on 2026-10-26, the backend half of this same defect
  (nine reminder columns backfilled with `WHERE x = false OR x IS NULL`,
  destroying the record of real opt-outs) was recorded in the Shoonaya
  backend's AGENTS.md section 6. Auditing the Native contract for the same
  shape found `getNotificationPersistencePayload` already did the client-side
  equivalent: every reminder flag set `true` on "Not now" or "unset," making
  the OS prompt's answer carry no information about any individual category.
  This applies equally to human and AI-agent contributors.

### 20. A Notification or Link Must Open the Screen It Promises
- Every URL a backend producer writes into `notifications.action_url` or the push `data.url` has a row in
  `__tests__/notification-routes-contract.test.ts` that names the screen it opens. A new or changed producer URL changes
  that row in the same change, in both repositories (section 1). A destination the app has no screen for is listed
  `noNativeScreen` and opens the inbox with the notification in it; it never silently opens Home.
- Every screen under `app/` is reachable through `resolveNativeRoute` (lib/routes.ts) or is listed in that test with the
  reason it is not a link target. Adding a screen means adding its route, or its reason.
- A tap is read from both `getLastNotificationResponse()` (the tap that launched the app: no listener exists yet when it
  happens, and expo-notifications never replays it to one registered later) and the live listener, held in
  `lib/notificationTap.ts`, and delivered by the root layout only when `canDeliverNotificationTap` allows it. Never call
  `router.push` from the listener itself and never navigate during startup: the index route and the sign-in and
  onboarding redirects run afterwards and take the screen back. A tap made while signed out is held for
  `NOTIFICATION_TAP_HOLD_MS` and delivered after sign-in; it does not carry private data, only a route.
- Links the operating system opens (`https://www.shoonaya.com/...`, `shoonaya://...`) are matched by Expo Router against
  the files in `app/`, not by `resolveNativeRoute`. `app/+native-intent.tsx` renames only exact aliases
  (`lib/systemLinkRoute.ts`) and returns everything else untouched. It must never turn a link into a different target:
  `/panchang/2026-10-29` shown as today's Panchang would present the wrong date as the right one (section 2).
- A query parameter is a destination only if the target screen reads it. `/home?focus=...` was never read by Home, so
  those notifications opened Home and nothing more.
- Why this rule exists: on 2026-10-29 several notification taps were found to open only Home. Causes found in the code:
  the tap was read only by a live listener, so a tap on a closed app was never routed (the app opened at Home);
  `/home?focus=shloka` for the daily shloka reached a Home that ignores `focus`; `/my-progress` (the milestone
  notification) missed a route test that required a trailing slash and opened the inbox; `/nitya-karma/plans` opened
  Nitya Karma instead of the plans screen; and `/festivals/<slug>`, which the backend writes, has no screen of that
  name. The sweep (every backend producer URL against the real router, and every screen against the router) found
  these and `/tirtha`; the two guard tests now fail if any of them returns.
- Closed 2026-10-30 (the follow-up to the above): the weekly summary opens `/my-progress`; Pitru Paksha carries the
  occurrence's civil date to `/panchang?date=YYYY-MM-DD` and the Panchang opens on that date, never on the day of the tap
  (an OS link to `/panchang/<date>` is rewritten to the same form, so a wrong date is still never shown as the right one);
  Mandali notifications carry an exact locator (`/mandali?postId=&commentId=` or `?requestId=`) that the app resolves
  through `/api/mandali/notification-target` on every open, because a locator is never an access grant (membership,
  blocks, mutes, hidden content and deleted comments are re-checked, and a failed safety read fails closed). Block and
  report receipts, and any key format that is not understood, open the sender's own `/notifications?notificationId=`.
  OS links are held in the same queue as taps (`lib/systemLinkIntent.ts`), so sign-in and onboarding cannot erase them;
  that design depends on the installed Expo Router skipping navigation for an empty warm href, which
  `__tests__/system-link-intent.test.ts` pins to its source: re-check it on every Expo Router upgrade.
- A notification's type and key format are read from the trigger or producer that writes them, never assumed. The first
  Mandali routing guessed a `mandali_mention` type that does not exist; the comment notification is `mandali_comment` with
  key `mandali_comment:<comment_id>` (14 of the 31 Mandali notifications in production on 2026-10-30), and its trigger is
  `AFTER INSERT` on `post_comments`, so the comment exists when the row is written. `notify_mandali_comment` exists only
  in production, not in the repository's migrations: a drift to close separately. A request sheet names the OTHER person
  (`counterparty`), never the requester, because for an accepted or declined request the requester is the viewer.
- Still open: broadcast and digest notifications open Home, deliberately; the Android intent filters in `app.json` now claim
  six more website paths (`/home`, `/mandali`, `/my-progress`, `/nitya-karma`, `/notifications`, `/shloka`), which only a new
  native build can deliver (an OTA update cannot), while the iOS file is served by the backend and takes effect on its
  deploy; and none of this has been observed on a device. The simulator build present on 2026-10-30 (`com.shoonaya.app`
  1.0.0, build 7, embedded bundle of 2026-10-29 01:48) predates all of it and proves nothing about it. Real-device
  evidence of cold and warm taps is required before calling tap routing release-ready (sections 6 and 7). The backend and
  the app can ship in either order: an app without these changes opens the same section for every new URL. This applies
  equally to human and AI-agent contributors.

- A subscriber to the held-tap store that throws must not drop a tap or link (2026-11-12): `notify()` in `lib/notificationTap.ts` calls each subscriber
  in its own `try/catch` and logs the error message (never the tap's contents). Origin: Metro logged a subscriber error, with no message, from the
  system-link handler on 2026-11-01 and 2026-11-12; five link opens in the simulator (warm, repeated, and just after load) did not reproduce it, so
  the cause is unknown and this is containment plus diagnosis, not a root-cause fix. Guard: `__tests__/notification-tap-subscribers.test.ts` (3 tests,
  proven red against the old `notify()`). Not verified on a device; look for the new `[notificationTap] a subscriber threw:` line if it recurs.

### 21. A Screen Calls the Route for Its Own Slice, Not the Aggregate
- `/api/native/home-summary` is Home's aggregate (profile, calendar, observances, sadhana, sankalpa, Dharm Veer). A screen that needs one slice of it must call a route that computes only that slice, never `home-summary` with the rest discarded: whatever is slow or failing in an unrelated slice then holds this screen open, and a 503 from the aggregate becomes this screen's error. If no such route exists, add one in the backend (section 1) and keep a 404-only compatibility fallback (`lib/shlokaToday.ts`: `home-summary?skipCalendar=true`) so an over-the-air update shipped before the backend deploy still works. A fallback is for "route not deployed" (404) only; a 401, 503 or network failure is the answer and must reach the screen unchanged.
- The Shloka screen reads today's text from `GET /api/native/shloka/today`. It deliberately has no persisted cache: the text is chosen on the server by `getDayOfYear()` (server-local day) for non-Hindu traditions but by the profile's timezone for Hindu, so a cache keyed by the device's date can show yesterday's or tomorrow's verse as today's. A correct cache needs the server to return the day it computed for (a `dayKey`) and the client to key by user, tradition, language, that `dayKey` and a content version, and to label itself stale (sections 5 and 9). Do not add one without that.
- Why this rule exists: on 2026-10-30 the Shloka screen hung while the Supabase database stalled (23:30-23:34 UTC) because it fetched the whole Home aggregate to read one field, `sacredText`. In the same window a session for a deleted account was answered with the aggregate's retryable 503 (backend `AGENTS.md`, "A Deleted Account Is Not an Outage"). Guard: `__tests__/shloka-today.test.ts` fails if the screen calls `home-summary` again or the fallback widens beyond 404.
- Audited in the same review and not changed (single-slice callers or duplicated fetches, each needs its own measurement and review): `app/my-progress/shields.tsx` could read `/api/native/progress-summary` after checking `highlights.totalSessions` and streak semantics match; the Dharm Veer detail screen refetches a roster it could reuse; the festival-quiz banner and screen could share one cache; `QuizSparkCard` could use `lib/quizCache.ts`; `festival/[slug].tsx` wants a by-slug route after calendar-governance review (section 2).
- Closed 2026-10-30: `app/shloka.tsx` now isolates profile load errors (section 18). Today's verse remains visible while the streak card and "read today" state are hidden; "Mark as read" is disabled until a successful read; an accessible retry affordance displays `describeFailure(profileError, 'Could not load your reading streak. Please try again.')` with a 44px min touch target. A repo-wide sweep fixed 5 additional unchecked Supabase reads (`app/bhakti/insights.tsx`, `app/(tabs)/tirtha.tsx`, `app/mantras.tsx`, `app/nitya-karma.tsx`, `app/seva.tsx`), guarded by `__tests__/shloka-profile-error.test.ts`.
- Not verified on a device: that the Shloka screen renders from the new route, and that a deleted account reaches the sign-in screen. Both are covered by unit tests and by reading `@supabase/auth-js` 2.110.0 (a non-retryable refresh failure removes the session and emits `SIGNED_OUT`), not by running the app. Similarly, rendering of the Shloka profile retry card under error conditions on a physical device/simulator was not verified directly; styling, touch targets, and accessibility bounds were verified via code contracts and test suites. This applies equally to human and AI-agent contributors.

### 22. Narrow Readers Still Need Lifecycle Isolation
 - Auth rejection follow-up (2026-10-31): a terminal backend `401 AUTH_REQUIRED` after the shared refresh/replay path must end the matching local session through Supabase `signOut({ scope: 'local' })`, allowing the root listener to clear private state and route to login. A 503, network failure, unrelated 401 or delayed rejection for a different token must never trigger this. Guard: `__tests__/rejected-session.test.ts`. Device verification remains required.
- Shields renders counters only for the current identity; late responses from a previous identity cannot publish counters or errors. Dharm Veer detail invalidates older story requests when its route or identity changes. A smaller endpoint does not remove either requirement.
- Festival detail must never manufacture resolved or verified occurrences when canonical data is unavailable, or derive Pitru Paksha days from a fixed Gregorian start. Explicit child links are content navigation; date links await canonical results.
- Origin: the 2026-10-31 build review found Shields lacked a post-request identity check, Dharm Veer allowed out-of-order story responses, and festival detail still fabricated verified 2026 dates. Guards: reader-request-lifecycle.test.ts and festival-date-governance.test.ts. Physical-device verification remains separate.

### 23. Private In-Memory Caches Follow the Session
- A cache of private records (Sanskara today) is keyed by user, bounded by age, cleared on every write and on `SIGNED_OUT`, and is not persisted unless it meets section 5 (encrypted, versioned, age-bounded). A read takes a ticket before fetching and stores only if nothing was cleared since (`lib/sanskaraCache.ts`); otherwise a read in flight during a write or sign-out puts old data back.
- A screen that shows private records follows `onAuthStateChange`, not one `getUser()` at mount, drops the previous identity's state when it changes, and publishes a response only if it is still the newest load for the identity still signed in (section 22).
- Origin: the 2026-11-02 review of the Sanskara screen found its 60-second cache was cleared only after a write, never at sign-out; the screen read the user once; and `loadData` published any response. Nothing leaked across users (the key is the user id), but private records stayed in memory after sign-out and a late response could overwrite newer state. Guard: `__tests__/sanskara-cache.test.ts` (each assertion proven red by removing the behaviour). Not verified on a device.

### 24. Every Persisted Private Value Has an Owner
- A value that says anything about a person (a cached API payload, a name story, typed text, a practice choice such as a vrat sankalpa or fasting mode, a reading history) is stored either by a cache module with identity-keyed keys and a purge, or through `lib/userScopedStorage.ts`, whose keys carry the owner, whose writes are skipped once that owner is no longer the current identity, and which every sign-out and account-switch cleanup in `app/_layout.tsx` clears. Never under a fixed AsyncStorage key.
- A screen that paints a saved copy reads it only after identity has resolved, for that identity, drops its state when the identity changes, and publishes a network response only while the identity lease it started with is current (section 22). A saved copy carries a schema version and a save time, is refused past its age bound, and is labelled as saved while on screen (section 5).
- Screens and components may call AsyncStorage directly only for values already keyed by user id, device preferences, or UI flags; the guard keeps a shrink-only list of the files that do, each with its reason.
- A load callback must not depend on the data it sets: My Progress listed `data` in its `loadData` dependencies, so each response re-created the callback, re-ran the effect and fetched again.
- Origin: the 2026-11-03 baseline security brief found My Progress (added 2026-10-31, `cdc12bc`) saved `/api/native/progress` under the fixed key `shoonaya_progress_cache_v2`, rendered it on mount before checking identity, and was not purged at sign-out: on a shared device the next person saw the previous person's practice progress, and kept seeing it if their own fetch failed. The sweep found the same shape in the name story (`shoonaya:last_name_story`, also written by onboarding), Japa's custom mantra, Dharm Veer history, and Vrat fasting mode, sankalpa and read flags; all now go through `lib/userScopedStorage.ts`, and every purge also deletes the old unscoped keys an earlier build left on the device. The remaining direct AsyncStorage callers were classified (user-keyed, device preference or UI flag) and listed. Guard: `__tests__/user-scoped-storage.test.ts` (its source checks fail with the screens reverted). Not verified on a device.

### 25. A Person Can Always Take Their Sanskāra Data and Delete It
- "Your Sanskāra data" (`components/sanskara/SanskaraDataSheet.tsx`, opened from `app/kul/sanskara.tsx`) lists the person's timelines from the
  server's **export**, never from the Sanskāra overview. Export, `delete-mine` and `delete-dependent` work after religious-data consent is
  withdrawn; the overview does not. Rebuilding the list on the overview, or opening the sheet only from the loaded state, hides the buttons
  from exactly the people who withdrew consent and still need to take their data or remove it. The sheet is mounted outside every state
  branch of the screen and the consent card offers it too.
- The export holds private notes. It lives in the sheet's state only while the sheet is open for one identity, is never cached or stored, and is
  dropped when the sheet closes or the identity changes (section 22: a late response is discarded). A downloaded copy lives in one cache directory
  (`sanskara-export`, `lib/sanskaraExportDevice.ts`) and is removed before each new download, after a failed share, after a delete, at sign-out and
  on an account switch. It is deliberately NOT removed when the share sheet resolves: the Expo SDK 57 sharing docs do not say whether that is before
  or after the receiving app has read the file, and an attachment read late would arrive empty.
- A delete says who loses the timeline (any manager deletes it for every manager), that it cannot be undone, and that a downloaded copy is the only
  way back. One request id is made per confirmation and reused on retry, so a lost response replays instead of deleting twice. A 404 means the
  list was stale (another manager deleted it, or the person is no longer a manager): reload, do not loop. A former manager has no delete button.
- Never say "saved" or "downloaded" after the share sheet closes: whether the person saved the file is not reported back.
- Origin: 2026-11-05. Draft privacy wording promised deleting a timeline and downloading a copy; reading the app showed `delete-dependent`,
  `delete-mine` and `export` existed in the API and the contract file but no screen called them, although the authorization contract (E7) promised an
  export before the 12-month former-manager window ends. Guard: `__tests__/sanskara-data.test.ts` (33 mutations each proven to turn a test red).
  Not verified on a device, in light and dark mode, with large text or on 3-button Android navigation, and not in any build or over-the-air update.
- Closed 2026-11-06 (found in the same sweep: two more private files written to the cache and never removed at sign-out): Settings "Download your
  data" wrote `shoonaya-data.json` (the account-wide export) and Profile's sadhana report wrote `sadhana-report.html`, each straight into the cache root.
  Both now go through `lib/privateExportFilesDevice.ts` (rules in `lib/privateExportFiles.ts`): one cache directory (`private-exports`), removed before
  each new export and after a failed share, and purged at sign-out and on an account switch by `app/_layout.tsx`; the purge also removes the two files
  an earlier build left in the cache root. Sharing availability is checked before anything is written. The file is still NOT removed when
  `Sharing.shareAsync` resolves (same reason as above). The account-wide export (`/api/user/export`) holds no Sanskāra data, so the Sanskāra sheet is
  the only way to download it. Any new private file in the cache goes through one of the two purged device modules; `__tests__/private-export-files.test.ts`
  fails for any other file that references `Paths.cache` or `cacheDirectory`, and its list of allowed files (the two purged modules, the public
  `shoonaya-dharmic-calendar.ics`, and the public read-aloud audio `tts_audio_N`) may only shrink. Guard: that test (see the rule below).
- Closed 2026-11-06 (the two classes the first fix could not see, because the libraries write the files, not our code): the share-card images and the
  profile photo picker's copy. `lib/share-card.ts` takes the picture with `react-native-view-shot` (`tmpfile`), which leaves it in the cache root on
  Android (named after the caller's `fileName` plus digits, so the library's own cleanup, which only matches its default prefix, never removes it) and in
  `tmp/ReactNative` on iOS, as a bare path rather than a `file://` uri. The name-story card and its file name carry the person's own name. The card is now
  copied into the same purged `private-exports` directory and the original is deleted; if the copy fails the original is shared exactly as before
  (a leftover file, never a lost share). Sharing availability is now checked before the picture is taken. `expo-image-picker` writes its crop to
  `<cache>/ImagePicker/` on both platforms (read in its Android and iOS sources); the profile picture is uploaded from the base64 the picker returns, so
  `pickAvatar` removes that folder in its `finally` block and the sign-out purge removes it too. Only the folder is ever removed, never a uri a pick
  returns, because an unedited pick can be the person's own photo.
- Rule for the next file: any library that writes its own files (`react-native-view-shot`, `expo-image-picker`, and `expo-print`, `expo-document-picker`,
  `expo-image-manipulator`, `expo-camera`, `expo-media-library` if they are ever added) is listed in `__tests__/private-export-files.test.ts` with the
  files that import it and how its output is purged; a new importer fails the test until it is. Every caller of `Sharing.shareAsync` is likewise
  listed. Guard: that test (50 mutations each proven to turn it red, including reverting Settings, Profile, the layout and `lib/share-card.ts` to
  their previous files).
- Device evidence, iOS Simulator, 2026-11-06 (iPhone 17 Pro Max, iOS 26.5, dev client `com.shoonaya.app` 1.0.0 build 7, JavaScript from a Metro serving
  commit df7eda1, a real account, read-only API calls, no photo upload): the data export, the sadhana report and a share card each opened the system share
  sheet and landed in `Library/Caches/private-exports/`, each replacing the previous file (one private copy at most); the export parsed as JSON; the card
  was 1080x1920 and not blank; `tmp/ReactNative` was empty afterwards, so the iOS bare path was accepted, the copy worked, the original was deleted and the
  fallback did not fire. A file planted in `Caches/ImagePicker/` was removed when `pickAvatar` finished (photo access denied, so the early-return path of
  its `finally`; a control showed the file survives until then).
- Still not verified on any device: the sign-out and account-switch purge, and the removal of an old build's files from the cache root. Two sign-out
  attempts on a second simulator that day were invalid, not failed: the app process was connected to a different Metro (the main checkout, which has none
  of this code), so they exercised nothing. Before a device test, confirm the app is running the intended checkout with `lsof -nP -a -p <app pid> -iTCP`
  (connections to the intended Metro's port); the dev menu's "Connected to" line was misleading. Also unverified: a real photo-picker crop (the folder
  location comes from reading the library's Android and iOS sources), everything on Android (`File.copy` from the cache root or the external cache, and a
  receiving app reading a file after the share sheet resolves) and the added copy per share card, which is unmeasured. In a dev client the purge's lazy
  `import()` may need Metro to be reachable; a release bundle should not (not verified). This applies equally to human and AI-agent contributors.

### 26. A Hand-over Code Needs a Saved Date of Birth, and the Screen Must Say So
- An early Sanskāra hand-over (before 18) accepts a code only from an account whose profile date of birth equals the birth date the managers
  recorded (backend `sanskara_accept_early_handover`, checked again at confirm). A mismatch is answered with the same "not found" as a wrong code
  on purpose, so the code field cannot explain it. `SanskaraBirthDateCard` (`lib/sanskaraBirthDate.ts`) therefore offers to save a date of birth
  above the code field, in accept mode only, and only when a successful profile read shows none. A stored date is never overwritten; a failed read
  or a missing row offers nothing (section 18); the date goes through the shared parser and the profile PATCH, never raw picker text (section 12);
  it is never persisted (section 24).
- The check is identification, not authentication: the profile date of birth is self-declared. The real protections are the one-time code, every
  manager's agreement and the starter's final confirmation. Do not describe the match as proof of identity.
- Account-deletion copy for a sole manager says the child's timeline is permanently deleted when the 30-day grace period ends, in every language,
  using the screen's existing phrasing for permanent removal. Hindi and Punjabi were checked for consistency only; a native speaker has not reviewed them.
- Origin: 2026-11-07 review. Production had 3 of 32 profiles with a date of birth, so almost every child would have met an unexplained "not found".
  Guard: `__tests__/sanskara-birth-date.test.ts` (12 mutations each proven red). Not verified on a device, in light and dark mode, or with large text.

### 27. Punjabi Is Offered to Sikh Profiles Only
- English and Hindi are offered to everyone. Settings lists Punjabi (app, meaning and transliteration language) only when the profile's tradition is Sikh, or when that row already holds Punjabi so a saved choice never disappears (`lib/languageOptions.ts`). A missing, unknown or not-yet-loaded tradition hides Punjabi. Tradition is self-declared: this scopes what is offered and is not a security boundary.
- Only the offer is gated. The `pa` type, generated content, startup scenes, backend producers and notification text stay in place; removing them is a separate decision. Onboarding already offers English and Hindi only.
- Not built: resetting a non-Sikh profile's Punjabi to English. Tradition is locked after signup in Native (`app/(tabs)/profile.tsx`), so no Native screen changes it, and production had no Punjabi profile on 2026-11-10. If a path that changes tradition appears, it must reset `app_language` and `meaning_language` to English in the same write.
- Safety-critical warnings are shown in English only (founder decision 2026-11-10), because neither Hindi nor Punjabi has had a native review. Built for the only such translated copy in Native: the account-deletion warnings and the deletion-pending notice in Settings (`REVIEWED_DELETION_LANGUAGES`, `accountDeletionCopy`, `reviewedDeletionLanguage`; adding a language there is the whole change once reviewed). Consent, Sanskāra hand-over and the date-of-birth card have no Punjabi in Native and are English only. Backend Sanskāra notice text still has Punjabi producers; the founder chose not to gate them (2026-11-10). A new safety-critical string in any language goes through the same allow-list.
- Privacy and policy content is English only; interface text stays translated (founder decision 2026-11-12, narrowed the same day). The
  explanation of what a consent covers is shown in English only: the religious-data consent (`lib/religious-data-consent.ts`, all of it), the
  explanation under "Help improve reminders" (onboarding, inbox card, Settings) and under the onboarding e-mail opt-in. Their titles, labels,
  accessibility hints, buttons and error lines are ordinary interface text and stay translated (Hindi; Punjabi for Sikh profiles where a Punjabi
  string exists; none of these has one yet). A translation of an explanation waits for a native-speaker and counsel review, then goes through the
  same allow-list idea as the deletion warnings. Guard: `__tests__/declaration-english-only.test.ts` fails in both directions (Hindi added to an
  explanation, or a label or button losing its translation; each proven red). Not verified on a device.
- Origin: 2026-11-10 decision to narrow languages to English and Hindi, with Punjabi for Sikh profiles. Guard: `__tests__/language-options.test.ts` (4 mutations each proven red). Not verified on a device.

### 28. A Notification Tap Is Counted Once, for the Signed-In Account, and Only With Consent
- A tap is counted when it is **delivered** (`deliverPendingNotificationTap`'s `onDelivered`, after the navigation succeeded), never when it is merely observed.
  A tap seen while signed out, one held past `NOTIFICATION_TAP_HOLD_MS`, an OS link, and a push sent before the backend put a `notificationKey` in it are not counted.
- What is kept is `{ id, key, tappedAt, launchState }` in `lib/notificationTapQueue.ts`: the backend's notification key, when, and whether the tap launched the
  app. Never a title, body, route, screen, notification type or anything typed. The type a tap has is decided by the server from its own send log; the client's
  `data.type` is used only to avoid queueing what the server would refuse, and is never sent. The upload body is exactly six fields and never carries an account id.
- The queue lives in user-scoped storage (`USER_SCOPED_NAMES.notificationTapQueue`), so sign-out and account switches purge it, and a tap is never filed under an
  account that signed in while storage was being read. Never under a fixed AsyncStorage key.
- Nothing is queued or sent unless the person turned on "Help improve reminders" (`profiles.consent_notification_taps`, default off;
  `lib/notificationTapConsent.ts`). It is its own switch, never pre-selected and never inferred from "Share product usage data",
  "Tradition-aware personalization" or any reminder choice, because practice reminders can reflect religious practice. It is offered in three
  places only: an unticked switch at the end of the onboarding notifications step (written after the profile saves, so it can never fail
  onboarding), Settings, and a one-time card in the notifications inbox (`components/notifications/TapConsentCard.tsx`, rules in
  `lib/notificationTapPrompt.ts`: after a week, only while the server confirms off, "Not now" is remembered, at most twice). A failed
  read is `unavailable`, not off: nothing is shown and this device's copy is left as it was. Turning it off closes the gate, empties the
  queue and (backend trigger) deletes the stored taps. The server decides again on every upload and its answer wins.
- Uploading follows section 16: after the app is ready and settled in the foreground, never at the background edge, and a tap leaves the queue only when the
  server acknowledges it. The event id is derived from the notification response, so a response replayed after a restart is recorded once.
- Why this rule exists: on 2026-11-07 the notification audit found nothing recorded that any notification was tapped, so no change to cadence or wording could be judged.
  Mutation-checking the first version found the queue's size limit was enforced twice (on reading and on writing), so removing either was invisible; each now has its own test.
- Known limits, do not assume them closed: on Android the last notification response can persist until cleared, so an old tap replayed at an ordinary launch that was
  never recorded before could be counted when it did not just happen (the server refuses anything over a week old, and a recorded one is deduplicated). Not verified on a
  device, on Android, in a cold start versus a running app, or in any build. The feature records nothing until the backend migration is applied AND the person has opted in.

### 29. HTML Entities Belong in JSX Text, Not in JavaScript Strings
- JSX decodes `&apos;`, `&amp;` and the like in text and in bare attribute strings (`title="Don&apos;t"`). It never decodes them inside a JavaScript string or a `{'...'}` expression: the characters appear literally on screen. In a JS string write the real character (`’`).
- Origin: 2026-11-12. Home's calendar pill showed "Couldn&apos;t check · Retry" (`app/(tabs)/index.tsx`, since 2026-10-07). A sweep of `app/`, `components/` and `lib/` found no other instance. Guard: `__tests__/entity-in-js-string-guard.test.ts` (proven red with the fix reverted). Not verified on a device after the fix.

### 30. A Consent Is Recorded by the Database, With the Wording the Person Saw
- The four profile consents (`consent_religious_data`, `consent_activity_personalization`, `consent_product_analytics`, `consent_notification_taps`) are
  recorded in the backend's append-only, hash-chained `consent_events` ledger by a trigger on `profiles`, whatever path writes them. A write says which
  screen and wording it was made on: the API takes `consent_context`, a direct profile write carries `consent_context_in` (`lib/consentContext.ts`).
  The app sends only a version; the checksum comes from the database's `consent_wording` registry, so a client cannot choose it.
- Editing the explanation of a consent on screen changes what was consented to. Register the new wording as a new version in the backend registry first,
  then bump `CONSENT_WORDING_VERSION` and the pinned checksums in `lib/consentWording.ts`. `__tests__/consent-wording.test.ts` fails if the text on screen
  no longer hashes to its pinned value, and the backend's `consent-wording.test.ts` pins the same list: keep the two equal (section 1).
- A new consent screen or write path must send the context, and a consent with no registered wording on that screen is simply recorded as having none.
- Origin: 2026-11-12 privacy audit. Consents were yes/no flags with one shared, client-supplied timestamp, and no record of when each was given, which
  wording was shown or on which screen. Backend migration `20261112140000_consent_evidence_ledger` is UNAPPLIED: until it is, the context is sent and
  ignored. Not verified on a device. Whether proof of consent should outlive the account is a counsel decision.

### 31. A Signed-Out Person May Read Mandali, and Nothing More
- Founder decision 2026-11-12: a guest sees Mandali posts (`components/mandali/GuestMandaliFeed.tsx`, from the backend's `GET /api/mandali/public-feed`).
  Reacting, commenting, sharing, opening a profile and the post menu show a sign-in prompt; posting, voting and RSVPs need an account, which the
  database enforces. The guest feed carries posts, the author's public username and avatar, and counts. It never carries an account id, a Mandali id,
  the names of people who reacted, comments, poll votes, RSVPs or member lists, and it is never stored on the device.
- A new guest-visible Mandali surface must come from that route (or one built the same way), never from a direct table read. The database also closed
  who-upvoted and who-RSVP'd to signed-in users (backend migration `20261112160000`, UNAPPLIED); posts and comments keep a public SELECT for this.
- Guard: `__tests__/mandali-guest-readonly.test.ts` (three mutations proven red). Not verified on a device, in dark mode, with large text, or against the
  deployed route.

### 32. Keep Files Small Enough to Review: Line Limits With a Shrink-Only List
- A hand-written source file under `app/`, `components/`, `hooks/` or `lib/` stays at or under **800 lines for a screen in `app/`** and **600 lines for everything else**. A
  generated snapshot is exempt only by its `.generated.` name and is rebuilt by its generator, never edited. A content table is not exempt: it is listed like any other file,
  and anything that splits verified spiritual content still follows section 3.
- The files already over their limit on 2026-11-12 are listed with a ceiling equal to their size then, in `__tests__/file-size-guard.test.ts`. A ceiling only goes down. A change
  that has to add lines to a listed file takes at least as many out in the same change. Never raise a ceiling, never add a file to the list, and never delete the guard to make a
  change pass. The guard also fails when a listed file shrinks and its ceiling is left more than 25 lines above it (lower it, so it cannot grow back), and when a listed file
  drops under its limit (delete the entry).
- A new file starts under its limit, and a screen that is heading for it is split by responsibility first, not by line count: a file cut into pieces that only re-export each
  other, or code moved into a data file to dodge the count, is not a split. Signs it is time before the limit: a component with more than about 15 `useState` calls, a
  component declared inside another component's body (it remounts on every render), or a screen that draws, loads, saves and animates in one place.
- How to split (the method that worked for `app/(tabs)/japa.tsx`, 4,093 lines to 1,216):
  - Order by risk: pure display first (an animated drawing, a launcher, a ceremony overlay), then storage helpers, then the hook that loads data, last. State stays in the screen;
    a component takes values and callbacks and draws them. A hook that loads private data keeps the identity, stale-response and cache rules of sections 5, 22, 23 and 24 in one place.
  - Move the text verbatim by a script, not by retyping it, and change only what the move forces (imports, props, a storage call swapped for its helper). Run the typecheck with
    `--noUnusedLocals` filtered to the files involved, and the full test suite, after every extraction, never once at the end.
  - A test that reads a file's text is repointed to the file that now holds the code, with the same assertions, and each is proven red by removing the code it pins. A test
    that still passes after a move can be passing on other text: the Japa ambient-sound check matched a code comment and a different button after the launcher moved out, and
    the launcher row was unprotected until it read the launcher file.
  - Check the screen on a device or simulator one input at a time, from a settled screenshot, taking no action that saves. Never edit, even temporarily, a file the running
    Metro bundler is serving to a live app (see the note below).
- Why this rule exists: on 2026-11-12 `app/(tabs)/japa.tsx` had grown to 4,093 lines (43 `useState` calls, 21 effects, a Meru crown component declared inside the screen that
  remounted on every bead tap, 110 tests that read it as text) and splitting it took a whole session, found three tests pinned to its text and one pinned to a code comment, and
  shipped nothing a person could see. At that point 54 hand-written files were over 600 lines and 22 were over 1,000 (`lib/dharm-veer.ts` 4,048, `app/kul.tsx` 3,699, the Mandali,
  Home and Profile screens near 2,000 to 3,000); 48 are listed. Guard: `__tests__/file-size-guard.test.ts` (four violations each proven red on the real tree, and the
  checker is a pure function with its own tests). Not verified on a device: Japa's extracted screens were checked in light mode on the iOS Simulator only, not on Android, in dark
  mode or with large text.
- Two incidents from that session, so they are not repeated: a mutation test that appended code to a file Metro was serving hot-reloaded into the running app and crashed it
  (run mutation checks on the test file or a copy); and a chain of simulator taps on a lagging screen saved a real practice session to the signed-in account (verify each screen
  before each tap, and never tap a control that saves on a real account without saying so).

### 33. Japa Round Handoff and Timer Ownership
- A counted round stays in the current practice until the device queue confirms its write. Keep the same completion ID and payload across local retries. Once queued, a delivery failure or unreadable response must never reopen the same beads for a new submission.
- Only advance the session duration watermark after durable handoff. Reset it together with the clock and counters on every new practice. Before publishing completion context, recheck the original identity lease after parsing the response.
- Cancel automatic beads when the route blurs, the app leaves the foreground, or a sheet interrupts practice. Commit the bead before starting asynchronous haptics. Automatic ceremony dismissal must not open the sign-in prompt.
- Origin: the 2026-11-12 Japa review found lost rounds on queue-write failure, duplicate partials after an unreadable success response, and late context from a prior account. The Japa auto-advance tests exercise the production handoff, reconciliation, identity and timer helpers.
