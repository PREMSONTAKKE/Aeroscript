import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl'
};

function ModalShell({ 
  isOpen, 
  title, 
  description, 
  children, 
  onClose,
  size = 'md',
  zIndex = 'z-[120]',
  showHeader = true,
  headerPrefix = 'AeroScript',
  className = ''
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm ${zIndex}`}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`w-full ${SIZES[size] || SIZES.md} rounded-[28px] border border-white/10 bg-[#09111a]/95 p-6 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${className}`}
            onClick={(event) => event.stopPropagation()}
          >
            {showHeader && (
              <div className="mb-5">
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">{headerPrefix}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
                {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default ModalShell;
