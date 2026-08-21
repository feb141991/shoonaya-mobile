import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Location from 'expo-location';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';
import { fetchNearbyMandalis, forwardGeocode, joinExistingMandali, joinMandaliForLocation, reverseGeocode, type NearbyMandali } from '@/lib/mandali';

const LOCATION_TIMEOUT_MS = 10000;
const CACHED_LOCATION_MAX_AGE_MS = 2 * 60 * 1000;

async function getFreshPositionWithTimeout(): Promise<Location.LocationObject> {
  let settled = false;
  let subscription: Location.LocationSubscription | null = null;
  return new Promise<Location.LocationObject>((resolve, reject) => {
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      subscription?.remove();
      clearTimeout(timeout);
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error('Location lookup timed out')));
    }, LOCATION_TIMEOUT_MS);

    void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      .then((location) => finish(() => resolve(location)))
      .catch(() => {});

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (location) => {
        finish(() => resolve(location));
      }
    )
      .then((sub) => {
        if (settled) {
          sub.remove();
          return;
        }
        subscription = sub;
      })
      .catch((error) => finish(() => reject(error)));
  });
}

async function getPositionWithFallback() {
  try {
    return await getFreshPositionWithTimeout();
  } catch (error) {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: CACHED_LOCATION_MAX_AGE_MS,
    });
    if (lastKnown) return lastKnown;
    throw error;
  }
}

async function reverseGeocodeWithNativeFallback(lat: number, lon: number): Promise<{ city: string; country: string } | null> {
  try {
    const geocoded = await reverseGeocode(lat, lon);
    if (geocoded?.city) return geocoded;
  } catch (error) {
    console.error('[JoinMandaliPrompt] reverseGeocode proxy failed', error);
  }

  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const city = place?.city || place?.district || place?.subregion || place?.region || '';
    const country = place?.country || '';
    if (city) return { city, country };
  } catch (error) {
    console.error('[JoinMandaliPrompt] native reverseGeocode failed', error);
  }

  return null;
}

