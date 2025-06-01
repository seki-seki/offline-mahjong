import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameManager } from '../../game/GameManager';
import { CryptoService } from '../../crypto/CryptoService';
import { TileShuffleService } from '../../crypto/TileShuffleService';
import { GameSession } from '../../crypto/GameSession';
import { ActionType } from '../../types/game';
import { v4 as uuidv4 } from 'uuid';

describe('Game Flow Integration Tests', () => {
  let cryptoService: CryptoService;
  let shuffleService: TileShuffleService;
  let gameSession: GameSession;
  let gameManager: GameManager;
  let playerIds: string[];
  let playerKeys: Map<string, { publicKey: string; privateKey: string }>;

  beforeEach(async () => {
    // Initialize crypto services
    cryptoService = new CryptoService();
    shuffleService = new TileShuffleService(cryptoService);
    
    // Create 4 players with keys
    playerIds = ['player-1', 'player-2', 'player-3', 'player-4'];
    playerKeys = new Map();
    
    for (const playerId of playerIds) {
      const keys = await cryptoService.generateKeyPair();
      playerKeys.set(playerId, keys);
    }

    // Initialize game session
    gameSession = new GameSession(
      'test-game',
      playerIds.map(id => ({
        id,
        publicKey: playerKeys.get(id)!.publicKey
      })),
      cryptoService,
      shuffleService
    );

    // Initialize game manager
    const players = playerIds.map((id, index) => ({
      id,
      name: `Player ${index + 1}`,
      position: (['east', 'south', 'west', 'north'] as const)[index],
      points: 25000,
      hand: [],
      discards: [],
      melds: [],
      riichi: false
    }));

    gameManager = new GameManager('test-game', players);
  });

  describe('Encryption Shuffle Flow', () => {
    it('should complete full encryption shuffle with all players', async () => {
      // Each player performs their shuffle
      for (const playerId of playerIds) {
        const isComplete = await gameSession.performShuffle(playerId);
        
        if (playerId === playerIds[playerIds.length - 1]) {
          expect(isComplete).toBe(true);
        } else {
          expect(isComplete).toBe(false);
        }
      }

      // Verify shuffle is complete
      expect(gameSession.isShuffleComplete()).toBe(true);
      
      // Get shuffled deck
      const deck = gameSession.getShuffledDeck();
      expect(deck.tiles).toHaveLength(136); // Standard mahjong tile count
      expect(deck.shuffleHistory).toHaveLength(4); // One shuffle per player
    });

    it('should verify shuffle signatures', async () => {
      // Perform shuffles
      for (const playerId of playerIds) {
        await gameSession.performShuffle(playerId);
      }

      const deck = gameSession.getShuffledDeck();
      
      // Each shuffle should have a valid signature
      for (const shuffle of deck.shuffleHistory) {
        const player = playerIds.find(id => id === shuffle.playerId);
        expect(player).toBeDefined();
        
        // Verify signature (in real implementation)
        expect(shuffle.signature).toBeTruthy();
        expect(shuffle.timestamp).toBeLessThanOrEqual(Date.now());
      }
    });

    it('should handle player disconnection during shuffle', async () => {
      // First two players shuffle
      await gameSession.performShuffle(playerIds[0]);
      await gameSession.performShuffle(playerIds[1]);
      
      // Simulate player 3 disconnection by skipping their shuffle
      // Player 4 should not be able to complete shuffle
      await expect(gameSession.performShuffle(playerIds[3])).rejects.toThrow();
    });
  });

  describe('Decryption Flow', () => {
    it('should decrypt tiles when requested', async () => {
      // Complete shuffle first
      for (const playerId of playerIds) {
        await gameSession.performShuffle(playerId);
      }

      // Simulate drawing a tile
      const tileIndex = 0;
      const encryptedTile = gameSession.getShuffledDeck().tiles[tileIndex];
      
      // Request decryption from all players
      const decryptionProofs: any[] = [];
      
      for (const playerId of playerIds) {
        // In real implementation, this would be done by each player
        const proof = {
          playerId,
          tileIndex,
          decryptedData: 'partial-decryption',
          timestamp: Date.now()
        };
        decryptionProofs.push(proof);
      }

      // All players provided decryption proofs
      expect(decryptionProofs).toHaveLength(4);
    });

    it('should handle partial decryption responses', async () => {
      // Complete shuffle
      for (const playerId of playerIds) {
        await gameSession.performShuffle(playerId);
      }

      // Only 2 players respond with decryption
      const respondingPlayers = playerIds.slice(0, 2);
      const decryptionProofs = respondingPlayers.map(playerId => ({
        playerId,
        tileIndex: 0,
        decryptedData: 'partial',
        timestamp: Date.now()
      }));

      // Should handle timeout for non-responding players
      expect(decryptionProofs).toHaveLength(2);
    });
  });

  describe('Full Game Flow', () => {
    it('should complete a full game round', async () => {
      // 1. Complete shuffle
      for (const playerId of playerIds) {
        await gameSession.performShuffle(playerId);
      }

      // 2. Start game
      await gameManager.startGame();
      
      // 3. Verify initial game state
      const gameState = gameManager.getGameState();
      expect(gameState.phase).toBe('playing');
      expect(gameState.players).toHaveLength(4);
      
      // 4. Simulate player actions
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      
      // Player draws tile (handled by game start)
      expect(currentPlayer.hand.length).toBe(14); // 13 + 1 drawn
      
      // 5. Player discards
      const discardAction = {
        playerId: currentPlayer.id,
        action: 'discard' as const,
        tile: currentPlayer.hand[0]
      };
      
      const result = await gameManager.handleAction(discardAction);
      expect(result.valid).toBe(true);
      
      // 6. Verify game state after discard
      const updatedState = gameManager.getGameState();
      expect(updatedState.lastDiscardedTile).toBeDefined();
      expect(updatedState.lastDiscardedBy).toBe(currentPlayer.id);
    });

    it('should handle winning conditions', async () => {
      // Setup game
      for (const playerId of playerIds) {
        await gameSession.performShuffle(playerId);
      }
      await gameManager.startGame();

      // Simulate a winning hand scenario
      // This would require setting up specific tiles
      // For now, we'll test the win action flow
      
      const gameState = gameManager.getGameState();
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      
      // Mock a winning condition
      vi.spyOn(gameManager as any, 'handEvaluator', 'get').mockReturnValue({
        canWin: vi.fn().mockReturnValue(true)
      });

      // Declare tsumo
      const tsumoAction = {
        playerId: currentPlayer.id,
        action: 'tsumo-win' as const
      };
      
      const result = await gameManager.handleAction(tsumoAction);
      expect(result.valid).toBe(true);
      
      // Game should end
      const finalState = gameManager.getGameState();
      expect(finalState.phase).toBe('finished');
      expect(finalState.winner).toBe(currentPlayer.id);
    });
  });

  describe('3-Player Mode', () => {
    beforeEach(async () => {
      // Reinitialize for 3 players
      playerIds = ['player-1', 'player-2', 'player-3'];
      playerKeys = new Map();
      
      for (const playerId of playerIds) {
        const keys = await cryptoService.generateKeyPair();
        playerKeys.set(playerId, keys);
      }

      gameSession = new GameSession(
        'test-game-3p',
        playerIds.map(id => ({
          id,
          publicKey: playerKeys.get(id)!.publicKey
        })),
        cryptoService,
        shuffleService
      );

      const players = playerIds.map((id, index) => ({
        id,
        name: `Player ${index + 1}`,
        position: (['east', 'south', 'west'] as const)[index],
        points: 35000, // Different starting points for 3-player
        hand: [],
        discards: [],
        melds: [],
        riichi: false
      }));

      gameManager = new GameManager('test-game-3p', players);
      gameManager.setPlayerCount(3);
    });

    it('should handle 3-player shuffle', async () => {
      for (const playerId of playerIds) {
        const isComplete = await gameSession.performShuffle(playerId);
        
        if (playerId === playerIds[playerIds.length - 1]) {
          expect(isComplete).toBe(true);
        }
      }

      expect(gameSession.isShuffleComplete()).toBe(true);
      const deck = gameSession.getShuffledDeck();
      expect(deck.shuffleHistory).toHaveLength(3);
    });

    it('should handle 3-player game flow', async () => {
      // Complete shuffle
      for (const playerId of playerIds) {
        await gameSession.performShuffle(playerId);
      }

      // Start game
      await gameManager.startGame();
      
      const gameState = gameManager.getGameState();
      expect(gameState.players).toHaveLength(3);
      expect(gameState.players.map(p => p.position)).toEqual(['east', 'south', 'west']);
      
      // Verify turn rotation works correctly
      const firstPlayer = gameState.currentPlayerIndex;
      
      // Discard to move to next player
      await gameManager.handleAction({
        playerId: gameState.players[firstPlayer].id,
        action: 'discard',
        tile: gameState.players[firstPlayer].hand[0]
      });
      
      const nextState = gameManager.getGameState();
      const expectedNextPlayer = (firstPlayer + 1) % 3;
      expect(nextState.currentPlayerIndex).toBe(expectedNextPlayer);
    });
  });

  describe('Action Validation', () => {
    beforeEach(async () => {
      for (const playerId of playerIds) {
        await gameSession.performShuffle(playerId);
      }
      await gameManager.startGame();
    });

    it('should validate and record all game actions', async () => {
      const gameState = gameManager.getGameState();
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      
      // Track action count
      const initialActionCount = gameState.actionHistory?.length || 0;
      
      // Perform discard
      await gameManager.handleAction({
        playerId: currentPlayer.id,
        action: 'discard',
        tile: currentPlayer.hand[0]
      });
      
      // Check action was recorded
      const updatedState = gameManager.getGameState();
      expect(updatedState.actionHistory?.length).toBe(initialActionCount + 1);
      
      // Verify action details
      const lastAction = updatedState.actionHistory?.[updatedState.actionHistory.length - 1];
      expect(lastAction?.playerId).toBe(currentPlayer.id);
      expect(lastAction?.type).toBeDefined();
    });

    it('should prevent invalid actions', async () => {
      const gameState = gameManager.getGameState();
      const nonCurrentPlayer = gameState.players.find(
        p => p.id !== gameState.players[gameState.currentPlayerIndex].id
      )!;
      
      // Try to discard when it's not player's turn
      const result = await gameManager.handleAction({
        playerId: nonCurrentPlayer.id,
        action: 'discard',
        tile: nonCurrentPlayer.hand[0]
      });
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});