import { readHomeCache, writeHomeCache, clearHomeCache, withDateSensitiveFieldsPending, type CacheIdentity, type CachedHomeRenderModel } from './homeCache';
import { safeTimezone, spiritualDate } from './spiritualDate';
import { isFetchCancelled } from './fetch-error';
import { syncStartupPreferencesFromProfile } from './startup-scenes/preferences';
import { recordRouteOpen, recordRefreshFailure, type TelemetryIdentity } from './telemetry';

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

export type HomeFetchApi = (
  path: string,
  options?: RequestInit & { timeoutMs?: number }
) => Promise<Response>;

export const HOME_SUMMARY_TIMEOUT_MS = 30_000;

export type HomeLoaderDependencies = {
  fetchApi: HomeFetchApi;
  onApplyPayload: (payload: any) => void;
  onSetLoading: (loading: boolean) => void;
  onSetError: (error: boolean) => void;
  onRedirectToLogin: () => void;
  /**
   * Called with `true` when a cache hit is applied whose spiritualDate no
   * longer matches today -- Panchang/vrat and practice-status sections in
   * the applied payload have been reset to a neutral pending state (see
   * withDateSensitiveFieldsPending) and should render a loading treatment,
   * not be read as confirmed data. Called with `false` once a fresh network
   * response (or a fresh-date cache hit) lands.
   */
  onSetSectionsPending?: (pending: boolean) => void;
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

  public async loadHome(identity: HomeAuthIdentity, isManualRefresh = false, retryCount = 0): Promise<void> {
    // Telemetry only cares about genuine "screen open" timings, not every
    // background revalidation -- captured once per call via wasAlreadyValid,
    // since a call that starts with hasValidState already true is a
    // refresh, not an open. cacheApplied tracks whether this open resolved
    // from cache so the eventual network completion doesn't double-count
    // the same open as a second, cache-miss event.
    const loadStartedAt = Date.now();
    const wasAlreadyValid = this.state.hasValidState;
    let cacheApplied = false;
    const telemetryIdentity: TelemetryIdentity =
      identity.kind === 'authenticated' ? { kind: 'authenticated', userId: identity.userId } : { kind: 'guest' };

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
        this.deps.onApplyPayload(
          cached.dateSensitiveStale ? withDateSensitiveFieldsPending(cached.payload) : cached.payload
        );
        this.deps.onSetSectionsPending?.(cached.dateSensitiveStale);
        this.state.hasValidState = true;
        this.state.lastLoadedAt = cached.savedAt;
        this.deps.onSetLoading(false);
        cacheApplied = true;
        if (!wasAlreadyValid) {
          recordRouteOpen(telemetryIdentity, 'home', { cacheHit: true, durationMs: Date.now() - loadStartedAt });
        }
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
        this.deps.onSetSectionsPending?.(false);
        this.state.hasValidState = true;
        this.state.lastLoadedAt = Date.now();
        void writeHomeCache(cacheIdentity, guestPayload, timezone);
        this.deps.onSetLoading(false);
        this.deps.onSetError(false);
        if (!wasAlreadyValid && !cacheApplied) {
          recordRouteOpen(telemetryIdentity, 'home', { cacheHit: false, durationMs: Date.now() - loadStartedAt });
        }
      }
      return;
    }

    // 2. Fetch fresh network payload for authenticated user (deduplicated per identity)
    let inFlight = this.inFlightRequests.get(currentIdentityKey);
    if (!inFlight) {
      inFlight = (async () => {
        try {
          const response = await this.deps.fetchApi('/api/native/home-summary', {
            timeoutMs: HOME_SUMMARY_TIMEOUT_MS,
          });
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
        this.deps.onSetSectionsPending?.(false);
        this.state.hasValidState = true;
        this.state.lastLoadedAt = Date.now();
        this.deps.onSetLoading(false);
        this.deps.onSetError(false);

        const canonicalTimezone = safeTimezone(payload.date?.timezone || timezone);
        const canonicalSpiritualDate = spiritualDate(canonicalTimezone);
        void writeHomeCache(cacheIdentity, payload, canonicalTimezone, canonicalSpiritualDate);
        void syncStartupPreferencesFromProfile(
          payload.profile,
          canonicalTimezone,
          identity.userId
        );
        if (!wasAlreadyValid && !cacheApplied) {
          recordRouteOpen(telemetryIdentity, 'home', { cacheHit: false, durationMs: Date.now() - loadStartedAt });
        }
      }
    } catch (error) {
      if (requestGen === this.state.requestGen && this.state.lastIdentityKey === currentIdentityKey) {
        // apiFetch's own 15s timeout can race a slow-but-successful cold
        // response (confirmed live: a home-summary request that returned
        // 200 at ~15.0s was cancelled by this exact race). That's not a
        // real connectivity failure, so retry once before surfacing the
        // "check your connection" error -- matches the "benign race, not a
        // real backend/network problem" framing isFetchCancelled() and its
        // doc comment already establish in lib/api.ts.
        if (isFetchCancelled(error) && retryCount === 0 && !this.state.hasValidState) {
          return this.loadHome(identity, isManualRefresh, retryCount + 1);
        }
        if (!this.state.hasValidState) {
          this.deps.onSetError(true);
          recordRefreshFailure(telemetryIdentity, 'home');
        }
        this.deps.onSetLoading(false);
      }
    }
  }
}

