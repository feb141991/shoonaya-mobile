import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const mood = readFileSync(new URL('../app/mood.tsx', import.meta.url), 'utf8');
const primaryTabs = [
  readFileSync(new URL('../app/(tabs)/profile.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../app/(tabs)/pathshala.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../app/(tabs)/bhakti.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../app/(tabs)/tirtha.tsx', import.meta.url), 'utf8'),
];

describe('Mood navigation clearance', () => {
  it('reports scroll movement so the floating navigation can collapse', () => {
    assert.match(mood, /import \{ navScrollHandler \} from '@\/lib\/navScrollBus';/);
    assert.match(mood, /onScroll=\{navScrollHandler\}/);
    assert.match(mood, /scrollEventThrottle=\{16\}/);
  });

  it('reserves the full floating navigation footprint below featured content', () => {
    assert.match(mood, /import \{ NAV_BAR_CLEARANCE \} from '@\/lib\/nav-bar';/);
    assert.match(mood, /paddingBottom: insets\.bottom \+ NAV_BAR_CLEARANCE/);
  });

  it('keeps every primary destination clear of the floating navigation', () => {
    for (const source of primaryTabs) {
      assert.match(source, /NAV_BAR_CLEARANCE/);
      assert.match(source, /insets\.bottom \+ NAV_BAR_CLEARANCE/);
    }
  });

  it('lets every vertically scrolling primary destination collapse navigation', () => {
    for (const source of [primaryTabs[0], primaryTabs[1], primaryTabs[2], primaryTabs[3], primaryTabs[4]]) {
      assert.match(source, /navScrollHandler/);
      assert.match(source, /onScroll=\{navScrollHandler\}/);
    }
  });
});
