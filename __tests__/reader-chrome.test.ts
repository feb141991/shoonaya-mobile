import assert from 'node:assert/strict';
import test from 'node:test';
import { createReaderChromeController, isPageTap, READER_CHROME_HIDE_AFTER_MS } from '../lib/readerChrome';

function harness() {
  let now = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let id = 0;
  const changes: boolean[] = [];
  const chrome = createReaderChromeController({
    onChange: (s) => changes.push(s.visible),
    timers: {
      setTimeout: (fn, ms) => { timers.set(++id, { at: now + ms, fn }); return id; },
      clearTimeout: (h) => { timers.delete(h as number); },
    },
  });
  const advance = (ms: number) => {
    const target = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at; timers.delete(due[0]); due[1].fn();
    }
    now = target;
  };
  return { chrome, advance, changes, pending: () => timers.size };
}

test('hide delay is exactly 3.5 s', () => {
  assert.equal(READER_CHROME_HIDE_AFTER_MS, 3500);
});

test('visible on open, hides at 3.5 s and not before', () => {
  const h = harness(); h.chrome.start();
  h.advance(3499); assert.equal(h.chrome.getState().visible, true);
  h.advance(1); assert.equal(h.chrome.getState().visible, false);
});

test('a control interaction restarts the countdown', () => {
  const h = harness(); h.chrome.start();
  h.advance(3000); h.chrome.interact();
  h.advance(3000); assert.equal(h.chrome.getState().visible, true);
  h.advance(500); assert.equal(h.chrome.getState().visible, false);
});

test('page tap: shows when hidden, hides when visible, content taps only ever show', () => {
  const h = harness(); h.chrome.start(); h.advance(3500);
  h.chrome.pageTap(false); assert.equal(h.chrome.getState().visible, true);
  h.chrome.pageTap(false); assert.equal(h.chrome.getState().visible, false);
  h.chrome.pageTap(true); assert.equal(h.chrome.getState().visible, true);
  h.chrome.pageTap(true); assert.equal(h.chrome.getState().visible, true, 'a verse tap must not hide the controls');
});

test('never hides while pinned, with a screen reader, or while held', () => {
  for (const lock of ['pin', 'reader', 'hold'] as const) {
    const h = harness(); h.chrome.start();
    if (lock === 'pin') h.chrome.setPinned(true);
    if (lock === 'reader') h.chrome.setScreenReader(true);
    if (lock === 'hold') h.chrome.hold('sheet');
    h.advance(60_000); assert.equal(h.chrome.getState().visible, true, lock);
    h.chrome.pageTap(false); assert.equal(h.chrome.getState().visible, true, `${lock}: page tap must not hide`);
    h.chrome.hide(); assert.equal(h.chrome.getState().visible, true, `${lock}: hide() must not hide`);
    assert.equal(h.pending(), 0, `${lock}: no countdown while locked`);
  }
});

test('releasing the last hold restarts the countdown; other holds keep it open', () => {
  const h = harness(); h.chrome.start();
  h.chrome.hold('sheet'); h.chrome.hold('tts');
  h.chrome.release('sheet'); h.advance(10_000); assert.equal(h.chrome.getState().visible, true);
  h.chrome.release('tts'); h.advance(3500); assert.equal(h.chrome.getState().visible, false);
  h.chrome.release('unknown'); assert.equal(h.pending(), 0);
});

test('unpinning and screen reader off resume auto-hide', () => {
  const h = harness(); h.chrome.start();
  h.chrome.setPinned(true); h.chrome.setPinned(false);
  h.advance(3500); assert.equal(h.chrome.getState().visible, false);
  h.chrome.setScreenReader(true); assert.equal(h.chrome.getState().visible, true);
  h.chrome.setScreenReader(false); h.advance(3500); assert.equal(h.chrome.getState().visible, false);
});

test('dispose cancels the countdown', () => {
  const h = harness(); h.chrome.start(); h.chrome.dispose();
  h.advance(10_000); assert.equal(h.chrome.getState().visible, true); assert.equal(h.pending(), 0);
});

test('onChange fires only on real changes', () => {
  const h = harness(); h.chrome.start(); h.chrome.show(); h.chrome.interact();
  assert.deepEqual(h.changes, []);
  h.advance(3500); assert.deepEqual(h.changes, [false]);
});

test('isPageTap: short, still touches are taps; moves and long presses are not', () => {
  assert.equal(isPageTap({ x: 10, y: 10, t: 0 }, { x: 14, y: 13, t: 200 }), true);
  assert.equal(isPageTap({ x: 10, y: 10, t: 0 }, { x: 10, y: 40, t: 120 }), false);
  assert.equal(isPageTap({ x: 10, y: 10, t: 0 }, { x: 10, y: 10, t: 600 }), false);
});
