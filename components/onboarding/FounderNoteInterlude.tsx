import { useEffect, useState } from 'react';
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { MotionView } from '@/components/ui/Motion';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, themeColor } from '@/lib/constants';

export type FounderTradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';
export type FounderLanguage = 'en' | 'hi';

type FounderNoteInterludeProps = {
  language: FounderLanguage;
  tradition: FounderTradition;
  progress: {
    completed: number;
    total: number;
    activeColor: string;
    inactiveColor: string;
  };
  onBack: () => void;
  onContinue: () => void;
};

type NoteBlock = {
  kind: 'paragraph' | 'heading' | 'quote' | 'emphasis' | 'rhythm';
  text: string;
};

type FounderCopy = {
  greeting: Record<FounderTradition, string>;
  welcome: string;
  tagline: string;
  eyebrow: string;
  headerTitle: string;
  title: string;
  teaser: string;
  read: string;
  skip: string;
  continue: string;
  back: string;
  normalText: string;
  largeText: string;
  blocks: NoteBlock[];
  signoff: string;
  founderName: string;
  founderRole: string;
  closing: string;
};

const ARTWORK: Record<FounderTradition, ImageSource> = {
  hindu: require('@/assets/onboarding/founder-hindu.webp'),
  sikh: require('@/assets/onboarding/founder-sikh.webp'),
  buddhist: require('@/assets/onboarding/founder-buddhist.webp'),
  jain: require('@/assets/onboarding/founder-jain.webp'),
};

