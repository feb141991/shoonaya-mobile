import { useSyncExternalStore } from 'react';
import { apiFetch } from '@/lib/api';
import { captureAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { registerPushToken } from '@/lib/notifications';
import { createAccountDeletionStore, type AccountDeletionStatus } from '@/lib/accountDeletionStore';

export type { AccountDeletionStatus, DeletionReason } from '@/lib/accountDeletionStore';
export { readDeletionReasons } from '@/lib/accountDeletionStore';

/** App-wide deletion cool-off state; see lib/accountDeletionStore.ts. */
export const accountDeletion = createAccountDeletionStore({
  captureIdentity: captureAppIdentity,
  request: (path, init) => apiFetch(path, init),
  reregisterPush: (userId) => { void registerPushToken(userId, { force: true, reason: 'settings' }); },
  now: () => Date.now(),
});

/** The current account's deletion state, or null (unknown / other account / guest). */
export function useAccountDeletionStatus(): AccountDeletionStatus | null {
  const identity = useAppIdentity();
  useSyncExternalStore(accountDeletion.subscribe, accountDeletion.getSnapshot, accountDeletion.getSnapshot);
  return accountDeletion.statusFor(identity.kind === 'authenticated' ? identity.userId : null);
}
