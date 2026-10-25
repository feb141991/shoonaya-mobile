import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
  Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { AgeGuidanceNotice } from '@/components/privacy/AgeGuidanceNotice';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { TimePickerField } from '@/components/ui/TimePickerField';
import { CityFinder } from '@/components/kundali/CityFinder';
import { formatLocalDateOnly } from '@/lib/dateOnly';
import { useFallbackBackHandler } from '@/components/ui/BackButton';
import { apiFetch } from '@/lib/api';
import { type AppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { KUNDALI_MIN_BIRTH_DATE } from '@/lib/kundali-contract';
import { RASHI_MAP } from '@/lib/jyotish';

const RELATION_OPTIONS = [
  { key: 'self', label: 'Self' },
  { key: 'spouse', label: 'Spouse' },
  { key: 'child', label: 'Child' },
  { key: 'parent', label: 'Parent' },
  { key: 'other', label: 'Other' },
] as const;

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
  const appIdentity = useAppIdentity();
  const identityKey = appIdentity.kind === 'authenticated'
    ? `authenticated:${appIdentity.userId}`
    : appIdentity.kind;

  // Remount all account-scoped form and profile state on sign-out or account
  // switch. This also detaches pending requests from the previous identity.
  return <KundaliScreenForIdentity key={identityKey} appIdentity={appIdentity} />;
}

