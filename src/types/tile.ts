export type TileType = 'man' | 'pin' | 'sou' | 'honor';

export type HonorValue = 'E' | 'S' | 'W' | 'N' | 'haku' | 'hatsu' | 'chun';

export interface Tile {
  id: string;
  type: TileType;
  value: number | HonorValue;
  encrypted?: boolean;
}

export interface EncryptedTile {
  id: string;
  encryptedData: string;
  encryptionLayers: number;
}

export type TileState = 'wall' | 'hand' | 'discard' | 'meld';

export interface TileWithState extends Tile {
  state: TileState;
  owner?: number;
}