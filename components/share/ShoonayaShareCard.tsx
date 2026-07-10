import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { COLORS, FONTS } from '@/lib/constants';

export type ShoonayaShareVariant = 'sanatan' | 'sikh' | 'jain' | 'buddhist' | 'universal';

export type ShoonayaShareCardData = {
  tradition: string | null | undefined;
  headlineValue?: string | number;
  title?: string;
  subtitle?: string;
  caption?: string;
  userName?: string;
  date?: string;
  footer?: string;
};

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 640;

type VariantTheme = {
  label: string;
  defaultTitle: string;
  top: string;
  bottom: string;
  ink: string;
  soft: string;
  gold: string;
  number: string;
  dark: boolean;
};

const THEMES: Record<ShoonayaShareVariant, VariantTheme> = {
  sanatan: {
    label: 'Sanatan',
    defaultTitle: 'Days of Sadhana',
    top: COLORS.brandAccentLight,
    bottom: COLORS.homeHeroLight,
    ink: COLORS.ink,
    soft: COLORS.textDimLight,
    gold: COLORS.brandGoldLight,
    number: COLORS.brandPrimaryStrongLight,
    dark: false,
  },
  sikh: {
    label: 'Sikh',
    defaultTitle: 'Days of Simran',
    top: COLORS.brandAccentLight,
    bottom: COLORS.chipFillLight,
    ink: COLORS.navy,
    soft: COLORS.brandEarthLight,
    gold: COLORS.brandGoldLight,
    number: COLORS.navy,
    dark: false,
  },
  jain: {
    label: 'Jain',
    defaultTitle: 'Days of Ahimsa',
    top: COLORS.brandAccentLight,
    bottom: COLORS.surfaceSoftLight,
    ink: COLORS.sage,
    soft: COLORS.brandEarthLight,
    gold: COLORS.brandGoldLight,
    number: COLORS.sage,
    dark: false,
  },
  buddhist: {
    label: 'Buddhist',
    defaultTitle: 'Days of Practice',
    top: COLORS.heroBgDark,
    bottom: COLORS.darkBg,
    ink: COLORS.creamBg,
    soft: COLORS.textDimDark,
    gold: COLORS.brandGoldDark,
    number: COLORS.homeHeroLight,
    dark: true,
  },
  universal: {
    label: 'Universal',
    defaultTitle: 'Days of Practice',
    top: COLORS.brandAccentLight,
    bottom: COLORS.surfaceSoftLight,
    ink: COLORS.ink,
    soft: COLORS.textDimLight,
    gold: COLORS.brandGoldLight,
    number: COLORS.navy,
    dark: false,
  },
};

export function resolveShoonayaShareVariant(tradition: string | null | undefined): ShoonayaShareVariant {
  switch ((tradition ?? '').toLowerCase()) {
    case 'hindu':
    case 'sanatan':
    case 'sanatana':
      return 'sanatan';
    case 'sikh':
      return 'sikh';
    case 'jain':
      return 'jain';
    case 'buddhist':
    case 'buddha':
      return 'buddhist';
    default:
      return 'universal';
  }
}

function Wordmark({ color, gold }: { color: string; gold: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 36, color, includeFontPadding: false }}>Sh</Text>
      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 38, color: gold, includeFontPadding: false, marginHorizontal: 1 }}>
        ∞
      </Text>
      <Text style={{ fontFamily: FONTS.serifBold, fontSize: 36, color, includeFontPadding: false }}>naya</Text>
    </View>
  );
}

