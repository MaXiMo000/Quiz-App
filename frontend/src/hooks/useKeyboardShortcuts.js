import { useEffect } from 'react';

/**
 * Custom hook for keyboard shortcuts with cross-browser and cross-platform support
 * @param {Object} shortcuts - Object mapping key combinations to callbacks
 * @param {Array} dependencies - Dependencies array for the effect
 *
 * @example
 * useKeyboardShortcuts({
 *   'Escape': () => closeModal(),
 *   'Ctrl+F': (e) => { e.preventDefault(); openSearch(); },
 *   'Ctrl+S': (e) => { e.preventDefault(); save(); }
 * });
 *
 * Note: 'Ctrl+F' works on both Windows/Linux (Ctrl) and Mac (Cmd)
 */
export const useKeyboardShortcuts = (shortcuts, dependencies = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when user is typing in input fields, textareas, or contenteditable elements
      const target = event.target;
      const isInputElement = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.isContentEditable ||
                            target.getAttribute('role') === 'textbox';

      // Allow Escape and some special keys even in inputs (for closing modals, etc.)
      const allowedInInputs = ['Escape', 'Tab'];
      const isAllowedInInput = allowedInInputs.includes(event.key);

      // Skip if typing in input and key is not allowed
      if (isInputElement && !isAllowedInInput) {
        // Exception: Allow Ctrl+F/Cmd+F to focus search even when in input
        if (!((event.ctrlKey || event.metaKey) && event.key === 'F')) {
          return;
        }
      }

      const key = event.key;
      const ctrlKey = event.ctrlKey;
      const metaKey = event.metaKey; // Cmd on Mac, Windows key on Windows
      const shiftKey = event.shiftKey;
      const altKey = event.altKey;

      // Normalize Ctrl/Cmd: Use Ctrl for both Windows/Linux Ctrl and Mac Cmd
      // This ensures 'Ctrl+F' works on both platforms
      const isCtrlOrCmd = ctrlKey || metaKey;

      // Build key combination string (normalized to 'Ctrl' for cross-platform)
      let combination = '';
      if (isCtrlOrCmd) combination += 'Ctrl+';
      if (shiftKey) combination += 'Shift+';
      if (altKey) combination += 'Alt+';
      combination += key;

      // Check for exact match first (e.g., 'Ctrl+Shift+F')
      if (shortcuts[combination]) {
        const callback = shortcuts[combination];
        if (typeof callback === 'function') {
          callback(event);
        }
        return;
      }

      // Check for modifier + key combinations (normalized)
      if (isCtrlOrCmd && shortcuts[`Ctrl+${key}`]) {
        const callback = shortcuts[`Ctrl+${key}`];
        if (typeof callback === 'function') {
          callback(event);
        }
        return;
      }

      if (shiftKey && shortcuts[`Shift+${key}`]) {
        const callback = shortcuts[`Shift+${key}`];
        if (typeof callback === 'function') {
          callback(event);
        }
        return;
      }

      if (altKey && shortcuts[`Alt+${key}`]) {
        const callback = shortcuts[`Alt+${key}`];
        if (typeof callback === 'function') {
          callback(event);
        }
        return;
      }

      // Check for single key (only if no modifiers pressed)
      if (!isCtrlOrCmd && !shiftKey && !altKey && shortcuts[key]) {
        const callback = shortcuts[key];
        if (typeof callback === 'function') {
          callback(event);
        }
      }
    };

    // Use capture phase for better control and to catch events before browser defaults
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [shortcuts, ...dependencies]);
};

/**
 * Predefined keyboard shortcuts for common actions
 * Note: 'Ctrl+' shortcuts work on both Windows/Linux (Ctrl) and Mac (Cmd)
 */
export const KeyboardShortcuts = {
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  CTRL_K: 'Ctrl+K', // Works with Cmd+K on Mac
  CTRL_S: 'Ctrl+S', // Works with Cmd+S on Mac
  CTRL_F: 'Ctrl+F', // Works with Cmd+F on Mac
  CTRL_P: 'Ctrl+P', // Works with Cmd+P on Mac
  CTRL_N: 'Ctrl+N', // Works with Cmd+N on Mac
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
};

/**
 * Utility function to check if user is on Mac
 * Useful for displaying platform-specific shortcut hints
 */
export const isMac = () => {
  return typeof navigator !== 'undefined' &&
         /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);
};

/**
 * Get platform-appropriate modifier key name for display
 * Returns "Cmd" on Mac, "Ctrl" on Windows/Linux
 */
export const getModifierKeyName = () => {
  return isMac() ? 'Cmd' : 'Ctrl';
};

export default useKeyboardShortcuts;
