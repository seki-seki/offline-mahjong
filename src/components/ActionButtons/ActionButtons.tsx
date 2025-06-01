import React from 'react';
import { Action } from '../../types/mahjong';
import './ActionButtons.css';

interface ActionButtonsProps {
  availableActions: Action[];
  onAction: (action: Action) => void;
  timeLeft?: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  availableActions,
  onAction,
  timeLeft
}) => {
  const actionLabels: Record<Action, string> = {
    tsumo: 'ツモ',
    ron: 'ロン',
    pon: 'ポン',
    chi: 'チー',
    kan: 'カン',
    pass: 'パス',
    riichi: 'リーチ'
  };

  return (
    <div className="action-buttons">
      {timeLeft !== undefined && (
        <div className="action-buttons__timer">
          残り時間: {timeLeft}秒
        </div>
      )}
      
      <div className="action-buttons__container">
        {availableActions.map((action) => (
          <button
            key={action}
            className={`action-button action-button--${action}`}
            onClick={() => onAction(action)}
          >
            {actionLabels[action]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionButtons;