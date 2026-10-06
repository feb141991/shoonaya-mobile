import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { getAppIdentity, useAppIdentity, type AppIdentity } from '@/lib/appIdentity';

// Reader preferences that apply across every reader (ReaderShell screens,
// Panchatantra storybook, Pathshala lessons).
//
// Cache key dimensions (AGENTS.md §5): identity (user id or guest) + schema
// version. Not language-, tradition- or content-specific. Contains no private
// content, but is still per identity and cleared on sign-out / account switch
// (clearAllReaderPrefs is in app/_layout.tsx's purge lists) so one person's
// choices never carry over to the next account on a shared phone.

export type ReaderPrefs = {
  /** Controls stay visible (the ⛶ button). */
  pinned: boolean;
  /** "Tap the page to show controls" hint already shown. */
  tapHintSeen: boolean;
};

export const DEFAULT_READER_PREFS: ReaderPrefs = { pinned: false, tapHintSeen: false };

const PREFIX = 'shoonaya:reader-prefs:v1:';

export function readerPrefsOwner(identity: AppIdentity): string | null {
  if (identity.kind === 'authenticated') return `user_${identity.userId}`;
  if (identity.kind === 'guest') return 'guest';
  return null;
}

export function parseReaderPrefs(raw: string | null): ReaderPrefs {
  if (!raw) return DEFAULT_READER_PREFS;
  try {
    const value = JSON.parse(raw) as Partial<ReaderPrefs> & { v?: number };
    if (value.v !== 1) return DEFAULT_READER_PREFS;
    return {
      pinned: value.pinned === true,
      tapHintSeen: value.tapHintSeen === true,
    };
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

let owner: string | null = null;
let current: ReaderPrefs = DEFAULT_READER_PREFS;
let loadedFor: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

async function loadFor(nextOwner: string | null) {
  owner = nextOwner;
  current = DEFAULT_READER_PREFS;
  loadedFor = null;
  notify();
  if (!nextOwner) return;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + nextOwner);
    if (owner !== nextOwner) return; // identity changed while reading
    current = parseReaderPrefs(raw);
  } catch {
    current = DEFAULT_READER_PREFS;
  }
  loadedFor = nextOwner;
  notify();
}

export function getReaderPrefs(): ReaderPrefs {
  return current;
}

export async function setReaderPrefs(patch: Partial<ReaderPrefs>) {
  const writeOwner = readerPrefsOwner(getAppIdentity());
  if (!writeOwner || writeOwner !== owner) return;
  current = { ...current, ...patch };
  notify();
  try {
    await AsyncStorage.setItem(PREFIX + writeOwner, JSON.stringify({ v: 1, ...current }));
  } catch {
    // Best-effort: the choice still applies for this session.
  }
}

export async function clearAllReaderPrefs(): Promise<void> {
  current = DEFAULT_READER_PREFS;
  loadedFor = null;
  owner = null;
  notify();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // Best-effort
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** Current identity's reader prefs; `loaded` is false until storage was read. */
export function useReaderPrefs(): { prefs: ReaderPrefs; loaded: boolean } {
  const identity = useAppIdentity();
  const identityOwner = readerPrefsOwner(identity);
  useEffect(() => {
    if (identityOwner !== owner || (identityOwner && loadedFor !== identityOwner)) void loadFor(identityOwner);
  }, [identityOwner]);
  const prefs = useSyncExternalStore(subscribe, getReaderPrefs, getReaderPrefs);
  const matches = identityOwner === owner;
  return { prefs: matches ? prefs : DEFAULT_READER_PREFS, loaded: matches && loadedFor === identityOwner && identityOwner !== null };
}