export type PanchangCalendarStatus = 'ready' | 'pending' | 'unavailable';

export type PanchangRetryDependencies = {
  fetchApi: HomeFetchApi;
  // Merges (never replaces) the retry response's `panchang` object into
  // current Home state -- the caller's merge must be scoped to the
  // `panchang` key alone. A wholesale state replace here could stomp
  // other fields (e.g. an optimistic practice-completion toggle, or
  // mood/notification state updated by the independently-polled
  // /api/native/home-live) that changed while this retry was in flight.
  onMergePanchang: (panchang: Record<string, unknown>) => void;
  // Called once, only after every attempt in the sequence still reports
  // `calendarStatus: 'pending'` (or fails outright) -- the caller should
  // locally treat the pill as 'unavailable' rather than leaving a skeleton
  // rendered indefinitely.
  onExhausted: () => void;
  // Defaults to [2000, 5000, 10000]ms (roughly 2s/5s/10s after the
  // skeleton first appears). Overridable so tests don't have to wait out
  // real timers.
  delaysMs?: number[];
};

/**
 * Bounded silent retry while Home's observance pill is showing a
 * `calendarStatus: 'pending'` skeleton. `after()` on the backend may
 * finish materialization seconds later, but nothing else on Home would
 * otherwise trigger a refetch until the coordinator's own 5-minute
 * freshness window lapses -- this closes that gap with a short, bounded
 * sequence instead, then gives up rather than polling forever.
 */
export class PanchangRetryController {
  private deps: PanchangRetryDependencies;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private episodeId = 0;
  private cancelled = true;

  constructor(deps: PanchangRetryDependencies) {
    this.deps = deps;
  }

  /**
   * Cancels any in-flight episode and starts a fresh one.
   *
   * Attempts run strictly one at a time: the timer for attempt N+1 is only
   * scheduled after attempt N's own response (or failure) has been fully
   * handled, so there is never more than one request in flight for a given
   * episode. This is deliberate, not incidental -- an earlier version fired
   * all `delaysMs` timers independently up front, so a slower earlier
   * attempt's response (still `pending`) could arrive and get applied
   * *after* a faster later attempt's `ready` response, silently reviving a
   * skeleton the user had already seen resolve. Sequencing makes that
   * ordering bug structurally impossible instead of merely unlikely.
   * `delaysMs[i]` is therefore the gap after attempt i-1 *settles*, not a
   * fixed offset from episode start.
   */
  public start(): void {
    this.cancel();
    this.cancelled = false;
    const episodeId = ++this.episodeId;
    const delays = this.deps.delaysMs ?? [2000, 5000, 10000];

    const isCurrentEpisode = () => !this.cancelled && this.episodeId === episodeId;

    const runAttempt = (index: number) => {
      if (!isCurrentEpisode() || index >= delays.length) return;
      const isLastAttempt = index === delays.length - 1;

      const timer = setTimeout(() => {
        void (async () => {
          if (!isCurrentEpisode()) return;
          try {
            const response = await this.deps.fetchApi('/api/native/home-summary', { timeoutMs: 10_000 });
            if (!isCurrentEpisode()) return;
            if (!response.ok) {
              if (isLastAttempt) this.deps.onExhausted();
              else runAttempt(index + 1);
              return;
            }
            const payload = await response.json();
            if (!isCurrentEpisode()) return;
            if (payload?.panchang) {
              this.deps.onMergePanchang(payload.panchang);
            }
            if (payload?.panchang?.calendarStatus === 'pending') {
              if (isLastAttempt) this.deps.onExhausted();
              else runAttempt(index + 1);
            }
            // Otherwise resolved (ready or unavailable) -- stop, no next attempt.
          } catch {
            if (!isCurrentEpisode()) return;
            if (isLastAttempt) this.deps.onExhausted();
            else runAttempt(index + 1);
          }
        })();
      }, delays[index]);

      this.timers = [timer];
    };

    runAttempt(0);
  }

  private stopTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /** Stops the current episode (if any) without starting a new one. */
  public cancel(): void {
    this.cancelled = true;
    this.stopTimers();
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

  public async load(identity: HomeAuthIdentity, retryCount = 0): Promise<void> {
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
        } else if (isFetchCancelled(error) && retryCount === 0) {
          // apiFetch's own 15s timeout can race a slow-but-successful cold
          // response -- a benign race, not a real connectivity failure (see
          // the matching comment on HomeSummaryCoordinator.loadHome's catch
          // block, where this was confirmed live). Retry once, deferred so
          // it runs after `finally` below clears inFlightFetch -- calling
          // this.load() synchronously here would just return the
          // already-settling in-flight promise instead of starting fresh.
          setTimeout(() => {
            if (requestGen === this.state.requestGen) void this.load(identity, retryCount + 1);
          }, 0);
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
