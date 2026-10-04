import type {
  ChauparColor,
  ChauparDiceRoll,
  ChauparGamePhase,
  ChauparGameState,
  ChauparMoveOption,
  ChauparPawn,
  ChauparPlayer,
  ChauparPlayerType,
} from './types';

export const TOTAL_PATH_STEPS = 84;
export const CHARKONI_STEP = 84;
export const CHAU_PAR_RULESET_ID = 'provisional-six-cowrie-v1';

// Standard safe steps relative to player's track
export const SAFE_STEPS = new Set<number>([
  7, 12, 17, 24, 29, 34, 41, 46, 51, 58, 63, 68,
]);

/**
 * Maps a provisional six-cowrie profile. Review it against a named regional
 * Chaupar variant before presenting this engine as authoritative.
 * - 1 mouth-up: 10 (Dasa) + Grace throw
 * - 2 mouth-up: 2 (Do)
 * - 3 mouth-up: 3 (Teen)
 * - 4 mouth-up: 4 (Chaar)
 * - 5 mouth-up: 25 (Pachis) + Grace throw
 * - 6 mouth-up: 12 (Chhakka) + Grace throw
 * - 0 mouth-up: 6 (Chhah) + Grace throw
 */
export function evaluateCowrieRoll(cowries: boolean[]): ChauparDiceRoll {
  if (
    !Array.isArray(cowries) ||
    cowries.length !== 6 ||
    cowries.some((side) => typeof side !== 'boolean')
  ) {
    throw new TypeError('A Chaupar roll must contain exactly six boolean cowrie results.');
  }

  const stableCowries = [...cowries];
  const mouthUpCount = stableCowries.filter(Boolean).length;

  switch (mouthUpCount) {
    case 1:
      return {
        cowries: stableCowries,
        value: 10,
        isGraceThrow: true,
        sanskritLabel: 'दश (१०)',
        englishLabel: 'Dasa (10) · Grace Roll',
      };
    case 2:
      return {
        cowries: stableCowries,
        value: 2,
        isGraceThrow: false,
        sanskritLabel: 'द्वौ (२)',
        englishLabel: 'Do (2)',
      };
    case 3:
      return {
        cowries: stableCowries,
        value: 3,
        isGraceThrow: false,
        sanskritLabel: 'त्रीणि (३)',
        englishLabel: 'Teen (3)',
      };
    case 4:
      return {
        cowries: stableCowries,
        value: 4,
        isGraceThrow: false,
        sanskritLabel: 'चत्वारि (४)',
        englishLabel: 'Chaar (4)',
      };
    case 5:
      return {
        cowries: stableCowries,
        value: 25,
        isGraceThrow: true,
        sanskritLabel: 'पञ्चविंशति (२५)',
        englishLabel: 'Pachis (25) · Grace Roll',
      };
    case 6:
      return {
        cowries: stableCowries,
        value: 12,
        isGraceThrow: true,
        sanskritLabel: 'द्वादश (१२)',
        englishLabel: 'Chhakka (12) · Grace Roll',
      };
    case 0:
    default:
      return {
        cowries: stableCowries,
        value: 6,
        isGraceThrow: true,
        sanskritLabel: 'षट् (६)',
        englishLabel: 'Chhah (6) · Grace Roll',
      };
  }
}

/**
 * Rolls 6 cowrie shells randomly or evaluates a predetermined array
 */
export function rollCowries(predetermined?: boolean[]): ChauparDiceRoll {
  if (predetermined !== undefined) {
    return evaluateCowrieRoll(predetermined);
  }
  const cowries: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    cowries.push(Math.random() >= 0.5);
  }
  return evaluateCowrieRoll(cowries);
}

/**
 * Creates initial clean game state for Chaupar
 */
