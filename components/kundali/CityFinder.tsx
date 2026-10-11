import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { formatCoordinate, resolveCoordinateTimezone, searchCities, searchLocalCitySuggestions, type CitySuggestion } from '@/lib/citySearch';
import { captureDeviceLocation } from '@/lib/locationSync';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  COLORS,
  FONTS,
  MIN_TOUCH_TARGET,
  RADII,
  SHADOWS,
  TYPE,
  themeColor,
} from '@/lib/constants';

export interface ResolvedCity {
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  label?: string;
  timezoneSource?: 'coordinates' | 'device-setting';
}

export interface CityFinderProps {
  value?: string;
  selectedCity?: ResolvedCity | null;
  onSelectCity: (city: ResolvedCity | null) => void;
  placeholder?: string;
}

const CITY_FINDER_COPY = {
  en: {
    placeholder: 'Type birth city (e.g. Varanasi, Mumbai)...',
    inputLabel: 'Birth city', searchHint: 'Search by city name, or use current device location',
    clear: 'Clear city query', clearHint: 'Clears the city search', gps: 'Use current device location',
    gpsHint: "Requests location permission and uses this device's current coordinates",
    matches: 'SELECT MATCHING CITY', timezoneWarning: 'Could not verify this location’s timezone. The device timezone is being used; please confirm before generating the chart.',
    deviceTimezone: 'Timezone from device settings; verify for this birth place.',
    permission: 'Location permission was not granted.', noPosition: 'Could not get your current location.', noCity: 'Could not determine a city for that location.',
    lookupFailed: 'Location lookup failed. Please try again.',
  },
  hi: {
    placeholder: 'जन्म-स्थान लिखें (जैसे वाराणसी, मुंबई)...',
    inputLabel: 'जन्म-स्थान', searchHint: 'शहर का नाम खोजें या वर्तमान स्थान का उपयोग करें',
    clear: 'शहर की खोज मिटाएँ', clearHint: 'शहर की खोज साफ़ करता है', gps: 'वर्तमान स्थान का उपयोग करें',
    gpsHint: 'स्थान की अनुमति लेकर वर्तमान निर्देशांक उपयोग करता है',
    matches: 'मिलता-जुलता शहर चुनें', timezoneWarning: 'इस स्थान का समय-क्षेत्र सत्यापित नहीं हो सका। डिवाइस का समय-क्षेत्र उपयोग हो रहा है; कुंडली बनाने से पहले इसकी पुष्टि करें।',
    deviceTimezone: 'समय-क्षेत्र डिवाइस सेटिंग से लिया गया है; जन्म-स्थान के लिए जाँच लें।',
    permission: 'स्थान की अनुमति नहीं मिली।', noPosition: 'वर्तमान स्थान नहीं मिल सका।', noCity: 'इस स्थान का शहर निर्धारित नहीं हो सका।',
    lookupFailed: 'स्थान खोज विफल हुई। फिर प्रयास करें।',
  },
  pa: {
    placeholder: 'ਜਨਮ-ਸਥਾਨ ਲਿਖੋ (ਜਿਵੇਂ ਵਾਰਾਣਸੀ, ਮੁੰਬਈ)...',
    inputLabel: 'ਜਨਮ-ਸਥਾਨ', searchHint: 'ਸ਼ਹਿਰ ਦਾ ਨਾਮ ਲੱਭੋ ਜਾਂ ਮੌਜੂਦਾ ਟਿਕਾਣਾ ਵਰਤੋ',
    clear: 'ਸ਼ਹਿਰ ਦੀ ਖੋਜ ਮਿਟਾਓ', clearHint: 'ਸ਼ਹਿਰ ਦੀ ਖੋਜ ਸਾਫ਼ ਕਰਦਾ ਹੈ', gps: 'ਮੌਜੂਦਾ ਟਿਕਾਣਾ ਵਰਤੋ',
    gpsHint: 'ਟਿਕਾਣੇ ਦੀ ਇਜਾਜ਼ਤ ਲੈ ਕੇ ਮੌਜੂਦਾ ਕੋਆਰਡੀਨੇਟ ਵਰਤਦਾ ਹੈ',
    matches: 'ਮਿਲਦਾ ਸ਼ਹਿਰ ਚੁਣੋ', timezoneWarning: 'ਇਸ ਟਿਕਾਣੇ ਦਾ ਸਮਾਂ-ਖੇਤਰ ਪੱਕਾ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਡਿਵਾਈਸ ਦਾ ਸਮਾਂ-ਖੇਤਰ ਵਰਤਿਆ ਜਾ ਰਿਹਾ ਹੈ; ਕੁੰਡਲੀ ਬਣਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਜਾਂਚੋ।',
    deviceTimezone: 'ਸਮਾਂ-ਖੇਤਰ ਡਿਵਾਈਸ ਸੈਟਿੰਗਾਂ ਤੋਂ ਹੈ; ਜਨਮ-ਸਥਾਨ ਲਈ ਜਾਂਚੋ।',
    permission: 'ਟਿਕਾਣੇ ਦੀ ਇਜਾਜ਼ਤ ਨਹੀਂ ਮਿਲੀ।', noPosition: 'ਤੁਹਾਡਾ ਮੌਜੂਦਾ ਟਿਕਾਣਾ ਨਹੀਂ ਮਿਲਿਆ।', noCity: 'ਇਸ ਟਿਕਾਣੇ ਦਾ ਸ਼ਹਿਰ ਪਤਾ ਨਹੀਂ ਲੱਗਿਆ।',
    lookupFailed: 'ਟਿਕਾਣਾ ਲੱਭਣ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  },
} as const;

export function CityFinder({
  value = '',
  selectedCity = null,
  onSelectCity,
  placeholder,
}: CityFinderProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { language } = useLanguage();
  const copy = CITY_FINDER_COPY[language];
  const localizedPlaceholder = placeholder ?? copy.placeholder;

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRevisionRef = useRef(0);

  // Sync external value
  useEffect(() => {
    if ((value || '') !== query) setQuery(value || '');
  }, [value, query]);

  useEffect(() => () => {
    queryRevisionRef.current += 1;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  const handleQueryChange = (text: string) => {
    const revision = ++queryRevisionRef.current;
    setLocatingGps(false);
    setQuery(text);
    setSuggestions([]);
    setShowDropdown(false);
    setLocationMessage(null);
    if (selectedCity) {
      onSelectCity(null); // Clear resolved selection if user changes text
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setLoading(false);
      return;
    }

    const localResults = searchLocalCitySuggestions(text, 6);
    setSuggestions(localResults);
    setShowDropdown(localResults.length > 0);
    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchCities(text, 6);
        if (queryRevisionRef.current !== revision) return;
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        if (queryRevisionRef.current !== revision) return;
        setSuggestions([]);
      } finally {
        if (queryRevisionRef.current === revision) setLoading(false);
      }
    }, 200);
  };

  const handleSelectSuggestion = (item: CitySuggestion) => {
    queryRevisionRef.current += 1;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setLoading(false);
    setQuery(item.city);
    setShowDropdown(false);
    onSelectCity({
      city: item.city,
      country: item.country,
      lat: item.lat,
      lng: item.lng,
      timezone: item.timezone,
      label: item.label,
    });
  };

  const handleUseGps = async () => {
    const revision = ++queryRevisionRef.current;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setLoading(false);
    setLocatingGps(true);
    setLocationMessage(null);
    try {
      const res = await captureDeviceLocation();
      if (res.ok) {
        const timezone = await resolveCoordinateTimezone(res.location.latitude, res.location.longitude);
        if (queryRevisionRef.current !== revision) return;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const tz = timezone || deviceTimezone || 'UTC';
        setQuery(res.location.city);
        setShowDropdown(false);
        onSelectCity({
          city: res.location.city,
          country: res.location.country || 'India',
          lat: res.location.latitude,
          lng: res.location.longitude,
          timezone: tz,
          timezoneSource: timezone ? 'coordinates' : 'device-setting',
          label: `${res.location.city}, ${res.location.country || 'India'}`,
        });
        if (!timezone) {
          setLocationMessage(copy.timezoneWarning);
        }
      } else {
        if (queryRevisionRef.current === revision) {
          const reason = res.reason.toLowerCase();
          setLocationMessage(reason.includes('permission') ? copy.permission
            : reason.includes('current location') ? copy.noPosition
              : reason.includes('city') ? copy.noCity : copy.lookupFailed);
        }
      }
    } catch (error) {
      if (queryRevisionRef.current === revision) {
        setLocationMessage(copy.lookupFailed);
      }
    } finally {
      if (queryRevisionRef.current === revision) setLocatingGps(false);
    }
  };

  const handleClear = () => {
    queryRevisionRef.current += 1;
    setLocatingGps(false);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setLoading(false);
    setLocationMessage(null);
    onSelectCity(null);
  };

  const handleSubmit = async () => {
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    } else if (query.trim().length >= 2 && !selectedCity) {
      const revision = ++queryRevisionRef.current;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setLoading(true);
      try {
        const results = await searchCities(query.trim(), 1);
        if (queryRevisionRef.current === revision && results.length > 0) {
          handleSelectSuggestion(results[0]);
        }
      } catch {
        // ignore
      } finally {
        if (queryRevisionRef.current === revision) setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.glass,
            borderColor: selectedCity ? theme.brand : theme.premiumBorder,
          },
        ]}
      >
        <Feather
          name="map-pin"
          size={16}
          color={selectedCity ? theme.brand : theme.dim}
          style={{ marginLeft: 12, marginRight: 8 }}
        />

        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              fontFamily: FONTS.sans,
            },
          ]}
          placeholder={localizedPlaceholder}
          placeholderTextColor={theme.dim}
          accessibilityLabel={copy.inputLabel}
          accessibilityHint={copy.searchHint}
          value={query}
          onChangeText={handleQueryChange}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
        />

        {loading ? (
          <ActivityIndicator size="small" color={theme.brand} style={{ marginRight: 12 }} />
        ) : query.length > 0 ? (
          <PressableSurface
            haptic="selection"
            onPress={handleClear}
            style={styles.iconBtn}
            accessibilityLabel={copy.clear}
            accessibilityHint={copy.clearHint}
          >
            <Feather name="x" size={14} color={theme.dim} />
          </PressableSurface>
        ) : null}

        <PressableSurface
          haptic="selection"
          onPress={handleUseGps}
          disabled={locatingGps}
          style={[styles.gpsBtn, { backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder }]}
          accessibilityLabel={copy.gps}
          accessibilityHint={copy.gpsHint}
        >
          {locatingGps ? (
            <ActivityIndicator size="small" color={theme.brand} />
          ) : (
            <Feather name="crosshair" size={16} color={theme.brandStrong} />
          )}
        </PressableSurface>
      </View>

      {/* Auto-showing Dropdown Suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <View
          style={[
            styles.dropdownCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
            },
          ]}
        >
          <Text style={[styles.dropdownHeader, { color: theme.dim }]}>
            {copy.matches}
          </Text>

          {suggestions.map((item, index) => (
            <PressableSurface
              key={`${item.city}-${item.lat}-${index}`}
              haptic="selection"
              onPress={() => handleSelectSuggestion(item)}
              style={[
                styles.suggestionRow,
                index < suggestions.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.borderSoft,
                },
              ]}
            >
              <View style={[styles.pinIconBox, { backgroundColor: theme.brandSoft }]}>
                <Feather name="map-pin" size={14} color={theme.brand} />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.suggestionCity, { color: theme.text }]}>
                  {item.city}
                </Text>
                <Text
                  style={[styles.suggestionLabel, { color: theme.dim }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>

              <View style={[styles.tzBadge, { backgroundColor: theme.glass, borderColor: theme.borderSoft }]}>
                <Text style={[styles.tzText, { color: theme.dim }]}>
                  {(item.timezone.split('/').pop() || item.timezone).replace(/_/g, ' ')}
                </Text>
              </View>
            </PressableSurface>
          ))}
        </View>
      )}

      {/* Verified Location Card when resolved */}
      {selectedCity && (
        <View
          style={[
            styles.resolvedCard,
            {
              backgroundColor: theme.brandSoft,
              borderColor: theme.premiumBorder,
            },
          ]}
        >
          <View style={[styles.checkCircle, { backgroundColor: theme.brand }]}>
            <Feather name="check" size={13} color={COLORS.ink} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[styles.resolvedTitle, { color: theme.brandStrong }]}>
              {selectedCity.city}, {selectedCity.country}
            </Text>
            <Text style={[styles.resolvedSub, { color: theme.dim }]}>
              {formatCoordinate(selectedCity.lat, 'N', 'S')}, {formatCoordinate(selectedCity.lng, 'E', 'W')} · {selectedCity.timezone}
            </Text>
            {selectedCity.timezoneSource === 'device-setting' ? (
              <Text style={[styles.locationNotice, { color: theme.dim }]}>{copy.deviceTimezone}</Text>
            ) : null}
          </View>
        </View>
      )}
      {locationMessage ? (
        <Text accessibilityRole="alert" style={[styles.locationNotice, { color: theme.dim }]}>{locationMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.lg,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  iconBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  gpsBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownCard: {
    borderRadius: RADII.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  dropdownHeader: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
    minHeight: MIN_TOUCH_TARGET,
  },
  pinIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionCity: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
  suggestionLabel: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  tzBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tzText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
  },
  resolvedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADII.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
  },
  resolvedSub: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  locationNotice: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 17,
  },
});
