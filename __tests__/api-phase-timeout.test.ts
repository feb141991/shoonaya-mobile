import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApiPhaseTimeout } from '../lib/api-phase-timeout';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('api request phase timeout', () => {
  it('gives transport its full budget after auth preparation', async () => {
    const controller = new AbortController();
    const timeout = createApiPhaseTimeout(controller, 150, 80);
    await wait(100);
    timeout.startTransport();
    await wait(45); // Within the transport budget, past most of the auth phase.
    assert.equal(controller.signal.aborted, false);
    await wait(45);
    assert.equal(controller.signal.aborted, true);
    assert.match(String(controller.signal.reason?.message), /API request timed out/);
    timeout.dispose();
  });

  it('fails closed if auth preparation never becomes ready', async () => {
    const controller = new AbortController();
    const timeout = createApiPhaseTimeout(controller, 20, 20);
    await wait(35);
    assert.equal(controller.signal.aborted, true);
    assert.match(String(controller.signal.reason?.message), /Authentication preparation timed out/);
    timeout.dispose();
  });

  it('clears the active timer when the request finishes', async () => {
    const controller = new AbortController();
    const timeout = createApiPhaseTimeout(controller, 20, 20);
    timeout.startTransport();
    timeout.dispose();
    await wait(30);
    assert.equal(controller.signal.aborted, false);
  });
});
