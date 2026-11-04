import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  SanskaraError,
  buildSanskaraPayload,
  guardSanskaraRead,
  guardSanskaraWrite,
  type SanskaraEarlyHandoverStatus,
} from '../lib/sanskaraContract';
import { acceptHandoverCodeWith } from '../lib/sanskaraAcceptCode';
import {
  EARLY_ACCEPTED_MESSAGE,
  earlyConfirmedMessage,
  earlyHandoverView,
  earlyStartWarning,
} from '../lib/sanskaraEarlyHandover';
import { ApiRequestError } from '../lib/user-facing-error';

const R = '11111111-1111-4111-8111-111111111111';
const S = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'ab'.repeat(32);
const NOW = '2026-11-04T10:00:00.123456+00:00';

const status = (over: Partial<SanskaraEarlyHandoverStatus> = {}): SanskaraEarlyHandoverStatus => ({
  available: true, min_age: 14, state: 'none', approvals_have: 0, approvals_total: 2,
  i_approved: false, i_started: false, expires_at: null, acceptor: null, ...over,
});

// ── The contract ────────────────────────────────────────────────────────────────────────────────────────────────────────

test('status read: exact shape, every state, and nothing extra', () => {
  for (const state of ['none', 'awaiting_approval', 'ready', 'awaiting_confirmation', 'expired']) {
    assert.equal(guardSanskaraRead('early-handover-status', status({ state: state as never })), true, state);
  }
  assert.equal(guardSanskaraRead('early-handover-status', status({ min_age: null, available: false })), true, 'feature off');
  assert.equal(guardSanskaraRead('early-handover-status', status({ expires_at: NOW, state: 'ready' })), true);
  assert.equal(guardSanskaraRead('early-handover-status', status({ acceptor: { id: S, username: 'asha', full_name: null } })), true);

  const bad: unknown[] = [
    null, [], 'x', {},
    { ...status(), extra: 1 },
    status({ state: 'cancelled' as never }),
    status({ available: 'yes' as never }),
    status({ min_age: -1 }),
    status({ min_age: 1.5 }),
    status({ approvals_have: -1 }),
    status({ approvals_total: '2' as never }),
    status({ i_approved: 1 as never }),
    status({ expires_at: 'tomorrow' }),
    status({ acceptor: { id: 'nope', username: null, full_name: null } }),
    status({ acceptor: { id: S, username: null, full_name: null, token: 'x' } as never }),
  ];
  for (const value of bad) assert.equal(guardSanskaraRead('early-handover-status', value), false, JSON.stringify(value));
  const { i_started: _drop, ...missing } = status();
  assert.equal(guardSanskaraRead('early-handover-status', missing), false, 'a missing key');
});

test('start result: the code is present on a first answer and absent on a replay', () => {
  const base = { handover_id: S, status: 'awaiting_approval', approvals_needed: 1, expires_at: NOW };
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, token: TOKEN }), true);
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, status: 'ready', approvals_needed: 0, token: TOKEN }), true);
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, replayed: true }), true);
  assert.equal(guardSanskaraWrite('start-early-handover', base), false, 'no code and not a replay');
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, token: TOKEN, replayed: true }), false, 'a replay must never carry a code');
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, token: 'short' }), false);
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, token: TOKEN, status: 'awaiting_confirmation' }), false);
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, token: TOKEN, handover_id: 'x' }), false);
  assert.equal(guardSanskaraWrite('start-early-handover', { ...base, token: TOKEN, extra: 1 }), false);
});

test('approve, cancel, accept and confirm results are exact', () => {
  assert.equal(guardSanskaraWrite('approve-early-handover', { status: 'ready', approvals_needed: 0 }), true);
  assert.equal(guardSanskaraWrite('approve-early-handover', { status: 'awaiting_approval', approvals_needed: 2, replayed: true }), true);
  assert.equal(guardSanskaraWrite('approve-early-handover', { status: 'cancelled', approvals_needed: 0 }), false);
  assert.equal(guardSanskaraWrite('approve-early-handover', { status: 'ready' }), false);

  assert.equal(guardSanskaraWrite('cancel-early-handover', { cancelled: true }), true);
  assert.equal(guardSanskaraWrite('cancel-early-handover', { cancelled: false }), true);
  assert.equal(guardSanskaraWrite('cancel-early-handover', { cancelled: 1 }), false);

  assert.equal(guardSanskaraWrite('accept-early-handover', { status: 'awaiting_confirmation' }), true);
  assert.equal(guardSanskaraWrite('accept-early-handover', { status: 'ready' }), false, 'accepting must never read as a completed move');
  assert.equal(guardSanskaraWrite('accept-early-handover', { moved: 3, dropped_as_duplicates: 0 }), false);

  assert.equal(guardSanskaraWrite('confirm-early-handover', { moved: 3, dropped_as_duplicates: 0 }), true);
  assert.equal(guardSanskaraWrite('confirm-early-handover', { moved: -1, dropped_as_duplicates: 0 }), false);
  assert.equal(guardSanskaraWrite('confirm-early-handover', { status: 'awaiting_confirmation' }), false);
});

