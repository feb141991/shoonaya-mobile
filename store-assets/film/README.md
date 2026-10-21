# Shoonaya film (brand + diaspora)

A 45-second and a 30-second vertical film (1080 x 1920, 30 fps) built from the app's own art, fonts and sounds.
It is a **brand film** for the website, social, Play listing and ads. It is **not an App Store App Preview**: Apple
requires an App Preview to be captured from the app itself (see "App Preview" below).

## What is in it

| Beat | On screen | Source of the statement |
|---|---|---|
| Hook | "When you live far from home, which day is the festival?" | A human observation, not a product claim |
| Panchang | "Panchang & festival days that follow the city you set." | `city_aware_panchang` (backend `src/lib/marketing/diaspora/claims.ts`) |
| Four paths | "Four paths. Each its own." Hindu, Sikh, Buddhist, Jain with native script | `four_traditions` |
| Japa | "A mala counter & a daily shloka." | `japa_and_shloka` |
| Pathshala | "Learning paths & lessons." | `pathshala` |
| Tirtha | "Temples & gurdwaras in many cities." | `temples_directory` (coverage is still growing; no number is stated) |
| Choice | "Reminders you choose. Off until you turn them on." and "English, Hindi, Punjabi" | `festival_reminders`, `languages` |
| Diaspora line | "Wherever you live, your tradition comes with you." | Positioning line, needs brand sign-off |
| End card | Emblem, "Shoonaya", "Find your infinite." | The approved tagline (brand positioning decision) |

Deliberately **not** said: Kul, Mandali, "ad-free" or "tracks nothing" (all `needs_confirmation` in the claims
registry), any statistic or count, any date or time, any scripture, Android or Google Play availability, an App Store
badge. Re-check `claims.ts` before using the film after the product changes.

## Files

- `film.html`: the whole film as a function of time, `renderFrame(t)`. Storyboard, timings and copy are at the top of
  the script; offsets are fractions of each scene, so both cuts share one storyboard (`?cut=45` or `?cut=30`).
- `render.cjs`: renders every frame with headless Chrome and encodes the picture. Also writes `timeline-<cut>.json`.
- `build-audio.py`: builds the sound from that timeline and puts it on the picture.

```bash
# one-off: puppeteer-core is not an app dependency; install it anywhere and point NODE_PATH at it
npm i puppeteer-core --prefix /tmp/film-tools
NODE_PATH=/tmp/film-tools/node_modules node render.cjs --cut 45 --out silent-45.mp4      # about 2.5 minutes
python3 build-audio.py --cut 45 --video silent-45.mp4 --out shoonaya-film-45s.mp4
node render.cjs --cut 45 --stills 2.5,10,22,44 --out-dir ./stills                         # quick look at single frames
```

Rendered videos are not committed (large, reproducible).

## Provenance

- Art: `assets/startup-scenes`, `assets/icons`, `assets/brand` (the app's own). Record their provenance before external
  use; the repo does not state it for these files.
- Type: Cormorant Garamond, Inter and Mukta from `@expo-google-fonts` (OFL), as in the app. Punjabi uses the system
  Gurmukhi font because the app has no Gurmukhi font file.
- Sound: the app's tanpura loop (`assets/audio/tanpura/tanpura-d.mp3`, recording provenance not recorded; confirm
  before public use) and a singing-bowl tone synthesised in `build-audio.py` (no sample, no third-party rights).
- No voice-over and no licensed music.

## App Preview (what Apple requires)

An App Preview must show the app in use, captured from the app, 15 to 30 seconds, at Apple's current per-device sizes;
check the current specification in App Store Connect before building it. `store-assets/README.md` already requires iPhone
captures from the final iOS or TestFlight build and forbids reusing the Android ones. The 30-second cut here is the same
language (type, gold, transitions) ready to bracket real footage, not a substitute for it.
