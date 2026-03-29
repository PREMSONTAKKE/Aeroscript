import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function ModalShell({ isOpen, title, description, children, onClose }) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#09111a]/95 p-6 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">AeroScript</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
              {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default ModalShell;
