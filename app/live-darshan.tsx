import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Pill } from '@/components/ui/Pill';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';
import {
  fetchLiveDarshanStreams,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
  type LiveStream,
} from '@/lib/live-darshan';

// Native Live Darshan — launch-safe first slice.
//
// Deliberately NOT an embedded player: no WebView or YouTube-iframe
// dependency exists anywhere in this repo today (confirmed via package.json
// — react-native-webview is not installed), and PWA's own embedded iframe
// player needs a whole cron-based health-check pipeline
// (/api/cron/check-live-darshans, health_status tracking, failure_count,
// auto-deactivation) specifically because individual live streams go
// offline, get deleted, or change privacy status regularly. That is real,
// concrete evidence against treating any single embed as stable enough to
// hard-wire into a first native slice. Introducing a WebView here — a new,
// heavier native dependency with known crash/memory-leak history on some
// Android devices — is not "deliberately justified" against that evidence.
//
// Instead: a curated list (server-resolved via /api/native/live-darshan,
// which reuses web's own resolveActiveLiveStreams() stability boundary —
// see that route's header comment) with a "Watch on YouTube" action per
// stream that hands off to the YouTube app/browser via Linking.openURL.
// This means: no autoplay of any kind inside this app (there is no player
// here to autoplay), no copyrighted content rendered inside our own bundle,
// and stream playback itself is entirely YouTube's own, already-hardened
// responsibility — not ours to keep stable.

type TraditionFilter = 'all' | 'hindu' | 'sikh' | 'jain' | 'buddhist';

const TRADITION_FILTERS: Array<{ key: TraditionFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'hindu', label: 'Hindu' },
  { key: 'sikh', label: 'Sikh' },
  { key: 'jain', label: 'Jain' },
  { key: 'buddhist', label: 'Buddhist' },
];

type ScreenStatus = 'loading' | 'ready' | 'error';

function LiveDarshanContent() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [filter, setFilter] = useState<TraditionFilter>('all');
  const [openError, setOpenError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setOpenError(null);
    try {
      const result = await fetchLiveDarshanStreams();
      setStreams(result);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? streams : streams.filter((s) => s.tradition === filter)),
    [streams, filter]
  );

  const openStream = useCallback(async (stream: LiveStream) => {
    setOpenError(null);
    const url = youtubeWatchUrl(stream.youtubeVideoId);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error('No app available to open this link');
      }
      await Linking.openURL(url);
    } catch {
      setOpenError({ id: stream.id, message: 'Could not open YouTube — check your connection and try again.' });
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 36, gap: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Feather name="chevron-left" size={16} color={dim} />
          <Text style={{ color: dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <View>
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>Live Darshan</Text>
          <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 14, color: dim }}>
            Watch from sacred places, live on YouTube
          </Text>
        </View>

        {status === 'ready' && streams.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TRADITION_FILTERS.map(({ key, label }) => (
              <Pill key={key} label={label} selected={filter === key} onPress={() => setFilter(key)} />
            ))}
          </ScrollView>
        ) : null}

        {status === 'loading' ? (
          <View style={{ gap: 10 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : status === 'error' ? (
          <EmptyState
            icon="wifi-off"
            title="Couldn't load Live Darshan"
            subtitle="Check your connection and try again."
            ctaLabel="Retry"
            onCta={() => void load()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="radio"
            title={streams.length === 0 ? 'No live darshans available right now' : 'No streams for this filter'}
            subtitle={
              streams.length === 0
                ? 'Please check back later.'
                : 'Try a different tradition, or view all.'
            }
            ctaLabel={streams.length > 0 && filter !== 'all' ? 'Show all' : undefined}
            onCta={streams.length > 0 && filter !== 'all' ? () => setFilter('all') : undefined}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {filtered.map((stream) => (
              <View key={stream.id} style={{ gap: 6 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Watch ${stream.title} on YouTube. ${stream.location}. ${stream.schedule}.`}
                  onPress={() => void openStream(stream)}
                  style={{
                    borderRadius: 20,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: border,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: border }}>
                    <Image
                      source={{ uri: youtubeThumbnailUrl(stream.youtubeVideoId) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      accessibilityIgnoresInvertColors
                    />
                    {stream.isHealthy !== false ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: 'rgba(220,38,38,0.85)',
                        }}
                      >
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.onMediaWhite }} />
                        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9, color: COLORS.onMediaWhite, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                          Live
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        right: 10,
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="youtube" size={16} color={COLORS.onMediaWhite} />
                    </View>
                  </View>

                  <View style={{ padding: 14, gap: 4 }}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }} numberOfLines={1}>
                      {stream.title}
                    </Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }} numberOfLines={1}>
                      {stream.location} · {stream.schedule}
                    </Text>
                  </View>
                </Pressable>

                {openError?.id === stream.id ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                    <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                      {openError.message}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Retry opening ${stream.title}`}
                      onPress={() => void openStream(stream)}
                      style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                    >
                      <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        Retry
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function LiveDarshanScreen() {
  return (
    <ErrorBoundary>
      <LiveDarshanContent />
    </ErrorBoundary>
  );
}
