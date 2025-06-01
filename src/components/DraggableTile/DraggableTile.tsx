import React from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';
import { Tile as TileType } from '../../types/mahjong';
import Tile from '../Tile/Tile';
import './DraggableTile.css';

interface DraggableTileProps {
  tile: TileType;
  index: number;
  size?: 'small' | 'medium' | 'large';
  isDisabled?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const ItemTypes = {
  TILE: 'tile'
};

const DraggableTile: React.FC<DraggableTileProps> = ({
  tile,
  index,
  size = 'medium',
  isDisabled = false,
  onDragStart,
  onDragEnd
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TILE,
    item: { tile, index },
    canDrag: !isDisabled,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    end: () => {
      onDragEnd?.();
    }
  }), [tile, index, isDisabled]);

  React.useEffect(() => {
    if (isDragging && onDragStart) {
      onDragStart();
    }
  }, [isDragging, onDragStart]);

  return (
    <motion.div
      ref={drag}
      className={`draggable-tile ${isDragging ? 'dragging' : ''}`}
      whileHover={!isDisabled ? { y: -5 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDisabled ? 'default' : 'grab'
      }}
    >
      <Tile tile={tile} size={size} faceUp={true} />
    </motion.div>
  );
};

export default DraggableTile;