import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  BEAD_RADIUS,
  HOOK_TUCK,
  PENDANT_SWAY,
  PRACTICE_BEAD_POSITIONS,
  PRACTICE_BOX_HEIGHT,
  PRACTICE_CENTER_X,
  PRACTICE_CENTER_Y,
  PRACTICE_PENDANT,
  PRACTICE_RADIUS_X,
  PRACTICE_RADIUS_Y,
  PRACTICE_SVG_HEIGHT,
  PRACTICE_SVG_WIDTH,
  evenlySpacedEllipsePositions,
  fitPracticeRing,
} from '../lib/japaBeadRing';

const MIN_TOUCH = 44;

// The real practice ring, not a copy of its numbers.
const ring = PRACTICE_BEAD_POSITIONS;
const gaps = ring.map((point, i) => {
  const next = ring[(i + 1) % ring.length];
  return Math.hypot(next.x - point.x, next.y - point.y);
});

test('bead ring places 108 beads, the first at the top and bead 54 at the bottom', () => {
  assert.equal(ring.length, 108);
  assert.ok(Math.abs(ring[0].x - PRACTICE_CENTER_X) < 1e-6 && Math.abs(ring[0].y - (PRACTICE_CENTER_Y - PRACTICE_RADIUS_Y)) < 1e-6);
  assert.ok(Math.abs(ring[54].x - PRACTICE_CENTER_X) < 0.01 && Math.abs(ring[54].y - (PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y)) < 0.01);
});

test('neighbouring beads are the same distance apart all the way round', () => {
  // Equal-angle spacing on an ellipse this shape would vary by more than 10%.
  const spread = (Math.max(...gaps) - Math.min(...gaps)) / Math.min(...gaps);
  assert.ok(spread < 0.005, `spacing spread ${(spread * 100).toFixed(2)}%`);
});

test('the ring is upright: mirror-symmetric left to right and top to bottom', () => {
  for (let i = 1; i < 54; i += 1) {
    const left = ring[108 - i];
    const right = ring[i];
    assert.ok(Math.abs(left.y - right.y) < 0.05, `bead ${i} and ${108 - i} differ in height by ${Math.abs(left.y - right.y)}`);
    assert.ok(Math.abs((left.x - PRACTICE_CENTER_X) + (right.x - PRACTICE_CENTER_X)) < 0.05, `bead ${i} is not mirrored`);
  }
});

test('the ring runs clockwise from the top', () => {
  assert.ok(ring[1].x > ring[0].x, 'second bead is to the right of the first');
  assert.ok(ring[27].x > PRACTICE_CENTER_X && Math.abs(ring[27].y - PRACTICE_CENTER_Y) < 30, 'bead 27 is on the right side');
});

test('no beads for a zero count', () => {
  assert.deepEqual(evenlySpacedEllipsePositions(0, 0, 0, 10, 10), []);
});

test('ordinary beads overlap their neighbours slightly: strung tight, not a rope', () => {
  const closest = Math.min(...gaps);
  const width = Math.max(BEAD_RADIUS.upcoming, BEAD_RADIUS.done) * 2;
  // at least touching...
  assert.ok(width >= closest, `beads ${width.toFixed(1)} wide on a ${closest.toFixed(1)} spacing leave a gap`);
  // ...and overlapping by no more than 15% of a bead, or the strand turns into stacked discs
  assert.ok((width - closest) / width <= 0.15, `overlap ${(((width - closest) / width) * 100).toFixed(0)}% of a bead`);
});

test('beads are drawn from the bottom of the ring up, current bead and sumeru last', () => {
  const source = readFileSync(join(__dirname, '../components/japa/JapaBeadRing.tsx'), 'utf8');
  assert.match(source, /Math\.min\(b, 108 - b\) - Math\.min\(a, 108 - a\)/);
  assert.match(source, /\[\.\.\.ordinary, \.\.\.drawLast\]/);
});

