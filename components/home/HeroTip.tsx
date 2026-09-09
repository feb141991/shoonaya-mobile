import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, TYPE, themeColor } from '@/lib/constants';
import type { AppLanguage } from '@/lib/language-runtime';

// Replaces the earlier full "Explore your Home" sheet (mood, greeting,
// Panchang, sacred days, Rashiphal, background) with a much smaller,
// one-time hint scoped to just the hero itself. Shows until the user
// dismisses it once, then never again -- no first-week/launch-count
// logic, dismissal alone is the permanent signal.

const DISMISSED_KEY = 'shoonaya_hero_tip_dismissed_v1';

const COPY: Record<AppLanguage, string> = {
  en: 'Tap your mood, greeting, or the Panchang pills above — and the icon below to change your backdrop.',
  hi: 'ऊपर अपने मूड, अभिवादन या पंचांग पर टैप करें — और बैकग्राउंड बदलने के लिए नीचे दिए आइकन पर।',
  pa: 'ਉੱਪਰ ਆਪਣੇ ਮੂਡ, ਸੁਆਗਤ ਸੰਦੇਸ਼ ਜਾਂ ਪੰਚਾਂਗ \'ਤੇ ਟੈਪ ਕਰੋ — ਅਤੇ ਬੈਕਗ੍ਰਾਊਂਡ ਬਦਲਣ ਲਈ ਹੇਠਾਂ ਦਿੱਤੇ ਆਈਕਨ \'ਤੇ।',
};

export function useHeroTipVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => { if (active && value !== '1') setVisible(true); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const dismiss = () => {
    setVisible(false);
    void AsyncStorage.setItem(DISMISSED_KEY, '1').catch(() => {});
  };

  return { visible, dismiss };
}

export function HeroTip({ lang, onDismiss }: { lang: AppLanguage; onDismiss: () => void }) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const isHindi = lang === 'hi';

  return (
    <View>
      <View
        style={{
          alignSelf: 'flex-start',
          marginLeft: 26,
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderBottomWidth: 6,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: theme.brandSoft,
        }}
      />
      <View
        accessible
        accessibilityLabel={COPY[lang]}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          backgroundColor: theme.brandSoft,
          borderRadius: 14,
          paddingVertical: 8,
          paddingHorizontal: 12,
        }}
      >
        <Feather name="info" size={13} color={theme.brand} style={{ marginTop: 2 }} />
        <Text
          style={{
            ...TYPE.caption,
            flex: 1,
            fontFamily: isHindi ? FONTS.devanagari : TYPE.caption.fontFamily,
            color: theme.text,
          }}
        >
          {COPY[lang]}
        </Text>
        <PressableSurface
          haptic="selection"
          onPress={onDismiss}
          accessibilityLabel="Dismiss tip"
          hitSlop={12}
          style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="x" size={12} color={theme.dim} />
        </PressableSurface>
      </View>
    </View>
  );
}
