import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Home guest-path calendarStatus fix (reviewed 2026-09-22,
 * docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md's reliability plan).
 *
 * The coordinator-level half of this fix (zero network requests, no
 * 'pending' payload ever applied for guest) is covered directly in
 * __tests__/home-swr-and-sankalpa.test.ts, and the cache-normalization
 * half in __tests__/home-prewarm-and-snapshot.test.ts -- both are plain
 * .ts files this project's tsx --test runner can load and execute.
 *
 * app/(tabs)/index.tsx and components/home/SacredDaysCarousel.tsx import
 * react-native and cannot be loaded the same way, so this file follows
 * the established structural (source-text) pattern already used for these
 * two files elsewhere (see __tests__/mandali-post-card-layout.test.ts and
 * __tests__/authCoordinator-integration.test.ts's parity checks).
 */

const indexScreen = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
const sacredDaysCarousel = readFileSync(new URL('../components/home/SacredDaysCarousel.tsx', import.meta.url), 'utf8');

describe('Home guest calendarStatus: buildGuestPayload (app/(tabs)/index.tsx)', () => {
  it('explicitly sets panchang.calendarStatus to "empty", not inheriting INITIAL_STATE\'s "pending" default', () => {
    const start = indexScreen.indexOf('const buildGuestPayload = useCallback((): HomeSummary => ({');
    assert.ok(start > -1, 'buildGuestPayload not found');
    const end = indexScreen.indexOf('profile: {', start);
    const buildGuestPayloadHeader = indexScreen.slice(start, end);

    assert.match(
      buildGuestPayloadHeader,
      /panchang:\s*\{\s*\.\.\.INITIAL_STATE\.panchang,\s*calendarStatus:\s*'empty',\s*\}/,
      'buildGuestPayload must explicitly override panchang.calendarStatus to "empty"'
    );
  });

  it('the calendarStatus type contract includes "empty" alongside ready/pending/unavailable', () => {
    assert.match(indexScreen, /calendarStatus\?:\s*'ready' \| 'pending' \| 'unavailable' \| 'empty';/);
  });
});

describe('Home guest calendarStatus: PanchangPill hide-vs-shimmer logic (app/(tabs)/index.tsx)', () => {
  it('only "pending" renders the loading shimmer -- "empty" (and "ready"/"unavailable") fall through to hidden', () => {
    const start = indexScreen.indexOf("if (kind === 'observance' && slides.length === 0) {");
    assert.ok(start > -1, 'PanchangPill hide-logic block not found');
    const end = indexScreen.indexOf('const currentSlide =', start);
    const block = indexScreen.slice(start, end);

    // Exactly one status literal gates the shimmer branch.
    const shimmerGates = block.match(/calendarStatus === '(\w+)'/g) ?? [];
    assert.deepEqual(shimmerGates, ["calendarStatus === 'pending'"]);
    assert.match(block, /return null;/, 'every non-pending status must fall through to hidden, not a permanent skeleton');
  });
});

describe('Home guest calendarStatus: SacredDaysCarousel empty-state rendering', () => {
  it('accepts "empty" in its calendarStatus prop type', () => {
    assert.match(sacredDaysCarousel, /calendarStatus:\s*'ready' \| 'pending' \| 'unavailable' \| 'empty';/);
  });

  it('the "empty" branch renders guest sign-in copy and a sign-in CTA, not the ShimmerBlock skeleton', () => {
    const start = sacredDaysCarousel.indexOf("calendarStatus === 'empty' && !hasItems ? (");
    assert.ok(start > -1, '"empty" branch not found');
    const end = sacredDaysCarousel.indexOf(') : !hasItems ? (', start);
    const block = sacredDaysCarousel.slice(start, end);

    assert.doesNotMatch(block, /ShimmerBlock/, 'the "empty" branch must never render the loading shimmer');
    assert.match(block, /copy\.guestEmpty/, 'must render the guest-specific explanatory copy');
    assert.match(block, /onSignInPress/, 'must offer a sign-in CTA wired to onSignInPress');
  });

  it('every language in COPY defines guestEmpty and signIn strings', () => {
    for (const lang of ['en', 'hi', 'pa']) {
      const langBlockStart = sacredDaysCarousel.indexOf(`${lang}: {`);
      assert.ok(langBlockStart > -1, `${lang} COPY block not found`);
      const langBlockEnd = sacredDaysCarousel.indexOf('\n  },', langBlockStart);
      const block = sacredDaysCarousel.slice(langBlockStart, langBlockEnd);
      assert.match(block, /guestEmpty:/, `${lang} is missing guestEmpty copy`);
      assert.match(block, /signIn:/, `${lang} is missing signIn copy`);
    }
  });

  it('onSignInPress is an optional prop, present only for the guest/"empty" state', () => {
    assert.match(sacredDaysCarousel, /onSignInPress\?:\s*\(\)\s*=>\s*void;/);
  });
});

describe('Home guest calendarStatus: index.tsx wires SacredDaysCarousel to a dedicated sign-in gate', () => {
  it('passes onSignInPress to SacredDaysCarousel and renders a matching AuthGate', () => {
    const carouselStart = indexScreen.indexOf('<SacredDaysCarousel');
    const carouselEnd = indexScreen.indexOf('/>', carouselStart);
    const carouselBlock = indexScreen.slice(carouselStart, carouselEnd);
    assert.match(carouselBlock, /onSignInPress=\{\(\) => setSacredDaysAuthGateVisible\(true\)\}/);

    assert.match(indexScreen, /const \[sacredDaysAuthGateVisible, setSacredDaysAuthGateVisible\] = useState\(false\);/);
    assert.match(indexScreen, /visible=\{sacredDaysAuthGateVisible\}/);
    // The new gate must participate in the same "something is blocking the
    // home surface" computation the existing mood/AI gates already do,
    // so discovery-tour and hero-cue eligibility correctly treat it as a
    // blocking overlay too.
    const blockingSurfaceStart = indexScreen.indexOf('const hasBlockingHomeSurface =');
    const blockingSurfaceEnd = indexScreen.indexOf(';', blockingSurfaceStart);
    assert.match(indexScreen.slice(blockingSurfaceStart, blockingSurfaceEnd), /sacredDaysAuthGateVisible/);
  });
});
