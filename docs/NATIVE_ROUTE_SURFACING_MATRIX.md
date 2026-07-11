# Native Route Surfacing Matrix

Last updated: 2026-07-11 (commit `4479322` + follow-up static audit)

Companion doc to the route-surfacing audit that added the Tirtha card to
Home's Community row. This is the committed version of that audit's route
matrix — the original chat report used a binary `launch-ready` label that
was too optimistic; this version uses a four-state status model instead.

## Status model

- **🟢 green** — primary action is either backed by a real API contract
  (`getApiUser`-based server route) with server-side validation, or its
  direct-Supabase write path has been explicitly RLS-audited within this
  engagement (cited below). Ready for AVD smoke; **not** a claim that AVD
  smoke has actually run — this sandbox has no adb/emulator access, so no
  route in this matrix has been device-verified.
- **🟡 yellow / launch-candidate** — screen and route exist, code looks
  complete, but the primary action's write path goes directly to Supabase
  and has **not** been individually RLS-audited in this engagement, and/or
  the write has not been AVD-verified. Should pass smoke, but treat as
  unconfirmed until it does.
- **🔴 red** — known broken or incomplete. None found in this pass.
- **⚪ web-only / deferred** — no native file exists, or explicitly deferred
  per `NATIVE_APP_PARITY_BLUEPRINT.md` / `PRODUCT_CONSOLIDATION_PLAN.md`.

A route lands in yellow purely because its write path hasn't been
re-verified *in this engagement* — that is not the same as "known broken."
Several yellow routes (Japa, Sankalpa) are mature screens that have shipped
for a while; they're yellow because no task in this session's history
specifically re-audited their RLS/write path, not because anything is known
to be wrong with them.

## QA methodology note

`.expo/dev/logs/start.log` shows `metro:bundling:failed` for
`app/(tabs)/tirtha.tsx` under `expo start --web`
(`Unable to resolve "react-native-maps" from "app/(tabs)/tirtha.native.tsx"`).
This is expected: `react-native-maps` has no web target and Tirtha imports
it directly for the temple map. **`expo start --web` / Expo web preview is
not a valid parity-test surface for any screen that imports
`react-native-maps`** — Tirtha specifically must be smoke-tested on a real
Android/iOS build (AVD or device), never via the web bundler. Not an Android
release blocker.

## Route matrix

