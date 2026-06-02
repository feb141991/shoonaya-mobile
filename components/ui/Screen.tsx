import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/constants';

type ScreenProps = PropsWithChildren<ViewProps>;

export function Screen({ children, style, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.creamBg }}>
      <View
        style={[
          {
            flex: 1,
            backgroundColor: COLORS.creamBg,
            paddingHorizontal: 20,
            paddingVertical: 16,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
