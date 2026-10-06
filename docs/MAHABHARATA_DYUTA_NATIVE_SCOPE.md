# Mahabharata Dice Game (Dyuta Sabha) — Native Scope and Execution Plan

**Status:** The product owner has authorized Native game implementation and approved a two-experience product direction. **Dyuta Sabha** is the primary, traditionally presented Sabha Parva-inspired experience; its playable rules remain explicitly identified as Shoonaya interpretation rather than historical reconstruction. **Open Throw** is reserved as a separate future modern strategy game. Gyan Chaupar remains deferred and separate from both. Stage 0 research and the interpreted-rules proposal are documented. No build establishes historical authenticity, specialist/cultural review, rights clearance, or store-release approval. See the [Stage 0 evidence review](MAHABHARATA_DYUTA_STAGE_0_RESEARCH.md) and [rules proposal](MAHABHARATA_DYUTA_RULES_PROPOSAL.md).

**Implementation checkpoint (2026-10-06):** Native has a local five-round solo challenge and two-person offline pass-and-play, three transparent Guide difficulty policies, cosmetic Pandava/Kaurava side selection, six built-in avatar emblems and four board colors, autosave/resume plus five manual local save copies, a three-step tutorial, three source-aware unlockable notes, expandable rules/help, and a persisted haptics toggle. The game is unranked, offline, and playable without an account. The story reader, Sanskrit specialist/content approval, production-ready translations, online rooms, friends/KUL standings, and game-admin controls are still pending. This is a development checkpoint, not release approval.

## Correct game target

The active feature is based on the dice contest in the *Sabha Parva*: Yudhishthira is summoned to the assembly, and Shakuni plays on Duryodhana's behalf. BORI Critical Edition 2.53–62 narrates the first contest and its consequences; 2.67 narrates the later exile wager. The epic is a primary source for this story, but the text reviewed does not give us enough reproducible mechanics to rebuild a historical game. A structural reading describes twenty throws in two sets of ten; that interpretation does not supply dice shape, roll values, scoring, or a complete engine. The Vedic *akṣa-dyūta* literature is a separate evidence stream, not proof that this episode used the same apparatus or rules. See the [Stage 0 evidence review](MAHABHARATA_DYUTA_STAGE_0_RESEARCH.md) for locators, source notes, and limitations. This feature is **not** Gyan Chaupar or the cross-and-circle game commonly called Chaupar/Chausar.

## Historical and interpretive guardrails

- Name the experience **“Mahabharata: Dyuta Sabha”** or similar. If gameplay mechanics are modernized, disclose “inspired by the Sabha Parva episode; game mechanics are a Shoonaya adaptation.”
- Do not call it Gyan Chaupar or reuse the 72-square board, square meanings, ladders/snakes, or rules from the prior Gyan Chaupar scope.
- Do not claim that the Mahabharata supplies a fully specified playable ruleset until a qualified reviewer verifies that claim against the chosen text edition and relevant game-history scholarship.
- Treat the episode's deception, escalating wagers, and Draupadi's humiliation with care. Do not make a person's freedom, dignity, or safety a spendable game asset, or turn that scene into comic multiplayer entertainment.
- No real-money or purchasable wagering, loot-box-like dice, pay-to-win mechanics, or spiritual virtue score. A leaderboard must measure only an explicitly modern skill/challenge score and be opt-in.
- Use a named text edition and translation. Store verse/section references, source-language text, transliteration, translation, and editorial commentary separately. Have relevant language and cultural review before publication.

## Recommended product shape

Keep the epic episode and the repeatable game mode distinct:

1. **Dyuta Sabha epic experience:** a traditional visual setting containing the current neutral dice challenge and, after source and rights review, a sourced retelling of the Sabha Parva episode. Preserve the canonical events and distinguish text, translation, Shoonaya explanation and interpreted gameplay. Users cannot rewrite the epic's outcome, and a game or quiz score never measures dharma.
2. **Open Throw modern game:** a separate future Shoonaya-original strategy experience. It may evolve its own faster mechanics and competitive identity without presenting itself as the Mahabharata's game. It must not silently share scores, saves or historical framing with Dyuta Sabha.
3. **Social progression:** solo and offline play first; then private friend/KUL rooms; opt-in friend/family standings after scores and privacy controls are proven. Public matchmaking and global rankings are later decisions, not launch requirements.

The *Sabha Parva* itself does not establish a traditional cross-and-circle Chaupar board or a complete game specification. The user's requested feature is the Mahabharata dice episode; Gyan Chaupar remains a separate future feature. Any playable rules must be labelled as text-attested, historically inferred, or modern Shoonaya design, and the story must remain distinct from the competitive game mode.

## Player modes and feature scope

