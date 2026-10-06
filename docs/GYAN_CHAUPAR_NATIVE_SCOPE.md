# Gyan Chaupar for Native — Product and Technical Scope

**Status:** Deferred future feature. The current release scope is the Mahabharata Sabha Parva dice game; Gyan Chaupar is held for a later release and may be surfaced as “Coming soon.” Retained as future research; see active [`MAHABHARATA_DYUTA_NATIVE_SCOPE.md`](MAHABHARATA_DYUTA_NATIVE_SCOPE.md). Do not implement Gyan Chaupar in the current game phase.
**Owner:** Native app experience; shared online match, profile, and leaderboard contracts belong to the backend repository.
**Current prototype:** `lib/chaupar/` is a separate, unintegrated cross-and-circle Chaupar rules experiment. It is not the Gyan Chaupar game described here and must not be reused as its rules engine without a separate review.

## Product intent

Build a polished, welcoming digital Gyan Chaupar experience that combines a playable board game with an optional explanation of the selected board's spiritual vocabulary. It should work for a quick solo session, a family game, or a private online match, while making clear which historical ruleset is being played.

The game is entertainment and learning. It must not score a player's spiritual worth, infer religious virtue from play, or claim that a game result predicts liberation or spiritual attainment. Keep the experience free at launch and avoid ads, pay-to-win mechanics, streak pressure, and notifications that push people to play.

## Historical and content integrity gate

“Gyan Chaupar” names a family of related boards, not one universal board and rulebook. Documented boards vary in size, layout, destination, iconography, and spiritual vocabulary. The MAP Academy overview describes these differences and the relationship between virtues/flaws and movement on the board: <https://imp-art.org/articles/gyan-chaupar/>. The Ashmolean's catalogued Sufi board is one distinct 100-square example, not a default for every tradition: <https://jameelcentre.ashmolean.org/collection/921/0/0/object/22484>. Andrew Topsfield's discussion of Sufi boards also emphasizes that versions and structures differ: <https://www.cambridge.org/core/journals/journal-of-the-royal-asiatic-society/article/abs/a-note-on-sufi-snakes-and-ladders/9D0284FFF2B6EAB8C9267CECF34DEADF>.

Do not describe Gyan Chaupar as a proven ancient game or claim its rules have remained unchanged since antiquity. Current scholarship places the emergence of Gyan Chaupar itself no earlier than the late 17th or early 18th century, while its possible influences and related games have separate histories. In particular, do not conflate it with Chaupar/Chausar, a distinct cross-and-circle game. The evidence-based origin summary and broad play loop are documented in [`GYAN_CHAUPAR_STAGE_0_RESEARCH.md`](GYAN_CHAUPAR_STAGE_0_RESEARCH.md).

The Stage 0 source comparison and reviewer handout are in [`GYAN_CHAUPAR_STAGE_0_RESEARCH.md`](GYAN_CHAUPAR_STAGE_0_RESEARCH.md). The provisional first-board recommendation is the British Library's Johnson 5,8 Vaishnava 72-square chart (Lucknow, c.1780–82), rendered as a clearly labelled digital reconstruction. This is a sequencing recommendation for the app, not a claim that this board is the universal or most authoritative Gyan Chaupar.

Before a ruleset ships, its record must include:

- A stable ruleset ID, title, version, tradition/region attribution, and a plain-language statement of what the attribution does and does not mean.
- The specific board or source being represented, collection/catalog references where available, source and image rights, and review date.
- Named knowledgeable reviewer(s), review scope, and unresolved questions. Do not invent reviewer approval or citations.
- A complete machine-readable board definition and golden fixtures reviewed against the source.
- Vetted translations and transliterations for square names and explanations. Keep source inscriptions separate from translation and Shoonaya commentary; label any editorial explanation as such.

Represent different traditions as separate board/ruleset packs. Do not merge a Jain, Vaishnava, Sufi, or other board's square count, theology, movement links, and terminology into a supposedly canonical composite. If a modern Shoonaya adaptation is later desired, label it plainly as an adaptation and keep it separate from historically attributed packs.

## Ruleset contract

Every ruleset is immutable once published. A new correction or reviewed translation creates a new version; saved and completed matches retain the exact ruleset version they started with.

The ruleset definition must explicitly specify:

- Board dimensions, square numbering/path, direction changes, start and goal squares, and any special zones.
- Player count, token count, starting position, turn order, roll mechanism, roll-to-move mapping, and any extra-turn rules.
- Whether a player must roll an exact value to finish, what happens on an overshoot, and any special entry or restart rules.
- Every ascent/descent mapping and its source inscription, reviewed translation, and explanation reference.
- How simultaneous effects are ordered, if a move reaches more than one special square.
- Win, tie, resignation, timeout, and abandoned-match outcomes.
- Whether a board uses dice, cowries, or another mechanism. A configurable visual die must not silently replace the documented mechanism's probability rules.

