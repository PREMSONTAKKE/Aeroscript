import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen, RefreshCw, Trash2 } from 'lucide-react';
import ModeInsightsCard from './ModeInsightsCard';

function SessionHistoryPanel({
  modeConfig,
  sessions,
  activeSessionId,
  isLoading,
  isDirty,
  onRefresh,
  onLoad,
  onDelete
}) {
  return (
    <aside className="glass-panel flex min-h-0 flex-col rounded-[28px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">History</p>
          <h2 className="text-lg font-semibold text-white">Saved Sessions</h2>
        </div>
        <button onClick={onRefresh} className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <ModeInsightsCard modeConfig={modeConfig} isDirty={isDirty} />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <AnimatePresence>
          {sessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={`rounded-2xl border p-3 transition ${
                  active
                    ? 'border-cyan-400/35 bg-cyan-400/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <button onClick={() => onLoad(session)} className="w-full text-left">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                      {session.thumbnail ? (
                        <img src={session.thumbnail} alt={session.name} className="h-full w-full object-cover" />
                      ) : (
                        <FolderOpen size={18} className="text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-white">{session.name}</div>
                      <div className="mt-1 text-xs text-slate-400">{new Date(session.createdAt).toLocaleString()}</div>
                      <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">{session.mode}</div>
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => onDelete(session.id)}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-red-500/10 hover:text-red-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!sessions.length && !isLoading && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            No saved sessions yet for this mode.
          </div>
        )}
      </div>
    </aside>
  );
}

export default SessionHistoryPanel;