| Mode | Initial scope | Identity/network policy |
| --- | --- | --- |
| Learn the Sabha Parva episode | Sourced story, context, reviewed language, optional comprehension | Read-only content can work offline after download; no sign-in required |
| Solo dice challenge | Play against a transparent rules-based opponent; pause, save, resume | Guest/local first; no network required; no manipulative dice behavior |
| Offline pass-and-play | Two people share one device and take turns; more seats require a separately versioned ruleset review | Local-only match history; clear active dice at every handoff |
| Private online room | Invite friends; ready state, turn status, reconnect, rematch | Sign-in only for online identity; expiring invite; server-authoritative moves |
| KUL family match | Invite current KUL members into a private room | Re-check KUL membership on each sensitive action; no access to family sadhana, mood, or location |
| Friend/family standings | Opt-in match wins or completed games; hide/leave controls | Private group scope, pseudonymous/display name, no spiritual score |
| Public matchmaking/global leaderboard | Deferred | Only after moderation, fairness, reporting/blocking, privacy, and operational support are ready |

Story mode and dice challenge must not be entangled: a player may learn the episode without playing, and a player may use the modern challenge without seeing the sensitive scene repeatedly. Do not add open chat to the initial online release; use a small reviewed reaction set if social expression is needed.

## App integration and settings

- Place the entry under the app's **Play** experience (or the closest existing discovery surface), with a separate **Learn the Sabha Parva** route. Do not add a permanent bottom-tab item unless usage evidence supports it.
- Connect the story route to reviewed Mahabharata/Pathshala reading content when that content exists; return users to the exact story/chapter context. The game may link back to the source passage, but must not generate scripture explanations or rule claims with unreviewed AI.
- Support the selected app language only when reviewed game/story translations exist. Otherwise show the source language with a clear label and use the app's established default-language fallback; never silently substitute Hindi for Punjabi.
- Implemented local setup: solo difficulty (descriptive and transparent), two-person local pass-and-play, cosmetic side, avatar, and board color. The five-round contract remains fixed.
- Later settings: sound only after audio exists, richer animation/reduced-motion options if the board adds motion, and source/explanation visibility when the story reader ships. Keep the OS reduced-motion behavior and accessible dice labels.
- The initial rules contract is five rounds. Do not offer configurable round length or player count until the rules contract and online score comparability are deliberately versioned; the current offline pass-and-play mode is two players.
- Current game settings include a persistent haptics toggle; reduced motion follows the system preference. Sound is not exposed because the game currently has no audio. Settings never affect die distribution or scoring.
- Local options: solo with Easy/Medium/Hard Guide thresholds (rerolls a lower die on 1, 1–2, or 1–3 respectively), two-person offline pass-and-play, automatic active-match save, five manual save copies, resume/load/delete, tutorial replay, and local unlockable source notes. Offline results never upload or enter standings.
- Online options: private invite link/code, friend room or KUL-only room, turn status, reconnect/resume, rematch, leave room, mute game sound/haptics, and a pre-match rules/version confirmation. No open chat or public matchmaking in the first online release.
- No game-practice notifications in the initial release. Later reminders require opt-in, frequency caps, quiet hours, and a clear off switch; no streak pressure.
- Share results only when the player chooses. Shared cards contain display name (or anonymous), score/outcome, and ruleset/app version; never email, sensitive profile data, or story choices.

## Backend, admin, and operational scope

- **Native:** accessible game presentation, local game engine integration, offline saves, story UI, settings, and analytics consent.
- **Backend (online stage):** room lifecycle, authorization, invite expiry/revocation, server-validated actions, idempotency, authoritative random outcomes, replayable events, result finalization, and privacy-scoped standings. Clients submit actions; the server validates turn ownership and applies each versioned state transition atomically.
- **Rules contract:** a pure deterministic rules module is the single source of game transitions. Native and backend consume the same versioned contract/package or generated conformance fixtures; do not maintain subtly different rule copies.
- **Admin content management:** draft/review/publish versioned story passages, source references, translations, rules disclosures, and art provenance. Require named reviewer, approval timestamp, source edition, rights status, and audit trail. Published rules and story versions are immutable; corrections create new versions. Admin can disable a ruleset or room creation without deleting match history.
- **Operations:** dashboards for room-create/join/action latency, reconnect rate, duplicate-action rejection, abandoned matches, crash-free sessions, rules-engine invariant errors, and opt-in leaderboard reports. Do not log private story reflections or wager-like free text.

## Complete game feature map and rollout contract

“Complete game” means a set of modes with different trust boundaries; it does not mean every mode shares one score table.

