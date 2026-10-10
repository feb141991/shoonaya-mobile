import { Href } from 'expo-router';
import { Text, View, useColorScheme, useWindowDimensions } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';
import type { ReadyPracticeCta, TraditionKey } from '@/lib/onboarding-contract';

type WelcomeScreenProps = {
  displayName: string;
  tradition: TraditionKey | null;
  isHindi?: boolean;
  selectedGoalLabels: string[];
  calendarProfileLabel?: string | null;
  calendarScopeLabel?: string | null;
  locationCity?: string | null;
  hasNotifications: boolean;
  recommendedPractice: ReadyPracticeCta | null;
  onComplete: (destination?: Href) => void;
  saving: boolean;
};

const TRADITIONS: Record<TraditionKey, { label: string; labelHi: string; symbol: string }> = {
  hindu: { label: 'Hindu', labelHi: 'सनातन', symbol: '🪔' },
  sikh: { label: 'Sikh', labelHi: 'सिख', symbol: '☬' },
  buddhist: { label: 'Buddhist', labelHi: 'बौद्ध', symbol: '☸️' },
  jain: { label: 'Jain', labelHi: 'जैन', symbol: '🙏' },
  none: { label: 'Universal', labelHi: 'सार्वभौमिक', symbol: '✨' },
};

const DESTINATIONS: ReadonlyArray<{
  icon: string;
  label: string;
  labelHi: string;
  description: string;
  descriptionHi: string;
  route: Href;
}> = [
  { icon: '☀️', label: 'Today', labelHi: 'आज', description: 'Panchang & sacred days', descriptionHi: 'पंचांग व पावन पर्व', route: '/(tabs)' as Href },
  { icon: '🪔', label: 'Bhakti', labelHi: 'भक्ति', description: 'Practice, prayer & study', descriptionHi: 'साधना, प्रार्थना व अध्ययन', route: '/(tabs)/bhakti' as Href },
  { icon: '🏡', label: 'Kul', labelHi: 'कुल', description: 'Family space & lineage', descriptionHi: 'पारिवारिक वृत्त व वंश', route: '/kul' as Href },
  { icon: '👥', label: 'Community', labelHi: 'समुदाय', description: 'Mandali & shared reflection', descriptionHi: 'मंडली व साझा चिंतन', route: '/(tabs)/mandali' as Href },
];

