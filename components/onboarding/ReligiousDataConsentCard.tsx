import { type LayoutChangeEvent, Pressable, Switch, Text, View } from 'react-native';

import { FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';
import { RELIGIOUS_DATA_CONSENT_COPY } from '@/lib/religious-data-consent';

type Props = {
  isDark: boolean;
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  accent: string;
  onLayout?: (e: LayoutChangeEvent) => void;
};

/**
 * The explicit choice that has to be made before a faith tradition is saved. Same row pattern as the other
 * onboarding switches (a labelled Pressable around a Switch, 56pt target, theme tokens): the switch is off
 * until the person turns it on, and the reason the button below stays disabled is written next to it.
 */
export function ReligiousDataConsentCard({ isDark, agreed, onChange, accent, onLayout }: Props) {
  const theme = themeColor(isDark);
  const copy = RELIGIOUS_DATA_CONSENT_COPY.en;
  const bodyFont = FONTS.sans;

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="summary"
      style={{
        gap: 12,
        borderRadius: RADII.xl,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        padding: 16,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, lineHeight: 20, color: theme.text }}
      >
        {copy.title}
      </Text>
      <Text style={{ fontFamily: bodyFont, fontSize: 13, lineHeight: 19, color: theme.dim }}>{copy.body}</Text>

      <Pressable
        onPress={() => onChange(!agreed)}
        accessibilityRole="switch"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel={copy.switchLabel}
        accessibilityHint={copy.switchHint}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: Math.max(56, MIN_TOUCH_TARGET),
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: agreed ? accent : theme.border,
          backgroundColor: theme.bg,
          paddingVertical: 10,
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: FONTS.sansSemiBold,
            fontSize: 14,
            lineHeight: 19,
            color: theme.text,
          }}
        >
          {copy.switchLabel}
        </Text>
        <Switch
          value={agreed}
          onValueChange={onChange}
          trackColor={{ true: accent }}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>

      {!agreed ? (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: bodyFont, fontSize: 12, lineHeight: 17, color: theme.text }}>
          {copy.needed}
        </Text>
      ) : null}
      <Text style={{ fontFamily: bodyFont, fontSize: 12, lineHeight: 17, color: theme.dim }}>{copy.footer}</Text>
    </View>
  );
}