export function createInitialGameState(
  playerConfigs: { name: string; color: ChauparColor; type?: ChauparPlayerType }[]
): ChauparGameState {
  if (!Array.isArray(playerConfigs) || playerConfigs.length < 2 || playerConfigs.length > 4) {
    throw new Error('Chaupar requires between 2 and 4 players.');
  }
  const colors = playerConfigs.map((player) => player.color);
  if (new Set(colors).size !== colors.length) {
    throw new Error('Each Chaupar player must have a different color.');
  }
  if (playerConfigs.some((player) => !player.name?.trim())) {
    throw new Error('Each Chaupar player must have a name.');
  }

  const pawns: Record<string, ChauparPawn> = {};
  const players: ChauparPlayer[] = playerConfigs.map((cfg) => {
    const pawnIds: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const pId = `${cfg.color}-pawn-${i}`;
      pawnIds.push(pId);
      pawns[pId] = {
        id: pId,
        color: cfg.color,
        stepIndex: -1, // in camp
        isFinished: false,
        isInPlay: false,
        isSafe: true,
      };
    }

    return {
      id: cfg.color,
      name: cfg.name,
      color: cfg.color,
      type: cfg.type || 'human',
      pawnIds,
      finishedCount: 0,
    };
  });

  return {
    players,
    currentTurnIndex: 0,
    phase: 'WAITING_FOR_ROLL',
    lastRoll: null,
    validMoves: [],
    pawns,
    winner: null,
    history: ['Auspicious Chaupar match initialized. Let Dharma guide every move.'],
  };
}

/**
 * Computes all legal moves for current player given the dice roll
 */
export function computeValidMoves(
  state: ChauparGameState,
  roll: ChauparDiceRoll
): ChauparMoveOption[] {
  if (state.winner || state.phase === 'GAME_OVER') {
    return [];
  }

  // Derive the score and grace flag from the shell result. Callers cannot
  // inject conflicting roll metadata into move validation.
  roll = evaluateCowrieRoll(roll.cowries);
  const currentPlayer = state.players[state.currentTurnIndex];
  if (!currentPlayer) return [];
  const options: ChauparMoveOption[] = [];

  for (const pawnId of currentPlayer.pawnIds) {
    const pawn = state.pawns[pawnId];
    if (pawn.isFinished) continue;

    // 1. Pawn in camp: Can enter on grace throw (10, 25, 12, 6) or any throw in relaxed family mode
    if (!pawn.isInPlay) {
      if (roll.isGraceThrow) {
        options.push({
          pawnId,
          fromStep: -1,
          toStep: 0,
          isCapture: false,
          isFinishing: false,
        });
      }
      continue;
    }

    // 2. Pawn already on track
    const targetStep = pawn.stepIndex + roll.value;

    // Check if target step exceeds Charkoni
    if (targetStep > CHARKONI_STEP) {
      continue; // Exact roll needed or cannot overshoot
    }

    const isFinishing = targetStep === CHARKONI_STEP;
    const isSafe = SAFE_STEPS.has(targetStep);

    // Check if landing on opponent pawn
    let isCapture = false;
    if (!isSafe && !isFinishing) {
      for (const otherPlayer of state.players) {
        if (otherPlayer.color !== currentPlayer.color) {
          for (const oppId of otherPlayer.pawnIds) {
            const oppPawn = state.pawns[oppId];
            if (oppPawn.isInPlay && oppPawn.stepIndex === targetStep) {
              isCapture = true;
              break;
            }
          }
        }
      }
    }

    options.push({
      pawnId,
      fromStep: pawn.stepIndex,
      toStep: targetStep,
      isCapture,
      isFinishing,
    });
  }

  return options;
}

/**
 * Executes a dice roll in the state machine
 */
