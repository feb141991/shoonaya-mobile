import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { fetchPublicMandaliFeed } from '@/lib/mandaliPublicFeed';
import type { PublicMandaliPost } from '@/lib/mandaliPublicFeedContract';
import { ApiRequestError, describeFailure } from '@/lib/user-facing-error';

/** What a guest may do on Mandali: read. Everything below that touches an account asks them to sign in instead. */
export type GuestAction = 'react' | 'comment' | 'share' | 'more' | 'author';

export const GUEST_ACTION_COPY: Record<GuestAction, string> = {
  react: 'Sign in to react to posts.',
  comment: 'Sign in to read comments and join the conversation.',
  share: 'Sign in to share with your Mandali.',
  more: 'Sign in to report or hide posts.',
  author: 'Sign in to view seekers and connect with them.',
};

const TYPE_LABEL: Record<string, string> = { update: 'Update', question: 'Question', announcement: 'Announcement', event: 'Event' };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Theme = ReturnType<typeof themeColor>;

const GuestPostCard = memo(function GuestPostCard({ post, theme, onAction }: { post: PublicMandaliPost; theme: Theme; onAction: (action: GuestAction) => void }) {
  const eventLabel = post.eventDate
    ? new Date(post.eventDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
  const action = (kind: GuestAction, label: string, icon: keyof typeof Feather.glyphMap, count?: number) => (
    <PressableSurface
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${GUEST_ACTION_COPY[kind]}`}
      onPress={() => onAction(kind)}
      style={{ minHeight: MIN_TOUCH_TARGET, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 }}
    >
      <Feather name={icon} size={16} color={theme.dim} />
      {typeof count === 'number' ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{count}</Text> : null}
    </PressableSurface>
  );

  return (
    <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 8, padding: 11, borderRadius: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <PressableSurface
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`${post.author.name}. ${GUEST_ACTION_COPY.author}`}
          onPress={() => onAction('author')}
          style={{ minHeight: 0 }}
        >
          {post.author.avatarUrl ? (
            <Image source={{ uri: post.author.avatarUrl }} style={{ width: 30, height: 30, borderRadius: 15 }} contentFit="cover" />
          ) : (
            <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brand }}>
              <Text style={{ color: COLORS.creamBg, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>{initials(post.author.name)}</Text>
            </View>
          )}
        </PressableSurface>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{post.author.name}</Text>
          <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.dim }}>
            {[post.mandali?.name, formatRelativeTime(post.createdAt)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={{ borderRadius: 999, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.brandSoft, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ ...TYPE.chip, color: theme.brand }}>{post.author.isOfficial ? 'Official' : (TYPE_LABEL[post.type] ?? 'Update')}</Text>
        </View>
      </View>

      <Text style={{ color: theme.text, fontFamily: FONTS.sans, fontSize: 13.5, lineHeight: 20 }}>{post.content}</Text>

      {eventLabel || post.eventLocation ? (
        <View style={{ gap: 4 }}>
          {eventLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="calendar" size={13} color={theme.brand} />
              <Text style={{ flex: 1, ...TYPE.caption, color: theme.text }}>{eventLabel}</Text>
            </View>
          ) : null}
          {post.eventLocation ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="map-pin" size={13} color={theme.brand} />
              <Text style={{ flex: 1, ...TYPE.caption, color: theme.dim }}>{post.eventLocation}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {action('react', 'React', 'heart', post.reactionCount)}
          {action('comment', 'Comments', 'message-circle', post.commentCount)}
        </View>
        {action('more', 'More options', 'more-horizontal')}
      </View>
    </Card>
  );
});

/**
 * The read-only Mandali for a signed-out person. Pull to refresh and scrolling work; reacting, commenting, sharing, opening a profile or the
 * post menu show a sign-in prompt over the screen, where the person tapped. The feed is never stored on the device and carries no account id.
 */
export function GuestMandaliFeed({ onSignIn }: { onSignIn: () => void }) {
  const theme = themeColor(useColorScheme() === 'dark');
  const [posts, setPosts] = useState<PublicMandaliPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedUnavailable, setFeedUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<GuestAction | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    const request = ++requestRef.current;
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    try {
      const page = await fetchPublicMandaliFeed(null);
      if (request !== requestRef.current) return;
      setPosts(page.posts);
      setNextCursor(page.nextCursor);
      setFeedUnavailable(false);
      setError(null);
    } catch (failure) {
      if (request !== requestRef.current) return;
      if (failure instanceof ApiRequestError && failure.status === 404) {
        setPosts([]);
        setNextCursor(null);
        setFeedUnavailable(true);
        setError(null);
      } else {
        setError(describeFailure(failure, 'Mandali could not be loaded right now. Please try again.'));
      }
    } finally {
      if (request === requestRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { void load('initial'); }, [load]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || loading || refreshing) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const page = await fetchPublicMandaliFeed(nextCursor);
      if (request !== requestRef.current) return;
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...page.posts.filter((post) => !seen.has(post.id))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      // Keep what is shown; the next scroll to the end tries again.
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextCursor, refreshing]);

  if (loading && posts.length === 0) {
    return <Screen style={{ backgroundColor: theme.bg }}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.brand} /></View></Screen>;
  }
  if (feedUnavailable) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
          <EmptyState
            icon="users"
            title="Join Mandali"
            subtitle="Sign in to join Mandali, share posts, and connect with other seekers."
            ctaLabel="Sign In"
            onCta={onSignIn}
          />
        </View>
      </Screen>
    );
  }
  if (error && posts.length === 0) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
          <EmptyState icon="cloud-off" title="Mandali is temporarily unavailable" subtitle={error} ctaLabel={refreshing ? 'Retrying…' : 'Retry'} onCta={() => { if (!refreshing) void load('refresh'); }} />
        </View>
      </Screen>
    );
  }

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <Text style={{ ...TYPE.title, color: theme.text }}>Mandali</Text>
      <Card tone="auto" style={{ backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder, padding: 12, borderRadius: 16, gap: 8 }}>
        <Text style={{ ...TYPE.body, color: theme.text }}>
          You are reading Mandali as a guest. Sign in to react, comment, share and join your city’s Mandali.
        </Text>
        <PressableSurface
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={onSignIn}
          style={{ minHeight: MIN_TOUCH_TARGET, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, backgroundColor: theme.brand }}
        >
          <Text style={{ ...TYPE.label, color: COLORS.creamBg }}>Sign in</Text>
        </PressableSurface>
      </Card>
      {error ? <Text style={{ ...TYPE.caption, color: theme.dim }}>{error}</Text> : null}
    </View>
  );

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0 }}>
      <Modal transparent visible={prompt !== null} animationType="fade" onRequestClose={() => setPrompt(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.bottomSheetScrim }}>
          <Pressable accessibilityLabel="Close" onPress={() => setPrompt(null)} style={StyleSheet.absoluteFill} />
          <View
            accessibilityViewIsModal
            style={{ backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: theme.border, padding: 20, paddingBottom: 32, gap: 14 }}
          >
            <Text style={{ ...TYPE.cardHeading, color: theme.text }}>Sign in to continue</Text>
            <Text accessibilityLiveRegion="polite" style={{ ...TYPE.body, color: theme.dim }}>
              {prompt ? GUEST_ACTION_COPY[prompt] : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PressableSurface
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel="Not now"
                onPress={() => setPrompt(null)}
                style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ ...TYPE.label, color: theme.text }}>Not now</Text>
              </PressableSurface>
              <PressableSurface
                haptic="selection"
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                onPress={() => { setPrompt(null); onSignIn(); }}
                style={{ flex: 1, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: theme.brand }}
              >
                <Text style={{ ...TYPE.label, color: COLORS.creamBg }}>Sign in</Text>
              </PressableSurface>
            </View>
          </View>
        </View>
      </Modal>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <GuestPostCard post={item} theme={theme} onAction={setPrompt} />}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="users" title="No posts yet" subtitle="Posts from seekers will appear here." />}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.brand} style={{ paddingVertical: 16 }} /> : null}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}
        onEndReached={() => { void loadMore(); }}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void load('refresh'); }} tintColor={theme.brand} />}
      />
    </Screen>
  );
}