test('the drawing holds the whole ring, the current bead at the sides, and the crown above', () => {
  assert.ok(PRACTICE_CENTER_X - PRACTICE_RADIUS_X - BEAD_RADIUS.current >= 0);
  assert.ok(PRACTICE_CENTER_X + PRACTICE_RADIUS_X + BEAD_RADIUS.current <= PRACTICE_SVG_WIDTH);
  assert.ok(PRACTICE_CENTER_Y - PRACTICE_RADIUS_Y - 32 >= 0, 'Meru crown rays reach 32 above the ring');
  assert.ok(PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y + 74 <= PRACTICE_SVG_HEIGHT, 'the knot and tassel fit');
});

function contentOnScreen(layout: ReturnType<typeof fitPracticeRing>, screenHeight: number) {
  const centre = screenHeight / 2;
  const at = (y: number) => centre + layout.offsetY + layout.scale * (y - PRACTICE_BOX_HEIGHT / 2);
  return { top: at(PRACTICE_CENTER_Y - PRACTICE_RADIUS_Y - 20), bottom: at(PRACTICE_PENDANT.top + PRACTICE_PENDANT.height), ringCentre: at(PRACTICE_CENTER_Y) };
}

test('the ring fills a large phone without reaching the top buttons, the Sound pill or the sides', () => {
  // iPhone 17 Pro Max: 440 x 956 points, safe areas 62 top and 34 bottom.
  const layout = fitPracticeRing({ width: 440, height: 956, insetTop: 62, insetBottom: 34, minTouchTarget: MIN_TOUCH });
  assert.ok(layout.scale > 0.95 && layout.scale < 1.1, `scale ${layout.scale.toFixed(3)}`);
  const { top, bottom } = contentOnScreen(layout, 956);
  assert.ok(top >= 118 - 1e-6, `top ${top.toFixed(1)} clears the buttons (118)`);
  assert.ok(bottom <= 854 + 1e-6, `bottom ${bottom.toFixed(1)} clears the Sound pill (854)`);
  assert.ok((PRACTICE_RADIUS_X + BEAD_RADIUS.current) * layout.scale <= 220 - 8 + 1e-6, 'the current bead stays inside the side gutters');
  // ordinary beads beat the 10.5 points they were earlier on 2026-11-12
  assert.ok(2 * BEAD_RADIUS.upcoming * layout.scale > 10.8, `bead ${(2 * BEAD_RADIUS.upcoming * layout.scale).toFixed(1)} pt`);
  // ...and the ring is close to round and the pendant keeps most of its size, so it still reads as a mala
  assert.ok(PRACTICE_RADIUS_X / PRACTICE_RADIUS_Y > 0.8, 'ring is a stretched oval');
  assert.ok(PRACTICE_PENDANT.height * layout.scale > 200, `pendant ${(PRACTICE_PENDANT.height * layout.scale).toFixed(0)} pt`);
});

test('the counter and tap glow sit in the centre of the ring, not the middle of the screen', () => {
  const layout = fitPracticeRing({ width: 440, height: 956, insetTop: 62, insetBottom: 34, minTouchTarget: MIN_TOUCH });
  const { ringCentre } = contentOnScreen(layout, 956);
  assert.ok(Math.abs(956 / 2 + layout.ringCenterOffset - ringCentre) < 1e-6);
  // The ring is higher than the screen centre (the pendant hangs below it).
  assert.ok(layout.ringCenterOffset < 0, `offset ${layout.ringCenterOffset.toFixed(1)}`);
});

test('a small phone gets a smaller ring rather than an overflowing one', () => {
  // iPhone SE: 375 x 667 points, safe area 20 top, none at the bottom.
  const layout = fitPracticeRing({ width: 375, height: 667, insetTop: 20, insetBottom: 0, minTouchTarget: MIN_TOUCH });
  assert.ok(layout.scale < 0.85 && layout.scale >= 0.5, `scale ${layout.scale.toFixed(3)}`);
  const { top, bottom } = contentOnScreen(layout, 667);
  assert.ok(top >= 76 - 1e-6 && bottom <= 667 - 70 - 8 + 1e-6, `content ${top.toFixed(0)}..${bottom.toFixed(0)}`);
});

// The pendant's swing, from the spring that drives it (a damped oscillator).
const { stiffness, damping, mass } = PENDANT_SWAY.spring;
const naturalFrequency = Math.sqrt(stiffness / mass);
const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
const swingPeriod = (2 * Math.PI) / (naturalFrequency * Math.sqrt(1 - dampingRatio ** 2));

