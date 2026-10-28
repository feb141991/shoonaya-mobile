# Post-onboarding Sanctuary Preparation

Shown once after a confirmed onboarding profile write, not on ordinary app
launch/resume. Uses an ephemeral, identity-leased handoff instead of putting a
name, religious preference or user ID in navigation parameters or new storage.
The destination chosen on the welcome screen is preserved.

## Presentation

- Full-bleed bundled tradition artwork, overridden by the existing chosen Hero
  artwork when available. Failed chosen-image loading falls back to bundled art.
- Home's shared `resolveHomeGreeting`: saved override first, then the existing
  short time-of-day greeting or tradition rotation (not the startup scene's
  ceremonial titles). First name, English/Hindi setup copy, and Mukta for Hindi.
- Existing motion primitives respect reduced motion. No decorative animation
  loop, fake percentage, staged delay, scripture quotation or new dependency.
- Scrollable at small/landscape/large-text sizes, safe-area-aware footer, and no
  floating bottom navigation. Enter is available immediately; Android Back
  performs the same safe forward action after the already-confirmed save.
- The existing `ahimsa-hand.png` is a generic peace-sign image, not an Ahimsa
  hand. It is deliberately not used. Jain's scene retains the hand in its
  existing sanctuary artwork and uses the word अहिंसा in the foreground.

## Preparation And Failure Rules

One logical `/api/native/home-summary` read uses the existing authenticated API
transport and its existing retry/single-flight policy. The entire preparation,
including auth preparation and cache writing, has an 8-second deadline. There
is no new calendar endpoint, date calculation or Panchang retry controller.

A usable response seeds the existing sanitized, account-scoped Home cache with
the server's date/timezone. Pending/incomplete calendar data is never marked
fresh. The normal Home coordinator owns subsequent calendar recovery.

Enter, Back, unmount and background cancel preparation. Timeout, transport,
schema/JSON or profile-degraded response failures do not undo the saved profile
or trap the seeker: navigation proceeds and Home retains its ordinary recovery
behavior. Never cache a response after cancellation or identity-lease expiry.
Cached state does not authorize a mutation. An account switch redirects through
normal auth routing; a deep link/restart without a handoff uses normal Home.

## Verification

- `npx tsx --test __tests__/sanctuary-preparation.test.ts`
- `npm test`, `npm run typecheck`, `npm run check:assets`
- Component-level React Native Web previews: four traditions, neutral landscape,
  narrow Hindi/large-text scrolling, Continue interaction and reduced motion.
  These previews do not constitute an installed iOS/Android end-to-end test.
- Physical-device onboarding save, navigation and network/cache traces remain
  release smoke-test requirements. No production write was used to test this.
