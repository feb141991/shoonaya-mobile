# Home Discovery Prompts

## Objective

Improve discovery of Home customisation without creating a second onboarding flow. Preserve the existing First Week Guide as the only guided introduction to daily practice. This runbook applies to the native repository only.

## Product Decisions Already Made

- Do not build a first-launch carousel, full-screen tour, or a sequence of coach marks.
- Do not repeat Japa, Shloka, Nitya, Pathshala, or Mandali education. The existing `components/home/FirstWeekGuide.tsx` owns that experience.
- Add only one contextual discovery cue: the Home hero artwork control.
- Make the greeting affordance visible through an accessible edit control; do not rely solely on tapping decorative text.
- Add a permanent, lightweight `Home customisation` entry under Settings.
- Reuse the existing Hero Backdrop Picker, Greeting Picker, and preference stores. Do not introduce a second set of artwork lists, greeting pools, or AsyncStorage keys.
- Do not add an analytics SDK, tracking SDK, or remote event pipeline in this work. Reuse an existing consent-aware telemetry path only if one is already wired and can be proven in code. Otherwise keep the work local and observable through tests.
- Do not use a simulator for this runbook.

## Shared Acceptance Rules

- The Home hero must remain immediately interactive; guide state must never block Home rendering or Home summary loading.
- At most one contextual overlay, sheet, or prompt may be visible on Home at a time. The new cue must not overlap First Week Guide, Mood Pulse, Dharma Mitra, notification permission, or another modal.
- The cue is optional, can be dismissed, and never appears again after a user dismisses it or opens the artwork picker.
- State is identity-scoped. A guest, Account A, and Account B on the same device must not inherit each other's dismissal or exposure state.
- Accessibility: all new controls have a 44px minimum target, a meaningful label and hint, and work in light/dark mode and larger text sizes.
- Run `npx tsc --noEmit`, `npm test`, `git diff --check`, and `git status --short` at the end of every implementation prompt.

---

## Prompt 0 - Ground Truth and Integration Contract

```text
Audit native Home discovery before editing product code. Work only in
/Users/Business(C)/shoonaya-mobile.

Read and trace these exact paths:
- app/(tabs)/index.tsx
- components/home/FirstWeekGuide.tsx
- components/home/HeroBackdropPicker.tsx
- components/home/GreetingPicker.tsx
- components/home/FloatingDharmaScroll.tsx
- lib/heroPreference.ts
- lib/greetingPreference.ts
- lib/appIdentity.ts
- app/settings.tsx and app/settings/detail-screen.tsx

Produce a short, code-grounded design note at
docs/HOME_DISCOVERY_GROUND_TRUTH.md. It must state:
1. The exact trigger and dismissal conditions for FirstWeekGuide, Mood Pulse,
   Dharma Mitra, and the Hero/Greeting pickers.
2. Whether Home has a focus lifecycle capable of refreshing device-local hero
   preferences after returning from Settings.
3. The existing persistence keys, whether each is user/guest scoped, and the
   account-switch implications.
4. The smallest reusable integration point for Settings to open the existing
   pickers without duplicating the preference catalogue or persistence logic.
5. Any conflict that makes Prompt 1 unsafe.

Do not build a tour. Do not add coach marks. Do not change Home behaviour,
preference keys, or Settings UI in this prompt. Do not claim a control exists
unless you traced its render path. Add focused source-contract tests only if
needed to prove a currently ambiguous contract.

Run npx tsc --noEmit, npm test, git diff --check, and git status --short.
Stop for independent review before Prompt 1.
```

---

## Prompt 1 - Single Contextual Hero Discovery Cue and Greeting Affordance

