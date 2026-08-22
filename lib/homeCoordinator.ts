import { readHomeCache, writeHomeCache, clearHomeCache, type CacheIdentity, type CachedHomeRenderModel } from './homeCache';
import { safeTimezone, spiritualDate } from './spiritualDate';

export type HomeAuthIdentity =
  | { kind: 'guest' }
  | { kind: 'authenticated'; userId: string }
  | { kind: 'unauthenticated' };

export type SankalpaRow = {
  id: string;
  user_id?: string;
  sankalpa_text?: string;
  text?: string;
  target_count?: number;
  target_days?: number | null;
  completed_count?: number;
  current_streak?: number;
  best_streak?: number;
  start_date?: string;
  startDate?: string;
  end_date?: string | null;
  endDate?: string | null;
  status?: 'active' | 'completed' | 'paused' | 'abandoned' | string;
  created_at?: string;
  updated_at?: string;
  reflection_notes?: string | null;
};

export function resolveHomeIdentity(
  isGuest: boolean,
  sessionUser: { id: string } | null | undefined
): HomeAuthIdentity {
  if (isGuest) {
    return { kind: 'guest' };
  }
  if (sessionUser && sessionUser.id) {
    return { kind: 'authenticated', userId: sessionUser.id };
  }
  return { kind: 'unauthenticated' };
}

export function getIdentityKey(identity: HomeAuthIdentity): string | null {
  if (identity.kind === 'guest') return 'guest';
  if (identity.kind === 'authenticated') return `authenticated:${identity.userId}`;
  return null;
}

export type HomeFetchApi = (path: string, options?: RequestInit) => Promise<Response>;

export type HomeLoaderDependencies = {
  fetchApi: HomeFetchApi;
  onApplyPayload: (payload: any) => void;
  onSetLoading: (loading: boolean) => void;
  onSetError: (error: boolean) => void;
  onRedirectToLogin: () => void;
  onPrefetchHeroImage?: (url: string) => void;
  buildGuestPayload: () => any;
  getTimezone?: () => string;
};

export type HomeLoaderState = {
  hasValidState: boolean;
  lastLoadedAt: number;
  lastIdentityKey: string | null;
  requestGen: number;
  currentHeroUrl: string | null;
};

/**
 * Production Home Summary Coordinator.
 * Manages identity resolution, SWR caching, request deduplication,
 * and stale generation protection for Native Home.
 */
export class HomeSummaryCoordinator {
  private inFlightRequests = new Map<string, Promise<any>>();
  private deps: HomeLoaderDependencies;
  public state: HomeLoaderState;

  constructor(deps: HomeLoaderDependencies, initialState?: Partial<HomeLoaderState>) {
    this.deps = deps;
    this.state = {
      hasValidState: false,
      lastLoadedAt: 0,
      lastIdentityKey: null,
      requestGen: 0,
      currentHeroUrl: null,
      ...initialState,
    };
  }

  public setHeroUrl(url: string | null) {
    this.state.currentHeroUrl = url;
  }

  public invalidateMemoryState(newIdentityKey: string | null = null) {
    this.state.hasValidState = false;
    this.state.lastLoadedAt = 0;
    this.state.lastIdentityKey = newIdentityKey;
    this.deps.onSetLoading(true);
    this.deps.onSetError(false);
  }

  public async onFocus(identity: HomeAuthIdentity): Promise<void> {
    const currentIdentityKey = getIdentityKey(identity);

    if (identity.kind === 'unauthenticated' || !currentIdentityKey) {
      this.invalidateMemoryState(null);
      this.deps.onSetLoading(false);
      this.deps.onRedirectToLogin();
      return;
    }

    // Account switch or guest/auth boundary: MUST clear previous memory state immediately
    if (this.state.lastIdentityKey && this.state.lastIdentityKey !== currentIdentityKey) {
      this.invalidateMemoryState(currentIdentityKey);
    } else {
      this.state.lastIdentityKey = currentIdentityKey;
    }

    const now = Date.now();
    const isStale = now - this.state.lastLoadedAt > 5 * 60 * 1000;

    // If we have valid state and it's fresh (<5m), no mandatory reload needed unless stale
    if (this.state.hasValidState && !isStale) {
      return;
    }

    await this.loadHome(identity);
  }

