import { useEffect, type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { useFallbackBackHandler } from '@/components/ui/BackButton';
import { ReaderIntro } from '@/components/reader/ReaderIntro';
import { COLORS, FONTS, SHADOWS } from '@/lib/constants';
import { trackReaderEvent } from '@/lib/analytics/reader-events';

type ReaderLanguage<Code extends string> = {
  code: Code;
  label: string;
};

export interface ReaderShellProps<LanguageCode extends string = string> {
  title: string;
  subtitle?: string;
  fallbackBackUrl: Href;
  onBack?: () => void;
  onBeforeBack?: () => void | Promise<void>;

  themeColor?: string;
  headerCenterContent?: ReactNode;
  ambientGlowColor?: string;

  fontPresets?: ReadonlyArray<{ label: string }>;
  fontStep?: number;
  setFontStep?: (step: number) => void;

  languages?: ReadonlyArray<ReaderLanguage<LanguageCode>>;
  currentLanguage?: LanguageCode;
  setLanguage?: (code: LanguageCode) => void;

  showTransliterationToggle?: boolean;
  isTransliterationOn?: boolean;
  onToggleTransliteration?: () => void;

  showMeaningToggle?: boolean;
  isMeaningOn?: boolean;
  onToggleMeaning?: () => void;
  canShowExplain?: boolean;

  onTTS?: () => void;
  isSpeaking?: boolean;
  isTTSGenerating?: boolean;
  ttsRate?: number;
  onTTSRateChange?: (rate: number) => void;

  onCopy?: () => void;
  isCopied?: boolean;
  onShare?: () => void;

  bottomBar?: ReactNode;
  shellBackgroundColor?: string;
  shellHeaderBackgroundColor?: string;
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
}

const TTS_RATES = [0.75, 1, 1.25] as const;

export function ReaderShell<LanguageCode extends string = string>({
  title,
  subtitle,
  fallbackBackUrl,
  onBack,
  onBeforeBack,
  themeColor = COLORS.brandGoldLight,
  headerCenterContent,
  ambientGlowColor,
  fontPresets,
  fontStep,
  setFontStep,
  languages,
  currentLanguage,
  setLanguage,
  showTransliterationToggle,
  isTransliterationOn,
  onToggleTransliteration,
  showMeaningToggle,
  isMeaningOn,
  onToggleMeaning,
  canShowExplain = false,
  onTTS,
  isSpeaking,
  isTTSGenerating,
  ttsRate,
  onTTSRateChange,
  onCopy,
  isCopied,
  onShare,
  bottomBar,
  shellBackgroundColor,
  shellHeaderBackgroundColor,
  children,
  contentContainerStyle,
}: ReaderShellProps<LanguageCode>) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const handleBack = useFallbackBackHandler(fallbackBackUrl, true, onBack, onBeforeBack);

  useEffect(() => {
    trackReaderEvent('reader_opened', {
      source: title,
      has_transliteration: Boolean(showTransliterationToggle),
      has_meaning: Boolean(showMeaningToggle),
    });
  }, [showMeaningToggle, showTransliterationToggle, title]);

  const bgBase = shellBackgroundColor ?? (isDark ? COLORS.darkBg : COLORS.creamBg);
  const bgCard = shellHeaderBackgroundColor ?? (isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight);
  const bgSubCard = isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const softBorder = isDark ? COLORS.borderSoftDark : COLORS.borderSoftLight;
  const textMain = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const selectedText = isDark ? COLORS.ink : COLORS.onMediaWhite;
  const hasTTSRate = Boolean(onTTS && ttsRate !== undefined && onTTSRateChange);
  const hasSubheader = Boolean(
    fontPresets
    || languages
    || showTransliterationToggle
    || showMeaningToggle
    || hasTTSRate,
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgBase }}>
      {ambientGlowColor ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -150,
            left: -150,
            width: 360,
            height: 360,
            borderRadius: 180,
            backgroundColor: ambientGlowColor,
            opacity: isDark ? 0.12 : 0.08,
          }}
        />
      ) : null}

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: softBorder,
          backgroundColor: bgCard,
          boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
          zIndex: 10,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PressableSurface
            haptic="selection"
            onPress={handleBack}
            accessibilityLabel="Go back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: bgSubCard,
              borderColor: border,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
            }}
          >
            <Feather name="chevron-left" size={20} color={themeColor} />
          </PressableSurface>

          <View style={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
            {headerCenterContent ?? (
              <>
                {subtitle ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: themeColor,
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1.5,
                      marginBottom: 2,
                    }}
                  >
                    {subtitle}
                  </Text>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{ color: textMain, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}
                >
                  {title}
                </Text>
              </>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {onTTS ? (
              <PressableSurface
                haptic="selection"
                onPress={onTTS}
                disabled={isTTSGenerating}
                accessibilityLabel={isSpeaking ? 'Stop reading aloud' : 'Listen to this content'}
                accessibilityState={{ disabled: Boolean(isTTSGenerating), selected: Boolean(isSpeaking) }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: bgSubCard,
                  borderColor: border,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                  opacity: isTTSGenerating ? 0.55 : 1,
                }}
              >
                {isTTSGenerating ? (
                  <ActivityIndicator size="small" color={themeColor} />
                ) : (
                  <Feather name={isSpeaking ? 'volume-x' : 'volume-2'} size={18} color={themeColor} />
                )}
              </PressableSurface>
            ) : null}
            {onCopy ? (
              <PressableSurface
                haptic="selection"
                onPress={onCopy}
                accessibilityLabel={isCopied ? 'Copied' : 'Copy content'}
                accessibilityState={{ selected: Boolean(isCopied) }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: bgSubCard,
                  borderColor: border,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                }}
              >
                <Feather
                  name={isCopied ? 'check' : 'copy'}
                  size={18}
                  color={isCopied ? COLORS.success : themeColor}
                />
              </PressableSurface>
            ) : null}
            {onShare ? (
              <PressableSurface
                haptic="selection"
                onPress={onShare}
                accessibilityLabel="Share content"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: bgSubCard,
                  borderColor: border,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
                }}
              >
                <Feather name="share-2" size={18} color={themeColor} />
              </PressableSurface>
            ) : null}
          </View>
        </View>

        {hasSubheader ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopWidth: 1,
              borderTopColor: softBorder,
              paddingTop: 12,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {fontPresets && setFontStep && typeof fontStep === 'number' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: bgSubCard, borderColor: border, borderWidth: 1, paddingHorizontal: 6, height: 44, borderRadius: 22 }}>
                  <Feather name="type" size={14} color={textDim} style={{ marginHorizontal: 4 }} />
                  {fontPresets.map((preset, index) => {
                    const selected = fontStep === index;
                    return (
                      <PressableSurface
                        key={preset.label}
                        haptic="selection"
                        onPress={() => setFontStep(index)}
                        accessibilityLabel={`Text size ${preset.label}`}
                        accessibilityState={{ selected }}
                        style={{
                          height: 36,
                          paddingHorizontal: 9,
                          borderRadius: 18,
                          backgroundColor: selected ? themeColor : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 0,
                        }}
                      >
                        <Text style={{ color: selected ? selectedText : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                          {preset.label}
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>
              ) : null}

              {languages && setLanguage && currentLanguage ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: bgSubCard, borderColor: border, borderWidth: 1, paddingHorizontal: 6, height: 44, borderRadius: 22 }}>
                  <Feather name="globe" size={14} color={textDim} style={{ marginHorizontal: 4 }} />
                  {languages.map((language) => {
                    const selected = currentLanguage === language.code;
                    return (
                      <PressableSurface
                        key={language.code}
                        haptic="selection"
                        onPress={() => setLanguage(language.code)}
                        accessibilityLabel={`Reading language ${language.label}`}
                        accessibilityState={{ selected }}
                        style={{
                          height: 36,
                          paddingHorizontal: 9,
                          borderRadius: 18,
                          backgroundColor: selected ? themeColor : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 0,
                        }}
                      >
                        <Text style={{ color: selected ? selectedText : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                          {language.label}
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>
              ) : null}

              {hasTTSRate ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: bgSubCard, borderColor: border, borderWidth: 1, paddingHorizontal: 6, height: 44, borderRadius: 22 }}>
                  {TTS_RATES.map((rate) => {
                    const selected = ttsRate === rate;
                    return (
                      <PressableSurface
                        key={rate}
                        haptic="selection"
                        onPress={() => onTTSRateChange?.(rate)}
                        accessibilityLabel={`Reading speed ${rate} times`}
                        accessibilityState={{ selected }}
                        style={{
                          height: 36,
                          paddingHorizontal: 9,
                          borderRadius: 18,
                          backgroundColor: selected ? themeColor : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 0,
                        }}
                      >
                        <Text style={{ color: selected ? selectedText : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>
                          {rate === 1 ? '1' : rate}x
                        </Text>
                      </PressableSurface>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {showTransliterationToggle || showMeaningToggle ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: bgSubCard, borderColor: border, borderWidth: 1, paddingHorizontal: 6, height: 44, borderRadius: 22 }}>
                {showTransliterationToggle && onToggleTransliteration ? (
                  <PressableSurface
                    haptic="selection"
                    onPress={onToggleTransliteration}
                    accessibilityLabel="Toggle transliteration"
                    accessibilityState={{ selected: Boolean(isTransliterationOn) }}
                    style={{
                      height: 36,
                      paddingHorizontal: 10,
                      borderRadius: 18,
                      backgroundColor: isTransliterationOn ? themeColor : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 0,
                    }}
                  >
                    <Text style={{ color: isTransliterationOn ? selectedText : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>
                      TRNS
                    </Text>
                  </PressableSurface>
                ) : null}
                {showMeaningToggle && onToggleMeaning ? (
                  <PressableSurface
                    haptic="selection"
                    onPress={onToggleMeaning}
                    accessibilityLabel="Toggle meaning"
                    accessibilityState={{ selected: Boolean(isMeaningOn) }}
                    style={{
                      height: 36,
                      paddingHorizontal: 10,
                      borderRadius: 18,
                      backgroundColor: isMeaningOn ? themeColor : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 0,
                    }}
                  >
                    <Text style={{ color: isMeaningOn ? selectedText : textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10 }}>
                      MEANING
                    </Text>
                  </PressableSurface>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            paddingHorizontal: 16,
            paddingTop: 24,
            paddingBottom: insets.bottom + (bottomBar ? 120 : 32),
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>

      {bottomBar ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom,
            borderTopWidth: 1,
            borderTopColor: border,
            backgroundColor: bgCard,
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
          }}
        >
          {bottomBar}
        </View>
      ) : null}

      <ReaderIntro
        isDark={isDark}
        capabilities={{
          canToggleLocalLanguage: Boolean(languages?.length),
          canGenerateTTS: Boolean(onTTS),
          canShowExplain,
          canToggleTransliteration: Boolean(showTransliterationToggle),
          canShowMeaning: Boolean(showMeaningToggle),
        }}
      />
    </View>
  );
}
