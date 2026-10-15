import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { classifySaveError, describeSaveError } from '../lib/save-error';
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

  it('adds a short support reference for codes that carry one, and none when there is none', () => {
    assert.match(describeSaveError(db('23514'), 'en'), /\(ref 23514\)/);
    assert.doesNotMatch(describeSaveError(new TypeError('Network request failed'), 'en'), /\(ref/);
  });

  it('keeps the generic fallback for a truly unknown failure', () => {
    assert.equal(describeSaveError('boom', 'en'), 'Unable to save onboarding. Please try again.');
  });
});
