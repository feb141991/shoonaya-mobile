import { Pressable, Text, useColorScheme, View, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type EmptyStateProps = {
  icon?: FeatherIconName;
  emoji?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  style?: ViewStyle;
};

export function EmptyState({
  icon,
  emoji,
  title,
  subtitle,
  ctaLabel,
  onCta,
  style,
}: EmptyStateProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 48,
          paddingHorizontal: 28,
          gap: 12,
        },
        style,
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: 42 }}>{emoji}</Text>
      ) : icon ? (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.brandSoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.premiumBorder,
            boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
          }}
        >
          <Feather name={icon} size={26} color={theme.brand} />
        </View>
      ) : null}

      <Text
        style={{
          ...TYPE.cardHeading,
          color: theme.text,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={{
            ...TYPE.body,
            color: theme.dim,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {ctaLabel && onCta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={onCta}
          style={{
            marginTop: 8,
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: RADII.lg,
            backgroundColor: theme.brand,
            paddingHorizontal: 24,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
          }}
        >
          <Text style={{ ...TYPE.label, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
