import {
  KeyPair,
  ExportedKeyPair,
  EncryptedData,
  SerializedEncryptedData,
  TileValue,
  EncryptedTile
} from '../types/crypto';
<<<<<<< HEAD
=======
import { CryptoError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';
>>>>>>> origin/main

export class CryptoService {
  private static readonly ECDH_ALGORITHM = 'ECDH';
  private static readonly CURVE = 'P-256';
  private static readonly AES_ALGORITHM = 'AES-GCM';
  private static readonly AES_KEY_LENGTH = 256;

  static async generateKeyPair(): Promise<KeyPair> {
<<<<<<< HEAD
    const keyPair = await crypto.subtle.generateKey(
      {
        name: this.ECDH_ALGORITHM,
        namedCurve: this.CURVE,
      },
      true,
      ['deriveKey']
    );

    return keyPair;
=======
    try {
      logger.debug('Generating key pair');
      const keyPair = await crypto.subtle.generateKey(
        {
          name: this.ECDH_ALGORITHM,
          namedCurve: this.CURVE,
        },
        true,
        ['deriveKey']
      );

      logger.debug('Key pair generated successfully');
      return keyPair;
    } catch (error) {
      const cryptoError = new CryptoError(
        ErrorCode.CRYPTO_KEY_GENERATION_FAILED,
        `Failed to generate key pair: ${error}`,
        { originalError: error }
      );
      logger.error('Key generation failed', cryptoError);
      throw cryptoError;
    }
>>>>>>> origin/main
  }

  static async exportKeyPair(keyPair: KeyPair): Promise<ExportedKeyPair> {
    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    
    return { publicKey, privateKey };
  }

  static async importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: this.ECDH_ALGORITHM,
        namedCurve: this.CURVE,
      },
      true,
      []
    );
  }

  static async importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: this.ECDH_ALGORITHM,
        namedCurve: this.CURVE,
      },
      true,
      ['deriveKey']
    );
  }

  static async importKeyPair(exported: ExportedKeyPair): Promise<KeyPair> {
    const publicKey = await this.importPublicKey(exported.publicKey);
    const privateKey = await this.importPrivateKey(exported.privateKey);
    
    return { publicKey, privateKey };
  }

  private static async deriveSharedKey(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
      {
        name: this.ECDH_ALGORITHM,
        public: publicKey,
      },
      privateKey,
      {
        name: this.AES_ALGORITHM,
        length: this.AES_KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(
    data: ArrayBuffer,
    recipientPublicKey: CryptoKey
  ): Promise<EncryptedData> {
<<<<<<< HEAD
    // Generate ephemeral key pair for this encryption
    const ephemeralKeyPair = await this.generateKeyPair();
    
    // Derive shared key
    const sharedKey = await this.deriveSharedKey(
      ephemeralKeyPair.privateKey,
      recipientPublicKey
    );

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: this.AES_ALGORITHM,
        iv: iv,
      },
      sharedKey,
      data
    );

    // Export ephemeral public key
    const ephemeralPublicKey = await crypto.subtle.exportKey(
      'jwk',
      ephemeralKeyPair.publicKey
    );

    return {
      ciphertext,
      iv,
      ephemeralPublicKey,
    };
=======
    try {
      logger.debug('Starting encryption', { dataSize: data.byteLength });
      
      // Generate ephemeral key pair for this encryption
      const ephemeralKeyPair = await this.generateKeyPair();
      
      // Derive shared key
      const sharedKey = await this.deriveSharedKey(
        ephemeralKeyPair.privateKey,
        recipientPublicKey
      );

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: this.AES_ALGORITHM,
          iv: iv,
        },
        sharedKey,
        data
      );

      // Export ephemeral public key
      const ephemeralPublicKey = await crypto.subtle.exportKey(
        'jwk',
        ephemeralKeyPair.publicKey
      );

      logger.debug('Encryption completed successfully');
      return {
        ciphertext,
        iv,
        ephemeralPublicKey,
      };
    } catch (error) {
      const cryptoError = new CryptoError(
        ErrorCode.CRYPTO_ENCRYPTION_FAILED,
        `Encryption failed: ${error}`,
        { originalError: error, dataSize: data.byteLength }
      );
      logger.error('Encryption failed', cryptoError);
      throw cryptoError;
    }