test('payloads: ids and codes are validated before anything is sent', () => {
  for (const action of ['start-early-handover', 'approve-early-handover', 'cancel-early-handover', 'confirm-early-handover'] as const) {
    assert.deepEqual(buildSanskaraPayload(action, { subjectId: S.toUpperCase() }, R), { requestId: R, subjectId: S });
    for (const bad of ['', 'nope', null, 5]) {
      assert.throws(() => buildSanskaraPayload(action, { subjectId: bad as never }, R), SanskaraError, `${action} ${String(bad)}`);
    }
    assert.throws(() => buildSanskaraPayload(action, {} as never, R), SanskaraError, `${action} without a subject`);
    assert.throws(() => buildSanskaraPayload(action, { subjectId: S, token: TOKEN } as never, R), SanskaraError, `${action} with a smuggled field`);
  }
  assert.deepEqual(buildSanskaraPayload('accept-early-handover', { token: TOKEN.toUpperCase() }, R), { requestId: R, token: TOKEN });
  for (const bad of ['', 'ab'.repeat(31), 'zz'.repeat(32), ` ${TOKEN}`, null, 5]) {
    assert.throws(() => buildSanskaraPayload('accept-early-handover', { token: bad as never }, R), SanskaraError, String(bad));
  }
  assert.throws(() => buildSanskaraPayload('accept-early-handover', { token: TOKEN, subjectId: S } as never, R), SanskaraError);
});

// ── What the card says and offers ───────────────────────────────────────────────────────────────────────────────────────

const ids = (v: ReturnType<typeof earlyHandoverView>) => v?.actions.map((a) => a.id);

test('nothing is offered when the feature is off or the child is not eligible', () => {
  assert.equal(earlyHandoverView(status({ available: false, min_age: null }), 'Asha'), null);
  assert.equal(earlyHandoverView(status({ available: false }), 'Asha'), null);
});

test('no open hand-over: a single start action, not marked as needing attention', () => {
  const v = earlyHandoverView(status(), 'Asha')!;
  assert.deepEqual(ids(v), ['start']);
  assert.equal(v.needsAttention, false);
  assert.match(v.body, /every manager/i);
});

test('awaiting approval: a manager who has not agreed is asked; one who has is only told the count', () => {
  const asked = earlyHandoverView(status({ state: 'awaiting_approval', approvals_have: 1, approvals_total: 2 }), 'Asha')!;
  assert.deepEqual(ids(asked), ['approve', 'cancel']);
  assert.equal(asked.needsAttention, true);
  assert.match(asked.body, /1 of 2 managers have agreed/);
  assert.match(asked.body, /cannot be undone/);

  const waiting = earlyHandoverView(status({ state: 'awaiting_approval', approvals_have: 1, approvals_total: 2, i_approved: true }), 'Asha')!;
  assert.deepEqual(ids(waiting), ['cancel']);
  assert.equal(waiting.needsAttention, false);

  const starter = earlyHandoverView(status({ state: 'awaiting_approval', approvals_have: 1, approvals_total: 2, i_approved: true, i_started: true }), 'Asha')!;
  assert.deepEqual(ids(starter), ['restart', 'cancel'], 'the starter can get a new code');
});

test('ready: nobody can confirm or approve; the starter can start again', () => {
  const other = earlyHandoverView(status({ state: 'ready', approvals_have: 2, i_approved: true }), 'Asha')!;
  assert.deepEqual(ids(other), ['cancel']);
  const starter = earlyHandoverView(status({ state: 'ready', approvals_have: 2, i_approved: true, i_started: true }), 'Asha')!;
  assert.deepEqual(ids(starter), ['restart', 'cancel']);
  assert.match(starter.body, /Nothing has moved/);
});

