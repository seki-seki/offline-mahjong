import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAME_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import './KeyboardHelp.css';

interface KeyboardHelpProps {
  isVisible: boolean;
  onClose: () => void;
}

const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ isVisible, onClose }) => {
  const shortcuts = [
    { key: GAME_SHORTCUTS.PASS, action: 'パス' },
    { key: GAME_SHORTCUTS.RIICHI, action: 'リーチ' },
    { key: GAME_SHORTCUTS.TSUMO, action: 'ツモ' },
    { key: GAME_SHORTCUTS.RON, action: 'ロン' },
    { key: GAME_SHORTCUTS.PON, action: 'ポン' },
    { key: GAME_SHORTCUTS.CHI, action: 'チー' },
    { key: GAME_SHORTCUTS.KAN, action: 'カン' },
    { key: '1-9, 0', action: '牌を捨てる (1-10番目)' },
    { key: 'Q, W, E, A', action: '牌を捨てる (11-14番目)' },
    { key: '?', action: 'ヘルプを表示' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            className="keyboard-help-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="keyboard-help"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="keyboard-help__header">
              <h3>キーボードショートカット</h3>
              <button className="keyboard-help__close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="keyboard-help__content">
              {shortcuts.map((shortcut, index) => (
                <motion.div
                  key={index}
                  className="keyboard-help__item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <kbd className="keyboard-help__key">{shortcut.key.toUpperCase()}</kbd>
                  <span className="keyboard-help__action">{shortcut.action}</span>
                </motion.div>
              ))}
            </div>
            <div className="keyboard-help__footer">
              <p>ESCキーまたは背景をクリックで閉じる</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyboardHelp;