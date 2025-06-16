import React from 'react';
import { motion } from 'framer-motion';
import './DiscardIndicator.css';

interface DiscardIndicatorProps {
  type: 'tsumo-giri' | 'tedashi';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const DiscardIndicator: React.FC<DiscardIndicatorProps> = ({ 
  type, 
  position = 'bottom' 
}) => {
  return (
    <motion.div
      className={`discard-indicator discard-indicator--${type} discard-indicator--${position}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="discard-indicator__dot" />
      <span className="discard-indicator__label">
        {type === 'tsumo-giri' ? 'ツモ切り' : '手出し'}
      </span>
    </motion.div>
  );
};

export default DiscardIndicator;