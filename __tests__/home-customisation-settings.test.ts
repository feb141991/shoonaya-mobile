import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  getHeroPick,
  setHeroPick,
  getHeroSize,
  setHeroSize,
  HERO_SIZE_CONFIG,
  BUNDLED_HERO_THEMES,
  type HeroPick,
  type HeroSize,
} from '@/lib/heroPreference';
import { getGreetingPick, setGreetingPick } from '@/lib/greetingPreference';
import { getGreetingPool, GREETING_POOLS } from '@/lib/greetings';
import { MIN_TOUCH_TARGET } from '@/lib/constants';

const homeSource = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
const settingsSource = readFileSync(new URL('../app/settings/detail-screen.tsx', import.meta.url), 'utf8');

describe('Home Customisation Settings — Canonical Stores & Parity', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('1. reuses canonical hero preference store without duplicate storage keys', async () => {
    assert.equal(await getHeroPick(), null);

    const testPick: HeroPick = {
      id: 'shiva-golden-silhouette',
      imageUrl: '/assets/images/heroes/hindu/shiva-golden-silhouette.webp',
      objectPosition: '50% 25%',
    };

    await setHeroPick(testPick);
    const saved = await getHeroPick();
    assert.deepEqual(saved, testPick);

    // Resetting pick restores null
    await setHeroPick(null);
    assert.equal(await getHeroPick(), null);
  });

  it('2. reuses canonical hero size configuration across standard, expanded, and immersive', async () => {
    assert.equal(await getHeroSize(), 'standard');

    const sizes: HeroSize[] = ['standard', 'expanded', 'immersive'];
    for (const size of sizes) {
      await setHeroSize(size);
      assert.equal(await getHeroSize(), size);
      assert.ok(HERO_SIZE_CONFIG[size].height >= 420);
      assert.ok(HERO_SIZE_CONFIG[size].label.length > 0);
    }
  });

  it('3. reuses canonical greeting preference store without duplicate keys', async () => {
    assert.equal(await getGreetingPick(), null);

    await setGreetingPick('Radhe Radhe');
    assert.equal(await getGreetingPick(), 'Radhe Radhe');

    await setGreetingPick(null);
    assert.equal(await getGreetingPick(), null);
  });

  it('4. ensures greeting pools and bundled hero themes remain canonical single sources of truth', () => {
    assert.ok(BUNDLED_HERO_THEMES.length >= 20);
    assert.ok(BUNDLED_HERO_THEMES.some((t) => t.id === 'shiva-golden-silhouette'));

    const hinduPool = getGreetingPool('hindu');
    assert.ok(hinduPool.includes('Radhe Radhe'));
    assert.ok(hinduPool.includes('Om Namah Shivaya'));

    const sikhPool = getGreetingPool('sikh');
    assert.ok(sikhPool.includes('Sat Sri Akal'));
    assert.ok(sikhPool.includes('Waheguru Ji Ka Khalsa'));

    const jainPool = getGreetingPool('jain');
    assert.ok(jainPool.includes('Jai Jinendra'));

    const buddhistPool = getGreetingPool('buddhist');
    assert.ok(buddhistPool.includes('Namo Buddhaya'));
  });

  it('5. enforces minimum 44px touch target accessibility constant', () => {
    assert.equal(MIN_TOUCH_TARGET, 44);
  });

  it('6. keeps the Home cue non-racy and all discovery controls touch-safe', () => {
    assert.match(homeSource, /aiAuthGateVisible/);
    assert.match(homeSource, /minHeight: MIN_TOUCH_TARGET/);
    assert.match(homeSource, /width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET/);
    assert.doesNotMatch(homeSource, /getHomeDiscoveryState\(appIdentity\)\.then\(setDiscoveryState\)/);
  });

  it('7. keeps Home customisation tradition-neutral in Settings', () => {
    assert.match(settingsSource, />Home Greeting</);
    assert.doesNotMatch(settingsSource, />Devotee Greeting</);
  });
});