test('the pendant swings like a pendulum: underdamped, a lively period, settled within about two seconds', () => {
  assert.ok(dampingRatio > 0.15 && dampingRatio < 0.35, `damping ratio ${dampingRatio.toFixed(2)} (overdamped would not swing, too low would never stop)`);
  assert.ok(swingPeriod > 0.55 && swingPeriod < 1.0, `period ${swingPeriod.toFixed(2)} s`);
  // Time for the swing to fall under 3% of the kick.
  const settle = Math.log(1 / 0.03) / (dampingRatio * naturalFrequency);
  assert.ok(settle < 2.2, `settles in ${settle.toFixed(2)} s`);
  // Each swing back is a fraction of the last, so it visibly dies away: 5 degrees, then about 2.3, then about 1.
  const back = Math.exp((-Math.PI * dampingRatio) / Math.sqrt(1 - dampingRatio ** 2));
  assert.ok(back > 0.3 && back < 0.6, `each swing is ${(back * 100).toFixed(0)}% of the last`);
});

test('the swing is small enough to look natural: 5 degrees moves the tassel tip about 19 points', () => {
  assert.ok(PENDANT_SWAY.maxDegrees >= 3 && PENDANT_SWAY.maxDegrees <= 7);
  const tip = PRACTICE_PENDANT.height * Math.sin((PENDANT_SWAY.maxDegrees * Math.PI) / 180);
  assert.ok(tip > 10 && tip < 30, `tip moves ${tip.toFixed(1)} units`);
});

test('the sway hangs from the pendant top, runs only on a tap, and respects Reduce Motion', () => {
  const ring = readFileSync(join(__dirname, '../components/japa/JapaBeadRing.tsx'), 'utf8');
  assert.match(ring, /\{ translateY: -\(PRACTICE_PENDANT\.height \* ringScale\) \/ 2 \}, \{ rotate: swayRotate \}, \{ translateY: \(PRACTICE_PENDANT\.height \* ringScale\) \/ 2 \}/);
  const screen = readFileSync(join(__dirname, '../app/(tabs)/japa.tsx'), 'utf8');
  const trigger = screen.slice(screen.indexOf('const triggerTapMotion = useCallback'), screen.indexOf('const triggerRoundCelebration'));
  assert.match(trigger, /if \(reduceMotion\) return;[\s\S]*swayAnim\.setValue\(beadIndex % 2 === 0 \? 1 : -1\)/);
  assert.doesNotMatch(trigger, /Animated\.loop/);
});

test('the pendant hook comes out of the guru bead: tucked inside it and drawn behind it', () => {
  const ringBottom = PRACTICE_CENTER_Y + PRACTICE_RADIUS_Y;
  assert.ok(PRACTICE_PENDANT.top > ringBottom && PRACTICE_PENDANT.top < ringBottom + BEAD_RADIUS.sumeru, 'the hook starts inside the guru bead');
  assert.equal(ringBottom + BEAD_RADIUS.sumeru - PRACTICE_PENDANT.top, HOOK_TUCK);
  assert.ok(HOOK_TUCK >= 4 && HOOK_TUCK <= 12, `tuck ${HOOK_TUCK}`);
  const ring = readFileSync(join(__dirname, '../components/japa/JapaBeadRing.tsx'), 'utf8');
  assert.ok(ring.indexOf("guru-pendant.png") < ring.indexOf('<Svg '), 'the pendant is drawn before (behind) the beads');
  assert.match(ring, /guruBeadBottom - 2\.4/, 'a drilled hole where the hook enters');
});

test('the big gold beads have a soft shine and no bright outline ring or hard white disc', () => {
  const ring = readFileSync(join(__dirname, '../components/japa/JapaBeadRing.tsx'), 'utf8');
  assert.match(ring, /id="grad-shine"/);
  assert.match(ring, /isCurrent \|\| isSumeru \? \([\s\S]*fill="url\(#grad-shine\)"/);
  assert.doesNotMatch(ring, /stroke=\{isCurrent \? brandColor/);
  // ...in the standard bead style (the crystal, seed and gem styles keep their own outlines)
  assert.match(ring, /strokeWidth=\{isCurrent \|\| isSumeru \? 0\.7 : 0\.8\}/);
});
