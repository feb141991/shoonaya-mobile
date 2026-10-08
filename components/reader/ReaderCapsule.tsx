import { Text, View, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, RADII, SHADOWS, ReaderThemeKey, getReaderTheme } from '@/lib/constants';

export interface ReaderCapsuleProps<LanguageCode extends string = string> {
  isDark: boolean;
  themeColor: string;
  paperTheme?: ReaderThemeKey;
  fontPresets?: ReadonlyArray<{ label: string }>;
  fontStep?: number;
  setFontStep?: (step: number) => void;
  onTTS?: () => void;
  isSpeaking?: boolean;
  isTTSGenerating?: boolean;
  ttsRate?: number;
  languages?: ReadonlyArray<{ code: LanguageCode; label: string }>;
  currentLanguage?: LanguageCode;
  setLanguage?: (code: LanguageCode) => void;
  onOpenSettings: () => void;
  onInteraction: () => void;
}

export function ReaderCapsule<LanguageCode extends string = string>({
  isDark,
  themeColor,
  paperTheme,
  fontPresets,
  fontStep,
  setFontStep,
  onTTS,
  isSpeaking,
  isTTSGenerating,
  ttsRate,
  languages,
  currentLanguage,
  setLanguage,
  onOpenSettings,
  onInteraction,
}: ReaderCapsuleProps<LanguageCode>) {
  const activeTokens = getReaderTheme(paperTheme, isDark);
  const bgGlass = activeTokens.glass;
  const bgSubCard = activeTokens.subCard;
  const border = activeTokens.border;
  const textMain = activeTokens.text;
  const textDim = activeTokens.dim;
  const selectedText = activeTokens.isDark ? COLORS.ink : COLORS.onMediaWhite;

  const handleNextLanguage = () => {
    onInteraction();
    if (!languages || !setLanguage || !currentLanguage) return;
    const currentIndex = languages.findIndex((l) => l.code === currentLanguage);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex].code);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        height: 52,
        paddingHorizontal: 8,
        borderRadius: RADII.pill,
        backgroundColor: bgGlass,
        borderWidth: 1,
        borderColor: border,
        boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
        gap: 6,
      }}
      onTouchStart={onInteraction}
    >
      {/* Font Stepper */}
      {fontPresets && setFontStep && typeof fontStep === 'number' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: bgSubCard,
            borderColor: border,
            borderWidth: 1,
            borderRadius: RADII.pill,
            height: 38,
            paddingHorizontal: 4,
          }}
        >
          <PressableSurface
            haptic="selection"
            onPress={() => {
              onInteraction();
              if (fontStep > 0) setFontStep(fontStep - 1);
            }}
            disabled={fontStep === 0}
            accessibilityLabel="Decrease text size (--)"
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 4 }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: fontStep === 0 ? 0.35 : 1,
              minHeight: 0,
            }}
          >
            <Text
              style={{
                color: textDim,
                fontFamily: FONTS.sansSemiBold,
                fontSize: 13,
                letterSpacing: -0.5,
              }}
            >
              --
            </Text>
          </PressableSurface>

          <View style={{ paddingHorizontal: 4, minWidth: 24, alignItems: 'center' }}>
            <Text
              style={{
                color: textMain,
                fontFamily: FONTS.sansSemiBold,
                fontSize: 11,
              }}
            >
              {fontPresets[fontStep]?.label ?? 'A'}
            </Text>
          </View>

          <PressableSurface
            haptic="selection"
            onPress={() => {
              onInteraction();
              if (fontStep < fontPresets.length - 1) setFontStep(fontStep + 1);
            }}
            disabled={fontStep === fontPresets.length - 1}
            accessibilityLabel="Increase text size (++)"
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 6 }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: fontStep === fontPresets.length - 1 ? 0.35 : 1,
              minHeight: 0,
            }}
          >
            <Text
              style={{
                color: textDim,
                fontFamily: FONTS.sansSemiBold,
                fontSize: 13,
                letterSpacing: -0.5,
              }}
            >
              ++
            </Text>
          </PressableSurface>
        </View>
      ) : null}

      {/* TTS / Listen Button */}
      {onTTS ? (
        <PressableSurface
          haptic="selection"
          onPress={() => {
            onInteraction();
            onTTS();
          }}
          disabled={isTTSGenerating}
          accessibilityLabel={isSpeaking ? 'Stop reading aloud' : 'Listen to this content'}
          accessibilityState={{ disabled: Boolean(isTTSGenerating), selected: Boolean(isSpeaking) }}
          style={{
            height: 38,
            paddingHorizontal: ttsRate ? 10 : 8,
            borderRadius: RADII.pill,
            backgroundColor: isSpeaking ? themeColor : bgSubCard,
            borderColor: border,
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            gap: 4,
            opacity: isTTSGenerating ? 0.55 : 1,
          }}
        >
          {isTTSGenerating ? (
            <ActivityIndicator size="small" color={isSpeaking ? selectedText : themeColor} />
          ) : (
            <Feather
              name={isSpeaking ? 'volume-x' : 'volume-2'}
              size={18}
              color={isSpeaking ? selectedText : themeColor}
            />
          )}
          {ttsRate && !isTTSGenerating ? (
            <Text
              style={{
                color: isSpeaking ? selectedText : textDim,
                fontFamily: FONTS.sansSemiBold,
                fontSize: 11,
              }}
            >
              {ttsRate === 1 ? '1x' : `${ttsRate}x`}
            </Text>
          ) : null}
        </PressableSurface>
      ) : null}

      {/* Language Switcher Pill */}
      {languages && languages.length > 1 && currentLanguage && setLanguage ? (
        <PressableSurface
          haptic="selection"
          onPress={handleNextLanguage}
          accessibilityLabel={`Language ${languages.find((l) => l.code === currentLanguage)?.label ?? currentLanguage}`}
          style={{
            height: 38,
            paddingHorizontal: 10,
            borderRadius: RADII.pill,
            backgroundColor: bgSubCard,
            borderColor: border,
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            gap: 4,
          }}
        >
          <Feather name="globe" size={13} color={textDim} />
          <Text
            style={{
              color: themeColor,
              fontFamily: FONTS.sansSemiBold,
              fontSize: 11,
            }}
          >
            {languages.find((l) => l.code === currentLanguage)?.label ?? currentLanguage}
          </Text>
        </PressableSurface>
      ) : null}

      {/* Aa Settings Sheet Button */}
      <PressableSurface
        haptic="selection"
        onPress={() => {
          onInteraction();
          onOpenSettings();
        }}
        accessibilityLabel="Reader options and appearance"
        style={{
          width: 44,
          height: 38,
          borderRadius: RADII.pill,
          backgroundColor: bgSubCard,
          borderColor: border,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        <Text
          style={{
            color: themeColor,
            fontFamily: FONTS.serifBold,
            fontSize: 15,
            lineHeight: 18,
          }}
        >
          Aa
        </Text>
      </PressableSurface>
    </View>
  );
}
