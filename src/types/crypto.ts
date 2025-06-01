// Web Crypto API types (from shuffle branch)
export interface WebCryptoKeyPair {
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

// libsodium types (from signature branch)
export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface SignedMessage {
  message: string;
  signature: string;
  publicKey: string;
  timestamp: number;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

export interface ActionLog {
  id: string;
  action: string; // Serialized game action
  signature: string;
  publicKey: string;
  timestamp: number;
  previousHash: string;
}

export interface GameVerificationReport {
  gameId: string;
  valid: boolean;
  totalActions: number;
  validActions: number;
  invalidActions: string[];
  errors: string[];
  timestamp: number;
}

export interface DecryptionProof {
  tileIndex: number;
  encryptedTile: string;
  decryptedTile: string;
  proof: string;
  timestamp: number;
  signature: string;
}