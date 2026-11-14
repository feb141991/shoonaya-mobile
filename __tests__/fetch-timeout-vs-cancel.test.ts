import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AbortController as ReactNativeAbortController } from 'abort-controller';
import { abortReasonOf } from '../lib/abort-reason';
import { createApiPhaseTimeout } from '../lib/api-phase-timeout';
import { isFetchCancelled, isFetchTimeout } from '../lib/fetch-error';
import { attemptJapaCompleteWithRetry, JAPA_COMPLETE_RETRY_STAGES } from '../lib/japaCompleteRetry';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The error apiFetch rejects with when its auth phase times out, on the React Native controller. */
async function phaseTimeoutError(): Promise<unknown> {
  const controller = new ReactNativeAbortController() as unknown as AbortController;
  const timeout = createApiPhaseTimeout(controller, 10, 10);
  await wait(25);
  timeout.dispose();
  return abortReasonOf(controller.signal);
}

const cancelled = () => Object.assign(new Error('Screen closed'), { name: 'AbortError' });

describe('a request timeout is not a cancellation', () => {
  it('classifies apiFetch timeouts as timeouts, never as cancelled', async () => {
    const error = await phaseTimeoutError();
    assert.equal(isFetchTimeout(error), true);
    assert.equal(isFetchCancelled(error), false);
  });

  it('still classifies a real cancellation as cancelled', () => {
    assert.equal(isFetchCancelled(cancelled()), true);
    assert.equal(isFetchTimeout(cancelled()), false);
  });

  it('a Japa save that times out is retried every time, then reported with the reason', async () => {
    const error = await phaseTimeoutError();
    let calls = 0;
    const logged: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { logged.push(args); };
    try {
      const outcome = await attemptJapaCompleteWithRetry(
        async () => { calls += 1; throw error; },
        '{}',
        () => {},
        async () => {},
      );
      assert.equal(outcome.kind, 'uncertain');
      assert.equal(calls, JAPA_COMPLETE_RETRY_STAGES + 1);
      assert.equal(logged.length, 1);
      assert.match(String((logged[0][1] as Error).message), /timed out/);
    } finally {
      console.error = original;
    }
  });

  it('a Japa save cancelled by the caller stops at once and logs nothing', async () => {
    let calls = 0;
    const outcome = await attemptJapaCompleteWithRetry(async () => { calls += 1; throw cancelled(); }, '{}', () => {}, async () => {});
    assert.equal(outcome.kind, 'uncertain');
    assert.equal(calls, 1);
  });
});
