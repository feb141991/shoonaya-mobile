# Mahabharata Dyuta Sabha — Stage 0 Evidence Review

**Status:** Desk research complete, 2026-10-06. This review sets product boundaries and an implementation sequence; it is not a Sanskrit scholar's sign-off, a rights clearance, or approval of a finished ruleset. At the time of this research no gameplay code, database, flags, or production settings had been changed. The product owner has since authorized a narrow Native, local-only prototype; see the [rules proposal](MAHABHARATA_DYUTA_RULES_PROPOSAL.md) and [Native scope](MAHABHARATA_DYUTA_NATIVE_SCOPE.md).

**Current feature:** The Mahabharata dice episode and a possible modern dice adaptation for Native. **Gyan Chaupar remains a separate, deferred feature**; do not reuse its board, iconography, or rules here.

## Decision in one paragraph

Build this as two clearly separated experiences: a sourced, respectful way to explore the dice episode in the *Sabha Parva*, and—only after its modern rules are reviewed—a small, fair dice challenge inspired by the episode. The *Mahabharata* supplies a consequential narrative about a dice contest, but the reviewed source does not supply enough mechanics to reproduce the historical game. A literary reading describes the first match as a sequence of twenty throws arranged in two groups, but that is a reading of the narrative's structure; it does not tell us the dice shape, roll values, scoring, or how to implement a playable rules engine. The product must therefore say “inspired by,” not “the exact ancient rules.”

## Which game and what “origin” means

The target is the dice contest in the *Dyūta* episode of Book 2, the *Sabha Parva*, followed by the sequel often called *Anudyūta*. The Critical Edition's electronic text identifies the assembly, the dice contest, Shakuni playing on Duryodhana's behalf, the escalating stakes, the later exile wager, and the outcomes. It is a primary textual witness to the epic's narrative, not archaeological proof of the historical origin of dice play or a manual for a historical game.

The older Vedic material about *akṣa* and the gambler's hymn in Ṛgveda 10.34 is a distinct source context. Sung Yong Kang's study specifically cautions that *akṣa-dyūta* is often translated too loosely as “the ancient Indian dice game” and says the game's performance and prototype require clarification. That research does not establish that the Sabha episode used the same dice, equipment, or rules. Do not combine the Vedic hymn, the Sabha episode, later dice games, Chaupar/Chausar, and Gyan Chaupar into a single uninterrupted game tradition.

## What the primary text supports

The references below use the BORI Critical Edition's Book 2 chapter-and-verse numbering. Other editions and translations may number passages differently, so every future content record should retain the edition and locator together.

| Claim | Primary-text locator | Evidence strength and product use |
| --- | --- | --- |
| This is a contest involving dice (*akṣa*) and *dyūta* | CE 2.53.1; the surrounding chapter | Text-attested. Safe to describe as a dice contest. |
| Yudhishthira challenges the fairness of deceitful play | CE 2.53.2–3, 2.53.7–10 | Text-attested. Preserve the ethical tension; don't market deception as a clever trick to emulate. |
| Shakuni speaks about counting/knowledge of procedure and plays for Duryodhana, who supplies the valuables | CE 2.53.4–5, 2.53.14–16 | Text-attested dialogue and setup. It does not specify a formula a game engine can execute. |
| The story records successive stakes and Shakuni's repeated declarations of victory | CE 2.53.21–25 onward through the first contest | Text-attested narrative progression. The wager list is not a complete scoring system. |
| Draupadi asks whether Yudhishthira had lost himself before staking her, and the assembly debates whether the wager was valid | CE 2.60–62 in the BORI chapter sequence | Text-attested conflict; its framing as a legal/ethical centre is scholarly interpretation. Treat the episode seriously; no gameplay asset, comic scene, reward, or score may represent her person or dignity. |
| A later rematch sets exile as a single decisive wager | CE 2.67.2–21 | Text-attested narrative structure. This is not evidence that the first match's rules were one roll or that either match had a fully specified modern format. |

The electronic Critical Edition does **not** specify the number or shape of dice, a board layout, the exact throw/score interpretation, a complete turn procedure, how ties resolve, or a reproducible win algorithm. In 2.53 the dialogue calls for the terms of play to be set and discusses knowledge of the procedure; the narrative then reports outcomes instead of teaching the procedure. Do not fill those gaps with popular retellings or rules from another game.

## The “twenty throws” claim, carefully bounded

Sibaji Bandyopadhyay's chapter “Of Gambling: A Few Lessons from the Mahābhārata” describes the dramatized first contest as twenty throws in two groups of ten, while also stating that the rules of *dyūta* are not known. This may help explain the episode's literary pacing and escalating stakes. It is **not** a sufficient historical reconstruction: a count of narrated throws does not tell us the dice apparatus, the value of a throw, how a stake is won, or whether the narrative sequence records all procedural details of an actual game. The scope should mention this interpretation only with attribution and qualification; the app must not use “20-throw ancient rules” as a verified ruleset.

