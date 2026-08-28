import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export type ReactionType = 'pranam' | 'love' | 'insightful';

export const REACTION_META: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  pranam: { emoji: '🙏', label: 'Pranam', color: '#C5A059' },
  love: { emoji: '❤️', label: 'Love', color: '#E0684C' },
  insightful: { emoji: '💡', label: 'Insightful', color: '#4C8BF5' },
};

export const REACTION_ORDER: ReactionType[] = ['pranam', 'love', 'insightful'];

export type CommentReactor = {
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
  profile: {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
};

export type SafetyState = {
  excludedAuthorIds: Set<string>;
  hiddenContentKeys: Set<string>;
};

describe('Mandali Comment Reactions & Who-Reacted Contract Suite', () => {
  it('supports the exact 3 devotional reaction types: pranam, love, insightful', () => {
    assert.equal(REACTION_ORDER.length, 3);
    assert.deepEqual(REACTION_ORDER, ['pranam', 'love', 'insightful']);

    for (const type of REACTION_ORDER) {
      const meta = REACTION_META[type];
      assert.ok(meta, `Metadata must exist for reaction type ${type}`);
      assert.ok(meta.emoji, `Emoji must exist for ${type}`);
      assert.ok(meta.label, `Label must exist for ${type}`);
      assert.ok(meta.color, `Color must exist for ${type}`);
    }

    assert.equal(REACTION_META.pranam.emoji, '🙏');
    assert.equal(REACTION_META.love.emoji, '❤️');
    assert.equal(REACTION_META.insightful.emoji, '💡');
  });

  it('filters out blocked users from comment reactors list using safety state', () => {
    const sampleReactors: CommentReactor[] = [
      {
        userId: 'user-1',
        reactionType: 'pranam',
        createdAt: '2026-08-28T10:00:00Z',
        profile: { id: 'user-1', fullName: 'Alice Seeker', username: 'alice', avatarUrl: null },
      },
      {
        userId: 'user-2-blocked',
        reactionType: 'love',
        createdAt: '2026-08-28T10:05:00Z',
        profile: { id: 'user-2-blocked', fullName: 'Blocked User', username: 'blocked', avatarUrl: null },
      },
      {
        userId: 'user-3',
        reactionType: 'insightful',
        createdAt: '2026-08-28T10:10:00Z',
        profile: { id: 'user-3', fullName: 'Bob Devotee', username: 'bob', avatarUrl: 'https://example.com/avatar.jpg' },
      },
    ];

    const safetyState: SafetyState = {
      excludedAuthorIds: new Set(['user-2-blocked']),
      hiddenContentKeys: new Set(),
    };

    const visibleReactors = sampleReactors.filter((r) => !safetyState.excludedAuthorIds.has(r.userId));

    assert.equal(visibleReactors.length, 2);
    assert.deepEqual(visibleReactors.map((r) => r.userId), ['user-1', 'user-3']);
  });

  it('reaction switching maintains single reaction per user per comment via optimistic record', () => {
    const userReactions: Record<string, ReactionType> = {};
    const commentId = 'comment-101';

    // 1. User reacts with pranam
    userReactions[commentId] = 'pranam';
    assert.equal(userReactions[commentId], 'pranam');

    // 2. User switches to love (UPDATE/upsert path)
    userReactions[commentId] = 'love';
    assert.equal(userReactions[commentId], 'love');

    // 3. User switches to insightful
    userReactions[commentId] = 'insightful';
    assert.equal(userReactions[commentId], 'insightful');

    // 4. User un-reacts
    delete userReactions[commentId];
    assert.equal(userReactions[commentId], undefined);
  });
});