>>>>>>> origin/main
  }

  static async decrypt(
    encryptedData: EncryptedData,
    recipientPrivateKey: CryptoKey
  ): Promise<ArrayBuffer> {
<<<<<<< HEAD
    // Import ephemeral public key
    const ephemeralPublicKey = await this.importPublicKey(
      encryptedData.ephemeralPublicKey
    );

    // Derive shared key
    const sharedKey = await this.deriveSharedKey(
      recipientPrivateKey,
      ephemeralPublicKey
    );

    // Decrypt data
    const plaintext = await crypto.subtle.decrypt(
      {
        name: this.AES_ALGORITHM,
        iv: encryptedData.iv,
      },
      sharedKey,
      encryptedData.ciphertext
    );

    return plaintext;
=======
    try {
      logger.debug('Starting decryption');
      
      // Import ephemeral public key
      const ephemeralPublicKey = await this.importPublicKey(
        encryptedData.ephemeralPublicKey
      );

      // Derive shared key
      const sharedKey = await this.deriveSharedKey(
        recipientPrivateKey,
        ephemeralPublicKey
      );

      // Decrypt data
      const plaintext = await crypto.subtle.decrypt(
        {
          name: this.AES_ALGORITHM,
          iv: encryptedData.iv,
        },
        sharedKey,
        encryptedData.ciphertext
      );

      logger.debug('Decryption completed successfully');
      return plaintext;
    } catch (error) {
      const cryptoError = new CryptoError(
        ErrorCode.CRYPTO_DECRYPTION_FAILED,
        `Decryption failed: ${error}`,
        { originalError: error }
      );
      logger.error('Decryption failed', cryptoError);
      throw cryptoError;
    }
>>>>>>> origin/main
  }

  static serializeEncryptedData(data: EncryptedData): SerializedEncryptedData {
    return {
      ciphertext: this.arrayBufferToBase64(data.ciphertext),
      iv: this.arrayBufferToBase64(data.iv),
      ephemeralPublicKey: data.ephemeralPublicKey,
    };
  }

  static deserializeEncryptedData(data: SerializedEncryptedData): EncryptedData {
    return {
      ciphertext: this.base64ToArrayBuffer(data.ciphertext),
      iv: new Uint8Array(this.base64ToArrayBuffer(data.iv)),
      ephemeralPublicKey: data.ephemeralPublicKey,
    };
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  static async encryptTile(
    tileValue: TileValue,
    publicKeys: CryptoKey[]
  ): Promise<EncryptedTile> {
    const encoder = new TextEncoder();
    let data = encoder.encode(tileValue);
    const encryptedLayers: SerializedEncryptedData[] = [];

    // Apply encryption in order
    for (const publicKey of publicKeys) {
      const encrypted = await this.encrypt(data, publicKey);
      encryptedLayers.push(this.serializeEncryptedData(encrypted));
      
      // Use the ciphertext as input for next layer
      data = new Uint8Array(encrypted.ciphertext);
    }

    return {
      id: crypto.randomUUID(),
      encryptedData: encryptedLayers,
    };
  }

  static async decryptTile(
    encryptedTile: EncryptedTile,
    privateKeys: CryptoKey[]
  ): Promise<TileValue> {
    if (encryptedTile.encryptedData.length !== privateKeys.length) {
      throw new Error('Number of encryption layers does not match number of keys');
    }

    let currentData: ArrayBuffer | undefined;

    // Decrypt in reverse order (D -> C -> B -> A)
    // privateKeys are already in reverse order, encryptedData is in forward order
    for (let i = privateKeys.length - 1; i >= 0; i--) {
      const encryptedLayer = this.deserializeEncryptedData(encryptedTile.encryptedData[i]);
      
      // For the outermost layer, use the encrypted data as is
      // For inner layers, use the result from the previous decryption
      if (i === privateKeys.length - 1) {
        currentData = await this.decrypt(encryptedLayer, privateKeys[privateKeys.length - 1 - i]);
      } else {
        // The current data is the ciphertext for the next layer
        encryptedLayer.ciphertext = currentData!;
        currentData = await this.decrypt(encryptedLayer, privateKeys[privateKeys.length - 1 - i]);
      }
    }

    if (!currentData) {
      throw new Error('Decryption failed');
    }

    // Final result should be the original tile value
    const decoder = new TextDecoder();
    return decoder.decode(currentData);
  }
}