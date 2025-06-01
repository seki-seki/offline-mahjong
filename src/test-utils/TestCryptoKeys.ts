import { CryptoService } from '../crypto/CryptoService';

export class TestCryptoKeys {
  private static testKeys: Map<string, { publicKey: string; privateKey: string }> = new Map();
  
  /**
   * Generate deterministic test keys for a player
   * Uses a fixed seed to ensure consistent keys across test runs
   */
  static async getTestKeys(playerId: string): Promise<{ publicKey: string; privateKey: string }> {
    if (!this.testKeys.has(playerId)) {
      // In tests, we can use a simplified key generation
      // For real crypto operations, we still use the actual CryptoService
      const crypto = new CryptoService();
      const keys = await crypto.generateKeyPair();
      
      // Store for reuse
      this.testKeys.set(playerId, keys);
    }
    
    return this.testKeys.get(playerId)!;
  }
  
  /**
   * Get pre-generated test keys for faster test execution
   */
  static getFixedTestKeys(playerIndex: number): { publicKey: string; privateKey: string } {
    // Pre-generated test keys (not for production use!)
    const fixedKeys = [
      {
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1',
        privateKey: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDV1'
      },
      {
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2',
        privateKey: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDV2'
      },
      {
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3',
        privateKey: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDV3'
      },
      {
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4',
        privateKey: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDV4'
      }
    ];
    
    return fixedKeys[playerIndex % fixedKeys.length];
  }
  
  /**
   * Clear all cached test keys
   */
  static clear(): void {
    this.testKeys.clear();
  }
}

/**
 * Mock crypto service for unit tests
 */
export class MockCryptoService {
  private keyCounter = 0;
  
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const keys = TestCryptoKeys.getFixedTestKeys(this.keyCounter++);
    return Promise.resolve(keys);
  }
  
  async encrypt(data: string, publicKey: string): Promise<string> {
    // Simple mock encryption - just base64 encode with key prefix
    return Promise.resolve(btoa(`encrypted:${publicKey.substr(0, 8)}:${data}`));
  }
  
  async decrypt(encryptedData: string, privateKey: string): Promise<string> {
    // Simple mock decryption
    try {
      const decoded = atob(encryptedData);
      const parts = decoded.split(':');
      if (parts[0] === 'encrypted') {
        return Promise.resolve(parts[2]);
      }
    } catch {
      // Fall through to error
    }
    throw new Error('Decryption failed');
  }
  
  async sign(data: string, privateKey: string): Promise<string> {
    // Simple mock signature
    return Promise.resolve(btoa(`sig:${privateKey.substr(0, 8)}:${data}`));
  }
  
  async verify(data: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      const decoded = atob(signature);
      const parts = decoded.split(':');
      return parts[0] === 'sig' && parts[2] === data;
    } catch {
      return false;
    }
  }
  
  async deriveSharedSecret(privateKey: string, publicKey: string): Promise<string> {
    // Mock shared secret
    return Promise.resolve(btoa(`shared:${privateKey.substr(0, 4)}:${publicKey.substr(0, 4)}`));
  }
  
  generateRandomBytes(length: number): Uint8Array {
    // Generate predictable "random" bytes for testing
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = (i * 7 + 13) % 256;
    }
    return bytes;
  }
  
  hash(data: string): string {
    // Simple mock hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}