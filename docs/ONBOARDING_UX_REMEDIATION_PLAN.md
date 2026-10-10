# Onboarding UX Remediation Plan

Status: Phase 1 implemented in source; device-matrix verification pending
Recorded: 2026-10-10
Owner: Native app (`shoonaya-mobile`)
Backend contract owner: `Sanatan Sangam/Shoonaya`

## Problem statement

On shorter devices, onboarding actions sit too close to the operating-system
navigation area. This makes the primary action uncomfortable to reach and can
cause an attempted tap to hit the device Back/Home control. On long steps, the
same action area may be pushed below the usable viewport; this is visible on
the Panchang detail step, where **Skip for now** can become inaccessible.

The flow also reuses one `ScrollView` without resetting its position when the
step changes. A long step can therefore leave the next step, including
Nakshatra, opening halfway down its content.

These are flow-shell defects. They should be fixed consistently across every
step rather than patched with per-screen margins.

## Phase 1 — release-blocking remediation

### 1. Introduce a shared onboarding shell

Use one three-zone layout for all standard steps:

1. A compact fixed header containing Back, progress, and `Step X of Y`.
2. A scrollable content region.
3. A fixed action tray containing the primary and optional secondary actions.

The action tray must:

- apply the real bottom safe-area inset;
- remain above gesture and three-button Android navigation;
- keep every action at least 44 pt high;
- place **Continue** and **Skip for now** in the same safe-area container;
- give the scroll area enough bottom inset that its final content is never
  hidden behind the tray;
- respond safely to the software keyboard on text-entry steps.

Move Back into the fixed header. Do not keep it beside Continue at the bottom,
where it competes with the primary action and the device Back control.

### 2. Reset the reading position on every transition

When moving forward or backward:

- dismiss the keyboard;
- scroll the new step to the top without inheriting the old offset;
- move accessibility focus to the new heading;
- announce the new step and its position to screen-reader users.

Draft restoration may resume the saved step, but it must still open that step
at its beginning unless a future, deliberately persisted within-step position
is introduced.

### 3. Correct optional-step semantics

Optional explanation belongs in the page content, not between the footer
actions. The footer hierarchy should be:

```text
[ Continue ]
[ Skip for now ]
safe area
```

Continue saves the current selection. Skip preserves an explicit “not chosen”
state; it must not silently save a visual default.

There is a current defect in the Nakshatra step: its value check includes
`rashi` and `gotra`, which belong to the previous Personal step. Nakshatra's
optional state must depend on `nakshatra` alone.

### 4. Replace the 27-card Nakshatra wall

The current three-column, 27-item grid is too tall and too dense for an
onboarding step. Replace it with:

- a concise “Do you know your Nakshatra?” introduction;
- a search/picker entry point;
- a searchable full-screen sheet or modal list;
- a compact selected-Nakshatra summary card;
- a clear **Not sure — add later** path.

Do not infer or calculate Nakshatra unless verified birth date, exact time,
location, timezone, and the canonical backend calculation are available.

### 5. Fix the Panchang detail step

Keep its explanatory content scrollable, but pin **Continue** and **Skip for
now** in the shared action tray. Both actions must remain visible and operable
on the shortest supported viewport, at large text sizes, and with Android
three-button navigation enabled.

### 6. Make notification deferral reversible

**Not now** currently records `disabled` and immediately advances to Location.
Because the permission pages do not use the standard onboarding header/footer,
there is no visible Back action to reconsider that choice. This must be fixed.

- Show the shared Back control on Notifications, Location, and Ready.
- If the user returns after choosing **Not now**, show the notification page in
  a reversible deferred state with **Allow notifications** available again.
- Keep `deferred` distinct in the UI from an actual OS permission denial.
- If the OS can still present its permission prompt, **Allow notifications**
  requests it normally.
- If the OS has blocked another prompt, replace a dead retry with a clear
  **Open Settings** action and retain **Not now**.
- Do not register a push token or enable profile notification preferences
  until the user has affirmatively opted in and the OS permission is granted.
