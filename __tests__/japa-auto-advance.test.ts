import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

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
import {
  readJapaPreferences,
  writeJapaPreference,
  JAPA_CHANTING_MODE_KEY,
  JAPA_HANDS_FREE_PACE_KEY,
  JAPA_CEREMONY_AUTO_ADVANCE_KEY,
  DEFAULT_HANDS_FREE_PACE,
  HANDS_FREE_PACE_OPTIONS,
} from '../lib/japaPreferences';
import {
  readPendingJapaCompletions,
} from '../lib/japaPendingCompletion';

import { captureAppIdentity, setAppIdentity } from '../lib/appIdentity';
import { attemptAndReconcilePendingCompletion } from '../lib/japaCompletionReconciliation';
import {
  createJapaCompletionHandoff,
  getJapaRoundDuration,
  readCurrentJapaCompletionContext,
  type JapaCompletionPayload,
} from '../lib/japaCompletionSubmission';
import { createJapaTimer, startJapaReflection } from '../lib/japaTimers';

const fullRound: JapaCompletionPayload = {
  mantra: 'Om Namah Shivaya',
  count: 108,
  rounds: 1,
  durationSeconds: 120,
  tradition: 'hindu',
  practiceType: 'hindu_japa',
  activeSymbolId: 'om',
  chantingMode: 'hands_free',
};

