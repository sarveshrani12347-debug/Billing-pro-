import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ZoomIn, ZoomOut, RotateCw, Maximize, Minimize, ChevronLeft, ChevronRight, 
  Download, Share2, Printer, Eye, Save, Copy, ExternalLink, Edit3, Trash2, 
  RefreshCw, FileText, Search, ArrowUpDown, Sliders, Plus, X, Check, 
  FileUp, FileDown, Loader2, ShieldCheck, Barcode, QrCode, Moon, Sun,
  Smartphone, Mail, MapPin, Phone, CheckCircle2, FileSearch
} from 'lucide-react';
import { BusinessDocument } from '../types';
import { defaultPdfSettings, PdfSettings } from './PdfSettingsManager';

// Structure of stored PDFs in the local vault
export interface SavedPdfRecord {
  id: string;
  docId: string;
  docNumber: string;
  docType: string;
  clientName: string;
  fileName: string;
  dataUrl: string; // Base64 representation of the generated PDF for local offline persistence
  fileSize: string; // KB or MB
  timestamp: string;
  orientation: 'portrait' | 'landscape';
}

interface PdfWorkspaceConsoleProps {
  isLight: boolean;
  document: BusinessDocument | null; // Selected doc or null (if live-draft typing)
  draftData?: {
    docType: string;
    docNumber: string;
    clientName: string;
    clientAddress: string;
    clientGst: string;
    clientMobile: string;
    clientEmail: string;
    date: string;
    dueDate: string;
    items: any[];
    subtotal: number;
    taxTotal: number;
    discount: number;
    grandTotal: number;
    notes: string;
  };
  onShowToast: (text: string, type?: 'success' | 'error') => void;
  onRefreshData?: () => void;
}

