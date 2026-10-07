import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { useFallbackBackHandler } from '@/components/ui/BackButton';
import { ReaderIntro } from '@/components/reader/ReaderIntro';
import { ReaderCapsule } from '@/components/reader/ReaderCapsule';
import { ReaderSettingsSheet } from '@/components/reader/ReaderSettingsSheet';
import {
  getReaderPinned,
  setReaderPinned,
  hasSeenFirstTimeHint,
  markFirstTimeHintSeen,
} from '@/lib/readerPrefs';
import { COLORS, FONTS, RADII, SHADOWS } from '@/lib/constants';
import { trackReaderEvent } from '@/lib/analytics/reader-events';
import { NAV_BAR_CLEARANCE } from '@/lib/nav-bar';

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
  scrollViewRef?: React.RefObject<ScrollView | null>;
  onScroll?: (event: import('react-native').NativeSyntheticEvent<import('react-native').NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}

const AUTO_HIDE_DELAY_MS = 3500;

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
  scrollViewRef,
  onScroll,
  scrollEventThrottle,
}: ReaderShellProps<LanguageCode>) {
  // Prevent device screen from dimming or locking during active reading
  useKeepAwake();

  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const handleBack = useFallbackBackHandler(fallbackBackUrl, true, onBack, onBeforeBack);

  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isScreenReader, setIsScreenReader] = useState(false);
  const [isReduceMotion, setIsReduceMotion] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const headerAnim = useRef(new Animated.Value(1)).current;
  const capsuleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load pinned preference and accessibility state on mount
  useEffect(() => {
    let mounted = true;
    getReaderPinned().then((pinned) => {
      if (mounted && pinned) {
        setIsPinned(true);
      }
    });

    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setIsScreenReader(enabled);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setIsReduceMotion(enabled);
    });

    const screenReaderSub = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        if (mounted) setIsScreenReader(enabled);
      },
    );
    const reduceMotionSub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (mounted) setIsReduceMotion(enabled);
      },
    );

    return () => {
      mounted = false;
      screenReaderSub?.remove();
      reduceMotionSub?.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const hideControls = useCallback(async () => {
    if (isPinned || isScreenReader || isSheetOpen || isTTSGenerating || isSpeaking) {
      return;
    }
    setIsControlsVisible(false);
    if (isReduceMotion) {
      headerAnim.setValue(0);
      capsuleAnim.setValue(0);
    } else {
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(capsuleAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Display first-time hint if not yet seen
    const seen = await hasSeenFirstTimeHint();
    if (!seen) {
      setShowHint(true);
      await markFirstTimeHintSeen();
      setTimeout(() => setShowHint(false), 3200);
    }
  }, [
    isPinned,
    isScreenReader,
    isSheetOpen,
    isTTSGenerating,
    isSpeaking,
    isReduceMotion,
    headerAnim,
    capsuleAnim,
  ]);

  const resetAutoHideTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isPinned || isScreenReader || isSheetOpen || isTTSGenerating || isSpeaking) {
      return;
    }
    timerRef.current = setTimeout(() => {
      void hideControls();
    }, AUTO_HIDE_DELAY_MS);
  }, [isPinned, isScreenReader, isSheetOpen, isTTSGenerating, isSpeaking, hideControls]);

  const showControls = useCallback(() => {
    setIsControlsVisible(true);
    if (isReduceMotion) {
      headerAnim.setValue(1);
      capsuleAnim.setValue(1);
    } else {
      Animated.parallel([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(capsuleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    resetAutoHideTimer();
  }, [isReduceMotion, headerAnim, capsuleAnim, resetAutoHideTimer]);

  // Keep controls open or trigger timer when speaking / sheet state changes
  useEffect(() => {
    if (isPinned || isScreenReader || isSheetOpen || isTTSGenerating || isSpeaking) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!isControlsVisible) {
        showControls();
      }
    } else if (isControlsVisible) {
      resetAutoHideTimer();
    }
  }, [
    isPinned,
    isScreenReader,
    isSheetOpen,
    isTTSGenerating,
    isSpeaking,
    isControlsVisible,
    showControls,
    resetAutoHideTimer,
  ]);

  const togglePin = useCallback(async () => {
    const next = !isPinned;
    setIsPinned(next);
    await setReaderPinned(next);
    if (next) {
      showControls();
    } else {
      resetAutoHideTimer();
    }
  }, [isPinned, showControls, resetAutoHideTimer]);

  const handleInteraction = useCallback(() => {
    if (!isControlsVisible) {
      showControls();
    } else {
      resetAutoHideTimer();
    }
  }, [isControlsVisible, showControls, resetAutoHideTimer]);

  const handlePageTap = useCallback(() => {
    if (isControlsVisible) {
      if (!isPinned && !isScreenReader) {
        void hideControls();
      }
    } else {
      showControls();
    }
  }, [isControlsVisible, isPinned, isScreenReader, hideControls, showControls]);

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
  const selectedText = isDark ? COLORS.ink : COLORS.onMediaWhite;

  return (
    <View
      style={{ flex: 1, backgroundColor: bgBase }}
      onTouchStart={handleInteraction}
    >
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

      {/* Compact Top Bar */}
      <Animated.View
        pointerEvents={isControlsVisible ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-insets.top - 80, 0],
              }),
            },
          ],
          opacity: headerAnim,
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: softBorder,
          backgroundColor: bgCard,
          boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
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

          {/* ⛶ Pin controls button */}
          <PressableSurface
            haptic="selection"
            onPress={togglePin}
            accessibilityLabel={isPinned ? 'Unpin controls' : 'Pin controls'}
            accessibilityState={{ selected: isPinned }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isPinned ? themeColor : bgSubCard,
              borderColor: isPinned ? themeColor : border,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
            }}
          >
            <Feather
              name={isPinned ? 'lock' : 'maximize-2'}
              size={18}
              color={isPinned ? selectedText : themeColor}
            />
          </PressableSurface>
        </View>
      </Animated.View>

      {/* First-time tap hint toast */}
      {showHint ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 76,
            alignSelf: 'center',
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: RADII.pill,
            backgroundColor: bgCard,
            borderColor: border,
            borderWidth: 1,
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
            zIndex: 30,
          }}
        >
          <Text
            style={{
              color: textMain,
              fontFamily: FONTS.sansSemiBold,
              fontSize: 12,
            }}
          >
            Tap anywhere to show controls
          </Text>
        </View>
      ) : null}

      <ScrollView
        ref={(node) => {
          if (scrollViewRef) {
            (scrollViewRef as any).current = node;
          }
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => {
          handleInteraction();
          onScroll?.(e);
        }}
        scrollEventThrottle={scrollEventThrottle ?? (onScroll ? 16 : undefined)}
        contentContainerStyle={[
          {
            paddingHorizontal: 16,
            // Header height clearance
            paddingTop: insets.top + 72,
            // Reserved clearance for bottom thumb capsule and nav bar
            paddingBottom: insets.bottom + (bottomBar ? 120 : NAV_BAR_CLEARANCE),
          },
          contentContainerStyle,
        ]}
      >
        <Pressable onPress={handlePageTap}>
          <View onStartShouldSetResponder={() => false}>
            {children}
          </View>
        </Pressable>
      </ScrollView>

      {/* Floating Thumb Capsule */}
      <Animated.View
        pointerEvents={isControlsVisible ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 16,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 10,
          transform: [
            {
              translateY: capsuleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [90, 0],
              }),
            },
          ],
          opacity: capsuleAnim,
        }}
      >
        <ReaderCapsule
          isDark={isDark}
          themeColor={themeColor}
          fontPresets={fontPresets}
          fontStep={fontStep}
          setFontStep={setFontStep}
          onTTS={onTTS}
          isSpeaking={isSpeaking}
          isTTSGenerating={isTTSGenerating}
          ttsRate={ttsRate}
          languages={languages}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
          onOpenSettings={() => setIsSheetOpen(true)}
          onInteraction={handleInteraction}
        />
      </Animated.View>

      {/* Reader Settings Sheet ("Aa" Modal) */}
      <ReaderSettingsSheet
        visible={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        isDark={isDark}
        themeColor={themeColor}
        fontPresets={fontPresets}
        fontStep={fontStep}
        setFontStep={setFontStep}
        languages={languages}
        currentLanguage={currentLanguage}
        setLanguage={setLanguage}
        showTransliterationToggle={showTransliterationToggle}
        isTransliterationOn={isTransliterationOn}
        onToggleTransliteration={onToggleTransliteration}
        showMeaningToggle={showMeaningToggle}
        isMeaningOn={isMeaningOn}
        onToggleMeaning={onToggleMeaning}
        ttsRate={ttsRate}
        onTTSRateChange={onTTSRateChange}
        onCopy={onCopy}
        isCopied={isCopied}
        onShare={onShare}
        isPinned={isPinned}
        onTogglePin={togglePin}
      />

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
