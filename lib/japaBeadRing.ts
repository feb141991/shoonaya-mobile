// Bead sizes on the practice ring (units at scale 1, about one point on a
// 440-point-wide phone). The 108 beads sit about 12.5 apart and an ordinary bead
// is about 14 across, so neighbours overlap by about a tenth, like a tightly
// strung mala. Past about 16 across the strand turns into a rope of stacked
// discs, and a full ring of 108 beads cannot have beads this size without
// overlapping (24 across with no overlap needs an 825-point loop). The current
// bead and the sumeru are deliberately larger. (Earlier on 2026-11-12: 4.2, then
// 5.55 with a thin gap, and 6.8 on a smaller ring, which read as a solid band.)
export const BEAD_RADIUS = {
  upcoming: 6.92,
  done: 6.92,
  current: 13.5,
  sumeru: 17,
} as const;

// The guru pendant swings from its top like a pendulum when a bead is counted:
// kicked to alternating sides by successive beads, then settling on a light
// underdamped spring (about two visible swings in a second and a half). It is
// a one-shot motion, never a loop, and is skipped when Reduce Motion is on.
export const PENDANT_SWAY = {
  maxDegrees: 5,
  spring: { stiffness: 70, damping: 4, mass: 1 },
} as const;

export type BeadPosition = { x: number; y: number };

// Positions for `count` beads spaced at equal distances along an ellipse,
// starting at the top and running clockwise. Spacing beads at equal angles
// instead bunches them where the ellipse is more sharply curved (its narrow
// sides), so the overlap between neighbours would differ around the ring.
// With an even count, bead count/2 sits exactly at the bottom.
export function evenlySpacedEllipsePositions(
  count: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  samples = 4096,
): BeadPosition[] {
  if (count <= 0) return [];
  const pointAt = (t: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * t) / samples;
    return { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY };
  };

  // Cumulative arc length at each sample point around the ellipse.
  const cumulative = new Float64Array(samples + 1);
  let previous = pointAt(0);
  for (let i = 1; i <= samples; i += 1) {
    const point = pointAt(i);
    cumulative[i] = cumulative[i - 1] + Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  const perimeter = cumulative[samples];

  const positions: BeadPosition[] = [];
  let sample = 0;
  for (let bead = 0; bead < count; bead += 1) {
    const target = (perimeter * bead) / count;
    while (sample < samples && cumulative[sample + 1] < target) sample += 1;
    const span = cumulative[sample + 1] - cumulative[sample];
    const fraction = span > 0 ? (target - cumulative[sample]) / span : 0;
    positions.push(pointAt(sample + fraction));
  }
  return positions;
}

export type RingFitInput = {
  screenWidth: number;
  screenHeight: number;
  // Screen y the drawing may start below (under the top buttons) and must
  // end above (over the bottom controls).
  availableTop: number;
  availableBottom: number;
  sideGutter: number;
  // The drawing, in its own units: a box of boxHeight, centred on the screen
  // before any shift. The visible content spans halfWidth either side of the
  // centre and runs from contentTop to contentBottom inside the box.
  boxHeight: number;
  halfWidth: number;
  contentTop: number;
  contentBottom: number;
  // Where the ring's centre (the counter) sits inside the box.
  ringCenterY: number;
  minScale?: number;
  maxScale?: number;
};

export type RingLayout = {
  // On-screen size of the drawing relative to its own units.
  scale: number;
  // Move the box down by this many points to centre the content in the free band.
  offsetY: number;
  // Distance of the ring's centre below the screen's centre, after the move;
  // the counter and the tap glow are shifted by this so they sit in the ring.
  ringCenterOffset: number;
};

