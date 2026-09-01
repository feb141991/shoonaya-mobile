import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

import { resolveStartupSurface } from '../lib/startup-visibility';

test('startup always resolves to a visible surface', () => {
  assert.equal(resolveStartupSurface({ readyToRender: false, showStartupScene: true }), 'scene');
  assert.equal(resolveStartupSurface({ readyToRender: true, showStartupScene: true }), 'scene');
  assert.equal(resolveStartupSurface({ readyToRender: true, showStartupScene: false }), 'app');
  assert.equal(resolveStartupSurface({ readyToRender: false, showStartupScene: false }), 'fallback');
});

test('root startup cannot regress to a null or initially transparent surface', () => {
  const root = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
  const motion = fs.readFileSync(path.join(process.cwd(), 'components/ui/Motion.tsx'), 'utf8');

  assert.match(root, /useState\(true\).*showStartupScene|showStartupScene, setShowStartupScene\] = useState\(true\)/s);
  assert.doesNotMatch(root, /if \(!readyToRender && !showStartupScene\)\s*\{\s*return null;/);
  assert.match(root, /startup-opaque-fallback/);
  assert.match(motion, /enabled=\{hasMounted\.current\}/);
});
