import React from 'react';

function ModeSidebar({ mode, modeOptions, onSelect }) {
  return (
    <aside className="glass-panel hidden rounded-[28px] p-5 xl:block">
      <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-slate-500">Modes</p>
      <div className="space-y-3">
        {modeOptions.map(([key, config]) => {
          const Icon = config.icon;
          const active = key === mode;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? 'border-cyan-400/35 bg-cyan-400/12 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="mt-0.5 rounded-xl bg-white/5 p-2"><Icon size={18} /></div>
              <div>
                <div className="font-medium">{config.label}</div>
                <div className="mt-1 text-xs text-slate-400">{config.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default ModeSidebar;
