import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, themeColor } from '@/lib/constants';
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
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={theme.dim} />
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 30 }}>Vedic Kundali</Text>
        <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 14, marginTop: -8 }}>
          Generate your astrological birth chart and explore your dashas.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.serifBold, fontSize: 20 }}>Saved Profiles</Text>
          <Pressable onPress={() => setShowForm(true)} style={{ backgroundColor: theme.brandSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
            <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>+ New Chart</Text>
          </Pressable>
        </View>

        {profiles.length === 0 ? (
          <Card style={{ backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', padding: 32, gap: 8 }}>
            <Text style={{ fontSize: 32 }}>🛕</Text>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>No profiles yet</Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 13, textAlign: 'center' }}>
              Add your birth details to calculate your Lagna, Rashi, and planetary positions.
            </Text>
            <Pressable onPress={() => setShowForm(true)} style={{ backgroundColor: COLORS.brandGold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, marginTop: 12 }}>
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>Create Profile</Text>
            </Pressable>
          </Card>
        ) : (
          profiles.map(p => (
            <Card key={p.id} style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>{p.label}</Text>
                  <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }}>
                    {p.date_of_birth} {p.time_of_birth ? `• ${p.time_of_birth}` : ''} • {p.birth_city}
                  </Text>
                </View>
                {p.rashi && RASHI_MAP[p.rashi.toLowerCase()] && (
                  <View style={{ backgroundColor: theme.brandSoft, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{RASHI_MAP[p.rashi.toLowerCase()].symbol}</Text>
                  </View>
                )}
              </View>
              {p.lagna && (
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 12, marginTop: 12 }}>
                  Ascendant (Lagna): {p.lagna}
                </Text>
              )}
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 12 }} />
              <Pressable style={{ alignSelf: 'flex-start', minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }} onPress={() => Alert.alert('Coming Soon', 'Chart visualization will be shipped in Phase 2!')}>
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>View Chart →</Text>
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Birth Details Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>New Birth Chart</Text>
            <Pressable onPress={() => setShowForm(false)} hitSlop={10} style={{ padding: 4 }}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Full Name</Text>
              <TextInput
                style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
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
                  style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.dim}
                  value={formData.dateOfBirth}
                  onChangeText={t => setFormData({ ...formData, dateOfBirth: t })}
                />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Time (Optional)</Text>
                <TextInput
                  style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
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
                  style={{ flex: 1, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                  placeholder="e.g. Mumbai, Maharashtra"
                  placeholderTextColor={theme.dim}
                  value={formData.cityQuery}
                  onChangeText={t => {
                    setFormData({ ...formData, cityQuery: t });
                    setGeocodeResult(null); // Clear resolved result if they type again
                  }}
                  onSubmitEditing={searchCity}
                />
                <Pressable
                  onPress={searchCity}
                  disabled={searchingCity || formData.cityQuery.length < 2}
                  style={{ backgroundColor: COLORS.brandGold, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, opacity: searchingCity || formData.cityQuery.length < 2 ? 0.5 : 1 }}
                >
                  {searchingCity ? <ActivityIndicator color={COLORS.ink} size="small" /> : <Feather name="search" size={18} color={COLORS.ink} />}
                </Pressable>
              </View>
              {geocodeResult && (
                <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansMedium, fontSize: 12, marginTop: 4 }}>
                  ✓ Resolved: {geocodeResult.city}, {geocodeResult.country} ({geocodeResult.timezone})
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleGenerateChart}
              disabled={submitting || !geocodeResult}
              style={{
                backgroundColor: COLORS.brandGold,
                paddingVertical: 16,
                borderRadius: 24,
                alignItems: 'center',
                marginTop: 20,
                opacity: submitting || !geocodeResult ? 0.5 : 1
              }}
            >
              {submitting ? <ActivityIndicator color={COLORS.ink} /> : <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Generate Chart</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
