export type TileSuit = 'man' | 'pin' | 'sou' | 'honor';
export type TileValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HonorType = 'E' | 'S' | 'W' | 'N' | 'haku' | 'hatsu' | 'chun';

export interface Tile {
  id: string;
  suit: TileSuit;
  value?: TileValue;
  honor?: HonorType;
  dora?: boolean;
  red?: boolean;
}

export type Wind = 'E' | 'S' | 'W' | 'N';

export interface Player {
  id: string;
  name: string;
  seat: Wind;
  score: number;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  riichi: boolean;
}

export interface Meld {
  tiles: Tile[];
  type: 'pon' | 'chi' | 'kan' | 'ankan';
  from?: Wind;
}

export type GamePhase = 'waiting' | 'playing' | 'ended';
export type TurnPhase = 'draw' | 'discard' | 'action';

export interface RoundInfo {
  wind: Wind;
  number: number;
}

export interface GameState {
  phase: GamePhase;
  round: RoundInfo;
  dealer: Wind;
  currentTurn: Wind;
  turnPhase: TurnPhase;
  remainingTiles: number;
  dora: Tile[];
  uraDora?: Tile[];
  players: Record<Wind, Player>;
  honba?: number;
  riichiBets?: number;
}

export type Action = 'tsumo' | 'ron' | 'pon' | 'chi' | 'kan' | 'pass' | 'riichi';

export interface ActionEvent {
  player: Wind;
  action: Action;
  tiles?: Tile[];
  timestamp: number;
}