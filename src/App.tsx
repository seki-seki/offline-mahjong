import React, { useState } from 'react';
import { GameState, Wind, Action, Tile } from './types/mahjong';
import MahjongTable from './components/MahjongTable/MahjongTable';
import ActionButtons from './components/ActionButtons/ActionButtons';
import GameStateDisplay from './components/GameStateDisplay/GameStateDisplay';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { DebugPanel } from './components/DebugPanel/DebugPanel';
<<<<<<< HEAD
import { GameLobby } from './components/GameLobby/GameLobby';
=======
>>>>>>> origin/main
import { useP2P } from './p2p/useP2P';
import './App.css';

function App() {
<<<<<<< HEAD
  const [isInGame, setIsInGame] = useState(false);
=======
>>>>>>> origin/main
  const currentPlayer: Wind = 'E';
  const { state: p2pState, error: p2pError } = useP2P();
  
  const generateMockTiles = (count: number, startId: number): Tile[] => {
    const tiles: Tile[] = [];
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: `tile-${startId + i}`,
        suit: 'man',
        value: ((i % 9) + 1) as Tile['value'],
      });
    }
    return tiles;
  };

  const [gameState] = useState<GameState>({
    phase: 'playing',
    round: 1,
    dealer: 'E',
    currentTurn: 'E',
    turnPhase: 'discard',
    remainingTiles: 70,
    dora: [
      { id: 'dora-1', suit: 'pin', value: 5 }
    ],
    players: {
      'E': {
        id: 'player-1',
        name: 'あなた',
        seat: 'E',
        score: 25000,
        hand: generateMockTiles(13, 0),
        discards: generateMockTiles(8, 100),
        melds: [],
        riichi: false
      },
      'S': {
        id: 'player-2',
        name: 'プレイヤー2',
        seat: 'S',
        score: 25000,
        hand: generateMockTiles(13, 200),
        discards: generateMockTiles(6, 300),
        melds: [],
        riichi: false
      },
      'W': {
        id: 'player-3',
        name: 'プレイヤー3',
        seat: 'W',
        score: 25000,
        hand: generateMockTiles(13, 400),
        discards: generateMockTiles(7, 500),
        melds: [],
        riichi: true
      },
      'N': {
        id: 'player-4',
        name: 'プレイヤー4',
        seat: 'N',
        score: 25000,
        hand: generateMockTiles(13, 600),
        discards: generateMockTiles(5, 700),
        melds: [
          {
            tiles: [
              { id: 'meld-1', suit: 'sou', value: 3 },
              { id: 'meld-2', suit: 'sou', value: 3 },
              { id: 'meld-3', suit: 'sou', value: 3 }
            ],
            type: 'pon',
            from: 'W'
          }
        ],
        riichi: false
      }
    }
  });

  const [availableActions] = useState<Action[]>(['riichi', 'pass']);
  const [showActions, setShowActions] = useState(false);

  const handleAction = (action: string, data?: { tile?: Tile }) => {
    console.log('Action:', action, data);
    if (action === 'discard') {
      setShowActions(true);
      setTimeout(() => setShowActions(false), 5000);
    }
  };

  const handleActionButtonClick = (action: Action) => {
    console.log('Action button clicked:', action);
    setShowActions(false);
  };

<<<<<<< HEAD
  const handleGameStart = () => {
    setIsInGame(true);
  };

  if (!isInGame) {
    return (
      <ErrorBoundary>
        <div className="app">
          <GameLobby onGameStart={handleGameStart} />
        </div>
      </ErrorBoundary>
    );
  }

=======
>>>>>>> origin/main
  return (
    <ErrorBoundary>
      <div className="app">
        <MahjongTable
          gameState={gameState}
          currentPlayer={currentPlayer}
          onAction={handleAction}
        />
        
        <GameStateDisplay
          gameState={gameState}
          currentPlayer={currentPlayer}
        />
        
        {showActions && (
          <ActionButtons
            availableActions={availableActions}
            onAction={handleActionButtonClick}
            timeLeft={5}
          />
        )}
        
        {p2pError && (
          <div className="error-notification">
            {p2pError}
          </div>
        )}
        
        <DebugPanel 
          gameState={gameState}
          p2pState={p2pState}
          showTileInfo={process.env.NODE_ENV === 'development'}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;