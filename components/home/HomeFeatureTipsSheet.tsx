import { Modal, ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { useReducedMotion } from '@/components/ui/Motion';
import { COLORS, FONTS, TYPE, themeColor } from '@/lib/constants';

// A short, dismissible explainer for Home's controls -- distinct from the
// separate, not-yet-built "Show me around" anchored guided tour (see
// docs/HOME_HERO_UX_PROPOSAL.md "Home feature tips"). This is just the
// static sheet half of that spec: a small "Explore your Home" trigger that
// opens a list of one-line explanations, filtered to what's actually on
// screen for this viewer (Sacred Days hides when there's nothing to show,
// same condition SacredDaysCarousel itself uses).

export type HomeFeatureTipLang = 'en' | 'hi' | 'pa';

type TipKey = 'mood' | 'greeting' | 'panchang' | 'sacredDays' | 'rashiphal' | 'background';

const TIP_ORDER: TipKey[] = ['mood', 'greeting', 'panchang', 'sacredDays', 'rashiphal', 'background'];

const TIP_ICONS: Record<TipKey, keyof typeof Feather.glyphMap> = {
  mood: 'smile',
  greeting: 'edit-2',
  panchang: 'calendar',
  sacredDays: 'star',
  rashiphal: 'moon',
  background: 'image',
};

const COPY: Record<HomeFeatureTipLang, { title: string; close: string; tips: Record<TipKey, { label: string; description: string }> }> = {
  en: {
    title: 'Explore your Home',
    close: 'Close',
    tips: {
      mood: { label: 'Mood', description: 'Check in with how you feel and explore a practice for today.' },
      greeting: { label: 'Greeting', description: 'Tap the pencil to personalize your greeting.' },
      panchang: { label: 'Panchang', description: "Open today's calendar details." },
      sacredDays: { label: 'Sacred days', description: 'Tap an observance to learn more.' },
      rashiphal: { label: 'Rashiphal', description: 'Open your daily reading.' },
      background: { label: 'Background', description: 'Choose the artwork for your Home.' },
    },
  },
  hi: {
    title: 'अपना होम एक्सप्लोर करें',
    close: 'बंद करें',
    tips: {
      mood: { label: 'मूड', description: 'अपनी भावनाओं की जाँच करें और आज के लिए एक अभ्यास खोजें।' },
      greeting: { label: 'अभिवादन', description: 'अपने अभिवादन को व्यक्तिगत बनाने के लिए पेंसिल पर टैप करें।' },
      panchang: { label: 'पंचांग', description: 'आज के पंचांग का विवरण खोलें।' },
      sacredDays: { label: 'पवित्र दिन', description: 'अधिक जानने के लिए किसी पर्व पर टैप करें।' },
      rashiphal: { label: 'राशिफल', description: 'अपना दैनिक राशिफल खोलें।' },
      background: { label: 'बैकग्राउंड', description: 'अपने होम के लिए कलाकृति चुनें।' },
    },
  },
  pa: {
    title: 'ਆਪਣਾ ਹੋਮ ਐਕਸਪਲੋਰ ਕਰੋ',
    close: 'ਬੰਦ ਕਰੋ',
    tips: {
      mood: { label: 'ਮੂਡ', description: 'ਆਪਣੀਆਂ ਭਾਵਨਾਵਾਂ ਦੀ ਜਾਂਚ ਕਰੋ ਅਤੇ ਅੱਜ ਲਈ ਇੱਕ ਅਭਿਆਸ ਲੱਭੋ।' },
      greeting: { label: 'ਸੁਆਗਤ ਸੰਦੇਸ਼', description: "ਆਪਣੇ ਸੁਆਗਤ ਸੰਦੇਸ਼ ਨੂੰ ਨਿੱਜੀ ਬਣਾਉਣ ਲਈ ਪੈਨਸਿਲ 'ਤੇ ਟੈਪ ਕਰੋ।" },
      panchang: { label: 'ਪੰਚਾਂਗ', description: 'ਅੱਜ ਦੇ ਪੰਚਾਂਗ ਦੇ ਵੇਰਵੇ ਖੋਲ੍ਹੋ।' },
      sacredDays: { label: 'ਪਵਿੱਤਰ ਦਿਨ', description: "ਹੋਰ ਜਾਣਨ ਲਈ ਕਿਸੇ ਦਿਹਾੜੇ 'ਤੇ ਟੈਪ ਕਰੋ।" },
      rashiphal: { label: 'ਰਾਸ਼ੀਫਲ', description: 'ਆਪਣੀ ਰੋਜ਼ਾਨਾ ਰਾਸ਼ੀਫਲ ਖੋਲ੍ਹੋ।' },
      background: { label: 'ਬੈਕਗ੍ਰਾਊਂਡ', description: 'ਆਪਣੇ ਹੋਮ ਲਈ ਕਲਾਕ੍ਰਿਤੀ ਚੁਣੋ।' },
    },
  },
};

type HomeFeatureTipsSheetProps = {
  visible: boolean;
  onClose: () => void;
  lang?: HomeFeatureTipLang;
  showSacredDays: boolean;
};

export function HomeFeatureTipsSheet({ visible, onClose, lang = 'en', showSacredDays }: HomeFeatureTipsSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const reducedMotion = useReducedMotion();
  const copy = COPY[lang];
  const visibleTips = TIP_ORDER.filter((key) => key !== 'sacredDays' || showSacredDays);
  const isHindi = lang === 'hi';

  return (
    <Modal transparent visible={visible} animationType={reducedMotion ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.bottomSheetScrim, justifyContent: 'flex-end' }}>
        <View
          accessibilityViewIsModal
          accessibilityRole="none"
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 22,
            paddingBottom: 34,
            gap: 16,
            maxHeight: '78%',
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 52, height: 4, borderRadius: 999, backgroundColor: theme.borderSoft }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="compass" size={20} color={theme.brand} />
              <Text style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.serifBold, fontSize: 20, color: theme.text }}>
                {copy.title}
              </Text>
            </View>
            <PressableSurface
              haptic="selection"
              onPress={onClose}
              accessibilityLabel={copy.close}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardSoft }}
            >
              <Feather name="x" size={16} color={theme.dim} />
            </PressableSurface>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {visibleTips.map((key) => {
              const tip = copy.tips[key];
              return (
                <View
                  key={key}
                  accessible
                  accessibilityLabel={`${tip.label}. ${tip.description}`}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.brandSoft,
                    }}
                  >
                    <Feather name={TIP_ICONS[key]} size={16} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...TYPE.label, fontFamily: isHindi ? FONTS.devanagariBold : TYPE.label.fontFamily, color: theme.text }}>
                      {tip.label}
                    </Text>
                    <Text style={{ ...TYPE.caption, fontFamily: isHindi ? FONTS.devanagari : TYPE.caption.fontFamily, color: theme.dim }}>
                      {tip.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
