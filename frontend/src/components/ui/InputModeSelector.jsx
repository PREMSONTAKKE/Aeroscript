import React from 'react';
import { Camera, MonitorSmartphone, Mouse, Touchpad } from 'lucide-react';
import ModalShell from '../workspace/ModalShell';

function InputModeSelector({ isOpen, currentMode, onSelect, onClose }) {
  const modes = [
    {
      id: 'camera',
      label: 'Hand Tracking',
      description: 'Use camera to detect hand gestures',
      icon: Camera,
      color: 'from-purple-500 to-pink-500'
    },
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
    },
    {
      id: 'screen',
      label: 'Screen Canvas',
      description: 'Use the display as your drawing surface without camera tracking',
      icon: MonitorSmartphone,
      color: 'from-orange-500 to-amber-500'
    }
  ];

  return (
    <ModalShell
      isOpen={isOpen}
      title="Select Input Mode"
      description="Choose how you want to interact with the canvas. You can change this anytime using the input selector in the toolbar."
      onClose={onClose}
      size="lg"
      zIndex="z-[200]"
    >
      <div className="grid gap-3 -mt-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
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
                <div className="h-2 w-2 rounded-full bg-slate-950" />
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
