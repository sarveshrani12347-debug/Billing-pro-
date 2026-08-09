import React from 'react';
import { motion } from 'motion/react';
import { Award, Sparkles, Building2, Tag, ArrowUpRight, Check } from 'lucide-react';

interface SettingsAdsBillboardProps {
  isLight: boolean;
  onNavigateToTab: (tab: string) => void;
  onShowToast: (text: string, type?: 'success' | 'error') => void;
  layoutMode?: 'split' | 'full';
  adsEnabled: boolean;
}

export const SettingsAdsBillboard: React.FC<SettingsAdsBillboardProps> = ({
  isLight,
  onNavigateToTab,
  onShowToast,
  layoutMode = 'split',
  adsEnabled,
}) => {
  if (!adsEnabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-5 rounded-2xl border space-y-4 shadow-sm ${
        isLight
          ? 'bg-slate-50 border-slate-200 text-slate-800'
          : 'bg-slate-900/40 border-slate-800 text-slate-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-500" />
          <h4 className="text-xs font-black uppercase tracking-wide">Enterprise Partnerships</h4>
        </div>
        <span className="px-1.5 py-0.5 text-[8px] bg-indigo-500/10 text-indigo-400 font-extrabold uppercase rounded tracking-wider">
          Active Node
        </span>
      </div>

      <div className="space-y-2.5">
        <div
          onClick={() => {
            onNavigateToTab('quotation');
            onShowToast('Navigating to Vyapar Quotation Maker...');
          }}
          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${
            isLight
              ? 'bg-white border-slate-200 hover:border-indigo-300'
              : 'bg-slate-950/40 border-slate-800/80 hover:border-indigo-900/50'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500" /> Apex Semiconductors Ltd.
            </span>
            <p className="text-[9px] text-slate-400">Premium silicon &amp; logic supply node partner.</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-400" />
        </div>

        <div
          onClick={() => {
            onNavigateToTab('ledger');
            onShowToast('Opening Double-Entry General Ledger...');
          }}
          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${
            isLight
              ? 'bg-white border-slate-200 hover:border-indigo-300'
              : 'bg-slate-950/40 border-slate-800/80 hover:border-indigo-900/50'
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
              <Tag className="h-3 w-3 text-indigo-500" /> Delta Logistics Corp
            </span>
            <p className="text-[9px] text-slate-400">Integrated global supply chain tracking node.</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5">
        <Check className="h-3 w-3 text-emerald-500" />
        <span>Hardware transactions automatically reconciled across partner ledgers offline.</span>
      </div>
    </motion.div>
  );
};