The connection between the dice episode and the *Rājasūya* also has competing scholarly interpretations. Van Buitenen reads the broader *Sabha Parva* through the structure of royal consecration. Johannes Bronkhorst argues that the dice game is not part of the completed sacrifice, noting that the text marks the sacrifice as complete before dicing is proposed. For product content, state the clear narrative sequence—Rājasūya events precede the invitation to dice—and avoid presenting one contested ritual interpretation as settled fact.

## Evidence boundary: do not import these as “Mahabharata rules”

| Candidate detail | Decision |
| --- | --- |
| Standard six-sided dice | May be chosen for a clearly labelled modern adaptation; not established by the Sabha episode evidence reviewed here. |
| Four-sided bar dice, marked values, or *kṛta/tretā/dvāpara/kali* outcome scoring | Do not attribute to this match without direct textual and specialist support. Vedic/historical discussion is not enough to establish it here. |
| Cowrie shells, a Chaupar/Chausar cross-board, tokens moving along tracks | Do not import. That would turn this into a different game. |
| Gyan Chaupar's numbered spiritual path, snakes/ladders, virtues/vices, or 72-square board | Explicitly out of scope; separate future feature. |
| Loaded dice, supernatural control, a specific cheating technique by Shakuni | Do not assert as a historical mechanic unless the chosen edition and a reviewer support the exact claim. Deceit is in the dialogue; a physical method is not established by this audit. |
| The 20-throw count as a complete playable ruleset | Do not use; it is a structural interpretation, not a rules specification. |

## Product recommendation

### Name and positioning

Working name: **Mahabharata: Dyuta Sabha**. The store or Play card should include a plain-language descriptor such as “Explore the Sabha Parva dice episode and try a separate, modern dice challenge.” “Dyuta Sabha” identifies the subject; a descriptor prevents users from mistaking the adaptation for a verified historical reconstruction or for Gyan Chaupar.

Use two entry points inside one feature family:

1. **Explore the episode:** a sourced, accessible retelling with source references, context, and optional comprehension interactions. The canonical story outcome never branches based on player choices. Include a brief content note and a concise/skip-to-context option before the humiliation sequence; don't make users replay it to finish the experience.
2. **Dice challenge (Shoonaya adaptation):** a neutral, fair, self-contained modern game. Use no money, paid dice, transferable value, prizes, social pressure, or real-world stakes. Never frame a player as wagering another person. Keep results separate from dharma, virtue, devotion, or spiritual progress.

The modern challenge needs a short rules-design review before implementation: player count, turns, randomization, decisions, scoring, match length, ties, and solo opponent behavior. Prototype at most two simple variants with non-claiming placeholder rules; select based on playtesting. Every chosen mechanic is labelled `shoonaya_adaptation`, with its own version. Historical claims remain in the story layer and carry source locators.

### Delivery stages

| Stage | Ship scope | Explicitly excluded |
| --- | --- | --- |
| 0 — Evidence and product contract | This evidence review, source/rights ledger, named reviewer, approved rules brief, language/content plan | Production gameplay, multiplayer, ranking |
| 1 — Local foundation | Episode reader, reviewed context, accessible solo modern challenge, offline save/resume, local match history; pure deterministic rules contract and tests | Online play and any claim of canonical rules |
| 2 — Shared-device play | Optional offline pass-and-play after privacy/interaction review; first-guest launch and airplane-mode tests | Public discovery and global leaderboard |
| 3 — Private online rooms | Invite-only friend rooms with server-authoritative actions, idempotency, reconnect/replay, rate controls, account-block controls; no open chat | Public matchmaking |
| 4 — Private standings | Opt-in friends/KUL standings, scoped membership checks, hide/leave/delete, online-verified results only | Spiritual scores and public identity by default |
| 5 — Public play, only if evidence supports it | Moderation/reporting, anti-cheat, operations, privacy review, staged rollout, kill switch | Launch until all prior operational gates pass |

### High-scale technical contract

- Keep rules in a pure, versioned game engine. Store `ruleset_id`, `ruleset_version`, `engine_version`, action sequence, and final result. Native and backend must pass the same conformance fixtures.
- Offline results are local and are never promoted to verified online scores. Online clients send actions; backend checks identity, current turn, room membership, action version, idempotency, and legal transitions atomically.
- Online random outcomes are server-authoritative and auditable. Never trust a client-supplied score or roll. Define a fairness record and tests before competitive standings ship.
- Rooms are private by default, invite links expire and can be revoked, membership is rechecked on every protected read/write, and KUL integration cannot reveal family practice, mood, location, or other private activity.
- Collect only operational telemetry needed for latency, crashes, disconnects, abandoned rooms, invalid/replayed actions, and rules-engine failures. Do not store private story responses as analytics.
- Keep launch controls: remote disable for online rooms and score submission, immutable ruleset versions for active rooms, and a rollback procedure that preserves existing local matches.

## Content, rights, and review requirements

