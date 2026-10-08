import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { bhaktiCacheKeys, readBhaktiContentCache, writeBhaktiContentCache } from '@/lib/bhaktiContentCache';

// The katha a vrat links to (`VratData.kathaId`), for the Vrat reader's
// "Vrat Katha" chapter (Phase 6 of docs/READER_EXPERIENCE_GRAND_PLAN.md).
// Same source and cache as the Katha reader (app/bhakti/katha/[id].tsx):
// cached copy first, then the backend. A failed refresh keeps the cached
// copy; with neither, the vrat simply has no katha chapter (no empty page).

export type LinkedKatha = {
  id: string;
  title: string;
  titleHi?: string;
  body: string[];
  bodyHi?: string[];
  phal?: string;
  phalHi?: string;
};

function isLinkedKatha(value: unknown): value is LinkedKatha {
  const v = value as Partial<LinkedKatha> | null;
  return !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.title === 'string' && Array.isArray(v.body);
}

export function useLinkedKatha(kathaId: string | undefined): LinkedKatha | null {
  const [katha, setKatha] = useState<LinkedKatha | null>(null);

  useEffect(() => {
    setKatha(null);
    if (!kathaId) return;
    let cancelled = false;
    const cacheKey = bhaktiCacheKeys.kathaDetail(kathaId);
    void (async () => {
      const cached = await readBhaktiContentCache(cacheKey, isLinkedKatha);
      if (cancelled) return;
      if (cached) setKatha(cached);
      try {
        const response = await apiFetch(`/api/bhakti/katha/${encodeURIComponent(kathaId)}`);
        if (!response.ok) return;
        const json = await response.json();
        const loaded = json?.katha;
        if (cancelled || !isLinkedKatha(loaded)) return;
        setKatha(loaded);
        void writeBhaktiContentCache(cacheKey, loaded);
      } catch {
        // Offline: keep whatever the cache had.
      }
    })();
    return () => { cancelled = true; };
  }, [kathaId]);

  return katha;
}
