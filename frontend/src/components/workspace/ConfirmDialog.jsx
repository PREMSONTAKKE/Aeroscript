import React from 'react';
import ModalShell from './ModalShell';

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel
}) {
  const confirmClass = tone === 'danger'
    ? 'bg-red-500 text-white hover:bg-red-400'
    : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300';

  return (
    <ModalShell isOpen={isOpen} title={title} description={description} onClose={onCancel}>
      <div className="flex items-center justify-end gap-3">
        {cancelLabel && (
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
          >
            {cancelLabel}
          </button>
        )}
        <button
          onClick={onConfirm}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

export default ConfirmDialog;
