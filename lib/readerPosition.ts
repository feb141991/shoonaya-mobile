import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppIdentity } from '@/lib/appIdentity';

export interface SavedReaderPosition {
  contentId: string;
  contentVersion: string;
  sectionTitle?: string;
  sectionIndex?: number;
  scrollOffsetY: number;
  updatedAt: number;
}

export interface StoredPositionRecord {
  schemaVersion: number;
  entries: Record<string, SavedReaderPosition>;
}

export const READER_POSITION_SCHEMA_VERSION = 1;
export const MAX_STORED_POSITIONS = 50;
export const MAX_POSITION_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
export const MIN_SCROLL_OFFSET_TO_SAVE = 100;

function resolveUserKey(explicitUserKey?: string): string {
  if (explicitUserKey && explicitUserKey.trim()) {
    return explicitUserKey.trim();
  }
  try {
    const identity = getAppIdentity();
    if (identity && identity.kind === 'authenticated' && identity.userId) {
      return identity.userId;
    }
  } catch {
    // Fail safe
  }
  return 'guest';
}

function getStorageKey(userKey: string): string {
  return `@shoonaya/reader_positions_v1:${userKey}`;
}

/**
 * Loads stored position record for a given user key.
 */
async function loadRecord(userKey: string): Promise<StoredPositionRecord> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(userKey));
    if (!raw) {
      return { schemaVersion: READER_POSITION_SCHEMA_VERSION, entries: {} };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== READER_POSITION_SCHEMA_VERSION || typeof parsed.entries !== 'object') {
      return { schemaVersion: READER_POSITION_SCHEMA_VERSION, entries: {} };
    }
    return parsed as StoredPositionRecord;
  } catch {
    return { schemaVersion: READER_POSITION_SCHEMA_VERSION, entries: {} };
  }
}

/**
 * Saves position record to AsyncStorage.
 */
async function writeRecord(userKey: string, record: StoredPositionRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKey(userKey), JSON.stringify(record));
  } catch {
    // Fail safe
  }
}

/**
 * Retrieves the saved reading position for a specific content item.
 * Discards entries that have expired (> 90 days) or whose contentVersion does not match.
 */
export async function getReaderPosition(params: {
  contentId: string;
  contentVersion?: string;
  userKey?: string;
}): Promise<SavedReaderPosition | null> {
  const { contentId, contentVersion = '1.0', userKey: explicitKey } = params;
  if (!contentId) return null;

  const userKey = resolveUserKey(explicitKey);
  const record = await loadRecord(userKey);
  const entry = record.entries[contentId];

  if (!entry) return null;

  const now = Date.now();
  // Discard expired entries (> 90 days)
  if (now - entry.updatedAt > MAX_POSITION_AGE_MS) {
    delete record.entries[contentId];
    await writeRecord(userKey, record);
    return null;
  }

  // Discard if content version does not match
  if (contentVersion && entry.contentVersion !== contentVersion) {
    delete record.entries[contentId];
    await writeRecord(userKey, record);
    return null;
  }

  return entry;
}

/**
 * Saves the current reading position for a content item.
 * Prunes expired entries and caps total stored items at MAX_STORED_POSITIONS (50).
 */
export async function saveReaderPosition(params: {
  contentId: string;
  contentVersion?: string;
  scrollOffsetY: number;
  sectionTitle?: string;
  sectionIndex?: number;
  userKey?: string;
  updatedAt?: number;
}): Promise<void> {
  const {
    contentId,
    contentVersion = '1.0',
    scrollOffsetY,
    sectionTitle,
    sectionIndex,
    userKey: explicitKey,
    updatedAt: explicitUpdatedAt,
  } = params;

  if (!contentId) return;

  const userKey = resolveUserKey(explicitKey);
  const record = await loadRecord(userKey);
  const now = explicitUpdatedAt ?? Date.now();

  // A folio/scene reader can have a meaningful section index while its
  // scroll offset stays at zero. Preserve those chapter-only positions;
  // continuous readers still clear a near-top scroll with no section.
  const hasMeaningfulSection = typeof sectionIndex === 'number' && sectionIndex > 0;
  if (scrollOffsetY < MIN_SCROLL_OFFSET_TO_SAVE && !hasMeaningfulSection) {
    if (record.entries[contentId]) {
      delete record.entries[contentId];
      await writeRecord(userKey, record);
    }
    return;
  }

  // 1. Prune expired entries
  for (const id of Object.keys(record.entries)) {
    if (now - record.entries[id].updatedAt > MAX_POSITION_AGE_MS) {
      delete record.entries[id];
    }
  }

  // 2. Set/update the current position
  record.entries[contentId] = {
    contentId,
    contentVersion,
    scrollOffsetY: Math.round(scrollOffsetY),
    sectionTitle,
    sectionIndex,
    updatedAt: now,
  };

  // 3. Enforce maximum items bound (50) by keeping most recently updated
  const keys = Object.keys(record.entries);
  if (keys.length > MAX_STORED_POSITIONS) {
    keys.sort((a, b) => record.entries[b].updatedAt - record.entries[a].updatedAt);
    const pruned: Record<string, SavedReaderPosition> = {};
    for (let i = 0; i < MAX_STORED_POSITIONS; i++) {
      pruned[keys[i]] = record.entries[keys[i]];
    }
    record.entries = pruned;
  }

  await writeRecord(userKey, record);
}

/**
 * Clears saved position for a specific content item (e.g. when user chooses "Start over").
 */
export async function clearReaderPosition(params: {
  contentId: string;
  userKey?: string;
}): Promise<void> {
  const { contentId, userKey: explicitKey } = params;
  if (!contentId) return;

  const userKey = resolveUserKey(explicitKey);
  const record = await loadRecord(userKey);
  if (record.entries[contentId]) {
    delete record.entries[contentId];
    await writeRecord(userKey, record);
  }
}

/**
 * Clears all saved positions for a given user key or the current user.
 */
export async function clearAllReaderPositions(explicitUserKey?: string): Promise<void> {
  const userKey = resolveUserKey(explicitUserKey);
  try {
    await AsyncStorage.removeItem(getStorageKey(userKey));
  } catch {
    // Fail safe
  }
}
