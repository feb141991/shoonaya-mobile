# Sanskara: prompts for the Native screen and the backend lifecycle hooks

Two separate prompts (one objective each, one commit each). **Prompt 1 is the product.** Prompt 2 is plumbing that makes it safe to ship.
Written 2026-10-31 from the state of both repositories on that date. Paste each prompt on its own.

What is already done, so nobody redoes it: the database model (migrations M1 to M4a, applied to the live project), the Kul display-only
pointer, and the route layer `/api/native/sanskara/[action]` with its contract in the backend repo
(`src/lib/native-sanskara.ts`, tests beside it). **Nothing in this repository calls any of it yet.**

---

# PROMPT 1: Native Sanskara client and screen (repo: `shoonaya-mobile`)

## Goal

Build the Sanskara tracker for Native: a person's own life-milestone timeline, the timelines of children they manage, and what others
have shared with them, drawn as a **living tree you can pan, pinch and tap**, in the same visual language as Parampara in Pathshala. It
holds private family data, so it must be more interactive than Parampara (the user adds, dates, completes, shares and removes things),
and every private-data rule below is a hard requirement, not polish.

Read first, in this order: `AGENTS.md` (all of it; sections 3, 5, 8, 12, 17, 19, 20 bite hardest), then
`../Sanatan Sangam/Shoonaya/docs/SANSKARA_TRACKER_AUTHORIZATION_CONTRACT.md` and `.../SANSKARA_TRACKER_BACKEND_DESIGN.md`.

## The design reference: copy it, do not reinvent it

Before styling anything, open these and copy their exact patterns (AGENTS "Styling: match existing DNA"). Name in your report which one
you matched for each decision.

| Need | Copy from |
|---|---|
| Pan and pinch graph on an SVG canvas (Reanimated shared values, Gesture Handler, scale limits 0.4 to 2.8, haptics) | `components/lineage/LineageGraphCanvas.tsx` |
| Layout engine producing nodes and edges from data | `lib/lineageLayout.ts` (and, for a family tree, `lib/vanshLayout.ts`, `components/kul/VanshGraphCanvas.tsx`) |
| Tap a node, a sheet slides up with its details | `components/lineage/LineageNodeSheet.tsx` (a `Modal`) and `app/lineage/[id].tsx` for the screen frame, back button, share and empty state |
| The entry card shown inside Pathshala | `components/lineage/LineageCarousel.tsx`, mounted at `app/(tabs)/pathshala.tsx:945` |
| Cards, pressables, icon wells | `components/ui/Card.tsx`, `PressableSurface.tsx`, `SacredIcon.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx`, `SkeletonLoader.tsx`, `SacredLoader.tsx` |
| Every colour, font, radius, spacing, shadow, touch target | `lib/constants.ts` only (`COLORS`, `themeColor(isDark)`, `FONTS`, `TYPE`, `RADII`, `SPACING`, `SHADOWS`, `MIN_TOUCH_TARGET`). No new hex or rgba literals. Check `docs/NATIVE_VISUAL_DEBT_MATRIX.md` first |

The founder referred to "sacred trees and Parampara in Pathshala". I found the Parampara lineage graph and the Kul Vansh family canvas.
Use those established components as the implementation references; record any remaining visual assumption in the report.

## The concept: a tree of milestones

- The **trunk** is a person's life, oldest to newest by planned or completed date. A person with no dated milestone shows a young sapling
  and one clear "plant your first milestone" action, not an empty list.
- Each **milestone** is a node: *planned* (a bud), *completed* (in bloom), *undated* (a seed on a short stalk). **There is no "overdue" or
  "due now" state anywhere**, and no copy that says a rite should happen now (AGENTS 3; decision D3).
- **Whose tree** is chosen with chips along the top: "Me", then each child the user manages, then "Shared with me". Switching trees
  animates the canvas, keeps pan and zoom per person, and never shows two people's data at once.
- **Shared with me** is not a tree of someone else's life. It is a read-only list of the single records others chose to show, each with
  who shared it. A shared Class A record shows its title and whether it is done, never its dates (the backend already enforces this;
  do not try to show more).
- Interactions to build (this is the part that must feel alive): pan and pinch; tap a node for its sheet; long-press the trunk to plant a
  milestone at that point in time; a spring "bloom" and a light haptic when something is marked done; drag-free, reachable controls; a
  smooth sheet. **Respect reduced motion** (static state, no springs) and keep every touch target at `MIN_TOUCH_TARGET`.

## What each node's sheet contains

