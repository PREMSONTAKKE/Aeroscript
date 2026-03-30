import React from 'react';
import { Camera, Hand, Lightbulb } from 'lucide-react';

function HandStatusPanel({ enabled, connected, handState }) {
  const cameraColor = connected ? 'text-emerald-400' : enabled ? 'text-amber-400' : 'text-slate-500';
  const gestureColor = !enabled ? 'text-slate-500' : handState.isVisible ? handState.isDrawing ? 'text-cyan-400' : 'text-emerald-400' : 'text-amber-400';
  const tipColor = handState.isVisible && handState.fingersCount > 1 ? 'text-amber-400' : 'text-cyan-300';

  return (
    <div className="mb-3 flex items-center justify-center gap-4 text-xs">
      <div className="flex items-center gap-1.5" title={enabled ? 'Camera connected' : 'Camera offline'}>
        <Camera size={14} className={cameraColor} />
        <span className={cameraColor}>{connected ? 'Live' : 'Off'}</span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex items-center gap-1.5" title={!enabled ? 'Hand tracking off' : handState.isVisible ? handState.isDrawing ? 'Drawing with index' : 'Index finger ready' : 'Show hand to camera'}>
        <Hand size={14} className={gestureColor} />
        <span className={gestureColor}>
          {!enabled ? 'Off' : handState.isVisible ? handState.isDrawing ? 'Drawing' : 'Ready' : 'No hand'}
        </span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex items-center gap-1.5" title="Keep hand steady for best tracking">
        <Lightbulb size={14} className={tipColor} />
        <span className={tipColor}>
          {handState.isVisible && handState.fingersCount > 1 ? 'Fingers!' : 'Steady'}
        </span>
      </div>
    </div>
  );
}

export default HandStatusPanel;
