import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING } from '@/lib/constants';

type ScreenProps = PropsWithChildren<ViewProps>;

// Default background stays COLORS.creamBg unconditionally (not system-theme
// aware) — matching Screen's previous behavior exactly. This is deliberate,
// not an oversight: app/(auth)/login.tsx renders a bare `<Screen>` with no
// style override and has no dark-mode handling anywhere in the file,
// implying an intentionally light/cream-branded entry screen regardless of
// device theme. Every other screen already passes its own themed
// backgroundColor via `style` (which still wins here — style arrays
// resolve left-to-right), so this default only matters for screens that
// haven't opted into their own theming, and changing it would have altered
// Login's appearance without being asked to touch it.
export function Screen({ children, style, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.creamBg }}>
      <View
        style={[
          {
            flex: 1,
            backgroundColor: COLORS.creamBg,
            paddingHorizontal: SPACING.xl,
            paddingVertical: SPACING.lg,
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
