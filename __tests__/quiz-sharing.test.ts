import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createQuizRequestSharing, dailyQuizRequestKey } from '../lib/quizRequests';

describe('quizRequestSharing', () => {
  it('coalesces concurrent requests for the same key into a single in-flight promise', async () => {
    const sharing = createQuizRequestSharing();
    let invocations = 0;
    const load = async () => {
      invocations++;
      await new Promise((r) => setTimeout(r, 10));
      return { quiz: 'daily-q1' };
    };

    const key = dailyQuizRequestKey({
      identity: 'user:123',
      identityRevision: 1,
      tradition: 'hindu',
      timezone: 'UTC',
      date: '2026-10-30',
      language: 'en',
    });

    const [res1, res2] = await Promise.all([
      sharing.run(key, load),
      sharing.run(key, load),
    ]);

    assert.equal(invocations, 1);
    assert.deepEqual(res1, { quiz: 'daily-q1' });
    assert.deepEqual(res2, { quiz: 'daily-q1' });
  });

  it('runs separate requests for different keys', async () => {
    const sharing = createQuizRequestSharing();
    let invocations = 0;
    const load = async () => {
      invocations++;
      return { count: invocations };
    };

    const keyA = dailyQuizRequestKey({
      identity: 'user:123',
      identityRevision: 1,
      tradition: 'hindu',
      timezone: 'UTC',
      date: '2026-10-30',
      language: 'en',
    });
    const keyB = dailyQuizRequestKey({
      identity: 'user:123',
      identityRevision: 1,
      tradition: 'sikh',
      timezone: 'UTC',
      date: '2026-10-30',
      language: 'en',
    });

    const [resA, resB] = await Promise.all([
      sharing.run(keyA, load),
      sharing.run(keyB, load),
    ]);

    assert.equal(invocations, 2);
    assert.deepEqual(resA, { count: 1 });
    assert.deepEqual(resB, { count: 2 });
  });

  it('clear() invalidates prior in-flight requests and subsequent requests make new calls', async () => {
    const sharing = createQuizRequestSharing();
    let invocations = 0;
    const load = async () => {
      invocations++;
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true };
    };

    const key = 'test-key';
    const pending = sharing.run(key, load);
    sharing.clear();

    await assert.rejects(pending, /Quiz request invalidated/);

    const fresh = await sharing.run(key, async () => ({ fresh: true }));
    assert.deepEqual(fresh, { fresh: true });
  });
});
