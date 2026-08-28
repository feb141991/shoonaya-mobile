import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

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
// inline reply composer.
//
// Edit/delete/reactions (native-only — PWA is being retired, no parity
// work there): a comment's own author can edit its body inline or soft
// delete it (renders as a "[deleted]" tombstone rather than disappearing,
// so replies underneath don't get orphaned); anyone can heart a comment,
// mirroring the post-level reaction affordance one level down.
function CommentItem({
  comment,
  userId,
  onViewProfile,
  onReply,
  onEdit,
  onDelete,
  onReact,
  hasReacted,
  text,
  dim,
  border,
  brand,
  avatarSize,
  nameSize,
  bodySize,
  bodyLineHeight,
}: {
  comment: CommentRow;
  userId: string;
  onViewProfile: (userId: string) => void;
  onReply?: () => void;
  onEdit: (commentId: string, body: string) => void;
  onDelete: (commentId: string) => void;
  onReact: (commentId: string) => void;
  hasReacted: boolean;
  text: string;
  dim: string;
  border: string;
  brand: string;
  avatarSize: number;
  nameSize: number;
  bodySize: number;
  bodyLineHeight: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.body);
  const isOwn = comment.author_id === userId;
  const isDeleted = !!comment.deleted_at;

  const submitEdit = () => {
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === comment.body) {
      setEditing(false);
      return;
    }
    onEdit(comment.id, trimmed);
    setEditing(false);
  };

  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      <PressableSurface
        haptic="selection"
        accessibilityLabel={`View ${comment.profiles?.full_name ?? comment.profiles?.username ?? 'profile'}`}
        onPress={() => onViewProfile(comment.author_id)}
        style={{ minHeight: 0 }}
      >
        <View style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: avatarSize * 0.45, color: text }}>
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
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: nameSize, color: text }}>
            {comment.profiles?.full_name ?? comment.profiles?.username ?? 'Seeker'}
            {isOwn ? <Text style={{ color: brand }}> · you</Text> : null}
            {comment.updated_at && !isDeleted ? <Text style={{ color: dim, fontFamily: FONTS.sans }}> · edited</Text> : null}
          </Text>
        </PressableSurface>

        {isDeleted ? (
          <Text style={{ fontFamily: FONTS.sans, fontSize: bodySize, lineHeight: bodyLineHeight, color: dim, fontStyle: 'italic' }}>
            Comment deleted
          </Text>
        ) : editing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              autoFocus
              style={{
                flex: 1,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 8,
                paddingVertical: 5,
                fontFamily: FONTS.sans,
                fontSize: bodySize,
                color: text,
              }}
              onSubmitEditing={submitEdit}
              returnKeyType="done"
            />
            <PressableSurface accessibilityLabel="Cancel edit" onPress={() => { setEditing(false); setEditDraft(comment.body); }} style={{ minHeight: 0, padding: 4 }}>
              <Feather name="x" size={13} color={dim} />
            </PressableSurface>
            <PressableSurface accessibilityLabel="Save edit" onPress={submitEdit} style={{ minHeight: 0, padding: 4 }}>
              <Feather name="check" size={13} color={brand} />
            </PressableSurface>
          </View>
        ) : (
          <Text style={{ fontFamily: FONTS.sans, fontSize: bodySize, lineHeight: bodyLineHeight, color: text }}>{comment.body}</Text>
        )}

        {!isDeleted ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel={hasReacted ? 'Remove heart' : 'Heart this comment'}
              onPress={() => onReact(comment.id)}
              style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 3 }}
            >
              <Feather name="heart" size={11} color={hasReacted ? COLORS.like : dim} />
              {comment.upvotes > 0 ? (
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10.5, color: hasReacted ? COLORS.like : dim }}>{comment.upvotes}</Text>
              ) : null}
            </PressableSurface>
            {onReply ? (
              <PressableSurface haptic="selection" onPress={onReply} style={{ minHeight: 0 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: dim }}>Reply</Text>
              </PressableSurface>
            ) : null}
            {isOwn ? (
              <PressableSurface haptic="selection" accessibilityLabel="Edit comment" onPress={() => setEditing(true)} style={{ minHeight: 0 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: dim }}>Edit</Text>
              </PressableSurface>
            ) : null}
            {isOwn ? (
              <PressableSurface haptic="selection" accessibilityLabel="Delete comment" onPress={() => onDelete(comment.id)} style={{ minHeight: 0 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: dim }}>Delete</Text>
              </PressableSurface>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function PostComments({
  comments,
  expanded,
  onToggleExpand,
  userId,
  posting,
  onSubmit,
  onEditComment,
  onDeleteComment,
  onReactComment,
  onUnreactComment,
  myReactedCommentIds,
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
  onEditComment: (commentId: string, body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReactComment: (commentId: string) => void;
  onUnreactComment: (commentId: string) => void;
  myReactedCommentIds: Set<string>;
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

  const toggleReaction = (commentId: string) => {
    if (myReactedCommentIds.has(commentId)) onUnreactComment(commentId);
    else onReactComment(commentId);
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
                <CommentItem
                  comment={comment}
                  userId={userId}
                  onViewProfile={onViewProfile}
                  onReply={() => {
                    setReplyTo((current) => (current === comment.id ? null : comment.id));
                    setReplyDraft('');
                  }}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                  onReact={toggleReaction}
                  hasReacted={myReactedCommentIds.has(comment.id)}
                  text={text}
                  dim={dim}
                  border={border}
                  brand={brand}
                  avatarSize={22}
                  nameSize={12}
                  bodySize={12.5}
                  bodyLineHeight={17}
                />

                {replies.length > 0 ? (
                  <View style={{ marginLeft: 29, gap: 6 }}>
                    {replies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        userId={userId}
                        onViewProfile={onViewProfile}
                        onEdit={onEditComment}
                        onDelete={onDeleteComment}
                        onReact={toggleReaction}
                        hasReacted={myReactedCommentIds.has(reply.id)}
                        text={text}
                        dim={dim}
                        border={border}
                        brand={brand}
                        avatarSize={19}
                        nameSize={11.5}
                        bodySize={12}
                        bodyLineHeight={16}
                      />
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
