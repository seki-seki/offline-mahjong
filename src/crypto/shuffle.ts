import { EncryptedTile, ShuffleRecord, EncryptedDeck, PlayerKeys } from '../types';
import { signData, randomBytes } from './utils';
import { encryptTiles } from './encryption';

export function shuffleArray<T>(array: T[]): { shuffled: T[]; indices: number[] } {
  const arr = [...array];
  const indices: number[] = [];
  const n = arr.length;
  
  for (let i = 0; i < n; i++) {
    indices[i] = i;
  }
  
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  return { shuffled: arr, indices };
}

export function shuffleEncryptedTiles(
  tiles: EncryptedTile[]
): { tiles: EncryptedTile[]; shuffleIndices: number[] } {
  const { shuffled, indices } = shuffleArray(tiles);
  return { tiles: shuffled, shuffleIndices: indices };
}

export function createShuffleRecord(
  playerId: string,
  shuffleIndices: number[],
  privateKey: string
): ShuffleRecord {
  const timestamp = Date.now();
  const dataToSign = JSON.stringify({ playerId, timestamp, shuffleIndices });
  const signature = signData(dataToSign, privateKey);
  
  return {
    playerId,
    timestamp,
    shuffleIndices,
    signature
  };
}

export function performPlayerShuffle(
  deck: EncryptedDeck,
  player: PlayerKeys
): EncryptedDeck {
  if (!player.privateKey) {
    throw new Error('Player private key is required for shuffling');
  }
  
  const encryptedTiles = encryptTiles(deck.tiles, player.publicKey, player.playerId);
  
  const { tiles: shuffledTiles, shuffleIndices } = shuffleEncryptedTiles(encryptedTiles);
  
  const shuffleRecord = createShuffleRecord(
    player.playerId,
    shuffleIndices,
    player.privateKey
  );
  
  return {
    tiles: shuffledTiles,
    shuffleHistory: [...deck.shuffleHistory, shuffleRecord],
    encryptionOrder: [...deck.encryptionOrder, player.playerId]
  };
}

export function initializeEncryptedDeck(tiles: string[]): EncryptedDeck {
  const tileIds = tiles.map((tile, index) => ({
    id: `${tile}-${index}-${randomBytes(8)}`,
    encryptedData: tile,
    encryptionLayers: []
  }));
  
  return {
    tiles: tileIds,
    shuffleHistory: [],
    encryptionOrder: []
  };
}

export class ShuffleManager {
  private players: PlayerKeys[];
  private currentPlayerIndex: number = 0;
  private deck: EncryptedDeck | null = null;
  
  constructor(players: PlayerKeys[]) {
    if (players.length !== 4) {
      throw new Error('Exactly 4 players are required');
    }
    this.players = players;
  }
  
  initializeDeck(tiles: string[]): void {
    this.deck = initializeEncryptedDeck(tiles);
    this.currentPlayerIndex = 0;
  }
  
  getCurrentPlayer(): PlayerKeys {
    return this.players[this.currentPlayerIndex];
  }
  
  performCurrentPlayerShuffle(): EncryptedDeck {
    if (!this.deck) {
      throw new Error('Deck not initialized');
    }
    
    const currentPlayer = this.getCurrentPlayer();
    this.deck = performPlayerShuffle(this.deck, currentPlayer);
    
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
    return this.deck;
  }
  
  isShuffleComplete(): boolean {
    if (!this.deck) return false;
    return this.deck.encryptionOrder.length === 4;
  }
  
  getDeck(): EncryptedDeck | null {
    return this.deck;
  }
  
  getShuffleHistory(): ShuffleRecord[] {
    return this.deck?.shuffleHistory || [];
  }
}