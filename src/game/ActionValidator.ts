import { GameState } from '../types/game';
import { Player, ActionRequest } from '../types/player';
import { Tile } from '../types/tile';

export class ActionValidator {
  public validateAction(gameState: GameState, request: ActionRequest): { valid: boolean; error?: string } {
    const player = gameState.players.find(p => p.id === request.playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }

    const pendingAction = gameState.pendingActions.find(p => p.playerId === request.playerId);
    if (!pendingAction) {
      return { valid: false, error: 'No pending action for player' };
    }

    if (!pendingAction.availableActions.includes(request.action)) {
      return { valid: false, error: 'Action not available' };
    }

    if (Date.now() > pendingAction.deadline) {
      return { valid: false, error: 'Action timeout' };
    }

    return { valid: true };
  }

  public canPon(player: Player, tile: Tile): boolean {
    const matchingTiles = player.hand.filter(t => this.tilesMatch(t, tile));
    return matchingTiles.length >= 2;
  }

  public canChi(player: Player, tile: Tile, gameState: GameState): boolean {
    if (tile.type === 'honor') return false;
    
    const lastDiscarderIndex = gameState.players.findIndex(p => p.id === gameState.lastDiscardedBy);
    const playerIndex = gameState.players.findIndex(p => p.id === player.id);
    
    if ((lastDiscarderIndex + 1) % 4 !== playerIndex) return false;
    
    const sameSuitTiles = player.hand.filter(t => t.type === tile.type && t.type !== 'honor');
    const numbers = sameSuitTiles.map(t => t.number);
    
    if (numbers.includes(tile.number - 2) && numbers.includes(tile.number - 1)) return true;
    if (numbers.includes(tile.number - 1) && numbers.includes(tile.number + 1)) return true;
    if (numbers.includes(tile.number + 1) && numbers.includes(tile.number + 2)) return true;
    
    return false;
  }

  public canKan(player: Player, tile: Tile): boolean {
    const matchingTiles = player.hand.filter(t => this.tilesMatch(t, tile));
    return matchingTiles.length >= 3;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public canRon(_player: Player, _tile: Tile): boolean {
    return true;
  }

  private tilesMatch(tile1: Tile, tile2: Tile): boolean {
    if (tile1.type !== tile2.type) return false;
    
    if (tile1.type === 'honor' && tile2.type === 'honor') {
      return tile1.honor === tile2.honor;
    }
    
    if (tile1.type !== 'honor' && tile2.type !== 'honor') {
      return tile1.number === tile2.number;
    }
    
    return false;
  }
}