import { P2PManager } from './P2PManager';
import { GameManager } from '../game/GameManager';
import { MessageType, P2PMessage, GameAction as P2PGameAction } from './types';
import { GameEvent, GameState } from '../types/game';
import { ActionRequest } from '../types/player';

export interface P2PGameMessage {
  type: 'game_action' | 'game_state' | 'player_ready' | 'game_start';
  playerId: string;
  timestamp: number;
  data: Record<string, unknown>;
  signature?: string;
}

export interface GameStateSync {
  gameState: GameState;
  lastEventId: string;
  timestamp: number;
}

export class P2PGameCoordinator {
  private p2pManager: P2PManager;
  private gameManager: GameManager;
  private lastSyncTime: number = 0;
  private eventQueue: Map<string, GameEvent> = new Map();
  private reconnectingSyncInProgress = false;

  constructor(p2pManager: P2PManager, gameManager: GameManager) {
    this.p2pManager = p2pManager;
    this.gameManager = gameManager;
    this.setupMessageHandlers();
    this.setupGameEventListeners();
  }

  private setupMessageHandlers(): void {
    // Handle player ready status
    this.p2pManager.on(MessageType.PLAYER_READY, this.handlePlayerReady.bind(this));
    
    // Handle game start
    this.p2pManager.on(MessageType.GAME_START, this.handleGameStart.bind(this));
    
    // Handle game actions
    this.p2pManager.on(MessageType.DECLARE_ACTION, this.handleDeclareAction.bind(this));
    this.p2pManager.on(MessageType.DRAW_TILE, this.handleDrawTile.bind(this));
    this.p2pManager.on(MessageType.DISCARD_TILE, this.handleDiscardTile.bind(this));
    
    // Handle state synchronization
    this.p2pManager.on(MessageType.GAME_STATE_UPDATE, this.handleGameStateUpdate.bind(this));
    this.p2pManager.on(MessageType.GAME_STATE_REQUEST, this.handleGameStateRequest.bind(this));
    
    // Handle connection changes
    this.p2pManager.on(MessageType.PLAYER_DISCONNECT, this.handlePlayerDisconnect.bind(this));
    this.p2pManager.on(MessageType.PLAYER_JOIN, this.handlePlayerJoin.bind(this));
  }

  private setupGameEventListeners(): void {
    // Listen to all game events and broadcast them
    this.gameManager.onEvent((event: GameEvent) => {
      this.broadcastGameEvent(event);
    });
  }

  private async handlePlayerReady(message: P2PMessage, peerId: string): Promise<void> {
    try {
      const playerId = message.senderId;
      // Update player ready status in game manager
      await this.gameManager.setPlayerReady(playerId, true);
      
      // Check if all players are ready to start the game
      if (this.gameManager.areAllPlayersReady()) {
        this.startGame();
      }
    } catch (error) {
      this.handleError(error, 'handlePlayerReady', peerId);
    }
  }

  private async handleGameStart(message: P2PMessage, peerId: string): Promise<void> {
    try {
      // Only the host should initiate game start
      if (!this.isHost(message.senderId)) {
        return;
      }
      
      await this.gameManager.startGame();
    } catch (error) {
      this.handleError(error, 'handleGameStart', peerId);
    }
  }

  private async handleDeclareAction(message: P2PMessage<P2PGameAction>, peerId: string): Promise<void> {
    try {
      const action = message.data;
      const playerId = message.senderId;
      
      // Convert P2P action to GameManager action request
      const actionRequest: ActionRequest = this.convertP2PActionToRequest(action, playerId);
      
      // Apply action to game manager
      await this.gameManager.handleAction(actionRequest);
    } catch (error) {
      this.handleError(error, 'handleDeclareAction', peerId);
    }
  }

