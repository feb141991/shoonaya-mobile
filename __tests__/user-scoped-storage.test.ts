import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() {
        return memoryStore.size;
      },
      key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import { setAppIdentity, type AppIdentity } from '@/lib/appIdentity';
import {
  LEGACY_UNSCOPED_KEYS,
  LEGACY_UNSCOPED_PREFIXES,
  USER_SCOPED_NAMES,
  clearAllUserScopedStorage,
  readUserScoped,
  userScopedKey,
  writeUserScoped,
} from '@/lib/userScopedStorage';
import {
  PROGRESS_CACHE_MAX_AGE_MS,
  PROGRESS_CACHE_SCHEMA_VERSION,
  parseProgressCache,
  serializeProgressCache,
} from '@/lib/progressCache';

const ROOT = new URL('..', import.meta.url).pathname;
const userA: AppIdentity = { kind: 'authenticated', userId: 'user-a' };
const userB: AppIdentity = { kind: 'authenticated', userId: 'user-b' };
const guest: AppIdentity = { kind: 'guest' };

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    if (entry === 'graphify-out' || entry === 'node_modules') continue;
    const path = join(ROOT, dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(relative(ROOT, path)));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(relative(ROOT, path));
  }
  return out;
}

describe('user-scoped private storage (AGENTS.md sections 5, 13 and 23)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setAppIdentity(userA);
  });

  it('files a value under its owner, so another account or a guest on the same device reads nothing', async () => {
    await writeUserScoped(userA, USER_SCOPED_NAMES.progress, 'A progress');
    assert.equal(await readUserScoped(userA, USER_SCOPED_NAMES.progress), 'A progress');

    setAppIdentity(userB);
    assert.equal(await readUserScoped(userB, USER_SCOPED_NAMES.progress), null);
    setAppIdentity(guest);
    assert.equal(await readUserScoped(guest, USER_SCOPED_NAMES.progress), null);

    const keys = await AsyncStorage.getAllKeys();
    assert.deepEqual(keys, [userScopedKey(userA, USER_SCOPED_NAMES.progress)]);
    assert.ok(keys[0]?.includes('user-a'));
  });

  it('has no owner while identity is loading or signed out, and stores nothing then', async () => {
    assert.equal(userScopedKey({ kind: 'loading' }, 'x'), null);
    assert.equal(userScopedKey({ kind: 'unauthenticated' }, 'x'), null);
    setAppIdentity({ kind: 'unauthenticated' });
    await writeUserScoped({ kind: 'unauthenticated' }, USER_SCOPED_NAMES.nameStory, 'story');
    assert.deepEqual(await AsyncStorage.getAllKeys(), []);
  });

  it('drops a late write for a person who is no longer signed in', async () => {
    setAppIdentity(userB);
    await writeUserScoped(userA, USER_SCOPED_NAMES.nameStory, 'late A story');
    assert.deepEqual(await AsyncStorage.getAllKeys(), []);
  });

  it('removes every scoped value and every legacy unscoped key an older build left behind', async () => {
    await writeUserScoped(userA, USER_SCOPED_NAMES.japaCustomMantra, 'my mantra');
    setAppIdentity(guest);
    await writeUserScoped(guest, `${USER_SCOPED_NAMES.vratMode}:ekadashi`, 'nirjala');
    for (const key of LEGACY_UNSCOPED_KEYS) await AsyncStorage.setItem(key, 'old');
    for (const prefix of LEGACY_UNSCOPED_PREFIXES) await AsyncStorage.setItem(`${prefix}ekadashi`, 'old');
    await AsyncStorage.setItem('sangam_theme_preference', 'dark');

    await clearAllUserScopedStorage();

    assert.deepEqual(await AsyncStorage.getAllKeys(), ['sangam_theme_preference']);
  });

  it('returns nothing for a read that a purge overtakes', async () => {
    await writeUserScoped(userA, USER_SCOPED_NAMES.progress, 'A progress');
    const pending = readUserScoped(userA, USER_SCOPED_NAMES.progress);
    void clearAllUserScopedStorage();
    assert.equal(await pending, null);
  });
});

