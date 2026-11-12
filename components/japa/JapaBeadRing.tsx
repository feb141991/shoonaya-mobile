import { Fragment } from 'react';
import { Animated } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, RadialGradient, Stop, Path, G, Line, Ellipse } from 'react-native-svg';

import { FEATURE_COLORS, JAPA_COLORS, OVERLAYS, COLORS } from '@/lib/constants';
import {
  BEAD_RADIUS,
  PRACTICE_BEAD_POSITIONS,
  PRACTICE_CENTER_X,
  PRACTICE_CENTER_Y,
  PRACTICE_PENDANT,
  PRACTICE_RADIUS_X,
  PRACTICE_RADIUS_Y,
  PRACTICE_SVG_HEIGHT,
  PRACTICE_SVG_WIDTH,
  PRACTICE_BOX_HEIGHT,
} from '@/lib/japaBeadRing';
import type { MalaSkin } from '@/lib/mala-skins';
import { MeruCrownApex, NAVARATNA_GEMS } from '@/components/japa/JapaMeruCrown';

// Animated primitives for the bead ring — mirrors PWA's motion.circle pulse
// ring (JapaClient.tsx: "current-pulse"/"flash ripple") using RN's Animated
// API + react-native-svg's AnimatedComponent, since Reanimated isn't wired
// into this screen and the existing scene/mala Animated.timing calls
// elsewhere in the app already use this same classic-Animated pattern.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Interpolated<T extends number | string> = Animated.AnimatedInterpolation<T>;

type JapaBeadRingProps = {
  count: number;
  malaSkin: MalaSkin;
  brandColor: string;
  // On-screen size of the drawing relative to its own units, and how far it is
  // moved down to sit between the top buttons and the Sound pill (see fitRingLayout).
  ringScale: number;
  offsetY: number;
  bloomIndex: number | null;
  pulseRadius: Interpolated<number>;
  pulseOpacity: Interpolated<number>;
  bloomRadius: Interpolated<number>;
  bloomOpacity: Interpolated<number>;
  tapScale: Interpolated<number>;
  // Rotation of the pendant about its top, driven by the tap (see PENDANT_SWAY).
  swayRotate: Interpolated<string>;
};

