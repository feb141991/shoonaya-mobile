import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { classifyFailure, nextBackoffMs, RETRY_BACKOFF_MS, HttpError } from '../lib/retryPolicy';

describe('Shared retry policy', () => {
  it('classifies a 5xx as retryable at the first backoff stage', () => {
    const outcome = classifyFailure(500, null);
    assert.equal(outcome.kind, 'retry');
    if (outcome.kind === 'retry') assert.equal(outcome.afterMs, RETRY_BACKOFF_MS[0]);
  });

  it('classifies a network failure (status 0) as retryable', () => {
    assert.equal(classifyFailure(0, null).kind, 'retry');
  });

  it('honors Retry-After on 429', () => {
    const outcome = classifyFailure(429, '30');
    assert.equal(outcome.kind, 'retry');
    if (outcome.kind === 'retry') assert.equal(outcome.afterMs, 30_000);
  });

  it('falls back to standard backoff on 429 with no Retry-After header', () => {
    const outcome = classifyFailure(429, null);
    if (outcome.kind === 'retry') assert.equal(outcome.afterMs, RETRY_BACKOFF_MS[0]);
  });

  it('classifies most 4xx as permanent -- no automatic retry', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      assert.equal(classifyFailure(status, null).kind, 'permanent_failure', `status ${status} should be permanent`);
    }
  });

  it('exhausts the exact backoff table before giving up', () => {
    assert.equal(nextBackoffMs(0), 2_000);
    assert.equal(nextBackoffMs(1), 10_000);
    assert.equal(nextBackoffMs(2), 60_000);
    assert.equal(nextBackoffMs(3), 300_000);
    assert.equal(nextBackoffMs(4), null, 'Must stop retrying forever once the table is exhausted');
  });

  it('HttpError carries status and Retry-After for a caller to classify without re-parsing the Response', () => {
    const err = new HttpError('failed', 503, '12');
    assert.equal(err.status, 503);
    assert.equal(err.retryAfterHeader, '12');
    assert.equal(err instanceof Error, true);
  });
});
