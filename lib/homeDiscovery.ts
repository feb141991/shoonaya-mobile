import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppIdentity } from '@/lib/appIdentity';

export type HomeDiscoveryState = {
  version: 1;
  identityKey: string;
  sessionCount: number;
  lastCountedSessionId: string | null;
  heroArtworkCueDismissed: boolean;
  guidedTourStep: number;
  guidedTourFinished: boolean;
  updatedAt: number;
};

const DISCOVERY_STORAGE_PREFIX = 'shoonaya_home_discovery_v1_';

// Unique token for one JavaScript runtime. It advances after a cold relaunch,
// not after ordinary tab switches or foreground focus events.
export const RUNTIME_SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function resolveIdentityKey(identity: AppIdentity): string {
  switch (identity.kind) {
    case 'authenticated':
      return `user_${identity.userId}`;
    case 'guest':
      return 'guest';
    default:
      return 'unauthenticated';
  }
}

export function getDiscoveryStorageKey(identityKey: string): string {
  return `${DISCOVERY_STORAGE_PREFIX}${identityKey}`;
}

export function createInitialDiscoveryState(identityKey: string): HomeDiscoveryState {
  return {
    version: 1,
    identityKey,
    sessionCount: 0,
    lastCountedSessionId: null,
    heroArtworkCueDismissed: false,
    guidedTourStep: 0,
    guidedTourFinished: false,
    updatedAt: Date.now(),
  };
}

