import { useCallback, useMemo, useState } from 'react';

import { getAppIdentity } from '@/lib/appIdentity';
import {
  foldSyncQueueItems,
  readPendingJapaCompletions,
  type PendingJapaCompletion,
} from '@/lib/japaPendingCompletion';

export function useJapaSyncQueue() {
  const [items, setItems] = useState<PendingJapaCompletion[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  const reset = useCallback(() => {
    setItems([]);
    setUnavailable(false);
  }, []);

  const refresh = useCallback(async (userId: string) => {
    const result = await readPendingJapaCompletions(userId);
    const identity = getAppIdentity();
    if (identity.kind !== 'authenticated' || identity.userId !== userId) return;

    setItems((previous) => foldSyncQueueItems(previous, result));
    setUnavailable(result.status !== 'ok');
  }, []);

  const pendingItems = useMemo(() => items.filter((item) => item.status === 'pending'), [items]);
  const failedItems = useMemo(() => items.filter((item) => item.status === 'failed'), [items]);

  return {
    items,
    pendingItems,
    failedItems,
    pendingCount: pendingItems.length,
    failedCount: failedItems.length,
    unavailable,
    reset,
    refresh,
  };
}
