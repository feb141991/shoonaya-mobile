import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSingleFlight } from '../lib/async-single-flight';
import {
  canRetryTransientTransportFailure,
  sessionHasUsableAccessToken,
} from '../lib/api-auth-policy';

describe('API authentication and retry policy', () => {
  it('refreshes an expired or nearly expired session before sending', () => {
    const now = 1_000_000;
    assert.equal(sessionHasUsableAccessToken({ access_token: 'old', expires_at: now / 1000 - 1 }, now), false);
    assert.equal(sessionHasUsableAccessToken({ access_token: 'soon', expires_at: now / 1000 + 30 }, now), false);
    assert.equal(sessionHasUsableAccessToken({ access_token: 'fresh', expires_at: now / 1000 + 120 }, now), true);
  });

  it('allows transient transport retries only for safe read methods', () => {
    for (const method of [undefined, 'GET', 'get', 'HEAD', 'OPTIONS']) {
      assert.equal(canRetryTransientTransportFailure(method), true);
    }
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      assert.equal(canRetryTransientTransportFailure(method), false);
    }
  });

  it('shares one refresh operation across concurrent callers and resets after settlement', async () => {
    const singleFlight = createSingleFlight<string>();
    let calls = 0;
    let releaseFirst!: (value: string) => void;
    const firstResult = new Promise<string>((resolve) => { releaseFirst = resolve; });

    const first = singleFlight.run(() => {
      calls += 1;
      return firstResult;
    });
    const second = singleFlight.run(() => {
      calls += 1;
      return Promise.resolve('unexpected');
    });

    assert.strictEqual(first, second);
    assert.equal(calls, 1);
    releaseFirst('refreshed');
    assert.equal(await second, 'refreshed');

    assert.equal(await singleFlight.run(async () => {
      calls += 1;
      return 'next-refresh';
    }), 'next-refresh');
    assert.equal(calls, 2);
  });
});
