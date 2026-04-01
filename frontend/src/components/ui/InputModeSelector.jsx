import React, { useState } from 'react';
import { Camera, Mouse, Touchpad, Check, AlertTriangle } from 'lucide-react';
import ModalShell from '../workspace/ModalShell';

function InputModeSelector({ isOpen, currentMode, onSelect, onClose }) {
  const [permissionError, setPermissionError] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

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
    },
    {
      id: 'camera',
      label: 'Hand Tracking',
      description: 'Use camera to detect hand gestures',
      icon: Camera,
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const requestCameraPermission = async () => {
    setIsRequesting(true);
    setPermissionError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      onSelect('camera');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissionError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No camera found on this device.');
      } else {
        setPermissionError('Could not access camera: ' + err.message);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSelect = (modeId) => {
    if (modeId === 'camera') {
      requestCameraPermission();
    } else {
      setPermissionError('');
      onSelect(modeId);
    }
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
      {permissionError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{permissionError}</p>
        </div>
      )}

      <div className="grid gap-3 -mt-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleSelect(mode.id)}
            disabled={isRequesting && mode.id === 'camera'}
            className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
              currentMode === mode.id
                ? 'border-cyan-400/40 bg-cyan-400/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            } ${isRequesting && mode.id === 'camera' ? 'opacity-50 cursor-wait' : ''}`}
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
