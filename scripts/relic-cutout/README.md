# Relic cut-out tooling

Turns generator art that arrives with a baked-in checkerboard "transparency"
preview (an opaque JPEG, often misnamed `.png`) into a real transparent PNG.
Used on 2026-10-08 to replace the eight `assets/relics` files that broke
Android build 46 (see AGENTS.md section 11). macOS only (Apple Vision).

Best source is the original generator export with a real alpha channel; use this
only when that is not available.

```bash
cd scripts/relic-cutout && mkdir -p src out final
cp /path/to/lamp.jpg src/lamp.jpg
swiftc -O cutout.swift -o cutout                 # Apple Vision foreground mask
./cutout src/lamp.jpg out/lamp.vision.png
python3 -m venv venv && ./venv/bin/pip install numpy opencv-python-headless pillow
./venv/bin/python finalize.py                    # edit the `spec` dict at the bottom for your names
```

`finalize.py` tidies the mask (drops specks, 2px choke to remove the blended grey
rim, soft edge), strips dark checker squares on glow-heavy art
(`strip_dark_neutral`), crops to the object, fits it to 88% of a 256px canvas (the
median of the existing relics) and downscales with premultiplied alpha. Do not
commit `src/`, `out/`, `final/` or `venv/`.

Acceptance bar before committing a cut-out:
1. Look at it composited over bright magenta, a dark colour and a cream colour,
   at full size and at ~38 px. No checker squares, no pale rim.
2. `npm run check:assets` passes (real PNG with true alpha).
3. The Android resource compiler accepts it:
   `$ANDROID_HOME/build-tools/<ver>/aapt2 compile --dir <res dir> -o out.zip`.

Known limit: glow around an object is part of the picture, so it cannot be told
apart from the subject. The tool keeps the object and drops most of the glow; a
faint tint can remain inside enclosed gaps (for example the khanda arms), which
is invisible at emblem sizes. Pure-glow art (`halo.png`) is only approximately
recoverable.
