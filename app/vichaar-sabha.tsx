import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  FORUM_CATEGORIES,
  createThread,
  fetchMyThreadUpvotes,
  fetchThreads,
  toggleThreadUpvote,
  type ThreadRow,
} from '@/lib/vichaar';

// Native port of PWA's Vichaar Sabha list (src/app/(main)/vichaar-sabha/
// VichaarClient.tsx) — a community Q&A/discussion board, separate from
// Mandali on web but embedded there as a "Global Sabha" preview when a
// user has no local Mandali (see app/(tabs)/mandali.tsx's blended-posts
// section, which links here). Realtime-subscribed to forum_threads so new
// threads and pinned/answered status changes appear without a refresh —
// same "better than PWA" realtime treatment applied to Mandali.
export default function VichaarSabhaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState<string>(FORUM_CATEGORIES[0].value);

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    setUserId(user.id);
    const rows = await fetchThreads();
    setThreads(rows);
    setUpvotedIds(await fetchMyThreadUpvotes(user.id, rows.map((t) => t.id)));
  }, [router]);

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  // Realtime — PWA's Vichaar Sabha list has no live updates (server-rendered,
  // refreshed on navigation only). Native subscribes to forum_threads and
  // thread_reactions so new threads and reaction counts update live.
  useEffect(() => {
    const channel = supabase
      .channel('vichaar-sabha')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_threads' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_reactions' }, () => void load())
      .subscribe();
    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const filteredThreads = activeCategory === 'all' ? threads : threads.filter((t) => t.category === activeCategory);

  const toggleUpvote = async (threadId: string) => {
    if (!userId) return;
    const already = upvotedIds.includes(threadId);
    setUpvotedIds((current) => (already ? current.filter((id) => id !== threadId) : [...current, threadId]));
    setThreads((current) => current.map((t) => (t.id === threadId ? { ...t, upvotes: t.upvotes + (already ? -1 : 1) } : t)));
    try {
      await toggleThreadUpvote(threadId, userId, already);
    } catch {
      void load();
    }
  };

  const submitThread = async () => {
    if (!userId || !title.trim() || !body.trim()) {
      Alert.alert('Add a title and body', 'Both are required to post a thread.');
      return;
    }
    setSubmitting(true);
    try {
      await createThread({
        userId,
        category,
        title,
        body,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      setTitle('');
      setBody('');
      setTags('');
      setSheetVisible(false);
      await load();
    } catch {
      Alert.alert('Could not post thread', 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 14 }}>
        <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 12, padding: 4, marginHorizontal: 16, marginTop: 16 }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Switch to Local Feed" style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.dim }}>Local Feed</Text>
          </Pressable>
          <View style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.bg, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>Global Sabha</Text>
          </View>
        </View>

        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 28 }}>Vichaar Sabha</Text>
          <Pressable onPress={() => setSheetVisible(true)} style={{ borderRadius: 18, backgroundColor: theme.brand, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Ask</Text>
          </Pressable>
        </View>
        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19, paddingHorizontal: 16 }}>
          Community questions, katha, and scripture study across every tradition.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {[{ value: 'all', label: 'All', emoji: '🕉️' }, ...FORUM_CATEGORIES].map((cat) => {
            const active = activeCategory === cat.value;
            return (
              <Pressable
                key={cat.value}
                onPress={() => setActiveCategory(cat.value)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  backgroundColor: active ? theme.brand : theme.card,
                  borderWidth: 1,
                  borderColor: active ? theme.brand : theme.border,
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12.5, color: active ? COLORS.ink : theme.dim }}>
                  {cat.emoji} {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {filteredThreads.length === 0 ? (
          <EmptyState icon="message-square" title="No threads yet" subtitle="Be the first to start a thoughtful vichaar." />
        ) : (
          filteredThreads.map((thread) => {
            const cat = FORUM_CATEGORIES.find((c) => c.value === thread.category);
            const isUpvoted = upvotedIds.includes(thread.id);
            return (
              <Pressable
                key={thread.id}
                onPress={() => router.push({ pathname: '/vichaar-sabha/[id]', params: { id: thread.id } })}
                style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand }}>
                    {cat?.emoji} {cat?.label}
                  </Text>
                  {thread.is_answered ? <Feather name="check-circle" size={12} color={theme.brand} /> : null}
                </View>
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 16, color: theme.text }}>{thread.title}</Text>
                <Text numberOfLines={2} style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19, color: theme.dim }}>
                  {thread.body}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 11.5, color: theme.dim }}>{thread.profiles?.full_name ?? 'Seeker'}</Text>
                  <Pressable onPress={() => void toggleUpvote(thread.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather name="arrow-up" size={13} color={isUpvoted ? theme.brand : theme.dim} />
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11.5, color: isUpvoted ? theme.brand : theme.dim }}>{thread.upvotes}</Text>
                  </Pressable>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 11.5, color: theme.dim }}>
                    🙏 {thread.reactions.pranam} · ❤️ {thread.reactions.bhakti} · ✨ {thread.reactions.prakas}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'flex-end' }}>
          <ScrollView style={{ backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' }} contentContainerStyle={{ padding: 20, gap: 14 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 22 }}>Ask the Sabha</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {FORUM_CATEGORIES.map((cat) => {
                const active = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: active ? theme.brand : theme.bg, borderWidth: 1, borderColor: active ? theme.brand : theme.border }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: active ? COLORS.ink : theme.dim }}>{cat.emoji} {cat.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Your question or topic"
              placeholderTextColor={theme.dim}
              style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONTS.sansMedium, fontSize: 14.5, color: theme.text }}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="Share the full context…"
              placeholderTextColor={theme.dim}
              style={{ minHeight: 110, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONTS.sans, fontSize: 14, color: theme.text, textAlignVertical: 'top' }}
            />
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="Tags, comma separated (optional)"
              placeholderTextColor={theme.dim}
              style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setSheetVisible(false)} style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitThread()}
                disabled={submitting || !title.trim() || !body.trim()}
                style={{ flex: 1, borderRadius: 16, backgroundColor: title.trim() && body.trim() ? theme.brand : theme.border, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{submitting ? 'Posting…' : 'Post thread'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
