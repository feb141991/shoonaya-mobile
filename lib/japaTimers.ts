// Cancellation also invalidates callbacks that were already queued to run.
export function createJapaTimer() {
  let generation = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function cancel() {
    generation++;
    clearTimeout(timeout);
    timeout = undefined;
  }

  function schedule(ms: number, action: () => void) {
    cancel();
    const scheduledGeneration = generation;
    timeout = setTimeout(() => {
      if (generation !== scheduledGeneration) return;
      timeout = undefined;
      action();
    }, ms);
  }

  return { cancel, schedule };
}

export function startJapaReflection(onSeconds: (seconds: number) => void, onDone: () => void) {
  const timer = createJapaTimer();
  let remaining = 10;

  function tick() {
    remaining--;
    if (remaining === 0) {
      onDone();
    } else {
      onSeconds(remaining);
      timer.schedule(1000, tick);
    }
  }

  onSeconds(remaining);
  timer.schedule(1000, tick);
  return timer.cancel;
}
