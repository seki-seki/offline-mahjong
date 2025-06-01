import React from 'react';
import { Tile } from '../../types/mahjong';
import TileComponent from '../Tile/Tile';
import './DiscardArea.css';

interface DiscardAreaProps {
  discards: Tile[];
  position: string;
}

const DiscardArea: React.FC<DiscardAreaProps> = ({ discards, position }) => {
  const rows = [];
  const tilesPerRow = 6;
  
  for (let i = 0; i < discards.length; i += tilesPerRow) {
    rows.push(discards.slice(i, i + tilesPerRow));
  }

  return (
    <div className={`discard-area discard-area--${position}`}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="discard-area__row">
          {row.map((tile) => (
            <TileComponent
              key={tile.id}
              tile={tile}
              faceUp={true}
              size="small"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default DiscardArea;