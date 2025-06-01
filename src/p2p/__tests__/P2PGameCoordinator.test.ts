import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { P2PGameCoordinator } from '../P2PGameCoordinator';
import { P2PManager } from '../P2PManager';
import { GameManager } from '../../game/GameManager';
import { DefaultStateConflictResolver } from '../DefaultStateConflictResolver';
import { DefaultStateSynchronizer } from '../DefaultStateSynchronizer';
import { MessageType } from '../types';
import { GameState, GameAction, ActionType } from '../../types/game';

// Mock dependencies
vi.mock('../P2PManager');
vi.mock('../../game/GameManager');

describe('P2PGameCoordinator', () => {
  let coordinator: P2PGameCoordinator;
  let mockP2PManager: any;
  let mockGameManager: any;
  let conflictResolver: DefaultStateConflictResolver;
  let stateSynchronizer: DefaultStateSynchronizer;

  const createMockGameState = (turn: number = 0): GameState => ({
    id: 'test-game',
    phase: 'playing',
    round: 1,
    honba: 0,
    riichiBets: 0,
    currentPlayerIndex: 0,
    currentTurnStartTime: Date.now(),
    players: [
      {
        id: 'player-1',
        name: 'Player 1',
        position: 'east',
        points: 25000,
        hand: [],
        discards: [],
        melds: [],
        riichi: false,
        score: 0,
        isDealer: true,
        discardedTiles: []
      }
    ],
    wall: [],
    dora: [],
    uraDora: [],
    deadWall: [],
    pendingActions: [],
    turnTimeLimit: 30000,
    currentTurn: turn,
    currentPlayer: 'player-1',
    wallTiles: [],
    actionHistory: [],
    lastActionTime: Date.now()
  });

  beforeEach(() => {
    // Setup mocks
    mockP2PManager = {
      on: vi.fn(),
      broadcastMessage: vi.fn(),
      sendMessage: vi.fn(),
      getPeerId: vi.fn().mockReturnValue('test-peer-id')
    };

    mockGameManager = {
      getGameState: vi.fn().mockReturnValue(createMockGameState()),
      setState: vi.fn(),
      applyAction: vi.fn(),
      setPlayerCount: vi.fn(),
      getPlayerCount: vi.fn().mockReturnValue(4)
    };

    conflictResolver = new DefaultStateConflictResolver();
    stateSynchronizer = new DefaultStateSynchronizer();

    coordinator = new P2PGameCoordinator(
      mockP2PManager as any,
      mockGameManager as any,
      conflictResolver,
      stateSynchronizer
    );
  });

  afterEach(() => {
    coordinator.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should setup message handlers on initialization', () => {
      expect(mockP2PManager.on).toHaveBeenCalledWith(
        MessageType.GAME_STATE_UPDATE,
        expect.any(Function)
      );
      expect(mockP2PManager.on).toHaveBeenCalledWith(
        MessageType.GAME_STATE_REQUEST,
        expect.any(Function)
      );
      expect(mockP2PManager.on).toHaveBeenCalledWith(
        MessageType.DECLARE_ACTION,
        expect.any(Function)
      );
    });

    it('should accept custom player count', () => {
      const coordinator3Player = new P2PGameCoordinator(
        mockP2PManager,
        mockGameManager,
        conflictResolver,
        stateSynchronizer,
        3
      );
      
      expect(coordinator3Player.getPlayerCount()).toBe(3);
      coordinator3Player.destroy();
    });
  });

  describe('state synchronization', () => {
    it('should start periodic state synchronization', () => {
      vi.useFakeTimers();
      
      coordinator.startStateSynchronization(1000);
      
      // Advance time to trigger sync
      vi.advanceTimersByTime(1000);
      
      expect(mockGameManager.getGameState).toHaveBeenCalled();
      expect(mockP2PManager.broadcastMessage).toHaveBeenCalledWith(
        MessageType.GAME_STATE_UPDATE,
        expect.objectContaining({
          state: expect.any(Object),
          hash: expect.any(String),
          sequenceNumber: expect.any(Number)
        })
      );
      
      vi.useRealTimers();
    });

    it('should stop state synchronization', () => {
      vi.useFakeTimers();
      
      coordinator.startStateSynchronization(1000);
      coordinator.stopStateSynchronization();
      
      // Advance time - should not trigger sync
      vi.advanceTimersByTime(2000);
      
      expect(mockP2PManager.broadcastMessage).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should only sync when state changes', () => {
      vi.useFakeTimers();
      
      coordinator.startStateSynchronization(1000);
      
      // First sync
      vi.advanceTimersByTime(1000);
      expect(mockP2PManager.broadcastMessage).toHaveBeenCalledTimes(1);
      
      // Second sync - same state, should not broadcast
      vi.advanceTimersByTime(1000);
      expect(mockP2PManager.broadcastMessage).toHaveBeenCalledTimes(1);
      
      // Change state
      mockGameManager.getGameState.mockReturnValue(createMockGameState(1));
      
      // Third sync - different state, should broadcast
      vi.advanceTimersByTime(1000);
      expect(mockP2PManager.broadcastMessage).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });
  });

  describe('message handling', () => {
    it('should handle state update messages', () => {
      const remoteState = createMockGameState(2);
      const stateUpdateHandler = mockP2PManager.on.mock.calls.find(
        (call: any[]) => call[0] === MessageType.GAME_STATE_UPDATE
      )?.[1];

      stateUpdateHandler({
        type: MessageType.GAME_STATE_UPDATE,
        senderId: 'remote-peer',
        timestamp: Date.now(),
        data: {
          state: remoteState,
          hash: 'remote-hash'
        }
      });

      // Should resolve conflict and update state
      expect(mockGameManager.setState).toHaveBeenCalled();
    });

    it('should handle state request messages', () => {
      const stateRequestHandler = mockP2PManager.on.mock.calls.find(
        (call: any[]) => call[0] === MessageType.GAME_STATE_REQUEST
      )?.[1];

      stateRequestHandler({
        type: MessageType.GAME_STATE_REQUEST,
        senderId: 'remote-peer',
        timestamp: Date.now(),
        data: {}
      });

      expect(mockP2PManager.sendMessage).toHaveBeenCalledWith(
        MessageType.GAME_STATE_UPDATE,
        expect.objectContaining({
          state: expect.any(Object),
          hash: expect.any(String),
          sequenceNumber: expect.any(Number)
        }),
        'remote-peer'
      );
    });

    it('should handle game action messages', async () => {
      const gameAction: GameAction = {
        id: 'action-1',
        type: ActionType.DISCARD,
        playerId: 'player-1',
        timestamp: Date.now(),
        data: { tileIndex: 0 }
      };

      const actionHandler = mockP2PManager.on.mock.calls.find(
        (call: any[]) => call[0] === MessageType.DECLARE_ACTION
      )?.[1];

      await actionHandler({
        type: MessageType.DECLARE_ACTION,
        senderId: 'remote-peer',
        timestamp: Date.now(),
        data: gameAction
      });

      expect(mockGameManager.applyAction).toHaveBeenCalledWith(gameAction);
    });

    it('should prevent duplicate action processing', async () => {
      const gameAction: GameAction = {
        id: 'action-1',
        type: ActionType.DISCARD,
        playerId: 'player-1',
        timestamp: Date.now(),
        data: { tileIndex: 0 }
      };

      const actionHandler = mockP2PManager.on.mock.calls.find(
        (call: any[]) => call[0] === MessageType.DECLARE_ACTION
      )?.[1];

      const message = {
        type: MessageType.DECLARE_ACTION,
        senderId: 'remote-peer',
        timestamp: Date.now(),
        data: gameAction
      };

      // Send same action twice
      await actionHandler(message);
      await actionHandler(message);

      // Should only apply once
      expect(mockGameManager.applyAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('conflict resolution', () => {
    it('should resolve conflicts when local state is newer', () => {
      const localState = createMockGameState(2);
      const remoteState = createMockGameState(1);
      
      mockGameManager.getGameState.mockReturnValue(localState);

      const stateUpdateHandler = mockP2PManager.on.mock.calls.find(
        (call: any[]) => call[0] === MessageType.GAME_STATE_UPDATE
      )?.[1];

      stateUpdateHandler({
        type: MessageType.GAME_STATE_UPDATE,
        senderId: 'remote-peer',
        timestamp: Date.now(),
        data: {
          state: remoteState,
          hash: 'different-hash'
        }
      });

      // Should keep local state (higher turn count)
      expect(mockGameManager.setState).toHaveBeenCalledWith(localState);
    });

    it('should resolve conflicts when remote state is newer', () => {
      const localState = createMockGameState(1);
      const remoteState = createMockGameState(2);
      
      mockGameManager.getGameState.mockReturnValue(localState);

      const stateUpdateHandler = mockP2PManager.on.mock.calls.find(
        (call: any[]) => call[0] === MessageType.GAME_STATE_UPDATE
      )?.[1];

      stateUpdateHandler({
        type: MessageType.GAME_STATE_UPDATE,
        senderId: 'remote-peer',
        timestamp: Date.now(),
        data: {
          state: remoteState,
          hash: 'different-hash'
        }
      });

      // Should use remote state (higher turn count)
      expect(mockGameManager.setState).toHaveBeenCalledWith(remoteState);
    });
  });

  describe('action broadcasting', () => {
    it('should broadcast game actions', async () => {
      const action: GameAction = {
        id: 'action-1',
        type: ActionType.PON,
        playerId: 'player-1',
        timestamp: Date.now(),
        data: { targetPlayerId: 'player-2' }
      };

      await coordinator.broadcastAction(action);

      expect(mockP2PManager.broadcastMessage).toHaveBeenCalledWith(
        MessageType.DECLARE_ACTION,
        action
      );
    });
  });

  describe('state history', () => {
    it('should maintain state history', () => {
      vi.useFakeTimers();
      
      coordinator.startStateSynchronization(1000);
      
      // Trigger multiple syncs with different states
      vi.advanceTimersByTime(1000);
      mockGameManager.getGameState.mockReturnValue(createMockGameState(1));
      vi.advanceTimersByTime(1000);
      mockGameManager.getGameState.mockReturnValue(createMockGameState(2));
      vi.advanceTimersByTime(1000);
      
      const history = coordinator.getStateHistory();
      expect(history.size).toBe(3);
      
      vi.useRealTimers();
    });
  });

  describe('player count management', () => {
    it('should update player count', () => {
      coordinator.setPlayerCount(3);
      
      expect(coordinator.getPlayerCount()).toBe(3);
      expect(mockGameManager.setPlayerCount).toHaveBeenCalledWith(3);
    });

    it('should reject invalid player count', () => {
      expect(() => coordinator.setPlayerCount(5 as any)).toThrow('Player count must be 3 or 4');
      expect(() => coordinator.setPlayerCount(2 as any)).toThrow('Player count must be 3 or 4');
    });
  });

  describe('error handling', () => {
    it('should request state refresh on action application error', async () => {
      mockGameManager.applyAction.mockRejectedValue(new Error('Invalid action'));

      const actionHandler = mockP2PManager.on.mock.calls.find(
        (call: any[]) => call[0] === MessageType.DECLARE_ACTION
      )?.[1];

      await actionHandler({
        type: MessageType.DECLARE_ACTION,
        senderId: 'remote-peer',
        timestamp: Date.now(),
        data: {
          id: 'action-1',
          type: ActionType.DISCARD,
          playerId: 'player-1',
          timestamp: Date.now(),
          data: {}
        }
      });

      expect(mockP2PManager.broadcastMessage).toHaveBeenCalledWith(
        MessageType.GAME_STATE_REQUEST,
        {}
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      vi.useFakeTimers();
      
      coordinator.startStateSynchronization(1000);
      coordinator.destroy();
      
      // Advance time - should not trigger sync after destroy
      vi.advanceTimersByTime(2000);
      expect(mockP2PManager.broadcastMessage).not.toHaveBeenCalled();
      
      // Check histories are cleared
      expect(coordinator.getStateHistory().size).toBe(0);
      expect(coordinator.getPendingActions().size).toBe(0);
      
      vi.useRealTimers();
    });
  });
});