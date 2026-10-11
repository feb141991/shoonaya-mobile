import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
  Pressable,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { searchCities, type CitySuggestion } from '@/lib/citySearch';
import { captureDeviceLocation } from '@/lib/locationSync';
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
}

export interface CityFinderProps {
  value?: string;
  selectedCity?: ResolvedCity | null;
  onSelectCity: (city: ResolvedCity | null) => void;
  placeholder?: string;
}

export function CityFinder({
  value = '',
  selectedCity = null,
  onSelectCity,
  placeholder = 'e.g. Mumbai, Varanasi, London...',
}: CityFinderProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
    }
  }, [value]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (selectedCity) {
      onSelectCity(null); // Clear resolved selection if user changes text
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchCities(text, 6);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  const handleSelectSuggestion = (item: CitySuggestion) => {
    void Haptics.selectionAsync();
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
    void Haptics.selectionAsync();
    setLocatingGps(true);
    try {
      const res = await captureDeviceLocation();
      if (res.ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const isIndia = /india/i.test(res.location.country || '');
        const tz = isIndia ? 'Asia/Kolkata' : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setQuery(res.location.city);
        setShowDropdown(false);
        onSelectCity({
          city: res.location.city,
          country: res.location.country || 'India',
          lat: res.location.latitude,
          lng: res.location.longitude,
          timezone: tz,
          label: `${res.location.city}, ${res.location.country || 'India'}`,
        });
      }
    } catch {
      // Permission rejected or failed
    } finally {
      setLocatingGps(false);
    }
  };

  const handleClear = () => {
    void Haptics.selectionAsync();
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onSelectCity(null);
  };

  const handleSubmit = async () => {
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    } else if (query.trim().length >= 2 && !selectedCity) {
      setLoading(true);
      try {
        const results = await searchCities(query.trim(), 1);
        if (results.length > 0) {
          handleSelectSuggestion(results[0]);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
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
          placeholder={placeholder}
          placeholderTextColor={theme.dim}
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
            accessibilityLabel="Clear city query"
          >
            <Feather name="x" size={14} color={theme.dim} />
          </PressableSurface>
        ) : null}

        <PressableSurface
          haptic="selection"
          onPress={handleUseGps}
          disabled={locatingGps}
          style={[styles.gpsBtn, { backgroundColor: theme.brandSoft }]}
          accessibilityLabel="Use current device location"
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
            SELECT MATCHING CITY
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
                  {item.timezone.split('/')[1] || item.timezone}
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
              {selectedCity.lat.toFixed(3)}°N, {selectedCity.lng.toFixed(3)}°E · {selectedCity.timezone}
            </Text>
          </View>
        </View>
      )}
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
    padding: 8,
    marginRight: 4,
  },
  gpsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADII.md,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
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
});
