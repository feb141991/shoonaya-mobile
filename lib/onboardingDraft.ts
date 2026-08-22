import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TraditionKey, LanguageKey, Step, NotificationChoice } from './onboarding-contract';
import type { GenderKey, LifeStageKey, CalendarProfileSlug, CalendarScopeSlug } from './profile-constants';

export const ONBOARDING_DRAFT_SCHEMA_VERSION = 1;
export const ONBOARDING_DRAFT_PREFIX = 'shoonaya_onboarding_draft_v1_';
export const ONBOARDING_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL

/**
 * StorageAdapter — abstract storage interface allowing production code
 * and unit tests to inject deterministic, controllable storage drivers.
 */
export type StorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
};

export type Clock = {
  now(): number;
};

export const asyncStorageAdapter: StorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
  getAllKeys: () => AsyncStorage.getAllKeys(),
  multiRemove: (keys: readonly string[]) => AsyncStorage.multiRemove([...keys]),
};

export const systemClock: Clock = {
  now: () => Date.now(),
};

/**
 * OnboardingDraftData — User-scoped in-flight onboarding preference state.
 *
 * Privacy & Security Invariants:
 * 1. `notificationChoice` captures the user's explicit intent ('enabled' | 'disabled' | 'unset').
 *    Dynamic OS-level permission is strictly NOT persisted as durable draft state.
 * 2. Sensitive data excluded: auth tokens, passwords, payment info, reflection notes.
 * 3. Retained field rationale:
 *    - `dateOfBirth`: Used to derive life stage and astrological preferences across navigation.
 *    - `gender`: Used to tailor gender context in sacred verses.
 *    - `gotra`, `rashi`, `nakshatra`: Used for personalized Hindu calendar/panchang calculations.
 *    - `name`: Used for name story and personalized greetings.
 * 4. User isolation: Keyed strictly per user (`shoonaya_onboarding_draft_v1_<userId>`)
 *    and immediately purged on onboarding completion or account sign-out.
 */
export type OnboardingDraftData = {
  step: Step;
  tradition: TraditionKey | null;
  language: LanguageKey | null;
  dateOfBirth: string;
  gender: GenderKey;
  lifeStage: LifeStageKey | null;
  isManualLifeStage: boolean;
  rashi: string;
  nakshatra: string;
  gotra: string;
  calendarProfile: CalendarProfileSlug | '';
  calendarScope: CalendarScopeSlug | '';
  goals: string[];
  name: string;
  notificationChoice?: NotificationChoice;
  deniedNotificationPromptShown?: boolean;
};

export type OnboardingDraftEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  data: OnboardingDraftData;
};

export function getDraftStorageKey(userId: string): string {
  return `${ONBOARDING_DRAFT_PREFIX}${userId}`;
}

/**
 * OnboardingDraftStore — Production user-scoped draft store.
 * Coordinates monotonic per-user sequence numbering, isolated user queues,
 * and epoch-based invalidation on draft clearance.
 */
export class OnboardingDraftStore {
  private storage: StorageAdapter;
  private clock: Clock;

  private userNextSeq = new Map<string, number>();
  private userCompletedSeq = new Map<string, number>();
  private userEpochs = new Map<string, number>();
  private userQueues = new Map<string, Promise<void>>();

  constructor(storage: StorageAdapter = asyncStorageAdapter, clock: Clock = systemClock) {
    this.storage = storage;
    this.clock = clock;
  }

