import { Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { PressableSurface } from "@/components/ui/PressableSurface";
import { COLORS, RADII, SHADOWS, TYPE, themeColor } from "@/lib/constants";

type TourSlidePracticeProps = {
  beadCount: number;
  beadTapped: boolean;
  handleBeadTap: () => void;
  isHindi: boolean;
  theme: ReturnType<typeof themeColor>;
  width: number;
};

export function TourSlidePractice({ beadCount, beadTapped, handleBeadTap, isHindi, theme, width }: TourSlidePracticeProps) {
  return (
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
  );
}
