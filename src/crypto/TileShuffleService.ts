import { CryptoService } from './CryptoService';
import { EncryptedTile, TileValue } from '../types/crypto';

export class TileShuffleService {
  static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static async encryptAndShuffleTiles(
    tiles: TileValue[] | EncryptedTile[],
    playerPublicKey: CryptoKey,
    allPublicKeys: CryptoKey[] = []
  ): Promise<EncryptedTile[]> {
    // Shuffle first
    const shuffled = this.shuffleArray(tiles);

    if (allPublicKeys.length > 0) {
      // Initial encryption by first player with all keys
      const encrypted: EncryptedTile[] = [];
      for (const tile of shuffled as TileValue[]) {
        const encryptedTile = await CryptoService.encryptTile(tile, allPublicKeys);
        encrypted.push(encryptedTile);
      }
      return encrypted;
    } else {
      // Just shuffle already encrypted tiles (for players 2-4)
      return shuffled as EncryptedTile[];
    }
  }

  static generateFullTileSet(): TileValue[] {
    const tiles: TileValue[] = [];
    
    // 万子 (1-9) x 4
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) {
        tiles.push(`${i}m`);
      }
    }
    
    // 筒子 (1-9) x 4
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) {
        tiles.push(`${i}p`);
      }
    }
    
    // 索子 (1-9) x 4
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 4; j++) {
        tiles.push(`${i}s`);
      }
    }
    
    // 字牌 (東南西北白發中) x 4
    const honors = ['E', 'S', 'W', 'N', 'B', 'G', 'R'];
    for (const honor of honors) {
      for (let j = 0; j < 4; j++) {
        tiles.push(honor);
      }
    }
    
    return tiles; // Total: 136 tiles
  }
}