// Exports from the game management branch
export { GameManager } from './GameManager';
export { TileManager } from './TileManager';
export { ActionValidator } from './ActionValidator';
export { HandEvaluator } from './HandEvaluator';

// Exports from the main branch
export * from '../utils/tileGenerator';
export * from './tileManager';

// Exports from the signature branch
export { ActionLogService } from './actionLog';
export { VerificationManager } from './verificationManager';
export { PostGameVerificationService } from './postGameVerification';

// Type exports
export * from '../types/tile';
export * from '../types/player';
export * from '../types/game';

export type {
  PlayerID,
  ActionType,
  GameAction,
  GameStartAction,
  ShuffleAction,
  DrawAction,
  DiscardAction,
  PonAction,
  ChiAction,
  KanAction,
  RiichiAction,
  WinAction,
  DecryptProofAction,
  SpecificGameAction
} from '../types/game';