function KundaliScreenForIdentity({ appIdentity }: { appIdentity: AppIdentity }) {
  const router = useRouter();
  const handleBack = useFallbackBackHandler('/(tabs)/profile', true);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);

  const formScrollRef = useRef<ScrollView>(null);
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Self Account Details (for auto-filling)
  const [selfAccount, setSelfAccount] = useState<{
    fullName: string;
    dateOfBirth: string;
  } | null>(null);

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
  const [submitting, setSubmitting] = useState(false);
  const chartSubmissionKeyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const fetchSelfAccount = useCallback(async () => {
    if (appIdentity.kind !== 'authenticated') return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, date_of_birth')
        .eq('id', appIdentity.userId)
        .maybeSingle();
      if (error) throw error;

      let fullName = data?.full_name?.trim() || '';
      if (!fullName) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        fullName = userData?.user?.user_metadata?.full_name || userData?.user?.user_metadata?.name || '';
      }

      const dateOfBirth = data?.date_of_birth?.trim() || '';

      setSelfAccount({
        fullName,
        dateOfBirth,
      });
    } catch (err) {
      console.warn('Could not load self account details:', err);
    }
  }, [appIdentity]);

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
    fetchSelfAccount();
  }, [fetchProfiles, fetchSelfAccount]);

  // Pre-fill form with self account details when available
  useEffect(() => {
    if (selfAccount && formData.relation === 'self' && !formData.fullName && !formData.dateOfBirth) {
      setFormData(prev => ({
        ...prev,
        fullName: selfAccount.fullName,
        label: selfAccount.fullName || 'My Chart',
        dateOfBirth: selfAccount.dateOfBirth,
      }));
    }
  }, [selfAccount]);

  const handleSelectRelation = (newRelation: string) => {
    if (newRelation === formData.relation) return;
    if (newRelation === 'self') {
      setFormData(prev => ({
        ...prev,
        relation: 'self',
        fullName: selfAccount?.fullName || '',
        label: selfAccount?.fullName || 'My Chart',
        dateOfBirth: selfAccount?.dateOfBirth || '',
        timeOfBirth: '',
        cityQuery: '',
      }));
      setGeocodeResult(null);
    } else {
      // Clear for non-self relation so user can enter family member details
      setFormData(prev => ({
        ...prev,
        relation: newRelation,
        fullName: '',
        label: '',
        dateOfBirth: '',
        timeOfBirth: '',
        cityQuery: '',
      }));
      setGeocodeResult(null);
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
      const fingerprint = JSON.stringify(payload);
      if (chartSubmissionKeyRef.current?.fingerprint !== fingerprint) {
        chartSubmissionKeyRef.current = { fingerprint, key: Crypto.randomUUID() };
      }
      const idempotencyKey = chartSubmissionKeyRef.current.key;

      const response = await apiFetch('/api/jyotish/chart', {
        method: 'POST',
        body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey }),
      });

      if (response.ok) {
        chartSubmissionKeyRef.current = null;
        Alert.alert('Chart Generated!', 'Your profile has been saved.');
        setShowForm(false);
        setFormData({
          fullName: selfAccount?.fullName || '',
          label: selfAccount?.fullName || '',
          relation: 'self',
          dateOfBirth: selfAccount?.dateOfBirth || '',
          timeOfBirth: '',
          cityQuery: '',
        });
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
        onBack: handleBack,
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
          colors={isDark
            ? [COLORS.homeHeroDark, COLORS.cardBgDark, COLORS.surfaceSoftDark]
            : [COLORS.homeRaisedLight, COLORS.brandSoftLight, COLORS.cardBgLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            padding: 20,
            gap: 12,
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="aperture" size={24} color={theme.brand} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 12 }}>Birth Chart</Text>
              <Text style={{ color: theme.text, ...TYPE.cardHeading, fontSize: 23, lineHeight: 28 }}>Generate and explore birth charts</Text>
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
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 24,
                backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="star" size={25} color={theme.brand} />
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
                    <Feather name={p.is_primary ? 'star' : 'aperture'} size={18} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: theme.brandStrong, ...TYPE.cardHeading, fontSize: 18 }} numberOfLines={1}>{p.label}</Text>
                      {p.relation && p.relation !== 'self' ? (
                        <View style={{ backgroundColor: theme.brandSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: theme.premiumBorder }}>
                          <Text style={{ color: theme.brandStrong, fontFamily: FONTS.sansMedium, fontSize: 10, textTransform: 'capitalize' }}>
                            {p.relation}
                          </Text>
                        </View>
                      ) : p.is_primary ? (
                        <View style={{ backgroundColor: theme.brandSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: theme.premiumBorder }}>
                          <Text style={{ color: theme.brandStrong, fontFamily: FONTS.sansMedium, fontSize: 10 }}>
                            Self
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12 }} numberOfLines={2}>
                      {p.date_of_birth} {p.time_of_birth ? `· ${p.time_of_birth}` : '· Time unknown'} · {p.birth_city}
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
              <PressableSurface
                style={{ alignSelf: 'flex-start', minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingRight: 12 }}
                onPress={() => router.push(`/kundali/${p.id}` as any)}
                haptic="selection"
                accessibilityLabel={`View Chart for ${p.label || p.full_name || 'Profile'}`}
              >
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>View Chart →</Text>
              </PressableSurface>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Birth Details Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.premiumBorder }}>
            <View>
              <Text style={{ color: theme.brandStrong, ...TYPE.cardHeading }}>New Birth Chart</Text>
              <Text style={{ color: theme.dim, ...TYPE.caption }}>Enter precise birth details</Text>
            </View>
            <PressableSurface haptic="selection" onPress={() => setShowForm(false)} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={24} color={theme.text} />
            </PressableSurface>
          </View>

          <ScrollView
            ref={formScrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 220 }}
          >
            <LinearGradient
              colors={isDark
                ? [COLORS.homeHeroDark, COLORS.cardBgDark, COLORS.surfaceSoftDark]
                : [COLORS.homeRaisedLight, COLORS.brandSoftLight, COLORS.cardBgLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: theme.premiumBorder,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
              }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 17, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="aperture" size={20} color={theme.brand} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: theme.brand, ...TYPE.section, fontSize: 11 }}>Chart details</Text>
                <Text style={{ color: theme.brandStrong, ...TYPE.cardHeading, fontSize: 19, lineHeight: 23 }}>Start with birth time and place</Text>
                <Text style={{ color: theme.dim, ...TYPE.caption }}>More precise inputs make the chart more useful.</Text>
              </View>
            </LinearGradient>

            <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 16 }}>
              <View style={{ gap: 10 }}>
                <Text style={{ color: theme.brand, ...TYPE.chip, textTransform: 'uppercase', letterSpacing: 1 }}>Chart For</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {RELATION_OPTIONS.map(opt => {
                    const isSelected = formData.relation === opt.key;
                    return (
                      <PressableSurface
                        key={opt.key}
                        haptic="selection"
                        onPress={() => handleSelectRelation(opt.key)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 20,
                          backgroundColor: isSelected ? theme.brand : theme.glass,
                          borderWidth: 1,
                          borderColor: isSelected ? theme.brand : theme.premiumBorder,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sans,
                            fontSize: 13,
                            color: isSelected ? COLORS.ink : theme.text,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>

                {formData.relation === 'self' && (selfAccount?.fullName || selfAccount?.dateOfBirth) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Feather name="check-circle" size={13} color={theme.brand} />
                    <Text style={{ color: theme.dim, ...TYPE.caption, fontSize: 11 }}>
                      Pre-filled from your profile · tap any field to edit
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Full Name</Text>
                <TextInput
                  style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, borderWidth: 1, borderRadius: 14, padding: 12, minHeight: MIN_TOUCH_TARGET, color: theme.text, fontFamily: FONTS.sans, fontSize: 15 }}
                  cursorColor={theme.brand}
                  selectionColor={theme.brandSoft}
                  placeholder={formData.relation === 'self' ? 'Your full name' : "Person's full name"}
                  placeholderTextColor={theme.dim}
                  value={formData.fullName}
                  onChangeText={t => setFormData({ ...formData, fullName: t, label: formData.label || t })}
                />
              </View>
            </Card>

            <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 14 }}>
              <Text style={{ color: theme.brand, ...TYPE.chip, textTransform: 'uppercase', letterSpacing: 1 }}>Birth moment</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <DatePickerField
                    label="Date of Birth"
                    value={formData.dateOfBirth}
                    onChangeDate={t => setFormData({ ...formData, dateOfBirth: t })}
                    placeholder="YYYY-MM-DD"
                    maxDate={formatLocalDateOnly(new Date())}
                    minDate={KUNDALI_MIN_BIRTH_DATE}
                    modalTitle="Select Date of Birth"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TimePickerField
                    label="Time of Birth"
                    value={formData.timeOfBirth}
                    onChangeTime={t => setFormData({ ...formData, timeOfBirth: t })}
                    placeholder="HH:MM"
                    modalTitle="Select Birth Time"
                    allowUnknown
                  />
                </View>
              </View>
              <Text style={{ color: theme.dim, ...TYPE.caption }}>Select exact hour and minute (AM/PM or 24h). Leave empty if unknown.</Text>
              <AgeGuidanceNotice dateOfBirth={formData.dateOfBirth} />
            </Card>

            <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.premiumBorder, gap: 14 }}>
              <Text style={{ color: theme.brand, ...TYPE.chip, textTransform: 'uppercase', letterSpacing: 1 }}>Birth place</Text>
              <CityFinder
                value={formData.cityQuery}
                selectedCity={geocodeResult}
                onFocus={() => {
                  setTimeout(() => {
                    formScrollRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
                onQueryChange={text => {
                  setFormData(prev => ({ ...prev, cityQuery: text }));
                  if (text.length >= 2) {
                    setTimeout(() => {
                      formScrollRef.current?.scrollToEnd({ animated: true });
                    }, 120);
                  }
                }}
                onSelectCity={city => {
                  setGeocodeResult(city);
                  setFormData(prev => ({ ...prev, cityQuery: city ? city.city : '' }));
                }}
              />
            </Card>

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
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
