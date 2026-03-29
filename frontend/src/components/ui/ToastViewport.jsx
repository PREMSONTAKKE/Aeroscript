import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info
};

const TONES = {
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  error: 'border-red-400/30 bg-red-400/10 text-red-100',
  info: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
};

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[140] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] || ICONS.info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 22, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 18, scale: 0.98 }}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-[0_14px_40px_rgba(0,0,0,0.3)] backdrop-blur-2xl ${TONES[toast.tone] || TONES.info}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><Icon size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{toast.title}</div>
                  {toast.description && <div className="mt-1 text-xs opacity-85">{toast.description}</div>}
                </div>
                <button
                  onClick={() => onDismiss(toast.id)}
                  className="rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default ToastViewport;
