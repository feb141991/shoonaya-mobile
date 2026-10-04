import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateCowrieRoll,
  createInitialGameState,
  executeRoll,
  applyMove,
  rollCowries,
  CHARKONI_STEP,
  SAFE_STEPS,
} from '../lib/chaupar/engine';

describe('Chaupar provisional game engine', () => {
  it('maps six cowrie outcomes to the current provisional score table', () => {
    // 1 mouth-up: 10 (Dasa) + Grace roll
    const roll1 = evaluateCowrieRoll([true, false, false, false, false, false]);
    assert.strictEqual(roll1.value, 10);
    assert.strictEqual(roll1.isGraceThrow, true);

    // 2 mouth-up: 2 (Do)
    const roll2 = evaluateCowrieRoll([true, true, false, false, false, false]);
    assert.strictEqual(roll2.value, 2);
    assert.strictEqual(roll2.isGraceThrow, false);

    // 3 mouth-up: 3 (Teen)
    const roll3 = evaluateCowrieRoll([true, true, true, false, false, false]);
    assert.strictEqual(roll3.value, 3);
    assert.strictEqual(roll3.isGraceThrow, false);

    // 4 mouth-up: 4 (Chaar)
    const roll4 = evaluateCowrieRoll([true, true, true, true, false, false]);
    assert.strictEqual(roll4.value, 4);
    assert.strictEqual(roll4.isGraceThrow, false);

    // 5 mouth-up: 25 (Pachis) + Grace roll
    const roll5 = evaluateCowrieRoll([true, true, true, true, true, false]);
    assert.strictEqual(roll5.value, 25);
    assert.strictEqual(roll5.isGraceThrow, true);

    // 6 mouth-up: 12 (Chhakka) + Grace roll
    const roll6 = evaluateCowrieRoll([true, true, true, true, true, true]);
    assert.strictEqual(roll6.value, 12);
    assert.strictEqual(roll6.isGraceThrow, true);

    // 0 mouth-up: 6 (Chhah) + Grace roll
    const roll0 = evaluateCowrieRoll([false, false, false, false, false, false]);
    assert.strictEqual(roll0.value, 6);
    assert.strictEqual(roll0.isGraceThrow, true);
  });

  it('initializes game with 2 players and 4 pawns each in camp', () => {
    const state = createInitialGameState([
      { name: 'Arjun', color: 'red' },
      { name: 'Yudhishthir', color: 'yellow' },
    ]);

    assert.strictEqual(state.players.length, 2);
    assert.strictEqual(state.currentTurnIndex, 0);
    assert.strictEqual(state.phase, 'WAITING_FOR_ROLL');
    assert.strictEqual(Object.keys(state.pawns).length, 8);

    for (const pawn of Object.values(state.pawns)) {
      assert.strictEqual(pawn.stepIndex, -1);
      assert.strictEqual(pawn.isInPlay, false);
      assert.strictEqual(pawn.isFinished, false);
    }
  });

  it('allows pawn entry into play on grace throw and grants extra turn', () => {
    let state = createInitialGameState([
      { name: 'Arjun', color: 'red' },
      { name: 'Yudhishthir', color: 'yellow' },
    ]);

    // Roll 25 (Pachis - Grace throw)
    const pachisRoll = evaluateCowrieRoll([true, true, true, true, true, false]);
    state = executeRoll(state, pachisRoll);

    assert.strictEqual(state.phase, 'WAITING_FOR_MOVE');
    assert.strictEqual(state.validMoves.length, 4); // all 4 pawns can enter

    // Move first pawn
    const movePawnId = state.validMoves[0].pawnId;
    state = applyMove(state, movePawnId);

    // Pawn is now on track at step 0
    assert.strictEqual(state.pawns[movePawnId].stepIndex, 0);
    assert.strictEqual(state.pawns[movePawnId].isInPlay, true);

    // Because it was a grace throw, Arjun gets another turn!
    assert.strictEqual(state.currentTurnIndex, 0);
    assert.strictEqual(state.phase, 'WAITING_FOR_ROLL');
  });

  it('captures opponent pawn when landing on unprotected square', () => {
    let state = createInitialGameState([
      { name: 'Player 1', color: 'red' },
      { name: 'Player 2', color: 'yellow' },
    ]);

    // Setup: put red pawn at step 5 and yellow pawn at step 8
    state.pawns['red-pawn-1'].stepIndex = 5;
    state.pawns['red-pawn-1'].isInPlay = true;

    state.pawns['yellow-pawn-1'].stepIndex = 8;
    state.pawns['yellow-pawn-1'].isInPlay = true;

    // Red rolls 3 (not a safe step, 8 is not in SAFE_STEPS)
    assert.ok(!SAFE_STEPS.has(8));
    const roll3 = evaluateCowrieRoll([true, true, true, false, false, false]);
    state = executeRoll(state, roll3);

    const captureMove = state.validMoves.find((m) => m.pawnId === 'red-pawn-1');
    assert.ok(captureMove);
    assert.strictEqual(captureMove?.isCapture, true);

    state = applyMove(state, 'red-pawn-1');

    // Red moves to step 8
    assert.strictEqual(state.pawns['red-pawn-1'].stepIndex, 8);
    // Yellow pawn is captured and sent back to camp (-1)
    assert.strictEqual(state.pawns['yellow-pawn-1'].stepIndex, -1);
    assert.strictEqual(state.pawns['yellow-pawn-1'].isInPlay, false);

    // Capture grants extra turn!
    assert.strictEqual(state.currentTurnIndex, 0);
  });

  it('detects victory when all 4 pawns reach the Charkoni', () => {
    let state = createInitialGameState([
      { name: 'Dev', color: 'red' },
      { name: 'Krishna', color: 'blue' },
    ]);

    // Set 3 pawns already finished, 4th at 82
    state.pawns['red-pawn-1'].isFinished = true;
    state.pawns['red-pawn-2'].isFinished = true;
    state.pawns['red-pawn-3'].isFinished = true;

    state.pawns['red-pawn-4'].stepIndex = CHARKONI_STEP - 2; // 82
    state.pawns['red-pawn-4'].isInPlay = true;

    // Roll 2 (Do)
    const roll2 = evaluateCowrieRoll([true, true, false, false, false, false]);
    state = executeRoll(state, roll2);

    const finishingMove = state.validMoves.find((m) => m.pawnId === 'red-pawn-4');
    assert.ok(finishingMove?.isFinishing);

    state = applyMove(state, 'red-pawn-4');

    assert.strictEqual(state.winner, 'red');
    assert.strictEqual(state.phase, 'GAME_OVER');
  });

  it('rejects malformed predetermined shell results instead of silently rolling randomly', () => {
    assert.throws(() => evaluateCowrieRoll([true, false]), /exactly six boolean/);
    assert.throws(() => evaluateCowrieRoll([true, false, true, false, true, 1] as unknown as boolean[]), /exactly six boolean/);
    assert.throws(() => rollCowries([true, false]), /exactly six boolean/);
  });

  it('copies the shell result so later caller mutation cannot rewrite a recorded roll', () => {
    const shellResult = [true, false, false, false, false, false];
    const roll = evaluateCowrieRoll(shellResult);

    shellResult[0] = false;
    assert.equal(roll.cowries[0], true);
    assert.equal(roll.value, 10);
  });

  it('rejects duplicate player colors and blank player names', () => {
    assert.throws(() => createInitialGameState([
      { name: 'One', color: 'red' },
      { name: 'Two', color: 'red' },
    ]), /different color/);
    assert.throws(() => createInitialGameState([
      { name: '  ', color: 'red' },
      { name: 'Two', color: 'blue' },
    ]), /must have a name/);
  });

  it('re-derives custom roll scoring rather than trusting conflicting metadata', () => {
    const state = createInitialGameState([
      { name: 'Arjun', color: 'red' },
      { name: 'Yudhishthir', color: 'yellow' },
    ]);
    const actual = evaluateCowrieRoll([true, true, false, false, false, false]);
    const forged = { ...actual, value: 25, isGraceThrow: true, englishLabel: 'Pachis' };

    const rolled = executeRoll(state, forged);
    assert.equal(rolled.lastRoll?.value, 2);
    assert.equal(rolled.lastRoll?.isGraceThrow, false);
    assert.equal(rolled.validMoves.length, 0);
    assert.equal(rolled.currentTurnIndex, 1);
  });
});
