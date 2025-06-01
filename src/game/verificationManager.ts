import { GameAction, PlayerID } from '../types/game';
import { VerificationResult, GameVerificationReport } from '../types/crypto';
import { SignatureService } from '../crypto/signatures';
import { ActionLogService } from './actionLog';

interface PlayerPublicKey {
  playerId: PlayerID;
  publicKey: string;
}

export class VerificationManager {
  private static instance: VerificationManager;
  private signatureService: SignatureService;
  private actionLogService: ActionLogService;
  private playerKeys: Map<PlayerID, string> = new Map();
  private invalidActions: Set<string> = new Set();
  private verificationEnabled = true;

  private constructor() {
    this.signatureService = SignatureService.getInstance();
    this.actionLogService = ActionLogService.getInstance();
  }

  static getInstance(): VerificationManager {
    if (!VerificationManager.instance) {
      VerificationManager.instance = new VerificationManager();
    }
    return VerificationManager.instance;
  }

  async initialize(): Promise<void> {
    await this.signatureService.initialize();
    await this.actionLogService.initialize();
  }

  registerPlayer(playerId: PlayerID, publicKey: string): void {
    this.playerKeys.set(playerId, publicKey);
  }

  registerPlayers(players: PlayerPublicKey[]): void {
    players.forEach(({ playerId, publicKey }) => {
      this.registerPlayer(playerId, publicKey);
    });
  }

  async verifyAndLogAction(action: GameAction): Promise<VerificationResult> {
    if (!this.verificationEnabled) {
      return { valid: true };
    }

    // Get player's public key
    const publicKey = this.playerKeys.get(action.playerId);
    if (!publicKey) {
      return { 
        valid: false, 
        error: `No public key registered for player ${action.playerId}` 
      };
    }

    // Verify signature
    const result = await this.signatureService.verifyAction(action, publicKey);
    
    if (result.valid) {
      // Log valid action
      await this.actionLogService.addAction(action, publicKey);
    } else {
      // Track invalid action
      this.invalidActions.add(action.id);
      console.error(`Invalid action detected from player ${action.playerId}:`, result.error);
    }

    return result;
  }

  async verifyGameComplete(): Promise<GameVerificationReport> {
    const logs = this.actionLogService.getLogs();
    const report: GameVerificationReport = {
      gameId: `game-${Date.now()}`,
      valid: true,
      totalActions: logs.length,
      validActions: 0,
      invalidActions: [],
      errors: [],
      timestamp: Date.now()
    };

    // Verify chain integrity
    const chainVerification = await this.actionLogService.verifyChain();
    if (!chainVerification.valid) {
      report.valid = false;
      report.errors.push(...chainVerification.errors);
    }

    // Verify each action
    for (const log of logs) {
      const action = JSON.parse(log.action) as GameAction;
      const publicKey = this.playerKeys.get(action.playerId);
      
      if (!publicKey) {
        report.errors.push(`No public key for player ${action.playerId}`);
        report.invalidActions.push(action.id);
        continue;
      }

      const result = await this.signatureService.verifyAction(action, publicKey);
      if (result.valid) {
        report.validActions++;
      } else {
        report.invalidActions.push(action.id);
        if (result.error) {
          report.errors.push(`Action ${action.id}: ${result.error}`);
        }
      }
    }

    report.valid = report.valid && report.validActions === report.totalActions;
    return report;
  }

  async verifyActionSequence(actions: GameAction[]): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    for (const action of actions) {
      const result = await this.verifyAndLogAction(action);
      if (!result.valid) {
        errors.push(`Action ${action.id}: ${result.error || 'Invalid signature'}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  isActionValid(actionId: string): boolean {
    return !this.invalidActions.has(actionId);
  }

  getInvalidActions(): string[] {
    return Array.from(this.invalidActions);
  }

  setVerificationEnabled(enabled: boolean): void {
    this.verificationEnabled = enabled;
  }

  clearState(): void {
    this.playerKeys.clear();
    this.invalidActions.clear();
    this.actionLogService.clearLogs();
  }

  exportVerificationData(): string {
    return JSON.stringify({
      playerKeys: Array.from(this.playerKeys.entries()),
      invalidActions: Array.from(this.invalidActions),
      logs: this.actionLogService.exportLogs(),
      timestamp: Date.now()
    }, null, 2);
  }

  async importVerificationData(data: string): Promise<void> {
    const parsed = JSON.parse(data);
    
    // Restore player keys
    this.playerKeys = new Map(parsed.playerKeys);
    
    // Restore invalid actions
    this.invalidActions = new Set(parsed.invalidActions);
    
    // Import logs
    await this.actionLogService.importLogs(parsed.logs);
  }
}