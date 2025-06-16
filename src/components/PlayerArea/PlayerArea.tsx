import React from 'react';
import { Player, TurnPhase, Tile } from '../../types/mahjong';
import HandDisplay from '../HandDisplay/HandDisplay';
import DiscardArea from '../DiscardArea/DiscardArea';
import PlayerInfo from '../PlayerInfo/PlayerInfo';
import './PlayerArea.css';

interface PlayerAreaProps {
  player: Player;
  position: string;
  isCurrentPlayer: boolean;
  isTurn: boolean;
  turnPhase: TurnPhase;
  onAction: (action: string, data?: { tile?: Tile }) => void;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({
  player,
  position,
  isCurrentPlayer,
  isTurn,
  turnPhase,
  onAction
}) => {
  return (
    <div className={`player-area player-area--${position} ${isTurn ? 'player-area--active' : ''}`}>
      <PlayerInfo player={player} isTurn={isTurn} />
      
      <HandDisplay
        tiles={player.hand}
        melds={player.melds}
        isCurrentPlayer={isCurrentPlayer}
        position={position}
        onTileClick={isCurrentPlayer && isTurn && turnPhase === 'discard' ? 
          (tile) => onAction('discard', { tile }) : undefined}
      />
      
      <DiscardArea
        discards={player.discards}
        position={position}
      />
    </div>
  );
};

export default PlayerArea;