describe('Japa Auto-Advance & Hands-Free Bead Chanting Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Preferences & Defaults', () => {
    it('defaults to manual chanting, 3.0s pace, and ceremony auto-advance enabled', async () => {
      const prefs = await readJapaPreferences();
      assert.equal(prefs.chantingMode, 'manual');
      assert.equal(prefs.handsFreePace, DEFAULT_HANDS_FREE_PACE);
      assert.equal(prefs.ceremonyAutoAdvance, true);
    });

    it('persists hands_free chanting mode and reads it back', async () => {
      await writeJapaPreference(JAPA_CHANTING_MODE_KEY, 'hands_free');
      const prefs = await readJapaPreferences();
      assert.equal(prefs.chantingMode, 'hands_free');
    });

    it('persists hands-free pace and validates pace options', async () => {
      assert.deepEqual(
        HANDS_FREE_PACE_OPTIONS.map((p) => p.seconds),
        [2.0, 3.0, 4.5]
      );

      await writeJapaPreference(JAPA_HANDS_FREE_PACE_KEY, '4.5');
      const prefs = await readJapaPreferences();
      assert.equal(prefs.handsFreePace, 4.5);
    });

    it('falls back to the default for unsupported or invalid stored paces', async () => {
      for (const value of ['invalid', 'Infinity', '-1', '', '3.5']) {
        await writeJapaPreference(JAPA_HANDS_FREE_PACE_KEY, value);
        assert.equal((await readJapaPreferences()).handsFreePace, DEFAULT_HANDS_FREE_PACE);
      }
    });

    it('respects disabling ceremony auto-advance', async () => {
      await writeJapaPreference(JAPA_CEREMONY_AUTO_ADVANCE_KEY, 'false');
      const prefs = await readJapaPreferences();
      assert.equal(prefs.ceremonyAutoAdvance, false);
    });
  });

  it('queues the real encoded request and the next round or partial uses only its own duration', async () => {
    let id = 0;
    const handoff = createJapaCompletionHandoff(() => String(++id));
    await handoff.enqueue('user-A', fullRound);
    await handoff.enqueue('user-A', { ...fullRound, durationSeconds: getJapaRoundDuration(250, 120) });
    await handoff.enqueue('user-A', {
      ...fullRound, count: 24, rounds: 0, practiceType: null,
      durationSeconds: getJapaRoundDuration(310, 250),
    });
    const result = await readPendingJapaCompletions('user-A');
    assert.equal(result.status, 'ok');
    assert.deepEqual(result.items.map(({ requestBody }) => {
      const { practiceType, count, rounds, durationSeconds } = JSON.parse(requestBody);
      return { practiceType, count, rounds, durationSeconds };
    }), [
      { practiceType: 'hindu_japa:hands_free', count: 108, rounds: 1, durationSeconds: 120 },
      { practiceType: 'hindu_japa:hands_free', count: 108, rounds: 1, durationSeconds: 130 },
      { practiceType: 'mala:hands_free', count: 24, rounds: 0, durationSeconds: 60 },
    ]);
    assert.deepEqual(await readPendingJapaCompletions('user-B'), { status: 'ok', items: [] });
  });

  it('retries a failed local write with the original operation and bead count', async () => {
    let nextId = 0;
    const handoff = createJapaCompletionHandoff(() => String(++nextId));
    const originalSetItem = AsyncStorage.setItem.bind(AsyncStorage);
    const setItem = mock.method(AsyncStorage, 'setItem', async () => { throw new Error('Disk full'); });
    try {
      await assert.rejects(handoff.enqueue('user-A', fullRound), /Disk full/);
      assert.deepEqual(await readPendingJapaCompletions('user-A'), { status: 'ok', items: [] });
      setItem.mock.mockImplementation(originalSetItem);
      const retry = await handoff.enqueue('user-A', { ...fullRound, durationSeconds: 180 });
      assert.equal(nextId, 1);
      assert.equal(retry.clientCompletionId, '1');
      assert.equal(JSON.parse(retry.requestBody).durationSeconds, 120);
      assert.equal(JSON.parse(retry.requestBody).count, 108);
      const saved = await readPendingJapaCompletions('user-A');
      assert.deepEqual(saved, { status: 'ok', items: [retry] });
    } finally {
      setItem.mock.restore();
    }
  });

  it('replays the same partial operation after an ambiguous delivery and tolerates an invalid response body', async () => {
    const handoff = createJapaCompletionHandoff(() => 'partial-1');
    const queued = await handoff.enqueue('user-A', { ...fullRound, count: 24, rounds: 0 });
    const requests: string[] = [];
    const pending = await attemptAndReconcilePendingCompletion('user-A', queued, async (_path, request) => {
      requests.push(request.body);
      return new Response(null, { status: 503 });
    }, undefined, async () => {});
    assert.equal(pending.kind, 'uncertain');
    const stored = await readPendingJapaCompletions('user-A');
    assert.equal(stored.status, 'ok');
    assert.deepEqual(stored.items, [queued]);

    const sent = await attemptAndReconcilePendingCompletion('user-A', stored.items[0], async (_path, request) => {
      requests.push(request.body);
      return new Response('malformed JSON');
    });
    assert.equal(sent.kind, 'success');
    assert.equal(await readCurrentJapaCompletionContext(sent.response, () => true), null);
    assert.ok(requests.length > 1);
    assert.deepEqual(new Set(requests), new Set([queued.requestBody]));
    assert.deepEqual(await readPendingJapaCompletions('user-A'), { status: 'ok', items: [] });
  });

  it('discards context when identity changes while a successful response body is being parsed', async () => {
    const context = {
      tradition: 'hindu', timezone: 'UTC', spiritualDate: '2026-11-12', japaDone: true, streak: 1,
      lifetime: { totalBeads: 108, totalRounds: 1, lastPracticed: null },
    };
    setAppIdentity({ kind: 'authenticated', userId: 'user-A' });
    try {
      const current = captureAppIdentity();
      assert.equal((await readCurrentJapaCompletionContext(Response.json(context), current.isCurrent))?.streak, 1);

      let finishParsing!: (value: typeof context) => void;
      const body = new Promise<typeof context>((resolve) => { finishParsing = resolve; });
      const response = new Response();
      mock.method(response, 'json', () => body);
      const result = readCurrentJapaCompletionContext(response, current.isCurrent);
      setAppIdentity({ kind: 'authenticated', userId: 'user-B' });
      setAppIdentity({ kind: 'authenticated', userId: 'user-A' });
      finishParsing(context);
      assert.equal(await result, null);
    } finally {
      setAppIdentity({ kind: 'loading' });
    }
  });

  it('cancels a scheduled bead or setup advance and starts the next tick from the latest action', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const timer = createJapaTimer();
    const tick = t.mock.fn();
    timer.schedule(2000, tick);
    t.mock.timers.tick(1999);
    timer.schedule(2000, tick);
    t.mock.timers.tick(1999);
    assert.equal(tick.mock.callCount(), 0);
    t.mock.timers.tick(1);
    assert.equal(tick.mock.callCount(), 1);
    timer.schedule(240, tick);
    timer.cancel();
    t.mock.timers.tick(240);
    assert.equal(tick.mock.callCount(), 1);
  });

  it('cancels a reflection and allows the next one to close exactly once after ten seconds', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const done = t.mock.fn();
    const seconds: number[] = [];
    const stay = startJapaReflection((second) => seconds.push(second), done);
    t.mock.timers.tick(1000);
    stay();
    for (let tick = 0; tick < 12; tick++) t.mock.timers.tick(1000);
    assert.deepEqual(seconds, [10, 9]);
    assert.equal(done.mock.callCount(), 0);

    seconds.length = 0;
    startJapaReflection((second) => seconds.push(second), done);
    for (let tick = 0; tick < 9; tick++) t.mock.timers.tick(1000);
    assert.equal(done.mock.callCount(), 0);
    assert.deepEqual(seconds, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    t.mock.timers.tick(1000);
    t.mock.timers.tick(1000);
    assert.equal(done.mock.callCount(), 1);
  });
});
