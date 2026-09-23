import { describe, it, beforeEach } from 'node:test';
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
import { readQuizCache, writeQuizCache, clearQuizCache, type QuizState } from '../lib/quizCache';
import { spiritualDate } from '../lib/spiritualDate';

const TODAY = spiritualDate('UTC');

function state(overrides: Partial<QuizState> = {}): QuizState {
  return {
    quiz: {
      question: 'What is dharma?',
      options: ['A', 'B', 'C', 'D'],
      answerIndex: 0,
      tradition: 'hindu',
      date: TODAY,
    },
    todayResponse: null,
    tradition: 'hindu',
    timezone: 'UTC',
    userName: 'Seeker',
    ...overrides,
  };
}

describe('Quiz cache -- identity isolation', () => {
  beforeEach(async () => {
    await clearQuizCache();
  });

  it('a guest cache entry is never returned to an authenticated read', async () => {
    await writeQuizCache({ kind: 'guest' }, state());
    const result = await readQuizCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(result, null, 'An authenticated read must not see a guest-written entry');
  });

  it('user A cannot read user B\'s cached quiz', async () => {
    await writeQuizCache({ kind: 'authenticated', userId: 'user-A' }, state({ userName: 'Alice' }));
    const asB = await readQuizCache({ kind: 'authenticated', userId: 'user-B' });
    assert.equal(asB, null);

    const asA = await readQuizCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(asA?.userName, 'Alice');
  });
});

describe('Quiz cache -- date scoping', () => {
  beforeEach(async () => {
    await clearQuizCache();
  });

  it('rejects a quiz cached for a prior spiritual day', async () => {
    await writeQuizCache({ kind: 'guest' }, state({ quiz: { ...state().quiz!, date: '2020-01-01' } }));
    const result = await readQuizCache({ kind: 'guest' });
    assert.equal(result, null, 'Yesterday\'s cached quiz must never paint as today\'s');
  });

  it('rejects a todayResponse cached for a prior spiritual day even when the quiz date is current', async () => {
    await writeQuizCache(
      { kind: 'guest' },
      state({
        todayResponse: {
          chosen_index: 0,
          correct_index: 0,
          is_correct: true,
          explanation: null,
          question: 'stale',
          date: '2020-01-01',
        },
      })
    );
    const result = await readQuizCache({ kind: 'guest' });
    assert.equal(result, null, 'A stale answered-state must not be treated as fresh just because the quiz date matches');
  });

  it('accepts a quiz and response both dated to the current spiritual day', async () => {
    await writeQuizCache(
      { kind: 'guest' },
      state({
        todayResponse: {
          chosen_index: 0,
          correct_index: 0,
          is_correct: true,
          explanation: null,
          question: 'What is dharma?',
          date: TODAY,
        },
      })
    );
    const result = await readQuizCache({ kind: 'guest' });
    assert.ok(result, 'A same-day cache entry must be usable');
    assert.equal(result?.todayResponse?.is_correct, true);
  });

  it('never caches a null quiz (nothing useful to paint instantly)', async () => {
    await writeQuizCache({ kind: 'guest' }, state({ quiz: null }));
    const result = await readQuizCache({ kind: 'guest' });
    assert.equal(result, null);
  });
});

describe('Quiz cache -- fails safe', () => {
  beforeEach(async () => {
    await clearQuizCache();
  });

  it('a corrupt cache entry is treated as a miss, not a crash', async () => {
    await AsyncStorage.setItem('shoonaya.quiz.daily.v1', '{{{not json');
    const result = await readQuizCache({ kind: 'guest' });
    assert.equal(result, null);
  });

  it('a stale schema version is treated as a miss', async () => {
    await AsyncStorage.setItem(
      'shoonaya.quiz.daily.v1',
      JSON.stringify({ schemaVersion: 99, identity: { kind: 'guest' }, cachedAt: new Date().toISOString(), state: state() })
    );
    const result = await readQuizCache({ kind: 'guest' });
    assert.equal(result, null);
  });

  it('clearQuizCache removes the entry so the next read is a genuine miss', async () => {
    await writeQuizCache({ kind: 'guest' }, state());
    assert.ok(await readQuizCache({ kind: 'guest' }));
    await clearQuizCache();
    assert.equal(await readQuizCache({ kind: 'guest' }), null);
  });
});
