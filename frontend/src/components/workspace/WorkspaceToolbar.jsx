import React from 'react';
import { Sparkles, Droplet, PenTool, Zap } from 'lucide-react';

function WorkspaceToolbar({
  modeConfig,
  inkType,
  setInkType,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
}) {
  const inkIcons = {
    Graphite: <Droplet size={14} />,
    Ink: <PenTool size={14} />,
    Marker: <Zap size={14} />,
  };

  return (
    <div className="mb-2 flex w-full items-center justify-between gap-3 rounded-none border border-slate-200/50 bg-slate-50/80 px-4 py-2 dark:border-white/10 dark:bg-white/5">
      {/* Left: Color Palette - 15 colors */}
      <div className="flex flex-1 items-center justify-center gap-1.5">
        {modeConfig.colors.length ? (
          modeConfig.colors.slice(0, 15).map((color) => (
            <button
              key={color}
              onClick={() => setBrushColor(color)}
              className={`h-6 w-6 rounded-md border-2 transition-all hover:scale-110 ${
                brushColor === color 
                  ? 'border-slate-800 shadow-lg scale-110 dark:border-white dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                  : 'border-slate-300 hover:border-slate-500 dark:border-white/10 dark:hover:border-white/30'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))
        ) : (
          <input
            type="color"
            value={brushColor}
            onChange={(event) => setBrushColor(event.target.value)}
            className="h-6 w-9 cursor-pointer rounded-md border border-slate-300 bg-transparent dark:border-white/10"
          />
        )}
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />

      {/* Center: Ink Types - all in a single row */}
      <div className="flex flex-1 items-center justify-center gap-1">
        {modeConfig.inks.map((ink) => (
          <button
            key={ink}
            onClick={() => setInkType(ink)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              inkType === ink
                ? 'bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-400/20 dark:text-cyan-300 dark:border-cyan-400/30'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-300'
            }`}
          >
            {inkIcons[ink] || <Sparkles size={14} />}
            <span className="hidden sm:inline">{ink}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />

      {/* Right: Brush Size + Smooth + Pressure in a row */}
      <div className="flex flex-1 items-center justify-center gap-4">
        {/* Width */}
        <div className="flex items-center gap-2">
          <div 
            className="rounded-full bg-slate-600 dark:bg-slate-300"
            style={{ width: Math.min(brushWidth, 12), height: Math.min(brushWidth, 12) }}
          />
          <input
            type="range"
            min={modeConfig.widthRange[0]}
            max={modeConfig.widthRange[1]}
            step="0.5"
            value={brushWidth}
            onChange={(event) => setBrushWidth(Number(event.target.value))}
            className="w-20 accent-cyan-500 dark:accent-cyan-400"
          />
          <span className="w-8 text-center rounded-md bg-cyan-100 px-1 py-0.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300">
            {brushWidth.toFixed(0)}
          </span>
        </div>

        {/* Smooth */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-400 w-10 dark:text-slate-500">Smooth</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            defaultValue="0.5" 
            className="w-14 accent-slate-500 dark:accent-slate-400" 
          />
        </div>

        {/* Pressure */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-400 w-10 dark:text-slate-500">Pressure</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            defaultValue="0" 
            className="w-14 accent-slate-500 dark:accent-slate-400" 
          />
        </div>
      </div>
    </div>
  );
}

export default WorkspaceToolbar;
