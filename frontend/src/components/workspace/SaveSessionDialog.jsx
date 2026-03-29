import React, { useState } from 'react';
import ModalShell from './ModalShell';

function SaveSessionDialog({
  isOpen,
  initialValue,
  modeLabel,
  isSaving,
  canOverwrite,
  onCancel,
  onConfirm
}) {
  const [title, setTitle] = useState(initialValue || '');
  const [saveMode, setSaveMode] = useState(canOverwrite ? 'overwrite' : 'new');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    onConfirm({ title: trimmed, saveMode });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      title="Save Session"
      description={`Store the current ${modeLabel.toLowerCase()} canvas with a name you can recognize later.`}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {canOverwrite && (
          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Save Mode
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5">
              <button
                type="button"
                onClick={() => setSaveMode('overwrite')}
                className={`rounded-xl px-4 py-2.5 text-sm transition ${
                  saveMode === 'overwrite' ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/8'
                }`}
              >
                Overwrite
              </button>
              <button
                type="button"
                onClick={() => setSaveMode('new')}
                className={`rounded-xl px-4 py-2.5 text-sm transition ${
                  saveMode === 'new' ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/8'
                }`}
              >
                Save as New
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-slate-500">
            Session Title
          </label>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={`${modeLabel} Session`}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/8"
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : 'Save Session'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default SaveSessionDialog;
