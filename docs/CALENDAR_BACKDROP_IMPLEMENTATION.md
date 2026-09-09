# Calendar and backdrop implementation

## Backdrop

Implemented locally in Native:

- `lib/heroContentLayout.ts`: device-local Auto / Left / Right / Below preference and a responsive layout resolver. Auto uses the reviewed right-side empty space for Krishna by the Yamuna on sufficiently wide displays. Unknown artwork defaults below. Narrow columns and larger accessibility text always use Below.
- `components/home/HeroBackdropPicker.tsx`: persistent layout controls, flexible title, 44-point close target and one scrollable body for short screens. Existing artwork and size selection remain available. Settings uses the same picker; Home reloads the preference on focus.
- `app/(tabs)/index.tsx`: greeting and pills move together into one themed panel; the panel renders below the artwork on phones or in the chosen side column when it fits. The top scrim only covers the action row when details are below. Existing navigation destinations and canonical observance inputs are unchanged.
- `__tests__/hero-content-layout.test.ts`: phone/wide/unknown-artwork/manual-override/large-text behavior.

No backend artwork contract or database migration is needed for this local presentation preference. No image was mirrored or edited. The preference applies to Home across artwork selections on this device.

## Verification

- Native TypeScript check passed during implementation.
- Backdrop, hero size and mood pill suites: 25 passed, 0 failed, 0 skipped.
- iOS JavaScript export succeeded at `/tmp/shoonaya-calendar-backdrop-export`; this is a bundle export, not a new installed native build.
- UI review found and resolved picker height, close-target and long-label problems. Source image reviewed to confirm Krishna is on the left.
- Device visual verification remains blocked: the booted iPhone 17 Pro Max simulator was displaying an `undefined is not a function` error at `SacredIcon.tsx:2` importing `expo-image` before this test could run. No claim of a successful simulator launch or native runtime compatibility.
- Native graph refresh could not run: the AGENTS.md-required `scripts/graphify-update-source.sh` is missing. Direct full-repository graph refresh is prohibited by that file.

## Scope hygiene

Other work was already dirty or changed concurrently, including onboarding, Home tips, profile, settings, tokens and sourcing scripts. It has been preserved. No files staged or committed by this task during implementation. No push, deployment or production migration performed.

Calendar implementation and rollout evidence will be recorded alongside its backend migration.
