import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { attemptSankalpaCheckinWithRetry, type SankalpaCheckinFetch } from '../lib/sankalpaCheckinRetry';

function jsonResponse(status: number, body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

const noDelay = async () => {};

describe('Sankalpa check-in retry', () => {
  it('succeeds on the first attempt', async () => {
    let calls = 0;
    const fetchImpl: SankalpaCheckinFetch = async () => {
      calls++;
      return jsonResponse(200, { success: true });
    };
    const outcomes: Array<{ outcome: string; attempts: number }> = [];

    const ok = await attemptSankalpaCheckinWithRetry(fetchImpl, 'sankalpa-1', (outcome, attempts) => outcomes.push({ outcome, attempts }), noDelay);

    assert.equal(ok, true);
    assert.equal(calls, 1);
    assert.deepEqual(outcomes, [{ outcome: 'success', attempts: 0 }]);
  });

  it('retries a transient 5xx and succeeds', async () => {
    let calls = 0;
    const fetchImpl: SankalpaCheckinFetch = async () => {
      calls++;
      return calls === 1 ? jsonResponse(503) : jsonResponse(200, { success: true });
    };

    const ok = await attemptSankalpaCheckinWithRetry(fetchImpl, 'sankalpa-1', () => {}, noDelay);

    assert.equal(ok, true);
    assert.equal(calls, 2);
  });

  it('does not retry a permanent 4xx failure', async () => {
    let calls = 0;
    const fetchImpl: SankalpaCheckinFetch = async () => {
      calls++;
      return jsonResponse(404, { error: 'Active sankalpa not found' });
    };

    const ok = await attemptSankalpaCheckinWithRetry(fetchImpl, 'sankalpa-1', () => {}, noDelay);

    assert.equal(ok, false);
    assert.equal(calls, 1);
  });

  it('gives up after the bounded retry window', async () => {
    let calls = 0;
    const fetchImpl: SankalpaCheckinFetch = async () => {
      calls++;
      return jsonResponse(500);
    };

    const ok = await attemptSankalpaCheckinWithRetry(fetchImpl, 'sankalpa-1', () => {}, noDelay);

    assert.equal(ok, false);
    assert.equal(calls, 3, 'Initial attempt + 2 retries, then stop');
  });

  it('sends the sankalpa_id verbatim on every attempt (safe to resend -- backend upserts)', async () => {
    const bodies: string[] = [];
    let calls = 0;
    const fetchImpl: SankalpaCheckinFetch = async (_path, options) => {
      calls++;
      bodies.push(options.body);
      return calls === 1 ? jsonResponse(500) : jsonResponse(200, { success: true });
    };

    await attemptSankalpaCheckinWithRetry(fetchImpl, 'sankalpa-42', () => {}, noDelay);

    assert.deepEqual(bodies, [
      JSON.stringify({ sankalpa_id: 'sankalpa-42' }),
      JSON.stringify({ sankalpa_id: 'sankalpa-42' }),
    ]);
  });
});
