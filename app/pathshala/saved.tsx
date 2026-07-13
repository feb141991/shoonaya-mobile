import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';

// Native port of PWA's /pathshala/saved (SavedVersesClient.tsx). Reads the
// new GET /api/pathshala/bookmark route, which resolves the same
// pathshala_user_state rows the PWA reads through the same
// getBookmarkedStudySummaries() resolver — so a verse bookmarked on the web
// shows up here too.
//
// Native has no equivalent of PWA's library "CanonicalReader" screen yet
// (the only entry point that can *create* a bookmark today), so rows here
// are read-only for now — there's nowhere in the native app to route a tap
// to. This still has real value as a synced view of what's already been
// bookmarked from the web app; the empty/loaded states say so explicitly
// rather than implying a broken tap target.

type SavedVerse = {
  entryId: string;
  title: string;
  source: string;
  tradition: string;
  sectionId: string;
  sectionTitle: string;
  href: string;
  lastOpenedAt: string;
  bookmarkedAt: string | null;
};

type Status = 'loading' | 'ready' | 'error';

function formatSavedDate(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function SavedVersesScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState<SavedVerse[]>([]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setStatus('loading');

    try {
      const response = await apiFetch('/api/pathshala/bookmark');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = (await response.json()) as { saved?: SavedVerse[] };
      setSaved(payload.saved ?? []);
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen style={{ backgroundColor: bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <BackButton showLabel={false} iconSize={22} iconColor={text} onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...TYPE.screenTitle, color: text }}>Saved Verses</Text>
          <Text style={{ ...TYPE.caption, color: dim }}>Bookmarked from your study</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 28, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void load(true); }} tintColor={brand} />}
      >
        {status === 'loading' ? (
          <View style={{ gap: 12 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : status === 'error' ? (
          <EmptyState
            icon="alert-circle"
            title="Couldn't load your saved verses"
            subtitle="Check your connection and try again."
            ctaLabel="Retry"
            onCta={() => { void load(); }}
          />
        ) : saved.length === 0 ? (
          <EmptyState
            icon="bookmark"
            title="No saved verses yet"
            subtitle="Bookmark a verse while reading in the Shoonaya web app and it will appear here."
          />
        ) : (
          <>
            <Text style={{ ...TYPE.caption, color: dim, paddingHorizontal: 2 }}>
              Synced from your bookmarks on the web app.
            </Text>
            {saved.map((verse) => (
              <View
                key={verse.entryId}
                style={{
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: border,
                  padding: 16,
                  gap: 6,
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="bookmark" size={13} color={brand} />
                  <Text style={{ ...TYPE.chip, letterSpacing: 1, textTransform: 'uppercase', color: brand }} numberOfLines={1}>
                    {verse.sectionTitle || verse.source}
                  </Text>
                </View>
                <Text style={{ ...TYPE.cardHeading, color: text }} numberOfLines={2}>
                  {verse.title}
                </Text>
                {verse.bookmarkedAt ? (
                  <Text style={{ ...TYPE.micro, color: dim }}>
                    Saved {formatSavedDate(verse.bookmarkedAt)}
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