The pure game engine accepts a ruleset version, a current state, and an action, and returns a validated next state plus a replayable event. Rendering and networking never contain independent copies of rules.

## Player-facing scope

### Entry and onboarding

- Game landing screen explains the game in a few lines and offers **Learn**, **Play solo**, **Play nearby**, **Play with friends/family**, and **Continue** when a saved game exists.
- Ruleset picker shows the board's name, tradition/region attribution, board size, a short description, and a visible “Rules and sources” view.
- A first-time tutorial teaches roll, movement, ascent/descent, turn progression, and finishing using a short guided match that can be skipped or replayed.
- Guest users can play solo and local pass-and-play. Authentication is required only for online identity, friend invites, and cloud-synced history.

### Modes

1. **Solo journey:** one person plays at their pace, with optional reviewed explanations when landing on a meaningful square. Support pause, save, resume, and a no-commentary mode.
2. **Solo vs computer:** configurable difficulty and turn speed. Initial opponents use deterministic, rules-compliant behavior; no generative AI decides moves or invents teachings. Because chance may dominate strategy, difficulty labels must describe behavior, not imply spiritual or strategic mastery.
3. **Offline pass-and-play:** multiple people take turns on one device. Hide private profile details between turns where practical. Keep completed results local until the user chooses to sync; offline results never enter ranked online leaderboards.
4. **Private online room:** invite by expiring, revocable room link/code; select a supported ruleset; wait for invited players; support reconnect, resume, rematch, and host departure.
5. **KUL family room:** private match with current KUL members, subject to membership and guardian/child privacy policy. KUL participation must not expose private practice, mood, location, or profile data.
6. **Public matchmaking:** optional later phase only, after private play is stable. Provide mute/block/report, age-appropriate safeguards, rate limits, fair matchmaking, and clear visibility controls before launch.

### Game options

- Ruleset/board pack, player count, solo opponent difficulty, and casual or timed turns where the selected rules support them.
- Sound, haptics, animation intensity, reduced motion, and an option to skip repeated movement animation.
- Accessible labels for every cell and token; scalable board zoom; color-independent player identifiers; sufficient contrast; VoiceOver/TalkBack support.
- App language follows the user's selected language. Show a reviewed translation when available; otherwise show the source language with an explicit language label and a safe fallback. Never present Hindi as Punjabi or claim an unavailable translation.
- Match-specific choices are visible before the start and fixed for that match. No hidden house rules.

## Social, KUL, and score policy

- Private online rooms support invite, accept/decline, ready state, turn status, reconnect status, and rematch. Initial social interaction can use a small set of respectful, non-spammy reactions; open chat is out of first release unless moderation, reporting, blocking, and abuse response are ready.
- KUL integration is an entry point and private room boundary, not a new way to read family members' private sadhana. Show only game participation/results that each member has opted to share.
- **Family/friend leaderboard:** opt-in, private to the selected group, based on match outcomes or completed games. Provide hide/leave controls and an explanation of what's shared.
- **Global leaderboard:** defer until public matchmaking, anti-cheat, moderation, and privacy controls are mature. It must be opt-in and use a chosen display name, never email or legal name by default.
- Keep game points separate from karma, seva, streaks, or spiritual progress. Do not award spiritual virtue for winning or penalize users for losing, disconnecting, or not playing.
- Offline/local scores are labeled local and are excluded from ranked tables. Ranked outcomes require server-verified match events.

## Online and offline architecture

- **Native owns** board rendering, accessibility, local game UX, and offline save/resume.
- **Backend owns** canonical ruleset versions, online room lifecycle, player authorization, authoritative online state transitions, event history, results, ranked scoring, and leaderboard visibility.
- **Pure shared rules package or generated contract** is the sole source for movement and state-transition rules. Avoid separately hand-maintained Native and backend rule implementations.
- Online clients submit idempotent actions with match ID, expected state/version, action ID, and authenticated identity. The server validates turn ownership, dice result, movement, special-square effects, and next state atomically.
- Use server-generated randomness for ranked online matches; retain enough event/seed evidence to reproduce a match without exposing future random outcomes. Offline games use device randomness and remain unranked.
- Persist a compact event log so reconnects can recover and support reports. Define action deduplication, stale-client handling, simultaneous requests, turn expiry, abandonment, rematch, and ruleset-version compatibility before implementation.
- Realtime updates are delivery hints; server state remains authoritative. A missed socket event must be recoverable by fetching the current versioned match snapshot.
- Backend changes require the second repository audit, RLS and privilege review, migrations with rollback guidance, generated type updates, and explicit applied/unapplied environment reporting.

