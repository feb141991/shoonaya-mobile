# Gyan Chaupar — Stage 0 Evidence and Reviewer Packet

**Prepared:** 2026-10-06
**Status:** deferred future feature research; not part of the current release scope. The active game is the Mahabharata Sabha Parva dice experience. See [`MAHABHARATA_DYUTA_NATIVE_SCOPE.md`](MAHABHARATA_DYUTA_NATIVE_SCOPE.md). Gyan Chaupar may be surfaced as “Coming soon” for a later launch; do not implement it in the current phase.
**No code, board art, database, or production changes were made.**

## Stage 0 recommendation

Use the British Library's **Johnson 5,8** chart as the first ruleset candidate: a 9-by-8, 72-square board commissioned in Lucknow around 1780–82, with square labels in Hindi and Persian and connecting snakes, ladders, and two scorpions. The British Library catalogue record is primary evidence for the artifact's title, date, dimensions, scripts, and layout: <https://searcharchives.bl.uk/catalog/041-003286546>.

Schmidt-Madsen's University of Copenhagen thesis classifies and studies a corpus of Vaishnava and Jain charts, including the Richard Johnson chart; the thesis describes the broader record and cautions that charts and traditions vary: <https://researchprofiles.ku.dk/en/publications/the-game-of-knowledge-playing-at-spiritual-liberation-in-18th-and/>. The British Library's own catalogue title says “Gyan Chaupar” but does not state “Vaishnava”; keep that distinction visible in any attribution.

The candidate is a good first fit for a Shoonaya launch because its board is catalogued, bounded, and relevant to the app's Sanatan audience. This is a product sequencing recommendation. It does not make the 72-square Vaishnava chart universal, and it does not rank traditions. An 84-square Jain chart and the Ashmolean's distinct 100-square Sufi chart should remain separate future packs, each with its own reviewer, source record, content, and rules. The Ashmolean catalog describes its Sufi board and its own cosmology: <https://jameelcentre.ashmolean.org/collection/921/0/0/object/22484>.

## Origin and what “ancient” can safely mean

The name can cause a historical conflation. **Gyan Chaupar (gyān caupaṛ)** is the inscribed, spiritual race-game family this project is scoping. It is related by name and broader game history to **Chaupar/Chausar**, a different cross-and-circle race game; the older history of one does not prove that Gyan Chaupar itself is ancient. The University of Copenhagen's 2019 thesis, based on nearly 150 charts and secondary sources, concludes that Gyan Chaupar itself probably did not arise before the late 17th or early 18th century. It traces possible influences and antecedents, but explicitly treats the origin as a historical reconstruction rather than an established ancient date: <https://researchprofiles.ku.dk/en/publications/the-game-of-knowledge-playing-at-spiritual-liberation-in-18th-and/>.

For additional caution, a separate peer-reviewed University of Copenhagen study of Chaupar/Pachisi says the evidence available to it supports tracing that cross-and-circle game only to the 15th century, challenging popular claims that it is demonstrably ancient: <https://researchprofiles.ku.dk/en/publications/the-crux-of-the-cruciform-retracing-the-early-history-of-chaupar-/>. That is a different game and is not evidence for Gyan Chaupar's rules.

The earliest surviving Gyan Chaupar charts in the scholarly corpus are mostly 19th century, with a few from the late 18th century; Johnson 5,8 is catalogued by the British Library as c.1780–82. Therefore the product and marketing copy should say **“historical Indian spiritual board game”** or **“18th-century Gyan Chaupar reconstruction”**, not “an ancient game with rules unchanged since antiquity.”

## Historically supportable core play loop

At a high level, the chart is a race through a sequentially numbered grid. Each player moves a token according to a throw (historically documented variants use cowries, dice, or other devices); the board's inscribed squares carry tradition-specific cosmological, karmic, or spiritual concepts; and connections such as snakes and ladders move a token between squares, representing regressions or advances within that board's worldview. Reaching the board's designated destination ends the race. This is a **family resemblance**, not a universal rulebook; the University of Copenhagen thesis explicitly notes that chart traditions and mechanics vary, and that rules can be reconstructed from surviving charts and later texts.

For the candidate 72-square Vaishnava pack, the 2019 thesis is the main scholarly reconstruction source. It discusses rules reconstructed for 72-square Vaishnava and 84-square Jain charts, and identifies two important late-19th-century rule witnesses: Harikṛṣṇa Śarmā's Sanskrit/Hindi *Krīḍākauśalya* (1872), and a Gujarati manuscript on how to play *gyān bājī* (1877/78). These witnesses do not turn every earlier board into one standardized game. The rules packet must cite which source supports each selected mechanic.

The following remain **variant-specific and unresolved for Johnson 5,8** until its image, source record, and an expert reconstruction are reviewed: exact throw-to-move mapping; number and interpretation of cowries; initial token position; player count; special throws; whether a player needs an exact finish; overshoot behavior; and every connection's endpoint and explanatory meaning. Do not borrow familiar modern Snakes and Ladders rules to fill these gaps. The 2024 simulation paper is useful as a secondary reconstruction, but its assumptions must be labelled as such and independently reviewed: <https://reference-global.com/article/10.2478/bgs-2024-0001?tab=metrics>.

