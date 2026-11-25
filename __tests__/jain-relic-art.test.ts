import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const RELICS = path.join(__dirname, '..', 'assets', 'relics');
const sha1 = (file: string) => createHash('sha1').update(readFileSync(path.join(RELICS, file))).digest('hex');

// The stock emoji that stood in for Jain objects until 2026-11-26.
const WRONG_PICTURES: Record<string, string> = {
  a9dd1ef538cb5ceb24f46e7d64689306da927f18: 'a peace sign',
  b6ac17b6a05683041786de3a0309790cc3e17f59: 'a six-pointed star',
  '1f5c8f54d863b22239f55ef09bf452154ff32660': 'an atom',
  bdf76186f1c885fff91e368ccb1d0de6020e8e8b: 'a Greek vase',
  '8e5c3f0149984cec861000bfa87281d89da47ee8': 'a peacock',
  d7351607311d6eba10a85536bfa03a84e813feeb: 'a cratered moon',
  '864e4787afb0b58cefb4dfebdcf742cda307236f': 'a diamond',
};
const JAIN_RELICS = [
  'ahimsa-hand.png', 'jain-kalasha.png', 'jain-swastika.png', 'peacock-brush.png',
  'siddhachakra-wheel.png', 'siddhashila-moon.png', 'three-jewels.png',
];
// Outside the Jain set and not part of this fix: the vase as two kalashas and the peacock as its own feather. A gem is
// what the diamond shows, so chintamani-gem is right. This list may only shrink.
const KNOWN_OUTSIDE_JAIN_SET = ['chintamani-gem.png', 'clay-kalash.png', 'ganga-kalash.png', 'peacock-feather.png'];

describe('Jain relic artwork', () => {
  for (const file of JAIN_RELICS) {
    it(`${file} is not a renamed emoji`, () => {
      assert.equal(WRONG_PICTURES[sha1(file)], undefined);
    });
  }

  it('no relic shows one of the wrong pictures under another name', () => {
    const found = readdirSync(RELICS).filter((file) => file.endsWith('.png') && WRONG_PICTURES[sha1(file)]);
    assert.deepEqual(found.sort(), KNOWN_OUTSIDE_JAIN_SET);
  });
});
