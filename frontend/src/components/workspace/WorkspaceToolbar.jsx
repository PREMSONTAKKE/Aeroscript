import React from 'react';
import { Download, Eraser, Hand, Redo2, RefreshCw, Save, Undo2 } from 'lucide-react';

function ModeTips({ modeConfig }) {
  if (modeConfig.shortLabel === 'Signature') {
    return <p className="mt-3 text-xs text-slate-400">Preset palette keeps signatures professional and consistent.</p>;
  }

  if (modeConfig.shortLabel === 'Write') {
    return <p className="mt-3 text-xs text-slate-400">Pause after writing to trigger the recognition overlay.</p>;
  }

  return <p className="mt-3 text-xs text-slate-400">Use the color picker and wider brush range for expressive sketches.</p>;
}

function WorkspaceToolbar({
  modeConfig,
  inkType,
  setInkType,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onExport,
  isSaving,
  handTrackingEnabled,
  handTrackingConnected,
  onToggleHandTracking
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[24px] border border-white/8 bg-black/20 p-4">
      <div className="mr-2">
        <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Ink</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {modeConfig.inks.map((ink) => (
            <button
              key={ink}
              onClick={() => setInkType(ink)}
              className={`rounded-full px-4 py-2 text-xs transition ${
                inkType === ink
                  ? 'bg-white text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {ink}
            </button>
          ))}
        </div>
      </div>

      <div className="h-10 w-px bg-white/10" />

      <div>
        <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Color</p>
        <div className="mt-2 flex items-center gap-2">
          {modeConfig.colors.length ? (
            modeConfig.colors.map((color) => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  brushColor === color ? 'border-white scale-110' : 'border-white/15'
                }`}
                style={{ backgroundColor: color }}
              />
            ))
          ) : (
            <input
              type="color"
              value={brushColor}
              onChange={(event) => setBrushColor(event.target.value)}
              className="h-10 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
            />
          )}
        </div>
        <ModeTips modeConfig={modeConfig} />
      </div>

      <div className="min-w-[180px] flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">Width</p>
          <span className="text-xs text-slate-400">{brushWidth.toFixed(1)} px</span>
        </div>
        <input
          type="range"
          min={modeConfig.widthRange[0]}
          max={modeConfig.widthRange[1]}
          step="0.5"
          value={brushWidth}
          onChange={(event) => setBrushWidth(Number(event.target.value))}
          className="mt-3 w-full"
        />
      </div>

      <div className="ml-auto flex flex-wrap gap-2">
        <button
          onClick={onToggleHandTracking}
          className={`rounded-xl border p-3 transition ${
            handTrackingEnabled
              ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/18'
              : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          <span className="inline-flex items-center gap-2 text-xs">
            <Hand size={16} />
            {handTrackingConnected ? 'Hand Live' : handTrackingEnabled ? 'Connecting' : 'Hand Off'}
          </span>
        </button>
        <button onClick={onUndo} className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"><Undo2 size={16} /></button>
        <button onClick={onRedo} className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"><Redo2 size={16} /></button>
        <button onClick={onClear} className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"><Eraser size={16} /></button>
        <button
          onClick={onExport}
          className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
          title="Export drawing"
        >
          <Download size={16} />
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="inline-flex items-center gap-2">
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </span>
        </button>
      </div>
    </div>
  );
}

export default WorkspaceToolbar;
