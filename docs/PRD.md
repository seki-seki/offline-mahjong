# 🀄 完全サーバレス麻雀アプリ実装仕様（Claude用）

## 🎯 ゴール

- 完全サーバレス（フロントエンド＋P2P）の4人麻雀アプリ
- 全員で公平に山をシャッフル（1人も信用しない前提）
- ゲーム中の牌情報は本人以外に絶対漏れない
- ローカルでの進行、暗号ベースで不正防止

## 1️⃣ 初期化（セッション生成）

- 4人のプレイヤーがそれぞれ、**暗号鍵ペア（公開鍵 / 秘密鍵）**を生成
- 公開鍵は全員に共有する（署名付きで改ざん検出可能に）
- 通信は WebRTC などで全員がP2P接続済みの前提

## 2️⃣ 山（牌リスト）の構築・暗号シャッフル

### 牌の準備

```javascript
const tiles = generateFullTileSet(); // ["1m", ..., "E"] 136枚
```

### シャッフル＋暗号の流れ（親→時計回り）

**プレイヤーA（親）**
- tiles をシャッフル
- 各牌を 自分の鍵で暗号化（例：AES / ECIES）
- → プレイヤーBにリストを送信

**プレイヤーB〜D**
- 受け取ったリストをシャッフル
- 各牌を 自分の鍵でさらに暗号化
- → 次のプレイヤーへ送信

**プレイヤーAが最後に受け取り**
- 合計4段暗号＋複数回シャッフル済みの「山」が完成

## 3️⃣ 配牌とツモの仕組み

### 配牌
- 山リストの上から順に配牌インデックスを定義（例：0〜12がプレイヤーA）
- 自分の牌だけを、自分で復号（鍵D→C→B→Aの順に復号）

### ツモ
- ツモ順もインデックスで決まっている
- その牌を受け取った人が、復号処理を行う（4段階）

## 4️⃣ 暗号ロジック

- 暗号化は各プレイヤーの公開鍵を用いて行い、復号には秘密鍵を使う
- 復号順は暗号化と逆順
  - 暗号化：A → B → C → D
  - 復号：D → C → B → A

### 暗号方式の候補
- ✅ ECIES（楕円曲線暗号ベース）＋ランダムIV
- ✅ AES（共有鍵をECDHで生成）

## 5️⃣ ゲームの進行と同期

- 誰がどの牌を捨てたか・公開情報はP2Pでブロードキャスト
- ポン・チー・ロンなどのアクションは一定時間の受付制＋優先順位ルールで判定

### 推奨処理フロー
1. 誰かが捨て牌 → ブロードキャスト
2. 他3人はローカルでポン・ロン可能か判定
3. アクション希望があれば即P2P送信
4. 「優先順位（ロン＞ポン＞チー）」で自動判定＋次ターンへ

## 6️⃣ 不正防止と検証

### 不正防止の考え方
- 各復号ステップで 復号証明（署名やログ） を残すことで透明性を保つ
- 各手番での操作内容（捨てた牌など）も署名してP2P送信

### ゲーム終了後
- 全プレイヤーが自分の秘密鍵を公開（または中間鍵だけ）
- 山を順に復号し、全プレイヤーの行動が正しかったか検証可能

## 7️⃣ 機能分担（参考）

| 機能 | 方式 | 備考 |
|------|------|------|
| 牌リスト生成 | クライアント | 初期の1人だけでOK（全体でシャッフルするから偏らない） |
| シャッフル | 各クライアント | 順に暗号化＋シャッフル |
| 復号 | ローカル | 自分の牌だけ段階的に復号 |
| 進行管理 | P2P状態共有 | ターン制、リアクション受付、優先処理 |
| 不正検出 | 署名＋検証用ログ | 終了後に検証可能に |

## 🧩 技術スタック例（Claudeが選んで実装可）

- **暗号ライブラリ**：libsodium.js, crypto.subtle (WebCrypto)
- **通信**：WebRTC / PeerJS
- **状態管理**：ローカル状態＋ブロードキャスト整合性
- **UI**：任意（React/Vue/Svelteなど）

## ✨ 期待される実装単位

- `generateTileSet()`
- `encryptTile(tile, key)`
- `decryptTile(tile, key)`
- `shuffleEncryptedTiles(tiles)`
- `distributeTiles(encryptedDeck, playerKeys)`
- `drawTile(deck, playerKeys)`
- `broadcastAction(actionPayload)`
- `resolveReactions(actions)`