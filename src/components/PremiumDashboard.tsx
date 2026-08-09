import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, 
  Layers, Plus, RefreshCw, ShoppingCart, ArrowUpRight, ArrowDownRight, CheckSquare, Sparkles,
  Upload
} from 'lucide-react';

interface PremiumDashboardProps {
  isLight: boolean;
  theme: string;
  setTheme: (t: 'dark' | 'light') => void;
  user: any;
  activeTab: string;
  setActiveTab: (t: any) => void;
  setSettingsSubOption: (opt: string) => void;
  aggregates: any;
  items: any[];
  transactions: any[];
  payments: any[];
  documents: any[];
  onShowToast: (text: string, type?: 'success' | 'error') => void;
  setShowAddItemForm: (v: boolean) => void;
  setShowPaymentForm: (v: boolean) => void;
  setPaymentState: (state: any) => void;
  setCurrentDocType: (type: any) => void;
  onRefreshData: () => Promise<void>;
  setPendingFilesToParse?: (files: FileList | null) => void;
}

export const PremiumDashboard: React.FC<PremiumDashboardProps> = ({
  isLight,
  theme,
  setTheme,
  user,
  activeTab,
  setActiveTab,
  setSettingsSubOption,
  aggregates,
  items,
  transactions,
  payments,
  documents,
  onShowToast,
  setShowAddItemForm,
  setShowPaymentForm,
  setPaymentState,
  setCurrentDocType,
  onRefreshData,
  setPendingFilesToParse,
}) => {
  const lowStockCount = aggregates?.lowStockAlerts?.length || 0;
  const netInflowVal = aggregates?.totalInflowValuation || 0;
  const netOutflowVal = aggregates?.totalOutflowValuation || 0;
  const cashBalance = aggregates?.netCashBalance || 0;
  const gpayBalance = aggregates?.netGpayBalance || 0;

  const handleRefresh = async () => {
    onShowToast('Refreshing real-time ledger & inventory data...');
    await onRefreshData();
    onShowToast('Sync completed successfully!', 'success');
  };

  // Safe helper to build a responsive financial SVG bar chart or line chart
  const recentPayments = payments.slice(0, 5);

  return (
    <div className={`p-5 sm:p-6 space-y-6 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
      
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Enterprise Control Center
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Logged in as <strong className="text-slate-200">{user?.name || 'Sarvesh Yadav'}</strong> ({user?.role || 'Lead Architect'}). Offline local cache synced.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border dark:border-slate-800 text-[10.5px] font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Force Sync
          </button>
        </div>
      </div>

      {/* Grid of Key Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Cash Box Balance */}
        <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-sm ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/20 border-slate-850'
        }`}>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-slate-400">Cash Account Box</span>
            <h3 className="text-sm font-black font-mono mt-0.5">₹{cashBalance.toLocaleString()}</h3>
            <span className="text-[8px] text-emerald-500 font-extrabold flex items-center gap-0.5">
              ▲ Liquid Cash Pool
            </span>
          </div>
        </div>

        {/* Card 2: GPay / UPI Account */}
        <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-sm ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/20 border-slate-850'
        }`}>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-slate-400">GPay UPI Balance</span>
            <h3 className="text-sm font-black font-mono mt-0.5">₹{gpayBalance.toLocaleString()}</h3>
            <span className="text-[8px] text-indigo-400 font-extrabold flex items-center gap-0.5">
              ▲ Node Synchronised
            </span>
          </div>
        </div>

        {/* Card 3: Total Supply Inflow Valuation */}
        <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-sm ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/20 border-slate-850'
        }`}>
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-slate-400">Inflow Stock Valuation</span>
            <h3 className="text-sm font-black font-mono mt-0.5">₹{netInflowVal.toLocaleString()}</h3>
            <p className="text-[8px] text-slate-400 mt-0.5">{items.length} Registered Catalog SKUs</p>
          </div>
        </div>

        {/* Card 4: Low Stock warning counters */}
        <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-sm cursor-pointer ${
          lowStockCount > 0 
            ? 'bg-rose-500/5 border-rose-500/20 text-rose-500' 
            : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/20 border-slate-850')
        }`}
        onClick={() => setActiveTab('stock')}
        >
          <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-rose-500/10 text-rose-500 animate-pulse' : 'bg-slate-500/10 text-slate-400'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-slate-400">Critical Reorders</span>
            <h3 className="text-sm font-black font-mono mt-0.5">{lowStockCount} items</h3>
            <span className={`text-[8px] font-extrabold ${lowStockCount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              {lowStockCount > 0 ? '⚠️ Immediate Action Advised' : '✓ Stock Levels Safe'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Core action panel & Double Entry logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Recent Payments & Ledgers (7/12) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-500" />
              Recent Reconciled Payments
            </h3>
            <button
              onClick={() => setActiveTab('ledger')}
              className="text-[10px] font-bold uppercase text-indigo-500 hover:underline"
            >
              View Journal
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border dark:border-slate-850">
            <table className="w-full text-left text-xs">
              <thead className={`${isLight ? 'bg-slate-100' : 'bg-slate-950/40'} font-black uppercase text-[9px]`}>
                <tr>
                  <th className="p-3">Counterparty</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Cash</th>
                  <th className="p-3 text-right">UPI / GPay</th>
                  <th className="p-3 text-right">Cheque</th>
                  <th className="p-3">Memo</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400 italic">No reconciled ledger entries.</td>
                  </tr>
                ) : (
                  recentPayments.map((p) => {
                    const isIncome = p.type === 'INCOME';
                    return (
                      <tr key={p.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-950/10">
                        <td className="p-3 font-bold">{p.vendorName || 'General Account'}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                            isIncome 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {isIncome ? 'RECEIVED' : 'PAID'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">₹{p.cashAmount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">₹{p.gpayAmount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">₹{p.chequeAmount.toLocaleString()}</td>
                        <td className="p-3 text-[10px] text-slate-400 truncate max-w-[150px]" title={p.memo}>{p.memo}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Quick Action Shortcuts (4/12) */}
        <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 shadow-sm ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
        }`}>
          <h3 className="text-xs font-black uppercase tracking-wider">Quick Studio Shortcuts</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Quickly invoke offline-ready business builders with a click.</p>
          
          <div className="grid grid-cols-1 gap-2">
            {setPendingFilesToParse && (
              <label className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-left flex items-center justify-between cursor-pointer transition-all active:scale-95 shadow">
                <div>
                  <span className="text-[10.5px] font-black uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                    AI Auto-Entry Stock
                  </span>
                  <p className="text-[8.5px] text-emerald-100">Upload invoice/receipt image</p>
                </div>
                <Upload className="h-4 w-4 text-emerald-200" />
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setPendingFilesToParse(files);
                      setActiveTab('scan');
                    }
                  }}
                />
              </label>
            )}

            <button
              onClick={() => {
                setCurrentDocType('QUOTATION');
                setActiveTab('quotation');
              }}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-left flex items-center justify-between cursor-pointer transition-all active:scale-95"
            >
              <div>
                <span className="text-[10.5px] font-black uppercase tracking-wide">Quotation Maker</span>
                <p className="text-[8.5px] text-indigo-200">Prepare price proposals</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-indigo-200" />
            </button>

            <button
              onClick={() => {
                setSettingsSubOption('invoice-design');
                setActiveTab('settings');
              }}
              className={`p-3 rounded-xl text-left flex items-center justify-between border cursor-pointer transition-all active:scale-95 ${
                isLight 
                  ? 'bg-white border-slate-200 hover:bg-slate-100' 
                  : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/40'
              }`}
            >
              <div>
                <span className="text-[10.5px] font-black uppercase tracking-wide">Design Studio Settings</span>
                <p className="text-[8.5px] text-slate-400">Tweak headers &amp; watermarks</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </button>

            <button
              onClick={() => {
                setShowAddItemForm(true);
                setActiveTab('stock');
              }}
              className={`p-3 rounded-xl text-left flex items-center justify-between border cursor-pointer transition-all active:scale-95 ${
                isLight 
                  ? 'bg-white border-slate-200 hover:bg-slate-100' 
                  : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/40'
              }`}
            >
              <div>
                <span className="text-[10.5px] font-black uppercase tracking-wide">Register New SKU</span>
                <p className="text-[8.5px] text-slate-400">Add inventory parts catalog</p>
              </div>
              <Plus className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PremiumDashboard;