```text
Implement the smallest native Home discovery improvement. Work only in
/Users/Business(C)/shoonaya-mobile and obey the approved ground-truth note
from Prompt 0.

Build a narrow `homeDiscovery` local-state module. It may share a small
identity-scoped storage-envelope utility only if that utility remains limited
to schema versioning, identity verification, validation, and purge. Keep all
feature trigger rules in `homeDiscovery`; do not create a universal product
tour engine.

Required behaviour:
1. Home hero artwork cue:
   - Show at most once per user/guest identity.
   - Only consider it after Home has rendered valid content and the user has
     opened Home on at least three distinct app sessions or focus entries.
   - Never show it while FirstWeekGuide is eligible/visible, while a mood
     prompt is visible, while Dharma Mitra is open, or while any existing
     Home sheet/modal is open.
   - Anchor the cue to the existing artwork button. Keep it visually quiet:
     one short label and a subtle highlight, not a full-screen scrim or a
     multi-step tooltip sequence.
   - Mark it complete when the user opens the Hero Backdrop Picker or
     dismisses it. Never make the user complete it.
2. Greeting affordance:
   - Add a familiar edit control next to the tappable greeting, retaining the
     existing GreetingPicker and its tradition-aware pool.
   - The control must be at least 44px, have an accessibility label/hint, and
     not shift or truncate the greeting at larger text sizes.
3. Identity and lifecycle:
   - Use `useAppIdentity()` / `getAppIdentity()` as appropriate; do not add a
     screen-level Supabase `getUser()` request.
   - Scope discovery state per authenticated user and separately for guests.
   - Purge the state on logout/account switch beside existing Home/Mandali
     cache cleanup.
   - Failure to read/write discovery state must leave Home fully usable.

Forbidden:
- No first-launch carousel.
- No duplicate educational content for FirstWeekGuide actions.
- No tracking SDK, remote telemetry endpoint, or consent bypass.
- No second artwork/greeting catalogue or preference persistence path.
- No visual regression that makes the hero taller or delays Home loading.

Add focused tests for identity isolation, one-time exposure, suppression when
another Home overlay is active, dismiss/open-picker permanence, and greeting
control accessibility contract. Run npx tsc --noEmit, npm test,
git diff --check, and git status --short. Stop for review.
```

---

## Prompt 2 - Settings Entry Reusing the Real Home Controls

```text
Add a permanent, low-noise Home customisation entry in native Settings.
Work only in /Users/Business(C)/shoonaya-mobile. Start by reading the
approved Prompt 0 note and the Prompt 1 implementation.

Product requirement:
- The entry is discoverability, not a guide. It must take users to the real
  existing backdrop and greeting controls.
- Put `Home customisation` under the most appropriate existing Settings
  section based on current screen ownership; do not add a duplicate Settings
  hub or a broad FAQ page.

Implementation requirements:
1. Create a focused destination only if necessary. It may mount the existing
   HeroBackdropPicker and GreetingPicker, but it must reuse
   `lib/heroPreference.ts`, `lib/greetingPreference.ts`, and their existing
   tradition-aware catalogues exactly.
2. Do not reimplement artwork cards, greeting pools, sizing options, or their
   persistence under a new key.
3. Ensure preference changes made from Settings are reflected when Home is
   resumed. Use a small explicit refresh/subscription mechanism rather than
   relying on a full app reload or a stale mounted Home state.
4. Maintain device-local semantics unless the existing product contract is
   deliberately changed in a separately approved task. If Prompt 0 finds
   cross-account preference leakage, document it and fix key scoping only
   with a migration policy that never guesses which account owns old data.
5. Keep the Settings page compact: one normal destination row, no explanatory
   feature-tour prose.

Add tests proving the Settings entry reuses the canonical picker/store paths
and that a changed preference appears on Home after returning. Verify back
navigation, Android hardware back handling, 44px targets, and no duplicate
catalogues. Run npx tsc --noEmit, npm test, git diff --check, and git status
--short. Stop for review.
```

---

## Prompt 3 - Review, Accessibility, and Scope Closure

```text
Independently review the Home discovery work from Prompts 0-2 in
/Users/Business(C)/shoonaya-mobile. Do not add unrelated product features.

Audit for:
- A second onboarding experience, carousel, or multiple simultaneous coach
  marks.
- Duplicate artwork or greeting data/persistence logic.
- Any user/guest cross-account leak in discovery or preference state.
- Home startup or Home-summary loading being blocked by the feature.
- Cue collision with FirstWeekGuide, Mood Pulse, Dharma Mitra, alerts, or
  sheets.
- Correct visual behaviour in light/dark mode, large text, and narrow phones.
- Navigation back from Settings to Home without losing the selected control
  state.

Fix only defects directly caused by this feature. Add regression tests for
every confirmed defect. Do not use a simulator. Finish with npx tsc --noEmit,
npm test, git diff --check, git status --short, and a short receipt listing
changed files, tests, and remaining deliberate product decisions.
```

