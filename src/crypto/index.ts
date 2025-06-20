// Exports from the shuffle branch
export * from './utils';
export * from './encryption';
export * from './shuffle';

// Exports from the main branch
export { CryptoService } from './CryptoService';
export { TileShuffleService } from './TileShuffleService';
export { GameSession } from './GameSession';
export type { Player } from './GameSession';

// Exports from the signature branch
export { KeyManager } from './keys';
export { SignatureService } from './signatures';
export { DecryptionProofService } from './decryptionProof';

export * from '../types/crypto';

import { EncryptedDeck, PlayerKeys } from '../types';
import { generateFullTileSet } from '../game/tiles';
import { ShuffleManager } from './shuffle';
import { generateKeyPair } from './utils';

export function createPlayer(playerId: string): PlayerKeys {
  const { publicKey, privateKey } = generateKeyPair();
  return {
    playerId,
    publicKey,
    privateKey
  };
}

export function performFullShuffle(players: PlayerKeys[]): EncryptedDeck {
  const tiles = generateFullTileSet();
  const tileStrings = tiles.map(tile => tile);
  
  const shuffleManager = new ShuffleManager(players);
  shuffleManager.initializeDeck(tileStrings);
  
  while (!shuffleManager.isShuffleComplete()) {
    shuffleManager.performCurrentPlayerShuffle();
  }
  
  const finalDeck = shuffleManager.getDeck();
  if (!finalDeck) {
    throw new Error('Failed to create shuffled deck');
  }
  
  return finalDeck;
}

export { ShuffleManager } from './shuffle';