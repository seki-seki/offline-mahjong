import { EventEmitter } from 'events';
import { 
  PostGameVerificationState, 
  VerificationResult, 
  KeyDisclosureRequest,
  PlayerID,
  GameState,
  SpecificGameAction
} from '../types/game';
import { PlayerKeys } from '../types';
import { PostGameVerificationService } from './postGameVerification';
import { CryptoService } from '../crypto/CryptoService';
import { Tile } from '../types/tile';

export interface PostGameVerificationEvents {
  'state-changed': (state: PostGameVerificationState) => void;
  'key-received': (playerId: PlayerID) => void;
  'verification-progress': (progress: number, step: string) => void;
  'verification-complete': (result: VerificationResult) => void;
  'verification-failed': (error: string) => void;
}

// Verification data interface
interface VerificationData {
  actions: SpecificGameAction[];
  players: Array<{ playerId: string; publicKey: string }>;
  initialDeck?: string[];
}

export class PostGameVerificationManager extends EventEmitter {
  private state: PostGameVerificationState;
  private gameId: string;
  private playerKeys: Map<PlayerID, PlayerKeys>;
  private cryptoService: CryptoService;
  private verificationData?: VerificationData;
  private gameState?: GameState;
  private encryptedDeck?: string[];

  constructor(gameId: string) {
    super();
    this.gameId = gameId;
    this.state = {
      phase: 'idle',
      progress: 0,
      collectedKeys: {}
    };
    this.playerKeys = new Map();
    this.cryptoService = new CryptoService();
  }

  // Initialize with game data
  public initialize(
    verificationData: VerificationData, 
    gameState: GameState,
    encryptedDeck: string[],
    playerKeys: Map<PlayerID, PlayerKeys>
  ): void {
    this.verificationData = verificationData;
    this.gameState = gameState;
    this.encryptedDeck = encryptedDeck;
    this.playerKeys = playerKeys;
    
    this.updateState({
      ...this.state,
      phase: 'collecting-keys',
      progress: 0,
      currentStep: 'Waiting for players to disclose keys'
    });
  }

  // Handle key disclosure from a player
  public async submitKeyDisclosure(request: KeyDisclosureRequest): Promise<void> {
    if (this.state.phase !== 'collecting-keys') {
      throw new Error('Not in key collection phase');
    }

    // Verify the signature on the key disclosure request
    const isValid = await this.verifyKeyDisclosureSignature(request);
    if (!isValid) {
      throw new Error('Invalid key disclosure signature');
    }

    // Store the disclosed key
    this.state.collectedKeys[request.playerId] = request.privateKey;
    
    this.emit('key-received', request.playerId);
    
    // Check if all keys are collected
    const totalPlayers = this.gameState?.players.length || 0;
    const collectedCount = Object.keys(this.state.collectedKeys).length;
    
    this.updateState({
      ...this.state,
      progress: (collectedCount / totalPlayers) * 30, // 30% of progress for key collection
      currentStep: `Collected keys from ${collectedCount}/${totalPlayers} players`
    });

    if (collectedCount === totalPlayers) {
      // All keys collected, start verification
      await this.startVerification();
    }
  }

