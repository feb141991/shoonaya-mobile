// Dependency-free, like lib/fetch-error.ts.
//
// React Native 0.86 installs the old `abort-controller` package as the global
// AbortController (node_modules/react-native/Libraries/Core/setUpXHR.js). Its
// abort() takes no argument and its signal has no `reason`, so on a device
// `controller.abort(error)` keeps nothing and `signal.reason` is undefined.
// Node's built-in AbortController (what the unit tests run on) does keep it,
// which is why tests never saw the difference.
//
// Every place that aborts with a reason, or rethrows one, goes through these
// two functions so the reason survives on the device too. Otherwise a timeout
// rejects with `undefined`: nothing can tell it apart from any other failure,
// and the log reads "Failed to persist japa completion undefined" (2026-11-13).

const reasons = new WeakMap<AbortSignal, unknown>();

export function abortWithReason(controller: AbortController, reason: unknown): void {
  if (!controller.signal.aborted) reasons.set(controller.signal, reason);
  controller.abort(reason);
}

export function abortReasonOf(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  if (reasons.has(signal)) return reasons.get(signal);
  return Object.assign(new Error('Request cancelled'), { name: 'AbortError' });
}
