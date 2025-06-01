import React from 'react';
import { useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { ItemTypes } from '../DraggableTile/DraggableTile';
import './DroppableDiscardArea.css';

interface DroppableDiscardAreaProps {
  onDrop: (tile: any, index: number) => void;
  isActive: boolean;
  children: React.ReactNode;
}

const DroppableDiscardArea: React.FC<DroppableDiscardAreaProps> = ({
  onDrop,
  isActive,
  children
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.TILE,
    drop: (item: { tile: any; index: number }) => {
      onDrop(item.tile, item.index);
    },
    canDrop: () => isActive,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [isActive, onDrop]);

  return (
    <motion.div
      ref={drop}
      className={`droppable-discard-area ${isOver && canDrop ? 'drag-over' : ''} ${canDrop ? 'can-drop' : ''}`}
      animate={{
        scale: isOver && canDrop ? 1.02 : 1,
        borderColor: isOver && canDrop ? '#4ade80' : '#333'
      }}
      transition={{ duration: 0.2 }}
    >
      {children}
      {canDrop && (
        <div className="drop-hint">
          ここに牌を捨てる
        </div>
      )}
    </motion.div>
  );
};

export default DroppableDiscardArea;