- Back navigation must never erase the saved draft or convert a prior answer
  without a new user action.

### 7. Turn Ready into a meaningful Welcome page

The current Ready page is visually a completion receipt: a greeting, three
small feature tiles, and destination buttons. It does not sufficiently show
what the user's answers have unlocked, and it omits major product value such
as Bhakti and Kul.

Keep this page concise enough to fit on a short device, but redesign it as a
personalised value reveal:

1. **Welcome header** — tradition-appropriate greeting followed by “Your
   Shoonaya is ready,” using the user's display name when it is available.
2. **Personalisation receipt** — one short line confirming only real choices,
   such as tradition, calendar profile, language, or selected goal. Never show
   an inferred Nakshatra, location, or calendar result.
3. **Prepared for you** — four compact, tappable value cards:
   - **Today**: the user's Panchang and upcoming sacred days;
   - **Bhakti**: prayers, scripture, katha, Japa, meditation, or the appropriate
     tradition-aware practice library;
   - **Kul**: create or join a family space for lineage, shared observances,
     family tasks, and invitations;
   - **Community**: Mandali/Sangat/Sangha/community connection, using
     tradition-appropriate language.
4. **One recommended first step** — derived only from an explicit tradition or
   selected goal. Examples include Japa for the current Hindu flow and
   meditation for the existing Buddhist flow. Do not prescribe an unsupported
   ritual merely to fill the card.
5. **Clear entry action** — one full-width primary **Enter Shoonaya** action.
   The recommended practice and value cards are secondary destinations, not
   competing primary buttons.

Tapping any destination must complete and persist onboarding before routing.
The Welcome page must never trap the user into configuring Kul, notifications,
or another optional feature before entering Home.

#### Compact visual structure

```text
[tradition mark]
Welcome, <name>
Your Shoonaya is ready
Personalised for <real selected values>

Prepared for you
[ Today ] [ Bhakti ]
[ Kul   ] [ Community ]

Recommended first step
[contextual practice card]

[ Enter Shoonaya ]
```

On very short screens, the value cards and recommended step may scroll, while
**Enter Shoonaya** remains in the shared safe-area action tray. At large text
sizes the grid becomes a single-column list.

## Phase 2 — flow-wide improvements

### A. Use a layout appropriate to option count

- Short choices: cards or chips.
- Medium choices: single-column rows.
- Long catalogues: searchable picker or dedicated selection sheet.
- Text entry: keyboard-aware content with a pinned action tray.
- Permission requests: short rationale, one primary action, one clear defer
  action.

Avoid forcing every kind of question into the same card grid.

### B. Reduce unnecessary onboarding load

Review the ten-step Hindu path for progressive profiling. Keep only choices
needed to create a useful first session before Home. Move nonessential details
to a later Profile completion journey, while preserving existing saved values
and completion logic.

Candidates for a product decision, not automatic removal:

- optional personal metadata;
- name-story generation;
- detailed goals;
- permission prompts that can be requested in context later.

### C. Make required and optional status explicit

Show `Required` or `Optional` near the step heading. Do not reveal that a step
is optional only at the very bottom. Continue should retain a stable meaning
throughout the flow.

### D. Handle Android Back consistently

On all steps after the first, the hardware/system Back action should navigate
to the previous onboarding step. On the first step, use the established auth
navigation behavior. Never allow a routine Back gesture to discard a
partially completed draft without warning.

### E. Improve accessibility and dynamic type

- Minimum 44 pt touch targets.
- Selection controls expose role, selected state, label, and hint.
- Focus moves to the new step heading.
- Errors are announced and brought into view.
- At large text sizes, switch multi-column choices to one column.
- Do not truncate required instructions or button labels.
- Respect reduced-motion preferences for transitions.

### F. Clarify permission timing

Notification and location pages should distinguish product preference from OS
permission. Where practical, request OS permission at the first meaningful use
rather than during a long setup sequence. If they remain in onboarding, the
defer action must be equally reachable and must not imply permanent loss of
functionality.

### G. Preserve privacy and contracts

