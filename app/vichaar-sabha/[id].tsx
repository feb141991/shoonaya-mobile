import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { FORUM_CATEGORIES, createReply, fetchMyReactions, fetchReplies, fetchThread, toggleReaction, type ReactionType, type ReplyRow, type ThreadRow } from '@/lib/vichaar';

const REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: 'pranam', emoji: '🙏', label: 'Pranam' },
  { type: 'bhakti', emoji: '❤️', label: 'Bhakti' },
  { type: 'prakas', emoji: '✨', label: 'Prakas' },
];

// Native port of PWA's ThreadDetailClient.tsx — thread body, the three
// emoji reactions (pranam/bhakti/prakas via /api/vichaar/react), and a
// reply thread. Realtime-subscribed to forum_replies and thread_reactions
// scoped to this thread id, so new replies and reaction counts from other
// people appear live — PWA requires leaving and re-entering the thread to
// see either.
export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [myReactions, setMyReactions] = useState<Set<ReactionType>>(new Set());
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    }),
    [isDark]
  );

  const load = useCallback(async () => {
    if (!id) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    setUserId(user.id);
    const [threadRow, replyRows, reactionMap] = await Promise.all([fetchThread(id), fetchReplies(id), fetchMyReactions([id])]);
    setThread(threadRow);
    setReplies(replyRows);
    setMyReactions(reactionMap.get(id) ?? new Set());
  }, [id, router]);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`vichaar-thread:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_replies', filter: `thread_id=eq.${id}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_reactions', filter: `thread_id=eq.${id}` }, () => void load())
      .subscribe();
    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [id, load]);

  const handleToggleReaction = async (reactionType: ReactionType) => {
    if (!thread) return;
    const had = myReactions.has(reactionType);
    setMyReactions((current) => {
      const next = new Set(current);
      if (had) next.delete(reactionType);
      else next.add(reactionType);
      return next;
    });
    setThread((current) => (current ? { ...current, reactions: { ...current.reactions, [reactionType]: Math.max(0, current.reactions[reactionType] + (had ? -1 : 1)) } } : current));
    try {
      await toggleReaction(thread.id, reactionType);
    } catch {
      void load();
    }
  };

  const submitReply = async () => {
    if (!userId || !thread || !replyBody.trim()) return;
    setSubmitting(true);
    try {
      await createReply({ threadId: thread.id, userId, body: replyBody });
      setReplyBody('');
      await load();
    } catch {
      Alert.alert('Could not post reply', 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !thread) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  const cat = FORUM_CATEGORIES.find((c) => c.value === thread.category);

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 14 }}>
        <PressableSurface haptic="selection" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 0 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Vichaar Sabha</Text>
        </PressableSurface>

        <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand }}>{cat?.emoji} {cat?.label}</Text>
            {thread.is_answered ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="check-circle" size={11} color={theme.brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand }}>Answered</Text>
              </View>
            ) : null}
          </View>

          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: theme.text, lineHeight: 26 }}>{thread.title}</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 14, lineHeight: 21, color: theme.dim }}>{thread.body}</Text>

          {thread.tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {thread.tags.map((tag) => (
                <Text key={tag} style={{ fontFamily: FONTS.sans, fontSize: 11, color: theme.brand, borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                  #{tag}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.ink }}>{(thread.profiles?.full_name ?? '?').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: theme.text }}>{thread.profiles?.full_name ?? 'Seeker'}</Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>· {new Date(thread.created_at).toLocaleDateString()}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {REACTIONS.map(({ type, emoji, label }) => {
              const active = myReactions.has(type);
              return (
                <PressableSurface
                  key={type}
                  haptic="selection"
                  accessibilityLabel={label}
                  onPress={() => void handleToggleReaction(type)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    borderRadius: 999,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    backgroundColor: active ? theme.brand : theme.bg,
                    borderWidth: 1,
                    borderColor: active ? theme.brand : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{emoji}</Text>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: active ? COLORS.ink : theme.dim }}>{thread.reactions[type] || ''}</Text>
                </PressableSurface>
              );
            })}
          </View>
        </View>

        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text, paddingHorizontal: 2 }}>
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </Text>

        {replies.map((reply) => (
          <View
            key={reply.id}
            style={{
              backgroundColor: reply.is_accepted ? theme.brand + '14' : theme.card,
              borderColor: reply.is_accepted ? theme.brand : theme.border,
              borderWidth: 1,
              borderRadius: 18,
              padding: 14,
              gap: 8,
            }}
          >
            {reply.is_accepted ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Feather name="check-circle" size={12} color={theme.brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: theme.brand }}>Accepted Answer</Text>
              </View>
            ) : null}
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 20, color: theme.text }}>{reply.body}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11.5, color: theme.dim }}>{reply.profiles?.full_name ?? 'Seeker'}</Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 11.5, color: theme.dim }}>· {new Date(reply.created_at).toLocaleDateString()}</Text>
              {reply.author_id === userId ? <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10.5, color: theme.brand }}>You</Text> : null}
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 }}>
          <TextInput
            value={replyBody}
            onChangeText={setReplyBody}
            multiline
            placeholder="Share your wisdom or perspective… 🙏"
            placeholderTextColor={theme.dim}
            style={{ minHeight: 70, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text, textAlignVertical: 'top' }}
          />
          <PressableSurface
            onPress={() => void submitReply()}
            disabled={submitting || !replyBody.trim()}
            style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11, backgroundColor: replyBody.trim() ? theme.brand : theme.border }}
          >
            {submitting ? <ActivityIndicator size="small" color={COLORS.ink} /> : <Feather name="send" size={14} color={COLORS.ink} />}
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.ink }}>{submitting ? 'Posting…' : 'Reply'}</Text>
          </PressableSurface>
        </View>
      </ScrollView>
    </Screen>
  );
}
