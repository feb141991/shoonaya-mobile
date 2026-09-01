export type StartupVisibilityState = {
  readyToRender: boolean;
  showStartupScene: boolean;
};

export type StartupSurface = 'app' | 'scene' | 'fallback';

/** Pure startup invariant used by RootLayout and regression tests. */
export function resolveStartupSurface({
  readyToRender,
  showStartupScene,
}: StartupVisibilityState): StartupSurface {
  if (showStartupScene) return 'scene';
  if (readyToRender) return 'app';
  return 'fallback';
}
