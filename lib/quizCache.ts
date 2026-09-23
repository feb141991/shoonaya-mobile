import { createCacheStorageBarrier } from './cacheStorageBarrier';
import { spiritualDate } from '@/lib/spiritualDate';

// Reliability plan item 6: lets app/quiz.tsx paint the last-known quiz
// instantly on revisit instead of always blocking on SacredLoader while
// the network round trip resolves -- same read-cache-then-reconcile shape
// as lib/japaContextCache.ts. Single well-known key (not per-user) with
// the identity stored inside the envelope and checked on read: a mismatch
// is simply treated as a miss, so a stale entry from a previous account
// can never paint over the current one.
const QUIZ_CACHE_KEY = 'shoonaya.quiz.daily.v1';

export type QuizCacheIdentity = { kind: 'guest' } | { kind: 'authenticated'; userId: string };

export type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';

export type DailyQuiz = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string | null;
  fact?: string | null;
  source?: string | null;
  tradition: string;
  date: string;
  daily_quiz_id?: string | null;
};

export type TodayQuizResponse = {
  chosen_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation: string | null;
  question: string;
  date: string;
};

export type QuizState = {
  quiz: DailyQuiz | null;
  todayResponse: TodayQuizResponse | null;
  tradition: Tradition;
  timezone: string;
  userName: string;
};

type CachedQuizState = {
  schemaVersion: 1;
  identity: QuizCacheIdentity;
  cachedAt: string;
  state: QuizState;
};

const cacheStorage = createCacheStorageBarrier((key) => key === QUIZ_CACHE_KEY);

function identityMatches(a: QuizCacheIdentity, b: QuizCacheIdentity): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'authenticated' && b.kind === 'authenticated' ? a.userId === b.userId : true;
}

export async function readQuizCache(identity: QuizCacheIdentity): Promise<QuizState | null> {
  try {
    const stored = await cacheStorage.read(QUIZ_CACHE_KEY);
    if (!stored) return null;
    const cached = JSON.parse(stored.value) as CachedQuizState;
    if (cached.schemaVersion !== 1 || !identityMatches(cached.identity, identity)) return null;

    const state = cached.state;
    if (!state || typeof state.timezone !== 'string' || !state.quiz) return null;

    // Quiz content is scoped to one spiritual day -- a cache entry from a
    // prior day (or an answer recorded for a prior day) must never paint
    // as if it were today's, so a date mismatch on either field is a miss.
    const today = spiritualDate(state.timezone);
    if (state.quiz.date !== today) return null;
    if (state.todayResponse && state.todayResponse.date !== today) return null;

    return state;
  } catch {
    return null;
  }
}

export async function writeQuizCache(identity: QuizCacheIdentity, state: QuizState): Promise<void> {
  const payload: CachedQuizState = {
    schemaVersion: 1,
    identity,
    cachedAt: new Date().toISOString(),
    state,
  };
  await cacheStorage.setItem(QUIZ_CACHE_KEY, JSON.stringify(payload));
}

export async function clearQuizCache(): Promise<void> {
  await cacheStorage.removeItem(QUIZ_CACHE_KEY);
}
