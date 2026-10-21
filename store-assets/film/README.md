# Shoonaya film (brand + diaspora)

Three vertical cuts (1080 x 1920, 30 fps) built from the app's own art, fonts and sounds: **60 s** and **45 s** (every
feature) and **30 s** (highlights). It is a **brand film** for the website, social, Play listing and ads. It is **not an
App Store App Preview**: Apple requires an App Preview to be captured from the app itself (see "App Preview" below).

## What is in it

| Beat | On screen | Source of the statement |
|---|---|---|
| Hook | "When you live far from home, which day is the festival?" | A human observation, not a product claim |
| Panchang | "Panchang & festival days that follow the city you set." | `city_aware_panchang` (backend `src/lib/marketing/diaspora/claims.ts`) |
| Four paths | "Four paths. Each its own." Hindu, Sikh, Buddhist, Jain with native script | `four_traditions` |
| Kundali | "Birth charts for you & your family." | The app: "Generate and explore birth charts"; charts can be cast for a relation |
| Rashiphala | "A daily reading for your rashi." | The app's Rashiphala screen. Spelled as the app spells it |
| Japa | "A mala counter & a daily shloka." | `japa_and_shloka` |
| Pathshala | "Learning paths & lessons." | `pathshala` |
| Panchatantra | "Illustrated storybooks." with three plates from one fable | The app: Panchatantra fables with dedicated six-scene storybook art ("Read Storybook", `PanchatantraStorybookView`) |
| Live Darshan | "Darshan, live from sacred sites." | The app: "live streams from sacred sanctums" |
| Tirtha | "Temples & gurdwaras in many cities." | `temples_directory` (coverage is still growing; no number is stated) |
| Mandali | "A community for your city." | The app's Mandali tab; the line stays descriptive |
| Kul | "A space for your family." | The app's Kul screen ("Your family", "Family dates") |
| And more | Bhakti, Nitya, Seva, Dharm Veer, Quiz, Dharma Mitra, named only | Each exists in the app; nothing is claimed about them |
| Choice | "Reminders you choose. Off until you turn them on." and "English, Hindi, Punjabi" | `festival_reminders`, `languages` |
| Diaspora line | "Wherever you live, your tradition comes with you." | Positioning line, needs brand sign-off |
| End card | Emblem, "Shoonaya", "Find your infinite." | The approved tagline (brand positioning decision) |

### Things to know before using it

- **Kul and Mandali are `needs_confirmation` in the claims registry.** They were included at the founder's request on
  2026-10-21. On that date production held 23 Mandalis and 3 Kuls (3 members in total). The lines describe the feature
  and say nothing about activity or size; keep it that way, and re-check before the film goes out.
- **Live Darshan**: 101 streams are listed, 6 were active and healthy on 2026-10-21, all Jain or Sikh. The line does not
  imply coverage of every tradition. A Hindu or Buddhist viewer may find no active stream today.
- **Kundali and Rashiphala** are described, never promised: no accuracy or prediction claim. The Rashiphala content was
  still awaiting a Jyotish-literate review when this was made.
- Deliberately **not** said: "ad-free" or "tracks nothing", any statistic or count, any date or time, any scripture,
  Android or Google Play availability, an App Store badge.

## Files

- `film.html`: the whole film as a function of time, `renderFrame(t)`. Storyboard, timings and copy are at the top of
  the script; offsets are fractions of each scene, so all three cuts share one storyboard (`?cut=30`, `45` or `60`; a
  scene with no duration for a cut is left out of it).
- `render.cjs`: renders every frame with headless Chrome and encodes the picture. Also writes `timeline-<cut>.json`.
- `build-audio.py`: builds the sound from that timeline and puts it on the picture.

```bash
# one-off: puppeteer-core is not an app dependency; install it anywhere and point NODE_PATH at it
npm i puppeteer-core --prefix /tmp/film-tools
NODE_PATH=/tmp/film-tools/node_modules node render.cjs --cut 60 --out silent-60.mp4      # about 3.5 minutes
python3 build-audio.py --cut 60 --video silent-60.mp4 --out master-60.mp4
node render.cjs --cut 60 --stills 3,20,33,46 --out-dir ./stills                           # quick look at single frames
```

Rendered videos are not committed (large, reproducible).

After every render run `./check-frames.sh shoonaya-film-60s.mp4`. It samples 36 frames and reports any that are dark.
It exists because an early render lost its backgrounds in the later scenes (Chrome dropped tiles when a dozen full-size
layers were live at once, so `film.html` now keeps only the layers on screen) and nothing but a look at the frames
would have shown it.

## Provenance

- Art: `assets/startup-scenes`, `assets/icons`, `assets/relics/diya-bronze.png` (the three lamps for Kul, which has no
  icon of its own), `assets/brand`: the app's own. Record their provenance before external use; the repo does not
  state it for these files.
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
