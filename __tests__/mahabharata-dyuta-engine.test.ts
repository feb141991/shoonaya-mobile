import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DYUTA_ROUND_COUNT, DYUTA_RULESET_ID, DYUTA_STARTING_SEALS, continueAfterHandoff, createDyutaMatch, declareStake, getMatchOutcome, getPublicResponseState, isDyutaMatchState, keepCurrentRoll, respondToStake, rerollCurrentDie, rollForSide, shouldGuideAccept, type DicePair, type DyutaMatchState, type DyutaStake } from '../lib/dyuta/engine';

function declare(state = createDyutaMatch(), dice: DicePair = [4, 5], stake: DyutaStake = 2) {
  return declareStake(keepCurrentRoll(rollForSide(state, state.challenger, dice)), state.challenger, stake);
}
function acceptedRound(state: DyutaMatchState, challengerDice: DicePair, responderDice: DicePair, stake: DyutaStake) {
  const declared = declare(state, challengerDice, stake);
  const accepted = respondToStake(declared, declared.activeSide, 'accept');
  return keepCurrentRoll(rollForSide(accepted, accepted.activeSide, responderDice));
}

describe('Dyuta Sabha bluff rules', () => {
  it('starts a seven-round, seven-seal match under the versioned ruleset', () => {
    const state = createDyutaMatch();
    assert.equal(state.rulesetId, DYUTA_RULESET_ID);
    assert.equal(DYUTA_ROUND_COUNT, 7);
    assert.deepEqual(state.seals, { player: DYUTA_STARTING_SEALS, guide: DYUTA_STARTING_SEALS });
    assert.equal(state.phase, 'awaiting_challenger_roll');
  });
  it('allows one optional reroll before declaration', () => {
    const rolled = rollForSide(createDyutaMatch(), 'player', [1, 6]);
    const rerolled = rerollCurrentDie(rolled, 0, 5);
    assert.deepEqual(rerolled.challengerRoll?.finalDice, [5, 6]);
    assert.equal(rerolled.phase, 'awaiting_declaration');
    assert.throws(() => rerollCurrentDie(rerolled, 1, 4), /not available/i);
  });
  it('lets the responder yield exactly one seal without seeing the concealed throw', () => {
    const resolved = respondToStake(declare(createDyutaMatch(), [6, 6], 3), 'guide', 'yield');
    assert.deepEqual(resolved.seals, { player: 8, guide: 6 });
    assert.equal(resolved.history[0].sealsTransferred, 1);
    assert.equal(resolved.history[0].responderRoll, null);
  });
  it('transfers the declared stake after accepted reveal and conserves seals', () => {
    const resolved = acceptedRound(createDyutaMatch(), [5, 6], [2, 3], 2);
    assert.deepEqual(resolved.seals, { player: 9, guide: 5 });
    assert.equal(resolved.seals.player + resolved.seals.guide, 14);
  });
  it('transfers nothing on a tie and marks a losing three-seal challenge as overreach', () => {
    const tie = acceptedRound(createDyutaMatch(), [4, 4], [2, 6], 3);
    assert.deepEqual(tie.seals, { player: 7, guide: 7 });
    const loss = acceptedRound(createDyutaMatch(), [1, 2], [5, 6], 3);
    assert.equal(loss.history[0].overreach, true);
  });
  it('alternates the challenger and ends after seven rounds', () => {
    let state = createDyutaMatch();
    for (let round = 1; round <= 7; round += 1) {
      assert.equal(state.challenger, round % 2 === 1 ? 'player' : 'guide');
      state = acceptedRound(state, [3, 4], [3, 4], 1);
    }
    assert.equal(state.phase, 'complete');
    assert.equal(state.history.length, 7);
    assert.equal(getMatchOutcome(state), 'draw');
  });
  it('can end early when one side loses every seal', () => {
    let state = createDyutaMatch();
    state = acceptedRound(state, [6, 6], [1, 1], 3);
    state = acceptedRound(state, [1, 1], [6, 6], 3);
    state = acceptedRound(state, [6, 6], [1, 1], 1);
    assert.equal(state.phase, 'complete');
    assert.deepEqual(state.seals, { player: 14, guide: 0 });
  });
  it('limits Guide response decisions to public information', () => {
    const publicView = getPublicResponseState(declare(createDyutaMatch(), [6, 6], 3));
    assert.deepEqual(Object.keys(publicView).sort(), ['challengerSeals', 'declaredStake', 'responderSeals', 'round', 'roundsRemaining']);
    assert.equal(shouldGuideAccept(publicView, 'easy'), false);
    assert.equal(shouldGuideAccept({ ...publicView, declaredStake: 1 }, 'easy'), true);
  });
  it('hides private transitions in pass-and-play', () => {
    const ready = continueAfterHandoff(createDyutaMatch('hard', 'pass_and_play'));
    const declared = declare(ready, [6, 6], 3);
    assert.equal(declared.phase, 'handoff');
    assert.equal(declared.pendingPhase, 'awaiting_response');
  });
  it('rejects invalid dice, phases and corrupted persisted state', () => {
    assert.throws(() => rollForSide(createDyutaMatch(), 'player', [0, 6] as unknown as DicePair), /exactly two dice/i);
    assert.throws(() => declareStake(createDyutaMatch(), 'player', 3), /cannot be declared/i);
    assert.equal(isDyutaMatchState(createDyutaMatch()), true);
    assert.equal(isDyutaMatchState({ ...createDyutaMatch(), seals: { player: 99, guide: 7 } }), false);
  });
});
