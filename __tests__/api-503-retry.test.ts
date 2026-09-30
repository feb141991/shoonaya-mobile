import test from 'node:test';
import assert from 'node:assert/strict';

import { retryTransientReadOnce } from '../lib/api-503-retry';

function response(status: number) {
  return { status };
}

test('retries one bodyless GET after a 503 and returns the retry result', async () => {
  let sends = 0;
  let waits = 0;
  const result = await retryTransientReadOnce(
    response(503),
    async () => { sends += 1; return response(200); },
    undefined,
    undefined,
    async () => { waits += 1; },
  );

  assert.deepEqual(result, response(200));
  assert.equal(sends, 1);
  assert.equal(waits, 1);
});

test('does not retry a GET that unexpectedly carries a body', async () => {
  let sends = 0;
  const result = await retryTransientReadOnce(
    response(503),
    async () => { sends += 1; return response(503); },
    'GET',
    JSON.stringify({ search: 'term' }),
    async () => assert.fail('unexpected retry delay'),
  );

  assert.deepEqual(result, response(503));
  assert.equal(sends, 0);
});

test('never retries mutation methods, including bodyless POST and DELETE', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    let sends = 0;
    const result = await retryTransientReadOnce(
      response(503),
      async () => { sends += 1; return response(503); },
      method,
      undefined,
      async () => assert.fail(`unexpected retry delay for ${method}`),
    );

    assert.deepEqual(result, response(503), `${method} response is preserved`);
    assert.equal(sends, 0, `${method} is not sent again`);
  }
});

test('preserves an existing successful or non-503 response without sending again', async () => {
  for (const status of [200, 201, 401, 429, 500]) {
    const initial = response(status);
    const result = await retryTransientReadOnce(
      initial,
      async () => assert.fail('unexpected duplicate request'),
      'GET',
      null,
      async () => assert.fail('unexpected retry delay'),
    );
    assert.equal(result, initial);
  }
});

test('does not loop if the retry fails', async () => {
  let sends = 0;
  await assert.rejects(
    retryTransientReadOnce(
      response(503),
      async () => { sends += 1; throw new Error('network failed'); },
      'GET',
      null,
      async () => {},
    ),
    /network failed/,
  );
  assert.equal(sends, 1);
});

test('does not loop if the retry also returns 503', async () => {
  let sends = 0;
  const result = await retryTransientReadOnce(
    response(503),
    async () => { sends += 1; return response(503); },
    'GET',
    null,
    async () => {},
  );
  assert.deepEqual(result, response(503));
  assert.equal(sends, 1);
});
