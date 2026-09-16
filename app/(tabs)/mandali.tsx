import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { JoinMandaliPrompt } from '@/components/mandali/JoinMandaliPrompt';
import { EventRsvpBar } from '@/components/mandali/EventRsvpBar';
import { PostComments } from '@/components/mandali/PostComments';
import { SeekersNearYou } from '@/components/mandali/SeekersNearYou';
import { MemberInfoSheet, type MemberInfoSubject } from '@/components/mandali/MemberInfoSheet';
import { PostOptionsSheet } from '@/components/mandali/PostOptionsSheet';
import { ConnectionRequestsSheet } from '@/components/mandali/ConnectionRequestsSheet';
import { PostReactionButton } from '@/components/mandali/PostReactionButton';
import { MandaliPollCard } from '@/components/mandali/MandaliPollCard';
import { FestivalQuizMandaliStat } from '@/components/mandali/FestivalQuizMandaliStat';
import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { navScrollHandler } from '@/lib/navScrollBus';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import { supabase } from '@/lib/supabase';
import { resolveDisplayName } from '@/lib/displayName';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';
import { readMandaliCache, writeMandaliCache, clearMandaliCache, type MandaliCacheIdentity } from '@/lib/mandaliCache';
import { recordRouteOpen, recordRefreshFailure, recordServerTiming, parseServerTimingHeader } from '@/lib/telemetry';
import {
  queueReactionChange,
  resumePendingReactionChanges,
  retryFailedReactionChanges,
  hasFailedReactionChange,
  listFailedReactionChanges,
  type PerformReactionAction,
} from '@/lib/reactionOutbox';
import {
  blockUser,
  cancelConnectionRequest,
  createMandaliComment,
  createMandaliPost,
  deleteMandaliComment,
  fetchConnectionStatus,
  fetchNearbySeekers,
  fetchPendingConnectionRequests,
  fetchPostComments,
  fetchSafetyState,
  leaveMandali,
  removeCommentReaction,
  reportMandaliComment,
  reportMandaliMember,
  reportMandaliPost,
  removePostReaction,
  respondToConnectionRequest,
  sendConnectionRequest,
  setCommentReaction,
  setPostReaction,
  updateMandaliComment,
  updateMandaliRsvp,
  updateMandaliPost,
  voteMandaliPoll,
  highlightMandaliComment,
  formatRelativeTime,
  type CommentRow,
  type ConnectionRequestRow,
  type ConnectionStatus,
  type MandaliPostType,
  type MemberRow,
  type NearbySeeker,
  type PostRow,
  type ReactionType,
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
  new?: { id?: unknown; post_id?: unknown; author_id?: unknown; body?: unknown; updated_at?: unknown; deleted_at?: unknown; upvotes?: unknown };
  old?: { id?: unknown; post_id?: unknown; author_id?: unknown };
};

type RealtimeCommentUpvotePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: { comment_id?: unknown; user_id?: unknown };
  old?: { comment_id?: unknown; user_id?: unknown };
};

type RealtimeRsvpPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: { id?: unknown; post_id?: unknown; user_id?: unknown; status?: unknown; created_at?: unknown; updated_at?: unknown };
  old?: { id?: unknown; post_id?: unknown; user_id?: unknown };
};

