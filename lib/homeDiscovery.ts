import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppIdentity } from '@/lib/appIdentity';

export type HomeDiscoveryState = {
  version: 1;
  identityKey: string;
  sessionCount: number;
  lastCountedSessionId: string | null;
  heroArtworkCueDismissed: boolean;
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
  if (state.sessionCount < 3) return false;
  if (!context.hasRenderedContent) return false;
  if (context.isFirstWeek) return false;
  if (context.hasBlockingHomeSurface) return false;
  return true;
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
