import { abortWithReason } from './abort-reason';
/**
 * Gives auth/session preparation and the HTTP request separate, finite budgets.
 * The caller configures these independently so slow auth does not consume the
 * network's deadline and neither phase can leave a request pending forever.
 */
export function createApiPhaseTimeout(
  controller: AbortController,
  authPreparationTimeoutMs: number,
  transportTimeoutMs: number,
) {
  let phase: 'auth' | 'transport' = 'auth';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const arm = (message: string, timeoutMs: number) => {
    timer = setTimeout(() => {
      // Named AbortError so existing failure classifiers keep treating it as a
      // network-side outcome, and marked as a timeout so it is never mistaken
      // for a caller cancelling the request (lib/fetch-error.ts).
      const error = Object.assign(new Error(message), { name: 'AbortError', timeout: true as const });
      abortWithReason(controller, error);
    }, timeoutMs);
  };

  arm('Authentication preparation timed out', authPreparationTimeoutMs);

  return {
    startTransport() {
      if (phase === 'transport' || controller.signal.aborted) return;
      phase = 'transport';
      if (timer) clearTimeout(timer);
      arm('API request timed out', transportTimeoutMs);
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
