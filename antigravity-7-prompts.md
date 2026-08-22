# 7 sequential prompts — verified performance/cleanup fixes for Shoonaya web repo

Each prompt is self-contained (no shared context needed between them). Execute in order.

---

## Prompt 1 — Remove orphan root scratch files

```
In the repo "/Users/Business(C)/Sanatan Sangam/Shoonaya", remove the following
files from the workspace root -- confirmed via `git status`/`ls` to be orphan
scratch/debug artifacts, not referenced by any import or build config:

- scratch-ekadashis.ts (41 KB)
- patch_chat.ts, patch_retrieval.ts, patch_ui.ts
- live_schema_dump.sql (978 KB), supabase_schema_dump.sql (311 KB),
  supabase_schema.json (825 KB)
- Two stray zero-byte files literally named `20` and `next`

Before deleting each, grep the full repo (excluding node_modules) for any
import or reference to confirm it's genuinely unused:
  grep -rn "scratch-ekadashis\|patch_chat\|patch_retrieval\|patch_ui" src/ scripts/ --include="*.ts" --include="*.tsx"

If any file turns up a real reference, stop and report it instead of
deleting. Otherwise `git rm` all of them, run `npx tsc --noEmit` to confirm
zero impact, and commit as a standalone cleanup commit.
```

---

## Prompt 2 — Fix YouTube Data API quota waste in sync-live-darshans

```
In the repo "/Users/Business(C)/Sanatan Sangam/Shoonaya",
src/app/api/cron/sync-live-darshans/route.ts (around line 63) calls:

  https://www.googleapis.com/youtube/v3/search?part=id&channelId=${row.youtube_channel_id}&eventType=live&type=video&key=${YOUTUBE_API_KEY}

`search.list` costs 100 quota units per call (out of a 10,000/day free
quota) -- expensive for what is just "is this channel live right now."

Fix: replace with `youtube.videos.list` scoped to each channel's known
live/upcoming broadcast IDs if already tracked, OR use the channel's
uploads/live RSS feed (https://www.youtube.com/feeds/videos.xml?channel_id=...)
as a free, quota-free alternative for detecting a new/live video, falling
back to a `videos.list` call (1 unit) only to confirm liveBroadcastContent
on a specific candidate video ID -- never call `search.list` in the
steady-state polling path.

Read the full route.ts file first to understand how many channels are
polled per cron run and what the downstream code does with the result
(what fields it reads from the response) before changing the call, so the
replacement returns everything currently consumed.

Verify: run `npx tsc --noEmit`, and if there's a way to dry-run this cron
locally against a real (or test) channel ID, confirm it still correctly
detects a live video. Report the old vs new quota cost per cron run based
on the actual number of tracked channels in the `darshan_channels` (or
equivalent) table.
```

---

## Prompt 3 — Trim unbounded `select('*', observance_definitions(*))` in two crons

```
In the repo "/Users/Business(C)/Sanatan Sangam/Shoonaya", two cron routes
fetch full rows plus a full joined object where only a few fields are
actually used downstream:

- src/app/api/cron/festival-email/route.ts:45 —
  .select('*, observance_definitions(*)')
- src/app/api/cron/calendar-health/route.ts:70 —
  .select('*, observance_definitions(*)')

For each, read the rest of the function to find every field actually
referenced from the query result (both the top-level row and the joined
observance_definitions object), then narrow the .select() to name exactly
those columns instead of '*'. Do not guess which fields are needed --
trace the actual usage in the function body.

This is a low-risk, mechanical change -- no behavior should differ, just
less data transferred per row. Verify with `npx tsc --noEmit` and, if
either cron has a dry-run/test mode, run it and confirm the output is
byte-for-byte identical to before the change.
```

---

## Prompt 4 — Fix N+1 query in japa-reminder (timezone-aware batching)

