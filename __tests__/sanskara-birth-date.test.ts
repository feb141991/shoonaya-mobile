import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ACCOUNT_DELETION_COPY, accountDeletionCopy } from '../lib/accountDeletionCopy';
import { BIRTH_DATE_MIN, birthDateState, birthDateToSave } from '../lib/sanskaraBirthDate';

const NOW = new Date('2026-11-07T10:00:00Z');
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// ── What the profile read means ────────────────────────────────────────────────────────────────────────────────────────

test('only a successful read of a row with no date of birth is "missing"', () => {
  assert.equal(birthDateState(null), 'loading');
  assert.equal(birthDateState({ data: { date_of_birth: null }, error: null }), 'missing');
  assert.equal(birthDateState({ data: { date_of_birth: '' }, error: null }), 'missing');
  assert.equal(birthDateState({ data: { date_of_birth: '   ' }, error: null }), 'missing');
  assert.equal(birthDateState({ data: { date_of_birth: '2012-03-04' }, error: null }), 'saved');
});

test('a failed read, or no row, is "unknown": it never leads to a write (AGENTS 18)', () => {
  assert.equal(birthDateState({ data: null, error: { code: '57014', message: 'timeout' } }), 'unknown');
  assert.equal(birthDateState({ data: { date_of_birth: null }, error: { code: 'PGRST301' } }), 'unknown', 'data alongside an error is still a failure');
  assert.equal(birthDateState({ data: null, error: null }), 'unknown', 'no row is not "no date of birth"');
});

// ── What may be sent ───────────────────────────────────────────────────────────────────────────────────────────────────

test('a real date is normalised to ISO and the incident string is refused', () => {
  assert.deepEqual(birthDateToSave('2012-03-04', NOW), { ok: true, iso: '2012-03-04' });
  assert.deepEqual(birthDateToSave('04/03/2012', NOW), { ok: true, iso: '2012-03-04' });
  assert.deepEqual(birthDateToSave('18081991', NOW), { ok: true, iso: '1991-08-18' }, 'the 2026-10-09 incident string reads as one real date, as ISO');
  assert.equal(birthDateToSave('1819-01-01', NOW).ok, false, 'before the earliest year');
});

test('malformed, impossible, future and empty input is refused and never sent', () => {
  for (const bad of ['', '   ', null, undefined, '31/02/2012', '2012-02-30', '2012-13-01', '12/34/5678', '2012/3', 'abc', '2012-03-04T00:00:00Z extra', '2099-01-01', '2026-11-08']) {
    assert.equal(birthDateToSave(bad as never, NOW).ok, false, String(bad));
  }
  assert.equal(birthDateToSave('2026-11-07', NOW).ok, true, 'today is allowed: a newborn is a valid record');
  assert.equal(BIRTH_DATE_MIN, '1920-01-01', 'the picker bound matches the profile contract (AGENTS 12)');
});

// ── Wiring (source checks; the screens are not run here) ───────────────────────────────────────────────────────────────

test('the card is mounted only where a person enters a code, keyed by identity', () => {
  const modal = read('../components/sanskara/SanskaraHandoverModal.tsx');
  assert.match(modal, /mode === 'accept' && userId \? <SanskaraBirthDateCard key=\{userId\} userId=\{userId\} \/> : null/);
  const screen = read('../app/kul/sanskara.tsx');
  assert.match(screen, /<SanskaraHandoverModal[\s\S]{0,400}userId=\{currentUserId \?\? undefined\}/);
});

test('the card offers nothing unless the read says "missing", and sends only a parsed date', () => {
  const card = read('../components/sanskara/SanskaraBirthDateCard.tsx');
  assert.match(card, /if \(state !== 'missing'\) return null;/);
  assert.match(card, /birthDateState\(\{ data: result\.data \?\? null, error: result\.error \}\)/);
  assert.match(card, /const parsed = birthDateToSave\(value\);\s*if \(!parsed\.ok\)/);
  assert.match(card, /date_of_birth: parsed\.iso/);
  assert.doesNotMatch(card, /date_of_birth: value/, 'raw picker text must never reach the API');
  assert.match(card, /seq !== readSeq\.current/, 'a late response for an older read or identity is dropped (AGENTS 22)');
  assert.match(card, /describeSaveError\(failure, 'en', 'details'\)/);
  assert.doesNotMatch(card, /\.message/, 'no provider text on screen (AGENTS 12)');
  assert.doesNotMatch(card, /AsyncStorage/, 'never persisted');
  assert.match(card, /minDate=\{BIRTH_DATE_MIN\}/);
});

// ── The deletion warning says when and that it is permanent ────────────────────────────────────────────────────────────

test('the sole-manager warning says it is permanent and waits for the 30-day grace period, in every language', () => {
  const en = ACCOUNT_DELETION_COPY.en.soleManagerDependents('Mira');
  assert.match(en, /permanently deleted/);
  assert.match(en, /30-day grace period/);
  assert.match(en, /add another adult from your Kul/);
  const hi = ACCOUNT_DELETION_COPY.hi.soleManagerDependents('Mira');
  assert.match(hi, /30 दिन/);
  assert.match(hi, /स्थायी रूप से/);
  const pa = ACCOUNT_DELETION_COPY.pa.soleManagerDependents('Mira');
  assert.match(pa, /30 ਦਿਨਾਂ/);
  assert.match(pa, /ਪੱਕੇ ਤੌਰ/);
  for (const text of [en, hi, pa]) assert.ok(text.includes('Mira'));
});

// ── Plural wording and the failed-code message ─────────────────────────────────────────────────────────────────────────

test('the sole-manager warning is plural for more than one child in every language, singular for one', () => {
  for (const lang of ['en', 'hi', 'pa'] as const) {
    const copy = ACCOUNT_DELETION_COPY[lang];
    assert.notEqual(copy.soleManagerDependents('A, B', 2), copy.soleManagerDependents('A', 1), `${lang}: two children must not read as one`);
    assert.equal(copy.soleManagerDependents('A'), copy.soleManagerDependents('A', 1), `${lang}: one child is the default`);
  }
  assert.match(ACCOUNT_DELETION_COPY.en.soleManagerDependents('A, B', 2), /their timelines/);
  assert.match(ACCOUNT_DELETION_COPY.hi.soleManagerDependents('A, B', 2), /समयरेखाएँ/);
  assert.match(ACCOUNT_DELETION_COPY.pa.soleManagerDependents('A, B', 2), /ਸਮਾਂ-ਰੇਖਾਵਾਂ/);
  assert.match(ACCOUNT_DELETION_COPY.hi.soleManagerDependents('A', 1), /समयरेखा भी/);
  assert.match(ACCOUNT_DELETION_COPY.pa.soleManagerDependents('A', 1), /ਸਮਾਂ-ਰੇਖਾ ਵੀ/);
});

test('the deletion sheet passes how many children are named', () => {
  const sheet = read('../components/settings/AccountDeletionSheet.tsx');
  assert.match(sheet, /copy\.soleManagerDependents\(soleManagerNames\(snapshot\.soleManagerDependents\), snapshot\.soleManagerDependents\.length\)/);
});

test('a refused code tells the child the date of birth must match the one recorded, without saying which part failed', () => {
  const modal = read('../components/sanskara/SanskaraHandoverModal.tsx');
  assert.match(modal, /your date of birth must also be saved in your profile and be the one they recorded/);
  assert.doesNotMatch(modal, /date of birth does(n't| not) match/i, 'the server answers the same for every refusal; the screen must not claim which one');
});
