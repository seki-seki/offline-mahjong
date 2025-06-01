export enum MessageType {
  // Connection management
  PLAYER_JOIN = 'PLAYER_JOIN',
  PLAYER_READY = 'PLAYER_READY',
  PLAYER_DISCONNECT = 'PLAYER_DISCONNECT',
  PLAYER_RECONNECT = 'PLAYER_RECONNECT',
  CONNECTION_STATUS = 'CONNECTION_STATUS',
  
  // Game flow
  GAME_START = 'GAME_START',
  
  // Cryptographic tile distribution
  ENCRYPTED_TILES = 'ENCRYPTED_TILES',
  SHUFFLED_TILES = 'SHUFFLED_TILES',
  
  // Game actions
  DRAW_TILE = 'DRAW_TILE',
  DISCARD_TILE = 'DISCARD_TILE',
  DECLARE_ACTION = 'DECLARE_ACTION', // PON, CHI, KAN, RON, TSUMO
  
  // Game state synchronization
  GAME_STATE_UPDATE = 'GAME_STATE_UPDATE',
  GAME_STATE_REQUEST = 'GAME_STATE_REQUEST',
  
  // Error handling
  ERROR = 'ERROR',
  PING = 'PING',
  PONG = 'PONG',
}

export interface P2PMessage<T = any> {
  type: MessageType;
  senderId: string;
  timestamp: number;
  data: T;
  sequence?: number; // For message ordering
}

export interface PlayerInfo {
  id: string;
  name: string;
  position: number; // 0-3 for East, South, West, North
  isReady: boolean;
  isConnected: boolean;
  publicKey?: string; // For encryption
}

export interface ConnectionStatus {
  playerId: string;
  isConnected: boolean;
  latency?: number;
  lastSeen: number;
}

export interface GameStartData {
  gameId: string;
  players: PlayerInfo[];
  seed?: string; // For synchronized randomness
}

export interface EncryptedTilesData {
  encryptedTiles: string[]; // Base64 encoded encrypted tiles
  encryptorId: string;
  round: number; // Which encryption round (1-4)
}

export interface GameAction {
  actionType: 'DRAW' | 'DISCARD' | 'PON' | 'CHI' | 'KAN' | 'RON' | 'TSUMO';
  tileId?: string;
  tiles?: string[]; // For PON, CHI, KAN
  fromPlayer?: string; // For PON, CHI, KAN
}

export interface GameStateUpdate {
  currentPlayer: string;
  phase: 'WAITING' | 'DRAWING' | 'DISCARDING' | 'ACTION_PENDING';
  discardedTiles: { [playerId: string]: string[] };
  exposedMelds: { [playerId: string]: any[] };
  remainingTiles: number;
  lastAction?: GameAction;
}

export type MessageHandler = (message: P2PMessage, peerId: string) => void | Promise<void>;

export interface P2PConfig {
  maxPlayers: number;
  reconnectTimeout: number;
  pingInterval: number;
  messageTimeout: number;
}