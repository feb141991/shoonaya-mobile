import { useSyncExternalStore } from 'react';

export type AppIdentity =
  | { kind: 'loading' }
  | { kind: 'guest' }
  | { kind: 'authenticated'; userId: string }
  | { kind: 'unauthenticated' };

let currentIdentity: AppIdentity = { kind: 'loading' };
const listeners = new Set<() => void>();

export function setAppIdentity(identity: AppIdentity): void {
  const unchanged =
    identity.kind === currentIdentity.kind &&
    (identity.kind !== 'authenticated' ||
      (currentIdentity.kind === 'authenticated' && identity.userId === currentIdentity.userId));
  if (unchanged) return;

  currentIdentity = identity;
  listeners.forEach((listener) => listener());
}

export function getAppIdentity(): AppIdentity {
  return currentIdentity;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppIdentity(): AppIdentity {
  return useSyncExternalStore(subscribe, getAppIdentity, getAppIdentity);
}
