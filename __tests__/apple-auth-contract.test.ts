import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { transmitAppleAuthorizationCode, type ApiFetchLike } from '../lib/appleAuthToken';

describe('Sign in with Apple Authorization Code Custody Contract (Native)', () => {
  let fetchCalls: { path: string; options?: RequestInit }[] = [];
  let mockFetchResponse: { ok: boolean; status: number; body?: any } = {
    ok: true,
    status: 200,
  };

  const mockFetcher: ApiFetchLike = async (path: string, options?: RequestInit) => {
    fetchCalls.push({ path, options });
    return {
      ok: mockFetchResponse.ok,
      status: mockFetchResponse.status,
      json: async () => mockFetchResponse.body ?? { success: true },
    } as Response;
  };

  beforeEach(() => {
    fetchCalls = [];
    mockFetchResponse = { ok: true, status: 200 };
  });

  it('1. ignores null, undefined, or empty authorization codes without making network requests', async () => {
    const r1 = await transmitAppleAuthorizationCode(null, mockFetcher);
    const r2 = await transmitAppleAuthorizationCode(undefined, mockFetcher);
    const r3 = await transmitAppleAuthorizationCode('', mockFetcher);
    const r4 = await transmitAppleAuthorizationCode('   ', mockFetcher);

    assert.equal(r1, false);
    assert.equal(r2, false);
    assert.equal(r3, false);
    assert.equal(r4, false);
    assert.equal(fetchCalls.length, 0);
  });

  it('2. transmits valid authorizationCode to authenticated backend endpoint', async () => {
    const testCode = 'c1234567890abcdef.test_auth_code';
    const success = await transmitAppleAuthorizationCode(testCode, mockFetcher);

    assert.equal(success, true);
    assert.equal(fetchCalls.length, 1);

    const call = fetchCalls[0];
    assert.equal(call.path, '/api/auth/apple/store-token');
    assert.equal(call.options?.method, 'POST');

    const body = JSON.parse(String(call.options?.body));
    assert.equal(body.authorizationCode, testCode);
  });

  it('3. fails safely without throwing when backend endpoint returns an error status', async () => {
    mockFetchResponse = { ok: false, status: 500 };

    const success = await transmitAppleAuthorizationCode('c999.error_code', mockFetcher);
    assert.equal(success, false);
    assert.equal(fetchCalls.length, 1);
  });

  it('4. catches network exceptions safely and returns false without interrupting caller', async () => {
    const failingFetcher: ApiFetchLike = async () => {
      throw new Error('Network request failed');
    };

    const success = await transmitAppleAuthorizationCode('c888.network_fail_code', failingFetcher);
    assert.equal(success, false);
  });
});
