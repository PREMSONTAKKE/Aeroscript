import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div;

const PredictionOverlay = ({ predictions, isRecognizing, error }) => (
  <AnimatePresence>
    {(isRecognizing || error || predictions.length > 0) && (
      <MotionDiv
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="absolute bottom-6 left-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2"
      >
        <div className="rounded-2xl border border-white/10 bg-black/65 p-4 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Recognition</p>
              <p className="text-sm text-white">Handwriting assistant</p>
            </div>
            {isRecognizing && (
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                Analyzing
              </div>
            )}
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : predictions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {predictions.map((prediction, index) => (
                <div
                  key={`${prediction.character}-${index}`}
                  className={`rounded-xl border px-3 py-3 text-center ${
                    index === 0
                      ? 'border-cyan-400/40 bg-cyan-400/10 text-white'
                      : 'border-white/8 bg-white/5 text-slate-200'
                  }`}
                >
                  <div className="text-2xl font-semibold">{prediction.character}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {Math.round(prediction.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Draw a letter or short word and pause to request a prediction.</p>
          )}
        </div>
      </MotionDiv>
    )}
  </AnimatePresence>
);

export default PredictionOverlay;
