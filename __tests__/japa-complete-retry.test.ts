import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { attemptJapaCompleteWithRetry, type JapaCompleteFetch } from '../lib/japaCompleteRetry';

function jsonResponse(status: number, body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

const noDelay = async () => {};

describe('Japa completion retry', () => {
  it('succeeds on the first attempt and returns the response', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      return jsonResponse(200, { success: true, sessionId: 'abc' });
    };

    const res = await attemptJapaCompleteWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(calls, 1);
    assert.ok(res);
    assert.equal(res!.status, 200);
  });

  it('retries a transient 5xx and succeeds', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      return calls === 1 ? jsonResponse(503) : jsonResponse(200, { success: true });
    };

    const res = await attemptJapaCompleteWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(calls, 2);
    assert.ok(res);
    assert.equal(res!.ok, true);
  });

  it('returns the failing response immediately on a permanent 4xx (caller reads the error message)', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      return jsonResponse(400, { error: 'mantra is required' });
    };

    const res = await attemptJapaCompleteWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(calls, 1);
    assert.ok(res);
    assert.equal(res!.status, 400);
  });

  it('returns the last failing response after the bounded retry window on persistent 5xx', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      return jsonResponse(500);
    };

    const res = await attemptJapaCompleteWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(calls, 3, 'Initial attempt + 2 retries, then stop');
    assert.ok(res);
    assert.equal(res!.status, 500);
  });

  it('returns null after the bounded retry window on persistent network exceptions', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      throw new Error('network request failed');
    };

    const res = await attemptJapaCompleteWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(calls, 3);
    assert.equal(res, null);
  });

  it('sends the exact same body on every attempt (safe to resend -- backend is idempotent on clientCompletionId)', async () => {
    const bodies: string[] = [];
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async (_path, options) => {
      calls++;
      bodies.push(options.body);
      return calls === 1 ? jsonResponse(500) : jsonResponse(200, { success: true });
    };
    const body = JSON.stringify({ clientCompletionId: 'fixed-uuid', mantra: 'Om' });

    await attemptJapaCompleteWithRetry(fetchImpl, body, () => {}, noDelay);

    assert.deepEqual(bodies, [body, body]);
  });
});
