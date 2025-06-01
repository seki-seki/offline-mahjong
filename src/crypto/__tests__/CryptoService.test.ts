import { describe, it, expect } from 'vitest';
import { CryptoService } from '../CryptoService';

describe('CryptoService', () => {
  it('should generate a valid key pair', async () => {
    const keyPair = await CryptoService.generateKeyPair();
    
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey.type).toBe('public');
    expect(keyPair.privateKey.type).toBe('private');
  });

  it('should export and import key pairs', async () => {
    const keyPair = await CryptoService.generateKeyPair();
    const exported = await CryptoService.exportKeyPair(keyPair);
    
    expect(exported.publicKey).toBeDefined();
    expect(exported.privateKey).toBeDefined();
    
    const imported = await CryptoService.importKeyPair(exported);
    expect(imported.publicKey).toBeDefined();
    expect(imported.privateKey).toBeDefined();
  });

  it('should encrypt and decrypt data', async () => {
    const keyPair = await CryptoService.generateKeyPair();
    const testData = 'Hello, Mahjong!';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const encrypted = await CryptoService.encrypt(
      encoder.encode(testData),
      keyPair.publicKey
    );
    
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ephemeralPublicKey).toBeDefined();
    
    const decrypted = await CryptoService.decrypt(encrypted, keyPair.privateKey);
    const decryptedText = decoder.decode(decrypted);
    
    expect(decryptedText).toBe(testData);
  });

  it('should handle multi-layer encryption for tiles', async () => {
    // Generate 4 key pairs for 4 players
    const keyPairs = await Promise.all([
      CryptoService.generateKeyPair(),
      CryptoService.generateKeyPair(),
      CryptoService.generateKeyPair(),
      CryptoService.generateKeyPair(),
    ]);
    
    const publicKeys = keyPairs.map(kp => kp.publicKey);
    const privateKeys = keyPairs.map(kp => kp.privateKey);
    
    const tileValue = '1m'; // 1 man
    
    // Encrypt tile with all 4 public keys
    const encryptedTile = await CryptoService.encryptTile(tileValue, publicKeys);
    
    expect(encryptedTile.id).toBeDefined();
    expect(encryptedTile.encryptedData).toHaveLength(4);
    
    // Decrypt tile with all 4 private keys in reverse order
    const decryptedValue = await CryptoService.decryptTile(encryptedTile, privateKeys.reverse());
    
    expect(decryptedValue).toBe(tileValue);
  });

  it('should fail decryption with wrong keys', async () => {
    const keyPair1 = await CryptoService.generateKeyPair();
    const keyPair2 = await CryptoService.generateKeyPair();
    
    const tileValue = '9p'; // 9 pin
    const encryptedTile = await CryptoService.encryptTile(tileValue, [keyPair1.publicKey]);
    
    // Try to decrypt with wrong private key
    await expect(
      CryptoService.decryptTile(encryptedTile, [keyPair2.privateKey])
    ).rejects.toThrow();
  });

  it('should serialize and deserialize encrypted data', async () => {
    const keyPair = await CryptoService.generateKeyPair();
    const testData = new TextEncoder().encode('Test data');
    
    const encrypted = await CryptoService.encrypt(testData, keyPair.publicKey);
    const serialized = CryptoService.serializeEncryptedData(encrypted);
    
    expect(typeof serialized.ciphertext).toBe('string');
    expect(typeof serialized.iv).toBe('string');
    expect(serialized.ephemeralPublicKey).toBeDefined();
    
    const deserialized = CryptoService.deserializeEncryptedData(serialized);
    const decrypted = await CryptoService.decrypt(deserialized, keyPair.privateKey);
    
    expect(new TextDecoder().decode(decrypted)).toBe('Test data');
  });
});