## Candidate comparison

| Candidate | Source evidence | Product fit | Recommendation |
| --- | --- | --- | --- |
| Johnson 5,8, Lucknow, c.1780–82; 72 squares; scholarship classifies it in the Vaishnava corpus | British Library archive record plus board-game scholarship | Bounded first board; its inscription system and board topology can be reviewed independently | **Select as the first candidate, pending approval and rights** |
| Jain 84-square chart | Discussed as a distinct Jain board type in the University of Copenhagen research corpus and board-game scholarship | Important to Shoonaya's multitradition audience, but requires separate Jain review and content treatment | Future separate pack; do not blend with the first board |
| Ashmolean Sufi 100-square board, EA2007.2 | Museum object record gives date, material, inscriptions, and a Sufi-specific account | Strong future educational pack but its theology and destination differ | Future separate pack; not a “skin” or translation of the Vaishnava board |

The scholarly literature supports treating these as distinct traditions and designs, not interchangeable layouts. The 2024 *Board Game Studies Journal* paper compares specific 72-square Vaishnava and 84-square Jain boards and explicitly says its simulations depend on interpreted historical boards and rules: <https://reference-global.com/article/10.2478/bgs-2024-0001?tab=metrics>. The MAP Academy overview is a useful secondary survey of board variation and square symbolism: <https://imp-art.org/articles/gyan-chaupar/>.

## Evidence ledger for Johnson 5,8

| Rule/content item | Evidence found | Confidence and handling |
| --- | --- | --- |
| Artifact identity and date | British Library record: Johnson 5,8, titled “Design for a game of snakes and ladders, gyan chaupar”; commissioned by Richard Johnson in Lucknow, c.1780–82 | High for catalogue metadata |
| Board shape and size | Catalogue: nine squares across by eight deep, 72 total | High; encode the board exactly once after reviewer checks numbering and orientation |
| Scripts and square labels | Catalogue: each square is numbered and labelled in Persian and Hindi | High that both scripts appear; exact readings/translations still require the board image and qualified language review |
| Connections and imagery | Catalogue describes snakes, ladders, two scorpions, five top-row god squares with yellow arches, and a flower in one square | High for presence; exact endpoints and inscriptions require lawful image/source access and independent transcription |
| Board tradition label | British Library catalog record uses “Gyan Chaupar”; Schmidt-Madsen's scholarly work places it in the Vaishnava chart corpus | Moderate/high with attribution caveat: state both source labels and do not imply the BL record itself says Vaishnava |
| Historical date/origin | Schmidt-Madsen (2019) argues Gyan Chaupar likely emerged in western India no earlier than the late 17th/early 18th century; Johnson 5,8 is c.1780–82 | Scholarly conclusion, not proof of an absolute first invention; never describe this candidate as an unchanged ancient ruleset |
| Broad game loop | Numbered grid, token movement by a throw, tradition-specific inscriptions, connecting snakes/ladders, destination race | Supported at family level; cite and encode exact rules per board, not as universal mechanics |
| Goal and movement around 68/72/51 | Dauenhauer & Dauenhauer's 2024 peer-reviewed simulation of the 72-square Vaishnava board treats square 68 as the goal and a route through square 72 back to 51 after passing it | A published reconstruction, not a rule written in the BL catalogue; requires reviewer approval before shipping |
| Cowrie count | The 2024 simulation includes seven cowrie shells; Schmidt-Madsen's study reports that Vaishnava charts were generally associated with six or seven cowries | Reconstructed mechanic with variation; use the exact article's described setup only if the reviewer approves; otherwise label a modern house rule |
| Movement values, 0 result, initial placement, player count, turn order, finish/overshoot, and repeated turns | Not settled by the BL object record alone. Historical boards often do not carry complete rule instructions; reconstruction must be explicit | Open reviewer decisions. Never quietly borrow standard modern Snakes and Ladders rules and describe them as historical |
| Spiritual interpretations and translations | The chart's own labels and movement connections are the source material | Unapproved until original image/transcription is available and Hindi/Persian readers review it; keep transcription, translation, transliteration, and Shoonaya commentary in separate fields |

### Source access and rights

The British Library catalogue currently reports that the digital images for Johnson 5,8 are unavailable. Do not reproduce an image or transcribe the full board from another author's copyrighted thesis or figure. Before release, obtain an authorized image/source or independently documented lawful access, establish image and transcription rights, and retain a provenance record. If rights to the original image are not available, create original board artwork from an approved, independently reviewed data specification and get a rights review for that use.

