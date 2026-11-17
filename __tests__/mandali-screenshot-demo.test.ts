import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMandaliScreenshotDemo } from '@/lib/mandaliScreenshotDemo';
import type { PostRow } from '@/lib/mandali';

const sourcePost: PostRow = {
  id: 'post-1',
  created_at: '2026-11-17T00:00:00.000Z',
  author_id: 'official',
  mandali_id: 'mandali-1',
  content: 'Share a verse or shloka that has stayed with you.',
  type: 'question',
  upvotes: 0,
  comment_count: 0,
  event_date: null,
  event_location: null,
  profiles: {
    full_name: 'shoonaya',
    username: 'shoonaya',
    avatar_url: null,
    sampradaya: null,
    spiritual_level: null,
  },
};

test('builds an opt-in screenshot scenario without changing the source post', () => {
  const result = buildMandaliScreenshotDemo([sourcePost], new Date('2026-11-17T12:00:00.000Z').getTime());

  assert.equal(result?.posts[0].upvotes, 48);
  assert.equal(result?.posts[0].comment_count, 10);
  assert.equal(result?.comments.length, 10);
  assert.equal(result?.reactionSummaries['post-1'].totalCount, 48);
  assert.equal(result?.expandedPostId, 'post-1');
  assert.equal(sourcePost.upvotes, 0);
  assert.equal(new Set(result?.comments.map((comment) => comment.author_id)).size, 10);
});

test('uses a 70/30 female-presenting to other synthetic profile mix', () => {
  const result = buildMandaliScreenshotDemo([sourcePost]);
  const femaleUsernames = new Set([
    'ananya_mehta', 'meera_iyer', 'kavya_sharma', 'nisha_kapoor',
    'riya_malhotra', 'aditi_rao', 'sonal_desai',
  ]);
  const femaleCount = result?.comments.filter((comment) => femaleUsernames.has(comment.profiles?.username ?? '')).length;

  assert.equal(femaleCount, 7);
});