1. **Details**: title, planned date (`components/ui/DatePickerField`), "mark done" with its date, and an explicit "not done" that sends `completedDate: null`.
2. **Private details** (notes, place, who performed it, expected due date): a lock icon and the words "Only you can see this". Shown only
   where the response includes the `private` object. Never rendered in any shared view, never logged, never put in analytics or a notification.
3. **Sharing**: who can see this (from `access`), "Share with…" choosing a **named Kul member** from the existing Kul snapshot, revoke.
   Whole-timeline sharing exists in the API but covers only non-private records; make that distinction visible in the copy.
4. **Reminder**: behind a constant `SANSKARA_REMINDERS_LIVE = false` (see below).
5. **Delete**, with a confirmation that says what is lost and that it cannot be undone.

## Children, the family-tree link and the hand-over

- "Add a child": name (max 40), date of birth with `DatePickerField` (a minor today; the API refuses 18 and over, and before 2000),
  and an optional **"Link to a family-tree person"** picker built from the existing Kul snapshot. Copy it as: "Only you see this link.
  Others in your Kul cannot tell." The link is display-only: use it for the child's avatar and name in the chip. **Never** draw any
  Sanskara marker, count or indicator on the Kul tree itself, and never show anything on a tree person that reveals that records exist.
- `kulFamilyMemberId` comes back `null` when the link is hidden (the manager left the Kul, or the tree person changed). Treat null as "no
  link", not an error, and do not try to restore it.
- Managers: list, add (a Kul member), remove (never the last; the API refuses).
- **Hand-over at 18**: when a child turns 18 the manager becomes a *former manager* (read-only for 12 months). Build the claim flow:
  "Start hand-over" shows the one-time token **once** with a clear "this is shown only now" note, never stored on the device, never logged;
  "Cancel hand-over"; and, on the new adult's own account, "I have a hand-over code" taking the 64-character token. The stored retry
  response omits the token on purpose, so a lost response means starting again.

## The API you call (already built; do not change the backend)

Base `/api/native/sanskara/<action>` through `apiFetch` (Bearer auth is handled there). Reads are `GET`. Every write is `POST` with a JSON
body that **must include `requestId`**: a UUID you generate **once per user action and reuse on a retry** (the server returns the stored
response, marked `replayed`). A reused `requestId` for a different action is a 409.

Reads: `timeline`, `dependents`, `shared-with-me`, `reminders`, `export`, `access?subject=<uuid>`.

Writes (camelCase, exactly these keys; any other key is a 400):

| Action | Body |
|---|---|
| `create-dependent` | `requestId, name, birthDate (YYYY-MM-DD), kulFamilyMemberId?` |
| `set-kul-link` | `requestId, subjectId, kulFamilyMemberId` (**the key is required; `null` unlinks**) |
| `create-record` | `requestId, subjectId, riteKey ("custom" is the only rite at launch), customTitle (required for custom, max 60), plannedDate?` |
| `update-record` | `requestId, recordId, customTitle?, plannedDate?, expectedVersion` |
| `save-private` | `requestId, recordId, notes?, location?, performedBy?, expectedDueDate?, expectedVersion` |
| `set-completion` | `requestId, recordId, completedDate` (**key required; `null` = not done**), `expectedVersion` |
| `delete-record` / `delete-dependent` | `requestId, recordId` / `requestId, subjectId` |
| `delete-mine` | `requestId` |
| `add-manager` / `remove-manager` | `requestId, subjectId, accountId` |
| `grant-view` | `requestId, subjectId, recordId` (**`null` = the whole non-private timeline**), `granteeId` |
| `revoke-grant` | `requestId, grantId` |
| `start-claim` / `cancel-claim` | `requestId, subjectId` |
| `accept-claim` | `requestId, token` (64 hex characters) |
| `set-reminder` | `requestId, recordId, leadDays (0 to 365), enabled` |

`expectedVersion` is optimistic locking. For `update-record` and `set-completion`, send the record’s `version`. For `save-private`, send `record.private.version`, or **0 when `private` is null**; the private row has its own version, independent of the record. Refetch after saving private fields (clearing all private fields deletes that row, returning its next expected version to 0). A version mismatch means someone else changed it; refetch and tell the person, do not overwrite silently.

Responses (read the function bodies in `../Sanatan Sangam/Shoonaya/supabase/migrations/20261029160*` and `20261030100000_*` for the
exact JSON before you write types; the shapes below are a guide, not a contract):
- `timeline` -> `{ subject_id, records: [{ id, rite_key, custom_title, sensitivity: 'A'|'B', planned_date, completed_date, version, private: {notes, location, performed_by, expected_due_date, version} | null }] }`
- `dependents` -> `[{ id, display_name, birth_date, kul_family_member_id | null, can_edit, can_manage, records: [...] }]`
- `shared-with-me` -> `[{ record_id, subject:{id,kind,label}, shared_by:{id,username,full_name}, rite_key, custom_title, sensitivity, completed, planned_date?, completed_date? }]`
- writes return small objects such as `{ id }`, `{ linked }`, plus `replayed: true` on a retry.

