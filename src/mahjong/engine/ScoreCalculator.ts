import { YakuResult } from '../types/yaku';
import { GameContext } from '../types/hand';

export interface ScoreResult {
  basePoints: number;
  dealerPayment?: number;
  nonDealerPayment?: number;
  totalPayment: number;
  isDealer: boolean;
  isTsumo: boolean;
}

export class ScoreCalculator {
  calculateScore(
    yakuResult: YakuResult,
    isDealer: boolean,
    isTsumo: boolean,
    context: GameContext
  ): ScoreResult {
    if (yakuResult.isYakuman) {
      return this.calculateYakumanScore(yakuResult, isDealer, isTsumo, context);
    }

    const basePoints = this.calculateBasePoints(yakuResult.han, yakuResult.fu);
    
    if (isTsumo) {
      if (isDealer) {
        // Dealer tsumo - all players pay equal amount
        const payment = Math.ceil(basePoints * 2 / 100) * 100;
        return {
          basePoints,
          nonDealerPayment: payment,
          totalPayment: payment * 3 + context.riichiSticks * 1000 + context.honba * 300,
          isDealer,
          isTsumo
        };
      } else {
        // Non-dealer tsumo - dealer pays double
        const nonDealerPayment = Math.ceil(basePoints / 100) * 100;
        const dealerPayment = Math.ceil(basePoints * 2 / 100) * 100;
        return {
          basePoints,
          dealerPayment,
          nonDealerPayment,
          totalPayment: dealerPayment + nonDealerPayment * 2 + context.riichiSticks * 1000 + context.honba * 300,
          isDealer,
          isTsumo
        };
      }
    } else {
      // Ron
      const multiplier = isDealer ? 6 : 4;
      const payment = Math.ceil(basePoints * multiplier / 100) * 100;
      return {
        basePoints,
        totalPayment: payment + context.riichiSticks * 1000 + context.honba * 300,
        isDealer,
        isTsumo
      };
    }
  }

  private calculateBasePoints(han: number, fu: number): number {
    // Mangan and above
    if (han >= 5) {
      if (han >= 13) return 8000; // Yakuman
      if (han >= 11) return 6000; // Sanbaiman
      if (han >= 8) return 4000; // Baiman
      if (han >= 6) return 3000; // Haneman
      return 2000; // Mangan
    }

    // Calculate normally
    let basePoints = fu * Math.pow(2, han + 2);
    
    // Cap at mangan
    if (basePoints > 2000) {
      basePoints = 2000;
    }

    return basePoints;
  }

  private calculateYakumanScore(
    yakuResult: YakuResult,
    isDealer: boolean,
    isTsumo: boolean,
    context: GameContext
  ): ScoreResult {
    const yakumanCount = Math.floor(yakuResult.han / 13);
    const basePoints = 8000 * yakumanCount;

    if (isTsumo) {
      if (isDealer) {
        const payment = basePoints * 2;
        return {
          basePoints,
          nonDealerPayment: payment,
          totalPayment: payment * 3 + context.riichiSticks * 1000,
          isDealer,
          isTsumo
        };
      } else {
        const nonDealerPayment = basePoints;
        const dealerPayment = basePoints * 2;
        return {
          basePoints,
          dealerPayment,
          nonDealerPayment,
          totalPayment: dealerPayment + nonDealerPayment * 2 + context.riichiSticks * 1000,
          isDealer,
          isTsumo
        };
      }
    } else {
      const multiplier = isDealer ? 6 : 4;
      const payment = basePoints * multiplier;
      return {
        basePoints,
        totalPayment: payment + context.riichiSticks * 1000,
        isDealer,
        isTsumo
      };
    }
  }

  getHandValueName(han: number, fu: number): string {
    if (han >= 13) {
      const yakumanCount = Math.floor(han / 13);
      if (yakumanCount === 1) return '役満';
      if (yakumanCount === 2) return 'ダブル役満';
      if (yakumanCount === 3) return 'トリプル役満';
      return `${yakumanCount}倍役満`;
    }
    if (han >= 11) return '三倍満';
    if (han >= 8) return '倍満';
    if (han >= 6) return '跳満';
    if (han >= 5) return '満貫';
    if (han === 4 && fu >= 40) return '満貫';
    if (han === 3 && fu >= 70) return '満貫';
    
    return `${han}翻${fu}符`;
  }
}