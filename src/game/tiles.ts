import { TileType } from '../types';
import { randomBytes } from '../crypto/utils';

export function generateFullTileSet(): TileType[] {
  const tiles: TileType[] = [];
  
  const manzu: TileType[] = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'];
  const pinzu: TileType[] = ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'];
  const souzu: TileType[] = ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'];
  const honors: TileType[] = ['E', 'S', 'W', 'N', 'C', 'F', 'P'];
  
  const allTileTypes = [...manzu, ...pinzu, ...souzu, ...honors];
  
  for (const tile of allTileTypes) {
    for (let i = 0; i < 4; i++) {
      tiles.push(tile);
    }
  }
  
  return tiles;
}

export function generateTileIds(tiles: TileType[]): { id: string; tile: TileType }[] {
  return tiles.map((tile, index) => ({
    id: `${tile}-${index}-${randomBytes(8)}`,
    tile
  }));
}