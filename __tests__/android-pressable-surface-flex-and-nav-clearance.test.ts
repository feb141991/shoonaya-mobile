import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Confirmed via real Android device screenshots: PressableSurface forced
// flex: 1 onto its inner content wrapper for any caller that didn't pass
// the exact literal `minHeight: 0`, stretching plain content-hugging
// buttons into large, mostly-empty colored blocks and pushing sibling
// content off-screen -- iOS didn't show it, Android did. See
// components/ui/PressableSurface.tsx and its own test
// (mandali-post-card-layout.test.ts) for the root fix.

test('PressableSurface never forces an unrequested flex on its inner content wrapper', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'components/ui/PressableSurface.tsx'), 'utf8');
  assert.match(src, /flex:\s*flattenedStyle\.flex,/);
  assert.doesNotMatch(src, /flattenedStyle\.minHeight\s*===\s*0\s*\?/);
});

test('"Ask Dharma Mitra" is a plain content-hugging button with no flex of its own', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/dharm-veer/[id].tsx'), 'utf8');
  const startIndex = src.indexOf('onPress={handleAskMore}');
  assert.ok(startIndex > -1, 'expected the Ask Dharma Mitra PressableSurface');
  const buttonBlock = src.slice(startIndex, src.indexOf('</PressableSurface>', startIndex));
  // Confirms the fixture this bug was found on: this button never declared
  // its own flex -- the bug was PressableSurface handing it an unrequested
  // flex: 1 anyway (the old default), which the fix above removes.
  assert.match(buttonBlock, /alignSelf:\s*'flex-end'/);
  assert.doesNotMatch(buttonBlock, /\n\s*flex:\s*\d/);
});

test('ReaderShell content is never hidden under floating UI: nav hidden on readers, padding clears the capsule', () => {
  // Phase 1 of docs/READER_EXPERIENCE_GRAND_PLAN.md: reading screens hide the
  // global floating nav (lib/readerRoutes.ts via app/_layout.tsx), and the
  // reader's own bottom padding clears its floating control capsule.
  const src = fs.readFileSync(path.join(process.cwd(), 'components/reader/ReaderShell.tsx'), 'utf8');
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
  assert.match(layout, /const isReaderScreen = isReaderRoute\(segments\);/);
  assert.match(layout, /!isReaderScreen &&/);
  assert.match(
    src,
    /const bottomPadding = \(bottomBar \? bottomBarHeight : insets\.bottom\) \+ \(hasCapsule \? capsuleHeight \+ CAPSULE_GAP \* 2 : 32\);/,
    'bottom padding must clear the measured capsule height (or the bottomBar when present)',
  );
  assert.match(src, /paddingBottom: bottomPadding/);
});
