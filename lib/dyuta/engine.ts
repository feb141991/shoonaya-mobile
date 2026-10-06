export const DYUTA_RULESET_ID = 'dyuta-sabha-bluff-v1';
export const DYUTA_STATE_SCHEMA_VERSION = 4;
export const DYUTA_ROUND_COUNT = 7;
export const DYUTA_STARTING_SEALS = 7;

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type DicePair = [DieValue, DieValue];
export type DieIndex = 0 | 1;
export type DyutaSide = 'player' | 'guide';
export type DyutaMode = 'solo' | 'pass_and_play';
export type GuideDifficulty = 'easy' | 'medium' | 'hard';
export type DyutaAvatarId = 'sun' | 'moon' | 'star' | 'feather' | 'heart' | 'compass';
export type DyutaBoardColor = 'gold' | 'sage' | 'navy' | 'clay';
export type DyutaFaction = 'pandavas' | 'kauravas';
export type DyutaStake = 1 | 2 | 3;
export type DyutaResponse = 'accept' | 'yield';
export type DyutaPhase = 'handoff' | 'awaiting_challenger_roll' | 'challenger_decision' | 'awaiting_declaration' | 'awaiting_response' | 'awaiting_responder_roll' | 'responder_decision' | 'complete';
export type PlayableDyutaPhase = Exclude<DyutaPhase, 'handoff' | 'complete'>;
export type DyutaPlayerNames = Record<DyutaSide, string>;
export type DyutaPlayerIdentity = { avatar: DyutaAvatarId; color: DyutaBoardColor; faction: DyutaFaction };
export type DyutaRoll = { initialDice: DicePair; finalDice: DicePair; rerolledIndex: DieIndex | null };
export type DyutaRoundRecord = {
  round: number;
  challenger: DyutaSide;
  responder: DyutaSide;
  declaredStake: DyutaStake;
  response: DyutaResponse;
  challengerRoll: DyutaRoll;
  responderRoll: DyutaRoll | null;
  winner: DyutaSide | 'draw';
  sealsTransferred: number;
  overreach: boolean;
};
export type DyutaMatchState = {
  schemaVersion: typeof DYUTA_STATE_SCHEMA_VERSION;
  rulesetId: typeof DYUTA_RULESET_ID;
  mode: DyutaMode;
  playerNames: DyutaPlayerNames;
  guideDifficulty: GuideDifficulty;
  identities: Record<DyutaSide, DyutaPlayerIdentity>;
  round: number;
  challenger: DyutaSide;
  activeSide: DyutaSide;
  phase: DyutaPhase;
  pendingPhase: PlayableDyutaPhase | null;
  seals: Record<DyutaSide, number>;
  history: DyutaRoundRecord[];
  challengerRoll: DyutaRoll | null;
  responderRoll: DyutaRoll | null;
  declaredStake: DyutaStake | null;
};
export type MatchOutcome = 'player_win' | 'guide_win' | 'draw';
export type DyutaPublicResponseState = { round: number; declaredStake: DyutaStake; responderSeals: number; challengerSeals: number; roundsRemaining: number };

export function createDyutaMatch(
  guideDifficulty: GuideDifficulty = 'medium',
  mode: DyutaMode = 'solo',
  playerNames?: Partial<DyutaPlayerNames>,
  playerIdentity?: Partial<DyutaPlayerIdentity>,
  guideIdentity?: Partial<DyutaPlayerIdentity>,
): DyutaMatchState {
  const fallbackNames = mode === 'solo' ? { player: 'You', guide: 'Guide' } : { player: 'Player 1', guide: 'Player 2' };
  return {
    schemaVersion: DYUTA_STATE_SCHEMA_VERSION,
    rulesetId: DYUTA_RULESET_ID,
    mode,
    playerNames: { player: normalizePlayerName(playerNames?.player, fallbackNames.player), guide: normalizePlayerName(playerNames?.guide, fallbackNames.guide) },
    guideDifficulty,
    identities: {
      player: { avatar: playerIdentity?.avatar ?? 'sun', color: playerIdentity?.color ?? 'gold', faction: playerIdentity?.faction ?? 'pandavas' },
      guide: { avatar: guideIdentity?.avatar ?? (mode === 'solo' ? 'compass' : 'moon'), color: guideIdentity?.color ?? 'navy', faction: guideIdentity?.faction ?? (playerIdentity?.faction === 'kauravas' ? 'pandavas' : 'kauravas') },
    },
    round: 1,
    challenger: 'player',
    activeSide: 'player',
    phase: mode === 'pass_and_play' ? 'handoff' : 'awaiting_challenger_roll',
    pendingPhase: mode === 'pass_and_play' ? 'awaiting_challenger_roll' : null,
    seals: { player: DYUTA_STARTING_SEALS, guide: DYUTA_STARTING_SEALS },
    history: [],
    challengerRoll: null,
    responderRoll: null,
    declaredStake: null,
  };
}

