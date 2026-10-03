// One owner for "is this account in its 30-day deletion cool-off?" on Native.
//
// Before this, Profile, Settings and the startup prompt in app/_layout.tsx each
// fetched GET /api/user/delete/status and called POST /api/user/delete/cancel
// on their own: a cancel from one place left the other two showing the old
// state, the startup prompt reported success without checking the response,
// and only Settings re-registered push afterwards. Every surface now reads
// this store and every cancel goes through cancel() below.
//
// Contract owner: the backend (Sanatan Sangam/Shoonaya,
// src/app/api/user/delete/{status,cancel}/route.ts). Snapshots are keyed by
// user id and never shown to a different identity; nothing here is persisted.

export type AccountDeletionStatus = {
  userId: string;
  isDeleting: boolean;
  deletionRequestedAt: string | null;
  purgeAfter: string | null;
  daysRemaining: number | null;
};

type Lease = { identity: { kind: string; userId?: string }; isCurrent: () => boolean };
type Response = { ok: boolean; status: number; json: () => Promise<unknown> };

type Dependencies = {
  captureIdentity: () => Lease;
  request: (path: string, init: { method?: string; expectedUserId: string }) => Promise<Response>;
  /** Called after a confirmed cancel; the backend refuses registration while deleting. */
  reregisterPush: (userId: string) => void;
  now: () => number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type DeletionReason = { id: string; label: string; requireDetails?: boolean };

/** Validates preview.reasons; malformed entries are dropped, never patched. */
export function readDeletionReasons(value: unknown): DeletionReason[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const reasons: DeletionReason[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { id, label, requireDetails } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || typeof label !== 'string' || !label || seen.has(id)) continue;
    seen.add(id);
    reasons.push(requireDetails === true ? { id, label, requireDetails: true } : { id, label });
  }
  return reasons;
}

export function daysUntil(purgeAfter: string | null, now: number): number | null {
  if (!purgeAfter) return null;
  const target = new Date(purgeAfter).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - now) / DAY_MS));
}

function readStatus(userId: string, body: unknown, now: number): AccountDeletionStatus | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  if (data.success !== true) return null;
  const purgeAfter = typeof data.purgeAfter === 'string' ? data.purgeAfter : null;
  return {
    userId,
    isDeleting: data.isDeleting === true,
    deletionRequestedAt: typeof data.deletionRequestedAt === 'string' ? data.deletionRequestedAt : null,
    purgeAfter,
    daysRemaining: typeof data.daysRemaining === 'number' ? data.daysRemaining : daysUntil(purgeAfter, now),
  };
}

export function createAccountDeletionStore(d: Dependencies) {
  let snapshot: AccountDeletionStatus | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: AccountDeletionStatus | null) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const ownedBy = (lease: Lease, userId: string) =>
    lease.isCurrent() && lease.identity.kind === 'authenticated' && lease.identity.userId === userId;

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => snapshot,

    /** The snapshot only if it belongs to userId -- never another account's. */
    statusFor(userId: string | null): AccountDeletionStatus | null {
      return userId && snapshot?.userId === userId ? snapshot : null;
    },

    /** Best-effort read; a failed fetch keeps the last known state for this user. */
    async refresh(userId: string): Promise<AccountDeletionStatus | null> {
      const lease = d.captureIdentity();
      if (!ownedBy(lease, userId)) return null;
      try {
        const response = await d.request('/api/user/delete/status', { expectedUserId: userId });
        if (!response.ok || !ownedBy(lease, userId)) return snapshot?.userId === userId ? snapshot : null;
        const next = readStatus(userId, await response.json().catch(() => null), d.now());
        if (!next || !ownedBy(lease, userId)) return snapshot?.userId === userId ? snapshot : null;
        publish(next);
        return next;
      } catch {
        return snapshot?.userId === userId ? snapshot : null;
      }
    },

    /** Record a confirmed POST /api/user/delete/request response. */
    markScheduled(userId: string, deletionRequestedAt: string | null, purgeAfter: string | null) {
      if (!ownedBy(d.captureIdentity(), userId)) return;
      publish({ userId, isDeleting: true, deletionRequestedAt, purgeAfter, daysRemaining: daysUntil(purgeAfter, d.now()) });
    },

    /**
     * Cancels the cool-off. Resolves only after the backend confirms
     * (2xx and success: true); otherwise throws and leaves state unchanged.
     */
    async cancel(userId: string): Promise<void> {
      const lease = d.captureIdentity();
      if (!ownedBy(lease, userId)) throw new Error('Account changed before cancelling deletion');
      const response = await d.request('/api/user/delete/cancel', { method: 'POST', expectedUserId: userId });
      const body = await response.json().catch(() => null);
      const confirmed = response.ok && !!body && typeof body === 'object' && (body as { success?: unknown }).success === true;
      if (!confirmed) {
        const detail = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
          ? (body as { error: string }).error : '';
        throw new Error(detail || `Could not cancel deletion (status ${response.status})`);
      }
      if (!ownedBy(lease, userId)) return;
      publish({ userId, isDeleting: false, deletionRequestedAt: null, purgeAfter: null, daysRemaining: null });
      d.reregisterPush(userId);
    },

    /** Sign-out / account switch: drop the previous account's state. */
    clear() {
      if (snapshot) publish(null);
    },
  };
}

export type AccountDeletionStore = ReturnType<typeof createAccountDeletionStore>;