  private async handleDrawTile(message: P2PMessage, peerId: string): Promise<void> {
    try {
      const playerId = message.senderId;
      const actionRequest: ActionRequest = {
        playerId,
        action: 'tsumo',
        timestamp: message.timestamp
      };
      
      await this.gameManager.handleAction(actionRequest);
    } catch (error) {
      this.handleError(error, 'handleDrawTile', peerId);
    }
  }

  private async handleDiscardTile(message: P2PMessage<{ tileId: string }>, peerId: string): Promise<void> {
    try {
      const playerId = message.senderId;
      const actionRequest: ActionRequest = {
        playerId,
        action: 'discard',
        tileId: message.data.tileId,
        timestamp: message.timestamp
      };
      
      await this.gameManager.handleAction(actionRequest);
    } catch (error) {
      this.handleError(error, 'handleDiscardTile', peerId);
    }
  }

  private async handleGameStateUpdate(message: P2PMessage<GameStateSync>, peerId: string): Promise<void> {
    try {
      // Only process if we're out of sync
      if (message.data.timestamp > this.lastSyncTime) {
        this.lastSyncTime = message.data.timestamp;
        await this.gameManager.syncState(message.data.gameState);
      }
    } catch (error) {
      this.handleError(error, 'handleGameStateUpdate', peerId);
    }
  }

  private async handleGameStateRequest(message: P2PMessage, peerId: string): Promise<void> {
    try {
      // Send current game state to requesting peer
      const gameState = this.gameManager.getState();
      const stateSync: GameStateSync = {
        gameState,
        lastEventId: this.getLastEventId(),
        timestamp: Date.now()
      };
      
      await this.p2pManager.sendMessage(message.senderId, {
        type: MessageType.GAME_STATE_UPDATE,
        senderId: this.p2pManager.getLocalPeerId(),
        timestamp: Date.now(),
        data: stateSync
      });
    } catch (error) {
      this.handleError(error, 'handleGameStateRequest', peerId);
    }
  }

  private async handlePlayerDisconnect(message: P2PMessage, peerId: string): Promise<void> {
    try {
      const playerId = message.senderId;
      await this.gameManager.handlePlayerDisconnect(playerId);
    } catch (error) {
      this.handleError(error, 'handlePlayerDisconnect', peerId);
    }
  }

  private async handlePlayerJoin(message: P2PMessage, peerId: string): Promise<void> {
    try {
      // If player is rejoining, sync their state
      if (this.gameManager.isPlayerInGame(message.senderId)) {
        await this.syncReconnectedPlayer(message.senderId);
      }
    } catch (error) {
      this.handleError(error, 'handlePlayerJoin', peerId);
    }
  }

  private broadcastGameEvent(event: GameEvent): void {
    // Store event for potential resync
    this.eventQueue.set(event.timestamp.toString(), event);
    
    // Clean old events (keep last 100)
    if (this.eventQueue.size > 100) {
      const sortedKeys = Array.from(this.eventQueue.keys()).sort();
      for (let i = 0; i < sortedKeys.length - 100; i++) {
        this.eventQueue.delete(sortedKeys[i]);
      }
    }
    
    // Convert game event to P2P message type
    const messageType = this.getP2PMessageType(event.type);
    if (!messageType) return;
    
    // Broadcast to all peers
    this.p2pManager.broadcastMessage({
      type: messageType,
      senderId: this.p2pManager.getLocalPeerId(),
      timestamp: event.timestamp,
      data: event.data
    });
  }

  private async syncReconnectedPlayer(playerId: string): Promise<void> {
    if (this.reconnectingSyncInProgress) return;
    
    this.reconnectingSyncInProgress = true;
    try {
      // Send full game state to reconnected player
      const gameState = this.gameManager.getState();
      const stateSync: GameStateSync = {
        gameState,
        lastEventId: this.getLastEventId(),
        timestamp: Date.now()
      };
      
      await this.p2pManager.sendMessage(playerId, {
        type: MessageType.GAME_STATE_UPDATE,
        senderId: this.p2pManager.getLocalPeerId(),
        timestamp: Date.now(),
        data: stateSync
      });
    } finally {
      this.reconnectingSyncInProgress = false;
    }
  }

