import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';

const backgroundForTheme = (theme) => (theme === 'light' ? '#ffffff' : '#04060a');

const cloneStroke = (stroke) => ({
  ...stroke,
  points: stroke.points.map((point) => ({ ...point }))
});

const cloneStrokeSet = (strokes) => strokes.map(cloneStroke);

const smoothPoints = (points) => {
  if (points.length < 3) {
    return points;
  }

  const next = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const upcoming = points[index + 1];
    next.push({
      x: (previous.x + current.x + upcoming.x) / 3,
      y: (previous.y + current.y + upcoming.y) / 3
    });
  }
  next.push(points[points.length - 1]);
  return next;
};

const buildPath = (ctx, points) => {
  if (!points.length) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1);
    return;
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    const controlY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
  }

  const lastPoint = points[points.length - 1];
  ctx.lineTo(lastPoint.x, lastPoint.y);
};

const applyInkStyle = (ctx, stroke) => {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.brushColor;
  ctx.globalCompositeOperation = 'source-over';

  switch (stroke.inkType) {
    case 'Laser':
      ctx.lineWidth = stroke.brushWidth;
      ctx.shadowBlur = stroke.brushWidth * 2.2;
      ctx.shadowColor = stroke.brushColor;
      ctx.globalAlpha = 0.95;
      break;
    case 'Calligraphy':
      ctx.lineWidth = stroke.brushWidth * 1.65;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      break;
    case 'Marker':
      ctx.lineWidth = stroke.brushWidth * 1.5;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.78;
      break;
    case 'Neon':
      ctx.lineWidth = stroke.brushWidth;
      ctx.shadowBlur = stroke.brushWidth * 3;
      ctx.shadowColor = stroke.brushColor;
      ctx.globalAlpha = 1;
      break;
    case 'Graphite':
    case 'Pencil':
    default:
      ctx.lineWidth = stroke.brushWidth;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = stroke.inkType === 'Pencil' ? 0.7 : 0.9;
      break;
  }
};

const drawStroke = (ctx, stroke) => {
  const points = smoothPoints(stroke.points);
  if (!points.length) {
    return;
  }

  applyInkStyle(ctx, stroke);
  buildPath(ctx, points);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
};