describe('My Progress saved copy', () => {
  const now = 1_800_000_000_000;

  it('accepts a fresh envelope and returns its payload and save time', () => {
    const parsed = parseProgressCache<{ totalJapaSessions: number }>(
      serializeProgressCache({ totalJapaSessions: 4 }, now - 1000),
      now,
    );
    assert.equal(parsed?.payload.totalJapaSessions, 4);
    assert.equal(parsed?.savedAt, now - 1000);
  });

  it('rejects anything older than the bound, from the future, from another schema, or malformed', () => {
    assert.equal(parseProgressCache(serializeProgressCache({}, now - PROGRESS_CACHE_MAX_AGE_MS - 1), now), null);
    assert.equal(parseProgressCache(serializeProgressCache({}, now + 60_000), now), null);
    assert.equal(
      parseProgressCache(JSON.stringify({ schemaVersion: PROGRESS_CACHE_SCHEMA_VERSION - 1, savedAt: now, payload: {} }), now),
      null,
    );
    // The pre-fix format: a bare payload with no owner, version or time.
    assert.equal(parseProgressCache(JSON.stringify({ profile: null, malaSessions30d: [] }), now), null);
    for (const raw of [null, '', '   ', 'not json', '[]', 'null', '{"schemaVersion":3,"savedAt":"yesterday","payload":{}}']) {
      assert.equal(parseProgressCache(raw, now), null, String(raw));
    }
  });
});

describe('no private value is stored without an owner', () => {
  it('My Progress, Name Story, Japa, Dharm Veer and Vrat go through userScopedStorage, not raw unscoped keys', () => {
    const offenders: string[] = [];
    for (const file of [...sourceFiles('app'), ...sourceFiles('components'), ...sourceFiles('lib')]) {
      if (file === 'lib/userScopedStorage.ts') continue;
      const text = readFileSync(join(ROOT, file), 'utf8');
      for (const key of LEGACY_UNSCOPED_KEYS) if (text.includes(`'${key}'`)) offenders.push(`${file}: ${key}`);
      for (const prefix of LEGACY_UNSCOPED_PREFIXES) if (text.includes(prefix)) offenders.push(`${file}: ${prefix}`);
    }
    assert.deepEqual(offenders, []);
  });

  it('My Progress has no direct AsyncStorage access left', () => {
    const screen = readFileSync(join(ROOT, 'app/my-progress.tsx'), 'utf8');
    assert.doesNotMatch(screen, /AsyncStorage/);
    assert.match(screen, /readUserScoped\(appIdentity, USER_SCOPED_NAMES\.progress\)/);
    assert.match(screen, /if \(!lease\.isCurrent\(\)\) return;/);
  });

  it('My Progress does not refetch on its own data (each response used to trigger the next request)', () => {
    const screen = readFileSync(join(ROOT, 'app/my-progress.tsx'), 'utf8');
    assert.doesNotMatch(screen, /\[appIdentity, data\]/);
    assert.match(screen, /hasDataRef\.current/);
  });

  it('every sign-out and account-switch cleanup clears user-scoped storage', () => {
    const layout = readFileSync(join(ROOT, 'app/_layout.tsx'), 'utf8');
    const niti = layout.match(/void clearAllNitiTreasury\(\);/g) ?? [];
    const scoped = layout.match(/void clearAllUserScopedStorage\(\);/g) ?? [];
    assert.ok(niti.length >= 3);
    assert.equal(scoped.length, niti.length);
  });

  // Screens and components may touch AsyncStorage directly only for values that are already keyed by the user,
  // device preferences, or UI flags. A new file needs a cache module or userScopedStorage, or a reason here.
  // This list may only shrink.
  const DIRECT_ASYNC_STORAGE_ALLOWED: Record<string, string> = {
    'app/_layout.tsx': 'startup receipt (no personal data) and onboarding flag keyed by user id',
    'app/nitya-karma.tsx': 'nitya_done_<userId>_<date>, ashrama_checks_<userId>_<date>',
    'app/nitya-ashrama.tsx': 'ashrama_checks_<userId>_<date>',
    'app/nitya-dincharya.tsx': 'nitya_done_<userId>_<date>',
    'app/settings/detail-screen.tsx': 'theme preference',
    'app/dharm-veer.tsx': 'guest-only daily flag; history moved to userScopedStorage',
    'app/dharm-veer/[id].tsx': 'daily flag keyed by user id (guest: guest-only)',
    'app/pathshala/[pathId]/[lessonId].tsx': 'font size preference',
    'components/reader/ReaderIntro.tsx': 'reader intro seen flag',
    'components/reader/ReaderShell.tsx': 'reader intro seen flag',
    'components/home/FirstWeekGuide.tsx': 'keys from getFirstWeekGuideKeys(identity)',
    'components/home/BrahmaMuhurtaPrompt.tsx': 'per-day dismiss flag',
  };

  it('no new screen or component writes AsyncStorage directly', () => {
    const direct = [...sourceFiles('app'), ...sourceFiles('components')].filter((file) =>
      /AsyncStorage\.(setItem|getItem|multiGet|multiSet|mergeItem)\(/.test(readFileSync(join(ROOT, file), 'utf8')),
    );
    const unexpected = direct.filter((file) => !(file in DIRECT_ASYNC_STORAGE_ALLOWED));
    assert.deepEqual(unexpected, []);
  });
});
