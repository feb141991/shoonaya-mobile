import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() { return memoryStore.size; },
      key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDyutaMatch, keepPlayerRoll, rollForPlayer } from '../lib/dyuta/engine';
import {
  clearDyutaMatch,
  deleteDyutaSavedMatch,
  markDyutaTutorialCompleted,
  readDyutaMatch,
  readDyutaPreferences,
  readDyutaSavedMatches,
  recordDyutaMatchCompletion,
  saveDyutaMatchCopy,
  writeDyutaMatch,
  writeDyutaPreferences,
} from '../lib/dyuta/storage';

const STORAGE_KEY = 'shoonaya.dyuta.local-match.v1';
const SAVES_KEY = 'shoonaya.dyuta.saved-matches.v1';
const PREFERENCES_KEY = 'shoonaya.dyuta.preferences.v1';
const NOW = Date.UTC(2026, 9, 6, 12);

describe('Dyuta local save and resume', () => {
  beforeEach(async () => {
    await clearDyutaMatch();
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(SAVES_KEY);
    await AsyncStorage.removeItem(PREFERENCES_KEY);
  });

  it('persists and restores a validated in-progress match', async () => {
    const match = keepPlayerRoll(rollForPlayer(createDyutaMatch(), [4, 6]));
    await writeDyutaMatch(match, NOW);

    assert.deepEqual(await readDyutaMatch(NOW + 1_000), match);
  });

  it('migrates a valid v1 solo save without discarding the match', async () => {
    const legacyMatch = {
      schemaVersion: 1,
      rulesetId: 'open-throw-v1',
      guideStyle: 'steady',
      round: 1,
      activeSide: 'guide',
      phase: 'awaiting_roll',
      totals: { player: 10, guide: 0 },
      history: [{ round: 1, side: 'player', initialDice: [4, 6], finalDice: [4, 6], rerolledIndex: null, points: 10 }],
      currentRoll: null,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, savedAt: NOW, match: legacyMatch }));

    const migrated = await readDyutaMatch(NOW + 1);
    assert.equal(migrated?.schemaVersion, 3);
    assert.equal(migrated?.mode, 'solo');
    assert.deepEqual(migrated?.playerNames, { player: 'You', guide: 'Guide' });
    assert.equal(migrated?.guideDifficulty, 'medium');
    assert.equal(migrated?.totals.player, 10);
    const persisted = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? 'null') as { schemaVersion?: number };
    assert.equal(persisted.schemaVersion, 3);
  });

  it('migrates the previous schema and maps its two guide policies to the equivalent three-level difficulty', async () => {
    const oldMatch = {
      ...createDyutaMatch(),
      schemaVersion: 2,
      guideStyle: 'steady',
    } as Record<string, unknown>;
    delete oldMatch.guideDifficulty;
    delete oldMatch.identities;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 2, savedAt: NOW, match: oldMatch }));

    const migrated = await readDyutaMatch(NOW + 1);
    assert.equal(migrated?.schemaVersion, 3);
    assert.equal(migrated?.guideDifficulty, 'medium');
    assert.equal(migrated?.identities.player.faction, 'pandavas');
  });

  it('rejects corrupted, impossible, future-dated and expired saves', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{broken');
    assert.equal(await readDyutaMatch(NOW), null);
    assert.equal(await AsyncStorage.getItem(STORAGE_KEY), null, 'Corrupt local save is cleared after rejection');

    await writeDyutaMatch(createDyutaMatch(), NOW + 1);
    assert.equal(await readDyutaMatch(NOW), null);

    await writeDyutaMatch(createDyutaMatch(), NOW - 31 * 24 * 60 * 60 * 1000);
    assert.equal(await readDyutaMatch(NOW), null);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      savedAt: NOW,
      match: { ...createDyutaMatch(), totals: { player: 600, guide: 0 } },
    }));
    assert.equal(await readDyutaMatch(NOW), null);
  });

  it('clears the local match explicitly', async () => {
    await writeDyutaMatch(createDyutaMatch(), NOW);
    await clearDyutaMatch();
    assert.equal(await AsyncStorage.getItem(STORAGE_KEY), null);
  });

  it('keeps up to five manual save copies independently from the autosaved active match', async () => {
    const match = keepPlayerRoll(rollForPlayer(createDyutaMatch(), [4, 6]));
    await writeDyutaMatch(match, NOW);
    const saved = await saveDyutaMatchCopy(match, NOW + 1);
    assert.equal((await readDyutaSavedMatches()).length, 1);
    await writeDyutaMatch(createDyutaMatch('hard'), NOW + 2);
    assert.deepEqual(await readDyutaMatch(NOW + 2), createDyutaMatch('hard'));
    assert.deepEqual((await readDyutaSavedMatches())[0].match, match);
    await deleteDyutaSavedMatch(saved.id);
    assert.equal((await readDyutaSavedMatches()).length, 0);
  });

  it('bounds manual copies at five and refuses to silently evict an older save', async () => {
    const match = createDyutaMatch();
    for (let index = 0; index < 5; index += 1) await saveDyutaMatchCopy(match, NOW + index);
    await assert.rejects(() => saveDyutaMatchCopy(match, NOW + 10), /slots are full/i);
    const saves = await readDyutaSavedMatches();
    assert.equal(saves.length, 5);
    assert.equal(saves.at(-1)?.savedAt, NOW);
  });

  it('serializes simultaneous saves so they cannot overwrite one another or exceed five slots', async () => {
    const match = createDyutaMatch();
    for (let index = 0; index < 4; index += 1) await saveDyutaMatchCopy(match, NOW + index);

    const results = await Promise.allSettled([
      saveDyutaMatchCopy(match, NOW + 10),
      saveDyutaMatchCopy(match, NOW + 11),
    ]);
    const saves = await readDyutaSavedMatches();

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    assert.equal(saves.length, 5);
    assert.equal(new Set(saves.map((save) => save.id)).size, 5);
  });

  it('persists tutorial, haptics, and fact unlock progress with validated defaults', async () => {
    assert.equal((await readDyutaPreferences()).hapticsEnabled, true);
    const next = await writeDyutaPreferences({ hapticsEnabled: false, tutorialCompleted: true, unlockedFunFacts: 1 });
    assert.equal(next.hapticsEnabled, false);
    assert.equal(next.tutorialCompleted, true);
    assert.equal((await readDyutaPreferences()).unlockedFunFacts, 1);
  });

  it('applies tutorial and match unlock progress atomically when they complete together', async () => {
    await Promise.all([markDyutaTutorialCompleted(), recordDyutaMatchCompletion()]);
    const preferences = await readDyutaPreferences();
    assert.equal(preferences.tutorialCompleted, true);
    assert.equal(preferences.completedMatches, 1);
    assert.equal(preferences.unlockedFunFacts, 2);
  });
});
