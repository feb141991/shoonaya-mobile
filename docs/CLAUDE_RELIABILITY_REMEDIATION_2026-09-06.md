# Native Reliability Audit and Claude Execution Plan

Audit date: 2026-09-06. Scope: user-reported Mandali join, Apple token storage, Japa persistence, back navigation, second hero pill, Sacred Library moods, names, and first-use guidance.

Backend: `/Users/Business(C)/Sanatan Sangam/Shoonaya`.
Native: `/Users/Business(C)/shoonaya-mobile`.

This audit used source reads, live public API reads, Vercel environment-name listing, and read-only production schema/function/policy/aggregate queries. No user actions were replayed, production data changed, or application code edited for this audit. Exact physical-device build identity and runtime exceptions remain to be collected. Do not mistake a reproducible code defect for a captured exception from the reported request.

## Findings

### P1: Production Japa completion has diverged from its committed contract

`src/app/api/japa/complete/route.ts:42` invokes `complete_japa_session` with the authenticated client. Production `pg_get_functiondef` shows a function inserting/updating `daily_sadhana.updated_at`. Live `information_schema.columns` confirms that column does not exist. A new completion reaching that statement fails; its transaction rolls back the earlier session insert. This is a concrete explanation for a save returning 500, although the precise exception for the two reported requests was not retrieved.

The damage is broader than one nonexistent column. Compared with `supabase/migrations/20260831060651_atomic_idempotent_japa_completion.sql`, the live function:

- Looks up idempotency by completion ID alone, without user ID.
- Omits the profile row lock that serializes concurrent submissions.
- Omits the original input bounds and profile-existence guard.
- Omits karma/ledger behavior and parts of the streak contract.
- Returns only `session_id`, `already_processed`, `spiritual_date`, instead of the context plus `success`, `sessionId`, `idempotentReplay`, karma and lifetime fields.

Do not just add `updated_at` to make this rewritten function run. Reconcile the full contract and dependent functions against the live schema.

Native `lib/japaCompleteRetry.ts` has bounded in-memory retry only. `app/(tabs)/japa.tsx` creates an operation ID for each persistence invocation. It does not preserve failed completions across process death. A second manual attempt must reuse the original pending operation, not silently generate a new one.

### P1: Mandali creation and membership have mismatched privilege assumptions

Native `lib/mandali.ts:265` calls `find_or_create_mandali` directly and then updates its own profile. Its comment says SECURITY DEFINER. Production's actual function is SECURITY INVOKER. `mandalis` has RLS enabled; its only INSERT policy permits `service_role`. Therefore an authenticated caller cannot create a new city through this path.

Tirana/Albania currently has one row, so creation denial alone does NOT establish the precise failure in the screenshot. Trace the existing-city branch too. Production's `update_mandali_member_count` trigger is also invoker-mode and updates `mandalis`, which has no authenticated UPDATE policy. This can suppress count updates depending on privilege/visibility, and needs transaction-level verification rather than an assumed fix.

The direct location path differs from `/api/mandali/join`, which uses server-derived identity, a ban check and an admin client. Both profile updates lack returned-row assertions; an update affecting zero profile rows can look successful. Two-step creation and profile assignment can leave partial state. Do not broadly grant authenticated users the ability to insert/update arbitrary Mandalis.

### P1: Apple token storage is not configured in Vercel

`src/app/api/auth/apple/store-token/route.ts:34` returns 503 when `isAppleEnvConfigured()` is false. The service requires `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_TOKEN_ENC_KEY`. The production environment-name listing for `sanatani/shoonaya` contains none of these four names. No secret values were read or printed.

Client ID defaults to `com.shoonaya.app`; validate it against the actual Apple identifier configuration. An App Store Connect upload API key is not automatically a Sign in with Apple key. Native transmission is deliberately nonblocking and has no persisted retry, so earlier failed captures need a fresh Apple authorization flow after configuration is repaired. Do not replay old authorization codes or store them in device logs/storage. Verify deletion/revocation as well as token capture.

### P1: Navigation fixes did not establish a consistent history model

Root `app/_layout.tsx` renders `Slot`; tabs define a `Tabs` navigator. No other `_layout.tsx` exists. `BackButton` checks `router.canGoBack()` before consulting its fallback. That boolean says there is history, not that the history points to the expected previous feature. Tabs have no explicit `backBehavior`. Custom bottom navigation uses `router.navigate`.

This combination requires runtime reproduction; this audit did not prove one universal cause for every back action. Specific gaps: Japa paths are absent from inferred fallback mapping, so an unspecified direct-entry Japa child falls to Home. Pathshala lesson fallback can return to the hub instead of the parent path. Replacing every back action with a hub redirect would also be wrong when a reader was opened from search or another reader.

### P1: Sacred Library mood keys never match

Live `/api/bhakti/stotram` returned 56 items: gratitude 5, meditative 15, protective 6, devotional 21, celebratory 2, energetic 7. All items have tags.

