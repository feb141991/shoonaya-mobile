import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE, themeColor } from '@/lib/constants';

type OnboardingShellProps = {
  transitionKey: string;
  title: string;
  eyebrow?: string;
  stepLabel: string;
  stepPosition: number;
  stepCount: number;
  requiredStatus?: 'required' | 'optional';
  requiredStatusLabel?: string;
  backAccessibilityLabel?: string;
  loadingLabel?: string;
  showBack?: boolean;
  onBack?: () => void;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryDisabled?: boolean;
  errorMessage?: string;
  children: React.ReactNode;
};

export function OnboardingShell({
  transitionKey,
  title,
  eyebrow,
  stepLabel,
  stepPosition,
  stepCount,
  requiredStatus,
  requiredStatusLabel,
  backAccessibilityLabel = 'Go back to previous onboarding step',
  loadingLabel = 'Saving…',
  showBack = true,
  onBack,
  primaryActionLabel,
  onPrimaryAction,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryDisabled = false,
  errorMessage,
  children,
}: OnboardingShellProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const headingRef = useRef<View>(null);
  const boundedStepCount = Math.max(1, stepCount);
  const boundedPosition = Math.max(1, Math.min(stepPosition, boundedStepCount));
  const announcement = `${title}. ${stepLabel}`;

  useEffect(() => {
    Keyboard.dismiss();
    const frame = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      const tag = findNodeHandle(headingRef.current);
      if (tag != null) {
        AccessibilityInfo.setAccessibilityFocus(tag);
        AccessibilityInfo.announceForAccessibility(announcement);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [transitionKey, announcement]);

  useEffect(() => {
    if (!showBack || !onBack) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack, showBack]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <View style={{ flex: 1, paddingTop: Math.max(insets.top, 12), backgroundColor: theme.bg }}>
        <View
          style={{
            minHeight: 60,
            paddingHorizontal: 16,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderSoft,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.bg,
          }}
        >
          <View style={{ width: 44, alignItems: 'flex-start' }}>
            {showBack && onBack ? (
              <PressableSurface
                accessibilityLabel={backAccessibilityLabel}
                onPress={onBack}
                haptic="selection"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.cardSoft,
                }}
              >
                <Feather name="arrow-left" size={20} color={theme.text} />
              </PressableSurface>
            ) : null}
          </View>

          <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <Text
              accessibilityRole="text"
              style={{ ...TYPE.caption, color: theme.dim, fontFamily: FONTS.sansMedium }}
            >
              {stepLabel}
            </Text>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ height: 3, width: '76%', borderRadius: RADII.pill, backgroundColor: theme.border }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${(boundedPosition / boundedStepCount) * 100}%`,
                  borderRadius: RADII.pill,
                  backgroundColor: theme.brand,
                }}
              />
            </View>
          </View>

          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View
            ref={headingRef}
            accessible
            accessibilityRole="header"
            accessibilityLabel={announcement}
            style={{ gap: 8 }}
          >
            {eyebrow ? (
              <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansMedium }}>
                {eyebrow}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ ...TYPE.hero, color: theme.text, flex: 1 }}>{title}</Text>
              {requiredStatus ? (
                <View
                  style={{
                    minHeight: 28,
                    paddingHorizontal: 10,
                    borderRadius: RADII.pill,
                    backgroundColor: requiredStatus === 'required' ? theme.brandSoft : theme.cardSoft,
                    borderWidth: 1,
                    borderColor: requiredStatus === 'required' ? theme.brand : theme.border,
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      ...TYPE.caption,
                      color: requiredStatus === 'required' ? theme.brand : theme.dim,
                      fontFamily: FONTS.sansMedium,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    {requiredStatusLabel ?? (requiredStatus === 'required' ? 'Required' : 'Optional')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {children}
        </ScrollView>

        <View
          style={{
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            gap: 8,
          }}
        >
          {errorMessage ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ ...TYPE.caption, color: COLORS.danger, textAlign: 'center' }}
            >
              {errorMessage}
            </Text>
          ) : null}

          <PressableSurface
            accessibilityLabel={primaryLoading ? 'Saving onboarding' : primaryActionLabel}
            accessibilityState={{ disabled: primaryDisabled || primaryLoading, busy: primaryLoading }}
            disabled={primaryDisabled || primaryLoading}
            onPress={onPrimaryAction}
            haptic="impact"
            style={{
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: 16,
              backgroundColor: theme.brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: primaryDisabled || primaryLoading ? 0.55 : 1,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ ...TYPE.label, color: COLORS.ink, fontSize: 16, fontFamily: FONTS.sansMedium, textAlign: 'center' }}>
              {primaryLoading ? loadingLabel : primaryActionLabel}
            </Text>
          </PressableSurface>

          {secondaryActionLabel && onSecondaryAction ? (
            <PressableSurface
              accessibilityLabel={secondaryActionLabel}
              accessibilityState={{ disabled: secondaryDisabled }}
              disabled={secondaryDisabled}
              onPress={onSecondaryAction}
              haptic="selection"
              style={{
                minHeight: MIN_TOUCH_TARGET,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 15, fontFamily: FONTS.sans }}>
                {secondaryActionLabel}
              </Text>
            </PressableSurface>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
