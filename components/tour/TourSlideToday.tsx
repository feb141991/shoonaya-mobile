import { Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { COLORS, RADII, SHADOWS, TYPE, themeColor } from "@/lib/constants";

type TourSlideTodayProps = {
  isHindi: boolean;
  theme: ReturnType<typeof themeColor>;
  width: number;
};

export function TourSlideToday({ isHindi, theme, width }: TourSlideTodayProps) {
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
  );
}
