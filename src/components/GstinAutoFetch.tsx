import React, { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, RefreshCw, Database, Copy, Check } from 'lucide-react';

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

interface GstinAutoFetchProps {
  onFetchSuccess?: (details: GSTDetails) => void;
  isLight: boolean;
  className?: string;
}

export const GstinAutoFetch: React.FC<GstinAutoFetchProps> = ({
  onFetchSuccess,
  isLight,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<GSTDetails | null>(null);
  const [copied, setCopied] = useState(false);

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
    const cleanGst = inputValue.trim().toUpperCase();
    
    // Client-Side Validation
    const validation = validateGSTIN(cleanGst);
    if (!validation.isValid) {
      setError(validation.message || "Invalid GSTIN format.");
      return;
    }

    // Check local storage cache
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(`gst_cache_${cleanGst}`);
        if (cached) {
          const parsed = JSON.parse(cached) as GSTDetails;
          setDetails(parsed);
          if (onFetchSuccess) onFetchSuccess(parsed);
          return;
        }
      } catch (err) {
        console.warn("Failed to read from localStorage cache:", err);
      }
    }

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

      setDetails(data);
      if (onFetchSuccess) onFetchSuccess(data);
    } catch (err: any) {
      console.error("GST Fetch error:", err);
      setError(err.message || "Network error. Please check your connectivity.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!details) return;
    const text = `GSTIN: ${details.gstin}
Legal Name: ${details.legalName}
Trade Name: ${details.tradeName}
Status: ${details.status}
Constitution: ${details.constitution}
Address: ${details.addressLine1}, ${details.addressLine2}, ${details.city}, ${details.state} - ${details.pinCode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderField = (label: string, value: string | undefined | null, isFullWidth = false, required = true) => {
    const isMissing = required && (!value || !value.trim());
    return (
      <div className={`p-2 rounded-lg transition-all border ${
        isMissing 
          ? 'bg-amber-500/10 border-amber-500/35 text-amber-900 dark:text-amber-200 shadow-sm animate-pulse' 
          : 'bg-transparent border-transparent'
      } ${isFullWidth ? 'sm:col-span-2' : ''}`}>
        <strong className="text-slate-500 dark:text-slate-400 block text-[9.5px] uppercase tracking-wider mb-0.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </strong>
        {isMissing ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Missing — Manual Input Required
          </span>
        ) : (
          <span className="text-slate-900 dark:text-white font-medium text-[11.5px]">
            {value || 'N/A'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`p-4 rounded-xl border ${
      isLight 
        ? 'bg-slate-50/80 border-slate-200/80 text-slate-800' 
        : 'bg-[#1e293b]/50 border-slate-800 text-slate-200'
    } ${className}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
            Search & Auto-Fill GSTIN Registry
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 27AADCB2230M1Z5"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              maxLength={15}
              className={`flex-1 px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
                isLight 
                  ? 'bg-white border-slate-250 text-slate-900 focus:ring-1 focus:ring-emerald-500/50' 
                  : 'bg-slate-950 border-slate-800 text-white focus:ring-1 focus:ring-emerald-500/30'
              }`}
            />
            <button
              type="button"
              disabled={loading || inputValue.length < 15}
              onClick={() => handleFetch(false)}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                inputValue.length < 15
                  ? 'opacity-40 cursor-not-allowed bg-slate-300 text-slate-500'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
              }`}
            >
              {loading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {loading ? "Fetching..." : "Fetch Details"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950/40 text-[10.5px] leading-relaxed">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {details && (
          <div className={`p-3 rounded-lg border text-[11px] leading-relaxed space-y-2 relative transition-all duration-300 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-2 top-2 p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 transition-all cursor-pointer"
              title="Copy details to clipboard"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="flex justify-between items-center border-b pb-1.5 border-slate-250 dark:border-slate-800">
              <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">Verifiable GST Profile</span>
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                details.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
              }`}>
                {details.status}
              </span>
            </div>

            {/* Check for missing fields */}
            {(() => {
              const missingFields: string[] = [];
              if (!details.legalName?.trim()) missingFields.push("Legal Name");
              if (!details.pan?.trim()) missingFields.push("PAN");
              if (!details.addressLine1?.trim()) missingFields.push("Address Line 1");
              if (!details.city?.trim()) missingFields.push("City");
              if (!details.state?.trim()) missingFields.push("State");
              if (!details.pinCode?.trim()) missingFields.push("PIN Code");

              if (missingFields.length > 0) {
                return (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 text-[10.5px] leading-relaxed">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">⚠️ Profile Completeness Warning</p>
                      <p>
                        The registry response has missing fields: <strong className="underline">{missingFields.join(", ")}</strong>. 
                        Please review the auto-populated details below manually before finalizing your billing document.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderField("Legal Name", details.legalName, true, true)}
              {renderField("Trade Name", details.tradeName, false, false)}
              {renderField("Constitution", details.constitution, false, false)}
              {renderField("Taxpayer Type", details.taxpayerType, false, false)}
              {renderField("PAN Number", details.pan, false, true)}
              {renderField("Registration Date", details.registrationDate, false, false)}
              {renderField("Address Line 1", details.addressLine1, true, true)}
              {details.addressLine2 && renderField("Address Line 2", details.addressLine2, true, false)}
              {renderField("City / Town", details.city, false, true)}
              {renderField("District", details.district, false, false)}
              {renderField("State / Code", details.state ? `${details.state} (Code: ${details.stateCode || ''})` : '', false, true)}
              {renderField("PIN Code", details.pinCode, false, true)}
              {renderField("Business Nature", details.businessNature, true, false)}
            </div>
            
            <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-0.5 font-sans">
                <Database className="h-2 w-2" />
                Registry: {details.isSandbox ? "Local Sandbox Validation" : "Secure API Verification"}
              </span>
              {details.isSandbox && (
                <span className="italic text-slate-400">No active external key configured</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
