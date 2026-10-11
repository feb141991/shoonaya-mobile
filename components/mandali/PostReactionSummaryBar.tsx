import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS } from '@/lib/constants';
import { type ReactionType, REACTION_META } from '@/lib/mandali';
import {
  type PostReactionSummary,
  formatReactionSocialText,
} from '@/lib/mandaliReactions';

type PostReactionSummaryBarProps = {
  count: number;
  commentCount?: number;
  summary?: PostReactionSummary | null;
  hasViewerReacted?: boolean;
  currentUserId?: string;
  onViewReactors: () => void;
  onToggleComments?: () => void;
  dim: string;
  text: string;
  cardBg: string;
  borderSoft: string;
};

export function PostReactionSummaryBar({
  count,
  commentCount = 0,
  summary,
  hasViewerReacted,
  currentUserId,
  onViewReactors,
  onToggleComments,
  dim,
  text,
  cardBg,
  borderSoft,
}: PostReactionSummaryBarProps) {
  if (count <= 0 && commentCount <= 0) return null;

  // Resolve top emojis to render
  const emojis: string[] = [];
  if (summary && summary.topEmojis && summary.topEmojis.length > 0) {
    for (const t of summary.topEmojis) {
      const meta = REACTION_META[t as ReactionType];
      if (meta && !emojis.includes(meta.emoji)) {
        emojis.push(meta.emoji);
      }
    }
  }

  // Fallback default emoji if upvotes exist but summary not yet loaded
  if (count > 0 && emojis.length === 0) {
    emojis.push('🙏');
  }

  const socialText = count > 0
    ? formatReactionSocialText({
        totalCount: count,
        firstReactorName: summary?.firstReactorName,
        firstReactorUserId: summary?.firstReactorUserId,
        currentUserId,
        hasViewerReacted,
      })
    : '';

  return (
    <View style={styles.container}>
      {/* Reactions Section (Facebook/LinkedIn styled) */}
      {count > 0 ? (
        <PressableSurface
          haptic="selection"
          accessibilityLabel={`View all ${count} reactions: ${socialText}`}
          accessibilityHint="Opens list of who reacted to this post"
          onPress={onViewReactors}
          style={styles.reactionsPressable}
        >
          {/* Clustered overlapping emoji badges */}
          <View style={styles.emojiCluster}>
            {emojis.slice(0, 3).map((emoji, idx) => (
              <View
                key={`${emoji}-${idx}`}
                style={[
                  styles.emojiBubble,
                  {
                    backgroundColor: cardBg,
                    borderColor: borderSoft,
                    zIndex: 3 - idx,
                    marginLeft: idx === 0 ? 0 : -6,
                  },
                ]}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </View>
            ))}
          </View>

          {/* Social reaction text (e.g. "You and 2 others" or "Aarav and 3 others") */}
          <Text
            numberOfLines={1}
            style={[styles.socialText, { color: dim }]}
          >
            {socialText}
          </Text>
        </PressableSurface>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Right side comment count indicator */}
      {commentCount > 0 && onToggleComments ? (
        <PressableSurface
          haptic="selection"
          accessibilityLabel={`${commentCount} replies`}
          onPress={onToggleComments}
          style={styles.commentsPressable}
        >
          <Text style={[styles.commentsCountText, { color: dim }]}>
            {commentCount} {commentCount === 1 ? 'reply' : 'replies'}
          </Text>
        </PressableSurface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    minHeight: 24,
    gap: 10,
  },
  reactionsPressable: {
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  emojiCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 10.5,
    lineHeight: 12,
  },
  socialText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
  },
  commentsPressable: {
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsCountText: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
  },
});
