import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LogOut, Moon, Sun } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AeroCanvas from '../components/AeroCanvas/AeroCanvas';
import PredictionOverlay from '../components/PredictionOverlay';
import ConfirmDialog from '../components/workspace/ConfirmDialog';
import ExportDialog from '../components/workspace/ExportDialog';
import HandStatusPanel from '../components/workspace/HandStatusPanel';
import ModeSidebar from '../components/workspace/ModeSidebar';
import SaveSessionDialog from '../components/workspace/SaveSessionDialog';
import SessionHistoryPanel from '../components/workspace/SessionHistoryPanel';
import WorkspaceToolbar from '../components/workspace/WorkspaceToolbar';
import ToastViewport from '../components/ui/ToastViewport';
import InputModeSelector from '../components/ui/InputModeSelector';
import PartyModal from '../components/party/PartyModal';
import PartyButton from '../components/party/PartyButton';
import { useAuth } from '../context/AuthContext';
import { getModeConfig, MODE_CONFIGS } from '../config/modes';
import useHandTracking from '../hooks/useHandTracking';
import useToast from '../hooks/useToast';
import { deleteSession, fetchHistory, predictCharacters, saveSession, updateSession } from '../services/api';
import partyService from '../services/partyService';

const mapSession = (session) => ({
  id: session._id,
  name: session.title || session.name || 'Untitled Workspace',
  createdAt: session.createdAt,
  strokes: session.strokes || session.drawingData || [],
  drawingData: session.drawingData || session.strokes || [],
  thumbnail: session.thumbnail,
  settings: session.settings || {},
  mode: session.mode || 'draw'
});

