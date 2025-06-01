import React from 'react';
import { Tile, Meld } from '../../types/mahjong';
import TileComponent from '../Tile/Tile';
import './HandDisplay.css';

interface HandDisplayProps {
  tiles: Tile[];
  melds: Meld[];
  isCurrentPlayer: boolean;
  position: string;
  onTileClick?: (tile: Tile) => void;
}

const HandDisplay: React.FC<HandDisplayProps> = ({
  tiles,
  melds,
  isCurrentPlayer,
  position,
  onTileClick
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
        {sortedTiles.map((tile) => (
          <TileComponent
            key={tile.id}
            tile={tile}
            faceUp={isCurrentPlayer}
            onClick={onTileClick ? () => onTileClick(tile) : undefined}
            size={position === 'bottom' ? 'large' : 'medium'}
          />
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