// Port of PWA's NoMandaliPrompt (src/app/(main)/mandali/MandaliClient.tsx
// lines ~453-830): GPS-detect city → reverse-geocode via the shared web
// proxy → show nearby existing Mandalis (join by id) alongside a "find/
// create my Mandali" primary action, with a manual city/country fallback
// for when location permission is denied. Uses expo-location's
// permission flow already established in app/(tabs)/tirtha.tsx.
export function JoinMandaliPrompt({
  userId,
  text,
  dim,
  border,
  surface,
  brand,
  cardBg,
  onJoined,
}: {
  userId: string;
  text: string;
  dim: string;
  border: string;
  surface: string;
  brand: string;
  cardBg: string;
  onJoined: () => void | Promise<void>;
}) {
  const [locating, setLocating] = useState(false);
  const [detected, setDetected] = useState<{ city: string; country: string; lat?: number; lon?: number } | null>(null);
  const [manualCity, setManualCity] = useState('');
  const [manualCountry, setManualCountry] = useState('');
  const [resolvingManualLocation, setResolvingManualLocation] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [nearby, setNearby] = useState<NearbyMandali[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joiningMine, setJoiningMine] = useState(false);

  const loadNearby = async (lat: number, lon: number) => {
    setLoadingNearby(true);
    try {
      setNearby(await fetchNearbyMandalis(lat, lon));
    } catch (error) {
      console.error('[JoinMandaliPrompt] fetchNearbyMandalis failed', error);
      setNearby([]);
    } finally {
      setLoadingNearby(false);
    }
  };

  const detectLocation = async () => {
    setLocating(true);
    setGeoError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setGeoError('Location permission denied. Enter your city below instead.');
        return;
      }
      const current = await getPositionWithFallback();
      const { latitude: lat, longitude: lon } = current.coords;
      const geocoded = await reverseGeocodeWithNativeFallback(lat, lon);
      if (!geocoded?.city) {
        setGeoError('Could not detect your city. Please try again or enter it below.');
        return;
      }
      setDetected({ city: geocoded.city, country: geocoded.country, lat, lon });
      await loadNearby(lat, lon);
    } catch (error) {
      console.error('[JoinMandaliPrompt] detectLocation failed', error);
      setGeoError('Location lookup failed. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const useManualCity = async () => {
    if (!manualCity.trim()) {
      setGeoError('Enter a city first.');
      return;
    }
    if (!manualCountry.trim()) {
      setGeoError('Enter a country too, so we can create the right Mandali.');
      return;
    }
    setGeoError('');
    const city = manualCity.trim();
    const country = manualCountry.trim();

    // Resolve approximate coordinates for the typed city too — previously
    // manual entry only ever saved city/country text, leaving
    // latitude/longitude permanently null on the profile (breaking Seekers
    // Near You and any other distance-based Mandali feature for anyone who
    // used this path instead of GPS detection). A failed lookup here isn't
    // fatal — city/country alone is still enough to join a Mandali, exactly
    // as before this existed.
    setResolvingManualLocation(true);
    try {
      const coords = await forwardGeocode(`${city}, ${country}`);
      setDetected({ city, country, lat: coords?.lat, lon: coords?.lon });
      if (coords) {
        await loadNearby(coords.lat, coords.lon);
      } else {
        setNearby([]);
      }
    } finally {
      setResolvingManualLocation(false);
    }
  };

  const joinMine = async () => {
    if (!detected?.city) return;
    if (!detected.country.trim()) {
      setGeoError('Country is required to join your Mandali. Add it below and try again.');
      return;
    }
    setJoiningMine(true);
    try {
      await joinMandaliForLocation(userId, detected.city, detected.country, detected.lat, detected.lon);
      await onJoined();
    } catch (error) {
      console.error('[JoinMandaliPrompt] joinMandaliForLocation failed', error);
      setGeoError('Could not join your Mandali right now. Please try again.');
    } finally {
      setJoiningMine(false);
    }
  };

  const joinById = async (mandaliId: string) => {
    setJoiningId(mandaliId);
    try {
      await joinExistingMandali(mandaliId, detected);
      await onJoined();
    } catch (error) {
      console.error('[JoinMandaliPrompt] joinExistingMandali failed', error);
      setGeoError('Could not join that Mandali right now. Please try again.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <View style={{ gap: 14, backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 24, padding: 18 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 19, color: text }}>Find your Mandali</Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19, color: dim }}>
          We&apos;ll place you in your city&apos;s Sanatani Mandali. If your city is new, your Mandali opens quietly when you join.
        </Text>
      </View>

      {detected ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: surface }}>
          <Feather name="map-pin" size={16} color={brand} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: text }}>{detected.city}</Text>
            {detected.country ? <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>{detected.country}</Text> : null}
          </View>
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Clear detected city"
            hitSlop={10}
            onPress={() => {
              setDetected(null);
              setNearby([]);
            }}
            style={{ minHeight: 0 }}
          >
            <Feather name="x" size={16} color={dim} />
          </PressableSurface>
        </View>
      ) : (
        <PressableSurface
          onPress={() => void detectLocation()}
          disabled={locating}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: 16,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: brand,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: locating ? 0.7 : 1,
          }}
        >
          {locating ? (
            <ActivityIndicator color={brand} />
          ) : (
            <>
              <Feather name="navigation" size={16} color={brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: brand }}>Detect my location</Text>
            </>
          )}
        </PressableSurface>
      )}

      {!detected ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: dim, textAlign: 'center' }}>
            or enter your city
          </Text>
          <TextInput
            value={manualCity}
            onChangeText={setManualCity}
            placeholder="City"
            placeholderTextColor={dim}
            style={{ borderRadius: 14, borderWidth: 1, borderColor: border, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 14, color: text }}
          />
          <TextInput
            value={manualCountry}
            onChangeText={setManualCountry}
            placeholder="Country"
            placeholderTextColor={dim}
            style={{ borderRadius: 14, borderWidth: 1, borderColor: border, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.sans, fontSize: 14, color: text }}
          />
          <PressableSurface
            haptic="selection"
            onPress={() => void useManualCity()}
            disabled={resolvingManualLocation}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: surface,
              borderWidth: 1,
              borderColor: border,
              minHeight: 0,
              opacity: resolvingManualLocation ? 0.7 : 1,
            }}
          >
            {resolvingManualLocation ? <ActivityIndicator size="small" color={brand} /> : null}
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12.5, color: text }}>
              {resolvingManualLocation ? 'Finding your city…' : 'Use this city'}
            </Text>
          </PressableSurface>
        </View>
      ) : null}

      {geoError ? <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.danger, textAlign: 'center' }}>{geoError}</Text> : null}

      {detected ? (
        <>
          <PressableSurface
            onPress={() => void joinMine()}
            disabled={joiningMine}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: 16,
              backgroundColor: brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: joiningMine ? 0.7 : 1,
            }}
          >
            {joiningMine ? (
              <ActivityIndicator color={COLORS.ink} />
            ) : (
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14.5, color: COLORS.ink }}>Join {detected.city} Mandali</Text>
            )}
          </PressableSurface>

          {loadingNearby ? (
            <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, textAlign: 'center' }}>Finding nearby mandalis…</Text>
          ) : nearby.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: dim }}>
                Mandalis near you
              </Text>
              {nearby.slice(0, 5).map((m) => (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: surface }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13.5, color: text }}>{m.name || `${m.city} Mandali`}</Text>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 11.5, color: dim }}>
                      {m.city}{m.distanceKm != null ? ` · ${Math.round(m.distanceKm)} km away` : ''} · {m.member_count} members
                    </Text>
                  </View>
                  <PressableSurface
                    haptic="selection"
                    onPress={() => void joinById(m.id)}
                    disabled={joiningId === m.id}
                    style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: cardBg, borderWidth: 1, borderColor: border, minHeight: 0 }}
                  >
                    {joiningId === m.id ? <ActivityIndicator size="small" color={brand} /> : <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: brand }}>Join</Text>}
                  </PressableSurface>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
