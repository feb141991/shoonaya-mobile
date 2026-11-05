import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { accountDeletionCopy } from '../lib/accountDeletionCopy';
import { buildSanskaraPayload, guardSanskaraRead, type SanskaraManagerPicker } from '../lib/sanskaraContract';
import { addManagerWarning, managerLabel, managersView, soleManagerNames, stepDownWarning } from '../lib/sanskaraManagers';

const R = '11111111-1111-4111-8111-111111111111';
const ME = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const CAND = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-11-05T10:00:00.123456+00:00';

const me = { id: ME, username: 'asha', full_name: 'Asha K', is_me: true, added_at: NOW };
const other = { id: OTHER, username: 'ravi', full_name: null, is_me: false, added_at: NOW };
const cand = { id: CAND, username: 'mira', full_name: 'Mira S' };
const picker = (over: Partial<SanskaraManagerPicker> = {}): SanskaraManagerPicker => ({ managers: [me], candidates: [cand], limit: 4, ...over });

// ── The contract ───────────────────────────────────────────────────────────────────────────────────────────────────────

test('managers read: exact shape accepted, anything else refused', () => {
  assert.equal(guardSanskaraRead('managers', picker()), true);
  assert.equal(guardSanskaraRead('managers', picker({ managers: [me, other], candidates: [] })), true);
  assert.equal(guardSanskaraRead('managers', { ...picker(), extra: 1 }), false, 'an unknown top-level key');
  assert.equal(guardSanskaraRead('managers', { managers: [me], candidates: [cand] }), false, 'missing limit');
  assert.equal(guardSanskaraRead('managers', picker({ managers: [{ ...me, consent: true } as never] })), false, 'an extra manager field');
  assert.equal(guardSanskaraRead('managers', picker({ candidates: [{ ...cand, consent_religious_data: true } as never] })), false, 'an extra candidate field');
  assert.equal(guardSanskaraRead('managers', picker({ candidates: [{ ...cand, id: 'nope' }] })), false, 'a candidate id that is not a uuid');
  assert.equal(guardSanskaraRead('managers', picker({ managers: [{ ...me, is_me: 'yes' as never }] })), false);
  assert.equal(guardSanskaraRead('managers', picker({ managers: [{ ...me, added_at: 'yesterday' }] })), false);
  assert.equal(guardSanskaraRead('managers', picker({ limit: 0 })), false);
  assert.equal(guardSanskaraRead('managers', picker({ limit: 99 })), false);
  assert.equal(guardSanskaraRead('managers', null), false);
  assert.equal(guardSanskaraRead('managers', []), false);
});

test('sole-manager read: a list of exactly id and display name', () => {
  assert.equal(guardSanskaraRead('sole-manager-dependents', []), true);
  assert.equal(guardSanskaraRead('sole-manager-dependents', [{ id: ME, display_name: 'Mira' }]), true);
  assert.equal(guardSanskaraRead('sole-manager-dependents', [{ id: ME, display_name: 'Mira', birth_date: '2020-01-01' }]), false);
  assert.equal(guardSanskaraRead('sole-manager-dependents', [{ id: 'nope', display_name: 'Mira' }]), false);
  assert.equal(guardSanskaraRead('sole-manager-dependents', { id: ME, display_name: 'Mira' }), false, 'an object is not a list');
  assert.equal(guardSanskaraRead('sole-manager-dependents', [{ id: ME, display_name: null }]), false);
});

test('add-manager and remove-manager payloads carry exactly the subject and account', () => {
  assert.deepEqual(buildSanskaraPayload('add-manager', { subjectId: ME, accountId: CAND }, R), { requestId: R, subjectId: ME, accountId: CAND });
  assert.deepEqual(buildSanskaraPayload('remove-manager', { subjectId: ME, accountId: ME }, R), { requestId: R, subjectId: ME, accountId: ME });
  assert.throws(() => buildSanskaraPayload('add-manager', { subjectId: ME, accountId: 'x' }, R));
  assert.throws(() => buildSanskaraPayload('add-manager', { subjectId: ME, accountId: CAND, kulId: R } as never, R));
});

// ── What the card says and offers ──────────────────────────────────────────────────────────────────────────────────────

test('the only manager is told plainly what leaving does, and is offered adding but not stepping down', () => {
  const view = managersView(picker(), 'Asha');
  assert.equal(view.isSoleManager, true);
  assert.equal(view.canAdd, true);
  assert.equal(view.canStepDown, false, 'the last manager cannot step down');
  assert.match(view.body, /only manager/);
  assert.match(view.body, /deleted/);
  assert.equal(view.title, 'Managers · only you');
});

