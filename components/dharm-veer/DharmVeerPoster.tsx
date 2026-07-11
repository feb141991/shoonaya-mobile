import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import type { DharmVeer } from '@/lib/dharm-veer';

const POSTER_GRAIN_DOTS = Array.from({ length: 60 }).map((_, i) => {
  const x = (((Math.sin(i * 71.3) * 3141.59) % 1) + 1) % 1 * 360;
  const y = (((Math.cos(i * 37.7) * 5823.11) % 1) + 1) % 1 * 260;
  return { x, y, id: i };
});

function PosterGrainOverlay({ dark }: { dark: boolean }) {
  const dotColor = dark ? COLORS.onMediaWhite : COLORS.brandEarthLight;
  const opacity = dark ? 0.05 : 0.04;
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 260">
      {POSTER_GRAIN_DOTS.map((dot) => (
        <Circle key={dot.id} cx={dot.x} cy={dot.y} r={0.8} fill={dotColor} opacity={opacity} />
      ))}
    </Svg>
  );
}

function PosterVignetteOverlay({ dark }: { dark: boolean }) {
  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 260">
      <Defs>
        <RadialGradient id="posterVignette" cx="50%" cy="50%" rx="80%" ry="80%">
          <Stop offset="40%" stopColor={dark ? COLORS.darkBg : COLORS.brandEarthLight} stopOpacity="0" />
          <Stop offset="100%" stopColor={dark ? COLORS.darkBg : COLORS.brandEarthLight} stopOpacity={dark ? 0.38 : 0.12} />
        </RadialGradient>
      </Defs>
      <Path d="M0 0 H360 V260 H0 Z" fill="url(#posterVignette)" />
    </Svg>
  );
}

type Props = {
  hero: DharmVeer;
  height?: number;
  compact?: boolean;
};

type PosterTone = {
  start: string;
  mid: string;
  end: string;
  accent: string;
  ink: string;
  soft: string;
  dark: boolean;
};

const TRADITION_TONE: Record<string, PosterTone> = {
  hindu: {
    start: COLORS.brandAccentLight,
    mid: COLORS.homeHeroLight,
    end: COLORS.surfaceSoftLight,
    accent: COLORS.brandGoldLight,
    ink: COLORS.ink,
    soft: COLORS.textDimLight,
    dark: false,
  },
  sikh: {
    start: COLORS.brandAccentLight,
    mid: COLORS.chipFillLight,
    end: COLORS.surfaceSoftLight,
    accent: COLORS.navy,
    ink: COLORS.navy,
    soft: COLORS.brandEarthLight,
    dark: false,
  },
  buddhist: {
    start: COLORS.heroBgDark,
    mid: COLORS.darkBg,
    end: COLORS.homeHeroDark,
    accent: COLORS.brandGoldDark,
    ink: COLORS.creamBg,
    soft: COLORS.textDimDark,
    dark: true,
  },
  jain: {
    start: COLORS.brandAccentLight,
    mid: COLORS.surfaceSoftLight,
    end: COLORS.homeHeroLight,
    accent: COLORS.sage,
    ink: COLORS.sage,
    soft: COLORS.brandEarthLight,
    dark: false,
  },
};

type Motif = 'bow' | 'peacock' | 'sun' | 'sikh-light' | 'lotus' | 'mountain' | 'mandala';

function resolveMotif(hero: DharmVeer): Motif {
  const haystack = `${hero.id} ${hero.name} ${hero.emoji} ${hero.tagline}`.toLowerCase();
  if (haystack.includes('rama') || haystack.includes('arjuna') || haystack.includes('bow') || haystack.includes('archer')) return 'bow';
  if (haystack.includes('krishna') || haystack.includes('peacock')) return 'peacock';
  if (haystack.includes('karna') || haystack.includes('sun')) return 'sun';
  if (hero.tradition === 'sikh') return 'sikh-light';
  if (hero.tradition === 'jain') return 'lotus';
  if (hero.tradition === 'buddhist') return 'mountain';
  return 'mandala';
}

