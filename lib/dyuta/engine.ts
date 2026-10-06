export const DYUTA_RULESET_ID = 'open-throw-v1';
export const DYUTA_STATE_SCHEMA_VERSION = 3;
export const DYUTA_ROUND_COUNT = 5;

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type DyutaSide = 'player' | 'guide';
export type DyutaMode = 'solo' | 'pass_and_play';
export type DyutaPlayerNames = Record<DyutaSide, string>;
export type GuideDifficulty = 'easy' | 'medium' | 'hard';
export type DyutaAvatarId = 'sun' | 'moon' | 'star' | 'feather' | 'heart' | 'compass';
export type DyutaBoardColor = 'gold' | 'sage' | 'navy' | 'clay';
export type DyutaFaction = 'pandavas' | 'kauravas';
export type DyutaPlayerIdentity = {
  avatar: DyutaAvatarId;
  color: DyutaBoardColor;
  faction: DyutaFaction;
};
export type DyutaPhase = 'handoff' | 'awaiting_roll' | 'player_decision' | 'guide_decision' | 'complete';
export type DieIndex = 0 | 1;

export type DicePair = [DieValue, DieValue];

export type DyutaTurnRecord = {
  round: number;
  side: DyutaSide;
  initialDice: DicePair;
  finalDice: DicePair;
  rerolledIndex: DieIndex | null;
  points: number;
};

export type DyutaCurrentRoll = {
  initialDice: DicePair;
  finalDice: DicePair;
};

export type DyutaMatchState = {
  schemaVersion: typeof DYUTA_STATE_SCHEMA_VERSION;
  rulesetId: typeof DYUTA_RULESET_ID;
  mode: DyutaMode;
  playerNames: DyutaPlayerNames;
  guideDifficulty: GuideDifficulty;
  identities: Record<DyutaSide, DyutaPlayerIdentity>;
  round: number;
  activeSide: DyutaSide;
  phase: DyutaPhase;
  totals: Record<DyutaSide, number>;
  history: DyutaTurnRecord[];
  currentRoll: DyutaCurrentRoll | null;
};

export type MatchOutcome = 'player_win' | 'guide_win' | 'draw';

export function createDyutaMatch(
  guideDifficulty: GuideDifficulty = 'medium',
  mode: DyutaMode = 'solo',
  playerNames?: Partial<DyutaPlayerNames>,
  playerIdentity?: Partial<DyutaPlayerIdentity>,
  guideIdentity?: Partial<DyutaPlayerIdentity>,
): DyutaMatchState {
  const fallbackNames = mode === 'solo'
    ? { player: 'You', guide: 'Guide' }
    : { player: 'Player 1', guide: 'Player 2' };
  return {
    schemaVersion: DYUTA_STATE_SCHEMA_VERSION,
    rulesetId: DYUTA_RULESET_ID,
    mode,
    playerNames: {
      player: normalizePlayerName(playerNames?.player, fallbackNames.player),
      guide: normalizePlayerName(playerNames?.guide, fallbackNames.guide),
    },
    guideDifficulty,
    identities: {
      player: {
      avatar: playerIdentity?.avatar ?? 'sun',
        color: playerIdentity?.color ?? 'gold',
        faction: playerIdentity?.faction ?? 'pandavas',
      },
      guide: {
      avatar: guideIdentity?.avatar ?? (mode === 'solo' ? 'compass' : 'moon'),
        color: guideIdentity?.color ?? 'navy',
        faction: guideIdentity?.faction ?? (playerIdentity?.faction === 'kauravas' ? 'pandavas' : 'kauravas'),
      },
    },
    round: 1,
    activeSide: 'player',
    phase: mode === 'pass_and_play' ? 'handoff' : 'awaiting_roll',
    totals: { player: 0, guide: 0 },
    history: [],
    currentRoll: null,
  };
}

function normalizePlayerName(value: string | undefined, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
  return clean || fallback;
}

function isDieValue(value: unknown): value is DieValue {
  return Number.isInteger(value) && typeof value === 'number' && value >= 1 && value <= 6;
}

function validateDicePair(dice: readonly number[]): asserts dice is DicePair {
  if (!Array.isArray(dice) || dice.length !== 2 || !dice.every(isDieValue)) {
    throw new TypeError('A Dyuta throw must contain exactly two dice with values from 1 to 6.');
  }
}

function copyDice(dice: DicePair): DicePair {
  return [dice[0], dice[1]];
}

