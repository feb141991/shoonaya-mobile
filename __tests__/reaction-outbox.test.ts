import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() {
        return memoryStore.size;
      },
      key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  queueReactionChange,
  resumePendingReactionChanges,
  retryFailedReactionChanges,
  hasFailedReactionChange,
  listFailedReactionChanges,
  discardFailedReactionChange,
  clearReactionOutbox,
  clearAllReactionOutboxes,
  type PerformReactionAction,
} from '../lib/reactionOutbox';

// Every outbox call below passes this as its trailing delay argument --
// the outbox's internal retry loop defaults to real setTimeout-based
// backoff, which would make a "permanently failing" test case take several
// real seconds. This collapses those waits to nothing.
const noDelay = async () => {};

function ok(): PerformReactionAction {
  return async () => {};
}

function failing(): PerformReactionAction {
  return async () => {
    throw new Error('network request failed');
  };
}

describe('Reaction outbox -- durability, supersede semantics, and identity isolation', () => {
  beforeEach(async () => {
    await clearAllReactionOutboxes();
  });

  it('a successful reaction change leaves nothing queued', async () => {
    await queueReactionChange('user-A', 'post', 'post-1', 'pranam', ok(), noDelay);
    assert.equal(await hasFailedReactionChange('user-A', 'post', 'post-1'), false);
  });

  it('a permanently-failing change is recorded as failed, not silently dropped', async () => {
    await queueReactionChange('user-B', 'post', 'post-1', 'love', failing(), noDelay);
    assert.equal(await hasFailedReactionChange('user-B', 'post', 'post-1'), true);
  });

  it('resumePendingReactionChanges only resumes pending entries, never failed ones', async () => {
    await queueReactionChange('user-C', 'post', 'post-1', 'love', failing(), noDelay);
    assert.equal(await hasFailedReactionChange('user-C', 'post', 'post-1'), true);

    let resumeCalls = 0;
    await resumePendingReactionChanges('user-C', async () => {
      resumeCalls++;
    }, noDelay);

    assert.equal(resumeCalls, 0, 'A failed entry must wait for an explicit Retry, not auto-resume');
    assert.equal(await hasFailedReactionChange('user-C', 'post', 'post-1'), true, 'Still failed -- resume did not touch it');
  });

  it('retryFailedReactionChanges explicitly retries a failed entry and can clear it', async () => {
    await queueReactionChange('user-D', 'post', 'post-1', 'love', failing(), noDelay);
    assert.equal(await hasFailedReactionChange('user-D', 'post', 'post-1'), true);

    await retryFailedReactionChanges('user-D', ok(), noDelay);

    assert.equal(await hasFailedReactionChange('user-D', 'post', 'post-1'), false);
  });

  it('queueing a second desired state for the same target supersedes the first, not duplicates it', async () => {
    const bodies: Array<string | null> = [];
    const performAction: PerformReactionAction = async (_targetType, _targetId, desiredReaction) => {
      bodies.push(desiredReaction);
      throw new Error('network request failed'); // force both to land as queued/failed for inspection
    };
    await queueReactionChange('user-E', 'post', 'post-1', 'pranam', performAction, noDelay);
    await queueReactionChange('user-E', 'post', 'post-1', 'love', performAction, noDelay);

    const envelope = await AsyncStorage.getItem('shoonaya_reaction_outbox_v1_user_user-E');
    const parsed = JSON.parse(envelope!);
    assert.equal(parsed.pendingOperations.length, 1, 'A second queue for the same target must supersede, not duplicate');
    assert.equal(parsed.pendingOperations[0].desiredReaction, 'love', 'The latest desired state must win');
  });

  it('a post target and a comment target with the same id are tracked independently', async () => {
    await queueReactionChange('user-F', 'post', 'shared-id', 'pranam', failing(), noDelay);
    await queueReactionChange('user-F', 'comment', 'shared-id', 'love', failing(), noDelay);

    const envelope = await AsyncStorage.getItem('shoonaya_reaction_outbox_v1_user_user-F');
    const parsed = JSON.parse(envelope!);
    assert.equal(parsed.pendingOperations.length, 2, 'post:shared-id and comment:shared-id must not collide');
  });

  it('removing a reaction (desiredReaction null) queues and can fail like setting one', async () => {
    await queueReactionChange('user-G', 'post', 'post-1', null, failing(), noDelay);
    assert.equal(await hasFailedReactionChange('user-G', 'post', 'post-1'), true);
  });

  it('listFailedReactionChanges returns every failed target for a user in one read', async () => {
    await queueReactionChange('user-H', 'post', 'post-1', 'pranam', failing(), noDelay);
    await queueReactionChange('user-H', 'comment', 'comment-1', 'love', failing(), noDelay);
    await queueReactionChange('user-H', 'post', 'post-2', 'insightful', ok(), noDelay);

    const failed = await listFailedReactionChanges('user-H');
    const keys = failed.map((f) => `${f.targetType}:${f.targetId}`).sort();
    assert.deepEqual(keys, ['comment:comment-1', 'post:post-1']);
  });

  it('discardFailedReactionChange removes only the targeted failed entry', async () => {
    await queueReactionChange('user-I', 'post', 'post-1', 'pranam', failing(), noDelay);
    await queueReactionChange('user-I', 'comment', 'comment-1', 'love', failing(), noDelay);

    await discardFailedReactionChange('user-I', 'post', 'post-1');

    assert.equal(await hasFailedReactionChange('user-I', 'post', 'post-1'), false);
    assert.equal(await hasFailedReactionChange('user-I', 'comment', 'comment-1'), true);
  });

  it('one user\'s outbox is never visible to another user', async () => {
    await queueReactionChange('user-J', 'post', 'post-1', 'pranam', failing(), noDelay);
    assert.equal(await hasFailedReactionChange('user-K', 'post', 'post-1'), false, 'User K must never see User J\'s failed reaction');
  });

  it('clearReactionOutbox removes one identity without touching another', async () => {
    await queueReactionChange('user-L', 'post', 'post-1', 'pranam', failing(), noDelay);
    await queueReactionChange('user-M', 'post', 'post-1', 'pranam', failing(), noDelay);

    await clearReactionOutbox('user-L');

    assert.equal(await hasFailedReactionChange('user-L', 'post', 'post-1'), false);
    assert.equal(await hasFailedReactionChange('user-M', 'post', 'post-1'), true);
  });

  it('clearAllReactionOutboxes (logout purge) wipes every identity', async () => {
    await queueReactionChange('user-N', 'post', 'post-1', 'pranam', failing(), noDelay);
    await clearAllReactionOutboxes();
    assert.equal(await hasFailedReactionChange('user-N', 'post', 'post-1'), false);
  });

  it('concurrent queue calls for different users do not race on each other\'s state', async () => {
    // Regression check for the same class of bug found in lib/telemetry.ts
    // and guarded against in lib/sankalpaOutbox.ts: fire-and-forget writes
    // to different identities must not interleave and corrupt one another.
    await Promise.all([
      queueReactionChange('user-O', 'post', 'post-1', 'pranam', ok(), noDelay),
      queueReactionChange('user-P', 'post', 'post-1', 'love', failing(), noDelay),
    ]);
    assert.equal(await hasFailedReactionChange('user-O', 'post', 'post-1'), false);
    assert.equal(await hasFailedReactionChange('user-P', 'post', 'post-1'), true);
  });
});
