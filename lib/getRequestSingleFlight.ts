/** In-flight GET sharing only: no settled response cache, no write replay. */
export function getRequestKey(scope: string, path: string, options: RequestInit & { timeoutMs?: number; dedupe?: boolean }): string | null {
  if ((options.method ?? 'GET').toUpperCase() !== 'GET' || options.body != null || options.dedupe === false) return null;
  const headers = Array.from(new Headers(options.headers).entries()).sort(([a], [b]) => a.localeCompare(b));
  if (headers.some(([key, value]) => key === 'accept' && /event-stream|octet-stream/i.test(value))) return null;
  // Unknown/platform-specific options must not be silently collapsed.
  const known = new Set(['method', 'body', 'headers', 'signal', 'timeoutMs', 'dedupe', 'expectedUserId', 'expectedGuest',
    'cache', 'credentials', 'integrity', 'keepalive', 'mode', 'redirect', 'referrer', 'referrerPolicy', 'priority']);
  if (Object.keys(options).some((key) => !known.has(key))) return null;
  const { signal: _signal, headers: _headers, dedupe: _dedupe, ...rest } = options;
  const ordered = Object.entries(rest).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([scope, path, headers, ordered]);
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? Object.assign(new Error('Request cancelled'), { name: 'AbortError' });
}

export function createGetRequestSingleFlight() {
  type Flight = { promise: Promise<Response>; controller: AbortController; subscribers: number; settled: boolean };
  const flights = new Map<string, Flight>();
  return {
    run(key: string, send: (signal: AbortSignal) => Promise<Response>, signal?: AbortSignal | null): Promise<Response> {
      if (signal?.aborted) return Promise.reject(abortError(signal));
      let flight = flights.get(key);
      if (!flight) {
        const controller = new AbortController();
        flight = { promise: undefined as unknown as Promise<Response>, controller, subscribers: 0, settled: false };
        const current = flight;
        // Register before invoking transport, including synchronous throws.
        flights.set(key, current);
        current.promise = Promise.resolve().then(() => send(controller.signal)).finally(() => {
          current.settled = true;
          if (flights.get(key) === current) flights.delete(key);
        });
      }
      const current = flight;
      current.subscribers++;
      return new Promise<Response>((resolve, reject) => {
        let done = false;
        const finish = () => {
          if (done) return false;
          done = true;
          signal?.removeEventListener('abort', onAbort);
          current.subscribers--;
          if (!current.settled && current.subscribers === 0) {
            if (flights.get(key) === current) flights.delete(key);
            current.controller.abort();
          }
          return true;
        };
        const onAbort = () => { if (finish()) reject(abortError(signal!)); };
        signal?.addEventListener('abort', onAbort, { once: true });
        current.promise.then((response) => {
          if (!finish()) return;
          // Each caller owns its readable body. Never return the shared body.
          try { resolve(response.clone()); } catch (error) { reject(error); }
        }, (error) => { if (finish()) reject(error); });
      });
    },
  };
}
