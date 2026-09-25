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

test('ReaderShell reserves NAV_BAR_CLEARANCE for the globally-floating nav when no bottomBar is rendered', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'components/reader/ReaderShell.tsx'), 'utf8');
  assert.match(src, /import \{ NAV_BAR_CLEARANCE \} from '@\/lib\/nav-bar';/);
  assert.match(
    src,
    /paddingBottom:\s*insets\.bottom\s*\+\s*\(bottomBar\s*\?\s*120\s*:\s*NAV_BAR_CLEARANCE\)/,
    'the no-bottomBar branch must use the real reserved clearance, not an undersized literal',
  );
});
