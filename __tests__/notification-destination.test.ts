import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { notificationDate, mandaliNotificationTarget } from '../lib/notificationDestination';
import { formatLocalDateOnly } from '../lib/dateOnly';
import { loadMandaliNotificationTarget } from '../lib/mandaliNotificationTarget';

const id = '12345678-1234-1234-1234-123456789012';
const other = '87654321-1234-1234-1234-123456789012';

describe('notification destination context', () => {
  it('keeps the notification civil date even when opened on a later day', () => {
    assert.equal(formatLocalDateOnly(notificationDate('2026-09-29')!), '2026-09-29');
    assert.equal(formatLocalDateOnly(notificationDate('2028-02-29')!), '2028-02-29');
  });
  it('rejects rolled-over, ambiguous, duplicated and malformed date parameters', () => {
    for (const value of ['2026-02-29', '2026-02-31', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026/01/01', '20260101', '', ['2026-01-01'], undefined]) {
      assert.equal(notificationDate(value), null);
    }
  });
  it('Panchang consumes the link on mount and warm parameter changes, using the strict parser for picker input too', () => {
    const source = readFileSync(new URL('../app/panchang.tsx', import.meta.url), 'utf8');
    assert.match(source, /useLocalSearchParams/);
    assert.match(source, /useState\(\(\) => notificationDate\(linkedDate\) \?\? new Date\(\)\)/);
    assert.match(source, /if \(date\) setSelectedDate\(date\);[\s\S]*?\}, \[linkedDate\]\)/);
    assert.match(source, /const date = parseDateOnly\(dateStr\)/);
    assert.match(source, /if \(linkedDate === undefined\) \{\s*if \(previous !== undefined\) setSelectedDate\(new Date\(\)\)/);
  });
  it('distinguishes legacy Mandali hub links from specific and malformed targets', () => {
    assert.equal(mandaliNotificationTarget({}), null);
    assert.deepEqual(mandaliNotificationTarget({ postId: id, commentId: other }), { kind: 'post', id, commentId: other });
    assert.deepEqual(mandaliNotificationTarget({ requestId: id }), { kind: 'request', id });
    for (const params of [{ postId: 'invalid' }, { requestId: [id] }, { postId: id, requestId: other }, { commentId: id }]) {
      assert.deepEqual(mandaliNotificationTarget(params), { kind: 'invalid' });
    }
  });
  it('loads the specific post through the current authenticated API, never from the cached feed', async () => {
    const post = { id, content: 'A real stored post' };
    const result = await loadMandaliNotificationTarget({ kind: 'post', id }, 'viewer', async (url, options) => {
      assert.equal(url, `/api/mandali/notification-target?postId=${id}`);
      assert.deepEqual(options, { expectedUserId: 'viewer' });
      return { ok: true, status: 200, json: async () => ({ kind: 'post', post, comment: null }) };
    });
    assert.deepEqual(result, { kind: 'post', post, comment: null });
  });
  it('a missing or forbidden target is a fallback, whereas outages remain retryable errors', async () => {
    for (const status of [403, 404]) {
      assert.equal(await loadMandaliNotificationTarget({ kind: 'request', id }, 'viewer', async () => ({ status, ok: false, json: async () => null })), null);
    }
    await assert.rejects(loadMandaliNotificationTarget({ kind: 'post', id }, 'viewer', async () => ({ status: 503, ok: false, json: async () => null })));
  });
  it('rejects mismatched posts, absent linked comments, and another account’s connection response', async () => {
    const fetchValue = (value: unknown) => async () => ({ ok: true, status: 200, json: async () => value });
    await assert.rejects(loadMandaliNotificationTarget({ kind: 'post', id }, 'viewer', fetchValue({ kind: 'post', post: { id: other, content: 'wrong' } })));
    await assert.rejects(loadMandaliNotificationTarget({ kind: 'post', id, commentId: other }, 'viewer', fetchValue({ kind: 'post', post: { id, content: 'post' }, comment: null })));
    await assert.rejects(loadMandaliNotificationTarget({ kind: 'request', id }, 'viewer', fetchValue({ kind: 'request', request: { id, requester_id: 'one', recipient_id: 'two', status: 'pending' } })));
  });
  it('names the other person in a request, from either side, never the viewer', async () => {
    const fetchValue = (value: unknown) => async () => ({ ok: true, status: 200, json: async () => value });
    const accepted = { id, requester_id: 'viewer', recipient_id: 'peer', status: 'accepted', created_at: '2026-10-30',
      counterparty: { full_name: 'PeerPublic', username: 'PeerPublic', avatar_url: null } };
    const result = await loadMandaliNotificationTarget({ kind: 'request', id }, 'viewer', fetchValue({ kind: 'request', request: accepted }));
    assert.deepEqual(result, { kind: 'request', request: accepted });
    const sheet = readFileSync(new URL('../components/mandali/NotificationTargetSheet.tsx', import.meta.url), 'utf8');
    assert.match(sheet, /content\.request\.counterparty/);
    assert.doesNotMatch(sheet, /request\.requester\b/, 'the sheet must not show the requester: for an accepted request that is the viewer');
  });
  it('renders target UI with identity/cancellation checks and safe fallback/retry states', () => {
    const sheet = readFileSync(new URL('../components/mandali/NotificationTargetSheet.tsx', import.meta.url), 'utf8');
    assert.match(sheet, /if \(!active \|\| !lease\.isCurrent\(\)\) return/);
    assert.match(sheet, /content\.request\.recipient_id === userId/);
    assert.match(sheet, /This item is unavailable/);
    assert.match(sheet, /ctaLabel="Retry"/);
    const screen = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');
    assert.match(screen, /mandaliNotificationTarget\(targetParams\)/);
    assert.match(screen, /<NotificationTargetSheet/);
  });
});
