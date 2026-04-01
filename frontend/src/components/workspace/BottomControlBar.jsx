import React from 'react';
import { Camera, Hand, Download, Eraser, Undo2, Redo2, Save } from 'lucide-react';

function BottomControlBar({
  onCameraClick,
  onHandClick,
  onExport,
  onUndo,
  onRedo,
  onErase,
  onSave,
  handTrackingEnabled,
  handTrackingConnected,
  inputMode,
}) {
  const statusColor = handTrackingConnected ? 'text-emerald-500' : handTrackingEnabled ? 'text-amber-500' : 'text-slate-400';
  const statusText = handTrackingConnected ? 'Live' : handTrackingEnabled ? 'Connecting...' : 'Off';

  return (
    <div className="bottom-control-bar" aria-label="Bottom controls">
      {/* Left: Camera + Hand */}
      <div className="flex items-center gap-2">
        <button
          className={`bc-btn ${inputMode === 'camera' ? 'active' : ''}`}
          title="Camera Input"
          onClick={onCameraClick}
        >
          <Camera size={18} />
        </button>
        <button
          className={`bc-btn ${handTrackingEnabled ? 'active' : ''}`}
          title="Hand Tracking"
          onClick={onHandClick}
        >
          <Hand size={18} />
        </button>
        <span className={`bc-status ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {/* Center Divider */}
      <div className="h-8 w-px bg-slate-200 dark:bg-white/15" />

      {/* Center: Actions */}
      <div className="flex items-center gap-1">
        <button className="bc-btn" title="Undo (Ctrl+Z)" onClick={onUndo}>
          <Undo2 size={18} />
        </button>
        <button className="bc-btn" title="Redo (Ctrl+Shift+Z)" onClick={onRedo}>
          <Redo2 size={18} />
        </button>
        <button className="bc-btn bc-btn-danger" title="Clear Canvas" onClick={onErase}>
          <Eraser size={18} />
        </button>
        <button className="bc-btn" title="Export as PNG" onClick={onExport}>
          <Download size={18} />
        </button>
      </div>

      {/* Right: Save */}
      <button className="bc-btn-primary" title="Save Session" onClick={onSave}>
        <Save size={18} />
        <span>Save</span>
      </button>
    </div>
  );
}

export default BottomControlBar;
