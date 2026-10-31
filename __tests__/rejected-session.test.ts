import assert from 'node:assert/strict';
import { it } from 'node:test';
import { endRejectedSession } from '../lib/rejectedSession';
import { readFileSync } from 'node:fs';

it('wires terminal rejection and non-replayable account checks to local logout', () => {
  const source = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
  assert.match(source, /handleRejectedSession\(response, refreshedToken\)/);
  assert.match(source, /handleRejectedSession\(response, accessToken\)/);
  assert.match(source, /supabase\.auth\.getUser\(accessToken\)/);
  assert.match(source, /signOut\(\{ scope: 'local' \}\)/);
  assert.match(source, /rejectedSessions\.get\(token\)/);
});

it('ends the local session on terminal AUTH_REQUIRED without consuming the response', async () => {
  let calls = 0;
  const response = Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  await endRejectedSession(response, 'old', {
    currentToken: async () => 'old', signOutLocal: async () => { calls++; },
  });
  assert.equal(calls, 1);
  assert.equal((await response.json()).code, 'AUTH_REQUIRED');
});

it('preserves outages, unrelated 401s, guests, and switched sessions', async () => {
  for (const [status, code, sent, current] of [
    [503, 'AUTH_UNAVAILABLE', 'old', 'old'],
    [401, 'OTHER', 'old', 'old'],
    [401, 'AUTH_REQUIRED', null, null],
    [401, 'AUTH_REQUIRED', 'old', 'new'],
    [200, 'AUTH_REQUIRED', 'old', 'old'],
  ] as const) {
    await endRejectedSession(Response.json({ code }, { status }), sent, {
      currentToken: async () => current,
      signOutLocal: async () => { assert.fail('must not sign out'); },
    });
  }
});

it('does not treat malformed JSON or failed session reads as account deletion', async () => {
  for (const response of [new Response('bad', { status: 401 }), Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 })]) {
    await endRejectedSession(response, 'old', {
      currentToken: async () => { throw new Error('offline'); },
      signOutLocal: async () => { assert.fail('must not sign out'); },
    });
  }
});
