import { useCallback, useEffect, useRef, useState } from 'react';

import { getAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { resolveIdentityKey } from '@/lib/homeDiscovery';
import {
  isNitiSaved,
  nitiItemKey,
  readNitiTreasury,
  setNitiTreasurySaved,
  subscribeNitiTreasury,
  type NitiRef,
} from '@/lib/nitiTreasury';

export interface NitiTreasuryItemState {
  /** True once the saved state for the current identity has been read and that identity can hold a Treasury; the control waits for it. */
  ready: boolean;
  saved: boolean;
  /** Flips the saved state. `ok` is false when nothing was written (no identity, a stale identity, or a disk error). */
  toggle: () => Promise<{ ok: boolean; saved: boolean }>;
}

/**
 * Saved state for one Treasury item. It re-reads when the identity changes (sign-out, account switch)
 * and when the Treasury changes anywhere else, so two views of the same story never disagree.
 */
export function useNitiTreasuryItem(ref: NitiRef): NitiTreasuryItemState {
  const identity = useAppIdentity();
  const identityKey = resolveIdentityKey(identity);
  // A person or a guest has a Treasury; an identity that is still loading, or signed out, has nowhere to put one.
  const canHoldTreasury = identity.kind === 'authenticated' || identity.kind === 'guest';
  const itemKey = nitiItemKey(ref);
  const [state, setState] = useState({ ready: false, saved: false });
  const savedRef = useRef(false);
  savedRef.current = state.saved;

  useEffect(() => {
    let active = true;
    setState({ ready: false, saved: false });
    const load = async () => {
      const items = await readNitiTreasury(getAppIdentity());
      if (active) setState({ ready: canHoldTreasury, saved: isNitiSaved(items, ref) });
    };
    void load();
    const unsubscribe = subscribeNitiTreasury(() => {
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
    // `ref` is represented by `itemKey`; `identityKey` re-runs this when the person changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, itemKey, canHoldTreasury]);

  const toggle = useCallback(async () => {
    const wanted = !savedRef.current;
    const result = await setNitiTreasurySaved(getAppIdentity(), ref, wanted);
    return { ok: result.ok, saved: result.ok ? wanted : savedRef.current };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey]);

  return { ready: state.ready, saved: state.saved, toggle };
}
