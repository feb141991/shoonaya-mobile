import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// components/home/SacredDaysCarousel.tsx imports react-native, so this is a
// structural check (same convention as the other *-verification.test.ts
// files), verified non-vacuous by diffing against `git show HEAD` before the
// auto-advance change.
const src = fs.readFileSync(
  path.join(process.cwd(), 'components/home/SacredDaysCarousel.tsx'),
  'utf8',
);

test('auto-advance is gated on reduced motion, screen focus, and having more than one item', () => {
  const effectStart = src.indexOf('Auto-advance like a slideshow');
  assert.ok(effectStart > -1, 'expected the auto-advance effect and its explanatory comment');
  const effectBody = src.slice(effectStart, src.indexOf('}, [autoAdvanceTick', effectStart) + 400);

  assert.match(effectBody, /if \(reducedMotion \|\| !isFocused \|\| items\.length <= 1\) return;/);
});

test('auto-advance does not fight an in-progress user drag', () => {
  assert.match(src, /const isDraggingRef = useRef\(false\);/);
  assert.match(src, /const handleScrollBeginDrag = useCallback\(\(\) => {\s*isDraggingRef\.current = true;/);
  assert.match(src, /if \(isDraggingRef\.current\) return;/, 'the scheduled auto-advance tick must bail out while the user is dragging');
  assert.match(
    src,
    /onScrollBeginDrag=\{handleScrollBeginDrag\}/,
    'handleScrollBeginDrag must actually be wired to the FlatList',
  );
});

test('every index change (auto, dot press, or manual swipe) restarts the auto-advance countdown', () => {
  const scrollToStart = src.indexOf('const scrollTo = useCallback(');
  const scrollToBody = src.slice(scrollToStart, src.indexOf('},', src.indexOf('[cardWidth, items.length, reducedMotion]', scrollToStart)));
  assert.match(scrollToBody, /setAutoAdvanceTick\(\(tick\) => tick \+ 1\)/, 'scrollTo (used by dot presses and auto-advance itself) must bump the tick');

  const momentumStart = src.indexOf('const handleMomentumEnd = useCallback(');
  const momentumBody = src.slice(momentumStart, src.indexOf('[cardWidth, items.length]', momentumStart));
  assert.match(momentumBody, /isDraggingRef\.current = false;/, 'drag end must clear the in-progress-drag guard');
  assert.match(momentumBody, /setAutoAdvanceTick\(\(tick\) => tick \+ 1\)/, 'a manual swipe must also restart the auto-advance countdown');
});

test('auto-advance loops back to the first card after the last one', () => {
  assert.match(src, /scrollTo\(\(activeIndexRef\.current \+ 1\) % items\.length\)/);
});

test('the carousel pauses auto-advance when the Home tab loses focus', () => {
  assert.match(src, /import \{ useFocusEffect \} from 'expo-router';/);
  assert.match(src, /const \[isFocused, setIsFocused\] = useState\(true\);/);
  assert.match(src, /useFocusEffect\(\s*useCallback\(\(\) => \{\s*setIsFocused\(true\);\s*return \(\) => setIsFocused\(false\);/);
});
