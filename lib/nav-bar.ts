// CollapsibleBottomNav (components/ui/CollapsibleBottomNav.tsx) is mounted
// from app/_layout.tsx, a level above individual tab screens — so its own
// stacking order never compares against a screen's zIndex, no matter how
// high that zIndex is set. It floats at insets.bottom + 12 from the true
// bottom edge and is up to 78px tall when expanded. Anything that
// positions itself near the bottom of the screen (the floating AI icon,
// its chat sheet) needs to actively reserve this band, or it'll render
// invisibly behind the nav bar and lose its taps to it.
export const NAV_BAR_CLEARANCE = 78 + 12 + 16;

// Home's hero image height (app/(tabs)/index.tsx). Shared here (not kept
// as a second local literal in FloatingDharmaScroll.tsx) so the floating
// AI icon's default anchor — positioned relative to the hero — can't
// silently drift out of sync if the hero's height ever changes.
export const HERO_MIN_HEIGHT = 420;