export function continueAfterHandoff(state: DyutaMatchState): DyutaMatchState {
  if (state.mode !== 'pass_and_play' || state.phase !== 'handoff' || !state.pendingPhase) throw new Error('There is no pass-and-play handoff to continue.');
  return { ...state, phase: state.pendingPhase, pendingPhase: null };
}

export function rollForSide(state: DyutaMatchState, side: DyutaSide, dice: DicePair): DyutaMatchState {
  validateDicePair(dice);
  if (state.activeSide !== side) throw new Error('This side cannot roll in the current game state.');
  const challengerTurn = state.phase === 'awaiting_challenger_roll' && side === state.challenger;
  const responderTurn = state.phase === 'awaiting_responder_roll' && side !== state.challenger;
  if (!challengerTurn && !responderTurn) throw new Error('This side cannot roll in the current game state.');
  const roll: DyutaRoll = { initialDice: copyDice(dice), finalDice: copyDice(dice), rerolledIndex: null };
  return challengerTurn ? { ...state, challengerRoll: roll, phase: 'challenger_decision' } : { ...state, responderRoll: roll, phase: 'responder_decision' };
}

export function keepCurrentRoll(state: DyutaMatchState): DyutaMatchState {
  if (state.phase === 'challenger_decision' && state.challengerRoll) return { ...state, phase: 'awaiting_declaration' };
  if (state.phase === 'responder_decision' && state.responderRoll) return resolveAcceptedRound(state);
  throw new Error('A dice decision is not available in the current game state.');
}

export function rerollCurrentDie(state: DyutaMatchState, dieIndex: DieIndex, rerollValue: DieValue): DyutaMatchState {
  if (dieIndex !== 0 && dieIndex !== 1) throw new RangeError('Choose one of the two dice to reroll.');
  if (!isDieValue(rerollValue)) throw new RangeError('A rerolled die must have a value from 1 to 6.');
  const source = state.phase === 'challenger_decision' ? state.challengerRoll : state.phase === 'responder_decision' ? state.responderRoll : null;
  if (!source || source.rerolledIndex !== null) throw new Error('A dice decision is not available in the current game state.');
  const finalDice = copyDice(source.finalDice);
  finalDice[dieIndex] = rerollValue;
  const roll: DyutaRoll = { ...source, finalDice, rerolledIndex: dieIndex };
  return state.phase === 'challenger_decision' ? { ...state, challengerRoll: roll, phase: 'awaiting_declaration' } : resolveAcceptedRound({ ...state, responderRoll: roll });
}

export function declareStake(state: DyutaMatchState, side: DyutaSide, stake: DyutaStake): DyutaMatchState {
  if (state.phase !== 'awaiting_declaration' || state.challenger !== side || state.activeSide !== side || !state.challengerRoll) throw new Error('A stake cannot be declared in the current game state.');
  if (!isStake(stake) || stake > maxAvailableStake(state)) throw new RangeError('Choose an available stake from one to three seals.');
  const responder = otherSide(side);
  return privateTransition({ ...state, declaredStake: stake, activeSide: responder }, 'awaiting_response', responder);
}

export function respondToStake(state: DyutaMatchState, side: DyutaSide, response: DyutaResponse): DyutaMatchState {
  if (state.phase !== 'awaiting_response' || state.activeSide !== side || side === state.challenger || !state.declaredStake || !state.challengerRoll) throw new Error('The declaration cannot be answered in the current game state.');
  if (response === 'yield') return resolveYieldedRound(state);
  if (response !== 'accept') throw new RangeError('Choose accept or yield.');
  return privateTransition(state, 'awaiting_responder_roll', side);
}

export function getGuideRerollIndex(dice: DicePair, difficulty: GuideDifficulty): DieIndex | null {
  validateDicePair(dice);
  const threshold = ({ easy: 1, medium: 2, hard: 3 } as const)[difficulty];
  const lowerIndex: DieIndex = dice[0] <= dice[1] ? 0 : 1;
  return dice[lowerIndex] <= threshold ? lowerIndex : null;
}

