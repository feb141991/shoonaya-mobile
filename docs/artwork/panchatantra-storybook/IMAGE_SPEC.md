# Panchatantra storybook images — generation prompt and size spec

Use this for every new storybook (6 scenes per story) and every re-render.
Last updated 2026-10-07, when the 93 existing tier-2 images were re-encoded
from JPEG (95.4 MB) to WebP (18.1 MB) with no visible difference.

## 1. Source of truth for what each scene shows

- Scene *n* illustrates paragraph *n* of the story's `body` array in
  `assets/data/panchatantra-expanded-snapshot.json` (6 paragraphs → 6 scenes).
- Draw only what the paragraph says. Do not add or change characters, objects
  or events from memory of other tellings or from a planning summary. Example:
  in `panchatantra-jackal-and-drum` the drum is struck by a **branch**, not
  "vines".
- No text, letters, captions, speech bubbles, watermarks or logos in the image.
- Religious and cultural details (dress, temples, ritual objects) must fit the
  story's setting; if the paragraph does not describe one, keep it plain rather
  than inventing ritual detail.

## 2. Style (current standard for new stories)

Handcrafted 3D claymation diorama: visible clay/plasticine texture on
characters, miniature-set feel, warm cinematic lighting, gentle depth of field,
rural or forest India setting, friendly expressive animals, child-safe.

Note: some earlier storybooks (e.g. Monkey and Crocodile, Talkative Tortoise)
use a flat Indian folk-art illustration style. New stories use claymation; keep
a story's six scenes in one style.

## 3. Prompt template

```
3D claymation diorama, handcrafted plasticine figures on a miniature set,
warm soft cinematic lighting, gentle depth of field.
Scene: <one or two sentences restating ONLY what paragraph n describes:
who is present, where they are, what is happening, the emotion>.
Characters: <consistent descriptions reused across all 6 scenes of the story,
e.g. "Gomukha, a lean golden jackal with a white-tipped tail">.
Composition: landscape 16:9, one clear focal subject, simple uncluttered
background with soft smooth gradients, large calm areas of sky/ground/water.
Avoid: film grain, noise, dust specks, glitter, tiny repeated patterns
covering the whole frame, text, letters, captions, watermarks, borders.
Output: 1376x768.
```

The size-related lines (simple background, smooth gradients, no grain/noise,
no whole-frame micro-patterns) are what make an image compress well: noise and
dense fine texture are what push files over budget. They lower the odds of a
heavy image; they do not guarantee a file size. The conversion step below is
what enforces the size.

## 4. Size budget and conversion (required)

| Rule | Value |
|---|---|
| Format bundled in the app | WebP only (`.webp`) |
| Dimensions | ≤ 1376 px wide, landscape (≈16:9). Never upscale. |
| Encoding | WebP quality 80, method 6 |
| Budget | ≤ 600 KB per image (typical result 150–450 KB) |

Run every generated file through the converter before wiring:

```
python3 scripts/optimize-panchatantra-art.py ~/Downloads/jackal-drum-1.png ...
```

It writes `assets/panchatantra/<name>.webp`, prints before/after size and a
PSNR score (expect ≥ 32 dB), and rejects any image over budget. If an image is
rejected, regenerate it with a calmer background rather than lowering quality.
`__tests__/panchatantra-asset-budget.test.ts` fails if any image referenced by
`lib/panchatantraArtwork.ts` is not WebP or is over 600 KB.

## 5. Naming and wiring

1. Files: `assets/panchatantra/<short-name>-1.webp` … `-6.webp`
   (e.g. `jackal-drum-1.webp`). Scene 1 doubles as the story's cover unless a
   separate `<short-name>.webp` cover is supplied.
2. `lib/panchatantraArtwork.ts`: add the cover to `LOCAL_PANCHATANTRA_ARTWORK`
   and the six scenes, in order, to `LOCAL_PANCHATANTRA_SCENE_ARTWORK` under the
   story id from the snapshot (e.g. `panchatantra-jackal-and-drum`).
3. `__tests__/panchatantra-storybook.test.ts`: add the story to the tier-2
   assertions.
4. Look at all six images against their paragraphs before committing.
5. One commit per story; push in batches, not after every story.
