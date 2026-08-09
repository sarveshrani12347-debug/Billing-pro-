import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Plus, Trash2, Printer, Sparkles, PlusCircle, 
  Percent, DollarSign, RefreshCw, Layers, ClipboardCheck, Save, Clock 
} from 'lucide-react';
import { PdfProgressOverlay } from './PdfProgressOverlay';

interface QuotationItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  taxRate: number;
  total: number;
}

interface QuotationMakerProps {
  isLight: boolean;
  items: any[];
  biz: any;
  biz2: any;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const QuotationMaker: React.FC<QuotationMakerProps> = ({
  isLight,
  items,
  biz,
  biz2,
  showToast,
}) => {
  const [clientName, setClientName] = useState('');
  const [clientGst, setClientGst] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([]);
  
  // Form state
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [rate, setRate] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);

  // Auto-save logic for QuotationMaker
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const quoteFormRef = useRef({ clientName, clientGst, clientAddress, quoteItems });

  useEffect(() => {
    quoteFormRef.current = { clientName, clientGst, clientAddress, quoteItems };
  }, [clientName, clientGst, clientAddress, quoteItems]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quotation_maker_autosave');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft) {
          if (draft.clientName) setClientName(draft.clientName);
          if (draft.clientGst) setClientGst(draft.clientGst);
          if (draft.clientAddress) setClientAddress(draft.clientAddress);
          if (Array.isArray(draft.quoteItems)) setQuoteItems(draft.quoteItems);
          const timeStr = draft.lastSavedAt ? new Date(draft.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          if (draft.clientName || (draft.quoteItems && draft.quoteItems.length > 0)) {
            setAutoSaveStatus(`Restored draft${timeStr ? ` (${timeStr})` : ''}`);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load quotation maker draft", e);
    }
  }, []);

