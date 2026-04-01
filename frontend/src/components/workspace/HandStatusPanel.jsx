import React from 'react';
import { Camera, Hand, Lightbulb } from 'lucide-react';

function HandStatusPanel({ enabled, connected, handState }) {
  const cameraColor = connected ? 'text-emerald-400' : enabled ? 'text-amber-400' : 'text-slate-500';

  const getGestureInfo = () => {
    if (!enabled) return { color: 'text-slate-500', text: 'Off' };
    if (!handState.isVisible) return { color: 'text-amber-400', text: 'No hand' };
    if (handState.isDrawing) return { color: 'text-cyan-400', text: 'Drawing' };
    if (handState.fingersCount > 1) return { color: 'text-amber-400', text: `${handState.fingersCount} fingers` };
    return { color: 'text-emerald-400', text: 'Ready' };
  };

  const gesture = getGestureInfo();

  return (
    <div className="mb-3 flex items-center justify-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <Camera size={14} className={cameraColor} />
        <span className={cameraColor}>{connected ? 'Live' : 'Off'}</span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex items-center gap-1.5">
        <Hand size={14} className={gesture.color} />
        <span className={gesture.color}>{gesture.text}</span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex items-center gap-1.5">
        <Lightbulb size={14} className={handState.isVisible ? 'text-cyan-300' : 'text-slate-500'} />
        <span className={handState.isVisible ? 'text-cyan-300' : 'text-slate-500'}>
          {handState.fingersCount === 1 ? '1 finger' : handState.fingersCount > 1 ? `${handState.fingersCount} fingers` : 'Show hand'}
        </span>
      </div>
    </div>
  );
}

export default HandStatusPanel;