| Route (native file) | PWA equivalent | Surfaced from | Backend dep | Status |
|---|---|---|---|---|
| Home `(tabs)/index.tsx` | `/home` | entry point | `/api/native/home-summary` | 🟢 green |
| Bhakti `(tabs)/bhakti.tsx` | `/bhakti` | Tab bar | direct Supabase, **reads only** (streak/session stats) | 🟢 green — no write on this screen |
| Japa `japa.tsx` | `/japa` | Home, Bhakti | `/api/japa/complete` for completion, `/api/japa/completion-insight`, `/api/tts/generate`; direct Supabase read for active symbol | 🟢 green for primary completion — no direct completion write remains |
| Pathshala `(tabs)/pathshala.tsx` | `/pathshala` | Tab bar, Home | API routes (Slice 4C/4D migration) | 🟢 green |
| Pathshala lesson `pathshala/[pathId]/[lessonId].tsx` | `/pathshala/...` | Pathshala hub | API routes | 🟢 green |
| Mandali `(tabs)/mandali.tsx` | `/mandali` | Tab bar, Home | direct Supabase, RLS-audited task #181 this session | 🟢 green — audited, not AVD-verified |
| Vichaar Sabha `vichaar-sabha.tsx` + `[id].tsx` | `/vichaar-sabha` | Mandali (Global Sabha tab) | direct Supabase + `/api/vichaar/react`, RLS-audited task #181 | 🟢 green — audited, not AVD-verified |
| Profile `(tabs)/profile.tsx` | `/profile` | Home avatar | `/api/native/progress-summary` (reads) + direct Supabase (profile-edit writes) | 🟡 yellow — edit-write path not RLS-audited this session |
| Settings `settings.tsx` | `/settings` | Profile | `/api/user/delete/{status,request,cancel}` for 30-day account deletion + direct Supabase (notification prefs, consent toggle) | 🟡 yellow — preference toggles are direct Supabase |
| Nitya Karma `nitya-karma.tsx` + 3 sub-screens | `/nitya-karma` | Home, Bhakti | `/api/native/nitya-karma` for sequence and step completion; direct Supabase read for ashrama profile context | 🟢 green for primary Nitya completion |
| Shloka `shloka.tsx` | (embedded in PWA Home) | Home, Bhakti, Notifications | `/api/native/shloka/read` for mark-read / seva write; direct Supabase read for profile state | 🟢 green for primary completion |
| Quiz `quiz.tsx` | `/quiz` | Home | `/api/quiz/daily` + `/api/quiz/save`; direct Supabase read for today's saved response | 🟢 green for primary save — read bypass remains P2 debt |
| Mood `mood.tsx` | `/discover` (partial) | Home mood pill | API route (task #112 migration) | 🟢 green — not re-verified this session |
| Panchang `panchang.tsx` | `/panchang` | Home, Bhakti, Vrat | `/api/native/panchang-viewed` (primary "mark observed" action); direct Supabase for the secondary rashi-picker write | 🟢 green for primary action — rashi write not audited |
| Vrat `vrat.tsx` | `/vrat` | Bhakti, Panchang | `/api/vrat/observe` | 🟢 green |
| Dharm Veer `dharm-veer.tsx` + `[id].tsx` | `/dharm-veer` | Home, Bhakti | `/api/dharm-veer/submit` | 🟢 green |
| Kosh `kosh.tsx` | `/kosh` | Bhakti, Profile (4x) | `/api/user/active-symbol` with `/api/profile` fallback | 🟢 green — no direct symbol write remains |
| My Progress `my-progress.tsx` + 3 sub-screens | `/my-progress`, `/progress` | Home, Profile | `/api/native/progress` + `/api/native/karma-ledger` (task #180 migration, this session) | 🟢 green |
| Notifications `notifications.tsx` | (inbox) | Home bell | direct Supabase + OneSignal, heavily audited tasks #44–66, #156–157 | 🟢 green — audited, not this session |
| Live Darshan `live-darshan.tsx` | `/live-darshan` | Home, Tirtha | direct Supabase, **read-only** | 🟢 green |
| Tirtha `(tabs)/tirtha.tsx` | `/tirtha-map` | **Home (newly added, commit `4e05619`)** | direct Supabase (`tirtha_saves`, `tirtha_checkins` writes) + Overpass API | 🟡 yellow — was unreachable until this pass; write path not RLS-audited; needs AVD smoke before calling it fully launch-ready |
| Sankalpa `sankalpa.tsx` | `/sadhana` (partial) | Home | `/api/sankalpa`, `/api/sankalpa/checkin`, `/api/sankalpa/complete` | 🟢 green for primary create/check-in/complete |
| AI Chat `ai-chat.tsx` | `/ai-chat` | Home | Pramana API | 🟢 green — not re-verified this session |
| Kul | `/kul` | — | — | ⚪ web-only / deferred — no native file; product plan wants it as a primary tab but it isn't built yet |
| Discover / Sadhana journal | `/discover`, `/sadhana` | — | — | ⚪ web-only / deferred — no native file |
| Scoreboard, Messages, Seva, Founding, Sthapaka | corresponding routes | — | payments/moderation/unbuilt | ⚪ web-only / deferred |
| Bhakti "Explore" 10 cards (Puranic Tales, Mantras, Sattvic Mode, etc.) | various `/bhakti/...` | Bhakti (shown as "coming soon") | — | ⚪ web-only / deferred — no native file backs any of them |

## Summary counts

- 🟢 green: 20
- 🟡 yellow / launch-candidate: 3 (Profile edit-writes, Settings preference toggles, Tirtha)
- 🔴 red: 0
- ⚪ web-only / deferred: 4 groups (Kul; Discover/Sadhana; Scoreboard/Messages/Seva/Founding/Sthapaka; Bhakti Explore placeholders)

## What would move a yellow row to green

For each yellow route: an explicit RLS/ownership audit of its write-path
table(s) (same treatment Mandali and Vichaar Sabha got in task #181), and/or
an AVD smoke pass confirming the primary CTA completes and the write lands.
Neither is done here — this doc only reflects what's verifiable by static
code review from this sandbox.

## Change log

- 2026-07-11 — Native Shloka mark-read/seva write moved behind
  `/api/native/shloka/read`, so the primary Shloka completion path is no longer
  a direct client profile/seva write.
- 2026-07-11 — Static audit against current native files corrected stale rows:
  Japa, Quiz, Nitya, Kosh, and Sankalpa now use API-backed primary write paths
  and are no longer yellow for direct completion/action writes. Device visual
  verification is still pending.
- 2026-07-10 — Initial version. Corrects the chat-only report from the
  route-surfacing task (commit `4e05619`), which used an overly broad
  `launch-ready` label. Downgraded 9 routes to yellow per review feedback.
