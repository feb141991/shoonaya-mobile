import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FocusQuery } from '../lib/focusQuery';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test('rapid refocus shares a request even if it takes longer than the TTL', async () => {
  let now = 0;
  let calls = 0;
  const query = new FocusQuery<number>(30_000, () => now);
  const pending = deferred<number>();
  const fetchValue = () => { calls += 1; return pending.promise; };
  const first = query.load('a', fetchValue);
  now = 60_000;
  const second = query.load('a', fetchValue);
  assert.equal(first, second);
  pending.resolve(7);
  assert.deepEqual(await Promise.all([first, second]), [7, 7]);
  assert.equal(calls, 1);
  now += 29_999;
  assert.equal(await query.load('a', fetchValue), 7);
  assert.equal(calls, 1);
  now += 1;
  await query.load('a', fetchValue);
  assert.equal(calls, 2);
});

test('a failed request can be retried immediately', async () => {
  const query = new FocusQuery<number>(30_000);
  await assert.rejects(query.load('a', async () => { throw new Error('offline'); }));
  assert.equal(await query.load('a', async () => 2), 2);
});

test('old rejected requests cannot evict a newer identity request', async () => {
  const query = new FocusQuery<number>(30_000);
  const a = deferred<number>();
  const b = deferred<number>();
  const first = query.load('a', () => a.promise);
  const failed = assert.rejects(first);
  const second = query.load('b', () => b.promise);
  a.reject(new Error('late failure'));
  await failed;
  assert.equal(query.load('b', async () => 999), second);
  b.resolve(2);
  assert.equal(await second, 2);
});

test('clear invalidates reuse without letting old success replace the new query', async () => {
  const query = new FocusQuery<number>(30_000);
  const old = deferred<number>();
  const first = query.load('a', () => old.promise);
  query.clear();
  const second = query.load('a', async () => 2);
  old.resolve(1);
  assert.equal(await first, 1);
  assert.equal(await second, 2);
  assert.equal(query.load('a', async () => 999), second);
});
