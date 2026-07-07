import { Pressable, Text, View, type ViewProps } from 'react-native';

import { COLORS, FONTS } from '@/lib/constants';

// Small-caps eyebrow label, e.g. bhakti.tsx's "CONTROLS" header above the
// mantra/audio controls block. Optional trailing action (e.g. "See all")
// for list-style sections.

type SectionHeaderProps = ViewProps & {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ label, actionLabel, onAction, style, ...props }: SectionHeaderProps) {
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
          color: COLORS.brandGold,
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
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: COLORS.textDimLight }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
