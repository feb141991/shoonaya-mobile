/**
 * Shoonaya — Vichaar Sabha (community Q&A / discussion threads)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ported from PWA's src/app/(main)/vichaar-sabha/ (VichaarClient.tsx list +
 * compose, [id]/ThreadDetailClient.tsx detail + replies + reactions).
 * Vichaar Sabha is a genuinely separate feature from Mandali on web (its
 * own route, own page) — it's surfaced *inside* Mandali only as an embedded
 * "Global Sabha" preview when a user has no local Mandali yet
 * (MandaliClient.tsx dynamically imports VichaarClient for that empty
 * state). Native mirrors both: a full Vichaar Sabha screen, and a preview
 * reachable from the Mandali no-mandali state.
 *
 * Data model: forum_threads (question/discussion, own `upvotes` counter +
 * thread_upvotes join table, same shape as posts/post_upvotes), replies to
 * a thread live in forum_replies, and threads carry a *separate* emoji
 * reaction system (thread_reactions: pranam/bhakti/prakas) — not the same
 * as upvotes. Reactions go through POST /api/vichaar/react on web (a real
 * REST route, not a direct-Supabase call) because that route runs
 * requireUserNotBanned server-side — native reuses that route rather than
 * reimplementing the ban check client-side, same precedent as Mandali's
 * join-by-id call.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export type ReactionType = 'pranam' | 'bhakti' | 'prakas';

export const FORUM_CATEGORIES = [
  { value: 'prashnottari', label: 'Prashnottari', emoji: '❓' },
  { value: 'katha', label: 'Katha Corner', emoji: '📖' },
  { value: 'shastra', label: 'Shastra Svadhyaya', emoji: '📜' },
  { value: 'sampradaya', label: 'Sampradaya Rooms', emoji: '🏛️' },
  { value: 'sikh_vichar', label: 'Sikh Vichar', emoji: '☬' },
  { value: 'bauddh_darshan', label: 'Bauddh Darshan', emoji: '☸️' },
  { value: 'jain_darshan', label: 'Jain Darshan', emoji: '🤲' },
  { value: 'modern_life', label: 'Dharma & Modern Life', emoji: '🌍' },
  { value: 'jijnasa', label: 'Jijnasa Zone', emoji: '🌱' },
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]['value'];

export type ThreadAuthor = { full_name: string; username: string; avatar_url: string | null; sampradaya: string | null };

export type ThreadRow = {
  id: string;
  author_id: string;
  category: string;
  title: string;
  body: string;
  tags: string[];
  is_pinned: boolean;
  is_answered: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
  profiles?: ThreadAuthor | null;
  reactions: Record<ReactionType, number>;
};

export type ReplyRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  is_accepted: boolean;
  created_at: string;
  profiles?: { full_name: string; username: string; avatar_url: string | null } | null;
};

export async function fetchThreads(limit = 60): Promise<ThreadRow[]> {
  const { data } = await supabase
    .from('forum_threads')
    .select('*, profiles!forum_threads_author_id_fkey(full_name, username, avatar_url, sampradaya), thread_reactions(reaction_type)')
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const counts: Record<ReactionType, number> = { pranam: 0, bhakti: 0, prakas: 0 };
    const reactionRows = (row.thread_reactions as Array<{ reaction_type: ReactionType }> | undefined) ?? [];
    reactionRows.forEach((r) => {
      if (counts[r.reaction_type] !== undefined) counts[r.reaction_type] += 1;
    });
    const { thread_reactions: _omit, ...rest } = row;
    return { ...(rest as Omit<ThreadRow, 'reactions'>), reactions: counts };
  });
}

export async function fetchThread(threadId: string): Promise<ThreadRow | null> {
  const { data } = await supabase
    .from('forum_threads')
    .select('*, profiles!forum_threads_author_id_fkey(full_name, username, avatar_url, sampradaya), thread_reactions(reaction_type)')
    .eq('id', threadId)
    .single();
  if (!data) return null;
  const counts: Record<ReactionType, number> = { pranam: 0, bhakti: 0, prakas: 0 };
  const reactionRows = (data.thread_reactions as Array<{ reaction_type: ReactionType }> | undefined) ?? [];
  reactionRows.forEach((r) => {
    if (counts[r.reaction_type] !== undefined) counts[r.reaction_type] += 1;
  });
  const { thread_reactions: _omit, ...rest } = data as Record<string, unknown>;
  return { ...(rest as Omit<ThreadRow, 'reactions'>), reactions: counts };
}

export async function fetchReplies(threadId: string): Promise<ReplyRow[]> {
  const { data } = await supabase
    .from('forum_replies')
    .select('*, profiles!forum_replies_author_id_fkey(full_name, username, avatar_url)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  return (data ?? []) as ReplyRow[];
}

export async function createThread(payload: { userId: string; category: string; title: string; body: string; tags: string[] }): Promise<void> {
  const { error } = await supabase.from('forum_threads').insert({
    author_id: payload.userId,
    category: payload.category,
    title: payload.title.trim(),
    body: payload.body.trim(),
    tags: payload.tags,
  });
  if (error) throw error;
}

export async function createReply(payload: { threadId: string; userId: string; body: string }): Promise<void> {
  const { error } = await supabase.from('forum_replies').insert({
    thread_id: payload.threadId,
    author_id: payload.userId,
    body: payload.body.trim(),
  });
  if (error) throw error;
}

export async function toggleThreadUpvote(threadId: string, userId: string, isUpvoted: boolean): Promise<void> {
  const { error } = isUpvoted
    ? await supabase.from('thread_upvotes').delete().match({ thread_id: threadId, user_id: userId })
    : await supabase.from('thread_upvotes').insert({ thread_id: threadId, user_id: userId });
  if (error) throw error;
}

export async function fetchMyThreadUpvotes(userId: string, threadIds: string[]): Promise<string[]> {
  if (threadIds.length === 0) return [];
  const { data } = await supabase.from('thread_upvotes').select('thread_id').eq('user_id', userId).in('thread_id', threadIds);
  return (data ?? []).map((row) => row.thread_id);
}

// Goes through the web REST route (server-side ban check) rather than a
// direct Supabase call — see file header.
export async function toggleReaction(threadId: string, reactionType: ReactionType): Promise<'added' | 'removed'> {
  const res = await apiFetch('/api/vichaar/react', {
    method: 'POST',
    body: JSON.stringify({ thread_id: threadId, reaction_type: reactionType }),
  });
  if (!res.ok) throw new Error('Reaction failed');
  const json = await res.json();
  return json.action as 'added' | 'removed';
}

export async function fetchMyReactions(threadIds: string[]): Promise<Map<string, Set<ReactionType>>> {
  if (threadIds.length === 0) return new Map();
  const res = await apiFetch(`/api/vichaar/react?thread_ids=${threadIds.join(',')}`);
  if (!res.ok) return new Map();
  const json = await res.json();
  const map = new Map<string, Set<ReactionType>>();
  (json.reactions ?? []).forEach((r: { thread_id: string; reaction_type: ReactionType }) => {
    const set = map.get(r.thread_id) ?? new Set<ReactionType>();
    set.add(r.reaction_type);
    map.set(r.thread_id, set);
  });
  return map;
}
