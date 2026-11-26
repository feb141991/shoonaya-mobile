import { useCallback, useEffect, useState } from 'react';
import { captureAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { SOLAR_DAY_REFERENCE, type SolarDayLocation } from '@/lib/solarDayLocation';
import { loadSolarDayLocation } from '@/lib/solarDayLocationLoader';

export type SolarDayLocationState = {
  location: SolarDayLocation;
  /** 'failed' means the saved place could not be read; the reference (or this account's last read) is shown. */
  status: 'loading' | 'ready' | 'failed';
  retry: () => void;
};

type Settled = { owner: string; attempt: number; location: SolarDayLocation; failed: boolean };

/**
 * The place the Solar Day is calculated for. Paints the Ujjain reference at once (labelled
 * as such), then the saved place for the signed-in account. Nothing is stored, and a
 * response is published only while the identity it was read for is still current
 * (AGENTS.md sections 18 and 22). Loading is derived, never set inside the effect.
 */
export function useSolarDayLocation(): SolarDayLocationState {
  const identity = useAppIdentity();
  const userId = identity.kind === 'authenticated' ? identity.userId : null;
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!userId) return;
    const lease = captureAppIdentity();
    let cancelled = false;
    loadSolarDayLocation(userId).then(
      (location) => {
        if (!cancelled && lease.isCurrent()) setSettled({ owner: userId, attempt, location, failed: false });
      },
      () => {
        if (cancelled || !lease.isCurrent()) return;
        // Keep this account's last good place if there is one; never another account's.
        setSettled((prev) => ({ owner: userId, attempt, location: prev?.owner === userId ? prev.location : SOLAR_DAY_REFERENCE, failed: true }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (identity.kind === 'loading') return { location: SOLAR_DAY_REFERENCE, status: 'loading', retry };
  if (!userId) return { location: SOLAR_DAY_REFERENCE, status: 'ready', retry };
  const mine = settled?.owner === userId ? settled : null;
  const location = mine?.location ?? SOLAR_DAY_REFERENCE;
  if (!mine || mine.attempt !== attempt) return { location, status: 'loading', retry };
  return { location, status: mine.failed ? 'failed' : 'ready', retry };
}
