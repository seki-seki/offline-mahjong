import { StateSynchronizer } from './P2PGameCoordinator';
import { GameState } from '../types';

export class DefaultStateSynchronizer implements StateSynchronizer {
  getStateHash(state: GameState): string {
    // Create a deterministic hash of the game state
    const stateSnapshot = {
      currentTurn: state.currentTurn,
      currentPlayer: state.currentPlayer,
      phase: state.phase,
      players: state.players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        score: p.score,
        isDealer: p.isDealer,
        handTileCount: p.hand?.tiles?.length || 0,
        discardedTileCount: p.discardedTiles?.length || 0,
        meldCount: p.melds?.length || 0
      })),
      wallTileCount: state.wallTiles?.length || 0,
      drawnTileExists: !!state.drawnTile,
      doraIndicatorCount: state.doraIndicators?.length || 0,
      actionHistoryLength: state.actionHistory?.length || 0,
      lastActionTime: state.lastActionTime || 0
    };

    const jsonString = JSON.stringify(stateSnapshot, Object.keys(stateSnapshot).sort());
    // Use Web Crypto API instead of Node crypto
    return btoa(jsonString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  mergeStates(states: GameState[]): GameState {
    if (states.length === 0) {
      throw new Error('Cannot merge empty states array');
    }

    if (states.length === 1) {
      return states[0];
    }

    // Find the most recent valid state
    let mostRecentState = states[0];
    let highestTurn = states[0].currentTurn;
    let latestTimestamp = states[0].lastActionTime || 0;

    for (const state of states) {
      const stateTimestamp = state.lastActionTime || 0;
      
      if (state.currentTurn > highestTurn || 
          (state.currentTurn === highestTurn && stateTimestamp > latestTimestamp)) {
        mostRecentState = state;
        highestTurn = state.currentTurn;
        latestTimestamp = stateTimestamp;
      }
    }

    // Validate the merged state
    if (this.isValidState(mostRecentState)) {
      return mostRecentState;
    }

    // If the most recent state is invalid, try to find a valid one
    for (const state of states) {
      if (this.isValidState(state)) {
        return state;
      }
    }

    // If no valid state found, return the most recent one anyway
    console.warn('No valid state found during merge, returning most recent state');
    return mostRecentState;
  }

  private isValidState(state: GameState): boolean {
    // Basic validation checks
    if (!state || typeof state !== 'object') {
      return false;
    }

    // Check required fields
    if (typeof state.currentTurn !== 'number' || state.currentTurn < 0) {
      return false;
    }

    if (!Array.isArray(state.players) || state.players.length === 0) {
      return false;
    }

    // Check player validity
    for (const player of state.players) {
      if (!player.id || !player.position) {
        return false;
      }
    }

    // Check current player is valid
    if (state.currentPlayer !== undefined) {
      const playerExists = state.players.some(p => p.id === state.currentPlayer);
      if (!playerExists) {
        return false;
      }
    }

    return true;
  }
}