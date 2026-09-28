import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const chatSheet = readFileSync(new URL('../components/home/DharmaMitraChatSheet.tsx', import.meta.url), 'utf8');

// The composer became hidden behind the on-screen keyboard on both iOS and
// Android, not just with a suggestion-bar-adding keyboard. Root cause: the
// whole sheet is a position:absolute overlay (ScrollUnrollPanel) with an
// animated, fixed `height` computed before the keyboard ever opens --
// KeyboardAvoidingView has no properly laid-out screen to measure against in
// that structure, on either platform, so its padding/behavior never actually
// reached the composer. Fixed by tracking the real keyboard height directly
// and folding it into the composer's own bottom padding instead.
describe('Dharma Mitra chat sheet composer stays above the keyboard', () => {
  it('does not use KeyboardAvoidingView, which cannot work inside this absolutely-positioned overlay', () => {
    // A comment may still explain why it was removed -- only the import and
    // JSX usage are actually banned.
    assert.doesNotMatch(chatSheet, /<KeyboardAvoidingView/);
    assert.doesNotMatch(chatSheet, /^\s*KeyboardAvoidingView,\s*$/m);
  });

  it('tracks real keyboard show/hide events into a height value', () => {
    assert.match(chatSheet, /const \[keyboardHeight, setKeyboardHeight\] = useState\(0\);/);
    assert.match(chatSheet, /Keyboard\.addListener\('keyboardDidShow', \(event\) => setKeyboardHeight\(event\.endCoordinates\?\.height \?\? 0\)\)/);
    assert.match(chatSheet, /Keyboard\.addListener\('keyboardDidHide', \(\) => setKeyboardHeight\(0\)\)/);
  });

  it('removes both keyboard listeners on unmount', () => {
    const effect = chatSheet.match(/useEffect\(\(\) => \{\s*const show = Keyboard\.addListener[\s\S]*?\}, \[\]\);/)?.[0];
    assert.ok(effect, 'keyboard-tracking effect should exist');
    assert.match(effect!, /show\.remove\(\);/);
    assert.match(effect!, /hide\.remove\(\);/);
  });

  it("folds keyboardHeight into the composer area's own bottom padding", () => {
    assert.match(chatSheet, /paddingBottom: 10 \+ keyboardHeight/);
  });
});
