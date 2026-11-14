import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
// The exact AbortController React Native 0.86 installs as the global one
// (node_modules/react-native/Libraries/Core/setUpXHR.js). It drops abort reasons.
import { AbortController as ReactNativeAbortController } from 'abort-controller';
import { abortReasonOf, abortWithReason } from '../lib/abort-reason';
import { createApiPhaseTimeout } from '../lib/api-phase-timeout';
import { createGetRequestSingleFlight } from '../lib/getRequestSingleFlight';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rnController = () => new ReactNativeAbortController() as unknown as AbortController;

describe('abort reasons on the React Native AbortController', () => {
  it('the polyfill really does drop the reason (why this module exists)', () => {
    const controller = rnController();
    controller.abort(new Error('kept?'));
    assert.equal(controller.signal.aborted, true);
    assert.equal((controller.signal as { reason?: unknown }).reason, undefined);
  });

  it('keeps the reason through abortWithReason', () => {
    const controller = rnController();
    const reason = Object.assign(new Error('API request timed out'), { name: 'AbortError' });
    abortWithReason(controller, reason);
    assert.equal(abortReasonOf(controller.signal), reason);
  });

  it('never yields undefined, even for a bare abort()', () => {
    const controller = rnController();
    controller.abort();
    const reason = abortReasonOf(controller.signal);
    assert.ok(reason instanceof Error);
    assert.equal((reason as Error).name, 'AbortError');
  });

  it('a request-phase timeout names the phase that stalled', async () => {
    const controller = rnController();
    const timeout = createApiPhaseTimeout(controller, 20, 20);
    await wait(35);
    assert.equal(controller.signal.aborted, true);
    assert.match(String((abortReasonOf(controller.signal) as Error).message), /Authentication preparation timed out/);
    timeout.dispose();
  });

  it('a GET shared between callers rejects with an Error when the caller cancels', async () => {
    const flights = createGetRequestSingleFlight();
    const caller = rnController();
    abortWithReason(caller, Object.assign(new Error('Screen closed'), { name: 'AbortError' }));
    await assert.rejects(
      flights.run('key', async () => new Response('{}'), caller.signal),
      (error: unknown) => error instanceof Error && error.message === 'Screen closed',
    );
  });
});
