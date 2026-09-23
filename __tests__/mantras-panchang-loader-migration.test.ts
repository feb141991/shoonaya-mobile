import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Mantras uses a public-content snapshot while keeping entitlement data identity-scoped and live', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'app/mantras.tsx'), 'utf8');
  assert.match(src, /getBhaktiContentCacheSnapshot\(mantraCacheKey, isMantraList\)/);
  assert.match(src, /readBhaktiContentCache\(mantraCacheKey, isMantraList\)/);
  assert.match(src, /writeBhaktiContentCache\(mantraCacheKey, json\.mantras\)/);
  assert.match(src, /profileContext\?\.userId === currentUserId/);
  assert.match(src, /select\('tradition, is_pro'\)/);
  assert.doesNotMatch(src, /writeBhaktiContentCache\([^\n]*isPro/);
});

test('Panchang reuses only same-spiritual-day snapshots owned by the active identity and purges on auth boundaries', () => {
  const screen = fs.readFileSync(path.join(process.cwd(), 'app/panchang.tsx'), 'utf8');
  const cache = fs.readFileSync(path.join(process.cwd(), 'lib/panchangScreenCache.ts'), 'utf8');
  const layout = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');

  assert.match(screen, /getPanchangScreenSnapshot<UpcomingFestival, Tradition>\(cacheIdentity\)/);
  assert.match(screen, /panchangOwner !== cacheIdentity/);
  assert.match(screen, /writePanchangScreenSnapshot\(`user:\$\{appIdentity\.userId\}`/);
  assert.match(screen, /writePanchangScreenSnapshot\('guest'/);
  assert.match(cache, /snapshot\.spiritualDate !== spiritualDate\(snapshot\.profile\.timezone, now\)/);

  const panchangClearCount = (layout.match(/clearPanchangScreenSnapshots\(\);/g) ?? []).length;
  const japaClearCount = (layout.match(/void clearJapaContextCache\(\);/g) ?? []).length;
  assert.equal(panchangClearCount, japaClearCount, 'Panchang profile cache must clear on every auth boundary');
  assert.ok(panchangClearCount >= 4);
});
