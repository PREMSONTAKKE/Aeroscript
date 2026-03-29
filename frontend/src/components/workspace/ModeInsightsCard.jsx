import React from 'react';
import { Sparkles } from 'lucide-react';

function ModeInsightsCard({ modeConfig, isDirty }) {
  return (
    <div className="mb-4 rounded-2xl border border-white/8 bg-white/5 p-4">
      <p className="text-sm text-slate-200">{modeConfig.description}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <Sparkles size={14} />
        {isDirty ? 'Unsaved changes in current canvas' : 'Canvas is synced with the last load/save state'}
      </div>
      <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/35 p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{modeConfig.guideTitle}</p>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          {modeConfig.guidePoints.map((point) => (
            <p key={point}>{point}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModeInsightsCard;
