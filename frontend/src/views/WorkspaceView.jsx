import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LogOut, Moon, Sun, User, Palette } from 'lucide-react';
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
import BottomControlBar from '../components/workspace/BottomControlBar';
import ToastViewport from '../components/ui/ToastViewport';
import InputModeSelector from '../components/ui/InputModeSelector';
import PartyModal from '../components/party/PartyModal';
import PartyButton from '../components/party/PartyButton';
import BrushPresetPanel from '../components/workspace/BrushPresetPanel';
import ProfilePanel from '../components/workspace/ProfilePanel';
import ShareDialog from '../components/workspace/ShareDialog';
import { useAuth } from '../context/AuthContext';
import { getModeConfig, MODE_CONFIGS } from '../config/modes';
import useHandTracking from '../hooks/useHandTracking';
import useToast from '../hooks/useToast';
import { useDrawingAnalytics } from '../hooks/useDrawingAnalytics';
import { useParty } from '../hooks/useParty';
import { deleteSession, fetchHistory, predictCharacters, saveSession, updateSession } from '../services/api';
import { profileApi } from '../services/presetsApi';

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
  const [modesSidebarVisible, setModesSidebarVisible] = useState(false);
  const [historySidebarVisible, setHistorySidebarVisible] = useState(false);
  const [showTopControls, setShowTopControls] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const { toasts, pushToast, dismissToast } = useToast();
  const { isConnected: handTrackingConnected, handState } = useHandTracking(handTrackingEnabled);
  const { trackStroke, trackSessionEnd } = useDrawingAnalytics(user?.userId);

  const {
    currentParty,
    remoteCursors,
    connect: partyConnect,
    leaveParty,
    draw: partyDraw,
    streamDraw: partyStreamDraw,
    syncCanvas,
    clearCanvas: partyClearCanvas,
    cursorMove: partyCursorMove,
    updatePresence: partyUpdatePresence,
    setPartyState
  } = useParty(canvasRef, pushToast);

  const [showBrushPresetPanel, setShowBrushPresetPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const modeConfig = getModeConfig(mode);
  const modeOptions = useMemo(() => Object.entries(MODE_CONFIGS), []);
  const getInputModeLabel = (value) => {
    switch (value) {
      case 'camera':
        return 'hand tracking';
      case 'touch':
        return 'touch screen';
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
    const loadPreferences = async () => {
      const savedTheme = window.localStorage.getItem('aeroscript_theme');
      const savedHandTracking = window.localStorage.getItem('aeroscript_hand_tracking');

      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }

      if (savedHandTracking === 'true' || savedHandTracking === 'false') {
        setHandTrackingEnabled(savedHandTracking === 'true');
      }

      if (user?.token) {
        try {
          const profileRes = await profileApi.get(user.token);
          const dbTheme = profileRes.profile?.preferences?.theme;
          if (dbTheme === 'light' || dbTheme === 'dark') {
            setTheme(dbTheme);
            window.localStorage.setItem('aeroscript_theme', dbTheme);
          }
        } catch (err) {
          console.error('Failed to load preferences:', err);
        }
      }
    };

    loadPreferences();
  }, [user?.token]);

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
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (e.key === 'Escape') {
        setModesSidebarVisible(false);
        setHistorySidebarVisible(false);
        setShowSidebarMenu(false);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          setModesSidebarVisible((prev) => !prev);
        }
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          setHistorySidebarVisible((prev) => !prev);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!showSidebarMenu) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('.sidebar-menu')) {
        setShowSidebarMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSidebarMenu]);

  useEffect(() => {
    if (user?.token) {
      partyConnect(user.token);
    }
  }, [user?.token, partyConnect]);

  useEffect(() => {
    if (currentParty) {
      partyUpdatePresence(inputMode);
    }
  }, [currentParty, inputMode, partyUpdatePresence]);

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
    trackSessionEnd();
  }, [trackSessionEnd]);

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
      partyClearCanvas();
    }
    canvasRef.current?.clear();
    setPartyState((prev) => prev ? {
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
      syncCanvas(session.strokes || session.drawingData || [], {
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

    if (committedStroke) {
      trackStroke({
        inkType,
        brushColor,
        brushWidth,
        pointCount: committedStroke.points?.length || 0,
        bounds: committedStroke.bounds
      });
    }

    if (!currentParty || !committedStroke) {
      return;
    }

    const lastPoint = committedStroke.points[committedStroke.points.length - 1];
    partyDraw([committedStroke], true, lastPoint?.x, lastPoint?.y, getPartySettings(), inputMode);
    setPartyState((prev) => prev ? {
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

  const handleStrokeUpdate = useCallback((strokeId, points, style, isDrawing) => {
    if (!currentParty) return;
    partyStreamDraw(strokeId, points, {
      color: style?.brushColor || brushColor,
      width: style?.brushWidth || brushWidth,
      ink: style?.inkType || inkType,
      mode
    }, isDrawing);
  }, [currentParty, partyStreamDraw, brushColor, brushWidth, inkType, mode]);

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

    if (currentParty && !MODE_CONFIGS[nextMode]?.supportsParty) {
      leaveParty();
    }
    if (showBrushPresetPanel && !MODE_CONFIGS[nextMode]?.supportsParty) {
      setShowBrushPresetPanel(false);
    }
    navigate(`/workspace/${nextMode}`);
  };

  const handlePartyJoined = (party) => {
    setPartyState((prev) => ({ ...(prev || {}), ...party }));
    setCurrentParty({
      code: party.code,
      name: party.name,
      host: party.host,
      members: party.members || [],
      maxMembers: party.maxMembers,
      isActive: party.isActive,
      board: null
    });
    setShowPartyModal(false);
    const snapshot = canvasRef.current?.getSnapshot();
    if (party.members?.length === 1 && snapshot?.hasContent) {
      syncCanvas(snapshot.drawingData, getPartySettings(), inputMode);
    }
    pushToast({ title: 'Party Joined', description: `Welcome to ${party.name}!`, tone: 'success' });
  };

  const handleLeaveParty = () => {
    leaveParty();
    pushToast({ title: 'Party Left', description: 'You have left the party.', tone: 'info' });
  };

  return (
    <div 
      className="min-h-screen overflow-visible rounded-none m-0 p-0 w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_35%),linear-gradient(180deg,#081018_0%,#04070c_100%)] text-slate-100"
      tabIndex={-1}
      onKeyDown={(e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        if (e.key === 'Escape') {
          setModesSidebarVisible(false);
          setHistorySidebarVisible(false);
          setShowSidebarMenu(false);
        }
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            setModesSidebarVisible((prev) => !prev);
          }
          if (e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            setHistorySidebarVisible((prev) => !prev);
          }
        }
      }}
    >
      <div className={`pointer-events-none absolute inset-0 rounded-none bg-gradient-to-br ${modeConfig.accent}`} />

      <header className="relative z-50 w-full flex items-center justify-between border-b border-white/8 border-t border-t-white/8 px-6 py-4 backdrop-blur-xl overflow-visible shadow-lg m-0 rounded-none">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="group rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-all hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(0,230,255,0.15)]"
            data-tooltip="Back to home"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/10 p-2">
              {React.createElement(modeConfig.icon, { size: 20, className: 'text-cyan-400' })}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{modeConfig.label}</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {modeConfig.supportsParty && (
            <>
              <PartyButton
                onClick={() => setShowPartyModal(true)}
                isActive={!!currentParty}
                memberCount={currentParty?.members?.length || 0}
              />
              <div className="mx-1 h-6 w-px bg-white/10" />
            </>
            )}
          
          <div className="relative sidebar-menu">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSidebarMenu((prev) => !prev);
              }}
              className="group rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-all hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
              data-tooltip="Toggle panels (Ctrl+M/H/A)"
            >
              <span className="text-base transition-transform group-hover:scale-110">
                {(modesSidebarVisible && historySidebarVisible && showTopControls) ? '📊' : 
                 modesSidebarVisible ? '📋' : historySidebarVisible ? '📜' : showTopControls ? '🎛️' : '📭'}
              </span>
            </button>
            
            {showSidebarMenu && (
              <div className="absolute right-0 top-full z-[9999] mt-2 w-48 rounded-xl border border-white/10 bg-[#09111a]/95 p-2 shadow-xl backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModesSidebarVisible((prev) => !prev);
                    setShowSidebarMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    modesSidebarVisible ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>📋</span> Modes
                  </span>
                  <span className="text-xs opacity-60">{modesSidebarVisible ? 'On' : 'Off'}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistorySidebarVisible((prev) => !prev);
                    setShowSidebarMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    historySidebarVisible ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>📜</span> History
                  </span>
                  <span className="text-xs opacity-60">{historySidebarVisible ? 'On' : 'Off'}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopControls((prev) => !prev);
                    setShowSidebarMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    showTopControls ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🎛️</span> Top Controls
                  </span>
                  <span className="text-xs opacity-60">{showTopControls ? 'On' : 'Off'}</span>
                </button>
              </div>
            )}
          </div>
          
          {modeConfig.supportsParty && (
            <button
              onClick={() => setShowBrushPresetPanel(true)}
              className="group rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-all hover:border-purple-400/30 hover:bg-purple-400/10 hover:text-purple-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              data-tooltip="Brush presets"
            >
              <Palette size={18} className="transition-transform group-hover:scale-110" />
            </button>
          )}
          
          <button
            onClick={() => setShowProfilePanel(true)}
            className="group rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-all hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300"
            data-tooltip="Profile & analytics"
          >
            <User size={18} className="transition-transform group-hover:scale-110" />
          </button>
          
          <button
            onClick={async () => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(newTheme);
              if (user?.token) {
                try {
                  await profileApi.updatePreferences(user.token, { theme: newTheme });
                } catch (err) {
                  console.error('Failed to save theme preference:', err);
                }
              }
            }}
            className="group rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-all hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300"
            data-tooltip={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="transition-transform group-hover:scale-110" />
            ) : (
              <Moon size={18} className="transition-transform group-hover:scale-110" />
            )}
          </button>
          
          <div className="mx-1 h-6 w-px bg-white/10" />
          
          <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right lg:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Logged in as</p>
            <p className="text-sm font-medium text-slate-200">{user?.email}</p>
          </div>
          
          <button
            onClick={logout}
            className="group rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            data-tooltip="Sign out"
          >
            <LogOut size={18} className="transition-transform group-hover:scale-110" />
          </button>
        </div>
      </header>

      <div className={`relative z-10 grid h-[calc(100vh-81px-60px)] gap-0 ${
        modesSidebarVisible && historySidebarVisible 
          ? 'grid-cols-[280px_minmax(0,1fr)_320px]'
          : modesSidebarVisible 
            ? 'grid-cols-[280px_minmax(0,1fr)]'
            : historySidebarVisible 
              ? 'grid-cols-[minmax(0,1fr)_320px]'
              : 'grid-cols-1'
      }`}>
        {modesSidebarVisible && (
          <div className="shadow-[4px_0_20px_rgba(0,0,0,0.5)]">
            <ModeSidebar mode={mode} modeOptions={modeOptions} onSelect={handleModeNavigation} />
          </div>
        )}

        <main className={`glass-panel flex min-h-0 flex-col ${
          !modesSidebarVisible && !historySidebarVisible ? 'col-span-1' : ''
        }`}>
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

          {showTopControls && (
            <WorkspaceToolbar
              modeConfig={modeConfig}
              inkType={inkType}
              setInkType={setInkType}
              brushColor={brushColor}
              setBrushColor={setBrushColor}
              brushWidth={brushWidth}
              setBrushWidth={setBrushWidth}
            />
          )}

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
              onStrokeUpdate={handleStrokeUpdate}
              onPointerActivity={(point, isDrawing) => {
                if (currentParty && point) {
                  partyCursorMove(point.x, point.y, isDrawing);
                }
              }}
              handTrackingEnabled={handTrackingEnabled}
              handState={handState}
              inputMode={inputMode}
              isPartyHost={currentParty?.host === user?.userId}
              onClearCanvas={() => {
                if (currentParty) {
                  partyClearCanvas();
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

        {historySidebarVisible && (
          <div className="shadow-[-4px_0_20px_rgba(0,0,0,0.5)]">
            <SessionHistoryPanel
              sessions={sessions}
              activeSessionId={activeSessionId}
              isLoading={isLoading}
              onRefresh={refreshHistory}
              onLoad={handleSessionLoad}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      <BottomControlBar
        onCameraClick={() => setShowInputSelector(true)}
        onHandClick={() => {
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
        onExport={() => setExportDialogOpen(true)}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onErase={handleNewCanvas}
        onSave={handleSave}
        handTrackingEnabled={handTrackingEnabled}
        handTrackingConnected={handTrackingConnected}
      />

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

      {showBrushPresetPanel && (
        <BrushPresetPanel
          isOpen={showBrushPresetPanel}
          onClose={() => setShowBrushPresetPanel(false)}
          currentSettings={{
            inkType,
            brushColor,
            brushWidth
          }}
          onApplyPreset={(settings) => {
            if (settings.inkType) setInkType(settings.inkType);
            if (settings.brushColor) setBrushColor(settings.brushColor);
            if (settings.brushWidth) setBrushWidth(settings.brushWidth);
            setShowBrushPresetPanel(false);
            pushToast({ title: 'Preset Applied', description: 'Your brush settings have been updated.', tone: 'success' });
          }}
          onShare={() => {
            setShowBrushPresetPanel(false);
            setShowShareDialog(true);
          }}
        />
      )}

      {showProfilePanel && (
        <ProfilePanel
          isOpen={showProfilePanel}
          onClose={() => setShowProfilePanel(false)}
          userId={user?.userId}
          pushToast={pushToast}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          currentParty={currentParty}
        />
      )}

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        canvasRef={canvasRef}
        sessionName={sessions.find((s) => s.id === activeSessionId)?.name || `${modeConfig.label} Session`}
        mode={mode}
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
