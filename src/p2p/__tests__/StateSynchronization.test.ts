import { describe, it, expect } from 'vitest';
import { DefaultStateConflictResolver } from '../DefaultStateConflictResolver';
import { DefaultStateSynchronizer } from '../DefaultStateSynchronizer';
import { GameState } from '../../types/game';

describe('DefaultStateConflictResolver', () => {
  let resolver: DefaultStateConflictResolver;

  const createGameState = (turn: number, timestamp: number, actionCount: number = 0): GameState => ({
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
    actionHistory: new Array(actionCount).fill({}),
    lastActionTime: timestamp
  });

  beforeEach(() => {
    resolver = new DefaultStateConflictResolver();
  });

  it('should prefer state with higher turn count', () => {
    const localState = createGameState(5, 1000);
    const remoteState = createGameState(3, 2000);

    const resolved = resolver.resolve(localState, remoteState);
    expect(resolved).toBe(localState);
  });

  it('should prefer state with later timestamp when turns are equal', () => {
    const localState = createGameState(5, 1000);
    const remoteState = createGameState(5, 2000);

    const resolved = resolver.resolve(localState, remoteState);
    expect(resolved).toBe(remoteState);
  });

  it('should prefer state with more actions when turns and timestamps are equal', () => {
    const localState = createGameState(5, 1000, 10);
    const remoteState = createGameState(5, 1000, 15);

    const resolved = resolver.resolve(localState, remoteState);
    expect(resolved).toBe(remoteState);
  });

  it('should prefer local state when all factors are equal', () => {
    const localState = createGameState(5, 1000, 10);
    const remoteState = createGameState(5, 1000, 10);

    const resolved = resolver.resolve(localState, remoteState);
    expect(resolved).toBe(localState);
  });

  it('should handle missing optional fields', () => {
    const localState = createGameState(5, 0, 0);
    const remoteState = createGameState(5, 0, 0);
    
    // Remove optional fields
    delete localState.lastActionTime;
    delete localState.actionHistory;
    delete remoteState.lastActionTime;
    delete remoteState.actionHistory;

    const resolved = resolver.resolve(localState, remoteState);
    expect(resolved).toBe(localState);
  });
});

describe('DefaultStateSynchronizer', () => {
  let synchronizer: DefaultStateSynchronizer;

  const createGameState = (turn: number = 0, playerId: string = 'player-1'): GameState => ({
    id: 'test-game',
    phase: 'playing',
    round: 1,
    honba: 0,
    riichiBets: 0,
    currentPlayerIndex: 0,
    currentTurnStartTime: Date.now(),
    players: [
      {
        id: playerId,
        name: 'Player 1',
        position: 'east',
        points: 25000,
        hand: [{ id: '1', type: 'number', suit: 'man', number: 1, isRed: false }],
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
    currentPlayer: playerId,
    wallTiles: [],
    actionHistory: [],
    lastActionTime: 1000
  });

  beforeEach(() => {
    synchronizer = new DefaultStateSynchronizer();
  });

  describe('getStateHash', () => {
    it('should generate consistent hash for same state', () => {
      const state1 = createGameState();
      const state2 = createGameState();

      const hash1 = synchronizer.getStateHash(state1);
      const hash2 = synchronizer.getStateHash(state2);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different states', () => {
      const state1 = createGameState(1);
      const state2 = createGameState(2);

      const hash1 = synchronizer.getStateHash(state1);
      const hash2 = synchronizer.getStateHash(state2);

      expect(hash1).not.toBe(hash2);
    });

    it('should consider player state in hash', () => {
      const state1 = createGameState(1, 'player-1');
      const state2 = createGameState(1, 'player-2');

      const hash1 = synchronizer.getStateHash(state1);
      const hash2 = synchronizer.getStateHash(state2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle missing optional fields', () => {
      const state = createGameState();
      delete state.wallTiles;
      delete state.drawnTile;
      delete state.doraIndicators;

      // Should not throw
      const hash = synchronizer.getStateHash(state);
      expect(hash).toBeTruthy();
    });
  });

  describe('mergeStates', () => {
    it('should throw error for empty states array', () => {
      expect(() => synchronizer.mergeStates([])).toThrow('Cannot merge empty states array');
    });

    it('should return single state when array has one element', () => {
      const state = createGameState();
      const merged = synchronizer.mergeStates([state]);
      expect(merged).toBe(state);
    });

    it('should merge states by selecting most recent', () => {
      const states = [
        createGameState(1),
        createGameState(3),
        createGameState(2)
      ];

      const merged = synchronizer.mergeStates(states);
      expect(merged.currentTurn).toBe(3);
    });

    it('should consider timestamp when turns are equal', () => {
      const state1 = createGameState(5);
      const state2 = createGameState(5);
      state1.lastActionTime = 1000;
      state2.lastActionTime = 2000;

      const merged = synchronizer.mergeStates([state1, state2]);
      expect(merged).toBe(state2);
    });

    it('should validate merged state', () => {
      const validState = createGameState(1);
      const invalidState = createGameState(2);
      // Make state invalid
      invalidState.currentTurn = -1;

      const merged = synchronizer.mergeStates([invalidState, validState]);
      expect(merged).toBe(validState);
    });

    it('should handle all invalid states gracefully', () => {
      const invalidState1 = {} as GameState;
      const invalidState2 = { currentTurn: -1 } as GameState;

      // Should not throw, returns most recent even if invalid
      const merged = synchronizer.mergeStates([invalidState1, invalidState2]);
      expect(merged).toBeDefined();
    });

    it('should validate player data', () => {
      const state1 = createGameState(1);
      const state2 = createGameState(2);
      
      // Make state2 invalid by removing player data
      state2.players = [];

      const merged = synchronizer.mergeStates([state1, state2]);
      expect(merged).toBe(state1); // Should select valid state
    });

    it('should validate current player exists', () => {
      const state1 = createGameState(1);
      const state2 = createGameState(2);
      
      // Make state2 invalid by setting non-existent current player
      state2.currentPlayer = 'non-existent-player';

      const merged = synchronizer.mergeStates([state1, state2]);
      expect(merged).toBe(state1); // Should select valid state
    });
  });
});