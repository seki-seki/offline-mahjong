import { Tile } from './tile';

export type PlayerPosition = 'east' | 'south' | 'west' | 'north';

export type PlayerAction = 
  | 'tsumo' 
  | 'discard' 
  | 'pon' 
  | 'chi' 
  | 'kan' 
  | 'ron' 
  | 'tsumo-win'
  | 'pass';

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  riichi: boolean;
  points: number;
  connectionId?: string;
}

export interface Meld {
  type: 'pon' | 'chi' | 'kan' | 'ankan';
  tiles: Tile[];
  source: string;
}

export interface ActionRequest {
  playerId: string;
  action: PlayerAction;
  tile?: Tile;
  tiles?: Tile[];
  targetTile?: Tile;
}

export interface ActionResponse {
  valid: boolean;
  error?: string;
}