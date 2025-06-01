import { Tile } from './tile';
import { Meld } from './meld';

export interface Hand {
  tiles: Tile[];
  melds: Meld[];
  discards: Tile[];
  riichi: boolean;
  riichiTurn?: number;
  ippatsu: boolean;
  menzen: boolean; // True if hand is closed (no open melds)
}

export interface WinCondition {
  winTile: Tile;
  isTsumo: boolean;
  isRinshan?: boolean;
  isChankan?: boolean;
  isHaitei?: boolean;
  isHoutei?: boolean;
  isDoubleRiichi?: boolean;
  isNagashiMangan?: boolean;
}

export interface GameContext {
  roundWind: 'east' | 'south' | 'west' | 'north';
  playerWind: 'east' | 'south' | 'west' | 'north';
  doras: Tile[];
  uraDoras?: Tile[];
  tilesRemaining: number;
  currentTurn: number;
  riichiSticks: number;
  honba: number;
}

export function createHand(): Hand {
  return {
    tiles: [],
    melds: [],
    discards: [],
    riichi: false,
    ippatsu: false,
    menzen: true
  };
}

export function isClosedHand(hand: Hand): boolean {
  return hand.melds.every(meld => !meld.isOpen);
}

export function getHandTileCount(hand: Hand): number {
  const meldTileCount = hand.melds.reduce((sum, meld) => sum + meld.tiles.length, 0);
  return hand.tiles.length + meldTileCount;
}

export function getAllHandTiles(hand: Hand): Tile[] {
  const allTiles: Tile[] = [...hand.tiles];
  for (const meld of hand.melds) {
    allTiles.push(...meld.tiles);
  }
  return allTiles;
}