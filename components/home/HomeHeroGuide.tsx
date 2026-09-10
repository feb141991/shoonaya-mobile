import { Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { FONTS, MIN_TOUCH_TARGET, TYPE, themeColor } from '@/lib/constants';
import type { AppLanguage } from '@/lib/language-runtime';
import { GUIDED_TOUR_STEP_COUNT } from '@/lib/homeDiscovery';

// Replaces the earlier static HeroTip banner with a real, small step-by-step
// guide -- same compact chip language as the existing hero-artwork discovery
// cue (app/(tabs)/index.tsx's "Change artwork" cue: theme.card surface,
// theme.premiumBorder border, 14px radius, same shadow recipe) rather than
// the heavier bordered/shadowless banner HeroTip used, since that's this
// app's one existing precedent for a small anchored discovery hint.
//
// Runs once per account, session 1, before the artwork cue's own session-3+
// gate -- see isGuidedTourEligible/isHeroArtworkCueEligible in
// lib/homeDiscovery.ts, which also makes sure the two never show at once
// (the tour's last step already covers backdrop selection).

type StepKey = 'mood' | 'greeting' | 'panchang' | 'backdrop';
const STEP_ORDER: StepKey[] = ['mood', 'greeting', 'panchang', 'backdrop'];

const STEP_ICON: Record<StepKey, keyof typeof Feather.glyphMap> = {
  mood: 'smile',
  greeting: 'edit-2',
  panchang: 'calendar',
  backdrop: 'image',
};

const COPY: Record<AppLanguage, { skip: string; next: string; done: string; steps: Record<StepKey, { title: string; body: string }> }> = {
  en: {
    skip: 'Skip',
    next: 'Next',
    done: 'Got it',
    steps: {
      mood: { title: 'Check in with your mood', body: 'Tap here to log how you feel and get a matched practice.' },
      greeting: { title: 'Your greeting', body: 'Tap the pencil to personalize it anytime.' },
      panchang: { title: "Today's Panchang", body: 'Tap the pills for tithi, nakshatra, and sacred days.' },
      backdrop: { title: 'Change your backdrop', body: 'Tap the icon in the corner to pick new artwork.' },
    },
  },
  hi: {
    skip: 'छोड़ें',
    next: 'आगे',
    done: 'समझ गया',
    steps: {
      mood: { title: 'अपने मूड की जाँच करें', body: 'अपनी भावना दर्ज करने और उपयुक्त अभ्यास पाने के लिए यहाँ टैप करें।' },
      greeting: { title: 'आपका अभिवादन', body: 'इसे व्यक्तिगत बनाने के लिए कभी भी पेंसिल पर टैप करें।' },
      panchang: { title: 'आज का पंचांग', body: 'तिथि, नक्षत्र और पावन दिवसों के लिए पिल्स पर टैप करें।' },
      backdrop: { title: 'अपना बैकग्राउंड बदलें', body: 'नई कलाकृति चुनने के लिए कोने में आइकन पर टैप करें।' },
    },
  },
  pa: {
    skip: 'ਛੱਡੋ',
    next: 'ਅੱਗੇ',
    done: 'ਸਮਝ ਗਏ',
    steps: {
      mood: { title: 'ਆਪਣੇ ਮੂਡ ਦੀ ਜਾਂਚ ਕਰੋ', body: 'ਆਪਣੀ ਭਾਵਨਾ ਦਰਜ ਕਰਨ ਅਤੇ ਢੁਕਵਾਂ ਅਭਿਆਸ ਪਾਉਣ ਲਈ ਇੱਥੇ ਟੈਪ ਕਰੋ।' },
      greeting: { title: 'ਤੁਹਾਡਾ ਸੁਆਗਤ ਸੰਦੇਸ਼', body: "ਇਸਨੂੰ ਨਿੱਜੀ ਬਣਾਉਣ ਲਈ ਕਦੇ ਵੀ ਪੈਨਸਿਲ 'ਤੇ ਟੈਪ ਕਰੋ।" },
      panchang: { title: 'ਅੱਜ ਦਾ ਪੰਚਾਂਗ', body: 'ਤਿਥੀ, ਨਕਸ਼ਤਰ ਅਤੇ ਪਵਿੱਤਰ ਦਿਨਾਂ ਲਈ ਪਿਲਸ \'ਤੇ ਟੈਪ ਕਰੋ।' },
      backdrop: { title: 'ਆਪਣਾ ਬੈਕਗ੍ਰਾਊਂਡ ਬਦਲੋ', body: 'ਨਵੀਂ ਕਲਾਕ੍ਰਿਤੀ ਚੁਣਨ ਲਈ ਕੋਨੇ ਵਿੱਚ ਆਈਕਨ \'ਤੇ ਟੈਪ ਕਰੋ।' },
    },
  },
};

export function HomeHeroGuide({
  lang,
  step,
  onNext,
  onSkip,
}: {
  lang: AppLanguage;
  step: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const isHindi = lang === 'hi';
  const copy = COPY[lang];
  const key = STEP_ORDER[step] ?? STEP_ORDER[0];
  const content = copy.steps[key];
  const isLastStep = step >= GUIDED_TOUR_STEP_COUNT - 1;

  return (
    <View
      accessible
      accessibilityLabel={`${content.title}. ${content.body}`}
      style={{
        backgroundColor: theme.card,
        borderColor: theme.premiumBorder,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 6,
        shadowColor: isDark ? '#000000' : '#493514',
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name={STEP_ICON[key]} size={13} color={theme.brand} />
        <Text style={{ ...TYPE.caption, flex: 1, fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, color: theme.text }}>
          {content.title}
        </Text>
      </View>
      <Text style={{ ...TYPE.caption, fontFamily: isHindi ? FONTS.devanagari : TYPE.caption.fontFamily, color: theme.dim }}>
        {content.body}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STEP_ORDER.map((s, i) => (
            <View
              key={s}
              style={{
                width: i === step ? 12 : 4,
                height: 4,
                borderRadius: 99,
                backgroundColor: i === step ? theme.brand : theme.borderSoft,
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {!isLastStep ? (
            <PressableSurface
              haptic="selection"
              onPress={onSkip}
              accessibilityLabel={copy.skip}
              style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ ...TYPE.caption, color: theme.dim }}>{copy.skip}</Text>
            </PressableSurface>
          ) : null}
          <PressableSurface
            haptic="selection"
            onPress={onNext}
            accessibilityLabel={isLastStep ? copy.done : copy.next}
            style={{ minHeight: MIN_TOUCH_TARGET, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: theme.brandSoft }}
          >
            <Text style={{ ...TYPE.caption, fontFamily: FONTS.sansSemiBold, color: theme.brand }}>
              {isLastStep ? copy.done : copy.next}
            </Text>
          </PressableSurface>
        </View>
      </View>
    </View>
  );
}