| Capability | Product behavior | Data/trust boundary | Release gate |
| --- | --- | --- | --- |
| Single-player | Offline five-round challenge against an explained Guide policy; replay and local settings | Device-only; no leaderboard upload | Rules and accessibility review |
| Offline multiplayer | Two-person pass-and-play on one device; names are local labels; handoff screen clears active dice before the next turn | Device-only and explicitly unverified | Current build is a first implementation; usability/device QA remains |
| Online multiplayer | Private friend invitation and KUL-member rooms; turn-based, server-authoritative dice and scoring | Authenticated participants only; each action checks room membership, turn, ruleset version, match version and idempotency key | Shadow migration, API/RLS review, concurrency and abuse tests, invite-only pilot |
| Friends standings | Opt-in totals and completed match results among people who accepted a game/group invite | Only verified online results; participant hide/leave controls; use display name or anonymous identity | Separate privacy review and anti-manipulation test |
| KUL standings | Opt-in family-only completed match results for current KUL members | Check current membership on every read/write; leaving KUL revokes access; never read KUL practice, mood, family event, or location data for ranking | KUL security tests and membership-revocation tests |
| Game options | Solo Guide style, sound/haptic toggles, reduced motion, language, accessible dice, pause/resume, rematch, leave/discard, result-share preview | Settings do not change odds; fixed five rounds until a new versioned ruleset says otherwise | Each setting has deterministic tests and accessibility QA |
| Game history and stats | Local history first; online history only for authenticated verified matches; ties, abandonment and disconnects reported distinctly | Keep local and verified online records visibly separate; no spiritual merit, streak pressure, transferable points, or money | Retention policy and delete/export review |
| Admin and live operations | Versioned rules/content publication, room kill switch, ruleset disable, abuse reports, operational health, audit trail | Admin actions audited; no secret client-side admin path; no raw story reflections or free-form private chat | Role/RLS audit, alert drills, rollback and incident owner |

Private friend access should start with an explicit shareable invitation, not device-contact upload or a presumed global friend graph. A KUL room may only be joined by an authenticated current member. Standings are separate from spiritual progress and do not reward engagement streaks.

## Modern playable rules proposal (review required)

The initial candidate ruleset and prototype acceptance contract are in [MAHABHARATA_DYUTA_RULES_PROPOSAL.md](MAHABHARATA_DYUTA_RULES_PROPOSAL.md). It is a Shoonaya design proposal, not a claim about historical rules.

The exact mechanics are intentionally not asserted as historical facts. The [first rules proposal](MAHABHARATA_DYUTA_RULES_PROPOSAL.md) now defines a candidate round structure, player actions, scoring, fairness invariants, and test plan. Product and cultural review must approve or revise it before implementation. Any later rules change must remain a versioned Shoonaya design; no made-up rule may be called “ancient” or “canonical.”

The app should not simply simulate Yudhishthira's losses as a fun multiplayer match. Story mode should present the episode with its ethical tension intact; challenge mode should use its own neutral match objective and avoid reenacting Draupadi's humiliation or turning persons into game assets.

## Evidence table: what we know and what we do not

| Question | Current evidence | Stage 0 conclusion |
| --- | --- | --- |
| Which episode? | *Sabha Parva*, *Dyuta Parva*: Yudhishthira's dice match in the Kaurava assembly | Confirmed as intended target by the user; not the Gyan Chaupar board game |
| What happens at a high level? | Yudhishthira accepts a dice contest; Shakuni plays for Duryodhana; wagers escalate and lead to the exile narrative | Story structure can be represented with sourced passages and a reviewed retelling |
| What implements the dice? | The BORI CE uses dice/game terminology in 2.53; it does not specify the physical apparatus in enough detail for reconstruction | Do not assume modern cubic dice, cowries, a board, or another game's pieces |
| What are the exact win/score rules? | The narrative reports stakes and outcomes but not a complete reproducible rules engine; a twenty-throw reading is structural interpretation, not a full mechanics contract | Not established; no “exact ancient rules” claim |
| Can it support multiplayer? | Technically yes as a modern adaptation; the textual contest is adversarial and asymmetrical | Decide whether to make a respectful abstract adaptation; do not market it as the exact ancient game by default |
| What is out of bounds? | Historical authenticity, meaningful religious content, and the episode's human stakes need care | No invented “canonical” rules, no real-money stakes, no wagering people, no spiritual leaderboard |

## Stage 0 status and next gates

**Completed:** identified the intended game, inspected the BORI Critical Edition source locators, separated text-attested claims from historical/structural interpretation, checked scholarship on the Vedic game and on the contested ritual framing, and documented the product/technical boundaries. See [`MAHABHARATA_DYUTA_STAGE_0_RESEARCH.md`](MAHABHARATA_DYUTA_STAGE_0_RESEARCH.md).

**Still required before story publication or broader release:**

