import { supabase } from '@/lib/supabase';
import {
  type ReactionType,
  REACTION_META,
  formatReactionSocialText,
  extractTopReactionTypes,
} from './mandaliReactionTypes';

export {
  type ReactionType,
  REACTION_META,
  formatReactionSocialText,
  extractTopReactionTypes,
};

export type PostReactionSummary = {
  postId: string;
  totalCount: number;
  topEmojis: ReactionType[];
  firstReactorName: string | null;
  firstReactorUserId: string | null;
};

/**
 * Batch-fetches top emojis and first reactor name for multiple posts.
 * Runs in at most 2 efficient queries: 1 for upvotes and 1 for profile names.
 */
export async function fetchPostReactionSummaries(
  postIds: string[],
  currentUserId?: string,
): Promise<Record<string, PostReactionSummary>> {
  if (!postIds || postIds.length === 0) return {};

  const { data, error } = await supabase
    .from('post_upvotes')
    .select('post_id, user_id, reaction_type, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: false });

  if (error || !data) return {};

  type UpvoteRow = { post_id: string; user_id: string; reaction_type?: string; created_at: string };
  const rowsByPost = new Map<string, UpvoteRow[]>();

  for (const row of data as UpvoteRow[]) {
    const list = rowsByPost.get(row.post_id) ?? [];
    list.push(row);
    rowsByPost.set(row.post_id, list);
  }

  // Find the first reactor for each post to query their names
  const neededUserIds = new Set<string>();
  const firstReactorMap = new Map<string, { userId: string }>();

  for (const [postId, rows] of rowsByPost.entries()) {
    if (rows.length === 0) continue;

    // Pick first other user if possible, else the first user
    const otherUserRow = rows.find((r) => r.user_id !== currentUserId) ?? rows[0];
    if (otherUserRow) {
      firstReactorMap.set(postId, { userId: otherUserRow.user_id });
      neededUserIds.add(otherUserRow.user_id);
    }
  }

  // Batch query public_profiles for display names
  const profileNameMap = new Map<string, string>();
  if (neededUserIds.size > 0) {
    const { data: profileRows } = await supabase
      .from('public_profiles')
      .select('id, username')
      .in('id', Array.from(neededUserIds));

    for (const p of (profileRows ?? []) as Array<{ id: string; username?: string | null }>) {
      if (p.username) {
        profileNameMap.set(p.id, p.username);
      }
    }
  }

  const result: Record<string, PostReactionSummary> = {};

  for (const [postId, rows] of rowsByPost.entries()) {
    const topEmojis = extractTopReactionTypes(rows.map((r) => r.reaction_type));
    const firstReactor = firstReactorMap.get(postId);
    const firstReactorName = firstReactor ? profileNameMap.get(firstReactor.userId) ?? null : null;

    result[postId] = {
      postId,
      totalCount: rows.length,
      topEmojis,
      firstReactorName,
      firstReactorUserId: firstReactor?.userId ?? null,
    };
  }

  return result;
}
