import { Tile, TileWithState } from '../types/tile';
import { generateFullTileSet, shuffleTiles } from '../utils/tileGenerator';

export class TileManager {
  private tiles: Map<string, TileWithState>;
  private wall: string[];
  private hands: Map<number, string[]>;
  private discards: Map<number, string[]>;
  private melds: Map<number, string[][]>;

  constructor() {
    this.tiles = new Map();
    this.wall = [];
    this.hands = new Map();
    this.discards = new Map();
    this.melds = new Map();
  }

  initialize(playerCount: number = 4): void {
    // 牌を生成
    const baseTiles = generateFullTileSet();
    const shuffledTiles = shuffleTiles(baseTiles);

    // 状態付きの牌として保存
    shuffledTiles.forEach(tile => {
      const tileWithState: TileWithState = {
        ...tile,
        state: 'wall'
      };
      this.tiles.set(tile.id, tileWithState);
      this.wall.push(tile.id);
    });

    // プレイヤーごとの手牌・捨て牌・鳴き牌の初期化
    for (let i = 0; i < playerCount; i++) {
      this.hands.set(i, []);
      this.discards.set(i, []);
      this.melds.set(i, []);
    }
  }

  // 牌を山から引く
  drawTile(playerId: number): Tile | null {
    if (this.wall.length === 0) return null;

    const tileId = this.wall.shift()!;
    const tile = this.tiles.get(tileId)!;
    
    tile.state = 'hand';
    tile.owner = playerId;
    
    const playerHand = this.hands.get(playerId) || [];
    playerHand.push(tileId);
    this.hands.set(playerId, playerHand);

    return { ...tile };
  }

  // 牌を捨てる
  discardTile(playerId: number, tileId: string): boolean {
    const tile = this.tiles.get(tileId);
    if (!tile || tile.owner !== playerId || tile.state !== 'hand') {
      return false;
    }

    // 手牌から削除
    const playerHand = this.hands.get(playerId) || [];
    const index = playerHand.indexOf(tileId);
    if (index === -1) return false;
    
    playerHand.splice(index, 1);
    this.hands.set(playerId, playerHand);

    // 捨て牌に追加
    tile.state = 'discard';
    const playerDiscards = this.discards.get(playerId) || [];
    playerDiscards.push(tileId);
    this.discards.set(playerId, playerDiscards);

    return true;
  }

  // 配牌を行う
  dealInitialHands(handSize: number = 13): void {
    const playerCount = this.hands.size;
    
    for (let i = 0; i < handSize; i++) {
      for (let playerId = 0; playerId < playerCount; playerId++) {
        this.drawTile(playerId);
      }
    }
  }

  // 特定のプレイヤーの手牌を取得
  getPlayerHand(playerId: number): Tile[] {
    const handIds = this.hands.get(playerId) || [];
    return handIds.map(id => ({ ...this.tiles.get(id)! }));
  }

  // 山牌の残り枚数を取得
  getWallCount(): number {
    return this.wall.length;
  }

  // 捨て牌を取得
  getDiscards(playerId: number): Tile[] {
    const discardIds = this.discards.get(playerId) || [];
    return discardIds.map(id => ({ ...this.tiles.get(id)! }));
  }

  // 全ての捨て牌を取得
  getAllDiscards(): Map<number, Tile[]> {
    const allDiscards = new Map<number, Tile[]>();
    this.discards.forEach((discardIds, playerId) => {
      allDiscards.set(playerId, discardIds.map(id => ({ ...this.tiles.get(id)! })));
    });
    return allDiscards;
  }

  // 牌を鳴く（ポン・チー・カン）
  meldTiles(playerId: number, tileIds: string[]): boolean {
    // 全ての牌が存在し、正しい状態であることを確認
    for (const tileId of tileIds) {
      const tile = this.tiles.get(tileId);
      if (!tile) return false;
    }

    // 牌を鳴き牌として設定
    tileIds.forEach(tileId => {
      const tile = this.tiles.get(tileId)!;
      
      // 手牌から削除（自分の手牌にある場合）
      if (tile.owner === playerId && tile.state === 'hand') {
        const playerHand = this.hands.get(playerId) || [];
        const index = playerHand.indexOf(tileId);
        if (index !== -1) {
          playerHand.splice(index, 1);
          this.hands.set(playerId, playerHand);
        }
      }
      
      tile.state = 'meld';
      tile.owner = playerId;
    });

    // 鳴き牌として登録
    const playerMelds = this.melds.get(playerId) || [];
    playerMelds.push(tileIds);
    this.melds.set(playerId, playerMelds);

    return true;
  }

  // 牌の状態を取得
  getTileState(tileId: string): TileWithState | null {
    return this.tiles.get(tileId) || null;
  }
}