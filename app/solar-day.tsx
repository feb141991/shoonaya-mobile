import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SolarDayFacts } from '@/components/panchang/solar/SolarDayFacts';
import { SolarEventList } from '@/components/panchang/solar/SolarEventList';
import { SolarSceneView } from '@/components/panchang/solar/SolarSceneView';
import { useReducedMotion } from '@/components/ui/Motion';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { useSolarDayLocation } from '@/hooks/useSolarDayLocation';
import { COLORS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { buildSolarDay, minutesNowIn, type SolarEventId, type SolarWindowId } from '@/lib/solarDay';
import { describeSolarMoment } from '@/lib/solarDayText';
import { wrapMinutes } from '@/lib/solarGeometry';

// Colours already used for these meanings: sage for the dawn practice window, the brand
// gold for the midday window, the warning amber Panchang uses for Rahu Kaal.
const WINDOW_COLORS: Record<SolarWindowId, string> = { brahma: COLORS.sage, abhijit: COLORS.brandGold, rahu: COLORS.warningLight };
const EVENT_COLORS: Record<SolarEventId, string> = { ...WINDOW_COLORS, sunrise: COLORS.brandGoldLight, sunset: COLORS.navy };

/** "Play the day" covers the whole day in 30 seconds. */
const PLAY_MINUTES_PER_SECOND = 48;
const PLAY_TICK_MS = 66;

function civilDateIn(timezone: string, offsetDays: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10);
}

function dateLabel(civilDate: string): string {
  return new Date(`${civilDate}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function SolarDayScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { location, status, retry } = useSolarDayLocation();

  const [dayOffset, setDayOffset] = useState(0);
  const civilDate = useMemo(() => civilDateIn(location.timezone, dayOffset), [location.timezone, dayOffset]);
  const result = useMemo(
    () => buildSolarDay({ civilDate, lat: location.lat, lon: location.lon, timezone: location.timezone }),
    [civilDate, location.lat, location.lon, location.timezone],
  );

  const [minutes, setMinutes] = useState(() => minutesNowIn(location.timezone));
  const [playing, setPlaying] = useState(false);
  const [sceneUnsupported, setSceneUnsupported] = useState(false);
  const [focused, setFocused] = useState(true);

  // A new place or day starts at the current time there (today) or at noon (another day).
  const placeKey = `${location.timezone}|${dayOffset}`;
  const lastPlaceKey = useRef(placeKey);
  useEffect(() => {
    if (lastPlaceKey.current === placeKey) return;
    lastPlaceKey.current = placeKey;
    setMinutes(dayOffset === 0 ? minutesNowIn(location.timezone) : 720);
  }, [placeKey, dayOffset, location.timezone]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setPlaying(false);
      };
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') setPlaying(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setMinutes((m) => wrapMinutes(m + (PLAY_MINUTES_PER_SECOND * PLAY_TICK_MS) / 1000)), PLAY_TICK_MS);
    return () => clearInterval(id);
  }, [playing]);

  const move = useCallback((delta: number) => {
    setPlaying(false);
    setMinutes((m) => wrapMinutes(m + delta));
  }, []);
  const jump = useCallback((to: number) => {
    setPlaying(false);
    setMinutes(wrapMinutes(to));
  }, []);
  const onUnsupported = useCallback(() => setSceneUnsupported(true), []);

  const day = result.ok ? result.day : null;
  const text = day ? describeSolarMoment(minutes, day) : null;
  const placeLabel = location.source === 'saved' ? location.city ?? 'Your saved location' : 'Ujjain (reference)';

  return (
    <Screen style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }} header={{ title: 'Solar Day', onBack: () => router.back() }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: insets.bottom + SPACING.xxl, gap: SPACING.lg }}>
        <View style={{ gap: SPACING.xs }}>
          <Text style={[TYPE.body, { color: theme.text }]}>
            {dateLabel(civilDate)} · {placeLabel}
          </Text>
          {location.source === 'reference' ? (
            <Text style={[TYPE.caption, { color: theme.dim }]}>
              {status === 'failed'
                ? 'Your saved city could not be loaded, so these are Ujjain reference timings.'
                : 'Using Ujjain reference timings. Add or confirm your city in Profile for local timings.'}
            </Text>
          ) : null}
          {status === 'failed' ? <Pill label="Try again" onPress={retry} /> : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
          <Pill label="Previous day" onPress={() => setDayOffset((d) => Math.max(-7, d - 1))} disabled={dayOffset <= -7} />
          <Pill label="Today" selected={dayOffset === 0} onPress={() => setDayOffset(0)} />
          <Pill label="Next day" onPress={() => setDayOffset((d) => Math.min(7, d + 1))} disabled={dayOffset >= 7} />
        </View>

        {!day || !text ? (
          <Text style={[TYPE.body, { color: theme.text }]}>
            The Sun does not both rise and set here on this date, so there is no day to show.
          </Text>
        ) : (
          <>
            <SolarDayFacts text={text} isDark={isDark} />
            {sceneUnsupported ? (
              <Text style={[TYPE.caption, { color: theme.dim }]}>The sky picture cannot be shown on this device. The times below are complete.</Text>
            ) : (
              <SolarSceneView
                day={day}
                minutes={minutes}
                motion={!reduceMotion && focused}
                windowColors={WINDOW_COLORS}
                description={text.spoken}
                onDragMinutes={move}
                onStep={move}
                onUnsupported={onUnsupported}
              />
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              <Pill label="−15 min" accessibilityLabel="15 minutes earlier" onPress={() => move(-15)} />
              <Pill label="Now" onPress={() => { setDayOffset(0); jump(minutesNowIn(location.timezone)); }} />
              <Pill label="+15 min" accessibilityLabel="15 minutes later" onPress={() => move(15)} />
              <Pill label={playing ? 'Pause' : 'Play the day'} selected={playing} onPress={() => setPlaying((p) => !p)} />
            </View>
            <SolarEventList day={day} minutes={minutes} colors={EVENT_COLORS} isDark={isDark} onJump={jump} />
            <Text style={[TYPE.caption, { color: theme.dim }]}>
              Times from the same calculation as Panchang for this place. The picture squeezes east and west so sunrise and sunset stay in view; it is not a map. This is daily guidance, not a festival or vrat date.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
