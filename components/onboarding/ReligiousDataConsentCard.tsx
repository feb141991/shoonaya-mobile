import { Pressable, Switch, Text, View } from 'react-native';

import { FONTS, MIN_TOUCH_TARGET, RADII, themeColor } from '@/lib/constants';
import { RELIGIOUS_DATA_CONSENT_COPY } from '@/lib/religious-data-consent';
import type { LanguageKey } from '@/lib/onboarding-contract';

type Props = {
  isDark: boolean;
  language: LanguageKey | null;
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  accent: string;
};

/**
 * The explicit choice that has to be made before a faith tradition is saved. Same row pattern as the other
 * onboarding switches (a labelled Pressable around a Switch, 56pt target, theme tokens): the switch is off
 * until the person turns it on, and the reason the button below stays disabled is written next to it.
 */
export function ReligiousDataConsentCard({ isDark, language, agreed, onChange, accent }: Props) {
  const theme = themeColor(isDark);
  const isHindi = language === 'hi';
  const copy = RELIGIOUS_DATA_CONSENT_COPY[isHindi ? 'hi' : 'en'];
  const bodyFont = isHindi ? FONTS.devanagari : FONTS.sans;

  return (
    <View
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
        style={{ fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold, fontSize: 15, lineHeight: isHindi ? 22 : 20, color: theme.text }}
      >
        {copy.title}
      </Text>
      <Text style={{ fontFamily: bodyFont, fontSize: 13, lineHeight: isHindi ? 21 : 19, color: theme.dim }}>{copy.body}</Text>

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
            fontFamily: isHindi ? FONTS.devanagariBold : FONTS.sansSemiBold,
            fontSize: 14,
            lineHeight: isHindi ? 21 : 19,
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
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: bodyFont, fontSize: 12, lineHeight: isHindi ? 19 : 17, color: theme.text }}>
          {copy.needed}
        </Text>
      ) : null}
      <Text style={{ fontFamily: bodyFont, fontSize: 12, lineHeight: isHindi ? 19 : 17, color: theme.dim }}>{copy.footer}</Text>
    </View>
  );
}
