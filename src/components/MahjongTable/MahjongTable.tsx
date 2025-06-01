import React from 'react';
import { GameState, Wind } from '../../types/mahjong';
import PlayerArea from '../PlayerArea/PlayerArea';
import CenterArea from '../CenterArea/CenterArea';
import './MahjongTable.css';

interface MahjongTableProps {
  gameState: GameState;
  currentPlayer: Wind;
  onAction: (action: string, data?: { tile?: Tile }) => void;
}

const MahjongTable: React.FC<MahjongTableProps> = ({ gameState, currentPlayer, onAction }) => {
  const winds: Wind[] = ['E', 'S', 'W', 'N'];
  
  const getPlayerPosition = (playerWind: Wind, viewerWind: Wind): string => {
    const windOrder = ['E', 'S', 'W', 'N'];
    const playerIndex = windOrder.indexOf(playerWind);
    const viewerIndex = windOrder.indexOf(viewerWind);
    const relativeIndex = (playerIndex - viewerIndex + 4) % 4;
    
    return ['bottom', 'right', 'top', 'left'][relativeIndex];
  };

  return (
    <div className="mahjong-table">
      {winds.map((wind) => {
        const player = gameState.players[wind];
        const position = getPlayerPosition(wind, currentPlayer);
        const isCurrentPlayer = wind === currentPlayer;
        const isTurn = wind === gameState.currentTurn;
        
        return (
          <PlayerArea
            key={wind}
            player={player}
            position={position}
            isCurrentPlayer={isCurrentPlayer}
            isTurn={isTurn}
            turnPhase={gameState.turnPhase}
            onAction={onAction}
          />
        );
      })}
      
      <CenterArea
        remainingTiles={gameState.remainingTiles}
        dora={gameState.dora}
        round={gameState.round}
        dealer={gameState.dealer}
      />
    </div>
  );
};

export default MahjongTable;