export type TileType = 'man' | 'pin' | 'sou' | 'honor';
export type TileNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HonorType = 'east' | 'south' | 'west' | 'north' | 'white' | 'green' | 'red';

export interface Tile {
  type: TileType;
  number?: TileNumber;
  honor?: HonorType;
  dora?: boolean;
  id?: number;
}

export interface TileCount {
  tile: Tile;
  count: number;
}

export const HONOR_TILES: HonorType[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
export const TILE_NUMBERS: TileNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function createTile(type: TileType, numberOrHonor: TileNumber | HonorType): Tile {
  if (type === 'honor') {
    return { type, honor: numberOrHonor as HonorType };
  } else {
    return { type, number: numberOrHonor as TileNumber };
  }
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'honor' && b.type === 'honor') {
    return a.honor === b.honor;
  }
  return a.number === b.number;
}

export function tileToString(tile: Tile): string {
  if (tile.type === 'honor') {
    const honorMap: Record<HonorType, string> = {
      east: '東',
      south: '南',
      west: '西',
      north: '北',
      white: '白',
      green: '發',
      red: '中'
    };
    return honorMap[tile.honor!];
  }
  const typeMap: Record<TileType, string> = {
    man: 'm',
    pin: 'p',
    sou: 's',
    honor: ''
  };
  return `${tile.number}${typeMap[tile.type]}`;
}

export function stringToTile(str: string): Tile {
  const honorMap: Record<string, HonorType> = {
    '東': 'east',
    '南': 'south',
    '西': 'west',
    '北': 'north',
    '白': 'white',
    '發': 'green',
    '中': 'red'
  };
  
  if (honorMap[str]) {
    return createTile('honor', honorMap[str]);
  }
  
  const match = str.match(/^(\d)([mps])$/);
  if (!match) {
    throw new Error(`Invalid tile string: ${str}`);
  }
  
  const number = parseInt(match[1]) as TileNumber;
  const typeMap: Record<string, TileType> = {
    'm': 'man',
    'p': 'pin',
    's': 'sou'
  };
  
  return createTile(typeMap[match[2]], number);
}

export function isTerminal(tile: Tile): boolean {
  return tile.type !== 'honor' && (tile.number === 1 || tile.number === 9);
}

export function isHonor(tile: Tile): boolean {
  return tile.type === 'honor';
}

export function isTerminalOrHonor(tile: Tile): boolean {
  return isTerminal(tile) || isHonor(tile);
}

export function isSimple(tile: Tile): boolean {
  return tile.type !== 'honor' && tile.number! >= 2 && tile.number! <= 8;
}

export function isDragon(tile: Tile): boolean {
  return tile.type === 'honor' && ['white', 'green', 'red'].includes(tile.honor!);
}

export function isWind(tile: Tile): boolean {
  return tile.type === 'honor' && ['east', 'south', 'west', 'north'].includes(tile.honor!);
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    const typeOrder = { man: 0, pin: 1, sou: 2, honor: 3 };
    if (a.type !== b.type) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    
    if (a.type === 'honor' && b.type === 'honor') {
      const honorOrder = { east: 0, south: 1, west: 2, north: 3, white: 4, green: 5, red: 6 };
      return honorOrder[a.honor!] - honorOrder[b.honor!];
    }
    
    return (a.number || 0) - (b.number || 0);
  });
}

export function generateFullTileSet(): Tile[] {
  const tiles: Tile[] = [];
  
  // Add numbered tiles (4 of each)
  const numberTypes: TileType[] = ['man', 'pin', 'sou'];
  for (const type of numberTypes) {
    for (const number of TILE_NUMBERS) {
      for (let i = 0; i < 4; i++) {
        tiles.push(createTile(type, number));
      }
    }
  }
  
  // Add honor tiles (4 of each)
  for (const honor of HONOR_TILES) {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('honor', honor));
    }
  }
  
  // Assign unique IDs
  tiles.forEach((tile, index) => {
    tile.id = index;
  });
  
  return tiles;
}