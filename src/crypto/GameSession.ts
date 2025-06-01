import { CryptoService } from './CryptoService';
import { TileShuffleService } from './TileShuffleService';
import { KeyPair, EncryptedTile, TileValue } from '../types/crypto';

export interface Player {
  id: string;
  name: string;
  keyPair?: KeyPair;
  exportedPublicKey?: JsonWebKey;
}

export class GameSession {
  private players: Player[] = [];
  private encryptedDeck: EncryptedTile[] = [];
  private currentPlayerIndex: number = 0;

  constructor() {}

  async addPlayer(id: string, name: string): Promise<Player> {
    if (this.players.length >= 4) {
      throw new Error('Game session is full (4 players max)');
    }

    const keyPair = await CryptoService.generateKeyPair();
    const exported = await CryptoService.exportKeyPair(keyPair);
    
    const player: Player = {
      id,
      name,
      keyPair,
      exportedPublicKey: exported.publicKey
    };

    this.players.push(player);
    return player;
  }

  getPlayers(): Player[] {
    return this.players;
  }

  async getAllPublicKeys(): Promise<CryptoKey[]> {
    const publicKeys: CryptoKey[] = [];
    
    for (const player of this.players) {
      if (player.exportedPublicKey) {
        const publicKey = await CryptoService.importPublicKey(player.exportedPublicKey);
        publicKeys.push(publicKey);
      }
    }
    
    return publicKeys;
  }

  async initializeDeck(): Promise<EncryptedTile[]> {
    if (this.players.length !== 4) {
      throw new Error('Need exactly 4 players to initialize deck');
    }

    // Generate the initial tile set
    const tiles = TileShuffleService.generateFullTileSet();
    
    // Get all public keys in order (A -> B -> C -> D)
    const allPublicKeys = await this.getAllPublicKeys();
    
    // First player encrypts with all keys and shuffles
    this.encryptedDeck = await TileShuffleService.encryptAndShuffleTiles(
      tiles,
      allPublicKeys[0],
      allPublicKeys
    );

    return this.encryptedDeck;
  }

  async playerShuffleDeck(playerId: string): Promise<EncryptedTile[]> {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    // Players 2-4 just shuffle the already encrypted deck
    this.encryptedDeck = TileShuffleService.shuffleArray(this.encryptedDeck);
    
    return this.encryptedDeck;
  }

  getEncryptedDeck(): EncryptedTile[] {
    return this.encryptedDeck;
  }

  async decryptTileForPlayer(
    tileIndex: number,
    playerId: string
  ): Promise<TileValue> {
    const player = this.players.find(p => p.id === playerId);
    
    if (!player || !player.keyPair) {
      throw new Error('Player not found or no key pair');
    }

    if (tileIndex < 0 || tileIndex >= this.encryptedDeck.length) {
      throw new Error('Invalid tile index');
    }

    const encryptedTile = this.encryptedDeck[tileIndex];
    
    // Get all private keys in reverse order for this player
    const privateKeys: CryptoKey[] = [];
    
    // We need all players' private keys in reverse order (D -> C -> B -> A)
    // In a real game, each player would only have their own private key
    // and would need cooperation to decrypt
    for (let i = this.players.length - 1; i >= 0; i--) {
      if (this.players[i].keyPair) {
        privateKeys.push(this.players[i].keyPair!.privateKey);
      }
    }

    return CryptoService.decryptTile(encryptedTile, privateKeys);
  }

  // Helper method for testing - in real game this would require all players' cooperation
  async decryptTileWithAllKeys(tileIndex: number): Promise<TileValue> {
    if (tileIndex < 0 || tileIndex >= this.encryptedDeck.length) {
      throw new Error('Invalid tile index');
    }

    const encryptedTile = this.encryptedDeck[tileIndex];
    const privateKeys: CryptoKey[] = [];
    
    // Collect all private keys in reverse order (D -> C -> B -> A)
    for (let i = this.players.length - 1; i >= 0; i--) {
      if (this.players[i].keyPair) {
        privateKeys.push(this.players[i].keyPair!.privateKey);
      }
    }

    return CryptoService.decryptTile(encryptedTile, privateKeys);
  }

  // Distribution methods for initial hand
  getPlayerHandIndices(playerIndex: number): number[] {
    // Each player gets 13 tiles initially (East gets 14)
    const tilesPerPlayer = playerIndex === 0 ? 14 : 13;
    const indices: number[] = [];
    
    // Simple distribution: player 0 gets tiles 0-13, player 1 gets 14-26, etc.
    const startIndex = playerIndex === 0 ? 0 : 14 + (playerIndex - 1) * 13;
    
    for (let i = 0; i < tilesPerPlayer; i++) {
      indices.push(startIndex + i);
    }
    
    return indices;
  }

  // Get the next tile index for drawing
  getNextDrawIndex(): number {
    // After initial distribution, tiles are drawn from index 53 onwards
    const initialTilesDistributed = 14 + 13 * 3; // 53 tiles
    const remainingTiles = 136 - initialTilesDistributed;
    
    // This is simplified - in a real game, you'd track which tiles have been drawn
    return initialTilesDistributed + Math.floor(Math.random() * remainingTiles);
  }
}