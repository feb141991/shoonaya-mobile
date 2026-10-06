import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Every Panchatantra image the app bundles must be WebP and within budget.
// 2026-10-07: the 93 tier-2 JPEGs (95.4 MB) were re-encoded to WebP q80
// (18.1 MB). This stops a full-size generated JPEG/PNG slipping back in.
// Pipeline: scripts/optimize-panchatantra-art.py; spec:
// docs/artwork/panchatantra-storybook/IMAGE_SPEC.md.
const BUDGET_BYTES = 600 * 1024;
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/panchatantraArtwork.ts'), 'utf8');
const referenced = [...new Set([...source.matchAll(/require\('@\/(assets\/panchatantra\/[^']+)'\)/g)].map((m) => m[1]))];

test('the artwork map references Panchatantra images at all', () => {
  assert.ok(referenced.length >= 93, `expected at least 93 referenced images, found ${referenced.length}`);
});

test('every referenced Panchatantra image is .webp', () => {
  assert.deepEqual(referenced.filter((file) => !file.endsWith('.webp')), []);
});

test('every referenced Panchatantra image exists and is within the 600 KB budget', () => {
  const problems = referenced.flatMap((file) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) return [`${file} is missing`];
    const size = fs.statSync(full).size;
    return size > BUDGET_BYTES ? [`${file} is ${Math.round(size / 1024)} KB`] : [];
  });
  assert.deepEqual(problems, []);
});