test('confirm is offered only to the starter, and only with an acceptor to name', () => {
  const acceptor = { id: S, username: 'asha_k', full_name: 'Asha K' };
  const confirm = earlyHandoverView(status({ state: 'awaiting_confirmation', i_started: true, i_approved: true, acceptor }), 'Asha')!;
  assert.deepEqual(ids(confirm), ['confirm', 'cancel']);
  assert.equal(confirm.needsAttention, true);
  assert.match(confirm.body, /Asha K \(@asha_k\) entered the code/);
  assert.match(confirm.body, /Nothing moves until you confirm/);

  const other = earlyHandoverView(status({ state: 'awaiting_confirmation', i_approved: true, acceptor: null }), 'Asha')!;
  assert.deepEqual(ids(other), ['cancel'], 'a manager who did not start it cannot confirm');
  assert.equal(other.needsAttention, false);

  const gone = earlyHandoverView(status({ state: 'awaiting_confirmation', i_started: true, i_approved: true, acceptor: null }), 'Asha')!;
  assert.ok(!ids(gone)!.includes('confirm'), 'never confirm into an account that cannot be named');
  assert.deepEqual(ids(gone), ['restart', 'cancel']);

  const onlyUsername = earlyHandoverView(status({ state: 'awaiting_confirmation', i_started: true, acceptor: { id: S, username: 'asha_k', full_name: null } }), 'Asha')!;
  assert.match(onlyUsername.body, /@asha_k entered/);
  const nameless = earlyHandoverView(status({ state: 'awaiting_confirmation', i_started: true, acceptor: { id: S, username: null, full_name: ' ' } }), 'Asha')!;
  assert.match(nameless.body, /an account entered/);
});

test('expired: start again only when still available; switched off or ineligible leaves only cancel', () => {
  assert.deepEqual(ids(earlyHandoverView(status({ state: 'expired' }), 'Asha')), ['restart', 'cancel']);
  assert.deepEqual(ids(earlyHandoverView(status({ state: 'expired', available: false }), 'Asha')), ['cancel']);
  for (const state of ['awaiting_approval', 'ready', 'awaiting_confirmation'] as const) {
    const v = earlyHandoverView(status({ state, available: false, i_started: true, i_approved: true, acceptor: { id: S, username: 'x', full_name: null } }), 'Asha')!;
    assert.deepEqual(ids(v), ['cancel'], `${state} while unavailable`);
  }
});

test('exactly one primary action at most, and no state offers two ways to move the records', () => {
  const states = ['none', 'awaiting_approval', 'ready', 'awaiting_confirmation', 'expired'] as const;
  for (const state of states) for (const i_started of [false, true]) for (const i_approved of [false, true]) for (const available of [false, true]) {
    for (const acceptor of [null, { id: S, username: 'a', full_name: null }]) {
      const v = earlyHandoverView(status({ state, i_started, i_approved, available, acceptor }), 'Asha');
      if (!v) continue;
      assert.ok(v.actions.filter((a) => a.primary).length <= 1, JSON.stringify({ state, i_started, i_approved, available }));
      assert.ok(v.actions.filter((a) => a.id === 'confirm').length <= 1);
      if (v.actions.some((a) => a.id === 'confirm')) assert.ok(i_started && acceptor && state === 'awaiting_confirmation' && available);
      if (v.actions.some((a) => a.id === 'approve')) assert.ok(!i_approved && state === 'awaiting_approval' && available);
      assert.ok(v.actions.length > 0, 'a hand-over in progress can always be cancelled');
    }
  }
});

test('the warnings say what is lost and that it cannot be undone', () => {
  const start = earlyStartWarning('Asha');
  assert.match(start.body, /lose access/);
  assert.match(start.body, /cannot be undone/);
  assert.match(start.body, /Every manager must agree/);
  assert.match(start.body, /date of birth/);
  assert.match(EARLY_ACCEPTED_MESSAGE, /Nothing has moved yet/);
  assert.match(earlyConfirmedMessage({ moved: 1, dropped_as_duplicates: 0 }), /1 milestone was handed over/);
  assert.match(earlyConfirmedMessage({ moved: 2, dropped_as_duplicates: 1 }), /1 was not added/);
});

// ── One field, two kinds of code ────────────────────────────────────────────────────────────────────────────────────────

