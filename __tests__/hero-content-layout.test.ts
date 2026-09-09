import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveHeroContentLayout } from '../lib/heroContentLayout';

describe('backdrop content avoids artwork and narrow columns', () => {
  it('moves the screenshot artwork details below on portrait phones', () => {
    for (const width of [320, 375, 390, 430]) {
      assert.equal(resolveHeroContentLayout('auto', 'krishna-yamuna-sunrise', width, 1).position, 'below');
    }
  });
  it('uses the reviewed empty right side when both columns fit', () => {
    const layout = resolveHeroContentLayout('auto', 'krishna-yamuna-sunrise', 820, 1);
    assert.equal(layout.position, 'right');
    assert.ok(layout.columnWidth >= 264);
    assert.ok(layout.columnWidth < 820 / 2);
  });
  it('never guesses composition for unknown or centered artworks', () => {
    for (const id of [undefined, 'admin-new-artwork', 'shiva-cosmic-dhyana']) {
      assert.equal(resolveHeroContentLayout('auto', id, 1024, 1).position, 'below');
    }
  });
  it('honors manual sides only when there is room, and explicit below always', () => {
    for (const preference of ['left', 'right'] as const) {
      assert.equal(resolveHeroContentLayout(preference, undefined, 1024, 1).position, preference);
      assert.equal(resolveHeroContentLayout(preference, undefined, 390, 1).position, 'below');
      assert.equal(resolveHeroContentLayout(preference, undefined, 1024, 2).position, 'below');
    }
    assert.equal(resolveHeroContentLayout('below', undefined, 1024, 1).position, 'below');
  });
});
