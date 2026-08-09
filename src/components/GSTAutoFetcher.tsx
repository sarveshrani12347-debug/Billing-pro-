import React, { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';

export interface GSTDetails {
  gstin: string;
  legalName: string;
  tradeName: string;
  status: string;
  registrationDate: string;
  constitution: string;
  taxpayerType: string;
  pan: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  stateCode: string;
  pinCode: string;
  country: string;
  businessNature: string;
  isSandbox: boolean;
}

interface GSTAutoFetcherProps {
  gstin: string;
  onFetchSuccess: (details: GSTDetails) => void;
  isLight: boolean;
  label?: string;
}

export const GSTAutoFetcher: React.FC<GSTAutoFetcherProps> = ({
  gstin,
  onFetchSuccess,
  isLight,
  label = "Auto-fetch GST details"
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedDetails, setCachedDetails] = useState<GSTDetails | null>(null);

  const validateGSTIN = (num: string): { isValid: boolean; message?: string } => {
    const cleanNum = num.trim().toUpperCase();
    if (!cleanNum) {
      return { isValid: false, message: "GSTIN number is empty." };
    }
    if (cleanNum.length !== 15) {
      return { isValid: false, message: `GSTIN must be exactly 15 characters (currently ${cleanNum.length}).` };
    }
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(cleanNum)) {
      return { isValid: false, message: "Invalid GSTIN format structure (Format: 27AADCB2230M1Z5)." };
    }
    return { isValid: true };
  };

  const handleFetch = async (forceRefresh = false) => {
    setError(null);
    const cleanGst = gstin.trim().toUpperCase();
    
    // 1. Client-Side Validation
    const validation = validateGSTIN(cleanGst);
    if (!validation.isValid) {
      setError(validation.message || "Invalid GSTIN format.");
      return;
    }

    // 2. Check local storage cache
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(`gst_cache_${cleanGst}`);
        if (cached) {
          const parsed = JSON.parse(cached) as GSTDetails;
          setCachedDetails(parsed);
          onFetchSuccess(parsed);
          return;
        }
      } catch (err) {
        console.warn("Failed to read from localStorage cache:", err);
      }
    }

    // 3. Perform real fetch
    setLoading(true);
    try {
      const res = await fetch('/api/gst/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: cleanGst })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json() as GSTDetails;
      
      // Save to local cache
      try {
        localStorage.setItem(`gst_cache_${cleanGst}`, JSON.stringify(data));
      } catch (cacheErr) {
        console.warn("Failed to write to localStorage cache:", cacheErr);
      }

      setCachedDetails(data);
      onFetchSuccess(data);
    } catch (err: any) {
      console.error("GST Fetch error:", err);
      setError(err.message || "Network error. Please check your connectivity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading || !gstin}
          onClick={() => handleFetch(false)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase rounded shadow-sm cursor-pointer transition-all ${
            !gstin
              ? 'opacity-40 cursor-not-allowed bg-slate-300 text-slate-500'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {loading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          {loading ? "Verifying..." : "Fetch GST Details"}
        </button>

        {cachedDetails && (
          <button
            type="button"
            onClick={() => handleFetch(true)}
            title="Refresh current cached GSTIN details from server"
            className="flex items-center justify-center p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}

        {cachedDetails && (
          <span className="flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
            Verified Cache Hit
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-1 p-2 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950/40 text-[10px] leading-snug">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {cachedDetails && (
        <div className={`p-2.5 rounded-lg border text-[10px] leading-relaxed space-y-1 ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
        }`}>
          <div className="flex justify-between items-center border-b pb-1 mb-1 border-slate-200 dark:border-slate-800">
            <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">Fetched Entity Record</span>
            <span className={`px-1 rounded text-[8.5px] font-black uppercase ${
              cachedDetails.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
            }`}>
              {cachedDetails.status}
            </span>
          </div>
          <p><strong className="text-slate-500 dark:text-slate-400">Legal Name:</strong> <span className="font-semibold text-slate-900 dark:text-white">{cachedDetails.legalName}</span></p>
          <p><strong className="text-slate-500 dark:text-slate-400">Trade Name:</strong> {cachedDetails.tradeName || 'N/A'}</p>
          <p><strong className="text-slate-500 dark:text-slate-400">Constitution:</strong> {cachedDetails.constitution} ({cachedDetails.taxpayerType})</p>
          <p><strong className="text-slate-500 dark:text-slate-400">PAN Number:</strong> <code className="font-mono text-indigo-500">{cachedDetails.pan}</code></p>
          <p><strong className="text-slate-500 dark:text-slate-400">Full Address:</strong> {cachedDetails.addressLine1}, {cachedDetails.addressLine2}, {cachedDetails.city}, {cachedDetails.state} - {cachedDetails.pinCode}</p>
          <p><strong className="text-slate-500 dark:text-slate-400">Nature of Biz:</strong> {cachedDetails.businessNature}</p>
          
          <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-0.5">
              <Database className="h-2 w-2" />
              Mode: {cachedDetails.isSandbox ? "Sandbox Offline Mode" : "Official Verification Service"}
            </span>
            <span>Reg: {cachedDetails.registrationDate}</span>
          </div>
        </div>
      )}
    </div>
  );
};
