import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  ScrollView,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { API_BASE, COLORS, FONTS, MIN_TOUCH_TARGET, OFFICIAL_EMAIL, RADII, SHADOWS, SOCIAL_LINKS, TYPE, themeColor } from '@/lib/constants';
import { APP_VERSION_LABEL } from '@/lib/appVersion';
import { apiFetch } from '@/lib/api';
import {
  openNotificationSettings,
  registerPushToken,
  requestNotificationPermission,
  signOutWithPushCleanup,
  unregisterPushToken,
  getPushRegistrationStatus,
  subscribePushRegistrationStatus,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { setGuestMode } from '@/lib/guestSession';
import { captureAppIdentity, getAppIdentity, isSameAppIdentity, useAppIdentity } from '@/lib/appIdentity';
import { clearAllHomeCaches } from '@/lib/homeCache';
import { replayHomeDiscovery } from '@/lib/homeDiscovery';
import { resetFirstWeekGuideCue } from '@/lib/firstWeekGuideStorage';
import { clearAllOnboardingDrafts } from '@/lib/onboardingDraft';
import { SUPPORTED_APP_LANGUAGES, type AppLanguage } from '@/lib/language-runtime';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  readSettingsCache,
  writeSettingsCache,
  clearAllSettingsCaches,
  mergeServerWithPending,
  classifyWriteFailure,
  type SettingsCacheIdentity,
  type SettingsFields,
  type PendingSettingsWrite,
} from '@/lib/settingsCache';
import { SettingsWriteCoordinator, settingsRetryDelay, confirmedSettingsConsent } from '@/lib/settingsWriteCoordinator';
import { recordRouteOpen, recordRefreshFailure, recordMutationRetryOutcome } from '@/lib/telemetry';
import { AppTourModal } from '@/components/tour/AppTourModal';
import { HeroBackdropPicker } from '@/components/home/HeroBackdropPicker';
import { GreetingPicker } from '@/components/home/GreetingPicker';
import {
  getHeroPick,
  getHeroSize,
  HERO_SIZE_CONFIG,
  type HeroPick,
  type HeroSize,
} from '@/lib/heroPreference';
import { AccountDeletionSheet, type DeletionJourneySnapshot } from '@/components/settings/AccountDeletionSheet';
import { ReminderTimePicker } from '@/components/settings/ReminderTimePicker';
import { accountDeletion, readDeletionReasons, useAccountDeletionStatus } from '@/lib/accountDeletion';
import { accountDeletionCopy } from '@/lib/accountDeletionCopy';
import { getGreetingPick } from '@/lib/greetingPreference';
import { applyPracticeAnalyticsConsent, applyProductAnalyticsConsent, revokePracticeAnalyticsConsent, revokeProductAnalyticsConsent } from '@/lib/productAnalyticsRuntime';
import { classifyFailure, describeFailure, requestErrorFromResponse } from '@/lib/user-facing-error';

type ThemePref = 'light' | 'dark' | 'system';
export type SettingsSectionKey = 'account' | 'notifications' | 'appearance' | 'privacy' | 'about';

// Settings mirror the profile fields written by this screen. Family
// remembrance is an additive server field and remains disabled until the
// matching backend migration is present.
type SettingsState = SettingsFields;

const THEME_STORAGE_KEY = 'sangam_theme_preference';

// A refused value, an expired session, or a forbidden account can't be
// fixed by resending the exact same fields -- only network/server/rate-limit
// causes are worth a blind Retry. See AGENTS.md rule 12/13.
function classifyPendingWriteFailure(
  error: unknown,
  language: AppLanguage
): { message: string; retryable: boolean } {
  const { kind } = classifyFailure(error);
  return {
    message: describeFailure(error, 'Could not save this change. Please try again.', language),
    retryable: kind === 'network' || kind === 'server' || kind === 'rate_limited',
  };
}

const INITIAL_SETTINGS: SettingsState = {
  japa_reminder_enabled: true,
  japa_reminder_time: '07:00',
  quiz_reminder_enabled: true,
  quiz_reminder_time: '10:00',
  wants_festival_reminders: true,
  wants_vrat_reminders: true,
  wants_tithi_reminders: true,
  observance_reminder_lead_days: [0, 1],
  observance_reminder_time: '08:00',
  wants_shloka_reminders: true,
  wants_nitya_reminders: true,
  wants_sankalpa_midpoint_reminders: true,
  wants_community_notifications: true,
  wants_family_notifications: true,
  wants_family_remembrance_reminders: true,
  family_remembrance_time: '09:00',
  wants_brahma_muhurta_reminders: true,
  wants_evening_reminder: true,
  wants_madhyahn_reminder: true,
  dharm_veer_reminder_enabled: true,
  wants_mood_reminders: true,
  wants_sattvic_reminders: true,
  app_language: 'en',
  transliteration_language: 'en',
  meaning_language: 'en',
  consent_religious_data: false,
  consent_activity_personalization: false,
  consent_product_analytics: false,
};

// labelHi/subtitleHi mirror OnboardingWelcomeScreen.tsx's label/labelHi
// pattern. Punjabi has no written copy yet (same convention as
// lib/user-facing-error.ts's COPY table) so it falls back to English rather
// than showing a wrong translation.
const NOTIFICATION_TOGGLES: { key: keyof SettingsState; label: string; labelHi: string; subtitle: string; subtitleHi: string; disabled?: boolean; requiresAccount?: boolean; badge?: string }[] = [
  { key: 'japa_reminder_enabled', label: 'Japa practice reminder', labelHi: 'जाप अभ्यास रिमाइंडर', subtitle: 'A gentle daily reminder at your chosen time', subtitleHi: 'आपके चुने समय पर एक सरल दैनिक रिमाइंडर', requiresAccount: true },
  { key: 'quiz_reminder_enabled', label: 'Daily quiz reminders', labelHi: 'दैनिक क्विज़ रिमाइंडर', subtitle: 'Daily quiz challenge at 10:00 AM, plus a 6:00 PM nudge if still unfinished', subtitleHi: 'सुबह 10:00 बजे दैनिक क्विज़ चुनौती, और अधूरा रहने पर शाम 6:00 बजे एक याद दिलाने वाला संदेश', requiresAccount: true },
  { key: 'wants_shloka_reminders', label: 'Daily wisdom', labelHi: 'दैनिक ज्ञान', subtitle: 'Your daily shloka & reflection', subtitleHi: 'आपका दैनिक श्लोक व चिंतन' },
  { key: 'wants_nitya_reminders', label: 'Nitya reminders', labelHi: 'नित्य रिमाइंडर', subtitle: 'Morning sadhana nudges', subtitleHi: 'सुबह की साधना के लिए याद दिलाने वाले संदेश' },
  { key: 'wants_brahma_muhurta_reminders', label: 'Brahma Muhurta', labelHi: 'ब्रह्म मुहूर्त', subtitle: 'A pre-dawn reminder about 1½ hours before sunrise at your saved location. It arrives at night.', subtitleHi: 'आपके सहेजे गए स्थान पर सूर्योदय से लगभग 1½ घंटे पहले, तड़के का एक रिमाइंडर। यह रात में आता है।', requiresAccount: true },
  { key: 'wants_sankalpa_midpoint_reminders', label: 'Sankalpa midpoint', labelHi: 'संकल्प का मध्यबिंदु', subtitle: 'One gentle reminder halfway through an active vow', subtitleHi: 'सक्रिय संकल्प के आधे समय पर एक सरल रिमाइंडर', requiresAccount: true },
  { key: 'wants_festival_reminders', label: 'Sacred festivals', labelHi: 'पावन पर्व', subtitle: 'Major and regional sacred festivals', subtitleHi: 'प्रमुख व क्षेत्रीय पावन पर्व' },
  { key: 'wants_vrat_reminders', label: 'Vrats & fasting', labelHi: 'व्रत व उपवास', subtitle: 'Ekadashi, Pradosha, Purnima & fasting days', subtitleHi: 'एकादशी, प्रदोष, पूर्णिमा व उपवास के दिन' },
  { key: 'wants_tithi_reminders', label: 'Tithi alerts', labelHi: 'तिथि सूचनाएं', subtitle: 'Daily lunar phase transitions', subtitleHi: 'दैनिक चंद्र तिथि परिवर्तन' },
  { key: 'wants_community_notifications', label: 'Community', labelHi: 'समुदाय', subtitle: 'Mandali posts, reactions & connections', subtitleHi: 'मंडली की पोस्ट, प्रतिक्रियाएं व जुड़ाव' },
  { key: 'wants_family_notifications', label: 'Family', labelHi: 'परिवार', subtitle: 'Kul & lineage activity', subtitleHi: 'कुल व वंश की गतिविधि', requiresAccount: true },
  { key: 'wants_family_remembrance_reminders', label: 'Family remembrance', labelHi: 'पारिवारिक स्मृति', subtitle: 'A yearly, private reminder for family dates you link to a deceased relative', subtitleHi: 'किसी दिवंगत परिजन से जोड़ी गई पारिवारिक तिथि के लिए एक वार्षिक, निजी रिमाइंडर', requiresAccount: true },
  { key: 'wants_evening_reminder', label: 'Evening Sandhya', labelHi: 'सायं संध्या', subtitle: 'A second daily nudge for evening twilight practice', subtitleHi: 'सायंकालीन साधना के लिए दिन का दूसरा रिमाइंडर' },
  { key: 'wants_madhyahn_reminder', label: 'Midday Nitya', labelHi: 'मध्याह्न नित्य', subtitle: 'A midday nudge for your Nitya Karma practice', subtitleHi: 'आपकी नित्य कर्म साधना के लिए मध्याह्न का रिमाइंडर' },
  { key: 'wants_sattvic_reminders', label: 'Sattvic Mode evening', labelHi: 'सात्विक मोड शाम', subtitle: 'An evening nudge into prāṇāyāma, kīrtana, or quiet reflection', subtitleHi: 'प्राणायाम, कीर्तन या शांत चिंतन के लिए शाम का रिमाइंडर' },
  { key: 'dharm_veer_reminder_enabled', label: 'Dharm Veer stories', labelHi: 'धर्म वीर कथाएं', subtitle: 'A nudge toward unread Dharm Veer stories', subtitleHi: 'अपठित धर्म वीर कथाओं की ओर एक रिमाइंडर', requiresAccount: true },
  { key: 'wants_mood_reminders', label: 'Mood check-ins', labelHi: 'मनोभाव जाँच', subtitle: 'Midday and evening prompts to note how you are feeling', subtitleHi: 'आपकी भावनाएं दर्ज करने के लिए दोपहर व शाम के संकेत' },
];

