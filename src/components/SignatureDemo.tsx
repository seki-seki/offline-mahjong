import React, { useState, useEffect } from 'react';
import { KeyManager, SignatureService, VerificationManager } from '../index';
import { ActionType, DrawAction } from '../types/game';

export const SignatureDemo: React.FC = () => {
  const [keyPair, setKeyPair] = useState<{ publicKey: string; secretKey: string } | null>(null);
  const [signedAction, setSignedAction] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      const keyManager = KeyManager.getInstance();
      const signatureService = SignatureService.getInstance();
      const verificationManager = VerificationManager.getInstance();
      
      await keyManager.initialize();
      await signatureService.initialize();
      await verificationManager.initialize();
      
      setIsInitialized(true);
    };
    
    init().catch(console.error);
  }, []);

  const generateKeys = async () => {
    const keyManager = KeyManager.getInstance();
    await keyManager.generateKeyPair();
    const keys = keyManager.exportKeys();
    if (keys) {
      setKeyPair(keys);
    }
  };

  const signAction = async () => {
    if (!keyPair) {
      alert('Please generate keys first');
      return;
    }

    const signatureService = SignatureService.getInstance();
    const action: DrawAction = {
      id: `action-${Date.now()}`,
      type: ActionType.DRAW,
      playerId: 'demo-player',
      timestamp: Date.now(),
      data: {
        tileIndex: Math.floor(Math.random() * 136),
        encryptedTile: 'demo-encrypted-tile'
      }
    };

    const signed = await signatureService.signAction(action);
    setSignedAction(JSON.stringify(signed, null, 2));

    // Verify the action
    const verificationManager = VerificationManager.getInstance();
    verificationManager.registerPlayer('demo-player', keyPair.publicKey);
    
    const result = await verificationManager.verifyAndLogAction(signed);
    setVerificationResult(JSON.stringify(result, null, 2));
  };

  if (!isInitialized) {
    return <div>Initializing crypto services...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>署名・検証システムデモ</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>1. 鍵ペア生成</h3>
        <button onClick={generateKeys}>鍵ペアを生成</button>
        {keyPair && (
          <div style={{ marginTop: '10px', background: '#f0f0f0', padding: '10px' }}>
            <div>公開鍵: {keyPair.publicKey.substring(0, 50)}...</div>
            <div>秘密鍵: {keyPair.secretKey.substring(0, 50)}...</div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>2. アクション署名</h3>
        <button onClick={signAction} disabled={!keyPair}>
          ツモアクションに署名
        </button>
        {signedAction && (
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
            {signedAction}
          </pre>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>3. 検証結果</h3>
        {verificationResult && (
          <pre style={{ background: '#f0f0f0', padding: '10px' }}>
            {verificationResult}
          </pre>
        )}
      </div>
    </div>
  );
};