import Feather from '@expo/vector-icons/Feather';
import { Text, useColorScheme, View } from 'react-native';

import { AGE_GUIDANCE_POLICY, isUnderGuidanceAge } from '@/lib/age-guidance';
import { FONTS, TYPE, themeColor } from '@/lib/constants';

type Props = {
  dateOfBirth?: string;
  language?: 'en' | 'hi';
};

export function AgeGuidanceNotice({ dateOfBirth = '', language = 'en' }: Props) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const copy = AGE_GUIDANCE_POLICY.notice[language];
  const under18 = isUnderGuidanceAge(dateOfBirth);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion={under18 ? 'polite' : 'none'}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.premiumBorder,
        backgroundColor: theme.brandSoft,
        paddingHorizontal: 13,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.premiumBorder,
        }}
      >
        <Feather name="shield" size={15} color={theme.brand} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            ...TYPE.caption,
            fontFamily: language === 'hi' ? FONTS.devanagariBold : FONTS.sansSemiBold,
            color: theme.text,
          }}
        >
          {copy.title}
        </Text>
        <Text
          style={{
            ...TYPE.caption,
            fontFamily: language === 'hi' ? FONTS.devanagari : FONTS.sans,
            lineHeight: language === 'hi' ? 20 : 18,
            color: theme.dim,
          }}
        >
          {under18 ? copy.under18Body : copy.body}
        </Text>
      </View>
    </View>
  );
}
