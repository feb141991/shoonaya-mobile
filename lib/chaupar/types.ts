export type ChauparColor = 'red' | 'yellow' | 'green' | 'blue';

export type ChauparPlayerType = 'human' | 'ai';

export interface ChauparPlayer {
  id: string;
  name: string;
  color: ChauparColor;
  type: ChauparPlayerType;
  pawnIds: string[];
  finishedCount: number;
}

export interface ChauparPawn {
  id: string;
  color: ChauparColor;
  // Position index along the player's path:
  // -1 = Not yet in play (at starting camp)
  // 0 to 83 = Path cells
  // 84 = Charkoni (Center / Finished)
  stepIndex: number;
  isFinished: boolean;
  isInPlay: boolean;
  isSafe: boolean;
}

export interface ChauparDiceRoll {
  // 6 cowries: true = mouth up, false = mouth down
  cowries: boolean[];
  value: number;
  isGraceThrow: boolean;
  sanskritLabel: string;
  englishLabel: string;
}

export type ChauparGamePhase =
  | 'WAITING_FOR_ROLL'
  | 'WAITING_FOR_MOVE'
  | 'GAME_OVER';

export interface ChauparMoveOption {
  pawnId: string;
  fromStep: number;
  toStep: number;
  isCapture: boolean;
  isFinishing: boolean;
}

export interface ChauparGameState {
  players: ChauparPlayer[];
  currentTurnIndex: number;
  phase: ChauparGamePhase;
  lastRoll: ChauparDiceRoll | null;
  validMoves: ChauparMoveOption[];
  pawns: Record<string, ChauparPawn>;
  winner: ChauparColor | null;
  history: string[];
}
