# Antigravity: Profile Wiring and Progressive Completion

Run these prompts **sequentially**. Do not combine runs. After each prompt, review the diff and verification output before starting the next prompt.

## Shared Rules For Every Run

- Work in both repositories only when the prompt explicitly requires it:
  - Native: `/Users/Business(C)/shoonaya-mobile`
  - Backend/PWA: `/Users/Business(C)/Sanatan Sangam/Shoonaya`
- Read the current implementation before editing. Do not rely on earlier audit prose when code has changed.
- Preserve existing authentication, RLS, onboarding, guest-mode, calendar, notification, and profile behavior unless the prompt explicitly changes it.
- Do not add a database migration. All referenced `profiles` columns already exist.
- Do not make optional spiritual or personal data mandatory.
- A user who skips an optional field has still completed onboarding.
- Never treat declined notifications as an incomplete profile.
- Never prompt a non-Hindu user for Hindu-only fields.
- Keep `tradition` locked after onboarding.
- Do not add a new dependency.
- Do not redesign Home, onboarding, Profile, Settings, Panchang, Vrat, Kundali, Kul, Sankalpa, or Nitya beyond the requested surface.
- Preserve touch targets of at least 44x44, reduced-motion behavior, dark mode, safe areas, and accessibility labels.
- Use existing Shoonaya components, theme tokens, typography, and motion primitives.
- Run `git status --short` before and after. Report every changed file, including files outside the requested scope.
- Run the relevant tests plus `npx tsc --noEmit` in every changed repository.
- Commit only after all checks pass. One scoped commit per prompt. Stop after reporting the commit and verification results.

---

## Prompt 1: Repair The Gender-Context Contract

Audit and fix the native Personal Details gender-context round trip.

### Confirmed defect

- Native sends `gender_context: "general"` from `app/settings/personal-details.tsx`.
- The database constraint and existing consumers use `female | general | null`.
- `src/app/api/native/profile/route.ts` currently validates a different vocabulary: `male | female | prefer_not | null`.
- This can make Personal Details return HTTP 400 for a valid native save.

### Required work

1. Establish the canonical persisted contract from the current schema and consumers. It must remain `female | general | null` unless the live schema proves otherwise.
2. Update the backend native-profile PATCH validator and error copy to accept exactly the persisted database vocabulary.
3. Keep UI choices separate from stored practice context:
   - `female` UI choice may persist `female`.
   - the default/general practice path may persist `general`.
   - an actually unset value may persist `null`.
4. Do not pretend a stored `general` value can identify whether the user originally selected Male or Prefer not to say. Preserve the existing fail-safe read behavior or replace the labels with accurate practice-path language only if that can be done without redesigning the screen.
5. Add backend route tests covering valid `female`, valid `general`, valid `null`, invalid arbitrary values, unauthenticated access, and ownership-scoped updates.
6. Add or extend native contract tests proving the payload sent by Personal Details matches the backend vocabulary.

### Verification

- Backend targeted tests.
- Native onboarding/profile contract tests.
- `npx tsc --noEmit` in both repositories.
- Confirm no schema or migration changed.

---

## Prompt 2: Add The Missing Native Personalisation Editor And API Contract

Create one native post-onboarding editor for profile fields users may legitimately skip, and extend the authenticated backend PATCH route to support those fields safely.

### Fields

- Hindu-only: `rashi`, `nakshatra`, `gotra`, `calendar_profile`, `calendar_scope`.
- All traditions: `onboarding_goal` or its current canonical profile-goal representation.
- Existing Personal Details fields remain in `/settings/personal-details`; do not duplicate them.

### Backend requirements

1. Extend `src/app/api/native/profile/route.ts` using explicit allowlists and strict validation.
2. Derive the authenticated user from `getApiUser(req)` and update only that user's row.
3. Read the user's locked `tradition` before accepting tradition-specific fields.
4. For non-Hindu users, reject non-null Hindu-only values with a clear 400 response. Allow explicit nulls so stale Hindu-only data can be cleared safely.
5. Validate Rashi, Nakshatra, calendar-profile, calendar-scope, and goal values against the canonical current source. Do not accept arbitrary strings because a column is text.
6. Trim and length-limit Gotra. Empty input must persist as null.
7. Preserve existing PATCH fields and behavior.
8. Add authorization, validation, null-clearing, non-Hindu rejection, and successful-update tests.

### Native requirements

1. Add `/settings/personalisation` using the app's existing Settings visual language.
2. Load current values for the authenticated user and show proper loading, retry, saving, success, and failure states.
3. Reuse `RASHI_LIST`, Nakshatra constants, `CALENDAR_PROFILES`, `CALENDAR_SCOPES`, and the canonical onboarding goal options. Do not create driftable duplicate lists.
4. Render Hindu-only sections only for Hindu profiles.
5. Use compact selectors, accessible selected states, and 44px minimum touch targets.
6. Add a Settings entry labelled `Personalisation` below `Personal details`.
7. Move Panchang's direct Rashi database write through the authenticated profile PATCH API, or document and test why it must remain direct. Prefer one validated write path.
8. Do not change calendar calculations or materialisation.

