import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyApiDiagnostic,
  normalizeApiDiagnosticMethod,
  normalizeApiEndpoint,
  normalizeSupabaseEndpoint,
} from '../lib/apiDiagnosticPolicy';

test('normalizes endpoint identifiers and removes query values', () => {
  assert.equal(
    normalizeApiEndpoint('/api/mandali/posts/123e4567-e89b-42d3-a456-426614174000/comments?postId=private'),
    '/api/mandali/posts/:id/comments',
  );
  assert.equal(normalizeApiEndpoint('/api/vrat/vijaya-ekadashi?occurrence_id=secret'), '/api/vrat/:id');
  assert.equal(normalizeApiEndpoint('/api/calendar/upcoming?tz=Europe/London'), '/api/calendar/upcoming');
  assert.equal(normalizeApiEndpoint('https://example.com/private?token=secret'), '/api/unknown');
});

test('normalizes methods without allowing arbitrary labels', () => {
  assert.equal(normalizeApiDiagnosticMethod(undefined), 'GET');
  assert.equal(normalizeApiDiagnosticMethod('post'), 'POST');
  assert.equal(normalizeApiDiagnosticMethod('OPTIONS'), 'OTHER');
});

test('normalizes Supabase API paths and rejects other origins without keeping query values', () => {
  assert.equal(
    normalizeSupabaseEndpoint('https://project.supabase.co/rest/v1/daily_sadhana?select=private_columns', 'https://project.supabase.co'),
    '/supabase/rest/v1/daily_sadhana',
  );
  assert.equal(
    normalizeSupabaseEndpoint('https://project.supabase.co/auth/v1/token?grant_type=refresh_token', 'https://project.supabase.co'),
    '/supabase/auth/v1/token',
  );
  assert.equal(
    normalizeSupabaseEndpoint('https://project.supabase.co/storage/v1/object/user/123e4567-e89b-42d3-a456-426614174000/avatar.png?token=secret', 'https://project.supabase.co'),
    '/supabase/storage/v1/object',
  );
  assert.equal(normalizeSupabaseEndpoint('https://other.example.com/rest/v1/profiles', 'https://project.supabase.co'), null);
});

test('records HTTP failures, recovered retries, auth recovery, and slow successes', () => {
  assert.equal(classifyApiDiagnostic({ statuses: [503], finalStatus: 503, durationMs: 900 }), 'http_failure');
  assert.equal(classifyApiDiagnostic({ statuses: [503, 200], finalStatus: 200, durationMs: 800 }), 'retry_recovered');
  assert.equal(classifyApiDiagnostic({ statuses: [401, 200], finalStatus: 200, durationMs: 800 }), 'auth_recovered');
  assert.equal(classifyApiDiagnostic({ statuses: [200], finalStatus: 200, durationMs: 3_000 }), 'slow_success');
});

test('omits fast successful requests and intentional cancellations', () => {
  assert.equal(classifyApiDiagnostic({ statuses: [200], finalStatus: 200, durationMs: 120 }), null);
  assert.equal(classifyApiDiagnostic({ statuses: [], finalStatus: null, durationMs: 1, terminalError: 'cancelled' }), null);
  assert.equal(classifyApiDiagnostic({ statuses: [], finalStatus: null, durationMs: 8_000, terminalError: 'timeout' }), 'timeout');
});
