import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Origin: 2026-11-12. Home's calendar pill showed the raw text "Couldn&apos;t check" because
// app/(tabs)/index.tsx wrote an HTML entity inside a JavaScript string. JSX decodes entities in text and in
// attribute strings (title="Don&apos;t"), but never inside a JS string or a {'...'} expression, so the
// characters are shown literally. Write the real character (’ or ') in those strings.

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components', 'lib'];
// A quoted string that is not a bare JSX attribute value (not directly after "=") and contains an entity.
const ENTITY_IN_STRING = /(?<![=\w])(['"])(?:(?!\1)[^\n])*&(?:apos|quot|amp|#39|lt|gt);(?:(?!\1)[^\n])*\1/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('HTML entities inside JavaScript strings', () => {
  it('the pattern catches the Home pill bug and ignores valid JSX text and attributes', () => {
    assert.ok(ENTITY_IN_STRING.test(`: language === 'pa' ? 'x' : 'Couldn&apos;t check · Retry');`));
    assert.ok(ENTITY_IN_STRING.test(`label={"Don&apos;t"}`));
    assert.ok(!ENTITY_IN_STRING.test(`<Text>Today&apos;s Practice</Text>`));
    assert.ok(!ENTITY_IN_STRING.test(`<View accessibilityLabel="Don&apos;t" />`));
    assert.ok(!ENTITY_IN_STRING.test(`const label = 'Couldn’t check';`));
  });

  it('no app, component or lib source writes an entity inside a JS string', () => {
    const hits: string[] = [];
    for (const dir of DIRS) {
      for (const file of sourceFiles(path.join(ROOT, dir))) {
        fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (ENTITY_IN_STRING.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}`);
        });
      }
    }
    assert.deepEqual(hits, [], `HTML entity inside a JS string (shown literally on screen): ${hits.join(', ')}`);
  });
});
