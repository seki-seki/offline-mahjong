import { Tile, compareTiles } from '../types/tile';

export class HandEvaluator {
  public canWin(hand: Tile[]): boolean {
    if (hand.length !== 14 && hand.length !== 13) return false;
    
    const sortedHand = [...hand].sort(compareTiles);
    
    return this.checkWinningPattern(sortedHand);
  }

  private checkWinningPattern(tiles: Tile[]): boolean {
    for (let i = 0; i < tiles.length - 1; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (this.tilesMatch(tiles[i], tiles[j])) {
          const remaining = [...tiles];
          remaining.splice(j, 1);
          remaining.splice(i, 1);
          
          if (this.checkMelds(remaining)) {
            return true;
          }
        }
      }
    }
    
    return this.checkSevenPairs(tiles) || this.checkKokushi(tiles);
  }

  private checkMelds(tiles: Tile[]): boolean {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;
    
    if (tiles.length >= 3 && this.tilesMatch(tiles[0], tiles[1]) && this.tilesMatch(tiles[1], tiles[2])) {
      const remaining = [...tiles];
      remaining.splice(0, 3);
      if (this.checkMelds(remaining)) return true;
    }
    
    if (tiles.length >= 3 && this.isSequence(tiles[0], tiles[1], tiles[2])) {
      const remaining = [...tiles];
      remaining.splice(0, 3);
      if (this.checkMelds(remaining)) return true;
    }
    
    for (let i = 1; i < tiles.length - 1; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (this.isSequence(tiles[0], tiles[i], tiles[j])) {
          const remaining = [...tiles];
          remaining.splice(j, 1);
          remaining.splice(i, 1);
          remaining.splice(0, 1);
          if (this.checkMelds(remaining)) return true;
        }
      }
    }
    
    return false;
  }

  private checkSevenPairs(tiles: Tile[]): boolean {
    if (tiles.length !== 14) return false;
    
    const sorted = [...tiles].sort(compareTiles);
    for (let i = 0; i < 14; i += 2) {
      if (!this.tilesMatch(sorted[i], sorted[i + 1])) {
        return false;
      }
    }
    
    return true;
  }

  private checkKokushi(tiles: Tile[]): boolean {
    if (tiles.length !== 14) return false;
    
    const terminals: string[] = [
      'man_1', 'man_9', 'pin_1', 'pin_9', 'sou_1', 'sou_9',
      'honor_east', 'honor_south', 'honor_west', 'honor_north',
      'honor_white', 'honor_green', 'honor_red'
    ];
    
    const tileKeys = tiles.map(t => {
      if (t.type === 'honor') {
        return `honor_${t.honor}`;
      }
      return `${t.type}_${t.number}`;
    });
    
    let pairFound = false;
    for (const terminal of terminals) {
      const count = tileKeys.filter(k => k === terminal).length;
      if (count === 0) return false;
      if (count === 2) {
        if (pairFound) return false;
        pairFound = true;
      }
      if (count > 2) return false;
    }
    
    return pairFound;
  }

  private tilesMatch(tile1: Tile, tile2: Tile): boolean {
    if (tile1.type !== tile2.type) return false;
    
    if (tile1.type === 'honor' && tile2.type === 'honor') {
      return tile1.honor === tile2.honor;
    }
    
    if (tile1.type !== 'honor' && tile2.type !== 'honor') {
      return tile1.number === tile2.number;
    }
    
    return false;
  }

  private isSequence(tile1: Tile, tile2: Tile, tile3: Tile): boolean {
    if (tile1.type === 'honor' || tile2.type === 'honor' || tile3.type === 'honor') {
      return false;
    }
    
    if (tile1.type !== tile2.type || tile2.type !== tile3.type) {
      return false;
    }
    
    const numbers = [tile1.number, tile2.number, tile3.number].sort((a, b) => a - b);
    return numbers[0] + 1 === numbers[1] && numbers[1] + 1 === numbers[2];
  }
}