export function chooseGuideStake(state: DyutaMatchState): DyutaStake {
  if (state.challenger !== 'guide' || state.phase !== 'awaiting_declaration' || !state.challengerRoll) throw new Error('The Guide cannot declare in the current game state.');
  const total = sumDice(state.challengerRoll.finalDice);
  const desired = state.guideDifficulty === 'easy' ? (total >= 9 ? 2 : 1)
    : state.guideDifficulty === 'medium' ? (total >= 10 ? 3 : total >= 7 ? 2 : 1)
      : (total >= 9 ? 3 : total <= 5 && state.round % 2 === 0 ? 3 : 2);
  return Math.min(desired, maxAvailableStake(state)) as DyutaStake;
}

/** This policy accepts only public information, preventing access to the concealed throw. */
export function shouldGuideAccept(view: DyutaPublicResponseState, difficulty: GuideDifficulty): boolean {
  const pressure = view.roundsRemaining <= 2 && view.responderSeals < view.challengerSeals;
  if (difficulty === 'easy') return view.declaredStake === 1;
  if (difficulty === 'medium') return view.declaredStake <= 2 || pressure;
  return view.declaredStake <= 2 || pressure || view.responderSeals >= view.declaredStake + 2;
}

export function getPublicResponseState(state: DyutaMatchState): DyutaPublicResponseState {
  if (state.phase !== 'awaiting_response' || !state.declaredStake) throw new Error('No public declaration is available.');
  return { round: state.round, declaredStake: state.declaredStake, responderSeals: state.seals[state.activeSide], challengerSeals: state.seals[state.challenger], roundsRemaining: DYUTA_ROUND_COUNT - state.round + 1 };
}

/**
 * Dice the current device may show. Concealed throws stay hidden through
 * handoffs and responses, and a solo Guide's throw is never shown before the
 * round is revealed in history.
 */
export function getVisibleDice(state: DyutaMatchState | null): DicePair | null {
  if (!state || state.phase === 'handoff' || state.phase === 'awaiting_response' || state.phase === 'complete') return null;
  if (state.mode === 'solo' && state.activeSide === 'guide') return null;
  if (state.activeSide === state.challenger) return state.challengerRoll?.finalDice ?? null;
  return state.responderRoll?.finalDice ?? null;
}

/**
 * The side whose controls this device may show right now: either seat in
 * pass-and-play, only the player in solo (the Guide acts on its own), and
 * nobody during a handoff or after the match.
 */
export function getHumanTurnSide(state: DyutaMatchState | null): DyutaSide | null {
  if (!state || state.phase === 'handoff' || state.phase === 'complete') return null;
  return state.mode === 'pass_and_play' || state.activeSide === 'player' ? state.activeSide : null;
}

export function maxAvailableStake(state: DyutaMatchState): DyutaStake {
  return Math.max(1, Math.min(3, state.seals.player, state.seals.guide)) as DyutaStake;
}

export function getMatchOutcome(state: DyutaMatchState): MatchOutcome | null {
  if (state.phase !== 'complete') return null;
  if (state.seals.player === state.seals.guide) return 'draw';
  return state.seals.player > state.seals.guide ? 'player_win' : 'guide_win';
}

function resolveYieldedRound(state: DyutaMatchState): DyutaMatchState {
  const responder = otherSide(state.challenger);
  const seals = transferSeals(state.seals, responder, state.challenger, 1);
  return finishRound(state, seals, { round: state.round, challenger: state.challenger, responder, declaredStake: state.declaredStake as DyutaStake, response: 'yield', challengerRoll: state.challengerRoll as DyutaRoll, responderRoll: null, winner: state.challenger, sealsTransferred: 1, overreach: false });
}

function resolveAcceptedRound(state: DyutaMatchState): DyutaMatchState {
  if (!state.challengerRoll || !state.responderRoll || !state.declaredStake) throw new Error('Both accepted throws are required.');
  const responder = otherSide(state.challenger);
  const challengerTotal = sumDice(state.challengerRoll.finalDice);
  const responderTotal = sumDice(state.responderRoll.finalDice);
  const winner: DyutaSide | 'draw' = challengerTotal === responderTotal ? 'draw' : challengerTotal > responderTotal ? state.challenger : responder;
  const seals = winner === 'draw' ? state.seals : transferSeals(state.seals, otherSide(winner), winner, state.declaredStake);
  return finishRound(state, seals, { round: state.round, challenger: state.challenger, responder, declaredStake: state.declaredStake, response: 'accept', challengerRoll: state.challengerRoll, responderRoll: state.responderRoll, winner, sealsTransferred: winner === 'draw' ? 0 : state.declaredStake, overreach: state.declaredStake === 3 && winner !== 'draw' && winner !== state.challenger });
}

