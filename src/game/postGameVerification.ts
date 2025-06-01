import { GameVerificationReport } from '../types/crypto';
import { GameAction, PlayerID } from '../types/game';
import { VerificationManager } from './verificationManager';
import { ActionLogService } from './actionLog';
import { DecryptionProofService } from '../crypto/decryptionProof';

interface GameSnapshot {
  gameId: string;
  startTime: number;
  endTime: number;
  players: PlayerID[];
  finalScores: Map<PlayerID, number>;
  winner: PlayerID | null;
}

interface FullGameVerificationReport extends GameVerificationReport {
  gameSnapshot: GameSnapshot;
  decryptionProofsValid: boolean;
  actionSequenceValid: boolean;
  finalStateValid: boolean;
}

export class PostGameVerificationService {
  private static instance: PostGameVerificationService;
  private verificationManager: VerificationManager;
  private actionLogService: ActionLogService;
  private decryptionProofService: DecryptionProofService;

  private constructor() {
    this.verificationManager = VerificationManager.getInstance();
    this.actionLogService = ActionLogService.getInstance();
    this.decryptionProofService = DecryptionProofService.getInstance();
  }

  static getInstance(): PostGameVerificationService {
    if (!PostGameVerificationService.instance) {
      PostGameVerificationService.instance = new PostGameVerificationService();
    }
    return PostGameVerificationService.instance;
  }

  async initialize(): Promise<void> {
    await this.verificationManager.initialize();
    await this.decryptionProofService.initialize();
  }

  async performFullVerification(
    gameSnapshot: GameSnapshot,
    playerPublicKeys: Map<PlayerID, string>
  ): Promise<FullGameVerificationReport> {
    // Start with basic game verification
    const baseReport = await this.verificationManager.verifyGameComplete();
    
    const fullReport: FullGameVerificationReport = {
      ...baseReport,
      gameSnapshot,
      decryptionProofsValid: false,
      actionSequenceValid: false,
      finalStateValid: false
    };

    // Verify decryption proofs
    const tilePublicKeys = this.mapPlayerKeysToTileKeys(playerPublicKeys);
    const proofVerification = await this.decryptionProofService.verifyAllProofs(tilePublicKeys);
    fullReport.decryptionProofsValid = proofVerification.valid;
    if (!proofVerification.valid) {
      fullReport.errors.push(...proofVerification.errors);
    }

    // Verify action sequence makes sense
    const sequenceVerification = await this.verifyActionSequence();
    fullReport.actionSequenceValid = sequenceVerification.valid;
    if (!sequenceVerification.valid) {
      fullReport.errors.push(...sequenceVerification.errors);
    }

    // Verify final game state
    const stateVerification = await this.verifyFinalState(gameSnapshot);
    fullReport.finalStateValid = stateVerification.valid;
    if (!stateVerification.valid) {
      fullReport.errors.push(...stateVerification.errors);
    }

    // Overall validity
    fullReport.valid = fullReport.valid && 
                      fullReport.decryptionProofsValid && 
                      fullReport.actionSequenceValid && 
                      fullReport.finalStateValid;

    return fullReport;
  }

  private async verifyActionSequence(): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const logs = this.actionLogService.getLogs();
    
    // Parse all actions
    const actions: GameAction[] = logs.map(log => JSON.parse(log.action));
    
    // Basic sequence validation
    let gameStarted = false;
    let gameEnded = false;
    const playerTurns = new Map<PlayerID, number>();

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Check game start
      if (action.type === 'GAME_START') {
        if (gameStarted) {
          errors.push('Multiple game start actions detected');
        }
        gameStarted = true;
      } else if (!gameStarted) {
        errors.push(`Action ${action.type} before game start`);
      }

      // Check game end conditions
      if (action.type === 'WIN') {
        if (gameEnded) {
          errors.push('Actions after game end');
        }
        gameEnded = true;
      }

      // Track turns
      const turns = playerTurns.get(action.playerId) || 0;
      playerTurns.set(action.playerId, turns + 1);
    }

    // Verify all players participated
    if (playerTurns.size < 4) {
      errors.push('Not all players participated in the game');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async verifyFinalState(snapshot: GameSnapshot): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Verify winner exists if game ended
    if (!snapshot.winner && snapshot.endTime > 0) {
      errors.push('Game ended without a winner');
    }

    // Verify scores are reasonable
    const totalScore = Array.from(snapshot.finalScores.values())
      .reduce((sum, score) => sum + score, 0);
    
    // In mahjong, total scores should sum to a specific value (e.g., 100,000 for 4 players)
    const expectedTotal = 100000;
    if (Math.abs(totalScore - expectedTotal) > 1) {
      errors.push(`Total scores (${totalScore}) don't match expected (${expectedTotal})`);
    }

    // Verify all players have scores
    for (const player of snapshot.players) {
      if (!snapshot.finalScores.has(player)) {
        errors.push(`No final score for player ${player}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private mapPlayerKeysToTileKeys(
    playerKeys: Map<PlayerID, string>
  ): Map<number, string> {
    // In a real implementation, this would map tile indices to the player
    // who was responsible for that tile's encryption
    // For now, we'll create a simple mapping
    const tileKeys = new Map<number, string>();
    const players = Array.from(playerKeys.entries());
    
    for (let i = 0; i < 136; i++) { // Standard mahjong has 136 tiles
      const playerIndex = i % players.length;
      tileKeys.set(i, players[playerIndex][1]);
    }
    
    return tileKeys;
  }

  async generateVerificationReport(
    gameSnapshot: GameSnapshot,
    playerPublicKeys: Map<PlayerID, string>
  ): Promise<string> {
    const report = await this.performFullVerification(gameSnapshot, playerPublicKeys);
    
    return JSON.stringify({
      report,
      actionLogs: this.actionLogService.exportLogs(),
      decryptionProofs: this.decryptionProofService.exportProofs(),
      timestamp: Date.now()
    }, null, 2);
  }

  async saveVerificationData(): Promise<string> {
    const data = {
      verificationData: this.verificationManager.exportVerificationData(),
      actionLogs: this.actionLogService.exportLogs(),
      decryptionProofs: this.decryptionProofService.exportProofs(),
      timestamp: Date.now()
    };

    // In a real implementation, this would save to a file
    // For now, we'll return the data as a string
    return JSON.stringify(data, null, 2);
  }

  clearAllData(): void {
    this.verificationManager.clearState();
    this.decryptionProofService.clearProofs();
  }
}