# Shoonaya Staff: Standard Operating Procedures and Triggers

Who checks what, when they are called, and what they hand back. "Staff" are Claude subagents
(`.claude/agents/`) and skills (`.claude/skills/`) in each repository. They are not autonomous: nothing runs
unless a trigger below fires. Rules live in each repository's `AGENTS.md` / `SHOONAYA_RULES.md`; this file only says
who applies them and when.

Last reviewed: 2026-11-03.

## 1. Kinds of trigger

| Kind | How it fires | Can it be skipped? | Status |
|---|---|---|---|
| **Description match** | A Claude session sees the task matches an agent's or skill's `description` and calls it | Yes: the session decides | Live for every staff member |
| **By name** | You say "run the release gatekeeper on this" or "use the asset-intake skill" | No, once asked | Live |
| **npm gate** | `npm run eas:*` and `npm run eas:update` run `prebuild:verify` / `prebuild:release` first and refuse to start on failure | Only by bypassing the npm script (do not) | Live (Native) |
| **CI** | GitHub Actions on every PR and push to `main` | No, for anything that goes through GitHub | Live (both repos) |
| **Claude hook** | `.claude/settings.json` hooks run at fixed points in a session (before a tool, at the end of a turn) | No, inside Claude sessions | Live in backend only; Native proposed (section 5) |
| **Schedule** | A cloud routine (`/schedule`) runs an agent on a cron | No | None yet; proposed (section 5) |

## 2. Roster

Native staff are callable from sessions in `shoonaya-mobile`. Backend staff are callable only from sessions in
`Sanatan Sangam/Shoonaya`; Native staff name them for hand-offs.

| Staff | Repo | Type | Owns |
|---|---|---|---|
| `shoonaya-release-gatekeeper` | Native | Agent, read-only | What can honestly be claimed about a change (sections 7, 10, 11, 13) |
| `shoonaya-migration-preflight-reviewer` | Native | Agent, read-only | Five-point pre-flight and Native callers of a migration (section 4) |
| `shoonaya-calendar-governance-reviewer` | Native | Agent, read-only | Dates, Panchang and observances shown in the app (sections 2, 15, 20) |
| `shoonaya-content-integrity-reviewer` | Native | Agent, read-only | Spiritual content shown in the app, prepared for human review (section 3) |
| `native-release` | Native | Skill | OTA vs build, gates, build commands, device checks |
| `migration-preflight` | Native | Skill | Writing a migration with rollback and getting it approved |
| `asset-intake` | Native | Skill | Adding or replacing images |
| `defect-closure` | Native | Skill | Closing a reported bug: cause, sweep, guard test, rule |
| `shoonaya-supabase-backend-engineer` | Backend | Agent | Schema, RLS, RPCs, queries, auth/profile data |
| `shoonaya-pramana-content-reviewer` | Backend | Agent | Scriptural and source correctness, tradition boundaries, AI answer policy |
| `shoonaya-ritual-practice-reviewer` | Backend | Agent | Ritual order, Nitya Karma, Panchang timing, vrata, festivals |
| `shoonaya-qa-test-engineer` | Backend | Agent | Regression and acceptance testing (backend and web) |
| `shoonaya-product-manager` | Backend | Agent | Scope, acceptance criteria, rollout decisions |
| `shoonaya-brand-manager` | Backend | Agent | Public copy, positioning, feature-status messaging |
| `shoonaya-knowledge-curator` | Backend | Agent | Recording durable decisions in `.claude/knowledge/` |
| `shoonaya-frontend-engineer` | Backend | Agent | Next.js/React (web only; PWA UI is retired) |
| `shoonaya-ui-ux-design-reviewer` | Backend | Agent | Visual quality and accessibility (web-oriented) |
| `ui-ux-pro-max` | Backend | Skill | General UI/UX reference |

Most backend agents were written in June 2026, before the PWA was retired. For Native UI, follow Native `AGENTS.md`
("Styling — match existing DNA") rather than the backend frontend or UI agents.

## 3. Event → who is called

| When this happens | Call | Then |
|---|---|---|
| Any change is about to be called "done", "fixed" or "shipped" | `shoonaya-release-gatekeeper` | Report only the highest state with evidence |
| An EAS build or OTA update is requested | `native-release` skill → `shoonaya-release-gatekeeper` | Founder approves the command |
| A migration file is added or changed, or a Native change needs a new table, column, RPC or policy | `migration-preflight` skill → `shoonaya-migration-preflight-reviewer` | Backend `shoonaya-supabase-backend-engineer` for design; founder approves applying |
| A screen, card, cache, notification or link shows or derives a date, tithi, festival, vrat or Panchang timing | `shoonaya-calendar-governance-reviewer` | Backend `shoonaya-ritual-practice-reviewer` for ritual or timing correctness |
| Scripture, mantra, translation, ritual instruction, story or AI answer text is added or changed | `shoonaya-content-integrity-reviewer` | Backend `shoonaya-pramana-content-reviewer`; then a named human reviewer decides |
| A PNG, JPEG or WebP is added, replaced or copied into `assets/` | `asset-intake` skill | `shoonaya-release-gatekeeper` checks it was viewed on a device |
| A tester, device or production reports a bug | `defect-closure` skill | `shoonaya-release-gatekeeper` before closing |
| Public copy, store listing, notification wording or feature-status claim | Backend `shoonaya-brand-manager` | `shoonaya-content-integrity-reviewer` if it mentions scripture or tradition |
| Scope or rollout of a feature is unclear | Backend `shoonaya-product-manager` | — |
| A session made a durable decision | Backend `shoonaya-knowledge-curator` (fires by hook at the end of backend sessions) | Native: record in `AGENTS.md` or `docs/` |

