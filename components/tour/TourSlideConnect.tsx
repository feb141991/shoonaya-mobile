import { Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";

import { RADII, SHADOWS, TYPE, themeColor } from "@/lib/constants";

type TourSlideConnectProps = {
  isHindi: boolean;
  theme: ReturnType<typeof themeColor>;
  width: number;
};

export function TourSlideConnect({ isHindi, theme, width }: TourSlideConnectProps) {
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
            {isHindi ? "सम्बन्ध · CONNECT" : "CONNECT · KUTUMB & MANDALI"}
          </Text>
        </View>
        <Text style={{ ...TYPE.screenTitle, color: theme.text }}>
          {isHindi ? "कुटुम्ब व सत्संग मंडली" : "Kutumb & Mandali"}
        </Text>
        <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 21 }}>
          {isHindi
            ? "कुटुम्ब में पारिवारिक वंशावली व पितृ स्मरण संजोएँ, और मंडली में सह-साधकों के साथ विचार साझा करें।"
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
                {isHindi ? "कुटुम्ब (पारिवारिक वृत्त)" : "Kutumb · Family Sanctuary"}
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
  );
}
