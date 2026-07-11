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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { JoinMandaliPrompt } from '@/components/mandali/JoinMandaliPrompt';
import { EventRsvpBar } from '@/components/mandali/EventRsvpBar';
import { PostComments } from '@/components/mandali/PostComments';
import { SeekersNearYou } from '@/components/mandali/SeekersNearYou';
import { COLORS, FONTS, TYPE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  BLEND_THRESHOLD,
  blockUser,
  createMandaliComment,
  fetchNearbySeekers,
  fetchSafetyState,
  filterAuthoredPosts,
  filterMemberRows,
  leaveMandali,
  reportMandaliMember,
  reportMandaliPost,
  updateMandaliRsvp,
  type CommentRow,
  type MandaliPostType,
  type MemberRow,
  type NearbySeeker,
  type PostRow,
  type RsvpRow,
  type RsvpStatus,
} from '@/lib/mandali';

type ProfileContext = {
  userId: string;
  mandaliId: string | null;
  mandaliName: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Native Mandali screen — full parity pass against PWA's real
// implementation (src/app/(main)/mandali/*, src/lib/api/mandali.ts,
// src/lib/user-safety.ts), covering what the earlier, lighter version of
// this screen was missing: a real join/leave flow (was previously a dead
// end — "go to web app first"), threaded comments, event RSVPs, the
// members-blend fallback for small local Mandalis, a nearby-seekers
// widget, and DB-backed block/report (not device-local AsyncStorage).
//
// One deliberate improvement over PWA, per explicit product direction:
// PWA's feed/comments/RSVPs only update on a manual refresh. Native
// extends the realtime channel (posts/post_upvotes/post_comments/
// event_rsvps/profiles) so the whole screen — including comment threads —
// updates live without the user pulling to refresh.
export default function MandaliScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commenting, setCommenting] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileContext | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [blendedPosts, setBlendedPosts] = useState<PostRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);
  const [seekers, setSeekers] = useState<NearbySeeker[]>([]);
  const [loadingSeekers, setLoadingSeekers] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [composeType, setComposeType] = useState<MandaliPostType>('update');
  const [composeEventDate, setComposeEventDate] = useState('');
  const [composeEventLoc, setComposeEventLoc] = useState('');
  const [activeFilter, setActiveFilter] = useState<MandaliPostType | 'all'>('all');

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      surface: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    }),
    [isDark]
  );

  const loadMandali = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const [{ data: profileRow }, safetyState] = await Promise.all([
      supabase.from('profiles').select('id, mandali_id, city, country, latitude, longitude, mandalis(name)').eq('id', user.id).single(),
      fetchSafetyState(user.id),
    ]);

    const mandaliRelation = Array.isArray(profileRow?.mandalis) ? profileRow?.mandalis[0] : profileRow?.mandalis;
    const context: ProfileContext = {
      userId: user.id,
      mandaliId: profileRow?.mandali_id ?? null,
      mandaliName: (mandaliRelation as { name?: string } | null)?.name ?? null,
      city: profileRow?.city ?? null,
      country: profileRow?.country ?? null,
      latitude: profileRow?.latitude ?? null,
      longitude: profileRow?.longitude ?? null,
    };
    setProfile(context);

    if (!context.mandaliId) {
      setPosts([]);
      setBlendedPosts([]);
      setComments([]);
      setRsvps([]);
      setMembers([]);
      setUpvotedIds([]);
      return;
    }

    const [postRows, memberRows] = await Promise.all([
      supabase
        .from('posts')
        .select('id, created_at, author_id, mandali_id, content, type, upvotes, comment_count, event_date, event_location, profiles!posts_author_id_fkey(full_name, username, avatar_url, sampradaya, spiritual_level)')
        .eq('mandali_id', context.mandaliId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, sampradaya, ishta_devata, spiritual_level, city, country, seva_score')
        .eq('mandali_id', context.mandaliId)
        .order('seva_score', { ascending: false })
        .limit(50),
    ]);

    const normalizedPosts = (postRows.data ?? []).map((row) => ({
      ...row,
      profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
    })) as PostRow[];

    const visiblePosts = filterAuthoredPosts(normalizedPosts, safetyState);
    const visibleMembers = filterMemberRows((memberRows.data ?? []) as MemberRow[], safetyState);
    setPosts(visiblePosts);
    setMembers(visibleMembers);

    const postIds = visiblePosts.map((p) => p.id);
    if (postIds.length > 0) {
      const [commentRows, rsvpRows] = await Promise.all([
        supabase
          .from('post_comments')
          .select('id, post_id, author_id, body, parent_id, created_at, profiles!post_comments_author_id_fkey(full_name, username, avatar_url)')
          .in('post_id', postIds)
          .order('created_at', { ascending: true }),
        supabase.from('event_rsvps').select('id, post_id, user_id, status, created_at, updated_at').in('post_id', postIds),
      ]);
      setComments(
        (commentRows.data ?? []).map((row) => ({
          ...row,
          profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
        })) as CommentRow[]
      );
      setRsvps((rsvpRows.data ?? []) as RsvpRow[]);
    } else {
      setComments([]);
      setRsvps([]);
    }

    // Blend Sangam-wide posts when the local Mandali is thin — same
    // BLEND_THRESHOLD PWA's mandali/page.tsx uses.
    if (visibleMembers.length < BLEND_THRESHOLD) {
      const { data: blendRows } = await supabase
        .from('posts')
        .select('id, created_at, author_id, mandali_id, content, type, upvotes, comment_count, event_date, event_location, profiles!posts_author_id_fkey(full_name, username, avatar_url, sampradaya, spiritual_level)')
        .neq('mandali_id', context.mandaliId)
        .order('created_at', { ascending: false })
        .limit(15);
      const normalizedBlend = (blendRows ?? []).map((row) => ({
        ...row,
        profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
      })) as PostRow[];
      setBlendedPosts(filterAuthoredPosts(normalizedBlend, safetyState));

      const { data: upvoteRows } = await supabase
        .from('post_upvotes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', [...postIds, ...(blendRows ?? []).map((row) => row.id)]);
      setUpvotedIds((upvoteRows ?? []).map((row) => row.post_id));
    } else {
      setBlendedPosts([]);
      const { data: upvoteRows } = await supabase.from('post_upvotes').select('post_id').eq('user_id', user.id).in('post_id', postIds);
      setUpvotedIds((upvoteRows ?? []).map((row) => row.post_id));
    }
  }, [router]);

  useEffect(() => {
    loadMandali()
      .catch((error) => {
        console.error('[MandaliScreen] loadMandali failed', error);
      })
      .finally(() => setLoading(false));
  }, [loadMandali]);

  useEffect(() => {
    if (!profile?.userId) return;
    let cancelled = false;
    setLoadingSeekers(true);
    fetchNearbySeekers(profile.userId, profile.city, profile.latitude, profile.longitude)
      .then((rows) => {
        if (!cancelled) setSeekers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingSeekers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.userId, profile?.city, profile?.latitude, profile?.longitude]);

  // Realtime — deliberately broader than PWA. PWA's Mandali page requires
  // a manual refresh to see new posts, comments, upvotes, or RSVPs from
  // other members. Native subscribes across all four tables (plus
  // profiles, for live member seva/role updates) and does a full reload
  // on any change, so the feed and every open comment thread stay current
  // without the user doing anything.
  useEffect(() => {
    if (!profile?.mandaliId) return;

    const channel = supabase
      .channel(`mandali:${profile.mandaliId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `mandali_id=eq.${profile.mandaliId}` }, () => void loadMandali())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_upvotes' }, () => void loadMandali())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => void loadMandali())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps' }, () => void loadMandali())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `mandali_id=eq.${profile.mandaliId}` }, () => void loadMandali())
      .subscribe();

    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [loadMandali, profile?.mandaliId]);

  const filteredPosts = useMemo(
    () => (activeFilter === 'all' ? posts : posts.filter((p) => p.type === activeFilter)),
    [posts, activeFilter]
  );
  const filteredBlendedPosts = useMemo(
    () => (activeFilter === 'all' ? blendedPosts : blendedPosts.filter((p) => p.type === activeFilter)),
    [blendedPosts, activeFilter]
  );

  const toggleUpvote = async (postId: string) => {
    if (!profile) return;
    const alreadyUpvoted = upvotedIds.includes(postId);
    const targetList = posts.some((p) => p.id === postId) ? setPosts : setBlendedPosts;

    setUpvotedIds((current) => (alreadyUpvoted ? current.filter((id) => id !== postId) : [...current, postId]));
    targetList((current) => current.map((p) => (p.id === postId ? { ...p, upvotes: p.upvotes + (alreadyUpvoted ? -1 : 1) } : p)));

    const result = alreadyUpvoted
      ? await supabase.from('post_upvotes').delete().match({ post_id: postId, user_id: profile.userId })
      : await supabase.from('post_upvotes').insert({ post_id: postId, user_id: profile.userId });
    if (result.error) void loadMandali();
  };

  const submitComment = async (postId: string, body: string) => {
    if (!profile) return;
    setCommenting(postId);
    try {
      await createMandaliComment({ postId, userId: profile.userId, body });
      await loadMandali();
    } catch {
      Alert.alert('Could not post comment', 'Check your connection and try again.');
    } finally {
      setCommenting(null);
    }
  };

  const handleRsvp = async (postId: string, status: RsvpStatus) => {
    if (!profile) return;
    try {
      await updateMandaliRsvp({ postId, userId: profile.userId, status });
      await loadMandali();
    } catch {
      Alert.alert('Could not RSVP', 'Check your connection and try again.');
    }
  };

  const showPostOptions = (post: PostRow) => {
    Alert.alert('Options', 'Choose an action for this post or user.', [
      { text: 'Report Post', onPress: () => void handleReportPost(post) },
      { text: 'Block User', style: 'destructive', onPress: () => handleBlockUser(post.author_id, post.profiles?.full_name ?? 'this user') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Each of these now actually awaits the write and only shows a success
  // alert once it has genuinely succeeded — lib/mandali.ts's report/block
  // functions previously swallowed errors, so these chains would show
  // "Reported"/"Blocked" even on a failed network call or DB rejection.
  const submitPostReport = async (post: PostRow, reason: string) => {
    if (!profile) return;
    try {
      await reportMandaliPost(profile.userId, post, reason);
      Alert.alert('Reported', 'Thank you — our team will review within 24 hours.');
    } catch {
      Alert.alert('Could not submit report', 'Check your connection and try again.');
    }
  };

  const handleReportPost = (post: PostRow) => {
    if (!profile) return;
    Alert.alert('Report Post', 'Why are you reporting this post?', [
      { text: 'Spam / Commercial', onPress: () => void submitPostReport(post, 'Spam/Commercial') },
      { text: 'Harassment / Hate Speech', onPress: () => void submitPostReport(post, 'Harassment/Hate Speech') },
      { text: 'Inappropriate / Offensive', onPress: () => void submitPostReport(post, 'Inappropriate/Offensive') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleBlockUser = (authorId: string, userName: string) => {
    if (!profile) return;
    Alert.alert('Block User', `Block ${userName}? You will no longer see their posts or members list entries — on any device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          void (async () => {
            try {
              await blockUser(profile.userId, authorId);
              await loadMandali();
              Alert.alert('User Blocked', 'This user is now hidden from your view.');
            } catch {
              Alert.alert('Could not block user', 'Check your connection and try again.');
            }
          })(),
      },
    ]);
  };

  const reportMember = async (memberId: string) => {
    if (!profile) return;
    try {
      await reportMandaliMember(profile.userId, memberId);
      Alert.alert('Report Submitted', 'Thank you. This will be reviewed by our team.');
    } catch {
      Alert.alert('Could not submit report', 'Check your connection and try again.');
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
        event_date: composeType === 'event' && composeEventDate ? composeEventDate : null,
        event_location: composeType === 'event' && composeEventLoc ? composeEventLoc : null,
      });
      if (error) throw error;
      setComposeBody('');
      setComposeType('update');
      setComposeEventDate('');
      setComposeEventLoc('');
      setSheetVisible(false);
      await loadMandali();
    } catch {
      Alert.alert('Could not post', 'Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleLeave = () => {
    if (!profile) return;
    Alert.alert('Leave Mandali', `Leave ${profile.mandaliName ?? 'your Mandali'}? You can rejoin any time.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => void leaveMandali(profile.userId).then(() => loadMandali()) },
    ]);
  };

  const renderPost = (post: PostRow) => {
    const isOwnPost = post.author_id === profile?.userId;
    const postComments = comments.filter((c) => c.post_id === post.id);
    const postRsvps = rsvps.filter((r) => r.post_id === post.id);
    const isUpvoted = upvotedIds.includes(post.id);

    return (
      <Card
        key={post.id}
        tone="auto"
        style={{
          backgroundColor: theme.card,
          borderColor: theme.border,
          gap: 12,
          padding: 16,
          borderRadius: 16, // rounded-2xl
          // Legacy shadowColor/shadowOffset/shadowOpacity/shadowRadius/
          // elevation quintet removed — this repo's own SHADOWS convention
          // (lib/constants.ts) renders shadows via boxShadow strings, which
          // it documents as already supported cross-platform (RN 0.85.3,
          // newArchEnabled: true), so the manual quintet was redundant with
          // Card's own boxShadow (applied via Surface/tone="auto" above),
          // not a required Android-only effect.
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Avatar rendering */}
          {post.profiles?.avatar_url ? (
            <Image
              source={{ uri: post.profiles.avatar_url }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[COLORS.brandGold, '#D4A646']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                {getInitials(post.profiles?.full_name ?? post.profiles?.username ?? '?')}
              </Text>
            </LinearGradient>
          )}

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                {post.profiles?.full_name ?? post.profiles?.username ?? 'Seeker'}
              </Text>
              <Text style={{ color: theme.dim, fontSize: 10, opacity: 0.5 }}>•</Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }}>
                {new Date(post.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                {post.type.toUpperCase()}
              </Text>
              {!isOwnPost && (
                <Pressable onPress={() => showPostOptions(post)} style={{ paddingLeft: 4 }} hitSlop={10}>
                  <Feather name="more-horizontal" size={16} color={theme.dim} />
                </Pressable>
              )}
            </View>

            <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>
              {post.content}
            </Text>

            {post.type === 'event' && post.event_date ? (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
                  borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: FONTS.sansMedium, fontSize: 12, color: theme.text }}>
                    📅 {new Date(post.event_date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {post.event_location ? ` • 📍 ${post.event_location}` : ''}
                  </Text>
                  {new Date(post.event_date).getTime() < Date.now() ? (
                    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.border }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9.5, color: theme.dim, textTransform: 'uppercase' }}>Past</Text>
                    </View>
                  ) : null}
                </View>
                <EventRsvpBar
                  postId={post.id}
                  rsvps={postRsvps}
                  userId={profile?.userId ?? ''}
                  brand={theme.brand}
                  border={theme.border}
                  surface={theme.surface}
                  dim={theme.dim}
                  onRsvp={handleRsvp}
                />
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 }}>
              <Pressable
                onPress={() => void toggleUpvote(post.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons
                  name={isUpvoted ? 'heart' : 'heart-outline'}
                  size={14}
                  color={isUpvoted ? '#f43f5e' : theme.dim}
                />
                {post.upvotes > 0 && (
                  <Text
                    style={{
                      color: isUpvoted ? '#f43f5e' : theme.dim,
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 12,
                    }}
                  >
                    {post.upvotes}
                  </Text>
                )}
              </Pressable>
              
              <Pressable
                onPress={() => setExpandedPostId((current) => (current === post.id ? null : post.id))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Feather name="message-square" size={13} color={theme.dim} />
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>
                  {post.comment_count > 0 ? post.comment_count : 'Comment'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <PostComments
          comments={postComments}
          expanded={expandedPostId === post.id}
          onToggleExpand={() => setExpandedPostId((current) => (current === post.id ? null : post.id))}
          userId={profile?.userId ?? ''}
          posting={commenting === post.id}
          onSubmit={(body) => void submitComment(post.id, body)}
          text={theme.text}
          dim={theme.dim}
          border={theme.border}
          brand={theme.brand}
        />
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28, gap: 16 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 16 }}
        >
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 12, padding: 4, marginHorizontal: 16 }}>
          <View style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.bg, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.text }}>Local Feed</Text>
          </View>
          <Pressable onPress={() => router.push('/vichaar-sabha')} accessibilityRole="button" accessibilityLabel="Switch to Global Sabha" style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: theme.dim }}>Global Sabha</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, ...TYPE.screenTitle }}>{profile?.mandaliName ?? 'Mandali'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
                {profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : 'Sacred circle'}
              </Text>
              {profile?.mandaliId && members.length > 0 ? (
                <>
                  <Text style={{ color: theme.dim, fontSize: 10, opacity: 0.5 }}>•</Text>
                  <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                    {members.length} member{members.length === 1 ? '' : 's'}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {profile?.mandaliId ? (
              <>
                <Pressable
                  onPress={() => setSheetVisible(true)}
                  style={{ borderRadius: 18, backgroundColor: theme.brand, paddingHorizontal: 14, paddingVertical: 10 }}
                >
                  <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Post</Text>
                </Pressable>
                <Pressable onPress={handleLeave} style={{ borderRadius: 18, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Feather name="log-out" size={16} color={theme.dim} />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        {profile?.mandaliId && (posts.length > 0 || blendedPosts.length > 0) ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {([
              { value: 'all', label: 'All' },
              { value: 'update', label: 'Updates' },
              { value: 'event', label: 'Events' },
              { value: 'question', label: 'Questions' },
              { value: 'announcement', label: 'Announcements' },
            ] as const).map((opt) => {
              const active = activeFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter: ${opt.label}`}
                  onPress={() => setActiveFilter(opt.value)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    backgroundColor: active ? theme.brand : theme.card,
                    borderWidth: 1,
                    borderColor: active ? theme.brand : theme.border,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: active ? COLORS.ink : theme.dim }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!profile?.mandaliId ? (
          profile ? (
            <JoinMandaliPrompt
              userId={profile.userId}
              text={theme.text}
              dim={theme.dim}
              border={theme.border}
              surface={theme.surface}
              brand={theme.brand}
              cardBg={theme.card}
              onJoined={loadMandali}
            />
          ) : null
        ) : (
          <>
            {filteredPosts.length === 0 ? (
              <EmptyState
                icon="message-circle"
                title={posts.length === 0 ? 'No posts yet' : 'No posts in this category'}
                subtitle={posts.length === 0 ? 'Be the first to share something with your Mandali.' : 'Try a different filter, or clear it to see everything.'}
              />
            ) : (
              filteredPosts.map(renderPost)
            )}

            {filteredBlendedPosts.length > 0 ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.dim }}>GLOBAL SABHA</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
                </View>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11.5, color: theme.dim, textAlign: 'center' }}>
                  Read from the wider Sanatani community while your local Mandali is set up
                </Text>
                {filteredBlendedPosts.map(renderPost)}
              </View>
            ) : null}

            <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 10 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>Members</Text>
              {members.length === 0 ? (
                <EmptyState icon="users" title="No members yet" subtitle="Your local Mandali has not surfaced any members here yet." />
              ) : (
                members.map((member, idx) => {
                  const isOwnMember = member.id === profile?.userId;
                  return (
                    <View key={member.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ width: 20, textAlign: 'center', fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.dim }}>{idx + 1}</Text>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14 }}>
                          {member.full_name}
                          {isOwnMember ? <Text style={{ color: theme.brand }}> (you)</Text> : null}
                        </Text>
                        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }}>{member.spiritual_level ?? 'Seeker'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{member.seva_score} seva</Text>
                        {!isOwnMember && (
                          <Pressable onPress={() => void reportMember(member.id)} style={{ padding: 4 }} hitSlop={10}>
                            <Feather name="slash" size={14} color={theme.dim} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </>
        )}

        <SeekersNearYou seekers={seekers} loading={loadingSeekers} text={theme.text} dim={theme.dim} brand={theme.brand} cardBg={theme.card} border={theme.border} />
      </ScrollView>

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 24 }}>Create post</Text>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['update', 'question', 'announcement', 'event'] as const).map((type) => {
                const active = composeType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setComposeType(type)}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.brand : theme.border,
                      backgroundColor: active ? theme.brand : theme.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: active ? COLORS.ink : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{type}</Text>
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

            {composeType === 'event' ? (
              <>
                <TextInput
                  value={composeEventLoc}
                  onChangeText={setComposeEventLoc}
                  placeholder="Location (optional)"
                  placeholderTextColor={theme.dim}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text }}
                />
                <TextInput
                  value={composeEventDate}
                  onChangeText={setComposeEventDate}
                  placeholder="Date & time — e.g. 2026-07-12T18:00"
                  placeholderTextColor={theme.dim}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text }}
                />
              </>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setSheetVisible(false)} style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitPost()}
                disabled={posting || !composeBody.trim()}
                style={{ flex: 1, borderRadius: 16, backgroundColor: composeBody.trim() ? theme.brand : theme.border, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{posting ? 'Posting...' : 'Post'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
