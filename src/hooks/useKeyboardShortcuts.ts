import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  [key: string]: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts, enabled: boolean = true) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey;
    const shift = event.shiftKey;
    const alt = event.altKey;

    // Build key combination string
    let keyCombo = '';
    if (ctrl) keyCombo += 'ctrl+';
    if (shift) keyCombo += 'shift+';
    if (alt) keyCombo += 'alt+';
    keyCombo += key;

    // Check for exact key match first
    if (shortcuts[key]) {
      event.preventDefault();
      shortcuts[key]();
      return;
    }

    // Then check for key combinations
    if (shortcuts[keyCombo]) {
      event.preventDefault();
      shortcuts[keyCombo]();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

// Common game shortcuts
export const GAME_SHORTCUTS = {
  PASS: 'p',
  RIICHI: 'r',
  TSUMO: 't',
  RON: 'n',
  PON: 'o',
  CHI: 'c',
  KAN: 'k',
  DISCARD_1: '1',
  DISCARD_2: '2',
  DISCARD_3: '3',
  DISCARD_4: '4',
  DISCARD_5: '5',
  DISCARD_6: '6',
  DISCARD_7: '7',
  DISCARD_8: '8',
  DISCARD_9: '9',
  DISCARD_10: '0',
  DISCARD_11: 'q',
  DISCARD_12: 'w',
  DISCARD_13: 'e',
  DISCARD_14: 'a',
};