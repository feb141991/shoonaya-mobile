/**
 * One-time-resolving gate apiFetch awaits before issuing any request.
 *
 * Closes a real cold-start race: app/_layout.tsx's `authReady` state only
 * gates a visual startup overlay (the opaque fallback + splash), not the
 * underlying <Slot/> mount -- every screen mounts and can fire its own
 * apiFetch calls immediately, before Supabase's session restore (and
 * lib/api.ts's own cachedAccessToken) has resolved, producing spurious
 * 401s on cold start. Plain module state, not a hook or store: apiFetch is
 * a function, not a component, and can't call React hooks -- and every
 * native API call already goes through apiFetch, so gating there covers
 * every screen without touching any of them individually.
 *
 * "Ready" means _layout.tsx has finished determining whether a session
 * exists or not, not that a session exists -- guests reach ready just as
 * fast as signed-in users, right after that determination completes.
 */

let ready = false;
let resolveReady: (() => void) | null = null;
let readyPromise: Promise<void> = new Promise((resolve) => {
  resolveReady = resolve;
});

export function markAuthReady(): void {
  if (ready) return;
  ready = true;
  resolveReady?.();
}

export function waitForAuthReady(): Promise<void> {
  return ready ? Promise.resolve() : readyPromise;
}

/** Test-only: restores the gate to its unresolved initial state. */
export function __resetAuthReadyGateForTests(): void {
  ready = false;
  readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });
}
