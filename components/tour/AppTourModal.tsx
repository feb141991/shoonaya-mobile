import { useState, useRef } from "react";
import {
  Modal,
  ScrollView,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";

import { TourSlideConnect } from "@/components/tour/TourSlideConnect";
import { TourSlideLearn } from "@/components/tour/TourSlideLearn";
import { TourSlidePractice } from "@/components/tour/TourSlidePractice";
import { TourSlideToday } from "@/components/tour/TourSlideToday";
import { Button } from "@/components/ui/Button";
import { PressableSurface } from "@/components/ui/PressableSurface";
import { FONTS, MIN_TOUCH_TARGET, TYPE, themeColor } from "@/lib/constants";

import { APP_TOUR_STEPS, type TourStep } from '@/lib/tour-contract';
export { APP_TOUR_STEPS, type TourStep };

export type AppTourModalProps = {
  visible: boolean;
  onClose: () => void;
  isHindi?: boolean;
};

export function AppTourModal({ visible, onClose, isHindi = false }: AppTourModalProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const theme = themeColor(isDark);
  const { width } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const [beadCount, setBeadCount] = useState(1);
  const [beadTapped, setBeadTapped] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const totalSlides = 4;

  const goToSlide = (index: number) => {
    const clamped = Math.max(0, Math.min(totalSlides - 1, index));
    setActiveIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index !== activeIndex && index >= 0 && index < totalSlides) {
      setActiveIndex(index);
    }
  };

  const handleBeadTap = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBeadCount((c) => (c >= 108 ? 1 : c + 1));
    setBeadTapped(true);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        {/* Top Header: Story segment progress bars + Close button */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, gap: 14 }}>
          {/* Progress segments */}
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            {Array.from({ length: totalSlides }).map((_, i) => {
              const isPast = i < activeIndex;
              const isCurrent = i === activeIndex;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3.5,
                    borderRadius: 2,
                    backgroundColor: isCurrent ? theme.brand : isPast ? theme.brandSoft : theme.borderSoft,
                  }}
                />
              );
            })}
          </View>

          {/* Navigation Bar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="compass" size={17} color={theme.brand} />
              <Text style={{ ...TYPE.caption, color: theme.brand, fontFamily: FONTS.sansMedium, letterSpacing: 0.8 }}>
                {isHindi ? `झलक ${activeIndex + 1} / ${totalSlides}` : `TOUR ${activeIndex + 1} OF ${totalSlides}`}
              </Text>
            </View>

            <PressableSurface
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel={isHindi ? "यात्रा बन्द करें" : "Close tour"}
              onPress={onClose}
              style={{
                width: MIN_TOUCH_TARGET,
                height: MIN_TOUCH_TARGET,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Feather name="x" size={18} color={theme.text} />
            </PressableSurface>
          </View>
        </View>

        {/* Swipeable Slides Viewport */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ flex: 1 }}
        >
          {/* ── Slide 1: Today (Panchang & Sacred Days) ── */}
          <TourSlideToday isHindi={isHindi} theme={theme} width={width} />

          {/* ── Slide 2: Practice (Japa & Daily Rituals) ── */}
          <TourSlidePractice
            beadCount={beadCount}
            beadTapped={beadTapped}
            handleBeadTap={handleBeadTap}
            isHindi={isHindi}
            theme={theme}
            width={width}
          />

          {/* ── Slide 3: Learn (Bhakti, Pathshala & Stories) ── */}
          <TourSlideLearn isHindi={isHindi} theme={theme} width={width} />

          {/* ── Slide 4: Connect (KUL & Mandali) ── */}
          <TourSlideConnect isHindi={isHindi} theme={theme} width={width} />
        </ScrollView>

        {/* Bottom Controls Row: Previous / Next / Finish */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.borderSoft,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {activeIndex > 0 ? (
            <Button
              label={isHindi ? "पीछे" : "Previous"}
              variant="secondary"
              accessibilityLabel={isHindi ? "पिछला पृष्ठ" : "Previous tour slide"}
              onPress={() => goToSlide(activeIndex - 1)}
              style={{ flex: 1, minHeight: MIN_TOUCH_TARGET }}
            />
          ) : (
            <Button
              label={isHindi ? "छोड़ें" : "Skip"}
              variant="ghost"
              accessibilityLabel={isHindi ? "यात्रा छोड़ें" : "Skip tour"}
              onPress={onClose}
              style={{ flex: 1, minHeight: MIN_TOUCH_TARGET }}
            />
          )}

          {activeIndex < totalSlides - 1 ? (
            <Button
              label={isHindi ? "आगे बढ़ें" : "Next"}
              variant="primary"
              accessibilityLabel={isHindi ? "अगला पृष्ठ" : "Next tour slide"}
              onPress={() => goToSlide(activeIndex + 1)}
              style={{ flex: 1.4, minHeight: MIN_TOUCH_TARGET }}
            />
          ) : (
            <Button
              label={isHindi ? "शरणस्थली में प्रवेश" : "Enter Sanctuary"}
              variant="primary"
              accessibilityLabel={isHindi ? "शरणस्थली में प्रवेश करें" : "Enter Shoonaya Sanctuary"}
              onPress={onClose}
              style={{ flex: 1.8, minHeight: MIN_TOUCH_TARGET }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
