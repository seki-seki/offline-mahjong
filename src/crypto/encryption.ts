import forge from 'node-forge';
import { EncryptedTile } from '../types';
import { randomBytes } from './utils';

export function encryptTile(
  tile: string | EncryptedTile,
  publicKeyPem: string,
  playerId: string
): EncryptedTile {
  const dataToEncrypt = typeof tile === 'string' ? tile : tile.encryptedData;
  const existingLayers = typeof tile === 'string' ? [] : tile.encryptionLayers;
  const tileId = typeof tile === 'string' ? `${tile}-${randomBytes(8)}` : tile.id;
  
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  
  const symmetricKey = forge.random.getBytesSync(32);
  const iv = forge.random.getBytesSync(16);
  
  const cipher = forge.cipher.createCipher('AES-GCM', symmetricKey);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(dataToEncrypt));
  cipher.finish();
  
  const encrypted = cipher.output.getBytes();
  const tag = cipher.mode.tag.getBytes();
  
  const encryptedSymmetricKey = publicKey.encrypt(symmetricKey, 'RSA-OAEP', {
    md: forge.md.sha256.create()
  });
  
  const encryptedData = forge.util.encode64(
    encryptedSymmetricKey + iv + tag + encrypted
  );
  
  
  return {
    id: tileId,
    encryptedData,
    encryptionLayers: [...existingLayers, playerId]
  };
}

export function decryptTile(
  encryptedTile: EncryptedTile,
  privateKeyPem: string,
  playerId: string
): string | EncryptedTile {
  const layerIndex = encryptedTile.encryptionLayers.lastIndexOf(playerId);
  if (layerIndex === -1) {
    throw new Error('Player did not encrypt this tile');
  }
  
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  
  const encryptedDataBytes = forge.util.decode64(encryptedTile.encryptedData);
  
  const keyLength = 256;
  const ivLength = 16;
  const tagLength = 16;
  
  const encryptedSymmetricKey = encryptedDataBytes.substring(0, keyLength);
  const iv = encryptedDataBytes.substring(keyLength, keyLength + ivLength);
  const tag = encryptedDataBytes.substring(keyLength + ivLength, keyLength + ivLength + tagLength);
  const encryptedContent = encryptedDataBytes.substring(keyLength + ivLength + tagLength);
  
  const symmetricKey = privateKey.decrypt(encryptedSymmetricKey, 'RSA-OAEP', {
    md: forge.md.sha256.create()
  });
  
  const decipher = forge.cipher.createDecipher('AES-GCM', symmetricKey);
  decipher.start({
    iv: iv,
    tag: forge.util.createBuffer(tag)
  });
  decipher.update(forge.util.createBuffer(encryptedContent));
  
  if (!decipher.finish()) {
    throw new Error('Failed to decrypt: authentication failed');
  }
  
  const decrypted = decipher.output.toString();
  
  if (layerIndex === 0) {
    return decrypted;
  } else {
    const newLayers = encryptedTile.encryptionLayers.slice(0, layerIndex);
    return {
      id: encryptedTile.id,
      encryptedData: decrypted,
      encryptionLayers: newLayers
    };
  }
}

export function encryptTiles(
  tiles: (string | EncryptedTile)[],
  publicKeyPem: string,
  playerId: string
): EncryptedTile[] {
  return tiles.map(tile => encryptTile(tile, publicKeyPem, playerId));
}