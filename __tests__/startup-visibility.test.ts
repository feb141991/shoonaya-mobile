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

test('markInteractive fires on real interactivity, not bare readyToRender (F01 regression)', () => {
  const root = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

  // The old, buggy gate: markInteractive() called as soon as readyToRender
  // becomes true, while the startup overlay could still be crossfading out.
  assert.doesNotMatch(root, /if \(readyToRender\)\s*\{\s*markInteractive\(\)/);

  // The fix: gated on resolveStartupSurface(...) === 'app' (the one state
  // where the overlay is gone AND the app is ready), computed once and
  // reused so the effect and its dependency array can't drift apart.
  assert.match(root, /const isAppInteractive = resolveStartupSurface\(\{ readyToRender, showStartupScene \}\) === 'app';/);
  assert.match(root, /if \(isAppInteractive\)\s*\{\s*[\s\S]*?markInteractive\(/);

  // Emergency-fallback classification: the 6-second escape hatch must tag
  // the ref before forcing readiness, and markInteractive must read it, so
  // forced readiness is never indistinguishable from normal readiness in
  // Observe metrics or the local startup receipt.
  assert.match(root, /emergencyFallbackUsedRef\.current = true;\s*\n\s*setAuthReady\(true\);/);
  assert.match(root, /markInteractive\(\{ params: \{ viaEmergencyFallback: emergencyFallbackUsedRef\.current \} \}\)/);
});
