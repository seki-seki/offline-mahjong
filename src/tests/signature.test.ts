import {
  KeyManager,
  SignatureService,
  VerificationManager,
  ActionLogService,
  DecryptionProofService
} from '../index';
import { ActionType, GameStartAction, DrawAction } from '../types/game';

async function testSignatureSystem() {
  console.log('Starting signature system tests...\n');

  // Initialize services
  const keyManager = KeyManager.getInstance();
  const signatureService = SignatureService.getInstance();
  const verificationManager = VerificationManager.getInstance();
  const actionLogService = ActionLogService.getInstance();
  const decryptionProofService = DecryptionProofService.getInstance();

  await keyManager.initialize();
  await signatureService.initialize();
  await verificationManager.initialize();

  // Test 1: Key generation
  console.log('Test 1: Key Generation');
  const player1Keys = await keyManager.generateKeyPair();
  console.log('✓ Generated key pair for player 1');
  
  const exportedKeys = keyManager.exportKeys();
  console.log('✓ Exported keys:', {
    publicKey: exportedKeys?.publicKey.substring(0, 20) + '...',
    secretKey: exportedKeys?.secretKey.substring(0, 20) + '...'
  });

  // Test 2: Action signing
  console.log('\nTest 2: Action Signing');
  const gameStartAction: GameStartAction = {
    id: 'action-1',
    type: ActionType.GAME_START,
    playerId: 'player-1',
    timestamp: Date.now(),
    data: {
      players: ['player-1', 'player-2', 'player-3', 'player-4']
    }
  };

  const signedAction = await signatureService.signAction(gameStartAction);
  console.log('✓ Signed game start action');
  console.log('  Signature:', signedAction.signature?.substring(0, 40) + '...');

  // Test 3: Signature verification
  console.log('\nTest 3: Signature Verification');
  const verificationResult = await signatureService.verifyAction(
    signedAction,
    player1Keys.publicKey
  );
  console.log('✓ Verification result:', verificationResult);

  // Test 4: Verification manager
  console.log('\nTest 4: Verification Manager');
  verificationManager.registerPlayer('player-1', keyManager.exportKeys()!.publicKey);
  
  const drawAction: DrawAction = {
    id: 'action-2',
    type: ActionType.DRAW,
    playerId: 'player-1',
    timestamp: Date.now(),
    data: {
      tileIndex: 0,
      encryptedTile: 'encrypted-tile-data'
    }
  };

  const signedDrawAction = await signatureService.signAction(drawAction);
  const realTimeVerification = await verificationManager.verifyAndLogAction(signedDrawAction);
  console.log('✓ Real-time verification:', realTimeVerification);

  // Test 5: Action log
  console.log('\nTest 5: Action Log');
  const logs = actionLogService.getLogs();
  console.log('✓ Action logs count:', logs.length);
  
  const chainVerification = await actionLogService.verifyChain();
  console.log('✓ Chain verification:', chainVerification);

  // Test 6: Decryption proof
  console.log('\nTest 6: Decryption Proof');
  const decryptionKey = new Uint8Array(32); // Mock key
  const proof = await decryptionProofService.generateDecryptionProof(
    0,
    'encrypted-tile',
    '1-wan',
    decryptionKey
  );
  console.log('✓ Generated decryption proof');

  const proofValid = await decryptionProofService.verifyDecryptionProof(
    proof,
    player1Keys.publicKey
  );
  console.log('✓ Proof verification:', proofValid);

  // Test 7: Game verification report
  console.log('\nTest 7: Game Verification Report');
  const gameReport = await verificationManager.verifyGameComplete();
  console.log('✓ Game verification report:', {
    valid: gameReport.valid,
    totalActions: gameReport.totalActions,
    validActions: gameReport.validActions
  });

  // Test 8: Export verification data
  console.log('\nTest 8: Export Verification Data');
  const exportedData = verificationManager.exportVerificationData();
  console.log('✓ Exported verification data size:', exportedData.length, 'bytes');

  console.log('\n✅ All tests completed successfully!');
}

// Run tests
testSignatureSystem().catch(console.error);