function finishRound(state: DyutaMatchState, seals: Record<DyutaSide, number>, record: DyutaRoundRecord): DyutaMatchState {
  const history = [...state.history, record];
  if (history.length === DYUTA_ROUND_COUNT || seals.player === 0 || seals.guide === 0) return { ...state, seals, history, phase: 'complete', pendingPhase: null, challengerRoll: null, responderRoll: null, declaredStake: null };
  const round = state.round + 1;
  const challenger: DyutaSide = round % 2 === 1 ? 'player' : 'guide';
  return privateTransition({ ...state, seals, history, round, challenger, challengerRoll: null, responderRoll: null, declaredStake: null }, 'awaiting_challenger_roll', challenger);
}

function privateTransition(state: DyutaMatchState, phase: PlayableDyutaPhase, side: DyutaSide): DyutaMatchState {
  return state.mode === 'pass_and_play' ? { ...state, activeSide: side, phase: 'handoff', pendingPhase: phase } : { ...state, activeSide: side, phase, pendingPhase: null };
}

function transferSeals(seals: Record<DyutaSide, number>, from: DyutaSide, to: DyutaSide, requested: number): Record<DyutaSide, number> {
  const amount = Math.min(requested, seals[from]);
  return { ...seals, [from]: seals[from] - amount, [to]: seals[to] + amount };
}
function normalizePlayerName(value: string | undefined, fallback: string): string { if (typeof value !== 'string') return fallback; const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24); return clean || fallback; }
function otherSide(side: DyutaSide): DyutaSide { return side === 'player' ? 'guide' : 'player'; }
function sumDice(dice: DicePair): number { return dice[0] + dice[1]; }
function copyDice(dice: DicePair): DicePair { return [dice[0], dice[1]]; }
function isDieValue(value: unknown): value is DieValue { return Number.isInteger(value) && typeof value === 'number' && value >= 1 && value <= 6; }
function isStake(value: unknown): value is DyutaStake { return value === 1 || value === 2 || value === 3; }
function validateDicePair(dice: readonly number[]): asserts dice is DicePair { if (!Array.isArray(dice) || dice.length !== 2 || !dice.every(isDieValue)) throw new TypeError('A Dyuta throw must contain exactly two dice with values from 1 to 6.'); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isDicePair(value: unknown): value is DicePair { return Array.isArray(value) && value.length === 2 && value.every(isDieValue); }
function isRoll(value: unknown): value is DyutaRoll {
  if (!isRecord(value) || !isDicePair(value.initialDice) || !isDicePair(value.finalDice)) return false;
  const { initialDice, finalDice, rerolledIndex } = value;
  // A kept throw is unchanged; a reroll changes at most the chosen die.
  if (rerolledIndex === null) return initialDice[0] === finalDice[0] && initialDice[1] === finalDice[1];
  if (rerolledIndex !== 0 && rerolledIndex !== 1) return false;
  const untouched = rerolledIndex === 0 ? 1 : 0;
  return initialDice[untouched] === finalDice[untouched];
}

/** Strict validation for local saves. Pre-bluff saves are retired instead of being misrepresented under this new contract. */
export function isDyutaMatchState(value: unknown): value is DyutaMatchState {
  if (!isRecord(value) || value.schemaVersion !== DYUTA_STATE_SCHEMA_VERSION || value.rulesetId !== DYUTA_RULESET_ID) return false;
  if (value.mode !== 'solo' && value.mode !== 'pass_and_play') return false;
  if (!isRecord(value.playerNames) || typeof value.playerNames.player !== 'string' || typeof value.playerNames.guide !== 'string') return false;
  if (!['easy', 'medium', 'hard'].includes(String(value.guideDifficulty)) || !isRecord(value.identities) || !isRecord(value.seals) || !Array.isArray(value.history)) return false;
  if (!Number.isInteger(value.round) || typeof value.round !== 'number' || value.round < 1 || value.round > DYUTA_ROUND_COUNT) return false;
  if (!['player', 'guide'].includes(String(value.challenger)) || !['player', 'guide'].includes(String(value.activeSide))) return false;
  const phases: DyutaPhase[] = ['handoff', 'awaiting_challenger_roll', 'challenger_decision', 'awaiting_declaration', 'awaiting_response', 'awaiting_responder_roll', 'responder_decision', 'complete'];
  if (!phases.includes(value.phase as DyutaPhase)) return false;
  const playerSeals = value.seals.player;
  const guideSeals = value.seals.guide;
  if (typeof playerSeals !== 'number' || typeof guideSeals !== 'number' || !Number.isInteger(playerSeals) || !Number.isInteger(guideSeals) || playerSeals < 0 || guideSeals < 0 || playerSeals + guideSeals !== DYUTA_STARTING_SEALS * 2) return false;
  const identities = value.identities as Record<string, unknown>;
  for (const side of ['player', 'guide'] as const) { const identity = identities[side]; if (!isRecord(identity) || !['sun', 'moon', 'star', 'feather', 'heart', 'compass'].includes(String(identity.avatar)) || !['gold', 'sage', 'navy', 'clay'].includes(String(identity.color)) || !['pandavas', 'kauravas'].includes(String(identity.faction))) return false; }
  if ((identities.player as Record<string, unknown>).faction === (identities.guide as Record<string, unknown>).faction) return false;
  if (value.challengerRoll !== null && !isRoll(value.challengerRoll)) return false;
  if (value.responderRoll !== null && !isRoll(value.responderRoll)) return false;
  if (value.declaredStake !== null && !isStake(value.declaredStake)) return false;
  const playablePhases: PlayableDyutaPhase[] = ['awaiting_challenger_roll', 'challenger_decision', 'awaiting_declaration', 'awaiting_response', 'awaiting_responder_roll', 'responder_decision'];
  if (value.phase === 'handoff' ? value.mode !== 'pass_and_play' || !playablePhases.includes(value.pendingPhase as PlayableDyutaPhase) : value.pendingPhase !== null) return false;
  if (value.phase !== 'complete' && !hasPhaseInvariants(value as DyutaMatchState)) return false;
  if (value.phase === 'complete' && (value.challengerRoll !== null || value.responderRoll !== null || value.declaredStake !== null)) return false;
  if (value.history.length > DYUTA_ROUND_COUNT) return false;
  for (let index = 0; index < value.history.length; index += 1) { const record = value.history[index]; if (!isRecord(record) || record.round !== index + 1 || record.challenger !== (index % 2 === 0 ? 'player' : 'guide') || !isStake(record.declaredStake) || !isRoll(record.challengerRoll) || (record.response !== 'accept' && record.response !== 'yield')) return false; if (record.response === 'accept' && !isRoll(record.responderRoll)) return false; if (record.response === 'yield' && record.responderRoll !== null) return false; }
  if (value.phase === 'complete') return value.history.length > 0 && (value.history.length === DYUTA_ROUND_COUNT || value.seals.player === 0 || value.seals.guide === 0);
  return value.history.length === value.round - 1;
}

/** Each phase requires exactly the throws and declaration the next legal action reads. */
function hasPhaseInvariants(state: DyutaMatchState): boolean {
  const phase = state.phase === 'handoff' ? state.pendingPhase : state.phase;
  if (!phase) return false;
  if (state.challenger !== (state.round % 2 === 1 ? 'player' : 'guide')) return false;
  if (state.seals.player === 0 || state.seals.guide === 0) return false;
  const responder = otherSide(state.challenger);
  const { challengerRoll, responderRoll, declaredStake } = state;
  if (declaredStake !== null && declaredStake > maxAvailableStake(state)) return false;
  switch (phase) {
    case 'awaiting_challenger_roll':
      return state.activeSide === state.challenger && !challengerRoll && !responderRoll && declaredStake === null;
    case 'challenger_decision':
      return state.activeSide === state.challenger && !!challengerRoll && challengerRoll.rerolledIndex === null && !responderRoll && declaredStake === null;
    case 'awaiting_declaration':
      return state.activeSide === state.challenger && !!challengerRoll && !responderRoll && declaredStake === null;
    case 'awaiting_response':
    case 'awaiting_responder_roll':
      return state.activeSide === responder && !!challengerRoll && !responderRoll && declaredStake !== null;
    case 'responder_decision':
      return state.activeSide === responder && !!challengerRoll && !!responderRoll && responderRoll.rerolledIndex === null && declaredStake !== null;
    default:
      return false;
  }
}