function WorkspaceView() {
  const { mode } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);
  const currentPartyRef = useRef(null);
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [brushColor, setBrushColor] = useState('#e2e8f0');
  const [brushWidth, setBrushWidth] = useState(4);
  const [inkType, setInkType] = useState('Graphite');
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(false);
  const [inputMode, setInputMode] = useState('mouse');
  const [showInputSelector, setShowInputSelector] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [currentParty, setCurrentParty] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [remoteCursors, setRemoteCursors] = useState({});
  const { toasts, pushToast, dismissToast } = useToast();
  const { isConnected: handTrackingConnected, handState } = useHandTracking(handTrackingEnabled);

  const modeConfig = getModeConfig(mode);
  const modeOptions = useMemo(() => Object.entries(MODE_CONFIGS), []);
  const getInputModeLabel = (value) => {
    switch (value) {
      case 'camera':
        return 'hand tracking';
      case 'touch':
        return 'touch screen';
      case 'screen':
        return 'screen canvas';
      case 'mouse':
      default:
        return 'mouse or touchpad';
    }
  };

  const getPartySettings = () => ({
    color: brushColor,
    width: brushWidth,
    ink: inkType,
    mode
  });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('aeroscript_theme');
    const savedHandTracking = window.localStorage.getItem('aeroscript_hand_tracking');

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }

    if (savedHandTracking === 'true' || savedHandTracking === 'false') {
      setHandTrackingEnabled(savedHandTracking === 'true');
    }
  }, []);

  useEffect(() => {
    currentPartyRef.current = currentParty;
  }, [currentParty]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    window.localStorage.setItem('aeroscript_theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('aeroscript_hand_tracking', String(handTrackingEnabled));
  }, [handTrackingEnabled]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!user?.token) return;

    partyService.connect(user.token);

    partyService.onDraw((data) => {
      if (canvasRef.current) {
        canvasRef.current.remoteDraw(data);
      }
      setCurrentParty((prev) => prev ? {
        ...prev,
        board: partyService.board || prev.board
      } : prev);
    });

    partyService.onClear((data) => {
      if (canvasRef.current) {
        canvasRef.current.clear();
        pushToast({ title: 'Canvas Cleared', description: `${data.userName} cleared the canvas.`, tone: 'info' });
      }
      setCurrentParty((prev) => prev ? {
        ...prev,
        board: partyService.board || prev.board
      } : prev);
    });

    partyService.onCanvasSync((data) => {
      if (canvasRef.current) {
        canvasRef.current.replaceStrokes(data.board?.strokes || []);
      }
      setCurrentParty((prev) => prev ? {
        ...prev,
        board: data.board || prev.board
      } : prev);
      pushToast({
        title: 'Shared Board Updated',
        description: `${data.userName} synced the party canvas.`,
        tone: 'info',
        duration: 1800
      });
    });

    partyService.onPresence((data) => {
      if (data.board && (!currentPartyRef.current || currentPartyRef.current.code !== data.party.code)) {
        canvasRef.current?.replaceStrokes(data.board.strokes || []);
      }
      setCurrentParty((prev) => ({
        ...(prev || {}),
        ...data.party,
        members: data.members || [],
        board: data.board || prev?.board || null
      }));
    });

    partyService.onMemberJoined((member) => {
      pushToast({ title: 'Member Joined', description: `${member.userName} joined the party.`, tone: 'success' });
    });

    partyService.onMemberLeft((member) => {
      pushToast({ title: 'Member Left', description: `${member.userName} left the party.`, tone: 'info' });
    });

    partyService.onCursorMove((data) => {
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
    });

    partyService.onError((error) => {
      pushToast({ title: 'Party Error', description: error, tone: 'danger' });
    });

    return () => {
      partyService.disconnect();
    };
  }, [pushToast, user?.token]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemoteCursors((current) => {
        const nextEntries = Object.entries(current).filter(([, cursor]) => Date.now() - cursor.lastUpdated < 4000);
        if (nextEntries.length === Object.keys(current).length) {
          return current;
        }
        return Object.fromEntries(nextEntries);
      });
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (currentParty) {
      partyService.updatePresence(inputMode);
    }
  }, [currentParty, inputMode]);

  useEffect(() => {
    setBrushWidth(modeConfig.defaultBrushWidth);
    setInkType(modeConfig.inks[0]);
    setBrushColor(modeConfig.colors[0] || '#e2e8f0');
    setPredictions([]);
    setRecognitionError('');
    setActiveSessionId(null);
    canvasRef.current?.clear();
  }, [modeConfig]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => () => {
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!user?.token) {
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchHistory(user.token, mode);
        if (isMounted) {
          setSessions(Array.isArray(data) ? data.map(mapSession) : []);
        }
      } catch (error) {
        console.error('History fetch failed:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [user?.token, mode]);

  // Generate consistent color for each user based on their socket ID
  const getUserColor = (socketId) => {
    // Simple hash function to generate consistent color
    let hash = 0;
    for (let i = 0; i < socketId.length; i++) {
      hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to HSL color
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 80%, 60%)`;
  };

  const showMessage = (title, description, tone = 'danger') => {
    setConfirmState({
      title,
      description,
      confirmLabel: 'Close',
      cancelLabel: '',
      tone,
      onConfirm: () => setConfirmState(null)
    });
  };

  const requestPrediction = async () => {
    if (!modeConfig.showPredictions || !user?.token) {
      return;
    }

    const pixels = canvasRef.current?.getRecognitionPixels();
    if (!pixels) {
      setPredictions([]);
      return;
    }

    setIsRecognizing(true);
    setRecognitionError('');
    try {
      const data = await predictCharacters(user.token, pixels);
      setPredictions(Array.isArray(data.predictions) ? data.predictions : []);
    } catch (error) {
      setPredictions([]);
      setRecognitionError(error.message || 'Prediction failed');
    } finally {
      setIsRecognizing(false);
    }
  };

  const schedulePrediction = () => {
    if (!modeConfig.showPredictions) {
      return;
    }

    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }

    recognitionTimeoutRef.current = setTimeout(() => {
      requestPrediction();
    }, 900);
  };

  const refreshHistory = async () => {
    if (!user?.token) {
      return;
    }

    const data = await fetchHistory(user.token, mode);
    setSessions(Array.isArray(data) ? data.map(mapSession) : []);
  };

  const upsertSessionInState = (session) => {
    setSessions((current) => {
      const mapped = mapSession(session);
      const existingIndex = current.findIndex((item) => item.id === mapped.id);

      if (existingIndex >= 0) {
        const next = [...current];
        next.splice(existingIndex, 1);
        return [mapped, ...next];
      }

      return [mapped, ...current];
    });
  };

  const clearActiveCanvas = () => {
    setActiveSessionId(null);
    setPredictions([]);
    setRecognitionError('');
    if (currentParty) {
      partyService.clearCanvas();
    }
    canvasRef.current?.clear();
    setCurrentParty((prev) => prev ? {
      ...prev,
      board: {
        ...(prev.board || {}),
        strokes: [],
        settings: getPartySettings(),
        inputMode,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'You'
      }
    } : prev);
    pushToast({ title: 'Fresh Canvas', description: 'Started a new empty workspace.', tone: 'info', duration: 1800 });
  };

  const applySessionLoad = (session) => {
    setActiveSessionId(session.id);
    setBrushColor(session.settings.color || modeConfig.colors[0] || '#e2e8f0');
    setBrushWidth(session.settings.width || modeConfig.defaultBrushWidth);
    setInkType(session.settings.ink || modeConfig.inks[0]);
    canvasRef.current?.loadSession(session);
    setIsDirty(false);
    if (currentParty) {
      partyService.syncCanvas(session.strokes || session.drawingData || [], {
        color: session.settings.color || modeConfig.colors[0] || '#e2e8f0',
        width: session.settings.width || modeConfig.defaultBrushWidth,
        ink: session.settings.ink || modeConfig.inks[0],
        mode
      }, inputMode);
    }
    pushToast({ title: 'Session Loaded', description: `${session.name} is now active.`, tone: 'info', duration: 1800 });
  };

  const handleStrokeCommit = (nextStrokes, committedStroke) => {
    schedulePrediction();

    if (!currentParty || !committedStroke) {
      return;
    }

    const lastPoint = committedStroke.points[committedStroke.points.length - 1];
    partyService.draw([committedStroke], true, lastPoint?.x, lastPoint?.y, getPartySettings(), inputMode);
    setCurrentParty((prev) => prev ? {
      ...prev,
      board: {
        ...(prev.board || {}),
        strokes: nextStrokes,
        settings: getPartySettings(),
        inputMode,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'You'
      }
    } : prev);
  };

  const handleSave = async () => {
    const snapshot = canvasRef.current?.getSnapshot();
    if (!snapshot?.hasContent || !user?.token) {
      return;
    }

    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = async ({ title, saveMode }) => {
    const snapshot = canvasRef.current?.getSnapshot();
    if (!snapshot?.hasContent || !user?.token) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title,
        thumbnail: snapshot.thumbnail,
        drawingData: snapshot.drawingData,
        mode,
        settings: {
          color: brushColor,
          width: brushWidth,
          ink: inkType
        }
      };

      if (saveMode === 'overwrite' && activeSessionId) {
        const response = await updateSession(user.token, activeSessionId, payload);
        upsertSessionInState({
          _id: response.id || activeSessionId,
          ...payload,
          createdAt: new Date().toISOString()
        });
        pushToast({ title: 'Session Updated', description: 'Saved changes were written back to the current session.', tone: 'success' });
      } else {
        const response = await saveSession(user.token, payload);
        upsertSessionInState({
          _id: response.id,
          ...payload,
          createdAt: new Date().toISOString()
        });
        setActiveSessionId(response.id);
        pushToast({ title: 'Session Saved', description: 'A new snapshot was added to this mode history.', tone: 'success' });
      }

      setSaveDialogOpen(false);
      setIsDirty(false);
    } catch (error) {
      console.error('Save failed:', error);
      showMessage('Save Failed', error.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (!user?.token) {
      return;
    }

    setConfirmState({
      title: 'Delete Session',
      description: 'This saved session will be removed from this mode history.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await deleteSession(user.token, id);
          if (activeSessionId === id) {
            setActiveSessionId(null);
            canvasRef.current?.clear();
          }
          setSessions((current) => current.filter((item) => item.id !== id));
          pushToast({ title: 'Session Deleted', description: 'The saved session was removed from history.', tone: 'success' });
        } catch (error) {
          console.error('Delete failed:', error);
          showMessage('Delete Failed', error.message || 'Delete failed');
        }
      }
    });
  };

  const handleSessionLoad = (session) => {
    if (isDirty) {
      setConfirmState({
        title: 'Unsaved Changes',
        description: 'Loading another session will replace the current unsaved canvas.',
        confirmLabel: 'Load Session',
        cancelLabel: 'Stay Here',
        onConfirm: () => {
          setConfirmState(null);
          applySessionLoad(session);
        }
      });
      return;
    }

    applySessionLoad(session);
  };

  const handleNewCanvas = () => {
    if (isDirty) {
      setConfirmState({
        title: 'Start New Canvas',
        description: 'Your current unsaved work will be cleared from the active canvas.',
        confirmLabel: 'Start New',
        cancelLabel: 'Keep Editing',
        onConfirm: () => {
          setConfirmState(null);
          clearActiveCanvas();
        }
      });
      return;
    }

    clearActiveCanvas();
  };

  const handleModeNavigation = (nextMode) => {
    if (nextMode === mode) {
      return;
    }

    if (isDirty) {
      setConfirmState({
        title: 'Switch Modes',
        description: 'Unsaved work will stay only on the current canvas unless you save before leaving.',
        confirmLabel: 'Switch Anyway',
        cancelLabel: 'Stay Here',
        onConfirm: () => {
          setConfirmState(null);
          navigate(`/workspace/${nextMode}`);
        }
      });
      return;
    }

    navigate(`/workspace/${nextMode}`);
  };

  const handlePartyJoined = (party) => {
    setCurrentParty((prev) => ({ ...(prev || {}), ...party }));
    setShowPartyModal(false);
    const snapshot = canvasRef.current?.getSnapshot();
    if (party.members?.length === 1 && snapshot?.hasContent) {
      partyService.syncCanvas(snapshot.drawingData, getPartySettings(), inputMode);
    }
    pushToast({ title: 'Party Joined', description: `Welcome to ${party.name}!`, tone: 'success' });
  };

  const handleLeaveParty = () => {
    setCurrentParty(null);
    setRemoteCursors({});
    pushToast({ title: 'Party Left', description: 'You have left the party.', tone: 'info' });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_35%),linear-gradient(180deg,#081018_0%,#04070c_100%)] text-slate-100">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${modeConfig.accent}`} />

      <header className="relative z-10 flex items-center justify-between border-b border-white/8 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Workspace</p>
            <h1 className="text-xl font-semibold text-white">{modeConfig.label}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PartyButton
            onClick={() => setShowPartyModal(true)}
            isActive={!!currentParty}
            memberCount={currentParty?.members?.length || 0}
          />
          <button
            onClick={() => setShowInputSelector(true)}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 transition hover:bg-white/10"
            title="Select input mode"
          >
            {inputMode === 'camera' ? '📷' : inputMode === 'touch' ? '👆' : inputMode === 'screen' ? '🖥️' : '🖱️'}
          </button>
          <button
            onClick={() => setSidebarVisible((prev) => !prev)}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 transition hover:bg-white/10"
            title="Toggle sidebar (Esc)"
          >
            {sidebarVisible ? '📊' : '📈'}
          </button>
          <button
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 transition hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden text-right md:block">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Authorized User</p>
            <p className="text-sm text-slate-200">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 transition hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="relative z-10 grid h-[calc(100vh-81px)] grid-cols-1 gap-5 p-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {sidebarVisible && (
          <ModeSidebar mode={mode} modeOptions={modeOptions} onSelect={handleModeNavigation} />
        )}

        <main className={`glass-panel flex min-h-0 flex-col rounded-[28px] p-4 md:p-5 ${!sidebarVisible ? 'xl:col-span-2' : ''}`}>
          <HandStatusPanel
            enabled={handTrackingEnabled}
            connected={handTrackingConnected}
            handState={handState}
            inputMode={inputMode}
          />

          {currentParty ? (
            <div className="mb-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">Party Code</p>
                <p className="mt-2 text-lg font-semibold text-white">{currentParty.code}</p>
                <p className="mt-1 text-xs text-slate-300">{currentParty.name}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Collaboration</p>
                <p className="mt-2 text-sm text-white">{currentParty.members?.length || 0} active members across devices</p>
                <p className="mt-1 text-xs text-slate-400">Current input: {getInputModeLabel(inputMode)}.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Shared Board</p>
                <p className="mt-2 text-sm text-white">{currentParty.board?.strokes?.length || 0} synced strokes</p>
                <p className="mt-1 text-xs text-slate-400">Last update by {currentParty.board?.updatedBy || 'the party'}.</p>
              </div>
            </div>
          ) : null}

          <WorkspaceToolbar
            modeConfig={modeConfig}
            inkType={inkType}
            setInkType={setInkType}
            brushColor={brushColor}
            setBrushColor={setBrushColor}
            brushWidth={brushWidth}
            setBrushWidth={setBrushWidth}
            onUndo={() => canvasRef.current?.undo()}
            onRedo={() => canvasRef.current?.redo()}
            onClear={handleNewCanvas}
            onSave={handleSave}
            onExport={() => setExportDialogOpen(true)}
            isSaving={isSaving}
            handTrackingEnabled={handTrackingEnabled}
            handTrackingConnected={handTrackingConnected}
            onToggleHandTracking={() => {
              setHandTrackingEnabled((current) => {
                const next = !current;
                pushToast({
                  title: next ? 'Hand Tracking Enabled' : 'Hand Tracking Disabled',
                  description: next ? 'Waiting for live camera input.' : 'Pointer drawing stays active.',
                  tone: 'info',
                  duration: 2200
                });
                return next;
              });
            }}
          />

          <div className="relative min-h-0 flex-1">
            <AeroCanvas
              ref={canvasRef}
              theme={theme}
              modeConfig={modeConfig}
              brushColor={brushColor}
              brushWidth={brushWidth}
              inkType={inkType}
              onDirtyChange={setIsDirty}
              onStrokeCommit={handleStrokeCommit}
              onPointerActivity={(point, isDrawing) => {
                if (currentParty && point) {
                  partyService.cursorMove(point.x, point.y, isDrawing);
                }
              }}
              handTrackingEnabled={handTrackingEnabled}
              handState={handState}
              inputMode={inputMode}
              isPartyHost={currentParty?.host === user?.userId}
              onClearCanvas={() => {
                if (currentParty) {
                  partyService.clearCanvas();
                }
                canvasRef.current?.clear();
              }}
            />

            {modeConfig.showPredictions && (
              <PredictionOverlay
                predictions={predictions}
                isRecognizing={isRecognizing}
                error={recognitionError}
              />
            )}

            {Object.entries(remoteCursors).map(([socketId, cursor]) => (
              <div
                key={socketId}
                className="pointer-events-none absolute z-20"
                style={{
                  left: cursor.x,
                  top: cursor.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 border-white/80 shadow-[0_0_18px_rgba(15,23,42,0.45)] ${cursor.isDrawing ? 'scale-110' : ''}`}
                  style={{ backgroundColor: getUserColor(socketId) }}
                />
                <div className="mt-2 whitespace-nowrap rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-slate-100 backdrop-blur-md">
                  {cursor.userName}
                </div>
              </div>
            ))}
          </div>
        </main>

        {sidebarVisible && (
          <SessionHistoryPanel
            modeConfig={modeConfig}
            sessions={sessions}
            activeSessionId={activeSessionId}
            isLoading={isLoading}
            isDirty={isDirty}
            onRefresh={refreshHistory}
            onLoad={handleSessionLoad}
            onDelete={handleDelete}
          />
        )}
      </div>

      <InputModeSelector
        isOpen={showInputSelector}
        currentMode={inputMode}
        onSelect={(newMode) => {
          setInputMode(newMode);
          setShowInputSelector(false);
          if (newMode === 'camera') {
            setHandTrackingEnabled(true);
          } else {
            setHandTrackingEnabled(false);
          }
          pushToast({ title: 'Input Mode Changed', description: `Now using ${getInputModeLabel(newMode)}.`, tone: 'info' });
        }}
        onClose={() => setShowInputSelector(false)}
      />

      <PartyModal
        isOpen={showPartyModal}
        token={user?.token}
        currentParty={currentParty}
        onClose={() => setShowPartyModal(false)}
        onPartyJoined={handlePartyJoined}
        onPartyLeft={handleLeaveParty}
      />

      {saveDialogOpen && (
        <SaveSessionDialog
          key={`${mode}-${activeSessionId || 'new'}`}
          isOpen={saveDialogOpen}
          initialValue={sessions.find((item) => item.id === activeSessionId)?.name || `${modeConfig.label} Session`}
          modeLabel={modeConfig.shortLabel}
          isSaving={isSaving}
          canOverwrite={Boolean(activeSessionId)}
          onCancel={() => setSaveDialogOpen(false)}
          onConfirm={handleSaveConfirm}
        />
      )}

      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        canvasRef={canvasRef}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        tone={confirmState?.tone}
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default WorkspaceView;
