import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from '../../types/mahjong';
import TileComponent from '../Tile/Tile';
import './GameInfoPanel.css';

interface GameInfoPanelProps {
  remainingTiles: number;
  doraIndicators: Tile[];
  uraDoraIndicators?: Tile[];
  round: {
    wind: 'E' | 'S' | 'W' | 'N';
    number: number;
    honba: number;
    riichiBets: number;
  };
  scores: {
    east: number;
    south: number;
    west: number;
    north: number;
  };
  previousScores?: {
    east: number;
    south: number;
    west: number;
    north: number;
  };
}

const windToKanji: Record<string, string> = {
  'E': '東',
  'S': '南',
  'W': '西',
  'N': '北'
};

const GameInfoPanel: React.FC<GameInfoPanelProps> = ({
  remainingTiles,
  doraIndicators,
  uraDoraIndicators = [],
  round,
  scores,
  previousScores
}) => {
  const getScoreChange = (position: 'east' | 'south' | 'west' | 'north') => {
    if (!previousScores) return 0;
    return scores[position] - previousScores[position];
  };

  const renderScoreChange = (position: 'east' | 'south' | 'west' | 'north') => {
    const change = getScoreChange(position);
    if (change === 0) return null;
    
    return (
      <AnimatePresence>
        <motion.span
          className={`score-change ${change > 0 ? 'positive' : 'negative'}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {change > 0 ? '+' : ''}{change}
        </motion.span>
      </AnimatePresence>
    );
  };

  return (
    <div className="game-info-panel">
      <div className="info-section round-info">
        <h3>{windToKanji[round.wind]}{round.number}局</h3>
        <div className="round-details">
          <span>{round.honba}本場</span>
          {round.riichiBets > 0 && (
            <span className="riichi-bets">リーチ棒: {round.riichiBets}</span>
          )}
        </div>
      </div>

      <div className="info-section tiles-remaining">
        <h3>残り牌</h3>
        <motion.div 
          className="tiles-count"
          animate={{ scale: remainingTiles <= 10 ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          {remainingTiles}
        </motion.div>
      </div>

      <div className="info-section dora-display">
        <h3>ドラ表示牌</h3>
        <div className="dora-tiles">
          {doraIndicators.map((tile, index) => (
            <motion.div
              key={tile.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <TileComponent tile={tile} size="small" faceUp={true} />
            </motion.div>
          ))}
        </div>
        {uraDoraIndicators && uraDoraIndicators.length > 0 && (
          <>
            <h4>裏ドラ</h4>
            <div className="dora-tiles ura-dora">
              {uraDoraIndicators.map((tile, index) => (
                <motion.div
                  key={tile.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TileComponent tile={tile} size="small" faceUp={true} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="info-section scores-display">
        <h3>得点</h3>
        <div className="scores-grid">
          {(['east', 'south', 'west', 'north'] as const).map((position) => (
            <div key={position} className="score-item">
              <span className="position-label">{windToKanji[position[0].toUpperCase()]}</span>
              <motion.span 
                className="score-value"
                animate={{ scale: getScoreChange(position) !== 0 ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {scores[position].toLocaleString()}
              </motion.span>
              {renderScoreChange(position)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameInfoPanel;