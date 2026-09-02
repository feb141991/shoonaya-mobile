# Home Discovery Ground Truth & Integration Contract (Corrected)

## 1. Trigger and Dismissal Conditions for Home Overlays & Pickers

| Surface / Control | Trigger Condition | Dismissal / Completion Condition | Rendering Location |
|---|---|---|---|
| **FirstWeekGuide** | Rendered when `state.firstWeek === true` from `/api/native/home-summary` (server-side rule: 0 shloka streak, no last read date, no guided path rows). | 1. User taps close icon (`shoonaya-first-week-dismissed: true`).<br>2. All 5 acts marked done (`shoonaya-first-week-guide`). | `app/(tabs)/index.tsx` (Inline above practices, lines 1513–1516) |
| **Mood Pulse Sheet** (`MoodPulseSheet`) | **Automatic daily trigger**: Opens automatically once per spiritual day via `moodPulseVisible` after mood status loads on Home. (Can also be re-triggered by user). | 1. User selects a mood (saves check-in and sets `moodPulseVisible = false`).<br>2. User taps backdrop / close handle. | Bottom Sheet Modal |
| **Dharma Mitra Chat** (`DharmaMitraChatSheet`) | User taps the floating golden scroll (`FloatingDharmaScroll` $\rightarrow$ `setChatSheetVisible(true)`). | 1. User taps close button or backdrop scrim.<br>2. Screen navigation. | Full-Screen Slide Modal |
| **Hero Backdrop Picker** (`HeroBackdropPicker`) | User taps the image button on the bottom-right corner of the Hero banner (`setHeroPickerVisible(true)`). | 1. User selects an artwork theme.<br>2. User changes hero size.<br>3. User taps close (`x`) / backdrop. | Bottom Sheet Modal |
| **Greeting Picker** (`GreetingPicker`) | User taps the greeting text or edit affordance on the Hero banner (`setGreetingPickerVisible(true)`). | 1. User taps a preset greeting or types custom text.<br>2. User taps close (`x`) / backdrop. | Bottom Sheet Modal |
| **Auth Gates** (`AuthGate` / AI Auth Gate) | Triggered when guest interacts with authenticated actions (`authGateVisible` or `aiAuthGateVisible`). | User dismisses gate or navigates to login. | Modal Overlay |

---

## 2. Complete Overlay Guard Definition

The discovery cue must NEVER collide with any active surface. The exact blocking predicate is:

```ts
const hasBlockingHomeSurface =
  moodPulseVisible ||
  chatSheetVisible ||
  heroPickerVisible ||
  greetingPickerVisible ||
  authGateVisible ||
  aiAuthGateVisible;
```

For **First Week Guide**, we adopt the strict conservative rule:
$$\text{isFirstWeekActive} = (\text{state.firstWeek} === \text{true})$$
If `state.firstWeek === true`, the discovery cue is suppressed unconditionally.

---

## 3. Session Counting Rules (Cold Launch Boundary)

- **Definition**: Tab switches within the same app session do **NOT** increment the counter.
- **Mechanism**:
  - The module generates an in-memory `runtimeSessionId` once per JavaScript
    runtime, normally on a cold launch. Foreground focus does not increment it.
  - A visit only counts as a qualified session if:
    1. Home has rendered valid, non-error content (`state.phase === 'ready'`).
    2. The current `runtimeSessionId` has not already been counted (`lastCountedSessionId !== runtimeSessionId`).
  - When counted, `lastCountedSessionId` is stored in the identity-scoped persistence envelope alongside `sessionCount`.
  - The hero artwork discovery cue is eligible only when $\text{sessionCount} \ge 3$.

---

## 4. Focus Lifecycle & Preference Refreshing on Home

- **Implemented behaviour**: Home re-reads `getHeroPick()`, `getHeroSize()`, and `getGreetingPick()` on focus with an active/cancellation guard. This refreshes device-local choices after returning from Settings without blocking Home rendering or triggering an API reload.
- **Touch Target Accessibility**:
  - Greeting edit control: Increase from 26x26 to minimum 44x44 touch target with explicit `accessibilityLabel="Change greeting"` and `accessibilityHint`.
  - Hero artwork button: Increase from 38x38 to minimum 44x44 touch target with explicit `accessibilityLabel="Change sanctuary backdrop"` and `accessibilityHint`.

---

## 5. Persistence Keys & Identity Scoping

| Store | Key / Mechanism | Scoping |
|---|---|---|
| **Hero Backdrop & Size** | `shoonaya_hero_pick`, `shoonaya_hero_size` | Device-local (Global, PWA parity) |
| **Greeting Pick** | `shoonaya_greeting_pick` | Device-local (Global, PWA parity) |
| **Home Discovery State** | `shoonaya_home_discovery_v1_{identityKey}` | **Identity-scoped** (`guest` vs `user_{userId}`) |
| **Settings Integration** | Mounts existing `HeroBackdropPicker` and `GreetingPicker` directly. | Zero duplicate catalogs or keys. |