const AeroCanvas = forwardRef(function AeroCanvas(
  {
    theme,
    modeConfig,
    brushColor,
    brushWidth,
    inkType,
    onDirtyChange,
    onStrokeCommit,
    onStrokeUpdate,
    onPointerActivity,
    handTrackingEnabled,
    handState,
    inputMode = 'mouse'
  },
  ref
) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const drawingRef = useRef(false);
  const activeInputRef = useRef(null);
  const activePointsRef = useRef([]);
  const dprRef = useRef(1);
  const activeStrokeIdRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const [remoteActiveStrokes, setRemoteActiveStrokes] = useState({});
  const [redoStack, setRedoStack] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  const paintBackground = useCallback((ctx, width, height) => {
    ctx.fillStyle = backgroundForTheme(theme);
    ctx.fillRect(0, 0, width, height);
  }, [theme]);

  const redraw = useCallback((nextStrokes) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width / dprRef.current;
    const height = canvas.height / dprRef.current;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    paintBackground(ctx, width, height);
    nextStrokes.forEach((stroke) => drawStroke(ctx, stroke));
  }, [paintBackground]);

  useEffect(() => {
    const remoteStrokesArray = Object.entries(remoteActiveStrokes).map(([id, s]) => ({
      ...s,
      strokeId: id
    }));
    redraw([...strokes, ...remoteStrokesArray]);
  }, [strokes, remoteActiveStrokes, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return undefined;
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      redraw(strokes);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw, strokes]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const currentStrokeTemplate = useMemo(() => ({
    brushColor,
    brushWidth,
    inkType
  }), [brushColor, brushWidth, inkType]);

  const beginStroke = useCallback((point, source = 'pointer') => {
    drawingRef.current = true;
    activeInputRef.current = source;
    activePointsRef.current = [point];
    activeStrokeIdRef.current = `local-${Date.now()}-${Math.random()}`;
    setRedoStack([]);
    onPointerActivity?.(point, true);
    onStrokeUpdate?.(activeStrokeIdRef.current, [point], currentStrokeTemplate, true);
  }, [onPointerActivity, onStrokeUpdate, currentStrokeTemplate]);

  const updateStroke = useCallback((point, source = activeInputRef.current) => {
    if (!drawingRef.current || activeInputRef.current !== source) {
      return;
    }

    activePointsRef.current.push(point);
    const previewStroke = {
      ...currentStrokeTemplate,
      points: [...activePointsRef.current]
    };
    redraw([...strokes, previewStroke]);
    onPointerActivity?.(point, true);
    onStrokeUpdate?.(activeStrokeIdRef.current, [...activePointsRef.current], currentStrokeTemplate, true);
  }, [currentStrokeTemplate, onPointerActivity, onStrokeUpdate, redraw, strokes]);

  const endStroke = useCallback((source = activeInputRef.current) => {
    if (!drawingRef.current || activeInputRef.current !== source) {
      return;
    }

    drawingRef.current = false;
    activeInputRef.current = null;
    if (!activePointsRef.current.length) {
      return;
    }

    const committedStroke = {
      ...currentStrokeTemplate,
      strokeId: activeStrokeIdRef.current,
      points: activePointsRef.current.length === 1
        ? [
            ...activePointsRef.current,
            {
              ...activePointsRef.current[0],
              x: activePointsRef.current[0].x + 0.1,
              y: activePointsRef.current[0].y + 0.1
            }
          ]
        : [...activePointsRef.current]
    };

    const nextStrokes = [...strokes, committedStroke];
    activePointsRef.current = [];
    activeStrokeIdRef.current = null;
    setStrokes(nextStrokes);
    setIsDirty(true);
    onStrokeCommit?.(nextStrokes, committedStroke);
    onPointerActivity?.(committedStroke.points[committedStroke.points.length - 1], false);
    onStrokeUpdate?.(committedStroke.strokeId, committedStroke.points, currentStrokeTemplate, false);
  }, [currentStrokeTemplate, onPointerActivity, onStrokeCommit, strokes]);

  const getPointerPoint = (event) => {
    const container = containerRef.current;
    if (!container) {
      return { x: 0, y: 0, time: Date.now() };
    }

    const rect = container.getBoundingClientRect();  // Use container for consistency
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: Date.now()
    };
  };

  const getHandPoint = useCallback((nextHandState) => {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const rect = container.getBoundingClientRect();  // Use container, not canvas
    return {
      x: (Math.max(0, Math.min(100, nextHandState.x)) / 100) * rect.width,
      y: (Math.max(0, Math.min(100, nextHandState.y)) / 100) * rect.height,
      time: Date.now()
    };
  }, []);

  useEffect(() => {
    if (!handTrackingEnabled) {
      if (activeInputRef.current === 'hand') {
        endStroke('hand');
      }
      return;
    }

    if (!handState?.isVisible) {
      if (activeInputRef.current === 'hand') {
        endStroke('hand');
      }
      return;
    }

    const point = getHandPoint(handState);
    if (!point) {
      return;
    }

    if (handState.isDrawing) {
      if (!drawingRef.current) {
        beginStroke(point, 'hand');
      } else {
        updateStroke(point, 'hand');
      }
    } else if (activeInputRef.current === 'hand') {
      endStroke('hand');
    }
  }, [beginStroke, endStroke, getHandPoint, handState, handTrackingEnabled, updateStroke]);

  useImperativeHandle(ref, () => ({
    getCanvas() {
      return canvasRef.current;
    },
    replaceStrokes(nextStrokes, markDirty = true) {
      const normalizedStrokes = cloneStrokeSet(nextStrokes || []);
      activePointsRef.current = [];
      activeInputRef.current = null;
      drawingRef.current = false;
      setRedoStack([]);
      setStrokes(normalizedStrokes);
      setIsDirty(markDirty && normalizedStrokes.length > 0);
    },
    clear() {
      activePointsRef.current = [];
      activeInputRef.current = null;
      drawingRef.current = false;
      setRedoStack([]);
      setStrokes([]);
      setIsDirty(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
        paintBackground(ctx, canvas.width / dprRef.current, canvas.height / dprRef.current);
      }
    },
    remoteDraw(data) {
      if (!data.strokes || data.strokes.length === 0) return;
      
      const newStrokes = data.strokes.map((stroke) => ({
        ...stroke,
        brushColor: stroke.brushColor || brushColor,
        brushWidth: stroke.brushWidth || brushWidth,
        inkType: stroke.inkType || inkType
      }));
      
      setStrokes((prev) => [...prev, ...newStrokes]);
      setIsDirty(true);
    },
    remoteUpdateStroke(strokeId, points, style, isDrawing) {
      if (!isDrawing) {
        setRemoteActiveStrokes((prev) => {
          const next = { ...prev };
          delete next[strokeId];
          return next;
        });
        return;
      }
      setRemoteActiveStrokes((prev) => ({
        ...prev,
        [strokeId]: {
          points,
          brushColor: style?.color || style?.brushColor || brushColor,
          brushWidth: style?.width || style?.brushWidth || brushWidth,
          inkType: style?.ink || style?.inkType || inkType
        }
      }));
    },
    undo() {
      if (!strokes.length) {
        return;
      }

      const next = strokes.slice(0, -1);
      setRedoStack((current) => [...current, cloneStroke(strokes[strokes.length - 1])]);
      setStrokes(next);
      setIsDirty(next.length > 0);
    },
    redo() {
      if (!redoStack.length) {
        return;
      }

      const restored = redoStack[redoStack.length - 1];
      const nextRedo = redoStack.slice(0, -1);
      const nextStrokes = [...strokes, cloneStroke(restored)];
      setRedoStack(nextRedo);
      setStrokes(nextStrokes);
      setIsDirty(true);
    },
    loadSession(session) {
      const sessionStrokes = cloneStrokeSet(session.strokes || session.drawingData || []);
      activePointsRef.current = [];
      activeInputRef.current = null;
      drawingRef.current = false;
      setRedoStack([]);
      setStrokes(sessionStrokes);
      setIsDirty(false);
    },
    getSnapshot() {
      const canvas = canvasRef.current;
      return {
        hasContent: strokes.length > 0,
        thumbnail: canvas ? canvas.toDataURL('image/png') : null,
        drawingData: cloneStrokeSet(strokes)
      };
    },
  }), [brushColor, brushWidth, inkType, paintBackground, redoStack, strokes, remoteActiveStrokes]);

  return (
    <div ref={containerRef} className="canvas-container relative h-full w-full overflow-hidden rounded-[28px] border border-white/8 bg-black/40">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={(event) => {
          if (inputMode === 'camera' || inputMode === 'touch') return;
          event.currentTarget.setPointerCapture(event.pointerId);
          beginStroke(getPointerPoint(event), 'pointer');
        }}
        onPointerMove={(event) => {
          if (inputMode === 'camera' || inputMode === 'touch') return;
          if (!drawingRef.current) {
            onPointerActivity?.(getPointerPoint(event), false);
            return;
          }
          updateStroke(getPointerPoint(event), 'pointer');
        }}
        onPointerUp={() => {
          if (inputMode === 'camera' || inputMode === 'touch') return;
          endStroke('pointer');
        }}
        onPointerLeave={() => {
          if (inputMode === 'camera' || inputMode === 'touch') return;
          onPointerActivity?.(null, false);
          endStroke('pointer');
        }}
        onTouchStart={(event) => {
          if (inputMode !== 'touch') return;
          event.preventDefault();
          beginStroke(getPointerPoint(event.touches[0]), 'pointer');
        }}
        onTouchMove={(event) => {
          if (inputMode !== 'touch') return;
          event.preventDefault();
          updateStroke(getPointerPoint(event.touches[0]), 'pointer');
        }}
        onTouchEnd={(event) => {
          if (inputMode !== 'touch') return;
          event.preventDefault();
          endStroke('pointer');
        }}
      />
      <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-300 backdrop-blur-xl">
        {modeConfig.label}
      </div>
      {handTrackingEnabled && handState?.isVisible ? (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: `${Math.max(0, Math.min(100, handState.x))}%`,
            top: `${Math.max(0, Math.min(100, handState.y))}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div
            className="h-5 w-5 rounded-full border-2 border-white/80 shadow-[0_0_18px_rgba(34,211,238,0.55)]"
            style={{ backgroundColor: brushColor }}
          />
          <div className="mt-2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.2em] backdrop-blur-md" style={{ color: handState.isDrawing ? '#22d3ee' : '#94a3b8' }}>
            {handState.isDrawing ? 'Drawing' : `${handState.fingersCount} finger${handState.fingersCount !== 1 ? 's' : ''}`}
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default AeroCanvas;
