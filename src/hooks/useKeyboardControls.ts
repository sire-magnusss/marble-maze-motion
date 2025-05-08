
import { useState, useEffect } from 'react';

interface ControlsState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const useKeyboardControls = (): ControlsState => {
  const [controls, setControls] = useState<ControlsState>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setControls(state => ({ ...state, up: true }));
          break;
        case 'ArrowDown':
          setControls(state => ({ ...state, down: true }));
          break;
        case 'ArrowLeft':
          setControls(state => ({ ...state, left: true }));
          break;
        case 'ArrowRight':
          setControls(state => ({ ...state, right: true }));
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setControls(state => ({ ...state, up: false }));
          break;
        case 'ArrowDown':
          setControls(state => ({ ...state, down: false }));
          break;
        case 'ArrowLeft':
          setControls(state => ({ ...state, left: false }));
          break;
        case 'ArrowRight':
          setControls(state => ({ ...state, right: false }));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return controls;
};
