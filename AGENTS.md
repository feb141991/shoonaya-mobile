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

### 21. A Screen Calls the Route for Its Own Slice, Not the Aggregate
- `/api/native/home-summary` is Home's aggregate (profile, calendar, observances, sadhana, sankalpa, Dharm Veer). A screen that needs one slice of it must call a route that computes only that slice, never `home-summary` with the rest discarded: whatever is slow or failing in an unrelated slice then holds this screen open, and a 503 from the aggregate becomes this screen's error. If no such route exists, add one in the backend (section 1) and keep a 404-only compatibility fallback (`lib/shlokaToday.ts`: `home-summary?skipCalendar=true`) so an over-the-air update shipped before the backend deploy still works. A fallback is for "route not deployed" (404) only; a 401, 503 or network failure is the answer and must reach the screen unchanged.
- The Shloka screen reads today's text from `GET /api/native/shloka/today`. It deliberately has no persisted cache: the text is chosen on the server by `getDayOfYear()` (server-local day) for non-Hindu traditions but by the profile's timezone for Hindu, so a cache keyed by the device's date can show yesterday's or tomorrow's verse as today's. A correct cache needs the server to return the day it computed for (a `dayKey`) and the client to key by user, tradition, language, that `dayKey` and a content version, and to label itself stale (sections 5 and 9). Do not add one without that.
- Why this rule exists: on 2026-10-30 the Shloka screen hung while the Supabase database stalled (23:30-23:34 UTC) because it fetched the whole Home aggregate to read one field, `sacredText`. In the same window a session for a deleted account was answered with the aggregate's retryable 503 (backend `AGENTS.md`, "A Deleted Account Is Not an Outage"). Guard: `__tests__/shloka-today.test.ts` fails if the screen calls `home-summary` again or the fallback widens beyond 404.
- Audited in the same review and not changed (single-slice callers or duplicated fetches, each needs its own measurement and review): `app/my-progress/shields.tsx` could read `/api/native/progress-summary` after checking `highlights.totalSessions` and streak semantics match; the Dharm Veer detail screen refetches a roster it could reuse; the festival-quiz banner and screen could share one cache; `QuizSparkCard` could use `lib/quizCache.ts`; `festival/[slug].tsx` wants a by-slug route after calendar-governance review (section 2).
- Closed 2026-10-30: `app/shloka.tsx` now isolates profile load errors (section 18). Today's verse remains visible while the streak card and "read today" state are hidden; "Mark as read" is disabled until a successful read; an accessible retry affordance displays `describeFailure(profileError, 'Could not load your reading streak. Please try again.')` with a 44px min touch target. A repo-wide sweep fixed 5 additional unchecked Supabase reads (`app/bhakti/insights.tsx`, `app/(tabs)/tirtha.tsx`, `app/mantras.tsx`, `app/nitya-karma.tsx`, `app/seva.tsx`), guarded by `__tests__/shloka-profile-error.test.ts`.
- Not verified on a device: that the Shloka screen renders from the new route, and that a deleted account reaches the sign-in screen. Both are covered by unit tests and by reading `@supabase/auth-js` 2.110.0 (a non-retryable refresh failure removes the session and emits `SIGNED_OUT`), not by running the app. Similarly, rendering of the Shloka profile retry card under error conditions on a physical device/simulator was not verified directly; styling, touch targets, and accessibility bounds were verified via code contracts and test suites. This applies equally to human and AI-agent contributors.

### 22. Narrow Readers Still Need Lifecycle Isolation
- Shields renders counters only for the current identity; late responses from a previous identity cannot publish counters or errors. Dharm Veer detail invalidates older story requests when its route or identity changes. A smaller endpoint does not remove either requirement.
- Festival detail must never manufacture resolved or verified occurrences when canonical data is unavailable, or derive Pitru Paksha days from a fixed Gregorian start. Explicit child links are content navigation; date links await canonical results.
- Origin: the 2026-10-31 build review found Shields lacked a post-request identity check, Dharm Veer allowed out-of-order story responses, and festival detail still fabricated verified 2026 dates. Guards: reader-request-lifecycle.test.ts and festival-date-governance.test.ts. Physical-device verification remains separate.
