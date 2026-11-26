import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// lib/solarScene.generated.ts is built from scripts/solar-scene and lib/solarGeometry.ts. If the Sun
// maths or the scene changes without a rebuild, the picture and the words on screen would disagree.
it('ships a Solar Day scene built from the current sources', async () => {
  const { buildSolarSceneSource } = await import('../scripts/solar-scene/build.mjs');
  assert.equal(await buildSolarSceneSource(), readFileSync('lib/solarScene.generated.ts', 'utf8'), 'run npm run build:solar-scene');
});
