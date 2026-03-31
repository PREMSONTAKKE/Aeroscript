import { useEffect, useRef, useState, useCallback } from 'react';
import partyService from '../services/partyService';

export function useParty(canvasRef, pushToast) {
  const [currentParty, setCurrentParty] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const currentPartyRef = useRef(null);

  const handleDraw = useCallback((data) => {
    if (canvasRef.current) {
      canvasRef.current.remoteDraw(data);
    }
    setCurrentParty((prev) => prev ? {
      ...prev,
      board: partyService.board || prev.board
    } : prev);
  }, [canvasRef]);

  const handleClear = useCallback((data) => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      pushToast?.({ title: 'Canvas Cleared', description: `${data.userName} cleared the canvas.`, tone: 'info' });
    }
    setCurrentParty((prev) => prev ? {
      ...prev,
      board: partyService.board || prev.board
    } : prev);
  }, [canvasRef, pushToast]);

  const handleCanvasSync = useCallback((data) => {
    if (canvasRef.current) {
      canvasRef.current.replaceStrokes(data.board?.strokes || []);
    }
    setCurrentParty((prev) => prev ? {
      ...prev,
      board: data.board || prev.board
    } : prev);
    pushToast?.({
      title: 'Shared Board Updated',
      description: `${data.userName} synced the party canvas.`,
      tone: 'info',
      duration: 1800
    });
  }, [canvasRef, pushToast]);

  const handlePresence = useCallback((data) => {
    if (data.board && (!currentPartyRef.current || currentPartyRef.current.code !== data.party.code)) {
      canvasRef.current?.replaceStrokes(data.board.strokes || []);
    }
    setCurrentParty((prev) => ({
      ...(prev || {}),
      ...data.party,
      members: data.members || [],
      board: data.board || prev?.board || null
    }));
  }, [canvasRef]);

  const handleMemberJoined = useCallback((member) => {
    pushToast?.({ title: 'Member Joined', description: `${member.userName} joined the party.`, tone: 'success' });
  }, [pushToast]);

  const handleMemberLeft = useCallback((member) => {
    pushToast?.({ title: 'Member Left', description: `${member.userName} left the party.`, tone: 'info' });
  }, [pushToast]);

  const handleCursorMove = useCallback((data) => {
    setRemoteCursors(prev => ({
      ...prev,
      [data.socketId]: {
        x: data.x,
        y: data.y,
        userName: data.userName,
        isDrawing: data.isDrawing,
        lastUpdated: Date.now()
      }
    }));
  }, []);

  const handleError = useCallback((error) => {
    pushToast?.({ title: 'Party Error', description: error, tone: 'danger' });
  }, [pushToast]);

  const handleKicked = useCallback((reason) => {
    setCurrentParty(null);
    pushToast?.({ title: 'Removed from Party', description: reason, tone: 'danger' });
  }, [pushToast]);

  const handleLockChanged = useCallback((locked) => {
    setCurrentParty((prev) => prev ? { ...prev, isLocked: locked } : prev);
  }, []);

  const handleStreamDraw = useCallback((data) => {
    if (canvasRef.current) {
      canvasRef.current.remoteUpdateStroke(data.strokeId, data.points, data.style, data.isDrawing);
    }
  }, [canvasRef]);

  useEffect(() => {
    partyService.onDraw(handleDraw);
    partyService.onStreamDraw(handleStreamDraw);
    partyService.onClear(handleClear);
    partyService.onCanvasSync(handleCanvasSync);
    partyService.onPresence(handlePresence);
    partyService.onMemberJoined(handleMemberJoined);
    partyService.onMemberLeft(handleMemberLeft);
    partyService.onCursorMove(handleCursorMove);
    partyService.onError(handleError);
    partyService.onKicked(handleKicked);
    partyService.onLockChanged(handleLockChanged);

    return () => {
      partyService.disconnect();
    };
  }, [handleDraw, handleStreamDraw, handleClear, handleCanvasSync, handlePresence, handleMemberJoined, handleMemberLeft, handleCursorMove, handleError, handleKicked, handleLockChanged]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemoteCursors((current) => {
        const nextEntries = Object.entries(current).filter(([, cursor]) => Date.now() - cursor.lastUpdated < 4000);
        if (nextEntries.length === Object.keys(current).length) {
          return current;
        }
        return Object.fromEntries(nextEntries);
      });
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  const connect = useCallback((token) => {
    partyService.connect(token);
  }, []);

  const createParty = useCallback(async (name, token) => {
    return await partyService.createParty(name, token);
  }, []);

  const joinParty = useCallback(async (code, token) => {
    return await partyService.joinParty(code, token);
  }, []);

  const leaveParty = useCallback(() => {
    partyService.leaveParty();
    setCurrentParty(null);
  }, []);

  const draw = useCallback((strokes, isDrawing, x, y, settings, inputMode) => {
    partyService.draw(strokes, isDrawing, x, y, settings, inputMode);
  }, []);

  const syncCanvas = useCallback((strokes, settings, inputMode) => {
    partyService.syncCanvas(strokes, settings, inputMode);
  }, []);

  const clearCanvas = useCallback(() => {
    partyService.clearCanvas();
  }, []);

  const cursorMove = useCallback((x, y, isDrawing) => {
    partyService.cursorMove(x, y, isDrawing);
  }, []);

  const streamDraw = useCallback((strokeId, points, style, inputMode) => {
    partyService.streamDraw(strokeId, points, style, inputMode);
  }, []);

  const updatePresence = useCallback((inputMode) => {
    partyService.updatePresence(inputMode);
  }, []);

  const kickMember = useCallback(async (memberId, token) => {
    return await partyService.kickMember(memberId, token);
  }, []);

  const toggleLock = useCallback(async (token) => {
    return await partyService.toggleLock(token);
  }, []);

  const transferHost = useCallback(async (newHostId, token) => {
    return await partyService.transferHost(newHostId, token);
  }, []);

  const isHost = partyService.getIsHost();
  const isLocked = partyService.getIsLocked();

  return {
    currentParty,
    remoteCursors,
    isHost,
    isLocked,
    connect,
    createParty,
    joinParty,
    leaveParty,
    draw,
    streamDraw,
    syncCanvas,
    clearCanvas,
    cursorMove,
    updatePresence,
    kickMember,
    toggleLock,
    transferHost,
    setCurrentParty,
    setPartyState: setCurrentParty
  };
}
