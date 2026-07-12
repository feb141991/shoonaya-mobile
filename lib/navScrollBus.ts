// Lightweight cross-screen signal for the bottom tab bar's scroll-driven
// collapse behavior (see components/ui/CollapsibleBottomNav.tsx), mirroring
// PWA's BottomNav.tsx (src/components/layout/BottomNav.tsx) which reads
// window.scrollY directly. Native has no single global scroll container —
// each tab screen owns its own ScrollView — and this app has no
// zustand/jotai/context-based global store, so a module-level pub-sub is the
// simplest way to let whichever tab screen is focused report its scroll
// offset to the one nav bar instance without prop-drilling through the
// Expo Router tree or standing up a new state-management dependency for a
// single value.
type Listener = (y: number) => void;

const listeners = new Set<Listener>();

export function reportNavScroll(y: number) {
  listeners.forEach((listener) => listener(y));
}

export function subscribeNavScroll(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Ready to spread directly onto a ScrollView: `onScroll={navScrollHandler}`.
export function navScrollHandler(event: {
  nativeEvent: { contentOffset: { y: number } };
}) {
  reportNavScroll(event.nativeEvent.contentOffset.y);
}
