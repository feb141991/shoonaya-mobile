import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const kulSource = fs.readFileSync(path.join(process.cwd(), 'app/kul.tsx'), 'utf8');

test('a death_anniversary family event offers a link to Pitru Paksha observance content', () => {
  assert.match(
    kulSource,
    /eventType === "death_anniversary" \? \([\s\S]*?router\.push\("\/festival\/pitru-paksha"\)/,
  );
});

test('the Pitru Paksha link is not shown for non-remembrance family event types', () => {
  // Mutation check: the gate must actually be present, not just the link.
  const withoutGate = kulSource.replace(
    '{eventType === "death_anniversary" ? (\n                            <PressableSurface\n                              onPress={() => router.push("/festival/pitru-paksha")}',
    '{(\n                            <PressableSurface\n                              onPress={() => router.push("/festival/pitru-paksha")}',
  );
  assert.notEqual(withoutGate, kulSource, 'expected the death_anniversary gate text to be found and replaced');
});
