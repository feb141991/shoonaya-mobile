import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const screen = readFileSync(new URL('../app/dharm-veer/[id].tsx', import.meta.url), 'utf8');

describe('Dharm Veer reflection celebration', () => {
  it('shows the shared celebration only after a successful reflection save', () => {
    assert.match(screen, /setReflectionCelebrationVisible\(true\)/);
    assert.match(screen, /<ConfettiOverlay show=\{reflectionCelebrationVisible\} density="soft"/);
    assert.doesNotMatch(screen, /Alert\.alert\("Reflection Saved"/);
  });
});