The same response's `moodMeta` keys are `morning`, `evening`, `meditation`, `festival`, `difficult`. Native `app/bhakti/browse.tsx:132` compares `s.mood === mood`. None of these button IDs matches any returned item. Backend filter uses the same exact comparison. This is a shared vocabulary defect, not absent content tagging. Fix canonical metadata and filter semantics in the backend/PWA contract; Native already consumes the metadata.

### P2: Second hero pill can disappear by design after a timeout

First pill renders tithi/nakshatra/yoga. Second pill requires eligible observance rows, with publication, profile/location and date-window checks. Their availability is not equivalent.

Native `PanchangPill` renders a skeleton only for pending + no slides; ready-empty and unavailable-empty return null. After bounded attempts, `onExhausted` explicitly changes pending to unavailable, making it disappear. That is a client retry verdict, not proof there is no observance. `PanchangRetryController` exists; no second retry owner should be added.

Its retry effect keys include tradition/location/timezone/date and identity kind, but not authenticated user ID or an explicit calendar-profile/sampradaya revision. Audit account/profile switches with identical locations for stale-response merges. Do not weaken publication filtering or fabricate an observance to keep a pill visible. Inspect the actual user's bucket and materialization failure before claiming backend recovery is fixed.

### P2: Names are missing from the Mandali viewer model

Native Mandali viewer `ProfileContext` / feed DTO has no viewer display name. Member adaptation sets `full_name: member.username`. Post author UI has a name fallback, but that does not personalize the viewer greeting. Private `profiles` now has own-row SELECT only; cross-user display must come from an intentionally safe public projection. Do not undo that privacy restriction to restore names.

### P2: Existing guidance is intentionally not first-use guidance

`lib/homeDiscovery.ts` requires three distinct JS-runtime sessions, rendered content, no active modal and no FirstWeekGuide. Opening the artwork picker also dismisses its cue. This is one artwork hint, not an app-wide tour. FirstWeekGuide is a separate practice checklist. The reported expectation (first-use tips with Done/Skip and replay) is not the behavior currently implemented.

### Cross-cutting: profile gaps and deployment evidence

A production aggregate found 10 auth users, 3 without `profiles` rows. It does not identify the affected tester or establish why those rows are absent: incomplete onboarding, anonymous/test identities and actual provisioning defects must be distinguished. Do not bulk-create/delete rows based on this count.

The observed live function drift is real. Attribution to a specific performance/security change requires migration history and deployment evidence. A migration marked applied does not prove a function has not subsequently been replaced. Source-pattern tests cannot detect this.

Native has uncommitted Atithi work plus concurrent telemetry, Home coordinator and Pathshala changes. Preserve and inspect those changes. Installed build identity is not established by repository HEAD. EAS Update is not yet configured; Native fixes require a new compatible binary under current setup.

## Execution Prompts

Use one phase per scoped commit, retaining evidence and running the stated acceptance checks. Backend owns database/API/content contracts; Native owns navigation and screen behavior. Do not proceed to release while blocking write defects remain. Do not publish, deploy or modify production merely because the audit used read-only production access.

### Prompt 0: Freeze and reproduce the release baseline

Read this audit. Inventory both working trees, current commits, deployed Vercel SHA and installed iOS/Android build numbers. Record separately what is committed, deployed and installed. Capture sanitized request IDs, backend SQLSTATE and error messages for Mandali and Japa; do not log JWTs, Apple codes, private content or names. Record the live definitions, grants, triggers and columns used by these actions and compare them to repository migrations. Determine which migration replaced Japa and changed Mandali privileges; report unknown attribution honestly. Preserve all concurrent changes.

Deliver a compact incident receipt and specific failing contract tests. No production writes. Do not block reproducible fixes solely because an old log is unavailable.

### Prompt 1: Repair Japa atomic completion end to end

Reconcile the original completion migration, live function, get_japa_context, schema and Native/PWA parsers. Create a forward repair migration restoring owner-scoped idempotency, serialization, validation, duration, canonical spiritual-date behavior, streak/karma/ledger semantics and complete response contract. Do not blindly replay the old migration or merely add a phantom column. Test in an isolated database with production-equivalent schema and authenticated role context.

Acceptance: first save persists one session; retry after lost response returns same session; parallel duplicate calls cannot double-award; separate users cannot share/retrieve operations; invalid values fail without writes; injected mid-transaction failure rolls everything back; output parses in both clients. Preserve all existing sessions. Add an owner-scoped durable pending-completion path in Native if failed operations otherwise disappear on termination; acknowledge only on server success and reuse operation ID across restart/retry. Never report karma saved before acknowledgement.

Deliver migration, rollback guidance, behavioral tests and deployment order. Production activation is a distinct release action.

### Prompt 2: Repair Mandali joining without weakening RLS

