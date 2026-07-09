import type { PropsWithChildren } from 'react';
import { useColorScheme, View, type ViewProps, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { SPACING, themeColor, FONTS } from '@/lib/constants';

type ScreenProps = PropsWithChildren<ViewProps> & {
  header?: {
    title: string;
    onBack?: () => void;
    rightElement?: React.ReactNode;
  };
};

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
export function Screen({ children, style, header, ...props }: ScreenProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      {header && (
        <View
          style={{
            paddingTop: 12,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: header.onBack ? 1 : 0,
            borderBottomColor: theme.border,
            backgroundColor: theme.bg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {header.onBack && (
              <Pressable
                onPress={header.onBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Feather name="chevron-left" size={20} color={theme.text} />
              </Pressable>
            )}
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: header.onBack ? 20 : 30, color: theme.text }} numberOfLines={1}>
              {header.title}
            </Text>
          </View>
          {header.rightElement && <View>{header.rightElement}</View>}
        </View>
      )}
      <View
        style={[
          {
            flex: 1,
            backgroundColor: theme.bg,
            paddingHorizontal: SPACING.xl,
            paddingBottom: SPACING.lg,
            // Only add default top padding if there's no header. Otherwise, the header provides the breathing room.
            paddingTop: header ? 0 : 16, 
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
