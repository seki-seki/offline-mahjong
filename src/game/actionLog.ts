import sodium from 'libsodium-wrappers';
import { ActionLog } from '../types/crypto';
import { GameAction } from '../types/game';
import { SignatureService } from '../crypto/signatures';

export class ActionLogService {
  private static instance: ActionLogService;
  private logs: ActionLog[] = [];
  private previousHash: string = '0';
  private signatureService: SignatureService;

  private constructor() {
    this.signatureService = SignatureService.getInstance();
  }

  static getInstance(): ActionLogService {
    if (!ActionLogService.instance) {
      ActionLogService.instance = new ActionLogService();
    }
    return ActionLogService.instance;
  }

  async initialize(): Promise<void> {
    await sodium.ready;
    await this.signatureService.initialize();
  }

  async addAction(action: GameAction, publicKey: string): Promise<ActionLog> {
    await this.initialize();

    // Ensure action is signed
    if (!action.signature) {
      throw new Error('Action must be signed before logging');
    }

    // Create log entry
    const log: ActionLog = {
      id: action.id,
      action: JSON.stringify(action),
      signature: action.signature,
      publicKey,
      timestamp: action.timestamp,
      previousHash: this.previousHash
    };

    // Calculate hash of this log entry
    const hash = await this.calculateHash(log);
    this.previousHash = hash;

    // Store log
    this.logs.push(log);

    return log;
  }

  async verifyLog(log: ActionLog): Promise<boolean> {
    try {
      // Parse and verify the action
      const action = JSON.parse(log.action) as GameAction;
      const verificationResult = await this.signatureService.verifyAction(
        action,
        log.publicKey
      );

      return verificationResult.valid;
    } catch (error) {
      console.error('Log verification failed:', error);
      return false;
    }
  }

  async verifyChain(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    let previousHash = '0';

    for (let i = 0; i < this.logs.length; i++) {
      const log = this.logs[i];

      // Verify previous hash matches
      if (log.previousHash !== previousHash) {
        errors.push(`Log ${i}: Previous hash mismatch`);
      }

      // Verify the action signature
      const logValid = await this.verifyLog(log);
      if (!logValid) {
        errors.push(`Log ${i}: Invalid signature`);
      }

      // Calculate expected hash for next iteration
      previousHash = await this.calculateHash(log);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async calculateHash(log: ActionLog): Promise<string> {
    await sodium.ready;
    
    const data = `${log.id}:${log.action}:${log.signature}:${log.publicKey}:${log.timestamp}:${log.previousHash}`;
    const hash = sodium.crypto_generichash(32, sodium.from_string(data));
    return sodium.to_base64(hash);
  }

  getLogs(): ActionLog[] {
    return [...this.logs];
  }

  getLogsByPlayer(publicKey: string): ActionLog[] {
    return this.logs.filter(log => log.publicKey === publicKey);
  }

  getLogsSince(timestamp: number): ActionLog[] {
    return this.logs.filter(log => log.timestamp >= timestamp);
  }

  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      lastHash: this.previousHash,
      timestamp: Date.now()
    }, null, 2);
  }

  async importLogs(data: string): Promise<void> {
    const parsed = JSON.parse(data);
    this.logs = parsed.logs;
    this.previousHash = parsed.lastHash;
    
    // Verify the imported chain
    const verification = await this.verifyChain();
    if (!verification.valid) {
      throw new Error(`Invalid log chain: ${verification.errors.join(', ')}`);
    }
  }

  clearLogs(): void {
    this.logs = [];
    this.previousHash = '0';
  }
}