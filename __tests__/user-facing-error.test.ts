import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ApiRequestError,
  UserMessageError,
  classifyFailure,
  describeFailure,
  requestErrorFromResponse,
} from '../lib/user-facing-error';

const FALLBACK = 'Could not create your Sankalpa. Please try again.';
const ID = '3F9A2C1B-7d4e-4a55-9b0c-1234567890ab';
const failed = (status: number, extra: { code?: string | null; id?: string | null; msg?: string | null } = {}) =>
  new ApiRequestError(status, extra.code ?? null, null, extra.id ?? null, extra.msg ?? null);

describe('classifyFailure', () => {
  it('maps an HTTP answer to a cause', () => {
    assert.equal(classifyFailure(failed(401)).kind, 'session');
    assert.equal(classifyFailure(failed(403)).kind, 'permission');
    assert.equal(classifyFailure(failed(429)).kind, 'rate_limited');
    assert.equal(classifyFailure(failed(500)).kind, 'server');
    assert.equal(classifyFailure(failed(503)).kind, 'server');
    assert.equal(classifyFailure(failed(400)).kind, 'refused');
    assert.equal(classifyFailure(failed(422)).kind, 'refused');
    assert.equal(classifyFailure(failed(404)).kind, 'unknown');
    assert.equal(classifyFailure(failed(409)).kind, 'unknown');
  });

  it('recognises a request that never got an answer as a network failure', () => {
    assert.equal(classifyFailure(new TypeError('Network request failed')).kind, 'network');
    assert.equal(classifyFailure(Object.assign(new Error('x'), { name: 'AbortError' })).kind, 'network');
    assert.equal(classifyFailure(new Error('The request timed out')).kind, 'network');
  });

  it('treats an answer that is not JSON as trouble on the server, not on the phone', () => {
    assert.equal(classifyFailure(new SyntaxError('JSON Parse error: Unexpected character: <')).kind, 'server');
    assert.equal(classifyFailure(new SyntaxError('Unexpected token < in JSON at position 0')).kind, 'server');
  });

  it('reads a database error object by its code, never by its text', () => {
    assert.equal(classifyFailure({ code: '42501', message: 'permission denied for table profiles' }).kind, 'permission');
    assert.equal(classifyFailure({ code: 'PGRST301', message: 'JWT expired' }).kind, 'session');
    assert.equal(classifyFailure({ code: '23505', message: 'duplicate key value violates unique constraint "x"' }).kind, 'unknown');
  });

  it('classifies null, strings and unknown values as unknown', () => {
    for (const v of [null, undefined, 'boom', 42, {}, new Error('something odd')]) assert.equal(classifyFailure(v).kind, 'unknown');
  });
});

