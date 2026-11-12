import { ReactNode } from 'react';
import { Animated, Pressable, StyleProp, Text, ViewStyle } from 'react-native';

import { FONTS } from '@/lib/constants';

type JapaBeadCounterProps = {
  count: number;
  textColor: string;
  mutedColor: string;
  children: ReactNode;
  countStyle: StyleProp<ViewStyle>;
  onTap: () => void;
};

export function JapaBeadCounter({
  count,
  textColor,
  mutedColor,
  children,
  countStyle,
  onTap,
}: JapaBeadCounterProps) {
  return (
    <Pressable onPress={onTap} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {children}
      <Animated.View style={countStyle}>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: count >= 100 ? 52 : 60, color: textColor }}>
          {count} <Text style={{ fontFamily: FONTS.sans, fontSize: 20, color: mutedColor }}>/ 108</Text>
        </Text>
        {count === 0 ? (
          <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: mutedColor, marginTop: 6 }}>
            tap anywhere to begin
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