```
In the repo "/Users/Business(C)/Sanatan Sangam/Shoonaya",
src/app/api/cron/japa-reminder/route.ts loops over every user with
japa_reminder_enabled and, inside the loop, does one sequential
`daily_sadhana` query per user (lines ~58-63):

  const localDate = getLocalDateIso(now, tz);   // tz varies per user!
  const { data: sadhana } = await supabase
    .from('daily_sadhana')
    .select('japa_done')
    .eq('user_id', user.id)
    .eq('date', localDate)
    .maybeSingle();

IMPORTANT: `localDate` is computed PER USER from their own timezone (a
user in Sydney and one in New York can have different local dates at the
same instant) -- so a single flat `.in('user_id', allUserIds).eq('date',
someSharedDate)` batch query would be WRONG, not just an optimization; it
would silently check the wrong day for users whose local date differs
from whichever date got picked.

Correct fix: group users by their computed `localDate` first (most users
will cluster into 1-3 distinct dates, not one per user), then run ONE
batched query per distinct-date group:

  .from('daily_sadhana')
    .select('user_id, japa_done')
    .in('user_id', groupUserIds)
    .eq('date', groupLocalDate)

This turns N sequential round-trips into roughly (number of distinct
local dates among enabled users) round-trips -- typically 1-3, not
hundreds.

Verify: `npx tsc --noEmit`, and if there's a dry-run mode
(isDryRun/skipDelivery pattern used elsewhere in this codebase's crons --
check other cron routes for the exact pattern), run it and confirm the
set of users flagged as "eligible" (japa not done) is identical before
and after the change. Report the actual round-trip count reduction based
on how many users currently have japa_reminder_enabled = true.
```

---

## Prompt 5 — Fix AI chat's hardcoded FESTIVALS_2026 fallback (correctness bug, not just perf)

```
In the repo "/Users/Business(C)/Sanatan Sangam/Shoonaya", two files import
and use FESTIVALS_2026 (a hardcoded 2026 festival list from
src/lib/festivals.ts) as a fallback/default:

- src/app/api/ai/chat/route.ts:11,277
- src/lib/tirtha-companion.ts:2,124 (getSeasonalTirthaCue's default param)

This is a real correctness bug, not just a performance issue: once 2027
arrives, any code path that falls through to this default will silently
serve stale 2026 festival dates in AI chat responses and tirtha
recommendations.

Fix: replace the FESTIVALS_2026 fallback with a live query against
observance_occurrences (or whatever the current canonical read path is --
check src/lib/calendar/resolve-occurrences.ts and
src/lib/calendar/observance-formatter.ts for the established pattern
other live surfaces already use) scoped to the current year at call time,
not a hardcoded year. Read both call sites fully first to understand
exactly what shape of data (Festival[] type) each one expects back, so
the replacement returns a compatible shape without needing to change
every downstream consumer.

This touches a live, user-facing AI surface -- after implementing, run
`npx tsc --noEmit` AND manually trace (or write a quick verification
script, not just type-check) that calling the affected function/route for
a date in 2027 returns real 2027 festival data, not empty/stale results.
Report exactly what query replaced FESTIVALS_2026 and confirm no other
file still imports FESTIVALS_2026 as a live-data fallback after this
change (grep to confirm).
```

---

## Prompt 6 — Digest generation: timezone-aware memoization (not a flat date key)

```
In the repo "/Users/Business(C)/Sanatan Sangam/Shoonaya",
src/app/api/digest/generate/route.ts generates one LLM call per user in
its batch loop (~line 265): `generateDigest(tradition, level, userPanchang)`.

IMPORTANT CONTEXT: userPanchang is deliberately computed per-user timezone
-- `getTodayPanchang(undefined, user.timezone ?? 'Asia/Kolkata')` -- with
an existing code comment explaining why: a user in Sydney at 23:00 UTC is
already in tomorrow's tithi, one in New York at 23:00 UTC is still on
yesterday's. Any memoization MUST preserve this -- do not key a cache
purely by (tradition, level, a single shared date), that would silently
reintroduce the exact bug this per-user computation exists to prevent.

Correct fix: memoize generateDigest results within one cron run by the
FULL key (tradition, level, userToday) where userToday is each user's own
already-computed local spiritual date (already available in the loop as
`userToday = localSpiritualDate(user.timezone ?? 'Asia/Kolkata', 4)`) --
NOT by user.timezone directly, since multiple timezones can share the
same local calendar date on a given run. Build a Map<string, Promise<Digest>>
keyed by `${tradition}|${level}|${userToday}` at the top of the batch
loop (or one level up, shared across all batches in the run), and have
each user's generation step check/populate that map instead of always
calling generateDigest fresh.

Scale note for context, not a code change: as of this review the actual
user base is small (~15 users across ~5 distinct timezones), so the
current savings from this fix are modest in absolute terms -- this is a
correctness/architecture fix that pays off as the user base grows, not a
dramatic cost cut today. Implement it correctly regardless; don't skip it
because the current numbers are small.

Verify: `npx tsc --noEmit`, and if there's a dry-run mode, run it and
confirm (a) the total unique LLM calls made in one run now equals the
number of distinct (tradition, level, userToday) combinations actually
present among eligible users that run, not the raw eligible-user count,
and (b) every user still receives content correctly personalized to
their own tradition/level/local date -- no user should ever receive
another user's cached digest if their (tradition, level, userToday)
triple genuinely differs.
```