## Privacy, safety, and abuse controls

- Match invites use high-entropy opaque tokens, expire, can be revoked, and do not reveal user IDs.
- A room is accessible only to authorized participants. KUL rooms re-check current membership server-side on each sensitive action.
- Public profiles and leaderboards disclose only fields the user has chosen to show.
- Add request rate limits, turn/action validation, replay review tools, and protection against forged results or repeated rewards.
- If public play is added, define user report/block flows, moderation ownership, retention, and a response process before enabling it.
- Do not collect voice, precise location, or unrelated app activity for game features.

## Performance, reliability, and measurement

Measure on supported physical iOS and Android devices before calling the game ready:

- Time to interactive board, memory/asset footprint, and frame-time during pan/zoom and move animations.
- Solo/AI/offline match completion, crash-free sessions, restore success, and rules-engine invariant failures.
- Online room creation/join latency, action-to-confirmation latency, reconnect recovery, duplicate-action rejection, and abandoned-match rate.
- Download/bundle impact and offline asset/cache size.

Record ruleset ID/version, app build, mode, device class, and anonymized match/session IDs. Do not collect board choices or spiritual reflections for analytics unless separately consented and necessary. Define baseline, target, sample size, and failure thresholds before performance claims.

## Delivery stages and gates

### Stage 0 — Rules and product decisions

- Select the first documented board/ruleset and reviewer.
- Resolve every rule field above and secure content/artwork rights.
- Approve the translation/editorial model and identify supported launch languages.
- Produce a low-fidelity flow and board-size/accessibility prototype.
- **Current result:** candidate board, evidence ledger, provisional flow, and complete reviewer questions are prepared in the Stage 0 research handout. The ruleset is not yet approved because the movement details require a knowledgeable reviewer and image/text rights have not been cleared.
- **Exit gate:** reviewer named and sign-off recorded; disputed rule mechanics resolved; source/transcription/artwork use cleared; versioned ruleset and golden fixtures approved. No gameplay implementation before this gate.

### Stage 1 — Engine and offline foundation

- Implement the immutable ruleset data contract and pure state engine.
- Add golden, property, boundary, replay, invalid-action, and mutation-sensitive tests.
- Implement board rendering, tutorial, solo journey, save/resume, and offline pass-and-play.
- Verify accessibility and performance on physical devices.
- **Exit gate:** playable offline game with no unresolved rules ambiguity or cross-screen rule duplication.

### Stage 2 — Private online and KUL play

- Add backend rooms, authenticated invitations, authoritative turn processing, event log, reconnect, rematch, and abuse/rate controls.
- Add private friend and KUL entry points and visibility preferences.
- Run multi-device/network-loss/account-switch tests before pilot.
- **Exit gate:** no forged or duplicate ranked action, safe reconnect, correct membership authorization, and user-tested private play.

### Stage 3 — Opt-in scores and expansion

- Add private friend/family standings and game-only achievements.
- Consider global matchmaking/leaderboards, open chat, additional boards, and seasonal events only after privacy, fairness, moderation, operational ownership, and demand review.
- **Exit gate:** transparent opt-in, usable leave/hide controls, anti-cheat evidence, and no coupling to spiritual scores or notification pressure.

## Release acceptance checklist

- Every shipped ruleset has source, reviewer, rights, version, and approved golden fixtures.
- No app screen calls the earlier cross-and-circle prototype as Gyan Chaupar.
- Offline game launches and resumes without network; offline results stay out of ranked scores.
- Online actions are identity-scoped, atomic, idempotent, server-validated, and replayable.
- Room privacy, invite expiry/revocation, KUL membership, account switching, and child privacy are tested.
- Hindi/Punjabi UI and board content are shown only when reviewed translations exist; missing translations fall back transparently.
- Accessibility, reduced motion, text scaling, loading/error/offline states, and physical-device performance are verified.
- No production migration, public matchmaking, or release flag is enabled without an explicit rollout plan and rollback path.

## Decisions to settle before Stage 0 exits

1. Confirm or replace the provisional first board: British Library Johnson 5,8, Vaishnava 72-square.
2. Name the knowledgeable reviewer and define their review scope. A game historian/Indologist should review the board and reconstructed mechanics; a Hindi/Persian language reviewer should review any transcribed translations. One person may cover multiple areas only if qualified.
3. Confirm image and inscription reproduction rights. The British Library metadata is accessible, but its catalogue currently says the digital images are unavailable; no board image has been copied or approved for use.
4. Confirm the recommendation to include solo and offline pass-and-play first, followed by private online play.
5. Confirm that rankings wait until match integrity and privacy controls are proven, and that public matchmaking stays out of the initial release.