// The largest scale at which the drawing fits the free space (so a large phone
// gets a larger ring and a small phone is never overflowed), and the shift that
// centres it between the top buttons and the bottom controls.
export function fitRingLayout(input: RingFitInput): RingLayout {
  const centerY = input.screenHeight / 2;
  const byWidth = (input.screenWidth / 2 - input.sideGutter) / input.halfWidth;
  const byHeight = (input.availableBottom - input.availableTop) / (input.contentBottom - input.contentTop);
  const fitted = Math.min(byWidth, byHeight);
  const min = input.minScale ?? 0.5;
  const max = input.maxScale ?? 1.4;
  const scale = Number.isFinite(fitted) ? Math.min(max, Math.max(min, fitted)) : 1;
  const contentMiddle = (input.contentTop + input.contentBottom) / 2;
  const contentCentreOnScreen = centerY + scale * (contentMiddle - input.boxHeight / 2);
  const offsetY = (input.availableTop + input.availableBottom) / 2 - contentCentreOnScreen;
  return { scale, offsetY, ringCenterOffset: offsetY + scale * (input.ringCenterY - input.boxHeight / 2) };
}

// Practice drawing geometry, in units that are about points on a 440-wide phone.
export const PRACTICE_RADIUS_X = 196;
// Close to round (196 by 232, ratio 0.84). A taller oval (250) allowed bigger beads
// but read as a stretched loop with a small charm, not a mala.
export const PRACTICE_RADIUS_Y = 232;
const PRACTICE_SIDE_MARGIN = 24;
const PRACTICE_TOP_MARGIN = 36; // room for the Meru crown's rays above the ring
export const PRACTICE_SVG_WIDTH = 2 * (PRACTICE_RADIUS_X + PRACTICE_SIDE_MARGIN);
export const PRACTICE_CENTER_X = PRACTICE_SVG_WIDTH / 2;
export const PRACTICE_CENTER_Y = PRACTICE_TOP_MARGIN + PRACTICE_RADIUS_Y;
// Tall enough for the knot and tassel drawn under the ring of crown-style malas.
export const PRACTICE_SVG_HEIGHT = PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 80;
// The guru pendant picture hangs from the guru bead (artwork aspect 92:198).
// The pendant's hook starts HOOK_TUCK units inside the guru bead and is drawn behind
// it, so it comes out of the bead instead of sitting on its edge.
export const HOOK_TUCK = 8;
export const PRACTICE_PENDANT = { top: PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + BEAD_RADIUS.sumeru - HOOK_TUCK, width: 99, height: 216 } as const;
export const PRACTICE_BOX_HEIGHT = PRACTICE_PENDANT.top + PRACTICE_PENDANT.height + 11;
// Equal distances along the ring, so neighbouring beads sit the same gap apart
// all the way round (equal angles crowded them on the narrow sides).
export const PRACTICE_BEAD_POSITIONS = evenlySpacedEllipsePositions(108, PRACTICE_CENTER_X, PRACTICE_CENTER_Y, PRACTICE_RADIUS_X, PRACTICE_RADIUS_Y);

// Space the practice screen leaves for the ring: below the close and settings
// buttons (40 high, at max(16, top inset + 8)) and above the Sound pill (at
// max(26, bottom inset + 16), minTouchTarget high), with 8 points to spare.
export function fitPracticeRing(input: { width: number; height: number; insetTop: number; insetBottom: number; minTouchTarget: number }): RingLayout {
  const buttonsBottom = Math.max(16, input.insetTop + 8) + 40;
  const pillTop = input.height - (Math.max(26, input.insetBottom + 16) + input.minTouchTarget);
  return fitRingLayout({
    screenWidth: input.width,
    screenHeight: input.height,
    availableTop: buttonsBottom + 8,
    availableBottom: pillTop - 8,
    sideGutter: 8,
    boxHeight: PRACTICE_BOX_HEIGHT,
    halfWidth: PRACTICE_RADIUS_X + BEAD_RADIUS.current,
    contentTop: PRACTICE_CENTER_Y - PRACTICE_RADIUS_Y - 20,
    contentBottom: PRACTICE_PENDANT.top + PRACTICE_PENDANT.height,
    ringCenterY: PRACTICE_CENTER_Y,
  });
}