type ProfileContext = {
  userId: string;
  displayName: string;
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

type MandaliSection = 'feed' | 'events' | 'people';

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
  myReaction: ReactionType | null;
  expanded: boolean;
  loadingComments: boolean;
  postingComment: boolean;
  theme: MandaliTheme;
  onRsvp: (postId: string, status: RsvpStatus) => void;
  onShowOptions: (post: PostRow) => void;
  onShowOwnOptions: (post: PostRow) => void;
  onSubmitComment: (postId: string, body: string, parentId?: string | null) => Promise<boolean>;
  onToggleComments: (postId: string) => void;
  onSelectReaction: (postId: string, reaction: ReactionType) => void;
  onRemoveReaction: (postId: string) => void;
  onRetryReaction: (postId: string) => void;
  reactionFailed: boolean;
  onViewProfile: (userId: string) => void;
  onEditComment: (commentId: string, body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onSelectCommentReaction: (commentId: string, reaction: ReactionType) => void;
  onRemoveCommentReaction: (commentId: string) => void;
  onRetryCommentReaction: (commentId: string) => void;
  myCommentReactions: Record<string, ReactionType>;
  failedCommentReactionIds: Set<string>;
  onVotePoll?: (pollId: string, optionId: string) => Promise<boolean | void>;
  onToggleHighlightComment?: (commentId: string, isHighlighted: boolean) => Promise<void> | void;
  onReportComment?: (commentId: string) => void;
};

const MandaliPostCard = memo(function MandaliPostCard({
  post,
  userId,
  comments,
  rsvps,
  myReaction,
  expanded,
  loadingComments,
  postingComment,
  theme,
  onRsvp,
  onShowOptions,
  onShowOwnOptions,
  onSubmitComment,
  onToggleComments,
  onSelectReaction,
  onRemoveReaction,
  onRetryReaction,
  reactionFailed,
  onViewProfile,
  onEditComment,
  onDeleteComment,
  onSelectCommentReaction,
  onRemoveCommentReaction,
  onRetryCommentReaction,
  myCommentReactions,
  failedCommentReactionIds,
  onVotePoll,
  onToggleHighlightComment,
  onReportComment,
}: MandaliPostCardProps) {
  const isDark = useColorScheme() === 'dark';
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
        backgroundColor: post.mandali_prompt_id ? theme.brandSoft : theme.card,
        borderColor: theme.premiumBorder,
        borderLeftWidth: post.mandali_prompt_id ? 3 : 1,
        borderLeftColor: post.mandali_prompt_id ? theme.brand : theme.premiumBorder,
        gap: 8,
        padding: 11,
        borderRadius: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <PressableSurface
          haptic="selection"
          accessibilityLabel={`View ${post.profiles?.full_name ?? post.profiles?.username ?? 'profile'}`}
          onPress={() => onViewProfile(post.author_id)}
          style={{ minHeight: 0 }}
        >
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
        </PressableSurface>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, flexShrink: 1 }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel={`View ${post.profiles?.full_name ?? post.profiles?.username ?? 'profile'}`}
                onPress={() => onViewProfile(post.author_id)}
                style={{ minHeight: 0, flexShrink: 1 }}
              >
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}
                >
                  {post.profiles?.full_name ?? post.profiles?.username ?? 'Seeker'}
                </Text>
              </PressableSurface>
              {post.profiles?.is_official === true ? (
                // Official identity is derived server-side from the configured
                // system author id. Cached pre-contract posts simply omit it.
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                    backgroundColor: theme.surface,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    flexShrink: 0,
                  }}
                >
                  <Feather name="check-circle" size={8} color={theme.brand} />
                  <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 8 }}>Official</Text>
                </View>
              ) : null}
              <Text style={{ color: theme.dim, fontSize: 9, opacity: 0.5, flexShrink: 0 }}>•</Text>
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11, flexShrink: 0 }}>
                {formatRelativeTime(post.created_at)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
                style={{ minHeight: 0, paddingLeft: 2 }}
                hitSlop={10}
              >
                <Feather name="more-horizontal" size={16} color={theme.dim} />
              </PressableSurface>
            </View>
          </View>
        </View>
      </View>

      {post.mandali_prompt_id ? (
        <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 10 }}>Today&apos;s conversation</Text>
      ) : null}

      <Text style={{ color: theme.text, fontFamily: post.mandali_prompt_id ? FONTS.serif : FONTS.sans, fontSize: post.mandali_prompt_id ? 16 : 13.5, lineHeight: post.mandali_prompt_id ? 22 : 20 }}>
        {post.content}
      </Text>

      {post.type === 'event' && post.event_date ? (
        <View
          style={{
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

      {post.poll ? (
        <MandaliPollCard
          poll={post.poll}
          onVote={onVotePoll ?? (() => Promise.resolve())}
          dim={theme.dim}
          text={theme.text}
          brand={theme.brand}
          cardBg={theme.card}
          border={theme.premiumBorder}
          isDark={isDark}
        />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <PostReactionButton
          reaction={myReaction}
          count={post.upvotes}
          onSelect={(reaction) => onSelectReaction(post.id, reaction)}
          onRemove={() => onRemoveReaction(post.id)}
          failed={reactionFailed}
          onRetry={() => onRetryReaction(post.id)}
          dim={theme.dim}
          cardBg={theme.card}
          border={theme.premiumBorder}
          scrimColor={COLORS.bottomSheetScrim}
        />

        <PressableSurface
          haptic="selection"
          accessibilityLabel={expanded ? 'Hide comments' : 'Show comments'}
          onPress={() => onToggleComments(post.id)}
          style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5 }}
          hitSlop={6}
        >
          <Feather name="message-square" size={13} color={expanded ? theme.brand : theme.dim} />
          <Text style={{ color: expanded ? theme.brand : theme.dim, fontFamily: FONTS.sansMedium, fontSize: 11.5 }}>
            {expanded ? 'Hide comments' : post.comment_count > 0 ? `${post.comment_count} ${post.comment_count === 1 ? 'reply' : 'replies'}` : 'Comment'}
          </Text>
        </PressableSurface>
      </View>

      <PostComments
        comments={comments}
        expanded={expanded}
        loadingFull={loadingComments}
        onToggleExpand={() => onToggleComments(post.id)}
        userId={userId ?? ''}
        postAuthorId={post.author_id}
        onToggleHighlightComment={onToggleHighlightComment}
        posting={postingComment}
        onSubmit={(body, parentId) => onSubmitComment(post.id, body, parentId)}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
        onSelectCommentReaction={onSelectCommentReaction}
        onRemoveCommentReaction={onRemoveCommentReaction}
        onRetryCommentReaction={onRetryCommentReaction}
        myCommentReactions={myCommentReactions}
        failedCommentReactionIds={failedCommentReactionIds}
        onViewProfile={onViewProfile}
        onReportComment={onReportComment}
        text={theme.text}
        dim={theme.dim}
        cardBg={theme.card}
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
  const insets = useSafeAreaInsets();
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
  const [myReactions, setMyReactions] = useState<Record<string, ReactionType>>({});
  const [myCommentReactions, setMyCommentReactions] = useState<Record<string, ReactionType>>({});
  // Keys "post:<id>" / "comment:<id>" -- targets whose last reaction change
  // failed to sync and is waiting in lib/reactionOutbox.ts for a Retry.
  const [failedReactionTargets, setFailedReactionTargets] = useState<Set<string>>(new Set());
  const [seekers, setSeekers] = useState<NearbySeeker[]>([]);
  const [loadingSeekers, setLoadingSeekers] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberInfoSubject | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequestRow[]>([]);
  const [requestsSheetVisible, setRequestsSheetVisible] = useState(false);
  const [postOptionsPost, setPostOptionsPost] = useState<PostRow | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [composerKeyboardVisible, setComposerKeyboardVisible] = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [composeType, setComposeType] = useState<MandaliPostType>('update');
  const [composeEventDate, setComposeEventDate] = useState('');
  const [composeEventLoc, setComposeEventLoc] = useState('');
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [activeSection, setActiveSection] = useState<MandaliSection>('feed');
  const [activeFilter, setActiveFilter] = useState<MandaliPostType | 'all'>('all');
  // Keyset pagination state for the paginated feed endpoint.
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Posts whose full comment thread has been fetched via fetchPostComments
  // -- until then, `comments` only holds each post's 2-comment preview from
  // the feed response, and expanding re-fetches the full thread once.
  const [fullyLoadedCommentPostIds, setFullyLoadedCommentPostIds] = useState<Set<string>>(new Set());
  const [loadingCommentsForPostId, setLoadingCommentsForPostId] = useState<string | null>(null);
  const visiblePostIdsRef = useRef<Set<string>>(new Set());
  // Set by loadMandali when the cache-hit branch actually painted, and with
  // the resolved user id -- read by the mount effect's telemetry after the
  // promise settles. Reading `profile` state there instead would see the
  // stale closure from mount, not the setProfile() call loadMandali makes
  // internally, since this effect's deps don't include `profile`.
  const routeOpenCacheHitRef = useRef(false);
  const telemetryUserIdRef = useRef<string | null>(null);
  // Resolved as soon as loadMandali knows the user id, independent of
  // `profile` state -- read by the reaction outbox's resume path (mount and
  // app-foreground) so it never depends on a possibly-stale profile closure.
  const resolvedUserIdRef = useRef<string | null>(null);
  // Sorted, joined post-id string used ONLY to scope the reaction/comment/
  // RSVP realtime subscriptions below (Postgres Changes' `in.()` filter
  // needs a static string) and as a stable effect dependency -- resubscribes
  // only when the actual visible-post set changes, not on every render.
  // Previously these three subscriptions had no filter at all: an upvote or
  // comment on ANY post in the entire app (not just this mandali) was
  // pushed to every connected Mandali client and silently discarded by the
  // visiblePostIdsRef check in each handler. Scoping the subscription
  // itself removes that unnecessary traffic instead of just discarding it
  // after delivery.
  const visiblePostIdsKey = useMemo(
    () => [...posts, ...blendedPosts].map((p) => p.id).sort().join(','),
    [posts, blendedPosts]
  );
  const realtimeReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composeBodyRef = useRef<TextInput>(null);

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

  // Reconstructs the real Supabase write for a queued reaction outbox entry
  // -- injected into lib/reactionOutbox.ts rather than that module importing
  // lib/mandali.ts's setPostReaction/etc directly, so the outbox stays
  // testable with a fake action the way lib/sankalpaOutbox.ts is testable
  // with a fake fetchImpl.
  const performReactionAction = useCallback<PerformReactionAction>(async (targetType, targetId, desiredReaction) => {
    const userId = resolvedUserIdRef.current;
    if (!userId) throw new Error('No authenticated user for reaction sync');
    if (targetType === 'post') {
      if (desiredReaction == null) await removePostReaction(targetId, userId);
      else await setPostReaction(targetId, userId, desiredReaction);
    } else {
      if (desiredReaction == null) await removeCommentReaction(targetId, userId);
      else await setCommentReaction(targetId, userId, desiredReaction);
    }
  }, []);

  const refreshFailedReactionTargets = useCallback(async (userId: string) => {
    const failed = await listFailedReactionChanges(userId);
    setFailedReactionTargets(new Set(failed.map((f) => `${f.targetType}:${f.targetId}`)));
  }, []);

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
    telemetryUserIdRef.current = user.id;

    const cacheIdentity: MandaliCacheIdentity = { kind: 'authenticated', userId: user.id };

    // Stale-while-revalidate: render whatever was cached for THIS identity
    // instantly (if anything), then keep going into the network fetch
    // below regardless -- this is a bridge to the fresh response, not a
    // substitute for it, same pattern as Home's homeCoordinator.
    const cached = await readMandaliCache(cacheIdentity);
    if (cached) {
      setProfile({
        userId: user.id,
        // Old cached payloads predate displayName -- resolveDisplayName's
        // own fallback only fires on blank input, so an old payload
        // (undefined) needs this explicit default to avoid literally
        // rendering "undefined" until the network refetch below lands.
        displayName: cached.payload.displayName || 'Seeker',
        mandaliId: cached.payload.mandaliId,
        mandaliName: cached.payload.mandaliName,
        city: cached.payload.city,
        country: cached.payload.country,
        latitude: cached.payload.latitude,
        longitude: cached.payload.longitude,
      });
      setPosts(cached.payload.posts);
      setBlendedPosts(cached.payload.blendedPosts);
      setComments(cached.payload.comments);
      setRsvps(cached.payload.rsvps);
      setMembers(cached.payload.members);
      setNextCursor(cached.payload.nextCursor);
      setMyReactions(
        Object.fromEntries(
          [...cached.payload.posts, ...cached.payload.blendedPosts]
            .filter((post) => post.viewerReaction)
            .map((post) => [post.id, post.viewerReaction as ReactionType])
        )
      );
      visiblePostIdsRef.current = new Set([...cached.payload.posts, ...cached.payload.blendedPosts].map((p) => p.id));
      setLoading(false);
      routeOpenCacheHitRef.current = true;
    }

    type FeedPayload = {
      schemaVersion: 1;
      profile: {
        id: string;
        full_name: string | null;
        username: string | null;
        mandali_id: string | null;
        city: string | null;
        country: string | null;
        latitude: number | null;
        longitude: number | null;
        mandalis?: { name?: string | null } | Array<{ name?: string | null }> | null;
      } | null;
      posts: PostRow[];
      rsvps: RsvpRow[];
      members: Array<{ id: string; username: string; avatar_url: string | null; seva_score: number }>;
      blendedPosts: PostRow[];
      nextCursor: string | null;
    };
    // Keyset-paginated, bounded-payload path (posts + author + counts +
    // viewer reaction + comment preview in one response) -- opt-in via
    // ?limit, see /api/mandali/feed's route handler. First page only here;
    // loadMorePosts below fetches subsequent pages with ?cursor.
    let feed: FeedPayload | null = null;
    try {
      const feedResponse = await apiFetch('/api/mandali/feed?limit=20');
      const feedServerTiming = parseServerTimingHeader(feedResponse.headers.get('Server-Timing'));
      if (feedServerTiming) {
        recordServerTiming({ kind: 'authenticated', userId: user.id }, 'mandali', feedServerTiming);
      }
      if (feedResponse.ok) {
        feed = (await feedResponse.json()) as FeedPayload;
      } else {
        console.warn(`[MandaliScreen] /api/mandali/feed returned ${feedResponse.status}, attempting direct Supabase fallback`);
      }
    } catch (feedErr) {
      console.warn('[MandaliScreen] /api/mandali/feed fetch failed, attempting direct Supabase fallback:', feedErr);
    }

    if (!feed) {
      // Mirrors the real /api/mandali/feed route's use of getUserSafetyState +
      // filterAuthoredItems/filterProfileRows (backend's src/lib/user-safety.ts)
      // -- without this, a blocked/muted member's posts and comments (and their
      // own row in the member list) would leak straight through this fallback,
      // since it reads posts/profiles directly with no server-side filtering.
      const [{ data: myProfile }, safetyState] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, username, mandali_id, city, country, latitude, longitude, mandalis(name)')
          .eq('id', user.id)
          .maybeSingle(),
        fetchSafetyState(user.id).catch((safetyErr) => {
          console.warn('[MandaliScreen] fetchSafetyState failed, fallback feed will be unfiltered:', safetyErr);
          return { excludedAuthorIds: new Set<string>(), hiddenContentKeys: new Set<string>() };
        }),
      ]);

      const mandaliId = myProfile?.mandali_id ?? null;
      let fetchedPosts: PostRow[] = [];
      let fetchedMembers: Array<{ id: string; username: string; avatar_url: string | null; seva_score: number }> = [];

      if (mandaliId) {
        const { data: rawPosts, error: rawPostsErr } = await supabase
          .from('posts')
          .select('id, author_id, mandali_id, content, type, event_date, event_location, upvotes, comment_count, created_at')
          .eq('mandali_id', mandaliId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (rawPostsErr) {
          console.warn('[MandaliScreen] Direct posts query error:', rawPostsErr);
        }

        const visiblePosts = (rawPosts ?? []).filter((p) =>
          !safetyState.excludedAuthorIds.has(p.author_id) &&
          !safetyState.hiddenContentKeys.has(`mandali_post:${p.id}`)
        );

        if (visiblePosts.length > 0) {
          const rawPosts = visiblePosts;
          const authorIds = Array.from(new Set(rawPosts.map((p) => p.author_id)));
          const { data: authors } = await supabase
            .from('public_profiles')
            .select('id, username, avatar_url, seva_score')
            .in('id', authorIds);

          const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));

          const postIds = rawPosts.map((p) => p.id);
          const { data: myUpvotes } = await supabase
            .from('post_upvotes')
            .select('post_id, reaction_type')
            .eq('user_id', user.id)
            .in('post_id', postIds);

          const upvoteMap = new Map((myUpvotes ?? []).map((u) => [u.post_id, (u.reaction_type ?? 'love') as ReactionType]));

          const { data: rawComments } = await supabase
            .from('post_comments')
            .select('id, post_id, author_id, body, created_at, upvotes')
            .in('post_id', postIds)
            .order('created_at', { ascending: false })
            .limit(40);

          const visibleComments = (rawComments ?? []).filter((c) =>
            !safetyState.excludedAuthorIds.has(c.author_id) &&
            !safetyState.hiddenContentKeys.has(`mandali_comment:${c.id}`)
          );

          const commentAuthorIds = Array.from(new Set(visibleComments.map((c) => c.author_id)));
          const { data: commentAuthors } = commentAuthorIds.length > 0
            ? await supabase.from('public_profiles').select('id, username, avatar_url').in('id', commentAuthorIds)
            : { data: [] };
          const commentAuthorMap = new Map((commentAuthors ?? []).map((a) => [a.id, a]));

          const commentsByPost = new Map<string, CommentRow[]>();
          for (const c of visibleComments) {
            const auth = commentAuthorMap.get(c.author_id);
            const row: CommentRow = {
              id: c.id,
              post_id: c.post_id,
              author_id: c.author_id,
              body: c.body,
              parent_id: null,
              created_at: c.created_at,
              updated_at: null,
              deleted_at: null,
              upvotes: c.upvotes ?? 0,
              profiles: auth ? { full_name: auth.username, username: auth.username, avatar_url: auth.avatar_url } : null,
            };
            const list = commentsByPost.get(c.post_id) ?? [];
            if (list.length < 2) list.push(row);
            commentsByPost.set(c.post_id, list);
          }

          fetchedPosts = rawPosts.map((p) => {
            const auth = authorMap.get(p.author_id);
            return {
              id: p.id,
              created_at: p.created_at,
              author_id: p.author_id,
              mandali_id: p.mandali_id,
              content: p.content,
              type: p.type,
              upvotes: p.upvotes ?? 0,
              comment_count: p.comment_count ?? 0,
              event_date: p.event_date,
              event_location: p.event_location,
              profiles: auth ? {
                full_name: auth.username,
                username: auth.username,
                avatar_url: auth.avatar_url,
                sampradaya: null,
                spiritual_level: null,
              } : null,
              viewerReaction: upvoteMap.get(p.id) ?? null,
              commentPreview: commentsByPost.get(p.id) ?? [],
            };
          });
        }

        const { data: memberRows } = await supabase
          .from('profiles')
          .select('id')
          .eq('mandali_id', mandaliId);
        if (memberRows && memberRows.length > 0) {
          const { data: pubMembers } = await supabase
            .from('public_profiles')
            .select('id, username, avatar_url, seva_score')
            .in('id', memberRows.map((m) => m.id));
          fetchedMembers = (pubMembers ?? [])
            .filter((m) => !safetyState.excludedAuthorIds.has(m.id))
            .map((m) => ({
              id: m.id,
              username: m.username,
              avatar_url: m.avatar_url,
              seva_score: m.seva_score ?? 0,
            }));
        }
      }

      feed = {
        schemaVersion: 1,
        profile: myProfile as any,
        posts: fetchedPosts,
        rsvps: [],
        members: fetchedMembers,
        blendedPosts: [],
        nextCursor: null,
      };
    }
    const profileRow = feed.profile;
    const mandaliRelation = Array.isArray(profileRow?.mandalis) ? profileRow.mandalis[0] : profileRow?.mandalis;
    const context: ProfileContext = {
      userId: user.id,
      displayName: resolveDisplayName(profileRow?.full_name, profileRow?.username),
      mandaliId: profileRow?.mandali_id ?? null,
      mandaliName: (mandaliRelation as { name?: string } | null)?.name ?? null,
      city: profileRow?.city ?? null,
      country: profileRow?.country ?? null,
      latitude: profileRow?.latitude ?? null,
      longitude: profileRow?.longitude ?? null,
    };
    setProfile(context);
    resolvedUserIdRef.current = context.userId;
    void resumePendingReactionChanges(context.userId, performReactionAction).then(() =>
      refreshFailedReactionTargets(context.userId)
    );
    void refreshFailedReactionTargets(context.userId);

    if (!context.mandaliId) {
      visiblePostIdsRef.current = new Set();
      setPosts([]);
      setBlendedPosts([]);
      setComments([]);
      setRsvps([]);
      setMembers([]);
      setMyReactions({});
      setMyCommentReactions({});
      setNextCursor(null);
      setFullyLoadedCommentPostIds(new Set());
      void clearMandaliCache(cacheIdentity);
      return;
    }

    const visiblePosts = feed.posts;
    const visibleMembers: MemberRow[] = feed.members.map((member) => ({
      ...member,
      // Everyone else's row shows their username -- public_profiles (the
      // safe cross-user projection this members list is drawn from) never
      // carries full_name, deliberately, per the profiles RLS lockdown
      // (supabase/migrations/20260824162430_lock_down_profiles_reads.sql).
      // The viewer's own row is the one exception: it's their own data,
      // sourced from the feed response's `profile.full_name` (see
      // ProfileContext.displayName above), not a cross-user read.
      full_name: member.id === context.userId ? context.displayName : member.username,
      sampradaya: null,
      ishta_devata: null,
      spiritual_level: null,
      city: null,
      country: null,
    }));
    const visibleBlended = feed.blendedPosts;
    setPosts(visiblePosts);
    setMembers(visibleMembers);
    setBlendedPosts(visibleBlended);
    setRsvps(feed.rsvps);
    setNextCursor(feed.nextCursor);
    // A full page reload (pull-to-refresh, focus, filter reset) invalidates
    // any previously-expanded full comment threads -- they'll re-fetch on
    // next expand rather than risk showing a thread that no longer matches
    // this fresh set of posts.
    setFullyLoadedCommentPostIds(new Set());

    const allPosts = [...visiblePosts, ...visibleBlended];
    const visiblePostIds = new Set(allPosts.map((post) => post.id));

    // viewerReaction now arrives inlined per post from the feed response --
    // no separate post_upvotes round trip needed.
    setMyReactions(
      Object.fromEntries(
        allPosts
          .filter((post) => post.viewerReaction)
          .map((post) => [post.id, post.viewerReaction as ReactionType])
      )
    );

    // Seed `comments` from each post's 2-comment preview; expanding a post
    // fetches its full thread separately (see toggleComments).
    const previewComments = allPosts.flatMap((post) => post.commentPreview ?? []);
    setComments(previewComments);

    const allCommentIds = previewComments.map((comment) => comment.id);
    if (allCommentIds.length > 0) {
      const { data: commentUpvoteRows } = await supabase
        .from('comment_upvotes')
        .select('comment_id, reaction_type')
        .eq('user_id', user.id)
        .in('comment_id', allCommentIds);
      setMyCommentReactions(
        Object.fromEntries(
          (commentUpvoteRows ?? []).map((row) => [row.comment_id, (row.reaction_type ?? 'love') as ReactionType])
        )
      );
    } else {
      setMyCommentReactions({});
    }

    visiblePostIdsRef.current = visiblePostIds;

    void writeMandaliCache(cacheIdentity, {
      displayName: context.displayName,
      mandaliId: context.mandaliId,
      mandaliName: context.mandaliName,
      city: context.city,
      country: context.country,
      latitude: context.latitude,
      longitude: context.longitude,
      posts: visiblePosts,
      blendedPosts: visibleBlended,
      comments: previewComments,
      rsvps: feed.rsvps,
      members: visibleMembers,
      nextCursor: feed.nextCursor,
    });
  }, [router, performReactionAction, refreshFailedReactionTargets]);

  // Fetches the next page of the local Mandali feed (blended posts are
  // first-page-only, so this only ever appends to `posts`). Guarded against
  // overlapping calls and a missing cursor (either no next page, or the
  // screen is mid-initial-load).
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const response = await apiFetch(`/api/mandali/feed?cursor=${encodeURIComponent(nextCursor)}&limit=20`);
      if (!response.ok) return;
      const page = await response.json() as { posts: PostRow[]; nextCursor: string | null };
      setPosts((current) => {
        const seen = new Set(current.map((p) => p.id));
        return [...current, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      setComments((current) => {
        const seen = new Set(current.map((c) => c.id));
        const newPreviews = page.posts.flatMap((post) => post.commentPreview ?? []).filter((c) => !seen.has(c.id));
        return [...current, ...newPreviews];
      });
      setMyReactions((current) => {
        const additions = Object.fromEntries(
          page.posts.filter((post) => post.viewerReaction).map((post) => [post.id, post.viewerReaction as ReactionType])
        );
        return { ...current, ...additions };
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      console.error('[MandaliScreen] loadMorePosts failed', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor]);

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
  // changes only carry the raw row), so it needs a display-ready author
  // name/avatar before it can render. This used to join
  // profiles!post_comments_author_id_fkey directly, which silently
  // returned a null profile for every comment authored by someone other
  // than the viewer once profiles reads were locked down to own-row-only
  // (supabase/migrations/20260824162430_lock_down_profiles_reads.sql) --
  // exactly the case this handler exists for (its one caller already
  // skips INSERTs authored by the viewer). fetchPostComments goes through
  // the server-owned safe DTO (loadPostComments -> loadSafeAuthors, admin
  // client) the same way the "expand thread" path above already does, so
  // this reuses that instead of adding a second cross-user profile fetch
  // path.
  const patchNewComment = useCallback(async (postId: string, commentId: string) => {
    const fullComments = await fetchPostComments(postId, profile?.userId);
    const normalized = fullComments.find((c) => c.id === commentId);
    if (!normalized) return;
    setComments((current) => (current.some((c) => c.id === normalized.id) ? current : [...current, normalized]));
  }, [profile?.userId]);

  // Upvotes, comments, and RSVPs used to all funnel into one debounced
  // full loadMandali() -- meaning a single upvote from a stranger on a
  // blended post refetched the entire screen (profile, posts, blended
  // posts, members, comments, RSVPs, upvotes). These three handlers patch
  // just the affected slice of state instead. Each skips changes authored
  // by the current user, since handleSelectReaction/submitComment/handleRsvp
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
      void patchNewComment(postId, commentId).catch(() => {
        // A realtime refresh failure must not become an unhandled rejection.
        // Expanding the thread can retry through the same safe API.
      });
      return;
    }
    if (payload.eventType === 'UPDATE') {
      // Covers both an author's edit/soft-delete AND the upvotes column
      // getting bumped by sync_comment_upvote_count -- both land as a
      // post_comments UPDATE, and re-applying the row's own current values
      // (not an increment) is safe even for the echo of this device's own
      // write, unlike the increment-based upvote/RSVP handlers above.
      const next = payload.new;
      if (!next) return;
      setComments((current) => current.map((c) => (c.id === commentId ? {
        ...c,
        body: typeof next.body === 'string' ? next.body : c.body,
        updated_at: typeof next.updated_at === 'string' ? next.updated_at : c.updated_at,
        deleted_at: typeof next.deleted_at === 'string' ? next.deleted_at : (next.deleted_at === null ? null : c.deleted_at),
        upvotes: typeof next.upvotes === 'number' ? next.upvotes : c.upvotes,
      } : c)));
    }
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
    const startedAt = Date.now();
    routeOpenCacheHitRef.current = false;
    loadMandali()
      .then(() => {
        if (telemetryUserIdRef.current) {
          recordRouteOpen(
            { kind: 'authenticated', userId: telemetryUserIdRef.current },
            'mandali',
            { cacheHit: routeOpenCacheHitRef.current, durationMs: Date.now() - startedAt }
          );
        }
      })
      .catch((error) => {
        console.error('[MandaliScreen] loadMandali failed', error);
        if (telemetryUserIdRef.current) {
          recordRefreshFailure({ kind: 'authenticated', userId: telemetryUserIdRef.current }, 'mandali');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadPendingRequests = useCallback(() => {
    if (!profile?.userId) return;
    fetchPendingConnectionRequests(profile.userId)
      .then((rows) => setPendingRequests(rows))
      .catch((error) => {
        console.error('[MandaliScreen] fetchPendingConnectionRequests failed', error);
        setPendingRequests([]);
      });
  }, [profile?.userId]);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  // Resume queued reaction changes on foreground -- per the agreed retry
  // policy, retries happen when the app is actually in front with network
  // available, never via unbounded background timers (same pattern as
  // components/home/SankalpaCard.tsx).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const userId = resolvedUserIdRef.current;
      if (!userId) return;
      void resumePendingReactionChanges(userId, performReactionAction).then(() => refreshFailedReactionTargets(userId));
    });
    return () => subscription.remove();
  }, [performReactionAction, refreshFailedReactionTargets]);

  // Realtime — posts/profiles changes (new post, membership change) stay
  // full, debounced reloads since they change the feed's actual structure
  // (ordering, blend-threshold, visible-post-id set). Upvotes/comments/
  // RSVPs are patched incrementally (see the three handlers above) since
  // they're both far more frequent and structurally trivial.
  useEffect(() => {
    if (!profile?.mandaliId) return;

    const channelBuilder = supabase
      .channel(`mandali:${profile.mandaliId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `mandali_id=eq.${profile.mandaliId}` }, scheduleRealtimeReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `mandali_id=eq.${profile.mandaliId}` }, scheduleRealtimeReload);

    // Reaction/comment/RSVP tables have no mandali_id column to filter on
    // directly, but they do carry post_id -- scope to exactly the posts
    // currently loaded instead of subscribing unfiltered. Skipped entirely
    // until at least one post has loaded (nothing to scope to yet).
    if (visiblePostIdsKey) {
      const postIdFilter = `post_id=in.(${visiblePostIdsKey})`;
      channelBuilder
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_upvotes', filter: postIdFilter }, handleUpvoteRealtimeChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments', filter: postIdFilter }, handleCommentRealtimeChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps', filter: postIdFilter }, handleRsvpRealtimeChange);
    }

    const channel = channelBuilder.subscribe();

    return () => {
      channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [profile?.mandaliId, visiblePostIdsKey, handleCommentRealtimeChange, handleRsvpRealtimeChange, handleUpvoteRealtimeChange, scheduleRealtimeReload]);

  const filteredPosts = useMemo(
    () => (activeFilter === 'all' ? posts : posts.filter((p) => p.type === activeFilter)),
    [posts, activeFilter]
  );
  const filteredBlendedPosts = useMemo(
    () => (activeFilter === 'all' ? blendedPosts : blendedPosts.filter((p) => p.type === activeFilter)),
    [blendedPosts, activeFilter]
  );
  const failedCommentReactionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const key of failedReactionTargets) {
      if (key.startsWith('comment:')) ids.add(key.slice('comment:'.length));
    }
    return ids;
  }, [failedReactionTargets]);
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

    if (activeSection === 'people') return [{ type: 'members' }];

    if (activeSection === 'events') {
      const eventPosts = posts.filter((post) => post.type === 'event');
      return eventPosts.length > 0
        ? eventPosts.map((post) => ({ type: 'post' as const, post }))
        : [{ type: 'empty' }];
    }

    const items: MandaliFeedItem[] =
      filteredPosts.length === 0
        ? [{ type: 'empty' }]
        : filteredPosts.map((post) => ({ type: 'post', post }));

    if (filteredBlendedPosts.length > 0) {
      items.push({ type: 'blendHeader' });
      for (const post of filteredBlendedPosts) items.push({ type: 'blendedPost', post });
    }

    return items;
  }, [activeSection, filteredBlendedPosts, filteredPosts, posts, profile?.mandaliId]);

  // Post/comment reactions queue through lib/reactionOutbox.ts rather than
  // writing directly and reverting on failure -- the backend is naturally
  // idempotent (upsert/delete-by-match), so once the optimistic UI reflects
  // the user's intent it stays that way; a permanent failure surfaces an
  // explicit "Retry" state on the reaction control instead of silently
  // snapping back with no explanation, the same "never a silent failure"
  // discipline already applied to Settings, Notifications, Mood and
  // Sankalpa this session.
  const handleSelectReaction = useCallback(async (postId: string, reaction: ReactionType) => {
    if (!profile) return;
    const hadReaction = myReactions[postId] != null;
    const targetList = posts.some((p) => p.id === postId) ? setPosts : setBlendedPosts;

    setMyReactions((current) => ({ ...current, [postId]: reaction }));
    if (!hadReaction) {
      targetList((current) => current.map((p) => (p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p)));
    }
    setFailedReactionTargets((current) => {
      if (!current.has(`post:${postId}`)) return current;
      const next = new Set(current);
      next.delete(`post:${postId}`);
      return next;
    });

    await queueReactionChange(profile.userId, 'post', postId, reaction, performReactionAction);
    if (await hasFailedReactionChange(profile.userId, 'post', postId)) {
      setFailedReactionTargets((current) => new Set(current).add(`post:${postId}`));
    }
  }, [posts, profile, myReactions, performReactionAction]);

  const handleRemoveReaction = useCallback(async (postId: string) => {
    if (!profile) return;
    const previous = myReactions[postId];
    if (previous == null) return;
    const targetList = posts.some((p) => p.id === postId) ? setPosts : setBlendedPosts;

    setMyReactions((current) => {
      const { [postId]: _removed, ...rest } = current;
      return rest;
    });
    targetList((current) => current.map((p) => (p.id === postId ? { ...p, upvotes: Math.max(0, p.upvotes - 1) } : p)));
    setFailedReactionTargets((current) => {
      if (!current.has(`post:${postId}`)) return current;
      const next = new Set(current);
      next.delete(`post:${postId}`);
      return next;
    });

    await queueReactionChange(profile.userId, 'post', postId, null, performReactionAction);
    if (await hasFailedReactionChange(profile.userId, 'post', postId)) {
      setFailedReactionTargets((current) => new Set(current).add(`post:${postId}`));
    }
  }, [posts, profile, myReactions, performReactionAction]);

  const handleRetryReaction = useCallback(async (postId: string) => {
    if (!profile) return;
    await retryFailedReactionChanges(profile.userId, performReactionAction);
    await refreshFailedReactionTargets(profile.userId);
  }, [profile, performReactionAction, refreshFailedReactionTargets]);

  const submitComment = useCallback(async (postId: string, body: string, parentId?: string | null): Promise<boolean> => {
    if (!profile) return false;
    setCommenting(postId);
    let newId: string | null = null;
    try {
      newId = await createMandaliComment({ postId, userId: profile.userId, body, parentId: parentId ?? null });
    } catch {
      Alert.alert('Could not post comment', 'Check your connection and try again.');
      return false;
    } finally {
      setCommenting(null);
    }

    // Optimistically update post comment count
    setPosts((current) => current.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)));
    setBlendedPosts((current) => current.map((p) => (p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)));

    if (newId) {
      const optimisticComment: CommentRow = {
        id: newId,
        post_id: postId,
        author_id: profile.userId,
        body,
        parent_id: parentId ?? null,
        created_at: new Date().toISOString(),
        updated_at: null,
        deleted_at: null,
        upvotes: 0,
        is_highlighted: false,
        profiles: {
          full_name: profile.displayName || 'You',
          username: profile.displayName || 'You',
          avatar_url: null,
        },
      };
      setComments((current) => (current.some((c) => c.id === newId) ? current : [...current, optimisticComment]));

      // Refresh full thread in the background to replace with server-hydrated row.
      // A background refresh failure must never trigger a false "Could not post comment" alert.
      void patchNewComment(postId, newId).catch((err) => {
        console.warn('[MandaliScreen] Background patchNewComment failed', err);
      });
    }

    return true;
  }, [patchNewComment, profile]);

  const handleSelectCommentReaction = useCallback(async (commentId: string, reaction: ReactionType) => {
    if (!profile) return;
    const hadReaction = myCommentReactions[commentId] != null;

    setMyCommentReactions((current) => ({ ...current, [commentId]: reaction }));
    if (!hadReaction) {
      setComments((current) => current.map((c) => (c.id === commentId ? { ...c, upvotes: c.upvotes + 1 } : c)));
    }
    setFailedReactionTargets((current) => {
      if (!current.has(`comment:${commentId}`)) return current;
      const next = new Set(current);
      next.delete(`comment:${commentId}`);
      return next;
    });

    await queueReactionChange(profile.userId, 'comment', commentId, reaction, performReactionAction);
    if (await hasFailedReactionChange(profile.userId, 'comment', commentId)) {
      setFailedReactionTargets((current) => new Set(current).add(`comment:${commentId}`));
    }
  }, [profile, myCommentReactions, performReactionAction]);

  const handleRemoveCommentReaction = useCallback(async (commentId: string) => {
    if (!profile) return;
    const previous = myCommentReactions[commentId];
    if (previous == null) return;

    setMyCommentReactions((current) => {
      const { [commentId]: _removed, ...rest } = current;
      return rest;
    });
    setComments((current) => current.map((c) => (c.id === commentId ? { ...c, upvotes: Math.max(0, c.upvotes - 1) } : c)));
    setFailedReactionTargets((current) => {
      if (!current.has(`comment:${commentId}`)) return current;
      const next = new Set(current);
      next.delete(`comment:${commentId}`);
      return next;
    });

    await queueReactionChange(profile.userId, 'comment', commentId, null, performReactionAction);
    if (await hasFailedReactionChange(profile.userId, 'comment', commentId)) {
      setFailedReactionTargets((current) => new Set(current).add(`comment:${commentId}`));
    }
  }, [profile, myCommentReactions, performReactionAction]);

  const handleRetryCommentReaction = useCallback(async (commentId: string) => {
    if (!profile) return;
    await retryFailedReactionChanges(profile.userId, performReactionAction);
    await refreshFailedReactionTargets(profile.userId);
  }, [profile, performReactionAction, refreshFailedReactionTargets]);

  const handleEditComment = useCallback(async (commentId: string, body: string) => {
    const previous = comments.find((c) => c.id === commentId);
    if (!previous) return;
    const nowIso = new Date().toISOString();
    setComments((current) => current.map((c) => (c.id === commentId ? { ...c, body, updated_at: nowIso } : c)));
    try {
      await updateMandaliComment({ commentId, body });
    } catch {
      setComments((current) => current.map((c) => (c.id === commentId ? previous : c)));
      Alert.alert('Could not save changes', 'Check your connection and try again.');
    }
  }, [comments]);

  const handleDeleteComment = useCallback((commentId: string) => {
    Alert.alert('Delete comment', 'This will remove your comment for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const previous = comments.find((c) => c.id === commentId);
          if (!previous) return;
          const nowIso = new Date().toISOString();
          setComments((current) => current.map((c) => (c.id === commentId ? { ...c, deleted_at: nowIso } : c)));
          deleteMandaliComment(commentId).catch(() => {
            setComments((current) => current.map((c) => (c.id === commentId ? previous : c)));
            Alert.alert('Could not delete comment', 'Check your connection and try again.');
          });
        },
      },
    ]);
  }, [comments]);

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

  const handleVotePoll = useCallback(async (pollId: string, optionId: string) => {
    try {
      const updatedPoll = await voteMandaliPoll(pollId, optionId);
      if (updatedPoll) {
        setPosts((currentPosts) =>
          currentPosts.map((p) => (p.poll?.id === pollId ? { ...p, poll: updatedPoll } : p))
        );
        setBlendedPosts((currentPosts) =>
          currentPosts.map((p) => (p.poll?.id === pollId ? { ...p, poll: updatedPoll } : p))
        );
      }
    } catch (err) {
      console.error('[MandaliScreen] voteMandaliPoll failed', err);
      throw err;
    }
  }, []);

  const handleToggleHighlightComment = useCallback(async (commentId: string, isHighlighted: boolean) => {
    try {
      const res = await highlightMandaliComment(commentId, isHighlighted ? 'guru_prasad' : null);
      setComments((current) =>
        current.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              is_highlighted: res.isHighlighted,
              highlight_label: res.highlightLabel,
            };
          }
          if (isHighlighted && c.is_highlighted && c.post_id === (current.find((item) => item.id === commentId)?.post_id)) {
            return {
              ...c,
              is_highlighted: false,
              highlight_label: null,
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('[MandaliScreen] highlightMandaliComment failed', err);
      Alert.alert('Could not update reflection', 'Check your connection and try again.');
    }
  }, []);

  // Each of these now actually awaits the write and only shows a success
  // alert once it has genuinely succeeded — lib/mandali.ts's report/block
  // functions previously swallowed errors, so these chains would show
  // "Reported"/"Blocked" even on a failed network call or DB rejection.
  const blockPostAuthor = useCallback(async (authorId: string) => {
    if (!profile) return;
    try {
      await blockUser(profile.userId, authorId);
      await loadMandali();
      Alert.alert('User Blocked', 'This user is now hidden from your view.');
    } catch {
      Alert.alert('Could not block user', 'Check your connection and try again.');
    }
  }, [loadMandali, profile]);

  const submitPostReport = useCallback(async (post: PostRow, reason: string) => {
    if (!profile) return;
    const authorName = post.profiles?.full_name ?? post.profiles?.username ?? 'Author';
    try {
      await reportMandaliPost(profile.userId, post, reason);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      Alert.alert(
        'Report Submitted',
        'Thank you — our team will review within 24 hours. This post has been hidden from your feed.',
        [
          { text: 'OK' },
          {
            text: `Block ${authorName}`,
            style: 'destructive',
            onPress: () => void blockPostAuthor(post.author_id),
          },
        ]
      );
    } catch {
      Alert.alert('Could not submit report', 'Check your connection and try again.');
    }
  }, [blockPostAuthor, profile]);

  const showPostOptions = useCallback((post: PostRow) => {
    setPostOptionsPost(post);
  }, []);

  const resetComposeState = useCallback(() => {
    setComposeBody('');
    setComposeType('update');
    setComposeEventDate('');
    setComposeEventLoc('');
    setEditingPost(null);
  }, []);

  const discardCompose = useCallback(() => {
    Keyboard.dismiss();
    setSheetVisible(false);
    resetComposeState();
  }, [resetComposeState]);

  const requestComposerClose = useCallback(() => {
    if (composerKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    discardCompose();
  }, [composerKeyboardVisible, discardCompose]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setComposerKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setComposerKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!sheetVisible) return;
    const focusTimer = setTimeout(() => composeBodyRef.current?.focus(), 220);
    return () => clearTimeout(focusTimer);
  }, [sheetVisible]);

  const composeSheetPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 72) requestComposerClose();
      },
    }),
    [requestComposerClose],
  );

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

  const showOwnPostOptions = useCallback((post: PostRow) => {
    setPostOptionsPost(post);
  }, []);

  const reportMember = useCallback((memberId: string) => {
    if (!profile) return;
    const submitMemberReport = async (reason: string) => {
      try {
        await reportMandaliMember(profile.userId, memberId, reason);
        Alert.alert(
          'Report Submitted',
          'Thank you. Our moderation team will review this within 24 hours.',
          [
            { text: 'OK' },
            {
              text: 'Block Seeker',
              style: 'destructive',
              onPress: () => void blockPostAuthor(memberId),
            },
          ]
        );
      } catch {
        Alert.alert('Could not submit report', 'Check your connection and try again.');
      }
    };

    Alert.alert(
      'Report Seeker',
      'Please tell us what is wrong. All reports are reviewed by our moderation team within 24 hours.',
      [
        {
          text: 'Spam or commercial content',
          onPress: () => void submitMemberReport('spam'),
        },
        {
          text: 'Harassment or offensive behavior',
          onPress: () => void submitMemberReport('harassment'),
        },
        {
          text: 'Inappropriate profile or impersonation',
          onPress: () => void submitMemberReport('other'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [blockPostAuthor, profile]);

  const showMemberOptions = useCallback((member: MemberRow) => {
    if (member.id === profile?.userId) return;
    Alert.alert(member.full_name ?? 'Mandali member', 'Choose an action for this member.', [
      { text: 'Report member', onPress: () => reportMember(member.id) },
      {
        text: 'Block member',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            `Block ${member.full_name ?? 'this member'}?`,
            'Their posts and comments will no longer appear in your feed.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: () => void blockPostAuthor(member.id),
              },
            ]
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [blockPostAuthor, profile?.userId, reportMember]);

  const handleReportComment = useCallback((commentId: string) => {
    if (!profile) return;
    const submitCommentReport = async (reason: string) => {
      try {
        await reportMandaliComment(profile.userId, commentId, reason);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        Alert.alert('Reported', 'Thank you — our team will review within 24 hours. This comment has been hidden from your view.');
      } catch {
        Alert.alert('Could not submit report', 'Check your connection and try again.');
      }
    };

    Alert.alert(
      'Report Comment',
      'Please tell us what is wrong with this comment. Reports are reviewed by our team within 24 hours.',
      [
        {
          text: 'Spam or commercial',
          onPress: () => void submitCommentReport('spam'),
        },
        {
          text: 'Harassment or abuse',
          onPress: () => void submitCommentReport('harassment'),
        },
        {
          text: 'Inappropriate or offensive',
          onPress: () => void submitCommentReport('other'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [profile]);

  // Members and nearby seekers were previously dead ends -- tapping either
  // did nothing (seekers had zero interactivity; members only had the
  // "..." Report action). Both open the same lightweight MemberInfoSheet,
  // normalized from their different source shapes (MemberRow vs
  // NearbySeeker); its "View full profile" action, plus the post/comment
  // author taps below, all route to app/profile/[id].tsx -- the first full
  // "view another user's profile" screen in either app.
  // Connection status is fetched fresh every time the sheet opens (not
  // cached alongside members/seekers) since it's a two-party relationship
  // that can change independently of the members/seekers lists themselves.
  const handleViewProfile = useCallback((userId: string) => {
    setSelectedMember(null);
    router.push(`/profile/${userId}`);
  }, [router]);

  const loadConnectionStatus = useCallback((otherId: string) => {
    if (!profile) return;
    setConnectionStatus('none');
    fetchConnectionStatus(profile.userId, otherId)
      .then((status) => setConnectionStatus(status))
      .catch(() => setConnectionStatus('none'));
  }, [profile]);

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
    loadConnectionStatus(member.id);
  }, [loadConnectionStatus]);

  const openSeekerInfo = useCallback((seeker: NearbySeeker) => {
    setSelectedMember({
      id: seeker.id,
      fullName: seeker.full_name,
      username: seeker.username,
      avatarUrl: seeker.avatar_url,
      city: seeker.city,
      distanceKm: null,
    });
    loadConnectionStatus(seeker.id);
  }, [loadConnectionStatus]);

  const handleConnect = useCallback(async (otherId: string) => {
    if (!profile) return;
    setConnectionBusy(true);
    try {
      await sendConnectionRequest(profile.userId, otherId);
      setConnectionStatus('pending_sent');
    } catch {
      Alert.alert('Could not send request', 'Check your connection and try again.');
    } finally {
      setConnectionBusy(false);
    }
  }, [profile]);

  const handleCancelConnection = useCallback(async (otherId: string) => {
    if (!profile) return;
    setConnectionBusy(true);
    try {
      await cancelConnectionRequest(profile.userId, otherId);
      setConnectionStatus('none');
    } catch {
      Alert.alert('Could not cancel request', 'Check your connection and try again.');
    } finally {
      setConnectionBusy(false);
    }
  }, [profile]);

  const handleRespondToConnection = useCallback(async (otherId: string, status: 'accepted' | 'rejected') => {
    if (!profile) return;
    setConnectionBusy(true);
    try {
      const { data } = await supabase
        .from('mandali_connections')
        .select('id')
        .eq('requester_id', otherId)
        .eq('recipient_id', profile.userId)
        .eq('status', 'pending')
        .maybeSingle();
      if (!data) throw new Error('Request no longer pending');
      await respondToConnectionRequest(data.id, status);
      setConnectionStatus(status === 'accepted' ? 'connected' : 'none');
      setPendingRequests((current) => current.filter((r) => r.requester_id !== otherId));
    } catch {
      Alert.alert('Could not respond to request', 'Check your connection and try again.');
    } finally {
      setConnectionBusy(false);
    }
  }, [profile]);

  // Same accept/reject action as handleRespondToConnection above, but for
  // the dedicated requests sheet -- it already has the connection row's own
  // id (no need to look it up), and doesn't touch connectionStatus/
  // connectionBusy since MemberInfoSheet isn't necessarily open here.
  const handleAcceptRequest = useCallback(async (request: ConnectionRequestRow) => {
    try {
      await respondToConnectionRequest(request.id, 'accepted');
      setPendingRequests((current) => current.filter((r) => r.id !== request.id));
    } catch {
      Alert.alert('Could not accept request', 'Check your connection and try again.');
    }
  }, []);

  const handleRejectRequest = useCallback(async (request: ConnectionRequestRow) => {
    try {
      await respondToConnectionRequest(request.id, 'rejected');
      setPendingRequests((current) => current.filter((r) => r.id !== request.id));
    } catch {
      Alert.alert('Could not decline request', 'Check your connection and try again.');
    }
  }, []);

  const submitPost = useCallback(async () => {
    if (!composeBody.trim()) return;
    setPosting(true);
    try {
      const content = composeBody.trim();
      const eventDate = composeType === 'event' && composeEventDate ? composeEventDate : null;
      const eventLocation = composeType === 'event' && composeEventLoc ? composeEventLoc : null;

      if (editingPost) {
        await updateMandaliPost({
          postId: editingPost.id,
          content,
          postType: composeType,
          eventDate,
          eventLocation,
        });
        const patch = (list: PostRow[]) =>
          list.map((p) => (p.id === editingPost.id ? { ...p, content, type: composeType, event_date: eventDate, event_location: eventLocation } : p));
        setPosts(patch);
        setBlendedPosts(patch);
      } else {
        if (!profile?.mandaliId) return;
        await createMandaliPost({
          userId: profile.userId,
          content,
          postType: composeType,
          eventDate,
          eventLocation,
        });
        resetComposeState();
        setSheetVisible(false);
        try {
          await loadMandali();
        } catch (reloadErr) {
          console.warn('[MandaliScreen] Post persisted, but background feed refresh encountered error:', reloadErr);
        }
        return;
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

  const showMandaliOptions = useCallback(() => {
    Alert.alert(profile?.mandaliName ?? 'Mandali', 'Manage your place in this sacred circle.', [
      { text: 'Leave Mandali', style: 'destructive', onPress: handleLeave },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleLeave, profile?.mandaliName]);

  const toggleComments = useCallback((postId: string) => {
    setExpandedPostId((current) => {
      const next = current === postId ? null : postId;
      // Fetch the full thread the first time a post is expanded -- until
      // now `comments` only holds this post's 2-comment preview from the
      // feed response. Fire-and-forget: the loading state is tracked via
      // loadingCommentsForPostId, not awaited here, so the expand itself
      // isn't blocked on the network.
      if (next && !fullyLoadedCommentPostIds.has(next)) {
        setLoadingCommentsForPostId(next);
        fetchPostComments(next, profile?.userId)
          .then((fullComments) => {
            setComments((currentComments) => {
              const withoutThisPost = currentComments.filter((c) => c.post_id !== next);
              return [...withoutThisPost, ...fullComments];
            });
            setFullyLoadedCommentPostIds((currentSet) => new Set(currentSet).add(next));
          })
          .catch((error) => {
            console.warn('[MandaliScreen] fetchPostComments failed', error);
          })
          .finally(() => {
            setLoadingCommentsForPostId((current) => (current === next ? null : current));
          });
      }
      return next;
    });
  }, [fullyLoadedCommentPostIds, profile?.userId]);

  useEffect(() => {
    if (expandedPostId && !fullyLoadedCommentPostIds.has(expandedPostId)) {
      setLoadingCommentsForPostId(expandedPostId);
      fetchPostComments(expandedPostId, profile?.userId)
        .then((fullComments) => {
          setComments((currentComments) => {
            const withoutThisPost = currentComments.filter((c) => c.post_id !== expandedPostId);
            return [...withoutThisPost, ...fullComments];
          });
          setFullyLoadedCommentPostIds((currentSet) => new Set(currentSet).add(expandedPostId));
        })
        .catch((error) => {
          console.warn('[MandaliScreen] fetchPostComments failed', error);
        })
        .finally(() => {
          setLoadingCommentsForPostId(null);
        });
    }
  }, [expandedPostId, fullyLoadedCommentPostIds, profile?.userId]);

  const renderPost = useCallback((post: PostRow) => {
    return (
      <MandaliPostCard
        key={post.id}
        post={post}
        userId={profile?.userId ?? null}
        comments={commentsByPost.get(post.id) ?? []}
        rsvps={rsvpsByPost.get(post.id) ?? []}
        myReaction={myReactions[post.id] ?? null}
        expanded={expandedPostId === post.id}
        loadingComments={loadingCommentsForPostId === post.id}
        postingComment={commenting === post.id}
        theme={theme}
        onRsvp={handleRsvp}
        onShowOptions={showPostOptions}
        onShowOwnOptions={showOwnPostOptions}
        onSubmitComment={submitComment}
        onToggleComments={toggleComments}
        onSelectReaction={handleSelectReaction}
        onRemoveReaction={handleRemoveReaction}
        onRetryReaction={handleRetryReaction}
        reactionFailed={failedReactionTargets.has(`post:${post.id}`)}
        onViewProfile={handleViewProfile}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        onSelectCommentReaction={handleSelectCommentReaction}
        onRemoveCommentReaction={handleRemoveCommentReaction}
        onRetryCommentReaction={handleRetryCommentReaction}
        myCommentReactions={myCommentReactions}
        failedCommentReactionIds={failedCommentReactionIds}
        onVotePoll={handleVotePoll}
        onToggleHighlightComment={handleToggleHighlightComment}
        onReportComment={handleReportComment}
      />
    );
  }, [commenting, commentsByPost, expandedPostId, failedCommentReactionIds, failedReactionTargets, handleDeleteComment, handleEditComment, handleRemoveCommentReaction, handleRemoveReaction, handleReportComment, handleRetryCommentReaction, handleRetryReaction, handleRsvp, handleSelectCommentReaction, handleSelectReaction, handleToggleHighlightComment, handleViewProfile, handleVotePoll, loadingCommentsForPostId, myCommentReactions, myReactions, profile?.userId, rsvpsByPost, showOwnPostOptions, showPostOptions, submitComment, theme, toggleComments]);

  const renderMembersCard = useCallback(() => (
    <Card tone="auto" elevated style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 10, padding: 11, borderRadius: 16 }}>
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
                style={{ minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 }}
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
    // FlashList's recycled item views don't reliably inherit a parent
    // `contentContainerStyle.gap` the way a plain flex column does --
    // spacing is applied per-item here instead, same visual result as the
    // FlatList's previous container gap: 16.
    let content: ReactNode;
    if (item.type === 'post' || item.type === 'blendedPost') {
      content = renderPost(item.post);
    } else if (item.type === 'empty') {
      content = (
        <EmptyState
          icon={activeSection === 'events' ? 'calendar' : 'message-circle'}
          title={activeSection === 'events' ? 'No events yet' : posts.length === 0 ? 'No posts yet' : 'No posts in this category'}
          subtitle={activeSection === 'events' ? 'Create an event when your Mandali plans its next gathering.' : posts.length === 0 ? 'Be the first to share something with your Mandali.' : 'Try a different filter, or clear it to see everything.'}
        />
      );
    } else if (item.type === 'blendHeader') {
      content = (
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
    } else {
      content = renderMembersCard();
    }
    return <View style={{ marginHorizontal: 8, marginBottom: 9 }}>{content}</View>;
  }, [activeSection, posts.length, renderMembersCard, renderPost, theme.dim, theme.premiumBorder]);

  const keyExtractor = useCallback((item: MandaliFeedItem) => {
    if (item.type === 'post') return `post:${item.post.id}`;
    if (item.type === 'blendedPost') return `blended:${item.post.id}`;
    return item.type;
  }, []);

  const renderFeedHeader = useCallback(() => (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.premiumBorder,
          backgroundColor: theme.card,
        }}
      >
        <BackButton variant="glass" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 21, lineHeight: 25 }}>
            {profile?.mandaliName ?? 'Mandali'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text numberOfLines={1} style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11, flexShrink: 1 }}>
              {profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : 'Your sacred circle'}
            </Text>
            {profile?.mandaliId ? (
              <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 11 }}>
                · {members.length} member{members.length === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>
        </View>
        {profile?.mandaliId ? (
          <>
            <PressableSurface
              haptic="selection"
              onPress={() => setRequestsSheetVisible(true)}
              accessibilityLabel={`Connection requests${pendingRequests.length > 0 ? ` (${pendingRequests.length} pending)` : ''}`}
              style={{ minHeight: 44, width: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="user-plus" size={17} color={theme.dim} />
              {pendingRequests.length > 0 ? (
                <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 9.5 }}>{pendingRequests.length}</Text>
                </View>
              ) : null}
            </PressableSurface>
            <PressableSurface haptic="selection" onPress={showMandaliOptions} accessibilityLabel="Mandali options" style={{ minHeight: 44, width: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="more-horizontal" size={18} color={theme.dim} />
            </PressableSurface>
          </>
        ) : null}
      </View>

      {profile?.mandaliId && activeSection !== 'people' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8, marginTop: 8 }}>
          <LinearGradient
            colors={[theme.brand, COLORS.brandGoldLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
              {getInitials(profile.displayName)}
            </Text>
          </LinearGradient>
          <PressableSurface
            haptic="selection"
            onPress={() => {
              resetComposeState();
              if (activeSection === 'events') setComposeType('event');
              setSheetVisible(true);
            }}
            style={{ flex: 1, minHeight: 44, borderRadius: 15, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, paddingHorizontal: 13, justifyContent: 'center' }}
          >
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13 }}>
              {activeSection === 'events' ? 'Create an event…' : 'Share with your Mandali…'}
            </Text>
          </PressableSurface>
          <PressableSurface
            haptic="selection"
            accessibilityLabel={activeSection === 'events' ? 'Create event' : 'Create post'}
            onPress={() => {
              resetComposeState();
              if (activeSection === 'events') setComposeType('event');
              setSheetVisible(true);
            }}
            style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="plus" size={19} color={COLORS.ink} />
          </PressableSurface>
        </View>
      ) : null}

      {profile?.mandaliId ? <FestivalQuizMandaliStat /> : null}

      {profile?.mandaliId ? (
        <View style={{ flexDirection: 'row', marginHorizontal: 8, marginTop: 6, borderBottomWidth: 1, borderBottomColor: theme.premiumBorder }}>
          {([
            ['feed', 'Feed'],
            ['events', `Events${posts.some((post) => post.type === 'event') ? ` · ${posts.filter((post) => post.type === 'event').length}` : ''}`],
            ['people', 'People'],
          ] as Array<[MandaliSection, string]>).map(([section, label]) => {
            const selected = activeSection === section;
            return (
              <PressableSurface
                key={section}
                haptic="selection"
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveSection(section)}
                style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: selected ? theme.brand : 'transparent' }}
              >
                <Text style={{ color: selected ? theme.brand : theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{label}</Text>
              </PressableSurface>
            );
          })}
        </View>
      ) : null}

      {profile?.mandaliId && activeSection === 'feed' && (posts.length > 0 || blendedPosts.length > 0) ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 7, gap: 6 }}>
          {FILTER_OPTIONS.filter((option) => option.value !== 'event').map((option) => {
            const selected = activeFilter === option.value;
            return (
              <PressableSurface
                key={option.value}
                haptic="selection"
                onPress={() => setActiveFilter(option.value)}
                hitSlop={4}
                style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, borderColor: selected ? theme.brand : theme.premiumBorder, backgroundColor: selected ? theme.brandSoft : theme.card }}
              >
                <Feather name={option.icon} size={12} color={selected ? theme.brand : theme.dim} />
                <Text style={{ color: selected ? theme.brand : theme.dim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>{option.label}</Text>
              </PressableSurface>
            );
          })}
        </ScrollView>
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
  ), [activeFilter, activeSection, blendedPosts.length, loadMandali, members.length, pendingRequests.length, posts, profile, resetComposeState, showMandaliOptions, theme]);
  const feedFooter = useMemo(() => {
    const hasCapturedLocation = profile?.latitude != null && profile.longitude != null;
    const loadMoreIndicator = loadingMore ? (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={theme.brand} />
      </View>
    ) : null;

    if (!profile?.mandaliId || activeSection !== 'people') return loadMoreIndicator;
    if (!hasCapturedLocation) return null;

    return (
      <View style={{ marginHorizontal: 8 }}>
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
      </View>
    );
  }, [activeSection, loadingMore, loadingSeekers, openSeekerInfo, profile?.latitude, profile?.longitude, profile?.mandaliId, seekers, theme]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <SacredLoader
          icon="mandali"
          title="Gathering Sacred Mandali"
          subtitle="Connecting with seekers of the shared path..."
        />
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
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      <FlashList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderFeedHeader}
        ListFooterComponent={feedFooter}
        contentContainerStyle={{ paddingBottom: insets.bottom + NAV_BAR_CLEARANCE }}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
        onEndReached={activeSection === 'people' ? undefined : loadMorePosts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} colors={[theme.brand]} />
        }
      />

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={requestComposerClose} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: COLORS.celebrationScrim }}>
          <Pressable accessibilityLabel="Dismiss post composer" onPress={requestComposerClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
            <View style={{ maxHeight: '92%', backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: theme.premiumBorder }}>
              <View {...composeSheetPanResponder.panHandlers} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: theme.premiumBorder }} />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 12, gap: 14 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="edit-3" size={16} color={theme.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 11 }}>Mandali Post</Text>
                <Text style={{ color: theme.text, ...TYPE.cardHeading, fontSize: 22, lineHeight: 27 }}>{editingPost ? 'Edit post' : 'Create post'}</Text>
              </View>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Discard post draft"
                onPress={discardCompose}
                style={{ minWidth: 68, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Discard</Text>
              </PressableSurface>
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
                      minHeight: 44,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.brand : theme.premiumBorder,
                      backgroundColor: active ? theme.brandSoft : theme.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                <Text style={{ color: active ? theme.brand : theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{type}</Text>
                  </PressableSurface>
                );
              })}
            </View>

            <TextInput
              ref={composeBodyRef}
              value={composeBody}
              onChangeText={setComposeBody}
              multiline
              returnKeyType="default"
              blurOnSubmit={false}
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
                  returnKeyType="next"
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text }}
                />
                <TextInput
                  value={composeEventDate}
                  onChangeText={setComposeEventDate}
                  placeholder="Date & time — e.g. 2026-07-12T18:00"
                  placeholderTextColor={theme.dim}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 13.5, color: theme.text }}
                />
              </>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PressableSurface haptic="selection" onPress={discardCompose} style={{ minHeight: 48, flex: 1, borderRadius: 16, borderWidth: 1, borderColor: theme.premiumBorder, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Discard</Text>
              </PressableSurface>
              <PressableSurface
                onPress={() => void submitPost()}
                disabled={posting || !composeBody.trim()}
                style={{ minHeight: 48, flex: 1, borderRadius: 16, backgroundColor: composeBody.trim() ? theme.brand : theme.premiumBorder, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                  {posting ? (editingPost ? 'Saving...' : 'Posting...') : (editingPost ? 'Save' : 'Post')}
                </Text>
              </PressableSurface>
            </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <PostOptionsSheet
        visible={postOptionsPost !== null}
        isOwnPost={postOptionsPost?.author_id === profile?.userId}
        authorName={postOptionsPost?.profiles?.full_name ?? postOptionsPost?.profiles?.username ?? 'this user'}
        onClose={() => setPostOptionsPost(null)}
        onEdit={() => {
          if (postOptionsPost) startEditPost(postOptionsPost);
        }}
        onDelete={() => {
          if (postOptionsPost) void deletePost(postOptionsPost);
        }}
        onReport={(reason) => {
          if (postOptionsPost) void submitPostReport(postOptionsPost, reason);
        }}
        onBlock={() => {
          if (postOptionsPost) void blockPostAuthor(postOptionsPost.author_id);
        }}
      />

      <MemberInfoSheet
        visible={!!selectedMember}
        subject={selectedMember}
        onClose={() => setSelectedMember(null)}
        onViewProfile={(subject) => handleViewProfile(subject.id)}
        onReport={
          selectedMember && selectedMember.id !== profile?.userId
            ? (subject) => {
                setSelectedMember(null);
                reportMember(subject.id);
              }
            : undefined
        }
        onBlock={
          selectedMember && selectedMember.id !== profile?.userId
            ? (subject) => {
                setSelectedMember(null);
                void blockPostAuthor(subject.id);
              }
            : undefined
        }
        connectionStatus={connectionStatus}
        connectionBusy={connectionBusy}
        onConnect={(subject) => void handleConnect(subject.id)}
        onCancelConnection={(subject) => void handleCancelConnection(subject.id)}
        onAcceptConnection={(subject) => void handleRespondToConnection(subject.id, 'accepted')}
        onRejectConnection={(subject) => void handleRespondToConnection(subject.id, 'rejected')}
      />

      <ConnectionRequestsSheet
        visible={requestsSheetVisible}
        requests={pendingRequests}
        onClose={() => setRequestsSheetVisible(false)}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
      />
    </Screen>
  );
}