test('with another manager, stepping down is offered and the warning about deletion is gone', () => {
  const view = managersView(picker({ managers: [me, other] }), 'Asha');
  assert.equal(view.isSoleManager, false);
  assert.equal(view.canStepDown, true);
  assert.doesNotMatch(view.body, /deleted/);
  assert.equal(view.title, 'Managers · 2');
});

test('a single manager who is not the caller is not "only you"', () => {
  const view = managersView(picker({ managers: [other] }), 'Asha');
  assert.equal(view.isSoleManager, false);
  assert.equal(view.canStepDown, false);
  assert.doesNotMatch(view.body, /deleted/);
});

test('a manager list without the caller never offers stepping down', () => {
  assert.equal(managersView(picker({ managers: [other, { ...other, id: CAND }] }), 'Asha').canStepDown, false);
});

test('adding is offered only with room and someone to add, and says why not', () => {
  const none = managersView(picker({ candidates: [] }), 'Asha');
  assert.equal(none.canAdd, false);
  assert.match(none.addHint ?? '', /No one in your Kul/);
  const full = managersView(picker({ managers: [me, other, { ...other, id: CAND }, { ...other, id: R }], limit: 4 }), 'Asha');
  assert.equal(full.canAdd, false);
  assert.match(full.addHint ?? '', /most managers allowed \(4\)/);
  assert.equal(managersView(picker(), 'Asha').addHint, null);
});

test('warnings name the child and the person, and say what happens before anything is done', () => {
  const add = addManagerWarning('Asha', 'Mira S (@mira)');
  assert.match(add.title, /Mira S/);
  assert.match(add.body, /immediately/);
  assert.match(add.body, /Asha/);
  const down = stepDownWarning('Asha');
  assert.match(down.body, /no longer see/);
});

test('a person is labelled by name and handle, never by id', () => {
  assert.equal(managerLabel({ full_name: 'Mira S', username: 'mira' }), 'Mira S (@mira)');
  assert.equal(managerLabel({ full_name: null, username: 'mira' }), '@mira');
  assert.equal(managerLabel({ full_name: ' ', username: null }), 'A member of your Kul');
});

// ── The account-deletion warning ───────────────────────────────────────────────────────────────────────────────────────

test('children named in the deletion warning: up to three, then a count', () => {
  assert.equal(soleManagerNames(['A']), 'A');
  assert.equal(soleManagerNames(['A', 'B', 'C']), 'A, B, C');
  assert.equal(soleManagerNames(['A', 'B', 'C', 'D', 'E']), 'A, B, C +2');
});

test('the deletion warning exists in every language and names the children and the way out', () => {
  for (const lang of ['en', 'hi', 'pa'] as const) {
    const copy = accountDeletionCopy(lang);
    assert.ok(copy.soleManagerDependents('Mira').includes('Mira'), lang);
    assert.ok(copy.soleManagerUnchecked.length > 20, lang);
  }
  assert.match(accountDeletionCopy('en').soleManagerDependents('Mira'), /add another adult from your Kul/);
});

// ── Wiring (source checks; the screens are not run here) ───────────────────────────────────────────────────────────────

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the Sanskara screen shows the managers card only for a child the person can manage, keyed by identity and child', () => {
  const screen = read('../app/kul/sanskara.tsx');
  assert.match(screen, /<SanskaraManagers[\s\S]{0,200}key=\{`managers:\$\{currentUserId\}:\$\{activeSubject\.dependent\.id\}`\}/);
  const at = screen.indexOf('<SanskaraManagers');
  assert.match(screen.slice(Math.max(0, at - 260), at), /can_manage && currentUserId/);
});

test('the card reads on demand, offers nothing when the read fails, and never caches', () => {
  const card = read('../components/sanskara/SanskaraManagers.tsx');
  assert.match(card, /if \(!picker\) return null;/);
  assert.match(card, /fetchSanskaraManagers\(userId, subjectId\)/);
  assert.doesNotMatch(card, /AsyncStorage|SecureStore/);
  assert.match(card, /minHeight: MIN_TOUCH_TARGET/);
  assert.match(card, /flex: 1, fontFamily: FONTS\.sansMedium/, 'row text is bounded (AGENTS 17)');
});

test('account deletion asks the server, shows "could not check" for a failed check and never "none"', () => {
  const screen = read('../app/settings/detail-screen.tsx');
  assert.match(screen, /fetchSoleManagerDependents\(appIdentity\.userId\)[\s\S]{0,200}\.catch\(\(\) => null\)/);
  assert.match(screen, /soleManagerDependents,\n/);
  const sheet = read('../components/settings/AccountDeletionSheet.tsx');
  assert.match(sheet, /snapshot\.soleManagerDependents === null\s*\?\s*copy\.soleManagerUnchecked/);
  assert.match(sheet, /snapshot\.soleManagerDependents\.length > 0/);
});
