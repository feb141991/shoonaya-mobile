import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DYUTA_ROUND_COUNT, DYUTA_RULESET_ID, DYUTA_STARTING_SEALS, continueAfterHandoff, createDyutaMatch, declareStake, getMatchOutcome, getHumanTurnSide, getPublicResponseState, getVisibleDice, isDyutaMatchState, keepCurrentRoll, respondToStake, rerollCurrentDie, rollForSide, shouldGuideAccept, type DicePair, type DieValue, type DyutaMatchState, type DyutaStake } from '../lib/dyuta/engine';

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

function seededDie(seed: number) {
  let value = seed;
  return (): DieValue => { value = (value * 1103515245 + 12345) % 2147483648; return ((value % 6) + 1) as DieValue; };
}
/** Plays a full match with random legal actions, returning every intermediate state. */
function playRandomMatch(mode: 'solo' | 'pass_and_play', seed: number): DyutaMatchState[] {
  const die = seededDie(seed);
  let state = createDyutaMatch('medium', mode);
  const states = [state];
  for (let step = 0; step < 200 && state.phase !== 'complete'; step += 1) {
    const side = state.activeSide;
    if (state.phase === 'handoff') state = continueAfterHandoff(state);
    else if (state.phase === 'awaiting_challenger_roll' || state.phase === 'awaiting_responder_roll') state = rollForSide(state, side, [die(), die()]);
    else if (state.phase === 'challenger_decision' || state.phase === 'responder_decision') state = die() <= 3 ? keepCurrentRoll(state) : rerollCurrentDie(state, (die() % 2) as 0 | 1, die());
    else if (state.phase === 'awaiting_declaration') state = declareStake(state, side, Math.min(((die() % 3) + 1), 3, state.seals.player, state.seals.guide) as DyutaStake);
    else if (state.phase === 'awaiting_response') state = respondToStake(state, side, die() <= 4 ? 'accept' : 'yield');
    states.push(state);
  }
  return states;
}

describe('Dyuta concealed dice', () => {
  it('never exposes a solo Guide throw before the round is revealed', () => {
    const guideTurn = respondToStake(declare(createDyutaMatch(), [2, 2], 1), 'guide', 'yield');
    assert.equal(guideTurn.challenger, 'guide');
    const rolled = rollForSide(guideTurn, 'guide', [6, 5]);
    assert.equal(getVisibleDice(rolled), null, 'challenger_decision');
    const kept = keepCurrentRoll(rolled);
    assert.equal(kept.phase, 'awaiting_declaration');
    assert.equal(getVisibleDice(kept), null, 'awaiting_declaration');
    const declared = declareStake(kept, 'guide', 3);
    assert.equal(getVisibleDice(declared), null, 'awaiting_response');
    const accepted = respondToStake(declared, 'player', 'accept');
    assert.equal(getVisibleDice(accepted), null, 'player has not rolled yet');
    assert.deepEqual(getVisibleDice(rollForSide(accepted, 'player', [3, 4])), [3, 4], 'player sees only their own throw');
  });
  it('never shows a Guide throw in any reachable solo state', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const state of playRandomMatch('solo', seed)) {
        const visible = getVisibleDice(state);
        if (!visible) continue;
        const own = state.activeSide === state.challenger ? state.challengerRoll : state.responderRoll;
        assert.equal(state.activeSide, 'player');
        assert.deepEqual(visible, own?.finalDice);
      }
    }
  });
  it('shows a pass-and-play throw only to its owner after the handoff', () => {
    const rolled = rollForSide(continueAfterHandoff(createDyutaMatch('medium', 'pass_and_play')), 'player', [4, 4]);
    assert.deepEqual(getVisibleDice(rolled), [4, 4]);
    const declared = declareStake(keepCurrentRoll(rolled), 'player', 2);
    assert.equal(declared.phase, 'handoff');
    assert.equal(getVisibleDice(declared), null);
    assert.equal(getVisibleDice(continueAfterHandoff(declared)), null);
  });
});

