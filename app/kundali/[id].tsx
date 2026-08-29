import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { BirthPanchangCard } from '@/components/kundali/BirthPanchangCard';
import { DashaTimeline } from '@/components/kundali/DashaTimeline';
import { KundaliIdentity } from '@/components/kundali/KundaliIdentity';
import { PlanetaryPositions } from '@/components/kundali/PlanetaryPositions';
import { TimingConfidenceCard } from '@/components/kundali/TimingConfidenceCard';
import { VedicDiamondChart } from '@/components/kundali/VedicDiamondChart';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';
import {
  BirthProfileDetail,
  buildPrivacySafeShareSummary,
  validateBirthProfileDetail,
} from '@/lib/kundali-contract';

type DetailTab = 'chart' | 'identity' | 'panchang' | 'planets' | 'dasha';
type TextScale = 'sm' | 'md' | 'lg';

const TAB_CONFIG: Array<{ key: DetailTab; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: 'chart', label: 'Chart', icon: 'grid' },
  { key: 'identity', label: 'Identity', icon: 'user' },
  { key: 'panchang', label: 'Panchang', icon: 'calendar' },
  { key: 'planets', label: 'Planets', icon: 'sun' },
  { key: 'dasha', label: 'Dasha', icon: 'clock' },
];

export default function KundaliDetailScreen() {
  const router = useRouter();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: DetailTab }>();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);

  const [activeTab, setActiveTab] = useState<DetailTab>(
    tab === 'identity' || tab === 'panchang' || tab === 'planets' || tab === 'dasha' ? tab : 'chart'
  );

  useEffect(() => {
    if (tab === 'identity' || tab === 'panchang' || tab === 'planets' || tab === 'dasha' || tab === 'chart') {
      setActiveTab(tab);
    }
  }, [tab]);
  const [textScale, setTextScale] = useState<TextScale>('md');
  const [profile, setProfile] = useState<BirthProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMessage(null);
    setErrorStatus(null);

    try {
      const res = await apiFetch(`/api/jyotish/birth-profiles/${id}`);
      if (res.status === 401) {
        setErrorStatus(401);
        setErrorMessage('You are not authorized to view this chart.');
        return;
      }
      if (res.status === 404) {
        setErrorStatus(404);
        setErrorMessage('This birth chart profile could not be found.');
        return;
      }
      if (!res.ok) {
        setErrorStatus(res.status);
        setErrorMessage(`Unable to load chart (HTTP ${res.status}).`);
        return;
      }

      const raw = await res.json();
      const validated = validateBirthProfileDetail(raw);
      if (!validated) {
        setErrorStatus(422);
        setErrorMessage('The persisted chart data is malformed or invalid.');
        return;
      }

      setProfile(validated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error loading birth profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, reloadToken]);

  const handleShare = useCallback(async () => {
    if (!profile) return;
    try {
      const text = buildPrivacySafeShareSummary(profile);
      await Share.share({
        message: text,
        title: `Vedic Kundali: ${profile.label}`,
      });
    } catch {
      // Best-effort
    }
  }, [profile]);

  const cycleTextScale = () => {
    setTextScale((curr) => (curr === 'sm' ? 'md' : curr === 'md' ? 'lg' : 'sm'));
  };

  const scaleMultiplier = textScale === 'sm' ? 0.9 : textScale === 'lg' ? 1.12 : 1.0;

  return (
    <Screen
      header={{
        title: profile?.label || 'Vedic Kundali',
        onBack: () => router.back(),
        rightElement: (
          <View style={styles.headerActions}>
            {/* Text Scale Toggle */}
            <PressableSurface
              haptic="selection"
              onPress={cycleTextScale}
              accessibilityLabel={`Text size: ${textScale}. Tap to toggle`}
              style={[
                styles.headerBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.premiumBorder,
                },
              ]}
            >
              <Text style={[styles.textScaleLabel, { color: theme.brandStrong }]}>
                {textScale.toUpperCase()}
              </Text>
            </PressableSurface>

            {/* Privacy-Safe Share */}
            {profile ? (
              <PressableSurface
                haptic="selection"
                onPress={handleShare}
                accessibilityLabel="Share Kundali Summary"
                style={[
                  styles.headerBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.premiumBorder,
                  },
                ]}
              >
                <Feather name="share-2" size={16} color={theme.brandStrong} />
              </PressableSurface>
            ) : null}
          </View>
        ),
      }}
      style={{ backgroundColor: theme.bg, paddingHorizontal: 16 }}
    >
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.brand} />
          <Text style={[styles.loadingText, { color: theme.dim }]}>
            Loading Vedic Kundali...
          </Text>
        </View>
      ) : errorMessage || !profile ? (
        <View style={styles.errorContainer}>
          <Card tone="auto" style={[styles.errorCard, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
            <View style={[styles.errorIconWell, { backgroundColor: theme.brandSoft }]}>
              <Feather
                name={errorStatus === 401 ? 'lock' : errorStatus === 404 ? 'file-text' : 'alert-triangle'}
                size={26}
                color={theme.brand}
              />
            </View>
            <Text style={[styles.errorTitle, { color: theme.text }]}>
              {errorStatus === 401
                ? 'Authentication Required'
                : errorStatus === 404
                ? 'Profile Not Found'
                : 'Unable to Display Chart'}
            </Text>
            <Text style={[styles.errorBody, { color: theme.dim }]}>
              {errorMessage || 'An unexpected error occurred while loading this chart.'}
            </Text>
            <PressableSurface
              onPress={() => setReloadToken((k) => k + 1)}
              style={[styles.retryBtn, { backgroundColor: theme.brand }]}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </PressableSurface>
          </Card>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.contentScroll, { paddingBottom: 40 }]}
        >
          {/* Timing Confidence Card */}
          <TimingConfidenceCard
            timeUnknown={Boolean(profile.chart_data.timeUnknown)}
            isDark={isDark}
            timeOfBirth={profile.time_of_birth}
            birthCity={profile.birth_city}
          />

          {/* Segmented Detail Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderColor: theme.premiumBorder }]}>
            {TAB_CONFIG.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <PressableSurface
                  key={t.key}
                  onPress={() => setActiveTab(t.key)}
                  haptic="selection"
                  accessibilityRole="tab"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: isActive }}
                  style={[
                    styles.tabButton,
                    isActive
                      ? { backgroundColor: theme.brand, borderColor: 'transparent' }
                      : { backgroundColor: 'transparent', borderColor: 'transparent' },
                  ]}
                >
                  <Feather
                    name={t.icon}
                    size={14}
                    color={isActive ? COLORS.ink : theme.dim}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: isActive ? COLORS.ink : theme.text, fontSize: 12 * scaleMultiplier },
                    ]}
                  >
                    {t.label}
                  </Text>
                </PressableSurface>
              );
            })}
          </View>

          {/* Tab Content Panes */}
          <View style={styles.tabContentPane}>
            {activeTab === 'chart' && (
              <VedicDiamondChart chart={profile.chart_data} isDark={isDark} />
            )}

            {activeTab === 'identity' && (
              <KundaliIdentity profile={profile} isDark={isDark} />
            )}

            {activeTab === 'panchang' && (
              <BirthPanchangCard
                snapshot={profile.chart_data.birthPanchang}
                isDark={isDark}
                timeUnknown={profile.chart_data.timeUnknown}
              />
            )}

            {activeTab === 'planets' && (
              <PlanetaryPositions chart={profile.chart_data} isDark={isDark} />
            )}

            {activeTab === 'dasha' && (
              <DashaTimeline chart={profile.chart_data} isDark={isDark} />
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textScaleLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 80,
  },
  loadingText: {
    ...TYPE.caption,
    fontSize: 13,
  },
  errorContainer: {
    paddingTop: 40,
    paddingHorizontal: 8,
  },
  errorCard: {
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  errorIconWell: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    ...TYPE.cardHeading,
    fontSize: 18,
    textAlign: 'center',
  },
  errorBody: {
    ...TYPE.body,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 22,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  retryBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    color: COLORS.ink,
  },
  contentScroll: {
    paddingTop: 14,
    gap: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
    gap: 3,
  },
  tabButton: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 12,
  },
  tabButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
  },
  tabContentPane: {
    marginTop: 4,
  },
});