- Use the BORI Critical Edition as the source locator baseline for the episode; preserve its exact chapter/verse ids and edition metadata.
- Select a translation only after confirming source alignment, language quality, and commercial/mobile reproduction rights. A translation visible online is not automatically reusable. The van Buitenen translation is copyrighted by University of Chicago Press; request permission or select a licensed/public-domain alternative after legal review.
- The Critical Edition e-text itself is hosted by BORI and carries its own terms; obtain permission/attribution guidance before embedding or reproducing Sanskrit text at scale. This document cites and analyses it, it does not clear reuse.
- Have a Sanskrit/Mahabharata specialist review the source mapping and a culturally literate reviewer review the product framing and sensitive scene treatment. Record reviewer identity/role, date, edition, scope, decisions, and unresolved questions. Do not invent approvals.
- Provide English, Hindi, and Punjabi only as reviewed translations. If one is missing, follow the app's established language fallback and disclose the source language; never silently substitute one translation for another.
- Artwork must be commissioned or original. Record creator, source references, license/assignment, and whether each image is a historical depiction or an original interpretation. Do not present modern art as an ancient manuscript image.

## Stage 0 closure checklist

**Completed in this desk review:** correct game target identified; primary text inspected; textual claims separated from inference; major imported-rule risks identified; scholarly disagreement on narrative/ritual framing recorded; product/technical staging proposed; Gyan Chaupar held out of scope.

**Still open before story publication or a broader release (these gates are outside the authorized local-only mechanics prototype):**

1. A named Sanskrit/Mahabharata reviewer accepts or corrects the source map and the limited conclusion about mechanics.
2. Product owner approves the two-part experience and the working name (or chooses another name).
3. Translation and Sanskrit-text rights are documented for each language and surface.
4. Product/reviewer approves one modern rules contract with all fields listed above, explicitly marked as Shoonaya design.
5. Editorial review completes the episode retelling, content note, skip behavior, and sensitive-scene boundaries.
6. Product/design approves the first release cut: recommended Stage 1 is offline story + solo challenge; online rooms, KUL, and leaderboards remain later stages.

**Research status:** enough evidence to proceed into reviewer/product sign-off and detailed rules design. Not enough evidence to truthfully advertise or code an exact historical reconstruction of the Sabha dice rules.

## Research references

1. Bhandarkar Oriental Research Institute, [electronic text of the Critical Edition of the Mahābhārata](https://bombay.indology.info/mahabharata/welcome.html), Book 2, especially CE 2.53–62 and 2.67. The site describes its text as the electronic Critical Edition and supplies Unicode formats.
2. J. A. B. van Buitenen, ed. and trans., [*The Mahabharata, Volume 2: Book 2: The Book of Assembly; Book 3: The Book of the Forest*](https://press.uchicago.edu/ucp/books/book/chicago/M/bo5968537.html), University of Chicago Press, 1975. Important for a major critical-edition-based translation and structural interpretation; copyrighted, so not cleared for app reuse.
3. Sung Yong Kang, [“Understanding the Dice Game in Ancient India: ‘Akṣa-dyūta’ in the Vedic Period and ‘The Gambler’s Song’ (Akṣa-sūkta) in the Ṛgveda”](https://journal.kci.go.kr/snu-ioh/archive/articleView?artiId=ART002723160), *Journal of Humanities, Seoul National University* 78(2), 2021, pp. 489–522. Relevant to keeping Vedic evidence distinct and avoiding an overconfident translation of *akṣa-dyūta*.
4. Johannes Bronkhorst, [“Can there be play in ritual? Reflections on the nature of ritual”](https://serval.unil.ch/resource/serval%3ABIB_72C5BDA6AB35.P001/REF.pdf), in *Religions in Play: Games, Rituals and Virtual Worlds*, Pano Verlag, 2012, pp. 161–175. Includes a counterargument about whether the epic dice match belongs to the completed Rājasūya ritual.
5. Aaron Rester, [“Playing With Tradition: Sacrifice, Ritual, and the Mahabharata’s Dice Game”](https://aaronrester.net/writings/mahabharatagameCCL.pdf). A literary/ritual interpretation; the posted copy states CC BY-NC-ND, so cite for research only and do not adapt its expression or reuse it commercially without permission.
6. Christopher T. Fleming, [“Gambling with Justice: A Juridical Approach to the Game of Dice in the Dyūtaparvan of the Mahābhārata”](https://academic.oup.com/jhs/article-abstract/14/3/234/6068059), *The Journal of Hindu Studies* 14(3), 2021, pp. 234–258. Useful for the episode's legal and ethical stakes, not as a mechanical rules source.
7. J. A. B. van Buitenen, [“On the Structure of the Sabhāparvan of the Mahābhārata”](https://brill.com/edcollchap/book/9789004642805/B9789004642805_s008.xml), in *India Maior*, 1972, pp. 68–84. Structural interpretation; distinguish literary reading from direct game-mechanics evidence.
8. Sibaji Bandyopadhyay, [“Of Gambling: A Few Lessons from the Mahābhārata”](https://api.pageplace.de/preview/DT0400.9781317342144_A30881818/preview-9781317342144_A30881818.pdf), in *Mahābhārata Now: Narration, Aesthetics, Ethics*, ed. Arindam Chakrabarti and Sibaji Bandyopadhyay, Routledge, 2014, pp. 3–28. Gives the twenty-throw/two-group literary reading while explicitly noting that the game rules are unknown; copyrighted, cited for research only.
