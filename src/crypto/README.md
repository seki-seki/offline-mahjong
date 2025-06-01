# 署名・検証システム

## 概要
このシステムは、オフライン麻雀ゲームにおける不正防止のための署名・検証機能を提供します。

## 主な機能

### 1. 鍵管理 (KeyManager)
- Ed25519鍵ペアの生成
- 鍵のエクスポート/インポート
- 安全な鍵の保管

### 2. 署名サービス (SignatureService)
- ゲームアクションへのECDSA署名
- 署名の検証
- リプレイ攻撃防止（nonce管理）
- タイムスタンプによる有効期限チェック

### 3. 復号証明 (DecryptionProofService)
- 暗号化された牌の復号証明生成
- 証明の検証
- 全証明の一括検証

## 使用方法

### 初期化
```typescript
import { KeyManager, SignatureService, VerificationManager } from './crypto';

// サービスの初期化
const keyManager = KeyManager.getInstance();
const signatureService = SignatureService.getInstance();
const verificationManager = VerificationManager.getInstance();

await keyManager.initialize();
await signatureService.initialize();
await verificationManager.initialize();
```

### 鍵ペアの生成
```typescript
// 新しい鍵ペアを生成
const keyPair = await keyManager.generateKeyPair();

// 鍵をエクスポート
const exportedKeys = keyManager.exportKeys();
console.log('Public Key:', exportedKeys.publicKey);
console.log('Secret Key:', exportedKeys.secretKey);
```

### アクションへの署名
```typescript
const action: GameAction = {
  id: 'action-123',
  type: ActionType.DRAW,
  playerId: 'player-1',
  timestamp: Date.now(),
  data: {
    tileIndex: 0,
    encryptedTile: 'encrypted-data'
  }
};

// アクションに署名
const signedAction = await signatureService.signAction(action);
```

### 署名の検証
```typescript
// プレイヤーを登録
verificationManager.registerPlayer('player-1', publicKeyBase64);

// リアルタイム検証
const result = await verificationManager.verifyAndLogAction(signedAction);
if (result.valid) {
  console.log('有効なアクション');
} else {
  console.log('無効なアクション:', result.error);
}
```

### ゲーム終了後の検証
```typescript
// 完全な検証レポートを生成
const report = await verificationManager.verifyGameComplete();
console.log('検証結果:', report);
```

## セキュリティ機能

1. **署名の偽造不可能性**: Ed25519署名により、秘密鍵なしに署名を偽造することは不可能
2. **リプレイ攻撃防止**: 各アクションに一意のIDを付与し、重複を検出
3. **タイムスタンプ検証**: 5分以内のアクションのみを有効とする
4. **ハッシュチェーン**: アクションログをハッシュチェーンで連結し、改ざんを防止

## データ構造

### GameAction
```typescript
interface GameAction {
  id: string;
  type: ActionType;
  playerId: PlayerID;
  timestamp: number;
  data: unknown;
  signature?: string;
}
```

### ActionLog
```typescript
interface ActionLog {
  id: string;
  action: string;
  signature: string;
  publicKey: string;
  timestamp: number;
  previousHash: string;
}
```

### GameVerificationReport
```typescript
interface GameVerificationReport {
  gameId: string;
  valid: boolean;
  totalActions: number;
  validActions: number;
  invalidActions: string[];
  errors: string[];
  timestamp: number;
}
```