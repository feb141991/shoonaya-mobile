import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithDeadline, isSupabaseAuthRequest, requestUrl } from '../lib/fetchDeadline';
import { isFetchCancelled, isFetchTimeout } from '../lib/fetch-error';

const hangs: typeof fetch = () => new Promise<Response>(() => {});   // a connection that never answers, and ignores abort

describe('Supabase sign-in calls have a deadline', () => {
  it('recognises auth endpoints only', () => {
    assert.equal(isSupabaseAuthRequest('https://x.supabase.co/auth/v1/token?grant_type=refresh_token'), true);
    assert.equal(isSupabaseAuthRequest('https://x.supabase.co/rest/v1/profiles'), false);
    assert.equal(isSupabaseAuthRequest('https://x.supabase.co/storage/v1/object/avatars/a.jpg'), false);
    assert.equal(isSupabaseAuthRequest('not a url'), false);
    assert.equal(requestUrl(new URL('https://x.supabase.co/auth/v1/user')), 'https://x.supabase.co/auth/v1/user');
  });

  it('a hung refresh fails as a timeout instead of waiting forever', async () => {
    const started = Date.now();
    await assert.rejects(fetchWithDeadline(hangs, 'https://x.supabase.co/auth/v1/token', { method: 'POST' }, 30), (error: unknown) => {
      assert.equal(isFetchTimeout(error), true);
      assert.equal(isFetchCancelled(error), false);
      return true;
    });
    assert.ok(Date.now() - started < 1_000);
  });

  it('passes a prompt answer through untouched and hands the request a signal', async () => {
    let sawSignal = false;
    const ok: typeof fetch = async (_input, init) => { sawSignal = init?.signal instanceof AbortSignal; return new Response('{}', { status: 200 }); };
    const response = await fetchWithDeadline(ok, 'https://x.supabase.co/auth/v1/user', undefined, 1_000);
    assert.equal(response.status, 200);
    assert.equal(sawSignal, true);
  });

  it('leaves a caller-supplied signal in charge', async () => {
    const caller = new AbortController();
    let received: AbortSignal | null | undefined;
    const ok: typeof fetch = async (_input, init) => { received = init?.signal; return new Response('{}'); };
    await fetchWithDeadline(ok, 'https://x.supabase.co/auth/v1/user', { signal: caller.signal }, 1_000);
    assert.equal(received, caller.signal);
  });
});
