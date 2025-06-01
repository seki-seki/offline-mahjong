import sodium from 'libsodium-wrappers';
import { DecryptionProof } from '../types/crypto';
import { SignatureService } from './signatures';
import { KeyManager } from './keys';

export class DecryptionProofService {
  private static instance: DecryptionProofService;
  private signatureService: SignatureService;
  private keyManager: KeyManager;
  private proofs: Map<number, DecryptionProof> = new Map();

  private constructor() {
    this.signatureService = SignatureService.getInstance();
    this.keyManager = KeyManager.getInstance();
  }

  static getInstance(): DecryptionProofService {
    if (!DecryptionProofService.instance) {
      DecryptionProofService.instance = new DecryptionProofService();
    }
    return DecryptionProofService.instance;
  }

  async initialize(): Promise<void> {
    await sodium.ready;
    await this.signatureService.initialize();
  }

  async generateDecryptionProof(
    tileIndex: number,
    encryptedTile: string,
    decryptedTile: string,
    decryptionKey: Uint8Array
  ): Promise<DecryptionProof> {
    await this.initialize();

    // Generate proof that shows the decryption is correct
    // In a real implementation, this would use a zero-knowledge proof
    // For now, we'll create a verifiable proof structure
    const proofData = {
      tileIndex,
      encryptedTile,
      decryptedTile,
      keyHash: sodium.to_base64(
        sodium.crypto_generichash(32, decryptionKey)
      ),
      timestamp: Date.now()
    };

    const proofString = JSON.stringify(proofData);
    const proofHash = sodium.crypto_generichash(32, sodium.from_string(proofString));

    // Sign the proof
    const keyPair = this.keyManager.getKeyPair();
    if (!keyPair) {
      throw new Error('No key pair available for signing proof');
    }

    const signature = sodium.crypto_sign_detached(proofHash, keyPair.secretKey);

    const proof: DecryptionProof = {
      tileIndex,
      encryptedTile,
      decryptedTile,
      proof: sodium.to_base64(proofHash),
      timestamp: proofData.timestamp,
      signature: sodium.to_base64(signature)
    };

    // Store the proof
    this.proofs.set(tileIndex, proof);

    return proof;
  }

  async verifyDecryptionProof(
    proof: DecryptionProof,
    publicKey: Uint8Array | string
  ): Promise<boolean> {
    await this.initialize();

    try {
      // Convert public key if needed
      const publicKeyBytes = typeof publicKey === 'string'
        ? sodium.from_base64(publicKey)
        : publicKey;

      // Verify the signature
      const proofHashBytes = sodium.from_base64(proof.proof);
      const signatureBytes = sodium.from_base64(proof.signature);

      const valid = sodium.crypto_sign_verify_detached(
        signatureBytes,
        proofHashBytes,
        publicKeyBytes
      );

      if (!valid) {
        return false;
      }

      // Additional validation could be added here
      // For example, checking if the decrypted tile is valid
      // or if the encryption/decryption relationship is correct

      return true;
    } catch (error) {
      console.error('Proof verification failed:', error);
      return false;
    }
  }

  getProof(tileIndex: number): DecryptionProof | undefined {
    return this.proofs.get(tileIndex);
  }

  getAllProofs(): DecryptionProof[] {
    return Array.from(this.proofs.values());
  }

  async verifyAllProofs(publicKeys: Map<number, string>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    for (const [tileIndex, proof] of this.proofs) {
      const publicKey = publicKeys.get(tileIndex);
      if (!publicKey) {
        errors.push(`No public key for tile ${tileIndex}`);
        continue;
      }

      const valid = await this.verifyDecryptionProof(proof, publicKey);
      if (!valid) {
        errors.push(`Invalid proof for tile ${tileIndex}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  exportProofs(): string {
    return JSON.stringify({
      proofs: Array.from(this.proofs.entries()),
      timestamp: Date.now()
    }, null, 2);
  }

  importProofs(data: string): void {
    const parsed = JSON.parse(data);
    this.proofs = new Map(parsed.proofs);
  }

  clearProofs(): void {
    this.proofs.clear();
  }
}