const COPY: Record<FounderLanguage, FounderCopy> = {
  en: {
    greeting: {
      hindu: 'Radhe Radhe',
      sikh: 'Sat Sri Akaal',
      buddhist: 'Namo Buddhaya',
      jain: 'Jai Jinendra',
    },
    welcome: 'Welcome to Shoonaya',
    tagline: 'From zero to infinity.',
    eyebrow: 'A PERSONAL LETTER',
    headerTitle: "Founder's note",
    title: 'A Note From Our Founder',
    teaser:
      'Living far from home made me realise how easily the quiet connections to our traditions can fade: a sacred date remembered, a story shared, a practice carried forward. Shoonaya began as an attempt to help those things travel with us.',
    read: "Read the founder's note",
    skip: 'Skip for now',
    continue: 'Continue setup',
    back: 'Back',
    normalText: 'Normal text size',
    largeText: 'Larger text size',
    blocks: [
      {
        kind: 'emphasis',
        text: 'Some things should never become distant, no matter how far from home we travel.',
      },
      { kind: 'paragraph', text: 'When I moved to London, I expected to miss home.' },
      {
        kind: 'paragraph',
        text: 'I expected to miss the food, the people, the familiar streets and the festivals celebrated together.',
      },
      {
        kind: 'paragraph',
        text: 'What I did not expect was to miss the small, almost invisible ways our traditions had always remained present.',
      },
      {
        kind: 'quote',
        text: '“Kal Ekadashi hai.”\n“Aaj Purnima hai.”\n“Is baar Diwali kis din hai?”',
      },
      {
        kind: 'paragraph',
        text: 'A parent remembered. A grandparent reminded us. A temple bell, a calendar on the wall or a conversation at home somehow kept us connected.',
      },
      {
        kind: 'paragraph',
        text: 'Thousands of miles away, that quiet connection became much easier to lose. And I realised I was not alone.',
      },
      {
        kind: 'paragraph',
        text: 'Many of us are building lives far from where our families began. We have technology for banking, travel, food, fitness and entertainment, yet staying connected with our traditions can still mean searching through different calendars, websites, family messages and phone calls home.',
      },
      {
        kind: 'paragraph',
        text: 'My own experience began with the Sanatan traditions in which I was raised. But the deeper concern is shared by many families carrying Hindu, Sikh, Jain and Buddhist traditions across generations.',
      },
      {
        kind: 'emphasis',
        text: 'How do we preserve what matters without flattening it, forgetting it or allowing it to quietly disappear?',
      },
      { kind: 'heading', text: 'What if our traditions could travel with us?' },
      {
        kind: 'paragraph',
        text: 'What if your phone could gently remind you: “Tomorrow is Ekadashi.” Not because you remembered to search for it, but because Shoonaya remembered for you.',
      },
      {
        kind: 'paragraph',
        text: 'What if sacred teachings were easier to understand, daily practices easier to maintain, and the knowledge inherited from our families easier to preserve?',
      },
      {
        kind: 'paragraph',
        text: 'Our traditions are more than dates on a calendar. They are memory, practice and belonging. They are the thread connecting one generation to the next.',
      },
      {
        kind: 'paragraph',
        text: 'Our grandparents carried much of that knowledge in memory. Our parents carried it forward in the ways available to them. Our generation now has an opportunity to carry it differently: with care, accuracy and technology that serves tradition rather than replacing it.',
      },
      { kind: 'heading', text: 'That is why I began building Shoonaya.' },
      {
        kind: 'paragraph',
        text: 'Shoonaya is more than a calendar. It is a digital home for knowledge and practices that should not quietly disappear: sacred time, daily sadhana, scripture, reflection, family heritage and the wisdom passed through generations.',
      },
      { kind: 'rhythm', text: 'Delhi or London.\nPunjab or Paris.\nMumbai or Melbourne.' },
      { kind: 'emphasis', text: 'Distance may change where we live. It should not erase our roots.' },
      {
        kind: 'paragraph',
        text: "Shoonaya is my attempt to use today's technology to preserve something timeless.",
      },
      {
        kind: 'paragraph',
        text: 'Perhaps someone will observe an important day because a quiet reminder arrived at the right moment. Perhaps a child growing up far from India will discover something meaningful about their family’s tradition. Perhaps someone searching for direction will encounter a teaching their grandparents once knew by heart.',
      },
      { kind: 'paragraph', text: 'These may appear to be small things. But traditions have always survived through small things:' },
      {
        kind: 'rhythm',
        text: 'A story remembered.\nA prayer repeated.\nA sacred day observed.\nA name preserved.\nA teaching passed forward.',
      },
      { kind: 'emphasis', text: 'Shoonaya begins there.' },
      {
        kind: 'rhythm',
        text: 'From remembering where we come from\nto discovering how far inward we can go.\n\nFrom zero to infinity.',
      },
    ],
    signoff: 'With gratitude,',
    founderName: 'Prince Sharma',
    founderRole: 'Founder, Shoonaya',
    closing: 'Find your infinity.',
  },
  hi: {
    greeting: {
      hindu: 'राधे राधे',
      sikh: 'सत श्री अकाल',
      buddhist: 'नमो बुद्धाय',
      jain: 'जय जिनेन्द्र',
    },
    welcome: 'Shoonaya में आपका स्वागत है',
    tagline: 'शून्य से अनंत तक।',
    eyebrow: 'एक व्यक्तिगत पत्र',
    headerTitle: 'संस्थापक का पत्र',
    title: 'हमारे संस्थापक की ओर से',
    teaser:
      'घर से दूर रहने पर मुझे महसूस हुआ कि परंपराओं से हमारा शांत संबंध कितनी आसानी से धुंधला पड़ सकता है — कोई पावन तिथि याद रखना, कोई कथा सुनाना, कोई अभ्यास आगे बढ़ाना। Shoonaya इसी संबंध को हमारे साथ आगे ले जाने के प्रयास से जन्मा।',
    read: 'संस्थापक का पत्र पढ़ें',
    skip: 'अभी छोड़ें',
    continue: 'सेटअप आगे बढ़ाएँ',
    back: 'पीछे',
    normalText: 'सामान्य अक्षर आकार',
    largeText: 'बड़ा अक्षर आकार',
    blocks: [
      {
        kind: 'emphasis',
        text: 'कुछ चीज़ें हमसे कभी दूर नहीं होनी चाहिए, चाहे हम घर से कितनी भी दूर चले जाएँ।',
      },
      { kind: 'paragraph', text: 'जब मैं लंदन आया, मुझे पता था कि घर की याद आएगी।' },
      {
        kind: 'paragraph',
        text: 'मुझे भोजन, अपने लोगों, परिचित गलियों और साथ मिलकर मनाए जाने वाले त्योहारों की याद आने की उम्मीद थी।',
      },
      {
        kind: 'paragraph',
        text: 'लेकिन मैंने यह नहीं सोचा था कि मुझे उन छोटी, लगभग अदृश्य बातों की भी कमी महसूस होगी जिनके सहारे हमारी परंपराएँ हमेशा हमारे आसपास बनी रहती थीं।',
      },
      {
        kind: 'quote',
        text: '“कल एकादशी है।”\n“आज पूर्णिमा है।”\n“इस बार दीपावली किस दिन है?”',
      },
      {
        kind: 'paragraph',
        text: 'कोई माता-पिता याद रखते थे। कोई दादा-दादी या नाना-नानी स्मरण करा देते थे। मंदिर की घंटी, दीवार का कैलेंडर या घर की कोई बातचीत — किसी न किसी तरह वह जानकारी हम तक पहुँच जाती थी।',
      },
      {
        kind: 'paragraph',
        text: 'हज़ारों मील दूर आकर उस शांत संबंध को खो देना बहुत आसान हो गया। और मुझे समझ आया कि मैं अकेला नहीं था।',
      },
      {
        kind: 'paragraph',
        text: 'हममें से बहुत से लोग उस स्थान से दूर अपना जीवन बना रहे हैं जहाँ से हमारे परिवारों की यात्रा शुरू हुई थी। बैंकिंग, यात्रा, भोजन, स्वास्थ्य और मनोरंजन के लिए तकनीक है; फिर भी अपनी परंपरा से जुड़े रहने के लिए अलग-अलग कैलेंडर, वेबसाइट, पारिवारिक संदेश और घर पर फोन खोजना पड़ता है।',
      },
      {
        kind: 'paragraph',
        text: 'मेरी अपनी यात्रा उन सनातन परंपराओं से शुरू हुई जिनमें मेरा पालन-पोषण हुआ। लेकिन यह गहरी चिंता उन अनेक परिवारों की भी है जो हिंदू, सिख, जैन और बौद्ध परंपराओं को पीढ़ी-दर-पीढ़ी आगे ले जा रहे हैं।',
      },
      {
        kind: 'emphasis',
        text: 'जो महत्वपूर्ण है, उसे एक जैसा बनाए बिना, भुलाए बिना और चुपचाप मिटने दिए बिना हम कैसे सँजो सकते हैं?',
      },
      { kind: 'heading', text: 'क्या हमारी परंपराएँ हमारे साथ यात्रा कर सकती हैं?' },
      {
        kind: 'paragraph',
        text: 'क्या आपका फोन सहजता से बता सकता है — “कल एकादशी है” — इसलिए नहीं कि आपने खोजना याद रखा, बल्कि इसलिए कि Shoonaya ने आपके लिए याद रखा?',
      },
      {
        kind: 'paragraph',
        text: 'क्या पवित्र शिक्षाओं को समझना, दैनिक अभ्यासों को निभाना और परिवारों से मिला ज्ञान सँजोना थोड़ा अधिक सहज हो सकता है?',
      },
      {
        kind: 'paragraph',
        text: 'हमारी परंपराएँ कैलेंडर की तिथियों से कहीं अधिक हैं। वे स्मृति, अभ्यास और अपनापन हैं। वे एक पीढ़ी को अगली पीढ़ी से जोड़ने वाला सूत्र हैं।',
      },
      {
        kind: 'paragraph',
        text: 'हमारे बुज़ुर्गों ने इस ज्ञान का बड़ा भाग स्मृति में सँजोया। हमारे माता-पिता ने उसे अपनी तरह आगे बढ़ाया। अब हमारे पास अवसर है कि हम उसे सावधानी, शुद्धता और ऐसी तकनीक के साथ आगे ले जाएँ जो परंपरा का स्थान न ले, बल्कि उसकी सेवा करे।',
      },
      { kind: 'heading', text: 'इसीलिए मैंने Shoonaya बनाना शुरू किया।' },
      {
        kind: 'paragraph',
        text: 'Shoonaya केवल एक कैलेंडर नहीं है। यह उस ज्ञान और अभ्यास का एक डिजिटल घर है जिसे चुपचाप लुप्त नहीं होना चाहिए — पावन समय, दैनिक साधना, धर्मग्रंथ, चिंतन, पारिवारिक विरासत और पीढ़ियों से मिला ज्ञान।',
      },
      { kind: 'rhythm', text: 'दिल्ली या लंदन।\nपंजाब या पेरिस।\nमुंबई या मेलबर्न।' },
      { kind: 'emphasis', text: 'दूरी हमारे रहने का स्थान बदल सकती है। उसे हमारी जड़ें नहीं मिटानी चाहिए।' },
      {
        kind: 'paragraph',
        text: 'Shoonaya आज की तकनीक के माध्यम से किसी कालातीत चीज़ को सँजोने का मेरा प्रयास है।',
      },
      {
        kind: 'paragraph',
        text: 'शायद कोई व्यक्ति किसी महत्वपूर्ण दिन का पालन करे क्योंकि सही समय पर एक शांत स्मरण आया। शायद भारत से दूर बड़ा हो रहा कोई बच्चा अपने परिवार की परंपरा के बारे में कुछ अर्थपूर्ण जान सके। शायद दिशा खोज रहा कोई व्यक्ति उस शिक्षा तक पहुँचे जिसे उसके बुज़ुर्ग कभी हृदय से जानते थे।',
      },
      {
        kind: 'paragraph',
        text: 'ये बातें छोटी लग सकती हैं। लेकिन परंपराएँ हमेशा छोटी बातों के माध्यम से ही जीवित रही हैं:',
      },
      {
        kind: 'rhythm',
        text: 'एक कथा याद रखी गई।\nएक प्रार्थना दोहराई गई।\nएक पावन दिन मनाया गया।\nएक नाम सँजोया गया।\nएक शिक्षा आगे बढ़ाई गई।',
      },
      { kind: 'emphasis', text: 'Shoonaya यहीं से शुरू होता है।' },
      {
        kind: 'rhythm',
        text: 'यह याद रखने से कि हम कहाँ से आए हैं\nयह खोजने तक कि हम भीतर कितनी दूर जा सकते हैं।\n\nशून्य से अनंत तक।',
      },
    ],
    signoff: 'कृतज्ञता सहित,',
    founderName: 'Prince Sharma',
    founderRole: 'संस्थापक, Shoonaya',
    closing: 'अपना अनंत खोजें।',
  },
};

