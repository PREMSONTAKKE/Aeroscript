import React from 'react';
import { Camera, CircleDot, Hand, ScanSearch } from 'lucide-react';

function HandStatusPanel({ enabled, connected, handState, inputMode = 'mouse' }) {
  const inputLabel = inputMode === 'camera'
    ? 'Camera'
    : inputMode === 'touch'
      ? 'Touch Screen'
      : inputMode === 'screen'
        ? 'Screen Canvas'
        : 'Mouse / Touchpad';

  const statusLabel = !enabled
    ? 'Hand tracking is off.'
    : connected
      ? handState.isVisible
        ? handState.isDrawing
          ? 'Index-only gesture is drawing.'
          : 'Hand detected. Raise only index finger to draw.'
        : 'Camera input is ready. Show your hand to begin.'
      : 'Hand input is unavailable right now.';

  const gestureHint = handState.isVisible
    ? `Visible fingers: ${handState.fingersCount}. Index only draws, multiple fingers pause input.`
    : 'Keep your hand centered and well lit for steadier tracking.';

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
          <Camera size={14} /> Camera Link
        </div>
        <div className="mt-3 text-sm text-white">{connected ? 'Connected' : 'Offline'}</div>
        <div className="mt-1 text-xs text-slate-400">{enabled ? 'Waiting for live camera input.' : `Primary input: ${inputLabel}.`}</div>
      </div>
      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
          <Hand size={14} /> Gesture State
        </div>
        <div className="mt-3 text-sm text-white">{statusLabel}</div>
        <div className="mt-1 text-xs text-slate-400">{gestureHint}</div>
      </div>
      <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
          <ScanSearch size={14} /> Tracking Tips
        </div>
        <div className="mt-3 flex items-start gap-2 text-sm text-white">
          <CircleDot size={14} className="mt-0.5 shrink-0 text-cyan-300" />
          <span>Hold a peace sign or lower fingers to stop drawing before switching tools or modes.</span>
        </div>
      </div>
    </div>
  );
}

export default HandStatusPanel;
