import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertTriangle, Check, Search, Layers, Tag, HardDrive } from 'lucide-react';
import { Item, StockTransaction } from '../types';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  transactions: StockTransaction[];
  onSelectProduct: (item: Item, scannedCode: string) => void;
  isLight: boolean;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function CameraBarcodeScanner({
  isOpen,
  onClose,
  items,
  transactions,
  onSelectProduct,
  isLight,
  showToast
}: CameraBarcodeScannerProps) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<string>('');
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [manualInput, setManualInput] = useState<string>('');

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const containerId = "real-camera-scanner-view";

  // Compute stock helper
  const getItemStock = (itemId: string) => {
    return transactions
      .filter(t => t.itemId === itemId)
      .reduce((acc, t) => {
        if (t.type === 'INFLOW') return acc + t.quantity;
        if (t.type === 'OUTFLOW') return acc - t.quantity;
        return acc;
      }, 0);
  };

  // Sound effect on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1200; // high pitched beep
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Could not play audio beep", e);
    }
  };

  // Stop scanner safely
  const stopScanner = async () => {
    if (qrCodeInstanceRef.current && isScannerActive) {
      try {
        await qrCodeInstanceRef.current.stop();
        setIsScannerActive(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  // Start scanner with specific camera ID
  const startScanner = async (cameraId: string) => {
    if (!cameraId) return;
    setScannerError('');
    setScannedResult('');
    setFoundItem(null);

    // Stop existing first
    await stopScanner();

    try {
      const html5QrCode = new Html5Qrcode(containerId);
      qrCodeInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            const boxWidth = Math.floor(minSize * 0.7);
            const boxHeight = Math.floor(minSize * 0.4); // barcode ratio
            return { width: boxWidth, height: boxHeight };
          }
        },
        (decodedText) => {
          // Success Callback
          handleSuccessfulScan(decodedText);
        },
        (errorMessage) => {
          // Silent scan verbose failures
        }
      );
      setIsScannerActive(true);
    } catch (err: any) {
      console.error("Camera start failure", err);
      setScannerError(err?.message || "Failed to start camera feed. Please verify camera permissions.");
      setIsScannerActive(false);
    }
  };

  // Handler for finding matches
  const lookupScannedCode = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) return null;

    // 1. Try to find match where item SKU contains the scanned text
    // 2. Try to find match where item name contains the scanned text
    // 3. Try to find match where item HSN contains the scanned text
    const matched = items.find(
      (item) =>
        item.sku.toLowerCase() === cleanCode ||
        item.sku.toLowerCase().includes(cleanCode) ||
        item.id.toLowerCase() === cleanCode ||
        item.name.toLowerCase().includes(cleanCode) ||
        item.hsnCode === cleanCode
    );

    return matched || null;
  };

  const handleSuccessfulScan = (code: string) => {
    playBeep();
    setScannedResult(code);
    showToast(`Code scanned successfully: ${code}`, 'success');

    // Look up in our local items list
    const matched = lookupScannedCode(code);
    if (matched) {
      setFoundItem(matched);
      showToast(`Item Located: ${matched.name}`, 'success');
    } else {
      setFoundItem(null);
      showToast(`Scanned Code "${code}" not found in catalog.`, 'info');
    }
  };

  // Handle camera permission request and enumeration
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Auto select rear camera or first available
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('rear'));
          const defaultCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(defaultCamId);
          startScanner(defaultCamId);
        } else {
          setScannerError("No cameras located on this device.");
        }
      })
      .catch((err) => {
        console.error("Failed to list cameras", err);
        setScannerError("Camera permission denied or camera unavailable.");
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Restart camera when selection changes
  useEffect(() => {
    if (isOpen && selectedCameraId) {
      startScanner(selectedCameraId);
    }
  }, [selectedCameraId]);

  // Manual lookup input handler
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    
    handleSuccessfulScan(manualInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/60 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
              <Camera className="h-4.5 w-4.5 animate-pulse" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Live Optical Scanner
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Align QR or Barcode in target focus zone
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-450 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Core Workspace Grid */}
        <div className="p-6 space-y-5">
          
          {/* Camera Viewfinder */}
          <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-350 dark:border-slate-750 overflow-hidden bg-slate-950 flex flex-col items-center justify-center text-center">
            
            {/* Real HTML5 QR Code hook */}
            <div 
              id={containerId} 
              className="absolute inset-0 w-full h-full object-cover [&_video]:object-cover"
            />

            {/* Laser scanning line overlay */}
            {isScannerActive && !scannedResult && (
              <div className="absolute inset-x-0 h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.8)] top-1/2 -translate-y-1/2 animate-[bounce_3s_infinite] z-10 pointer-events-none" />
            )}

            {/* Viewfinder corners decorative overlays */}
            {isScannerActive && !scannedResult && (
              <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl" />
                  <div className="w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr" />
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl" />
                  <div className="w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br" />
                </div>
              </div>
            )}

            {/* Error or Standby State Screen */}
            {(!isScannerActive || scannerError) && (
              <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 text-center gap-3">
                <AlertTriangle className="h-10 w-10 text-amber-500 animate-bounce" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Camera Scan Unavailable</h4>
                  <p className="text-[10.5px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                    {scannerError || "Initializing hardware optical device feed..."}
                  </p>
                </div>
                {cameras.length > 0 && (
                  <button
                    onClick={() => startScanner(selectedCameraId)}
                    className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry Connection
                  </button>
                )}
              </div>
            )}

            {/* Successful scan result screen */}
            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/95 z-20 flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">CODE ACQUIRED SUCCESSFULLY</h4>
                  <span className="inline-block mt-1 bg-black/40 text-emerald-400 font-mono text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                    {scannedResult}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setScannedResult('');
                    setFoundItem(null);
                    if (selectedCameraId) startScanner(selectedCameraId);
                  }}
                  className="mt-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Scan Another Label
                </button>
              </div>
            )}
          </div>

          {/* Camera selector, shown if multiple cameras are available */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-450 font-bold shrink-0">Switch Camera:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className={`flex-1 text-xs font-bold rounded-xl px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanned/Matched Product Details Sheet */}
          {scannedResult && (
            <div className={`p-4 rounded-2xl border animate-fadeIn transition-all ${
              foundItem 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-300' 
                : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-900 dark:text-indigo-300'
            }`}>
              {foundItem ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500 block">MATCHED ITEM CATALOG</span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{foundItem.name}</h4>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                      ON HAND
                    </span>
                  </div>

                  {/* Metadata spec columns */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">SKU Reference</span>
                      <span className="font-mono font-bold text-[10.5px] truncate block text-slate-700 dark:text-slate-350">{foundItem.sku}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">Total Stock</span>
                      <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 block">
                        {getItemStock(foundItem.id)} Units
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">Selling Price</span>
                      <span className="font-bold font-mono text-[11px] block text-slate-700 dark:text-slate-350">₹{foundItem.sellingPrice}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(foundItem, scannedResult);
                        onClose();
                      }}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                    >
                      <Check className="h-3.5 w-3.5" /> Auto-fill Stock Inflow Form
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-500 block">NEW LABEL DETECTED</span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">No matching item found</h4>
                    </div>
                    <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-500/20">
                      NEW SKU
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    This barcode tag is not currently assigned to any product SKU in the database. You can register a new hardware item directly using this scanned value!
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        // Create dummy shell item details
                        const itemTemplate: Item = {
                          id: '',
                          sku: scannedResult,
                          name: `New Item (${scannedResult.slice(-6)})`,
                          hsnCode: '8471',
                          reorderLevel: 20,
                          unitCost: 100,
                          sellingPrice: 135,
                          taxRate: 18
                        };
                        onSelectProduct(itemTemplate, scannedResult);
                        onClose();
                      }}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                    >
                      <Check className="h-3.5 w-3.5" /> Register Brand New Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backup manual barcode entry fallback */}
          <form onSubmit={handleManualSearch} className="border-t border-slate-200/50 dark:border-slate-800/60 pt-4">
            <label className="text-[9px] text-slate-450 uppercase font-bold block mb-1">
              Backup Input (Manual barcode lookup):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="e.g. SKU-8471-COREI7-001 or 8901234567890"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className={`w-full text-xs font-mono font-bold rounded-xl pl-3 pr-8 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                />
                <Search className="h-4 w-4 text-slate-400 absolute right-3 top-3" />
              </div>
              <button 
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
              >
                Lookup
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
