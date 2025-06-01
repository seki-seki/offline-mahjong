import { Player, PlayerAction, PlayerPosition } from './player';
import { Tile } from './tile';

// Types from the game management branch
export type GamePhase = 
  | 'waiting'
  | 'dealing'
  | 'playing'
  | 'action-waiting'
  | 'finished';

export type EndCondition = 
  | 'win'
  | 'draw'
  | 'aborted';

export interface GameState {
  id: string;
  phase: GamePhase;
  round: number;
  honba: number;
  riichiBets: number;
  currentPlayerIndex: number;
  currentTurnStartTime: number;
  players: Player[];
  wall: Tile[];
  dora: Tile[];
  uraDora: Tile[];
  deadWall: Tile[];
  lastDiscardedTile?: Tile;
  lastDiscardedBy?: string;
  pendingActions: PendingAction[];
  endCondition?: EndCondition;
  winner?: string;
  turnTimeLimit: number;
  // Additional fields for P2P synchronization
  currentTurn: number;
  currentPlayer?: string;
  wallTiles?: Tile[];
  drawnTile?: Tile;
  doraIndicators?: Tile[];
  actionHistory?: GameAction[];
  lastActionTime?: number;
}

export interface PendingAction {
  playerId: string;
  availableActions: PlayerAction[];
  deadline: number;
  priority: number;
}

export interface GameConfig {
  turnTimeLimit: number;
  actionTimeLimit: number;
  enableRedDora: boolean;
  startingPoints: number;
  minPoints: number;
}

export interface GameEvent {
  type: string;
  playerId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  turnTimeLimit: 30000,
  actionTimeLimit: 10000,
  enableRedDora: true,
  startingPoints: 25000,
  minPoints: 0
};

export const ACTION_PRIORITY: Record<PlayerAction, number> = {
  'ron': 100,
  'tsumo-win': 100,
  'kan': 50,
  'pon': 40,
  'chi': 30,
  'tsumo': 20,
  'discard': 10,
  'pass': 0
};

export function getNextPlayerIndex(currentIndex: number, skipCount: number = 1): number {
  return (currentIndex + skipCount) % 4;
}

export function getPlayerByPosition(players: Player[], position: PlayerPosition): Player | undefined {
  return players.find(p => p.position === position);
}

// Types from the main branch (crypto/verification features)
export type PlayerID = string;

export enum ActionType {
  GAME_START = 'GAME_START',
  SHUFFLE = 'SHUFFLE',
  DRAW = 'DRAW',
  DISCARD = 'DISCARD',
  PON = 'PON',
  CHI = 'CHI',
  KAN = 'KAN',
  RIICHI = 'RIICHI',
  WIN = 'WIN',
  DECRYPT_PROOF = 'DECRYPT_PROOF'
}

export interface GameAction {
  id: string;
  type: ActionType;
  playerId: PlayerID;
  timestamp: number;
  data: unknown;
  signature?: string;
}

export interface GameStartAction extends GameAction {
  type: ActionType.GAME_START;
  data: {
    players: PlayerID[];
    seed?: string;
  };
}

export interface ShuffleAction extends GameAction {
  type: ActionType.SHUFFLE;
  data: {
    shuffledTiles: string[]; // Encrypted tiles
    proof?: string;
  };
}

export interface DrawAction extends GameAction {
  type: ActionType.DRAW;
  data: {
    tileIndex: number;
    encryptedTile: string;
  };
}

export interface DiscardAction extends GameAction {
  type: ActionType.DISCARD;
  data: {
    tileIndex: number;
    tile: string;
  };
}

export interface PonAction extends GameAction {
  type: ActionType.PON;
  data: {
    targetPlayerId: PlayerID;
    discardedTile: string;
    handTiles: number[]; // Indices of tiles in hand
  };
}

export interface ChiAction extends GameAction {
  type: ActionType.CHI;
  data: {
    targetPlayerId: PlayerID;
    discardedTile: string;
    handTiles: number[]; // Indices of tiles in hand
  };
}

export interface KanAction extends GameAction {
  type: ActionType.KAN;
  data: {
    type: 'closed' | 'open' | 'added';
    tiles: number[] | string[]; // Indices for closed, tiles for open/added
    targetPlayerId?: PlayerID; // For open kan
  };
}

export interface RiichiAction extends GameAction {
  type: ActionType.RIICHI;
  data: {
    discardTileIndex: number;
  };
}

export interface WinAction extends GameAction {
  type: ActionType.WIN;
  data: {
    winType: 'tsumo' | 'ron';
    targetPlayerId?: PlayerID; // For ron
    handTiles: string[];
    winTile: string;
    score: number;
  };
}

export interface DecryptProofAction extends GameAction {
  type: ActionType.DECRYPT_PROOF;
  data: {
    tileIndex: number;
    decryptedTile: string;
    proof: string;
  };
}

export type SpecificGameAction = 
  | GameStartAction
  | ShuffleAction
  | DrawAction
  | DiscardAction
  | PonAction
  | ChiAction
  | KanAction
  | RiichiAction
  | WinAction
  | DecryptProofAction;