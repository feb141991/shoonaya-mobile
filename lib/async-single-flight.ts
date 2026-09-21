/** Deduplicates overlapping executions of the same asynchronous operation. */
export function createSingleFlight<T>() {
  let inFlight: Promise<T> | null = null;

  return {
    run(factory: () => Promise<T>): Promise<T> {
      if (inFlight) return inFlight;
      const operation = factory();
      const tracked = operation.finally(() => {
        if (inFlight === tracked) inFlight = null;
      });
      inFlight = tracked;
      return tracked;
    },
  };
}
