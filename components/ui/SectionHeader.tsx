import { Pressable, Text, useColorScheme, View, type ViewProps } from 'react-native';

import { FONTS, themeColor } from '@/lib/constants';

// Small-caps eyebrow label, e.g. bhakti.tsx's "CONTROLS" header above the
// mantra/audio controls block. Optional trailing action (e.g. "See all")
// for list-style sections.
//
// The eyebrow label itself is COLORS.brandGold unconditionally — same
// value in both themes, matching every screen's existing convention for
// gold accents (e.g. bhakti.tsx's own "CONTROLS" header). The trailing
// action text is a dim/secondary tone, which *does* differ by theme
// (textDimLight vs textDimDark), so it reads useColorScheme().

type SectionHeaderProps = ViewProps & {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ label, actionLabel, onAction, style, ...props }: SectionHeaderProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}
      {...props}
    >
      <Text
        style={{
          fontFamily: FONTS.sansSemiBold,
          fontSize: 12,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: theme.brand,
        }}
      >
        {label}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onAction}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.dim }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
