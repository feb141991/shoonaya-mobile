import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDyutaMatchState, type DyutaMatchState } from './engine';

const STORAGE_KEY = 'shoonaya.dyuta.local-match.v1';
const SAVES_KEY = 'shoonaya.dyuta.saved-matches.v1';
const PREFERENCES_KEY = 'shoonaya.dyuta.preferences.v1';
const STORAGE_SCHEMA_VERSION = 4;
const MAX_SAVE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_DYUTA_SAVED_MATCHES = 5;
let preferenceWriteQueue: Promise<void> = Promise.resolve();
let savedMatchWriteQueue: Promise<void> = Promise.resolve();

type SaveEnvelope = {
  schemaVersion: number;
  savedAt: number;
  match: DyutaMatchState;
};

export type DyutaSavedMatch = {
  id: string;
  label: string;
  savedAt: number;
  match: DyutaMatchState;
};

export type DyutaPreferences = {
  hapticsEnabled: boolean;
  tutorialCompleted: boolean;
  unlockedFunFacts: number;
  completedMatches: number;
};

const DEFAULT_PREFERENCES: DyutaPreferences = {
  hapticsEnabled: true,
  tutorialCompleted: false,
  unlockedFunFacts: 0,
  completedMatches: 0,
};

export async function readDyutaMatch(now = Date.now()): Promise<DyutaMatchState | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let saved: Partial<SaveEnvelope>;
  try {
    saved = JSON.parse(raw) as Partial<SaveEnvelope>;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    return null;
  }

  try {
    const migratedMatch = migrateMatch(saved.match);
    if (
      typeof saved.savedAt !== 'number' ||
      !Number.isFinite(saved.savedAt) ||
      saved.savedAt > now ||
      now - saved.savedAt > MAX_SAVE_AGE_MS ||
      !migratedMatch
    ) {
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      return null;
    }
    if (saved.schemaVersion !== STORAGE_SCHEMA_VERSION || saved.match !== migratedMatch) {
      // Preserve the previous valid save if the upgrade write fails.
      await writeDyutaMatch(migratedMatch, saved.savedAt).catch(() => {});
    }
    return migratedMatch;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    return null;
  }
}

function migrateMatch(value: unknown): DyutaMatchState | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const legacy = value as Record<string, unknown>;
  // The bluffing rules have a different state machine and scoring contract.
  // Old prototype matches cannot be migrated without inventing declarations.
  return legacy.schemaVersion === STORAGE_SCHEMA_VERSION && isDyutaMatchState(legacy) ? legacy : null;
}

export async function writeDyutaMatch(match: DyutaMatchState, now = Date.now()): Promise<void> {
  if (!isDyutaMatchState(match)) throw new TypeError('Refusing to save an invalid Dyuta match.');
  const envelope: SaveEnvelope = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    savedAt: now,
    match,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

export async function readDyutaSavedMatches(): Promise<DyutaSavedMatch[]> {
  let raw: string | null;
  try { raw = await AsyncStorage.getItem(SAVES_KEY); } catch { return []; }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError('Invalid saved match list');
    return parsed
      .filter((item): item is DyutaSavedMatch => !!item && typeof item === 'object')
      .filter((item) => typeof item.id === 'string' && typeof item.label === 'string' && Number.isFinite(item.savedAt) && isDyutaMatchState(item.match))
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, MAX_DYUTA_SAVED_MATCHES);
  } catch {
    await AsyncStorage.removeItem(SAVES_KEY).catch(() => {});
    return [];
  }
}

export async function saveDyutaMatchCopy(match: DyutaMatchState, now = Date.now()): Promise<DyutaSavedMatch> {
  if (!isDyutaMatchState(match)) throw new TypeError('Refusing to save an invalid Dyuta match.');
  return serializeSavedMatchMutation(async () => {
    const existing = await readDyutaSavedMatches();
    if (existing.length >= MAX_DYUTA_SAVED_MATCHES) throw new Error('All local save slots are full. Delete a saved match before saving another.');
    const save: DyutaSavedMatch = {
      id: `dyuta-${now}-${Math.random().toString(36).slice(2, 8)}`,
      label: `${match.mode === 'solo' ? 'Solo' : 'Pass and play'} · ${match.phase === 'complete' ? 'Complete' : `Round ${match.round} of 7`}`,
      savedAt: now,
      match,
    };
    await AsyncStorage.setItem(SAVES_KEY, JSON.stringify([save, ...existing]));
    return save;
  });
}

export async function deleteDyutaSavedMatch(id: string): Promise<void> {
  await serializeSavedMatchMutation(async () => {
    const existing = await readDyutaSavedMatches();
    await AsyncStorage.setItem(SAVES_KEY, JSON.stringify(existing.filter((save) => save.id !== id)));
  });
}

function serializeSavedMatchMutation<T>(mutation: () => Promise<T>): Promise<T> {
  let result!: T;
  const operation = savedMatchWriteQueue.catch(() => {}).then(async () => {
    result = await mutation();
  });
  savedMatchWriteQueue = operation;
  return operation.then(() => result);
}

export async function readDyutaPreferences(): Promise<DyutaPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFERENCES;
    return {
      hapticsEnabled: typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : DEFAULT_PREFERENCES.hapticsEnabled,
      tutorialCompleted: parsed.tutorialCompleted === true,
      unlockedFunFacts: Number.isInteger(parsed.unlockedFunFacts) ? Math.max(0, Math.min(3, parsed.unlockedFunFacts)) : 0,
      completedMatches: Number.isInteger(parsed.completedMatches) ? Math.max(0, parsed.completedMatches) : 0,
    };
  } catch { return DEFAULT_PREFERENCES; }
}

export async function writeDyutaPreferences(patch: Partial<DyutaPreferences>): Promise<DyutaPreferences> {
  return updateDyutaPreferences((current) => ({ ...current, ...patch }));
}

export async function markDyutaTutorialCompleted(): Promise<DyutaPreferences> {
  return updateDyutaPreferences((current) => ({
    ...current,
    tutorialCompleted: true,
    unlockedFunFacts: Math.max(1, current.unlockedFunFacts),
  }));
}

export async function recordDyutaMatchCompletion(): Promise<DyutaPreferences> {
  return updateDyutaPreferences((current) => ({
    ...current,
    completedMatches: current.completedMatches + 1,
    unlockedFunFacts: Math.min(3, Math.max(1, current.unlockedFunFacts) + 1),
  }));
}

function updateDyutaPreferences(update: (current: DyutaPreferences) => DyutaPreferences): Promise<DyutaPreferences> {
  let result: DyutaPreferences = DEFAULT_PREFERENCES;
  const operation = preferenceWriteQueue.catch(() => {}).then(async () => {
    const current = await readDyutaPreferences();
    result = update(current);
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(result));
  });
  preferenceWriteQueue = operation;
  return operation.then(() => result);
}

export async function clearDyutaMatch(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