  public async loadHome(identity: HomeAuthIdentity, isManualRefresh = false): Promise<void> {
    const currentIdentityKey = getIdentityKey(identity);

    if (identity.kind === 'unauthenticated' || !currentIdentityKey) {
      this.invalidateMemoryState(null);
      this.deps.onSetLoading(false);
      this.deps.onRedirectToLogin();
      return;
    }

    // Check account switch
    if (this.state.lastIdentityKey && this.state.lastIdentityKey !== currentIdentityKey) {
      this.invalidateMemoryState(currentIdentityKey);
    } else {
      this.state.lastIdentityKey = currentIdentityKey;
    }

    const requestGen = ++this.state.requestGen;
    this.deps.onSetError(false);

    const timezone = safeTimezone(
      this.deps.getTimezone ? this.deps.getTimezone() : Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    const cacheIdentity: CacheIdentity =
      identity.kind === 'guest'
        ? { kind: 'guest' }
        : { kind: 'authenticated', userId: identity.userId };

    // 1. If we don't have valid state rendered yet, read stale-while-revalidate cache
    if (!this.state.hasValidState && !isManualRefresh) {
      const cached = await readHomeCache(cacheIdentity, timezone);
      if (cached && requestGen === this.state.requestGen && this.state.lastIdentityKey === currentIdentityKey) {
        this.deps.onApplyPayload(cached.payload);
        this.state.hasValidState = true;
        this.state.lastLoadedAt = cached.savedAt;
        this.deps.onSetLoading(false);
      }
    }

    if (!this.state.hasValidState) {
      this.deps.onSetLoading(true);
    }

    // Guest mode returns deterministic template with zero authenticated network requests
    if (identity.kind === 'guest') {
      if (requestGen === this.state.requestGen && this.state.lastIdentityKey === currentIdentityKey) {
        const guestPayload = this.deps.buildGuestPayload();
        this.deps.onApplyPayload(guestPayload);
        this.state.hasValidState = true;
        this.state.lastLoadedAt = Date.now();
        void writeHomeCache(cacheIdentity, guestPayload, timezone);
        this.deps.onSetLoading(false);
        this.deps.onSetError(false);
      }
      return;
    }

    // 2. Fetch fresh network payload for authenticated user (deduplicated per identity)
    let inFlight = this.inFlightRequests.get(currentIdentityKey);
    if (!inFlight) {
      inFlight = (async () => {
        try {
          const response = await this.deps.fetchApi('/api/native/home-summary');
          if (response.status === 401) {
            await clearHomeCache(cacheIdentity);
            return { unauthorized: true };
          }
          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }
          const payload = await response.json();
          return { payload };
        } finally {
          this.inFlightRequests.delete(currentIdentityKey);
        }
      })();
      this.inFlightRequests.set(currentIdentityKey, inFlight);
    }

    try {
      const result = await inFlight;

      // Ensure response is not superseded by a newer request or identity change
      if (requestGen !== this.state.requestGen || this.state.lastIdentityKey !== currentIdentityKey) {
        return;
      }

      if (result?.unauthorized) {
        this.invalidateMemoryState(null);
        this.deps.onSetLoading(false);
        this.deps.onRedirectToLogin();
        return;
      }

      const payload = result?.payload;
      if (payload) {
        if (payload.hero?.imageUrl && this.deps.onPrefetchHeroImage) {
          const nextHeroUrl = payload.hero.imageUrl;
          if (nextHeroUrl && nextHeroUrl !== this.state.currentHeroUrl) {
            this.deps.onPrefetchHeroImage(nextHeroUrl);
          }
        }

        this.deps.onApplyPayload(payload);
        this.state.hasValidState = true;
        this.state.lastLoadedAt = Date.now();
        this.deps.onSetLoading(false);
        this.deps.onSetError(false);

        const canonicalTimezone = safeTimezone(payload.date?.timezone || timezone);
        const canonicalSpiritualDate = spiritualDate(canonicalTimezone);
        void writeHomeCache(cacheIdentity, payload, canonicalTimezone, canonicalSpiritualDate);
      }
    } catch (error) {
      if (requestGen === this.state.requestGen && this.state.lastIdentityKey === currentIdentityKey) {
        if (!this.state.hasValidState) {
          this.deps.onSetError(true);
        }
        this.deps.onSetLoading(false);
      }
    }
  }
}

export type SankalpaStatus = 'loading' | 'ready' | 'hidden' | 'error';

