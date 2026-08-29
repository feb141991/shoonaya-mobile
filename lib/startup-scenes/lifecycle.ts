export type StartupLifecycleDependencies = {
  showScene: () => void;
  hideNativeSplash: () => void;
  crossfadeScene: (onComplete: () => void) => void;
  hideScene: () => void;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
};

export class StartupLifecycleController {
  private readonly deps: Required<StartupLifecycleDependencies>;
  private readonly thresholdMs: number;
  private thresholdTimer: ReturnType<typeof setTimeout> | null = null;
  private sceneMounted = false;
  private ready = false;
  private disposed = false;
  private transitionStarted = false;

  constructor(
    deps: StartupLifecycleDependencies,
    options: { thresholdMs?: number } = {}
  ) {
    this.deps = {
      ...deps,
      setTimeoutFn: deps.setTimeoutFn ?? setTimeout,
      clearTimeoutFn: deps.clearTimeoutFn ?? clearTimeout,
    };
    this.thresholdMs = options.thresholdMs ?? 400;
  }

  start(initiallyReady: boolean): void {
    this.ready = initiallyReady;
    if (initiallyReady) {
      this.deps.hideNativeSplash();
      return;
    }

    this.thresholdTimer = this.deps.setTimeoutFn(() => {
      this.thresholdTimer = null;
      if (this.disposed || this.ready) return;
      this.sceneMounted = true;
      this.deps.showScene();
      this.deps.hideNativeSplash();
    }, this.thresholdMs);
  }

  updateReady(ready: boolean): void {
    this.ready = ready;
    if (!ready || this.disposed || this.transitionStarted) return;

    this.transitionStarted = true;
    this.clearThreshold();

    if (!this.sceneMounted) {
      this.deps.hideNativeSplash();
      return;
    }

    this.deps.crossfadeScene(() => {
      if (this.disposed) return;
      this.deps.hideScene();
    });
  }

  dispose(): void {
    this.disposed = true;
    this.clearThreshold();
  }

  private clearThreshold(): void {
    if (this.thresholdTimer !== null) {
      this.deps.clearTimeoutFn(this.thresholdTimer);
      this.thresholdTimer = null;
    }
  }
}
