import sodium from 'libsodium-wrappers';
import { KeyPair } from '../types/crypto';

export class KeyManager {
  private static instance: KeyManager;
  private keyPair: KeyPair | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await sodium.ready;
    this.initialized = true;
  }

  async generateKeyPair(): Promise<KeyPair> {
    await this.initialize();
    
    const keyPair = sodium.crypto_sign_keypair();
    this.keyPair = {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.privateKey
    };
    
    return this.keyPair;
  }

  async loadKeyPair(secretKey: Uint8Array): Promise<KeyPair> {
    await this.initialize();
    
    // Extract public key from secret key (last 32 bytes of Ed25519 secret key)
    const publicKey = secretKey.slice(32, 64);
    this.keyPair = {
      publicKey,
      secretKey
    };
    
    return this.keyPair;
  }

  getKeyPair(): KeyPair | null {
    return this.keyPair;
  }

  exportKeys(): { publicKey: string; secretKey: string } | null {
    if (!this.keyPair) return null;
    
    return {
      publicKey: sodium.to_base64(this.keyPair.publicKey),
      secretKey: sodium.to_base64(this.keyPair.secretKey)
    };
  }

  async importKeys(publicKeyBase64: string, secretKeyBase64: string): Promise<KeyPair> {
    await this.initialize();
    
    this.keyPair = {
      publicKey: sodium.from_base64(publicKeyBase64),
      secretKey: sodium.from_base64(secretKeyBase64)
    };
    
    return this.keyPair;
  }

  clearKeys(): void {
    this.keyPair = null;
  }
}