Schmidt-Madsen's thesis is listed by the University of Copenhagen under a CC BY-NC-ND license; cite it as scholarship, but do not copy or adapt its figures, tables, or text into the app. The 2024 simulation article is also marked CC BY-NC-ND. Its findings can inform questions and review; do not reuse its figures or treat its simulation assumptions as primary artifact instructions.

## Proposed first ruleset record — not approved

Use an explicit ID such as `vaishnava-johnson-72-reconstruction-v1`, with:

- Public label: **Gyan Chaupar — Vaishnava 72-square board**.
- Attribution note: “Digital reconstruction based on the Johnson 5,8 chart, commissioned in Lucknow c.1780–82; some play mechanics are reconstructed and identified as such.”
- Board source: British Library, shelfmark `Johnson 5,8`, catalogue record ID `041-003286546`.
- Rules source: separate per-field references to the artifact and the approved scholarly reconstruction; mark any modern product convenience as a Shoonaya house rule.
- Content fields: source script/transcription, transliteration, literal translation, reviewed explanatory note, language reviewer, applicable tradition, provenance, and rights status.
- Versioning: immutable ruleset and content versions; an approved correction creates a new version. Every saved/online match pins its starting versions.

Provisional mechanics that require review (not defaults to implement): seven cowries; one token per player; start from outside the numbered track; count the shell outcomes to move; automatic connection traversal on landing; square 68 as the goal; the 72-to-51 return path for the documented overshoot sequence. The reviewers must confirm the scoring face, what a zero throw does, whether the route and goal are read correctly, whether there is an exact-finish requirement, the order of chained connections, and the permitted player count. If any of those are product choices rather than historical rules, label them as house rules in the game UI.

## Reviewer checklist and approval record

The scope owner must name the reviewer; no reviewer has been invented or contacted. A suitable review should cover:

1. Is Johnson 5,8 appropriately identified for this first pack, and what tradition/region wording should Native display?
2. Does the proposed board orientation, cell numbering, top-row destination, and every snake/ladder/scorpion endpoint match the artifact?
3. Does the evidence support square 68 as the winning destination and the 72-to-51 movement? Are the seven-cowrie setup and scoring interpretation appropriate for this exact chart?
4. Which rules are genuinely evidenced, which are scholarly reconstruction, and which must be disclosed as Shoonaya house rules?
5. Are the Hindi/Persian transcriptions and translations accurate, and what terminology must not be flattened into generic “good/bad” labels?
6. Are the proposed labels and explanations respectful and suitable for a broad audience, including users outside the Vaishnava tradition?
7. What source image/transcription rights are available, and may the proposed original artwork reproduce the board topology and inscriptions?

| Approval field | To be completed by the project/reviewer |
| --- | --- |
| Reviewer name and role | Pending |
| Review date | Pending |
| Tradition, language, and historical scope | Pending |
| Source board and exact version reviewed | Pending |
| Approved mechanics / required corrections | Pending |
| Translation/transliteration approval | Pending |
| Artwork/transcription rights decision | Pending |
| Unresolved caveats and user-facing attribution | Pending |

## Low-fidelity Native flow and board constraints

1. **Game landing:** concise explanation, “Learn,” “Play solo,” “Play nearby,” “Play with friends/family,” and “Continue.” Guest can start solo or local play without sign-in.
2. **Ruleset card:** board title, explicit Vaishnava attribution, board size, source/reconstruction disclosure, language availability, and “Rules and sources.” Do not offer unreviewed board variants as selectable content.
3. **Mode setup:** choose player count, solo opponent, local pass-and-play, or private room; display the exact ruleset version and any house rules before starting.
4. **Tutorial:** short animated/step-by-step intro to turn, cowrie throw, board movement, and one reviewed connection. Every lesson is skippable and does not claim that random movement measures virtue.
5. **Match screen:** portrait-first 9-by-8 board with pan/zoom if needed; one prominent 44-point-or-larger “Throw” control; active-player and last-throw card; a visible move/explanation log; pause/exit. A cell tap opens a read-only detail, never a hidden move. Provide an accessible linear cell navigator and VoiceOver/TalkBack labels so board density is not the only way to understand state.
6. **Landing explanation:** show reviewed source label, reviewed translation, and a clearly marked Shoonaya explanation as separate layers. Allow “Just play” to dismiss repeated explanations.
7. **End state:** show match result and rematch/save actions. Do not award karma or spiritual status. Online ranked results are separate from offline/local results.

Do not promise 3D or a particular frame rate in Stage 0. Use a simple 2D layout prototype first; choose a rendering approach only after physical-device board-size and accessibility checks.

## Stage 0 exit status

**Prepared:** board comparison, first candidate recommendation, source ledger, unresolved rule list, game-flow outline, and reviewer checklist.
**Still required to close Stage 0:** project decision to adopt/replace the candidate, named human reviewer approval, image/transcription rights determination, and resolution of the seven provisional mechanical questions above.
**Implementation gate:** keep the current Chaupar prototype isolated. No Gyan Chaupar rules engine or player-facing screen should be built until the above decisions are recorded.
