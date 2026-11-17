import type { PostRow, CommentRow, ReactionType } from '@/lib/mandali';
import type { PostReactionSummary } from '@/lib/mandaliReactions';

export type ScreenshotDemoFeed = {
  posts: PostRow[];
  comments: CommentRow[];
  reactionSummaries: Record<string, PostReactionSummary>;
  expandedPostId: string | null;
};

// Deliberately opt-in and development-only. These are synthetic profiles for
// store screenshots, never a replacement for the authenticated feed.
const isDevelopmentRuntime = typeof __DEV__ !== 'undefined'
  ? __DEV__
  : process.env.NODE_ENV !== 'production';

export const isMandaliScreenshotDemoEnabled =
  isDevelopmentRuntime && process.env.EXPO_PUBLIC_MANDALI_SCREENSHOT_DEMO === '1';

const DEMO_REACTORS: Array<{ name: string; username: string; reaction: ReactionType }> = [
  { name: 'Ananya Mehta', username: 'ananya_mehta', reaction: 'bhakti' },
  { name: 'Meera Iyer', username: 'meera_iyer', reaction: 'pranam' },
  { name: 'Kavya Sharma', username: 'kavya_sharma', reaction: 'jnana' },
  { name: 'Nisha Kapoor', username: 'nisha_kapoor', reaction: 'shanti' },
  { name: 'Riya Malhotra', username: 'riya_malhotra', reaction: 'love' },
  { name: 'Aditi Rao', username: 'aditi_rao', reaction: 'insightful' },
  { name: 'Sonal Desai', username: 'sonal_desai', reaction: 'bhakti' },
  { name: 'Mohan Joshi', username: 'mohan_joshi', reaction: 'pranam' },
  { name: 'Arjun Singh', username: 'arjun_singh', reaction: 'jnana' },
  { name: 'Dev Patel', username: 'dev_patel', reaction: 'shanti' },
];

const DEMO_REPLIES = [
  'This verse has become part of my morning rhythm. Thank you for sharing it.',
  'I needed this today. I am saving it for my evening reflection.',
  'For me, it brings the practice back to steadiness and patience.',
  'Beautiful reminder. I read it with my family after dinner.',
  'I have been returning to the same line during my morning japa.',
  'This is the kind of conversation I hoped to find here.',
  'Thank you. It made a busy day feel a little more grounded.',
  'I am adding this to my weekly reflection list.',
  'The simple practices are often the ones that stay with us.',
  'Sharing this with my sister tonight. She will appreciate it too.',
];

export function buildMandaliScreenshotDemo(
  posts: PostRow[],
  now = Date.now(),
): ScreenshotDemoFeed | null {
  const source = posts[0];
  if (!source) return null;

  const postId = source.id;
  const comments: CommentRow[] = DEMO_REPLIES.map((body, index) => {
    const reactor = DEMO_REACTORS[index];
    return {
      id: `screenshot-demo-comment-${index + 1}`,
      post_id: postId,
      author_id: `screenshot-demo-user-${index + 1}`,
      body,
      parent_id: null,
      created_at: new Date(now - (index + 1) * 11 * 60_000).toISOString(),
      updated_at: null,
      deleted_at: null,
      upvotes: index % 3 === 0 ? 3 : index % 2 === 0 ? 2 : 1,
      profiles: {
        full_name: reactor.name,
        username: reactor.username,
        avatar_url: null,
      },
    };
  });

  const demoPost: PostRow = {
    ...source,
    upvotes: 48,
    comment_count: comments.length,
    viewerReaction: 'bhakti',
    commentPreview: comments,
  };

  return {
    posts: [demoPost, ...posts.slice(1)],
    comments,
    expandedPostId: postId,
    reactionSummaries: {
      [postId]: {
        postId,
        totalCount: 48,
        topEmojis: ['bhakti', 'pranam', 'jnana'],
        firstReactorName: DEMO_REACTORS[0].name,
        firstReactorUserId: `screenshot-demo-user-1`,
      },
    },
  };
}
