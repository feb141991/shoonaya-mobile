import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const screen = readFileSync(new URL('../app/shloka.tsx', import.meta.url), 'utf8');

describe('Shloka reading celebration and confetti suite', () => {
  it('triggers showConfetti upon marking shloka as read', () => {
    assert.match(screen, /setShowConfetti\(true\)/);
  });

  it('renders ConfettiOverlay at root Screen level with onComplete reset', () => {
    assert.match(screen, /<ConfettiOverlay show=\{showConfetti\} onComplete=\{\(\) => setShowConfetti\(false\)\}/);
  });
});
