import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { COLORS, FONTS } from '@/lib/constants';

const GRAIN_DOTS = Array.from({ length: 150 }).map((_, i) => {
  const x = (((Math.sin(i * 91.7) * 6271.27) % 1) + 1) % 1 * 360;
  const y = (((Math.cos(i * 47.3) * 8923.91) % 1) + 1) % 1 * 640;
  return { x, y, id: i };
});

function GrainOverlay({ dark }: { dark: boolean }) {
  const dotColor = dark ? COLORS.onMediaWhite : COLORS.brandEarthLight;
  const opacity = dark ? 0.05 : 0.04;
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
      {GRAIN_DOTS.map((dot) => (
        <Circle key={dot.id} cx={dot.x} cy={dot.y} r={0.8} fill={dotColor} opacity={opacity} />
      ))}
    </Svg>
  );
}

function VignetteOverlay({ dark }: { dark: boolean }) {
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
      <Defs>
        <RadialGradient id="vignette" cx="50%" cy="50%" rx="80%" ry="80%">
          <Stop offset="40%" stopColor={dark ? COLORS.darkBg : COLORS.brandEarthLight} stopOpacity="0" />
          <Stop offset="100%" stopColor={dark ? COLORS.darkBg : COLORS.brandEarthLight} stopOpacity={dark ? 0.45 : 0.15} />
        </RadialGradient>
      </Defs>
      <Path d="M0 0 H360 V640 H0 Z" fill="url(#vignette)" />
    </Svg>
  );
}

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
  const W = 360;
  const H = 640;

  if (variant === 'buddhist') {
    const stars = Array.from({ length: 50 }).map((_, i) => {
      const x = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 * W;
      const y = (((Math.sin(i * 78.233) * 12543.123) % 1) + 1) % 1 * H * 0.55;
      const s = ((Math.sin(i * 3.13) + 1) / 2) * 0.8 + 0.2;
      return { x, y, r: s, id: i };
    });
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        <Defs>
          <SvgLinearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.gold} stopOpacity="0" />
            <Stop offset="50%" stopColor={theme.gold} stopOpacity="0.22" />
            <Stop offset="100%" stopColor={theme.gold} stopOpacity="0" />
          </SvgLinearGradient>
          <RadialGradient id="bGlow" cx="50%" cy="32%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={theme.gold} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={theme.gold} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="180" cy="205" r="210" fill="url(#bGlow)" />
        {stars.map((star) => (
          <Circle key={star.id} cx={star.x} cy={star.y} r={star.r} fill={theme.gold} opacity={0.4} />
        ))}
        <Path d={`M ${W / 2 - 10} ${H * 0.2} H ${W / 2 + 10} V ${H} H ${W / 2 - 10} Z`} fill="url(#pathGrad)" />
        <Path
          d={`M 0 ${H} L 0 ${H * 0.78} L ${W * 0.22} ${H * 0.66} L ${W * 0.4} ${H * 0.74} L ${W * 0.58} ${H * 0.6} L ${W * 0.78} ${H * 0.72} L ${W} ${H * 0.64} L ${W} ${H} Z`}
          fill={COLORS.darkBg}
          opacity={0.6}
        />
      </Svg>
    );
  }

  if (variant === 'jain') {
    const cx = 180;
    const cy = 524;
    const petals = 5;
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        {Array.from({ length: 4 }).map((_, i) => (
          <Ellipse
            key={`ripple-${i}`}
            cx={cx}
            cy={cy}
            rx={60 + i * 36}
            ry={13 + i * 7.3}
            stroke={COLORS.sage}
            strokeOpacity={0.16}
            strokeWidth={1.5}
            fill="none"
          />
        ))}
        {Array.from({ length: petals }).map((_, i) => {
          const a = Math.PI + (i / (petals - 1)) * Math.PI;
          const ctrlX = cx + Math.cos(a) * 23;
          const ctrlY = cy + Math.sin(a) * 43;
          const endX = cx + Math.cos(a) * 5.3;
          const endY = cy - 50;
          return (
            <Path
              key={`petal-${i}`}
              d={`M ${cx} ${cy} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
              stroke={theme.gold}
              strokeOpacity={0.22}
              strokeWidth={1.8}
              fill="none"
            />
          );
        })}
      </Svg>
    );
  }

  if (variant === 'sikh') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        {Array.from({ length: 5 }).map((_, row) => {
          const baseY = H * 0.62 + row * 15;
          let pathD = '';
          for (let x = -20; x <= W + 20; x += 10) {
            const y = baseY + Math.sin((x / W) * Math.PI * 3 + row) * 8;
            if (x === -20) {
              pathD += `M ${x} ${y}`;
            } else {
              pathD += ` L ${x} ${y}`;
            }
          }
          return (
            <Path
              key={`flow-${row}`}
              d={pathD}
              stroke={theme.gold}
              strokeOpacity={0.15 + row * 0.03}
              strokeWidth={1.5}
              fill="none"
            />
          );
        })}
      </Svg>
    );
  }

  if (variant === 'sanatan') {
    const cx = 180;
    const cy = 294;
    const r = 120;
    const petals = 16;
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="46%" rx="46%" ry="46%">
            <Stop offset="0" stopColor={theme.gold} stopOpacity="0.22" />
            <Stop offset="1" stopColor={theme.gold} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={r * 1.5} fill="url(#glow)" />
        {[0, 1, 2, 3].map((i) => (
          <Circle
            key={`circle-${i}`}
            cx={cx}
            cy={cy}
            r={r * (0.5 + i * 0.18)}
            stroke={theme.gold}
            strokeOpacity={0.16}
            strokeWidth={1.2}
            fill="none"
          />
        ))}
        {Array.from({ length: petals }).map((_, i) => {
          const a = (i / petals) * Math.PI * 2;
          const ex = cx + Math.cos(a) * r * 0.78;
          const ey = cy + Math.sin(a) * r * 0.78;
          const rotationAngle = (a * 180) / Math.PI;
          return (
            <Ellipse
              key={`petal-${i}`}
              cx={ex}
              cy={ey}
              rx={r * 0.16}
              ry={r * 0.06}
              transform={`rotate(${rotationAngle}, ${ex}, ${ey})`}
              stroke={theme.gold}
              strokeOpacity={0.16}
              strokeWidth={1.2}
              fill="none"
            />
          );
        })}
      </Svg>
    );
  }

  if (variant === 'universal') {
    let waveD = '';
    for (let x = 0; x <= W; x += 10) {
      const y = 294 + Math.sin((x / W) * Math.PI * 2) * 9;
      if (x === 0) waveD += `M ${x} ${y}`; else waveD += ` L ${x} ${y}`;
    }
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 640">
        <Defs>
          <SvgLinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={theme.number} stopOpacity="0" />
            <Stop offset="50%" stopColor={theme.number} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={theme.number} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M96 350 C134 304 160 304 180 350 C200 304 226 304 264 350 C226 396 200 396 180 350 C160 396 134 396 96 350 Z"
          stroke={theme.gold}
          strokeOpacity={0.16}
          strokeWidth={3}
          fill="none"
        />
        <Path d={waveD} stroke="url(#waveGrad)" strokeWidth={4} fill="none" />
      </Svg>
    );
  }

  return null;
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

        {/* Depth vignette and organic grain noise overlays */}
        <VignetteOverlay dark={theme.dark} />
        <GrainOverlay dark={theme.dark} />

        {/* Double nested ornamental borders */}
        <View style={{ position: 'absolute', inset: 15, borderRadius: 15, borderWidth: 1.2, borderColor: theme.gold, opacity: 0.34 }} />
        <View style={{ position: 'absolute', inset: 21, borderRadius: 11, borderWidth: 0.8, borderColor: theme.gold, opacity: 0.18 }} />

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
