import React, { useState, useRef } from 'react';
import { 
  Search, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  Info,
  Building2,
  MapPin,
  FileCheck
} from 'lucide-react';

export interface GstExtractedData {
  gstin: string;
  legalName: string;
  tradeName?: string;
  address: string;
  city?: string;
  state?: string;
  pinCode?: string;
  pan?: string;
  constitution?: string;
  mobile?: string;
}

interface GstUnifiedIngestorProps {
  onSuccess: (data: GstExtractedData) => void;
  isLight: boolean;
  showToast: (msg: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  className?: string;
}

export const GstUnifiedIngestor: React.FC<GstUnifiedIngestorProps> = ({
  onSuccess,
  isLight,
  showToast,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'ocr'>('api');
  const [gstinInput, setGstinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<GstExtractedData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side GSTIN validation helper
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

  // API Verification Mode
  const handleApiVerify = async (forceRefresh = false) => {
    setError(null);
    setExtractedProfile(null);
    const cleanGst = gstinInput.trim().toUpperCase();

    const validation = validateGSTIN(cleanGst);
    if (!validation.isValid) {
      setError(validation.message || "Invalid GSTIN format.");
      return;
    }

    setLoading(true);
    try {
      // Try to check cache first
      if (!forceRefresh) {
        const cached = localStorage.getItem(`gst_cache_${cleanGst}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          const formattedAddress = `${parsed.addressLine1 || ''}, ${parsed.addressLine2 || ''}, ${parsed.city || ''}, ${parsed.state || ''} - ${parsed.pinCode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '');
          
          const profile: GstExtractedData = {
            gstin: parsed.gstin,
            legalName: parsed.legalName,
            tradeName: parsed.tradeName,
            address: formattedAddress,
            city: parsed.city,
            state: parsed.state,
            pinCode: parsed.pinCode,
            pan: parsed.pan,
            constitution: parsed.constitution
          };

          setExtractedProfile(profile);
          onSuccess(profile);
          showToast(`GST profile loaded from offline cache successfully!`, 'success');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/gst/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: cleanGst })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const parsed = await res.json();
      
      // Cache the result
      localStorage.setItem(`gst_cache_${cleanGst}`, JSON.stringify(parsed));

      const formattedAddress = `${parsed.addressLine1 || ''}, ${parsed.addressLine2 || ''}, ${parsed.city || ''}, ${parsed.state || ''} - ${parsed.pinCode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '');
      
      const profile: GstExtractedData = {
        gstin: parsed.gstin,
        legalName: parsed.legalName,
        tradeName: parsed.tradeName,
        address: formattedAddress,
        city: parsed.city,
        state: parsed.state,
        pinCode: parsed.pinCode,
        pan: parsed.pan,
        constitution: parsed.constitution
      };

      setExtractedProfile(profile);
      onSuccess(profile);
      showToast(`Registry verification completed for ${profile.legalName}!`, 'success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failed. Please review the GSTIN and retry.');
    } finally {
      setLoading(false);
    }
  };

  // OCR Certificate Upload Mode
  const processFile = async (file: File) => {
    setError(null);
    setExtractedProfile(null);
    setLoading(true);

    const validMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validMimeTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload FORM GST REG-06 as a PDF or high-resolution JPEG/PNG image.");
      setLoading(false);
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
      });

      const res = await fetch('/api/gst/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `OCR engine error ${res.status}`);
      }

      const parsed = await res.json();
      
      const formattedAddress = `${parsed.addressLine1 || ''}, ${parsed.addressLine2 || ''}, ${parsed.city || ''}, ${parsed.state || ''} - ${parsed.pinCode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '');
      
      const profile: GstExtractedData = {
        gstin: parsed.gstin ? parsed.gstin.trim().toUpperCase() : '',
        legalName: parsed.legalName || '',
        tradeName: parsed.tradeName,
        address: formattedAddress,
        city: parsed.city,
        state: parsed.state,
        pinCode: parsed.pinCode,
        pan: parsed.gstin ? parsed.gstin.slice(2, 12) : '',
        constitution: parsed.constitution
      };

      if (!profile.gstin) {
        throw new Error("AI parser was unable to clearly locate a valid 15-digit GSTIN on the certificate. Please verify your file quality.");
      }

      setExtractedProfile(profile);
      onSuccess(profile);
      showToast(`AI OCR completed! Sourced Profile: ${profile.legalName}`, 'success');

      // Pre-fill the API search box with extracted GSTIN in case they want to run validation later
      setGstinInput(profile.gstin);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse the certificate document. Ensure the file is a valid GST registration certificate (REG-06) with legible text.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isLight 
        ? 'bg-slate-50/70 border-slate-200 text-slate-800' 
        : 'bg-[#1e293b]/40 border-slate-800 text-slate-200'
    } ${className}`}>
      
      {/* Title with Sparkles */}
      <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="bg-indigo-500/10 dark:bg-indigo-500/20 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">GST Registration Assistant</span>
            <p className="text-[9px] text-slate-400">One-click auto-fill via official registry query or AI OCR Certificate parse</p>
          </div>
        </div>
        <div className="flex bg-slate-200/60 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-300/40 dark:border-slate-800 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('api'); setError(null); }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'api' 
                ? 'bg-white dark:bg-slate-850 shadow-sm text-indigo-600 dark:text-indigo-400 font-extrabold' 
                : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            🔍 GSTIN Lookup
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('ocr'); setError(null); }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'ocr' 
                ? 'bg-white dark:bg-slate-850 shadow-sm text-indigo-600 dark:text-indigo-400 font-extrabold' 
                : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            📄 Certificate OCR
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="space-y-3">
        {activeTab === 'api' ? (
          // Look up panel
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter 15-character GSTIN (e.g. 27AADCB2230M1Z5)"
                  value={gstinInput}
                  onChange={(e) => setGstinInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  maxLength={15}
                  className={`w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-lg border transition-all uppercase ${
                    isLight 
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500' 
                      : 'bg-slate-950 border-slate-850 text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500'
                  }`}
                  id="gstin-lookup-field"
                />
                <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
              <button
                type="button"
                disabled={loading || gstinInput.trim().length < 15}
                onClick={() => handleApiVerify(false)}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                  gstinInput.trim().length < 15
                    ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                }`}
              >
                {loading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                {loading ? "Verifying..." : "Verify & Auto-Fill"}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal flex items-center gap-1">
              <Info className="h-2.5 w-2.5 text-slate-400" />
              Retrieves legal name, trade alias, registered physical address, PAN number, constitution, and state mapping.
            </p>
          </div>
        ) : (
          // OCR panel
          <div className="space-y-2">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                isDragActive 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : isLight 
                    ? 'border-slate-300 hover:border-slate-400 bg-white/50 hover:bg-white' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                className="hidden" 
              />
              <div className="bg-indigo-500/10 p-2 rounded-full text-indigo-500">
                <UploadCloud className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-center">
                <span className="text-[10.5px] font-bold block text-slate-600 dark:text-slate-300">
                  Drag & Drop GST REG-06 Certificate Here
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5 block">
                  Supports PDF or PNG/JPG scans • Up to 15 MB
                </span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal flex items-center gap-1">
              <ShieldCheck className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
              Secure multi-modal fallback uses server-side Gemini AI to parse certificates in real-time when API is unreachable.
            </p>
          </div>
        )}

        {/* Loader Panel */}
        {loading && (
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI Registry Processing Engine Active...</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-indigo-600 animate-pulse w-[70%] rounded-full"></div>
            </div>
            <span className="text-[9px] text-slate-400">Verifying structures against Indian GSTIN and PAN directories</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950/40 text-[10px] leading-relaxed">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Failed to Autocomplete GST Profile</p>
              <p>{error}</p>
              <p className="text-[9px] text-slate-450 dark:text-slate-500 pt-1 font-semibold">
                💡 Mode Fallback: You can still complete details manually using the standard text fields below.
              </p>
            </div>
          </div>
        )}

        {/* Extracted Details Confirmation Badge */}
        {extractedProfile && (
          <div className={`p-3 rounded-lg border text-[10.5px] space-y-1.5 relative transition-all duration-300 animate-fadeIn ${
            isLight ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <div className="flex justify-between items-center pb-1 border-b border-emerald-500/10">
              <span className="font-extrabold text-[8.5px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5" />
                Auto-fill complete
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-bold uppercase shadow-sm">
                Success
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-1">
                <Building2 className="h-3 w-3 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Legal Entity</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{extractedProfile.legalName}</span>
                </div>
              </div>

              <div className="flex items-start gap-1">
                <Building2 className="h-3 w-3 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">GSTIN / Tax ID</span>
                  <code className="font-mono text-indigo-500 font-bold">{extractedProfile.gstin}</code>
                </div>
              </div>

              <div className="flex items-start gap-1 md:col-span-2 pt-1 border-t border-slate-500/5">
                <MapPin className="h-3 w-3 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Registered Physical Address</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{extractedProfile.address}</span>
                </div>
              </div>
            </div>

            <p className="text-[8.5px] italic text-slate-400 pt-0.5">
              Note: The values have been injected into physical inputs below. You can modify any field manually if required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