### Verification

- Backend profile route tests.
- Native screen/contract tests for Hindu and non-Hindu profiles.
- Native and backend typechecks.
- Confirm a non-Hindu profile never renders or saves Hindu-only data.

---

## Prompt 3: Replace The Misleading Profile-Completion Model

Make Profile completion truthful, tradition-aware, actionable, and respectful of optional data.

### Current problems

- `/api/native/progress-summary` checks only Name, Tradition, City, App Language, and one notification boolean.
- It cannot detect most skipped onboarding fields.
- The native `Complete` CTA routes to generic Settings instead of the relevant editor.
- Optional or sensitive fields must not lower a user's core-completion score.

### Required model

Return two concepts instead of conflating them:

1. `coreProfile`
   - Required account identity only.
   - Name, tradition, and app language.
   - Must be considered complete after valid onboarding.

2. `personalisationSuggestions`
   - Optional, tradition-aware opportunities.
   - Include stable field key, localized label, reason, destination route, priority, and context.
   - Hindu suggestions may include missing calendar profile/scope, Rashi, Nakshatra, and Gotra.
   - All-tradition suggestions may include missing location, life stage, goals, or other currently supported useful data.
   - Never include notification permission as profile incompleteness.

Keep the existing response shape backward-compatible where practical, but do not preserve misleading percentage semantics.

### Native UX

1. Replace `Profile Strength` with truthful copy:
   - Core complete: `Your profile is ready`.
   - Optional suggestions: `Personalise Shoonaya`.
2. Show at most the two highest-priority suggestions.
3. Route each CTA directly to its relevant screen, optionally with a stable `focus` query parameter.
4. Do not show Hindu suggestions for Sikh, Buddhist, or Jain profiles.
5. Do not show a percentage that penalizes skipped sensitive fields.

### Tests

- Hindu profile with all optional fields missing.
- Non-Hindu profile with Hindu-only fields null.
- Notifications disabled by choice.
- Fully enriched profile.
- Correct direct route for every emitted suggestion.

---

## Prompt 4: Add Restrained Contextual Progressive Profiling

Add a shared, user-scoped mechanism that may suggest an optional profile field when its value becomes immediately useful. This must not become an onboarding replay or nag system.

### Product rules

- Never block the current task.
- Never show on app startup.
- Never show more than one profile suggestion in a session.
- A dismissed suggestion must remain dismissed for at least 30 days.
- A permanent `Not now`/dismissal path must exist.
- Do not prompt again once the field is populated.
- Persist dismissal state per authenticated user. Guest state must remain isolated and must not leak into a signed-in account.
- Do not issue an additional network request on every screen focus. Reuse loaded profile context or a cached suggestion payload.
- Respect reduced motion.

### Context mapping

- Panchang or Vrat: calendar profile/scope when missing, Hindu only.
- Rashiphala or Panchang: Rashi when missing, Hindu only. Reuse the current picker rather than opening a duplicate modal.
- Kundali: offer to derive/save Rashi and Nakshatra from complete birth inputs; do not ask users to manually guess data the chart engine can calculate.
- Kul: Gotra when missing, Hindu only.
- Nitya: life stage only where the existing inline setup is already relevant; consolidate rather than duplicate it.
- After meaningful practice history exists: goals, using the Personalisation editor.

### Architecture

1. Add one pure suggestion resolver with deterministic priority rules.
2. Add one user-scoped dismissal store with tests for sign-out/account switching.
3. Use existing bottom-sheet/dialog primitives.
4. Add analytics events containing only suggestion key and action (`shown`, `dismissed`, `completed`). Never include DOB, Gotra, Rashi, Nakshatra, location, or free text.

### Verification

- Resolver unit tests for all four traditions.
- Dismissal TTL and user-isolation tests.
- No prompt on startup or immediate Home mount.
- No duplicate prompt when a screen refocuses.
- No new dependency and no unbounded animation or timer.

---

## Prompt 5: Preserve Punjabi Compatibility And Normalize Language Handling

Preserve and harden the existing English, Hindi, and Punjabi profile/content-language contract. Do not remove Punjabi support and do not falsely claim that the complete native interface is Punjabi-localized.

### Current state to verify first

- Backend and PWA profile language contracts already accept `en | hi | pa`.
- PWA has a centralized Punjabi translation catalogue.
- Native Settings and Profile already expose Punjabi.
- Native readable-content and AI language utilities already recognize `pa`.
- Native onboarding and Founder Note currently implement complete copy only for English and Hindi through inline binary branches and `FounderLanguage = 'en' | 'hi'`.

Treat these as hypotheses to verify against current code before editing. Report any drift.

### Required work

