import { useState, useEffect, useCallback, useRef } from 'react';

export function useInputMode(initialMode = 'mouse') {
  const [inputMode, setInputMode] = useState(initialMode);
  const [isDrawing, setIsDrawing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const lastPosition = useRef({ x: 0, y: 0 });

  const getCanvasCoordinates = useCallback((e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;

    if (inputMode === 'touch') {
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      clientX = touch?.clientX || 0;
      clientY = touch?.clientY || 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, [inputMode]);

  const handleStart = useCallback((e) => {
    if (inputMode === 'camera') return;
    
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    setPosition(coords);
    lastPosition.current = coords;
    setIsDrawing(true);
  }, [inputMode, getCanvasCoordinates]);

  const handleMove = useCallback((e) => {
    if (inputMode === 'camera' || !isDrawing) return;
    
    e.preventDefault();
    const coords = getCanvasCoordinates(e);
    setPosition(coords);

    if (canvasRef.current?.onDrawMove) {
      canvasRef.current.onDrawMove(lastPosition.current, coords);
    }

    lastPosition.current = coords;
  }, [inputMode, isDrawing, getCanvasCoordinates]);

  const handleEnd = useCallback((e) => {
    if (inputMode === 'camera' || !isDrawing) return;
    
    e.preventDefault();
    setIsDrawing(false);

    if (canvasRef.current?.onDrawEnd) {
      canvasRef.current.onDrawEnd();
    }
  }, [inputMode, isDrawing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (inputMode === 'mouse') {
      canvas.addEventListener('mousedown', handleStart);
      canvas.addEventListener('mousemove', handleMove);
      canvas.addEventListener('mouseup', handleEnd);
      canvas.addEventListener('mouseleave', handleEnd);
    } else if (inputMode === 'touch') {
      canvas.addEventListener('touchstart', handleStart, { passive: false });
      canvas.addEventListener('touchmove', handleMove, { passive: false });
      canvas.addEventListener('touchend', handleEnd);
      canvas.addEventListener('touchcancel', handleEnd);
    }

    return () => {
      if (inputMode === 'mouse') {
        canvas.removeEventListener('mousedown', handleStart);
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('mouseup', handleEnd);
        canvas.removeEventListener('mouseleave', handleEnd);
      } else if (inputMode === 'touch') {
        canvas.removeEventListener('touchstart', handleStart);
        canvas.removeEventListener('touchmove', handleMove);
        canvas.removeEventListener('touchend', handleEnd);
        canvas.removeEventListener('touchcancel', handleEnd);
      }
    };
  }, [inputMode, handleStart, handleMove, handleEnd]);

  const setCanvasRef = useCallback((ref) => {
    canvasRef.current = ref;
  }, []);

  return {
    inputMode,
    setInputMode,
    isDrawing,
    position,
    canvasRef: setCanvasRef,
    setIsDrawing
  };
}