function HeroMotif({ hero, tone, compact }: { hero: DharmVeer; tone: PosterTone; compact: boolean }) {
  const motif = resolveMotif(hero);
  const stroke = tone.accent;
  const opacity = tone.dark ? 0.34 : 0.26;
  const nameGlyph = (hero.nameLocal ?? hero.name).slice(0, 1);

  if (motif === 'bow') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
        <Path d="M98 238 C202 198 232 112 194 54" stroke={stroke} strokeOpacity={opacity} strokeWidth="4" fill="none" />
        <Path d="M194 54 C242 118 224 204 98 238" stroke={stroke} strokeOpacity="0.16" strokeWidth="1.4" fill="none" />
        <Line x1="104" y1="232" x2="284" y2="88" stroke={stroke} strokeOpacity="0.22" strokeWidth="1.6" />
        <Path d="M270 94 L294 78 L282 106" stroke={stroke} strokeOpacity="0.30" strokeWidth="2" fill="none" />
      </Svg>
    );
  }

  if (motif === 'peacock') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
        <Path d="M172 252 C168 196 190 132 235 72" stroke={stroke} strokeOpacity={opacity} strokeWidth="3" fill="none" />
        <Ellipse cx="242" cy="64" rx="38" ry="54" fill="none" stroke={stroke} strokeOpacity="0.22" strokeWidth="2" transform="rotate(20 242 64)" />
        <Circle cx="246" cy="60" r="16" stroke={stroke} strokeOpacity="0.25" strokeWidth="2" fill="none" />
        <Circle cx="246" cy="60" r="6" fill={stroke} opacity="0.18" />
      </Svg>
    );
  }

  if (motif === 'sun') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
        <Circle cx="180" cy="98" r="50" stroke={stroke} strokeOpacity="0.24" strokeWidth="2" fill="none" />
        {Array.from({ length: 16 }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / 16;
          const x1 = 180 + Math.cos(angle) * 64;
          const y1 = 98 + Math.sin(angle) * 64;
          const x2 = 180 + Math.cos(angle) * 92;
          const y2 = 98 + Math.sin(angle) * 92;
          return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeOpacity="0.20" strokeWidth="2" />;
        })}
      </Svg>
    );
  }

  if (motif === 'sikh-light') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
        {Array.from({ length: 6 }).map((_, index) => {
          const y = 86 + index * 24;
          return (
            <Path
              key={index}
              d={`M30 ${y} C92 ${y - 32} 138 ${y + 30} 198 ${y} C250 ${y - 24} 292 ${y + 16} 330 ${y - 10}`}
              stroke={stroke}
              strokeOpacity={0.11 + index * 0.018}
              strokeWidth={index === 2 ? 2.4 : 1.6}
              fill="none"
            />
          );
        })}
      </Svg>
    );
  }

  if (motif === 'lotus') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
        {Array.from({ length: 5 }).map((_, index) => {
          const x = 118 + index * 31;
          return (
            <Path
              key={index}
              d={`M180 218 C${x} 160 ${x + 10} 112 180 76 C${250 - index * 31} 112 ${250 - index * 31} 160 180 218`}
              stroke={stroke}
              strokeOpacity={0.12 + index * 0.022}
              strokeWidth="1.7"
              fill="none"
            />
          );
        })}
        <Ellipse cx="180" cy="236" rx="92" ry="15" stroke={stroke} strokeOpacity="0.16" strokeWidth="1.5" fill="none" />
      </Svg>
    );
  }

  if (motif === 'mountain') {
    return (
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
        <Path d="M0 236 L88 150 L130 190 L196 104 L360 246 L360 300 L0 300 Z" fill={stroke} opacity="0.12" />
        <Path d="M120 250 C156 210 198 212 236 252" stroke={stroke} strokeOpacity="0.24" strokeWidth="2.3" fill="none" />
        <Path d="M180 62 V238" stroke={stroke} strokeOpacity="0.14" strokeWidth="8" />
      </Svg>
    );
  }

  return (
    <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
      <Circle cx="180" cy="132" r="92" stroke={stroke} strokeOpacity="0.16" strokeWidth="1.5" fill="none" />
      <Circle cx="180" cy="132" r="58" stroke={stroke} strokeOpacity="0.16" strokeWidth="1.2" fill="none" />
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 12;
        const x1 = 180 + Math.cos(angle) * 64;
        const y1 = 132 + Math.sin(angle) * 64;
        const x2 = 180 + Math.cos(angle) * 96;
        const y2 = 132 + Math.sin(angle) * 96;
        return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeOpacity="0.13" strokeWidth="1.5" />;
      })}
      <SvgText
        x="180"
        y={compact ? '144' : '148'}
        textAnchor="middle"
        fill={stroke}
        opacity="0.13"
        fontSize={compact ? '86' : '104'}
        fontFamily={FONTS.serifBold}
      >
        {nameGlyph}
      </SvgText>
    </Svg>
  );
}

