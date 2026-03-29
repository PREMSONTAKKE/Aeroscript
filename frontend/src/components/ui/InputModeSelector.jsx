import React from 'react';
import { Camera, MonitorSmartphone, Mouse, Touchpad, X } from 'lucide-react';

function InputModeSelector({ isOpen, currentMode, onSelect, onClose }) {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#09111a] p-6 text-slate-100 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">AeroScript</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Select Input Mode</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <p className="mb-6 text-sm text-slate-400">
          Choose how you want to interact with the canvas. You can change this anytime using the input selector in the toolbar.
        </p>

        <div className="grid gap-3">
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
      </div>
    </div>
  );
}

export default InputModeSelector;
