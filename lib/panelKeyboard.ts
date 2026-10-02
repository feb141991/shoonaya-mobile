import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';

/** Gap ScrollUnrollPanel keeps from the screen edges. */
export const PANEL_MARGIN = 16;

/**
 * Distance from the screen's bottom edge up to ScrollUnrollPanel's bottom edge.
 * The panel is always full height, so this is the same for either unroll
 * direction. ScrollUnrollPanel lays itself out from this, and the chat sheet
 * measures keyboard overlap against it, so the two cannot drift apart.
 */
export function getPanelBottomOffset(insetsBottom: number): number {
  return insetsBottom + PANEL_MARGIN + NAV_BAR_CLEARANCE;
}

/**
 * How far a keyboard of the given height reaches into the panel. The panel
 * already stops above the bottom clearance, so only the part of the keyboard
 * beyond it pushes on the content; a short keyboard that never reaches the
 * panel contributes nothing.
 */
export function getKeyboardOverlap(keyboardHeight: number, insetsBottom: number): number {
  return Math.max(0, keyboardHeight - getPanelBottomOffset(insetsBottom));
}

/**
 * Visible keyboard height from an iOS `keyboardWillChangeFrame` frame. When the
 * keyboard is dismissed its frame moves to the bottom of the window, so a frame
 * whose top is at or below the window bottom is hidden, whatever its height.
 */
export function getVisibleKeyboardHeight(
  windowHeight: number,
  frame: { screenY: number; height: number } | undefined,
): number {
  if (!frame) return 0;
  return frame.screenY >= windowHeight ? 0 : Math.max(0, frame.height);
}
