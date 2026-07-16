import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { RASHI_MAP } from '@/lib/jyotish';

type BirthProfile = {
  id: string;
  label: string;
  full_name: string;
  relation: string;
  date_of_birth: string;
  time_of_birth: string | null;
  birth_city: string;
  rashi: string | null;
  lagna: string | null;
  is_primary: boolean;
};

type GeocodeResult = {
  lat: number;
  lng: number;
  timezone: string;
  city: string;
  country: string;
};

export default function KundaliScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);

  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    label: '',
    relation: 'self',
    dateOfBirth: '', // YYYY-MM-DD
    timeOfBirth: '', // HH:MM
    cityQuery: '',
  });
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [searchingCity, setSearchingCity] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      const response = await apiFetch('/api/jyotish/birth-profiles');
      if (response.ok) {
        const payload = await response.json();
        setProfiles(payload.profiles ?? []);
      }
    } catch (err) {
      console.warn('Failed to fetch profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const searchCity = async () => {
    if (formData.cityQuery.length < 2) return;
    setSearchingCity(true);
    setGeocodeResult(null);
    try {
      // Geocode is public, no apiFetch needed if it's full absolute URL, but apiFetch handles it well.
      const response = await apiFetch(`/api/jyotish/geocode?q=${encodeURIComponent(formData.cityQuery)}`);
      if (response.ok) {
        const payload = await response.json();
        setGeocodeResult(payload as GeocodeResult);
      } else {
        Alert.alert('City Not Found', 'Could not locate that city. Try another name.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to search for city.');
    } finally {
      setSearchingCity(false);
    }
  };

  const handleGenerateChart = async () => {
    if (!formData.fullName || !formData.dateOfBirth || !geocodeResult) {
      Alert.alert('Missing Details', 'Please fill in name, date of birth, and resolve your city.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: formData.fullName,
        label: formData.label || formData.fullName,
        relation: formData.relation,
        date_of_birth: formData.dateOfBirth,
        time_of_birth: formData.timeOfBirth || undefined,
        birth_city: geocodeResult.city,
        birth_country: geocodeResult.country,
        birth_lat: geocodeResult.lat,
        birth_lng: geocodeResult.lng,
        birth_timezone: geocodeResult.timezone,
      };

      const response = await apiFetch('/api/jyotish/chart', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Chart Generated!', 'Your profile has been saved.');
        setShowForm(false);
        setFormData({ fullName: '', label: '', relation: 'self', dateOfBirth: '', timeOfBirth: '', cityQuery: '' });
        setGeocodeResult(null);
        fetchProfiles(); // Refresh list
      } else {
        const errPayload = await response.json();
        Alert.alert('Error', errPayload.error || 'Failed to generate chart.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={{
        title: 'Vedic Kundali',
        onBack: () => router.back(),
        rightElement: (
          <PressableSurface
            onPress={() => setShowForm(true)}
            haptic="selection"
            accessibilityLabel="Create new birth chart"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="plus" size={18} color={theme.brandStrong} />
          </PressableSurface>
        ),
      }}
      style={{ backgroundColor: theme.bg, paddingHorizontal: 16 }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16, paddingTop: 14 }}>
        <LinearGradient
          colors={isDark ? [COLORS.cardBgDark, COLORS.surfaceSoftDark] : [COLORS.homeRaisedLight, COLORS.cardBgLight]}
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            padding: 18,
            gap: 12,
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 20, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="map" size={23} color={theme.brand} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 12 }}>Birth Chart</Text>
              <Text style={{ color: theme.brandStrong, ...TYPE.cardHeading, fontSize: 22, lineHeight: 26 }}>Generate and explore birth charts</Text>
              <Text style={{ color: theme.dim, ...TYPE.caption }}>Lagna, Rashi, birth city, and saved profiles.</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <View>
            <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 12 }}>Saved Charts</Text>
            <Text style={{ color: theme.dim, ...TYPE.caption }}>{profiles.length} birth {profiles.length === 1 ? 'profile' : 'profiles'}</Text>
          </View>
          <PressableSurface onPress={() => setShowForm(true)} haptic="selection" style={{ backgroundColor: theme.brandSoft, borderColor: theme.premiumBorder, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}>
            <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>New Chart</Text>
          </PressableSurface>
        </View>

        {profiles.length === 0 ? (
          <Card tone="auto" elevated style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, alignItems: 'center', padding: 28, gap: 10 }}>
            <View style={{ width: 58, height: 58, borderRadius: 22, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="user-plus" size={24} color={theme.brand} />
            </View>
            <Text style={{ color: theme.brandStrong, ...TYPE.cardHeading, fontSize: 20 }}>No profiles yet</Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, textAlign: 'center' }}>
              Add your birth details to calculate your Lagna, Rashi, and planetary positions.
            </Text>
            <PressableSurface onPress={() => setShowForm(true)} style={{ backgroundColor: theme.brand, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, marginTop: 10, minWidth: 150, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Create Profile</Text>
            </PressableSurface>
          </Card>
        ) : (
          profiles.map(p => (
            <Card key={p.id} tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.premiumBorder, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={p.is_primary ? 'star' : 'disc'} size={18} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: theme.brandStrong, ...TYPE.cardHeading, fontSize: 18 }} numberOfLines={1}>{p.label}</Text>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }} numberOfLines={2}>
                      {p.date_of_birth} {p.time_of_birth ? `· ${p.time_of_birth}` : ''} · {p.birth_city}
                    </Text>
                  </View>
                </View>
                {p.rashi && RASHI_MAP[p.rashi.toLowerCase()] && (
                  <View style={{ backgroundColor: theme.brandSoft, width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{RASHI_MAP[p.rashi.toLowerCase()].symbol}</Text>
                  </View>
                )}
              </View>
              {p.lagna && (
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12, marginTop: 12 }}>
                  Ascendant (Lagna): {p.lagna}
                </Text>
              )}
              <View style={{ height: 1, backgroundColor: theme.premiumBorder }} />
              <PressableSurface style={{ alignSelf: 'flex-start', minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingRight: 12 }} onPress={() => Alert.alert('Coming Soon', 'Chart visualization will be shipped in Phase 2!')}>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>View Chart →</Text>
              </PressableSurface>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Birth Details Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.premiumBorder }}>
            <View>
              <Text style={{ color: theme.brandStrong, ...TYPE.cardHeading }}>New Birth Chart</Text>
              <Text style={{ color: theme.dim, ...TYPE.caption }}>Enter precise birth details</Text>
            </View>
            <PressableSurface haptic="selection" onPress={() => setShowForm(false)} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={24} color={theme.text} />
            </PressableSurface>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Full Name</Text>
              <TextInput
                style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 14, padding: 12, minHeight: MIN_TOUCH_TARGET, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={theme.dim}
                value={formData.fullName}
                onChangeText={t => setFormData({ ...formData, fullName: t, label: formData.label || t })}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Date of Birth</Text>
                <TextInput
                  style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 14, padding: 12, minHeight: MIN_TOUCH_TARGET, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.dim}
                  value={formData.dateOfBirth}
                  onChangeText={t => setFormData({ ...formData, dateOfBirth: t })}
                />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Time (Optional)</Text>
                <TextInput
                  style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 14, padding: 12, minHeight: MIN_TOUCH_TARGET, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                  placeholder="HH:MM (24h)"
                  placeholderTextColor={theme.dim}
                  value={formData.timeOfBirth}
                  onChangeText={t => setFormData({ ...formData, timeOfBirth: t })}
                />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Birth City</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 14, padding: 12, minHeight: MIN_TOUCH_TARGET, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                  placeholder="e.g. Mumbai, Maharashtra"
                  placeholderTextColor={theme.dim}
                  value={formData.cityQuery}
                  onChangeText={t => {
                    setFormData({ ...formData, cityQuery: t });
                    setGeocodeResult(null); // Clear resolved result if they type again
                  }}
                  onSubmitEditing={searchCity}
                />
                <PressableSurface
                  onPress={searchCity}
                  disabled={searchingCity || formData.cityQuery.length < 2}
                  style={{ backgroundColor: theme.brand, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: 14, opacity: searchingCity || formData.cityQuery.length < 2 ? 0.5 : 1 }}
                >
                  {searchingCity ? <ActivityIndicator color={COLORS.ink} size="small" /> : <Feather name="search" size={18} color={COLORS.ink} />}
                </PressableSurface>
              </View>
              {geocodeResult && (
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansMedium, fontSize: 12, marginTop: 4 }}>
                  Resolved: {geocodeResult.city}, {geocodeResult.country} ({geocodeResult.timezone})
                </Text>
              )}
            </View>

            <PressableSurface
              onPress={handleGenerateChart}
              disabled={submitting || !geocodeResult}
              style={{
                backgroundColor: theme.brand,
                paddingVertical: 16,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 20,
                opacity: submitting || !geocodeResult ? 0.5 : 1
              }}
            >
              {submitting ? <ActivityIndicator color={COLORS.ink} /> : <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Generate Chart</Text>}
            </PressableSurface>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