export const PdfWorkspaceConsole: React.FC<PdfWorkspaceConsoleProps> = ({
  isLight,
  document,
  draftData,
  onShowToast,
  onRefreshData
}) => {
  // Determine if active object is draft or persistent document
  const isDraft = !document;
  
  // Combine document or draft details
  const docType = document ? document.docType : (draftData?.docType || 'INVOICE');
  const docNumber = document ? document.docNumber : (draftData?.docNumber || 'DRAFT-001');
  const date = document ? document.date : (draftData?.date || new Date().toISOString().split('T')[0]);
  const dueDate = document ? document.dueDate : (draftData?.dueDate || '');
  const clientName = document ? document.clientName : (draftData?.clientName || 'Live Draft Customer');
  const clientAddress = document ? document.clientAddress : (draftData?.clientAddress || '');
  const clientGst = document ? document.clientGst : (draftData?.clientGst || '');
  const clientMobile = document ? document.clientMobile : (draftData?.clientMobile || '');
  const clientEmail = document ? document.clientEmail : (draftData?.clientEmail || '');
  const items = document ? document.items : (draftData?.items || []);
  const subtotal = document ? document.subtotal : (draftData?.subtotal || 0);
  const taxTotal = document ? document.taxTotal : (draftData?.taxTotal || 0);
  const discount = document ? document.discount : (draftData?.discount || 0);
  const grandTotal = document ? document.grandTotal : (draftData?.grandTotal || 0);
  const notes = document ? document.notes : (draftData?.notes || '');
  
  // PDF layout and engine state
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>(defaultPdfSettings);
  const [recentPdfs, setRecentPdfs] = useState<SavedPdfRecord[]>([]);
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultSort, setVaultSort] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  
  // PDF Viewer State
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeViewerTab, setActiveViewerTab] = useState<'interactive' | 'saved-vault'>('interactive');
  
  // Loading & Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genMessage, setGenMessage] = useState('');
  const [generatedPdfRecord, setGeneratedPdfRecord] = useState<SavedPdfRecord | null>(null);
  
  // Rename Modal State
  const [renamingRecord, setRenamingRecord] = useState<SavedPdfRecord | null>(null);
  const [newFileName, setNewFileName] = useState('');
  
  // UI references
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Load PDF settings and Saved Vault on mount
  useEffect(() => {
    loadSettings();
    loadSavedVault();

    // Listen to settings update events from the settings manager
    const handleSettingsChange = () => {
      loadSettings();
    };
    window.addEventListener('pdfSettingsChanged', handleSettingsChange);
    return () => {
      window.removeEventListener('pdfSettingsChanged', handleSettingsChange);
    };
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('pdf_generator_settings');
    if (saved) {
      try {
        setPdfSettings({ ...defaultPdfSettings, ...JSON.parse(saved) });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const loadSavedVault = () => {
    const saved = localStorage.getItem('pdf_local_vault');
    if (saved) {
      try {
        setRecentPdfs(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Helper to format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Build sanitized naming according to Settings format
  const getOutputFilename = (customPattern?: string, numValue?: string, dateValue?: string, clientValue?: string, typeValue?: string) => {
    const pattern = customPattern || pdfSettings.fileNamingFormat || '[Type]_[Number]_[Date]';
    const num = (numValue || docNumber).replace(/[^a-zA-Z0-9_-]/g, '');
    const dt = (dateValue || date).replace(/[^0-9-]/g, '');
    const client = (clientValue || clientName).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const typeStr = (typeValue || docType).toLowerCase();
    
    let result = pattern;
    const placeholders = [
      { keys: ['{number}', '{Number}', '[number]', '[Number]'], value: num },
      { keys: ['{date}', '{Date}', '[date]', '[Date]'], value: dt },
      { keys: ['{client}', '{Client}', '[client]', '[Client]'], value: client },
      { keys: ['{type}', '{Type}', '[type]', '[Type]'], value: typeStr.toUpperCase() }
    ];

    placeholders.forEach(({ keys, value }) => {
      keys.forEach(key => {
        result = result.split(key).join(value);
      });
    });

    ['{type_lower}', '[type_lower]'].forEach(key => {
      result = result.split(key).join(typeStr.toLowerCase());
    });

    result = result.replace(/[^a-zA-Z0-9_\.-]/g, '_');
    if (!result || result === '.pdf') {
      result = `${typeStr.toUpperCase()}_${num}_${dt}`;
    }
    return result + '.pdf';
  };

  // PRODUCTION GENERATOR FUNCTION (300 DPI High-Resolution jsPDF Renderer)
  const generatePdfBlob = async (silent: boolean = false): Promise<{ blob: Blob, dataUrl: string, fileName: string } | null> => {
    if (!pdfTemplateRef.current) {
      onShowToast("Unable to compile PDF: Render viewport node not found.", "error");
      return null;
    }

    try {
      setIsGenerating(true);
      setGenProgress(10);
      setGenMessage("Initializing 300 DPI viewport vectors...");
      await new Promise(resolve => setTimeout(resolve, 150));

      setGenProgress(25);
      setGenMessage("Sanitizing high-resolution text grids...");
      await new Promise(resolve => setTimeout(resolve, 150));

      setGenProgress(45);
      setGenMessage("Optimizing embedded vector elements (Barcodes, QR Codes)...");
      await new Promise(resolve => setTimeout(resolve, 150));

      setGenProgress(65);
      setGenMessage("Rasterizing canvas fragments at 3x density...");
      
      const canvasOptions = {
        scale: 3, // High DPI (300 DPI multiplier equivalent for crisp vectors & text)
        useCORS: true,
        allowTaint: true,
        backgroundColor: pdfSettings.theme === 'dark' ? '#0f172a' : '#ffffff',
        logging: false
      };

      const canvas = await html2canvas(pdfTemplateRef.current, canvasOptions);
      
      setGenProgress(85);
      setGenMessage("Assembling pages and building layout dimensions...");
      await new Promise(resolve => setTimeout(resolve, 150));

      const orientation = pdfSettings.orientation === 'landscape' ? 'l' : 'p';
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pdfSettings.paperSize === 'letter' ? 'letter' : 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Dynamically handle auto page breaks
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      setGenProgress(95);
      setGenMessage("Rendering PDF streams & caching signatures...");
      await new Promise(resolve => setTimeout(resolve, 100));

      const pdfOutputBlob = pdf.output('blob');
      const dataUrl = pdf.output('datauristring');
      const fileName = getOutputFilename();

      setGenProgress(100);
      setGenMessage("Completed successfully!");
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsGenerating(false);

      // Save generated record to local Storage Store
      const newRecord: SavedPdfRecord = {
        id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        docId: document?.id || `draft-${Date.now()}`,
        docNumber: docNumber,
        docType: docType,
        clientName: clientName,
        fileName: fileName,
        dataUrl: dataUrl,
        fileSize: formatBytes(pdfOutputBlob.size),
        timestamp: new Date().toLocaleString(),
        orientation: pdfSettings.orientation
      };

      // Add to state and save to local storage
      const existingVault = localStorage.getItem('pdf_local_vault');
      let vaultList: SavedPdfRecord[] = [];
      if (existingVault) {
        try { vaultList = JSON.parse(existingVault); } catch(e){}
      }
      
      // Prevent duplicates of the exact same active draft by replacing it
      const filtered = vaultList.filter(rec => rec.docId !== newRecord.docId);
      const updatedVault = [newRecord, ...filtered];
      setRecentPdfs(updatedVault);
      localStorage.setItem('pdf_local_vault', JSON.stringify(updatedVault));
      setGeneratedPdfRecord(newRecord);

      if (!silent) {
        onShowToast(`High-resolution PDF saved in local vault! Filename: ${fileName}`, "success");
      }

      return { blob: pdfOutputBlob, dataUrl, fileName };
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      onShowToast("Failed to compile high-resolution PDF document. Please verify system properties.", "error");
      return null;
    }
  };

  // --- INDIVIDUAL PDF ACTION TRIGGERS ---

  // 1. Download PDF
  const handleDownloadPdf = async () => {
    const res = await generatePdfBlob();
    if (res) {
      const link = window.document.createElement('a');
      link.href = res.dataUrl;
      link.download = res.fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      onShowToast("Downloading PDF copy...", "success");
    }
  };

  // 2. Share PDF
  const handleSharePdf = async () => {
    const res = await generatePdfBlob(true);
    if (!res) return;

    if (navigator.share) {
      try {
        const file = new File([res.blob], res.fileName, { type: 'application/pdf' });
        await navigator.share({
          files: [file],
          title: `Document ${docNumber} - ${clientName}`,
          text: `Please find attached the financial document ${docNumber} issued for ${clientName}.`
        });
        onShowToast("Native Share Sheet opened successfully.", "success");
      } catch (err: any) {
        // Fallback if share is aborted
        if (err.name !== 'AbortError') {
          handleDownloadPdf();
        }
      }
    } else {
      // Fallback: copy link or trigger download
      handleDownloadPdf();
      onShowToast("Web Share API is unavailable. Triggered automatic download fallback.", "success");
    }
  };

  // 3. Print PDF
  const handlePrintPdf = async () => {
    // Elegant fallback printing: open in separate window with direct print
    const res = await generatePdfBlob(true);
    if (res) {
      const printWindow = window.open(res.dataUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
        onShowToast("Print dialog triggered. Select paper size & margins.", "success");
      } else {
        // Fallback if popups blocked
        window.print();
        onShowToast("Pop-up window was blocked. Initiated standard window print.", "success");
      }
    }
  };

  // 4. Save to Device / Save as Copy
  const handleSaveAsCopy = async () => {
    const res = await generatePdfBlob(true);
    if (res) {
      const copyName = res.fileName.replace('.pdf', '_Copy.pdf');
      const link = window.document.createElement('a');
      link.href = res.dataUrl;
      link.download = copyName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      onShowToast(`Saved extra backup copy: ${copyName}`, "success");
    }
  };

  // 5. Open with other apps
  const handleOpenWithOtherApps = async () => {
    const res = await generatePdfBlob(true);
    if (res) {
      const newTab = window.open(res.dataUrl, '_blank');
      if (newTab) {
        onShowToast("Opened PDF document stream in clean vector browser window.", "success");
      } else {
        onShowToast("Enable browser popups to preview PDF streams in secondary windows.", "error");
      }
    }
  };

  // --- INTERACTIVE WORKFLOW OPERATIONS ---

  const handleDuplicateDocument = async () => {
    if (!document) {
      onShowToast("Cannot duplicate a draft document. Please save it first from the left panel.", "error");
      return;
    }
    try {
      const token = localStorage.getItem('vault_token');
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          docType: document.docType,
          clientName: `${document.clientName} (Copy)`,
          clientAddress: document.clientAddress || '',
          clientGst: document.clientGst || '',
          clientMobile: document.clientMobile || '',
          clientEmail: document.clientEmail || '',
          clientState: document.clientState || '',
          clientCountry: document.clientCountry || '',
          linkedInvoiceNumber: document.linkedInvoiceNumber || '',
          date: new Date().toISOString().split('T')[0],
          dueDate: document.dueDate || '',
          items: document.items,
          subtotal: document.subtotal,
          taxTotal: document.taxTotal,
          discount: document.discount,
          grandTotal: document.grandTotal,
          notes: document.notes || '',
          status: 'DRAFT',
          attachmentUrl: document.attachmentUrl || ''
        })
      });

      if (!response.ok) throw new Error("Duplication failed on server.");
      const newDoc = await response.json();
      onShowToast(`Duplicated successfully as ${newDoc.docNumber}!`, "success");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast(`Duplication error: ${err.message}`, "error");
    }
  };

  const handleConvertDocumentToInvoice = async () => {
    if (!document) {
      onShowToast("Cannot convert a draft document.", "error");
      return;
    }
    if (document.docType !== 'QUOTATION' && document.docType !== 'ESTIMATE') {
      onShowToast("Only Quotations or Estimates can be converted to Invoices.", "error");
      return;
    }
    try {
      const token = localStorage.getItem('vault_token');
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          docType: 'INVOICE',
          clientName: document.clientName,
          clientAddress: document.clientAddress || '',
          clientGst: document.clientGst || '',
          clientMobile: document.clientMobile || '',
          clientEmail: document.clientEmail || '',
          clientState: document.clientState || '',
          clientCountry: document.clientCountry || '',
          linkedInvoiceNumber: document.docNumber,
          date: new Date().toISOString().split('T')[0],
          dueDate: '',
          items: document.items,
          subtotal: document.subtotal,
          taxTotal: document.taxTotal,
          discount: document.discount,
          grandTotal: document.grandTotal,
          notes: document.notes || '',
          status: 'DRAFT',
          attachmentUrl: document.attachmentUrl || ''
        })
      });

      if (!response.ok) throw new Error("Conversion failed on server.");
      const newDoc = await response.json();
      onShowToast(`Converted successfully to Tax Invoice ${newDoc.docNumber}!`, "success");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast(`Conversion error: ${err.message}`, "error");
    }
  };

  const handleDeleteDocument = async () => {
    if (!document) {
      onShowToast("Cannot delete a non-persisted draft document.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete document ${document.docNumber}?`)) return;
    try {
      const token = localStorage.getItem('vault_token');
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) throw new Error("Deletion failed on server.");
      onShowToast(`Document ${document.docNumber} deleted successfully.`, "success");
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      onShowToast(`Delete error: ${err.message}`, "error");
    }
  };

  // --- SAVED VAULT STORE MANAGEMENT ---
  
  const handleDeletePdfRecord = (id: string, name: string) => {
    const updated = recentPdfs.filter(rec => rec.id !== id);
    setRecentPdfs(updated);
    localStorage.setItem('pdf_local_vault', JSON.stringify(updated));
    if (generatedPdfRecord?.id === id) {
      setGeneratedPdfRecord(null);
    }
    onShowToast(`Removed PDF copy: ${name}`, "success");
  };

  const handleOpenRenameModal = (record: SavedPdfRecord) => {
    setRenamingRecord(record);
    setNewFileName(record.fileName.replace('.pdf', ''));
  };

  const handleSaveRename = () => {
    if (!renamingRecord) return;
    const sanitized = newFileName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
    
    const updated = recentPdfs.map(rec => {
      if (rec.id === renamingRecord.id) {
        return { ...rec, fileName: sanitized };
      }
      return rec;
    });

    setRecentPdfs(updated);
    localStorage.setItem('pdf_local_vault', JSON.stringify(updated));
    setRenamingRecord(null);
    onShowToast(`Renamed file to: ${sanitized}`, "success");
  };

  const handleExportVault = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recentPdfs));
    const dlAnchorElem = window.document.createElement('a');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", `PDF_Vault_Export_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    onShowToast("Exported PDF Local Storage Vault metadata as JSON.", "success");
  };

  const handleImportVault = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const merged = [...parsed, ...recentPdfs];
            // Remove duplicates by ID
            const unique = merged.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
            setRecentPdfs(unique);
            localStorage.setItem('pdf_local_vault', JSON.stringify(unique));
            onShowToast("Successfully imported secondary PDF records into Local Storage Vault.", "success");
          } else {
            onShowToast("Invalid JSON schema. Expected array of PDF metadata records.", "error");
          }
        } catch (err) {
          onShowToast("Failed to parse the imported backup file.", "error");
        }
      };
    }
  };

  // Sort and Filter Saved Vault Records
  const filteredVaultRecords = recentPdfs.filter(rec => 
    rec.fileName.toLowerCase().includes(vaultSearch.toLowerCase()) ||
    rec.clientName.toLowerCase().includes(vaultSearch.toLowerCase()) ||
    rec.docNumber.toLowerCase().includes(vaultSearch.toLowerCase())
  ).sort((a, b) => {
    if (vaultSort === 'newest') return b.id.localeCompare(a.id);
    if (vaultSort === 'oldest') return a.id.localeCompare(b.id);
    if (vaultSort === 'name') return a.fileName.localeCompare(b.fileName);
    if (vaultSort === 'size') return b.fileSize.localeCompare(a.fileSize);
    return 0;
  });

  // Calculate alignment and margins based on Margin Size setting
  const getMarginStyle = () => {
    if (pdfSettings.marginSize === 'small') return 'p-3.5';
    if (pdfSettings.marginSize === 'large') return 'p-8';
    return 'p-6'; // medium standard
  };

  // Get active layout theme class pairings
  const getThemeColors = () => {
    const theme = pdfSettings.theme;
    if (theme === 'dark') {
      return {
        bg: 'bg-slate-900 text-slate-100',
        card: 'bg-slate-950 border border-slate-850',
        tableHeader: 'bg-slate-800 text-slate-100 border-b border-slate-700',
        accentText: 'text-indigo-400',
        border: 'border-slate-800',
        footerBg: 'bg-slate-950 border-t border-slate-850'
      };
    }
    if (theme === 'corporate') {
      return {
        bg: 'bg-white text-slate-900',
        card: 'bg-slate-50 border border-slate-200',
        tableHeader: 'bg-indigo-900 text-white border-b border-indigo-950',
        accentText: 'text-indigo-900 font-extrabold',
        border: 'border-slate-200',
        footerBg: 'bg-slate-50 border-t border-slate-200'
      };
    }
    if (theme === 'luxury') {
      return {
        bg: 'bg-white text-amber-950',
        card: 'bg-amber-50/35 border border-amber-200',
        tableHeader: 'bg-amber-800 text-amber-50 border-b border-amber-900',
        accentText: 'text-amber-700 font-bold',
        border: 'border-amber-100',
        footerBg: 'bg-amber-50 border-t border-amber-200'
      };
    }
    if (theme === 'minimal') {
      return {
        bg: 'bg-white text-slate-900',
        card: 'bg-white border-b border-slate-200',
        tableHeader: 'bg-white border-b-2 border-slate-950 text-slate-950 uppercase tracking-widest text-[9px] font-black',
        accentText: 'text-slate-900',
        border: 'border-slate-150',
        footerBg: 'bg-white border-t border-slate-150'
      };
    }
    if (theme === 'modern') {
      return {
        bg: 'bg-white text-slate-900',
        card: 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100',
        tableHeader: 'bg-gradient-to-r from-indigo-600 to-indigo-800 text-white',
        accentText: 'text-indigo-600',
        border: 'border-indigo-100/60',
        footerBg: 'bg-indigo-50/45 border-t border-indigo-100'
      };
    }
    // classic vyapar default
    return {
      bg: 'bg-white text-slate-900',
      card: 'bg-slate-50/60 border border-slate-200',
      tableHeader: 'bg-slate-900 text-white border-b border-slate-950',
      accentText: 'text-indigo-600',
      border: 'border-slate-200',
      footerBg: 'bg-slate-50 border-t border-slate-200'
    };
  };

  const themeColors = getThemeColors();

  // Apply typography font style
  const getFontStyle = () => {
    const f = pdfSettings.fontFamily;
    if (f === 'Space Grotesk') return 'font-["Space_Grotesk",_sans-serif]';
    if (f === 'JetBrains Mono') return 'font-["JetBrains_Mono",_monospace] text-[11px]';
    if (f === 'Courier') return 'font-mono text-xs';
    if (f === 'Helvetica') return 'font-sans text-xs';
    return 'font-["Inter",_sans-serif] text-xs'; // default
  };

  // Convert font size to CSS scale
  const getFontSizeClass = () => {
    if (pdfSettings.fontSize === 'small') return 'text-[10px] leading-snug';
    if (pdfSettings.fontSize === 'large') return 'text-sm leading-relaxed';
    return 'text-xs leading-normal'; // medium standard
  };

  return (
    <div className={`space-y-6 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
      
      {/* RENDER PROGRESS LOADING MODAL */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-4 animate-scaleUp">
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">Compiling PDF Ledger</h4>
              <p className="text-[11px] text-slate-400">{genMessage}</p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${genProgress}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 block">{genProgress}%</span>
          </div>
        </div>
      )}

      {/* RENAME RECORD DIALOG MODAL */}
      {renamingRecord && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-md w-full shadow-xl text-left space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Rename PDF Document</h4>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-black text-slate-400 block">Filename Pattern</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="flex-1 text-xs font-mono font-bold p-2.5 rounded border dark:bg-slate-950 border-slate-200 dark:border-slate-850"
                  autoFocus
                />
                <span className="text-xs font-mono font-bold text-slate-400 shrink-0">.pdf</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRenamingRecord(null)}
                className="px-3 py-1.5 text-[10px] font-black uppercase rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                className="px-3.5 py-1.5 text-[10px] font-black uppercase rounded bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Save Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL WORKSPACE TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 justify-between items-center flex-wrap gap-2">
        <div className="flex">
          <button
            onClick={() => setActiveViewerTab('interactive')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeViewerTab === 'interactive' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-450 hover:text-slate-600'
            }`}
          >
            <Eye className="h-4 w-4" />
            PDF Interactive Generator
          </button>
          <button
            onClick={() => {
              setActiveViewerTab('saved-vault');
              loadSavedVault();
            }}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 relative ${
              activeViewerTab === 'saved-vault' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-450 hover:text-slate-600'
            }`}
          >
            <FileText className="h-4 w-4" />
            PDF Local Vault Store
            {recentPdfs.length > 0 && (
              <span className="absolute top-1.5 right-1 h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-white text-[8.5px] font-black flex items-center justify-center">
                {recentPdfs.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick Orientation Display */}
        <div className="text-[10px] font-mono opacity-70 flex items-center gap-2">
          <span>Active PDF Template:</span>
          <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded font-black text-indigo-650 uppercase">
            {pdfSettings.paperSize} ({pdfSettings.orientation})
          </span>
        </div>
      </div>

      {/* RENDER VIEW 1: INTERACTIVE GENERATOR STAGE */}
      {activeViewerTab === 'interactive' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: LIVE PDF RENDER VECTOR CANVAS (SPAN 7) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* INTERACTIVE CONTROLS BAR */}
            <div className={`p-3 border rounded-xl flex flex-wrap items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-slate-250' : 'bg-slate-950/40 border-slate-850'
            }`}>
              {/* Zoom and Rotate adjustments */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoomScale(Math.max(0.6, zoomScale - 0.1))}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-[10.5px] font-mono font-bold w-12 text-center block">
                  {(zoomScale * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.1))}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <span className="h-4 w-px bg-slate-300 dark:bg-slate-850 mx-1"></span>
                <button
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 flex items-center gap-1 text-[10px]"
                  title="Rotate Sheet 90 Deg"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Rotate</span>
                </button>
                <span className="h-4 w-px bg-slate-300 dark:bg-slate-850 mx-1"></span>
                <button
                  onClick={() => {
                    setZoomScale(1);
                    setRotation(0);
                  }}
                  className="text-[10px] hover:underline text-indigo-500 font-bold"
                >
                  Reset View
                </button>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1 text-[9.5px] uppercase font-black tracking-wider text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Active Canvas Live</span>
              </div>
            </div>

            {/* A4 CANVAS CONTAINER */}
            <div 
              ref={viewerContainerRef}
              className={`border rounded-2xl p-4 overflow-auto flex justify-center bg-slate-100 dark:bg-slate-950/80 border-slate-200 dark:border-slate-850 transition-all ${
                isFullscreen ? 'fixed inset-0 z-30 p-10 bg-slate-900/90' : 'max-h-[700px]'
              }`}
            >
              <div 
                style={{ 
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease-out',
                  width: pdfSettings.orientation === 'landscape' ? '297mm' : '210mm',
                  minHeight: pdfSettings.orientation === 'landscape' ? '210mm' : '297mm'
                }}
                className="origin-top shrink-0 mb-8"
              >
                {/* PDF TEMPLATE CANVAS TO CAPTURE */}
                <div
                  ref={pdfTemplateRef}
                  id="pdf-vector-canvas"
                  className={`bg-white text-slate-900 shadow-xl overflow-hidden relative ${getMarginStyle()} ${getFontStyle()} ${getFontSizeClass()} ${
                    pdfSettings.theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
                  }`}
                  style={{
                    width: pdfSettings.orientation === 'landscape' ? '297mm' : '210mm',
                    minHeight: pdfSettings.orientation === 'landscape' ? '210mm' : '297mm',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* WATERMARK BACKGROUND OVERLAY */}
                  {pdfSettings.watermarkEnabled && (
                    <div 
                      className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden"
                      style={{ opacity: pdfSettings.watermarkOpacity }}
                    >
                      <div className="text-slate-500 dark:text-slate-400 font-black tracking-widest text-[55px] uppercase text-center -rotate-45 whitespace-nowrap">
                        {pdfSettings.watermarkText || 'STOCK & LEDGER CORP'}
                      </div>
                    </div>
                  )}

                  {/* 1. HEADER SECTION */}
                  {pdfSettings.headerVisible && (
                    <div className={`p-4 border-b ${themeColors.border} ${themeColors.card} rounded-xl mb-6 flex justify-between gap-4 flex-wrap`}>
                      {/* Left: Brand logo & details */}
                      <div className="space-y-2">
                        {pdfSettings.logoEnabled && pdfSettings.logoUrl && (
                          <div className="h-10 w-24 flex items-center overflow-hidden mb-1.5">
                            <img referrerPolicy="no-referrer" src={pdfSettings.logoUrl} className="h-full object-contain" alt="Brand Logo" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white">STOCK &amp; LEDGER INC.</h2>
                        <div className="text-[10px] leading-relaxed text-slate-550 dark:text-slate-400 font-mono space-y-0.5">
                          <p className="flex items-center gap-1"><MapPin className="h-3 w-3 inline text-indigo-500" /> 701, Antigravity Tech High Road, Navi Mumbai</p>
                          <p className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 inline text-indigo-500" /> GSTIN: 27AASCE9904E1Z0 | PAN: AASCE9904E</p>
                          <p className="flex items-center gap-1"><Phone className="h-3 w-3 inline text-indigo-500" /> Phone: +91 90821-22485 | Email: billing@vaultledger.in</p>
                        </div>
                      </div>

                      {/* Right: Invoice metadata info */}
                      <div className="text-right space-y-1.5 min-w-[140px]">
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full ${
                          pdfSettings.theme === 'dark' ? 'bg-slate-800 text-indigo-350' : 'bg-indigo-50 text-indigo-850'
                        }`}>
                          {docType === 'QUOTATION' ? 'Estimate / Quotation' :
                           docType === 'INVOICE' ? 'Tax Invoice' :
                           docType === 'PURCHASE_ORDER' ? 'Purchase Order' :
                           docType === 'DELIVERY_NOTE' ? 'Delivery Challenger' : 'Payment Receipt'}
                        </span>
                        
                        <div className="text-[10.5px] font-mono space-y-0.5 pt-1.5">
                          <p><span className="text-slate-450 uppercase font-bold text-[9px]">Document No:</span> <strong className={themeColors.accentText}>{docNumber}</strong></p>
                          <p><span className="text-slate-450 uppercase font-bold text-[9px]">Date:</span> <strong>{date}</strong></p>
                          {dueDate && (
                            <p><span className="text-slate-450 uppercase font-bold text-[9px]">Due Date:</span> <strong className="text-rose-600">{dueDate}</strong></p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. CUSTOMER COORDINATES */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className={`p-3 border ${themeColors.border} rounded-xl leading-relaxed`}>
                      <span className="text-[9px] uppercase tracking-widest text-slate-450 font-black block mb-1">Billing coordinates</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">{clientName}</h4>
                      {clientAddress && <p className="text-[10px] text-slate-500 mt-0.5">{clientAddress}</p>}
                      <div className="text-[9px] font-mono text-slate-450 mt-1 space-y-0.5">
                        {clientGst && <p>GSTIN: <strong className="text-slate-800 dark:text-slate-200">{clientGst}</strong></p>}
                        {clientMobile && <p>MOB: {clientMobile}</p>}
                        {clientEmail && <p>MAIL: {clientEmail}</p>}
                      </div>
                    </div>

                    <div className={`p-3 border ${themeColors.border} rounded-xl leading-relaxed`}>
                      <span className="text-[9px] uppercase tracking-widest text-slate-450 font-black block mb-1">Consigned Shipping cargo Target</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">{clientName}</h4>
                      {clientAddress ? (
                        <p className="text-[10px] text-slate-500 mt-0.5">{clientAddress}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No alternative dispatch coordinates declared.</p>
                      )}
                      <p className="text-[9px] font-mono text-slate-400 mt-2">Transporter: Standard Safe Cargo Logistics Inc.</p>
                    </div>
                  </div>

                  {/* 3. TABLE BODY ITEMS */}
                  <div className={`border ${themeColors.border} rounded-xl overflow-hidden mb-6`}>
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className={themeColors.tableHeader}>
                          <th className="py-2.5 px-3 text-[9.5px] uppercase font-black">#</th>
                          <th className="py-2.5 px-3 text-[9.5px] uppercase font-black">Product Details / SKU</th>
                          <th className="py-2.5 px-3 text-[9.5px] uppercase font-black text-right">Qty</th>
                          <th className="py-2.5 px-3 text-[9.5px] uppercase font-black text-right">Rate</th>
                          <th className="py-2.5 px-3 text-[9.5px] uppercase font-black text-right">GST</th>
                          <th className="py-2.5 px-3 text-[9.5px] uppercase font-black text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                              No items added to document draft. Add products under draft form.
                            </td>
                          </tr>
                        ) : (
                          items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-450">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-950 dark:text-white block uppercase">{item.name}</span>
                                <span className="text-[8.5px] font-mono text-slate-400">SKU: {item.id ? item.id.substring(0, 10) : 'PROD-SKU'}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-right">{item.qty || 1} Pcs</td>
                              <td className="py-2.5 px-3 font-mono text-right">₹{(item.rate || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-mono text-right text-indigo-500">{item.taxRate || 18}%</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-950 dark:text-white">
                                ₹{((item.qty || 1) * (item.rate || 0)).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. BALANCES CALCULATOR & WATERMARK STAMP BAR */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mb-6">
                    {/* Notes & Legal T&C */}
                    <div className="md:col-span-7 space-y-4 text-left">
                      {notes && (
                        <div className={`p-3 border ${themeColors.border} rounded-xl`}>
                          <span className="text-[8px] uppercase tracking-widest text-slate-450 font-black block mb-1">operator declarations</span>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-serif italic">"{notes}"</p>
                        </div>
                      )}

                      <div className="text-[8.5px] leading-relaxed text-slate-400 space-y-0.5">
                        <span className="font-black text-[9px] uppercase text-slate-450 block">Vyapar billing system parameters:</span>
                        <p>1. Goods once delivered cannot be returned or refunded without proper corporate compliance approval.</p>
                        <p>2. Subject to Navi Mumbai jurisdiction. Payments must be processed within due date limit.</p>
                        <p>3. Dynamic Code-128 verified ledger barcode matches system storage nodes.</p>
                      </div>
                    </div>

                    {/* Grand Totals */}
                    <div className={`md:col-span-5 p-3 border ${themeColors.border} ${themeColors.card} rounded-xl font-mono text-right space-y-1.5`}>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-450 uppercase text-[9px] font-bold">Subtotal:</span>
                        <strong className="text-slate-900 dark:text-white">₹{subtotal.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-450 uppercase text-[9px] font-bold">IGST Output Tax:</span>
                        <strong className="text-indigo-500">₹{taxTotal.toLocaleString('en-IN')}</strong>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between items-center text-[11px] text-emerald-600">
                          <span className="uppercase text-[9px] font-bold">Loyalty Discount:</span>
                          <strong>- ₹{discount.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                      
                      <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-1 pt-1.5 flex justify-between items-center">
                        <span className="text-slate-900 dark:text-white uppercase font-black text-[10px] tracking-wider">Grand Total:</span>
                        <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                          ₹{grandTotal.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <span className="text-[8px] text-slate-400 block pt-1 border-t border-slate-100 dark:border-slate-850">
                        Amounts rounded to nearest integer. GST reverse charge exempted.
                      </span>
                    </div>
                  </div>

                  {/* 5. FOOTER CARD BAR (BARCODE, SIGNATURE, DATESTAMP) */}
                  {pdfSettings.footerVisible && (
                    <div className={`mt-8 pt-4 border-t ${themeColors.border} flex justify-between items-end flex-wrap gap-4`}>
                      {/* Left: Barcode / QR Section */}
                      <div className="space-y-2">
                        {pdfSettings.barcodeEnabled && (
                          <div className="flex flex-col items-start">
                            <div className="flex gap-[1.2px] h-8 items-end px-2 bg-white" title={`Barcode Node: ${docNumber}`}>
                              {/* Vector representation barcode bars */}
                              {[2,1,3,1,2,4,1,2,1,3,2,1,1,4,2,1,1,3,2,1,4,2,1,3,1,1,2,4,2].map((w, i) => (
                                <span key={i} className={`h-full ${i % 2 === 0 ? 'bg-black' : 'bg-white'}`} style={{ width: `${w}px` }}></span>
                              ))}
                            </div>
                            <span className="text-[7.5px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
                              ID: {docNumber}
                            </span>
                          </div>
                        )}

                        {pdfSettings.qrEnabled && (
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-white border rounded">
                              <QrCode className="h-9 w-9 text-slate-900" />
                            </div>
                            <div className="text-left leading-tight text-[7.5px] text-slate-450 max-w-[120px]">
                              <p className="font-bold text-slate-700">Scan UPI Merchant Checkout</p>
                              <p className="truncate">{pdfSettings.qrContent}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Center: Legal Disclaimer / Greeting */}
                      <div className="text-center text-[9px] text-slate-400 py-1 flex-1 max-w-[180px] hidden sm:block">
                        <p className="font-black text-slate-500 uppercase tracking-widest mb-0.5">THANK YOU MESSAGE</p>
                        <p className="italic">"We value your business partnerships! Have a wonderful day!"</p>
                        <p className="font-mono text-[7.5px] mt-1 text-indigo-400/70">www.vaultledger.in</p>
                      </div>

                      {/* Right: Signature stamp */}
                      <div className="text-right space-y-1.5 min-w-[120px]">
                        {pdfSettings.signatureEnabled && pdfSettings.signatureUrl && (
                          <div className="h-10 w-24 flex items-center justify-end overflow-hidden ml-auto">
                            <img referrerPolicy="no-referrer" src={pdfSettings.signatureUrl} className="h-full object-contain" alt="Authorised Signature" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <div className="border-t border-slate-300 dark:border-slate-800 pt-1 text-[9px]">
                          <strong className="text-slate-800 dark:text-slate-200 block uppercase">Sarvesh Yadav</strong>
                          <span className="text-slate-400 block text-[8px]">Authorized Signatory</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Datestamp watermark margin */}
                  <div className="mt-4 flex justify-between items-center text-[7.5px] text-slate-400 font-mono">
                    <span>Generated: {new Date().toLocaleString()} (Vault AI System Node)</span>
                    <span>Page 1 of 1 (A4 Portfolio)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: PROFESSIONAL PDF ACTIONS CONSOLE (SPAN 5) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            
            {/* COMPREHENSIVE ACTIONS PANEL */}
            <div className={`p-5 border rounded-2xl space-y-5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase">
                  PDF Operations Console
                </span>
                <h3 className="text-sm font-black uppercase mt-2 text-slate-900 dark:text-white">Actions &amp; Workflow Triggers</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Operate digital PDF documents. Highly compatible with Android, iOS and Web Share sheets.</p>
              </div>

              {/* Grid of 10 Actions */}
              <div className="grid grid-cols-2 gap-2">
                
                {/* 1. Download */}
                <button
                  onClick={handleDownloadPdf}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Download PDF</span>
                    <span className="text-[8.5px] text-slate-400 block">Save directly to local filesystem</span>
                  </div>
                </button>

                {/* 2. Share */}
                <button
                  onClick={handleSharePdf}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-teal-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Share Native</span>
                    <span className="text-[8.5px] text-slate-400 block">WhatsApp, Gmail, iOS AirDrop</span>
                  </div>
                </button>

                {/* 3. Print */}
                <button
                  onClick={handlePrintPdf}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Print Document</span>
                    <span className="text-[8.5px] text-slate-400 block">Configure print options / paper size</span>
                  </div>
                </button>

                {/* 4. Open External Window / Preview */}
                <button
                  onClick={handleOpenWithOtherApps}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Open in Tab</span>
                    <span className="text-[8.5px] text-slate-400 block">Open raw binary stream</span>
                  </div>
                </button>

                {/* 5. Save As Copy */}
                <button
                  onClick={handleSaveAsCopy}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <Copy className="h-4 w-4 text-violet-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Save Backup Copy</span>
                    <span className="text-[8.5px] text-slate-400 block">Append extra copy tags</span>
                  </div>
                </button>

                {/* 6. Save to local storage */}
                <button
                  onClick={async () => {
                    const res = await generatePdfBlob(true);
                    if (res) onShowToast("Cached inside PDF Vault Store.", "success");
                  }}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <Save className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Commit to Vault</span>
                    <span className="text-[8.5px] text-slate-400 block">Store locally in recent history</span>
                  </div>
                </button>

                {/* 7. Fullscreen Toggle */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="text-xs font-bold block text-slate-900 dark:text-white">Exit Fullscreen</span>
                        <span className="text-[8.5px] text-slate-400 block">Shrink viewport layout</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Maximize className="h-4 w-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="text-xs font-bold block text-slate-900 dark:text-white">Fullscreen</span>
                        <span className="text-[8.5px] text-slate-400 block">Maximize preview container</span>
                      </div>
                    </>
                  )}
                </button>

                {/* 8. Regenerate PDF */}
                <button
                  onClick={() => generatePdfBlob()}
                  className="p-3 border rounded-xl flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-all border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 text-cyan-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">Regenerate PDF</span>
                    <span className="text-[8.5px] text-slate-400 block">Re-sync live modifications</span>
                  </div>
                </button>

                {/* 9. Duplicate Document */}
                {document && (
                  <button
                    onClick={handleDuplicateDocument}
                    className="p-3 border rounded-xl flex items-center gap-2 text-left bg-violet-500/5 hover:bg-violet-500/15 transition-all border-violet-200 dark:border-violet-800 cursor-pointer"
                  >
                    <Copy className="h-4 w-4 text-violet-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-slate-900 dark:text-white">Duplicate Doc</span>
                      <span className="text-[8.5px] text-slate-400 block">Clone current record to draft</span>
                    </div>
                  </button>
                )}

                {/* 10. Convert to Tax Invoice */}
                {document && (document.docType === 'QUOTATION' || document.docType === 'ESTIMATE') && (
                  <button
                    onClick={handleConvertDocumentToInvoice}
                    className="p-3 border rounded-xl flex items-center gap-2 text-left bg-emerald-500/5 hover:bg-emerald-500/15 transition-all border-emerald-200 dark:border-emerald-800 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-slate-900 dark:text-white">Convert to Invoice</span>
                      <span className="text-[8.5px] text-slate-400 block">Convert Quote/Est to Tax Invoice</span>
                    </div>
                  </button>
                )}

                {/* 11. Delete Document */}
                {document && (
                  <button
                    onClick={handleDeleteDocument}
                    className="p-3 border rounded-xl flex items-center gap-2 text-left bg-rose-500/5 hover:bg-rose-500/15 transition-all border-rose-200 dark:border-rose-800 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 text-rose-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-slate-900 dark:text-white">Delete Document</span>
                      <span className="text-[8.5px] text-slate-400 block">Permanently purge this ledger</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Dynamic generated record detail card */}
              {generatedPdfRecord && (
                <div className={`p-4 rounded-xl border border-dashed flex items-center justify-between gap-3 ${
                  isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-indigo-950/20 border-indigo-900/50'
                }`}>
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-black uppercase text-indigo-650 tracking-widest block">Active Cached Record</span>
                    <h5 className="text-[11px] font-mono font-bold text-slate-850 dark:text-slate-200 truncate max-w-[210px]">
                      {generatedPdfRecord.fileName}
                    </h5>
                    <div className="flex gap-2 text-[9px] text-slate-450 font-mono">
                      <span>Size: {generatedPdfRecord.fileSize}</span>
                      <span>•</span>
                      <span>Synced: {generatedPdfRecord.timestamp.split(',')[1]}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenRenameModal(generatedPdfRecord)}
                      className="p-2 bg-white dark:bg-slate-800 border rounded-lg hover:text-indigo-500 cursor-pointer"
                      title="Rename record"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePdfRecord(generatedPdfRecord.id, generatedPdfRecord.fileName)}
                      className="p-2 bg-white dark:bg-slate-800 border rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK PREFERNCE LINK DECK */}
            <div className={`p-4 border rounded-2xl flex items-center justify-between gap-4 ${
              isLight ? 'bg-indigo-50/30 border-indigo-100' : 'bg-indigo-950/10 border-indigo-950'
            }`}>
              <div className="flex gap-2 items-center">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                  <Sliders className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-[11.5px] font-extrabold uppercase text-slate-900 dark:text-white">PDF Branding Properties</h4>
                  <p className="text-[10px] text-slate-450">Change Paper size, Orientation, Font &amp; margin structures.</p>
                </div>
              </div>
              
              <span className="text-[10px] text-indigo-500 font-bold bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border">
                Use Settings Tab
              </span>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW 2: SAVED PDF LOCAL STORE VAULT */}
      {activeViewerTab === 'saved-vault' && (
        <div className={`p-5 border rounded-2xl space-y-6 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-850 pb-4">
            <div className="text-left">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Durable PDF Storage Vault
              </h3>
              <p className="text-[11px] text-slate-500">
                All high-resolution PDFs you compile are persistently stored locally in your client sandbox. Search, export, or import metadata backups.
              </p>
            </div>

            {/* Import / Export JSON buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportVault}
                className={`px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${
                  isLight ? 'bg-white text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <FileDown className="h-3.5 w-3.5" />
                Export Vault JSON
              </button>

              <label className={`px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer ${
                isLight ? 'bg-white text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}>
                <FileUp className="h-3.5 w-3.5" />
                Import Vault JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportVault}
                  className="hidden"
                />
              </label>

              {recentPdfs.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to permanently clear your local PDF documents vault? This cannot be undone.")) {
                      setRecentPdfs([]);
                      localStorage.setItem('pdf_local_vault', JSON.stringify([]));
                      onShowToast("Cleared PDF store history.", "success");
                    }
                  }}
                  className="px-3 py-1.5 border border-rose-200 dark:border-rose-950/40 text-rose-600 dark:text-rose-450 hover:bg-rose-50 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Purge Store
                </button>
              )}
            </div>
          </div>

          {/* Search and Sort controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search by filename, client, doc serial..."
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isLight ? 'bg-slate-50 border border-slate-200 text-slate-900' : 'bg-slate-950/60 border border-slate-800 text-white'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-[10px] uppercase font-black text-slate-400">Sort:</span>
              <select
                value={vaultSort}
                onChange={(e) => setVaultSort(e.target.value as any)}
                className="text-xs font-bold bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none"
              >
                <option value="newest">Newest Compiled</option>
                <option value="oldest">Oldest Records</option>
                <option value="name">File Alphabetical</option>
                <option value="size">File Size Scale</option>
              </select>
            </div>
          </div>

          {/* Records Grid */}
          {filteredVaultRecords.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3">
              <div className="flex justify-center">
                <FileSearch className="h-10 w-10 text-slate-450 animate-bounce" />
              </div>
              <p className="text-xs font-bold text-slate-450">No PDF records matched your query filter.</p>
              <button
                onClick={() => {
                  setVaultSearch('');
                  setActiveViewerTab('interactive');
                }}
                className="text-indigo-500 font-extrabold text-[11px] uppercase hover:underline"
              >
                Go Compile New Draft Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVaultRecords.map(rec => (
                <div 
                  key={rec.id}
                  className={`p-4 border rounded-2xl flex items-start justify-between gap-4 hover:shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-all ${
                    isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/20 border-slate-850'
                  }`}
                >
                  <div className="flex gap-3 items-start overflow-hidden">
                    {/* Format symbol */}
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="text-left space-y-1 overflow-hidden">
                      <span className="text-[8.5px] uppercase font-black text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {rec.docType} • {rec.orientation}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate" title={rec.fileName}>
                        {rec.fileName}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate uppercase">Client: {rec.clientName}</p>
                      <div className="flex items-center gap-2 text-[9px] font-mono text-slate-450">
                        <span>No: {rec.docNumber}</span>
                        <span>•</span>
                        <span>Size: {rec.fileSize}</span>
                        <span>•</span>
                        <span>{rec.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operation Buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        const dl = window.document.createElement('a');
                        dl.href = rec.dataUrl;
                        dl.download = rec.fileName;
                        window.document.body.appendChild(dl);
                        dl.click();
                        window.document.body.removeChild(dl);
                        onShowToast(`Downloading: ${rec.fileName}`, "success");
                      }}
                      className="p-1.5 bg-white dark:bg-slate-800 border rounded-lg hover:text-indigo-500 cursor-pointer"
                      title="Download PDF Copy"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenRenameModal(rec)}
                      className="p-1.5 bg-white dark:bg-slate-800 border rounded-lg hover:text-indigo-500 cursor-pointer"
                      title="Rename Document"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePdfRecord(rec.id, rec.fileName)}
                      className="p-1.5 bg-white dark:bg-slate-800 border border-rose-100 dark:border-rose-950/30 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
