import { GameState, GameConfig, DEFAULT_GAME_CONFIG, PendingAction, ACTION_PRIORITY, getNextPlayerIndex, GameEvent, EndCondition } from '../types/game';
import { Player, PlayerAction, ActionRequest, ActionResponse, PlayerPosition } from '../types/player';
import { Tile } from '../types/tile';
import { TileManager } from './TileManager';
import { ActionValidator } from './ActionValidator';
import { HandEvaluator } from './HandEvaluator';

export class GameManager {
  private gameState: GameState;
  private config: GameConfig;
  private tileManager: TileManager;
  private actionValidator: ActionValidator;
  private handEvaluator: HandEvaluator;
  private eventHandlers: Map<string, (event: GameEvent) => void>;
  private timeoutHandles: Map<string, NodeJS.Timeout>;

  constructor(gameId: string, players: Player[], config?: Partial<GameConfig>) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    this.tileManager = new TileManager(this.config.enableRedDora);
    this.actionValidator = new ActionValidator();
    this.handEvaluator = new HandEvaluator();
    this.eventHandlers = new Map();
    this.timeoutHandles = new Map();
    
    this.gameState = this.initializeGameState(gameId, players);
  }

  private initializeGameState(gameId: string, players: Player[]): GameState {
    return {
      id: gameId,
      phase: 'waiting',
      round: 1,
      honba: 0,
      riichiBets: 0,
      currentPlayerIndex: 0,
      currentTurnStartTime: 0,
      players: players.map((p, i) => ({
        ...p,
        position: (['east', 'south', 'west', 'north'] as PlayerPosition[])[i],
        points: this.config.startingPoints,
        hand: [],
        discards: [],
        melds: [],
        riichi: false
      })),
      wall: [],
      dora: [],
      uraDora: [],
      deadWall: [],
      pendingActions: [],
      turnTimeLimit: this.config.turnTimeLimit
    };
  }

  public async startGame(): Promise<void> {
    if (this.gameState.phase !== 'waiting') {
      throw new Error('Game has already started');
    }

    this.gameState.phase = 'dealing';
    this.emitEvent({ type: 'game-started', data: { gameId: this.gameState.id }, timestamp: Date.now() });
    
    await this.dealTiles();
    this.startTurn();
  }

  private async dealTiles(): Promise<void> {
    const tiles = await this.tileManager.generateShuffledTiles();
    
    const deadWallSize = 14;
    this.gameState.deadWall = tiles.splice(tiles.length - deadWallSize, deadWallSize);
    this.gameState.dora = [this.gameState.deadWall[4]];
    this.gameState.uraDora = [this.gameState.deadWall[5]];
    
    this.gameState.wall = tiles;
    
    for (let i = 0; i < 4; i++) {
      const hand: Tile[] = [];
      for (let j = 0; j < 13; j++) {
        const tile = this.gameState.wall.shift();
        if (tile) hand.push(tile);
      }
      this.gameState.players[i].hand = hand;
    }
    
    this.gameState.phase = 'playing';
    this.emitEvent({ type: 'tiles-dealt', data: {}, timestamp: Date.now() });
  }

  private startTurn(): void {
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    this.gameState.currentTurnStartTime = Date.now();
    
    const drawnTile = this.gameState.wall.shift();
    if (!drawnTile) {
      this.endGame('draw');
      return;
    }
    
    currentPlayer.hand.push(drawnTile);
    
    const canTsumo = this.handEvaluator.canWin(currentPlayer.hand);
    if (canTsumo) {
      this.setPendingActions([{
        playerId: currentPlayer.id,
        availableActions: ['tsumo-win', 'discard'],
        deadline: Date.now() + this.config.turnTimeLimit,
        priority: ACTION_PRIORITY['tsumo-win']
      }]);
    } else {
      this.setPendingActions([{
        playerId: currentPlayer.id,
        availableActions: ['discard'],
        deadline: Date.now() + this.config.turnTimeLimit,
        priority: ACTION_PRIORITY['discard']
      }]);
    }
    
    this.setTurnTimeout(currentPlayer.id);
    
    this.emitEvent({
      type: 'turn-started',
      playerId: currentPlayer.id,
      data: { drawnTile, canTsumo },
      timestamp: Date.now()
    });
  }

  public async handleAction(request: ActionRequest): Promise<ActionResponse> {
    const validation = this.actionValidator.validateAction(this.gameState, request);
    if (!validation.valid) {
      return validation;
    }
    
    this.clearTimeout(request.playerId);
    
    switch (request.action) {
      case 'discard':
        return await this.handleDiscard(request);
      case 'pon':
        return await this.handlePon(request);
      case 'chi':
        return await this.handleChi(request);
      case 'kan':
        return await this.handleKan(request);
      case 'ron':
        return await this.handleRon(request);
      case 'tsumo-win':
        return await this.handleTsumoWin(request);
      case 'pass':
        return await this.handlePass(request);
      default:
        return { valid: false, error: 'Unknown action' };
    }
  }

  private async handleDiscard(request: ActionRequest): Promise<ActionResponse> {
    const player = this.gameState.players.find(p => p.id === request.playerId);
    if (!player || !request.tile) {
      return { valid: false, error: 'Invalid discard request' };
    }
    
    const tileIndex = player.hand.findIndex(t => t.id === request.tile!.id);
    if (tileIndex === -1) {
      return { valid: false, error: 'Tile not in hand' };
    }
    
    const discardedTile = player.hand.splice(tileIndex, 1)[0];
    player.discards.push(discardedTile);
    this.gameState.lastDiscardedTile = discardedTile;
    this.gameState.lastDiscardedBy = player.id;
    
    this.gameState.phase = 'action-waiting';
    const pendingActions = this.checkAvailableActions(discardedTile, player.id);
    
    if (pendingActions.length > 0) {
      this.setPendingActions(pendingActions);
      this.setActionTimeout();
    } else {
      this.nextTurn();
    }
    
    this.emitEvent({
      type: 'tile-discarded',
      playerId: player.id,
      data: { tile: discardedTile },
      timestamp: Date.now()
    });
    
    return { valid: true };
  }

  private checkAvailableActions(tile: Tile, discarderId: string): PendingAction[] {
    const actions: PendingAction[] = [];
    
    for (const player of this.gameState.players) {
      if (player.id === discarderId) continue;
      
      const availableActions: PlayerAction[] = [];
      
      if (this.actionValidator.canRon(player, tile)) {
        availableActions.push('ron');
      }
      
      if (this.actionValidator.canPon(player, tile)) {
        availableActions.push('pon');
      }
      
      if (this.actionValidator.canChi(player, tile, this.gameState)) {
        availableActions.push('chi');
      }
      
      if (this.actionValidator.canKan(player, tile)) {
        availableActions.push('kan');
      }
      
      if (availableActions.length > 0) {
        availableActions.push('pass');
        const priority = Math.max(...availableActions.map(a => ACTION_PRIORITY[a]));
        actions.push({
          playerId: player.id,
          availableActions,
          deadline: Date.now() + this.config.actionTimeLimit,
          priority
        });
      }
    }
    
    return actions;
  }

  private async handlePon(request: ActionRequest): Promise<ActionResponse> {
    const player = this.gameState.players.find(p => p.id === request.playerId);
    const targetTile = this.gameState.lastDiscardedTile;
    
    if (!player || !targetTile) {
      return { valid: false, error: 'Invalid pon request' };
    }
    
    const tiles = player.hand.filter(t => 
      t.type === targetTile.type && 
      (t.type === 'honor' ? t.honor === targetTile.honor : t.number === targetTile.number)
    );
    
    if (tiles.length < 2) {
      return { valid: false, error: 'Not enough tiles for pon' };
    }
    
    tiles.slice(0, 2).forEach(t => {
      const index = player.hand.findIndex(ht => ht.id === t.id);
      if (index !== -1) player.hand.splice(index, 1);
    });
    
    player.melds.push({
      type: 'pon',
      tiles: [...tiles.slice(0, 2), targetTile],
      source: this.gameState.lastDiscardedBy!
    });
    
    const discarderIndex = this.gameState.players.findIndex(p => p.id === this.gameState.lastDiscardedBy);
    const discarder = this.gameState.players[discarderIndex];
    discarder.discards.pop();
    
    this.gameState.currentPlayerIndex = this.gameState.players.findIndex(p => p.id === request.playerId);
    this.gameState.lastDiscardedTile = undefined;
    this.gameState.lastDiscardedBy = undefined;
    this.gameState.phase = 'playing';
    
    this.setPendingActions([{
      playerId: player.id,
      availableActions: ['discard'],
      deadline: Date.now() + this.config.turnTimeLimit,
      priority: ACTION_PRIORITY['discard']
    }]);
    
    this.setTurnTimeout(player.id);
    
    this.emitEvent({
      type: 'pon-declared',
      playerId: player.id,
      data: { tiles: [...tiles.slice(0, 2), targetTile] },
      timestamp: Date.now()
    });
    
    return { valid: true };
  }

  private async handleChi(request: ActionRequest): Promise<ActionResponse> {
    const player = this.gameState.players.find(p => p.id === request.playerId);
    const targetTile = this.gameState.lastDiscardedTile;
    
    if (!player || !targetTile || !request.tiles) {
      return { valid: false, error: 'Invalid chi request' };
    }
    
    request.tiles.forEach(t => {
      const index = player.hand.findIndex(ht => ht.id === t.id);
      if (index !== -1) player.hand.splice(index, 1);
    });
    
    player.melds.push({
      type: 'chi',
      tiles: [...request.tiles, targetTile],
      source: this.gameState.lastDiscardedBy!
    });
    
    const discarder = this.gameState.players.find(p => p.id === this.gameState.lastDiscardedBy);
    if (discarder) discarder.discards.pop();
    
    this.gameState.currentPlayerIndex = this.gameState.players.findIndex(p => p.id === request.playerId);
    this.gameState.lastDiscardedTile = undefined;
    this.gameState.lastDiscardedBy = undefined;
    this.gameState.phase = 'playing';
    
    this.setPendingActions([{
      playerId: player.id,
      availableActions: ['discard'],
      deadline: Date.now() + this.config.turnTimeLimit,
      priority: ACTION_PRIORITY['discard']
    }]);
    
    this.setTurnTimeout(player.id);
    
    this.emitEvent({
      type: 'chi-declared',
      playerId: player.id,
      data: { tiles: [...request.tiles, targetTile] },
      timestamp: Date.now()
    });
    
    return { valid: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleKan(_request: ActionRequest): Promise<ActionResponse> {
    return { valid: true };
  }

  private async handleRon(request: ActionRequest): Promise<ActionResponse> {
    const player = this.gameState.players.find(p => p.id === request.playerId);
    const targetTile = this.gameState.lastDiscardedTile;
    
    if (!player || !targetTile) {
      return { valid: false, error: 'Invalid ron request' };
    }
    
    const tempHand = [...player.hand, targetTile];
    if (!this.handEvaluator.canWin(tempHand)) {
      return { valid: false, error: 'Invalid winning hand' };
    }
    
    this.gameState.winner = player.id;
    this.endGame('win');
    
    this.emitEvent({
      type: 'ron-declared',
      playerId: player.id,
      data: { winningTile: targetTile },
      timestamp: Date.now()
    });
    
    return { valid: true };
  }

  private async handleTsumoWin(request: ActionRequest): Promise<ActionResponse> {
    const player = this.gameState.players.find(p => p.id === request.playerId);
    
    if (!player) {
      return { valid: false, error: 'Invalid tsumo request' };
    }
    
    if (!this.handEvaluator.canWin(player.hand)) {
      return { valid: false, error: 'Invalid winning hand' };
    }
    
    this.gameState.winner = player.id;
    this.endGame('win');
    
    this.emitEvent({
      type: 'tsumo-declared',
      playerId: player.id,
      data: {},
      timestamp: Date.now()
    });
    
    return { valid: true };
  }

  private async handlePass(request: ActionRequest): Promise<ActionResponse> {
    const pendingIndex = this.gameState.pendingActions.findIndex(p => p.playerId === request.playerId);
    if (pendingIndex !== -1) {
      this.gameState.pendingActions.splice(pendingIndex, 1);
    }
    
    if (this.gameState.pendingActions.length === 0) {
      this.nextTurn();
    }
    
    return { valid: true };
  }

  private setPendingActions(actions: PendingAction[]): void {
    this.gameState.pendingActions = actions.sort((a, b) => b.priority - a.priority);
  }

  private nextTurn(): void {
    this.gameState.currentPlayerIndex = getNextPlayerIndex(this.gameState.currentPlayerIndex);
    this.gameState.phase = 'playing';
    this.gameState.pendingActions = [];
    this.startTurn();
  }

  private endGame(condition: EndCondition): void {
    this.gameState.phase = 'finished';
    this.gameState.endCondition = condition;
    this.clearAllTimeouts();
    
    this.emitEvent({
      type: 'game-ended',
      data: {
        condition,
        winner: this.gameState.winner,
        scores: this.gameState.players.map(p => ({ playerId: p.id, points: p.points }))
      },
      timestamp: Date.now()
    });
  }

  private setTurnTimeout(playerId: string): void {
    const timeout = setTimeout(() => {
      const player = this.gameState.players.find(p => p.id === playerId);
      if (player && player.hand.length > 0) {
        this.handleAction({
          playerId,
          action: 'discard',
          tile: player.hand[player.hand.length - 1]
        });
      }
    }, this.config.turnTimeLimit);
    
    this.timeoutHandles.set(playerId, timeout);
  }

  private setActionTimeout(): void {
    const timeout = setTimeout(() => {
      this.gameState.pendingActions.forEach(action => {
        this.handleAction({
          playerId: action.playerId,
          action: 'pass'
        });
      });
    }, this.config.actionTimeLimit);
    
    this.timeoutHandles.set('action-timeout', timeout);
  }

  private clearTimeout(key: string): void {
    const timeout = this.timeoutHandles.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeoutHandles.delete(key);
    }
  }

  private clearAllTimeouts(): void {
    this.timeoutHandles.forEach(timeout => clearTimeout(timeout));
    this.timeoutHandles.clear();
  }

  private emitEvent(event: GameEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  public onEvent(eventType: string, handler: (event: GameEvent) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public getPlayerView(playerId: string): Partial<GameState> | null {
    const state = this.getGameState();
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return null;
    
    return {
      ...state,
      players: state.players.map(p => ({
        ...p,
        hand: p.id === playerId ? p.hand : p.hand.map(() => null)
      }))
    };
  }
}