---

## Prompt 7 — Code-split heavy scripture/story data out of the client bundle

```
In the repo "/Users/Business(C)/Sanatan Sangam/Shoonaya", four large data
files are imported by real, user-facing 'use client' components, meaning
their full size ships in the browser JS bundle for those pages:

- src/lib/stotrams.ts (1.43 MB) -- imported by API routes AND by
  src/app/(main)/bhakti/page.tsx
- src/lib/katha-library.ts (1.37 MB) -- imported by
  src/app/(main)/bhakti/katha/KathaClient.tsx (confirmed 'use client')
- src/lib/gita-full-data.ts (776 KB) and
  src/lib/upanishads-full-data.ts (777 KB) -- both re-exported via
  src/lib/library-content.ts, which is imported by 'use client' components
  src/app/(main)/pathshala/PathshalaClient.tsx,
  src/app/(main)/pathshala/[pathId]/recite/ReciteClient.tsx, and
  src/components/pathshala/CanonicalReader.tsx

Before changing anything: run `npx next build` (or check an existing
build output / .next/analyze if bundle analysis is already configured --
look for a `@next/bundle-analyzer` devDependency and any existing npm
script for it) to get a REAL baseline bundle size for each affected route,
so the before/after comparison is measured, not assumed.

Fix, per file: convert each large static dictionary into individual
per-item (or per-chapter, for gita/upanishads) JSON files under a
`/data/` directory (or fetch them from Supabase if a suitable table
already exists -- check for one before inventing a new storage path),
and change the client components to fetch/import only the specific
item/chapter being displayed, not the entire dictionary. API routes that
currently import these files server-side (src/app/api/bhakti/stotram/*,
src/app/api/bhakti/katha/*) can keep reading the full data server-side if
needed (server-side size doesn't hit the client bundle the same way) --
focus the actual splitting effort on what the 'use client' components
pull in.

Verify: `npx tsc --noEmit`, run the build again, and report the REAL
before/after JS bundle size for each affected route (bhakti, bhakti/katha,
pathshala, pathshala/[pathId]/recite) -- do not estimate or round to a
marketing-style percentage, report the actual measured byte difference
from the build output. Also manually verify (or screenshot) that each
affected page still renders its content correctly after the change --
this touches real display logic, not just data loading.
```

---

## Deliberately NOT included in this batch (flagged, not forgotten)

- **`materialize.ts` "4000+ recalculations" CPU claim** — the caching this
  would add already exists in `packages/dharma-rules/src/conditions/evaluator.ts`
  (a 4096-entry memoized cache keyed by date+lat+lon). Don't implement the
  proposed fix without first profiling where the cron's actual time goes
  (likely the multi-location extension pass, not redundant trigonometry).
- **Retiring `src/lib/strategies/`** — not dead code. `useSacredCalendar.ts`
  imports it and is used by real components (`PanchangDetail.tsx`,
  `PanchangWidget.tsx`). Needs a real migration plan to `panchang-engine`'s
  native tradition handling before anything gets deleted, not a blind removal.
- **DB composite indexes** (`recommendations(date,type)`,
  `observance_occurrences(calendar_profile,year,occurrence_date)`) — not
  confirmed necessary without running `EXPLAIN` against real query
  patterns first. `daily_sadhana(user_id,date)` already exists, contrary
  to the original audit's suggestion to add it.
- **`observance_materialisation_batches` retention policy** — real pattern,
  but currently only 454 rows / 736 KB across 7 days. Cheap to add
  defensively but not an active problem worth prioritizing.
