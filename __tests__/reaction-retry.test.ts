import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { attemptReactionActionWithRetry, type ReactionAction } from '../lib/reactionRetry';

const noDelay = async () => {};

function pgError(code: string): Error & { code: string } {
  const err = new Error(`pg error ${code}`) as Error & { code: string };
  err.code = code;
  return err;
}

describe('Reaction action retry', () => {
  it('succeeds on the first attempt', async () => {
    let calls = 0;
    const action: ReactionAction = async () => {
      calls++;
    };
    const outcomes: Array<{ outcome: string; attempts: number }> = [];

    const ok = await attemptReactionActionWithRetry(action, (outcome, attempts) => outcomes.push({ outcome, attempts }), noDelay);

    assert.equal(ok, true);
    assert.equal(calls, 1);
    assert.deepEqual(outcomes, [{ outcome: 'success', attempts: 0 }]);
  });

  it('retries a transient (no-code) failure and succeeds', async () => {
    let calls = 0;
    const action: ReactionAction = async () => {
      calls++;
      if (calls === 1) throw new Error('network request failed');
    };

    const ok = await attemptReactionActionWithRetry(action, () => {}, noDelay);

    assert.equal(ok, true);
    assert.equal(calls, 2);
  });

  it('does not retry a permanent Postgres error (RLS rejection)', async () => {
    let calls = 0;
    const action: ReactionAction = async () => {
      calls++;
      throw pgError('42501');
    };

    const ok = await attemptReactionActionWithRetry(action, () => {}, noDelay);

    assert.equal(ok, false);
    assert.equal(calls, 1);
  });

  it('gives up after the bounded retry window on persistent transient failures', async () => {
    let calls = 0;
    const action: ReactionAction = async () => {
      calls++;
      throw new Error('network request failed');
    };

    const ok = await attemptReactionActionWithRetry(action, () => {}, noDelay);

    assert.equal(ok, false);
    assert.equal(calls, 3, 'Initial attempt + 2 retries, then stop');
  });
});