Trace new-city, existing-city, nearby-join, leave/rejoin, banned-user and missing-profile flows in PWA and Native. Reproduce the reported Tirana failure with a test account after identifying its real failing stage. Unify location joining and join-by-ID around authenticated server entry and one atomic membership transaction, with server-derived user identity, ban checks, validated coordinates and target existence. Preserve existing city canonicalization and duplicate prevention. Ensure counters update under narrowly scoped trusted execution. Verify exactly one profile/membership was changed and return the resulting membership. Keep an old-client compatibility path if existing binaries call the RPC directly; review any definer permission restoration explicitly, including auth checks and execute grants.

Acceptance: parallel first joins create one canonical city; repeat joins are harmless; counts remain consistent; banned/unauthenticated users cannot join; missing profile returns actionable error; no arbitrary public Mandali writes become possible. Verify both old installed-client calls and updated client paths.

### Prompt 3: Complete Apple configuration and token custody

Verify the missing environment names and correct Sign in with Apple key capability. Prepare the four required secret settings without printing them, validate client ID and encrypted token storage. Inspect existing encryption format/key requirements before generating or replacing any key. Test configuration diagnostics in a nonpublic admin surface. After the configured backend is deployed, obtain a fresh Apple code through real-device sign-in, verify successful encrypted custody and an authorized test-account deletion/revocation. Preserve successful login when custody fails but make failure visible to operations. Do not reuse the App Store Connect upload key by assumption or replay historical codes.

### Prompt 4: Repair actual navigation history

Reproduce release-build flows: Bhakti -> Library -> reader -> Back twice; Pathshala -> path -> lesson -> Back twice; Japa -> insights -> Back; search/deep-link reader entry; modal close; Android hardware Back; iOS Back/swipe. Record route stacks and mounted navigator ownership. Establish a root Stack where required, reviewing startup/auth and custom nav consequences; set tab history deliberately. Preserve push/pop history and use parent fallbacks only for direct entry. Give path lessons their actual path parent. Focus-scope hardware handlers and stop reader TTS on departure. Avoid global Home replacements or forcing every back to a hub. Test signed-in, Atithi and cold deep-link entry in iOS and Android release builds.

### Prompt 5: Repair the hero observance loading states

Trace one real failing profile/location/date bucket read-only, including materialization manifest, provenance, publication and worker failure. Preserve scientific/date constraints. Keep PanchangRetryController as the only retry owner. Separate authoritative empty results from exhausted loading attempts; choose a compact retry indication for an unresolved failure. Prevent stale merges across account, profile, sampradaya, location and spiritual-day changes. Preserve bounded request counts and avoid resetting unrelated mood/Sankalpa state. Verify cold/warm/empty/deferred/error/recovery/date-rollover and account-switch cases; do not fabricate festival data for screenshots.

### Prompt 6: Fix Sacred Library mood vocabulary

Align MOOD_META with existing canonical content mood tags, keeping time-of-day categories separate unless an explicit mapping is reviewed. Audit PWA links that use old filter keys and provide explicit compatibility where needed. Require every selectable mood to map to supported semantics. Test the public response and Native filtering with real catalogue fixtures, combined tradition/deity/type filters and clear-all. Verify buttons, results count and empty state on both platforms. No bulk AI retagging needed.

### Prompt 7: Personal names and feature discovery

Define display-name precedence using the user's chosen display name, then safe existing name/username fallback; trim blanks and keep guests Atithi. Carry viewer names through existing safe DTO/cache envelopes and use approved public display fields for community members. Do not expose private profile details or insert names into sacred quotations. Sweep greetings, profile, Mandali headers/member rows and success messages without redundant profile fetches.

Implement contextual first-use guidance with Done/Skip and replay from Settings/Help. Use existing styling and identity-scoped persistence. Keep a single visible cue, wait for usable content, suppress during modals/keyboard/error states, and support screen readers and reduced motion. Reconcile FirstWeekGuide and the three-session artwork cue so neither permanently suppresses the intended introduction. Do not add a second overlapping tour system.

### Prompt 8: Release gate and regression prevention

Verify deployed function definitions and API response shapes, not only migration-history presence. Run authenticated integration checks for actual writes with approved test accounts. Confirm production API SHA and installed binary identities. On physical iOS and Android release builds exercise: Atithi, Apple sign-in/token capture, Japa save/retry/restart, Mandali new/existing join, full back-navigation matrix, Home pending recovery, mood filter, names and first-use guidance. Record pass/fail/blocked for each, with screenshots and sanitized request IDs. Do not close the incident from typecheck or source-string tests. Bundle Native fixes into one tested build; backend repairs alone can reach existing clients only where their current contract stays compatible.

## Recommended Order

Baseline -> Japa and Mandali -> Apple configuration -> navigation -> observance reliability -> mood vocabulary -> names/guidance -> physical-device release gate. Mood metadata is small enough to prepare alongside backend repair. Hold further shared performance/RLS rewrites until these contracts are exercised end to end.