1. Define or reuse one canonical native language type for `en | hi | pa`. Remove driftable local `AppLanguage` duplicates where this can be done without broad unrelated refactoring.
2. Keep English, Hindi, and Punjabi available in native Profile and Settings.
3. Keep the backend PATCH route backward-compatible with all three values.
4. Ensure unrelated profile saves never reset an existing `pa` value to English or Hindi.
5. Ensure `app_language`, `meaning_language`, and `transliteration_language` preserve their independent values. Changing one must not silently overwrite the other two unless the user explicitly chooses a linked-language action.
6. Reuse native `language-runtime.ts` and readable-content helpers for content selection. Do not add a parallel language resolver.
7. Audit the PWA translation catalogue for reusable Punjabi strings, but do not import a web-only React context or browser dependency into React Native.
8. Keep onboarding language selection limited to its currently complete languages unless Punjabi onboarding passes the completeness gate below. It is preferable to show two fully localized onboarding choices than a Punjabi option that falls back to English after the first screen.
9. Do not remove, hide, downgrade, or overwrite Punjabi for existing users merely because full native chrome localization is incomplete.
10. Do not translate unrelated native screens in this prompt.

### Punjabi onboarding completeness gate

Punjabi may be added to first-run onboarding in this prompt **only if all of the following are completed together**:

- Every onboarding title, description, option label, validation error, loading state, button, Ready-screen string, and accessibility label has reviewed Punjabi copy.
- Founder Note has a complete Punjabi content object, including all tradition-specific bridges and greetings.
- No `language === 'hi' ? ... : ...` branch can make Punjabi silently fall back to English. Replace binary language branching in onboarding with a typed translation lookup.
- Gurmukhi renders using an appropriate existing/system font with verified weight fallback, line height, wrapping, and Dynamic Type behavior. Do not add a font dependency unless separately approved.
- Draft serialization/restoration supports `pa` without coercion.
- The selected Punjabi value persists through onboarding completion into `app_language` and `meaning_language`.
- iOS and Android screenshots prove that every onboarding step fits without clipping, overlap, inaccessible controls, or English leakage.
- A test enumerates every onboarding translation key and fails if any of `en`, `hi`, or `pa` is missing.

If any gate item cannot be completed with reviewed copy, leave Punjabi onboarding unexposed and report exactly what remains. Do not insert machine-generated or transliterated placeholder Punjabi.

### Tests

- Existing `pa` profile survives an unrelated Profile save unchanged.
- Settings can deliberately switch among English, Hindi, and Punjabi.
- App, meaning, and transliteration language updates remain independent.
- Backend accepts `en`, `hi`, and `pa`, and rejects unknown values.
- Native language normalization returns Punjabi for `pa` and English only for unknown/null values.
- If Punjabi onboarding is enabled, translation-key completeness, draft round-trip, final profile payload, Founder Note, and all-tradition copy tests pass.

### Verification

- Native and backend targeted language/preference tests.
- Native and backend `npx tsc --noEmit`.
- `git diff --check` in both repositories.
- Report whether Punjabi is supported for profile/content only or for full onboarding; use precise wording.
- If onboarding Punjabi is enabled, provide iOS and Android screenshots of Preferences, Founder Note, Personal Details, Calendar Profile, Goals, Notifications, and Ready.

---

## Prompt 6: End-To-End Profile Wiring Acceptance Pass

Review the completed implementation as a release-gate pass. Fix only defects directly related to Prompts 1-5.

### Required acceptance matrix

For every onboarding/profile field, report:

- database column or canonical storage,
- onboarding write path,
- authenticated post-onboarding edit path,
- downstream consumer,
- skipped/null behavior,
- later suggestion context,
- tradition eligibility,
- test proving the contract.

Cover at minimum:

- tradition,
- app and meaning language,
- full name,
- date of birth,
- gender context,
- life stage,
- Rashi,
- Nakshatra,
- Gotra,
- calendar profile,
- calendar scope,
- goals,
- notification preferences.

### Mandatory scenarios

1. Hindu user skips every optional field, completes onboarding, later fills fields from Settings/contextual prompts.
2. Sikh, Buddhist, and Jain users never see Hindu-only editors or suggestions.
3. User denies notifications, remains profile-complete, and can enable a reminder later from Settings.
4. User changes account on one device; drafts and prompt dismissals remain user-scoped.
5. Profile API rejects cross-user writes and invalid enum values.
6. Offline/load-error states do not erase existing values.
7. No profile prompt appears during cold start or blocks a practice.

### Final verification

- `npm ci` or the repository's lockfile-safe install verification.
- Native `npx tsc --noEmit`.
- Backend `npx tsc --noEmit`.
- All targeted native and backend tests.
- `git diff --check` in both repositories.
- Report before/after screenshots for Profile, Settings Personalisation, and one contextual prompt on iOS and Android.
- Report any unverified physical-device behavior explicitly.
- Do not make a final cleanup commit containing unrelated files.
