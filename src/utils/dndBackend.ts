import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

export const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
};

export const getDndBackend = () => {
  return isTouchDevice() ? TouchBackend : HTML5Backend;
};

export const getDndBackendOptions = () => {
  if (isTouchDevice()) {
    return {
      enableMouseEvents: true,
      delayTouchStart: 200,
      touchSlop: 5
    };
  }
  return {};
};