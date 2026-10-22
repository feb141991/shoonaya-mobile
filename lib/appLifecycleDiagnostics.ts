export type AppLifecycleState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension' | null;

/**
 * Tracks real background transitions so client wall-clock request durations
 * can be separated from time spent with the app suspended. `inactive` is not
 * counted: iOS uses it for short interruptions such as Control Center and
 * incoming calls.
 */
export function createBackgroundTransitionTracker(initialState: AppLifecycleState = null) {
  let lastState = initialState;
  let transitionVersion = 0;

  return {
    observe(nextState: AppLifecycleState): void {
      if (nextState === 'background' && lastState !== 'background') transitionVersion += 1;
      lastState = nextState;
    },
    capture(): number {
      return transitionVersion;
    },
    crossedSince(capturedVersion: number): boolean {
      return transitionVersion > capturedVersion;
    },
  };
}

export function shouldScheduleTelemetryFlush(
  previousState: AppLifecycleState,
  nextState: AppLifecycleState,
  initialForegroundFlushStarted: boolean,
  pendingFlush: boolean = false,
): boolean {
  if (nextState !== 'active') return false;
  return previousState === 'background' || pendingFlush || !initialForegroundFlushStarted;
}

export const TELEMETRY_UPLOAD_SETTLE_MS = 2_500;

export const appBackgroundTransitionTracker = createBackgroundTransitionTracker();
