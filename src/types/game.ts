import { Player, PlayerAction, PlayerPosition } from './player';
import { Tile } from './tile';

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