describe('Dyuta persisted-state validation', () => {
  it('accepts every state reachable through legal play in both modes', () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const mode of ['solo', 'pass_and_play'] as const) {
        const states = playRandomMatch(mode, seed);
        assert.equal(states.at(-1)?.phase, 'complete');
        for (const state of states) { assert.equal(isDyutaMatchState(JSON.parse(JSON.stringify(state))), true, `${mode} seed ${seed} ${state.phase}`); checked += 1; }
      }
    }
    assert.ok(checked > 1000, `checked ${checked} states`);
  });
  it('rejects awaiting_response without the challenger throw, which would throw on Accept or Yield', () => {
    const declared = declare(createDyutaMatch(), [4, 5], 2);
    assert.equal(isDyutaMatchState(declared), true);
    const corrupted = { ...declared, challengerRoll: null };
    assert.equal(isDyutaMatchState(corrupted), false);
    assert.throws(() => respondToStake(corrupted, 'guide', 'accept'));
  });
  it('rejects phase-specific gaps and stray data', () => {
    const fresh = createDyutaMatch();
    const declared = declare(fresh, [4, 5], 2);
    const accepted = respondToStake(declared, 'guide', 'accept');
    const deciding = rollForSide(accepted, 'guide', [1, 1]);
    const roll = { initialDice: [3, 3] as DicePair, finalDice: [3, 3] as DicePair, rerolledIndex: null };
    const cases: Array<[string, unknown]> = [
      ['awaiting_response without stake', { ...declared, declaredStake: null }],
      ['awaiting_response with active challenger', { ...declared, activeSide: 'player' }],
      ['awaiting_responder_roll without stake', { ...accepted, declaredStake: null }],
      ['responder_decision without responder throw', { ...deciding, responderRoll: null }],
      ['awaiting_challenger_roll with stray throw', { ...fresh, challengerRoll: roll }],
      ['challenger_decision without throw', { ...fresh, phase: 'challenger_decision' }],
      ['awaiting_declaration without throw', { ...fresh, phase: 'awaiting_declaration' }],
      ['challenger_decision after reroll already used', { ...fresh, phase: 'challenger_decision', challengerRoll: { initialDice: [1, 3], finalDice: [5, 3], rerolledIndex: 0 } }],
      ['kept throw whose dice changed', { ...fresh, phase: 'awaiting_declaration', challengerRoll: { initialDice: [1, 3], finalDice: [5, 3], rerolledIndex: null } }],
      ['reroll that changed both dice', { ...fresh, phase: 'awaiting_declaration', challengerRoll: { initialDice: [1, 3], finalDice: [5, 4], rerolledIndex: 0 } }],
      ['wrong challenger for the round', { ...fresh, challenger: 'guide', activeSide: 'guide' }],
      ['stake above available seals', { ...declared, seals: { player: 12, guide: 2 }, declaredStake: 3 }],
      ['zero seals outside a complete match', { ...fresh, seals: { player: 14, guide: 0 } }],
      ['handoff to complete', { ...createDyutaMatch('medium', 'pass_and_play'), pendingPhase: 'complete' }],
      ['handoff to handoff', { ...createDyutaMatch('medium', 'pass_and_play'), pendingPhase: 'handoff' }],
      ['handoff to unknown phase', { ...createDyutaMatch('medium', 'pass_and_play'), pendingPhase: 'reveal' }],
    ];
    for (const [label, state] of cases) assert.equal(isDyutaMatchState(state), false, label);
  });
  it('rejects a complete match that still carries a live round', () => {
    const complete = playRandomMatch('solo', 7).at(-1) as DyutaMatchState;
    assert.equal(isDyutaMatchState(complete), true);
    assert.equal(isDyutaMatchState({ ...complete, declaredStake: 2 }), false);
  });
});

describe('Dyuta human controls', () => {
  it('lets the second pass-and-play seat act, so the match cannot stall on Player 2', () => {
    const declared = declare(continueAfterHandoff(createDyutaMatch('medium', 'pass_and_play')), [4, 4], 2);
    assert.equal(getHumanTurnSide(declared), null, 'nobody acts during a handoff');
    const responding = continueAfterHandoff(declared);
    assert.equal(responding.activeSide, 'guide');
    assert.equal(getHumanTurnSide(responding), 'guide');
  });
  it('never hands the solo Guide seat to the human', () => {
    const guideTurn = respondToStake(declare(createDyutaMatch(), [2, 2], 1), 'guide', 'yield');
    assert.equal(guideTurn.activeSide, 'guide');
    assert.equal(getHumanTurnSide(guideTurn), null);
    assert.equal(getHumanTurnSide(createDyutaMatch()), 'player');
  });
  it('completes every pass-and-play match using only human-turn controls', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const states = playRandomMatch('pass_and_play', seed);
      for (const state of states) if (state.phase !== 'handoff' && state.phase !== 'complete') assert.equal(getHumanTurnSide(state), state.activeSide);
      assert.equal(states.at(-1)?.phase, 'complete');
    }
  });
});
