import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

type PostRow = {
  id: string;
  created_at: string;
  author_id: string;
  mandali_id: string | null;
  content: string;
  type: 'update' | 'event' | 'question' | 'announcement';
  upvotes: number;
  comment_count: number;
  event_date: string | null;
  event_location: string | null;
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    sampradaya: string | null;
    spiritual_level: string | null;
  } | null;
};

type PostRowJoin = Omit<PostRow, 'profiles'> & {
  profiles?:
    | {
        full_name: string;
        username: string;
        avatar_url: string | null;
        sampradaya: string | null;
        spiritual_level: string | null;
      }
    | {
        full_name: string;
        username: string;
        avatar_url: string | null;
        sampradaya: string | null;
        spiritual_level: string | null;
      }[]
    | null;
};

type MemberRow = {
  id: string;
  full_name: string;
  username: string;
  seva_score: number;
  spiritual_level: string | null;
};

type ProfileContext = {
  userId: string;
  mandaliId: string | null;
  city: string | null;
  country: string | null;
};

export default function MandaliScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [composeType, setComposeType] = useState<PostRow['type']>('update');

  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reportedPostIds, setReportedPostIds] = useState<string[]>([]);

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
    }),
    [isDark]
  );

  const visiblePosts = useMemo(() => {
    return posts.filter(
      (post) =>
        !blockedUserIds.includes(post.author_id) &&
        !reportedPostIds.includes(post.id)
    );
  }, [posts, blockedUserIds, reportedPostIds]);

  const visibleMembers = useMemo(() => {
    return members.filter((member) => !blockedUserIds.includes(member.id));
  }, [members, blockedUserIds]);

  const loadMandali = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    try {
      const [storedBlocks, storedReports] = await Promise.all([
        AsyncStorage.getItem('shoonaya_blocked_users'),
        AsyncStorage.getItem('shoonaya_reported_posts'),
      ]);
      if (storedBlocks) {
        setBlockedUserIds(JSON.parse(storedBlocks));
      }
      if (storedReports) {
        setReportedPostIds(JSON.parse(storedReports));
      }
    } catch (err) {
      console.error('Error loading blocks/reports', err);
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, mandali_id, city, country')
      .eq('id', user.id)
      .single();

    const context = {
      userId: user.id,
      mandaliId: profileRow?.mandali_id ?? null,
      city: profileRow?.city ?? null,
      country: profileRow?.country ?? null,
    } satisfies ProfileContext;
    setProfile(context);

    if (!context.mandaliId) {
      setPosts([]);
      setMembers([]);
      setUpvotedIds([]);
      return;
    }

    const [postRows, memberRows, upvoteRows] = await Promise.all([
      supabase
        .from('posts')
        .select('id, created_at, author_id, mandali_id, content, type, upvotes, comment_count, event_date, event_location, profiles!posts_author_id_fkey(full_name, username, avatar_url, sampradaya, spiritual_level)')
        .eq('mandali_id', context.mandaliId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('profiles')
        .select('id, full_name, username, seva_score, spiritual_level')
        .eq('mandali_id', context.mandaliId)
        .order('seva_score', { ascending: false })
        .limit(50),
      supabase.from('post_upvotes').select('post_id').eq('user_id', user.id),
    ]);

    const normalizedPosts = (postRows.data ?? []).map((row) => {
      const joinedProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        ...row,
        profiles: joinedProfile ?? null,
      } satisfies PostRowJoin;
    });

    setPosts(normalizedPosts);
    setMembers((memberRows.data ?? []) as MemberRow[]);
    setUpvotedIds((upvoteRows.data ?? []).map((row) => row.post_id));
  }, [router]);

  useEffect(() => {
    loadMandali()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadMandali]);

  useEffect(() => {
    if (!profile?.mandaliId) {
      return;
    }

    const channel = supabase
      .channel(`mandali:${profile.mandaliId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `mandali_id=eq.${profile.mandaliId}` },
        () => {
          void loadMandali();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_upvotes' },
        () => {
          void loadMandali();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `mandali_id=eq.${profile.mandaliId}` },
        () => {
          void loadMandali();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [loadMandali, profile?.mandaliId]);

  const toggleUpvote = async (postId: string) => {
    if (!profile) return;
    const already = upvotedIds.includes(postId);

    setUpvotedIds((current) =>
      already ? current.filter((id) => id !== postId) : [...current, postId]
    );
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, upvotes: post.upvotes + (already ? -1 : 1) }
          : post
      )
    );

    const result = already
      ? await supabase.from('post_upvotes').delete().match({ post_id: postId, user_id: profile.userId })
      : await supabase.from('post_upvotes').insert({ post_id: postId, user_id: profile.userId });

    if (result.error) {
      void loadMandali();
    }
  };

  const showPostOptions = (post: PostRow) => {
    Alert.alert(
      'Options',
      'Choose an action for this post or user.',
      [
        {
          text: 'Report Post',
          onPress: () => handleReportPost(post),
        },
        {
          text: 'Block User',
          onPress: () => handleBlockUser(post.author_id, post.profiles?.full_name ?? 'this user'),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleReportPost = (post: PostRow) => {
    Alert.alert(
      'Report Post',
      'Why are you reporting this post? Our moderation team will review it within 24 hours.',
      [
        {
          text: 'Spam / Commercial',
          onPress: () => void submitReport(post.id, 'Spam/Commercial'),
        },
        {
          text: 'Harassment / Hate Speech',
          onPress: () => void submitReport(post.id, 'Harassment/Hate Speech'),
        },
        {
          text: 'Inappropriate / Offensive',
          onPress: () => void submitReport(post.id, 'Inappropriate/Offensive'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const submitReport = async (postId: string, reason: string) => {
    if (!profile) return;
    const updatedReports = [...reportedPostIds, postId];
    setReportedPostIds(updatedReports);
    try {
      await AsyncStorage.setItem('shoonaya_reported_posts', JSON.stringify(updatedReports));
    } catch (err) {
      console.error('Error saving reported posts', err);
    }

    Alert.alert('Report Submitted', 'Thank you. This post has been reported and will be reviewed by our team within 24 hours. It is now hidden.');

    try {
      await supabase.from('post_reports').insert({
        post_id: postId,
        reporter_id: profile.userId,
        reason: reason,
      });
    } catch (dbErr) {
      console.warn('DB write for post report failed (likely table missing, client block remains active):', dbErr);
    }
  };

  const handleBlockUser = (authorId: string, userName: string) => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}? You will no longer see their posts or members list entries.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => void executeBlock(authorId),
        },
      ],
      { cancelable: true }
    );
  };

  const executeBlock = async (authorId: string) => {
    if (!profile) return;
    const updatedBlocks = [...blockedUserIds, authorId];
    setBlockedUserIds(updatedBlocks);
    try {
      await AsyncStorage.setItem('shoonaya_blocked_users', JSON.stringify(updatedBlocks));
    } catch (err) {
      console.error('Error saving blocked users', err);
    }

    Alert.alert('User Blocked', 'This user has been blocked. All their posts and profile entries are now hidden from your view.');

    try {
      await supabase.from('user_blocks').insert({
        user_id: profile.userId,
        blocked_user_id: authorId,
      });
    } catch (dbErr) {
      console.warn('DB write for user block failed (likely table missing, client block remains active):', dbErr);
    }
  };

  const submitPost = async () => {
    if (!profile?.mandaliId || !composeBody.trim()) return;
    setPosting(true);
    try {
      const { error } = await supabase.from('posts').insert({
        author_id: profile.userId,
        mandali_id: profile.mandaliId,
        content: composeBody.trim(),
        type: composeType,
      });
      if (error) throw error;
      setComposeBody('');
      setComposeType('update');
      setSheetVisible(false);
      await loadMandali();
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Mandali</Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
              {profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : 'Sacred circle'}
            </Text>
          </View>
          <Pressable
            onPress={() => setSheetVisible(true)}
            disabled={!profile?.mandaliId}
            style={{
              borderRadius: 18,
              backgroundColor: profile?.mandaliId ? COLORS.brandGold : theme.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Create post</Text>
          </Pressable>
        </View>

        {!profile?.mandaliId ? (
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>No Mandali joined</Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, marginTop: 6 }}>
              Join a Mandali from the web app flow first. Mobile feed will activate automatically after that.
            </Text>
          </Card>
        ) : null}

        {visiblePosts.map((post) => {
          const isUpvoted = upvotedIds.includes(post.id);
          const isOwnPost = post.author_id === profile?.userId;
          return (
            <Card key={post.id} style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                    {post.profiles?.full_name ?? 'Seeker'}
                  </Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
                    {new Date(post.created_at).toLocaleString()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                    {post.type.toUpperCase()}
                  </Text>
                  {!isOwnPost && (
                    <Pressable
                      onPress={() => showPostOptions(post)}
                      style={{ padding: 4 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="more-vertical" size={18} color={theme.dim} />
                    </Pressable>
                  )}
                </View>
              </View>
              <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>{post.content}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <Pressable onPress={() => void toggleUpvote(post.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="heart" size={16} color={isUpvoted ? COLORS.brandGold : theme.dim} />
                  <Text style={{ color: isUpvoted ? COLORS.brandGold : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                    {post.upvotes}
                  </Text>
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="message-circle" size={16} color={theme.dim} />
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{post.comment_count}</Text>
                </View>
              </View>
            </Card>
          );
        })}

        <Card style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>Members</Text>
          {visibleMembers.map((member) => {
            const isOwnMember = member.id === profile?.userId;
            return (
              <View key={member.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14 }}>{member.full_name}</Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }}>
                    {member.spiritual_level ?? 'Seeker'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                    {member.seva_score} seva
                  </Text>
                  {!isOwnMember && (
                    <Pressable
                      onPress={() => handleBlockUser(member.id, member.full_name)}
                      style={{ padding: 4 }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="slash" size={14} color={theme.dim} />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              gap: 14,
            }}
          >
            <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>Create post</Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['update', 'question', 'announcement'] as const).map((type) => {
                const active = composeType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setComposeType(type)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? COLORS.brandGold : theme.border,
                      backgroundColor: active ? COLORS.brandGold : theme.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={composeBody}
              onChangeText={setComposeBody}
              multiline
              placeholder="Share something with your Mandali"
              placeholderTextColor={theme.dim}
              style={{
                minHeight: 120,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.bg,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: theme.text,
                fontFamily: FONTS.sans,
                fontSize: 14,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setSheetVisible(false)}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void submitPost();
                }}
                disabled={posting || !composeBody.trim()}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  backgroundColor: composeBody.trim() ? COLORS.brandGold : theme.border,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                  {posting ? 'Posting...' : 'Post'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
