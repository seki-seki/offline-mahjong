import { Tile, HonorValue } from '../types/tile';

export function generateFullTileSet(): Tile[] {
  const tiles: Tile[] = [];
  let tileIdCounter = 0;

  // 萬子 (1-9, 4枚ずつ)
  for (let value = 1; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `tile_${tileIdCounter++}`,
        type: 'man',
        value: value,
      });
    }
  }

  // 筒子 (1-9, 4枚ずつ)
  for (let value = 1; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `tile_${tileIdCounter++}`,
        type: 'pin',
        value: value,
      });
    }
  }

  // 索子 (1-9, 4枚ずつ)
  for (let value = 1; value <= 9; value++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `tile_${tileIdCounter++}`,
        type: 'sou',
        value: value,
      });
    }
  }

  // 字牌 (東南西北白發中, 4枚ずつ)
  const honorValues: HonorValue[] = ['E', 'S', 'W', 'N', 'haku', 'hatsu', 'chun'];
  for (const honorValue of honorValues) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `tile_${tileIdCounter++}`,
        type: 'honor',
        value: honorValue,
      });
    }
  }

  return tiles;
}

export function getTileNotation(tile: Tile): string {
  if (tile.type === 'honor') {
    return tile.value as string;
  }
  
  const suffix = tile.type === 'man' ? 'm' : tile.type === 'pin' ? 'p' : 's';
  return `${tile.value}${suffix}`;
}

export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}