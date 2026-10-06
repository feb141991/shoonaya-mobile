import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDyutaMatch,
  continueAfterHandoff,
  getGuideRerollIndex,
  getMatchOutcome,
  isDyutaMatchState,
  keepCurrentRoll,
  keepPlayerRoll,
  rerollCurrentDie,
  rerollPlayerDie,
  resolveGuideTurn,
  rollForSide,
  rollForPlayer,
  type DicePair,
  type DyutaMatchState,
} from '../lib/dyuta/engine';
import { mapRandomByteToDie } from '../lib/dyuta/randomPolicy';

describe('Mahabharata Dyuta interpreted rules v1', () => {
  it('starts as a local five-round match with the player opening round one', () => {
    assert.deepEqual(createDyutaMatch(), {
      schemaVersion: 3,
      rulesetId: 'open-throw-v1',
      mode: 'solo',
      playerNames: { player: 'You', guide: 'Guide' },
      guideDifficulty: 'medium',
      identities: {
        player: { avatar: 'sun', color: 'gold', faction: 'pandavas' },
        guide: { avatar: 'compass', color: 'navy', faction: 'kauravas' },
      },
      round: 1,
      activeSide: 'player',
      phase: 'awaiting_roll',
      totals: { player: 0, guide: 0 },
      history: [],
      currentRoll: null,
    });
  });

  it('stores cosmetic side, avatar, and color separately from game rules and gives the opponent the other side', () => {
    const match = createDyutaMatch('hard', 'solo', undefined, { avatar: 'moon', color: 'sage', faction: 'kauravas' });
    assert.equal(match.guideDifficulty, 'hard');
    assert.deepEqual(match.identities.player, { avatar: 'moon', color: 'sage', faction: 'kauravas' });
    assert.equal(match.identities.guide.faction, 'pandavas');
    assert.equal(isDyutaMatchState(match), true);
    assert.equal(isDyutaMatchState({ ...match, identities: { player: match.identities.player, guide: { ...match.identities.guide, faction: 'kauravas' } } }), false);
  });

  it('records an immutable player roll and awards only the final dice sum', () => {
    const dice: DicePair = [2, 6];
    const rolled = rollForPlayer(createDyutaMatch(), dice);
    dice[0] = 1;

    assert.deepEqual(rolled.currentRoll?.initialDice, [2, 6]);
    const kept = keepPlayerRoll(rolled);
    assert.equal(kept.history[0].points, 8);
    assert.equal(kept.totals.player, 8);
    assert.equal(kept.activeSide, 'guide');
    assert.equal(kept.phase, 'awaiting_roll');
  });

  it('allows exactly one selected die to be rerolled and records the decision', () => {
    const rolled = rollForPlayer(createDyutaMatch(), [2, 6]);
    const rerolled = rerollPlayerDie(rolled, 0, 5);

    assert.deepEqual(rerolled.history[0], {
      round: 1,
      side: 'player',
      initialDice: [2, 6],
      finalDice: [5, 6],
      rerolledIndex: 0,
      points: 11,
    });
    assert.equal(rerolled.totals.player, 11);
    assert.equal(rerolled.activeSide, 'guide');
    assert.throws(() => rerollPlayerDie(rerolled, 1, 4), /cannot roll|decision is not available/i);
  });

  it('applies the disclosed guide policies with a stable left-die tie break', () => {
    assert.equal(getGuideRerollIndex([1, 6], 'easy'), 0);
    assert.equal(getGuideRerollIndex([2, 6], 'easy'), null);
    assert.equal(getGuideRerollIndex([2, 6], 'medium'), 0);
    assert.equal(getGuideRerollIndex([3, 6], 'medium'), null);
    assert.equal(getGuideRerollIndex([3, 6], 'hard'), 0);
    assert.equal(getGuideRerollIndex([4, 6], 'hard'), null);
    assert.equal(getGuideRerollIndex([2, 2], 'medium'), 0);
    assert.equal(getGuideRerollIndex([5, 1], 'medium'), 1);
  });

  it('requires exactly the reroll outcome the guide policy calls for', () => {
    const afterPlayer = keepPlayerRoll(rollForPlayer(createDyutaMatch(), [4, 4]));
    assert.throws(() => resolveGuideTurn(afterPlayer, [1, 6]), /must resolve/i);
    assert.throws(() => resolveGuideTurn(afterPlayer, [5, 6], 2), /no reroll/i);

    const resolved = resolveGuideTurn(afterPlayer, [1, 6], 5);
    assert.deepEqual(resolved.history[1], {
      round: 1,
      side: 'guide',
      initialDice: [1, 6],
      finalDice: [5, 6],
      rerolledIndex: 0,
      points: 11,
    });
  });

  it('alternates which side opens each round and completes after ten turns', () => {
    let state = createDyutaMatch('easy');
    const expectedOpeners = ['player', 'guide', 'player', 'guide', 'player'];

    for (let round = 1; round <= 5; round += 1) {
      assert.equal(state.round, round);
      assert.equal(state.activeSide, expectedOpeners[round - 1]);
      const firstSide = state.activeSide;
      state = playOneTurn(state, firstSide === 'player' ? [6, 6] : [5, 5]);
      assert.equal(state.round, round);
      assert.equal(state.activeSide, firstSide === 'player' ? 'guide' : 'player');
      state = playOneTurn(state, state.activeSide === 'player' ? [6, 6] : [5, 5]);
    }

    assert.equal(state.phase, 'complete');
    assert.equal(state.history.length, 10);
    assert.equal(getMatchOutcome(state), 'player_win');
  });

  it('returns a draw for equal totals and rejects impossible transitions', () => {
    let state = createDyutaMatch();
    for (let turn = 0; turn < 10; turn += 1) state = playOneTurn(state, [3, 3]);
    assert.equal(state.totals.player, 30);
    assert.equal(state.totals.guide, 30);
    assert.equal(getMatchOutcome(state), 'draw');
    assert.throws(() => rollForPlayer(state, [1, 1]), /cannot roll/i);
    assert.throws(() => keepPlayerRoll(state), /decision is not available/i);
  });

  it('rejects malformed dice, illegal rerolls, and a second player roll', () => {
    assert.throws(() => rollForPlayer(createDyutaMatch(), [0, 6] as unknown as DicePair), /exactly two dice/i);
    assert.throws(() => rollForPlayer(createDyutaMatch(), [1, 7] as unknown as DicePair), /exactly two dice/i);
    assert.throws(() => rollForPlayer(createDyutaMatch(), [1] as unknown as DicePair), /exactly two dice/i);
    assert.throws(() => rerollPlayerDie(rollForPlayer(createDyutaMatch(), [2, 3]), 2 as unknown as 0, 5), /one of the two/i);
    assert.throws(() => rollForPlayer(rollForPlayer(createDyutaMatch(), [2, 3]), [4, 5]), /cannot roll/i);
  });

  it('validates saved states against ruleset, turn order, scores, and die values', () => {
    const initial = createDyutaMatch();
    assert.equal(isDyutaMatchState(initial), true);
    assert.equal(isDyutaMatchState({ ...initial, rulesetId: 'unknown' }), false);

    const pendingDecision = rollForPlayer(initial, [1, 3]);
    assert.equal(isDyutaMatchState(pendingDecision), true);
    assert.equal(isDyutaMatchState({ ...pendingDecision, round: 2 }), false);

    const scored = keepPlayerRoll(pendingDecision);
    assert.equal(isDyutaMatchState(scored), true);
    const badScore = { ...scored, totals: { ...scored.totals, player: 999 } };
    assert.equal(isDyutaMatchState(badScore), false);
    const badHistory = { ...scored, history: [{ ...scored.history[0], finalDice: [9, 3] }] };
    assert.equal(isDyutaMatchState(badHistory), false);

    const guideTurn = keepPlayerRoll(rollForPlayer(initial, [4, 4]));
    const guideRerolled = resolveGuideTurn(guideTurn, [1, 6], 3);
    assert.equal(isDyutaMatchState(guideRerolled), true);
    const ruleBreakingGuideSave = {
      ...guideRerolled,
      history: guideRerolled.history.map((turn, index) => index === 1 ? { ...turn, rerolledIndex: null, finalDice: turn.initialDice, points: turn.initialDice[0] + turn.initialDice[1] } : turn),
      totals: { ...guideRerolled.totals, guide: 7 },
    };
    assert.equal(isDyutaMatchState(ruleBreakingGuideSave), false);
  });

  it('maps all accepted random bytes uniformly and rejects the biased tail', () => {
    const counts = [0, 0, 0, 0, 0, 0];
    let rejected = 0;
    for (let byte = 0; byte < 256; byte += 1) {
      const value = mapRandomByteToDie(byte);
      if (value === null) rejected += 1;
      else counts[value - 1] += 1;
    }
    assert.deepEqual(counts, [42, 42, 42, 42, 42, 42]);
    assert.equal(rejected, 4);
    assert.throws(() => mapRandomByteToDie(256), /random byte/i);
  });

  it('supports offline two-person pass-and-play with a visible privacy handoff before every turn', () => {
    let state = createDyutaMatch('medium', 'pass_and_play', { player: 'Asha', guide: 'Dev' });
    assert.equal(state.phase, 'handoff');
    assert.equal(isDyutaMatchState(state), true);
    assert.throws(() => rollForSide(state, 'player', [4, 3]), /cannot roll/i);

    for (let turn = 0; turn < 10; turn += 1) {
      assert.equal(state.phase, 'handoff');
      const activeSide = state.activeSide;
      state = continueAfterHandoff(state);
      state = rollForSide(state, activeSide, [4, 3]);
      assert.equal(state.phase, activeSide === 'player' ? 'player_decision' : 'guide_decision');
      assert.equal(isDyutaMatchState(state), true);
      state = keepCurrentRoll(state);
      if (turn < 9) {
        assert.equal(state.phase, 'handoff');
        assert.equal(state.currentRoll, null, 'dice are cleared before passing the device');
      }
      assert.equal(isDyutaMatchState(state), true);
    }
    assert.equal(state.phase, 'complete');
    assert.equal(getMatchOutcome(state), 'draw');
    assert.equal(state.playerNames.player, 'Asha');
    assert.equal(state.playerNames.guide, 'Dev');
  });

  it('sanitizes local player labels and rejects guide actions in solo mode', () => {
    const match = createDyutaMatch('medium', 'pass_and_play', {
      player: '  Asha\n\u0000  ',
      guide: '  '.repeat(4),
    });
    assert.deepEqual(match.playerNames, { player: 'Asha', guide: 'Player 2' });
    assert.throws(() => rollForSide(createDyutaMatch(), 'guide', [2, 4]), /controlled by the game/i);
    assert.throws(() => rerollCurrentDie(createDyutaMatch(), 0, 5), /decision is not available/i);
  });

  it('allows the second pass-and-play seat to keep or reroll through the same human rules', () => {
    let state = continueAfterHandoff(createDyutaMatch('medium', 'pass_and_play'));
    state = keepCurrentRoll(rollForSide(state, 'player', [3, 4]));
    state = continueAfterHandoff(state);
    const secondSeatRoll = rollForSide(state, 'guide', [2, 6]);
    const afterReroll = rerollCurrentDie(secondSeatRoll, 0, 5);

    assert.deepEqual(afterReroll.history.at(-1), {
      round: 1,
      side: 'guide',
      initialDice: [2, 6],
      finalDice: [5, 6],
      rerolledIndex: 0,
      points: 11,
    });
    assert.equal(afterReroll.phase, 'handoff');
    assert.equal(afterReroll.activeSide, 'guide');

    const nextSeatRoll = rollForSide(continueAfterHandoff(afterReroll), 'guide', [4, 4]);
    const afterKeep = keepCurrentRoll(nextSeatRoll);
    assert.equal(afterKeep.history.at(-1)?.side, 'guide');
    assert.equal(afterKeep.history.at(-1)?.points, 8);
  });
});

function playOneTurn(state: DyutaMatchState, dice: DicePair): DyutaMatchState {
  if (state.activeSide === 'player') return keepPlayerRoll(rollForPlayer(state, dice));
  const rerollIndex = getGuideRerollIndex(dice, state.guideDifficulty);
  return resolveGuideTurn(state, dice, rerollIndex === null ? undefined : 4);
}