export function OnboardingWelcomeScreen({
  displayName,
  tradition,
  isHindi = false,
  selectedGoalLabels,
  calendarProfileLabel,
  calendarScopeLabel,
  locationCity,
  hasNotifications,
  recommendedPractice,
  onComplete,
  saving,
}: WelcomeScreenProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { fontScale, width } = useWindowDimensions();
  const selectedTradition = TRADITIONS[tradition ?? 'none'];
  const greeting = tradition === 'hindu'
    ? (isHindi ? 'हरि ॐ' : 'Hari Om')
    : tradition === 'sikh'
    ? (isHindi ? 'वाहेगुरु जी' : 'Waheguru Ji')
    : tradition === 'buddhist'
    ? (isHindi ? 'नमो बुद्धाय' : 'Namo Buddhaya')
    : tradition === 'jain'
    ? (isHindi ? 'जय जिनेन्द्र' : 'Jai Jinendra')
    : (isHindi ? 'नमस्ते' : 'Namaste');
  const stackedCards = fontScale >= 1.2 || width < 360;
  const selectedGoals = selectedGoalLabels.slice(0, 2);
  const summaryTokens = [
    selectedTradition ? (isHindi ? selectedTradition.labelHi : selectedTradition.label) : null,
    isHindi ? 'हिन्दी' : 'English',
    calendarProfileLabel || null,
    calendarScopeLabel || null,
    locationCity || null,
    ...selectedGoals,
    hasNotifications ? (isHindi ? 'स्मरण चालू' : 'Reminders on') : null,
  ].filter(Boolean);
  const summaryText = summaryTokens.length > 0
    ? summaryTokens.join(' · ')
    : (isHindi ? 'आपकी आध्यात्मिक शरणस्थली' : 'Your daily spiritual sanctuary');

  return (
    <View style={{ gap: 20, paddingTop: 4, paddingBottom: 8 }}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: theme.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: theme.brand,
          }}
        >
          <Text style={{ fontSize: 36 }}>{selectedTradition.symbol}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ ...TYPE.hero, color: theme.text, textAlign: 'center' }}>
            {isHindi ? `${greeting}, ${displayName || 'साधक'}` : `${greeting}, ${displayName || 'Seeker'}`}
          </Text>
          <Text style={{ ...TYPE.cardHeading, color: theme.brand, textAlign: 'center' }}>
            {isHindi ? 'आपका Shoonaya तैयार है' : 'Your Shoonaya is ready'}
          </Text>
          <Text style={{ ...TYPE.caption, color: theme.dim, textAlign: 'center', lineHeight: 20 }}>
            {summaryText}
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Text style={{ ...TYPE.section, color: theme.text, fontSize: 16 }}>
          {isHindi ? 'आपके लिए तैयार' : 'Prepared for you'}
        </Text>
        <View style={{ flexDirection: stackedCards ? 'column' : 'row', flexWrap: 'wrap', gap: 10 }}>
          {DESTINATIONS.map((destination) => (
            <PressableSurface
              key={destination.label}
              accessibilityLabel={isHindi ? `${destination.labelHi} खोलें` : `Open ${destination.label}`}
              accessibilityHint={isHindi ? 'आपकी चुनी हुई जानकारी सहेजने के बाद खुलेगा' : 'Opens after your choices are saved'}
              disabled={saving}
              onPress={() => onComplete(destination.route)}
              haptic="selection"
              style={{
                width: stackedCards ? '100%' : '48%',
                minHeight: MIN_TOUCH_TARGET,
                padding: 14,
                borderRadius: RADII.lg,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 22 }}>{destination.icon}</Text>
              <Text style={{ ...TYPE.label, color: theme.text }}>
                {isHindi ? destination.labelHi : destination.label}
              </Text>
              <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 12, lineHeight: 18 }}>
                {isHindi ? destination.descriptionHi : destination.description}
              </Text>
            </PressableSurface>
          ))}
        </View>
      </View>

      {selectedGoalLabels.length > 0 ? (
        <Card tone="auto" style={{ backgroundColor: theme.cardSoft, borderColor: theme.border, padding: 14, gap: 8 }}>
          <Text style={{ ...TYPE.label, color: theme.text }}>
            {isHindi ? 'आपकी चुनी हुई दिशा' : 'Your chosen direction'}
          </Text>
          {selectedGoalLabels.map((goal) => (
            <Text key={goal} style={{ ...TYPE.caption, color: theme.dim, lineHeight: 20 }}>• {goal}</Text>
          ))}
        </Card>
      ) : null}

      {recommendedPractice ? (
        <PressableSurface
          accessibilityLabel={isHindi ? recommendedPractice.labelHi : recommendedPractice.labelEn}
          accessibilityHint={isHindi ? 'आपका पहला सुझाया गया अभ्यास' : 'Your suggested first practice'}
          disabled={saving}
          onPress={() => onComplete(recommendedPractice.route as Href)}
          haptic="selection"
          style={{
            minHeight: 64,
            borderRadius: RADII.lg,
            borderWidth: 1,
            borderColor: theme.brand,
            backgroundColor: theme.brandSoft,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 24 }}>🌱</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansMedium }}>
              {isHindi ? 'आपका पहला कदम' : 'A suggested first step'}
            </Text>
            <Text style={{ ...TYPE.label, color: theme.text }}>
              {isHindi ? recommendedPractice.labelHi : recommendedPractice.labelEn}
            </Text>
          </View>
          <Text style={{ ...TYPE.caption, color: theme.brand, fontSize: 18 }}>›</Text>
        </PressableSurface>
      ) : null}

      <Text style={{ ...TYPE.caption, color: theme.dim, textAlign: 'center', lineHeight: 19 }}>
        {isHindi
          ? 'कुल, सूचनाएँ और स्थान जैसी वैकल्पिक सुविधाएँ आप बाद में भी सेट कर सकते हैं।'
          : 'You can set up optional features like Kul, notifications and location later.'}
      </Text>
    </View>
  );
}