## 4. Standard operating procedure for each staff member

Every card answers: when, how to ask, what it needs, what it returns, what it can never do.

### Release gatekeeper (`shoonaya-release-gatekeeper`)
- **When:** before saying a change is done; before any build, OTA update or status report.
- **Ask:** "Run the release gatekeeper on commits `<range>`."
- **Needs:** the commits; build ids or device details if any exist.
- **Returns:** the seven states (committed, pushed, deployed, built, installed, launched, smoke-tested) with
  evidence, test counts as passed / failed / skipped, blocking items, and the highest state that can be claimed.
- **Never:** pushes, builds, publishes, deploys, or infers one state from another.
- **Enforced today by:** npm gate on `eas:*` scripts; CI `native-prebuild-gate.yml`. Nothing enforces calling the
  agent itself.

### Migration pre-flight reviewer (`shoonaya-migration-preflight-reviewer`)
- **When:** before asking to approve or apply any migration; when a Native change depends on a backend schema change.
- **Ask:** "Run the migration pre-flight on `supabase/migrations/<file>.sql`."
- **Needs:** the migration and its rollback file.
- **Returns:** PASS / FAIL for overloads, callers, data and opt-outs, locks and rollback; RLS and grant findings; a
  count query for the founder to run; a verdict.
- **Never:** runs `supabase db push` or any database write; calls a migration applied.
- **Enforced today by:** `prebuild:release` refuses store builds and OTA updates while backend migrations are
  uncommitted. Nothing checks for a rollback file (proposed hook H2).

### Calendar governance reviewer (`shoonaya-calendar-governance-reviewer`)
- **When:** any change touching dates, Panchang, festivals, vrat, observance series, calendar caches or dated
  notification links.
- **Ask:** "Run the calendar governance reviewer on this diff."
- **Needs:** the diff or file list.
- **Returns:** findings as `file:line — rule — what the user sees wrong — fix`; calendar guard tests run as passed /
  failed / skipped.
- **Never:** changes calendar flags, overrides, `masaName` or council decisions.
- **Enforced today by:** the calendar guard tests in CI (`festival-date-governance`, `festival-occurrence`,
  `panchang-*`, `calendar-identity-key`, contract tests). Backend CI runs `verify:calendar`.

### Content integrity reviewer (`shoonaya-content-integrity-reviewer`)
- **When:** any spiritual text, translation, ritual instruction, story or AI answer is added or changes how it is
  shown.
- **Ask:** "Run the content integrity reviewer on `<file or content key>`."
- **Needs:** the content and where it came from.
- **Returns:** per item: kind (verbatim, licensed, translation, explanation), traced source or NOT TRACED,
  tradition metadata, and the question a human reviewer must decide; a list of what stays withheld.
- **Never:** approves content, writes missing text, or uses the words "approved", "verified" or "council-verified".
- **Enforced today by:** content contract tests (`observance-series-content`, `dharma-mitra-content`,
  `navratri-content`) only cover structure, not sources. Human review is the real gate.

### Skills
| Skill | Fires when you say | Ends with |
|---|---|---|
| `native-release` | "build", "release", "ship to testers", "publish an update", "is this on the device" | Gatekeeper report with build/update identity |
| `migration-preflight` | "add a column/table/RPC", "change this function", "write a migration" | Pre-flight report and an approval request |
| `asset-intake` | "add this image", "replace the icon", "copy the art from the backend" | `check:assets` + aapt2 + viewed in light/dark, provenance recorded |
| `defect-closure` | "fix this bug", "tester reported", "production shows" | Sweep report, red/green guard test, `AGENTS.md` rule |

## 5. Proposed triggers (not built)

Each needs its own change and testing. Listed in order of value.

| Id | Trigger | What it does | Prevents |
|---|---|---|---|
| H1 | Claude `PreToolUse` hook on `Bash` matching `git commit` in Native | Runs `npm run check:assets` when staged files include images; blocks on failure | A repeat of build 46 |
| H2 | Claude `PreToolUse` hook on `Bash` matching `git commit` in backend | Blocks when a staged `supabase/migrations/*.sql` has no matching `supabase/rollbacks/*_rollback.sql` | Migrations with no rollback |
| H3 | Claude `PreToolUse` hook on `Bash` matching `supabase db push` | Blocks the command outright | Applying every unapplied migration to production |
| H4 | Claude `Stop` hook in Native | Reminds the session to run the release gatekeeper if files changed, and to record decisions (mirrors the backend's knowledge-curator hook) | "Done" claims without evidence |
| S1 | Weekly cloud routine | Runs the release gatekeeper across both repos: commits not pushed, migrations not applied, builds never smoke-tested | Work silently stuck between states |
| S2 | Weekly cloud routine | Lists open "not verified on a device" items in `AGENTS.md` and project memory | Device-verification debt piling up |
| C1 | Native CI | Add `rollback file exists` and `no new KNOWN_BROKEN entries` checks | Same as H2 and section 11, outside Claude |

## 6. Decisions that stay with the founder

No staff member does these, whatever trigger fires: pushing, deploying, EAS builds and OTA updates, applying a
migration, sending or scheduling a notification, approving spiritual content (a named human reviewer), changing
calendar rules, overrides or council decisions, and starting paid infrastructure.
