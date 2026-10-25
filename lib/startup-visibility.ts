export type StartupVisibilityState = {
  readyToRender: boolean;
  showStartupScene: boolean;
};

export type StartupSurface = 'app' | 'scene' | 'fallback';

export type StartupAuthDestination = '/(tabs)' | '/(auth)/login' | '/(auth)/onboarding';

/** Returns true only once Expo Router reports the protected destination. */
export function isStartupAuthDestinationVisible(
  destination: StartupAuthDestination,
  rootSegment: string | undefined,
  childSegment: string | undefined,
): boolean {
  if (destination === '/(tabs)') return rootSegment === '(tabs)';
  if (destination === '/(auth)/login') return rootSegment === '(auth)' && childSegment === 'login';
  return rootSegment === '(auth)' && childSegment === 'onboarding';
}

/** Pure startup invariant used by RootLayout and regression tests. */
export function resolveStartupSurface({
  readyToRender,
  showStartupScene,
}: StartupVisibilityState): StartupSurface {
  if (showStartupScene) return 'scene';
  if (readyToRender) return 'app';
  return 'fallback';
}
