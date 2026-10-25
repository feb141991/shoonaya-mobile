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

import { Button } from "@/components/ui/Button";
import { PressableSurface } from "@/components/ui/PressableSurface";
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from "@/lib/constants";

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
          <View style={{ width, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 8 }}>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: RADII.sm,
                  backgroundColor: theme.brandSoft,
                }}
              >
                <Text style={{ ...TYPE.chip, color: theme.brand, fontWeight: "700" }}>
                  {isHindi ? "आज · PANCHANG" : "TODAY · PANCHANG"}
                </Text>
              </View>
              <Text style={{ ...TYPE.screenTitle, color: theme.text }}>
                {isHindi ? "पंचांग व पावन पर्व" : "Panchang & Sacred Days"}
              </Text>
              <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 21 }}>
                {isHindi
                  ? "आपकी नगरी के अनुसार सटीक चंद्र तिथि, शुभ मुहूर्त, सूर्योदय व व्रत काल का दैनिक मार्गदर्शन।"
                  : "Astronomically precise lunar tithis, auspicious muhurtas, and vrat timings calculated for your city."}
              </Text>
            </View>

            {/* Faithful Mockup Frame */}
            <View
              style={{
                borderRadius: RADII.xl,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 16,
                gap: 12,
                ...SHADOWS.sm,
              }}
            >
              <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 10.5, fontStyle: "italic" }}>
                {isHindi ? "उदाहरणात्मक झलक · वास्तविक नहीं" : "Illustrative preview · not today's real data"}
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <Feather name="map-pin" size={13} color={theme.brand} />
                  <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.dim, flex: 1, lineHeight: 17 }}>
                    {isHindi ? "नई दिल्ली · सूर्योदय 06:28 AM" : "New Delhi · Sunrise 06:28 AM"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Text style={{ fontSize: 13 }}>☀️</Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 16 }}>11h 24m</Text>
                </View>
              </View>

              <View
                style={{
                  borderRadius: RADII.lg,
                  backgroundColor: theme.brandSoft,
                  padding: 14,
                  gap: 4,
                }}
              >
                <Text style={{ ...TYPE.caption, color: theme.brand, fontWeight: "600" }}>
                  {isHindi ? "शुक्ल पक्ष दशमी तिथि" : "Shukla Paksha Dashami"}
                </Text>
                <Text style={{ ...TYPE.cardHeading, color: theme.text, fontSize: 16 }}>
                  {isHindi ? "श्रवण नक्षत्र · विजय मुहूर्त" : "Shravana Nakshatra · Vijaya Muhurta"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                    backgroundColor: theme.bg,
                    padding: 10,
                    gap: 2,
                  }}
                >
                  <Text style={{ ...TYPE.caption, fontSize: 11, color: theme.dim, lineHeight: 15 }}>
                    {isHindi ? "अभिजीत मुहूर्त" : "Abhijit Muhurta"}
                  </Text>
                  <Text style={{ ...TYPE.label, color: theme.text, fontSize: 12.5 }}>
                    11:48 AM – 12:34 PM
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                    backgroundColor: theme.bg,
                    padding: 10,
                    gap: 2,
                  }}
                >
                  <Text style={{ ...TYPE.caption, fontSize: 11, color: theme.dim, lineHeight: 15 }}>
                    {isHindi ? "राहुकाल (त्याज्य)" : "Rahu Kaal (Avoid)"}
                  </Text>
                  <Text style={{ ...TYPE.label, color: COLORS.danger, fontSize: 12.5 }}>
                    04:15 PM – 05:40 PM
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: RADII.md,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  backgroundColor: theme.cardSoft,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                }}
              >
                <Text style={{ fontSize: 15 }}>🪔</Text>
                <Text style={{ ...TYPE.caption, color: theme.text, flex: 1, lineHeight: 17 }}>
                  {isHindi ? "एकादशी व्रत — कल से पारण तक" : "Ekadashi Vrat — Tomorrow"}
                </Text>
              </View>
            </View>

            <View style={{ height: 10 }} />
          </View>

          {/* ── Slide 2: Practice (Japa & Daily Rituals) ── */}
          <View style={{ width, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 8 }}>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: RADII.sm,
                  backgroundColor: theme.brandSoft,
                }}
              >
                <Text style={{ ...TYPE.chip, color: theme.brand, fontWeight: "700" }}>
                  {isHindi ? "साधना · PRACTICE" : "PRACTICE · JAPA & SADHANA"}
                </Text>
              </View>
              <Text style={{ ...TYPE.screenTitle, color: theme.text }}>
                {isHindi ? "जप व दैनिक अनुष्ठान" : "Japa & Daily Rituals"}
              </Text>
              <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 21 }}>
                {isHindi
                  ? "यथार्थ स्पर्श कंपन के साथ पावन जपमाला, मंत्रोच्चार और ब्रह्म मुहूर्त व नित्य कर्म का क्रम।"
                  : "Tactile Japamala counter with real physical haptics, sacred chants, and morning sadhana guidance."}
              </Text>
            </View>

            {/* Interactive Japamala Bead Mockup */}
            <View
              style={{
                borderRadius: RADII.xl,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 16,
                alignItems: "center",
                gap: 14,
                ...SHADOWS.sm,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <Text numberOfLines={1} style={{ ...TYPE.label, color: theme.text, flex: 1, lineHeight: 19 }}>
                  {isHindi ? "महामृत्युंजय मंत्र जप" : "Maha Mrityunjaya Mantra"}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: RADII.sm,
                    backgroundColor: theme.brandSoft,
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ ...TYPE.caption, fontSize: 11, color: theme.brand, fontWeight: "600" }}>
                    {beadCount} / 108
                  </Text>
                </View>
              </View>

              {/* Interactive Bead Target */}
              <PressableSurface
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel={isHindi ? `मनका ${beadCount} गिनें` : `Count bead ${beadCount}`}
                accessibilityHint={isHindi ? "स्पर्श कंपन का अनुभव करने के लिए टैप करें" : "Tap to count and feel haptic vibration"}
                onPress={handleBeadTap}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: 52,
                  backgroundColor: theme.brandSoft,
                  borderWidth: 2.5,
                  borderColor: theme.brand,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  ...SHADOWS.md,
                }}
              >
                <Text style={{ fontSize: 28 }}>📿</Text>
                <Text style={{ ...TYPE.label, color: theme.brand, fontSize: 13, fontWeight: "700" }}>
                  {beadCount}
                </Text>
              </PressableSurface>

              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ ...TYPE.caption, color: theme.brand, fontWeight: "600", textAlign: "center" }}>
                  {isHindi ? "मनके पर टैप करें (हल्का कंपन महसूस करें)" : "Tap the bead to feel the Mala"}
                </Text>
                <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 11.5, textAlign: "center", lineHeight: 16 }}>
                  {beadTapped
                    ? (isHindi ? "+1 मनका गिना गया · 100% ऑफ़लाइन कार्य करता है" : "+1 bead counted · Works 100% offline")
                    : (isHindi ? "वास्तविक जपमाला जैसा सूक्ष्म स्पर्श कंपन" : "Gentle tactile vibration like a real Mala")}
                </Text>
              </View>

              {/* Nitya Karma Check preview */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: RADII.md,
                  backgroundColor: theme.bg,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Feather name="check-circle" size={14} color={COLORS.success} />
                  <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.text, flex: 1, lineHeight: 17 }}>
                    {isHindi ? "नित्य कर्म: प्रातः स्मरण व स्नान" : "Nitya Karma: Morning ritual"}
                  </Text>
                </View>
                <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 11 }}>1/5</Text>
              </View>
            </View>

            <View style={{ height: 10 }} />
          </View>

          {/* ── Slide 3: Learn (Bhakti, Pathshala & Stories) ── */}
          <View style={{ width, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 8 }}>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: RADII.sm,
                  backgroundColor: theme.brandSoft,
                }}
              >
                <Text style={{ ...TYPE.chip, color: theme.brand, fontWeight: "700" }}>
                  {isHindi ? "ज्ञान · WISDOM" : "LEARN · BHAKTI & STORIES"}
                </Text>
              </View>
              <Text style={{ ...TYPE.screenTitle, color: theme.text }}>
                {isHindi ? "भक्ति, पाठ व अमर गाथाएं" : "Bhakti, Pathshala & Stories"}
              </Text>
              <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 21 }}>
                {isHindi
                  ? "मूल श्लोक, शब्दार्थ, क्रमबद्ध पाठ और इतिहास के महान धर्म वीर नायकों का पावन चरित्र।"
                  : "Authentic scriptures with verified word meanings, guided lessons, and Dharm Veer heroes."}
              </Text>
            </View>

            {/* Faithful Mockup Frame */}
            <View
              style={{
                borderRadius: RADII.xl,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 16,
                gap: 12,
                ...SHADOWS.sm,
              }}
            >
              <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 10.5, fontStyle: "italic" }}>
                {isHindi ? "उदाहरणात्मक झलक" : "Illustrative preview"}
              </Text>

              {/* Verse Card */}
              <View
                style={{
                  borderRadius: RADII.lg,
                  backgroundColor: theme.cardSoft,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  padding: 14,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.brand, fontWeight: "600", fontSize: 11, flex: 1, lineHeight: 15 }}>
                    {isHindi ? "दैनिक श्लोक · श्रीमद्भगवद्गीता" : "Daily Shloka · Bhagavad Gita"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <Feather name="volume-2" size={13} color={theme.dim} />
                    <Text style={{ ...TYPE.caption, fontSize: 11, color: theme.dim, lineHeight: 15 }}>2.47</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: FONTS.serif, fontSize: 15, color: theme.text, lineHeight: 22 }}>
                  कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।
                </Text>
                <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 12, lineHeight: 18 }}>
                  {isHindi
                    ? "तुम्हारा अधिकार केवल कर्म में है, उसके फलों में कभी नहीं।"
                    : "Your right is to action alone, never to its fruits."}
                </Text>
              </View>

              {/* Pathshala & Dharm Veer rows */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: RADII.md,
                    backgroundColor: theme.bg,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                    padding: 11,
                    gap: 3,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>📖</Text>
                  <Text style={{ ...TYPE.label, color: theme.text, fontSize: 12 }}>
                    {isHindi ? "पाठशाला" : "Pathshala"}
                  </Text>
                  <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.dim, fontSize: 11, lineHeight: 15 }}>
                    {isHindi ? "5 क्रमबद्ध पाठ" : "5 guided lessons"}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    borderRadius: RADII.md,
                    backgroundColor: theme.bg,
                    borderWidth: 1,
                    borderColor: theme.borderSoft,
                    padding: 11,
                    gap: 3,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>⚔️</Text>
                  <Text style={{ ...TYPE.label, color: theme.text, fontSize: 12 }}>
                    {isHindi ? "धर्म वीर" : "Dharm Veer"}
                  </Text>
                  <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.dim, fontSize: 11, lineHeight: 15 }}>
                    {isHindi ? "दैनिक प्रेरणा" : "Daily hero story"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ height: 10 }} />
          </View>

          {/* ── Slide 4: Connect (KUL & Mandali) ── */}
          <View style={{ width, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 8 }}>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: RADII.sm,
                  backgroundColor: theme.brandSoft,
                }}
              >
                <Text style={{ ...TYPE.chip, color: theme.brand, fontWeight: "700" }}>
                  {isHindi ? "सम्बन्ध · CONNECT" : "CONNECT · KUL & MANDALI"}
                </Text>
              </View>
              <Text style={{ ...TYPE.screenTitle, color: theme.text }}>
                {isHindi ? "कुल व सत्संग मंडली" : "KUL & Mandali"}
              </Text>
              <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 21 }}>
                {isHindi
                  ? "कुल में पारिवारिक वंशावली व पितृ स्मरण संजोएँ, और मंडली में सह-साधकों के साथ विचार साझा करें।"
                  : "Private family lineage space, ancestral remembrance, and contemplative community satsang."}
              </Text>
            </View>

            {/* Faithful Mockup Frame */}
            <View
              style={{
                borderRadius: RADII.xl,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 16,
                gap: 12,
                ...SHADOWS.sm,
              }}
            >
              <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 10.5, fontStyle: "italic" }}>
                {isHindi ? "उदाहरणात्मक झलक" : "Illustrative preview"}
              </Text>

              {/* KUL Lineage Card */}
              <View
                style={{
                  borderRadius: RADII.lg,
                  backgroundColor: theme.cardSoft,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  padding: 14,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Text style={{ fontSize: 16 }}>🏡</Text>
                    <Text numberOfLines={1} style={{ ...TYPE.label, color: theme.text, flex: 1, lineHeight: 19 }}>
                      {isHindi ? "कुल (पारिवारिक वृत्त)" : "KUL Lineage Space"}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADII.sm, backgroundColor: theme.brandSoft, flexShrink: 0 }}>
                    <Text style={{ ...TYPE.caption, fontSize: 11, color: theme.brand, fontWeight: "600" }}>
                      {isHindi ? "गोपनीय" : "Private"}
                    </Text>
                  </View>
                </View>

                {/* Mini Lineage Avatars */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {[
                    { label: isHindi ? "दादाजी" : "Grandfather", icon: "user" },
                    { label: isHindi ? "पिताजी" : "Father", icon: "user" },
                    { label: isHindi ? "आप" : "You", icon: "smile" },
                  ].map((node, i) => (
                    <View key={i} style={{ alignItems: "center", gap: 3, flex: 1 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: i === 2 ? theme.brandSoft : theme.borderSoft,
                          borderWidth: 1,
                          borderColor: i === 2 ? theme.brand : theme.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name={node.icon as any} size={16} color={i === 2 ? theme.brand : theme.dim} />
                      </View>
                      <Text style={{ ...TYPE.caption, fontSize: 11, color: theme.dim }}>{node.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Mandali Satsang Snippet */}
              <View
                style={{
                  borderRadius: RADII.md,
                  borderWidth: 1,
                  borderColor: theme.borderSoft,
                  backgroundColor: theme.bg,
                  padding: 12,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text numberOfLines={1} style={{ ...TYPE.caption, color: theme.brand, fontWeight: "600", fontSize: 11.5, flex: 1, lineHeight: 15 }}>
                    {isHindi ? "मंडली · सत्संग चिंतन" : "Mandali · Community Reflection"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, flexShrink: 0 }}>
                    <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 11, lineHeight: 15 }}>🙏 18</Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim, fontSize: 11, lineHeight: 15 }}>🪔 9</Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={{ ...TYPE.caption, color: theme.text, fontSize: 12, lineHeight: 17 }}>
                  {isHindi
                    ? "आज प्रातः ध्यान में शांति का गहरा अनुभव हुआ..."
                    : "Found deep stillness in morning Gayatri dhyana today..."}
                </Text>
              </View>
            </View>

            <View style={{ height: 10 }} />
          </View>
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