  private convertP2PActionToRequest(action: P2PGameAction, playerId: string): ActionRequest {
    const baseRequest = {
      playerId,
      timestamp: Date.now()
    };
    
    switch (action.actionType) {
      case 'DRAW':
        return { ...baseRequest, action: 'tsumo' } as ActionRequest;
      case 'DISCARD':
        return { ...baseRequest, action: 'discard', tileId: action.tileId } as ActionRequest;
      case 'PON':
        return { ...baseRequest, action: 'pon', targetTileId: action.tileId } as ActionRequest;
      case 'CHI':
        return { ...baseRequest, action: 'chi', targetTileId: action.tileId } as ActionRequest;
      case 'KAN':
        return { ...baseRequest, action: 'kan', targetTileId: action.tileId } as ActionRequest;
      case 'RON':
        return { ...baseRequest, action: 'ron', targetTileId: action.tileId } as ActionRequest;
      case 'TSUMO':
        return { ...baseRequest, action: 'tsumo-win' } as ActionRequest;
      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }

  private getP2PMessageType(gameEventType: string): MessageType | null {
    const mapping: Record<string, MessageType> = {
      'player-draw': MessageType.DRAW_TILE,
      'player-discard': MessageType.DISCARD_TILE,
      'player-action': MessageType.DECLARE_ACTION,
      'game-start': MessageType.GAME_START,
      'state-update': MessageType.GAME_STATE_UPDATE,
    };
    
    return mapping[gameEventType] || null;
  }

  private isHost(playerId: string): boolean {
    // First player in the list is the host
    const players = this.p2pManager.getPlayers();
    return players.length > 0 && players[0].id === playerId;
  }

  private getLastEventId(): string {
    const keys = Array.from(this.eventQueue.keys());
    return keys.length > 0 ? keys[keys.length - 1] : '';
  }

  private handleError(error: unknown, context: string, peerId: string): void {
    console.error(`[P2PGameCoordinator] Error in ${context} from peer ${peerId}:`, error);
    
    // Broadcast error to all peers
    this.p2pManager.broadcastMessage({
      type: MessageType.ERROR,
      senderId: this.p2pManager.getLocalPeerId(),
      timestamp: Date.now(),
      data: {
        context,
        message: error instanceof Error ? error.message : 'Unknown error',
        peerId
      }
    });
  }

  private startGame(): void {
    // Only host initiates game start
    if (this.isHost(this.p2pManager.getLocalPeerId())) {
      this.p2pManager.broadcastMessage({
        type: MessageType.GAME_START,
        senderId: this.p2pManager.getLocalPeerId(),
        timestamp: Date.now(),
        data: {
          gameId: this.gameManager.getGameId(),
          players: this.p2pManager.getPlayers()
        }
      });
    }
  }

  public destroy(): void {
    // Clean up event listeners
    this.p2pManager.off(MessageType.PLAYER_READY, this.handlePlayerReady.bind(this));
    this.p2pManager.off(MessageType.GAME_START, this.handleGameStart.bind(this));
    this.p2pManager.off(MessageType.DECLARE_ACTION, this.handleDeclareAction.bind(this));
    this.p2pManager.off(MessageType.DRAW_TILE, this.handleDrawTile.bind(this));
    this.p2pManager.off(MessageType.DISCARD_TILE, this.handleDiscardTile.bind(this));
    this.p2pManager.off(MessageType.GAME_STATE_UPDATE, this.handleGameStateUpdate.bind(this));
    this.p2pManager.off(MessageType.GAME_STATE_REQUEST, this.handleGameStateRequest.bind(this));
    this.p2pManager.off(MessageType.PLAYER_DISCONNECT, this.handlePlayerDisconnect.bind(this));
    this.p2pManager.off(MessageType.PLAYER_JOIN, this.handlePlayerJoin.bind(this));
    
    this.eventQueue.clear();
  }
}