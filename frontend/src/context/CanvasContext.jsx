/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useState, useCallback } from 'react';

export const CanvasContext = createContext(null);

export function CanvasProvider({ children }) {
  const canvasRef = useRef(null);
  const [brushColor, setBrushColor] = useState('#e2e8f0');
  const [brushWidth, setBrushWidth] = useState(4);
  const [inkType, setInkType] = useState('Graphite');
  const [theme, setTheme] = useState('dark');

  const clear = useCallback(() => {
    canvasRef.current?.clear();
  }, []);

  const getSnapshot = useCallback(() => {
    return canvasRef.current?.getSnapshot();
  }, []);

  const loadSession = useCallback((session) => {
    canvasRef.current?.loadSession(session);
  }, []);

  const replaceStrokes = useCallback((strokes) => {
    canvasRef.current?.replaceStrokes(strokes);
  }, []);

  const remoteDraw = useCallback((data) => {
    canvasRef.current?.remoteDraw(data);
  }, []);

  const value = {
    canvasRef,
    brushColor,
    setBrushColor,
    brushWidth,
    setBrushWidth,
    inkType,
    setInkType,
    theme,
    setTheme,
    clear,
    getSnapshot,
    loadSession,
    replaceStrokes,
    remoteDraw
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}
