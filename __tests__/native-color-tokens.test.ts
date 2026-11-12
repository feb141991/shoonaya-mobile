import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const hex = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const rgb = /\brgba?\(\s*[\d.]+%?[\s,]+[\d.]+%?[\s,]+[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)/i;

test('Native screens and components take hex and RGB colours from tokens', () => {
  const violations: string[] = [];
  for (const directory of ['app', 'components']) {
    for (const entry of readdirSync(directory, { recursive: true, encoding: 'utf8' }).sort()) {
      if (!/\.[jt]sx?$/.test(entry)) continue;
      const filename = join(directory, entry);
      const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);

      function visit(node: ts.Node) {
        if (
          (ts.isStringLiteral(node) || ts.isTemplateLiteralToken(node)) &&
          (hex.test(node.text) || rgb.test(node.text))
        ) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          violations.push(`${filename}:${line + 1} ${node.text}`);
        }
        ts.forEachChild(node, visit);
      }

      visit(source);
    }
  }
  assert.deepEqual(violations, [], 'Use a colour token from lib/constants.ts');
});
