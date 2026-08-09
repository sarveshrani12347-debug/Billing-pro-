import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Sparkles, CheckCircle2, Printer, Loader2, FileSpreadsheet } from 'lucide-react';

interface PdfProgressOverlayProps {
  isOpen: boolean;
  onComplete: () => void;
  documentTitle?: string;
  pageCount?: number;
}

export const PdfProgressOverlay: React.FC<PdfProgressOverlayProps> = ({
  isOpen,
  onComplete,
  documentTitle = 'Enterprise PDF Document',
  pageCount = 2,
}) => {
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('Initializing High-DPI Vector Engine...');

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStepText('Initializing High-DPI Vector Engine...');
      return;
    }

    setProgress(0);
    const totalSteps = 100;
    const intervalMs = 20; // 2 seconds total smooth progress

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + 2;
        if (next < 25) {
          setStepText('Parsing typography & CSS page breaks...');
        } else if (next < 50) {
          setStepText(`Rendering ${pageCount} pages vector graphics...`);
        } else if (next < 75) {
          setStepText('Compiling multi-page PDF layout stream...');
        } else if (next < 95) {
          setStepText('Finalizing spool file & print stream...');
        } else {
          setStepText('Document Ready! Launching print dialog...');
        }

        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 300);
          return 100;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, pageCount, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-2xl overflow-hidden relative"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shrink-0">
              <FileText className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
                PDF Generation Process
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[260px]">
                {documentTitle}
              </h3>
            </div>
          </div>

          {/* Progress Circular & Percentage */}
          <div className="flex flex-col items-center my-6 space-y-3">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="text-indigo-600 dark:text-indigo-400 transition-all duration-150 ease-out"
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * progress) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  {progress}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                </span>
              </div>
            </div>

            {/* Step Subtext */}
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 text-center h-5 flex items-center gap-1.5 font-mono">
              {progress < 100 ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
              {stepText}
            </p>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-4 p-0.5">
            <motion.div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>

          {/* Status Indicators Footer */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Multi-Page Layout Opt
            </span>
            <span className="font-mono">Vector DPI: 300</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
