import { Tile, tilesEqual, sortTiles, TileNumber } from '../types/tile';
import { Meld, createChi, createPon, createKan } from '../types/meld';
import { Hand, createHand } from '../types/hand';

export class HandManager {
  private hand: Hand;

  constructor() {
    this.hand = createHand();
  }

  getHand(): Hand {
    return this.hand;
  }

  getTiles(): Tile[] {
    return [...this.hand.tiles];
  }

  getMelds(): Meld[] {
    return [...this.hand.melds];
  }

  getDiscards(): Tile[] {
    return [...this.hand.discards];
  }

  addTile(tile: Tile): void {
    this.hand.tiles.push(tile);
    this.sortHand();
  }

  removeTile(tile: Tile): boolean {
    const index = this.hand.tiles.findIndex(t => tilesEqual(t, tile));
    if (index !== -1) {
      this.hand.tiles.splice(index, 1);
      return true;
    }
    return false;
  }

  discard(tile: Tile): boolean {
    if (this.removeTile(tile)) {
      this.hand.discards.push(tile);
      // Discarding breaks ippatsu
      this.hand.ippatsu = false;
      return true;
    }
    return false;
  }

  canChi(tile: Tile, playerPosition: number): Tile[][] {
    // Chi can only be done from the player to the left (previous player)
    if (playerPosition !== 3) { // Assuming 3 is the previous player
      return [];
    }

    if (tile.type === 'honor') {
      return [];
    }

    const possibleChis: Tile[][] = [];
    const tiles = this.getTiles();

    // Check for possible sequences
    const suitTiles = tiles.filter(t => t.type === tile.type && t.type !== 'honor');

    // Pattern 1: tile is the lowest (need +1, +2)
    if (tile.number! <= 7) {
      const hasNext1 = suitTiles.some(t => t.number === tile.number! + 1);
      const hasNext2 = suitTiles.some(t => t.number === tile.number! + 2);
      if (hasNext1 && hasNext2) {
        possibleChis.push([
          tile,
          { ...tile, number: (tile.number! + 1) as TileNumber },
          { ...tile, number: (tile.number! + 2) as TileNumber }
        ]);
      }
    }

    // Pattern 2: tile is in the middle (need -1, +1)
    if (tile.number! >= 2 && tile.number! <= 8) {
      const hasPrev = suitTiles.some(t => t.number === tile.number! - 1);
      const hasNext = suitTiles.some(t => t.number === tile.number! + 1);
      if (hasPrev && hasNext) {
        possibleChis.push([
          { ...tile, number: (tile.number! - 1) as TileNumber },
          tile,
          { ...tile, number: (tile.number! + 1) as TileNumber }
        ]);
      }
    }

    // Pattern 3: tile is the highest (need -2, -1)
    if (tile.number! >= 3) {
      const hasPrev1 = suitTiles.some(t => t.number === tile.number! - 1);
      const hasPrev2 = suitTiles.some(t => t.number === tile.number! - 2);
      if (hasPrev1 && hasPrev2) {
        possibleChis.push([
          { ...tile, number: (tile.number! - 2) as TileNumber },
          { ...tile, number: (tile.number! - 1) as TileNumber },
          tile
        ]);
      }
    }

    return possibleChis;
  }

  canPon(tile: Tile): boolean {
    const count = this.hand.tiles.filter(t => tilesEqual(t, tile)).length;
    return count >= 2;
  }

  canKan(tile: Tile): boolean {
    const count = this.hand.tiles.filter(t => tilesEqual(t, tile)).length;
    return count >= 3;
  }

  canAnkan(): Tile[] {
    const tileCounts = new Map<string, { tile: Tile; count: number }>();
    
    for (const tile of this.hand.tiles) {
      const key = this.getTileKey(tile);
      const existing = tileCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        tileCounts.set(key, { tile, count: 1 });
      }
    }

    const kanTiles: Tile[] = [];
    for (const { tile, count } of tileCounts.values()) {
      if (count === 4) {
        kanTiles.push(tile);
      }
    }