function FontSizeControl({
  copy,
  large,
  onChange,
  isDark,
}: {
  copy: FounderCopy;
  large: boolean;
  onChange: (large: boolean) => void;
  isDark: boolean;
}) {
  const theme = themeColor(isDark);
  return (
    <View style={[styles.fontControl, { borderColor: theme.premiumBorder, backgroundColor: theme.glass }]}>
      {[false, true].map((value) => {
        const selected = large === value;
        return (
          <PressableSurface
            key={String(value)}
            haptic="selection"
            accessibilityLabel={value ? copy.largeText : copy.normalText}
            accessibilityState={{ selected }}
            onPress={() => onChange(value)}
            style={[styles.fontButton, { backgroundColor: selected ? theme.brand : 'transparent' }]}
          >
            <Text
              style={{
                fontFamily: FONTS.serifBold,
                fontSize: value ? 18 : 14,
                color: selected ? theme.textOnBrand : theme.text,
              }}
            >
              A
            </Text>
          </PressableSurface>
        );
      })}
    </View>
  );
}

function NoteBody({ copy, language, large, isDark }: { copy: FounderCopy; language: FounderLanguage; large: boolean; isDark: boolean }) {
  const theme = themeColor(isDark);
  const bodyFont = language === 'hi' ? FONTS.devanagari : FONTS.sans;
  const headingFont = language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold;
  const bodySize = large ? 19 : 16.5;
  const bodyLineHeight = large ? 31 : 27;

  return (
    <View style={styles.noteBlocks}>
      {copy.blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Text key={index} style={[styles.sectionTitle, { color: theme.text, fontFamily: headingFont }]}>
              {block.text}
            </Text>
          );
        }
        if (block.kind === 'quote') {
          return (
            <View key={index} style={[styles.quoteBlock, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
              <Text style={[styles.quoteText, { color: theme.text, fontFamily: headingFont, fontSize: large ? 20 : 18 }]}>
                {block.text}
              </Text>
            </View>
          );
        }
        if (block.kind === 'emphasis') {
          return (
            <Text
              key={index}
              style={[
                styles.emphasis,
                {
                  color: theme.earth,
                  fontFamily: headingFont,
                  fontSize: large ? 22 : 20,
                  lineHeight: large ? 31 : 28,
                },
              ]}
            >
              {block.text}
            </Text>
          );
        }
        if (block.kind === 'rhythm') {
          return (
            <Text
              key={index}
              style={[
                styles.rhythm,
                {
                  color: theme.text,
                  fontFamily: headingFont,
                  fontSize: large ? 20 : 18,
                  lineHeight: large ? 31 : 28,
                },
              ]}
            >
              {block.text}
            </Text>
          );
        }
        return (
          <Text
            key={index}
            style={{ color: theme.text, fontFamily: bodyFont, fontSize: bodySize, lineHeight: bodyLineHeight }}
          >
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

export function FounderNoteInterlude({
  language,
  tradition,
  progress,
  onBack,
  onContinue,
}: FounderNoteInterludeProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { height, width } = useWindowDimensions();
  const [readerOpen, setReaderOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const copy = COPY[language];
  const compact = height < 720;
  const horizontalPadding = width >= 700 ? 48 : 20;
  const cardMaxWidth = width >= 700 ? 620 : 520;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (readerOpen) {
        setReaderOpen(false);
      } else {
        onBack();
      }
      return true;
    });
    return () => subscription.remove();
  }, [onBack, readerOpen]);

  return (
    <View style={[styles.root, { backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Image
        source={ARTWORK[tradition]}
        style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.32 : 1 }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={180}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['rgba(17,14,12,0.52)', 'rgba(17,14,12,0.74)', 'rgba(17,14,12,0.88)']
            : ['rgba(255,252,245,0.04)', 'rgba(255,252,245,0.12)', 'rgba(250,246,239,0.24)']
        }
        locations={[0, 0.54, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={
            language === 'hi'
              ? `सेटअप के ${progress.total} चरणों में से ${progress.completed} पूरा`
              : `${progress.completed} of ${progress.total} setup steps complete`
          }
          accessibilityValue={{
            min: 0,
            max: progress.total,
            now: progress.completed,
          }}
          pointerEvents="none"
          style={[styles.progressRow, { paddingHorizontal: horizontalPadding }]}
        >
          {Array.from({ length: progress.total }, (_, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    index < progress.completed ? progress.activeColor : progress.inactiveColor,
                },
              ]}
            />
          ))}
        </View>
        {!readerOpen ? (
          <MotionView animationKey="founder-preview" distance={10} duration={300} style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.previewContent,
                {
                  minHeight: height,
                  paddingHorizontal: horizontalPadding,
                  paddingTop: compact ? 8 : 16,
                  paddingBottom: compact ? 18 : 28,
                },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.topBar}>
                <PressableSurface
                  haptic="impact"
                  onPress={onBack}
                  accessibilityLabel={copy.back}
                  style={[styles.roundButton, { borderColor: theme.premiumBorder, backgroundColor: theme.glass }]}
                >
                  <Feather name="chevron-left" size={21} color={theme.text} />
                </PressableSurface>
                <View style={styles.greetingBlock}>
                  <Text style={[styles.greeting, { color: theme.text, fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold }]}>
                    {copy.greeting[tradition]}
                  </Text>
                  <Text style={[styles.welcome, { color: theme.dim, fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.sans }]}>
                    {copy.welcome}
                  </Text>
                </View>
              </View>

              <View style={[styles.wordmark, { marginTop: compact ? 16 : 34 }]}>
                <Text style={[styles.brandName, { color: theme.earth }]}>Shoonaya</Text>
                <View style={styles.brandRule}>
                  <View style={[styles.rule, { backgroundColor: theme.brand }]} />
                  <View style={[styles.lotusMark, { borderColor: theme.brand }]} />
                  <View style={[styles.rule, { backgroundColor: theme.brand }]} />
                </View>
                <Text style={[styles.tagline, { color: theme.dim, fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.serif }]}>
                  {copy.tagline}
                </Text>
              </View>

              <View
                style={[
                  styles.previewCard,
                  {
                    maxWidth: cardMaxWidth,
                    marginTop: compact ? 18 : 30,
                    backgroundColor: isDark ? 'rgba(35,29,24,0.94)' : 'rgba(255,252,246,0.94)',
                    borderColor: theme.premiumBorder,
                    boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
                  },
                ]}
              >
                <View style={[styles.pin, { backgroundColor: theme.brand }]} />
                <Text
                  style={[
                    styles.eyebrow,
                    {
                      color: theme.brand,
                      fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold,
                      letterSpacing: language === 'hi' ? 0 : 1.8,
                    },
                  ]}
                >
                  {copy.eyebrow}
                </Text>
                <Text
                  style={[
                    styles.previewTitle,
                    {
                      color: theme.text,
                      fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold,
                      fontSize: language === 'hi' ? 26 : 29,
                      lineHeight: language === 'hi' ? 38 : 32,
                      letterSpacing: 0,
                    },
                  ]}
                >
                  {copy.title}
                </Text>
                <View style={styles.ornamentRow}>
                  <View style={[styles.ornamentLine, { backgroundColor: theme.premiumBorder }]} />
                  <Feather name="sun" size={14} color={theme.brand} />
                  <View style={[styles.ornamentLine, { backgroundColor: theme.premiumBorder }]} />
                </View>
                <Text
                  style={[
                    styles.teaser,
                    {
                      color: theme.text,
                      fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.sans,
                      lineHeight: language === 'hi' ? 27 : 25,
                    },
                  ]}
                >
                  {copy.teaser}
                </Text>
                <Text style={[styles.rootLine, { color: theme.earth, fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold }]}>
                  {language === 'hi'
                    ? 'दूरी हमारे रहने का स्थान बदल सकती है। उसे हमारी जड़ें नहीं मिटानी चाहिए।'
                    : 'Distance may change where we live. It should not erase our roots.'}
                </Text>
                <View style={styles.previewActions}>
                  <Button label={copy.read} onPress={() => setReaderOpen(true)} style={styles.fullWidth} />
                  <Button label={copy.skip} variant="ghost" onPress={onContinue} style={styles.fullWidth} />
                </View>
              </View>
            </ScrollView>
          </MotionView>
        ) : (
          <MotionView animationKey="founder-reader" distance={8} duration={260} style={styles.flex}>
            <View style={[styles.readerHeader, { paddingHorizontal: horizontalPadding }]}>
              <PressableSurface
                haptic="impact"
                onPress={() => setReaderOpen(false)}
                accessibilityLabel={copy.back}
                style={[styles.roundButton, { borderColor: theme.premiumBorder, backgroundColor: theme.glass }]}
              >
                <Feather name="chevron-left" size={21} color={theme.text} />
              </PressableSurface>
              <Text
                numberOfLines={1}
                style={[
                  styles.readerHeaderTitle,
                  { color: theme.text, fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold },
                ]}
              >
                {copy.headerTitle}
              </Text>
              <FontSizeControl copy={copy} large={largeText} onChange={setLargeText} isDark={isDark} />
            </View>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.readerContent, { paddingHorizontal: horizontalPadding }]}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.readerPaper,
                  {
                    maxWidth: cardMaxWidth,
                    backgroundColor: isDark ? 'rgba(35,29,24,0.96)' : 'rgba(255,252,246,0.96)',
                    borderColor: theme.premiumBorder,
                    boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.readerEyebrow,
                    {
                      color: theme.brand,
                      fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold,
                      letterSpacing: language === 'hi' ? 0 : 1.8,
                    },
                  ]}
                >
                  {copy.eyebrow}
                </Text>
                <Text
                  style={[
                    styles.readerTitle,
                    {
                      color: theme.text,
                      fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold,
                      fontSize: language === 'hi' ? 28 : 32,
                      lineHeight: language === 'hi' ? 40 : 36,
                      letterSpacing: 0,
                    },
                  ]}
                >
                  {copy.title}
                </Text>
                <View style={styles.ornamentRow}>
                  <View style={[styles.ornamentLine, { backgroundColor: theme.premiumBorder }]} />
                  <Feather name="sun" size={14} color={theme.brand} />
                  <View style={[styles.ornamentLine, { backgroundColor: theme.premiumBorder }]} />
                </View>

                <NoteBody copy={copy} language={language} large={largeText} isDark={isDark} />

                <View style={[styles.signature, { borderTopColor: theme.premiumBorder }]}>
                  <Text style={[styles.signoff, { color: theme.dim, fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.script }]}>
                    {copy.signoff}
                  </Text>
                  <Text style={[styles.founderName, { color: theme.text }]}>{copy.founderName}</Text>
                  <Text style={[styles.founderRole, { color: theme.dim, fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.sans }]}>
                    {copy.founderRole}
                  </Text>
                  <Text style={[styles.closing, { color: theme.brand, fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold }]}>
                    {copy.closing}
                  </Text>
                </View>
                <Button label={copy.continue} onPress={onContinue} style={styles.fullWidth} />
              </View>
            </ScrollView>
          </MotionView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  progressRow: { width: '100%', flexDirection: 'row', gap: 8, paddingTop: 4, paddingBottom: 12 },
  progressSegment: { height: 4, flex: 1, borderRadius: 999 },
  previewContent: { alignItems: 'center' },
  topBar: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  roundButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBlock: { flex: 1, gap: 1 },
  greeting: { fontSize: 18, lineHeight: 22 },
  welcome: { fontSize: 12.5, lineHeight: 17 },
  wordmark: { alignItems: 'center', gap: 8 },
  brandName: { fontFamily: FONTS.serifBold, fontSize: 48, lineHeight: 54 },
  brandRule: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rule: { width: 48, height: StyleSheet.hairlineWidth },
  lotusMark: { width: 12, height: 12, borderWidth: 1, borderRadius: 8, transform: [{ rotate: '45deg' }] },
  tagline: { fontSize: 17, fontStyle: 'italic', lineHeight: 23 },
  previewCard: {
    width: '100%',
    borderRadius: RADII.xl,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: 'center',
  },
  pin: { width: 9, height: 9, borderRadius: 5, marginBottom: 13 },
  eyebrow: { fontSize: 10.5, letterSpacing: 1.8, textAlign: 'center' },
  previewTitle: { marginTop: 7, fontSize: 29, lineHeight: 32, textAlign: 'center' },
  ornamentRow: { marginVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  ornamentLine: { width: 46, height: StyleSheet.hairlineWidth },
  teaser: { fontSize: 15.5, textAlign: 'left', alignSelf: 'stretch' },
  rootLine: { marginTop: 14, fontSize: 18, lineHeight: 24, textAlign: 'center' },
  previewActions: { width: '100%', gap: 4, marginTop: 20 },
  fullWidth: { width: '100%' },
  readerHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  readerHeaderTitle: { flex: 1, fontSize: 18 },
  fontControl: { flexDirection: 'row', borderWidth: 1, borderRadius: RADII.pill, padding: 2 },
  fontButton: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: RADII.pill, alignItems: 'center', justifyContent: 'center' },
  readerContent: { alignItems: 'center', paddingTop: 10, paddingBottom: 32 },
  readerPaper: { width: '100%', borderRadius: RADII.xl, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 30 },
  readerEyebrow: { fontFamily: FONTS.sansSemiBold, fontSize: 10.5, letterSpacing: 1.8, textAlign: 'center' },
  readerTitle: { marginTop: 9, fontSize: 32, lineHeight: 36, textAlign: 'center' },
  noteBlocks: { gap: 17 },
  sectionTitle: { marginTop: 10, fontSize: 24, lineHeight: 29 },
  quoteBlock: { borderLeftWidth: 3, borderRadius: RADII.sm, paddingHorizontal: 18, paddingVertical: 16 },
  quoteText: { lineHeight: 29 },
  emphasis: { textAlign: 'center', marginVertical: 4 },
  rhythm: { textAlign: 'center', marginVertical: 2 },
  signature: { marginTop: 28, marginBottom: 24, paddingTop: 24, borderTopWidth: 1, alignItems: 'center' },
  signoff: { fontSize: 19, lineHeight: 28 },
  founderName: { marginTop: 3, fontFamily: FONTS.scriptBold, fontSize: 27, transform: [{ rotate: '-1deg' }] },
  founderRole: { marginTop: 2, fontSize: 12.5 },
  closing: { marginTop: 16, fontSize: 21 },
});
