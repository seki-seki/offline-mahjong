export type TileType = 'man' | 'pin' | 'sou' | 'honor';

// From the game management branch
export type TileNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HonorType = 'east' | 'south' | 'west' | 'north' | 'white' | 'green' | 'red';

// From the main branch
export type HonorValue = 'E' | 'S' | 'W' | 'N' | 'haku' | 'hatsu' | 'chun';

// Tile interfaces from game management branch
export interface NumberTile {
  type: 'man' | 'pin' | 'sou';
  number: TileNumber;
  id: string;
}

export interface HonorTile {
  type: 'honor';
  honor: HonorType;
  id: string;
}

export type Tile = NumberTile | HonorTile;

// Encrypted tile interfaces (merged from both branches)
export interface EncryptedTile {
  id: string;
  encryptedData: string;
  layer?: number; // From game management branch
  encryptionLayers?: number; // From main branch
}

// Additional types from main branch
export type TileState = 'wall' | 'hand' | 'discard' | 'meld';

export interface TileWithState extends Tile {
  state: TileState;
  owner?: number;
}

// Alternative Tile interface from main branch (for compatibility)
export interface SimpleTile {
  id: string;
  type: TileType;
  value: number | HonorValue;
  encrypted?: boolean;
}

// Utility functions from game management branch
export function createTile(type: TileType, value: TileNumber | HonorType, id: string): Tile {
  if (type === 'honor') {
    return {
      type: 'honor',
      honor: value as HonorType,
      id
    };
  }
  return {
    type: type as 'man' | 'pin' | 'sou',
    number: value as TileNumber,
    id
  };
}

export function compareTiles(a: Tile, b: Tile): number {
  if (a.type !== b.type) {
    const typeOrder: TileType[] = ['man', 'pin', 'sou', 'honor'];
    return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
  }
  
  if (a.type === 'honor' && b.type === 'honor') {
    const honorOrder: HonorType[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
    return honorOrder.indexOf(a.honor) - honorOrder.indexOf(b.honor);
  }
  
  if (a.type !== 'honor' && b.type !== 'honor') {
    return a.number - b.number;
  }
  
  return 0;
}