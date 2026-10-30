import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { fetchTodaySacredText, SHLOKA_COMPAT_PATH, SHLOKA_TODAY_PATH } from '../lib/shlokaToday';

const screen = readFileSync(new URL('../app/shloka.tsx', import.meta.url), 'utf8');

function recorder(statuses: number[]) {
  const calls: Array<{ path: string; expectedUserId: string }> = [];
  const fetcher = async (path: string, options: { expectedUserId: string }) => {
    calls.push({ path, expectedUserId: options.expectedUserId });
    const status = statuses[calls.length - 1] ?? 200;
    return new Response('{}', { status });
  };
  return { calls, fetcher };
}

describe('Shloka screen fetches only today\'s text', () => {
  it('asks the dedicated route first, as the signed-in user', async () => {
    const { calls, fetcher } = recorder([200]);
    const response = await fetchTodaySacredText('user-1', fetcher);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [{ path: '/api/native/shloka/today', expectedUserId: 'user-1' }]);
    assert.equal(SHLOKA_TODAY_PATH, '/api/native/shloka/today');
  });

  it('falls back to home-summary with the calendar skipped only when the route is not deployed (404)', async () => {
    const { calls, fetcher } = recorder([404, 200]);
    const response = await fetchTodaySacredText('user-1', fetcher);
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map((c) => c.path), [SHLOKA_TODAY_PATH, SHLOKA_COMPAT_PATH]);
    assert.ok(calls.every((c) => c.expectedUserId === 'user-1'));
    assert.match(SHLOKA_COMPAT_PATH, /^\/api\/native\/home-summary\?skipCalendar=true$/);
  });

  it('returns 401, 403, 500 and 503 unchanged without trying the heavier route', async () => {
    for (const status of [401, 403, 500, 503]) {
      const { calls, fetcher } = recorder([status]);
      const response = await fetchTodaySacredText('user-1', fetcher);
      assert.equal(response.status, status);
      assert.equal(calls.length, 1, `status ${status} must not fall back`);
    }
  });

  it('lets a network failure reach the caller instead of retrying elsewhere', async () => {
    let calls = 0;
    const fetcher = async () => { calls += 1; throw new TypeError('Network request failed'); };
    await assert.rejects(fetchTodaySacredText('user-1', fetcher), TypeError);
    assert.equal(calls, 1);
  });

  it('keeps the screen off the aggregate Home endpoint', () => {
    assert.match(screen, /fetchTodaySacredText\(userId, apiFetch\)/);
    assert.doesNotMatch(screen, /\/api\/native\/home-summary/);
  });
});
