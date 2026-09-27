import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGetRequestSingleFlight, getRequestKey } from '../lib/getRequestSingleFlight';

describe('GET request sharing', () => {
  it('returns the original response for a single subscriber', async () => {
    const flights = createGetRequestSingleFlight();
    const response = Response.json({ ok: true });
    assert.strictEqual(await flights.run('single', async () => response), response);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it('sends one request and gives each caller an independently readable body', async () => {
    const flights = createGetRequestSingleFlight();
    let sends = 0;
    let release!: (response: Response) => void;
    const transport = new Promise<Response>((resolve) => { release = resolve; });
    const send = () => { sends++; return transport; };
    const first = flights.run('user-A:feed', send);
    const second = flights.run('user-A:feed', send);
    assert.equal(sends, 0);
    await Promise.resolve();
    assert.equal(sends, 1);
    release(Response.json({ posts: [1] }));
    const [a, b] = await Promise.all([first, second]);
    assert.deepEqual(await a.json(), { posts: [1] });
    assert.deepEqual(await b.json(), { posts: [1] });
  });

  it('one caller cancelling leaves the other alive; all cancelling stops the transport', async () => {
    const flights = createGetRequestSingleFlight();
    const a = new AbortController();
    const b = new AbortController();
    let transportSignal!: AbortSignal;
    let release!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => { release = resolve; });
    const send = (signal: AbortSignal) => { transportSignal = signal; return request; };
    const first = flights.run('same', send, a.signal);
    const second = flights.run('same', send, b.signal);
    await Promise.resolve();
    a.abort();
    await assert.rejects(first);
    assert.equal(transportSignal.aborted, false);
    release(Response.json({ ok: true }));
    assert.deepEqual(await (await second).json(), { ok: true });

    const c = new AbortController();
    let abandoned!: AbortSignal;
    const pending = flights.run('abandoned', (signal) => {
      abandoned = signal;
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('transport aborted')));
      });
    }, c.signal);
    await Promise.resolve();
    c.abort();
    await assert.rejects(pending);
    assert.equal(abandoned.aborted, true);
  });

  it('does not share across owners or different request shapes, and skips exports', () => {
    const path = '/api/native/home-summary';
    const a = getRequestKey('revision-A', path, { headers: { 'Accept-Language': 'en' } });
    assert.notEqual(a, getRequestKey('revision-B', path, { headers: { 'Accept-Language': 'en' } }));
    assert.notEqual(a, getRequestKey('revision-A', path, { headers: { 'Accept-Language': 'hi' } }));
    assert.equal(getRequestKey('revision-A', '/api/user/export', {}), null);
    assert.equal(getRequestKey('revision-A', path, { headers: { Accept: 'audio/mpeg' } }), null);
    assert.equal(getRequestKey('revision-A', path, { method: 'POST' }), null);
  });

  it('does not cache a failed flight', async () => {
    const flights = createGetRequestSingleFlight();
    await assert.rejects(flights.run('key', async () => { throw new Error('offline'); }));
    assert.equal(await (await flights.run('key', async () => Response.json({ recovered: true }))).json().then((data) => data.recovered), true);
  });
});
