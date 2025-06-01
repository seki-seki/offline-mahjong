import React from 'react';
import { Tile, Meld } from '../../types/mahjong';
import TileComponent from '../Tile/Tile';
import DraggableTile from '../DraggableTile/DraggableTile';
import './HandDisplay.css';

interface HandDisplayProps {
  tiles: Tile[];
  melds: Meld[];
  isCurrentPlayer: boolean;
  position: string;
  onTileClick?: (tile: Tile) => void;
  isDraggable?: boolean;
  canDiscard?: boolean;
}

const HandDisplay: React.FC<HandDisplayProps> = ({
  tiles,
  melds,
  isCurrentPlayer,
  position,
  onTileClick,
  isDraggable = false,
  canDiscard = false
}) => {
  const sortedTiles = [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) {
      const suitOrder = ['man', 'pin', 'sou', 'honor'];
      return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    }
    if (a.suit === 'honor') {
      const honorOrder = ['E', 'S', 'W', 'N', 'haku', 'hatsu', 'chun'];
      return honorOrder.indexOf(a.honor!) - honorOrder.indexOf(b.honor!);
    }
    return (a.value || 0) - (b.value || 0);
  });

  return (
    <div className={`hand-display hand-display--${position}`}>
      <div className="hand-display__tiles">
        {sortedTiles.map((tile, index) => (
          isDraggable && isCurrentPlayer ? (
            <DraggableTile
              key={tile.id}
              tile={tile}
              index={index}
              size={position === 'bottom' ? 'large' : 'medium'}
              isDisabled={!canDiscard}
            />
          ) : (
            <TileComponent
              key={tile.id}
              tile={tile}
              faceUp={isCurrentPlayer}
              onClick={onTileClick ? () => onTileClick(tile) : undefined}
              size={position === 'bottom' ? 'large' : 'medium'}
            />
          )
        ))}
      </div>
      
      {melds.length > 0 && (
        <div className="hand-display__melds">
          {melds.map((meld, meldIndex) => (
            <div key={meldIndex} className="hand-display__meld">
              {meld.tiles.map((tile, tileIndex) => (
                <TileComponent
                  key={`${meldIndex}-${tileIndex}`}
                  tile={tile}
                  faceUp={true}
                  size={position === 'bottom' ? 'large' : 'medium'}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HandDisplay;