Write TypeScript types **and runtime guards** for every response (the repo's `isKulSnapshot` is the model) and treat a response that fails
its guard as an error, never as an empty list (AGENTS 18).

Errors: HTTP 400 carries `field` (the first bad input, by public name); 401 sign in again; 403 `sanskara_consent_required`; 404 "not found" (it
also means "not yours", by design, so never say which); 409 with distinct reasons (`sanskara_version_conflict`, `sanskara_request_conflict`, duplicate record/manager/share, or claim conflict); 422 with distinct rule reasons (limit, last manager, eligibility, missing date, completed record, reminders disabled); 429 rate limit; 503
generic. **Never show a response's `error` text, a status code or a database detail on screen.** Route every failure through
`describeFailure(error, 'your own sentence')` (`lib/user-facing-error.ts`; the guard test fails otherwise). On `sanskara_consent_required`
send the person to the existing religious-data consent control.

## Hard rules (each one has a test or a review gate)

1. **Identity.** Never send a user id. The server derives it. Cache and screen state are keyed by identity: user, profile, language and a
   content/schema version (AGENTS 5). Clear every Sanskara cache on sign-out and on account switch. Never show one account's data to another.
2. **Encrypt at rest.** This is family and religious data (AGENTS 5). Find how the Kul snapshot is cached and follow it. If that layer does
   not encrypt, **stop and report**; do not invent a store and do not add a native module (it would not ship over the air; AGENTS 12).
3. **Stale and offline.** Render a validated same-identity cache immediately, revalidate in the background, mark stale date-sensitive
   content visibly, and never let a cache authorise a write. A failed refresh must not wipe usable content or show a transport error (AGENTS 5, 18).
4. **Typed input.** Dates only through `DatePickerField` and `lib/date-input.ts`; never send raw typed text. Re-validate in the payload
   builder (AGENTS 12). Tests with malformed input are required: `18081991`, `2026-02-30`, `2026/02/03`, empty, whitespace, a non-existent leap day.
5. **Reminders (AGENTS 6, 19; decision D4).** The database accepts reminder preferences, but **no reminder producer exists yet, so nothing
   will ever be sent.** Put the whole reminder UI behind `SANSKARA_REMINDERS_LIVE = false` and do not show copy that promises a
   notification. When it is later turned on, `profiles.wants_sanskara_reminders` is an explicit, per-category, default-off switch;
   "Not now" on the OS push prompt is never consent to it.
6. **Content integrity (AGENTS 3).** Only the `custom` rite exists. No sixteen-samskara catalogue, no suggested dates or timings, no
   generated or AI text, no scripture or "auspicious time" claims. Anything not sourced is simply not shown.
7. **Notification route (AGENTS 20).** `/kul/sanskara` is the link the backend already writes. Create the screen at that path
   (`app/kul/sanskara.tsx`), remove the `/kul/sanskara -> /kul` fallback in `lib/routes.ts`, and flip the matching rows in
   `__tests__/notification-routes-contract.test.ts` (currently `opens: '/kul'` and `screenExists('/kul/sanskara') === false`). Add any
   new screen to the router test or list why it is not a link target.
8. **Layout (AGENTS 12, 17).** Reserve `useSafeAreaInsets().bottom` yourself on every bottom action (check Android 3-button navigation as
   well as gestures); every `Text` beside an icon or button in a row gets `flex: 1` and an explicit `lineHeight`.
9. **Do not touch** the backend repository, any migration, or any unrelated dirty file. If Native needs something the backend does not
   offer, **write it down in your report and stop that part**.

## Entry points

A "Sanskara" card in Pathshala beside `LineageCarousel`, an entry in the Kul screen, and the notification link. Opening it for the
first time creates the person's own subject on the server automatically (`timeline` does this); do not create anything on the client.

## Files you will likely create or change

`lib/sanskara.ts` (client, types, guards, request ids, identity-keyed cache), `app/kul/sanskara.tsx`, `components/sanskara/*` (canvas,
node sheet, chips, add-child sheet, sharing sheet, hand-over flow), `lib/sanskaraLayout.ts`, `lib/routes.ts`,
`__tests__/notification-routes-contract.test.ts`, new tests for the client, the guards, the cache isolation and the malformed dates.
Update `docs/NATIVE_VISUAL_DEBT_MATRIX.md` if you add or fix a styling item.

## Verification before you say it is done

Run the type check and the full test suite and report **passed, failed and skipped** (not only passed). Then, on a real iOS Simulator and
an Android emulator: light and dark; large text; reduced motion; every sheet; empty, loading, error, offline and consent-needed states;
44 px targets; Android 3-button bottom inset. **Use two accounts** to prove that account B never sees account A's data, that a share is
visible to the grantee only, and that sign-out clears the cache. State what you did **not** verify (push, real device). Do not call it
release-ready on simulator evidence (AGENTS 6, 7).

## Hygiene

One scoped commit, with the changed files listed and proof that unrelated dirty files were not staged. Do not push, deploy, apply
migrations or start paid infrastructure. Report any defect you find in the backend contract rather than working around it.

---

# PROMPT 2: Sanskara lifecycle: leave, remove, account deletion, export (repo: `Sanatan Sangam/Shoonaya`)

## Goal

Make sure a person's Sanskara data is handled correctly at the edges of its life, **proved by tests that fail without the fix**, before the
screen in Prompt 1 is released to anyone. Contract section 9 (cases E1 to E10) is the specification.

## First, audit; do not assume

The design doc lists "the leave and remove hooks" and the account-deletion hooks as unverified. Part is already there: M4 has the
`sanskara_kul_membership_end` trigger on `kul_members` and the subscription cleanup triggers, and the admin account-delete list gained the
Sanskara tables. **Before writing anything**, read the contract (cases E1 to E10), the M2 to M4a migrations and their tests, and produce a
table: for each case, "covered by (migration, test)" or "not covered". Write **failing tests first** for each uncovered case, then
implement the smallest change that makes them pass.

Cases to check at minimum: a grantee leaves or is removed from the Kul (grants void, subscriptions cancelled); a sharer leaves or changes
Kul (every grant they made is void); a manager leaves, is removed or deletes their account (a dependent with another manager stays; if
they were the last, the hand-over offer; otherwise the dependent is deleted, "deletion over disclosure"); consent withdrawn (shares
suspended, 30-day purge unless consent returns); the 18th birthday sweep; full account deletion (the person's own subject, their records,
grants given and received, managers and claims, subscriptions and candidates, with no orphan); and `sanskara_export_mine`.

Also verify, with a test, that **account deletion removes the Kul pointer's effect** and that deleting a Kul tree person never changes
anyone's access (already tested for the pointer; keep it passing).

## Constraints

- A new migration is **written, tested on a scratch Postgres and left unapplied**. Applying it to the live project is the founder's step
  (and note that applying through the MCP tool is blocked by the auto-mode classifier). Give the exact SQL and the version-repair command.
- Provide a rollback file and a test file in the existing style (`supabase/tests/sanskara_*.test.sql`, `supabase/rollbacks/`), and prove the
  rollback by applying it and re-running the earlier Sanskara tests. Run **all five** existing Sanskara test files on the new head.
- The scratch database needs stand-ins for the Supabase tables (`auth.users`, `auth.uid()`, `profiles`, `kuls`, `kul_members`,
  `kul_family_members`, `notification_candidates`, `notification_schedule`, `safe_timezone`) built from **production's real column list**,
  not guessed. Before trusting it, apply M1 to M4a to it and require the existing four test files to pass.
- Prove each new test is not vacuous: break the behaviour on purpose and show the test go red.
- Do not run `supabase db push` (AGENTS 4). Do not touch the route layer, the Native repository, or any unrelated dirty file. One scoped commit; do not push.
- **Out of scope here (separate prompt):** M5, meaning the retention, consent-purge, majority-sweep and reminder-producer scheduled jobs.
  Do not schedule anything. Reminder production stays off until the old PWA producer (`POST /api/sanskar/schedule`) is disabled.

## Report

The audit table first; then what you changed and why; the tests you added; the mutation checks; the exact apply and rollback commands; and
what you did not verify (a real Supabase branch, concurrency).

---

# For the founder, not for an agent

- Apply `20261031090000_unschedule_redundant_net_response_purge` (the redundant purge job is still scheduled).
- Check Supabase Reports > Database > Disk I/O for 03:00 to 04:30 UTC on 28 to 31 October, and the compute size
  (see `docs/DB_CRON_STALL_PROFILE_2026-10-31.md` in the backend repo). The nightly failures are an I/O stall, not bloat.
- Decide `nightly-personalise` (retire it, or rewrite it like `daily-kul-nudge`; fixing it restarts AI spend).
- Name the qualified reviewer for any tradition-scoped timing (decision D3). Until then the tracker ships with custom milestones only.
- Disable the old PWA Sanskara routes (`/api/sanskar/*`) before any reminder producer is scheduled.
