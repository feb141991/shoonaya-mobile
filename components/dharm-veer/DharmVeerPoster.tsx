import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { COLORS, FONTS } from '@/lib/constants';
import type { DharmVeer } from '@/lib/dharm-veer';

type Props = {
  hero: DharmVeer;
  height?: number;
  compact?: boolean;
};

const TRADITION_TONE: Record<string, { start: string; end: string; accent: string }> = {
  hindu: { start: COLORS.homeHeroLight, end: COLORS.brandAccentLight, accent: COLORS.brandGoldLight },
  sikh: { start: COLORS.chipFillLight, end: COLORS.brandAccentLight, accent: COLORS.navy },
  buddhist: { start: COLORS.heroBgDark, end: COLORS.darkBg, accent: COLORS.brandGoldDark },
  jain: { start: COLORS.surfaceSoftLight, end: COLORS.brandAccentLight, accent: COLORS.sage },
};

export function DharmVeerPoster({ hero, height = 260, compact = false }: Props) {
  const tone = TRADITION_TONE[hero.tradition] ?? TRADITION_TONE.hindu;
  const dark = hero.tradition === 'buddhist';
  const ink = dark ? COLORS.creamBg : COLORS.ink;
  const soft = dark ? COLORS.textDimDark : COLORS.textDimLight;

  return (
    <View style={{ width: '100%', height, borderRadius: 22, overflow: 'hidden', backgroundColor: tone.end }}>
      <LinearGradient colors={[tone.start, tone.end]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: compact ? 18 : 24 }}>
        <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 260">
          <Defs>
            <RadialGradient id="heroGlow" cx="50%" cy="35%" r="56%">
              <Stop offset="0" stopColor={tone.accent} stopOpacity={dark ? '0.28' : '0.22'} />
              <Stop offset="1" stopColor={tone.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="180" cy="100" r="170" fill="url(#heroGlow)" />
          <Circle cx="180" cy="122" r="86" stroke={tone.accent} strokeOpacity="0.18" strokeWidth="2" fill="none" />
          <Path d="M40 226 C94 190 130 202 180 226 C230 202 270 190 320 226" stroke={tone.accent} strokeOpacity="0.18" strokeWidth="3" fill="none" />
        </Svg>
        <Text style={{ fontSize: compact ? 56 : 74, includeFontPadding: false }}>{hero.emoji}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ marginTop: 12, fontFamily: FONTS.serifBold, fontSize: compact ? 25 : 30, color: ink, textAlign: 'center' }}
        >
          {hero.name}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: FONTS.sansSemiBold, fontSize: 11, color: tone.accent, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.3 }}>
          {hero.tradition} · {hero.era}
        </Text>
        <Text
          numberOfLines={compact ? 2 : 3}
          style={{ marginTop: 12, fontFamily: FONTS.serif, fontSize: compact ? 15 : 17, lineHeight: compact ? 20 : 23, color: soft, textAlign: 'center' }}
        >
          {hero.tagline}
        </Text>
      </LinearGradient>
    </View>
  );
}
