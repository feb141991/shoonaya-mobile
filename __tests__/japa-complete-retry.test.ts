import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { attemptJapaCompleteWithRetry, type JapaCompleteFetch, type RetryOutcomeLabel } from '../lib/japaCompleteRetry';

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

    const outcome = await attemptJapaCompleteWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(calls, 1);
    assert.equal(outcome.kind, 'success');
    assert.equal(outcome.response.status, 200);
  });

  it('retries a transient 5xx and succeeds', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      return calls === 1 ? jsonResponse(503) : jsonResponse(200, { success: true });
    };

    const outcome = await attemptJapaCompleteWithRetry(fetchImpl, '{}', () => {}, noDelay);

    assert.equal(calls, 2);
    assert.equal(outcome.kind, 'success');
    assert.equal(outcome.response.ok, true);
  });

  it('classifies a permanent 4xx as a definitive rejection, not a retryable failure', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      return jsonResponse(400, { error: 'mantra is required' });
    };
    const labels: RetryOutcomeLabel[] = [];

    const outcome = await attemptJapaCompleteWithRetry(fetchImpl, '{}', (label) => labels.push(label), noDelay);

    assert.equal(calls, 1, 'a definitive rejection must not be retried');
    assert.equal(outcome.kind, 'definitive_rejection');
    if (outcome.kind === 'definitive_rejection') assert.equal(outcome.response.status, 400);
    assert.deepEqual(labels, ['permanent_failure']);
  });

  it('classifies an exhausted persistent 5xx as uncertain, not a definitive rejection', async () => {
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      return jsonResponse(500);
    };
    const labels: RetryOutcomeLabel[] = [];

    const outcome = await attemptJapaCompleteWithRetry(fetchImpl, '{}', (label) => labels.push(label), noDelay);

    assert.equal(calls, 3, 'Initial attempt + 2 retries, then stop');
    assert.equal(outcome.kind, 'uncertain', 'a 5xx that was still retryable when attempts ran out is not a rejection');
    if (outcome.kind === 'uncertain') assert.equal(outcome.response?.status, 500);
    assert.deepEqual(labels, ['retry'], 'must not be reported as permanent_failure -- it may still succeed later');
  });

  it('classifies exhausted network exceptions as uncertain, never as a definitive rejection', async () => {
    // This is the exact bug being corrected: a network exception proves
    // nothing about whether the underlying request is invalid, so it must
    // never be labeled the same as a genuine, non-retryable HTTP rejection
    // -- doing so would make a caller permanently quarantine a completion
    // that may well succeed once the network recovers.
    let calls = 0;
    const fetchImpl: JapaCompleteFetch = async () => {
      calls++;
      throw new Error('network request failed');
    };
    const labels: RetryOutcomeLabel[] = [];

    const outcome = await attemptJapaCompleteWithRetry(fetchImpl, '{}', (label) => labels.push(label), noDelay);

    assert.equal(calls, 3);
    assert.equal(outcome.kind, 'uncertain');
    if (outcome.kind === 'uncertain') assert.equal(outcome.response, null);
    assert.deepEqual(labels, ['retry']);
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