- Keep onboarding drafts user-scoped.
- Continue excluding raw coordinates from persisted drafts.
- Preserve existing step IDs and backend profile fields unless a separate
  contract change is approved and audited in both repositories.
- Do not derive calendar profile from GPS or infer unverified spiritual data.

## Proposed implementation shape

Keep the initial change scoped:

- `OnboardingShell`: header, content viewport, safe action tray, keyboard and
  focus behavior.
- `OnboardingActionTray`: stable primary/secondary hierarchy.
- `NakshatraPicker`: search, selection, and selected summary.
- Pure per-step optional-value helpers, covered by behavioral tests.

The existing `onboarding.tsx` is already large. Extract only these reusable
responsibilities; do not rewrite persistence, completion, permission, or
profile-saving logic as part of the visual repair.

## Phase 1 implementation record — 2026-10-10

- `OnboardingShell` is now used by every standard onboarding step, with a
  safe-area-aware fixed header/action tray and a scrollable content region.
- Step changes dismiss the keyboard, reset scroll position, and move screen
  reader focus to the new heading. Android hardware Back uses the same step
  history as the visible Back action.
- Notifications and location share the shell. Deferral remains distinct from
  OS denial; an OS-blocked prompt routes to device Settings, and returning from
  Settings rechecks permission state and resumes the flow.
- The Nakshatra picker searches Sanskrit, English, ruler and deity names,
  stores the canonical key, and exposes selected state accessibly.
- Welcome now presents the selected profile details and four destinations;
  choosing a destination saves onboarding first. The pinned primary action
  always enters Shoonaya, while the suggested practice remains a secondary
  destination.
- Automated contract tests pass. A simulator/device pass for short screens,
  large text, keyboard, accessibility focus and OS permission recovery remains
  necessary before calling the visual verification complete.

## Verification matrix

### Devices and navigation modes

- Small iPhone viewport with Home indicator.
- Standard and tall iPhone viewports.
- Short Android viewport with three-button navigation.
- Android gesture navigation.
- Standard and tall Android viewports.
- Software keyboard open on every input step.

### Display and accessibility

- Light and dark mode.
- Default, large, and maximum supported text scaling.
- VoiceOver and TalkBack focus order.
- Reduced motion.
- English and Hindi copy.

### Behavioral acceptance

- Every step opens at the top when entered from either direction.
- Continue, Back, Skip, permission defer actions, and final completion remain
  reachable without scrolling the action tray.
- After tapping notification **Not now**, Back returns to Notifications and
  still permits the user to opt in.
- Notification deferred, OS-denied, and enabled states render the correct
  actions; an OS-denied retry routes to system settings where required.
- The Welcome page surfaces Today, Bhakti, Kul, and Community without implying
  that an unconfigured feature or unverified personal value is already set up.
- Every Welcome destination completes onboarding exactly once before routing,
  and **Enter Shoonaya** always remains available.
- No action overlaps the system navigation area.
- Content can scroll fully above the pinned tray.
- Nakshatra Skip remains available when Nakshatra is empty, regardless of
  Rashi or Gotra.
- Keyboard appearance does not cover the active input or action tray.
- Draft restore, completion, notification choice, location choice, and profile
  persistence behave exactly as before.
- No duplicate submission occurs during loading or rapid taps.

## Delivery sequence

1. Implement the shell, safe-area action tray, scroll reset, and Nakshatra
   optional-state fix.
2. Add behavioral tests for step transitions, safe footer structure, keyboard
   state, optional semantics, and Android Back.
3. Replace the Nakshatra grid with the picker.
4. Run Native targeted tests, typecheck, and the source-scoped Graphify update.
5. Complete real-device Android and iOS checks using this plan's matrix.
6. Only then evaluate progressive profiling or permission-timing changes as a
   separate product objective.

## Out of scope for the remediation commit

- Backend schema or profile-contract changes.
- Calendar calculation changes.
- New spiritual-content claims.
- Unrelated Home, navigation, or profile redesign.
- New animation dependencies.
