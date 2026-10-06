import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { DYUTA_COPY } from '../lib/dyuta/copy';

const screen = readFileSync(new URL('../app/dyuta.tsx', import.meta.url), 'utf8');

describe('Dyuta Sabha product surface', () => {
  it('renders a visual sabha, seven lamps, animated dice and four Guide moods', () => {
    assert.match(screen, /function SabhaBoard/);
    assert.match(screen, /function SabhaLamps/);
    assert.match(screen, /Array\.from\(\{ length: 7 \}/);
    assert.match(screen, /overreach/);
    assert.match(screen, /function DiceStage/);
    assert.match(screen, /useReducedMotion/);
    for (const mood of ['neutral', 'thinking', 'pleased', 'defeat']) assert.match(screen, new RegExp(`${mood}: require`));
  });

  it('supports declare-after-roll bluffing, accept or yield, and keeps Guide response public', () => {
    assert.match(screen, /declareStake/);
    assert.match(screen, /respondToStake/);
    assert.match(screen, /shouldGuideAccept\(getPublicResponseState\(state\)/);
    assert.match(screen, /awaiting_declaration/);
    assert.match(screen, /awaiting_response/);
  });

  it('creates a shareable view-shot recap card', () => {
    assert.match(screen, /function MatchRecapCard/);
    assert.match(screen, /shareCapturedShoonayaCard/);
    assert.match(screen, /recapRef/);
  });

  it('keeps sourced reflection text out of the product until approved', () => {
    assert.doesNotMatch(screen, /Rigveda|Ṛgveda|10\.34|gambler.?s hymn/i);
    for (const language of ['en', 'hi', 'pa'] as const) {
      assert.ok(DYUTA_COPY[language].gameTitle.trim().length > 0);
      assert.ok(DYUTA_COPY[language].storyBoundary.match(/Shoonaya|शून्य|ਸ਼ੂਨਿਆ|interpretation|व्याख्या|ਵਿਆਖਿਆ/i));
    }
  });
});
