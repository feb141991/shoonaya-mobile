import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItemInfo,
  Modal,
  RefreshControl,
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
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { JoinMandaliPrompt } from '@/components/mandali/JoinMandaliPrompt';
import { EventRsvpBar } from '@/components/mandali/EventRsvpBar';
import { PostComments } from '@/components/mandali/PostComments';
import { SeekersNearYou } from '@/components/mandali/SeekersNearYou';
import { MemberInfoSheet, type MemberInfoSubject } from '@/components/mandali/MemberInfoSheet';
import { FilterPicker } from '@/components/mandali/FilterPicker';
import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { navScrollHandler } from '@/lib/navScrollBus';
import { supabase } from '@/lib/supabase';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';
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

type RealtimeUpvotePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: { post_id?: unknown; user_id?: unknown };
  old?: { post_id?: unknown; user_id?: unknown };
};

type RealtimeCommentPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: { id?: unknown; post_id?: unknown; author_id?: unknown };
  old?: { id?: unknown; post_id?: unknown; author_id?: unknown };
};

type RealtimeRsvpPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: { id?: unknown; post_id?: unknown; user_id?: unknown; status?: unknown; created_at?: unknown; updated_at?: unknown };
  old?: { id?: unknown; post_id?: unknown; user_id?: unknown };
};

type ProfileContext = {
  userId: string;
  mandaliId: string | null;
  mandaliName: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type MandaliFeedItem =
  | { type: 'empty' }
  | { type: 'post'; post: PostRow }
  | { type: 'blendHeader' }
  | { type: 'blendedPost'; post: PostRow }
  | { type: 'members' };

const POST_TYPE_META: Record<MandaliPostType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  update: { label: 'Update', icon: 'message-circle', color: '#4C8BF5' },
  question: { label: 'Question', icon: 'help-circle', color: '#8C64C8' },
  announcement: { label: 'Announcement', icon: 'volume-2', color: '#E0684C' },
  event: { label: 'Event', icon: 'calendar', color: '#34A853' },
};

