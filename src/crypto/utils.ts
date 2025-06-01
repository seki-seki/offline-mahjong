import forge from 'node-forge';

export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  
  const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
  const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
  
  return { publicKey, privateKey };
}

export function randomBytes(length: number): string {
  const bytes = forge.random.getBytesSync(length);
  return forge.util.encode64(bytes);
}

export function hashData(data: string): string {
  const md = forge.md.sha256.create();
  md.update(data);
  return md.digest().toHex();
}

export function signData(data: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(data, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

export function verifySignature(data: string, signature: string, publicKeyPem: string): boolean {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');
    const signatureBytes = forge.util.decode64(signature);
    return publicKey.verify(md.digest().bytes(), signatureBytes);
  } catch {
    return false;
  }
}