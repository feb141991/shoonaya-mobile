import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiRequestError, classifySaveError, describeSaveError, requestErrorFromResponse } from '../lib/save-error';
import { InvalidDateInputError } from '../lib/date-input';

// A Supabase/PostgREST database error is a plain object, not an Error: that is exactly why the
// real reason used to be replaced by the generic line.
const db = (code: string, message = 'raw provider text with "profiles" and column detail') => ({ code, message, details: null, hint: null });

describe('classifySaveError', () => {
  it('recognises the bad-date database error from the failed Android save (22008)', () => {
    assert.deepEqual(classifySaveError(db('22008', 'date/time field value out of range: "18081991"')), { kind: 'invalid_date', code: '22008' });
    assert.equal(classifySaveError(db('22007')).kind, 'invalid_date');
  });

  it('is not fooled into thinking a database error is an Error instance', () => {
    assert.equal(db('22008') instanceof Error, false);
    assert.equal(classifySaveError(db('22008')).kind, 'invalid_date');
  });

  it('maps the other data and constraint failures', () => {
    assert.equal(classifySaveError(db('22P02')).kind, 'invalid_value');
    assert.equal(classifySaveError(db('23514')).kind, 'invalid_value');
    assert.equal(classifySaveError(db('23502')).kind, 'invalid_value');
    assert.equal(classifySaveError(db('23505')).kind, 'conflict');
    assert.equal(classifySaveError(db('42501')).kind, 'permission');
    assert.equal(classifySaveError({ status: 401 }).kind, 'session');
    assert.equal(classifySaveError({ status: 403 }).kind, 'permission');
    assert.equal(classifySaveError(db('PGRST301')).kind, 'session');
  });

  it('recognises network failures', () => {
    assert.equal(classifySaveError(new TypeError('Network request failed')).kind, 'network');
    assert.equal(classifySaveError(Object.assign(new Error('x'), { name: 'AbortError' })).kind, 'network');
  });

  it('treats an unvalidated typed date reaching the save as an invalid date', () => {
    assert.equal(classifySaveError(new InvalidDateInputError('date_of_birth', 'calendar')).kind, 'invalid_date');
  });

  it('falls back to unknown for anything else, including null and strings', () => {
    assert.equal(classifySaveError(null).kind, 'unknown');
    assert.equal(classifySaveError('boom').kind, 'unknown');
    assert.equal(classifySaveError(new Error('something odd')).kind, 'unknown');
  });
});

