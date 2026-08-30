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
  private readonly artworkFallbackMs: number;
  private artworkFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private sceneMounted = false;
  private sceneReady = false;
  private ready = false;
  private disposed = false;
  private transitionStarted = false;

  constructor(
    deps: StartupLifecycleDependencies,
    options: { artworkFallbackMs?: number } = {}
  ) {
    this.deps = {
      ...deps,
      setTimeoutFn: deps.setTimeoutFn ?? setTimeout,
      clearTimeoutFn: deps.clearTimeoutFn ?? clearTimeout,
    };
    this.artworkFallbackMs = options.artworkFallbackMs ?? 2000;
  }

  start(initiallyReady: boolean): void {
    this.ready = initiallyReady;
    this.sceneMounted = true;
    this.deps.showScene();
    this.artworkFallbackTimer = this.deps.setTimeoutFn(
      () => this.notifySceneReady(),
      this.artworkFallbackMs
    );
  }

  notifySceneReady(): void {
    if (this.disposed || this.sceneReady || !this.sceneMounted) return;
    this.sceneReady = true;
    this.clearArtworkFallback();
    this.deps.hideNativeSplash();
    this.startTransitionIfReady();
  }

  updateReady(ready: boolean): void {
    this.ready = ready;
    this.startTransitionIfReady();
  }

  private startTransitionIfReady(): void {
    if (!this.ready || !this.sceneReady || this.disposed || this.transitionStarted) return;

    this.transitionStarted = true;
    this.deps.crossfadeScene(() => {
      if (this.disposed) return;
      this.deps.hideScene();
    });
  }

  dispose(): void {
    this.disposed = true;
    this.clearArtworkFallback();
  }

  private clearArtworkFallback(): void {
    if (this.artworkFallbackTimer !== null) {
      this.deps.clearTimeoutFn(this.artworkFallbackTimer);
      this.artworkFallbackTimer = null;
    }
  }
}
