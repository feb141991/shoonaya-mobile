import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TempleCard } from '@/components/tirtha/TempleCard';
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { IconTile } from '@/components/ui/IconTile';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { DIASPORA_TEMPLES, getCuratedNearbyTemples } from '@/lib/diaspora-temples';
import {
  distanceKm,
  inferTradition,
  mergeCuratedAndOsm,
  TRADITION_DEFAULT_NAMES,
  type CitySuggestion,
  type Temple,
} from '@/lib/overpass';
import { supabase } from '@/lib/supabase';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import { navScrollHandler } from '@/lib/navScrollBus';

type PassportTab = 'map' | 'passport';
type MoodKey = 'gratitude' | 'devotion' | 'peace' | 'clarity';

type TirthaPlaceSummary = {
  id: string;
  name: string;
  tradition?: string;
  address?: string | null;
};

type TirthaSaveRow = {
  id: string;
  place_id: string;
  created_at: string;
  note: string | null;
  place?: TirthaPlaceSummary | null;
};

type TirthaVisitRow = {
  id: string;
  place_id: string;
  visited_at: string;
  privacy: 'private' | 'family' | 'mandali' | 'public' | string;
  darshan_mood: string | null;
  intention: string | null;
  place?: TirthaPlaceSummary | null;
};

const TIRTHA_MOODS: Array<{ key: MoodKey; label: string }> = [
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'devotion', label: 'Devotion' },
  { key: 'peace', label: 'Peace' },
  { key: 'clarity', label: 'Clarity' },
];

const DEFAULT_REGION: Region = {
  latitude: 51.5072,
  longitude: -0.1276,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const RADIUS_OPTIONS_KM = [10, 25, 50] as const;

type TraditionFilter = 'all' | Temple['tradition'];
const TRADITION_FILTERS: Array<{ key: TraditionFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'hindu', label: 'Hindu' },
  { key: 'sikh', label: 'Sikh' },
  { key: 'buddhist', label: 'Buddhist' },
  { key: 'jain', label: 'Jain' },
];

function tirthaPlaceId(temple: Temple): string {
  return temple.id;
}

function templeToPlaceRow(temple: Temple) {
  let source = 'osm';
  let sourceId = temple.id;

  if (temple.id.startsWith('curated:')) {
    source = 'curated';
    sourceId = temple.id.slice('curated:'.length);
  } else if (temple.id.startsWith('osm:')) {
    source = 'osm';
    sourceId = temple.id.slice('osm:'.length);
  } else if (temple.id.startsWith('overpass:')) {
    source = 'overpass';
    sourceId = temple.id.slice('overpass:'.length);
  }

  return {
    id: temple.id,
    source,
    source_id: sourceId,
    name: temple.name,
    tradition: temple.tradition,
    lat: temple.lat,
    lon: temple.lon,
    address: temple.address ?? null,
    website: temple.website ?? null,
    phone: temple.phone ?? null,
    opening_hours: temple.opening ?? null,
    deity: temple.deity ?? null,
    sampradaya: temple.sampradaya ?? null,
  };
}

function formatDistance(center: { lat: number; lon: number }, temple: Temple) {
  return `${distanceKm(center.lat, center.lon, temple.lat, temple.lon).toFixed(1)} km`;
}

