import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  markAuthReady,
  waitForAuthReady,
  __resetAuthReadyGateForTests,
} from '../lib/authReadyGate';

describe('authReadyGate', () => {
  beforeEach(() => {
    __resetAuthReadyGateForTests();
  });

  it('1. does not resolve waitForAuthReady before markAuthReady is called', async () => {
    let resolved = false;
    void waitForAuthReady().then(() => {
      resolved = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(resolved, false);
  });

  it('2. resolves every pending and future waitForAuthReady call once markAuthReady runs', async () => {
    const before = waitForAuthReady();
    markAuthReady();
    await before;

    const after = await waitForAuthReady();
    assert.equal(after, undefined);
  });

  it('3. markAuthReady is idempotent -- calling it again does not throw or reset state', async () => {
    markAuthReady();
    await waitForAuthReady();
    assert.doesNotThrow(() => markAuthReady());
    await waitForAuthReady();
  });

  it('4. a call to apiFetch would see the gate resolved immediately once ready, not per-call', async () => {
    markAuthReady();
    const start = Date.now();
    await waitForAuthReady();
    await waitForAuthReady();
    await waitForAuthReady();
    assert.ok(Date.now() - start < 20, 'already-ready waits must not add real delay');
  });
});
