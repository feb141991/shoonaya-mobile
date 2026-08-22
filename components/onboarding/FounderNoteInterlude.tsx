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

import {
  type FounderTradition,
  type FounderLanguage,
  type NoteBlock,
  type FounderCopy,
  TRADITION_BRIDGES,
  FOUNDER_COPY as COPY,
  getFounderNoteBlocks,
} from '@/lib/founder-note-content';

export type { FounderTradition, FounderLanguage, NoteBlock, FounderCopy };
export { TRADITION_BRIDGES, getFounderNoteBlocks };

type FounderNoteInterludeProps = {
  language: FounderLanguage;
  tradition: FounderTradition;
  onBack: () => void;
  onContinue: () => void;
};

const ARTWORK: Record<FounderTradition, ImageSource> = {
  hindu: require('@/assets/onboarding/founder-hindu.webp'),
  sikh: require('@/assets/onboarding/founder-sikh.webp'),
  buddhist: require('@/assets/onboarding/founder-buddhist.webp'),
  jain: require('@/assets/onboarding/founder-jain.webp'),
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

function NoteBody({
  copy,
  language,
  tradition,
  large,
  isDark,
}: {
  copy: FounderCopy;
  language: FounderLanguage;
  tradition: FounderTradition;
  large: boolean;
  isDark: boolean;
}) {
  const theme = themeColor(isDark);
  const bodyFont = language === 'hi' ? FONTS.devanagari : FONTS.sans;
  const headingFont = language === 'hi' ? FONTS.devanagariBold : FONTS.serifBold;
  const bodySize = large ? 19 : 16.5;
  const bodyLineHeight = large ? 31 : 27;
  const blocks = getFounderNoteBlocks(language, tradition);

  return (
    <View style={styles.noteBlocks}>
      {blocks.map((block, index) => {
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

                <NoteBody copy={copy} language={language} tradition={tradition} large={largeText} isDark={isDark} />

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
