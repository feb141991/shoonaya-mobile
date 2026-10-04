export type UpdateAppState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension' | null;

/** Ignore transient inactive→active changes (Control Center, alerts, etc.). */
export function shouldCheckForUpdateOnResume(
  previousState: UpdateAppState,
  nextState: UpdateAppState
): boolean {
  return previousState === 'background' && nextState === 'active';
}

/** Optional update prompts should not cover an active practice or lesson. */
export function isUpdatePromptSafeSurface(
  rootSegment: string | undefined,
  childSegment: string | undefined
): boolean {
  return rootSegment === '(tabs)' && (childSegment === undefined || childSegment === 'index');
}