  // Interval timer every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      const form = quoteFormRef.current;
      if (form.clientName.trim() || form.clientGst.trim() || form.clientAddress.trim() || form.quoteItems.length > 0) {
        try {
          const draft = { ...form, lastSavedAt: new Date().toISOString() };
          localStorage.setItem('quotation_maker_autosave', JSON.stringify(draft));
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setAutoSaveStatus(`Auto-saved at ${timeStr}`);
        } catch (e) {
          console.warn("Quotation 30s auto-save failed", e);
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleAddItem = () => {
    let itemName = customItemName;
    let itemRate = rate;
    let itemTax = taxRate;

    if (selectedItemId) {
      const dbItem = items.find(i => i.id === selectedItemId);
      if (dbItem) {
        itemName = dbItem.name;
        if (!itemRate) itemRate = dbItem.sellingPrice || dbItem.unitCost || 0;
        itemTax = dbItem.taxRate || 18;
      }
    }

    if (!itemName) {
      showToast('Please specify or select an item name.', 'error');
      return;
    }

    const subtotal = qty * itemRate;
    const tax = subtotal * (itemTax / 100);
    const total = subtotal + tax;

    const newItem: QuotationItem = {
      id: Date.now().toString(),
      name: itemName,
      qty,
      rate: itemRate,
      taxRate: itemTax,
      total,
    };

    setQuoteItems(prev => [...prev, newItem]);
    setSelectedItemId('');
    setCustomItemName('');
    setQty(1);
    setRate(0);
    showToast('Line item added to commercial quotation.');
  };

  const handleRemoveItem = (id: string) => {
    setQuoteItems(prev => prev.filter(i => i.id !== id));
    showToast('Line item removed.');
  };

  const subtotalSum = quoteItems.reduce((acc, i) => acc + (i.rate * i.qty), 0);
  const taxSum = quoteItems.reduce((acc, i) => acc + (i.rate * i.qty * (i.taxRate / 100)), 0);
  const totalSum = subtotalSum + taxSum;

  const [isPdfOverlayOpen, setIsPdfOverlayOpen] = useState(false);

  const handlePrint = () => {
    setIsPdfOverlayOpen(true);
  };

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 gap-6 items-start ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
      {/* Quotation Configurator Left Column (7/12) */}
      <div className={`xl:col-span-7 p-5 rounded-2xl border space-y-6 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Commercial Quotation Maker</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Build corporate price estimates and dispatch printouts offline.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800 text-[10px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-600 dark:text-slate-300">Auto-Save Active (30s)</span>
            {autoSaveStatus && (
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                • {autoSaveStatus}
              </span>
            )}
          </div>
        </div>

        {/* Client Metadata block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">Counterparty Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
              placeholder="e.g. Acme Corporations Ltd"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">Client GSTIN (Optional)</label>
            <input
              type="text"
              value={clientGst}
              onChange={(e) => setClientGst(e.target.value)}
              className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
              placeholder="e.g. 27AASCE9904E1Z0"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">Billing &amp; Delivery Address</label>
            <textarea
              rows={2}
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
              placeholder="Full physical dispatch address"
            />
          </div>
        </div>

        {/* Line Item Adder row */}
        <div className="p-4 rounded-xl border border-dashed dark:border-slate-800 space-y-4 bg-white/40 dark:bg-slate-950/20">
          <h4 className="text-[10.5px] font-black uppercase tracking-wide flex items-center gap-1">
            <PlusCircle className="h-4 w-4 text-indigo-500" /> Add Line Items
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">Select Catalog Item</label>
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  const selected = items.find(i => i.id === e.target.value);
                  if (selected) {
                    setCustomItemName(selected.name);
                    setRate(selected.sellingPrice || selected.unitCost || 0);
                    setTaxRate(selected.taxRate || 18);
                  }
                }}
                className="w-full text-xs font-bold rounded p-2 border dark:bg-slate-950"
              >
                <option value="">-- Or enter custom name --</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.name} (₹{i.sellingPrice || i.unitCost})</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">Custom Item Name</label>
              <input
                type="text"
                disabled={!!selectedItemId}
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="w-full text-xs font-bold rounded p-2 border dark:bg-slate-950 disabled:opacity-50"
                placeholder="Product or service details"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs font-bold rounded p-2 border dark:bg-slate-950"
              />
            </div>

            <div className="sm:col-span-1.5">
              <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">Rate (₹)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-bold rounded p-2 border dark:bg-slate-950"
              />
            </div>

            <div className="sm:col-span-1.5">
              <label className="block text-[9px] uppercase font-black text-slate-400 mb-1">GST %</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-bold rounded p-2 border dark:bg-slate-950"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <Plus className="h-3 w-3" /> Add Item Line
          </button>
        </div>

        {/* Selected Quote Items table */}
        <div className="overflow-x-auto rounded-xl border dark:border-slate-850">
          <table className="w-full text-left text-xs">
            <thead className={`${isLight ? 'bg-slate-100' : 'bg-slate-950/40'} font-black uppercase text-[10px]`}>
              <tr>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">GST %</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {quoteItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic">No line items added yet.</td>
                </tr>
              ) : (
                quoteItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-950/10">
                    <td className="p-3 font-bold">{item.name}</td>
                    <td className="p-3 text-right font-mono">{item.qty}</td>
                    <td className="p-3 text-right font-mono">₹{item.rate.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">{item.taxRate}%</td>
                    <td className="p-3 text-right font-mono font-bold">₹{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Print Layout Column (5/12) */}
      <div className="xl:col-span-5 space-y-4">
        {/* Actions panel */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-black text-indigo-500 tracking-wider">Ready to dispatch</span>
            <h4 className="text-xs font-black uppercase mt-0.5">Commercial Invoice Draft</h4>
          </div>
          <button
            onClick={handlePrint}
            disabled={quoteItems.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Generate PDF / Print
          </button>
        </div>

        {/* Live physical printable paper card */}
        <div id="printable-quotation-card" className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border shadow-xl space-y-6 aspect-[1/1.414] w-full max-w-[550px] mx-auto overflow-hidden">
          {/* Paper Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-1">
                <span className="p-1.5 bg-slate-900 text-white rounded text-[10px] font-black leading-none">SL</span>
                <span className="text-xs font-extrabold tracking-wider uppercase text-slate-900">{biz.name || 'Stock & Ledger Inc.'}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                {biz.address}
              </p>
              <p className="text-[9px] text-slate-500 mt-1">GSTIN: {biz.gstin}</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">PRICE QUOTATION</h2>
              <p className="text-[9px] text-slate-400 mt-1">DATE: {new Date().toLocaleDateString()}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">EST: #QT-{Date.now().toString().substring(8)}</p>
            </div>
          </div>

          {/* Counterparty blocks */}
          <div className="grid grid-cols-2 gap-4 text-[9px] border-b border-slate-200 pb-4">
            <div>
              <span className="text-[8px] uppercase font-bold text-slate-400 block mb-1">BILLING TO:</span>
              <p className="font-extrabold text-slate-800">{clientName || 'Counterparty Client'}</p>
              {clientGst && <p className="text-[8px] text-slate-500 mt-0.5">GST: {clientGst}</p>}
              {clientAddress && <p className="text-[8px] text-slate-500 mt-1 leading-relaxed max-w-[150px]">{clientAddress}</p>}
            </div>
            <div className="text-right">
              <span className="text-[8px] uppercase font-bold text-slate-400 block mb-1">CONTACT CHANNELS:</span>
              <p className="text-slate-600">{biz.phone}</p>
              <p className="text-slate-600">{biz.email}</p>
              <p className="text-slate-600">{biz2.website}</p>
            </div>
          </div>

          {/* Table */}
          <div className="flex-grow space-y-4">
            <table className="w-full text-left text-[9px]">
              <thead>
                <tr className="border-b border-slate-900 font-extrabold text-slate-800">
                  <th className="pb-1 text-left">ITEM NAME</th>
                  <th className="pb-1 text-right">QTY</th>
                  <th className="pb-1 text-right">RATE</th>
                  <th className="pb-1 text-right">GST</th>
                  <th className="pb-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quoteItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">No line items added to draft estimate.</td>
                  </tr>
                ) : (
                  quoteItems.map(item => (
                    <tr key={item.id} className="text-slate-700">
                      <td className="py-2 font-bold">{item.name}</td>
                      <td className="py-2 text-right font-mono">{item.qty}</td>
                      <td className="py-2 text-right font-mono">₹{item.rate.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono">{item.taxRate}%</td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900">₹{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sum rows */}
          <div className="border-t border-slate-200 pt-3 flex flex-col items-end text-[10px] space-y-1.5 font-mono">
            <div className="flex justify-between w-48 text-slate-500">
              <span>Subtotal:</span>
              <span>₹{subtotalSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-48 text-slate-500">
              <span>Total CGST/SGST:</span>
              <span>₹{taxSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-48 font-bold text-slate-950 border-t border-slate-200 pt-1.5 text-xs">
              <span>Grand Total:</span>
              <span>₹{totalSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Footer banner declaration */}
          <div className="border-t border-slate-150 pt-4 text-[8px] text-slate-400 flex justify-between items-center">
            <p className="max-w-[250px] leading-relaxed">
              We declare that this price quotation represents actual hardware costs and standard tax slabs offline. Standard corporate warranty terms apply.
            </p>
            <div className="text-right">
              <span className="block font-bold text-slate-800 uppercase tracking-wide">Authorized Signatory</span>
              <div className="h-6 w-16 border-b border-slate-300 mt-1 ml-auto"></div>
            </div>
          </div>
        </div>
      </div>

      <PdfProgressOverlay
        isOpen={isPdfOverlayOpen}
        onComplete={() => {
          setIsPdfOverlayOpen(false);
          window.print();
        }}
        documentTitle={clientName ? `Price Quote - ${clientName}` : 'Commercial Price Quotation'}
        pageCount={Math.max(1, Math.ceil(quoteItems.length / 8))}
      />
    </div>
  );
};
export default QuotationMaker;