function parseDiscoveryState(raw: string | null, identityKey: string): HomeDiscoveryState {
  if (!raw) return createInitialDiscoveryState(identityKey);
  try {
    const parsed = JSON.parse(raw) as Partial<HomeDiscoveryState>;
    if (parsed.version !== 1 || parsed.identityKey !== identityKey) {
      return createInitialDiscoveryState(identityKey);
    }
    return {
      version: 1,
      identityKey,
      sessionCount: typeof parsed.sessionCount === 'number' && parsed.sessionCount >= 0 ? parsed.sessionCount : 0,
      lastCountedSessionId: typeof parsed.lastCountedSessionId === 'string' ? parsed.lastCountedSessionId : null,
      heroArtworkCueDismissed: Boolean(parsed.heroArtworkCueDismissed),
      guidedTourStep: typeof parsed.guidedTourStep === 'number' && parsed.guidedTourStep >= 0 ? parsed.guidedTourStep : 0,
      guidedTourFinished: Boolean(parsed.guidedTourFinished),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return createInitialDiscoveryState(identityKey);
  }
}

export async function getHomeDiscoveryState(identity: AppIdentity): Promise<HomeDiscoveryState> {
  const identityKey = resolveIdentityKey(identity);
  if (identityKey === 'unauthenticated') {
    return createInitialDiscoveryState('unauthenticated');
  }
  try {
    const raw = await AsyncStorage.getItem(getDiscoveryStorageKey(identityKey));
    return parseDiscoveryState(raw, identityKey);
  } catch {
    return createInitialDiscoveryState(identityKey);
  }
}

export async function persistHomeDiscoveryState(state: HomeDiscoveryState): Promise<void> {
  if (state.identityKey === 'unauthenticated') return;
  try {
    const key = getDiscoveryStorageKey(state.identityKey);
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Non-fatal, keep app usable
  }
}

/**
 * Records a qualified Home visit. Only increments once per JavaScript runtime
 * (normally one cold launch) and only after Home has rendered valid content.
 */
export async function recordHomeFocusSession(
  identity: AppIdentity,
  hasRenderedContent: boolean,
  sessionId = RUNTIME_SESSION_ID
): Promise<HomeDiscoveryState> {
  const identityKey = resolveIdentityKey(identity);
  if (identityKey === 'unauthenticated' || !hasRenderedContent) {
    return createInitialDiscoveryState(identityKey);
  }

  const current = await getHomeDiscoveryState(identity);

  // If this session has already been counted, do not advance sessionCount
  if (current.lastCountedSessionId === sessionId) {
    return current;
  }

  const nextState: HomeDiscoveryState = {
    ...current,
    sessionCount: current.sessionCount + 1,
    lastCountedSessionId: sessionId,
    updatedAt: Date.now(),
  };

  await persistHomeDiscoveryState(nextState);
  return nextState;
}

export type CueEvaluationContext = {
  hasRenderedContent: boolean;
  isFirstWeek: boolean;
  hasBlockingHomeSurface: boolean;
};

/**
 * Pure evaluation helper for hero artwork discovery cue eligibility.
 */
export function isHeroArtworkCueEligible(
  state: HomeDiscoveryState,
  context: CueEvaluationContext
): boolean {
  if (state.heroArtworkCueDismissed) return false;
  // The guided tour's last step already covers backdrop selection -- don't
  // compete with it for screen space while it's still running.
  if (!state.guidedTourFinished) return false;
  if (state.sessionCount < 3) return false;
  if (!context.hasRenderedContent) return false;
  if (context.isFirstWeek) return false;
  if (context.hasBlockingHomeSurface) return false;
  return true;
}

export const GUIDED_TOUR_STEP_COUNT = 4;

/**
 * Pure evaluation helper for the "explore your Home" guided tour.
 * Unlike the artwork cue (which waits for session 3+), this runs on the
 * very first qualifying render -- it exists specifically to orient a user
 * before they've had to discover anything the hard way.
 */
export function isGuidedTourEligible(
  state: HomeDiscoveryState,
  context: CueEvaluationContext
): boolean {
  if (state.guidedTourFinished) return false;
  if (!context.hasRenderedContent) return false;
  if (context.hasBlockingHomeSurface) return false;
  return true;
}

export async function advanceGuidedTour(identity: AppIdentity): Promise<HomeDiscoveryState> {
  const current = await getHomeDiscoveryState(identity);
  const nextStep = current.guidedTourStep + 1;
  const finished = nextStep >= GUIDED_TOUR_STEP_COUNT;
  const nextState: HomeDiscoveryState = {
    ...current,
    guidedTourStep: nextStep,
    guidedTourFinished: finished,
    updatedAt: Date.now(),
  };
  await persistHomeDiscoveryState(nextState);
  return nextState;
}

export async function finishGuidedTour(identity: AppIdentity): Promise<HomeDiscoveryState> {
  const current = await getHomeDiscoveryState(identity);
  const nextState: HomeDiscoveryState = {
    ...current,
    guidedTourFinished: true,
    updatedAt: Date.now(),
  };
  await persistHomeDiscoveryState(nextState);
  return nextState;
}

export async function dismissHeroArtworkCue(identity: AppIdentity): Promise<HomeDiscoveryState> {
  const identityKey = resolveIdentityKey(identity);
  const current = await getHomeDiscoveryState(identity);
  const nextState: HomeDiscoveryState = {
    ...current,
    heroArtworkCueDismissed: true,
    updatedAt: Date.now(),
  };
  await persistHomeDiscoveryState(nextState);
  return nextState;
}

export async function markHeroArtworkPickerOpened(identity: AppIdentity): Promise<HomeDiscoveryState> {
  return dismissHeroArtworkCue(identity);
}

export async function clearHomeDiscoveryState(identity: AppIdentity): Promise<void> {
  const identityKey = resolveIdentityKey(identity);
  if (identityKey === 'unauthenticated') return;
  try {
    await AsyncStorage.removeItem(getDiscoveryStorageKey(identityKey));
  } catch {
    // Best-effort
  }
}

export async function replayHomeDiscovery(identity: AppIdentity): Promise<void> {
  const current = await getHomeDiscoveryState(identity);
  await persistHomeDiscoveryState({
    ...current,
    sessionCount: Math.max(3, current.sessionCount),
    heroArtworkCueDismissed: false,
    // Restart the guided tour from the top too -- "Replay first-use tips"
    // should bring back everything, not just the artwork cue. Single
    // read-modify-write covering both fields: the caller (Settings' Replay
    // button) must not fire two separate replay calls concurrently against
    // this same stored blob, or one write would silently clobber the other.
    guidedTourStep: 0,
    guidedTourFinished: false,
    updatedAt: Date.now(),
  });
}

export async function clearAllHomeDiscoveryStates(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const discoveryKeys = allKeys.filter((k) => k.startsWith(DISCOVERY_STORAGE_PREFIX));
    if (discoveryKeys.length > 0) {
      await AsyncStorage.multiRemove(discoveryKeys);
    }
  } catch {
    // Best-effort
  }
}
