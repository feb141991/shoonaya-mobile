/**
 * Sign in with Apple — Authorization Code Custody Contract (Native).
 *
 * P1 audit fix: expanded from 4 → 8 tests.
 * New cases cover:
 *  5. 401 backend response → 'http_error' (session not established)
 *  6. 503 backend response → 'http_error' (backend env vars absent)
 *  7. Body never transmitted on guard-fail paths (no_code)
 *  8. Return type is the expected literal union, not a boolean
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  transmitAppleAuthorizationCode,
  type ApiFetchLike,
  type AppleTransmissionResult,
} from '../lib/appleAuthToken';

describe('Sign in with Apple Authorization Code Custody Contract (Native)', () => {
  let fetchCalls: { path: string; options?: RequestInit }[] = [];
  let mockFetchResponse: { ok: boolean; status: number; body?: unknown } = {
    ok: true,
    status: 200,
  };

  const mockFetcher: ApiFetchLike = async (path: string, options?: RequestInit) => {
    fetchCalls.push({ path, options });
    return {
      ok: mockFetchResponse.ok,
      status: mockFetchResponse.status,
      json: async () => mockFetchResponse.body ?? { stored: true },
    } as Response;
  };

  beforeEach(() => {
    fetchCalls = [];
    mockFetchResponse = { ok: true, status: 200 };
  });

  // ── Original 4 ──────────────────────────────────────────────────────────────

  it('1. returns no_code and makes no request for null/undefined/empty codes', async () => {
    const results: AppleTransmissionResult[] = await Promise.all([
      transmitAppleAuthorizationCode(null, mockFetcher),
      transmitAppleAuthorizationCode(undefined, mockFetcher),
      transmitAppleAuthorizationCode('', mockFetcher),
      transmitAppleAuthorizationCode('   ', mockFetcher),
    ]);

    for (const r of results) assert.equal(r, 'no_code');
    assert.equal(fetchCalls.length, 0);
  });

  it('2. transmits valid code to /api/auth/apple/store-token and returns ok', async () => {
    const testCode = 'c1234567890abcdef.test_auth_code';
    const result = await transmitAppleAuthorizationCode(testCode, mockFetcher);

    assert.equal(result, 'ok');
    assert.equal(fetchCalls.length, 1);

    const call = fetchCalls[0];
    assert.equal(call.path, '/api/auth/apple/store-token');
    assert.equal(call.options?.method, 'POST');

    const body = JSON.parse(String(call.options?.body));
    assert.equal(body.authorizationCode, testCode);
  });

  it('3. returns http_error (not throws) when backend returns 500', async () => {
    mockFetchResponse = { ok: false, status: 500 };
    const result = await transmitAppleAuthorizationCode('c999.error_code', mockFetcher);
    assert.equal(result, 'http_error');
    assert.equal(fetchCalls.length, 1);
  });

  it('4. returns network_error (not throws) on network exception', async () => {
    const failingFetcher: ApiFetchLike = async () => {
      throw new Error('Network request failed');
    };
    const result = await transmitAppleAuthorizationCode('c888.network_fail', failingFetcher);
    assert.equal(result, 'network_error');
  });

  // ── P1 additions ────────────────────────────────────────────────────────────

  it('5. returns http_error on 401 — detects missing session before transmission', async () => {
    mockFetchResponse = { ok: false, status: 401 };
    const result = await transmitAppleAuthorizationCode('c777.unauthed_code', mockFetcher);
    assert.equal(result, 'http_error');
    // Still made exactly one request (no retry with stale one-time code)
    assert.equal(fetchCalls.length, 1);
  });

  it('6. returns http_error on 503 — detects backend env vars absent', async () => {
    mockFetchResponse = { ok: false, status: 503 };
    const result = await transmitAppleAuthorizationCode('c666.env_missing_code', mockFetcher);
    assert.equal(result, 'http_error');
    assert.equal(fetchCalls.length, 1);
  });

  it('7. no_code paths never transmit any body', async () => {
    await transmitAppleAuthorizationCode(null, mockFetcher);
    await transmitAppleAuthorizationCode('', mockFetcher);
    // Verify no partial body was ever sent
    assert.equal(fetchCalls.length, 0, 'Guard paths must never reach the network');
  });

  it('8. return type is the AppleTransmissionResult literal union, not a boolean', async () => {
    const okResult = await transmitAppleAuthorizationCode('c555.valid_code', mockFetcher);
    assert.ok(
      ['ok', 'no_code', 'http_error', 'network_error'].includes(okResult),
      `Expected a known result literal, got: ${okResult}`,
    );
    assert.notEqual(typeof okResult, 'boolean', 'Result must not be a boolean');
  });
});
