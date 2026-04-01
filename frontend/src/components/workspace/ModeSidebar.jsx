import React, { useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

const modeAccents = {
  signature: {
    gradient: 'from-sky-400/20 to-blue-500/10',
    border: 'hover:border-sky-400/40',
    glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]',
    icon: 'text-sky-400',
    active: 'bg-sky-400/12 border-sky-400/40 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
  },
  draw: {
    gradient: 'from-orange-400/20 to-amber-500/10',
    border: 'hover:border-orange-400/40',
    glow: 'hover:shadow-[0_0_20px_rgba(251,146,60,0.15)]',
    icon: 'text-orange-400',
    active: 'bg-orange-400/12 border-orange-400/40 text-white shadow-[0_0_15px_rgba(251,146,60,0.2)]'
  },
  write: {
    gradient: 'from-emerald-400/20 to-teal-500/10',
    border: 'hover:border-emerald-400/40',
    glow: 'hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]',
    icon: 'text-emerald-400',
    active: 'bg-emerald-400/12 border-emerald-400/40 text-white shadow-[0_0_15px_rgba(52,211,153,0.2)]'
  }
};

function ModeSidebar({ mode, modeOptions, onSelect }) {
  const [expandedMode, setExpandedMode] = useState(null);

  return (
    <aside className="glass-panel hidden rounded-none p-5 xl:block">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-cyan-400" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Workspace Modes</p>
      </div>
      
      <div className="space-y-3">
        {modeOptions.map(([key, config]) => {
          const Icon = config.icon;
          const active = key === mode;
          const accents = modeAccents[key] || modeAccents.draw;
          const isExpanded = expandedMode === key;

          return (
            <div key={key} className="relative">
              <button
                onClick={() => {
                  onSelect(key);
                  setExpandedMode(isExpanded ? null : key);
                }}
                className={`group relative flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-300 ${
                  active
                    ? accents.active
                    : `border-white/10 bg-white/[0.02] text-slate-300 ${accents.border} ${accents.glow}`
                }`}
              >
                {/* Active Indicator */}
                <div 
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${accents.gradient} opacity-0 transition-opacity duration-300 ${
                    active ? 'opacity-100' : 'group-hover:opacity-50'
                  }`}
                />
                
                {/* Icon Container */}
                <div className={`relative z-10 rounded-xl bg-white/5 p-2.5 transition-transform duration-200 ${
                  active ? '' : 'group-hover:scale-110'
                }`}>
                  <Icon size={20} className={active ? accents.icon : 'text-slate-400 group-hover:text-white'} />
                </div>
                
                {/* Content */}
                <div className="relative z-10 flex-1">
                  <div className="flex items-center justify-between">
                    <div className={`font-semibold transition-colors ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {config.label}
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                  
                  {/* Expandable Description - Progressive Disclosure */}
                  <div className={`overflow-hidden transition-all duration-300 ${
                    isExpanded || active ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'
                  }`}>
                    {/* Quick Stats */}
                    {active && (
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                          {config.inks.length} inks
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                          {config.colors.length || '∞'} colors
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                          {config.widthRange[0]}-{config.widthRange[1]}px
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
              
              {/* Keyboard Shortcut Hint */}
              <div className={`absolute bottom-3 right-3 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[9px] font-medium text-cyan-400 transition-opacity duration-200 ${
                active ? 'opacity-100' : 'opacity-0'
              }`}>
                Active
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Tips Section */}
      <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-600">Quick Tips</p>
        <ul className="space-y-2 text-xs text-slate-500">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-cyan-400" />
            Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to toggle sidebar
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-cyan-400" />
            Use <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+S</kbd> to save quickly
          </li>
        </ul>
      </div>
    </aside>
  );
}

export default ModeSidebar;
