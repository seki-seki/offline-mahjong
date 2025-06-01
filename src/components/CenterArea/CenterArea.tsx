import React from 'react';
import { Tile, Wind } from '../../types/mahjong';
import TileComponent from '../Tile/Tile';
import './CenterArea.css';

interface CenterAreaProps {
  remainingTiles: number;
  dora: Tile[];
  round: { wind: Wind; number: number };
  dealer: Wind;
}

const CenterArea: React.FC<CenterAreaProps> = ({
  remainingTiles,
  dora,
  round,
  dealer
}) => {
  const windMap: Record<string, string> = {
    'E': '東',
    'S': '南',
    'W': '西',
    'N': '北'
  };
  
  const getRoundDisplay = () => {
    return `${windMap[round.wind]}${round.number}局`;
  };

  return (
    <div className="center-area">
      <div className="center-area__info">
        <div className="center-area__round">{getRoundDisplay()}</div>
        <div className="center-area__dealer">親: {windMap[dealer]}</div>
        <div className="center-area__remaining">残り: {remainingTiles}枚</div>
      </div>
      
      <div className="center-area__dora">
        <div className="center-area__dora-label">ドラ表示牌</div>
        <div className="center-area__dora-tiles">
          {dora.map((tile, index) => (
            <TileComponent
              key={index}
              tile={tile}
              faceUp={true}
              size="medium"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CenterArea;