export default function TirthaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);
  const bg = theme.bg;
  const cardBg = theme.card;
  const border = theme.border;
  const text = theme.text;
  const dim = theme.dim;
  const inputBg = theme.card;
  const brand = theme.brand;
  const textOnBrand = theme.textOnBrand;

  const mapRef = useRef<MapView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [passportTab, setPassportTab] = useState<PassportTab>('map');
  const [savedPlaces, setSavedPlaces] = useState<TirthaSaveRow[]>([]);
  const [visits, setVisits] = useState<TirthaVisitRow[]>([]);
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [checkinMood, setCheckinMood] = useState<MoodKey>('gratitude');
  const [intention, setIntention] = useState('');
  const [community, setCommunity] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(RADIUS_OPTIONS_KM[0]);
  const [traditionFilter, setTraditionFilter] = useState<TraditionFilter>('all');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const radiusKmRef = useRef<number>(radiusKm);
  useEffect(() => {
    radiusKmRef.current = radiusKm;
  }, [radiusKm]);

  const suggestionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionReqId = useRef(0);
  const nearbyReqId = useRef(0);

  // Clear debounce timer and invalidate in-flight suggestions on unmount.
  useEffect(() => {
    return () => {
      suggestionReqId.current += 1;
      if (suggestionDebounce.current) {
        clearTimeout(suggestionDebounce.current);
      }
    };
  }, []);

  const curatedMap = useMemo(
    () => new Map(DIASPORA_TEMPLES.map((t) => [`curated:${t.id}`, t.name])),
    []
  );

  const getPlaceDisplayName = useCallback(
    (placeId: string, placeSummary?: TirthaPlaceSummary | null): string => {
      if (placeSummary?.name) return placeSummary.name;
      if (curatedMap.has(placeId)) return curatedMap.get(placeId)!;
      const localMatch = temples.find((t) => t.id === placeId);
      if (localMatch?.name) return localMatch.name;
      return placeId;
    },
    [curatedMap, temples]
  );

  const refreshPassport = useCallback(async (userId: string) => {
    try {
      const [savesResult, visitsResult] = await Promise.all([
        supabase
          .from('tirtha_saves')
          .select('id, place_id, created_at, note, place:tirtha_places(id, name, tradition, address)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('tirtha_checkins')
          .select('id, place_id, visited_at, privacy, darshan_mood, intention, place:tirtha_places(id, name, tradition, address)')
          .eq('user_id', userId)
          .order('visited_at', { ascending: false }),
      ]);

      setSavedPlaces((savesResult.data as unknown as TirthaSaveRow[] | null) ?? []);
      setVisits((visitsResult.data as unknown as TirthaVisitRow[] | null) ?? []);
    } catch {
      // Passport refresh failure shouldn't crash screen
    }
  }, []);

  // loadNearby accepts radius as an explicit parameter so its identity
  // does not change when radiusKm state updates.
  const loadNearby = useCallback(async (lat: number, lon: number, radiusKmOverride?: number) => {
    const effectiveRadiusKm = radiusKmOverride ?? radiusKmRef.current;
    const radiusMetres = effectiveRadiusKm * 1000;
    const reqId = ++nearbyReqId.current;

    const curated: Temple[] = getCuratedNearbyTemples(lat, lon, radiusMetres).map((temple) => ({
      id: `curated:${temple.id}`,
      lat: temple.lat,
      lon: temple.lon,
      name: temple.name,
      tradition: temple.tradition,
      deity: temple.deity,
      address: temple.address,
      website: temple.website,
      opening: temple.opening,
      sampradaya: temple.sampradaya,
      verified: true,
    }));

    let osm: Temple[] = [];
    try {
      const res = await apiFetch(`/api/tirtha/places?lat=${lat}&lon=${lon}&radius=${radiusMetres}`);
      if (res.ok) {
        const json = (await res.json()) as { elements?: any[] };
        if (json.elements?.length) {
          osm = json.elements
            .filter((el: any) => !el._curated)
            .map((el: any) => {
              const tradition = inferTradition(el.tags ?? {});
              const defaultName = TRADITION_DEFAULT_NAMES[tradition];
              const type = el.type ?? 'node';
              const rawId = el.id;
              const osmId = String(rawId).startsWith('osm:') ? String(rawId) : `osm:${type}:${rawId}`;
              return {
                id: osmId,
                lat: el.lat ?? el.center?.lat ?? 0,
                lon: el.lon ?? el.center?.lon ?? 0,
                tradition,
                name:
                  el.tags?.name ||
                  el.tags?.['name:en'] ||
                  el.tags?.['name:hi'] ||
                  el.tags?.['name:pa'] ||
                  el.tags?.['name:sa'] ||
                  defaultName,
                deity: el.tags?.['hindu:deity'] || el.tags?.deity,
                address:
                  [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']]
                    .filter(Boolean)
                    .join(', ') || undefined,
                website: el.tags?.website,
                phone: el.tags?.phone,
                opening: el.tags?.opening_hours,
                sampradaya: el.tags?.denomination,
              } satisfies Temple;
            })
            .filter((temple: Temple) => temple.lat !== 0 && temple.lon !== 0);
        }
      }
    } catch {
      if (!curated.length) {
        setNotice('Could not load live temple data. Try city search.');
      }
    }

    // Drop stale responses if a newer request completed first
    if (reqId !== nearbyReqId.current) return;

    const merged = mergeCuratedAndOsm(curated, osm);
    merged.sort((a, b) => distanceKm(lat, lon, a.lat, a.lon) - distanceKm(lat, lon, b.lat, b.lon));
    setTemples(merged);

    // Reframe map to fit coordinates when results are loaded
    if (merged.length >= 2) {
      mapRef.current?.fitToCoordinates(
        [{ latitude: lat, longitude: lon }, ...merged.map((t) => ({ latitude: t.lat, longitude: t.lon }))],
        {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        }
      );
    } else if (merged.length === 1) {
      const latDelta = Math.max(0.04, (effectiveRadiusKm / 111) * 1.5);
      mapRef.current?.animateToRegion({
        latitude: merged[0].lat,
        longitude: merged[0].lon,
        latitudeDelta: latDelta,
        longitudeDelta: latDelta,
      });
    }
  }, []);

  const initialize = useCallback(
    async (pull = false) => {
      if (pull) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const locationChain = async () => {
          const permission = await Location.getForegroundPermissionsAsync();
          const granted = permission.status === 'granted';
          setPermissionGranted(granted);
          setLocationBlocked(!granted && !permission.canAskAgain);

          if (granted) {
            try {
              const current = await Location.getCurrentPositionAsync({});
              const nextRegion = {
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
                latitudeDelta: 0.18,
                longitudeDelta: 0.18,
              };
              setUserCoords({ lat: current.coords.latitude, lon: current.coords.longitude });
              setRegion(nextRegion);
              setNotice('');
              mapRef.current?.animateToRegion(nextRegion);
              await loadNearby(current.coords.latitude, current.coords.longitude, radiusKmRef.current);
            } catch {
              if (!pull) {
                setUserCoords(null);
                setTemples([]);
              }
              setNotice('Could not get your exact location. Search a city or try again.');
            }
          } else if (!pull) {
            setUserCoords(null);
            setTemples([]);
            setNotice(
              permission.canAskAgain
                ? 'Use your location or search a city to find nearby sacred places.'
                : 'Location access is off. Search a city or enable it in Settings.'
            );
          }
        };

        await Promise.all([user ? refreshPassport(user.id) : Promise.resolve(), locationChain()]);
      } catch {
        setNotice('Could not load Tirtha right now. Check your connection and try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadNearby, refreshPassport]
  );

  const requestLocation = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        setPermissionGranted(true);
        setLocationBlocked(false);
        const current = await Location.getCurrentPositionAsync({});
        const nextRegion = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        };
        setUserCoords({ lat: current.coords.latitude, lon: current.coords.longitude });
        setRegion(nextRegion);
        setNotice('');
        mapRef.current?.animateToRegion(nextRegion);
        await loadNearby(current.coords.latitude, current.coords.longitude, radiusKmRef.current);
      } else {
        setPermissionGranted(false);
        setLocationBlocked(!permission.canAskAgain);
        setNotice(
          permission.canAskAgain
            ? 'Location permission denied. Search a city or try again.'
            : 'Location access is off for Shoonaya.'
        );
      }
    } catch {
      setNotice('Could not get your exact location right now. Try again, or search a city.');
    } finally {
      setLoading(false);
    }
  }, [loadNearby]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const savedIds = useMemo(() => new Set(savedPlaces.map((row) => row.place_id)), [savedPlaces]);

  const toggleSave = useCallback(
    async (temple: Temple) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setNotice('Sign in to save places.');
          return;
        }

        const placeId = tirthaPlaceId(temple);
        const exists = savedIds.has(placeId);
        if (exists) {
          const saveResponse = await apiFetch('/api/tirtha/save', {
            method: 'POST',
            body: JSON.stringify({ place_id: placeId, action: 'unsave' }),
          });
          if (!saveResponse.ok) {
            setNotice('Could not remove this place.');
            return;
          }
        } else {
          const placeResponse = await apiFetch('/api/tirtha/place', {
            method: 'POST',
            body: JSON.stringify(templeToPlaceRow(temple)),
          });
          if (!placeResponse.ok) {
            setNotice('Could not save this place.');
            return;
          }
          const saveResponse = await apiFetch('/api/tirtha/save', {
            method: 'POST',
            body: JSON.stringify({ place_id: placeId, action: 'save' }),
          });
          if (!saveResponse.ok) {
            setNotice('Could not save this place.');
            return;
          }
        }

        await refreshPassport(user.id);
      } catch {
        setNotice('Could not save this place. Check your connection.');
      }
    },
    [refreshPassport, savedIds]
  );

  const submitCheckIn = useCallback(async () => {
    if (!selectedTemple) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotice('Sign in to save a visit.');
        return;
      }

      setSubmitting(true);
      const placeId = tirthaPlaceId(selectedTemple);
      const placeResponse = await apiFetch('/api/tirtha/place', {
        method: 'POST',
        body: JSON.stringify(templeToPlaceRow(selectedTemple)),
      });
      if (!placeResponse.ok) {
        setNotice('Could not save this place.');
        return;
      }
      const checkinResponse = await apiFetch('/api/tirtha/checkin', {
        method: 'POST',
        body: JSON.stringify({
          place_id: placeId,
          privacy: community ? 'public' : 'private',
          darshan_mood: checkinMood,
          intention: intention.trim() || null,
        }),
      });

      if (checkinResponse.ok) {
        await refreshPassport(user.id);
        setSelectedTemple(null);
        setIntention('');
        setCommunity(false);
        setCheckinMood('gratitude');
        setNotice('Visit saved to your Tirtha Passport.');
      } else {
        setNotice('Could not save check-in.');
      }
    } catch {
      setNotice('Could not save visit. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  }, [checkinMood, community, intention, refreshPassport, selectedTemple]);

  const searchCity = useCallback(async () => {
    if (!cityQuery.trim()) return;
    suggestionReqId.current += 1;
    if (suggestionDebounce.current) clearTimeout(suggestionDebounce.current);
    setSuggestions([]);
    setSuggestionsLoading(false);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/tirtha/geocode?q=${encodeURIComponent(cityQuery.trim())}&limit=1`);
      if (!res.ok) {
        setNotice(`Could not find "${cityQuery}".`);
        setLoading(false);
        return;
      }

      const found = (await res.json()) as { lat: number; lon: number };
      const nextRegion = {
        latitude: found.lat,
        longitude: found.lon,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      };
      setUserCoords({ lat: found.lat, lon: found.lon });
      setRegion(nextRegion);
      setNotice('');
      mapRef.current?.animateToRegion(nextRegion);
      await loadNearby(found.lat, found.lon, radiusKmRef.current);
    } catch {
      setNotice(`Could not search "${cityQuery}". Check connection.`);
    } finally {
      setLoading(false);
    }
  }, [cityQuery, loadNearby]);

  const selectSuggestion = useCallback(
    async (suggestion: CitySuggestion) => {
      setSuggestions([]);
      suggestionReqId.current += 1;
      setCityQuery(suggestion.label.split(',')[0]?.trim() ?? suggestion.label);
      setLoading(true);
      try {
        const nextRegion = {
          latitude: suggestion.lat,
          longitude: suggestion.lon,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        };
        setUserCoords({ lat: suggestion.lat, lon: suggestion.lon });
        setRegion(nextRegion);
        setNotice('');
        mapRef.current?.animateToRegion(nextRegion);
        await loadNearby(suggestion.lat, suggestion.lon, radiusKmRef.current);
      } catch {
        setNotice(`Could not search "${suggestion.label}". Check connection.`);
      } finally {
        setLoading(false);
      }
    },
    [loadNearby]
  );

  const onCityQueryChange = useCallback((value: string) => {
    const reqId = ++suggestionReqId.current;
    setCityQuery(value);
    if (suggestionDebounce.current) clearTimeout(suggestionDebounce.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    suggestionDebounce.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/tirtha/geocode?q=${encodeURIComponent(value.trim())}&limit=5`);
        if (reqId !== suggestionReqId.current) return;
        if (res.ok) {
          const results = (await res.json()) as CitySuggestion[];
          setSuggestions(Array.isArray(results) ? results : []);
        } else {
          setSuggestions([]);
        }
      } catch {
        if (reqId === suggestionReqId.current) {
          setSuggestions([]);
        }
      } finally {
        if (reqId === suggestionReqId.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 400);
  }, []);

  const changeRadius = useCallback(
    (km: number) => {
      setRadiusKm(km);
      if (userCoords) {
        setLoading(true);
        void loadNearby(userCoords.lat, userCoords.lon, km).finally(() => setLoading(false));
      }
    },
    [userCoords, loadNearby]
  );

  const focusTempleOnMap = useCallback((temple: Temple) => {
    mapRef.current?.animateToRegion({
      latitude: temple.lat,
      longitude: temple.lon,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  }, []);

  const filteredTemples = useMemo(
    () => (traditionFilter === 'all' ? temples : temples.filter((t) => t.tradition === traditionFilter)),
    [temples, traditionFilter]
  );

  return (
    <Screen style={{ backgroundColor: bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void initialize(true)} tintColor={brand} />
        }
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + NAV_BAR_CLEARANCE }}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
      >
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
          <BackButton fallbackHref="/(tabs)" handleHardwareBack />
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 30, color: text }}>Tirtha</Text>

          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel="Open Live Darshan"
            onPress={() => router.push('/live-darshan')}
            style={{
              borderRadius: 18,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <IconTile name="live-darshan" fallbackGlyph="radio" size="md" color={brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>Live Darshan</Text>
              <Text style={{ marginTop: 2, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                Watch sacred places live, on YouTube
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={dim} />
          </PressableSurface>

          <View
            style={{
              borderRadius: 24,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 6,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {([
              ['map', 'Nearby'],
              ['passport', 'Passport'],
            ] as const).map(([key, label]) => {
              const active = passportTab === key;
              return (
                <PressableSurface
                  key={key}
                  onPress={() => setPassportTab(key)}
                  haptic="selection"
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    backgroundColor: active ? cardBg : 'transparent',
                    paddingVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: active ? brand : dim }}>
                    {label}
                  </Text>
                </PressableSurface>
              );
            })}
          </View>
        </View>

        {passportTab === 'map' ? (
          <View style={{ gap: 16 }}>
            <View style={{ paddingHorizontal: 20, marginTop: 4, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: inputBg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                  }}
                >
                  <Feather name="search" size={16} color={dim} />
                  <TextInput
                    value={cityQuery}
                    onChangeText={onCityQueryChange}
                    onSubmitEditing={() => void searchCity()}
                    returnKeyType="search"
                    placeholder="Search city, country"
                    placeholderTextColor={dim}
                    textAlignVertical="center"
                    style={{
                      flex: 1,
                      height: 48,
                      paddingLeft: 10,
                      color: text,
                      fontFamily: FONTS.sans,
                      fontSize: 14,
                      lineHeight: 18,
                      includeFontPadding: false,
                    }}
                  />
                  {suggestionsLoading ? (
                    <ActivityIndicator size="small" color={brand} />
                  ) : (
                    <PressableSurface
                      onPress={() => void searchCity()}
                      haptic="selection"
                      hitSlop={8}
                      style={{ alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: brand }}>Search</Text>
                    </PressableSurface>
                  )}
                </View>
                <PressableSurface
                  accessibilityLabel="Use my current location"
                  onPress={() => void requestLocation()}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 18,
                    backgroundColor: permissionGranted ? cardBg : brand,
                    borderWidth: permissionGranted ? 1 : 0,
                    borderColor: border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="navigation" size={20} color={permissionGranted ? brand : textOnBrand} />
                </PressableSurface>
              </View>

              {/* Autocomplete dropdown via server-side cached geocode route */}
              {suggestions.length > 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: cardBg,
                    overflow: 'hidden',
                  }}
                >
                  {suggestions.map((suggestion, i) => (
                    <PressableSurface
                      key={`${suggestion.lat}-${suggestion.lon}-${i}`}
                      onPress={() => void selectSuggestion(suggestion)}
                      haptic="selection"
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Feather name="map-pin" size={14} color={dim} />
                      <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: text }} numberOfLines={1}>
                        {suggestion.label}
                      </Text>
                    </PressableSurface>
                  ))}
                </View>
              ) : null}

              {!permissionGranted && !userCoords && !notice ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                  Search a city, or enable location to find places near you.
                </Text>
              ) : null}
              {notice ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>{notice}</Text>
                  {locationBlocked ? (
                    <PressableSurface
                      onPress={() => void Linking.openSettings()}
                      haptic="selection"
                      hitSlop={8}
                      style={{ alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>
                        Open Settings
                      </Text>
                    </PressableSurface>
                  ) : null}
                </View>
              ) : null}

              {/* Radius + tradition filters with MIN_TOUCH_TARGET and high contrast text */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RADIUS_OPTIONS_KM.map((km) => {
                  const active = radiusKm === km;
                  return (
                    <PressableSurface
                      key={km}
                      onPress={() => changeRadius(km)}
                      haptic="selection"
                      style={{
                        borderRadius: RADII.pill,
                        borderWidth: 1,
                        borderColor: active ? brand : border,
                        backgroundColor: active ? brand : 'transparent',
                        paddingHorizontal: 16,
                        minHeight: MIN_TOUCH_TARGET,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ ...TYPE.chip, color: active ? textOnBrand : dim }}>{km} km</Text>
                    </PressableSurface>
                  );
                })}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {TRADITION_FILTERS.map(({ key, label }) => {
                  const active = traditionFilter === key;
                  return (
                    <PressableSurface
                      key={key}
                      onPress={() => setTraditionFilter(key)}
                      haptic="selection"
                      style={{
                        borderRadius: RADII.pill,
                        borderWidth: 1,
                        borderColor: active ? brand : border,
                        backgroundColor: active ? brand : 'transparent',
                        paddingHorizontal: 16,
                        minHeight: MIN_TOUCH_TARGET,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ ...TYPE.chip, color: active ? textOnBrand : dim }}>{label}</Text>
                    </PressableSurface>
                  );
                })}
              </ScrollView>
            </View>

            <View
              style={{
                height: 320,
                marginHorizontal: 20,
                borderRadius: 26,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: border,
              }}
            >
              {userCoords ? (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_DEFAULT}
                  style={{ flex: 1 }}
                  initialRegion={region}
                  region={region}
                  onRegionChangeComplete={setRegion}
                  showsUserLocation={permissionGranted}
                >
                  {filteredTemples.map((temple) => (
                    <Marker
                      key={`${temple.id}-${temple.lat}-${temple.lon}`}
                      coordinate={{ latitude: temple.lat, longitude: temple.lon }}
                      title={temple.name}
                      description={temple.address}
                      pinColor={brand}
                    />
                  ))}
                </MapView>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 }}>
                  <Feather name="map-pin" size={28} color={brand} />
                  <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: text, textAlign: 'center' }}>
                    Choose a location
                  </Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19, color: dim, textAlign: 'center' }}>
                    Search a city or use your current location to see sacred places nearby.
                  </Text>
                </View>
              )}
              {loading ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.bottomSheetScrim,
                  }}
                >
                  <ActivityIndicator color={brand} />
                </View>
              ) : null}
            </View>

            {loading && temples.length === 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              >
                {[0, 1, 2].map((i) => (
                  <SkeletonCard key={i} style={{ width: 286, height: 168 }} />
                ))}
              </ScrollView>
            ) : !loading && !userCoords ? null : !loading && filteredTemples.length === 0 ? (
              <View style={{ paddingHorizontal: 20 }}>
                <EmptyState
                  icon="map-pin"
                  title={
                    temples.length === 0 && !userCoords
                      ? 'Choose a location'
                      : temples.length === 0
                        ? 'Nothing found nearby'
                        : 'None match this filter'
                  }
                  subtitle={
                    temples.length === 0 && !userCoords
                      ? 'Search a city or use your current location to begin.'
                      : temples.length === 0
                      ? `No temples, gurudwaras, or centres turned up within ${radiusKm} km. Try a wider radius or a city search.`
                      : 'Try a different tradition, or widen the search radius.'
                  }
                  ctaLabel={
                    temples.length === 0 && userCoords && radiusKm !== RADIUS_OPTIONS_KM[RADIUS_OPTIONS_KM.length - 1]
                      ? 'Widen search'
                      : undefined
                  }
                  onCta={
                    temples.length === 0 && userCoords
                      ? () => changeRadius(RADIUS_OPTIONS_KM[RADIUS_OPTIONS_KM.length - 1])
                      : undefined
                  }
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              >
                {filteredTemples.map((temple) => (
                  <View key={`card-${temple.id}`} style={{ width: 286 }}>
                    <TempleCard
                      temple={temple}
                      distanceLabel={userCoords ? formatDistance(userCoords, temple) : 'Nearby'}
                      saved={savedIds.has(tirthaPlaceId(temple))}
                      onSave={() => void toggleSave(temple)}
                      onCheckIn={() => setSelectedTemple(temple)}
                      onFocusMap={() => focusTempleOnMap(temple)}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 12, gap: 20 }}>
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: cardBg,
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>Saved places</Text>
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 28, color: text }}>{savedPlaces.length}</Text>
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>Visits</Text>
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 28, color: text }}>{visits.length}</Text>
              </View>
            </View>

            {/* Saved Places List */}
            <View style={{ gap: 10 }}>
              <Text style={{ ...TYPE.section, color: text }}>Saved Places</Text>
              {savedPlaces.map((save) => {
                const displayName = getPlaceDisplayName(save.place_id, save.place);
                return (
                  <View
                    key={save.id}
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: border,
                      backgroundColor: cardBg,
                      padding: 16,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>{displayName}</Text>
                    {save.place?.address ? (
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }} numberOfLines={1}>
                        {save.place.address}
                      </Text>
                    ) : null}
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: dim }}>
                      Saved {new Date(save.created_at).toLocaleDateString('en-GB')}
                    </Text>
                  </View>
                );
              })}
              {savedPlaces.length === 0 ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: cardBg,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, textAlign: 'center' }}>
                    No saved places yet. Tap the bookmark icon on any temple card to save it.
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Visits List */}
            <View style={{ gap: 10 }}>
              <Text style={{ ...TYPE.section, color: text }}>Visits & Darshan</Text>
              {visits.map((visit) => {
                const displayName = getPlaceDisplayName(visit.place_id, visit.place);
                return (
                  <View
                    key={visit.id}
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: border,
                      backgroundColor: cardBg,
                      padding: 16,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>{displayName}</Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                      {new Date(visit.visited_at).toLocaleString('en-GB')} · {visit.darshan_mood ?? 'visit'}
                    </Text>
                    {visit.intention ? (
                      <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: text }}>{visit.intention}</Text>
                    ) : null}
                  </View>
                );
              })}
              {visits.length === 0 ? (
                <EmptyState
                  icon="map-pin"
                  title="No visits yet"
                  subtitle="Check in at nearby temples to log your darshan."
                  ctaLabel="Find nearby temples"
                  onCta={() => setPassportTab('map')}
                />
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        visible={Boolean(selectedTemple)}
        animationType="slide"
        onRequestClose={() => setSelectedTemple(null)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              paddingTop: 22,
              paddingHorizontal: 22,
              paddingBottom: Math.max(22, insets.bottom + 12),
              gap: 14,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>
            <Text style={{ ...TYPE.metric, color: text }}>
              {selectedTemple?.name ?? 'Temple check-in'}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {TIRTHA_MOODS.map((mood) => (
                <PressableSurface
                  key={mood.key}
                  onPress={() => setCheckinMood(mood.key)}
                  haptic="selection"
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: checkinMood === mood.key ? brand : border,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    minHeight: MIN_TOUCH_TARGET,
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.sansMedium,
                      fontSize: 12,
                      color: checkinMood === mood.key ? brand : dim,
                    }}
                  >
                    {mood.label}
                  </Text>
                </PressableSurface>
              ))}
            </View>

            <TextInput
              value={intention}
              onChangeText={setIntention}
              placeholder="Intention for this visit"
              placeholderTextColor={dim}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: inputBg,
                paddingHorizontal: 14,
                paddingVertical: 14,
                color: text,
                fontFamily: FONTS.sans,
                fontSize: 14,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: text }}>Share with community</Text>
              <Switch value={community} onValueChange={setCommunity} />
            </View>

            <PressableSurface
              onPress={() => void submitCheckIn()}
              disabled={submitting}
              style={{
                borderRadius: 18,
                backgroundColor: brand,
                minHeight: MIN_TOUCH_TARGET,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: textOnBrand }}>
                {submitting ? 'Saving…' : 'Save visit'}
              </Text>
            </PressableSurface>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
