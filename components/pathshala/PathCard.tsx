import { Text, View, useColorScheme } from 'react-native';

import { PressableSurface } from '@/components/ui/PressableSurface';
import type { PathshalaPath } from '@/lib/pathshala-types';
import { COLORS, FONTS } from '@/lib/constants';

const TRADITION_EMOJI: Record<string, string> = {
  hindu: '🪷',
  sikh: '☬',
  buddhist: '☸️',
  jain: '🤲',
};

type PathCardProps = {
  path: PathshalaPath;
  progressPct: number;
  onPress: () => void;
};

export function PathCard({ path, progressPct, onPress }: PathCardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  return (
    <PressableSurface
      onPress={onPress}
      style={{
        borderRadius: 24,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>{TRADITION_EMOJI[path.tradition] ?? '📖'}</Text>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, flex: 1 }}>
              {path.title}
            </Text>
          </View>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }} numberOfLines={2}>
            {path.description}
          </Text>
        </View>

        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: bg,
          }}
        >
          <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11, color: brand, textTransform: 'capitalize' }}>
            {path.difficulty}
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor: border,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.max(0, Math.min(progressPct, 100))}%`,
              height: '100%',
              backgroundColor: brand,
              borderRadius: 999,
            }}
          />
        </View>
      <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
        {progressPct}% complete
      </Text>
    </View>
    </PressableSurface>
  );
}
