import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { createJapaTimer } from '@/lib/japaTimers';

type Options = {
  enabled: boolean;
  active: boolean;
  paceSeconds: number;
  count: number;
  onIncrement: () => void;
};

export function useJapaHandsFree({ enabled, active, paceSeconds, count, onIncrement }: Options) {
  const [isPaused, setIsPaused] = useState(false);
  const [timer] = useState(createJapaTimer);
  const incrementRef = useRef(onIncrement);
  useLayoutEffect(() => {
    incrementRef.current = onIncrement;
  }, [onIncrement]);

  useLayoutEffect(() => {
    if (enabled && active && !isPaused && count < 108) {
      timer.schedule(paceSeconds * 1000, () => incrementRef.current());
    }
    return timer.cancel;
  }, [active, count, enabled, isPaused, paceSeconds, timer]);

  const togglePause = useCallback(() => {
    timer.cancel();
    setIsPaused((paused) => !paused);
  }, [timer]);

  return { isPaused, setIsPaused, togglePause, cancelTick: timer.cancel };
}
