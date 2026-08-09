import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Award, Zap } from 'lucide-react';

interface PromotionalBannerProps {
  isLight: boolean;
  onNavigateToTab: (tab: string) => void;
  onNavigateToSettingsOption: (opt: string) => void;
}

export const PromotionalBanner: React.FC<PromotionalBannerProps> = ({
  isLight,
  onNavigateToTab,
  onNavigateToSettingsOption,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all ${
        isLight
          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 text-slate-800'
          : 'bg-gradient-to-r from-slate-900 to-indigo-950/40 border-indigo-950/50 text-slate-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600/10 text-indigo-600 rounded-xl">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-yellow-500" />
            Premium GST Invoice Designer Studio Active
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Customize corporate headers, add religious center symbols, sign digitally, and deploy offline-first templates in Settings.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onNavigateToSettingsOption('invoice-design')}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
        >
          <Zap className="h-3 w-3" /> Customize PDF <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
};
