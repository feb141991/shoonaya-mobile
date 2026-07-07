import { Pressable, Text, useColorScheme, View, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII } from '@/lib/constants';

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
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

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
            backgroundColor: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? COLORS.borderDark : COLORS.borderLight,
          }}
        >
          <Feather name={icon} size={26} color={COLORS.brandGold} />
        </View>
      ) : null}

      <Text
        style={{
          fontFamily: FONTS.serifBold,
          fontSize: 20,
          color: text,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={{
            fontFamily: FONTS.sans,
            fontSize: 14,
            color: dim,
            textAlign: 'center',
            lineHeight: 21,
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
            backgroundColor: COLORS.brandGold,
            paddingHorizontal: 24,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: COLORS.ink }}>
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
