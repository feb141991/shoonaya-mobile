import type { ObservanceSeries } from '@/lib/observance-series-contract.generated';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculatePanchang } from '@sangam/panchang-engine';
import { findMoodConfig } from '@/lib/mood-registry';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { IconTile } from '@/components/ui/IconTile';
import { MoodGlyph } from '@/components/mood/MoodGlyph';
import { HomeSkeleton } from '@/components/home/HomeSkeleton';
import { QuizSparkCard } from '@/components/home/QuizSparkCard';
import { BrahmaMuhurtaPrompt } from '@/components/home/BrahmaMuhurtaPrompt';
import { FirstWeekGuide } from '@/components/home/FirstWeekGuide';
import { SacredDaysCard } from '@/components/home/SacredDaysCard';
import { FestivalStoryStack } from '@/components/home/FestivalStoryStack';
import type { HomeObservanceStoryCard } from '@/lib/observance-story-contract.generated';
import { SankalpaCard } from '@/components/home/SankalpaCard';
import { MoodPulseSheet } from '@/components/home/MoodPulseSheet';
import { DharmaMitraChatSheet } from '@/components/home/DharmaMitraChatSheet';
import { FloatingDharmaScroll } from '@/components/home/FloatingDharmaScroll';
import { GreetingPicker } from '@/components/home/GreetingPicker';
import { HeroBackdropPicker } from '@/components/home/HeroBackdropPicker';
import { useReducedMotion } from '@/components/ui/Motion';
import { apiFetch } from '@/lib/api';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, TRADITION_ACCENT, TYPE } from '@/lib/constants';
import { getGreetingPick } from '@/lib/greetingPreference';
import { getTimeGreeting, getTraditionGreeting } from '@/lib/greetings';
import { getMyUnreadNotificationCount, subscribeToMyNotifications } from '@/lib/notificationsData';
import { HERO_MIN_HEIGHT, NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import { navScrollHandler } from '@/lib/navScrollBus';
import { resolveNativeRoute } from '@/lib/routes';
import { useScrollToTop } from '@/lib/useScrollToTop';
import { isGuestMode } from '@/lib/guestSession';
import { clearHomeCache, readHomeCache, writeHomeCache, type CachedHomeRenderModel, type CacheIdentity } from '@/lib/homeCache';
import {
  HomeSummaryCoordinator,
  resolveHomeIdentity,
  getIdentityKey,
  type HomeAuthIdentity,
} from '@/lib/homeCoordinator';
import { safeTimezone, spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';
import { getHeroPick, getHeroSize, HERO_SIZE_CONFIG, LOCAL_HERO_ASSETS, type HeroPick, type HeroSize } from '@/lib/heroPreference';
import { getMoodPulseDismissedDate, getMoodSpiritualDate } from '@/lib/moodPulsePreference';
import { isRashiphalNudgeDismissed, setRashiphalNudgeDismissed } from '@/lib/rashiphalPreference';
import { AuthGate } from '@/components/ui/AuthGate';

type PracticeId = 'japa' | 'nitya' | 'pathshala' | 'quiz' | 'dharmveer';

// /api/native/home-summary currently sends Nitya Karma and Pathshala with
// the same success green, so the two rows read as indistinguishable in
// "View all practices" — PWA's own NextPracticeCard ITEM_PALETTE (the
// source of truth this list should match) gives every practice a distinct
// colour. Overriding client-side here rather than in the API route, since
// this is the one place in the app that renders per-practice colour.
const PRACTICE_COLOR: Record<PracticeId, string> = {
  japa: COLORS.brandGoldLight,
  nitya: COLORS.tileGold,
  pathshala: COLORS.tileGreen,
  quiz: COLORS.tilePurple,
  dharmveer: COLORS.tileCoral,
};

// "View all practices" row glyphs — plain emoji on a white/cream well,
// matching the reference screenshot (no colour-tinted icon background).
const PRACTICE_EMOJI: Record<PracticeId, string> = {
  japa: '📿',
  nitya: '🌅',
  pathshala: '📖',
  quiz: '🧠',
  dharmveer: '⚔️',
};

type PracticeRow = {
  id: PracticeId;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  href: string;
  done: boolean;
  progress: number;
  color: string;
  streak?: number;
};

type ObservanceEntry = {
  name: string;
  emoji: string | null;
  daysLeft: number;
  routeKind: string;
  routeSlug: string;
  href: string;
  label: string;
  monthLabel?: string | null;
  description?: string | null;
};

type HomeMenuTileItem = {
  label: string;
  href: string;
  sacredId: SacredIconName | null;
  fallbackGlyph: keyof typeof Feather.glyphMap;
  accent: string;
};

type HomeMenuTheme = {
  glass: string;
  premiumBorder: string;
  text: string;
};

// No card, no per-icon well background — every tile is just the icon art
// and label, sized identically (see the single `size={35}` below) regardless
// of whether the icon is a full-art clay render or a plain Feather glyph.
// Every row is a single non-wrapping line of equal-width (`flex: 1`) tiles —
// tight gap, compact padding — so 3 or 4 icons per row sit close together
// instead of being stretched across a 2-column grid with dead space.
function HomeMenuTile({
  item,
  theme,
  onPress,
}: {
  item: HomeMenuTileItem;
  theme: HomeMenuTheme;
  onPress: () => void;
}) {
  return (
    <PressableSurface
      accessibilityLabel={item.label}
      onPress={onPress}
      pressedStyle={{ transform: [{ scale: 0.96 }] }}
      style={{
        flex: 1,
        minHeight: 96,
        paddingVertical: 8,
        paddingHorizontal: 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{ width: 70, height: 70, marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {item.sacredId ? (
          <SacredIcon name={item.sacredId} fallbackGlyph={item.fallbackGlyph} size={35} color={item.accent} />
        ) : (
          <Feather name={item.fallbackGlyph} size={35} color={item.accent} />
        )}
      </View>
      <Text
        style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: theme.text, textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {item.label}
      </Text>
    </PressableSurface>
  );
}

type HomeSummary = {
  profile: {
    name: string;
    firstName: string;
    tradition: string;
    appLanguage: 'en' | 'hi' | 'pa';
    city: string;
    country: string;
    karmaPoints: number;
    relicImageUrl: string | null;
    avatarUrl: string | null;
  };
  hero: {
    imageUrl: string;
    alt: string;
    objectPosition: string;
    label: string;
  };
  date: {
    iso: string;
    timezone: string;
    latitude: number;
    longitude: number;
  };
  sacredText: {
    label: string;
    icon: string;
    original: string;
    transliteration: string;
    meaning: string;
    source: string;
    accentColour: string;
    accentLight: string;
  };
  panchang: {
    href: string;
    tithiLabel: string;
    festivalLabel: string | null;
    vratLabel: string | null;
    viewedToday: boolean;
    observance: ObservanceEntry | null;
    // Remaining upcoming observances (next Ekadashi, next Amavasya, next
    // festival...) from the same fetch window as `observance`, so the hero
    // pill can rotate through genuinely different items instead of just
    // re-labeling the same nearest one.
    upcomingObservances: ObservanceEntry[];
    series?: ObservanceSeries[];
    storyCards?: HomeObservanceStoryCard[];
  };
  nextPractice: {
    id: PracticeId;
    contextLabel: string;
    title: string;
    suggestion: string;
    nudge: string;
    actionLabel: string;
    actionHref: string;
    progress: number;
  };
  practices: PracticeRow[];
  sankalpa: {
    id: string;
    text: string;
    startDate: string;
    endDate: string;
    targetDays: number;
    day: number;
    progress: number;
    tradition: string;
    relatedPractice: string | null;
  } | null;
  dharmVeer: {
    id: string;
    name: string;
    tagline: string;
    href: string;
  };
  // New user signal for FirstWeekGuide — mirrors the PWA's own
  // showFirstTimeGuidance formula (no shloka streak, no last-shloka-read
  // date, no guided-path progress), added to /api/native/home-summary
  // rather than re-derived from a second, native-only heuristic.
  firstWeek: boolean;
};

// The subset of lib/mood.ts's MoodStatus that Home's own "Feeling X" pill
// actually reads (hasLoggedMoodToday/lastMood) -- Home never needed the
// full check-in shape (openSession, hasDismissedToday, ...), only mood.tsx
// does, so this stays local rather than importing the wider type.
type HomeLiveMoodStatus = {
  hasLoggedMoodToday: boolean;
  lastMood: string | null;
};

type HomeLiveResponse = {
  unreadNotifications?: number;
  moodStatus?: HomeLiveMoodStatus;
};

// Batches the bell badge count and mood check-in status into one round
// trip via /api/native/home-live instead of two independent fetches (one
// hitting Supabase directly for the count, one hitting /api/mood/checkin) --
// both get polled on every Home focus and after pull-to-refresh, so there's
// no reason for them to be separate requests. Best-effort: a failed fetch
// just means the badge/pill don't update this round, matching the
// individual calls' own best-effort behavior.
async function fetchHomeLive(): Promise<HomeLiveResponse> {
  try {
    const response = await apiFetch('/api/native/home-live?fields=unreadNotifications,moodStatus');
    if (!response.ok) return {};
    return (await response.json()) as HomeLiveResponse;
  } catch {
    return {};
  }
}

const INITIAL_STATE: HomeSummary = {
  profile: {
    name: 'Seeker',
    firstName: 'Seeker',
    tradition: 'hindu',
    appLanguage: 'en',
    city: '',
    country: '',
    karmaPoints: 0,
    relicImageUrl: null,
    avatarUrl: null,
  },
  hero: {
    imageUrl: '/assets/images/heroes/all/default.webp',
    alt: 'Shoonaya devotional artwork',
    objectPosition: 'center 25%',
    label: 'Global default',
  },
  date: {
    iso: new Date().toISOString().slice(0, 10),
    timezone: 'Asia/Kolkata',
    latitude: 23.1765,
    longitude: 75.7885,
  },
  sacredText: {
    label: "Today's Verse",
    icon: '📖',
    original: 'वसुधैव कुटुम्बकम्',
    transliteration: 'Vasudhaiva Kutumbakam',
    meaning: 'The whole world is one family, a reminder to act with kinship and dignity.',
    source: 'Maha Upanishad',
    accentColour: COLORS.brandGoldLight,
    accentLight: COLORS.authGoldWellBg,
  },
  panchang: {
    href: '/panchang',
    tithiLabel: 'Today’s Panchang',
    festivalLabel: null,
    vratLabel: null,
    viewedToday: false,
    observance: null,
    upcomingObservances: [],
    series: [],
  },
  nextPractice: {
    id: 'pathshala',
    contextLabel: 'Next Practice',
    title: 'Pathshala',
    suggestion: 'Continue your practice to quiet the mind.',
    nudge: 'Consistency builds the strongest foundation.',
    actionLabel: 'Go to Pathshala',
    actionHref: '/pathshala',
    progress: 0,
  },
  practices: [],
  sankalpa: null,
  dharmVeer: {
    id: '',
    name: 'Dharm Veer',
    tagline: 'Remember a life of courage',
    href: '/dharm-veer',
  },
  firstWeek: false,
};


function resolveAssetUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

// The backend/PWA share a CSS-style `"58% 25%"` (horizontal% vertical%)
// object-position string per hero theme; expo-image's contentPosition
// prop wants `{ left, top }` instead.
function parseObjectPosition(value: string | null | undefined): { left: string; top: string } | undefined {
  if (!value) return undefined;
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 2) return undefined;
  return { left: parts[0], top: parts[1] };
}

// "View all practices" status badge — a filled colour disc with a white
// checkmark when done, or a hollow ring in the practice's own colour when
// not, matching the reference screenshot exactly (not a progress arc).
function PracticeStatusBadge({ done, color, size = 28 }: { done: boolean; color: string; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? color : 'transparent',
        borderWidth: done ? 0 : 1.5,
        borderColor: color,
      }}
    >
      {done ? <Feather name="check" size={13} color={COLORS.cardBgLight} /> : null}
    </View>
  );
}

function PanchangPill({
  panchang,
  summary,
  theme,
  kind = 'panchang',
}: {
  panchang: { tithi: string; paksha: string; nakshatra: string; yoga: string; samvatYear: number };
  summary: HomeSummary['panchang'];
  theme: { heroOverlay: string; borderSoft: string; text: string; brand: string };
  kind?: 'panchang' | 'observance';
}) {
  const [idx, setIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  const router = useRouter();

  const slides = useMemo(() => {
    const seen = new Set<string>();
    const rows: { key: string; icon: string; label: string; monthLabel?: string | null; href?: string | null }[] = [];
    const normalizeObservanceKey = (label: string) => label
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/^(today is|tomorrow is)\s+/i, '')
      .replace(/\s+in\s+\d+\s+days$/i, '')
      .replace(/\s+today$/i, '')
      .trim()
      .toLowerCase();
    const add = (row: { key: string; icon: string; label: string; dedupeKey?: string; monthLabel?: string | null; href?: string | null } | null) => {
      if (!row?.label) return;
      const normalized = (row.dedupeKey ?? normalizeObservanceKey(row.label));
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      rows.push({ key: row.key, icon: row.icon, label: row.label, monthLabel: row.monthLabel, href: row.href });
    };

    if (kind === 'observance') {
      add(summary.observance ? {
        key: 'observance',
        icon: summary.observance.emoji ?? '🪔',
        label: summary.observance.label,
        dedupeKey: summary.observance.name.trim().toLowerCase(),
        monthLabel: summary.observance.monthLabel,
        href: summary.observance.href,
      } : null);
      // Genuinely different upcoming observances (next Ekadashi, next
      // Amavasya, next festival...) from the same DB-backed window, rather
      // than re-labeling summary.observance via vratLabel/festivalLabel —
      // those are derived from the exact same source as summary.observance
      // and were previously deduped away as near-duplicates anyway.
      (summary.upcomingObservances ?? []).forEach((entry, i) => {
        add({
          key: `upcoming-${i}`,
          icon: entry.emoji ?? '🪔',
          label: entry.label,
          dedupeKey: entry.name.trim().toLowerCase(),
          monthLabel: entry.monthLabel,
          href: entry.href,
        });
      });
      return rows;
    }

    // Panchang (tithi/nakshatra) slides have no per-item destination of
    // their own -- tapping either always opens the full Panchang screen
    // (see the pill's onPress below), so href is intentionally omitted here.
    add({ key: 'tithi', icon: '🌙', label: `${panchang.tithi} · VS ${panchang.samvatYear}` });
    add({ key: 'nakshatra', icon: '✨', label: `${panchang.nakshatra} · ${panchang.yoga}` });

    return rows;
  }, [kind, panchang.nakshatra, panchang.samvatYear, panchang.tithi, panchang.yoga, summary.observance, summary.upcomingObservances]);
  const total = slides.length;

  useEffect(() => {
    setIdx((current) => (total > 0 ? current % total : 0));
  }, [total]);

  useEffect(() => {
    // Reduced motion means calm, not just "no fade" — auto-cycling on a
    // fixed timer is itself motion the user asked to avoid. Respect that by
    // not auto-advancing at all when reduced motion is on; the pill stays on
    // whichever slide it's currently showing (tapping now navigates, it no
    // longer manually advances the cycle).
    if (reducedMotion || total <= 1) {
      return;
    }
    const t = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % total);
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      });
    }, 3500);
    return () => clearInterval(t);
  }, [fadeAnim, reducedMotion, total]);

  if (kind === 'observance' && slides.length === 0) {
    return null;
  }

  const currentSlide = slides[idx] ?? slides[0] ?? { key: 'tithi', icon: '🌙', label: `${panchang.tithi} · VS ${panchang.samvatYear}`, href: null as string | null };
  const isObservance = kind === 'observance';
  const splitSentences = (text: string) => text.split(/(?<=\.)\s+/).map((line) => line.trim()).filter(Boolean);
  // The label and the month label are two separate clauses (e.g. "Tomorrow
  // is Raksha Bandhan" + "Shravana (purnimanta)") -- joining them with " · "
  // and letting RN wrap wherever it fits broke mid-clause and, combined with
  // the fully-rounded pill shape, produced an oversized uneven blob behind
  // the text. Put the month label on its own explicit line instead so the
  // line count (and therefore the pill shape below) is always known up
  // front, for every slide this pill ever shows, not just this one.
  const labelLines = [
    // The "·" stays at the END of the first line (where it visually reads as
    // "...Bandhan ·"), not carried onto the front of the second line.
    ...splitSentences(currentSlide.monthLabel ? `${currentSlide.label} ·` : currentSlide.label),
    ...(currentSlide.monthLabel ? splitSentences(currentSlide.monthLabel) : []),
  ];
  // Slides already auto-cycle on their own timer (the interval effect
  // above) -- tapping the pill used to just manually advance that same
  // cycle, which is why it looked "unclickable": nothing visibly
  // navigated. Tapping now takes you to the actual destination: the
  // specific observance's own page for the observance pill (its `href`,
  // server-computed as /vrat or /panchang per routeKind), or the full
  // Panchang screen for the tithi/nakshatra pill, which has no
  // per-item destination of its own.
  const handleOpen = () => {
    const dest = isObservance ? currentSlide.href : '/panchang';
    if (!dest) return;
    router.push(resolveNativeRoute(dest) as Href);
  };

  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${isObservance ? 'Sacred observance' : 'Panchang info'}: ${currentSlide.label}. Tap to open`}
      onPress={handleOpen}
      hitSlop={4}
      style={{
        // A fully-rounded (999) pill only reads correctly at one line tall --
        // stretched over two sentence-lines it turns into an oversized blob
        // ("aura") behind the text instead of a tight pill. Fall back to a
        // normal rounded-rectangle radius once there's more than one line,
        // for every slide/message this pill ever shows, not just this one.
        borderRadius: labelLines.length > 1 ? RADII.lg : RADII.pill,
        paddingHorizontal: 12,
        paddingVertical: labelLines.length > 1 ? 5 : 3,
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        backgroundColor: isObservance ? COLORS.homePwaObservanceBg : COLORS.homePwaPillBg,
        borderWidth: isObservance ? 1 : 0,
        borderColor: isObservance ? COLORS.homePwaObservanceBorder : 'transparent',
        minWidth: 104,
        maxWidth: 232,
        // RN's auto-height measurement for this pill was landing on wildly
        // unstable values across renders (observed 173-195pt for a 2-line
        // label that should only need ~62pt) -- almost certainly a text/
        // font-metrics remeasure race, not anything content-driven, since
        // it reproduced identically regardless of border radius or how the
        // label text was split into lines. Pin the height explicitly per
        // line count instead of trusting auto-sizing here, for every
        // slide/message this pill ever shows, not just this one.
        minHeight: labelLines.length > 1 ? 58 : 40,
        maxHeight: labelLines.length > 1 ? 66 : 40,
      }}
    >
      <Animated.View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, opacity: fadeAnim }}>
        <Text style={{ fontSize: 12, lineHeight: 14 }}>{currentSlide.icon}</Text>
        <View style={{ flexShrink: 1 }}>
          {labelLines.map((line, i) => (
            <Text key={i} style={{ ...TYPE.chip, fontSize: 12, lineHeight: 15, color: isObservance ? COLORS.homePwaObservanceText : COLORS.homePwaPillText }}>
              {line}
            </Text>
          ))}
        </View>
      </Animated.View>

      {/* Dot indicators — PWA's PanchangPill (HeroSection.tsx) shows these
          so the pill visibly reads as "showing 1 of N things, auto-rotating"
          instead of just looking like a static label. Colors are the warm
          cream PWA uses verbatim (rgba(255,240,200,*)) rather than
          theme-flipped — the pill always sits over the hero's darkened
          image area in both light and dark mode, same as in PWA. */}
      {slides.length > 1 ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, alignSelf: 'center' }}>
        {slides.map((s, i) => (
          <View
            key={s.key}
            style={{
              width: i === idx ? 10 : 4,
              height: 4,
              borderRadius: 99,
              backgroundColor: i === idx
                ? (isObservance ? COLORS.homePwaObservanceText : COLORS.homePwaPillDotActive)
                : (isObservance ? COLORS.homePwaObservanceBorder : COLORS.homePwaPillDotInactive),
            }}
          />
        ))}
      </View>
      ) : null}
    </PressableSurface>
  );
}

function HomeContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<HomeSummary>(INITIAL_STATE);
  const [loadError, setLoadError] = useState(false);
  const [practicesOpen, setPracticesOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [moodStatus, setMoodStatus] = useState<HomeLiveMoodStatus | null>(null);
  const [moodPulseVisible, setMoodPulseVisible] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const [aiAuthGateVisible, setAiAuthGateVisible] = useState(false);
  const [chatSheetVisible, setChatSheetVisible] = useState(false);
  const [chatOrigin, setChatOrigin] = useState({ x: 0, y: 0 });
  const [heroPickerVisible, setHeroPickerVisible] = useState(false);
  const [heroOverride, setHeroOverride] = useState<HeroPick | null>(null);
  const [heroSize, setHeroSizeState] = useState<HeroSize>('standard');
  const [greetingPickerVisible, setGreetingPickerVisible] = useState(false);
  const [greetingOverride, setGreetingOverride] = useState<string | null>(null);
  const [showRashiphalNudge, setShowRashiphalNudge] = useState(false);

  useEffect(() => {
    getHeroPick().then(setHeroOverride).catch(() => {});
    getHeroSize().then(setHeroSizeState).catch(() => {});
    getGreetingPick().then(setGreetingOverride).catch(() => {});
    isRashiphalNudgeDismissed().then((dismissed) => {
      if (!dismissed) {
        setShowRashiphalNudge(true);
      }
    }).catch(() => {});
  }, []);

  const scrollRef = useScrollToTop();

  const theme = useMemo(
    () => ({
      background: isDark ? COLORS.darkBg : COLORS.creamBg,
      hero: isDark ? COLORS.homeHeroDark : COLORS.homeHeroLight,
      heroOverlay: isDark ? COLORS.homeHeroOverlayDark : COLORS.homeHeroOverlayLight,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      raised: isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight,
      soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
      glass: isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      borderSoft: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
      premiumBorder: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      shadow: isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
      ringTrack: isDark ? COLORS.homeRingTrackDark : COLORS.homeRingTrackLight,
      // PWA's brand-primary is theme-aware, not one static value: light mode
      // uses a deeper terracotta while dark mode keeps the softer gold.
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
      // Additive, not a replacement for `brand` above -- `brand` stays
      // light/dark-contrast-tuned for text/border legibility everywhere.
      // This is only for the tradition greeting chip and hero identity
      // badge, so a Sikh/Buddhist/Jain user sees their own path's color
      // there without every other branded surface in the app shifting too.
      traditionAccent: TRADITION_ACCENT[state.profile.tradition as keyof typeof TRADITION_ACCENT] ?? TRADITION_ACCENT.all,
    }),
    [isDark, state.profile.tradition]
  );

  // Mirrors PWA's HOME_OBSERVANCE_WINDOW_DAYS = 3 (HomeDashboard.tsx /
  // VratCarousel.tsx) — spotlight only the soonest observance within the
  // next 3 days; the hero PanchangPill above keeps rotating through all
  // upcoming entries regardless of window.
  // PWA shows every occurrence/festival that falls in the window (its
  // VratCarousel is a swipeable multi-card list, not a single spotlight) --
  // native was collapsing this down to just the soonest one via `[0]`,
  // which is why a coincidental same-day pairing (e.g. Purnima Vrat and
  // Raksha Bandhan both landing on the same date) only ever showed
  // whichever one happened to win the tie-break, silently dropping the
  // other. Dedupe by name (not just by the upstream slug:date key, which
  // home-summary already applies) and keep every distinct entry in the
  // window instead of slicing to one, for every same-day pairing this ever
  // produces, not just this specific one.
  const relevantObservances = useMemo(() => {
    const seen = new Set<string>();
    const candidates = [state.panchang.observance, ...state.panchang.upcomingObservances].filter(
      (entry): entry is NonNullable<typeof entry> => Boolean(entry) && entry!.daysLeft >= 0 && entry!.daysLeft <= 3
    );
    const deduped = candidates.filter((entry) => {
      const key = entry.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [state.panchang.observance, state.panchang.upcomingObservances]);

  // A device-local backdrop pick (lib/heroPreference.ts) overrides the
  // server-resolved tradition/festival hero — same precedence PWA's own
  // localStorage-only pick has over its auto-resolved theme.
  const heroImageUrl = heroOverride?.imageUrl ?? resolveAssetUrl(state.hero.imageUrl);
  const heroImageSource = useMemo(() => {
    if (heroOverride?.id && LOCAL_HERO_ASSETS[heroOverride.id]) {
      return LOCAL_HERO_ASSETS[heroOverride.id];
    }
    return heroImageUrl ? { uri: heroImageUrl } : null;
  }, [heroOverride, heroImageUrl]);

  const currentHeroConfig = HERO_SIZE_CONFIG[heroSize] ?? HERO_SIZE_CONFIG.standard;
  const heroHeight = currentHeroConfig.height;
  const heroReadabilityHeight = currentHeroConfig.readabilityHeight;

  // Pre-existing gap found in review: `objectPosition` (e.g. "58% 25%",
  // tuned per hero image so a face/detail stays in frame) was fetched from
  // the backend but never actually applied to the <Image> below — fixed
  // here for both the server-resolved default and the new local override.
  const heroObjectPosition = parseObjectPosition(heroOverride?.objectPosition ?? state.hero.objectPosition);
  const avatarImageUrl = resolveAssetUrl(state.profile.avatarUrl);
  const relicImageUrl = resolveAssetUrl(state.profile.relicImageUrl);

  const panchang = useMemo(
    () => calculatePanchang(
      new Date(`${state.date.iso}T12:00:00`),
      state.date.latitude,
      state.date.longitude,
      state.date.timezone
    ),
    [state.date.iso, state.date.latitude, state.date.longitude, state.date.timezone]
  );

  const completedCount = state.practices.filter((row) => row.done).length;
  const actionRoute = resolveNativeRoute(state.nextPractice.actionHref);

  // A device-local greeting pick (lib/greetingPreference.ts) fully replaces
  // the greeting line, time-word included -- GREETING_POOLS entries
  // (lib/greetings.ts) are complete, standalone traditional greetings
  // ("Waheguru Ji Ka Khalsa", "Jai Shri Ram"), not modifier words meant to
  // follow one. Previously this concatenated the time-word in front of the
  // pick, and the render below still appends ", {firstName}" on top of
  // that -- three greeting-shaped fragments stacked in one line (e.g.
  // "Shubh Sandhya, Waheguru Ji Ka Khalsa, Prince"), which read as
  // accumulating rather than a single greeting.
  const greeting = useMemo(() => {
    if (greetingOverride) return greetingOverride;
    const timeGreeting = getTimeGreeting(new Date().getHours());
    return timeGreeting ?? getTraditionGreeting(state.profile.tradition, new Date(`${state.date.iso}T12:00:00`).getDate());
  }, [state.profile.tradition, state.date.iso, greetingOverride]);

  const nextPracticeRow = state.practices.find((row) => row.id === state.nextPractice.id);
  const nextPracticeIcon = nextPracticeRow?.icon ?? 'compass';
  const nextPracticeColor = nextPracticeRow ? PRACTICE_COLOR[nextPracticeRow.id] : theme.brand;

  // Copy mirrors PWA's getDailySadhanaCta() (HeroSection.tsx) exactly — same
  // three states (begin / continue / complete), same "Next: X · detail" and
  // "Start with X · N practices today" phrasing — so the two apps read the
  // same sentence, not just the same layout.
  const sadhanaComplete = state.nextPractice.progress >= 1;
  const traditionLabel = state.profile.tradition
    ? state.profile.tradition.charAt(0).toUpperCase() + state.profile.tradition.slice(1)
    : 'Dharma';
  const sadhanaTitle = sadhanaComplete
    ? "Today's Sadhana Complete"
    : completedCount === 0
      ? "Begin Today's Sadhana"
      : "Continue Today's Sadhana";
  const sadhanaSubtitle = sadhanaComplete
    ? `Your ${traditionLabel} rhythm is steady today · +seva earned`
    : completedCount === 0
      ? `Start with ${state.nextPractice.title} · ${state.practices.length - completedCount} practices today`
      : `Next: ${state.nextPractice.title} · ${state.nextPractice.suggestion}`;
  const sadhanaButtonLabel = sadhanaComplete ? "Today's Recap" : completedCount === 0 ? 'Begin' : 'Continue';
  const sadhanaCtaGradient: readonly [string, string] = isDark
    ? ['rgba(38,28,18,0.96)', 'rgba(24,18,13,0.94)']
    : ['rgba(255,248,234,0.96)', 'rgba(250,236,211,0.88)'];
  const sadhanaCtaText = isDark ? 'rgba(255,246,230,0.96)' : '#3f2b1f';
  const sadhanaCtaSubtext = isDark ? 'rgba(255,230,190,0.66)' : 'rgba(63,43,31,0.66)';
  const sadhanaCtaMeta = isDark ? 'rgba(255,230,190,0.58)' : 'rgba(63,43,31,0.58)';
  const sadhanaCtaIconBg = isDark ? 'rgba(197,160,89,0.16)' : 'rgba(217,178,105,0.18)';

  const dharmVeerRow = state.practices.find((row) => row.id === 'dharmveer');
  const dharmVeerDone = dharmVeerRow?.done ?? false;
  const dharmVeerIcon = dharmVeerRow?.icon ?? 'shield';
  const dharmVeerColor = PRACTICE_COLOR.dharmveer;

  const requestGenRef = useRef(0);
  const hasValidStateRef = useRef(false);
  const lastLoadedAtRef = useRef(0);
  const lastIdentityKeyRef = useRef<string | null>(null);

  const reducedMotion = useReducedMotion();

  const applyPayload = useCallback((payload: HomeSummary | CachedHomeRenderModel) => {
    setState({
      ...INITIAL_STATE,
      ...payload,
      profile: { ...INITIAL_STATE.profile, ...payload.profile },
      hero: { ...INITIAL_STATE.hero, ...payload.hero },
      date: { ...INITIAL_STATE.date, ...payload.date },
      sacredText: { ...INITIAL_STATE.sacredText, ...payload.sacredText },
      panchang: { ...INITIAL_STATE.panchang, ...payload.panchang },
      nextPractice: { ...INITIAL_STATE.nextPractice, ...payload.nextPractice },
      practices: (payload.practices as HomeSummary['practices']) ?? [],
      dharmVeer: { ...INITIAL_STATE.dharmVeer, ...payload.dharmVeer },
      sankalpa: (payload as HomeSummary).sankalpa ?? null,
    });
    hasValidStateRef.current = true;
  }, []);

  const buildGuestPayload = useCallback((): HomeSummary => ({
    ...INITIAL_STATE,
    profile: {
      name: 'Atithi',
      firstName: 'Atithi',
      tradition: 'hindu',
      appLanguage: 'en',
      city: '',
      country: '',
      karmaPoints: 0,
      relicImageUrl: null,
      avatarUrl: null,
    },
    practices: [
      {
        id: 'japa',
        icon: 'circle',
        label: 'Japa Mala',
        detail: 'Begin your daily mala',
        href: '/bhakti/mala',
        done: false,
        progress: 0,
        color: PRACTICE_COLOR.japa,
      },
      {
        id: 'nitya',
        icon: 'check-circle',
        label: 'Nitya Karma',
        detail: 'Open your daily sequence',
        href: '/nitya-karma',
        done: false,
        progress: 0,
        color: PRACTICE_COLOR.nitya,
      },
      {
        id: 'pathshala',
        icon: 'book-open',
        label: 'Pathshala',
        detail: 'Study scripture',
        href: '/pathshala',
        done: false,
        progress: 0,
        color: PRACTICE_COLOR.pathshala,
      },
      {
        id: 'quiz',
        icon: 'help-circle',
        label: 'Daily Quiz',
        detail: 'Test your dharmic memory',
        href: '/quiz',
        done: false,
        progress: 0,
        color: PRACTICE_COLOR.quiz,
      },
      {
        id: 'dharmveer',
        icon: 'shield',
        label: 'Dharm Veer',
        detail: 'Remember a life of courage',
        href: '/dharm-veer',
        done: false,
        progress: 0,
        color: PRACTICE_COLOR.dharmveer,
      },
    ],
    nextPractice: {
      id: 'pathshala',
      contextLabel: 'Next Practice',
      title: 'Pathshala',
      suggestion: 'Study scripture to quiet the mind.',
      nudge: 'Consistency builds the strongest foundation.',
      actionLabel: 'Go to Pathshala',
      actionHref: '/pathshala',
      progress: 0,
    },
    dharmVeer: {
      id: 'sri-krishna',
      name: 'Sri Krishna',
      tagline: 'Ancient wisdom. Daily practice.',
      href: '/dharm-veer',
    },
  }), []);

  const [currentIdentity, setCurrentIdentity] = useState<HomeAuthIdentity>({ kind: 'unauthenticated' });
  const heroImageUrlRef = useRef<string | null>(null);
  heroImageUrlRef.current = heroImageUrl;

  const coordinatorRef = useRef<HomeSummaryCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new HomeSummaryCoordinator({
      fetchApi: apiFetch,
      onApplyPayload: (payload) => applyPayload(payload),
      onSetLoading: (loading) => setLoading(loading),
      onSetError: (error) => setLoadError(error),
      onRedirectToLogin: () => router.replace('/(auth)/login'),
      onPrefetchHeroImage: (url) => {
        const assetUrl = resolveAssetUrl(url);
        if (assetUrl) {
          void Image.prefetch(assetUrl).catch(() => {});
        }
      },
      buildGuestPayload,
    });
  }

  // Subscribe to auth state changes to immediately invalidate and wipe memory state
  // when an account switch, sign out, or sign in occurs.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const guest = await isGuestMode();
      const nextIdentity = resolveHomeIdentity(guest, session?.user);
      const nextKey = getIdentityKey(nextIdentity);

      if (coordinatorRef.current?.state.lastIdentityKey !== nextKey) {
        coordinatorRef.current?.invalidateMemoryState(nextKey);
        setCurrentIdentity(nextIdentity);
        setIsGuest(guest);
        setState(INITIAL_STATE);

        if (nextIdentity.kind === 'unauthenticated') {
          router.replace('/(auth)/login');
        } else {
          void coordinatorRef.current?.loadHome(nextIdentity);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [buildGuestPayload, router]);

  // Focus effect: Resolves identity FIRST on every focus before evaluating freshness or reloading
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function handleFocus() {
        const [guest, sessionRes] = await Promise.all([
          isGuestMode(),
          supabase.auth.getSession(),
        ]);

        if (!active) return;
        setIsGuest(guest);

        const resolved = resolveHomeIdentity(guest, sessionRes?.data?.session?.user);
        setCurrentIdentity(resolved);

        if (coordinatorRef.current) {
          coordinatorRef.current.setHeroUrl(heroImageUrlRef.current);
          await coordinatorRef.current.onFocus(resolved);
        }
      }

      void handleFocus();

      return () => {
        active = false;
      };
    }, [])
  );

  // Keeps the bell badge honest without a full app restart. Two parts:
  // 1. Refetch on every focus — covers returning to Home after marking
  //    everything read in the inbox (app/notifications.tsx), where Home's
  //    own state was never told the count changed.
  // 2. A live INSERT subscription, but only while Home is the focused
  //    screen — covers a new notification arriving while Home is actually
  //    on screen. Scoped to focus (not mount) so it disconnects the moment
  //    Home is blurred (e.g. navigating into Notifications), rather than
  //    running a second long-lived channel alongside that screen's own
  //    subscription (lib/notificationsData.ts's subscribeToNotifications).
  // Both paths are best-effort — a failed unread count fetch should never
  // flip Home into its error state, it just means the bell shows no badge.
  useFocusEffect(
    useCallback(() => {
      let unsubscribe: (() => void) | undefined;
      let active = true;

      Promise.all([isGuestMode(), supabase.auth.getSession()]).then(([guest, sessionRes]) => {
        if (!active) return;
        if (guest) {
          setUnreadNotifications(0);
          setMoodStatus(null);
          return;
        }

        const user = sessionRes?.data?.session?.user;
        if (!user) {
          setUnreadNotifications(0);
          setMoodStatus(null);
          return;
        }

        void fetchHomeLive().then((live) => {
          if (!active) return;
          if (live.unreadNotifications !== undefined) setUnreadNotifications(live.unreadNotifications);
          if (live.moodStatus) setMoodStatus(live.moodStatus);
        });
        unsubscribe = subscribeToMyNotifications(() => {
          if (!active) return;
          void getMyUnreadNotificationCount().then((count) => {
            if (active) setUnreadNotifications(count);
          });
        });
      });

      return () => {
        active = false;
        if (unsubscribe) unsubscribe();
      };
    }, [])
  );

  // Native port of the PWA's auto-popping mood check-in (MoodPulse.tsx):
  // once per spiritual day, the first time Home has real mood status to
  // show, pop the sheet open unprompted rather than waiting for a tap on
  // the passive MoodCheckin card below. Re-checks the AsyncStorage
  // dismissed-date on every fire (not just once) so it stays correctly
  // closed after Done/dismiss even though those actions replace
  // `moodStatus` with a new object and re-trigger this effect -- same
  // re-entrancy the PWA's own effect relies on.
  useEffect(() => {
    if (isGuest || !moodStatus) return;
    let cancelled = false;
    getMoodPulseDismissedDate().then((dismissedOn) => {
      if (!cancelled && dismissedOn !== getMoodSpiritualDate()) setMoodPulseVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [moodStatus, isGuest]);

  const loadHome = useCallback(async (isManualRefresh = false) => {
    const [guest, sessionRes] = await Promise.all([
      isGuestMode(),
      supabase.auth.getSession(),
    ]);
    const resolved = resolveHomeIdentity(guest, sessionRes?.data?.session?.user);
    if (coordinatorRef.current) {
      coordinatorRef.current.setHeroUrl(heroImageUrlRef.current);
      await coordinatorRef.current.loadHome(resolved, isManualRefresh);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHome(true);
    } finally {
      setRefreshing(false);
    }
    const guest = await isGuestMode();
    if (!guest) {
      void fetchHomeLive().then((live) => {
        if (live.unreadNotifications !== undefined) setUnreadNotifications(live.unreadNotifications);
        if (live.moodStatus) setMoodStatus(live.moodStatus);
      });
    } else {
      setUnreadNotifications(0);
      setMoodStatus(null);
    }
  }, [loadHome]);

  // Match the PWA Home hero: show only the first verse line in the
  // transitional Home block, with the full text available on /shloka.
  const sacredTextLine = state.sacredText.original.split('\n')[0] || state.sacredText.original;

  const navigate = useCallback(
    (href: Href) => {
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      router.push(href);
    },
    [router]
  );

  if (loading) {
    return <HomeSkeleton tradition={state.profile.tradition} heroHeight={heroHeight} />;
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="wifi-off"
            title="Could not load home"
            subtitle="Check your connection and try again."
            ctaLabel="Retry"
            onCta={() => {
              void onRefresh();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      {/* Ambient backdrop glow — matches japa.tsx's launcher pattern. The
          hero above has its own image background, but everything below fold
          (practice cards, Jyotish & Panchang / Sadhana / Community tile
          rows) sat on flat theme.background with no atmosphere. Fixed here
          (siblings before ScrollView, not scrolling with content) so the
          glow reads behind whichever cards are on screen at any scroll
          position, same as japa's launcher screen. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 90, right: -86, width: 220, height: 220, borderRadius: 110, backgroundColor: theme.soft, opacity: 0.72 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 420, left: -96, width: 240, height: 240, borderRadius: 120, backgroundColor: isDark ? COLORS.navGlowIvoryDark : COLORS.navGlowGoldLight, opacity: 0.66 }} />
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom + NAV_BAR_CLEARANCE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />}
        showsVerticalScrollIndicator={false}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
      >
        <View
          style={{
            height: heroHeight,
            width: '100%',
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 34,
            backgroundColor: theme.hero,
            overflow: 'hidden',
            justifyContent: 'flex-start',
          }}
        >
          {heroImageSource ? (
            <Image
              source={heroImageSource}
              accessibilityIgnoresInvertColors
              style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
              contentFit="cover"
              contentPosition={heroObjectPosition}
              transition={reducedMotion ? 0 : 180}
            />
          ) : null}

          {/* Two-layer gradient, ported from PWA's .divine-hero-overlay +
              .divine-hero-readability (src/app/globals.css) — replaces the
              old flat image-opacity + solid-color wash, which crushed the
              whole image to one uniform dullness instead of only darkening
              where text needs to sit. Layer 1 (top scrim) keeps the bell/
              avatar/greeting legible without touching the rest of the
              image. Layer 2 (bottom readability) fades to the exact same
              solid `theme.background` the shloka panel below now uses, so
              image → gradient → panel is one continuous blend with no
              visible seam — the fix for the "separated white line". */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              isDark ? COLORS.heroScrimTopDark : COLORS.heroScrimTopLight,
              isDark ? COLORS.heroScrimMidDark : COLORS.heroScrimMidLight,
              'transparent',
            ]}
            locations={[0, 0.4, 0.8]}
            style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'transparent',
              isDark ? COLORS.heroReadabilitySoftDark : COLORS.heroReadabilitySoftLight,
              isDark ? COLORS.heroReadabilityDark : COLORS.heroReadabilityLight,
              theme.background,
            ]}
            locations={[0, 0.35, 0.75, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: heroReadabilityHeight, zIndex: 1 }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              navigate('/notifications');
            }}
            style={{
              position: 'absolute',
              zIndex: 3,
              top: 18,
              left: 20,
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.heroOverlay,
              borderWidth: 1,
              borderColor: theme.borderSoft,
            }}
          >
            <Feather name="bell" size={18} color={theme.text} />
            {unreadNotifications > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: theme.brand,
                  borderWidth: 1.5,
                  borderColor: theme.heroOverlay,
                }}
              />
            ) : null}
          </Pressable>

          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              zIndex: 3,
              top: 22,
              left: 72,
              right: 72,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Check in with your mood"
              onPress={() => {
                void Haptics.selectionAsync().catch(() => {});
                if (isGuest) {
                  setAuthGateVisible(true);
                  return;
                }
                navigate('/mood');
              }}
              hitSlop={8}
              style={({ pressed }) => ({
                borderRadius: RADII.pill,
                paddingHorizontal: 12,
                paddingVertical: 5,
                alignSelf: 'center',
                flexShrink: 1,
                maxWidth: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                backgroundColor: COLORS.homePwaPillBg,
                borderWidth: 0,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {moodStatus?.hasLoggedMoodToday && moodStatus.lastMood ? (
                <>
                  <MoodGlyph
                    mood={moodStatus.lastMood}
                    color={COLORS.homePwaPillText}
                    size={12}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      ...TYPE.chip,
                      fontSize: 11,
                      lineHeight: 14,
                      color: COLORS.homePwaPillText,
                    }}
                  >
                    Feeling {findMoodConfig(isDark, moodStatus.lastMood)?.label || 'Good'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 11, lineHeight: 14 }}>✨</Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      ...TYPE.chip,
                      fontSize: 11,
                      lineHeight: 14,
                      color: COLORS.homePwaPillText,
                    }}
                  >
                    How are you feeling?
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              navigate('/(tabs)/profile');
            }}
            style={{
              position: 'absolute',
              zIndex: 4,
              top: 18,
              right: 20,
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.heroOverlay,
              borderWidth: 1.5,
              // Tradition-accent identity ring around the avatar -- the
              // one "hero identity badge" touch, kept narrow (border only,
              // not the avatar image itself) so it reads as a subtle
              // per-tradition signature rather than a re-theme.
              borderColor: theme.traditionAccent,
              overflow: 'hidden',
            }}
          >
            {isGuest ? (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: COLORS.brandGold,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="user" size={20} color={COLORS.ink} />
              </View>
            ) : avatarImageUrl ? (
              <Image source={{ uri: avatarImageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : relicImageUrl ? (
              <Image source={{ uri: relicImageUrl }} style={{ width: 34, height: 34 }} contentFit="contain" />
            ) : (
              <Text style={{ fontFamily: FONTS.serif, fontSize: 20, lineHeight: 24, fontWeight: '700', color: theme.text }}>
                {state.profile.firstName.charAt(0)}
              </Text>
            )}
          </Pressable>

          {/* PWA (HeroSection.tsx) stacks city -> greeting -> pill with only
              mt-3/mt-1.5 between the icon row above and this block — a
              tight rhythm. This block previously used marginTop: 48, which
              is why the greeting/pills read as noticeably lower/detached
              from the bell+avatar row than PWA's version. */}
          <View style={{ position: 'absolute', zIndex: 2, top: 78, left: 20, right: 20, alignItems: 'flex-start' }}>
            {state.profile.city ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                {/* Tradition-accent touch (not theme.brand, which stays
                    contrast-tuned for hero legibility) -- a Sikh/Buddhist/
                    Jain user sees their own path's color here. */}
                <Feather name="map-pin" size={12} color={theme.traditionAccent} />
                <Text style={{ ...TYPE.homeHeroLocation, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(255,240,200,0.78)' }}>
                  {state.profile.city}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
              <Text style={{ ...TYPE.homeHeroGreeting, color: 'rgba(255,248,235,0.96)', flexShrink: 1 }} numberOfLines={2}>
                {greeting}, {state.profile.firstName}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose your greeting"
                onPress={() => {
                  void Haptics.selectionAsync().catch(() => {});
                  setGreetingPickerVisible(true);
                }}
                hitSlop={8}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.heroOverlay,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                }}
              >
                <Feather name="chevron-down" size={14} color="rgba(255,240,200,0.85)" />
              </Pressable>
            </View>

            <View style={{ marginTop: 6, alignItems: 'flex-start', gap: 6, maxWidth: '92%' }}>
              <PanchangPill panchang={panchang} summary={state.panchang} theme={theme} />
              <PanchangPill panchang={panchang} summary={state.panchang} theme={theme} kind="observance" />
              {showRashiphalNudge ? (
                <PressableSurface
                  haptic="selection"
                  accessibilityLabel="See your Rashiphal. Tap to open"
                  onPress={() => {
                    void setRashiphalNudgeDismissed();
                    setShowRashiphalNudge(false);
                    navigate('/rashiphala');
                  }}
                  hitSlop={8}
                  style={{
                    borderRadius: RADII.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    minHeight: 34,
                    maxHeight: 34,
                    maxWidth: 188,
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 5,
                    backgroundColor: COLORS.homePwaRashiphalBg,
                  }}
                >
                  <Text style={{ fontSize: 11, lineHeight: 13 }}>🔮</Text>
                  <Text
                    style={{
                      ...TYPE.chip,
                      fontSize: 11,
                      fontFamily: FONTS.sansSemiBold,
                      lineHeight: 14,
                      color: COLORS.homePwaRashiphalText,
                    }}
                  >
                    See your Rashiphal
                  </Text>
                  <Text style={{ fontSize: 10, lineHeight: 13, color: COLORS.homePwaRashiphalArrow }}>→</Text>
                </PressableSurface>
              ) : null}
            </View>
          </View>

          {/* Matches PWA's "Choose Sanctuary Backdrop" entry point — same
              bottom-right corner of the hero image. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose sanctuary backdrop"
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {});
              setHeroPickerVisible(true);
            }}
            style={{
              position: 'absolute',
              zIndex: 3,
              bottom: 16,
              right: 20,
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.heroOverlay,
              borderWidth: 1,
              borderColor: theme.borderSoft,
            }}
          >
            <Feather name="image" size={16} color={theme.text} />
          </Pressable>
        </View>

        <View style={{ marginTop: -18, marginBottom: 8, paddingHorizontal: 16 }}>
          <PressableSurface
            haptic="selection"
            accessibilityLabel={`${state.sacredText.label}: ${state.sacredText.original}. ${state.sacredText.meaning}. Tap to open, mark as read, and earn seva points`}
            onPress={() => navigate('/shloka')}
            style={{
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 18,
              alignItems: 'center',
              backgroundColor: isDark ? COLORS.homeShlokaGlassDark : COLORS.homeShlokaGlassLight,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
              borderWidth: 1,
              borderColor: isDark ? COLORS.homeShlokaGlassBorderDark : COLORS.homeShlokaGlassBorderLight,
            }}
          >
            <Text style={{ ...TYPE.chip, letterSpacing: 2.1, textTransform: 'uppercase', color: theme.brand, textAlign: 'center', alignSelf: 'center' }}>
              {state.sacredText.label}
            </Text>
            <Text
              style={{
                marginTop: 8,
                ...TYPE.shloka,
                fontSize: 17,
                lineHeight: 27,
                color: theme.text,
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              “{sacredTextLine}”
            </Text>
            <Text style={{ marginTop: 6, ...TYPE.homeHeroMeaning, color: theme.dim, opacity: 0.72, textAlign: 'center' }} numberOfLines={1}>
              {state.sacredText.meaning}
            </Text>
          </PressableSurface>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 0, gap: 12 }}>
          {/* ── Below-fold PWA-parity sections — additive only, hero above
              is untouched. Order mirrors the PWA's own HomeDashboard: a
              Brahma Muhurta prompt (skipped once japa is done today),
              first-week guidance for brand-new users, then upcoming sacred
              days — all ahead of the existing next-practice card so the
              time-sensitive nudge surfaces first, same as PWA. ── */}
          {panchang.brahmaMuhurta && panchang.sunrise ? (
            <BrahmaMuhurtaPrompt
              brahmaMuhurta={panchang.brahmaMuhurta}
              sunrise={panchang.sunrise}
              japaAlreadyDoneToday={state.practices.find((row) => row.id === 'japa')?.done ?? false}
            />
          ) : null}

          {state.firstWeek ? (
            <FirstWeekGuide tradition={state.profile.tradition} userName={state.profile.firstName} />
          ) : null}

          {state.panchang.series?.length ? (
            <SacredDaysCard
              entry={null}
              series={state.panchang.series}
              theme={theme}
              isDark={isDark}
              lang={state.profile.appLanguage}
              spiritualDate={state.date.iso}
            />
          ) : null}

          {relevantObservances.map((entry) => (
            <SacredDaysCard
              key={entry.name}
              entry={entry}
              series={null}
              theme={theme}
              isDark={isDark}
              lang={state.profile.appLanguage}
              spiritualDate={state.date.iso}
            />
          ))}

          <FestivalStoryStack cards={state.panchang.storyCards} theme={theme} isDark={isDark} />

          {/* Smart daily Sadhana CTA — mirrors PWA's HeroSection.tsx card
              exactly (same 26px radius, cream/gold gradient, 54px icon well,
              gold-gradient pill button with sparkle + chevron). PWA renders
              this identically in light and dark mode — no isDark branch on
              the source — so this card intentionally doesn't theme-switch
              either; it's a fixed "premium accent" treatment, not a themed
              surface. */}
          <PressableSurface
            haptic="selection"
            accessibilityLabel={`${sadhanaTitle}. ${sadhanaSubtitle}. ${sadhanaButtonLabel}`}
            onPress={() => {
              if (sadhanaComplete) {
                navigate('/my-progress');
                return;
              }
              navigate(actionRoute);
            }}
            style={{
              borderRadius: 22,
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(197,160,89,0.22)' : 'rgba(205,166,92,0.28)',
              boxShadow: isDark
                ? '0 12px 28px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,240,200,0.08)'
                : '0 12px 28px rgba(105,75,35,0.10), inset 0 1px 0 rgba(255,255,255,0.75)',
              gap: 9,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={sadhanaCtaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: sadhanaCtaIconBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SacredIcon
                  name={nextPracticeRow?.id ?? 'japa'}
                  fallbackGlyph={sadhanaComplete ? 'star' : nextPracticeIcon}
                  size={20}
                  color="#a97725"
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ ...TYPE.cardHeading, color: sadhanaCtaText }} numberOfLines={1}>
                  {sadhanaTitle}
                </Text>
                <Text style={{ marginTop: 2, ...TYPE.caption, color: sadhanaCtaSubtext }} numberOfLines={1}>
                  {sadhanaSubtitle}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ ...TYPE.chip, letterSpacing: 1.1, textTransform: 'uppercase', color: sadhanaCtaMeta }} numberOfLines={1}>
                {completedCount} of {state.practices.length} practices
              </Text>
              <View
                style={{
                  minHeight: 33,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  borderRadius: 999,
                  paddingLeft: 13,
                  paddingRight: 10,
                  paddingVertical: 7,
                  backgroundColor: '#b6842f',
                  boxShadow: '0 8px 18px rgba(160,112,39,0.22), inset 0 1px 0 rgba(255,255,255,0.35)',
                }}
              >
                <Ionicons name="sparkles" size={12.5} color="#fff8e8" />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12.5, lineHeight: 16, color: '#fff8e8' }}>
                  {sadhanaButtonLabel}
                </Text>
                <Feather name="chevron-right" size={12.5} color="#fff8e8" style={{ opacity: 0.72, marginLeft: -2 }} />
              </View>
            </View>
          </PressableSurface>

          <View
            style={{
              borderRadius: 22,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: practicesOpen }}
              accessibilityLabel={practicesOpen ? 'Hide all practices' : 'View all practices'}
              onPress={() => setPracticesOpen((value) => !value)}
              style={{
                minHeight: 44,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 17, flex: 1, color: theme.dim }} numberOfLines={1}>
                {practicesOpen ? 'Hide all practices' : 'View all practices'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, lineHeight: 16, color: theme.dim }}>
                  {completedCount} / {state.practices.length}
                </Text>
                <Feather name={practicesOpen ? 'chevron-up' : 'chevron-down'} size={15} color={theme.dim} />
              </View>
            </Pressable>
          </View>

          {practicesOpen ? (
            // Match PWA NextPracticeCard: compact 44dp rows with the status
            // text and ring locked to the right edge, not below the label.
            <View style={{ gap: 6, paddingTop: 8 }}>
              {state.practices.map((row) => (
                <PressableSurface
                  key={row.id}
                  accessibilityLabel={`${row.label}, ${row.done ? 'done' : 'start'}`}
                  onPress={() => navigate(resolveNativeRoute(row.href))}
                  style={{
                    minHeight: 44,
                    borderRadius: 14,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.premiumBorder,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <Text style={{ width: 22, fontSize: 18, lineHeight: 22, textAlign: 'center' }}>{PRACTICE_EMOJI[row.id]}</Text>
                    <Text
                      style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, lineHeight: 17, color: theme.text, flex: 1 }}
                      numberOfLines={1}
                    >
                      {row.label}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Text
                      style={{
                        fontFamily: FONTS.sansSemiBold,
                        fontSize: 12,
                        lineHeight: 16,
                        color: row.done ? PRACTICE_COLOR[row.id] : theme.dim,
                      }}
                      numberOfLines={1}
                    >
                      {row.done ? 'Done' : row.progress > 0 ? `${Math.round(row.progress * 100)}%` : 'Start'}
                    </Text>
                    <PracticeStatusBadge done={row.done} color={PRACTICE_COLOR[row.id]} />
                  </View>
                </PressableSurface>
              ))}
            </View>
          ) : null}

          {/* Self-contained: fetches its own active Sankalpa + today's
              check-in status via /api/sankalpa* (not home-summary's static
              `state.sankalpa` snapshot), and refetches on every screen focus
              so a check-in made on the full /sankalpa screen shows up here
              without an app restart. See components/home/SankalpaCard.tsx. */}
          <SankalpaCard
            identity={currentIdentity}
            isGuest={isGuest}
            timezone={state.date?.timezone}
            initialSankalpa={
              state.sankalpa === undefined
                ? undefined
                : state.sankalpa === null
                ? null
                : {
                    id: state.sankalpa.id,
                    user_id: currentIdentity.kind === 'authenticated' ? currentIdentity.userId : '',
                    sankalpa_text: state.sankalpa.text,
                    target_count: state.sankalpa.targetDays ?? 40,
                    completed_count: 0,
                    current_streak: 0,
                    best_streak: 0,
                    start_date: state.sankalpa.startDate ?? '',
                    end_date: null,
                    status: 'active',
                    created_at: '',
                    updated_at: '',
                  }
            }
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${state.dharmVeer.name}, ${dharmVeerDone ? 'seva given today' : state.dharmVeer.tagline}`}
            onPress={() => navigate(resolveNativeRoute(state.dharmVeer.href))}
            style={{
              minHeight: 70,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 11,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: dharmVeerDone ? theme.soft : theme.card,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              opacity: dharmVeerDone ? 0.72 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
              <IconTile name="dharmveer" fallbackGlyph={dharmVeerIcon} size="md" color={dharmVeerColor} accent={dharmVeerColor} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: 'uppercase', color: theme.brand }}>
                  Dharm Veer
                </Text>
                <Text style={{ marginTop: 3, ...TYPE.cardHeading, color: theme.text }} numberOfLines={1}>
                  {state.dharmVeer.name}
                </Text>
                <Text style={{ marginTop: 2, ...TYPE.caption, color: theme.dim }} numberOfLines={1}>
                  {dharmVeerDone ? 'Seva given today' : state.dharmVeer.tagline}
                </Text>
              </View>
            </View>
            {dharmVeerDone ? (
              <Feather name="check-circle" size={20} color={dharmVeerColor} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: theme.soft,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                  }}
                >
                  <Text style={{ ...TYPE.micro, fontFamily: FONTS.sansSemiBold, color: theme.brand }}>+5 seva</Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.brand} />
              </View>
            )}
          </Pressable>

          <QuizSparkCard
            tradition={state.profile?.tradition}
            quizDone={state.practices?.find((p) => p.id === 'quiz')?.done}
            quizStreak={0}
            timezone={state.date?.timezone}
          />

          {/* Jyotish & Panchang — compact quick-access tiles. Keep this as
              contextual Home access rather than adding a sixth bottom tab. */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 12 }}>
              Jyotish & Panchang
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([
                {
                  label: 'Panchang',
                  href: '/panchang',
                  sacredId: 'panchang' as SacredIconName,
                  fallbackGlyph: 'calendar' as const,
                  accent: COLORS.tileGold,
                },
                {
                  label: 'Rashiphal',
                  href: '/rashiphala',
                  sacredId: 'rashiphala' as SacredIconName,
                  fallbackGlyph: 'moon' as const,
                  accent: COLORS.tilePurple,
                },
                {
                  label: 'Kundali',
                  href: '/kundali',
                  sacredId: 'kundali' as SacredIconName,
                  fallbackGlyph: 'aperture' as const,
                  accent: COLORS.tileBlue,
                },
              ] satisfies HomeMenuTileItem[]).map((item) => (
                <HomeMenuTile
                  key={item.label}
                  item={item}
                  theme={theme}
                  onPress={() => navigate(item.href as Href)}
                />
              ))}
            </View>
          </View>

          {/* Quick Actions Row */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 12 }}>Sadhana</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([
                { label: 'Nitya',    href: '/nitya-karma', sacredId: 'nitya' as SacredIconName,    fallbackGlyph: 'sunrise' as const,     accent: COLORS.tileGold },
                { label: 'Quiz',     href: '/quiz',        sacredId: 'quiz' as SacredIconName,     fallbackGlyph: 'help-circle' as const, accent: COLORS.tilePurple },
                { label: 'AI Guide', href: '/ai-chat',     sacredId: 'ai-guide' as SacredIconName, fallbackGlyph: 'message-circle' as const, accent: COLORS.tileViolet },
                { label: 'Progress', href: '/my-progress', sacredId: 'progress' as SacredIconName, fallbackGlyph: 'trending-up' as const, accent: COLORS.tileGreen },
              ] satisfies HomeMenuTileItem[]).map((item) => (
                <HomeMenuTile
                  key={item.label}
                  item={item}
                  theme={theme}
                  onPress={() => {
                    if (item.href === '/ai-chat' && isGuest) {
                      setAiAuthGateVisible(true);
                      return;
                    }
                    navigate(item.href as Href);
                  }}
                />
              ))}
            </View>
          </View>

          {/* Community Row */}
          <View style={{ marginTop: 12, marginBottom: 12 }}>
            <Text style={{ ...TYPE.section, color: theme.brand, marginBottom: 12 }}>Community</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([
                { label: 'Live Darshan', href: '/live-darshan',    sacredId: 'live-darshan' as SacredIconName, fallbackGlyph: 'radio' as const, accent: COLORS.tileBlue },
                { label: 'Mandali',      href: '/(tabs)/mandali',  sacredId: 'mandali' as SacredIconName,      fallbackGlyph: 'users' as const, accent: COLORS.tilePurple },
                // Tirtha (app/(tabs)/tirtha.tsx) is a real, complete screen —
                // nearby-temple map, save/check-in, passport — that was a
                // hidden tab (href: null in _layout.tsx) with no entry point
                // anywhere in the app. This card is the fix; the tab stays hidden.
                { label: 'Tirtha',      href: '/(tabs)/tirtha',    sacredId: 'tirtha' as SacredIconName,        fallbackGlyph: 'map-pin' as const, accent: COLORS.tileCoral },
                { label: 'Seva',        href: '/seva',             sacredId: 'seva' as SacredIconName,          fallbackGlyph: 'heart' as const,   accent: COLORS.tileGreen },
              ] satisfies HomeMenuTileItem[]).map((item) => (
                <HomeMenuTile
                  key={item.label}
                  item={item}
                  theme={theme}
                  onPress={() => navigate(item.href as Href)}
                />
              ))}
            </View>
          </View>

          {/* Closing footer — same line profile.tsx already uses, so the
              scroll ends on a deliberate stop instead of trailing into
              empty space above the nav-bar clearance padding. */}
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ ...TYPE.caption, color: theme.dim }}>Shoonaya · Find your infinity</Text>
          </View>
        </View>
      </ScrollView>

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Check in with your mood"
        message="Sign in to save your sadhana and track your mood patterns."
      />
      <AuthGate
        visible={aiAuthGateVisible}
        onClose={() => setAiAuthGateVisible(false)}
        title="Talk to your AI Guide"
        message="Sign in to chat with Dharma Mitra and get personalized guidance."
      />
      <MoodPulseSheet
        visible={moodPulseVisible}
        firstName={state.profile.firstName}
        onClose={() => setMoodPulseVisible(false)}
        onLogged={(mood) => setMoodStatus({ hasLoggedMoodToday: true, lastMood: mood })}
      />
      <FloatingDharmaScroll
        heroHeight={heroHeight}
        onOpenChat={(origin) => {
          setChatOrigin(origin);
          setChatSheetVisible(true);
        }}
      />
      <DharmaMitraChatSheet
        visible={chatSheetVisible}
        origin={chatOrigin}
        onClose={() => setChatSheetVisible(false)}
        tradition={state.profile.tradition}
      />
      <HeroBackdropPicker
        visible={heroPickerVisible}
        onClose={() => setHeroPickerVisible(false)}
        tradition={state.profile.tradition}
        onPickChange={setHeroOverride}
        currentSize={heroSize}
        onSizeChange={setHeroSizeState}
      />
      <GreetingPicker
        visible={greetingPickerVisible}
        onClose={() => setGreetingPickerVisible(false)}
        tradition={state.profile.tradition}
        onPickChange={setGreetingOverride}
      />
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  );
}
