import { Tile, TileNumber } from '../types/tile';
import { WinCondition, GameContext } from '../types/hand';
import { YakuResult } from '../types/yaku';
import { HandManager } from './HandManager';
import { YakuChecker } from './YakuChecker';
import { ScoreCalculator, ScoreResult } from './ScoreCalculator';
import { isCompleteHand, TileGroup } from '../utils/tileAnalysis';

export interface WinCheckResult {
  canWin: boolean;
  yakuResult?: YakuResult;
  scoreResult?: ScoreResult;
  completedHand?: TileGroup[];
}

export interface CallOption {
  type: 'chi' | 'pon' | 'kan';
  tiles: Tile[];
  fromPlayer: number;
}

export class MahjongEngine {
  private handManagers: Map<number, HandManager> = new Map();
  private yakuChecker: YakuChecker;
  private scoreCalculator: ScoreCalculator;
  private gameContext: GameContext;

  constructor(gameContext: GameContext) {
    this.yakuChecker = new YakuChecker();
    this.scoreCalculator = new ScoreCalculator();
    this.gameContext = gameContext;

    // Initialize hand managers for 4 players
    for (let i = 0; i < 4; i++) {
      this.handManagers.set(i, new HandManager());
    }
  }

  getHandManager(playerIndex: number): HandManager | undefined {
    return this.handManagers.get(playerIndex);
  }

  checkWin(
    playerIndex: number,
    winTile: Tile,
    winCondition: WinCondition
  ): WinCheckResult {
    const handManager = this.handManagers.get(playerIndex);
    if (!handManager) {
      return { canWin: false };
    }

    const hand = handManager.getHand();
    
    // Add win tile to hand temporarily
    const allTiles = [...hand.tiles, winTile];
    
    // Check if hand is complete
    const completeHandResult = isCompleteHand(allTiles);
    if (!completeHandResult) {
      return { canWin: false };
    }

    // Check yaku
    const yakuResult = this.yakuChecker.checkYaku(
      hand,
      winCondition,
      this.gameContext,
      completeHandResult.groups
    );

    // No yaku = no win (except in special cases)
    if (yakuResult.yaku.length === 0 && yakuResult.han === 0) {
      return { canWin: false };
    }

    // Calculate score
    const isDealer = this.getPlayerWind(playerIndex) === 'east';
    const scoreResult = this.scoreCalculator.calculateScore(
      yakuResult,
      isDealer,
      winCondition.isTsumo,
      this.gameContext
    );

    return {
      canWin: true,
      yakuResult,
      scoreResult,
      completedHand: completeHandResult.groups
    };
  }

  checkTenpai(playerIndex: number): Tile[] {
    const handManager = this.handManagers.get(playerIndex);
    if (!handManager) {
      return [];
    }

    const hand = handManager.getHand();
    const waitingTiles: Tile[] = [];
    
    // Try each possible tile as the winning tile
    const allPossibleTiles = this.getAllPossibleTiles();
    
    for (const tile of allPossibleTiles) {
      const allTiles = [...hand.tiles, tile];
      const completeHandResult = isCompleteHand(allTiles);
      
      if (completeHandResult) {
        // Check if there would be yaku
        const winCondition: WinCondition = {
          winTile: tile,
          isTsumo: true
        };
        
        const yakuResult = this.yakuChecker.checkYaku(
          hand,
          winCondition,
          this.gameContext,
          completeHandResult.groups
        );
        
        if (yakuResult.yaku.length > 0 || yakuResult.han > 0) {
          waitingTiles.push(tile);
        }
      }
    }

    return waitingTiles;
  }

  getAvailableCalls(
    playerIndex: number,
    discardedTile: Tile,
    fromPlayer: number
  ): CallOption[] {
    const handManager = this.handManagers.get(playerIndex);
    if (!handManager) {
      return [];
    }

    const options: CallOption[] = [];

    // Check chi (only from previous player)
    const relativePosition = (fromPlayer - playerIndex + 4) % 4;
    if (relativePosition === 3) { // Previous player
      const chiOptions = handManager.canChi(discardedTile, relativePosition);
      for (const chiTiles of chiOptions) {
        options.push({
          type: 'chi',
          tiles: chiTiles,
          fromPlayer
        });
      }
    }

    // Check pon
    if (handManager.canPon(discardedTile)) {
      options.push({
        type: 'pon',
        tiles: [discardedTile, discardedTile, discardedTile],
        fromPlayer
      });
    }

    // Check kan
    if (handManager.canKan(discardedTile)) {
      options.push({
        type: 'kan',
        tiles: [discardedTile, discardedTile, discardedTile, discardedTile],
        fromPlayer
      });
    }

    return options;
  }

  canRiichi(playerIndex: number): boolean {
    const handManager = this.handManagers.get(playerIndex);
    if (!handManager) {
      return false;
    }

    const hand = handManager.getHand();
    
    // Must be closed hand
    if (!hand.menzen) {
      return false;
    }

    // Must have enough points (1000)
    // This would normally check player's score

    // Must be in tenpai
    const waitingTiles = this.checkTenpai(playerIndex);
    return waitingTiles.length > 0;
  }

  private getPlayerWind(playerIndex: number): 'east' | 'south' | 'west' | 'north' {
    // This is simplified - actual implementation would track dealer rotation
    const winds: ('east' | 'south' | 'west' | 'north')[] = ['east', 'south', 'west', 'north'];
    return winds[playerIndex];
  }

  private getAllPossibleTiles(): Tile[] {
    // Return one of each unique tile type
    const tiles: Tile[] = [];
    
    // Number tiles
    const suits = ['man', 'pin', 'sou'] as const;
    for (const suit of suits) {
      for (let num = 1; num <= 9; num++) {
        tiles.push({ type: suit, number: num as TileNumber });
      }
    }
    
    // Honor tiles
    const honors = ['east', 'south', 'west', 'north', 'white', 'green', 'red'] as const;
    for (const honor of honors) {
      tiles.push({ type: 'honor', honor });
    }
    
    return tiles;
  }
}