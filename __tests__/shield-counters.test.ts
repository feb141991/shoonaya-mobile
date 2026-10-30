import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchShieldCounters } from '../lib/shieldCounters';

describe('fetchShieldCounters', () => {
  it('calls /api/native/progress/shields with expectedUserId and returns counters', async () => {
    const calls: Array<{ path: string; expectedUserId: string }> = [];
    const fetcher = async (path: string, options: { expectedUserId: string }) => {
      calls.push({ path, expectedUserId: options.expectedUserId });
      return new Response(JSON.stringify({ latestStreakCount: 14, totalJapaSessions: 108 }), { status: 200 });
    };

    const counters = await fetchShieldCounters('user-1', fetcher);
    assert.deepEqual(counters, { latestStreakCount: 14, totalJapaSessions: 108 });
    assert.deepEqual(calls, [
      { path: '/api/native/progress/shields', expectedUserId: 'user-1' },
    ]);
  });

  it('falls back to /api/native/progress legacy derive only on 404', async () => {
    const calls: string[] = [];
    const fetcher = async (path: string) => {
      calls.push(path);
      if (path === '/api/native/progress/shields') {
        return new Response('{}', { status: 404 });
      }
      return new Response(
        JSON.stringify({
          sadhana182d: [
            { date: '2026-10-28', streak_count: 5 },
            { date: '2026-10-30', streak_count: 12 },
            { date: '2026-10-25', streak_count: 1 },
          ],
          totalJapaSessions: 55,
        }),
        { status: 200 },
      );
    };

    const counters = await fetchShieldCounters('user-1', fetcher);
    assert.deepEqual(counters, { latestStreakCount: 12, totalJapaSessions: 55 });
    assert.deepEqual(calls, [
      '/api/native/progress/shields',
      '/api/native/progress',
    ]);
  });

  it('throws on 503 without falling back to legacy progress', async () => {
    const calls: string[] = [];
    const fetcher = async (path: string) => {
      calls.push(path);
      return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 503 });
    };

    await assert.rejects(
      () => fetchShieldCounters('user-1', fetcher),
      /Shield counters unavailable/,
    );
    assert.deepEqual(calls, ['/api/native/progress/shields']);
  });

  it('throws on 401 without falling back to legacy progress', async () => {
    const calls: string[] = [];
    const fetcher = async (path: string) => {
      calls.push(path);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    };

    await assert.rejects(
      () => fetchShieldCounters('user-1', fetcher),
      /Shield counters unavailable/,
    );
    assert.deepEqual(calls, ['/api/native/progress/shields']);
  });

  it('throws on negative or non-integer counters', async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ latestStreakCount: -1, totalJapaSessions: 10 }), { status: 200 });

    await assert.rejects(
      () => fetchShieldCounters('user-1', fetcher),
      /Invalid shield counters/,
    );
  });

  it('throws on malformed legacy sadhana182d structure', async () => {
    const fetcher = async (path: string) => {
      if (path === '/api/native/progress/shields') return new Response('{}', { status: 404 });
      return new Response(JSON.stringify({ sadhana182d: 'not-an-array', totalJapaSessions: 10 }), { status: 200 });
    };

    await assert.rejects(
      () => fetchShieldCounters('user-1', fetcher),
      /Invalid progress response/,
    );
  });
});
