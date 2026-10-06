import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { DYUTA_COPY } from '../lib/dyuta/copy';

const screen = readFileSync(new URL('../app/dyuta.tsx', import.meta.url), 'utf8');

function callbackBody(name: string): string {
  const start = screen.indexOf(`const ${name} = useCallback(`);
  assert.notEqual(start, -1, `${name} handler should exist`);
  const end = screen.indexOf('\n  }, [', start);
  assert.notEqual(end, -1, `${name} handler should have a dependency list`);
  return screen.slice(start, end);
}

describe('Mahabharata Dyuta screen human actions', () => {
  it('delegates keep eligibility to the rules engine for either pass-and-play seat', () => {
    const body = callbackBody('handleKeep');
    assert.match(body, /return keepCurrentRoll\(previous\)/);
    assert.doesNotMatch(body, /previous\.phase !== 'player_decision'/);
  });

  it('delegates reroll eligibility to the rules engine for either pass-and-play seat', () => {
    const body = callbackBody('handleReroll');
    assert.match(body, /return rerollCurrentDie\(previous, dieIndex, rerollValue\)/);
    assert.doesNotMatch(body, /previous\.phase !== 'player_decision'/);
  });

  it('renders both seats, the shared dice table, and a five-round accessible track', () => {
    assert.match(screen, /function GameBoard\(/);
    assert.match(screen, /function PlayerSeat\(/);
    assert.match(screen, /function RoundTrack\(/);
    assert.match(screen, /accessibilityRole="progressbar"/);
    assert.match(screen, /size=\{72\}/);
    for (const language of ['en', 'hi', 'pa'] as const) {
      assert.ok(DYUTA_COPY[language].boardTitle.trim().length > 0, `${language} needs a localized board title`);
      assert.ok(DYUTA_COPY[language].versus.trim().length > 0, `${language} needs a localized versus label`);
    }
  });

  it('presents Dyuta Sabha as the epic experience and keeps Open Throw separate', () => {
    for (const language of ['en', 'hi', 'pa'] as const) {
      const copy = DYUTA_COPY[language];
      assert.ok(copy.gameTitle.trim().length > 0, `${language} needs a localized Dyuta title`);
      assert.ok(copy.experienceLabel.trim().length > 0, `${language} needs a localized experience label`);
      assert.ok(copy.modernTitle.trim().length > 0, `${language} needs a localized modern-game title`);
      assert.notEqual(copy.gameTitle, copy.modernTitle, `${language} must keep the epic and modern games distinct`);
      assert.match(copy.storyBoundary, /Shoonaya|ਸ਼ੂਨਿਆ|शून्य|व्याख्या|ਵਿਆਖਿਆ|interpretation/i);
    }
  });

  it('offers difficulty, cosmetic identities, local save slots, tutorial, source notes, and persistent haptics', () => {
    assert.match(screen, /difficultyEasy/);
    assert.match(screen, /difficultyMedium/);
    assert.match(screen, /difficultyHard/);
    assert.match(screen, /function IdentityChoices\(/);
    assert.match(screen, /saveDyutaMatchCopy\(match\)/);
    assert.match(screen, /MAX_DYUTA_SAVED_MATCHES|savedMatches\.length >= 5/);
    assert.match(screen, /tutorialSteps/);
    assert.match(screen, /factSources/);
    assert.match(screen, /toggleHaptics/);
    for (const language of ['en', 'hi', 'pa'] as const) {
      const copy = DYUTA_COPY[language];
      for (const key of ['difficultyEasy', 'difficultyMedium', 'difficultyHard', 'pandavas', 'kauravas', 'avatarSun', 'colorGold', 'tutorialTitle', 'factsTitle', 'savedMatchesTitle', 'hapticsTitle'] as const) {
        assert.ok(copy[key].trim().length > 0, `${language}.${key} must have localized copy`);
      }
    }
  });
});