  /**
   * Saves a user's onboarding draft in strict monotonic order.
   * Snapshots data immediately at call time so rapid in-flight state transitions
   * cannot leak or overwrite newer navigation steps.
   */
  public async saveDraft(userId: string, data: OnboardingDraftData): Promise<void> {
    if (!userId) return;

    // Snapshot draft data immediately
    const snapshot: OnboardingDraftData = { ...data };

    // Allocate monotonic sequence number and capture current epoch for this user
    const seq = (this.userNextSeq.get(userId) ?? 0) + 1;
    this.userNextSeq.set(userId, seq);
    const epoch = this.userEpochs.get(userId) ?? 0;

    const prevTask = this.userQueues.get(userId) ?? Promise.resolve();
    const currentTask = prevTask
      .then(async () => {
        // If clear was called (epoch advanced) or a newer sequence was completed, discard obsolete write
        if ((this.userEpochs.get(userId) ?? 0) !== epoch) return;
        if (seq <= (this.userCompletedSeq.get(userId) ?? 0)) return;

        const envelope: OnboardingDraftEnvelope = {
          schemaVersion: ONBOARDING_DRAFT_SCHEMA_VERSION,
          userId,
          savedAt: this.clock.now(),
          data: snapshot,
        };

        await this.storage.setItem(getDraftStorageKey(userId), JSON.stringify(envelope));

        if ((this.userEpochs.get(userId) ?? 0) === epoch) {
          this.userCompletedSeq.set(userId, seq);
        }
      })
      .catch((err) => {
        console.warn('[OnboardingDraftStore] save failed', err);
      });

    this.userQueues.set(userId, currentTask);
    return currentTask;
  }

  /**
   * Reads and validates the user-scoped draft with schema, ownership, and TTL expiration checks.
   */
  public async readDraft(userId: string, nowOverride?: number): Promise<OnboardingDraftData | null> {
    if (!userId) return null;
    const now = nowOverride ?? this.clock.now();

    try {
      const raw = await this.storage.getItem(getDraftStorageKey(userId));
      if (!raw) return null;

      let parsed: OnboardingDraftEnvelope;
      try {
        parsed = JSON.parse(raw);
      } catch {
        await this.storage.removeItem(getDraftStorageKey(userId)).catch(() => {});
        return null;
      }

      if (
        !parsed ||
        parsed.schemaVersion !== ONBOARDING_DRAFT_SCHEMA_VERSION ||
        parsed.userId !== userId ||
        !parsed.data ||
        typeof parsed.data !== 'object' ||
        typeof parsed.savedAt !== 'number' ||
        parsed.savedAt <= 0 ||
        parsed.savedAt > now + 60000 || // Future timestamp guard
        now - parsed.savedAt > ONBOARDING_DRAFT_TTL_MS // 7 days TTL
      ) {
        await this.storage.removeItem(getDraftStorageKey(userId)).catch(() => {});
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }

  /**
   * Clears onboarding draft for a specific user and invalidates all pending writes for that user.
   */
  public async clearDraft(userId: string): Promise<void> {
    if (!userId) return;

    // Advance epoch so any queued or in-flight save is dropped
    this.userEpochs.set(userId, (this.userEpochs.get(userId) ?? 0) + 1);
    this.userCompletedSeq.set(userId, Number.MAX_SAFE_INTEGER);

    try {
      await this.storage.removeItem(getDraftStorageKey(userId));
    } catch {}
  }

  /**
   * Clears all onboarding drafts and invalidates pending writes across all users.
   */
  public async clearAllDrafts(): Promise<void> {
    // Invalidate all pending user queues
    for (const userId of this.userEpochs.keys()) {
      this.userEpochs.set(userId, (this.userEpochs.get(userId) ?? 0) + 1);
      this.userCompletedSeq.set(userId, Number.MAX_SAFE_INTEGER);
    }

    try {
      const allKeys = await this.storage.getAllKeys();
      const draftKeys = allKeys.filter((k) => k.startsWith(ONBOARDING_DRAFT_PREFIX));
      if (draftKeys.length > 0) {
        await this.storage.multiRemove(draftKeys);
      }
    } catch {}
  }
}

export const defaultDraftStore = new OnboardingDraftStore(asyncStorageAdapter, systemClock);

export async function saveOnboardingDraft(userId: string, data: OnboardingDraftData): Promise<void> {
  return defaultDraftStore.saveDraft(userId, data);
}

export async function readOnboardingDraft(userId: string, now?: number): Promise<OnboardingDraftData | null> {
  return defaultDraftStore.readDraft(userId, now);
}

export async function clearOnboardingDraft(userId: string): Promise<void> {
  return defaultDraftStore.clearDraft(userId);
}

export async function clearAllOnboardingDrafts(): Promise<void> {
  return defaultDraftStore.clearAllDrafts();
}
