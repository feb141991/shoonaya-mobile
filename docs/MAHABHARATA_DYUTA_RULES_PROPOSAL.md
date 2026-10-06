# Dyuta Sabha — Seven Lamps Rules Contract

**Status:** implemented local ruleset (`dyuta-sabha-bluff-v1`), pending device and cultural review.
**Canonical owner:** Native repository, `lib/dyuta/engine.ts`. This offline game has no backend DTO or shared route.

## Match contract

- Two sides begin with seven seals. The match lasts at most seven rounds; the challenger alternates each round.
- The challenger privately throws two ordinary six-sided dice and may keep both or reroll exactly one die once.
- After seeing the final private throw, the challenger declares one, two, or three seals.
- The responder sees the declaration, not the concealed dice, and either accepts or yields one seal.
- On acceptance, the responder privately throws with the same single-reroll option. Both throws are then revealed. The higher total receives the declared seals; a tie transfers none.
- A losing three-seal declaration is recorded as an overreach. Its round lamp is shown dimmed.
- The match ends after seven rounds or immediately when either side reaches zero seals. Seals are conserved; no currency, real-money value, karma, ranking, prize, or purchase is attached.

## Guide fairness

The Guide's accept/yield policy receives only the round, declared stake, public seal counts, and rounds remaining. Concealed dice are not part of that input. Difficulty changes documented thresholds, not odds. Dice continue to use the platform cryptographic random source.

## Presentation

- Seven diya lamps replace a numeric round tracker.
- The Guide has neutral, thinking, pleased, and gracious-in-defeat illustrated states. The figure is fictional and is not presented as a named epic or historical person.
- The result can be captured as a local `react-native-view-shot` recap card and shared through the existing Shoonaya share flow.
- Motion respects the app's reduced-motion preference.

## Content boundary

Dyuta Sabha is a Shoonaya-interpreted game inspired by the Mahabharata setting, not a reconstruction or scriptural simulation. No verse, translation, teaching, or Rigveda 10.34 quotation is included. A closing reflection remains withheld until its exact source, translation rights, tradition metadata, and human review are recorded.

## Release gates

- Android and iOS real-device play-throughs, including pass-and-play privacy.
- Light/dark, text scaling, reduced motion, screen-reader labels, and 44px touch-target QA.
- Product rules-comprehension review and cultural review of framing and Guide artwork.
- Share-sheet and captured-card verification on both platforms.
