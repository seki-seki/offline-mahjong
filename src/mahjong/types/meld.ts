import { Tile } from './tile';

export type MeldType = 'chi' | 'pon' | 'kan' | 'ankan' | 'minkan';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromPlayer?: number; // The player from whom the tile was taken (for open melds)
  isOpen: boolean;
}

export function createChi(tiles: Tile[], fromPlayer: number): Meld {
  if (tiles.length !== 3) {
    throw new Error('Chi must have exactly 3 tiles');
  }
  return {
    type: 'chi',
    tiles,
    fromPlayer,
    isOpen: true
  };
}

export function createPon(tiles: Tile[], fromPlayer?: number): Meld {
  if (tiles.length !== 3) {
    throw new Error('Pon must have exactly 3 tiles');
  }
  return {
    type: 'pon',
    tiles,
    fromPlayer,
    isOpen: fromPlayer !== undefined
  };
}

export function createKan(tiles: Tile[], fromPlayer?: number, isMinkan = false): Meld {
  if (tiles.length !== 4) {
    throw new Error('Kan must have exactly 4 tiles');
  }
  const type = fromPlayer !== undefined ? (isMinkan ? 'minkan' : 'kan') : 'ankan';
  return {
    type,
    tiles,
    fromPlayer,
    isOpen: fromPlayer !== undefined
  };
}

export function isChi(meld: Meld): boolean {
  return meld.type === 'chi';
}

export function isPon(meld: Meld): boolean {
  return meld.type === 'pon';
}

export function isKan(meld: Meld): boolean {
  return meld.type === 'kan' || meld.type === 'ankan' || meld.type === 'minkan';
}

export function isOpenMeld(meld: Meld): boolean {
  return meld.isOpen;
}

export function isClosedMeld(meld: Meld): boolean {
  return !meld.isOpen;
}