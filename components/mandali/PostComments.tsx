import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS } from '@/lib/constants';
import type { CommentRow } from '@/lib/mandali';

// The "chat thread" under each Mandali post — PWA's post_comments UI
// embedded inline in MandaliClient.tsx. Comments arrive here already
// filtered to this post's id; the parent screen (app/(tabs)/mandali.tsx)
// owns the single realtime subscription that keeps `comments` current, so
// this list updates live without a manual refresh — the behavior the user
// specifically asked to be better than PWA (which needs a refresh to see
// new comments).
//
// Threading: matches PWA's MandaliClient.tsx one-level reply model — root
// comments (parent_id null) can each have direct replies grouped under
// them via parent_id, with a "Reply" button per root comment opening an
// inline reply composer. `onSubmit`'s second argument mirrors PWA's
// onAddComment(postId, body, parentId) — omitted/undefined for a top-level
// comment, set to the root comment's id for a reply. Previously this
// component only ever posted flat top-level comments (no grouping, no
// Reply affordance) even though the data layer (CommentRow.parent_id,
// createMandaliComment's parentId param) already fully supported replies —
// this rebuild is what actually wires that up.
export function PostComments({
  comments,
  expanded,
  onToggleExpand,
  userId,
  posting,
  onSubmit,
  onViewProfile,
  text,
  dim,
  border,
  brand,
}: {
  comments: CommentRow[];
  expanded: boolean;
  onToggleExpand: () => void;
  userId: string;
  posting: boolean;
  onSubmit: (body: string, parentId?: string | null) => void;
  onViewProfile: (userId: string) => void;
  text: string;
  dim: string;
  border: string;
  brand: string;
}) {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const rootComments = useMemo(() => comments.filter((comment) => !comment.parent_id), [comments]);
  const repliesByParent = useMemo(() => {
    const grouped = new Map<string, CommentRow[]>();
    for (const comment of comments) {
      if (!comment.parent_id) continue;
      const current = grouped.get(comment.parent_id);
      if (current) current.push(comment);
      else grouped.set(comment.parent_id, [comment]);
    }
    return grouped;
  }, [comments]);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || posting) return;
    onSubmit(trimmed);
    setDraft('');
  };

  const submitReply = (parentId: string) => {
    const trimmed = replyDraft.trim();
    if (!trimmed || posting) return;
    onSubmit(trimmed, parentId);
    setReplyDraft('');
    setReplyTo(null);
  };

  return (
    <View style={{ marginTop: 8 }}>
      <PressableSurface
        haptic="selection"
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 0 }}
      >
        <Feather name="message-circle" size={13} color={dim} />
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: dim }}>
          {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comment'}
        </Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={dim} />
      </PressableSurface>

      {expanded ? (
        <View style={{ marginTop: 8, gap: 9 }}>
          {rootComments.map((comment) => {
            const replies = repliesByParent.get(comment.id) ?? [];
            const isReplying = replyTo === comment.id;
            return (
              <View key={comment.id} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 7 }}>
                  <PressableSurface
                    haptic="selection"
                    accessibilityLabel={`View ${comment.profiles?.full_name ?? comment.profiles?.username ?? 'profile'}`}
                    onPress={() => onViewProfile(comment.author_id)}
                    style={{ minHeight: 0 }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: border, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: text }}>
                        {(comment.profiles?.full_name ?? comment.profiles?.username ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </PressableSurface>
                  <View style={{ flex: 1, gap: 1 }}>
                    <PressableSurface
                      haptic="selection"
                      accessibilityLabel={`View ${comment.profiles?.full_name ?? comment.profiles?.username ?? 'profile'}`}
                      onPress={() => onViewProfile(comment.author_id)}
                      style={{ minHeight: 0, alignSelf: 'flex-start' }}
                    >
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: text }}>
                        {comment.profiles?.full_name ?? comment.profiles?.username ?? 'Seeker'}
                        {comment.author_id === userId ? <Text style={{ color: brand }}> · you</Text> : null}
                      </Text>
                    </PressableSurface>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12.5, lineHeight: 17, color: text }}>{comment.body}</Text>
                    <PressableSurface
                      haptic="selection"
                      onPress={() => {
                        setReplyTo((current) => (current === comment.id ? null : comment.id));
                        setReplyDraft('');
                      }}
                      style={{ minHeight: 0, alignSelf: 'flex-start', marginTop: 1 }}
                    >
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: dim }}>Reply</Text>
                    </PressableSurface>
                  </View>
                </View>

                {replies.length > 0 ? (
                  <View style={{ marginLeft: 29, gap: 6 }}>
                    {replies.map((reply) => (
                      <View key={reply.id} style={{ flexDirection: 'row', gap: 7 }}>
                        <PressableSurface
                          haptic="selection"
                          accessibilityLabel={`View ${reply.profiles?.full_name ?? reply.profiles?.username ?? 'profile'}`}
                          onPress={() => onViewProfile(reply.author_id)}
                          style={{ minHeight: 0 }}
                        >
                          <View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: border, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9, color: text }}>
                              {(reply.profiles?.full_name ?? reply.profiles?.username ?? '?').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        </PressableSurface>
                        <View style={{ flex: 1, gap: 1 }}>
                          <PressableSurface
                            haptic="selection"
                            accessibilityLabel={`View ${reply.profiles?.full_name ?? reply.profiles?.username ?? 'profile'}`}
                            onPress={() => onViewProfile(reply.author_id)}
                            style={{ minHeight: 0, alignSelf: 'flex-start' }}
                          >
                            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: text }}>
                              {reply.profiles?.full_name ?? reply.profiles?.username ?? 'Seeker'}
                              {reply.author_id === userId ? <Text style={{ color: brand }}> · you</Text> : null}
                            </Text>
                          </PressableSurface>
                          <Text style={{ fontFamily: FONTS.sans, fontSize: 12, lineHeight: 16, color: text }}>{reply.body}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {isReplying ? (
                  <View style={{ marginLeft: 29, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <TextInput
                      value={replyDraft}
                      onChangeText={setReplyDraft}
                      placeholder={`Reply to ${comment.profiles?.full_name ?? comment.profiles?.username ?? 'this comment'}…`}
                      placeholderTextColor={dim}
                      autoFocus
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: border,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        fontFamily: FONTS.sans,
                        fontSize: 12,
                        color: text,
                      }}
                      onSubmitEditing={() => submitReply(comment.id)}
                      returnKeyType="send"
                    />
                    <PressableSurface
                      accessibilityLabel="Cancel reply"
                      onPress={() => {
                        setReplyTo(null);
                        setReplyDraft('');
                      }}
                      style={{ minHeight: 0, padding: 5 }}
                    >
                      <Feather name="x" size={13} color={dim} />
                    </PressableSurface>
                    <PressableSurface
                      accessibilityLabel="Send reply"
                      disabled={posting || !replyDraft.trim()}
                      onPress={() => submitReply(comment.id)}
                      style={{
                        width: 27,
                        height: 27,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: replyDraft.trim() ? brand : border,
                        opacity: posting ? 0.6 : 1,
                        minHeight: 0,
                      }}
                    >
                      {posting ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="send" size={11} color={COLORS.ink} />}
                    </PressableSurface>
                  </View>
                ) : null}
              </View>
            );
          })}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a comment…"
              placeholderTextColor={dim}
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 10,
                paddingVertical: 7,
                fontFamily: FONTS.sans,
                fontSize: 12.5,
                color: text,
              }}
              onSubmitEditing={submit}
              returnKeyType="send"
            />
            <PressableSurface
              accessibilityLabel="Send comment"
              disabled={posting || !draft.trim()}
              onPress={submit}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: draft.trim() ? brand : border,
                opacity: posting ? 0.6 : 1,
                minHeight: 0,
              }}
            >
              {posting ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="send" size={13} color={COLORS.ink} />}
            </PressableSurface>
          </View>
        </View>
      ) : null}
    </View>
  );
}