// Filter picker options — mirrors POST_TYPE_META plus the "All" case, each
// with its own color so the Facebook-reaction-style popup reads as a set of
// distinct choices rather than a single-tone list.
const FILTER_OPTIONS: Array<{ value: MandaliPostType | 'all'; label: string; icon: keyof typeof Feather.glyphMap; color: string }> = [
  { value: 'all', label: 'All', icon: 'grid', color: '#C5A059' },
  { value: 'update', label: 'Updates', icon: POST_TYPE_META.update.icon, color: POST_TYPE_META.update.color },
  { value: 'event', label: 'Events', icon: POST_TYPE_META.event.icon, color: POST_TYPE_META.event.color },
  { value: 'question', label: 'Questions', icon: POST_TYPE_META.question.icon, color: POST_TYPE_META.question.color },
  { value: 'announcement', label: 'Announcements', icon: POST_TYPE_META.announcement.icon, color: POST_TYPE_META.announcement.color },
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type MandaliTheme = {
  bg: string;
  card: string;
  border: string;
  surface: string;
  soft: string;
  premiumBorder: string;
  text: string;
  dim: string;
  brand: string;
  brandSoft: string;
  shadow: string;
};

type MandaliPostCardProps = {
  post: PostRow;
  userId: string | null;
  comments: CommentRow[];
  rsvps: RsvpRow[];
  isUpvoted: boolean;
  expanded: boolean;
  postingComment: boolean;
  theme: MandaliTheme;
  onRsvp: (postId: string, status: RsvpStatus) => void;
  onShowOptions: (post: PostRow) => void;
  onShowOwnOptions: (post: PostRow) => void;
  onSubmitComment: (postId: string, body: string, parentId?: string | null) => void;
  onToggleComments: (postId: string) => void;
  onToggleUpvote: (postId: string) => void;
};

const MandaliPostCard = memo(function MandaliPostCard({
  post,
  userId,
  comments,
  rsvps,
  isUpvoted,
  expanded,
  postingComment,
  theme,
  onRsvp,
  onShowOptions,
  onShowOwnOptions,
  onSubmitComment,
  onToggleComments,
  onToggleUpvote,
}: MandaliPostCardProps) {
  const isOwnPost = post.author_id === userId;
  const postTypeMeta = POST_TYPE_META[post.type] ?? POST_TYPE_META.update;
  const eventDateLabel = post.event_date
    ? new Date(post.event_date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Card
      tone="auto"
      style={{
        backgroundColor: theme.card,
        borderColor: theme.premiumBorder,
        gap: 9,
        padding: 13,
        borderRadius: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {post.profiles?.avatar_url ? (
          <Image source={{ uri: post.profiles.avatar_url }} style={{ width: 30, height: 30, borderRadius: 15 }} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={[theme.brand, COLORS.brandGoldLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
              {getInitials(post.profiles?.full_name ?? post.profiles?.username ?? '?')}
            </Text>
          </LinearGradient>
        )}

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 3 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
              {post.profiles?.full_name ?? post.profiles?.username ?? 'Seeker'}
            </Text>
            <Text style={{ color: theme.dim, fontSize: 9, opacity: 0.5 }}>•</Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11 }}>
              {new Date(post.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </Text>
            <View style={{ flex: 1 }} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: theme.surface,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Feather name={postTypeMeta.icon} size={9} color={theme.brand} />
              <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 9 }}>{postTypeMeta.label}</Text>
            </View>
            <PressableSurface
              haptic="selection"
              accessibilityLabel={`More options for ${isOwnPost ? 'your post' : (post.profiles?.full_name ?? post.profiles?.username ?? 'this post')}`}
              onPress={() => (isOwnPost ? onShowOwnOptions(post) : onShowOptions(post))}
              style={{ minHeight: 0, paddingLeft: 4 }}
              hitSlop={10}
            >
              <Feather name="more-horizontal" size={16} color={theme.dim} />
            </PressableSurface>
          </View>

          <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 20 }}>{post.content}</Text>

          {post.type === 'event' && post.event_date ? (
            <View
              style={{
                marginTop: 8,
                backgroundColor: theme.soft,
                borderColor: theme.premiumBorder,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 7,
                gap: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  {eventDateLabel ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="calendar" size={13} color={theme.brand} />
                      <Text style={{ flex: 1, fontFamily: FONTS.sansMedium, fontSize: 12, color: theme.text }}>{eventDateLabel}</Text>
                    </View>
                  ) : null}
                  {post.event_location ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="map-pin" size={13} color={theme.brand} />
                      <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>{post.event_location}</Text>
                    </View>
                  ) : null}
                </View>
                {new Date(post.event_date).getTime() < Date.now() ? (
                  <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.surface }}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9.5, color: theme.dim, textTransform: 'uppercase' }}>Past</Text>
                  </View>
                ) : null}
              </View>
              <EventRsvpBar
                postId={post.id}
                rsvps={rsvps}
                userId={userId ?? ''}
                brand={theme.brand}
                border={theme.border}
                surface={theme.surface}
                dim={theme.dim}
                onRsvp={onRsvp}
              />
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 9 }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel={isUpvoted ? 'Remove upvote' : 'Upvote post'}
              onPress={() => onToggleUpvote(post.id)}
              style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 5 }}
              hitSlop={10}
            >
              <Ionicons name={isUpvoted ? 'heart' : 'heart-outline'} size={13} color={isUpvoted ? COLORS.danger : theme.dim} />
              {post.upvotes > 0 ? (
                <Text style={{ color: isUpvoted ? COLORS.danger : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 11.5 }}>{post.upvotes}</Text>
              ) : null}
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              accessibilityLabel={expanded ? 'Hide comments' : 'Show comments'}
              onPress={() => onToggleComments(post.id)}
              style={{ minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 5 }}
              hitSlop={10}
            >
              <Feather name="message-square" size={12} color={theme.dim} />
              <Text style={{ color: theme.dim, fontFamily: FONTS.sansMedium, fontSize: 11.5 }}>
                {post.comment_count > 0 ? post.comment_count : 'Comment'}
              </Text>
            </PressableSurface>
          </View>
        </View>
      </View>

      <PostComments
        comments={comments}
        expanded={expanded}
        onToggleExpand={() => onToggleComments(post.id)}
        userId={userId ?? ''}
        posting={postingComment}
        onSubmit={(body, parentId) => onSubmitComment(post.id, body, parentId)}
        text={theme.text}
        dim={theme.dim}
        border={theme.premiumBorder}
        brand={theme.brand}
      />
    </Card>
  );
});

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
  const [refreshing, setRefreshing] = useState(false);
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
  const [isGuest, setIsGuest] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberInfoSubject | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [composeType, setComposeType] = useState<MandaliPostType>('update');
  const [composeEventDate, setComposeEventDate] = useState('');
  const [composeEventLoc, setComposeEventLoc] = useState('');
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [activeFilter, setActiveFilter] = useState<MandaliPostType | 'all'>('all');
  const visiblePostIdsRef = useRef<Set<string>>(new Set());
  const realtimeReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      surface: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
      soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
      premiumBorder: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
      brandSoft: isDark ? COLORS.homeSoftDark : COLORS.brandSoftLight,
      shadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
    }),
    [isDark]
  );

  const loadMandali = useCallback(async () => {
    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

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
      visiblePostIdsRef.current = new Set();
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
    const visiblePostIds = new Set(postIds);

    // Blend Sangam-wide posts when the local Mandali is thin — same
    // BLEND_THRESHOLD PWA's mandali/page.tsx uses. Resolved before the
    // comments/RSVPs/upvotes fetch below so that fetch can be scoped to the
    // full visible post set (local + blended), not just local posts.
    // Previously the comments/RSVPs query only ever used `postIds` (local
    // posts), so a blended post's comments and RSVPs never loaded even
    // though its upvote state did — this closes that gap.
    let blendedPostIds: string[] = [];
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
      blendedPostIds = normalizedBlend.map((row) => row.id);
      for (const id of blendedPostIds) visiblePostIds.add(id);
    } else {
      setBlendedPosts([]);
    }

    const allPostIds = [...postIds, ...blendedPostIds];

    if (allPostIds.length > 0) {
      const [commentRows, rsvpRows, upvoteRows] = await Promise.all([
        supabase
          .from('post_comments')
          .select('id, post_id, author_id, body, parent_id, created_at, profiles!post_comments_author_id_fkey(full_name, username, avatar_url)')
          .in('post_id', allPostIds)
          .order('created_at', { ascending: true }),
        supabase.from('event_rsvps').select('id, post_id, user_id, status, created_at, updated_at').in('post_id', allPostIds),
        supabase.from('post_upvotes').select('post_id').eq('user_id', user.id).in('post_id', allPostIds),
      ]);
      setComments(
        (commentRows.data ?? []).map((row) => ({
          ...row,
          profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
        })) as CommentRow[]
      );
      setRsvps((rsvpRows.data ?? []) as RsvpRow[]);
      setUpvotedIds((upvoteRows.data ?? []).map((row) => row.post_id));
    } else {
      setComments([]);
      setRsvps([]);
      setUpvotedIds([]);
    }

    visiblePostIdsRef.current = visiblePostIds;
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMandali();
    } catch (error) {
      console.error('[MandaliScreen] pull-to-refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadMandali]);

  const scheduleRealtimeReload = useCallback(() => {
    if (realtimeReloadTimerRef.current) clearTimeout(realtimeReloadTimerRef.current);
    realtimeReloadTimerRef.current = setTimeout(() => {
      realtimeReloadTimerRef.current = null;
      void loadMandali();
    }, 450);
  }, [loadMandali]);

  useEffect(() => () => {
    if (realtimeReloadTimerRef.current) clearTimeout(realtimeReloadTimerRef.current);
  }, []);

  // Patches a post's upvote count in whichever list (local or blended)
  // actually contains it, without touching anything else.
  const patchPostUpvotes = useCallback((postId: string, delta: number) => {
    const bump = (list: PostRow[]) => list.map((p) => (p.id === postId ? { ...p, upvotes: Math.max(0, p.upvotes + delta) } : p));
    setPosts((current) => (current.some((p) => p.id === postId) ? bump(current) : current));
    setBlendedPosts((current) => (current.some((p) => p.id === postId) ? bump(current) : current));
  }, []);

  // A new comment's realtime row has no joined profile data (Postgres
  // changes only carry the raw row), so a single targeted re-fetch with
  // the same join loadMandali uses is the cheapest way to get a
  // display-ready CommentRow -- still far cheaper than reloading the
  // whole screen for one comment.
  const patchNewComment = useCallback(async (commentId: string) => {
    const { data } = await supabase
      .from('post_comments')
      .select('id, post_id, author_id, body, parent_id, created_at, profiles!post_comments_author_id_fkey(full_name, username, avatar_url)')
      .eq('id', commentId)
      .maybeSingle();
    if (!data) return;
    const normalized = {
      ...data,
      profiles: Array.isArray(data.profiles) ? data.profiles[0] ?? null : data.profiles ?? null,
    } as CommentRow;
    setComments((current) => (current.some((c) => c.id === normalized.id) ? current : [...current, normalized]));
  }, []);

  // Upvotes, comments, and RSVPs used to all funnel into one debounced
  // full loadMandali() -- meaning a single upvote from a stranger on a
  // blended post refetched the entire screen (profile, posts, blended
  // posts, members, comments, RSVPs, upvotes). These three handlers patch
  // just the affected slice of state instead. Each skips changes authored
  // by the current user, since toggleUpvote/submitComment/handleRsvp
  // already apply their own optimistic update locally -- reapplying the
  // realtime echo of your own write would double-count it.
  const handleUpvoteRealtimeChange = useCallback((payload: RealtimeUpvotePayload) => {
    const row = payload.new ?? payload.old;
    const postId = typeof row?.post_id === 'string' ? row.post_id : null;
    const userId = typeof row?.user_id === 'string' ? row.user_id : null;
    if (!postId || !userId || userId === profile?.userId) return;
    if (!visiblePostIdsRef.current.has(postId)) return;
    patchPostUpvotes(postId, payload.eventType === 'DELETE' ? -1 : 1);
  }, [patchPostUpvotes, profile?.userId]);

  const handleCommentRealtimeChange = useCallback((payload: RealtimeCommentPayload) => {
    const row = payload.new ?? payload.old;
    const postId = typeof row?.post_id === 'string' ? row.post_id : null;
    const commentId = typeof row?.id === 'string' ? row.id : null;
    const authorId = typeof row?.author_id === 'string' ? row.author_id : null;
    if (!postId || !commentId || !visiblePostIdsRef.current.has(postId)) return;

    if (payload.eventType === 'DELETE') {
      setComments((current) => current.filter((c) => c.id !== commentId));
      return;
    }
    if (payload.eventType === 'INSERT' && authorId !== profile?.userId) {
      void patchNewComment(commentId);
    }
    // UPDATE: no comment-edit feature exists today, nothing to patch.
  }, [patchNewComment, profile?.userId]);

  const handleRsvpRealtimeChange = useCallback((payload: RealtimeRsvpPayload) => {
    const row = payload.new ?? payload.old;
    const postId = typeof row?.post_id === 'string' ? row.post_id : null;
    const userId = typeof row?.user_id === 'string' ? row.user_id : null;
    const rowId = typeof row?.id === 'string' ? row.id : null;
    if (!postId || !userId || !rowId || userId === profile?.userId) return;
    if (!visiblePostIdsRef.current.has(postId)) return;

    if (payload.eventType === 'DELETE') {
      setRsvps((current) => current.filter((r) => r.id !== rowId));
      return;
    }
    const status = payload.new?.status;
    if (typeof status !== 'string') return;
    const nowIso = new Date().toISOString();
    const nextRow: RsvpRow = {
      id: rowId,
      post_id: postId,
      user_id: userId,
      status: status as RsvpStatus,
      created_at: typeof payload.new?.created_at === 'string' ? payload.new.created_at : nowIso,
      updated_at: typeof payload.new?.updated_at === 'string' ? payload.new.updated_at : nowIso,
    };
    setRsvps((current) => {
      const idx = current.findIndex((r) => r.id === rowId);
      if (idx === -1) return [...current, nextRow];
      const next = [...current];
      next[idx] = nextRow;
      return next;
    });
  }, [profile?.userId]);

  useEffect(() => {
    loadMandali()
      .catch((error) => {
        console.error('[MandaliScreen] loadMandali failed', error);
      })
      .finally(() => setLoading(false));
  }, [loadMandali]);

  useEffect(() => {
    if (!profile?.userId) return;
    if (profile.latitude == null || profile.longitude == null) {
      setSeekers([]);
      setLoadingSeekers(false);
      return;
    }
    let cancelled = false;
    setLoadingSeekers(true);
    fetchNearbySeekers(profile.userId, null, profile.latitude, profile.longitude)
      .then((rows) => {
        if (!cancelled) setSeekers(rows);
      })
      .catch((error) => {
        console.error('[MandaliScreen] fetchNearbySeekers failed', error);
        if (!cancelled) setSeekers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSeekers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.userId, profile?.city, profile?.latitude, profile?.longitude]);

  // Realtime — posts/profiles changes (new post, membership change) stay
  // full, debounced reloads since they change the feed's actual structure
  // (ordering, blend-threshold, visible-post-id set). Upvotes/comments/
  // RSVPs are patched incrementally (see the three handlers above) since
  // they're both far more frequent and structurally trivial.
  useEffect(() => {
    if (!profile?.mandaliId) return;

    const channel = supabase
      .channel(`mandali:${profile.mandaliId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `mandali_id=eq.${profile.mandaliId}` }, scheduleRealtimeReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_upvotes' }, handleUpvoteRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, handleCommentRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps' }, handleRsvpRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `mandali_id=eq.${profile.mandaliId}` }, scheduleRealtimeReload)
      .subscribe();

    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [profile?.mandaliId, handleCommentRealtimeChange, handleRsvpRealtimeChange, handleUpvoteRealtimeChange, scheduleRealtimeReload]);

  const filteredPosts = useMemo(
    () => (activeFilter === 'all' ? posts : posts.filter((p) => p.type === activeFilter)),
    [posts, activeFilter]
  );
  const filteredBlendedPosts = useMemo(
    () => (activeFilter === 'all' ? blendedPosts : blendedPosts.filter((p) => p.type === activeFilter)),
    [blendedPosts, activeFilter]
  );
  const upvotedIdSet = useMemo(() => new Set(upvotedIds), [upvotedIds]);
  const commentsByPost = useMemo(() => {
    const grouped = new Map<string, CommentRow[]>();
    for (const comment of comments) {
      const current = grouped.get(comment.post_id);
      if (current) current.push(comment);
      else grouped.set(comment.post_id, [comment]);
    }
    return grouped;
  }, [comments]);
  const rsvpsByPost = useMemo(() => {
    const grouped = new Map<string, RsvpRow[]>();
    for (const rsvp of rsvps) {
      const current = grouped.get(rsvp.post_id);
      if (current) current.push(rsvp);
      else grouped.set(rsvp.post_id, [rsvp]);
    }
    return grouped;
  }, [rsvps]);
  const feedItems = useMemo<MandaliFeedItem[]>(() => {
    if (!profile?.mandaliId) return [];

    const items: MandaliFeedItem[] =
      filteredPosts.length === 0
        ? [{ type: 'empty' }]
        : filteredPosts.map((post) => ({ type: 'post', post }));

    if (filteredBlendedPosts.length > 0) {
      items.push({ type: 'blendHeader' });
      for (const post of filteredBlendedPosts) items.push({ type: 'blendedPost', post });
    }

    items.push({ type: 'members' });
    return items;
  }, [filteredBlendedPosts, filteredPosts, profile?.mandaliId]);

  const toggleUpvote = useCallback(async (postId: string) => {
    if (!profile) return;
    const alreadyUpvoted = upvotedIdSet.has(postId);
    const targetList = posts.some((p) => p.id === postId) ? setPosts : setBlendedPosts;

    setUpvotedIds((current) => (alreadyUpvoted ? current.filter((id) => id !== postId) : [...current, postId]));
    targetList((current) => current.map((p) => (p.id === postId ? { ...p, upvotes: p.upvotes + (alreadyUpvoted ? -1 : 1) } : p)));

    const result = alreadyUpvoted
      ? await supabase.from('post_upvotes').delete().match({ post_id: postId, user_id: profile.userId })
      : await supabase.from('post_upvotes').insert({ post_id: postId, user_id: profile.userId });
    if (result.error) void loadMandali();
  }, [loadMandali, posts, profile, upvotedIdSet]);

  const submitComment = useCallback(async (postId: string, body: string, parentId?: string | null) => {
    if (!profile) return;
    setCommenting(postId);
    try {
      const newId = await createMandaliComment({ postId, userId: profile.userId, body, parentId: parentId ?? null });
      await patchNewComment(newId);
    } catch {
      Alert.alert('Could not post comment', 'Check your connection and try again.');
    } finally {
      setCommenting(null);
    }
  }, [patchNewComment, profile]);

  const handleRsvp = useCallback(async (postId: string, status: RsvpStatus) => {
    if (!profile) return;
    const previousRsvps = rsvps;
    const nowIso = new Date().toISOString();
    setRsvps((current) => {
      const idx = current.findIndex((r) => r.post_id === postId && r.user_id === profile.userId);
      if (idx === -1) return [...current, { id: `optimistic:${postId}`, post_id: postId, user_id: profile.userId, status, created_at: nowIso, updated_at: nowIso }];
      const next = [...current];
      next[idx] = { ...next[idx], status, updated_at: nowIso };
      return next;
    });
    try {
      await updateMandaliRsvp({ postId, userId: profile.userId, status });
    } catch {
      setRsvps(previousRsvps);
      Alert.alert('Could not RSVP', 'Check your connection and try again.');
    }
  }, [profile, rsvps]);

  // Each of these now actually awaits the write and only shows a success
  // alert once it has genuinely succeeded — lib/mandali.ts's report/block
  // functions previously swallowed errors, so these chains would show
  // "Reported"/"Blocked" even on a failed network call or DB rejection.
  const submitPostReport = useCallback(async (post: PostRow, reason: string) => {
    if (!profile) return;
    try {
      await reportMandaliPost(profile.userId, post, reason);
      Alert.alert('Reported', 'Thank you — our team will review within 24 hours.');
    } catch {
      Alert.alert('Could not submit report', 'Check your connection and try again.');
    }
  }, [profile]);

  const handleReportPost = useCallback((post: PostRow) => {
    if (!profile) return;
    Alert.alert('Report Post', 'Why are you reporting this post?', [
      { text: 'Spam / Commercial', onPress: () => void submitPostReport(post, 'Spam/Commercial') },
      { text: 'Harassment / Hate Speech', onPress: () => void submitPostReport(post, 'Harassment/Hate Speech') },
      { text: 'Inappropriate / Offensive', onPress: () => void submitPostReport(post, 'Inappropriate/Offensive') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [profile, submitPostReport]);

  const handleBlockUser = useCallback((authorId: string, userName: string) => {
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
  }, [loadMandali, profile]);

  const showPostOptions = useCallback((post: PostRow) => {
    Alert.alert('Options', 'Choose an action for this post or user.', [
      { text: 'Report Post', onPress: () => void handleReportPost(post) },
      { text: 'Block User', style: 'destructive', onPress: () => handleBlockUser(post.author_id, post.profiles?.full_name ?? 'this user') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleBlockUser, handleReportPost]);

  const resetComposeState = useCallback(() => {
    setComposeBody('');
    setComposeType('update');
    setComposeEventDate('');
    setComposeEventLoc('');
    setEditingPost(null);
  }, []);

  const startEditPost = useCallback((post: PostRow) => {
    setEditingPost(post);
    setComposeBody(post.content);
    setComposeType(post.type);
    setComposeEventDate(post.event_date ?? '');
    setComposeEventLoc(post.event_location ?? '');
    setSheetVisible(true);
  }, []);

  const deletePost = useCallback(async (post: PostRow) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      setPosts((current) => current.filter((p) => p.id !== post.id));
      setBlendedPosts((current) => current.filter((p) => p.id !== post.id));
    } catch {
      Alert.alert('Could not delete post', 'Check your connection and try again.');
    }
  }, []);

  const confirmDeletePost = useCallback((post: PostRow) => {
    Alert.alert('Delete Post', 'This cannot be undone. Delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deletePost(post) },
    ]);
  }, [deletePost]);

  const showOwnPostOptions = useCallback((post: PostRow) => {
    Alert.alert('Your Post', 'Choose an action for this post.', [
      { text: 'Edit', onPress: () => startEditPost(post) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDeletePost(post) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [confirmDeletePost, startEditPost]);

  const reportMember = useCallback(async (memberId: string) => {
    if (!profile) return;
    try {
      await reportMandaliMember(profile.userId, memberId);
      Alert.alert('Report Submitted', 'Thank you. This will be reviewed by our team.');
    } catch {
      Alert.alert('Could not submit report', 'Check your connection and try again.');
    }
  }, [profile]);

  const showMemberOptions = useCallback((member: MemberRow) => {
    Alert.alert(member.full_name ?? 'Mandali member', 'Choose an action for this member.', [
      { text: 'Report member', onPress: () => void reportMember(member.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [reportMember]);

  // Members and nearby seekers were previously dead ends -- tapping either
  // did nothing (seekers had zero interactivity; members only had the
  // "..." Report action). Both open the same lightweight MemberInfoSheet,
  // normalized from their different source shapes (MemberRow vs
  // NearbySeeker) since neither app has a full "view another user's
  // profile" screen to link to yet.
  const openMemberInfo = useCallback((member: MemberRow) => {
    setSelectedMember({
      id: member.id,
      fullName: member.full_name,
      username: member.username,
      avatarUrl: member.avatar_url,
      city: member.city,
      country: member.country,
      sampradaya: member.sampradaya,
      ishtaDevata: member.ishta_devata,
      spiritualLevel: member.spiritual_level,
      sevaScore: member.seva_score,
    });
  }, []);

  const openSeekerInfo = useCallback((seeker: NearbySeeker) => {
    setSelectedMember({
      id: seeker.id,
      fullName: seeker.full_name,
      username: seeker.username,
      avatarUrl: seeker.avatar_url,
      city: seeker.city,
      distanceKm: seeker.distanceKm ?? null,
    });
  }, []);

  const submitPost = useCallback(async () => {
    if (!composeBody.trim()) return;
    setPosting(true);
    try {
      const content = composeBody.trim();
      const eventDate = composeType === 'event' && composeEventDate ? composeEventDate : null;
      const eventLocation = composeType === 'event' && composeEventLoc ? composeEventLoc : null;

      if (editingPost) {
        const { error } = await supabase
          .from('posts')
          .update({ content, type: composeType, event_date: eventDate, event_location: eventLocation })
          .eq('id', editingPost.id);
        if (error) throw error;
        const patch = (list: PostRow[]) =>
          list.map((p) => (p.id === editingPost.id ? { ...p, content, type: composeType, event_date: eventDate, event_location: eventLocation } : p));
        setPosts(patch);
        setBlendedPosts(patch);
      } else {
        if (!profile?.mandaliId) return;
        const { error } = await supabase.from('posts').insert({
          author_id: profile.userId,
          mandali_id: profile.mandaliId,
          content,
          type: composeType,
          event_date: eventDate,
          event_location: eventLocation,
        });
        if (error) throw error;
        await loadMandali();
      }
      resetComposeState();
      setSheetVisible(false);
    } catch {
      Alert.alert(editingPost ? 'Could not save changes' : 'Could not post', 'Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  }, [composeBody, composeEventDate, composeEventLoc, composeType, editingPost, loadMandali, profile, resetComposeState]);

  const handleLeave = useCallback(() => {
    if (!profile) return;
    Alert.alert('Leave Mandali', `Leave ${profile.mandaliName ?? 'your Mandali'}? You can rejoin any time.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => void leaveMandali(profile.userId).then(() => loadMandali()) },
    ]);
  }, [loadMandali, profile]);

  const toggleComments = useCallback((postId: string) => {
    setExpandedPostId((current) => (current === postId ? null : postId));
  }, []);

  const renderPost = useCallback((post: PostRow) => {
    return (
      <MandaliPostCard
        key={post.id}
        post={post}
        userId={profile?.userId ?? null}
        comments={commentsByPost.get(post.id) ?? []}
        rsvps={rsvpsByPost.get(post.id) ?? []}
        isUpvoted={upvotedIdSet.has(post.id)}
        expanded={expandedPostId === post.id}
        postingComment={commenting === post.id}
        theme={theme}
        onRsvp={handleRsvp}
        onShowOptions={showPostOptions}
        onShowOwnOptions={showOwnPostOptions}
        onSubmitComment={submitComment}
        onToggleComments={toggleComments}
        onToggleUpvote={toggleUpvote}
      />
    );
  }, [commenting, commentsByPost, expandedPostId, handleRsvp, profile?.userId, rsvpsByPost, showOwnPostOptions, showPostOptions, submitComment, theme, toggleComments, toggleUpvote, upvotedIdSet]);

  const renderMembersCard = useCallback(() => (
    <Card tone="auto" elevated style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 12, borderRadius: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 15, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="users" size={16} color={theme.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 11 }}>Members</Text>
          <Text style={{ color: theme.text, ...TYPE.label }}>{members.length} in your circle</Text>
        </View>
      </View>
      {members.length === 0 ? (
        <EmptyState icon="users" title="No members yet" subtitle="Your local Mandali has not surfaced any members here yet." />
      ) : (
        members.map((member, idx) => {
          const isOwnMember = member.id === profile?.userId;
          return (
            <View key={member.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ width: 16, textAlign: 'center', fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.dim }}>{idx + 1}</Text>
              <PressableSurface
                haptic="selection"
                accessibilityLabel={`View ${member.full_name ?? 'member'}`}
                onPress={() => openMemberInfo(member)}
                style={{ minHeight: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 }}
              >
                {member.avatar_url ? (
                  <Image source={{ uri: member.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" />
                ) : (
                  <LinearGradient
                    colors={[theme.brand, COLORS.brandGoldLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                      {getInitials(member.full_name ?? '?')}
                    </Text>
                  </LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansMedium, fontSize: 14 }}>
                    {member.full_name}
                    {isOwnMember ? <Text style={{ color: theme.brand }}> (you)</Text> : null}
                  </Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }}>{member.spiritual_level ?? 'Seeker'}</Text>
                </View>
              </PressableSurface>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{member.seva_score} seva</Text>
                {!isOwnMember && (
                  <PressableSurface
                    haptic="selection"
                    accessibilityLabel={`More options for ${member.full_name ?? 'member'}`}
                    onPress={() => showMemberOptions(member)}
                    style={{ minHeight: 0, padding: 4 }}
                    hitSlop={10}
                  >
                    <Feather name="more-horizontal" size={15} color={theme.dim} />
                  </PressableSurface>
                )}
              </View>
            </View>
          );
        })
      )}
    </Card>
  ), [members, openMemberInfo, profile?.userId, showMemberOptions, theme]);

  const renderFeedItem = useCallback(({ item }: ListRenderItemInfo<MandaliFeedItem>) => {
    if (item.type === 'post' || item.type === 'blendedPost') return renderPost(item.post);
    if (item.type === 'empty') {
      return (
        <EmptyState
          icon="message-circle"
          title={posts.length === 0 ? 'No posts yet' : 'No posts in this category'}
          subtitle={posts.length === 0 ? 'Be the first to share something with your Mandali.' : 'Try a different filter, or clear it to see everything.'}
        />
      );
    }
    if (item.type === 'blendHeader') {
      return (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.premiumBorder }} />
            <Text style={{ ...TYPE.section, fontSize: 10.5, color: theme.dim }}>Wider Community</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.premiumBorder }} />
          </View>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 11.5, color: theme.dim, textAlign: 'center' }}>
            Read from the wider Sanatani community while your local Mandali is set up
          </Text>
        </View>
      );
    }
    return renderMembersCard();
  }, [posts.length, renderMembersCard, renderPost, theme.dim, theme.premiumBorder]);

  const keyExtractor = useCallback((item: MandaliFeedItem) => {
    if (item.type === 'post') return `post:${item.post.id}`;
    if (item.type === 'blendedPost') return `blended:${item.post.id}`;
    return item.type;
  }, []);

  const renderFeedHeader = useCallback(() => (
    <>
      <LinearGradient
        colors={isDark
          ? [COLORS.homeHeroDark, COLORS.cardBgDark, theme.bg]
          : [COLORS.homeRaisedLight, COLORS.brandSoftLight, theme.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 28,
          padding: 18,
          gap: 14,
          boxShadow: theme.shadow,
        }}
      >
        <BackButton variant="hero" style={{ alignSelf: 'flex-start' }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="users" size={24} color={theme.brand} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 12 }}>Sacred Circle</Text>
            <Text style={{ color: theme.text, ...TYPE.cardHeading, fontSize: 25, lineHeight: 31 }} numberOfLines={1}>
              {profile?.mandaliName ?? 'Mandali'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Text style={{ color: theme.dim, ...TYPE.caption }}>
                {profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : 'Find your local sangat'}
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
        </View>

        {profile?.mandaliId ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableSurface
              onPress={() => { resetComposeState(); setSheetVisible(true); }}
              style={{ flex: 1, minHeight: 46, borderRadius: 18, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
            >
              <Feather name="edit-3" size={15} color={COLORS.ink} />
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Share with Mandali</Text>
            </PressableSurface>
            <PressableSurface haptic="selection" onPress={handleLeave} accessibilityLabel="Leave Mandali" style={{ minHeight: 46, width: 48, borderRadius: 18, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="log-out" size={17} color={theme.dim} />
            </PressableSurface>
          </View>
        ) : null}
      </LinearGradient>

      {profile?.mandaliId && (posts.length > 0 || blendedPosts.length > 0) ? (
        <FilterPicker
          options={FILTER_OPTIONS}
          value={activeFilter}
          onChange={setActiveFilter}
          cardBg={theme.card}
          border={theme.premiumBorder}
          scrimColor={COLORS.bottomSheetScrim}
        />
      ) : null}

      {!profile?.mandaliId && profile ? (
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
      ) : null}
    </>
  ), [activeFilter, blendedPosts.length, handleLeave, isDark, loadMandali, members.length, posts.length, profile, resetComposeState, router, theme]);
  const feedFooter = useMemo(() => {
    const hasCapturedLocation = profile?.latitude != null && profile.longitude != null;
    if (!profile?.mandaliId || !hasCapturedLocation) return null;

    return (
      <SeekersNearYou
        seekers={seekers}
        loading={loadingSeekers}
        text={theme.text}
        dim={theme.dim}
        brand={theme.brand}
        cardBg={theme.card}
        border={theme.border}
        onSelectSeeker={openSeekerInfo}
      />
    );
  }, [loadingSeekers, openSeekerInfo, profile?.latitude, profile?.longitude, profile?.mandaliId, seekers, theme]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (isGuest) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
          <EmptyState
            icon="users"
            title="Join Mandali"
            subtitle="Mandali is a sacred community space for registered seekers. Sign in to join Mandali, share posts, and connect with other seekers."
            ctaLabel="Sign In"
            onCta={async () => {
              await setGuestMode(false);
              router.replace('/(auth)/login');
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderFeedHeader}
        ListFooterComponent={feedFooter}
        contentContainerStyle={{ paddingBottom: 36, gap: 16 }}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} colors={[theme.brand]} />
        }
      />

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => { setSheetVisible(false); resetComposeState(); }}>
        <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14, borderWidth: 1, borderColor: theme.premiumBorder }}>
            <View style={{ alignSelf: 'center', width: 52, height: 4, borderRadius: 999, backgroundColor: theme.premiumBorder, marginBottom: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="edit-3" size={16} color={theme.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 11 }}>Mandali Post</Text>
                <Text style={{ color: theme.text, ...TYPE.cardHeading, fontSize: 22, lineHeight: 27 }}>{editingPost ? 'Edit post' : 'Create post'}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['update', 'question', 'announcement', 'event'] as const).map((type) => {
                const active = composeType === type;
                return (
                  <PressableSurface
                    key={type}
                    haptic="selection"
                    onPress={() => setComposeType(type)}
                    style={{
                      minHeight: 0,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.brand : theme.premiumBorder,
                      backgroundColor: active ? theme.brandSoft : theme.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: active ? theme.brand : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{type}</Text>
                  </PressableSurface>
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
                borderColor: theme.premiumBorder,
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
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text }}
                />
                <TextInput
                  value={composeEventDate}
                  onChangeText={setComposeEventDate}
                  placeholder="Date & time — e.g. 2026-07-12T18:00"
                  placeholderTextColor={theme.dim}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text }}
                />
              </>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PressableSurface haptic="selection" onPress={() => { setSheetVisible(false); resetComposeState(); }} style={{ minHeight: 0, flex: 1, borderRadius: 16, borderWidth: 1, borderColor: theme.premiumBorder, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Cancel</Text>
              </PressableSurface>
              <PressableSurface
                onPress={() => void submitPost()}
                disabled={posting || !composeBody.trim()}
                style={{ minHeight: 0, flex: 1, borderRadius: 16, backgroundColor: composeBody.trim() ? theme.brand : theme.premiumBorder, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                  {posting ? (editingPost ? 'Saving...' : 'Posting...') : (editingPost ? 'Save' : 'Post')}
                </Text>
              </PressableSurface>
            </View>
          </View>
        </View>
      </Modal>

      <MemberInfoSheet
        visible={!!selectedMember}
        subject={selectedMember}
        onClose={() => setSelectedMember(null)}
        onReport={
          selectedMember && members.some((m) => m.id === selectedMember.id)
            ? (subject) => {
                setSelectedMember(null);
                void reportMember(subject.id);
              }
            : undefined
        }
      />
    </Screen>
  );
}
