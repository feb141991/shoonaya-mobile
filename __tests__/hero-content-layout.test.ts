import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveHeroContentLayout } from '../lib/heroContentLayout';

describe('backdrop content avoids artwork and narrow columns', () => {
  it('falls back below only on the narrowest phones, where a side column has no real room', () => {
    for (const width of [280, 320]) {
      assert.equal(resolveHeroContentLayout('auto', 'krishna-yamuna-sunrise', width, 1).position, 'below');
    }
  });
  it('uses the reviewed left side on mainstream phone widths, not just tablets', () => {
    for (const width of [375, 390, 414, 430, 820]) {
      const layout = resolveHeroContentLayout('auto', 'krishna-yamuna-sunrise', width, 1);
      assert.equal(layout.position, 'left');
      assert.ok(layout.columnWidth >= 150, `columnWidth ${layout.columnWidth} at width ${width} is narrower than the floor`);
      assert.ok(layout.columnWidth < width / 2);
    }
  });
  it('defaults to left overlay for all artworks on wide screens', () => {
    for (const id of [undefined, 'admin-new-artwork', 'shiva-cosmic-dhyana']) {
      assert.equal(resolveHeroContentLayout('auto', id, 1024, 1).position, 'left');
    }
  });
  it('honors manual sides on ordinary phone widths, not just tablets', () => {
    for (const preference of ['left', 'right'] as const) {
      assert.equal(resolveHeroContentLayout(preference, undefined, 1024, 1).position, preference);
      assert.equal(resolveHeroContentLayout(preference, undefined, 390, 1).position, preference);
    }
  });
  it('falls back below when there truly is no room, or text scaling makes a column unreadable', () => {
    for (const preference of ['left', 'right'] as const) {
      assert.equal(resolveHeroContentLayout(preference, undefined, 300, 1).position, 'below');
      assert.equal(resolveHeroContentLayout(preference, undefined, 1024, 2).position, 'below');
    }
    assert.equal(resolveHeroContentLayout('below', undefined, 1024, 1).position, 'below');
  });
});
