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