function Motif({ variant, theme }: { variant: ShoonayaShareVariant; theme: VariantTheme }) {
  if (variant === 'buddhist') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        <Defs>
          <RadialGradient id="bGlow" cx="50%" cy="26%" r="48%">
            <Stop offset="0" stopColor={theme.gold} stopOpacity="0.22" />
            <Stop offset="1" stopColor={theme.gold} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="180" cy="176" r="210" fill="url(#bGlow)" />
        <Path d="M0 510 C60 450 104 460 154 516 C210 446 274 430 360 500 L360 640 L0 640 Z" fill={theme.gold} opacity="0.16" />
        <Path d="M32 560 C96 510 132 520 184 572 C244 520 300 512 360 548" stroke={theme.gold} strokeOpacity="0.38" strokeWidth="2" fill="none" />
      </Svg>
    );
  }

  if (variant === 'jain') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        <Circle cx="180" cy="310" r="132" stroke={theme.gold} strokeOpacity="0.14" strokeWidth="2" fill="none" />
        <Circle cx="180" cy="310" r="98" stroke={COLORS.sage} strokeOpacity="0.13" strokeWidth="2" fill="none" />
        <Path d="M180 434 C150 392 134 350 180 322 C226 350 210 392 180 434 Z" fill={COLORS.sage} opacity="0.14" />
        <Path d="M178 432 C116 402 96 356 150 324 C174 352 184 386 178 432 Z" fill={theme.gold} opacity="0.12" />
        <Path d="M182 432 C244 402 264 356 210 324 C186 352 176 386 182 432 Z" fill={theme.gold} opacity="0.12" />
      </Svg>
    );
  }

  if (variant === 'sikh') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        {[0, 1, 2, 3].map((index) => (
          <Path
            key={index}
            d={`M-40 ${170 + index * 78} C70 ${126 + index * 60} 126 ${238 + index * 30} 240 ${190 + index * 72} C296 ${166 + index * 64} 326 ${166 + index * 70} 410 ${198 + index * 56}`}
            stroke={theme.gold}
            strokeOpacity={0.16 + index * 0.035}
            strokeWidth="2.4"
            fill="none"
          />
        ))}
      </Svg>
    );
  }

  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="44%" r="46%">
          <Stop offset="0" stopColor={theme.gold} stopOpacity="0.18" />
          <Stop offset="1" stopColor={theme.gold} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="180" cy="284" r="194" fill="url(#glow)" />
      <Circle cx="180" cy="284" r="114" stroke={theme.gold} strokeOpacity="0.15" strokeWidth="2" fill="none" />
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const x1 = 180 + Math.cos(angle) * 84;
        const y1 = 284 + Math.sin(angle) * 84;
        const x2 = 180 + Math.cos(angle) * 124;
        const y2 = 284 + Math.sin(angle) * 124;
        return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={theme.gold} strokeOpacity="0.16" strokeWidth="1.4" />;
      })}
      {variant === 'universal' ? (
        <Path d="M96 476 C134 430 160 430 180 476 C200 430 226 430 264 476 C226 522 200 522 180 476 C160 522 134 522 96 476 Z" stroke={theme.gold} strokeOpacity="0.22" strokeWidth="4" fill="none" />
      ) : null}
    </Svg>
  );
}

export const ShoonayaShareCard = forwardRef<View, { data: ShoonayaShareCardData }>(function ShoonayaShareCard({ data }, ref) {
  const variant = resolveShoonayaShareVariant(data.tradition);
  const theme = THEMES[variant];
  const headline = data.headlineValue ?? 0;
  const identity = [data.userName?.trim(), data.date?.trim()].filter(Boolean).join('  ·  ');

  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, overflow: 'hidden', borderRadius: 28 }}>
      <LinearGradient colors={[theme.top, theme.bottom]} style={{ flex: 1, padding: 24, alignItems: 'center' }}>
        <Motif variant={variant} theme={theme} />

        <View style={{ position: 'absolute', inset: 12, borderRadius: 24, borderWidth: 1.2, borderColor: theme.gold, opacity: 0.34 }} />
        <View style={{ position: 'absolute', inset: 22, borderRadius: 20, borderWidth: 1, borderColor: theme.gold, opacity: 0.15 }} />

        <View style={{ marginTop: 48, alignItems: 'center', gap: 14 }}>
          <Wordmark color={theme.ink} gold={theme.gold} />
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 18,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: theme.gold,
              backgroundColor: theme.dark ? COLORS.homeSoftDark : COLORS.brandSoftLight,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1.8, color: theme.gold }}>
              {theme.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {data.subtitle ? (
          <Text style={{ marginTop: 28, fontFamily: FONTS.sansMedium, fontSize: 15, lineHeight: 22, color: theme.soft, textAlign: 'center' }}>
            {data.subtitle}
          </Text>
        ) : null}

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 10 }}>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            style={{
              fontFamily: FONTS.serifBold,
              fontSize: typeof headline === 'number' || /^\d+$/.test(String(headline)) ? 150 : 62,
              lineHeight: typeof headline === 'number' || /^\d+$/.test(String(headline)) ? 156 : 70,
              color: theme.number,
              textAlign: 'center',
              includeFontPadding: false,
            }}
          >
            {headline}
          </Text>
          <Text style={{ marginTop: 16, fontFamily: FONTS.serifBold, fontSize: 30, lineHeight: 34, color: theme.ink, textAlign: 'center' }}>
            {data.title ?? theme.defaultTitle}
          </Text>
          {data.caption ? (
            <Text style={{ marginTop: 18, fontFamily: FONTS.serif, fontSize: 17, lineHeight: 24, color: theme.soft, textAlign: 'center' }} numberOfLines={4}>
              {data.caption}
            </Text>
          ) : null}
        </View>

        {identity ? (
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.gold, textAlign: 'center' }}>{identity}</Text>
        ) : null}

        <View style={{ width: 68, height: 1, backgroundColor: theme.gold, opacity: 0.48, marginTop: 28, marginBottom: 22 }} />
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.soft, textAlign: 'center' }}>
          {data.footer ?? 'Shared from Shoonaya'}
        </Text>
        <Text style={{ marginTop: 8, fontFamily: FONTS.serifBold, fontSize: 17, color: theme.gold, textAlign: 'center' }}>
          Find your infinity.
        </Text>
      </LinearGradient>
    </View>
  );
});
