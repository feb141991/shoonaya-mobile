import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, type Region } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { TempleCard } from '@/components/tirtha/TempleCard';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, FONTS } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { DIASPORA_TEMPLES, getCuratedNearbyTemples } from '@/lib/diaspora-temples';
import { distanceKm, fetchNearbyTemples, geocodeCity, mergeCuratedAndOsm, type Temple } from '@/lib/overpass';
import { supabase } from '@/lib/supabase';

type PassportTab = 'map' | 'passport';
type MoodKey = 'gratitude' | 'devotion' | 'peace' | 'clarity';
type TirthaSaveRow = {
  id: string;
  place_id: string;
  created_at: string;
  note: string | null;
};
type TirthaVisitRow = {
  id: string;
  place_id: string;
  visited_at: string;
  privacy: 'private' | 'family' | 'mandali' | 'public' | string;
  darshan_mood: string | null;
  intention: string | null;
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

function tirthaPlaceId(temple: Temple) {
  return `overpass:${temple.id}`;
}

function templeToPlaceRow(temple: Temple) {
  return {
    id: tirthaPlaceId(temple),
    source: 'overpass',
    source_id: String(temple.id),
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
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const inputBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

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

  const refreshPassport = useCallback(async (userId: string) => {
    const [savesResult, visitsResult] = await Promise.all([
      supabase.from('tirtha_saves').select('id, place_id, created_at, note').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase
        .from('tirtha_checkins')
        .select('id, place_id, visited_at, privacy, darshan_mood, intention')
        .eq('user_id', userId)
        .order('visited_at', { ascending: false }),
    ]);

    setSavedPlaces((savesResult.data as TirthaSaveRow[] | null) ?? []);
    setVisits((visitsResult.data as TirthaVisitRow[] | null) ?? []);
  }, []);

  const loadNearby = useCallback(async (lat: number, lon: number) => {
    const curated = getCuratedNearbyTemples(lat, lon, 10000).map((temple) => ({
      id: Number.parseInt(temple.id.replace(/[^0-9]/g, '').slice(0, 8) || '0', 10),
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
    })) satisfies Temple[];

    let osm: Temple[] = [];
    try {
      osm = await fetchNearbyTemples(lat, lon, 10000);
    } catch {
      if (!curated.length) {
        setNotice('Could not load live temple data. Try city search.');
      }
    }

    setTemples(mergeCuratedAndOsm(curated, osm));
  }, []);

  const initialize = useCallback(async (pull = false) => {
    if (pull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await refreshPassport(user.id);
    }

    const permission = await Location.getForegroundPermissionsAsync();
    const granted = permission.status === 'granted';
    setPermissionGranted(granted);

    if (granted) {
      const current = await Location.getCurrentPositionAsync({});
      const nextRegion = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      };
      setUserCoords({ lat: current.coords.latitude, lon: current.coords.longitude });
      setRegion(nextRegion);
      await loadNearby(current.coords.latitude, current.coords.longitude);
      mapRef.current?.animateToRegion(nextRegion);
    } else {
      const fallbackLat = DEFAULT_REGION.latitude;
      const fallbackLon = DEFAULT_REGION.longitude;
      setUserCoords({ lat: fallbackLat, lon: fallbackLon });
      await loadNearby(fallbackLat, fallbackLon);
    }

    setLoading(false);
    setRefreshing(false);
  }, [loadNearby, refreshPassport]);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status === 'granted') {
      setPermissionGranted(true);
      const current = await Location.getCurrentPositionAsync({});
      const nextRegion = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      };
      setUserCoords({ lat: current.coords.latitude, lon: current.coords.longitude });
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion);
      await loadNearby(current.coords.latitude, current.coords.longitude);
    } else {
      setNotice('Location permission denied. Please search a city.');
    }
    setLoading(false);
  }, [loadNearby]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const savedIds = useMemo(() => new Set(savedPlaces.map((row) => row.place_id)), [savedPlaces]);
  const visitedIds = useMemo(() => new Set(visits.map((row) => row.place_id)), [visits]);

  const toggleSave = useCallback(
    async (temple: Temple) => {
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
    },
    [refreshPassport, savedIds]
  );

  const submitCheckIn = useCallback(async () => {
    if (!selectedTemple) return;

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
      setSubmitting(false);
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

    setSubmitting(false);
  }, [checkinMood, community, intention, refreshPassport, selectedTemple]);

  const searchCity = useCallback(async () => {
    if (!cityQuery.trim()) return;
    setLoading(true);
    const parts = cityQuery.split(',').map((part) => part.trim());
    const found = await geocodeCity(parts[0], parts[1] ?? '');
    if (!found) {
      setNotice(`Could not find "${cityQuery}".`);
      setLoading(false);
      return;
    }

    const nextRegion = {
      latitude: found.lat,
      longitude: found.lon,
      latitudeDelta: 0.18,
      longitudeDelta: 0.18,
    };
    setUserCoords({ lat: found.lat, lon: found.lon });
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion);
    await loadNearby(found.lat, found.lon);
    setLoading(false);
  }, [cityQuery, loadNearby]);

  return (
    <Screen style={{ backgroundColor: bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void initialize(true)} tintColor={brand} />
        }
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 36 }}
      >
        <View style={{ paddingHorizontal: 20, gap: 16 }}>
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
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
              }}
            >
              <SacredIcon name="live-darshan" fallbackGlyph="radio" size={18} color={brand} />
            </View>
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
                  <TextInput
                    value={cityQuery}
                    onChangeText={setCityQuery}
                    placeholder="Search city, country"
                    placeholderTextColor={dim}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      color: text,
                      fontFamily: FONTS.sans,
                      fontSize: 14,
                    }}
                  />
                  <PressableSurface onPress={() => void searchCity()} haptic="selection" hitSlop={8}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: brand }}>Search</Text>
                  </PressableSurface>
                </View>
                {!permissionGranted && (
                  <PressableSurface
                    onPress={() => void requestLocation()}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 18,
                      backgroundColor: brand,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="navigation" size={20} color={COLORS.ink} />
                  </PressableSurface>
                )}
              </View>

              {!permissionGranted ? (
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                  Location denied. Using city search fallback.
                </Text>
              ) : null}
              {notice ? <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>{notice}</Text> : null}
            </View>

            <View style={{ height: 320, marginHorizontal: 20, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: border }}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={{ flex: 1 }}
                initialRegion={region}
                region={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation={permissionGranted}
              >
                <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
                {temples.map((temple) => (
                  <Marker
                    key={`${temple.id}-${temple.lat}-${temple.lon}`}
                    coordinate={{ latitude: temple.lat, longitude: temple.lon }}
                    title={temple.name}
                    description={temple.address}
                    pinColor={brand}
                  />
                ))}
              </MapView>
              {loading ? (
                <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={brand} />
                </View>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {temples.map((temple) => (
                <View key={`card-${temple.id}`} style={{ width: 286 }}>
                  <TempleCard
                    temple={temple}
                    distanceLabel={userCoords ? formatDistance(userCoords, temple) : 'Nearby'}
                    saved={savedIds.has(tirthaPlaceId(temple))}
                    onSave={() => void toggleSave(temple)}
                    onCheckIn={() => setSelectedTemple(temple)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 12, gap: 16 }}>
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

            {visits.map((visit) => (
              <View
                key={visit.id}
                style={{
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: cardBg,
                  padding: 16,
                  gap: 4,
                }}
              >
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: text }}>{visit.place_id}</Text>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                  {new Date(visit.visited_at).toLocaleString('en-GB')} · {visit.darshan_mood ?? 'visit'}
                </Text>
                {visit.intention ? (
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: text }}>{visit.intention}</Text>
                ) : null}
              </View>
            ))}
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
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(selectedTemple)} animationType="slide" onRequestClose={() => setSelectedTemple(null)}>
        <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              padding: 22,
              gap: 14,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: border }} />
            </View>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 24, color: text }}>
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
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 12, color: checkinMood === mood.key ? brand : dim }}>
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
                paddingVertical: 14,
                alignItems: 'center',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: bg }}>
                {submitting ? 'Saving…' : 'Save visit'}
              </Text>
            </PressableSurface>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
