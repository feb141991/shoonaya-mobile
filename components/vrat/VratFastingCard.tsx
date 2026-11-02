import { memo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAppIdentity } from '@/lib/appIdentity';
import { readUserScoped, USER_SCOPED_NAMES, writeUserScoped } from '@/lib/userScopedStorage';
import { COLORS, FONTS, RADII, themeColor } from '@/lib/constants';
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
  onToggleReminders?: (enabled: boolean) => Promise<void>;
  language?: 'en' | 'hi' | 'pa';
  isDark?: boolean;
}

const COPY = {
  en: {
    sacredVow: 'Sacred Fasting Vow',
    observingQuestion: 'Are you observing this sacred fast?',
    chooseRhythm: 'Select your fasting rhythm:',
    modes: {
      nirjala: 'Nirjala (Waterless)',
      phalahar: 'Phalahar (Fruit & Milk)',
      ekbhukta: 'Ekbhukta (Single Meal)',
      sankalpa: 'Mindful Sankalpa',
    },
    observeCta: 'Observe Fast (+25 Karma) 🙏',
    sankalpaCta: 'Commit Fasting Sankalpa 🌸',
    sankalpaTaken: 'Fasting Sankalpa Committed ✓',
    observedToday: 'Vrat Observed Today ✓',
    paranaWindow: 'Parana (Breaking Fast) Window',
    remindMe: 'Remind me for upcoming fasts',
    aiGuidanceTitle: "Dharma Mitra's Guidance",
    aiPromptCta: 'Ask Dharma Mitra about this Vrat',
  },
  hi: {
    sacredVow: 'पावन व्रत संकल्प',
    observingQuestion: 'क्या आप आज यह पावन व्रत रख रहे हैं?',
    chooseRhythm: 'अपनी उपवास विधि चुनें:',
    modes: {
      nirjala: 'निर्जला उपवास',
      phalahar: 'फलाहार',
      ekbhukta: 'एकभुक्त (एक समय)',
      sankalpa: 'पावन संकल्प',
    },
    observeCta: 'व्रत पूर्ण अंकित करें (+25 कर्म) 🙏',
    sankalpaCta: 'व्रत का संकल्प लें 🌸',
    sankalpaTaken: 'व्रत संकल्प धारण किया ✓',
    observedToday: 'आज व्रत पूर्ण हुआ ✓',
    paranaWindow: 'पारण (व्रत खोलने) का शुभ समय',
    remindMe: 'आगामी व्रत के लिए स्मरण कराएं',
    aiGuidanceTitle: 'धर्म मित्र का दिव्य मार्गदर्शन',
    aiPromptCta: 'धर्म मित्र से इस व्रत पर चर्चा करें',
  },
  pa: {
    sacredVow: 'ਪਾਵਨ ਵਰਤ ਸੰਕਲਪ',
    observingQuestion: 'ਕੀ ਤੁਸੀਂ ਅੱਜ ਇਹ ਪਾਵਨ ਵਰਤ ਰੱਖ ਰਹੇ ਹੋ?',
    chooseRhythm: 'ਆਪਣੀ ਵਰਤ ਵਿਧੀ ਚੁਣੋ:',
    modes: {
      nirjala: 'ਨਿਰਜਲਾ',
      phalahar: 'ਫਲਾਹਾਰ',
      ekbhukta: 'ਇੱਕ ਸਮੇਂ ਦਾ ਭੋਜਨ',
      sankalpa: 'ਪਾਵਨ ਸੰਕਲਪ',
    },
    observeCta: 'ਵਰਤ ਪੂਰਾ ਦਰਜ ਕਰੋ (+25 ਕਰਮ) 🙏',
    sankalpaCta: 'ਵਰਤ ਦਾ ਸੰਕਲਪ ਲਓ 🌸',
    sankalpaTaken: 'ਵਰਤ ਸੰਕਲਪ ਲਿਆ ਗਿਆ ✓',
    observedToday: 'ਅੱਜ ਵਰਤ ਪੂਰਾ ਹੋਇਆ ✓',
    paranaWindow: 'ਪਾਰਣਾ ਦਾ ਸ਼ੁਭ ਸਮਾਂ',
    remindMe: 'ਆਉਣ ਵਾਲੇ ਵਰਤਾਂ ਲਈ ਯਾਦ ਦਿਵਾਓ',
    aiGuidanceTitle: 'ਧਰਮ ਮਿੱਤਰ ਦਾ ਮਾਰਗਦਰਸ਼ਨ',
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

  // Restore this person's saved mode or sankalpa; another account on the device starts fresh.
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
    const nextVal = !remindersEnabled;
    setRemindersEnabled(nextVal);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onToggleReminders) {
      setTogglingReminders(true);
      try {
        await onToggleReminders(nextVal);
      } finally {
        setTogglingReminders(false);
      }
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
    { key: 'nirjala', label: copy.modes.nirjala, icon: '🌿' },
    { key: 'phalahar', label: copy.modes.phalahar, icon: '🍎' },
    { key: 'ekbhukta', label: copy.modes.ekbhukta, icon: '🍚' },
    { key: 'sankalpa', label: copy.modes.sankalpa, icon: '🌸' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(28, 22, 16, 0.76)' : 'rgba(255, 252, 246, 0.92)',
          borderColor: isDark ? 'rgba(212, 175, 55, 0.22)' : 'rgba(180, 130, 40, 0.18)',
        },
      ]}
    >
      {/* Top Header Pill */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Image
            source={require('@/assets/relics/tulsi-leaf.png')}
            style={styles.relicIcon}
            resizeMode="contain"
          />
          <Text style={[styles.badgeText, { color: theme.brand }]}>
            {copy.sacredVow}
          </Text>
        </View>
        {occurrenceDate ? (
          <Text style={[styles.dateText, { color: theme.dim }]}>
            {occurrenceDate}
          </Text>
        ) : null}
      </View>

      {/* Title / Question */}
      <Text style={[styles.title, { color: theme.text }]}>
        {copy.observingQuestion}
      </Text>

      {/* Mode Selector */}
      <Text style={[styles.subLabel, { color: theme.dim }]}>
        {copy.chooseRhythm}
      </Text>
      <View style={styles.modeGrid}>
        {modes.map((item) => {
          const isSelected = selectedMode === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => handleSelectMode(item.key)}
              style={[
                styles.modePill,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(212, 175, 55, 0.18)'
                      : 'rgba(180, 130, 40, 0.12)'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isSelected
                    ? theme.brand
                    : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
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
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Observance Action / Status */}
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
              <Feather name="check-circle" size={18} color={COLORS.success} />
              <Text style={[styles.observedText, { color: COLORS.success }]}>
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
                <Text style={[styles.primaryCtaText, { color: theme.textOnBrand }]}>
                  {copy.observeCta}
                </Text>
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
                    ? 'rgba(212, 175, 55, 0.15)'
                    : 'rgba(180, 130, 40, 0.12)'
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
            >
              {sankalpaCommitted ? copy.sankalpaTaken : copy.sankalpaCta}
            </Text>
          </PressableSurface>
        )}
      </View>

      {/* Parana Timing if available */}
      {paranaTime ? (
        <View
          style={[
            styles.paranaBox,
            {
              backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(180, 130, 40, 0.06)',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(180, 130, 40, 0.16)',
            },
          ]}
        >
          <View style={styles.paranaHeader}>
            <Feather name="sunrise" size={14} color={theme.brand} />
            <Text style={[styles.paranaLabel, { color: theme.brand }]}>
              {copy.paranaWindow}
            </Text>
          </View>
          <Text style={[styles.paranaTime, { color: theme.text }]}>
            {paranaTime}
          </Text>
        </View>
      ) : null}

      {/* Future Reminder Toggle */}
      <View
        style={[
          styles.reminderRow,
          {
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <View style={styles.reminderInfo}>
          <Feather name="bell" size={14} color={remindersEnabled ? theme.brand : theme.dim} />
          <Text style={[styles.reminderText, { color: theme.text }]}>
            {copy.remindMe}
          </Text>
        </View>
        <Pressable
          onPress={handleToggleReminder}
          disabled={togglingReminders}
          hitSlop={8}
          style={[
            styles.togglePill,
            {
              backgroundColor: remindersEnabled
                ? theme.brand
                : isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.12)',
            },
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              {
                transform: [{ translateX: remindersEnabled ? 16 : 2 }],
              },
            ]}
          />
        </Pressable>
      </View>

      {/* Dharma Mitra AI Guidance Card */}
      <View
        style={[
          styles.aiCard,
          {
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.06)' : 'rgba(180, 130, 40, 0.05)',
            borderColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(180, 130, 40, 0.12)',
          },
        ]}
      >
        <View style={styles.aiHeader}>
          <Text style={styles.aiSparkle}>✨</Text>
          <Text style={[styles.aiTitle, { color: theme.brand }]}>
            {copy.aiGuidanceTitle}
          </Text>
        </View>
        <Text style={[styles.aiBody, { color: theme.text }]}>
          {language === 'hi'
            ? `${vratName} का पावन व्रत चित्त को शांत और प्राण को शुद्ध करता है। आज के दिन पवित्र नाम स्मरण व आत्म-संयम से साधक को असीम शांति प्राप्त होती है।`
            : language === 'pa'
            ? `${vratName} ਦਾ ਪਾਵਨ ਵਰਤ ਮਨ ਨੂੰ ਸ਼ਾਂਤ ਅਤੇ ਆਤਮਾ ਨੂੰ ਪਵਿੱਤਰ ਕਰਦਾ ਹੈ। ਅੱਜ ਦੇ ਦਿਨ ਨਾਮ ਸਿਮਰਨ ਨਾਲ ਅੰਦਰੂਨੀ ਸ਼ਾਂਤੀ ਮਿਲਦੀ ਹੈ।`
            : `Observing ${vratName} purifies the senses and centers the mind in stillness. Fasting in your chosen rhythm turns physical discipline into deep devotional remembrance.`}
        </Text>
        <PressableSurface
          onPress={handleOpenAiChat}
          style={[
            styles.aiButton,
            {
              backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(180, 130, 40, 0.1)',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.28)' : 'rgba(180, 130, 40, 0.22)',
            },
          ]}
        >
          <Feather name="message-circle" size={13} color={theme.brand} />
          <Text style={[styles.aiButtonText, { color: theme.brand }]}>
            {copy.aiPromptCta}
          </Text>
        </PressableSurface>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
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
  },
  relicIcon: {
    width: 20,
    height: 20,
  },
  badgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
  },
  title: {
    fontFamily: FONTS.serif,
    fontSize: 19,
    lineHeight: 24,
    marginBottom: 12,
  },
  subLabel: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginBottom: 8,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  modeIcon: {
    fontSize: 13,
  },
  modeLabel: {
    fontSize: 11,
  },
  actionContainer: {
    marginBottom: 12,
  },
  primaryCta: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
  observedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
  },
  observedText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
  },
  paranaBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  paranaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  paranaLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paranaTime: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: 18,
    flexShrink: 1,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 14,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reminderText: {
    fontFamily: FONTS.sans,
    fontSize: 12,
  },
  togglePill: {
    width: 38,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  aiCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiSparkle: {
    fontSize: 13,
  },
  aiTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  aiBody: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.9,
    marginBottom: 10,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  aiButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
  },
});