// Shipped together in one migration (AGENTS.md rule 6, 2026-10-27), so they
// share a single schema-ready flag rather than one each.
const REMINDER_COVERAGE_GAP_KEYS: (keyof SettingsState)[] = [
  'wants_evening_reminder', 'wants_madhyahn_reminder', 'dharm_veer_reminder_enabled',
  'wants_mood_reminders', 'wants_sattvic_reminders',
];

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  pa: 'Punjabi',
};

const PUSH_STATUS_COPY: Record<AppLanguage, {
  device: string; checking: string; permissionOff: string; registered: string;
  unavailable: string; failed: string; openSettings: string; checkSetup: string; deletionPending: string;
}> = {
  en: {
    device: 'This device', checking: 'Checking notification setup…',
    permissionOff: 'Notifications are off in your phone settings.',
    registered: 'Registered for your enabled reminders. Your phone settings also control alerts.',
    unavailable: 'Push notifications are unavailable in this app environment.',
    failed: 'Could not register this device. Check your connection and try again.',
    openSettings: 'Open phone settings', checkSetup: 'Check notification setup',
    deletionPending: 'Notifications are off while your account deletion is scheduled. Cancel the deletion to turn them back on.',
  },
  hi: {
    device: 'यह डिवाइस', checking: 'सूचना सेटअप जाँचा जा रहा है…',
    permissionOff: 'आपके फ़ोन की सेटिंग में सूचनाएँ बंद हैं।',
    registered: 'आपके चुने रिमाइंडर के लिए यह डिवाइस पंजीकृत है। अलर्ट पर फ़ोन की सेटिंग भी लागू होती है।',
    unavailable: 'इस ऐप परिवेश में पुश सूचनाएँ उपलब्ध नहीं हैं।',
    failed: 'यह डिवाइस पंजीकृत नहीं हो सका। कनेक्शन जाँचकर फिर कोशिश करें।',
    openSettings: 'फ़ोन की सेटिंग खोलें', checkSetup: 'सूचना सेटअप जाँचें',
    deletionPending: 'खाता हटाने का अनुरोध निर्धारित रहने तक सूचनाएँ बंद हैं। उन्हें फिर चालू करने के लिए अनुरोध रद्द करें।',
  },
  pa: {
    device: 'ਇਹ ਡਿਵਾਈਸ', checking: 'ਸੂਚਨਾ ਸੈਟਅੱਪ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ…',
    permissionOff: 'ਤੁਹਾਡੇ ਫ਼ੋਨ ਦੀਆਂ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਸੂਚਨਾਵਾਂ ਬੰਦ ਹਨ।',
    registered: 'ਤੁਹਾਡੇ ਚੁਣੇ ਰੀਮਾਈਂਡਰਾਂ ਲਈ ਇਹ ਡਿਵਾਈਸ ਰਜਿਸਟਰ ਹੈ। ਚੇਤਾਵਨੀਆਂ ਲਈ ਫ਼ੋਨ ਸੈਟਿੰਗਾਂ ਵੀ ਲਾਗੂ ਹੁੰਦੀਆਂ ਹਨ।',
    unavailable: 'ਇਸ ਐਪ ਮਾਹੌਲ ਵਿੱਚ ਪੁਸ਼ ਸੂਚਨਾਵਾਂ ਉਪਲਬਧ ਨਹੀਂ ਹਨ।',
    failed: 'ਇਹ ਡਿਵਾਈਸ ਰਜਿਸਟਰ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਨੈਕਸ਼ਨ ਜਾਂਚ ਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    openSettings: 'ਫ਼ੋਨ ਸੈਟਿੰਗਾਂ ਖੋਲ੍ਹੋ', checkSetup: 'ਸੂਚਨਾ ਸੈਟਅੱਪ ਜਾਂਚੋ',
    deletionPending: 'ਖਾਤਾ ਮਿਟਾਉਣ ਦੀ ਬੇਨਤੀ ਨਿਰਧਾਰਤ ਹੋਣ ਤੱਕ ਸੂਚਨਾਵਾਂ ਬੰਦ ਹਨ। ਇਨ੍ਹਾਂ ਨੂੰ ਮੁੜ ਚਾਲੂ ਕਰਨ ਲਈ ਬੇਨਤੀ ਰੱਦ ਕਰੋ।',
  },
};

const LANGUAGES = SUPPORTED_APP_LANGUAGES.map((key) => ({ key, label: LANGUAGE_LABELS[key] }));

const THEME_OPTIONS: { key: ThemePref; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

function toSettingsState(value: Partial<SettingsState> | null | undefined): SettingsState {
  return {
    japa_reminder_enabled: value?.japa_reminder_enabled ?? INITIAL_SETTINGS.japa_reminder_enabled,
    japa_reminder_time: value?.japa_reminder_time ?? INITIAL_SETTINGS.japa_reminder_time,
    quiz_reminder_enabled: value?.quiz_reminder_enabled ?? INITIAL_SETTINGS.quiz_reminder_enabled,
    quiz_reminder_time: value?.quiz_reminder_time ?? INITIAL_SETTINGS.quiz_reminder_time,
    wants_festival_reminders: value?.wants_festival_reminders ?? INITIAL_SETTINGS.wants_festival_reminders,
    wants_vrat_reminders: value?.wants_vrat_reminders ?? INITIAL_SETTINGS.wants_vrat_reminders,
    wants_tithi_reminders: value?.wants_tithi_reminders ?? INITIAL_SETTINGS.wants_tithi_reminders,
    observance_reminder_lead_days: value?.observance_reminder_lead_days ?? INITIAL_SETTINGS.observance_reminder_lead_days,
    observance_reminder_time: value?.observance_reminder_time ?? INITIAL_SETTINGS.observance_reminder_time,
    wants_shloka_reminders: value?.wants_shloka_reminders ?? INITIAL_SETTINGS.wants_shloka_reminders,
    wants_nitya_reminders: value?.wants_nitya_reminders ?? INITIAL_SETTINGS.wants_nitya_reminders,
    wants_sankalpa_midpoint_reminders: value?.wants_sankalpa_midpoint_reminders ?? INITIAL_SETTINGS.wants_sankalpa_midpoint_reminders,
    wants_community_notifications: value?.wants_community_notifications ?? INITIAL_SETTINGS.wants_community_notifications,
    wants_family_notifications: value?.wants_family_notifications ?? INITIAL_SETTINGS.wants_family_notifications,
    wants_family_remembrance_reminders: value?.wants_family_remembrance_reminders ?? INITIAL_SETTINGS.wants_family_remembrance_reminders,
    family_remembrance_time: value?.family_remembrance_time ?? INITIAL_SETTINGS.family_remembrance_time,
    wants_brahma_muhurta_reminders: value?.wants_brahma_muhurta_reminders ?? INITIAL_SETTINGS.wants_brahma_muhurta_reminders,
    wants_evening_reminder: value?.wants_evening_reminder ?? INITIAL_SETTINGS.wants_evening_reminder,
    wants_madhyahn_reminder: value?.wants_madhyahn_reminder ?? INITIAL_SETTINGS.wants_madhyahn_reminder,
    dharm_veer_reminder_enabled: value?.dharm_veer_reminder_enabled ?? INITIAL_SETTINGS.dharm_veer_reminder_enabled,
    wants_mood_reminders: value?.wants_mood_reminders ?? INITIAL_SETTINGS.wants_mood_reminders,
    wants_sattvic_reminders: value?.wants_sattvic_reminders ?? INITIAL_SETTINGS.wants_sattvic_reminders,
    app_language: value?.app_language ?? INITIAL_SETTINGS.app_language,
    transliteration_language: value?.transliteration_language ?? INITIAL_SETTINGS.transliteration_language,
    meaning_language: value?.meaning_language ?? INITIAL_SETTINGS.meaning_language,
    consent_religious_data: value?.consent_religious_data ?? INITIAL_SETTINGS.consent_religious_data,
    consent_activity_personalization: value?.consent_activity_personalization ?? INITIAL_SETTINGS.consent_activity_personalization,
    consent_product_analytics: value?.consent_product_analytics ?? INITIAL_SETTINGS.consent_product_analytics,
  };
}

// Server-enforced windows (quiz producer; profiles_family_remembrance_time_check).
const QUIZ_REMINDER_EARLIEST = '07:00';
const QUIZ_REMINDER_LATEST = '15:00';
const FAMILY_REMEMBRANCE_EARLIEST = '08:00';
const FAMILY_REMEMBRANCE_LATEST = '21:59';

function SettingsSection({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <View style={{ gap: 12 }}>
      <SectionHeader label={label} />
      <Card tone="auto" style={{ backgroundColor: theme.card, borderColor: theme.border, gap: 16 }}>
        {children}
      </Card>
    </View>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onChange,
  theme,
  disabled,
  badge,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  theme: ReturnType<typeof themeColor>;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.6 : 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ ...TYPE.label, color: theme.text }}>{label}</Text>
          {badge ? (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.premiumBorder }}>
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 10, color: theme.brand, letterSpacing: 0.3 }}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: theme.brand }}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={subtitle}
        accessibilityState={{ checked: value, disabled: !!disabled }}
      />
    </View>
  );
}

