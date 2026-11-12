import { memo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAppIdentity } from '@/lib/appIdentity';
import { readUserScoped, USER_SCOPED_NAMES, writeUserScoped } from '@/lib/userScopedStorage';
import { FEATURE_COLORS, OVERLAYS, COLORS, FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

export type FastingMode = 'nirjala' | 'phalahar' | 'ekbhukta' | 'sankalpa';

interface VratFastingCardProps {
  vratName: string;
  vratSlug: string;
  occurrenceDate?: string | null;
  paranaTime?: string | null;
  isEligibleToday: boolean;
  isObserved: boolean;
  observeCount?: number;
  observeLoading: boolean;
  onObserve: () => void;
  wantsReminders?: boolean;
  /** Resolves true only once the preference is actually persisted -- the
   * card commits its optimistic toggle on true, and reverts/leaves it
   * alone on false (sign-in-required, or a failed write). */
  onToggleReminders?: (enabled: boolean) => Promise<boolean>;
  language?: 'en' | 'hi' | 'pa';
  isDark?: boolean;
}

const COPY = {
  en: {
    todayVrat: "Today's Sacred Fast",
    upcomingVrat: 'Upcoming Fasting Vow',
    chooseRhythm: 'Fasting rhythm:',
    modes: {
      nirjala: 'Nirjala (Waterless)',
      phalahar: 'Phalahar (Fruit & Milk)',
      ekbhukta: 'Ekbhukta (1 Meal)',
      sankalpa: 'Mindful Sankalpa',
    },
    observeCta: 'Log Fast (+25 Karma) 🙏',
    sankalpaCta: 'Commit Sankalpa 🌸',
    sankalpaTaken: 'Sankalpa Committed ✓',
    observedToday: 'Vrat Observed Today ✓',
    paranaWindow: 'Parana',
    remindMe: 'Remind me',
    aiPromptCta: 'Ask Dharma Mitra',
  },
  hi: {
    todayVrat: 'आज का पावन व्रत',
    upcomingVrat: 'आगामी व्रत संकल्प',
    chooseRhythm: 'उपवास विधि:',
    modes: {
      nirjala: 'निर्जला',
      phalahar: 'फलाहार',
      ekbhukta: 'एकभुक्त',
      sankalpa: 'पावन संकल्प',
    },
    observeCta: 'व्रत अंकित करें (+25) 🙏',
    sankalpaCta: 'संकल्प लें 🌸',
    sankalpaTaken: 'संकल्प धारण किया ✓',
    observedToday: 'आज व्रत पूर्ण हुआ ✓',
    paranaWindow: 'पारण',
    remindMe: 'स्मरण कराएं',
    aiPromptCta: 'धर्म मित्र से पूछें',
  },
  pa: {
    todayVrat: 'ਅੱਜ ਦਾ ਪਾਵਨ ਵਰਤ',
    upcomingVrat: 'ਆਉਣ ਵਾਲਾ ਵਰਤ ਸੰਕਲਪ',
    chooseRhythm: 'ਵਰਤ ਵਿਧੀ:',
    modes: {
      nirjala: 'ਨਿਰਜਲਾ',
      phalahar: 'ਫਲਾਹਾਰ',
      ekbhukta: 'ਇੱਕ ਸਮੇਂ ਦਾ ਭੋਜਨ',
      sankalpa: 'ਪਾਵਨ ਸੰਕਲਪ',
    },
    observeCta: 'ਵਰਤ ਦਰਜ ਕਰੋ (+25) 🙏',
    sankalpaCta: 'ਸੰਕਲਪ ਲਓ 🌸',
    sankalpaTaken: 'ਸੰਕਲਪ ਲਿਆ ਗਿਆ ✓',
    observedToday: 'ਅੱਜ ਵਰਤ ਪੂਰਾ ਹੋਇਆ ✓',
    paranaWindow: 'ਪਾਰਣਾ',
    remindMe: 'ਯਾਦ ਦਿਵਾਓ',
    aiPromptCta: 'ਧਰਮ ਮਿੱਤਰ ਤੋਂ ਪੁੱਛੋ',
  },
};

export const VratFastingCard = memo(function VratFastingCard({
  vratName,
  vratSlug,
  occurrenceDate,
  paranaTime,
  isEligibleToday,
  isObserved,
  observeCount = 0,
  observeLoading,
  onObserve,
  wantsReminders = true,
  onToggleReminders,
  language = 'en',
  isDark = true,
}: VratFastingCardProps) {
  const router = useRouter();
  const theme = themeColor(isDark);
  const copy = COPY[language] ?? COPY.en;

  const appIdentity = useAppIdentity();
  const [selectedMode, setSelectedMode] = useState<FastingMode>('phalahar');
  const [sankalpaCommitted, setSankalpaCommitted] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(wantsReminders);
  const [togglingReminders, setTogglingReminders] = useState(false);

  useEffect(() => {
    let mounted = true;
    setSelectedMode('phalahar');
    setSankalpaCommitted(false);
    readUserScoped(appIdentity, `${USER_SCOPED_NAMES.vratMode}:${vratSlug}`)
      .then((val) => {
        if (mounted && val && (['nirjala', 'phalahar', 'ekbhukta', 'sankalpa'] as FastingMode[]).includes(val as FastingMode)) {
          setSelectedMode(val as FastingMode);
        }
      })
      .catch(() => {});

    readUserScoped(appIdentity, `${USER_SCOPED_NAMES.vratSankalpa}:${vratSlug}`)
      .then((val) => {
        if (mounted && val === 'true') {
          setSankalpaCommitted(true);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [appIdentity, vratSlug]);

  // The parent reads the real wants_vrat_reminders value asynchronously
  // (it isn't known at this card's own mount time) and passes it down once
  // loaded. Re-sync on every change, not just at mount -- a useState
  // initializer only runs once, so without this the card would keep
  // showing its initial guess even after the real value arrives.
  useEffect(() => {
    setRemindersEnabled(wantsReminders);
  }, [wantsReminders]);

  const handleSelectMode = async (mode: FastingMode) => {
    setSelectedMode(mode);
    void Haptics.selectionAsync().catch(() => {});
    try {
      await writeUserScoped(appIdentity, `${USER_SCOPED_NAMES.vratMode}:${vratSlug}`, mode);
    } catch {
      // non-blocking
    }
  };

  const handleSankalpaCommit = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSankalpaCommitted(true);
    try {
      await writeUserScoped(appIdentity, `${USER_SCOPED_NAMES.vratSankalpa}:${vratSlug}`, 'true');
    } catch {
      // non-blocking
    }
  };

  const handleToggleReminder = async () => {
    if (!onToggleReminders || togglingReminders) return;
    const nextVal = !remindersEnabled;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTogglingReminders(true);
    try {
      // Commit the visible toggle only once the parent confirms the write
      // actually persisted -- a sign-in-required block or a failed save
      // must leave the bell showing the still-true saved state, not a
      // flipped one that was never written.
      const persisted = await onToggleReminders(nextVal);
      if (persisted) {
        setRemindersEnabled(nextVal);
      }
    } finally {
      setTogglingReminders(false);
    }
  };

  const handleOpenAiChat = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const prompt = language === 'hi'
      ? `${vratName} के पावन व्रत के आध्यात्मिक महत्व, पारण समय और साधना विधि के बारे में बताएं।`
      : language === 'pa'
      ? `${vratName} ਦੇ ਪਾਵਨ ਵਰਤ ਦੇ ਮਹੱਤਵ ਅਤੇ ਪਾਰਣਾ ਵਿਧੀ ਬਾਰੇ ਦੱਸੋ।`
      : `What is the spiritual significance, traditional rules, and parana breaking-fast timings for ${vratName}?`;

    router.push({
      pathname: '/ai-chat' as any,
      params: { initialPrompt: prompt },
    });
  };

  const modes: Array<{ key: FastingMode; label: string; icon: string }> = [
    { key: 'phalahar', label: copy.modes.phalahar, icon: '🍎' },
    { key: 'nirjala', label: copy.modes.nirjala, icon: '🌿' },
    { key: 'ekbhukta', label: copy.modes.ekbhukta, icon: '🍚' },
    { key: 'sankalpa', label: copy.modes.sankalpa, icon: '🌸' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? FEATURE_COLORS.vratFastingCard.surfaceDark : FEATURE_COLORS.vratFastingCard.surfaceLight,
          borderColor: isDark ? OVERLAYS.metallicGold[0.22] : FEATURE_COLORS.vratFastingCard.borderLight,
        },
      ]}
    >
      {/* ── 1. Compact Header Strip ── */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Image
            source={require('@/assets/relics/tulsi-leaf.png')}
            style={styles.relicIcon}
            resizeMode="contain"
          />
          <Text style={[styles.badgeText, { color: theme.brand }]} numberOfLines={1}>
            {isEligibleToday ? copy.todayVrat : copy.upcomingVrat}
          </Text>
        </View>

        {occurrenceDate ? (
          <View style={[styles.datePill, { backgroundColor: isDark ? OVERLAYS.white[0.06] : OVERLAYS.black[0.04] }]}>
            <Feather name="calendar" size={11} color={theme.dim} />
            <Text style={[styles.dateText, { color: theme.dim }]} numberOfLines={1}>
              {occurrenceDate}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── 2. Horizontal Rhythm Selector (only when not already observed) ── */}
      {!isObserved ? (
        <View style={styles.rhythmSection}>
          <Text style={[styles.rhythmTitle, { color: theme.dim }]}>
            {copy.chooseRhythm}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rhythmScroll}
          >
            {modes.map((item) => {
              const isSelected = selectedMode === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => handleSelectMode(item.key)}
                  hitSlop={8}
                  style={[
                    styles.modePill,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? OVERLAYS.metallicGold[0.2]
                          : FEATURE_COLORS.vratFastingCard.surfaceLight2
                        : isDark
                        ? OVERLAYS.white[0.04]
                        : OVERLAYS.black[0.03],
                      borderColor: isSelected
                        ? theme.brand
                        : isDark
                        ? OVERLAYS.white[0.08]
                        : OVERLAYS.black[0.06],
                    },
                  ]}
                >
                  <Text style={styles.modeIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.modeLabel,
                      {
                        color: isSelected ? theme.brand : theme.text,
                        fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sans,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* ── 3. Primary Action Strip ── */}
      <View style={styles.actionContainer}>
        {isEligibleToday ? (
          isObserved ? (
            <View
              style={[
                styles.observedBanner,
                {
                  backgroundColor: COLORS.successBg,
                  borderColor: COLORS.successBorder,
                },
              ]}
            >
              <Feather name="check-circle" size={16} color={COLORS.success} />
              <Text style={[styles.observedText, { color: COLORS.success }]} numberOfLines={1}>
                {copy.observedToday} {observeCount > 1 ? `(${observeCount}×)` : ''}
              </Text>
            </View>
          ) : (
            <PressableSurface
              onPress={onObserve}
              disabled={observeLoading}
              style={[
                styles.primaryCta,
                {
                  backgroundColor: theme.brand,
                },
              ]}
            >
              {observeLoading ? (
                <ActivityIndicator size="small" color={theme.textOnBrand} />
              ) : (
                <View style={styles.ctaContentRow}>
                  <Text style={[styles.primaryCtaText, { color: theme.textOnBrand }]} numberOfLines={1}>
                    {copy.observeCta}
                  </Text>
                </View>
              )}
            </PressableSurface>
          )
        ) : (
          <PressableSurface
            onPress={handleSankalpaCommit}
            disabled={sankalpaCommitted}
            style={[
              styles.primaryCta,
              {
                backgroundColor: sankalpaCommitted
                  ? isDark
                    ? OVERLAYS.metallicGold[0.15]
                    : FEATURE_COLORS.vratFastingCard.pressableSurfaceLight
                  : theme.brand,
                borderColor: sankalpaCommitted ? theme.brand : 'transparent',
                borderWidth: sankalpaCommitted ? 1 : 0,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryCtaText,
                {
                  color: sankalpaCommitted ? theme.brand : theme.textOnBrand,
                },
              ]}
              numberOfLines={1}
            >
              {sankalpaCommitted ? copy.sankalpaTaken : copy.sankalpaCta}
            </Text>
          </PressableSurface>
        )}
      </View>

      {/* ── 4. Compact Footer: Parana Time, Reminders & Dharma Mitra ── */}
      <View
        style={[
          styles.footerRow,
          {
            borderTopColor: isDark ? OVERLAYS.white[0.08] : OVERLAYS.black[0.06],
          },
        ]}
      >
        {paranaTime ? (
          <View style={styles.paranaStrip}>
            <Feather name="sunrise" size={13} color={theme.brand} />
            <Text style={[styles.paranaText, { color: theme.text }]} numberOfLines={1}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, color: theme.brand }}>{copy.paranaWindow}: </Text>
              {paranaTime}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerUtilities}>
          {/* Reminder Toggle */}
          <Pressable
            onPress={handleToggleReminder}
            disabled={togglingReminders}
            hitSlop={8}
            style={styles.reminderMiniButton}
          >
            <Feather
              name={remindersEnabled ? 'bell' : 'bell-off'}
              size={13}
              color={remindersEnabled ? theme.brand : theme.dim}
            />
            <Text
              style={[
                styles.reminderMiniText,
                { color: remindersEnabled ? theme.brand : theme.dim },
              ]}
              numberOfLines={1}
            >
              {copy.remindMe}
            </Text>
          </Pressable>

          {/* Ask Dharma Mitra Link */}
          <PressableSurface
            onPress={handleOpenAiChat}
            hitSlop={8}
            style={[
              styles.aiMiniButton,
              {
                backgroundColor: isDark ? OVERLAYS.metallicGold[0.1] : FEATURE_COLORS.vratFastingCard.pressableSurfaceLight2,
                borderColor: isDark ? OVERLAYS.metallicGold[0.22] : FEATURE_COLORS.vratFastingCard.pressableSurfaceBorderLight,
              },
            ]}
          >
            <Feather name="message-circle" size={12} color={theme.brand} />
            <Text style={[styles.aiMiniText, { color: theme.brand }]} numberOfLines={1}>
              {copy.aiPromptCta}
            </Text>
          </PressableSurface>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: RADII.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  relicIcon: {
    width: 16,
    height: 16,
  },
  badgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 1,
    lineHeight: 16,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  dateText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  rhythmSection: {
    marginBottom: 10,
  },
  rhythmTitle: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    marginBottom: 6,
    lineHeight: 14,
  },
  rhythmScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: 28,
  },
  modeIcon: {
    fontSize: 12,
  },
  modeLabel: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionContainer: {
    marginBottom: 10,
  },
  primaryCta: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryCtaText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  observedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    minHeight: MIN_TOUCH_TARGET,
  },
  observedText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  paranaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paranaText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  footerUtilities: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reminderMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 32,
  },
  reminderMiniText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 15,
  },
  aiMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: 32,
  },
  aiMiniText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
  },
});