test('a code is tried as a hand-over at 18 first, and as an early hand-over only after a 404', async () => {
  const calls: string[] = [];
  const claim = await acceptHandoverCodeWith({
    acceptClaim: async () => { calls.push('claim'); return { moved: 2, dropped_as_duplicates: 1 }; },
    acceptEarly: async () => { calls.push('early'); },
  }, TOKEN);
  assert.deepEqual(claim, { kind: 'claim', moved: 2, dropped_as_duplicates: 1 });
  assert.deepEqual(calls, ['claim']);

  calls.length = 0;
  const early = await acceptHandoverCodeWith({
    acceptClaim: async () => { calls.push('claim'); throw new ApiRequestError(404, 'sanskara_not_found'); },
    acceptEarly: async () => { calls.push('early'); },
  }, TOKEN);
  assert.deepEqual(early, { kind: 'early' });
  assert.deepEqual(calls, ['claim', 'early']);
});

test('any failure other than 404 is final and never reaches the other route', async () => {
  for (const failure of [new ApiRequestError(503, 'sanskara_unavailable'), new ApiRequestError(429, null), new ApiRequestError(401, null), new ApiRequestError(409, 'sanskara_conflict'), new TypeError('network')]) {
    let earlyCalled = false;
    await assert.rejects(
      acceptHandoverCodeWith({
        acceptClaim: async () => { throw failure; },
        acceptEarly: async () => { earlyCalled = true; },
      }, TOKEN),
      (error) => error === failure,
    );
    assert.equal(earlyCalled, false, String((failure as Error).message));
  }
});

test('a code neither route knows reports the early route\'s answer, not a success', async () => {
  const notFound = new ApiRequestError(404, 'sanskara_not_found');
  await assert.rejects(
    acceptHandoverCodeWith({
      acceptClaim: async () => { throw new ApiRequestError(404, 'sanskara_not_found'); },
      acceptEarly: async () => { throw notFound; },
    }, TOKEN),
    (error) => error === notFound,
  );
});

// ── The screen and the card (source checks; not a device run) ──────────────────────────────────────────────────────────

const card = readFileSync(new URL('../components/sanskara/SanskaraEarlyHandover.tsx', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../app/kul/sanskara.tsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../components/sanskara/SanskaraHandoverModal.tsx', import.meta.url), 'utf8');

test('the one-time code is never persisted or sent anywhere but the clipboard the person chose', () => {
  assert.ok(!/AsyncStorage|userScopedStorage|SecureStore|console\./.test(card), 'the card must not store or log the code');
  assert.ok(/setCode\(res\.token\)/.test(card));
  assert.ok((card.match(/setCode\(null\)/g) ?? []).length >= 2, 'the code is dropped on cancel and on hand-over');
});

test('the card never shows an error\'s own text and never acts on a failed read', () => {
  assert.ok(!/\.message\b/.test(card), 'a failure goes through describeSanskaraFailure');
  assert.ok(/describeSanskaraFailure\(/.test(card));
  assert.ok(/if \(!status\) return null;/.test(card), 'with no successful read there is nothing to act on');
});

test('the card drops late answers and is keyed by identity and child', () => {
  assert.ok((card.match(/seq !== loadSeq\.current/g) ?? []).length >= 2, 'both the answer and the failure path check that they are still the newest read');
  assert.ok(/mounted\.current/.test(card));
  assert.ok(/key=\{`\$\{currentUserId\}:\$\{activeSubject\.dependent\.id\}`\}/.test(screen), 'a different person or child must remount the card');
});

test('the screen offers the card only to a current manager of a child who is not yet 18', () => {
  const at = screen.indexOf('<SanskaraEarlyHandover');
  assert.ok(at > 0);
  const guard = screen.slice(Math.max(0, at - 400), at);
  assert.ok(/activeSubject\.dependent\.can_manage/.test(guard));
  assert.ok(/activeHandover\.stage === 'minor' \|\| activeHandover\.stage === 'approaching'/.test(guard));
});

test('every action asks the person before it moves anything, and uses the contract writers', () => {
  assert.ok((card.match(/confirmDialog\(/g) ?? []).length >= 4, 'start, approve and confirm each ask first');
  for (const action of ['start-early-handover', 'approve-early-handover', 'cancel-early-handover', 'confirm-early-handover']) {
    assert.ok(card.includes(`'${action}'`), action);
  }
});

test('accepting a code goes through the one helper, and only a hand-over at 18 reloads the timeline', () => {
  assert.ok(/acceptHandoverCode\(currentUserId, token\)/.test(screen));
  assert.ok(/res\.kind === 'claim'/.test(screen));
  assert.ok(/result\.kind === 'early' \? EARLY_ACCEPTED_MESSAGE/.test(modal));
});
