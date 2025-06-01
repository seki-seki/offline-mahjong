export type TileType =
  | '1m' | '2m' | '3m' | '4m' | '5m' | '6m' | '7m' | '8m' | '9m'
  | '1p' | '2p' | '3p' | '4p' | '5p' | '6p' | '7p' | '8p' | '9p'
  | '1s' | '2s' | '3s' | '4s' | '5s' | '6s' | '7s' | '8s' | '9s'
  | 'E' | 'S' | 'W' | 'N' | 'C' | 'F' | 'P';

export interface EncryptedTile {
  id: string;
  encryptedData: string;
  encryptionLayers: string[];
}

export interface ShuffleRecord {
  playerId: string;
  timestamp: number;
  shuffleIndices: number[];
  signature: string;
}

export interface EncryptedDeck {
  tiles: EncryptedTile[];
  shuffleHistory: ShuffleRecord[];
  encryptionOrder: string[];
}

export interface PlayerKeys {
  playerId: string;
  publicKey: string;
  privateKey?: string;
}

export interface EncryptionLayer {
  playerId: string;
  iv: string;
  authTag?: string;
}

export interface ShuffleState {
  currentPlayer: string;
  encryptedDeck: EncryptedDeck;
  completedPlayers: string[];
  isComplete: boolean;
}