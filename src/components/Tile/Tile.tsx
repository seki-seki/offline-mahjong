import React from 'react';
import { Tile } from '../../types/mahjong';
import './Tile.css';

interface TileComponentProps {
  tile: Tile;
  faceUp: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const TileComponent: React.FC<TileComponentProps> = ({
  tile,
  faceUp,
  size = 'medium',
  onClick
}) => {
  const getTileDisplay = () => {
    if (!faceUp) return '';
    
    if (tile.suit === 'honor') {
      const honorMap: Record<string, string> = {
        'E': '東',
        'S': '南',
        'W': '西',
        'N': '北',
        'haku': '白',
        'hatsu': '發',
        'chun': '中'
      };
      return honorMap[tile.honor!];
    }
    
    const suitMap: Record<string, string> = {
      'man': '萬',
      'pin': '筒',
      'sou': '索'
    };
    
    const numberMap: Record<number, string> = {
      1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
      6: '六', 7: '七', 8: '八', 9: '九'
    };
    
    return numberMap[tile.value!] + suitMap[tile.suit];
  };

  return (
    <div
      className={`tile tile--${size} ${faceUp ? 'tile--face-up' : 'tile--face-down'} ${tile.dora ? 'tile--dora' : ''} ${tile.red ? 'tile--red' : ''}`}
      onClick={onClick}
    >
      {faceUp && (
        <div className="tile__content">
          <span className={`tile__text tile__text--${tile.suit}`}>
            {getTileDisplay()}
          </span>
        </div>
      )}
    </div>
  );
};

export default TileComponent;