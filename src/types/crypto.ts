export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  ephemeralPublicKey: JsonWebKey;
}

export interface SerializedEncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  ephemeralPublicKey: JsonWebKey;
}

export type TileValue = string;

export interface EncryptedTile {
  id: string;
  encryptedData: SerializedEncryptedData[];
}