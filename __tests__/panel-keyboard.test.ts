import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NAV_BAR_CLEARANCE } from '../lib/nav-bar';
import {
  PANEL_MARGIN,
  getKeyboardOverlap,
  getPanelBottomOffset,
  getVisibleKeyboardHeight,
} from '../lib/panelKeyboard';

// ScrollUnrollPanel stops above the bottom of the screen, so the keyboard
// only pushes on the chat composer by the part of it that reaches past that
// clearance. These are the real numbers, not a restatement of the formula.
describe('panel bottom offset', () => {
  it('is the safe-area inset plus the panel margin plus the nav-bar clearance', () => {
    assert.equal(PANEL_MARGIN, 16);
    assert.equal(NAV_BAR_CLEARANCE, 106);
    assert.equal(getPanelBottomOffset(34), 156); // iPhone with a home indicator
    assert.equal(getPanelBottomOffset(0), 122); // iPhone SE / no bottom inset
  });
});

describe('keyboard overlap', () => {
  it('home-indicator iPhone: a 336pt keyboard reaches 180pt into the panel', () => {
    assert.equal(getKeyboardOverlap(336, 34), 180);
  });

  it('iPhone SE: a 260pt keyboard reaches 138pt into the panel', () => {
    assert.equal(getKeyboardOverlap(260, 0), 138);
  });

  it('is zero when the keyboard is closed', () => {
    assert.equal(getKeyboardOverlap(0, 34), 0);
  });

  it('is zero for a keyboard too short to reach the panel, never negative', () => {
    assert.equal(getKeyboardOverlap(50, 34), 0);
    assert.equal(getKeyboardOverlap(156, 34), 0);
    assert.equal(getKeyboardOverlap(157, 34), 1);
  });

  it('leaves the composer exactly its 10pt base padding above the keyboard', () => {
    // Composer bottom sits (offset + 10 + overlap) above the screen bottom;
    // the keyboard top sits `keyboardHeight` above it.
    for (const [keyboardHeight, inset] of [[336, 34], [260, 0], [301, 24]] as const) {
      const composerBottom = getPanelBottomOffset(inset) + 10 + getKeyboardOverlap(keyboardHeight, inset);
      assert.equal(composerBottom - keyboardHeight, 10);
    }
  });
});

describe('visible keyboard height from an iOS frame', () => {
  const windowHeight = 844;

  it('uses the frame height while the keyboard is on screen', () => {
    assert.equal(getVisibleKeyboardHeight(windowHeight, { screenY: 508, height: 336 }), 336);
  });

  it('follows a height change while the keyboard stays open', () => {
    assert.equal(getVisibleKeyboardHeight(windowHeight, { screenY: 478, height: 366 }), 366);
  });

  it('treats a frame parked at the window bottom as hidden, whatever its height', () => {
    assert.equal(getVisibleKeyboardHeight(windowHeight, { screenY: 844, height: 336 }), 0);
    assert.equal(getVisibleKeyboardHeight(windowHeight, { screenY: 900, height: 336 }), 0);
  });

  it('treats a missing frame as hidden', () => {
    assert.equal(getVisibleKeyboardHeight(windowHeight, undefined), 0);
  });
});