export function executeRoll(
  state: ChauparGameState,
  customRoll?: ChauparDiceRoll
): ChauparGameState {
  if (state.phase !== 'WAITING_FOR_ROLL' || state.winner) {
    return state;
  }

  const roll = customRoll
    ? evaluateCowrieRoll(customRoll.cowries)
    : rollCowries();
  const validMoves = computeValidMoves(state, roll);

  // If no valid moves possible, advance turn (unless grace throw grants re-roll)
  if (validMoves.length === 0) {
    const nextTurnIndex = roll.isGraceThrow
      ? state.currentTurnIndex
      : (state.currentTurnIndex + 1) % state.players.length;

    const currentPlayer = state.players[state.currentTurnIndex];
    const log = `${currentPlayer.name} rolled ${roll.englishLabel}. No legal moves available.`;

    return {
      ...state,
      lastRoll: roll,
      validMoves: [],
      currentTurnIndex: nextTurnIndex,
      phase: 'WAITING_FOR_ROLL',
      history: [log, ...state.history].slice(0, 40),
    };
  }

  return {
    ...state,
    lastRoll: roll,
    validMoves,
    phase: 'WAITING_FOR_MOVE',
  };
}

/**
 * Applies a move chosen by the player
 */
export function applyMove(
  state: ChauparGameState,
  pawnId: string
): ChauparGameState {
  if (state.phase !== 'WAITING_FOR_MOVE' || !state.lastRoll) {
    return state;
  }

  const move = state.validMoves.find((m) => m.pawnId === pawnId);
  if (!move) {
    return state;
  }

  const currentPlayer = state.players[state.currentTurnIndex];
  if (!currentPlayer) return state;
  const nextPawns = { ...state.pawns };
  const currentPawn = nextPawns[pawnId];

  // Update moving pawn
  const isFinishing = move.toStep === CHARKONI_STEP;
  nextPawns[pawnId] = {
    ...currentPawn,
    stepIndex: move.toStep,
    isInPlay: !isFinishing,
    isFinished: isFinishing,
    isSafe: SAFE_STEPS.has(move.toStep) || isFinishing,
  };

  // If capture occurs, reset opponent pawn
  let capturedPlayerName: string | null = null;
  if (move.isCapture) {
    for (const otherPlayer of state.players) {
      if (otherPlayer.color !== currentPlayer.color) {
        for (const oppId of otherPlayer.pawnIds) {
          const oppPawn = nextPawns[oppId];
          if (oppPawn.isInPlay && oppPawn.stepIndex === move.toStep) {
            nextPawns[oppId] = {
              ...oppPawn,
              stepIndex: -1,
              isInPlay: false,
              isSafe: true,
            };
            capturedPlayerName = otherPlayer.name;
          }
        }
      }
    }
  }

  // Update finished counts and check winner
  const nextPlayers = state.players.map((p) => {
    if (p.color === currentPlayer.color) {
      const finished = p.pawnIds.filter((id) => nextPawns[id].isFinished).length;
      return { ...p, finishedCount: finished };
    }
    return p;
  });

  const winner = nextPlayers.find((p) => p.finishedCount === 4)?.color || null;

  // Turn management: extra turn granted if Grace throw OR Capture
  const getsExtraTurn = state.lastRoll.isGraceThrow || move.isCapture;
  const nextTurnIndex = getsExtraTurn || winner
    ? state.currentTurnIndex
    : (state.currentTurnIndex + 1) % state.players.length;

  const nextPhase: ChauparGamePhase = winner ? 'GAME_OVER' : 'WAITING_FOR_ROLL';

  const moveLog = isFinishing
    ? `✨ ${currentPlayer.name}'s pawn reached the divine Charkoni (Moksha)!`
    : move.isCapture
    ? `⚔️ ${currentPlayer.name} captured ${capturedPlayerName}'s pawn!`
    : `${currentPlayer.name} advanced pawn to step ${move.toStep}.`;

  return {
    ...state,
    players: nextPlayers,
    pawns: nextPawns,
    currentTurnIndex: nextTurnIndex,
    phase: nextPhase,
    validMoves: [],
    winner,
    history: [moveLog, ...state.history].slice(0, 40),
  };
}
