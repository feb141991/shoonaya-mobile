// Devotional reaction set replacing the single upvote heart — deliberately
// no negative/"dislike" option (tonally wrong for a feed people share vrat
// updates, losses, and scripture questions on).
export type ReactionType =
  | 'pranam'
  | 'bhakti'
  | 'jnana'
  | 'chardi_kala'
  | 'shanti'
  | 'love'
  | 'insightful';

export const REACTION_META: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  pranam: { emoji: '🙏', label: 'Pranam', color: '#C5A059' },
  bhakti: { emoji: '🪷', label: 'Bhakti', color: '#E0684C' },
  jnana: { emoji: '🪔', label: 'Jnana', color: '#F59E0B' },
  chardi_kala: { emoji: '🌸', label: 'Chardi Kala', color: '#EC4899' },
  shanti: { emoji: '🕊️', label: 'Shanti', color: '#3B82F6' },
  love: { emoji: '❤️', label: 'Love', color: '#E0684C' },
  insightful: { emoji: '💡', label: 'Insightful', color: '#4C8BF5' },
};

export const REACTION_ORDER: ReactionType[] = ['pranam', 'bhakti', 'jnana', 'chardi_kala', 'shanti'];

/**
 * Formats LinkedIn/Facebook-style dynamic social reaction text:
 * - "You" or "You and 1 other" or "You and 3 others" (if viewer reacted)
 * - "Aarav" or "Aarav and 1 other" or "Aarav and 3 others" (if other user reacted)
 * - "1 reaction" or "4 reactions" (fallback if names not yet resolved)
 */
export function formatReactionSocialText({
  totalCount,
  firstReactorName,
  firstReactorUserId,
  currentUserId,
  hasViewerReacted,
}: {
  totalCount: number;
  firstReactorName?: string | null;
  firstReactorUserId?: string | null;
  currentUserId?: string | null;
  hasViewerReacted?: boolean;
}): string {
  if (!totalCount || totalCount <= 0) return '';
  const othersCount = totalCount - 1;

  if (hasViewerReacted) {
    if (totalCount === 1) return 'You';
    if (othersCount === 1) return 'You and 1 other';
    return `You and ${othersCount} others`;
  }

  // If first reactor is current user but hasViewerReacted flag was false
  if (firstReactorUserId && currentUserId && firstReactorUserId === currentUserId) {
    if (totalCount === 1) return 'You';
    if (othersCount === 1) return 'You and 1 other';
    return `You and ${othersCount} others`;
  }

  if (firstReactorName && firstReactorName.trim().length > 0) {
    const cleanName = firstReactorName.trim();
    if (totalCount === 1) return cleanName;
    if (othersCount === 1) return `${cleanName} and 1 other`;
    return `${cleanName} and ${othersCount} others`;
  }

  return totalCount === 1 ? '1 reaction' : `${totalCount} reactions`;
}

/**
 * Extracts top unique reaction types from a list of rows, up to maxEmojis.
 */
export function extractTopReactionTypes(
  reactionTypes: (ReactionType | string | null | undefined)[],
  maxEmojis = 3,
): ReactionType[] {
  const counts = new Map<ReactionType, number>();

  for (const raw of reactionTypes) {
    if (!raw) continue;
    const type = raw as ReactionType;
    if (REACTION_META[type]) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEmojis)
    .map(([type]) => type);
}
