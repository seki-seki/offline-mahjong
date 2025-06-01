import sodium from 'libsodium-wrappers';
import { v4 as uuidv4 } from 'uuid';
import { SignedMessage, VerificationResult } from '../types/crypto';
import { GameAction } from '../types/game';
import { KeyManager } from './keys';

export class SignatureService {
  private static instance: SignatureService;
  private keyManager: KeyManager;
  private nonceStore = new Set<string>();

  private constructor() {
    this.keyManager = KeyManager.getInstance();
  }

  static getInstance(): SignatureService {
    if (!SignatureService.instance) {
      SignatureService.instance = new SignatureService();
    }
    return SignatureService.instance;
  }

  async initialize(): Promise<void> {
    await sodium.ready;
    await this.keyManager.initialize();
  }

  async signAction(action: GameAction): Promise<GameAction> {
    await this.initialize();
    
    const keyPair = this.keyManager.getKeyPair();
    if (!keyPair) {
      throw new Error('No key pair available for signing');
    }

    // Ensure unique ID and timestamp
    if (!action.id) {
      action.id = uuidv4();
    }
    if (!action.timestamp) {
      action.timestamp = Date.now();
    }

    // Create message to sign (exclude signature field)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signature, ...actionWithoutSignature } = action;
    const message = this.createSignableMessage(actionWithoutSignature);
    
    // Sign the message
    const messageBytes = sodium.from_string(message);
    const signatureBytes = sodium.crypto_sign_detached(messageBytes, keyPair.secretKey);
    
    // Add signature to action
    action.signature = sodium.to_base64(signatureBytes);
    
    return action;
  }

  async verifyAction(
    action: GameAction, 
    publicKey: Uint8Array | string
  ): Promise<VerificationResult> {
    await this.initialize();

    try {
      if (!action.signature) {
        return { valid: false, error: 'No signature present' };
      }

      // Check for replay attack
      if (this.nonceStore.has(action.id)) {
        return { valid: false, error: 'Replay attack detected: duplicate action ID' };
      }

      // Check timestamp (allow 5 minutes tolerance)
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (Math.abs(now - action.timestamp) > fiveMinutes) {
        return { valid: false, error: 'Action timestamp is too old or in the future' };
      }

      // Convert public key if needed
      const publicKeyBytes = typeof publicKey === 'string' 
        ? sodium.from_base64(publicKey) 
        : publicKey;

      // Create message to verify (exclude signature field)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { signature, ...actionWithoutSignature } = action;
      const message = this.createSignableMessage(actionWithoutSignature);
      const messageBytes = sodium.from_string(message);
      const signatureBytes = sodium.from_base64(action.signature);

      // Verify signature
      const valid = sodium.crypto_sign_verify_detached(
        signatureBytes, 
        messageBytes, 
        publicKeyBytes
      );

      if (valid) {
        // Add to nonce store to prevent replay
        this.nonceStore.add(action.id);
        
        // Clean old nonces periodically (keep last 1000)
        if (this.nonceStore.size > 1000) {
          const nonces = Array.from(this.nonceStore);
          this.nonceStore.clear();
          nonces.slice(-1000).forEach(nonce => this.nonceStore.add(nonce));
        }
      }

      return { valid };
    } catch (error) {
      return { 
        valid: false, 
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async signMessage(message: string): Promise<SignedMessage> {
    await this.initialize();
    
    const keyPair = this.keyManager.getKeyPair();
    if (!keyPair) {
      throw new Error('No key pair available for signing');
    }

    const timestamp = Date.now();
    const fullMessage = `${message}:${timestamp}`;
    const messageBytes = sodium.from_string(fullMessage);
    const signatureBytes = sodium.crypto_sign_detached(messageBytes, keyPair.secretKey);

    return {
      message,
      signature: sodium.to_base64(signatureBytes),
      publicKey: sodium.to_base64(keyPair.publicKey),
      timestamp
    };
  }

  async verifyMessage(signedMessage: SignedMessage): Promise<VerificationResult> {
    await this.initialize();

    try {
      const fullMessage = `${signedMessage.message}:${signedMessage.timestamp}`;
      const messageBytes = sodium.from_string(fullMessage);
      const signatureBytes = sodium.from_base64(signedMessage.signature);
      const publicKeyBytes = sodium.from_base64(signedMessage.publicKey);

      const valid = sodium.crypto_sign_verify_detached(
        signatureBytes,
        messageBytes,
        publicKeyBytes
      );

      return { valid };
    } catch (error) {
      return {
        valid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private createSignableMessage(obj: unknown): string {
    // Create deterministic string representation
    return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
  }

  clearNonceStore(): void {
    this.nonceStore.clear();
  }
}