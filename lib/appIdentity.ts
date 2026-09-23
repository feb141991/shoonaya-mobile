import { useSyncExternalStore } from 'react';

export type AppIdentity =
  | { kind: 'loading' }
  | { kind: 'guest' }
  | { kind: 'authenticated'; userId: string; email?: string | null }
  | { kind: 'unauthenticated' };

let currentIdentity: AppIdentity = { kind: 'loading' };
let identityRevision = 0;
const listeners = new Set<() => void>();

export function setAppIdentity(identity: AppIdentity): void {
  const unchanged =
    identity.kind === currentIdentity.kind &&
    (identity.kind !== 'authenticated' ||
      (currentIdentity.kind === 'authenticated' &&
        identity.userId === currentIdentity.userId &&
        identity.email === currentIdentity.email));
  if (unchanged) return;

  if (identity.kind !== currentIdentity.kind ||
    (identity.kind === 'authenticated' && currentIdentity.kind === 'authenticated' &&
      identity.userId !== currentIdentity.userId)) {
    identityRevision += 1;
  }
  currentIdentity = identity;
  listeners.forEach((listener) => listener());
}

export function getAppIdentity(): AppIdentity {
  return currentIdentity;
}

export function isSameAppIdentity(left: AppIdentity, right: AppIdentity): boolean {
  return left.kind === right.kind &&
    (left.kind !== 'authenticated' ||
      (right.kind === 'authenticated' && left.userId === right.userId));
}

/** A lease expires on any identity transition, including A → B → A. */
export function captureAppIdentity() {
  const identity = currentIdentity;
  const revision = identityRevision;
  return { identity, isCurrent: () => revision === identityRevision };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppIdentity(): AppIdentity {
  return useSyncExternalStore(subscribe, getAppIdentity, getAppIdentity);
}
