import { Tile, TileType, TileNumber, HonorType, createTile } from '../types/tile';

export class TileManager {
  private enableRedDora: boolean;

  constructor(enableRedDora: boolean = true) {
    this.enableRedDora = enableRedDora;
  }

  public async generateShuffledTiles(): Promise<Tile[]> {
    const tiles: Tile[] = [];
    let tileId = 0;

    const numberTypes: TileType[] = ['man', 'pin', 'sou'];
    for (const type of numberTypes) {
      for (let number = 1; number <= 9; number++) {
        for (let copy = 0; copy < 4; copy++) {
          if (this.enableRedDora && number === 5 && copy === 0) {
            tiles.push(createTile(type, number as TileNumber, `${type}_${number}_red_${tileId++}`));
          } else {
            tiles.push(createTile(type, number as TileNumber, `${type}_${number}_${tileId++}`));
          }
        }
      }
    }

    const honors: HonorType[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
    for (const honor of honors) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push(createTile('honor', honor, `honor_${honor}_${tileId++}`));
      }
    }

    return this.shuffleTiles(tiles);
  }

  private shuffleTiles(tiles: Tile[]): Tile[] {
    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public getDoraIndicator(tile: Tile): Tile {
    if (tile.type === 'honor') {
      const honorOrder: HonorType[] = ['east', 'south', 'west', 'north'];
      const dragonOrder: HonorType[] = ['white', 'green', 'red'];
      
      if (honorOrder.includes(tile.honor)) {
        const index = honorOrder.indexOf(tile.honor);
        const nextIndex = (index + 1) % honorOrder.length;
        return createTile('honor', honorOrder[nextIndex], 'dora_indicator');
      } else if (dragonOrder.includes(tile.honor)) {
        const index = dragonOrder.indexOf(tile.honor);
        const nextIndex = (index + 1) % dragonOrder.length;
        return createTile('honor', dragonOrder[nextIndex], 'dora_indicator');
      }
    } else {
      const nextNumber = tile.number === 9 ? 1 : tile.number + 1;
      return createTile(tile.type, nextNumber as TileNumber, 'dora_indicator');
    }
    
    return tile;
  }
}