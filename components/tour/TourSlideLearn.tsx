import { Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { FONTS, RADII, SHADOWS, TYPE, themeColor } from "@/lib/constants";

type TourSlideLearnProps = {
  isHindi: boolean;
  theme: ReturnType<typeof themeColor>;
  width: number;
};

export function TourSlideLearn({ isHindi, theme, width }: TourSlideLearnProps) {
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
  );
}
