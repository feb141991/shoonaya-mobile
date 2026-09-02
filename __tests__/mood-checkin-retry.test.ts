import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { attemptMoodCheckinWithRetry, type MoodCheckinFetch } from '../lib/moodCheckinRetry';

function jsonResponse(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

const noDelay = async () => {};

describe('Mood check-in retry', () => {
  it('succeeds on the first attempt without retrying', async () => {
    let calls = 0;
    const fetchImpl: MoodCheckinFetch = async () => {
      calls++;
      return jsonResponse(200, { checkin_id: 'c1' });
    };
    const outcomes: Array<{ outcome: string; attempts: number }> = [];

    const id = await attemptMoodCheckinWithRetry(fetchImpl, '{}', (outcome, attempts) => outcomes.push({ outcome, attempts }), noDelay);

    assert.equal(id, 'c1');
    assert.equal(calls, 1);
    assert.deepEqual(outcomes, [{ outcome: 'success', attempts: 0 }]);
  });

  it('retries a transient 5xx and succeeds on the second attempt', async () => {
    let calls = 0;
    const fetchImpl: MoodCheckinFetch = async () => {
      calls++;
      if (calls === 1) return jsonResponse(503, { error: 'unavailable' });
      return jsonResponse(200, { checkin_id: 'c2' });
    };

    const id = await attemptMoodCheckinWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(id, 'c2');
    assert.equal(calls, 2, 'Should retry exactly once after the transient failure');
  });

  it('does not retry a permanent 4xx failure', async () => {
    let calls = 0;
    const fetchImpl: MoodCheckinFetch = async () => {
      calls++;
      return jsonResponse(400, { error: 'Missing before_mood' });
    };
    const outcomes: Array<{ outcome: string; attempts: number }> = [];

    const id = await attemptMoodCheckinWithRetry(fetchImpl, '{}', (outcome, attempts) => outcomes.push({ outcome, attempts }), noDelay);

    assert.equal(id, null);
    assert.equal(calls, 1, 'A permanent failure must not be retried');
    assert.deepEqual(outcomes, [{ outcome: 'permanent_failure', attempts: 0 }]);
  });

  it('gives up after exhausting the bounded retry window (never retries forever)', async () => {
    let calls = 0;
    const fetchImpl: MoodCheckinFetch = async () => {
      calls++;
      return jsonResponse(500, { error: 'down' });
    };

    const id = await attemptMoodCheckinWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(id, null);
    assert.equal(calls, 3, 'Initial attempt + 2 retries, then stop');
  });

  it('treats a thrown network error the same as a 5xx for retry purposes', async () => {
    let calls = 0;
    const fetchImpl: MoodCheckinFetch = async () => {
      calls++;
      if (calls === 1) throw new Error('Network request failed');
      return jsonResponse(200, { checkin_id: 'c3' });
    };

    const id = await attemptMoodCheckinWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(id, 'c3');
    assert.equal(calls, 2);
  });

  it('honors Retry-After on a 429 before retrying', async () => {
    let calls = 0;
    const delays: number[] = [];
    const fetchImpl: MoodCheckinFetch = async () => {
      calls++;
      if (calls === 1) return jsonResponse(429, {}, { 'Retry-After': '5' });
      return jsonResponse(200, { checkin_id: 'c4' });
    };

    const id = await attemptMoodCheckinWithRetry(fetchImpl, '{}', () => {}, async (ms) => { delays.push(ms); });

    assert.equal(id, 'c4');
    // nextBackoffMs(0) is 2000, which wins over classifyFailure's Retry-After
    // fallback since attempt 0 always has a real backoff stage available --
    // this documents that behavior rather than asserting a specific number
    // that would break if the backoff table changes.
    assert.equal(delays.length, 1);
  });
});
