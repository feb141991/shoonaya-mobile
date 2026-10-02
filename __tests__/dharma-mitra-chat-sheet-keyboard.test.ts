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

  it('tracks real keyboard events into a height value, using frame events on iOS', () => {
    assert.match(chatSheet, /const \[keyboardHeight, setKeyboardHeight\] = useState\(0\);/);
    assert.match(chatSheet, /Keyboard\.addListener\('keyboardWillChangeFrame'/);
    assert.match(chatSheet, /getVisibleKeyboardHeight\(Dimensions\.get\('window'\)\.height, event\.endCoordinates\)/);
    assert.match(chatSheet, /Keyboard\.addListener\('keyboardDidShow', \(event\) => setKeyboardHeight\(event\.endCoordinates\?\.height \?\? 0\)\)/);
    assert.match(chatSheet, /Keyboard\.addListener\(Platform\.OS === 'ios' \? 'keyboardWillHide' : 'keyboardDidHide', \(\) => setKeyboardHeight\(0\)\)/);
  });

  it('removes both keyboard listeners on unmount', () => {
    const effect = chatSheet.match(/useEffect\(\(\) => \{\s*const show = Platform\.OS[\s\S]*?\}, \[\]\);/)?.[0];
    assert.ok(effect, 'keyboard-tracking effect should exist');
    assert.match(effect!, /show\.remove\(\);/);
    assert.match(effect!, /hide\.remove\(\);/);
  });

  it("pads the composer area by the shared keyboard overlap, not a locally re-derived formula", () => {
    assert.match(chatSheet, /const keyboardOverlap = getKeyboardOverlap\(keyboardHeight, insets\.bottom\);/);
    assert.match(chatSheet, /paddingBottom: 10 \+ keyboardOverlap/);
    assert.doesNotMatch(chatSheet, /NAV_BAR_CLEARANCE/);
    assert.doesNotMatch(chatSheet, /paddingBottom: 10 \+ keyboardHeight/);
  });

  it('lays the panel out from the same helper the sheet measures against', () => {
    const panel = readFileSync(new URL('../components/home/ScrollUnrollPanel.tsx', import.meta.url), 'utf8');
    assert.match(panel, /getPanelBottomOffset\(insets\.bottom\)/);
    assert.doesNotMatch(panel, /const PANEL_MARGIN = /);
  });
});
