import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import YoutubeIframe, { PLAYER_STATES, type YoutubeIframeRef } from 'react-native-youtube-iframe';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BackButton } from '@/components/ui/BackButton';
import { MotionView } from '@/components/ui/Motion';
import { Pill } from '@/components/ui/Pill';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE } from '@/lib/constants';
import {
  fetchLiveDarshanStreams,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
  type LiveStream,
} from '@/lib/live-darshan';

// Native Live Darshan — now with an in-app player (react-native-youtube-iframe,
// backed by react-native-webview).
//
// This reverses an earlier, deliberate decision documented in this file's
// prior revision: no WebView dependency existed anywhere in this repo, and
// hand-off to the YouTube app/browser via Linking.openURL avoided taking on
// a heavier native dependency for a first slice. That reasoning still holds
// as a *tradeoff*, not a correctness argument — it was a "not yet", not a
// "never". Explicit product ask to bring playback in-app now accepts that
// tradeoff. react-native-youtube-iframe is the well-maintained, widely-used
// wrapper around YouTube's own iframe API (not raw video-file extraction,
// which would violate YouTube's ToS and break constantly) — it renders
// YouTube's own player inside a WebView and exposes play/pause/seek via a
// JS bridge, which is what makes ±20s skip and custom transport controls
// possible at all.
//
// Individual streams can still go offline/get deleted/change privacy — the
// server-side stability filtering (GET /api/native/live-darshan, mirroring
// web's resolveActiveLiveStreams()) is unchanged and still the first line
// of defense. A "playerError" fallback below hands off to the YouTube app
// for the rare stream the embed itself can't play (e.g. embedding disabled
// by the channel owner).

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
  const isDark = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const brandSoft = isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight;

  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [filter, setFilter] = useState<TraditionFilter>('all');
  const [openError, setOpenError] = useState<{ id: string; message: string } | null>(null);

  const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
  const [playing, setPlaying] = useState(true);
  const [playerError, setPlayerError] = useState(false);
  const playerRef = useRef<YoutubeIframeRef>(null);

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

  const openExternally = useCallback(async (stream: LiveStream) => {
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

  const openStream = useCallback((stream: LiveStream) => {
    setPlayerError(false);
    setPlaying(true);
    setActiveStream(stream);
  }, []);

  const closePlayer = useCallback(() => {
    setActiveStream(null);
    setPlaying(false);
  }, []);

  // "Smart suggestions" — other streams, same tradition as the one playing
  // first (most relevant), then everything else, capped at 5. Reuses the
  // exact same server-filtered list already fetched for the grid, no extra
  // request.
  const suggestions = useMemo(() => {
    if (!activeStream) return [];
    const others = streams.filter((s) => s.id !== activeStream.id);
    const sameTradition = others.filter((s) => s.tradition === activeStream.tradition);
    const rest = others.filter((s) => s.tradition !== activeStream.tradition);
    return [...sameTradition, ...rest].slice(0, 5);
  }, [activeStream, streams]);

  const goToNext = useCallback(() => {
    if (!activeStream) return;
    const list = filtered.length > 0 ? filtered : streams;
    const idx = list.findIndex((s) => s.id === activeStream.id);
    const next = idx >= 0 ? list[(idx + 1) % list.length] : list[0];
    if (next) openStream(next);
  }, [activeStream, filtered, streams, openStream]);

  const skip = useCallback(async (deltaSeconds: number) => {
    if (!playerRef.current) return;
    try {
      const current = await playerRef.current.getCurrentTime();
      playerRef.current.seekTo(Math.max(0, current + deltaSeconds), true);
    } catch {
      // Some live streams don't allow seeking outside YouTube's own DVR
      // window — a no-op here is the correct, graceful outcome, not an error.
    }
  }, []);

  if (activeStream) {
    const playerHeight = Math.round((width * 9) / 16);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <View style={{ width: '100%', height: playerHeight, backgroundColor: '#000', position: 'relative' }}>
            <YoutubeIframe
              ref={playerRef}
              height={playerHeight}
              width={width}
              play={playing}
              videoId={activeStream.youtubeVideoId}
              initialPlayerParams={{ rel: false }}
              onChangeState={(state: PLAYER_STATES) => {
                if (state === PLAYER_STATES.PLAYING) setPlaying(true);
                if (state === PLAYER_STATES.PAUSED) setPlaying(false);
              }}
              onError={() => setPlayerError(true)}
            />
            <View style={{ position: 'absolute', top: 14, left: 14 }}>
              <BackButton variant="glass" onPress={closePlayer} />
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 20 }}>
            <View style={{ gap: 4 }}>
              {activeStream.isHealthy !== false ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(220,38,38,0.12)', marginBottom: 2 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#DC2626' }} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 9, color: '#DC2626', letterSpacing: 0.6, textTransform: 'uppercase' }}>Live</Text>
                </View>
              ) : null}
              <Text style={{ ...TYPE.cardHeading, fontSize: 19, color: text }} numberOfLines={2}>
                {activeStream.title}
              </Text>
              <Text style={{ ...TYPE.caption, color: dim }} numberOfLines={1}>
                {activeStream.location} · {activeStream.schedule}
              </Text>
            </View>

            {playerError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 12 }}>
                <Feather name="alert-circle" size={16} color={dim} />
                <Text style={{ flex: 1, ...TYPE.caption, color: dim }}>
                  This stream can&apos;t play in-app.
                </Text>
                <PressableSurface
                  haptic="selection"
                  accessibilityLabel="Open in YouTube instead"
                  onPress={() => void openExternally(activeStream)}
                  style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                >
                  <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Open in YouTube</Text>
                </PressableSurface>
              </View>
            ) : null}

            {/* Transport controls — rewind/forward 20s + play/pause, gold-led
                to match the app's own accent language rather than YouTube's
                red/white chrome. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Rewind 20 seconds"
                onPress={() => void skip(-20)}
                style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: brandSoft }}
              >
                <Feather name="rotate-ccw" size={20} color={brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 8, color: brand, marginTop: -2 }}>20</Text>
              </PressableSurface>

              <PressableSurface
                haptic="selection"
                accessibilityLabel={playing ? 'Pause' : 'Play'}
                onPress={() => setPlaying((p) => !p)}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: brand,
                  boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
                }}
              >
                <Feather name={playing ? 'pause' : 'play'} size={26} color={isDark ? COLORS.darkBg : COLORS.creamBg} />
              </PressableSurface>

              <PressableSurface
                haptic="selection"
                accessibilityLabel="Forward 20 seconds"
                onPress={() => void skip(20)}
                style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: brandSoft }}
              >
                <Feather name="rotate-cw" size={20} color={brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 8, color: brand, marginTop: -2 }}>20</Text>
              </PressableSurface>
            </View>

            <PressableSurface
              haptic="selection"
              accessibilityLabel="Next darshan"
              onPress={goToNext}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: MIN_TOUCH_TARGET,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: `${brand}47`,
                backgroundColor: brandSoft,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: brand }}>Next Darshan</Text>
              <Feather name="skip-forward" size={16} color={brand} />
            </PressableSurface>

            {suggestions.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Text style={{ ...TYPE.section, color: brand }}>More Live Darshan</Text>
                <View style={{ gap: 10 }}>
                  {suggestions.map((s, index) => (
                    <MotionView key={s.id} animationKey={`suggest-${s.id}`} delay={80 + index * 60} distance={8}>
                      <PressableSurface
                        haptic="selection"
                        accessibilityLabel={`Watch ${s.title}`}
                        onPress={() => openStream(s)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: `${brand}33`,
                          backgroundColor: cardBg,
                          padding: 10,
                        }}
                      >
                        <Image
                          source={{ uri: youtubeThumbnailUrl(s.youtubeVideoId) }}
                          style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: border }}
                          contentFit="cover"
                          accessibilityIgnoresInvertColors
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13.5, color: text }} numberOfLines={1}>
                            {s.title}
                          </Text>
                          <Text style={{ ...TYPE.caption, color: dim }} numberOfLines={1}>
                            {s.location}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={17} color={brand} />
                      </PressableSurface>
                    </MotionView>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 36, gap: 16 }}>
        <BackButton variant="glass" />

        <View>
          <Text style={{ ...TYPE.screenTitle, color: text }}>Live Darshan</Text>
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
            {filtered.map((stream, index) => (
              <MotionView key={stream.id} animationKey={`${filter}-${stream.id}`} delay={Math.min(index, 5) * 32} distance={6} style={{ gap: 6 }}>
                <PressableSurface
                  accessibilityRole="button"
                  accessibilityLabel={`Watch ${stream.title}. ${stream.location}. ${stream.schedule}.`}
                  onPress={() => openStream(stream)}
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
                        backgroundColor: brand,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="play" size={16} color={COLORS.onMediaWhite} />
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
                </PressableSurface>

                {openError?.id === stream.id ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                    <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                      {openError.message}
                    </Text>
                    <PressableSurface
                      accessibilityRole="button"
                      accessibilityLabel={`Retry opening ${stream.title}`}
                      onPress={() => void openExternally(stream)}
                      style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                    >
                      <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                        Retry
                      </Text>
                    </PressableSurface>
                  </View>
                ) : null}
              </MotionView>
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