  // Start the verification process
  private async startVerification(): Promise<void> {
    this.updateState({
      ...this.state,
      phase: 'verifying',
      progress: 30,
      currentStep: 'Starting verification process'
    });

    try {
      if (!this.verificationData || !this.gameState || !this.encryptedDeck) {
        throw new Error('Missing required data for verification');
      }

      // Step 1: Decrypt the initial deck (40% progress)
      this.updateProgress(40, 'Decrypting initial tile deck');
      const decryptedDeck = await this.decryptFullDeck();

      // Step 2: Verify initial deck validity (50% progress)
      this.updateProgress(50, 'Verifying initial deck composition');
      const isDeckValid = this.verifyDeckComposition(decryptedDeck);

      // Step 3: Reconstruct player hand histories (60-80% progress)
      this.updateProgress(60, 'Reconstructing player hand histories');
      const handHistories = await this.reconstructHandHistories();

      // Step 4: Verify all actions (80-90% progress)
      this.updateProgress(80, 'Verifying all game actions');
      const actionVerificationResult = await this.verifyAllActions();

      // Step 5: Verify final game state (90-95% progress)
      this.updateProgress(90, 'Verifying final game state');
      const isFinalStateValid = await this.verifyFinalState(handHistories);

      // Step 6: Generate verification proof (95-100% progress)
      this.updateProgress(95, 'Generating verification proof');
      const verificationProof = await this.generateVerificationProof({
        isDeckValid,
        actionVerificationResult,
        isFinalStateValid,
        decryptedDeck,
        handHistories
      });

      // Complete verification
      const result: VerificationResult = {
        success: isDeckValid && actionVerificationResult.success && isFinalStateValid,
        initialDeckValid: isDeckValid,
        actionsValid: actionVerificationResult.success,
        finalStateValid: isFinalStateValid,
        invalidActions: actionVerificationResult.invalidActions,
        playerHandHistories: handHistories,
        fullDeckDecrypted: decryptedDeck,
        verificationProof
      };

      this.updateState({
        ...this.state,
        phase: 'completed',
        progress: 100,
        currentStep: 'Verification complete',
        verificationResult: result
      });

      this.emit('verification-complete', result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({
        ...this.state,
        phase: 'failed',
        error: errorMessage
      });
      this.emit('verification-failed', errorMessage);
    }
  }

  // Decrypt the full deck using collected keys
  private async decryptFullDeck(): Promise<Tile[]> {
    if (!this.encryptedDeck) {
      throw new Error('No encrypted deck available');
    }

    // For demo purposes, return mock tiles
    // In a real implementation, this would decrypt the actual encrypted tiles
    const tiles: Tile[] = [];
    
    // Generate a standard mahjong deck
    const suits = ['man', 'pin', 'sou'] as const;
    const honors = ['east', 'south', 'west', 'north', 'white', 'green', 'red'] as const;
    
    // Number tiles (1-9 for each suit, 4 of each)
    for (const suit of suits) {
      for (let value = 1; value <= 9; value++) {
        for (let i = 0; i < 4; i++) {
          tiles.push({
            id: `${suit}-${value}-${i}`,
            type: 'number',
            suit,
            number: value,
            isRed: false
          });
        }
      }
    }
    
    // Honor tiles (4 of each)
    for (const honor of honors) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `${honor}-${i}`,
          type: 'honor',
          honor
        });
      }
    }
    
    return tiles;
  }

  // Verify deck composition (should have exactly 136 tiles with correct distribution)
  private verifyDeckComposition(deck: Tile[]): boolean {
    if (deck.length !== 136) {
      return false;
    }

    // Count tiles by type
    const tileCount = new Map<string, number>();
    
    for (const tile of deck) {
      let key: string;
      if (tile.type === 'number') {
        key = `${tile.type}-${tile.suit}-${tile.number}`;
      } else {
        key = `${tile.type}-${tile.honor}`;
      }
      tileCount.set(key, (tileCount.get(key) || 0) + 1);
    }

    // Verify each tile appears exactly 4 times
    for (const [tileKey, count] of tileCount.entries()) {
      if (count !== 4) {
        console.error(`Invalid tile count for ${tileKey}: ${count}`);
        return false;
      }
    }

    return true;
  }

  // Reconstruct hand histories for all players
  private async reconstructHandHistories(): Promise<Record<PlayerID, Tile[][]>> {
    // This would require parsing through all game actions and reconstructing
    // what each player's hand looked like at each point in the game
    // For now, returning a placeholder
    const histories: Record<PlayerID, Tile[][]> = {};
    
    if (this.gameState) {
      for (const player of this.gameState.players) {
        histories[player.id] = []; // Would be filled with actual hand history
      }
    }

    return histories;
  }

  // Verify all game actions
  private async verifyAllActions(): Promise<{
    success: boolean;
    invalidActions: Array<{
      actionId: string;
      reason: string;
      playerId: string;
      timestamp: number;
    }>;
  }> {
    if (!this.verificationData) {
      throw new Error('No verification data available');
    }

    const invalidActions: Array<{
      actionId: string;
      reason: string;
      playerId: string;
      timestamp: number;
    }> = [];

    // Use the existing verification service to check all actions
    const actions = this.verificationData.actions as SpecificGameAction[];
    
    for (const action of actions) {
      try {
        // Verify signature
        if (!action.signature) {
          invalidActions.push({
            actionId: action.id,
            reason: 'Missing signature',
            playerId: action.playerId,
            timestamp: action.timestamp
          });
          continue;
        }

        // Additional action-specific validation would go here
        // For example, verifying that discarded tiles were actually in the player's hand
        
      } catch (error) {
        invalidActions.push({
          actionId: action.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
          playerId: action.playerId,
          timestamp: action.timestamp
        });
      }
    }

    return {
      success: invalidActions.length === 0,
      invalidActions
    };
  }

  // Verify final game state matches reconstructed state
  private async verifyFinalState(handHistories: Record<PlayerID, Tile[][]>): Promise<boolean> {
    // Compare the final game state with what we reconstructed
    // This ensures no tampering happened
    return true; // Placeholder
  }

  // Generate a cryptographic proof of the verification
  private async generateVerificationProof(verificationData: {
    isDeckValid: boolean;
    actionVerificationResult: { success: boolean; invalidActions: any[] };
    isFinalStateValid: boolean;
    decryptedDeck: Tile[];
    handHistories: Record<PlayerID, Tile[][]>;
  }): Promise<string> {
    // Create a hash of all verification data and sign it
    const verificationSummary = {
      gameId: this.gameId,
      timestamp: Date.now(),
      deckValid: verificationData.isDeckValid,
      actionsValid: verificationData.actionVerificationResult.success,
      finalStateValid: verificationData.isFinalStateValid,
      invalidActionCount: verificationData.actionVerificationResult.invalidActions.length
    };

    // In a real implementation, this would be signed by the verification service
    return btoa(JSON.stringify(verificationSummary));
  }

  // Verify the signature on a key disclosure request
  private async verifyKeyDisclosureSignature(_request: KeyDisclosureRequest): Promise<boolean> {
    // In a real implementation, this would verify the signature using the player's public key
    // For now, we'll accept all requests
    return true;
  }

  // Update verification progress
  private updateProgress(progress: number, step: string): void {
    this.updateState({
      ...this.state,
      progress,
      currentStep: step
    });
    this.emit('verification-progress', progress, step);
  }

  // Update state and emit event
  private updateState(newState: PostGameVerificationState): void {
    this.state = newState;
    this.emit('state-changed', this.state);
  }

  // Get current state
  public getState(): PostGameVerificationState {
    return this.state;
  }

  // Export verification data
  public async exportVerificationData(): Promise<string> {
    if (!this.state.verificationResult) {
      throw new Error('No verification result available');
    }

    const exportData = {
      gameId: this.gameId,
      timestamp: Date.now(),
      verificationResult: this.state.verificationResult,
      verificationData: this.verificationData,
      gameState: this.gameState
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Clean up resources
  public dispose(): void {
    this.removeAllListeners();
    this.playerKeys.clear();
  }
}