export type SankalpaLoaderDependencies = {
  fetchApi: HomeFetchApi;
  onSetStatus: (status: SankalpaStatus) => void;
  onSetSankalpa: (sankalpa: SankalpaRow | null) => void;
  onSetCheckedToday: (checked: boolean) => void;
  getTimezone?: () => string;
};

export type SankalpaLoaderState = {
  hasEverLoaded: boolean;
  sankalpa: SankalpaRow | null | undefined; // undefined = unknown, null = confirmed none
  checkedToday: boolean;
  requestGen: number;
};

/**
 * Production Sankalpa Coordinator.
 * Handles identity gating (guest = 0 requests), unknown vs confirmed null state,
 * check-in resolution, and request deduplication.
 */
export class SankalpaCoordinator {
  private inFlightFetch: Promise<void> | null = null;
  private deps: SankalpaLoaderDependencies;
  public state: SankalpaLoaderState;

  constructor(
    deps: SankalpaLoaderDependencies,
    initialSankalpa?: SankalpaRow | null
  ) {
    this.deps = deps;
    this.state = {
      hasEverLoaded: initialSankalpa !== undefined,
      sankalpa: initialSankalpa,
      checkedToday: false,
      requestGen: 0,
    };
  }

  public setInitialSankalpa(initialSankalpa?: SankalpaRow | null) {
    if (initialSankalpa !== undefined) {
      this.state.sankalpa = initialSankalpa;
      this.state.hasEverLoaded = true;
      this.deps.onSetSankalpa(initialSankalpa ?? null);
      this.deps.onSetStatus('ready');
    }
  }

  public async load(identity: HomeAuthIdentity): Promise<void> {
    // Guest mode: ZERO authenticated Sankalpa API requests
    if (identity.kind === 'guest' || identity.kind === 'unauthenticated') {
      this.deps.onSetStatus('hidden');
      return;
    }

    if (this.inFlightFetch) {
      return this.inFlightFetch;
    }

    const requestGen = ++this.state.requestGen;

    // Show loading skeleton ONLY on initial cold load when data is unknown
    if (!this.state.hasEverLoaded && this.state.sankalpa === undefined) {
      this.deps.onSetStatus('loading');
    }

    this.inFlightFetch = (async () => {
      try {
        const response = await this.deps.fetchApi('/api/sankalpa');
        if (!response.ok) {
          throw new Error(`Sankalpa fetch failed (${response.status})`);
        }

        const payload = (await response.json()) as { sankalpa: SankalpaRow | null };
        const nextSankalpa = payload.sankalpa ?? null;

        if (requestGen !== this.state.requestGen) return;

        this.state.sankalpa = nextSankalpa;
        this.state.hasEverLoaded = true;
        this.deps.onSetSankalpa(nextSankalpa);

        if (nextSankalpa) {
          const checkinRes = await this.deps.fetchApi(
            `/api/sankalpa/checkin?sankalpa_id=${encodeURIComponent(nextSankalpa.id)}`
          );
          if (checkinRes.ok && requestGen === this.state.requestGen) {
            const checkinPayload = (await checkinRes.json()) as { checkins?: string[] };
            const timezone = safeTimezone(
              this.deps.getTimezone ? this.deps.getTimezone() : Intl.DateTimeFormat().resolvedOptions().timeZone
            );
            const todayUtc = new Date().toISOString().slice(0, 10);
            const isChecked = (checkinPayload.checkins ?? []).includes(todayUtc);
            this.state.checkedToday = isChecked;
            this.deps.onSetCheckedToday(isChecked);
          } else {
            this.deps.onSetCheckedToday(false);
          }
        } else {
          this.deps.onSetCheckedToday(false);
        }

        this.deps.onSetStatus('ready');
      } catch (error) {
        if (requestGen !== this.state.requestGen) return;

        // If we already had valid data (cached or initial), retain it
        if (this.state.sankalpa !== undefined && this.state.sankalpa !== null) {
          this.deps.onSetStatus('ready');
        } else if (this.state.hasEverLoaded && this.state.sankalpa === null) {
          // Confirmed null sankalpa shows ready (setup CTA)
          this.deps.onSetStatus('ready');
        } else {
          // Unverified cold load failure: show retry error, NEVER false "Set a Sankalpa"
          this.deps.onSetStatus('error');
        }
      } finally {
        this.inFlightFetch = null;
      }
    })();

    return this.inFlightFetch;
  }
}
