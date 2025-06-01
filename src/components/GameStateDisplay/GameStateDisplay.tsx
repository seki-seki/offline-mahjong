import React from 'react';
import { GameState, Wind } from '../../types/mahjong';
import './GameStateDisplay.css';

interface GameStateDisplayProps {
  gameState: GameState;
  currentPlayer: Wind;
}

const GameStateDisplay: React.FC<GameStateDisplayProps> = ({
  gameState,
  currentPlayer
}) => {
  const getPhaseDisplay = () => {
    switch (gameState.phase) {
      case 'waiting':
        return '待機中';
      case 'playing':
        return 'ゲーム中';
      case 'ended':
        return 'ゲーム終了';
    }
  };

  const getTurnPhaseDisplay = () => {
    switch (gameState.turnPhase) {
      case 'draw':
        return 'ツモ';
      case 'discard':
        return '打牌';
      case 'action':
        return 'アクション待ち';
    }
  };

  const windMap: Record<string, string> = {
    'E': '東',
    'S': '南',
    'W': '西',
    'N': '北'
  };

  return (
    <div className="game-state-display">
      <div className="game-state-display__phase">
        {getPhaseDisplay()}
      </div>
      
      {gameState.phase === 'playing' && (
        <>
          <div className="game-state-display__turn">
            現在のターン: {windMap[gameState.currentTurn]}
            {gameState.currentTurn === currentPlayer && ' (あなた)'}
          </div>
          
          <div className="game-state-display__turn-phase">
            {getTurnPhaseDisplay()}
          </div>
        </>
      )}
    </div>
  );
};

export default GameStateDisplay;