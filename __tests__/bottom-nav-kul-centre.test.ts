import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Source-level checks, same approach as lineage-layout / japa-sound-nav tests:
// the bar is a React Native component that this node test runner cannot render.
const nav = fs.readFileSync(path.join(__dirname, '../components/ui/CollapsibleBottomNav.tsx'), 'utf8');
const home = fs.readFileSync(path.join(__dirname, '../app/(tabs)/index.tsx'), 'utf8');

const tabBlock = nav.slice(nav.indexOf('const TABS: TabDef[]'), nav.indexOf('const activeTab'));
const keys = [...tabBlock.matchAll(/key: '([^']+)'/g)].map((m) => m[1]);

test('bottom nav is exactly Home, Japa, KUL (centre), Pathshala, Mandali', () => {
  assert.deepEqual(keys, ['home', 'japa', 'kul', 'pathshala', 'mandali']);
  const centre = [...tabBlock.matchAll(/key: '([^']+)'[\s\S]*?(?=\n      \},)/g)].filter((m) => m[0].includes('isCenter: true')).map((m) => m[1]);
  assert.deepEqual(centre, ['kul']);
});

test('the KUL tab highlights on /kul and its sub-routes', () => {
  assert.match(tabBlock, /match: \(p\) => matchesAny\(p, \['\/kul'\]\)/);
});

test('Bhakti is reachable from exactly one Home tile, and no longer from the bar', () => {
  assert.ok(!keys.includes('bhakti'));
  assert.equal([...home.matchAll(/label: 'Bhakti',\s+href: '\/\(tabs\)\/bhakti'/g)].length, 1);
});
