import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from '../../types/mahjong';
import TileComponent from '../Tile/Tile';

interface AnimatedTileProps {
  tile: Tile;
  faceUp?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  layoutId?: string;
  animationType?: 'draw' | 'discard' | 'meld' | 'default';
  delay?: number;
}

const AnimatedTile: React.FC<AnimatedTileProps> = ({
  tile,
  faceUp = true,
  size = 'medium',
  onClick,
  layoutId,
  animationType = 'default',
  delay = 0
}) => {
  const getAnimationVariants = () => {
    switch (animationType) {
      case 'draw':
        return {
          initial: { scale: 0, rotate: 180, opacity: 0 },
          animate: { scale: 1, rotate: 0, opacity: 1 },
          exit: { scale: 0, opacity: 0 },
          transition: { duration: 0.4, delay }
        };
      case 'discard':
        return {
          initial: { y: -50, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { scale: 0.8, opacity: 0 },
          transition: { duration: 0.3, delay }
        };
      case 'meld':
        return {
          initial: { x: -100, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: 100, opacity: 0 },
          transition: { type: 'spring', stiffness: 260, damping: 20, delay }
        };
      default:
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 },
          transition: { duration: 0.2, delay }
        };
    }
  };

  const variants = getAnimationVariants();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        layoutId={layoutId}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={variants.transition}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <TileComponent
          tile={tile}
          faceUp={faceUp}
          size={size}
          onClick={onClick}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedTile;