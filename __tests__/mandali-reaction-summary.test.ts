import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatReactionSocialText,
  extractTopReactionTypes,
} from '../lib/mandaliReactionTypes';

describe('Mandali Facebook/LinkedIn Post Reaction Summaries', () => {
  describe('formatReactionSocialText', () => {
    it('returns empty string for zero or negative reactions', () => {
      assert.equal(formatReactionSocialText({ totalCount: 0 }), '');
      assert.equal(formatReactionSocialText({ totalCount: -1 }), '');
    });

    it('formats "You" and "You and X others" when viewer has reacted', () => {
      assert.equal(
        formatReactionSocialText({ totalCount: 1, hasViewerReacted: true }),
        'You',
      );
      assert.equal(
        formatReactionSocialText({ totalCount: 2, hasViewerReacted: true }),
        'You and 1 other',
      );
      assert.equal(
        formatReactionSocialText({ totalCount: 5, hasViewerReacted: true }),
        'You and 4 others',
      );
    });

    it('identifies viewer even if hasViewerReacted is false but firstReactorUserId matches currentUserId', () => {
      assert.equal(
        formatReactionSocialText({
          totalCount: 1,
          firstReactorUserId: 'user-123',
          currentUserId: 'user-123',
        }),
        'You',
      );
      assert.equal(
        formatReactionSocialText({
          totalCount: 3,
          firstReactorUserId: 'user-123',
          currentUserId: 'user-123',
        }),
        'You and 2 others',
      );
    });

    it('formats single other reactor name (LinkedIn style)', () => {
      assert.equal(
        formatReactionSocialText({
          totalCount: 1,
          firstReactorName: 'Aarav Sharma',
          hasViewerReacted: false,
        }),
        'Aarav Sharma',
      );
    });

    it('formats "Name and 1 other" or "Name and X others" (LinkedIn style)', () => {
      assert.equal(
        formatReactionSocialText({
          totalCount: 2,
          firstReactorName: 'Aarav Sharma',
          hasViewerReacted: false,
        }),
        'Aarav Sharma and 1 other',
      );
      assert.equal(
        formatReactionSocialText({
          totalCount: 6,
          firstReactorName: 'Pooja',
          hasViewerReacted: false,
        }),
        'Pooja and 5 others',
      );
    });

    it('falls back to "X reactions" when no reactor name is available', () => {
      assert.equal(
        formatReactionSocialText({ totalCount: 1, hasViewerReacted: false }),
        '1 reaction',
      );
      assert.equal(
        formatReactionSocialText({ totalCount: 4, hasViewerReacted: false }),
        '4 reactions',
      );
    });
  });

  describe('extractTopReactionTypes', () => {
    it('orders reactions by frequency and limits to maxEmojis', () => {
      const reactions = ['pranam', 'pranam', 'bhakti', 'jnana', 'pranam', 'bhakti'];
      const top = extractTopReactionTypes(reactions, 2);
      assert.deepEqual(top, ['pranam', 'bhakti']);
    });

    it('ignores unknown or null reaction types gracefully', () => {
      const reactions = ['unknown', null, 'pranam', undefined, 'shanti'];
      const top = extractTopReactionTypes(reactions, 3);
      assert.deepEqual(top, ['pranam', 'shanti']);
    });
  });
});
