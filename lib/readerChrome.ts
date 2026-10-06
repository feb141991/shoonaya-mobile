// When the reader's controls (top bar + bottom capsule) are visible.
//
// Decision D1 (docs/READER_EXPERIENCE_GRAND_PLAN.md): controls show on open and
// hide after 3.5 s with no interaction; a tap on the page brings them back.
// They never hide while:
//   - pinned by the user (the ⛶ button),
//   - a screen reader is running (VoiceOver/TalkBack users must never lose
//     the back button or the controls),
//   - something holds them open (the "Aa" sheet, speech being prepared, the
//     first-time hint).
// Pure and timer-injected so it is fully unit-testable.

export const READER_CHROME_HIDE_AFTER_MS = 3500;

type Timers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export type ReaderChromeState = {
  visible: boolean;
  pinned: boolean;
  screenReader: boolean;
};

export function createReaderChromeController(options: {
  onChange: (state: ReaderChromeState) => void;
  timers?: Timers;
  hideAfterMs?: number;
}) {
  const timers: Timers = options.timers ?? {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
  const hideAfterMs = options.hideAfterMs ?? READER_CHROME_HIDE_AFTER_MS;
  let state: ReaderChromeState = { visible: true, pinned: false, screenReader: false };
  const holds = new Set<string>();
  let handle: unknown = null;
  let disposed = false;

  const lockedVisible = () => state.pinned || state.screenReader || holds.size > 0;

  const emit = (next: Partial<ReaderChromeState>) => {
    const merged = { ...state, ...next };
    if (merged.visible === state.visible && merged.pinned === state.pinned && merged.screenReader === state.screenReader) return;
    state = merged;
    options.onChange(state);
  };

  const cancel = () => {
    if (handle !== null) timers.clearTimeout(handle);
    handle = null;
  };

  const schedule = () => {
    cancel();
    if (disposed || lockedVisible()) return;
    handle = timers.setTimeout(() => {
      handle = null;
      if (!disposed && !lockedVisible()) emit({ visible: false });
    }, hideAfterMs);
  };

  return {
    getState: () => state,

    /** Show the controls and restart the countdown. */
    show() {
      emit({ visible: true });
      schedule();
    },

    /** Hide now, unless something keeps them open. */
    hide() {
      cancel();
      if (lockedVisible()) return;
      emit({ visible: false });
    },

    /** Any touch on a control: keep visible and restart the countdown. */
    interact() {
      emit({ visible: true });
      schedule();
    },

    /**
     * A tap on the page. `handledByContent` is true when the tap landed on
     * something interactive in the content (a verse, a link) — that tap still
     * does its own job and only ever shows the controls, never hides them.
     */
    pageTap(handledByContent: boolean) {
      if (!state.visible || handledByContent) {
        emit({ visible: true });
        schedule();
        return;
      }
      cancel();
      if (!lockedVisible()) emit({ visible: false });
    },

    /** Keep visible while `key` is held (sheet open, speech loading, hint). */
    hold(key: string) {
      holds.add(key);
      cancel();
      emit({ visible: true });
    },

    release(key: string) {
      if (!holds.delete(key)) return;
      schedule();
    },

    setPinned(pinned: boolean) {
      emit({ pinned, visible: true });
      if (pinned) cancel(); else schedule();
    },

    setScreenReader(enabled: boolean) {
      emit({ screenReader: enabled, visible: true });
      if (enabled) cancel(); else schedule();
    },

    /** Start the first countdown (controls are visible on open). */
    start() {
      emit({ visible: true });
      schedule();
    },

    dispose() {
      disposed = true;
      cancel();
    },
  };
}

export type ReaderChromeController = ReturnType<typeof createReaderChromeController>;

/**
 * Classifies a finished touch on the page as a tap (vs. a scroll or a long
 * press) so scrolling never toggles the controls.
 */
export function isPageTap(start: { x: number; y: number; t: number }, end: { x: number; y: number; t: number }) {
  return Math.hypot(end.x - start.x, end.y - start.y) < 10 && end.t - start.t < 350;
}
