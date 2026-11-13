import { Switch, Text, View } from 'react-native';

import { FONTS, TYPE, type themeColor } from '@/lib/constants';

export function ToggleRow({
  label,
  subtitle,
  value,
  onChange,
  theme,
  disabled,
  badge,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  theme: ReturnType<typeof themeColor>;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.6 : 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ ...TYPE.label, color: theme.text }}>{label}</Text>
          {badge ? (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.premiumBorder }}>
              <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 10, color: theme.brand, letterSpacing: 0.3 }}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: theme.brand }}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={subtitle}
        accessibilityState={{ checked: value, disabled: !!disabled }}
      />
    </View>
  );
}
