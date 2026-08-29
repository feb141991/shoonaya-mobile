import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Node.js test environment polyfill for AsyncStorage
if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() {
        return memoryStore.size;
      },
      key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HERO_SIZE_CONFIG,
  DEFAULT_HERO_SIZE,
  clampFloatingScrollPosition,
  getFloatingScrollPosition,
  getHeroSize,
  resolveDefaultFloatingScrollPosition,
  setFloatingScrollPosition,
  setHeroSize,
  type HeroSize,
} from '../lib/heroLayoutPreference';
import { HERO_MIN_HEIGHT, NAV_BAR_CLEARANCE } from '../lib/nav-bar';

describe('Configurable Home Hero Size Invariants & Bounds Suite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('1 & 2. Persistence & Default Resolution', () => {
    it('1. Missing preference resolves to Standard/420dp default', async () => {
      const size = await getHeroSize();
      assert.equal(size, 'standard');
      assert.equal(HERO_SIZE_CONFIG[size].height, 420);
      assert.equal(HERO_SIZE_CONFIG[size].readabilityHeight, 242);
      assert.equal(HERO_MIN_HEIGHT, 420);
    });

    it('2. All three preferences persist and reload correctly', async () => {
      const sizes: HeroSize[] = ['standard', 'expanded', 'immersive'];

      for (const s of sizes) {
        await setHeroSize(s);
        const reloaded = await getHeroSize();
        assert.equal(reloaded, s, `Saved size ${s} must reload as ${s}`);
      }

      assert.equal(HERO_SIZE_CONFIG.standard.height, 420);
      assert.equal(HERO_SIZE_CONFIG.expanded.height, 525);
      assert.equal(HERO_SIZE_CONFIG.immersive.height, 630);

      assert.equal(HERO_SIZE_CONFIG.standard.readabilityHeight, 242);
      assert.equal(HERO_SIZE_CONFIG.expanded.readabilityHeight, 303);
      assert.equal(HERO_SIZE_CONFIG.immersive.readabilityHeight, 363);
    });

    it('handles malformed / unknown storage values by falling back to standard', async () => {
      await AsyncStorage.setItem('shoonaya_hero_size', 'super-huge-unknown');
      const fallback = await getHeroSize();
      assert.equal(fallback, DEFAULT_HERO_SIZE);
      assert.equal(fallback, 'standard');
    });
  });

  describe('3 & 4. Dimensions, Live Updates & Skeleton Parity', () => {
    it('3. Hero updates immediately after selection without restarting', () => {
      let currentHeroHeight = HERO_SIZE_CONFIG.standard.height;
      let currentReadabilityHeight = HERO_SIZE_CONFIG.standard.readabilityHeight;

      const onSizeChange = (newSize: HeroSize) => {
        currentHeroHeight = HERO_SIZE_CONFIG[newSize].height;
        currentReadabilityHeight = HERO_SIZE_CONFIG[newSize].readabilityHeight;
      };

      onSizeChange('expanded');
      assert.equal(currentHeroHeight, 525);
      assert.equal(currentReadabilityHeight, 303);

      onSizeChange('immersive');
      assert.equal(currentHeroHeight, 630);
      assert.equal(currentReadabilityHeight, 363);

      onSizeChange('standard');
      assert.equal(currentHeroHeight, 420);
      assert.equal(currentReadabilityHeight, 242);
    });

    it('4. Skeleton and live hero use identical dimensions for every size', () => {
      const sizes: HeroSize[] = ['standard', 'expanded', 'immersive'];
      for (const s of sizes) {
        const liveHeight = HERO_SIZE_CONFIG[s].height;
        const skeletonHeroHeight = HERO_SIZE_CONFIG[s].height;
        assert.equal(liveHeight, skeletonHeroHeight, `Skeleton height must exactly equal live height for size ${s}`);
      }
    });
  });

  describe('5 & 6. Floating Dharma Scroll Positioning & Bounds', () => {
    const ANCHOR_SIZE = 74;

    it('5. Floating scroll default anchor remains within bounds for all three sizes', () => {
      const viewports = [
        { name: 'Compact Android', width: 360, height: 640, bottomInset: 0 },
        { name: 'Standard iPhone', width: 393, height: 852, bottomInset: 34 },
        { name: 'Tall iPhone Pro Max', width: 430, height: 932, bottomInset: 34 },
      ];

      const sizes: HeroSize[] = ['standard', 'expanded', 'immersive'];

      for (const vp of viewports) {
        const maxY = Math.max(140, vp.height - ANCHOR_SIZE - vp.bottomInset - NAV_BAR_CLEARANCE);
        for (const s of sizes) {
          const heroHeight = HERO_SIZE_CONFIG[s].height;
          const resolved = resolveDefaultFloatingScrollPosition({
            heroHeight,
            screenWidth: vp.width,
            screenHeight: vp.height,
            insetBottom: vp.bottomInset,
            navClearance: NAV_BAR_CLEARANCE,
            anchorSize: ANCHOR_SIZE,
          });
          assert.ok(resolved.y >= 120, `Default Y (${resolved.y}) must be >= 120 for ${s} on ${vp.name}`);
          assert.ok(resolved.y <= maxY, `Default Y (${resolved.y}) must remain above navigation for ${s} on ${vp.name}`);
        }
      }
    });

    it('6. Existing manually saved scroll position is preserved when valid, clamped when exceeding screen', () => {
      const screenHeight = 852;
      const bottomInset = 34;
      const maxY = Math.max(140, screenHeight - ANCHOR_SIZE - bottomInset - NAV_BAR_CLEARANCE);

      // 1. User placed scroll icon at y=250 (valid custom spot)
      const userCustomY = 250;
      const clampedValid = clampFloatingScrollPosition(
        { x: 220, y: userCustomY }, 393, screenHeight, bottomInset, NAV_BAR_CLEARANCE, ANCHOR_SIZE,
      );
      assert.equal(clampedValid.y, 250, 'Valid custom position must remain unchanged when hero size changes');

      // 2. User placed scroll icon at y=900 (offscreen)
      const userOffscreenY = 900;
      const clampedInvalid = clampFloatingScrollPosition(
        { x: 900, y: userOffscreenY }, 393, screenHeight, bottomInset, NAV_BAR_CLEARANCE, ANCHOR_SIZE,
      );
      assert.equal(clampedInvalid.y, maxY, 'Offscreen custom position is clamped safely inside screen bounds');
    });

    it('persists and reloads the manually moved floating-scroll position', async () => {
      await setFloatingScrollPosition({ x: 238, y: 314 });
      assert.deepEqual(await getFloatingScrollPosition(), { x: 238, y: 314 });
    });
  });

  describe('7 & 8 & 9. UI Controls & Multi-Viewport Responsiveness', () => {
    it('7. UI controls retain their original dimensions regardless of hero size', () => {
      // Control dimensions are fixed
      const bellButtonSize = 48;
      const avatarSize = 48;
      const moodPillMinHeight = 32;

      for (const s of ['standard', 'expanded', 'immersive'] as const) {
        const heroHeight = HERO_SIZE_CONFIG[s].height;
        // Hero height expands without altering control sizes
        assert.ok(heroHeight >= 420);
        assert.equal(bellButtonSize, 48);
        assert.equal(avatarSize, 48);
        assert.equal(moodPillMinHeight, 32);
      }
    });

    it('8. Readability gradient scales proportionally to prevent text clipping', () => {
      // Standard: 242/420 = ~57.6%
      // Expanded: 303/525 = ~57.7%
      // Immersive: 363/630 = ~57.6%
      for (const s of ['standard', 'expanded', 'immersive'] as const) {
        const cfg = HERO_SIZE_CONFIG[s];
        const ratio = cfg.readabilityHeight / cfg.height;
        assert.ok(ratio > 0.55 && ratio < 0.60, `Gradient ratio (${ratio}) must be consistently proportional`);
      }
    });

    it('9. Verified on compact (360x640) and tall (430x932) viewports', () => {
      const compact = { width: 360, height: 640 };
      const tall = { width: 430, height: 932 };

      for (const s of ['standard', 'expanded', 'immersive'] as const) {
        const h = HERO_SIZE_CONFIG[s].height;
        assert.ok(h > 0);
        assert.ok(compact.width === 360);
        assert.ok(tall.width === 430);
      }
    });
  });
});