// The practice screen's 108-bead ring, thread, guru pendant and the pulse and
// tap ripples. Moved out of app/(tabs)/japa.tsx without changes to what it draws.
export function JapaBeadRing({
  count,
  malaSkin,
  brandColor,
  ringScale,
  offsetY,
  bloomIndex,
  pulseRadius,
  pulseOpacity,
  bloomRadius,
  bloomOpacity,
  tapScale,
  swayRotate,
}: JapaBeadRingProps) {
  // Three-tier bead state (done / current / upcoming) with specialized 3D tactile
  // rendering for Sphatik, Vaijayanti, Navaratna, and standard beads.
  function buildBeadElements() {
    const activeIndex = count >= 108 ? 107 : count;
    const beadStyle = malaSkin.beadStyle ?? 'standard';

    const elements = PRACTICE_BEAD_POSITIONS.map(({ x, y }, index) => {
      const isDone = index < activeIndex;
      const isCurrent = index === activeIndex;
      const isSumeru = !malaSkin.hasMeruCrown && index === 54;

      // 💎 Sphatik Crystal: 3D translucent prism facets & specular glints
      if (beadStyle === 'sphatik') {
        const r = isCurrent ? BEAD_RADIUS.current : isDone ? BEAD_RADIUS.done : BEAD_RADIUS.upcoming;
        const gradientId = isCurrent ? 'grad-sphatik-active' : isDone ? 'grad-sphatik-done' : 'grad-sphatik-inactive';
        return (
          <Fragment key={`bead-${index}`}>
            {isCurrent || isDone ? (
              <Circle cx={x} cy={y} r={r + 2.5} fill={FEATURE_COLORS.japa.fill2} />
            ) : null}
            {/* Ambient drop shadow for 3D sphere elevation */}
            <Circle cx={x + r * 0.22} cy={y + r * 0.26} r={r} fill={FEATURE_COLORS.japa.fill3} />
            <Circle
              cx={x}
              cy={y}
              r={r}
              fill={`url(#${gradientId})`}
              stroke={isCurrent ? FEATURE_COLORS.japa.stroke3 : isDone ? OVERLAYS.white[0.9] : FEATURE_COLORS.japa.stroke4}
              strokeWidth={isCurrent ? 1.6 : 0.8}
            />
            {/* Prismatic facet reflections */}
            <Path
              d={`M ${x - r * 0.42} ${y} L ${x} ${y - r * 0.42} L ${x + r * 0.42} ${y} L ${x} ${y + r * 0.42} Z`}
              fill="none"
              stroke={COLORS.onMediaWhite}
              strokeWidth={0.65}
              opacity={isDone || isCurrent ? 0.8 : 0.45}
            />
            {/* Specular pinpoint gleam */}
            <Circle cx={x - r * 0.32} cy={y - r * 0.34} r={Math.max(1.0, r * 0.28)} fill={COLORS.onMediaWhite} opacity={0.95} />
            {/* Internal crystal refraction bounce */}
            <Ellipse cx={x + r * 0.22} cy={y + r * 0.24} rx={r * 0.24} ry={r * 0.12} fill={FEATURE_COLORS.japa.diamondGem} opacity={0.55} />
          </Fragment>
        );
      }

      // 🌿 Vaijayanti Seed: 3D organic seed luster, striations & warm amber shadow
      if (beadStyle === 'vaijayanti') {
        const r = isCurrent ? BEAD_RADIUS.current : isDone ? BEAD_RADIUS.done : BEAD_RADIUS.upcoming;
        const gradientId = isCurrent ? 'grad-vaijayanti-active' : isDone ? 'grad-vaijayanti-done' : 'grad-vaijayanti-inactive';
        return (
          <Fragment key={`bead-${index}`}>
            {isCurrent || isDone ? (
              <Circle cx={x} cy={y} r={r + 2.2} fill={FEATURE_COLORS.japa.fill4} />
            ) : null}
            {/* Ambient warm drop shadow */}
            <Circle cx={x + r * 0.2} cy={y + r * 0.24} r={r} fill={FEATURE_COLORS.japa.fill5} />
            <Circle
              cx={x}
              cy={y}
              r={r}
              fill={`url(#${gradientId})`}
              stroke={isCurrent ? COLORS.warningDark : isDone ? COLORS.metallicGold : FEATURE_COLORS.japa.stroke5}
              strokeWidth={isCurrent ? 1.6 : 0.8}
            />
            {/* Sacred seed striation curve */}
            <Path
              d={`M ${x} ${y - r * 0.7} Q ${x + r * 0.35} ${y} ${x} ${y + r * 0.7}`}
              fill="none"
              stroke={COLORS.metallicGold}
              strokeWidth={0.65}
              opacity={0.5}
            />
            {/* Specular glint */}
            <Circle cx={x - r * 0.3} cy={y - r * 0.32} r={Math.max(1.0, r * 0.26)} fill={COLORS.onMediaWhite} opacity={0.9} />
            <Ellipse cx={x + r * 0.2} cy={y + r * 0.22} rx={r * 0.26} ry={r * 0.13} fill={FEATURE_COLORS.japa.topazLight} opacity={0.45} />
          </Fragment>
        );
      }

      // 👑 Navaratna 9 Gems: 9 Vedic gemstones cycle with brilliant diamond cuts
      if (beadStyle === 'navaratna') {
        const gem = NAVARATNA_GEMS[index % 9];
        const r = isCurrent ? BEAD_RADIUS.current : isDone ? BEAD_RADIUS.done : BEAD_RADIUS.upcoming;
        const gradientId = `grad-gem-${index % 9}`;
        return (
          <Fragment key={`bead-${index}`}>
            {isCurrent || isDone ? (
              <Circle cx={x} cy={y} r={r + 2.4} fill={gem.light} opacity={0.36} />
            ) : null}
            {/* Deep drop shadow */}
            <Circle cx={x + r * 0.2} cy={y + r * 0.24} r={r} fill={COLORS.deepModalScrim} />
            <Circle
              cx={x}
              cy={y}
              r={r}
              fill={`url(#${gradientId})`}
              stroke={isCurrent ? COLORS.onMediaWhite : COLORS.radiantGold}
              strokeWidth={isCurrent ? 1.6 : 0.9}
              opacity={isDone || isCurrent ? 1 : 0.72}
            />
            {/* Brilliant diamond cut table facet */}
            <Path
              d={`M ${x - r * 0.42} ${y} L ${x} ${y - r * 0.42} L ${x + r * 0.42} ${y} L ${x} ${y + r * 0.42} Z`}
              fill="none"
              stroke={COLORS.premiumGlassLight}
              strokeWidth={0.6}
              opacity={isDone || isCurrent ? 0.85 : 0.5}
            />
            <Circle cx={x - r * 0.32} cy={y - r * 0.34} r={Math.max(1.0, r * 0.26)} fill={COLORS.onMediaWhite} opacity={0.95} />
          </Fragment>
        );
      }

      // Standard prayer beads (Rudraksha, Tulsi, Sandalwood, Lotus Seed, Bodhi Seed, etc.)
      const r = isSumeru ? BEAD_RADIUS.sumeru : isCurrent ? BEAD_RADIUS.current : isDone ? BEAD_RADIUS.done : BEAD_RADIUS.upcoming;
      const gradientId = isSumeru ? 'grad-guru' : isCurrent ? 'grad-active' : isDone ? 'grad-done' : 'grad-inactive';
      const shadowOpacity = isCurrent || isSumeru ? 0.55 : isDone ? 0.45 : 0.38;
      const highlightOpacity = isCurrent || isSumeru ? 0.95 : isDone ? 0.85 : 0.7;

      return (
        <Fragment key={`bead-${index}`}>
          {/* Ambient 3D sphere drop shadow */}
          <Circle
            cx={x + r * 0.2}
            cy={y + r * 0.24}
            r={r}
            fill={COLORS.deepModalScrim}
            opacity={shadowOpacity}
          />
          <Circle
            cx={x}
            cy={y}
            r={r}
            fill={`url(#${gradientId})`}
            // The big gold beads get only a hair of their own edge colour: a bright
            // outline ring made them look stuck on.
            stroke={isCurrent || isSumeru ? malaSkin.beadBorder : isDone ? malaSkin.beadColor : malaSkin.beadBorder}
            strokeWidth={isCurrent || isSumeru ? 0.7 : 0.8}
            strokeOpacity={isCurrent || isSumeru ? 0.55 : isDone ? 0.95 : 0.72}
          />
          {isCurrent || isSumeru ? (
            // Soft shine that fades out, built into the bead: a hard white disc
            // on a big bead read as a sticker.
            <Circle cx={x - r * 0.3} cy={y - r * 0.34} r={r * 0.46} fill="url(#grad-shine)" />
          ) : (
            <>
              {/* 3D Top-left specular glint */}
              <Circle cx={x - r * 0.32} cy={y - r * 0.34} r={Math.max(1.0, r * 0.3)} fill={COLORS.onMediaWhite} opacity={highlightOpacity} />
              {/* Bottom-right rim reflection */}
              <Ellipse cx={x + r * 0.22} cy={y + r * 0.24} rx={r * 0.22} ry={r * 0.11} fill={isDone ? COLORS.onMediaWhite : malaSkin.beadColor} opacity={isDone ? 0.35 : 0.2} />
            </>
          )}
        </Fragment>
      );
    });

    // The sumeru and the current bead are bigger than their neighbours and are
    // drawn last, so they sit on top of both neighbours (drawn in order, they
    // hid behind the beads after them and looked lopsided).
    // Ordinary beads overlap their neighbours slightly, so they are drawn from the
    // bottom of the ring up: each bead sits over the one below it, the same way
    // all the way round, instead of every bead covering the previous one.
    const drawLast = (malaSkin.hasMeruCrown ? [] : [54]).concat(activeIndex === 54 && !malaSkin.hasMeruCrown ? [] : [activeIndex]);
    const ordinary = elements.map((_, index) => index).filter((index) => !drawLast.includes(index));
    ordinary.sort((a, b) => Math.min(b, 108 - b) - Math.min(a, 108 - a));
    return [...ordinary, ...drawLast].map((index) => elements[index]);
  }

  const guruBeadBottom = PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + BEAD_RADIUS.sumeru;
  const currentBeadPos = PRACTICE_BEAD_POSITIONS[count >= 108 ? 107 : count];
  const bloomBeadPos = PRACTICE_BEAD_POSITIONS[bloomIndex ?? 0];

  const beadGradientDefs = (
    <Defs>
      {/* Soft shine for the big gold beads: fades to nothing, so it has no edge */}
      <RadialGradient id="grad-shine" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.9" />
        <Stop offset="45%" stopColor={COLORS.onMediaWhite} stopOpacity="0.35" />
        <Stop offset="100%" stopColor={COLORS.onMediaWhite} stopOpacity="0" />
      </RadialGradient>
      {/* Standard Gradients */}
      <RadialGradient id="grad-inactive" cx="30%" cy="26%" r="70%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.75" />
        <Stop offset="30%" stopColor={malaSkin.beadColor} stopOpacity="0.85" />
        <Stop offset="75%" stopColor={malaSkin.beadBorder} stopOpacity="0.95" />
        <Stop offset="100%" stopColor={OVERLAYS.black[0.6]} stopOpacity="0.8" />
      </RadialGradient>
      <RadialGradient id="grad-done" cx="30%" cy="26%" r="70%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.95" />
        <Stop offset="28%" stopColor={malaSkin.beadColor} stopOpacity="1" />
        <Stop offset="72%" stopColor={malaSkin.beadBorder} stopOpacity="1" />
        <Stop offset="100%" stopColor={OVERLAYS.black[0.5]} stopOpacity="0.7" />
      </RadialGradient>
      <RadialGradient id="grad-active" cx="30%" cy="26%" r="70%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="1" />
        <Stop offset="25%" stopColor={brandColor} stopOpacity="1" />
        <Stop offset="70%" stopColor={brandColor} stopOpacity="0.9" />
        <Stop offset="100%" stopColor={malaSkin.beadBorder} stopOpacity="1" />
      </RadialGradient>
      <RadialGradient id="grad-guru" cx="30%" cy="26%" r="70%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.95" />
        <Stop offset="30%" stopColor={malaSkin.threadColor} stopOpacity="1" />
        <Stop offset="75%" stopColor={malaSkin.beadBorder} stopOpacity="1" />
        <Stop offset="100%" stopColor={OVERLAYS.black[0.6]} stopOpacity="0.8" />
      </RadialGradient>

      {/* Radiant Meru Crown 3D Gold */}
      <RadialGradient id="grad-meru-gold" cx="26%" cy="22%" r="80%">
        <Stop offset="0%" stopColor={FEATURE_COLORS.japa.gradMeruGoldStop0} stopOpacity="1" />
        <Stop offset="22%" stopColor={FEATURE_COLORS.japa.gradMeruGoldStop22} stopOpacity="1" />
        <Stop offset="50%" stopColor={COLORS.warningDark} stopOpacity="1" />
        <Stop offset="82%" stopColor={COLORS.warningLight} stopOpacity="1" />
        <Stop offset="100%" stopColor={FEATURE_COLORS.japa.hessoniteDark} stopOpacity="1" />
      </RadialGradient>

      {/* 3D Tactile Sphatik Crystal Gradients */}
      <RadialGradient id="grad-sphatik-inactive" cx="28%" cy="24%" r="72%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.95" />
        <Stop offset="24%" stopColor={FEATURE_COLORS.japa.gradSphatikInactiveStop24} stopOpacity="0.85" />
        <Stop offset="60%" stopColor={FEATURE_COLORS.japa.diamondRim} stopOpacity="0.75" />
        <Stop offset="85%" stopColor={FEATURE_COLORS.japa.gradSphatikInactiveStop85} stopOpacity="0.85" />
        <Stop offset="100%" stopColor={FEATURE_COLORS.japa.gradSphatikInactiveStop100} stopOpacity="0.75" />
      </RadialGradient>
      <RadialGradient id="grad-sphatik-done" cx="28%" cy="24%" r="72%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="1" />
        <Stop offset="22%" stopColor={FEATURE_COLORS.japa.gradSphatikInactiveStop24} stopOpacity="0.95" />
        <Stop offset="55%" stopColor={FEATURE_COLORS.japa.diamondRim} stopOpacity="0.9" />
        <Stop offset="82%" stopColor={FEATURE_COLORS.japa.stroke3} stopOpacity="0.95" />
        <Stop offset="100%" stopColor={FEATURE_COLORS.japa.diamondDark} stopOpacity="1" />
      </RadialGradient>
      <RadialGradient id="grad-sphatik-active" cx="28%" cy="24%" r="72%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="1" />
        <Stop offset="20%" stopColor={FEATURE_COLORS.japa.diamondGem} stopOpacity="1" />
        <Stop offset="52%" stopColor={FEATURE_COLORS.japa.stroke3} stopOpacity="1" />
        <Stop offset="85%" stopColor={FEATURE_COLORS.japa.diamondDark} stopOpacity="1" />
        <Stop offset="100%" stopColor={FEATURE_COLORS.japa.gradSphatikActiveStop100} stopOpacity="1" />
      </RadialGradient>

      {/* 3D Tactile Vaijayanti Seed Gradients */}
      <RadialGradient id="grad-vaijayanti-inactive" cx="30%" cy="26%" r="70%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.9" />
        <Stop offset="26%" stopColor={FEATURE_COLORS.japa.gradVaijayantiInactiveStop26} stopOpacity="0.9" />
        <Stop offset="60%" stopColor={FEATURE_COLORS.japa.hessoniteLight} stopOpacity="0.9" />
        <Stop offset="85%" stopColor={COLORS.metallicGold} stopOpacity="0.95" />
        <Stop offset="100%" stopColor={FEATURE_COLORS.japa.hessoniteDark} stopOpacity="0.8" />
      </RadialGradient>
      <RadialGradient id="grad-vaijayanti-done" cx="30%" cy="26%" r="70%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="1" />
        <Stop offset="24%" stopColor={FEATURE_COLORS.japa.gradVaijayantiInactiveStop26} stopOpacity="1" />
        <Stop offset="58%" stopColor={FEATURE_COLORS.japa.hessoniteLight} stopOpacity="1" />
        <Stop offset="84%" stopColor={COLORS.metallicGold} stopOpacity="1" />
        <Stop offset="100%" stopColor={FEATURE_COLORS.japa.gradVaijayantiDoneStop100} stopOpacity="1" />
      </RadialGradient>
      <RadialGradient id="grad-vaijayanti-active" cx="30%" cy="26%" r="70%">
        <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="1" />
        <Stop offset="22%" stopColor={FEATURE_COLORS.japa.topazLight} stopOpacity="1" />
        <Stop offset="55%" stopColor={COLORS.warningDark} stopOpacity="1" />
        <Stop offset="85%" stopColor={FEATURE_COLORS.japa.topazDark} stopOpacity="1" />
        <Stop offset="100%" stopColor={FEATURE_COLORS.japa.hessoniteDark} stopOpacity="1" />
      </RadialGradient>

      {/* 3D Tactile Navaratna 9-Gem Gradients */}
      {NAVARATNA_GEMS.map((gem, idx) => (
        <RadialGradient key={`grad-gem-${idx}`} id={`grad-gem-${idx}`} cx="28%" cy="24%" r="72%">
          <Stop offset="0%" stopColor={COLORS.onMediaWhite} stopOpacity="0.95" />
          <Stop offset="24%" stopColor={gem.light} stopOpacity="1" />
          <Stop offset="60%" stopColor={gem.color} stopOpacity="1" />
          <Stop offset="85%" stopColor={gem.dark} stopOpacity="1" />
          <Stop offset="100%" stopColor={OVERLAYS.black[0.6]} stopOpacity="0.75" />
        </RadialGradient>
      ))}
    </Defs>
  );

  return (
    <Animated.View
      style={{
        width: PRACTICE_SVG_WIDTH * ringScale,
        height: PRACTICE_BOX_HEIGHT * ringScale,
        alignItems: 'center',
        // The tap only pulses the size; it no longer rotates the ring, which
        // read as the mala tilting on every bead.
        transform: [{ translateY: offsetY }, { scale: tapScale }],
      }}
    >
      {/* Malas without a top crown hang the guru pendant from the bottom bead. It is drawn
          before the beads so its hook comes out from behind the guru bead, not on top of it. */}
      {!malaSkin.hasMeruCrown ? (
        <Animated.View
          testID="japa-pendant"
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: PRACTICE_PENDANT.top * ringScale,
            left: (PRACTICE_CENTER_X - PRACTICE_PENDANT.width / 2) * ringScale,
            width: PRACTICE_PENDANT.width * ringScale,
            height: PRACTICE_PENDANT.height * ringScale,
            // Rotate about the top edge, where it hangs from the guru bead.
            transform: [{ translateY: -(PRACTICE_PENDANT.height * ringScale) / 2 }, { rotate: swayRotate }, { translateY: (PRACTICE_PENDANT.height * ringScale) / 2 }],
          }}
        >
          <Image source={require('../../assets/japa/guru-pendant.png')} contentFit="contain" style={{ width: '100%', height: '100%' }} />
        </Animated.View>
      ) : null}
      <Svg width={PRACTICE_SVG_WIDTH * ringScale} height={PRACTICE_SVG_HEIGHT * ringScale} viewBox={`0 0 ${PRACTICE_SVG_WIDTH} ${PRACTICE_SVG_HEIGHT}`} style={{ position: 'absolute', top: 0 }}>
        {beadGradientDefs}
        {malaSkin.hasMeruCrown ? (
          <G>
            {/* Sacred Golden Knot / Tassel Connector at bottom */}
            <Circle
              cx={PRACTICE_CENTER_X}
              cy={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 12}
              r={7.5}
              fill="url(#grad-meru-gold)"
              stroke={COLORS.radiantGold}
              strokeWidth={1.2}
            />
            <Circle
              cx={PRACTICE_CENTER_X}
              cy={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 22}
              r={4.5}
              fill={COLORS.metallicGold}
            />
            {/* Sacred silk tassel strands */}
            <Line
              x1={PRACTICE_CENTER_X}
              y1={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 26}
              x2={PRACTICE_CENTER_X}
              y2={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 74}
              stroke={malaSkin.threadColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Line
              x1={PRACTICE_CENTER_X - 5}
              y1={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 28}
              x2={PRACTICE_CENTER_X - 10}
              y2={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 68}
              stroke={malaSkin.threadColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Line
              x1={PRACTICE_CENTER_X + 5}
              y1={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 28}
              x2={PRACTICE_CENTER_X + 10}
              y2={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 68}
              stroke={malaSkin.threadColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </G>
        ) : (
          <>
            <Circle
              cx={PRACTICE_CENTER_X}
              cy={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 16}
              r={6.2}
              fill={malaSkin.threadColor}
            />
            <Circle
              cx={PRACTICE_CENTER_X}
              cy={PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 24}
              r={4.2}
              fill={brandColor}
            />
          </>
        )}
        {/* Sacred continuous thread looping underneath the beads */}
        <Ellipse
          cx={PRACTICE_CENTER_X}
          cy={PRACTICE_CENTER_Y}
          rx={PRACTICE_RADIUS_X}
          ry={PRACTICE_RADIUS_Y}
          fill="none"
          stroke={malaSkin.threadColor}
          strokeWidth={2}
          opacity={0.65}
        />
        {buildBeadElements()}
        {!malaSkin.hasMeruCrown ? (
          <>
            {/* Where the hook comes out of the guru bead: a soft contact shadow on the hook and a small drilled hole in the bead's lower edge */}
            <Ellipse cx={PRACTICE_CENTER_X} cy={guruBeadBottom + 1.5} rx={9} ry={3.4} fill={JAPA_COLORS.japaBeadRing.meruOuterGlow} />
            <Ellipse cx={PRACTICE_CENTER_X} cy={guruBeadBottom - 2.4} rx={4.8} ry={1.7} fill={JAPA_COLORS.japaBeadRing.meruInnerGlow} />
          </>
        ) : null}
        {/* Radiant Golden Filigree Meru Crown Bead at Top Apex */}
        {malaSkin.hasMeruCrown ? (
          <MeruCrownApex
            cx={PRACTICE_CENTER_X}
            cy={PRACTICE_CENTER_Y - PRACTICE_RADIUS_Y}
            glowColor={malaSkin.glowColor}
            threadColor={malaSkin.threadColor}
          />
        ) : null}
        {count < 108 ? (
          <AnimatedCircle
            cx={currentBeadPos.x}
            cy={currentBeadPos.y}
            r={pulseRadius}
            fill="none"
            stroke={brandColor}
            strokeWidth={1.5}
            opacity={pulseOpacity}
          />
        ) : null}
        {bloomIndex !== null ? (
          <AnimatedCircle
            cx={bloomBeadPos.x}
            cy={bloomBeadPos.y}
            r={bloomRadius}
            fill="none"
            stroke={brandColor}
            strokeWidth={2}
            opacity={bloomOpacity}
          />
        ) : null}
      </Svg>
    </Animated.View>
  );
}
