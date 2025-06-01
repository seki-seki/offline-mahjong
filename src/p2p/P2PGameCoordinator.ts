import { P2PManager } from './P2PManager';
import { GameManager } from '../game/GameManager';
import { P2PMessage, MessageType } from './types';
import { GameState, GameAction } from '../types';

export interface StateConflictResolver {
  resolve(localState: GameState, remoteState: GameState): GameState;
}

export interface StateSynchronizer {
  getStateHash(state: GameState): string;
  mergeStates(states: GameState[]): GameState;
}

export class P2PGameCoordinator {
  private p2pManager: P2PManager;
  private gameManager: GameManager;
  private stateHistory: Map<number, GameState> = new Map();
  private pendingActions: Map<string, GameAction> = new Map();
  private lastSyncedStateHash: string = '';
  private syncInterval: NodeJS.Timeout | null = null;
  private conflictResolver: StateConflictResolver;
  private stateSynchronizer: StateSynchronizer;
  private playerCount: number;

  constructor(
    p2pManager: P2PManager,
    gameManager: GameManager,
    conflictResolver: StateConflictResolver,
    stateSynchronizer: StateSynchronizer,
    playerCount: number = 4
  ) {
    this.p2pManager = p2pManager;
    this.gameManager = gameManager;
    this.conflictResolver = conflictResolver;
    this.stateSynchronizer = stateSynchronizer;
    this.playerCount = playerCount;
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    this.p2pManager.on(MessageType.GAME_STATE_UPDATE, (message: P2PMessage) => {
      this.handleStateUpdate(message);
    });
    
    this.p2pManager.on(MessageType.GAME_STATE_REQUEST, (message: P2PMessage) => {
      this.handleStateRequest(message);
    });
    
    this.p2pManager.on(MessageType.DECLARE_ACTION, (message: P2PMessage) => {
      this.handleGameAction(message);
    });
  }

  public startStateSynchronization(intervalMs: number = 1000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.synchronizeState();
    }, intervalMs);
  }

  public stopStateSynchronization(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async synchronizeState(): Promise<void> {
    const currentState = this.gameManager.getGameState();
    const currentHash = this.stateSynchronizer.getStateHash(currentState);

    if (currentHash !== this.lastSyncedStateHash) {
      const stateUpdate: P2PMessage = {
        type: MessageType.GAME_STATE_UPDATE,
        senderId: this.p2pManager.getPeerId(),
        timestamp: Date.now(),
        data: {
          state: currentState,
          hash: currentHash,
          sequenceNumber: this.stateHistory.size
        }
      };

      this.p2pManager.broadcastMessage(stateUpdate.type, stateUpdate.data);
      this.lastSyncedStateHash = currentHash;
      this.stateHistory.set(this.stateHistory.size, currentState);
    }
  }

  private handleStateUpdate(message: P2PMessage): void {
    const { state: remoteState, hash: remoteHash } = message.data;
    const localState = this.gameManager.getGameState();
    const localHash = this.stateSynchronizer.getStateHash(localState);

    if (localHash !== remoteHash) {
      // Conflict detected
      const resolvedState = this.conflictResolver.resolve(localState, remoteState);
      this.gameManager.setState(resolvedState);
      this.lastSyncedStateHash = this.stateSynchronizer.getStateHash(resolvedState);
    }
  }

  private handleStateRequest(message: P2PMessage): void {
    const currentState = this.gameManager.getGameState();
    const response = {
      state: currentState,
      hash: this.stateSynchronizer.getStateHash(currentState),
      sequenceNumber: this.stateHistory.size
    };

    this.p2pManager.sendMessage(MessageType.GAME_STATE_UPDATE, response, message.senderId);
  }

  private async handleGameAction(message: P2PMessage): Promise<void> {
    const action = message.data as GameAction;
    const actionId = `${message.senderId}-${message.timestamp}`;

    // Prevent duplicate action processing
    if (this.pendingActions.has(actionId)) {
      return;
    }

    this.pendingActions.set(actionId, action);

    try {
      // Apply action to local game state
      await this.gameManager.applyAction(action);
      
      // Clean up processed action
      this.pendingActions.delete(actionId);
      
      // Trigger state synchronization
      await this.synchronizeState();
    } catch (error) {
      console.error('Failed to apply game action:', error);
      this.pendingActions.delete(actionId);
      
      // Request state refresh from peers
      this.requestStateRefresh();
    }
  }

  private requestStateRefresh(): void {
    this.p2pManager.broadcastMessage(MessageType.GAME_STATE_REQUEST, {});
  }

  public async broadcastAction(action: GameAction): Promise<void> {
    this.p2pManager.broadcastMessage(MessageType.DECLARE_ACTION, action);
  }

  public getStateHistory(): Map<number, GameState> {
    return new Map(this.stateHistory);
  }

  public getPendingActions(): Map<string, GameAction> {
    return new Map(this.pendingActions);
  }

  public getPlayerCount(): number {
    return this.playerCount;
  }

  public setPlayerCount(count: 3 | 4): void {
    if (count !== 3 && count !== 4) {
      throw new Error('Player count must be 3 or 4');
    }
    this.playerCount = count;
    this.gameManager.setPlayerCount(count);
  }

  public destroy(): void {
    this.stopStateSynchronization();
    this.stateHistory.clear();
    this.pendingActions.clear();
  }
}