import { Text, useColorScheme, View, type ViewProps } from 'react-native';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { TYPE, themeColor } from '@/lib/constants';

// Small-caps eyebrow label, e.g. bhakti.tsx's "CONTROLS" header above the
// mantra/audio controls block. Optional trailing action (e.g. "See all")
// for list-style sections.
//
// The eyebrow label uses theme.brand (the theme-aware brandGoldDark/
// brandGoldLight pair — see lib/constants.ts), so it renders the PWA's
// actual light-mode primary (#D88A1C) rather than always showing the
// dark-mode gold value regardless of theme. The trailing action text is a
// dim/secondary tone, which also differs by theme (textDimLight vs
// textDimDark), so both read useColorScheme().

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
          ...TYPE.section,
          color: theme.brand,
        }}
      >
        {label}
      </Text>

      {actionLabel && onAction ? (
        <PressableSurface
          haptic="selection"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onAction}
          style={{ minHeight: 0 }}
        >
          <Text style={{ ...TYPE.label, color: theme.dim }}>
            {actionLabel}
          </Text>
        </PressableSurface>
      ) : null}
    </View>
  );
}