1. A named Sanskrit/Mahabharata specialist reviews the source map and mechanics limits; record reviewer, date, edition, and scope.
2. Product owner approves the separate story + Shoonaya challenge concept and the working name.
3. Translation and Sanskrit-text reproduction rights are documented for each app language.
4. The product/reviewer freezes a complete modern rules contract and labels all invented mechanics as `shoonaya_adaptation`.
5. Editorial review approves the episode retelling, content note, skip behavior, and treatment of the sensitive scene.
6. Product/design confirms whether the eventual first store release includes both an offline story and solo challenge; private rooms, KUL integration, and standings remain later stages.

## Verification and launch gates

- **Rules/content:** every rule is labelled `text_attested`, `historically_inferred`, or `shoonaya_adaptation`; tests use reviewer-approved fixtures; text edition, translation, reviewer, rights, and version are recorded.
- **Engine:** test legal/illegal actions, score bounds, deterministic replay, tie/abandon/timeout, seeded test randomness, and invariants with property and mutation-sensitive tests.
- **Offline:** start/play/pause/kill/relaunch/resume in airplane mode; local results cannot enter online standings; storage is identity-independent unless the user explicitly syncs it.
- **Online:** multi-device turn race, duplicate/reordered/stale action, token refresh/account switch, invite reuse/expiry/revocation, reconnect, host exit, network loss, and authorization-boundary tests.
- **Privacy/safety:** KUL membership revocation, family visibility, leave/hide/delete controls, share preview, no real-money value, and no spiritual ranking verified before pilot.
- **Performance:** set baseline and targets before implementation. Measure time to playable screen, turn acknowledgement p50/p95, reconnect recovery, memory/frame time, crash-free matches, and abandonment on supported iOS/Android devices. Unit tests or simulator-only results do not establish high-scale readiness.
- **Rollout:** feature flag; internal solo pilot; offline/local pilot; then invite-only online pilot. Each phase has a server kill switch, rollback path, and named incident owner. No public launch until the previous gate passes.

## Delivery sequence

- **Stage 1a — Local core (in progress):** the local modes, transparent difficulty, cosmetic player identity, five manual save copies, tutorial/source notes, rules/help, and haptics preference are implemented. Remaining gates are device QA, usability/rules-comprehension review, and reviewer/content review; no online results or leaderboards are enabled.
- **Stage 1b — Release foundation (pending review):** freeze reviewed rules/content versions, then add the sourced story reader and approved translations, accessibility and replay/property tests. No online scores yet.
- **Stage 2 — Private online matches:** publish the versioned rules contract once for Native and backend conformance; build invite-code friend rooms and KUL rooms with server-generated dice, atomic/idempotent moves, authoritative result replay, reconnect/resume, room expiry, rate limits, feature kill switch and privacy tests. No standings at this stage.
- **Stage 3 — Private standings and history:** opt-in friend-group and KUL scoreboards from verified online results only; tie/abandonment handling; display-name/anonymous choice; hide, leave, export/delete, and KUL-membership revocation behavior; keep offline results visibly local.
- **Stage 4 — Game admin and steady-state operations:** review/publish rules and story versions, manage feature flags/room kill switch, moderation/report queue, audited admin actions, latency/failure/abandonment dashboards, alerts, retention and incident playbook. Minimum operational controls must exist before Stage 2 pilot; this stage broadens them.
- **Stage 5 — Public play, if justified:** matchmaking/global leaderboards only after moderation, reporting/blocking, fairness/anti-cheat review, privacy safeguards, cost controls, and demonstrated user need.
- **Gyan Chaupar:** a separate later feature pack, labelled “Coming soon” only when product wants to surface it; it does not share this game's rules engine or launch gate.

## Product and reviewer decisions before implementation

| Decision | Owner/status |
| --- | --- |
| Confirm product is the Sabha Parva dice episode, not a historical board reconstruction | Confirmed by user; desk research agrees |
| Approve Dyuta Sabha as the traditional epic experience and Open Throw as a separate future modern game | Approved by product owner, 2026-10-06 |
| Approve working name “Mahabharata: Dyuta Sabha” | Approved for the epic experience, 2026-10-06 |
| Choose a Sanskrit edition and licensed translations | BORI CE is the research locator baseline; shipping text/translation rights remain open |
| Name Mahabharata/Sanskrit reviewer and scope | Open |
| Multiplayer direction | User requests private friend and KUL multiplayer plus opt-in standings; ship only after the staged security, rules, privacy and reliability gates pass; public matchmaking remains deferred |
| Confirm rights for text, translation, and artwork | Open |

**Implementation and release gate:** local prototype code is authorized and may be used to test the mechanics described as a modern Shoonaya design. Keep online competition, score tables, story content, unlicensed art, and claims of “ancient rules” gated until product intent, rights, cultural review, and rule definitions are recorded. This document does not claim those pending approvals have happened or authorize production rollout.
