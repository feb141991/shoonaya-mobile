import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

import { COLORS } from '@/lib/constants';

type CardProps = PropsWithChildren<ViewProps>;

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View
      style={[
        {
          borderRadius: 24,
          padding: 18,
          backgroundColor: COLORS.cardBgLight,
          borderWidth: 1,
          borderColor: COLORS.borderLight,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
