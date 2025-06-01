import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ActionEffect.css';

interface ActionEffectProps {
  action: 'pon' | 'chi' | 'kan' | 'ron' | 'tsumo' | 'riichi' | null;
  position: 'bottom' | 'left' | 'top' | 'right';
  onComplete?: () => void;
}

const ActionEffect: React.FC<ActionEffectProps> = ({ action, position, onComplete }) => {
  useEffect(() => {
    if (action && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [action, onComplete]);

  const getActionText = () => {
    switch (action) {
      case 'pon': return 'ポン！';
      case 'chi': return 'チー！';
      case 'kan': return 'カン！';
      case 'ron': return 'ロン！';
      case 'tsumo': return 'ツモ！';
      case 'riichi': return 'リーチ！';
      default: return '';
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return { bottom: '20%', left: '50%', x: '-50%' };
      case 'top':
        return { top: '20%', left: '50%', x: '-50%' };
      case 'left':
        return { left: '20%', top: '50%', y: '-50%' };
      case 'right':
        return { right: '20%', top: '50%', y: '-50%' };
    }
  };

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          className={`action-effect action-effect--${action}`}
          style={getPositionStyles()}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.5, 1.2],
            opacity: [0, 1, 1],
          }}
          exit={{ 
            scale: 0,
            opacity: 0,
          }}
          transition={{
            duration: 0.5,
            times: [0, 0.3, 1]
          }}
        >
          <motion.div
            className="action-effect__text"
            animate={{
              rotate: [0, -5, 5, 0],
            }}
            transition={{
              duration: 0.3,
              repeat: 2,
              repeatType: "reverse"
            }}
          >
            {getActionText()}
          </motion.div>
          {(action === 'ron' || action === 'tsumo') && (
            <motion.div
              className="action-effect__particles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="particle"
                  initial={{ x: 0, y: 0 }}
                  animate={{
                    x: Math.cos(i * Math.PI / 4) * 100,
                    y: Math.sin(i * Math.PI / 4) * 100,
                    opacity: [1, 0],
                  }}
                  transition={{ duration: 1, delay: 0.1 * i }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionEffect;