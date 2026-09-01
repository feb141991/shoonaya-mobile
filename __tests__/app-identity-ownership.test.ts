import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getAppIdentity, setAppIdentity } from '../lib/appIdentity';

test('app identity publishes explicit auth states', () => {
  setAppIdentity({ kind: 'guest' });
  assert.deepEqual(getAppIdentity(), { kind: 'guest' });

  setAppIdentity({ kind: 'authenticated', userId: 'user-a' });
  assert.deepEqual(getAppIdentity(), { kind: 'authenticated', userId: 'user-a' });

  setAppIdentity({ kind: 'unauthenticated' });
  assert.deepEqual(getAppIdentity(), { kind: 'unauthenticated' });
});

test('Root is the only Supabase auth-event owner and guards stale routing work', () => {
  const root = fs.readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
  const home = fs.readFileSync(path.join(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

  assert.match(root, /supabase\.auth\.onAuthStateChange/);
  assert.match(root, /authRouteGenerationRef/);
  assert.match(root, /lastAuthRouteKeyRef/);
  assert.match(root, /if \(!isCurrentRoute\(\)\) return;/);
  assert.doesNotMatch(home, /supabase\.auth\.onAuthStateChange/);
  assert.doesNotMatch(home, /supabase\.auth\.getSession/);
  assert.match(home, /useAppIdentity\(\)/);
});
