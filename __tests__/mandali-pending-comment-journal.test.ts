import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  confirmPendingMandaliComment,
  mergePendingMandaliComments,
  readPendingMandaliComments,
  removePendingMandaliComment,
  renderPendingMandaliComment,
  savePendingMandaliComment,
  type PendingMandaliComment,
} from '../lib/mandaliPendingComments';
import { clearAllMandaliCaches } from '../lib/mandaliCache';
import type { CommentRow } from '../lib/mandali';

const values = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    get length() { return values.size; },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
  },
};

const operation = '11111111-1111-4111-8111-111111111111';
const pending: PendingMandaliComment = {
  userId: 'user-A', localId: `pending-${operation}`, postId: 'post-1', body: 'Namaste',
  parentId: null, clientOperationId: operation, createdAt: '2026-09-27T00:00:00Z',
  displayName: 'A', baseCommentCount: 3,
};

beforeEach(async () => { await clearAllMandaliCaches(); });

describe('Mandali pending comment journal', () => {
  it('recovers the same operation ID after screen restart, scoped to its owner', async () => {
    await savePendingMandaliComment(pending);
    assert.deepEqual(await readPendingMandaliComments('user-A'), [pending]);
    assert.deepEqual(await readPendingMandaliComments('user-B'), []);
    assert.equal(renderPendingMandaliComment((await readPendingMandaliComments('user-A'))[0]).pendingStatus, 'failed');
    await removePendingMandaliComment(pending);
    assert.deepEqual(await readPendingMandaliComments('user-A'), []);
  });

  it('purges all user journals with the existing sign-out cache sweep', async () => {
    await savePendingMandaliComment(pending);
    await clearAllMandaliCaches();
    assert.deepEqual(await readPendingMandaliComments('user-A'), []);
  });

  it('rejects a journal row stored under the wrong operation key', async () => {
    values.set('shoonaya_mandali_pending_comment_v1_user_user-A_22222222-2222-4222-8222-222222222222', JSON.stringify(pending));
    assert.deepEqual(await readPendingMandaliComments('user-A'), []);
  });

  it('preserves pending bubbles on a server refresh and merges early server echoes only once', () => {
    const local = renderPendingMandaliComment(pending);
    const server = { ...local, id: 'server-id', pendingStatus: undefined, clientOperationId: undefined } as CommentRow;
    assert.deepEqual(mergePendingMandaliComments([server], [local, local]), [server, local]);
    assert.deepEqual(confirmPendingMandaliComment([local, server], local.id, server.id), [server]);
    assert.deepEqual(confirmPendingMandaliComment([local], local.id, server.id), [server]);
  });
});
