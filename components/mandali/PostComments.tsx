import { useState } from 'react';
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
export function PostComments({
  comments,
  expanded,
  onToggleExpand,
  userId,
  posting,
  onSubmit,
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
  onSubmit: (body: string) => void;
  text: string;
  dim: string;
  border: string;
  brand: string;
}) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed || posting) return;
    onSubmit(trimmed);
    setDraft('');
  };

  return (
    <View style={{ marginTop: 10 }}>
      <PressableSurface
        haptic="selection"
        onPress={onToggleExpand}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 0 }}
      >
        <Feather name="message-circle" size={14} color={dim} />
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim }}>
          {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comment'}
        </Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={dim} />
      </PressableSurface>

      {expanded ? (
        <View style={{ marginTop: 10, gap: 10 }}>
          {comments.map((comment) => (
            <View key={comment.id} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: text }}>
                  {(comment.profiles?.full_name ?? comment.profiles?.username ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12.5, color: text }}>
                  {comment.profiles?.full_name ?? comment.profiles?.username ?? 'Seeker'}
                  {comment.author_id === userId ? <Text style={{ color: brand }}> · you</Text> : null}
                </Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 19, color: text }}>{comment.body}</Text>
              </View>
            </View>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a comment…"
              placeholderTextColor={dim}
              style={{
                flex: 1,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 12,
                paddingVertical: 9,
                fontFamily: FONTS.sans,
                fontSize: 13.5,
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
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: draft.trim() ? brand : border,
                opacity: posting ? 0.6 : 1,
                minHeight: 0,
              }}
            >
              {posting ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="send" size={14} color={COLORS.ink} />}
            </PressableSurface>
          </View>
        </View>
      ) : null}
    </View>
  );
}
