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

  it('renders dice only through the engine visibility contract', () => {
    assert.match(screen, /const visibleRoll = getVisibleDice\(match\)/);
    assert.doesNotMatch(screen, /challengerRoll\?\.finalDice|responderRoll\?\.finalDice/);
  });

  it('keeps difficulty, identity, save slots, tutorial, source notes and haptics reachable', () => {
    assert.match(screen, /difficultyEasy/);
    assert.match(screen, /difficultyMedium/);
    assert.match(screen, /difficultyHard/);
    assert.match(screen, /function IdentityChoices\(/);
    assert.match(screen, /<IdentityChoices /);
    assert.match(screen, /onFaction\('pandavas'\)/);
    assert.match(screen, /onFaction\('kauravas'\)/);
    assert.match(screen, /<Feather name=\{avatar\}/);
    assert.match(screen, /saveDyutaMatchCopy\(match\)/);
    assert.match(screen, /readDyutaSavedMatches\(\)/);
    assert.match(screen, /onLoad=\{loadCopy\}/);
    assert.match(screen, /deleteDyutaSavedMatch\(saved\.id\)/);
    assert.match(screen, /savedMatches\.length >= MAX_DYUTA_SAVED_MATCHES/);
    assert.match(screen, /markDyutaTutorialCompleted\(\)/);
    assert.match(screen, /copy\.factSourceLabel/);
    assert.match(screen, /BORI Critical Edition · Mahabharata 2\.53\.4–5; Stage 0 evidence review/);
    assert.match(screen, /writeDyutaPreferences\(\{ hapticsEnabled: enabled \}\)/);
    // GameExtras is built once and mounted on both the setup and in-match screens.
    assert.equal(screen.match(/<GameExtras/g)?.length, 1);
    assert.equal(screen.match(/\{extras\}/g)?.length, 2);
    assert.doesNotMatch(screen, /haptic="selection"/, 'every control must honour the haptics preference');
    for (const language of ['en', 'hi', 'pa'] as const) {
      const copy = DYUTA_COPY[language];
      for (const key of ['difficultyEasy', 'difficultyMedium', 'difficultyHard', 'pandavas', 'kauravas', 'avatarSun', 'colorGold', 'tutorialTitle', 'factsTitle', 'savedMatchesTitle', 'hapticsTitle'] as const) {
        assert.ok(copy[key].trim().length > 0, `${language}.${key} must have localized copy`);
      }
    }
  });

  it('records a completion only on a live transition, not when restoring a finished match', () => {
    // Hydration and save-loading must seed the "already complete" ref before the match is set,
    // so the completion effect cannot fire for a match that was already complete.
    assert.match(screen, /previousComplete\.current = saved\?\.phase === 'complete'; setMatch\(saved\)/);
    assert.match(screen, /previousComplete\.current = saved\.match\.phase === 'complete'; setMatch\(saved\.match\)/);
    assert.match(screen, /if \(complete && !previousComplete\.current\) void recordDyutaMatchCompletion\(\)/);
    assert.equal(screen.match(/recordDyutaMatchCompletion\(\)/g)?.length, 1);
  });
});

