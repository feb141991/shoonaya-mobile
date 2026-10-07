import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, RADII, SHADOWS, TYPE } from '@/lib/constants';

const TTS_RATES = [0.75, 1, 1.25] as const;

export interface ReaderSettingsSheetProps<LanguageCode extends string = string> {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  themeColor: string;
  fontPresets?: ReadonlyArray<{ label: string }>;
  fontStep?: number;
  setFontStep?: (step: number) => void;
  languages?: ReadonlyArray<{ code: LanguageCode; label: string }>;
  currentLanguage?: LanguageCode;
  setLanguage?: (code: LanguageCode) => void;
  showTransliterationToggle?: boolean;
  isTransliterationOn?: boolean;
  onToggleTransliteration?: () => void;
  showMeaningToggle?: boolean;
  isMeaningOn?: boolean;
  onToggleMeaning?: () => void;
  ttsRate?: number;
  onTTSRateChange?: (rate: number) => void;
  onCopy?: () => void;
  isCopied?: boolean;
  onShare?: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

export function ReaderSettingsSheet<LanguageCode extends string = string>({
  visible,
  onClose,
  isDark,
  themeColor,
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
  ttsRate,
  onTTSRateChange,
  onCopy,
  isCopied,
  onShare,
  isPinned,
  onTogglePin,
}: ReaderSettingsSheetProps<LanguageCode>) {
  const insets = useSafeAreaInsets();
  const bgCard = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const bgSubCard = isDark ? COLORS.selectionWellDark : COLORS.selectionWellLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const softBorder = isDark ? COLORS.borderSoftDark : COLORS.borderSoftLight;
  const textMain = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const selectedText = isDark ? COLORS.ink : COLORS.onMediaWhite;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.bottomSheetScrim,
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: bgCard,
                borderTopLeftRadius: RADII.xl,
                borderTopRightRadius: RADII.xl,
                borderWidth: 1,
                borderColor: border,
                paddingBottom: insets.bottom + 16,
                maxHeight: '80%',
                boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: softBorder,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: textMain,
                      fontFamily: FONTS.serifBold,
                      fontSize: 18,
                    }}
                  >
                    Reading Options
                  </Text>
                  <Text
                    style={{
                      color: textDim,
                      fontFamily: FONTS.sans,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Customize your reading experience
                  </Text>
                </View>

                <PressableSurface
                  haptic="selection"
                  onPress={onClose}
                  accessibilityLabel="Close reading options"
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
                  <Feather name="x" size={18} color={textMain} />
                </PressableSurface>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 20 }}
              >
                {/* Text Size Presets */}
                {fontPresets && setFontStep && typeof fontStep === 'number' ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ ...TYPE.section, color: textDim }}>
                      Text Size
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
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
                              height: 44,
                              paddingHorizontal: 16,
                              borderRadius: RADII.lg,
                              backgroundColor: selected ? themeColor : bgSubCard,
                              borderColor: selected ? themeColor : border,
                              borderWidth: 1,
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: 0,
                            }}
                          >
                            <Text
                              style={{
                                color: selected ? selectedText : textMain,
                                fontFamily: FONTS.sansSemiBold,
                                fontSize: 13,
                              }}
                            >
                              {preset.label}
                            </Text>
                          </PressableSurface>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Language Selection */}
                {languages && setLanguage && currentLanguage && languages.length > 1 ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ ...TYPE.section, color: textDim }}>
                      Language
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                              height: 44,
                              paddingHorizontal: 16,
                              borderRadius: RADII.lg,
                              backgroundColor: selected ? themeColor : bgSubCard,
                              borderColor: selected ? themeColor : border,
                              borderWidth: 1,
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: 0,
                            }}
                          >
                            <Text
                              style={{
                                color: selected ? selectedText : textMain,
                                fontFamily: FONTS.sansSemiBold,
                                fontSize: 13,
                              }}
                            >
                              {language.label}
                            </Text>
                          </PressableSurface>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Transliteration & Meaning Toggles */}
                {showTransliterationToggle || showMeaningToggle ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ ...TYPE.section, color: textDim }}>
                      Display Layers
                    </Text>
                    <View style={{ gap: 8 }}>
                      {showTransliterationToggle && onToggleTransliteration ? (
                        <PressableSurface
                          haptic="selection"
                          onPress={onToggleTransliteration}
                          accessibilityLabel="Toggle transliteration"
                          accessibilityState={{ selected: Boolean(isTransliterationOn) }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            height: 48,
                            borderRadius: RADII.lg,
                            backgroundColor: bgSubCard,
                            borderColor: border,
                            borderWidth: 1,
                            minHeight: 0,
                          }}
                        >
                          <View>
                            <Text style={{ color: textMain, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                              Transliteration (Roman Script)
                            </Text>
                          </View>
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: isTransliterationOn ? themeColor : 'transparent',
                              borderColor: isTransliterationOn ? themeColor : textDim,
                              borderWidth: 1.5,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isTransliterationOn ? (
                              <Feather name="check" size={14} color={selectedText} />
                            ) : null}
                          </View>
                        </PressableSurface>
                      ) : null}

                      {showMeaningToggle && onToggleMeaning ? (
                        <PressableSurface
                          haptic="selection"
                          onPress={onToggleMeaning}
                          accessibilityLabel="Toggle meaning"
                          accessibilityState={{ selected: Boolean(isMeaningOn) }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            height: 48,
                            borderRadius: RADII.lg,
                            backgroundColor: bgSubCard,
                            borderColor: border,
                            borderWidth: 1,
                            minHeight: 0,
                          }}
                        >
                          <View>
                            <Text style={{ color: textMain, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>
                              Verse Meaning & Translation
                            </Text>
                          </View>
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: isMeaningOn ? themeColor : 'transparent',
                              borderColor: isMeaningOn ? themeColor : textDim,
                              borderWidth: 1.5,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isMeaningOn ? (
                              <Feather name="check" size={14} color={selectedText} />
                            ) : null}
                          </View>
                        </PressableSurface>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* TTS Speed */}
                {onTTSRateChange && ttsRate !== undefined ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ ...TYPE.section, color: textDim }}>
                      Listening Speed
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {TTS_RATES.map((rate) => {
                        const selected = ttsRate === rate;
                        return (
                          <PressableSurface
                            key={rate}
                            haptic="selection"
                            onPress={() => onTTSRateChange(rate)}
                            accessibilityLabel={`Reading speed ${rate} times`}
                            accessibilityState={{ selected }}
                            style={{
                              flex: 1,
                              height: 44,
                              borderRadius: RADII.lg,
                              backgroundColor: selected ? themeColor : bgSubCard,
                              borderColor: selected ? themeColor : border,
                              borderWidth: 1,
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: 0,
                            }}
                          >
                            <Text
                              style={{
                                color: selected ? selectedText : textMain,
                                fontFamily: FONTS.sansSemiBold,
                                fontSize: 13,
                              }}
                            >
                              {rate === 1 ? '1x (Normal)' : `${rate}x`}
                            </Text>
                          </PressableSurface>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Quick Actions: Copy and Share */}
                {onCopy || onShare ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ ...TYPE.section, color: textDim }}>
                      Actions
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {onCopy ? (
                        <PressableSurface
                          haptic="selection"
                          onPress={onCopy}
                          accessibilityLabel={isCopied ? 'Copied' : 'Copy content'}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            height: 44,
                            borderRadius: RADII.lg,
                            backgroundColor: bgSubCard,
                            borderColor: border,
                            borderWidth: 1,
                            minHeight: 0,
                          }}
                        >
                          <Feather
                            name={isCopied ? 'check' : 'copy'}
                            size={16}
                            color={isCopied ? COLORS.success : themeColor}
                          />
                          <Text
                            style={{
                              color: isCopied ? COLORS.success : textMain,
                              fontFamily: FONTS.sansSemiBold,
                              fontSize: 13,
                            }}
                          >
                            {isCopied ? 'Copied' : 'Copy'}
                          </Text>
                        </PressableSurface>
                      ) : null}

                      {onShare ? (
                        <PressableSurface
                          haptic="selection"
                          onPress={onShare}
                          accessibilityLabel="Share content"
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            height: 44,
                            borderRadius: RADII.lg,
                            backgroundColor: bgSubCard,
                            borderColor: border,
                            borderWidth: 1,
                            minHeight: 0,
                          }}
                        >
                          <Feather name="share-2" size={16} color={themeColor} />
                          <Text
                            style={{
                              color: textMain,
                              fontFamily: FONTS.sansSemiBold,
                              fontSize: 13,
                            }}
                          >
                            Share
                          </Text>
                        </PressableSurface>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* Pin Controls Toggle */}
                <View style={{ gap: 10 }}>
                  <Text style={{ ...TYPE.section, color: textDim }}>
                    Controls Visibility
                  </Text>
                  <PressableSurface
                    haptic="selection"
                    onPress={onTogglePin}
                    accessibilityLabel={isPinned ? 'Unpin controls' : 'Pin controls permanently'}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      height: 48,
                      borderRadius: RADII.lg,
                      backgroundColor: bgSubCard,
                      borderColor: border,
                      borderWidth: 1,
                      minHeight: 0,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather
                        name={isPinned ? 'lock' : 'unlock'}
                        size={16}
                        color={isPinned ? themeColor : textDim}
                      />
                      <Text style={{ color: textMain, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                        Keep controls always visible
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: isPinned ? themeColor : 'transparent',
                        borderColor: isPinned ? themeColor : textDim,
                        borderWidth: 1.5,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isPinned ? (
                        <Feather name="check" size={14} color={selectedText} />
                      ) : null}
                    </View>
                  </PressableSurface>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
