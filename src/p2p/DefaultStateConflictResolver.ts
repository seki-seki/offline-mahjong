import { StateConflictResolver } from './P2PGameCoordinator';
import { GameState } from '../types';

export class DefaultStateConflictResolver implements StateConflictResolver {
  resolve(localState: GameState, remoteState: GameState): GameState {
    // Default conflict resolution strategy:
    // 1. Compare turn counts - higher turn count is more recent
    // 2. If turn counts are equal, compare timestamps
    // 3. If timestamps are equal, use the state with more actions in history

    if (localState.currentTurn > remoteState.currentTurn) {
      return localState;
    } else if (remoteState.currentTurn > localState.currentTurn) {
      return remoteState;
    }

    // Turn counts are equal, check timestamps
    const localTimestamp = localState.lastActionTime || 0;
    const remoteTimestamp = remoteState.lastActionTime || 0;

    if (localTimestamp > remoteTimestamp) {
      return localState;
    } else if (remoteTimestamp > localTimestamp) {
      return remoteState;
    }

    // Timestamps are equal, check action history length
    const localActionCount = localState.actionHistory?.length || 0;
    const remoteActionCount = remoteState.actionHistory?.length || 0;

    if (localActionCount >= remoteActionCount) {
      return localState;
    } else {
      return remoteState;
    }
  }
}