function assertPlayerDecision(state: DyutaMatchState): asserts state is DyutaMatchState & {
  phase: 'player_decision';
  activeSide: 'player';
  currentRoll: DyutaCurrentRoll;
} {
  if (
    state.phase !== 'player_decision' ||
    state.activeSide !== 'player' ||
    !state.currentRoll
  ) {
    throw new Error('A player decision is not available in the current game state.');
  }
}

function assertGuideRoll(state: DyutaMatchState): asserts state is DyutaMatchState & {
  phase: 'awaiting_roll';
  activeSide: 'guide';
  currentRoll: null;
} {
  if (state.mode !== 'solo' || state.phase !== 'awaiting_roll' || state.activeSide !== 'guide' || state.currentRoll !== null) {
    throw new Error('The guide cannot roll in the current game state.');
  }
}

export function rollForPlayer(state: DyutaMatchState, dice: DicePair): DyutaMatchState {
  if (state.activeSide !== 'player') throw new Error('The player cannot roll in the current game state.');
  return rollForSide(state, 'player', dice);
}

/** Starts a human turn. In solo mode only the player can use this; pass-and-play allows either seat. */
export function rollForSide(state: DyutaMatchState, side: DyutaSide, dice: DicePair): DyutaMatchState {
  if (state.mode === 'solo' && side !== 'player') throw new Error('The guide is controlled by the game in solo mode.');
  if (state.phase !== 'awaiting_roll' || state.activeSide !== side || state.currentRoll !== null) {
    throw new Error('This side cannot roll in the current game state.');
  }
  validateDicePair(dice);
  const stableDice = copyDice(dice);
  return {
    ...state,
    phase: side === 'player' ? 'player_decision' : 'guide_decision',
    currentRoll: { initialDice: stableDice, finalDice: copyDice(stableDice) },
  };
}

export function continueAfterHandoff(state: DyutaMatchState): DyutaMatchState {
  if (state.mode !== 'pass_and_play' || state.phase !== 'handoff' || state.currentRoll !== null) {
    throw new Error('There is no pass-and-play handoff to continue.');
  }
  return { ...state, phase: 'awaiting_roll' };
}

export function getGuideRerollIndex(dice: DicePair, difficulty: GuideDifficulty): DieIndex | null {
  validateDicePair(dice);
  const threshold = ({ easy: 1, medium: 2, hard: 3 } as const)[difficulty];
  const lowerIndex: DieIndex = dice[0] <= dice[1] ? 0 : 1;
  return dice[lowerIndex] <= threshold ? lowerIndex : null;
}

export function resolveGuideTurn(
  state: DyutaMatchState,
  initialDice: DicePair,
  rerollValue?: DieValue,
): DyutaMatchState {
  assertGuideRoll(state);
  validateDicePair(initialDice);

  const stableInitial = copyDice(initialDice);
  const rerolledIndex = getGuideRerollIndex(stableInitial, state.guideDifficulty);
  if (rerolledIndex === null && rerollValue !== undefined) {
    throw new Error('The guide has no reroll available for this throw.');
  }
  if (rerolledIndex !== null && !isDieValue(rerollValue)) {
    throw new Error('The guide must resolve its disclosed reroll.');
  }

  const finalDice = copyDice(stableInitial);
  if (rerolledIndex !== null) finalDice[rerolledIndex] = rerollValue as DieValue;
  return finishTurn(state, stableInitial, finalDice, rerolledIndex);
}

export function keepPlayerRoll(state: DyutaMatchState): DyutaMatchState {
  if (state.phase !== 'player_decision' || state.activeSide !== 'player') throw new Error('The player decision is not available to keep.');
  return keepCurrentRoll(state);
}

export function keepCurrentRoll(state: DyutaMatchState): DyutaMatchState {
  assertHumanDecision(state);
  return finishTurn(state, state.currentRoll.initialDice, state.currentRoll.finalDice, null);
}

export function rerollPlayerDie(
  state: DyutaMatchState,
  dieIndex: DieIndex,
  rerollValue: DieValue,
): DyutaMatchState {
  if (state.phase !== 'player_decision' || state.activeSide !== 'player') throw new Error('The player decision is not available to reroll.');
  return rerollCurrentDie(state, dieIndex, rerollValue);
}