    return kanTiles;
  }

  canMinkan(): Tile[] {
    const minkanTiles: Tile[] = [];
    
    for (const meld of this.hand.melds) {
      if (meld.type === 'pon' && meld.isOpen) {
        const ponTile = meld.tiles[0];
        const hasInHand = this.hand.tiles.some(t => tilesEqual(t, ponTile));
        if (hasInHand) {
          minkanTiles.push(ponTile);
        }
      }
    }

    return minkanTiles;
  }

  makeChi(tiles: Tile[], fromPlayer: number): boolean {
    // Verify it's a valid chi
    if (tiles.length !== 3) return false;
    
    // Remove two tiles from hand (the third comes from discard)
    const tilesToRemove = tiles.filter((_, i) => i !== tiles.findIndex(t => t === tiles.find(t2 => t2 === t)));
    for (const tile of tilesToRemove) {
      if (!this.removeTile(tile)) {
        // Rollback if we can't remove all tiles
        return false;
      }
    }

    const meld = createChi(sortTiles(tiles), fromPlayer);
    this.hand.melds.push(meld);
    this.hand.menzen = false;
    this.hand.ippatsu = false; // Calling breaks ippatsu
    return true;
  }

  makePon(tile: Tile, fromPlayer: number): boolean {
    // Remove 2 tiles from hand
    let removed = 0;
    for (let i = 0; i < 2; i++) {
      if (this.removeTile(tile)) {
        removed++;
      }
    }

    if (removed !== 2) {
      // Rollback
      for (let i = 0; i < removed; i++) {
        this.addTile(tile);
      }
      return false;
    }

    const meld = createPon([tile, tile, tile], fromPlayer);
    this.hand.melds.push(meld);
    this.hand.menzen = false;
    this.hand.ippatsu = false;
    return true;
  }

  makeKan(tile: Tile, fromPlayer?: number): boolean {
    if (fromPlayer !== undefined) {
      // Open kan
      let removed = 0;
      for (let i = 0; i < 3; i++) {
        if (this.removeTile(tile)) {
          removed++;
        }
      }

      if (removed !== 3) {
        // Rollback
        for (let i = 0; i < removed; i++) {
          this.addTile(tile);
        }
        return false;
      }

      const meld = createKan([tile, tile, tile, tile], fromPlayer);
      this.hand.melds.push(meld);
      this.hand.menzen = false;
      this.hand.ippatsu = false;
    } else {
      // Closed kan (ankan)
      let removed = 0;
      for (let i = 0; i < 4; i++) {
        if (this.removeTile(tile)) {
          removed++;
        }
      }

      if (removed !== 4) {
        // Rollback
        for (let i = 0; i < removed; i++) {
          this.addTile(tile);
        }
        return false;
      }

      const meld = createKan([tile, tile, tile, tile]);
      this.hand.melds.push(meld);
      // Ankan doesn't break menzen, but breaks ippatsu
      this.hand.ippatsu = false;
    }

    return true;
  }

  makeMinkan(tile: Tile): boolean {
    // Find the pon meld
    const ponIndex = this.hand.melds.findIndex(
      meld => meld.type === 'pon' && tilesEqual(meld.tiles[0], tile)
    );

    if (ponIndex === -1) {
      return false;
    }

    // Remove the tile from hand
    if (!this.removeTile(tile)) {
      return false;
    }

    // Replace the pon with a minkan
    const ponMeld = this.hand.melds[ponIndex];
    const minkan = createKan(
      [tile, tile, tile, tile],
      ponMeld.fromPlayer,
      true
    );
    this.hand.melds[ponIndex] = minkan;
    this.hand.ippatsu = false;

    return true;
  }

  declareRiichi(turn: number): boolean {
    if (!this.hand.menzen) {
      return false;
    }

    this.hand.riichi = true;
    this.hand.riichiTurn = turn;
    this.hand.ippatsu = true;
    return true;
  }

  sortHand(): void {
    this.hand.tiles = sortTiles(this.hand.tiles);
  }

  private getTileKey(tile: Tile): string {
    if (tile.type === 'honor') {
      return `${tile.type}_${tile.honor}`;
    }
    return `${tile.type}_${tile.number}`;
  }
}