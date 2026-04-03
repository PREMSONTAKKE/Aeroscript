import React from 'react';
import { Mouse, Touchpad, Check } from 'lucide-react';
import ModalShell from '../workspace/ModalShell';

function InputModeSelector({ isOpen, currentMode, onSelect, onClose }) {
  const modes = [
    {
      id: 'mouse',
      label: 'Mouse/Touchpad',
      description: 'Draw with mouse or laptop touchpad',
      icon: Mouse,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'touch',
      label: 'Touch Screen',
      description: 'Draw directly on touch screen',
      icon: Touchpad,
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  const handleSelect = (modeId) => {
    onSelect(modeId);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title="Select Input Mode"
      description={`Currently active: ${modes.find(m => m.id === currentMode)?.label || currentMode}`}
      onClose={onClose}
      size="lg"
      zIndex="z-[200]"
    >
      <div className="grid gap-3 -mt-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleSelect(mode.id)}
            className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
              currentMode === mode.id
                ? 'border-cyan-400/40 bg-cyan-400/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${mode.color}`}>
              <mode.icon size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-white">{mode.label}</h4>
              <p className="text-xs text-slate-400">{mode.description}</p>
            </div>
            {currentMode === mode.id && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400">
                <Check size={14} className="text-slate-950" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-slate-400">
          <strong className="text-white">Tip:</strong> Press <kbd className="rounded bg-white/10 px-2 py-0.5 text-xs">Esc</kbd> to toggle sidebar visibility while drawing.
        </p>
      </div>
    </ModalShell>
  );
}

export default InputModeSelector;