export function rerollCurrentDie(
  state: DyutaMatchState,
  dieIndex: DieIndex,
  rerollValue: DieValue,
): DyutaMatchState {
  assertHumanDecision(state);
  if (dieIndex !== 0 && dieIndex !== 1) throw new RangeError('Choose one of the two dice to reroll.');
  if (!isDieValue(rerollValue)) throw new RangeError('A rerolled die must have a value from 1 to 6.');

  const finalDice = copyDice(state.currentRoll.finalDice);
  finalDice[dieIndex] = rerollValue;
  return finishTurn(state, state.currentRoll.initialDice, finalDice, dieIndex);
}

function assertHumanDecision(state: DyutaMatchState): asserts state is DyutaMatchState & {
  phase: 'player_decision' | 'guide_decision';
  currentRoll: DyutaCurrentRoll;
} {
  const isHumanDecision = (state.phase === 'player_decision' && state.activeSide === 'player')
    || (state.mode === 'pass_and_play' && state.phase === 'guide_decision' && state.activeSide === 'guide');
  if (!isHumanDecision || !state.currentRoll) {
    throw new Error('A player decision is not available in the current game state.');
  }
}

function finishTurn(
  state: DyutaMatchState,
  initialDice: DicePair,
  finalDice: DicePair,
  rerolledIndex: DieIndex | null,
): DyutaMatchState {
  const points = finalDice[0] + finalDice[1];
  const record: DyutaTurnRecord = {
    round: state.round,
    side: state.activeSide,
    initialDice: copyDice(initialDice),
    finalDice: copyDice(finalDice),
    rerolledIndex,
    points,
  };
  const history = [...state.history, record];
  const totals = { ...state.totals, [state.activeSide]: state.totals[state.activeSide] + points };

  if (history.length === DYUTA_ROUND_COUNT * 2) {
    return { ...state, phase: 'complete', totals, history, currentRoll: null };
  }

  const roundStarter = state.round % 2 === 1 ? 'player' : 'guide';
  const justPlayedFirst = state.activeSide === roundStarter;
  if (justPlayedFirst) {
    return {
      ...state,
      activeSide: state.activeSide === 'player' ? 'guide' : 'player',
      phase: state.mode === 'pass_and_play' ? 'handoff' : 'awaiting_roll',
      totals,
      history,
      currentRoll: null,
    };
  }

  const nextRound = state.round + 1;
  return {
    ...state,
    round: nextRound,
    activeSide: nextRound % 2 === 1 ? 'player' : 'guide',
    phase: state.mode === 'pass_and_play' ? 'handoff' : 'awaiting_roll',
    totals,
    history,
    currentRoll: null,
  };
}