describe('describeSaveError', () => {
  it('tells the person what to fix for a bad date, in both languages', () => {
    assert.match(describeSaveError(db('22008'), 'en'), /calendar date|DD\/MM\/YYYY/);
    assert.match(describeSaveError(new InvalidDateInputError('date_of_birth', 'future'), 'en'), /future/);
    assert.notEqual(describeSaveError(db('22008'), 'hi'), describeSaveError(db('22008'), 'en'));
  });

  it('never echoes provider text or an Error message to the screen', () => {
    for (const error of [db('22008'), db('23514'), db('42501'), db('99999'), new Error('secret internal detail: profiles.date_of_birth')]) {
      const text = describeSaveError(error, 'en');
      assert.doesNotMatch(text, /profiles|column|raw provider|secret internal|date_of_birth/i, text);
    }
  });

  it('never shows a database error code or a status number to a person', () => {
    for (const e of [db('23514'), db('42501'), db('99999'), db('22008'), new TypeError('Network request failed'), new Error('x')]) {
      const text = describeSaveError(e, 'en');
      assert.doesNotMatch(text, /\(ref|reference|23514|42501|99999|22008/i, text);
    }
  });

  it('keeps the generic fallback for a truly unknown failure', () => {
    assert.equal(describeSaveError('boom', 'en'), 'Unable to save onboarding. Please try again.');
  });
});

describe('a save the server refused (Personal details and other API saves)', () => {
  const refused = (status: number, code: string | null = null, reason: ApiRequestError['dateReason'] = null) => new ApiRequestError(status, code, reason);
  const shown = (e: unknown) => describeSaveError(e, 'en', 'details');

  it('classifies by HTTP status and the API\'s own code', () => {
    assert.equal(classifySaveError(refused(400)).kind, 'invalid_value');
    assert.equal(classifySaveError(refused(422)).kind, 'invalid_value');
    assert.equal(classifySaveError(refused(400, 'INVALID_VALUE')).kind, 'invalid_value');
    assert.equal(classifySaveError(refused(400, 'INVALID_DATE_OF_BIRTH', 'future')).kind, 'invalid_date');
    assert.equal(classifySaveError(refused(401)).kind, 'session');
    assert.equal(classifySaveError(refused(403)).kind, 'permission');
    assert.equal(classifySaveError(refused(409)).kind, 'conflict');
    assert.equal(classifySaveError(refused(429)).kind, 'server');
    assert.equal(classifySaveError(refused(500)).kind, 'server');
    assert.equal(classifySaveError(refused(503)).kind, 'server');
    assert.equal(classifySaveError(refused(418)).kind, 'unknown');
  });

  it('only a real network failure says "check your connection"; every server answer says something else', () => {
    const networkText = shown(new TypeError('Network request failed'));
    assert.match(networkText, /connection/i);
    for (const status of [400, 401, 403, 409, 422, 429, 500, 502, 503]) {
      assert.doesNotMatch(shown(refused(status)), /connection/i, `HTTP ${status}`);
    }
  });

  it('each cause tells the person what to do', () => {
    assert.match(shown(refused(401)), /sign in again/i);
    assert.match(shown(refused(400)), /check them and try again/i);
    assert.match(shown(refused(403)), /contact support/i);
    assert.match(shown(refused(500)), /on our side/i);
    assert.match(shown(refused(400, 'INVALID_DATE_OF_BIRTH', 'future')), /future/i);
    assert.match(shown(refused(400, 'INVALID_DATE_OF_BIRTH', 'too_old')), /year|1900|earlier|old/i);
  });

  it('shows no number at all: neither the HTTP status nor a code means anything to a person', () => {
    for (const status of [400, 401, 403, 409, 418, 422, 429, 500, 503]) {
      assert.doesNotMatch(shown(refused(status)), /\b\d{3}\b|\(ref/, `HTTP ${status}`);
    }
  });

  it('gives a support reference only where nothing can be fixed by the person and the server sent a request id', () => {
    const id = '3F9A2C1B-7d4e-4a55-9b0c-1234567890ab';
    const serverError = new ApiRequestError(500, null, null, id);
    assert.match(shown(serverError), /Support reference: 3f9a2c1b\./, 'lower-cased, first eight characters');
    assert.match(shown(new ApiRequestError(418, null, null, id)), /Support reference: 3f9a2c1b\./);
    assert.match(shown(new ApiRequestError(403, null, null, id)), /Support reference: 3f9a2c1b\./);
    // Things the person can fix or wait out get no reference, even when an id exists.
    for (const status of [400, 401, 409, 422]) {
      assert.doesNotMatch(shown(new ApiRequestError(status, null, null, id)), /reference/i, `HTTP ${status}`);
    }
    // No id from the server means no reference rather than a made-up one.
    assert.doesNotMatch(shown(new ApiRequestError(500)), /reference/i);
    assert.match(describeSaveError(serverError, 'hi', 'details'), /सहायता संदर्भ: 3f9a2c1b/);
  });

  it('reads the request id from the response header, and ignores one that is not a plain id', async () => {
    const header = (value: string | null) => ({ get: (n: string) => (n.toLowerCase() === 'x-request-id' ? value : null) });
    const ok = await requestErrorFromResponse({ status: 500, json: async () => ({}), headers: header('3f9a2c1b-7d4e-4a55-9b0c-1234567890ab') });
    assert.equal(ok.supportReference, '3f9a2c1b');
    for (const bad of ['', 'short', '<script>alert(1)</script>', 'x'.repeat(200), null]) {
      const e = await requestErrorFromResponse({ status: 500, json: async () => ({}), headers: header(bad) });
      assert.equal(e.supportReference, null, String(bad).slice(0, 20));
    }
    const noHeaders = await requestErrorFromResponse({ status: 500, json: async () => ({}) });
    assert.equal(noHeaders.supportReference, null);
  });

  it('uses the details wording, not the onboarding wording, on the details screen only', () => {
    assert.match(describeSaveError('boom', 'en', 'details'), /your details/);
    assert.doesNotMatch(describeSaveError('boom', 'en', 'details'), /onboarding/i);
    assert.match(describeSaveError('boom', 'en'), /onboarding/i);
    assert.doesNotMatch(describeSaveError(refused(401), 'en', 'details'), /setup/i);
    assert.match(describeSaveError(refused(401), 'en'), /setup/i);
  });

  it('reads only the fixed code and reason from a response body, never its text', async () => {
    const e = await requestErrorFromResponse({ status: 400, json: async () => ({ error: 'profiles.date_of_birth secret detail', code: 'INVALID_DATE_OF_BIRTH', reason: 'calendar' }) });
    assert.equal(e.status, 400);
    assert.equal(e.apiCode, 'INVALID_DATE_OF_BIRTH');
    assert.equal(e.dateReason, 'calendar');
    assert.doesNotMatch(shown(e), /secret|profiles|date_of_birth/);
    assert.doesNotMatch(e.message, /secret|profiles/);
  });

  it('survives a body that is not JSON, and ignores a code that is not one of ours', async () => {
    const html = await requestErrorFromResponse({ status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } });
    assert.equal(html.status, 502);
    assert.equal(html.apiCode, null);
    const odd = await requestErrorFromResponse({ status: 400, json: async () => ({ code: 'drop table profiles;', reason: 'nonsense' }) });
    assert.equal(odd.apiCode, null);
    assert.equal(odd.dateReason, null);
  });

  it('Hindi has a line for the new server case', () => {
    assert.notEqual(describeSaveError(refused(500), 'hi', 'details'), describeSaveError(refused(500), 'en', 'details'));
  });
});

describe('Personal details screen wiring', () => {
  const screen = readFileSync(resolve(__dirname, '../app/settings/personal-details.tsx'), 'utf8');
  it('classifies the failure instead of always blaming the connection', () => {
    assert.match(screen, /if \(!response\.ok\) throw await requestErrorFromResponse\(response\)/);
    assert.match(screen, /Alert\.alert\('Could not save', describeSaveError\(error, 'en', 'details'\)\)/);
    assert.doesNotMatch(screen, /Alert\.alert\('Could not save', 'Check your connection/);
  });
});
