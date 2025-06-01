import React from 'react';
import { motion } from 'framer-motion';
import { Action } from '../../types/mahjong';
import { GAME_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
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

  const actionShortcuts: Record<Action, string> = {
    tsumo: GAME_SHORTCUTS.TSUMO,
    ron: GAME_SHORTCUTS.RON,
    pon: GAME_SHORTCUTS.PON,
    chi: GAME_SHORTCUTS.CHI,
    kan: GAME_SHORTCUTS.KAN,
    pass: GAME_SHORTCUTS.PASS,
    riichi: GAME_SHORTCUTS.RIICHI
  };

  return (
    <div className="action-buttons">
      {timeLeft !== undefined && (
        <div className="action-buttons__timer">
          残り時間: {timeLeft}秒
        </div>
      )}
      
      <div className="action-buttons__container">
        {availableActions.map((action, index) => (
          <motion.button
            key={action}
            className={`action-button action-button--${action}`}
            onClick={() => onAction(action)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="action-button__label">{actionLabels[action]}</span>
            <span className="action-button__shortcut">({actionShortcuts[action].toUpperCase()})</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ActionButtons;