export function getMatchOutcome(state: DyutaMatchState): MatchOutcome | null {
  if (state.phase !== 'complete') return null;
  if (state.totals.player === state.totals.guide) return 'draw';
  return state.totals.player > state.totals.guide ? 'player_win' : 'guide_win';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDicePair(value: unknown): value is DicePair {
  return Array.isArray(value) && value.length === 2 && value.every(isDieValue);
}

function isTurnRecord(value: unknown, guideDifficulty: GuideDifficulty, mode: DyutaMode): value is DyutaTurnRecord {
  if (!isRecord(value)) return false;
  const { round, side, initialDice, finalDice, rerolledIndex, points } = value;
  return Number.isInteger(round)
    && typeof round === 'number'
    && round >= 1
    && round <= DYUTA_ROUND_COUNT
    && (side === 'player' || side === 'guide')
    && isDicePair(initialDice)
    && isDicePair(finalDice)
    && (rerolledIndex === null || rerolledIndex === 0 || rerolledIndex === 1)
    && Number.isInteger(points)
    && points === finalDice[0] + finalDice[1]
    && (mode === 'pass_and_play' || side !== 'guide' || rerolledIndex === getGuideRerollIndex(initialDice as DicePair, guideDifficulty));
}

/** Strictly validates local save data before it is rendered or resumed. */
export function isDyutaMatchState(value: unknown): value is DyutaMatchState {
  if (!isRecord(value)) return false;
  if (
    value.schemaVersion !== DYUTA_STATE_SCHEMA_VERSION ||
    value.rulesetId !== DYUTA_RULESET_ID ||
    (value.mode !== 'solo' && value.mode !== 'pass_and_play') ||
    !isRecord(value.playerNames) ||
    typeof value.playerNames.player !== 'string' || value.playerNames.player.trim().length === 0 || value.playerNames.player.length > 24 ||
    typeof value.playerNames.guide !== 'string' || value.playerNames.guide.trim().length === 0 || value.playerNames.guide.length > 24 ||
    (value.guideDifficulty !== 'easy' && value.guideDifficulty !== 'medium' && value.guideDifficulty !== 'hard') ||
    !isRecord(value.identities) ||
    !Number.isInteger(value.round) ||
    typeof value.round !== 'number' ||
    value.round < 1 ||
    value.round > DYUTA_ROUND_COUNT ||
    (value.activeSide !== 'player' && value.activeSide !== 'guide') ||
    (value.phase !== 'handoff' && value.phase !== 'awaiting_roll' && value.phase !== 'player_decision' && value.phase !== 'guide_decision' && value.phase !== 'complete') ||
    !isRecord(value.totals) ||
    !Number.isInteger(value.totals.player) ||
    !Number.isInteger(value.totals.guide) ||
    !Array.isArray(value.history) ||
    value.history.length > DYUTA_ROUND_COUNT * 2
  ) return false;

  const identities = value.identities as Record<string, unknown>;
  for (const side of ['player', 'guide'] as const) {
    const identity = identities[side];
    if (!isRecord(identity)
      || !['sun', 'moon', 'star', 'feather', 'heart', 'compass'].includes(String(identity.avatar))
      || !['gold', 'sage', 'navy', 'clay'].includes(String(identity.color))
      || !['pandavas', 'kauravas'].includes(String(identity.faction))) return false;
  }
  const playerIdentity = identities.player as Record<string, unknown>;
  const guideIdentity = identities.guide as Record<string, unknown>;
  if (playerIdentity.faction === guideIdentity.faction) return false;

  const history = value.history;
  if (!history.every((record) => isTurnRecord(record, value.guideDifficulty as GuideDifficulty, value.mode as DyutaMode))) return false;
  let playerTotal = 0;
  let guideTotal = 0;
  for (let index = 0; index < history.length; index += 1) {
    const record = history[index];
    const round = Math.floor(index / 2) + 1;
    const firstSide = round % 2 === 1 ? 'player' : 'guide';
    const expectedSide = index % 2 === 0 ? firstSide : firstSide === 'player' ? 'guide' : 'player';
    if (record.round !== round || record.side !== expectedSide) return false;
    if (record.rerolledIndex === null && (record.initialDice[0] !== record.finalDice[0] || record.initialDice[1] !== record.finalDice[1])) return false;
    if (record.rerolledIndex === 0 && record.initialDice[1] !== record.finalDice[1]) return false;
    if (record.rerolledIndex === 1 && record.initialDice[0] !== record.finalDice[0]) return false;
    if (record.side === 'player') playerTotal += record.points;
    else guideTotal += record.points;
  }
  if (value.totals.player !== playerTotal || value.totals.guide !== guideTotal) return false;

  const isComplete = history.length === DYUTA_ROUND_COUNT * 2;
  if (isComplete) {
    return value.phase === 'complete'
      && value.round === DYUTA_ROUND_COUNT
      && value.activeSide === 'guide'
      && value.currentRoll === null;
  }
  if (value.phase === 'complete') return false;

  const nextRound = Math.floor(history.length / 2) + 1;
  const roundFirstSide = nextRound % 2 === 1 ? 'player' : 'guide';
  const expectedSide = history.length % 2 === 0
    ? roundFirstSide
    : roundFirstSide === 'player' ? 'guide' : 'player';
  if (value.round !== nextRound || value.activeSide !== expectedSide) return false;

  if (value.phase === 'player_decision') {
    return value.activeSide === 'player'
      && isRecord(value.currentRoll)
      && isDicePair(value.currentRoll.initialDice)
      && isDicePair(value.currentRoll.finalDice)
      && value.currentRoll.initialDice[0] === value.currentRoll.finalDice[0]
      && value.currentRoll.initialDice[1] === value.currentRoll.finalDice[1];
  }
  if (value.phase === 'guide_decision') {
    return value.mode === 'pass_and_play'
      && value.activeSide === 'guide'
      && isRecord(value.currentRoll)
      && isDicePair(value.currentRoll.initialDice)
      && isDicePair(value.currentRoll.finalDice)
      && value.currentRoll.initialDice[0] === value.currentRoll.finalDice[0]
      && value.currentRoll.initialDice[1] === value.currentRoll.finalDice[1];
  }
  if (value.phase === 'handoff') {
    return value.mode === 'pass_and_play' && value.currentRoll === null;
  }
  return value.currentRoll === null;
}