export function DharmVeerPoster({ hero, height = 300, compact = false }: Props) {
  const tone = TRADITION_TONE[hero.tradition] ?? TRADITION_TONE.hindu;

  return (
    <View
      style={{
        width: '100%',
        height,
        borderRadius: compact ? 24 : 30,
        overflow: 'hidden',
        backgroundColor: tone.end,
        boxShadow: tone.dark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light,
      }}
    >
      <LinearGradient
        colors={[tone.start, tone.mid, tone.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', padding: compact ? 18 : 24 }}
      >
        <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 300">
          <Defs>
            <RadialGradient id="heroGlow" cx="50%" cy="35%" r="56%">
              <Stop offset="0" stopColor={tone.accent} stopOpacity={tone.dark ? '0.30' : '0.23'} />
              <Stop offset="1" stopColor={tone.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="180" cy="112" r="182" fill="url(#heroGlow)" />
          <Circle cx="180" cy="134" r="102" stroke={tone.accent} strokeOpacity="0.16" strokeWidth="2" fill="none" />
          <Circle cx="180" cy="134" r="68" stroke={tone.accent} strokeOpacity="0.10" strokeWidth="1.2" fill="none" />
          <Path d="M38 252 C94 214 130 228 180 252 C230 228 270 214 322 252" stroke={tone.accent} strokeOpacity="0.16" strokeWidth="3" fill="none" />
        </Svg>

        <HeroMotif hero={hero} tone={tone} compact={compact} />
        <PosterVignetteOverlay dark={tone.dark} />
        <PosterGrainOverlay dark={tone.dark} />

        <View style={{ position: 'absolute', inset: 12, borderRadius: compact ? 16 : 20, borderWidth: 1, borderColor: tone.accent, opacity: 0.23 }} />
        <View style={{ position: 'absolute', inset: 20, borderRadius: compact ? 12 : 16, borderWidth: 1, borderColor: tone.accent, opacity: 0.12 }} />

        <View
          style={{
            position: 'absolute',
            top: compact ? 18 : 22,
            left: compact ? 18 : 22,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
            backgroundColor: tone.dark ? COLORS.homeHeroOverlayDark : COLORS.homeHeroOverlayLight,
            borderWidth: 1,
            borderColor: tone.accent,
          }}
        >
          <Text style={{ ...TYPE.chip, color: tone.accent, textTransform: 'uppercase', letterSpacing: 1.2 }}>
            {hero.tradition}
          </Text>
        </View>

        <View
          style={{
            width: compact ? 68 : 82,
            height: compact ? 68 : 82,
            borderRadius: compact ? 24 : 30,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tone.dark ? COLORS.homeHeroOverlayDark : COLORS.homeHeroOverlayLight,
            borderWidth: 1,
            borderColor: tone.accent,
          }}
        >
          <Text style={{ fontSize: compact ? 42 : 50, includeFontPadding: false }}>{hero.emoji}</Text>
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ marginTop: 14, fontFamily: FONTS.serifBold, fontSize: compact ? 25 : 32, color: tone.ink, textAlign: 'center' }}
        >
          {hero.name}
        </Text>
        <Text style={{ marginTop: 4, fontFamily: FONTS.sansSemiBold, fontSize: 11, color: tone.accent, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.3 }}>
          {hero.era} - {hero.region}
        </Text>
        <Text
          numberOfLines={compact ? 2 : 3}
          style={{ marginTop: 12, fontFamily: FONTS.serif, fontSize: compact ? 15 : 17, lineHeight: compact ? 20 : 23, color: tone.soft, textAlign: 'center' }}
        >
          {hero.tagline}
        </Text>
      </LinearGradient>
    </View>
  );
}
