import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAppIdentity } from '@/lib/appIdentity';
import { readerPrefsOwner } from '@/lib/readerPrefs';

// "Pick up where you left off" (Phase 3 of docs/READER_EXPERIENCE_GRAND_PLAN.md).
//
// Cache key dimensions (AGENTS.md §5): identity (user id or guest) + content
// id + content version (a screen-supplied string that changes when the text
// changes, e.g. language) + schema version. Position is stored as a fraction
// of the scrollable height so it survives a text-size change. Bounded to the
// 50 most recent items and 90 days. Reading history is private: it is per
// identity and cleared on sign-out / account switch (clearAllReadingProgress
// is in app/_layout.tsx's purge lists). Never stored when signed out.

export type ReadingPosition = {
  /** 0..1 of the scrollable distance, or the page index for paged readers. */
  ratio?: number;
  page?: number;
  /** Optional human label for the resume prompt (chapter / scene name). */
  label?: string;
  updatedAt: number;
};

type Store = { v: 1; entries: Record<string, ReadingPosition> };

export const READING_PROGRESS_MAX_ENTRIES = 50;
export const READING_PROGRESS_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const PREFIX = 'shoonaya:reading-progress:v1:';

export function readingProgressKey(contentId: string, version: string) {
  return `${contentId}@${version}`;
}

/** Drops entries older than 90 days and keeps only the 50 most recent. */
export function pruneReadingProgress(entries: Record<string, ReadingPosition>, now: number) {
  const fresh = Object.entries(entries)
    .filter(([, entry]) => Number.isFinite(entry.updatedAt) && now - entry.updatedAt <= READING_PROGRESS_MAX_AGE_MS)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, READING_PROGRESS_MAX_ENTRIES);
  return Object.fromEntries(fresh);
}

export function parseReadingProgress(raw: string | null): Record<string, ReadingPosition> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as Partial<Store>;
    if (value.v !== 1 || !value.entries || typeof value.entries !== 'object') return {};
    const entries: Record<string, ReadingPosition> = {};
    for (const [key, entry] of Object.entries(value.entries)) {
      if (!entry || typeof entry !== 'object' || typeof entry.updatedAt !== 'number') continue;
      const ratio = typeof entry.ratio === 'number' && entry.ratio >= 0 && entry.ratio <= 1 ? entry.ratio : undefined;
      const page = typeof entry.page === 'number' && Number.isInteger(entry.page) && entry.page >= 0 ? entry.page : undefined;
      if (ratio === undefined && page === undefined) continue;
      entries[key] = {
        updatedAt: entry.updatedAt,
        ...(ratio !== undefined ? { ratio } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(typeof entry.label === 'string' && entry.label ? { label: entry.label.slice(0, 80) } : {}),
      };
    }
    return entries;
  } catch {
    return {};
  }
}

let cacheOwner: string | null = null;
let cache: Record<string, ReadingPosition> | null = null;

async function loadEntries(owner: string) {
  if (cacheOwner === owner && cache) return cache;
  let entries: Record<string, ReadingPosition> = {};
  try {
    entries = parseReadingProgress(await AsyncStorage.getItem(PREFIX + owner));
  } catch {
    entries = {};
  }
  cacheOwner = owner;
  cache = entries;
  return entries;
}

/** The saved position for this content, or null (none, signed out, or failed). */
export async function getReadingPosition(contentId: string, version: string): Promise<ReadingPosition | null> {
  const owner = readerPrefsOwner(getAppIdentity());
  if (!owner) return null;
  const entries = await loadEntries(owner);
  if (readerPrefsOwner(getAppIdentity()) !== owner) return null; // identity changed while reading
  const entry = entries[readingProgressKey(contentId, version)];
  if (!entry || Date.now() - entry.updatedAt > READING_PROGRESS_MAX_AGE_MS) return null;
  return entry;
}

export async function saveReadingPosition(contentId: string, version: string, position: Omit<ReadingPosition, 'updatedAt'>) {
  const owner = readerPrefsOwner(getAppIdentity());
  if (!owner) return;
  const entries = await loadEntries(owner);
  if (readerPrefsOwner(getAppIdentity()) !== owner) return;
  const now = Date.now();
  const next = pruneReadingProgress({ ...entries, [readingProgressKey(contentId, version)]: { ...position, updatedAt: now } }, now);
  cache = next;
  try {
    await AsyncStorage.setItem(PREFIX + owner, JSON.stringify({ v: 1, entries: next } satisfies Store));
  } catch {
    // Best-effort
  }
}

export async function clearReadingPosition(contentId: string, version: string) {
  const owner = readerPrefsOwner(getAppIdentity());
  if (!owner) return;
  const entries = await loadEntries(owner);
  const key = readingProgressKey(contentId, version);
  if (!(key in entries)) return;
  const next = { ...entries };
  delete next[key];
  cache = next;
  try {
    await AsyncStorage.setItem(PREFIX + owner, JSON.stringify({ v: 1, entries: next } satisfies Store));
  } catch {
    // Best-effort
  }
}

export async function clearAllReadingProgress(): Promise<void> {
  cacheOwner = null;
  cache = null;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // Best-effort
  }
}

/** Whether a saved scroll position is worth offering (not the very top or end). */
export function isResumableRatio(ratio: number | undefined) {
  return typeof ratio === 'number' && ratio > 0.05 && ratio < 0.97;
}

/**
 * Chaptered readers (Dharm Veer / Vrat chapters): page = chapter, ratio = how
 * far down that chapter. Worth offering when past the start of chapter 1 and
 * not at the very end of the last chapter.
 */
export function isResumableChapterPosition(position: Pick<ReadingPosition, 'page' | 'ratio'> | null | undefined, chapters: number) {
  if (!position || chapters < 2) return false;
  const { page, ratio = 0 } = position;
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 0 || page >= chapters) return false;
  if (page === 0) return isResumableRatio(ratio);
  return !(page === chapters - 1 && ratio >= 0.97);
}

/** Paged readers: resume only past the first page and before the last (the last = finished). */
export function isResumablePage(page: number | undefined, total: number) {
  return typeof page === 'number' && Number.isInteger(page) && page > 0 && page < total - 1;
}