describe('describeFailure', () => {
  it('uses the screen\'s own sentence when the cause is a refused value or unclassified', () => {
    assert.equal(describeFailure(failed(400), FALLBACK), FALLBACK);
    assert.equal(describeFailure(new Error('anything'), FALLBACK), FALLBACK);
    assert.equal(describeFailure('boom', FALLBACK), FALLBACK);
  });

  it('says the right generic thing for each cause', () => {
    assert.match(describeFailure(new TypeError('Network request failed'), FALLBACK), /Check your connection/);
    assert.match(describeFailure(failed(401), FALLBACK), /sign in again/i);
    assert.match(describeFailure(failed(403), FALLBACK), /contact support/i);
    assert.match(describeFailure(failed(429), FALLBACK), /wait a moment/i);
    assert.match(describeFailure(failed(500), FALLBACK), /on our side/i);
  });

  it('"Check your connection" is said only for a real network failure', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429, 500, 502, 503]) {
      assert.doesNotMatch(describeFailure(failed(status), FALLBACK), /connection/i, `HTTP ${status}`);
    }
    assert.doesNotMatch(describeFailure(new SyntaxError('JSON Parse error: Unexpected character: <'), FALLBACK), /connection/i);
  });

  it('never shows server text, an Error message, a status number or a database detail', () => {
    const leaks = ['Invalid request body', 'clientCompletionId, mantra, count are required', 'Internal Server Error', 'profiles.date_of_birth', 'duplicate key value'];
    for (const text of leaks) {
      for (const e of [new Error(text), { code: '23505', message: text }, failed(400, { msg: null }), failed(500), failed(418)]) {
        const shown = describeFailure(e, FALLBACK);
        assert.doesNotMatch(shown, /Invalid request|clientCompletionId|Internal Server|profiles\.|duplicate key/, shown);
        assert.doesNotMatch(shown, /\b\d{3}\b|HTTP|status/i, shown);
      }
    }
  });

  it('shows a trusted server message only when the call site opted in, and a deliberate message from our own code', () => {
    assert.equal(describeFailure(failed(429, { msg: 'Please wait 4 more days.' }), FALLBACK), 'Please wait 4 more days.');
    assert.equal(describeFailure(new UserMessageError('The family response was incomplete. Refresh and try again.'), FALLBACK), 'The family response was incomplete. Refresh and try again.');
    assert.equal(describeFailure(failed(429), FALLBACK) === 'Please wait 4 more days.', false);
  });

  it('lets a screen word a specific status, such as a taken username', () => {
    const own = { 409: 'That username is already taken.' };
    assert.equal(describeFailure(failed(409), FALLBACK, 'en', own), 'That username is already taken.');
    assert.equal(describeFailure(failed(500), FALLBACK, 'en', own).includes('taken'), false);
  });

  it('adds a support reference only where nothing can be fixed and the server sent a request id', () => {
    assert.match(describeFailure(failed(500, { id: ID }), FALLBACK), /Support reference: 3f9a2c1b\./);
    assert.match(describeFailure(failed(403, { id: ID }), FALLBACK), /Support reference: 3f9a2c1b\./);
    assert.match(describeFailure(failed(404, { id: ID }), FALLBACK), /Support reference: 3f9a2c1b\./);
    for (const status of [400, 401, 422, 429]) assert.doesNotMatch(describeFailure(failed(status, { id: ID }), FALLBACK), /reference/i, `HTTP ${status}`);
    assert.doesNotMatch(describeFailure(failed(500), FALLBACK), /reference/i);
  });

  it('speaks Hindi when asked and reads English for a language it has no wording for', () => {
    assert.notEqual(describeFailure(failed(500), FALLBACK, 'hi'), describeFailure(failed(500), FALLBACK, 'en'));
    assert.equal(describeFailure(failed(500), FALLBACK, 'pa'), describeFailure(failed(500), FALLBACK, 'en'));
    assert.match(describeFailure(failed(500, { id: ID }), FALLBACK, 'hi'), /सहायता संदर्भ: 3f9a2c1b/);
  });
});

describe('requestErrorFromResponse', () => {
  const header = (value: string | null) => ({ get: (n: string) => (n.toLowerCase() === 'x-request-id' ? value : null) });

  it('keeps the status, the API code and the request id, and ignores the body text', async () => {
    const e = await requestErrorFromResponse({ status: 400, json: async () => ({ error: 'profiles.date_of_birth is secret', code: 'INVALID_VALUE' }), headers: header(ID) });
    assert.equal(e.status, 400);
    assert.equal(e.apiCode, 'INVALID_VALUE');
    assert.equal(e.supportReference, '3f9a2c1b');
    assert.equal(e.userMessage, null);
    assert.doesNotMatch(e.message, /secret|profiles/);
  });

  it('trusts a server message only on request, only when it is a short plain string', async () => {
    const make = (error: unknown, trust: boolean) => requestErrorFromResponse({ status: 429, json: async () => ({ error }) }, { trustServerMessage: trust });
    assert.equal((await make('Please wait 4 more days.', true)).userMessage, 'Please wait 4 more days.');
    assert.equal((await make('Please wait 4 more days.', false)).userMessage, null);
    assert.equal((await make('x'.repeat(300), true)).userMessage, null);
    assert.equal((await make({ nested: 'object' }, true)).userMessage, null);
    assert.equal((await make('   ', true)).userMessage, null);
  });

  it('uses a body the caller already read, because a response body can be read only once', async () => {
    let reads = 0;
    const e = await requestErrorFromResponse({ status: 400, json: async () => { reads++; return { code: 'NOPE' }; } }, { parsedBody: { code: 'INVALID_VALUE' } });
    assert.equal(reads, 0);
    assert.equal(e.apiCode, 'INVALID_VALUE');
  });

  it('survives an HTML or empty body, and refuses a request id that is not a plain id', async () => {
    const html = await requestErrorFromResponse({ status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } });
    assert.equal(html.status, 502);
    assert.equal(html.apiCode, null);
    for (const bad of ['', 'short', '<script>x</script>', 'x'.repeat(200), null]) {
      const e = await requestErrorFromResponse({ status: 500, json: async () => ({}), headers: header(bad) });
      assert.equal(e.supportReference, null, String(bad).slice(0, 12));
    }
  });
});
