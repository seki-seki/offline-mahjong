import { Tile, tilesEqual, sortTiles } from '../types/tile';

export interface TileGroup {
  tiles: Tile[];
  type: 'pair' | 'triplet' | 'sequence' | 'kan';
}

export function countTiles(tiles: Tile[]): Map<string, { tile: Tile; count: number }> {
  const counts = new Map<string, { tile: Tile; count: number }>();
  
  for (const tile of tiles) {
    const key = tileKey(tile);
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { tile, count: 1 });
    }
  }
  
  return counts;
}

function tileKey(tile: Tile): string {
  if (tile.type === 'honor') {
    return `${tile.type}_${tile.honor}`;
  }
  return `${tile.type}_${tile.number}`;
}

export function findPairs(tiles: Tile[]): TileGroup[] {
  const counts = countTiles(tiles);
  const pairs: TileGroup[] = [];
  
  for (const { tile, count } of counts.values()) {
    if (count >= 2) {
      pairs.push({
        tiles: [tile, tile],
        type: 'pair'
      });
    }
  }
  
  return pairs;
}

export function findTriplets(tiles: Tile[]): TileGroup[] {
  const counts = countTiles(tiles);
  const triplets: TileGroup[] = [];
  
  for (const { tile, count } of counts.values()) {
    if (count >= 3) {
      triplets.push({
        tiles: [tile, tile, tile],
        type: 'triplet'
      });
    }
  }
  
  return triplets;
}

export function findSequences(tiles: Tile[]): TileGroup[] {
  const sequences: TileGroup[] = [];
  const sorted = sortTiles(tiles);
  
  // Group tiles by type
  const tilesByType = new Map<string, Tile[]>();
  for (const tile of sorted) {
    if (tile.type === 'honor') continue; // Honors can't form sequences
    
    const existing = tilesByType.get(tile.type) || [];
    existing.push(tile);
    tilesByType.set(tile.type, existing);
  }
  
  // Find sequences in each suit
  for (const [type, suitTiles] of tilesByType) {
    const counts = countTiles(suitTiles);
    
    for (let num = 1; num <= 7; num++) {
      const tile1 = counts.get(`${type}_${num}`);
      const tile2 = counts.get(`${type}_${num + 1}`);
      const tile3 = counts.get(`${type}_${num + 2}`);
      
      if (tile1 && tile2 && tile3) {
        const minCount = Math.min(tile1.count, tile2.count, tile3.count);
        for (let i = 0; i < minCount; i++) {
          sequences.push({
            tiles: [tile1.tile, tile2.tile, tile3.tile],
            type: 'sequence'
          });
        }
      }
    }
  }
  
  return sequences;
}

export function removeTilesFromHand(hand: Tile[], tilesToRemove: Tile[]): Tile[] {
  const remaining = [...hand];
  
  for (const tileToRemove of tilesToRemove) {
    const index = remaining.findIndex(tile => tilesEqual(tile, tileToRemove));
    if (index !== -1) {
      remaining.splice(index, 1);
    }
  }
  
  return remaining;
}

export interface CompleteHand {
  groups: TileGroup[];
  waitingTile?: Tile;
}

export function isCompleteHand(tiles: Tile[]): CompleteHand | null {
  if (tiles.length !== 14 && tiles.length !== 13) {
    return null;
  }
  
  // Try standard hand (4 groups + 1 pair)
  const standardHand = tryStandardHand(tiles);
  if (standardHand) {
    return standardHand;
  }
  
  // Try seven pairs
  const sevenPairs = trySevenPairs(tiles);
  if (sevenPairs) {
    return sevenPairs;
  }
  
  // Try kokushi musou
  const kokushi = tryKokushi(tiles);
  if (kokushi) {
    return kokushi;
  }
  
  return null;
}

function tryStandardHand(tiles: Tile[]): CompleteHand | null {
  const pairs = findPairs(tiles);
  
  for (const pair of pairs) {
    const remainingTiles = removeTilesFromHand(tiles, pair.tiles);
    const groups = findMentsu(remainingTiles);
    
    if (groups && groups.length === 4) {
      return {
        groups: [pair, ...groups]
      };
    }
  }
  
  return null;
}

function findMentsu(tiles: Tile[], depth = 0): TileGroup[] | null {
  if (tiles.length === 0) {
    return [];
  }
  
  if (tiles.length % 3 !== 0) {
    return null;
  }
  
  // Try to find a triplet first
  const triplets = findTriplets(tiles);
  for (const triplet of triplets) {
    const remaining = removeTilesFromHand(tiles, triplet.tiles);
    const subGroups = findMentsu(remaining, depth + 1);
    if (subGroups !== null) {
      return [triplet, ...subGroups];
    }
  }
  
  // Try to find a sequence
  const sequences = findSequences(tiles);
  for (const sequence of sequences) {
    const remaining = removeTilesFromHand(tiles, sequence.tiles);
    const subGroups = findMentsu(remaining, depth + 1);
    if (subGroups !== null) {
      return [sequence, ...subGroups];
    }
  }
  
  return null;
}

function trySevenPairs(tiles: Tile[]): CompleteHand | null {
  if (tiles.length !== 14) {
    return null;
  }
  
  const counts = countTiles(tiles);
  const pairs: TileGroup[] = [];
  
  for (const { tile, count } of counts.values()) {
    if (count === 2) {
      pairs.push({
        tiles: [tile, tile],
        type: 'pair'
      });
    } else if (count !== 0) {
      return null; // Not all tiles form pairs
    }
  }
  
  if (pairs.length === 7) {
    return { groups: pairs };
  }
  
  return null;
}

function tryKokushi(tiles: Tile[]): CompleteHand | null {
  if (tiles.length !== 14) {
    return null;
  }
  
  const terminalAndHonors = [
    { type: 'man', number: 1 },
    { type: 'man', number: 9 },
    { type: 'pin', number: 1 },
    { type: 'pin', number: 9 },
    { type: 'sou', number: 1 },
    { type: 'sou', number: 9 },
    { type: 'honor', honor: 'east' },
    { type: 'honor', honor: 'south' },
    { type: 'honor', honor: 'west' },
    { type: 'honor', honor: 'north' },
    { type: 'honor', honor: 'white' },
    { type: 'honor', honor: 'green' },
    { type: 'honor', honor: 'red' }
  ] as Tile[];
  
  const counts = countTiles(tiles);
  let pairTile: Tile | null = null;
  
  for (const requiredTile of terminalAndHonors) {
    const key = tileKey(requiredTile);
    const tileCount = counts.get(key);
    
    if (!tileCount || tileCount.count === 0) {
      return null; // Missing a required tile
    }
    
    if (tileCount.count === 2) {
      if (pairTile) {
        return null; // More than one pair
      }
      pairTile = tileCount.tile;
    } else if (tileCount.count > 2) {
      return null; // Too many of one tile
    }
  }
  
  // Check that we don't have any other tiles
  let totalCount = 0;
  for (const { count } of counts.values()) {
    totalCount += count;
  }
  
  if (totalCount === 14 && pairTile) {
    // Create groups representing kokushi
    const groups: TileGroup[] = [{
      tiles: terminalAndHonors,
      type: 'triplet' // Special case for kokushi
    }, {
      tiles: [pairTile, pairTile],
      type: 'pair'
    }];
    
    return { groups };
  }
  
  return null;
}