// Button's variant system (primary/secondary/ghost) has no destructive
// variant, and primary's fixed ink/darkBg text would be near-illegible over
// a translucent danger-red wash in dark mode (near-black on near-black).
// Rather than widen Button's variant contract for one screen, this mirrors
// Button's own shape/press-feedback conventions (44dp min height, RADII.lg,
// boxShadow, haptic + opacity/scale on press) with an explicit danger
// palette so the delete action stays legible in both themes.
function DangerButton({
  label,
  loading,
  onPress,
  isDark,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const busy = !!loading;
  return (
    <PressableSurface
      haptic="none"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={() => {
        if (!busy) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        borderRadius: RADII.lg,
        borderWidth: 1,
        borderColor: COLORS.dangerBorder,
        backgroundColor: COLORS.dangerBg,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
      }}
    >
      {busy ? (
        <ActivityIndicator color={COLORS.danger} />
      ) : (
        <Text style={{ ...TYPE.label, fontSize: 14.5, color: COLORS.danger }}>{label}</Text>
      )}
    </PressableSurface>
  );
}

async function openLegalUrl(path: '/terms' | '/privacy' | '/sources') {
  const url = `${API_BASE}${path}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) throw new Error('Cannot open URL');
    await Linking.openURL(url);
  } catch {
    const label = path === '/terms' ? 'Terms of Service' : path === '/privacy' ? 'Privacy Policy' : 'Content Sources';
    Alert.alert('Error', `Could not open ${label}.`);
  }
}

export function SettingsDetailScreen({ section }: { section: SettingsSectionKey }) {
  const insets = useSafeAreaInsets();
  const [tourVisible, setTourVisible] = useState(false);
  const router = useRouter();
  const appIdentity = useAppIdentity();
  const { setLanguage, language } = useLanguage();
  const pushStatusCopy = PUSH_STATUS_COPY[language];
  const deletionCopy = accountDeletionCopy(language);
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);
  const deletionStatus = useAccountDeletionStatus();
  const [deletionSheetVisible, setDeletionSheetVisible] = useState(false);
  const [deletionSnapshot, setDeletionSnapshot] = useState<DeletionJourneySnapshot>({
    userName: '',
    tradition: 'hindu',
    streak: 0,
    karmaPoints: 0,
    sevaScore: 0,
    relicsCount: 0,
    journalCount: 0,
  });
  const [settings, setSettings] = useState<SettingsState>(INITIAL_SETTINGS);
  const [familyRemembranceSchemaReady, setFamilyRemembranceSchemaReady] = useState(false);
  const [brahmaMuhurtaSchemaReady, setBrahmaMuhurtaSchemaReady] = useState(false);
  const [productAnalyticsSchemaReady, setProductAnalyticsSchemaReady] = useState(false);
  // wants_evening_reminder/wants_madhyahn_reminder/dharm_veer_reminder_enabled already
  // existed; wants_mood_reminders/wants_sattvic_reminders are new. All five ship in one
  // migration together, so one combined flag (not five) is enough -- AGENTS.md rule 6,
  // 2026-10-27 notification coverage gap entry.
  const [reminderCoverageGapSchemaReady, setReminderCoverageGapSchemaReady] = useState(false);
  const [themePref, setThemePref] = useState<ThemePref>('system');
  const [isGuest, setIsGuest] = useState(false);
  const [pendingWrite, setPendingWriteState] = useState<PendingSettingsWrite | null>(null);
  const writeCoordinator = useRef(new SettingsWriteCoordinator()).current;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const setPendingWrite = useCallback((write: PendingSettingsWrite | null) => {
    writeCoordinator.setPending(write);
    setPendingWriteState(write);
  }, [writeCoordinator]);
  const [profileTradition, setProfileTradition] = useState<string>('hindu');
  const [heroPickerVisible, setHeroPickerVisible] = useState(false);
  const [greetingPickerVisible, setGreetingPickerVisible] = useState(false);
  const [heroPick, setHeroPickState] = useState<HeroPick | null>(null);
  const [heroSize, setHeroSizeState] = useState<HeroSize>('standard');
  const [greetingPick, setGreetingPickState] = useState<string | null>(null);

  // Resolved once per load; used both to key the cache and to know which
  // identity a queued write belongs to, so a cold-start resume never
  // drains another account's outbox (see resumePendingWrite below).
  const identityRef = useRef<SettingsCacheIdentity | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    const lease = captureAppIdentity();
    identityRef.current = appIdentity.kind === 'authenticated'
      ? { kind: 'authenticated', userId: appIdentity.userId }
      : appIdentity.kind === 'guest' ? { kind: 'guest' } : null;
    if (appIdentity.kind === 'authenticated') writeCoordinator.bind(appIdentity.userId, lease.isCurrent);
    setPendingWrite(null);
    setSaving(false);
    setIsGuest(appIdentity.kind === 'guest');
    return () => { clearRetryTimer(); writeCoordinator.cancel(); };
  }, [appIdentity, clearRetryTimer, setPendingWrite, writeCoordinator]);

  // Sends the pending write's desired fields to the server. On success,
  // clears the pending entry and adopts the server's persisted values
  // (trusting its response over the optimistic local guess). On failure,
  // classifies the error and either reschedules (network/5xx/429) or marks
  // the entry permanently failed (most 4xx) -- never retries forever, and
  // never leaves an indefinite "Saving..." state past the last attempt.
  const attemptPendingWrite = useCallback(async (write: PendingSettingsWrite) => {
    const identity = identityRef.current;
    if (!identity || identity.kind === 'guest') return; // guest writes are local-only, never queued
    const ownerLease = captureAppIdentity();
    if (!isSameAppIdentity(ownerLease.identity, identity)) return;
    await writeCoordinator.send(write, async (isCurrent) => {
      setSaving(true);
      try {
        const response = await apiFetch('/api/native/profile', {
          method: 'PATCH',
          body: JSON.stringify(write.fields),
          expectedUserId: identity.userId,
        });
        if (!isCurrent()) return;

        if (response.ok) {
          const json = await response.json().catch(() => null) as { persisted?: Partial<SettingsState>; updatedAt?: string } | null;
          if (!isCurrent()) return;
          clearRetryTimer();
          await writeCoordinator.store(write, async (stillCurrent) => {
            const cached = await readSettingsCache(identity);
            if (!stillCurrent()) return;
            await writeSettingsCache({
              schemaVersion: 2, identity, savedAt: Date.now(),
              settings: { ...(cached?.settings ?? INITIAL_SETTINGS), ...(json?.persisted ?? write.fields) },
              serverUpdatedAt: json?.updatedAt ?? cached?.serverUpdatedAt ?? null,
              pendingOperations: [],
            });
          });
          if (!isCurrent()) return;
          settingsRef.current = { ...settingsRef.current, ...(json?.persisted ?? write.fields) };
          setSettings(settingsRef.current);
          recordMutationRetryOutcome(identity, 'settings', 'success', write.attempts);
          const persistedSettings = json?.persisted ?? write.fields;
          if ('consent_product_analytics' in persistedSettings) {
            await applyProductAnalyticsConsent(identity.userId, persistedSettings.consent_product_analytics === true);
          }
          if (!isCurrent()) return;
          if ('consent_religious_data' in persistedSettings) {
            await applyPracticeAnalyticsConsent(identity.userId, persistedSettings.consent_religious_data === true);
          }
          if (isCurrent()) setPendingWrite(null);
          return;
        }

        const outcome = classifyWriteFailure(response.status, response.headers.get('Retry-After'));
        if (outcome.kind === 'retry') {
          const attempts = write.attempts + 1;
          const backoff = settingsRetryDelay(write.attempts, response.status, outcome.afterMs);
          if (backoff === null) {
            // Backoff table exhausted -- stop auto-retrying, surface failure.
            const { message, retryable } = classifyPendingWriteFailure(await requestErrorFromResponse(response), language);
            if (!isCurrent()) return;
            const failed: PendingSettingsWrite = { ...write, attempts, status: 'failed', failureMessage: message, failureRetryable: retryable };
            setPendingWrite(failed);
            await persistPendingWrite(identity, failed);
            recordMutationRetryOutcome(identity, 'settings', 'permanent_failure', attempts);
            return;
          }
          const next: PendingSettingsWrite = { ...write, attempts, nextAttemptAt: Date.now() + backoff, status: 'pending' };
          setPendingWrite(next);
          await persistPendingWrite(identity, next);
          if (!isCurrent()) return;
          clearRetryTimer();
          retryTimerRef.current = setTimeout(() => { void attemptPendingWrite(next); }, backoff);
          recordMutationRetryOutcome(identity, 'settings', 'retry', attempts);
          return;
        }

        // Permanent failure (most 4xx) -- do not retry automatically.
        const { message, retryable } = classifyPendingWriteFailure(await requestErrorFromResponse(response), language);
        if (!isCurrent()) return;
        const failed: PendingSettingsWrite = { ...write, attempts: write.attempts + 1, status: 'failed', failureMessage: message, failureRetryable: retryable };
        setPendingWrite(failed);
        await persistPendingWrite(identity, failed);
        recordMutationRetryOutcome(identity, 'settings', 'permanent_failure', failed.attempts);
      } catch (error) {
        if (!isCurrent()) return;
        // Network error -- same retry treatment as 5xx.
        const attempts = write.attempts + 1;
        const backoff = settingsRetryDelay(write.attempts);
        if (backoff === null) {
          const { message, retryable } = classifyPendingWriteFailure(error, language);
          const failed: PendingSettingsWrite = { ...write, attempts, status: 'failed', failureMessage: message, failureRetryable: retryable };
          setPendingWrite(failed);
          await persistPendingWrite(identity, failed);
          recordMutationRetryOutcome(identity, 'settings', 'permanent_failure', attempts);
          return;
        }
        const next: PendingSettingsWrite = { ...write, attempts, nextAttemptAt: Date.now() + backoff, status: 'pending' };
        setPendingWrite(next);
        await persistPendingWrite(identity, next);
        if (!isCurrent()) return;
        clearRetryTimer();
        retryTimerRef.current = setTimeout(() => { void attemptPendingWrite(next); }, backoff);
        recordMutationRetryOutcome(identity, 'settings', 'retry', attempts);
      } finally {
        // A superseding intent must not inherit the old request's busy state.
        if (ownerLease.isCurrent()) setSaving(false);
      }
    });
  }, [clearRetryTimer, language, setPendingWrite, writeCoordinator]);

  async function persistPendingWrite(identity: SettingsCacheIdentity, write: PendingSettingsWrite | null) {
    await writeCoordinator.store(write, async (isCurrent) => {
      const cached = await readSettingsCache(identity);
      if (!isCurrent()) return;
      await writeSettingsCache({
        schemaVersion: 2, identity, savedAt: Date.now(),
        settings: cached?.settings ?? INITIAL_SETTINGS,
        serverUpdatedAt: cached?.serverUpdatedAt ?? null,
        pendingOperations: write ? [write] : [],
      });
    });
  }

  const loadSettings = useCallback(async () => {
    // Auth-waterfall fix (reliability plan item 5): appIdentity reads the
    // already-centrally-resolved identity instead of independently
    // re-verifying the session/guest flag on every mount.
    const lease = captureAppIdentity();
    const writeRevision = writeCoordinator.getRevision();
    if (appIdentity.kind === 'loading') return;
    if (!isSameAppIdentity(lease.identity, appIdentity)) return;
    const guest = appIdentity.kind === 'guest';
    setIsGuest(guest);

    const [hero, size, greeting] = await Promise.all([
      getHeroPick(),
      getHeroSize(),
      getGreetingPick(),
    ]);
    if (!lease.isCurrent()) return;
    setHeroPickState(hero);
    setHeroSizeState(size);
    setGreetingPickState(greeting);

    if (guest) {
      setFamilyRemembranceSchemaReady(false);
      identityRef.current = { kind: 'guest' };
      clearRetryTimer();
      setPendingWrite(null);
      const [cached, localTheme] = await Promise.all([
        readSettingsCache({ kind: 'guest' }),
        AsyncStorage.getItem(THEME_STORAGE_KEY),
      ]);
      if (!lease.isCurrent()) return;
      setSettings(toSettingsState({ ...INITIAL_SETTINGS, ...cached?.settings }));
      if (localTheme === 'light' || localTheme === 'dark' || localTheme === 'system') {
        setThemePref(localTheme);
      }
      return;
    }

    if (appIdentity.kind !== 'authenticated') {
      router.replace('/(auth)/login');
      return;
    }

    const identity: SettingsCacheIdentity = { kind: 'authenticated', userId: appIdentity.userId };
    identityRef.current = identity;

    setFamilyRemembranceSchemaReady(false);
    setBrahmaMuhurtaSchemaReady(false);
    setProductAnalyticsSchemaReady(false);
    setReminderCoverageGapSchemaReady(false);
    const profileSettingsPromise = (async () => {
      const baseColumns = 'tradition, japa_reminder_enabled, japa_reminder_time, quiz_reminder_enabled, quiz_reminder_time, wants_festival_reminders, wants_vrat_reminders, wants_tithi_reminders, observance_reminder_lead_days, observance_reminder_time, wants_shloka_reminders, wants_nitya_reminders, wants_sankalpa_midpoint_reminders, wants_community_notifications, wants_family_notifications, app_language, transliteration_language, meaning_language, consent_religious_data, consent_activity_personalization';
      const familyColumns = `${baseColumns}, wants_family_remembrance_reminders, family_remembrance_time`;
      const reminderCoverageGapColumns = 'wants_evening_reminder, wants_madhyahn_reminder, dharm_veer_reminder_enabled, wants_mood_reminders, wants_sattvic_reminders';
      const read = (columns: string) => supabase.from('profiles').select(columns).eq('id', appIdentity.userId).single();
      const isMissingColumn = (error: unknown) => (error as { code?: string } | null)?.code === '42703';

      // The 2026-10-27 coverage-gap columns (AGENTS.md rule 6) all ship in one
      // migration, so they get a single outer attempt/fallback rather than
      // being threaded into every branch of the cascade below.
      const withCoverageGap = await read(`${familyColumns}, wants_brahma_muhurta_reminders, consent_product_analytics, ${reminderCoverageGapColumns}`);
      if (!withCoverageGap.error) return { ...withCoverageGap, familyRemembranceSchemaReady: true, brahmaMuhurtaSchemaReady: true, productAnalyticsSchemaReady: true, reminderCoverageGapSchemaReady: true };
      if (!isMissingColumn(withCoverageGap.error)) return { ...withCoverageGap, familyRemembranceSchemaReady: false, brahmaMuhurtaSchemaReady: false, reminderCoverageGapSchemaReady: false };

      // The Native bundle may be installed before an additive DB migration.
      // Keep all existing settings readable and keep each newer control
      // disabled until its server column exists.
      const current = await read(`${familyColumns}, wants_brahma_muhurta_reminders, consent_product_analytics`);
      if (!current.error) return { ...current, familyRemembranceSchemaReady: true, brahmaMuhurtaSchemaReady: true, productAnalyticsSchemaReady: true, reminderCoverageGapSchemaReady: false };
      if (!isMissingColumn(current.error)) return { ...current, familyRemembranceSchemaReady: false, brahmaMuhurtaSchemaReady: false, reminderCoverageGapSchemaReady: false };

      const familyAndAnalytics = await read(`${familyColumns}, consent_product_analytics`);
      if (!familyAndAnalytics.error) return { ...familyAndAnalytics, familyRemembranceSchemaReady: true, brahmaMuhurtaSchemaReady: false, productAnalyticsSchemaReady: true, reminderCoverageGapSchemaReady: false };
      if (!isMissingColumn(familyAndAnalytics.error)) return { ...familyAndAnalytics, familyRemembranceSchemaReady: false, brahmaMuhurtaSchemaReady: false, productAnalyticsSchemaReady: false, reminderCoverageGapSchemaReady: false };

      const familyWithoutNewFields = await read(familyColumns);
      if (!familyWithoutNewFields.error) return { ...familyWithoutNewFields, familyRemembranceSchemaReady: true, brahmaMuhurtaSchemaReady: false, productAnalyticsSchemaReady: false, reminderCoverageGapSchemaReady: false };
      if (!isMissingColumn(familyWithoutNewFields.error)) return { ...familyWithoutNewFields, familyRemembranceSchemaReady: false, brahmaMuhurtaSchemaReady: false, productAnalyticsSchemaReady: false, reminderCoverageGapSchemaReady: false };

      const analyticsOnly = await read(`${baseColumns}, consent_product_analytics`);
      if (!analyticsOnly.error) return { ...analyticsOnly, familyRemembranceSchemaReady: false, brahmaMuhurtaSchemaReady: false, productAnalyticsSchemaReady: true, reminderCoverageGapSchemaReady: false };
      if (!isMissingColumn(analyticsOnly.error)) return { ...analyticsOnly, familyRemembranceSchemaReady: false, brahmaMuhurtaSchemaReady: false, productAnalyticsSchemaReady: false, reminderCoverageGapSchemaReady: false };

      const legacy = await read(baseColumns);
      return { ...legacy, familyRemembranceSchemaReady: false, brahmaMuhurtaSchemaReady: false, productAnalyticsSchemaReady: false, reminderCoverageGapSchemaReady: false };
    })();

    const [profileRes, cached, localTheme] = await Promise.all([
      profileSettingsPromise,
      readSettingsCache(identity),
      AsyncStorage.getItem(THEME_STORAGE_KEY),
    ]);
    if (!lease.isCurrent()) return;

    if (profileRes.error) throw profileRes.error;
    // A GET started before a save/acknowledgment cannot restore the old outbox
    // or overwrite the newer desired state when it eventually arrives.
    if (writeRevision !== writeCoordinator.getRevision()) return;

    setFamilyRemembranceSchemaReady(profileRes.familyRemembranceSchemaReady);
    setBrahmaMuhurtaSchemaReady(profileRes.brahmaMuhurtaSchemaReady);
    setProductAnalyticsSchemaReady(profileRes.productAnalyticsSchemaReady);
    setReminderCoverageGapSchemaReady(profileRes.reminderCoverageGapSchemaReady);
    const profileRow = (profileRes.data ?? null) as (Partial<SettingsState> & { tradition?: string | null }) | null;
    setProfileTradition(profileRow?.tradition || 'hindu');
    const remote = toSettingsState(profileRow ?? INITIAL_SETTINGS);
    const activePending = writeCoordinator.getPending();
    const pending = activePending ? [activePending] : (cached?.pendingOperations ?? []).filter((op) => op.status === 'pending' || op.status === 'failed');
    const merged = mergeServerWithPending(remote, pending);

    settingsRef.current = merged;
    setSettings(merged);
    setPendingWrite(pending[0] ?? null);
    const restoredRevision = writeCoordinator.getRevision();
    const isCurrentRefresh = () => lease.isCurrent() && restoredRevision === writeCoordinator.getRevision();
    const consent = confirmedSettingsConsent(remote, writeCoordinator.getPending());
    await applyProductAnalyticsConsent(appIdentity.userId, consent.product);
    if (!isCurrentRefresh()) return;
    await applyPracticeAnalyticsConsent(appIdentity.userId, consent.practice);
    if (!isCurrentRefresh()) return;
    await writeCoordinator.store(pending[0] ?? null, async () => {
      if (!isCurrentRefresh()) return;
      await writeSettingsCache({
        schemaVersion: 2, identity, savedAt: Date.now(), settings: remote,
        serverUpdatedAt: cached?.serverUpdatedAt ?? null, pendingOperations: pending,
      });
    });
    if (!isCurrentRefresh()) return;

    if (localTheme === 'light' || localTheme === 'dark' || localTheme === 'system') {
      setThemePref(localTheme);
    }

    // Resume on cold start (mirrors the foreground-resume effect below) --
    // a killed app loses any in-memory retry timer, so a queued mutation
    // must resume here too, not only on the next background->foreground
    // transition. Only 'pending' entries auto-resume; 'failed' waits for
    // an explicit user Retry tap.
    const resumable = pending.find((op) => op.status === 'pending');
    if (resumable) void attemptPendingWrite(resumable);
  }, [router, attemptPendingWrite, clearRetryTimer, appIdentity, setPendingWrite, writeCoordinator]);

  // Resume a pending write whenever the app returns to the foreground --
  // per the agreed retry policy, retries happen when foregrounded with
  // network available, never via unbounded background work/timers that iOS
  // would kill anyway.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const identity = identityRef.current;
      if (!identity || identity.kind === 'guest') return;
      const current = writeCoordinator.getPending();
      if (current?.status === 'pending') void attemptPendingWrite(current);
    });
    return () => subscription.remove();
  }, [attemptPendingWrite, writeCoordinator]);

  const runLoad = useCallback(() => {
    const lease = captureAppIdentity();
    if (!isSameAppIdentity(lease.identity, appIdentity) || appIdentity.kind === 'loading') return;
    setLoading(true);
    setLoadError(false);
    const startedAt = Date.now();
    loadSettings()
      .then(() => {
        if (!lease.isCurrent()) return;
        // No cache-first paint here (unlike Home/Mandali's SWR): Settings
        // waits for the profile fetch + cache read together, so cacheHit
        // is always false -- this still measures real "how long until
        // Settings is usable" timing.
        if (appIdentity.kind === 'authenticated') {
          recordRouteOpen({ kind: 'authenticated', userId: appIdentity.userId }, 'settings', { cacheHit: false, durationMs: Date.now() - startedAt });
        }
      })
      .catch(() => {
        if (!lease.isCurrent()) return;
        setLoadError(true);
        if (appIdentity.kind === 'authenticated') recordRefreshFailure({ kind: 'authenticated', userId: appIdentity.userId }, 'settings');
      })
      .finally(() => { if (lease.isCurrent()) setLoading(false); });
  }, [loadSettings, appIdentity]);

  const pushStatus = useSyncExternalStore(subscribePushRegistrationStatus, getPushRegistrationStatus, getPushRegistrationStatus);
  useFocusEffect(useCallback(() => {
    if (section !== 'notifications' || appIdentity.kind !== 'authenticated') return;
    void registerPushToken(appIdentity.userId, { force: true, reason: 'settings' });
    let backgrounded = AppState.currentState === 'background';
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgrounded = true;
      if (state === 'active' && backgrounded) {
        backgrounded = false;
        void registerPushToken(appIdentity.userId, { force: true, reason: 'settings' });
      }
    });
    return () => subscription.remove();
  }, [section, appIdentity]));

  // Best-effort: a failure here just leaves the Danger Zone in its default
  // "Delete account" state rather than blocking the rest of Settings from
  // loading (loadSettings/runLoad above already has its own retry UI for
  // the settings it's responsible for).
  const loadDeletionStatus = useCallback(async () => {
    if (appIdentity.kind !== 'authenticated') return;
    await accountDeletion.refresh(appIdentity.userId);
  }, [appIdentity]);

  useEffect(() => {
    if (appIdentity.kind === 'loading') return;
    runLoad();
    void loadDeletionStatus();
  }, [appIdentity.kind, runLoad, loadDeletionStatus]);

  // Guest: local-only, no server round trip, no outbox -- settings.ts's
  // pendingOperations stays permanently empty for a guest identity.
  const persistGuestSettings = async (nextState: SettingsState) => {
    setSettings(nextState);
    await writeSettingsCache({
      schemaVersion: 2,
      identity: { kind: 'guest' },
      savedAt: Date.now(),
      settings: nextState,
      serverUpdatedAt: null,
      pendingOperations: [],
    });
  };

  // Authenticated: desired-state write. Only the fields that actually
  // changed are queued (diffed against current `settings`, not the whole
  // object) -- re-toggling before the first write resolves overwrites the
  // same coalesced pending entry rather than queueing a second one, since
  // Settings tracks "the current desired state," not a log of every toggle.
  const persistSettings = async (nextState: SettingsState) => {
    const lease = captureAppIdentity();
    if (!isSameAppIdentity(lease.identity, appIdentity)) return;
    if (isGuest) {
      await persistGuestSettings(nextState);
      return;
    }
    const identity = identityRef.current;
    if (!identity || identity.kind === 'guest') return;
    if (!isSameAppIdentity(lease.identity, identity)) return;

    const changedFields: Partial<SettingsState> = {};
    (Object.keys(nextState) as Array<keyof SettingsState>).forEach((key) => {
      if (settings[key] !== nextState[key]) {
        (changedFields as Record<string, unknown>)[key] = nextState[key];
      }
    });
    if (Object.keys(changedFields).length === 0) return;

    if (changedFields.consent_product_analytics === false) {
      void revokeProductAnalyticsConsent(identity.userId);
    }
    if (changedFields.consent_religious_data === false) {
      void revokePracticeAnalyticsConsent(identity.userId);
    }

    settingsRef.current = { ...settingsRef.current, ...changedFields };
    setSettings(settingsRef.current);
    clearRetryTimer();
    const previousWrite = writeCoordinator.getPending();
    const write: PendingSettingsWrite = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fields: { ...previousWrite?.fields, ...changedFields },
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: previousWrite?.createdAt ?? Date.now(),
      status: 'pending',
    };
    setPendingWrite(write);
    await persistPendingWrite(identity, write);
    await attemptPendingWrite(write);
  };

  const retryFailedWrite = () => {
    if (pendingWrite && pendingWrite.status === 'failed') {
      const retried: PendingSettingsWrite = { ...pendingWrite, attempts: 0, status: 'pending', failureMessage: undefined, failureRetryable: undefined };
      setPendingWrite(retried);
      const identity = identityRef.current;
      if (identity?.kind === 'authenticated') {
        void persistPendingWrite(identity, retried).then(() => attemptPendingWrite(retried));
      }
    }
  };

  const discardFailedWrite = async () => {
    const identity = identityRef.current;
    if (!pendingWrite || !identity || identity.kind === 'guest') return;
    clearRetryTimer();
    setPendingWrite(null);
    await persistPendingWrite(identity, null);
    // Revert the optimistic UI back to server truth for the discarded
    // fields -- reload rather than guess, since the server may also have
    // changed in the meantime.
    await loadSettings().catch(() => {});
  };

  const enableNotificationReminder = async (nextState: SettingsState) => {
    const lease = captureAppIdentity();
    const allowed = await requestNotificationPermission();
    if (!lease.isCurrent()) return;
    if (!allowed) {
      Alert.alert(
        'Notifications are off',
        'Shoonaya could not enable this reminder without notification permission. You can allow notifications in your device settings and try again.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { void openNotificationSettings(); } },
        ],
      );
      return;
    }

    await persistSettings(nextState);
    if (!lease.isCurrent()) return;

    if (isGuest) return;

    if (appIdentity.kind === 'authenticated') {
      void registerPushToken(appIdentity.userId, { force: true, reason: 'permission' });
    }
  };

  const enableFamilyRemembranceReminder = async (nextState: SettingsState) => {
    // The central dispatcher always creates the in-app bell record before it
    // attempts OS push. Keep the explicit family opt-in useful even when OS
    // permission is off; push permission controls only the device delivery.
    const lease = captureAppIdentity();
    const allowed = await requestNotificationPermission();
    if (!lease.isCurrent()) return;
    await persistSettings(nextState);
    if (!lease.isCurrent()) return;
    if (appIdentity.kind === 'authenticated' && allowed) {
      void registerPushToken(appIdentity.userId, { force: true, reason: 'permission' });
    } else if (!allowed) {
      Alert.alert(
        'In-app reminders enabled',
        'Your family reminder will appear in Shoonaya. Allow notifications in phone settings if you also want lock-screen alerts.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { void openNotificationSettings(); } },
        ],
      );
    }
  };

  const persistTheme = async (nextTheme: ThemePref) => {
    setThemePref(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const response = await apiFetch('/api/user/export');
      if (!response.ok) throw await requestErrorFromResponse(response);
      const data = await response.text();

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'Your device does not support saving or sharing this file.');
        return;
      }

      const targetFile = new FileSystem.File(FileSystem.Paths.cache, 'shoonaya-data.json');
      targetFile.write(data);
      await Sharing.shareAsync(targetFile.uri);
    } catch (error) {
      Alert.alert('Could not download data', describeFailure(error, 'Could not prepare your data. Please try again.', language));
    } finally {
      setDownloading(false);
    }
  };

  // Now the same canonical deletion flow as web (ProfileClient.tsx /
  // DeleteAccountClient.tsx): POST /api/user/delete/request starts a 30-day
  // cancellable cool-off (profiles.is_deleting / deletion_requested_at) --
  // it does not delete anything immediately, and does not sign the user
  // out, since the account is still fully usable during the cool-off. The
  // old immediate-hard-delete route (POST /api/user/delete) is no longer
  // called from any user-facing UI; see that route's own comment in the
  // web repo.
  const openDeletionSheet = async () => {
    if (appIdentity.kind !== 'authenticated') return;
    try {
      const res = await apiFetch('/api/user/delete/preview', { expectedUserId: appIdentity.userId });
      if (res.ok) {
        const preview = (await res.json().catch(() => null)) as {
          success?: boolean;
          userName?: string;
          tradition?: string;
          streak?: number;
          karmaPoints?: number;
          sevaScore?: number;
          relicsCount?: number;
          journalCount?: number;
          activeSankalpas?: number;
          ownedKuls?: Array<{ id: string; name: string }>;
          ownedMandalis?: Array<{ id: string; name: string }>;
          reasons?: unknown;
        } | null;

        if (preview?.success) {
          setDeletionSnapshot({
            userName: preview.userName || 'Seeker',
            tradition: preview.tradition || profileTradition || 'hindu',
            streak: preview.streak ?? 0,
            karmaPoints: preview.karmaPoints ?? 0,
            sevaScore: preview.sevaScore ?? 0,
            relicsCount: preview.relicsCount ?? 0,
            journalCount: preview.journalCount ?? 0,
            activeSankalpas: preview.activeSankalpas ?? 0,
            ownedKuls: preview.ownedKuls ?? [],
            ownedMandalis: preview.ownedMandalis ?? [],
            reasons: readDeletionReasons(preview.reasons),
            summaryAvailable: true,
            lang: language,
          });
          setDeletionSheetVisible(true);
          return;
        }
      }
    } catch {
      // Falls through to the unavailable summary below.
    }

    // No client-side reconstruction of the summary: the preview route is the
    // one source for these numbers, so offline we show none rather than
    // partial or guessed ones. Reasons are hidden too (they are optional).
    setDeletionSnapshot((prev) => ({
      ...prev,
      userName: '',
      tradition: profileTradition || 'hindu',
      streak: 0,
      karmaPoints: 0,
      sevaScore: 0,
      relicsCount: 0,
      journalCount: 0,
      activeSankalpas: 0,
      ownedKuls: [],
      ownedMandalis: [],
      reasons: [],
      summaryAvailable: false,
      lang: language,
    }));
    setDeletionSheetVisible(true);
  };

  const confirmDeletionRequest = async (payload?: { reason?: string; otherReason?: string }) => {
    setDeleting(true);
    try {
      const response = await apiFetch('/api/user/delete/request', {
        method: 'POST',
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const json: unknown = await response.json().catch(() => null);
      const data = json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
      const success = data?.success === true;
      if (!response.ok || !success) throw await requestErrorFromResponse(response, { parsedBody: json });
      if (appIdentity.kind === 'authenticated') {
        accountDeletion.markScheduled(
          appIdentity.userId,
          typeof data?.deletionRequestedAt === 'string' ? data.deletionRequestedAt : new Date().toISOString(),
          typeof data?.purgeAfter === 'string' ? data.purgeAfter : null,
        );
      }

      // Immediately unregister device push token and clear local home caches
      await unregisterPushToken({ beforeSignOut: false }).catch(() => {});
      await clearAllHomeCaches().catch(() => {});

      Alert.alert(deletionCopy.scheduledTitle, deletionCopy.scheduledBody);
    } catch (error) {
      Alert.alert(deletionCopy.scheduleFailedTitle, describeFailure(error, deletionCopy.scheduleFailed, language));
      throw error;
    } finally {
      setDeleting(false);
    }
  };

  const handlePauseNotificationsInstead = async () => {
    const mutedSettings: Partial<SettingsState> = {
      japa_reminder_enabled: false,
      quiz_reminder_enabled: false,
      wants_festival_reminders: false,
      wants_vrat_reminders: false,
      wants_tithi_reminders: false,
      wants_shloka_reminders: false,
      wants_nitya_reminders: false,
      wants_community_notifications: false,
      wants_family_notifications: false,
    };
    await persistSettings({ ...settings, ...mutedSettings });
    Alert.alert(deletionCopy.remindersOffTitle, deletionCopy.remindersOffBody);
  };

  const handleCancelDeletion = async () => {
    setCancelingDeletion(true);
    try {
      if (appIdentity.kind !== 'authenticated') return;
      // Confirms the response, re-registers push and updates Profile too.
      await accountDeletion.cancel(appIdentity.userId);

      Alert.alert(deletionCopy.cancelledTitle, deletionCopy.cancelledBody);
    } catch (error) {
      Alert.alert(deletionCopy.cancelFailedTitle, describeFailure(error, deletionCopy.cancelFailed, language));
    } finally {
      setCancelingDeletion(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      clearRetryTimer();
      await clearAllHomeCaches();
      await clearAllSettingsCaches();
      await clearAllOnboardingDrafts();
      await signOutWithPushCleanup();
    } finally {
      setSigningOut(false);
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

  const title = {
    account: 'Account & Profile',
    notifications: 'Notifications',
    appearance: 'Language & Appearance',
    privacy: 'Privacy & Data',
    about: 'About Shoonaya',
  }[section];

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + NAV_BAR_CLEARANCE + 20, gap: 20 }} showsVerticalScrollIndicator={false}>
        <BackButton fallbackHref="/settings" handleHardwareBack />

        <View style={{ gap: 2 }}>
          <Text style={{ ...TYPE.screenTitle, color: theme.text }}>{title}</Text>
          {saving ? <Text style={{ ...TYPE.caption, color: theme.dim }}>Sending...</Text> : null}
        </View>

        {/* Explicit failure state -- never an indefinite "Sending..." past
            the last retry attempt. Retry re-attempts the same desired
            values; Discard drops the queued write and reloads server
            truth for the affected fields. */}
        {pendingWrite?.status === 'failed' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderRadius: RADII.md,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
              backgroundColor: COLORS.dangerBg,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Feather name="alert-circle" size={15} color={COLORS.danger} />
            <Text style={{ ...TYPE.caption, color: COLORS.danger, flex: 1 }}>
              {pendingWrite.failureMessage ?? (language === 'hi' ? 'भेजा नहीं जा सका' : 'Could not send')}
            </Text>
            {pendingWrite.failureRetryable !== false ? (
              <PressableSurface haptic="selection" onPress={retryFailedWrite} style={{ minHeight: 0 }}>
                <Text style={{ ...TYPE.label, fontSize: 12.5, color: COLORS.danger, textDecorationLine: 'underline' }}>Retry</Text>
              </PressableSurface>
            ) : null}
            <PressableSurface haptic="selection" onPress={() => { void discardFailedWrite(); }} style={{ minHeight: 0 }}>
              <Text style={{ ...TYPE.label, fontSize: 12.5, color: theme.dim, textDecorationLine: 'underline' }}>Discard</Text>
            </PressableSurface>
          </View>
        ) : null}

        {loadError ? (
          <EmptyState
            icon="wifi-off"
            title="Could not load settings"
            subtitle="Check your connection, then try again."
            ctaLabel="Retry"
            onCta={runLoad}
          />
        ) : (
          <>
            {/* ── Account ─────────────────────────────────────────────── */}
            {section === 'account' ? <SettingsSection label="Account" theme={theme}>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>
                {isGuest ? 'Join Shoonaya to save your sadhana and progress.' : 'Manage your name and spiritual tradition from Profile.'}
              </Text>
              {isGuest ? (
                <Button
                  label="Sign in / Sign up"
                  variant="primary"
                  onPress={async () => {
                    await setGuestMode(false);
                    router.replace('/(auth)/login');
                  }}
                />
              ) : (
                <>
                  <Button
                    label="Personal details"
                    variant="secondary"
                    onPress={() => router.push('/settings/personal-details')}
                  />
                  <Button
                    label="Personalisation"
                    variant="secondary"
                    onPress={() => router.push('/settings/personalisation')}
                  />
                  <Button
                    label={signingOut ? 'Signing out...' : 'Sign out'}
                    variant="secondary"
                    loading={signingOut}
                    onPress={() => { void handleSignOut(); }}
                  />
                </>
              )}
            </SettingsSection> : null}

            {/* ── Notifications ───────────────────────────────────────── */}
            {section === 'notifications' ? <SettingsSection label="Notifications" theme={theme}>
              {appIdentity.kind === 'authenticated' ? (
                <View style={{ gap: 8, paddingBottom: 16 }}>
                  <Text style={{ ...TYPE.label, color: theme.text }}>{pushStatusCopy.device}</Text>
                  <Text accessibilityLiveRegion="polite" style={{ ...TYPE.caption, color: theme.dim }}>
                    {pushStatus.userId !== appIdentity.userId || pushStatus.status === 'idle' || pushStatus.status === 'syncing'
                      ? pushStatusCopy.checking
                      : pushStatus.status === 'permission_denied' ? pushStatusCopy.permissionOff
                      : pushStatus.status === 'registered' || pushStatus.status === 'fresh' ? pushStatusCopy.registered
                      : pushStatus.status === 'unavailable' ? pushStatusCopy.unavailable
                      : pushStatus.status === 'deletion_pending' ? pushStatusCopy.deletionPending
                      : pushStatusCopy.failed}
                  </Text>
                  {pushStatus.status === 'deletion_pending' ? null : (
                    <Button label={pushStatus.status === 'permission_denied' ? pushStatusCopy.openSettings : pushStatusCopy.checkSetup}
                      variant="secondary" disabled={pushStatus.status === 'syncing'}
                      onPress={() => {
                        if (pushStatus.status === 'permission_denied') { void openNotificationSettings(); return; }
                        void registerPushToken(appIdentity.userId, { force: true, reason: 'settings' });
                      }} />
                  )}
                  <View style={{ height: 1, backgroundColor: theme.borderSoft, marginTop: 8 }} />
                </View>
              ) : null}
              {NOTIFICATION_TOGGLES.map((item, index) => {
                // Newer opt-ins stay disabled until their profile column exists.
                const awaitingServerUpdate =
                  (item.key === 'wants_family_remembrance_reminders' && !familyRemembranceSchemaReady) ||
                  (item.key === 'wants_brahma_muhurta_reminders' && !brahmaMuhurtaSchemaReady) ||
                  (REMINDER_COVERAGE_GAP_KEYS.includes(item.key) && !reminderCoverageGapSchemaReady);
                return (
                <View key={item.key}>
                  {index > 0 ? (
                    <View style={{ height: 1, backgroundColor: theme.borderSoft, marginBottom: 16 }} />
                  ) : null}
                  <ToggleRow
                    label={language === 'hi' ? item.labelHi : item.label}
                    subtitle={item.requiresAccount && isGuest
                      ? `${language === 'hi' ? item.subtitleHi : item.subtitle} ${language === 'hi' ? '(सक्रिय करने के लिए साइन इन करें)' : '(sign in to enable)'}`
                      : awaitingServerUpdate
                        ? (language === 'hi' ? 'यह सुविधा सर्वर अपडेट इंस्टॉल होने के बाद उपलब्ध होगी' : 'Available after the matching server update is installed')
                        : (language === 'hi' ? item.subtitleHi : item.subtitle)}
                    value={(settings[item.key] as boolean | undefined) ?? false}
                    disabled={item.disabled || (item.requiresAccount === true && isGuest) || awaitingServerUpdate}
                    badge={item.badge}
                    onChange={(value) => {
                      if (item.disabled || (item.requiresAccount === true && isGuest) || awaitingServerUpdate) return;
                      // Turning a reminder ON is exactly the "contextual"
                      // moment to (re-)ask for OS push permission — mirrors
                      // the web app's own contextual push-permission
                      // onboarding (docs/NOTIFICATION_ARCHITECTURE_AUDIT.md)
                      // and closes the gap docs/native-adrs/002-notifications.md
                      // flagged as still "Proposed": previously the only
                      // permission prompt on native was a single ask at the
                      // end of onboarding, so anyone who declined there (or
                      // later revoked it in OS settings) had no way back in.
                      // requestNotificationPermission() is a safe no-op if
                      // permission is already granted, and iOS/Android both
                      // silently no-op a re-prompt after a previous denial
                      // rather than re-showing the OS dialog — so this never
                      // nags, it just gives a path back in for anyone who
                      // can still be prompted.
                      const nextState = { ...settings, [item.key]: value };
                      if (value) {
                        if (item.key === 'wants_family_remembrance_reminders') {
                          void enableFamilyRemembranceReminder(nextState);
                          return;
                        }
                        void enableNotificationReminder(nextState);
                        return;
                      }
                      void persistSettings(nextState);
                    }}
                    theme={theme}
                  />
                  {item.key === 'japa_reminder_enabled' && !isGuest && settings.japa_reminder_enabled ? (
                    <ReminderTimePicker
                      label="Japa reminder time"
                      hint="Uses your profile timezone. Choose when you would like a daily nudge to practise."
                      value={settings.japa_reminder_time}
                      fallback={INITIAL_SETTINGS.japa_reminder_time}
                      onSave={(clock) => { void persistSettings({ ...settings, japa_reminder_time: clock }); }}
                      theme={theme}
                    />
                  ) : null}
                  {item.key === 'quiz_reminder_enabled' && !isGuest && settings.quiz_reminder_enabled ? (
                    <ReminderTimePicker
                      label="Quiz-ready reminder time"
                      hint="Uses your profile timezone. Choose 7:00 AM–3:00 PM. If the quiz is still unfinished, one follow-up is planned for 6:00 PM; quiet hours and the daily notification limit still apply."
                      value={settings.quiz_reminder_time}
                      fallback={INITIAL_SETTINGS.quiz_reminder_time}
                      min={QUIZ_REMINDER_EARLIEST}
                      max={QUIZ_REMINDER_LATEST}
                      onSave={(clock) => { void persistSettings({ ...settings, quiz_reminder_time: clock }); }}
                      theme={theme}
                    />
                  ) : null}
                  {item.key === 'wants_family_remembrance_reminders' && !isGuest && settings.wants_family_remembrance_reminders ? (
                    <ReminderTimePicker
                      label="Family remembrance reminder time"
                      hint="Uses your profile timezone. Choose 8:00 AM–9:59 PM. Quiet hours can move it to the next allowed time."
                      value={settings.family_remembrance_time}
                      fallback={INITIAL_SETTINGS.family_remembrance_time}
                      min={FAMILY_REMEMBRANCE_EARLIEST}
                      max={FAMILY_REMEMBRANCE_LATEST}
                      onSave={(clock) => { void persistSettings({ ...settings, family_remembrance_time: clock }); }}
                      theme={theme}
                    />
                  ) : null}
                </View>
                );
              })}
              <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
              <View style={{ gap: 10 }}>
                <Text style={{ ...TYPE.label, color: theme.text }}>Observance reminder days</Text>
                <Text style={{ ...TYPE.caption, color: theme.dim }}>Choose when to be reminded before a festival or vrat. No selected days means no observance reminders.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[{ day: 0, label: 'Day of' }, { day: 1, label: '1 day before' }].map((option) => {
                    const selected = (settings.observance_reminder_lead_days ?? [0, 1]).includes(option.day);
                    return (
                      <PressableSurface
                        key={option.day}
                        haptic="selection"
                        accessibilityRole="button"
                        accessibilityLabel={`${option.label}${selected ? ', selected' : ''}`}
                        onPress={() => {
                          const current = settings.observance_reminder_lead_days ?? [0, 1];
                          const nextDays = selected
                            ? current.filter((day) => day !== option.day)
                            : [...current, option.day].sort((a, b) => a - b);
                          void persistSettings({ ...settings, observance_reminder_lead_days: nextDays });
                        }}
                        style={{ minHeight: MIN_TOUCH_TARGET, borderRadius: RADII.lg, borderWidth: 1, borderColor: selected ? theme.brand : theme.border, backgroundColor: selected ? theme.brandSoft : theme.card, paddingHorizontal: 14, justifyContent: 'center' }}
                      >
                        <Text style={{ ...TYPE.caption, color: selected ? theme.brand : theme.text }}>{option.label}</Text>
                      </PressableSurface>
                    );
                  })}
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
              <ReminderTimePicker
                label="Festival and vrat reminder time"
                hint="Uses your profile timezone."
                value={settings.observance_reminder_time ?? '08:00'}
                fallback="08:00"
                onSave={(clock) => { void persistSettings({ ...settings, observance_reminder_time: clock }); }}
                theme={theme}
              />
            </SettingsSection> : null}

            {/* ── Language / preferences ──────────────────────────────── */}
            {section === 'appearance' ? (
              <>
                <SettingsSection label="Home Customisation" theme={theme}>
                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityLabel={`Sanctuary backdrop & height. Current: ${heroPick ? heroPick.id : 'Auto-rotating'}, ${HERO_SIZE_CONFIG[heroSize].label}`}
                    accessibilityHint="Opens the backdrop picker to choose deity artwork and banner height"
                    onPress={() => setHeroPickerVisible(true)}
                    style={{
                      minHeight: 56,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                    }}
                  >
                    <View style={{ gap: 3, flex: 1, paddingRight: 8 }}>
                      <Text style={{ ...TYPE.body, fontFamily: FONTS.sansSemiBold, color: theme.text }}>Sanctuary Backdrop & Height</Text>
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>
                        {heroPick ? 'Custom artwork selected' : 'Auto-rotating tradition artwork'} • {HERO_SIZE_CONFIG[heroSize].label}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="image" size={18} color={theme.brand} />
                      <Feather name="chevron-right" size={18} color={theme.dim} />
                    </View>
                  </PressableSurface>

                  <View style={{ height: 1, backgroundColor: theme.borderSoft }} />

                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="button"
                    accessibilityLabel={`Home greeting. Current: ${greetingPick ?? 'Auto-rotating tradition greeting'}`}
                    accessibilityHint="Opens the greeting picker to choose your preferred greeting"
                    onPress={() => setGreetingPickerVisible(true)}
                    style={{
                      minHeight: 56,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                    }}
                  >
                    <View style={{ gap: 3, flex: 1, paddingRight: 8 }}>
                      <Text style={{ ...TYPE.body, fontFamily: FONTS.sansSemiBold, color: theme.text }}>Home Greeting</Text>
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>
                        {greetingPick ? `Locked to "${greetingPick}"` : 'Auto-rotating tradition greeting'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="message-circle" size={18} color={theme.brand} />
                      <Feather name="chevron-right" size={18} color={theme.dim} />
                    </View>
                  </PressableSurface>
                </SettingsSection>

                <SettingsSection label="Language / Preferences" theme={theme}>
                  {[
                    { label: 'App language', key: 'app_language' as const },
                    { label: 'Meaning language', key: 'meaning_language' as const },
                    { label: 'Transliteration', key: 'transliteration_language' as const },
                  ].map((row) => (
                    <View key={row.key} style={{ gap: 10 }}>
                      <Text style={{ ...TYPE.caption, color: theme.dim }}>{row.label}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {LANGUAGES.map((lang) => (
                          <Pill
                            key={lang.key}
                            label={lang.label}
                            selected={settings[row.key] === lang.key}
                            onPress={() => {
                              if (row.key === 'app_language' && (lang.key === 'en' || lang.key === 'hi' || lang.key === 'pa')) {
                                void setLanguage(lang.key as AppLanguage);
                              }
                              void persistSettings({ ...settings, [row.key]: lang.key });
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  ))}

                  <View style={{ gap: 10 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim }}>Appearance</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {THEME_OPTIONS.map((opt) => (
                        <Pill
                          key={opt.key}
                          label={opt.label}
                          selected={themePref === opt.key}
                          onPress={() => { void persistTheme(opt.key); }}
                        />
                      ))}
                    </View>
                  </View>
                </SettingsSection>
              </>
            ) : null}

            {/* ── Guidance & tips ─────────────────────────────────────── */}
            {section === 'about' ? <SettingsSection label="Guidance & Tips" theme={theme}>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>
                Bring back the hints Shoonaya shows when you are new to a
                feature. If you have already moved past your first week of
                practice, the welcome card will not reappear -- only the
                occasional feature hint will.
              </Text>
              <Button
                label="Replay first-use tips"
                variant="secondary"
                onPress={async () => {
                  await Promise.all([
                    replayHomeDiscovery(getAppIdentity()),
                    resetFirstWeekGuideCue(),
                  ]);
                  Alert.alert('Tips reset', 'You will see onboarding hints again as you use the app.');
                }}
              />
              <Button
                label={language === 'hi' ? 'ऐप की मुख्य झलक देखें' : 'Take the visual tour'}
                variant="secondary"
                accessibilityLabel={language === 'hi' ? 'चार मुख्य पृष्ठों की झलक' : 'Visual preview of the four core sections'}
                onPress={() => setTourVisible(true)}
              />
            </SettingsSection> : null}

            {/* ── Community & Socials ─────────────────────────────────── */}
            {section === 'about' ? <SettingsSection label="Community & Socials" theme={theme}>
              {[
                {
                  id: 'instagram',
                  icon: 'instagram',
                  label: 'Instagram',
                  handle: '@shoonayaapp',
                  url: SOCIAL_LINKS.instagram,
                },
                {
                  id: 'facebook',
                  icon: 'facebook-square',
                  label: 'Facebook',
                  handle: 'Shoonaya',
                  url: SOCIAL_LINKS.facebook,
                },
                {
                  id: 'linkedin',
                  icon: 'linkedin-square',
                  label: 'LinkedIn',
                  handle: 'Shoonaya',
                  url: SOCIAL_LINKS.linkedin,
                },
                {
                  id: 'email',
                  icon: 'envelope',
                  label: 'Official Email',
                  handle: OFFICIAL_EMAIL,
                  url: SOCIAL_LINKS.email,
                },
                {
                  id: 'website',
                  icon: 'globe',
                  label: 'Official Website',
                  handle: 'shoonaya.com',
                  url: SOCIAL_LINKS.website,
                },
              ].map((social, index) => (
                <View key={social.id}>
                  {index > 0 ? (
                    <View style={{ height: 1, backgroundColor: theme.borderSoft, marginVertical: 8 }} />
                  ) : null}
                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="link"
                    accessibilityLabel={social.label}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      void Linking.openURL(social.url);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: MIN_TOUCH_TARGET,
                      paddingVertical: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: theme.brandSoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FontAwesome name={social.icon as any} size={17} color={theme.brand} />
                      </View>
                      <View>
                        <Text style={{ ...TYPE.body, color: theme.text, fontFamily: FONTS.sansSemiBold }}>
                          {social.label}
                        </Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim }}>
                          {social.handle}
                        </Text>
                      </View>
                    </View>
                    <Feather name="external-link" size={15} color={theme.dim} />
                  </PressableSurface>
                </View>
              ))}
            </SettingsSection> : null}

            {/* ── Privacy & data ──────────────────────────────────────── */}
            {section === 'privacy' ? <SettingsSection label="Privacy & Data" theme={theme}>
              <ToggleRow
                label="Tradition-aware personalization"
                subtitle="Uses your spiritual preference data to tailor recommendations. If product usage sharing is enabled, it also permits a broad practice-completed event for measurement."
                value={settings.consent_religious_data}
                onChange={(value) => { void persistSettings({ ...settings, consent_religious_data: value }); }}
                theme={theme}
              />
              <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
              <ToggleRow
                label="Practice activity personalization"
                subtitle={isGuest
                  ? 'Sign in to save this choice to your account.'
                  : 'Allow recent practice activity to reorder Mood and Sankalpa suggestions. Turn this off any time.'}
                value={settings.consent_activity_personalization}
                disabled={isGuest}
                onChange={(value) => { void persistSettings({ ...settings, consent_activity_personalization: value }); }}
                theme={theme}
              />
              <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
              <ToggleRow
                label="Share product usage data"
                subtitle={productAnalyticsSchemaReady
                  ? 'Optional, account-linked daily events (such as app opened or practice completed) are kept for up to 90 days. Practice events require “Tradition-aware personalization” too. Admin reports show daily totals only for groups of 20 or more accounts. We never send screen names, spiritual content, mood, location, or profile details. Turn this off any time to stop collection and delete saved events.'
                  : 'Available after the app and service are updated.'}
                value={settings.consent_product_analytics === true}
                disabled={isGuest || !productAnalyticsSchemaReady}
                onChange={(value) => { void persistSettings({ ...settings, consent_product_analytics: value }); }}
                theme={theme}
              />
              {!isGuest ? (
                <>
                  <View style={{ height: 1, backgroundColor: theme.borderSoft }} />
                  <Button
                    label={downloading ? 'Preparing export...' : 'Download your data'}
                    variant="secondary"
                    loading={downloading}
                    onPress={() => { void handleDownloadData(); }}
                  />
                </>
              ) : null}
            </SettingsSection> : null}

            {/* ── Danger zone ──────────────────────────────────────────── */}
            {section === 'privacy' && !isGuest ? (
              <View style={{ gap: 12 }}>
                <SectionHeader label="Danger Zone" />
                <Card
                  tone="auto"
                  style={{ backgroundColor: theme.card, borderColor: COLORS.dangerBorder, gap: 10 }}
                >
                  {deletionStatus?.isDeleting ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Feather name="clock" size={16} color={COLORS.danger} style={{ marginTop: 2 }} />
                        <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1 }}>
                          Account scheduled for deletion
                          {deletionStatus.purgeAfter
                            ? ` on ${new Date(deletionStatus.purgeAfter).toLocaleDateString()}`
                            : ''}
                          .{deletionStatus.deletionRequestedAt
                            ? ` Requested ${new Date(deletionStatus.deletionRequestedAt).toLocaleDateString()}.`
                            : ''}{' '}
                          Cancel anytime before then to keep your account.
                        </Text>
                      </View>
                      <Button
                        label={cancelingDeletion ? 'Cancelling...' : 'Cancel deletion request'}
                        variant="secondary"
                        loading={cancelingDeletion}
                        onPress={() => { void handleCancelDeletion(); }}
                      />
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Feather name="alert-triangle" size={16} color={COLORS.danger} style={{ marginTop: 2 }} />
                        <Text style={{ ...TYPE.caption, color: theme.dim, flex: 1 }}>
                          {deletionCopy.dangerZoneNote}
                        </Text>
                      </View>
                      <DangerButton
                        label="Delete account"
                        loading={deleting}
                        onPress={() => { void openDeletionSheet(); }}
                        isDark={isDark}
                      />
                    </>
                  )}
                </Card>
              </View>
            ) : null}

            {(section === 'privacy' || section === 'about') ? (
              <View style={{ alignItems: 'center', gap: 8, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="link"
                    accessibilityLabel="Terms of Service"
                    hitSlop={10}
                    onPress={() => { void openLegalUrl('/terms'); }}
                    style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                  >
                    <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Terms
                    </Text>
                  </PressableSurface>
                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="link"
                    accessibilityLabel="Privacy Policy"
                    hitSlop={10}
                    onPress={() => { void openLegalUrl('/privacy'); }}
                    style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                  >
                    <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Privacy
                    </Text>
                  </PressableSurface>
                  <PressableSurface
                    haptic="selection"
                    accessibilityRole="link"
                    accessibilityLabel="Content Sources"
                    hitSlop={10}
                    onPress={() => { void openLegalUrl('/sources'); }}
                    style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
                  >
                    <Text style={{ ...TYPE.chip, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Sources
                    </Text>
                  </PressableSurface>
                </View>
                <Text style={{ ...TYPE.caption, fontSize: 11, color: theme.dim, opacity: 0.65 }}>
                  Shoonaya {APP_VERSION_LABEL}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <HeroBackdropPicker
        visible={heroPickerVisible}
        onClose={() => setHeroPickerVisible(false)}
        tradition={profileTradition}
        currentSize={heroSize}
        onPickChange={(pick) => setHeroPickState(pick)}
        onSizeChange={(size) => setHeroSizeState(size)}
      />

      <GreetingPicker
        visible={greetingPickerVisible}
        onClose={() => setGreetingPickerVisible(false)}
        tradition={profileTradition}
        onPickChange={(pick) => setGreetingPickState(pick)}
      />

      <AccountDeletionSheet
        visible={deletionSheetVisible}
        snapshot={deletionSnapshot}
        onClose={() => setDeletionSheetVisible(false)}
        onConfirmDeletion={confirmDeletionRequest}
        onPauseNotificationsInstead={handlePauseNotificationsInstead}
        onExportData={handleDownloadData}
      />

      <AppTourModal
        visible={tourVisible}
        onClose={() => setTourVisible(false)}
        isHindi={language === 'hi'}
      />
    </Screen>
  );
}

export default function AccountSettingsScreen() {
  return <SettingsDetailScreen section="account" />;
}
