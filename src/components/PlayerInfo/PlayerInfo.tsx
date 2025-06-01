import React from 'react';
import { Player } from '../../types/mahjong';
import './PlayerInfo.css';

interface PlayerInfoProps {
  player: Player;
  isTurn: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isTurn }) => {
  const windMap: Record<string, string> = {
    'E': '東',
    'S': '南',
    'W': '西',
    'N': '北'
  };

  return (
    <div className={`player-info ${isTurn ? 'player-info--active' : ''} ${player.riichi ? 'player-info--riichi' : ''}`}>
      <div className="player-info__name">{player.name}</div>
      <div className="player-info__details">
        <span className="player-info__wind">{windMap[player.seat]}</span>
        <span className="player-info__score">{player.score.toLocaleString()}</span>
      </div>
      {player.riichi && <div className="player-info__riichi-stick">リーチ</div>}
    </div>
  );
};

export default PlayerInfo;