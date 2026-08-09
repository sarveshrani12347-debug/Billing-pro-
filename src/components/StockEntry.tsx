import React, { useState, useEffect } from 'react';
import { 
  Upload, Search, FileText, CheckCircle2, TrendingUp, AlertCircle, 
  Plus, DollarSign, Download, ArrowUpRight, ArrowDownRight, RefreshCw,
  FolderMinus, FileSpreadsheet, Eye, HardDrive, AlertTriangle, Building, Tag, Layers,
  Sun, Moon, PanelLeft, PlusCircle, Check, Loader2, HelpCircle, Printer, Trash2,
  Bell, Sliders, CheckCheck, QrCode, Copy, Share2, Edit2, X, Laptop,
  ChevronDown, SlidersHorizontal
} from 'lucide-react';
import { Item, Godown, StockTransaction, User, safeConfirm } from '../types';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { StockMovementTimelineChart } from './StockMovementTimelineChart';
import { PdfProgressOverlay } from './PdfProgressOverlay';

interface StockEntryProps {
  items: Item[];
  godowns: Godown[];
  transactions: StockTransaction[];
  user: User | null;
  token: string;
  isLight: boolean;
  refreshAllData: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  hsnCatalog: Record<string, { desc: string, rate: number }>;
  demoInvoices: any[];
  units?: string[];
  unitMappings?: Array<{ fromUnit: string; toUnit: string }>;
  initialFilesToParse?: FileList | null;
  onClearInitialFiles?: () => void;
}

export function StockEntry({
  items,
  godowns,
  transactions,
  user,
  token,
  isLight,
  refreshAllData,
  showToast,
  hsnCatalog,
  demoInvoices,
  units = [],
  unitMappings = [],
  initialFilesToParse,
  onClearInitialFiles
}: StockEntryProps) {
  const [activeSegment, setActiveSegment] = useState<'ai' | 'manual'>('ai');
  
  // --- STATE FOR OPTION 1: AI SCAN ---
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (initialFilesToParse && initialFilesToParse.length > 0) {
      handleUploadedFiles(initialFilesToParse);
      if (onClearInitialFiles) {
        onClearInitialFiles();
      }
    }
  }, [initialFilesToParse]);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  
  // Bulk and Validation States
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, successCount: 0, failedCount: 0 });
  const [bulkErrorLogs, setBulkErrorLogs] = useState<Array<{ fileName: string; error: string }>>([]);
  const [extractedInvoices, setExtractedInvoices] = useState<Array<{
    id: string;
    fileName: string;
    vendorName: string;
    invoiceNumber: string;
    date: string;
    gstNumber?: string;
    totalAmount: number;
    confidenceScore: number;
    lineItems: Array<{
      itemName: string;
      hsnCode: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      taxRate: number;
      totalAmount: number;
      batchNumber: string;
      expiryDate: string;
      length?: string;
      width?: string;
      height?: string;
      thickness?: string;
      diameter?: string;
      gauge?: string;
      size?: string;
      dimension?: string;
      weight?: string;
      volume?: string;
      isCoil?: boolean;
      coilInfo?: any;
    }>;
    validationAlerts: Array<{
      field: string;
      severity: 'error' | 'warning';
      message: string;
    }>;
  }>>([]);
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [approvedNewUnits, setApprovedNewUnits] = useState<string[]>([]);

  const getUnrecognizedUnits = (invoice: any) => {
    if (!invoice || !invoice.lineItems) return [];
    const standardUnitsLower = (units || []).map(u => u.toLowerCase());
    const UOM_STANDARD_MAPPING: Record<string, string> = {
      'mtr': 'Meter', 'm': 'Meter', 'meter': 'Meter', 'meters': 'Meter',
      'pcs': 'Piece', 'pc': 'Piece', 'piece': 'Piece', 'pieces': 'Piece',
      'nos': 'Numbers', 'no': 'Numbers', 'number': 'Numbers', 'numbers': 'Numbers',
      'ft': 'Feet', 'feet': 'Feet', 'foot': 'Feet',
      'sqft': 'Square Feet', 'sq-ft': 'Square Feet', 'square feet': 'Square Feet',
      'sqm': 'Square Meter', 'sq-m': 'Square Meter', 'square meter': 'Square Meter', 'square meters': 'Square Meter',
      'roll': 'Roll', 'rolls': 'Roll',
      'coil': 'Coil', 'coils': 'Coil',
      'box': 'Box', 'boxes': 'Box',
      'bundle': 'Bundle', 'bundles': 'Bundle',
      'packet': 'Packet', 'packets': 'Packet', 'pkt': 'Packet',
      'set': 'Set', 'sets': 'Set',
      'sheet': 'Sheet', 'sheets': 'Sheet',
      'kg': 'Kg', 'kgs': 'Kg', 'kilogram': 'Kg', 'kilograms': 'Kg',
      'gram': 'Gram', 'grams': 'Gram', 'g': 'Gram',
      'ton': 'Ton', 'tons': 'Ton',
      'liter': 'Liter', 'liters': 'Liter', 'ltr': 'Liter', 'ltrs': 'Liter', 'l': 'Liter',
      'ml': 'Milliliter', 'milliliter': 'Milliliter', 'milliliters': 'Milliliter',
      'inch': 'Inch', 'inches': 'Inch', 'in': 'Inch',
      'cubic meter': 'Cubic Meter', 'cbm': 'Cubic Meter',
      'bag': 'Bag', 'bags': 'Bag',
      'carton': 'Carton', 'cartons': 'Carton', 'ctn': 'Carton',
      'drum': 'Drum', 'drums': 'Drum',
      'pair': 'Pair', 'pairs': 'Pair',
      'dozen': 'Dozen', 'dozens': 'Dozen', 'dz': 'Dozen',
      'unit': 'Unit', 'units': 'Unit'
    };

    const newUnits: string[] = [];
    invoice.lineItems.forEach((line: any) => {
      const rawUnit = line.unit || '';
      const cleanRawUnit = rawUnit.trim().toLowerCase();
      
      let mappedUnit = rawUnit;
      const customMatch = (unitMappings || []).find(m => m.fromUnit.trim().toLowerCase() === cleanRawUnit || m.fromUnit.trim().toLowerCase() === rawUnit.trim().toLowerCase());
      if (customMatch) {
        mappedUnit = customMatch.toUnit;
      } else {
        const standardName = UOM_STANDARD_MAPPING[cleanRawUnit];
        if (standardName) {
          mappedUnit = standardName;
        } else {
          const subMatch = Object.entries(UOM_STANDARD_MAPPING).find(([abbr]) => cleanRawUnit === abbr || cleanRawUnit.includes(abbr) || abbr.includes(cleanRawUnit));
          if (subMatch) {
            mappedUnit = subMatch[1];
          } else {
            mappedUnit = rawUnit ? (rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1).toLowerCase()) : 'Piece';
          }
        }
      }

      if (rawUnit && !standardUnitsLower.includes(mappedUnit.toLowerCase())) {
        newUnits.push(mappedUnit);
      }
    });
    return Array.from(new Set(newUnits));
  };

  useEffect(() => {
    if (selectedInvoiceIndex >= 0 && extractedInvoices[selectedInvoiceIndex]) {
      const unmapped = getUnrecognizedUnits(extractedInvoices[selectedInvoiceIndex]);
      setApprovedNewUnits(unmapped);
    } else {
      setApprovedNewUnits([]);
    }
  }, [selectedInvoiceIndex, extractedInvoices, units, unitMappings]);

  const handleToggleApprovedUnit = (uName: string) => {
    setApprovedNewUnits(prev => 
      prev.includes(uName) ? prev.filter(x => x !== uName) : [...prev, uName]
    );
  };

  // --- STATE FOR OPTION 2: MANUAL ENTRY ---
  const [manualForm, setManualForm] = useState({
    name: '',
    hsnCode: '',
    category: 'General Hardware',
    quantity: 1,
    unit: 'Pcs',
    purchasePrice: 0,
    sellingPrice: 0,
    gstRate: 18,
    supplierName: '',
    date: new Date().toISOString().split('T')[0],
    godownId: godowns[0]?.id || 'GD-01'
  });

  // Search & Autocomplete
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [nameSearchQuery, setNameSearchQuery] = useState('');

  // --- STATE FOR BARCODE SCANNER ---
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [isScanningCam, setIsScanningCam] = useState(false);
  const [scannedBarcodeForNewItem, setScannedBarcodeForNewItem] = useState<string | null>(null);

  const handleSelectScannedProduct = (item: Item, scannedCode: string) => {
    if (item.id) {
      // Existing item match
      setManualForm(prev => ({
        ...prev,
        name: item.name,
        hsnCode: item.hsnCode,
        purchasePrice: item.unitCost,
        sellingPrice: item.sellingPrice,
        gstRate: item.taxRate || 18
      }));
      setScannedBarcodeForNewItem(null);
      setActiveSegment('manual');
    } else {
      // Brand new item catalog registration
      setManualForm(prev => ({
        ...prev,
        name: '',
        hsnCode: '8471',
        purchasePrice: 0,
        sellingPrice: 0,
        gstRate: 18
      }));
      setScannedBarcodeForNewItem(scannedCode);
      setActiveSegment('manual');
    }
  };

  // --- FILTER & STOCK INCREASE HISTORY ---
  const [historySearch, setHistorySearch] = useState('');
  const [historySupplierFilter, setHistorySupplierFilter] = useState('ALL');
  const [historyGodownFilter, setHistoryGodownFilter] = useState('ALL');

  // --- EDIT MODAL STATE ---
  const [editingTx, setEditingTx] = useState<StockTransaction | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    unitCost: 0,
    sellingPrice: 0,
    invoiceNumber: '',
    date: ''
  });

  // --- DUP DETECTION STATE ---
  const [duplicateWarning, setDuplicateWarning] = useState<Item | null>(null);

  // Sync / Auto search effect for Manual Entry
  useEffect(() => {
    if (manualForm.name.trim().length > 1) {
      const match = items.find(
        i => i.name.toLowerCase() === manualForm.name.toLowerCase()
      );
      if (match) {
        setDuplicateWarning(match);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [manualForm.name, items]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadedFiles(e.dataTransfer.files);
    }
  };

  // Promisified helper to read a file as Base64 data URL
  const readAsBase64 = (file: File): Promise<{ base64: string; name: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        base64: reader.result as string,
        name: file.name,
        mimeType: file.type
      });
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Helper to calculate totals and validations locally on edit
  const runLocalValidation = (inv: any): any => {
    const updatedLines = (inv.lineItems || []).map((line: any) => {
      const qty = Number(line.quantity || 0);
      const price = Number(line.unitPrice || 0);
      const tax = Number(line.taxRate || 18);
      return {
        ...line,
        totalAmount: Math.round(qty * price * (1 + tax / 100))
      };
    });

    const totalAmount = updatedLines.reduce((sum: number, line: any) => sum + line.totalAmount, 0);

    const validationAlerts: any[] = [];
    
    // Duplicate Invoice number check locally
    const isDupLocal = transactions.some(tx => 
      tx.invoiceNumber && tx.invoiceNumber.trim().toLowerCase() === (inv.invoiceNumber || '').trim().toLowerCase()
    );
    if (isDupLocal) {
      validationAlerts.push({
        field: 'invoiceNumber',
        severity: 'error',
        message: `Invoice #${inv.invoiceNumber || 'N/A'} is already registered in the stock transactions ledger.`
      });
    }

    // Invoice Date Check
    const invDate = new Date(inv.date);
    const today = new Date();
    if (!inv.date || isNaN(invDate.getTime())) {
      validationAlerts.push({
        field: 'date',
        severity: 'warning',
        message: 'Billing Date is missing or invalid.'
      });
    } else if (invDate > today) {
      validationAlerts.push({
        field: 'date',
        severity: 'error',
        message: `Future Date Warning: Inbound invoice date (${inv.date}) is in the future.`
      });
    }

    // Supplier Check
    if (!inv.vendorName || inv.vendorName.trim() === '' || inv.vendorName.toLowerCase() === 'unknown supplier' || inv.vendorName.toLowerCase() === 'new uploaded vendor') {
      validationAlerts.push({
        field: 'vendorName',
        severity: 'warning',
        message: 'Supplier Name is blank or generic. Double check print details.'
      });
    }

    // Line check
    updatedLines.forEach((line: any, idx: number) => {
      const cleanHsn = (line.hsnCode || '').replace(/\D/g, '');
      if (!cleanHsn || (cleanHsn.length !== 4 && cleanHsn.length !== 6 && cleanHsn.length !== 8)) {
        validationAlerts.push({
          field: `lineItems[${idx}].hsnCode`,
          severity: 'warning',
          message: `Line ${idx + 1}: HSN Code "${line.hsnCode || ''}" is not standard 4, 6, or 8 digits.`
        });
      }
      if (Number(line.quantity) <= 0) {
        validationAlerts.push({
          field: `lineItems[${idx}].quantity`,
          severity: 'error',
          message: `Line ${idx + 1}: Inbound quantity must be positive.`
        });
      }
      if (Number(line.unitPrice) < 0) {
        validationAlerts.push({
          field: `lineItems[${idx}].unitPrice`,
          severity: 'error',
          message: `Line ${idx + 1}: Price must be non-negative.`
        });
      }

      // Real-time Unit Validation and Mapping
      const rawUnit = line.unit || '';
      const cleanRawUnit = rawUnit.trim().toLowerCase();

      const UOM_STANDARD_MAPPING: Record<string, string> = {
        'mtr': 'Meter', 'm': 'Meter', 'meter': 'Meter', 'meters': 'Meter',
        'pcs': 'Piece', 'pc': 'Piece', 'piece': 'Piece', 'pieces': 'Piece',
        'nos': 'Numbers', 'no': 'Numbers', 'number': 'Numbers', 'numbers': 'Numbers',
        'ft': 'Feet', 'feet': 'Feet', 'foot': 'Feet',
        'sqft': 'Square Feet', 'sq-ft': 'Square Feet', 'square feet': 'Square Feet',
        'sqm': 'Square Meter', 'sq-m': 'Square Meter', 'square meter': 'Square Meter', 'square meters': 'Square Meter',
        'roll': 'Roll', 'rolls': 'Roll',
        'coil': 'Coil', 'coils': 'Coil',
        'box': 'Box', 'boxes': 'Box',
        'bundle': 'Bundle', 'bundles': 'Bundle',
        'packet': 'Packet', 'packets': 'Packet', 'pkt': 'Packet',
        'set': 'Set', 'sets': 'Set',
        'sheet': 'Sheet', 'sheets': 'Sheet',
        'kg': 'Kg', 'kgs': 'Kg', 'kilogram': 'Kg', 'kilograms': 'Kg',
        'gram': 'Gram', 'grams': 'Gram', 'g': 'Gram',
        'ton': 'Ton', 'tons': 'Ton',
        'liter': 'Liter', 'liters': 'Liter', 'ltr': 'Liter', 'ltrs': 'Liter', 'l': 'Liter',
        'ml': 'Milliliter', 'milliliter': 'Milliliter', 'milliliters': 'Milliliter',
        'inch': 'Inch', 'inches': 'Inch', 'in': 'Inch',
        'cubic meter': 'Cubic Meter', 'cbm': 'Cubic Meter',
        'bag': 'Bag', 'bags': 'Bag',
        'carton': 'Carton', 'cartons': 'Carton', 'ctn': 'Carton',
        'drum': 'Drum', 'drums': 'Drum',
        'pair': 'Pair', 'pairs': 'Pair',
        'dozen': 'Dozen', 'dozens': 'Dozen', 'dz': 'Dozen',
        'unit': 'Unit', 'units': 'Unit'
      };

      let mappedUnit = rawUnit;
      const customMatch = (unitMappings || []).find(m => m.fromUnit.trim().toLowerCase() === cleanRawUnit || m.fromUnit.trim().toLowerCase() === rawUnit.trim().toLowerCase());
      if (customMatch) {
        mappedUnit = customMatch.toUnit;
      } else {
        const standardName = UOM_STANDARD_MAPPING[cleanRawUnit];
        if (standardName) {
          mappedUnit = standardName;
        } else {
          const subMatch = Object.entries(UOM_STANDARD_MAPPING).find(([abbr]) => cleanRawUnit === abbr || cleanRawUnit.includes(abbr) || abbr.includes(cleanRawUnit));
          if (subMatch) {
            mappedUnit = subMatch[1];
          } else {
            mappedUnit = rawUnit ? (rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1).toLowerCase()) : 'Piece';
          }
        }
      }

      const standardUnitsLower = (units || []).map(u => u.toLowerCase());

      if (!rawUnit || rawUnit.trim() === '') {
        validationAlerts.push({
          field: `lineItems[${idx}].unit`,
          severity: 'warning',
          message: `Line ${idx + 1}: Unit is missing.`
        });
      } else if (!standardUnitsLower.includes(mappedUnit.toLowerCase())) {
        validationAlerts.push({
          field: `lineItems[${idx}].unit`,
          severity: 'warning',
          message: `Line ${idx + 1}: Unit "${rawUnit}" (maps to "${mappedUnit}") is unrecognized. Approve stock entry to save to Unit Master.`,
          isNewUnit: true,
          newUnitName: mappedUnit
        });
      }
    });

    return {
      ...inv,
      lineItems: updatedLines,
      totalAmount,
      validationAlerts
    };
  };

  const updateInvoiceField = (invoiceIndex: number, field: string, value: any) => {
    setExtractedInvoices(prev => {
      const copy = [...prev];
      copy[invoiceIndex] = runLocalValidation({
        ...copy[invoiceIndex],
        [field]: value
      });
      return copy;
    });
  };

  const updateLineItemField = (invoiceIndex: number, lineIndex: number, field: string, value: any) => {
    setExtractedInvoices(prev => {
      const copy = [...prev];
      const linesCopy = [...copy[invoiceIndex].lineItems];
      linesCopy[lineIndex] = { ...linesCopy[lineIndex], [field]: value };
      copy[invoiceIndex] = runLocalValidation({
        ...copy[invoiceIndex],
        lineItems: linesCopy
      });
      return copy;
    });
  };

  const removeLineItem = (invoiceIndex: number, lineIndex: number) => {
    setExtractedInvoices(prev => {
      const copy = [...prev];
      const linesCopy = copy[invoiceIndex].lineItems.filter((_, idx) => idx !== lineIndex);
      copy[invoiceIndex] = runLocalValidation({
        ...copy[invoiceIndex],
        lineItems: linesCopy
      });
      return copy;
    });
  };

  const addLineItemPlaceholder = (invoiceIndex: number) => {
    setExtractedInvoices(prev => {
      const copy = [...prev];
      const linesCopy = [...copy[invoiceIndex].lineItems, {
        itemName: 'New Item Catalog SKU',
        hsnCode: '8471',
        quantity: 1,
        unit: 'Pcs',
        unitPrice: 100,
        taxRate: 18,
        totalAmount: 118,
        batchNumber: '',
        expiryDate: ''
      }];
      copy[invoiceIndex] = runLocalValidation({
        ...copy[invoiceIndex],
        lineItems: linesCopy
      });
      return copy;
    });
  };

  // Poll bulk OCR job status until completion
  const startPollingBulkJob = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ocr/job-status/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Could not fetch bulk job status.");

        const job = await response.json();
        
        // Update live progress
        setBulkProgress({
          current: job.processedCount,
          total: job.totalFiles,
          successCount: job.successCount,
          failedCount: job.failedCount
        });

        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(interval);
          
          // Map success results
          const newInvoices: any[] = [];
          const errorLogs: any[] = [];

          job.results.forEach((res: any) => {
            if (res.success) {
              newInvoices.push({
                id: `INV-TEMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
                fileName: res.fileName,
                ...res.data,
                validationAlerts: res.validationAlerts || []
              });
            } else {
              errorLogs.push({
                fileName: res.fileName,
                error: res.error || 'Gemini multi-modal pipeline failure'
              });
            }
          });

          setExtractedInvoices(prev => [...prev, ...newInvoices]);
          setBulkErrorLogs(prev => [...prev, ...errorLogs]);
          
          if (newInvoices.length > 0) {
            setSelectedInvoiceIndex(0);
            showToast(`Batch OCR completed! Ingested ${newInvoices.length} invoices successfully.`, 'success');
          } else {
            showToast(`Batch OCR finished with no success records. ${errorLogs.length} documents failed.`, 'error');
          }
          setIsParsing(false);
          setBulkJobId(null);
        }
      } catch (err: any) {
        clearInterval(interval);
        showToast(`Job status tracking lost: ${err.message}`, 'error');
        setIsParsing(false);
        setBulkJobId(null);
      }
    }, 1200);
  };

  // Load preset demo bills
  const handleLoadDemoInvoiceAndParse = async (idx: number) => {
    setIsParsing(true);
    setBulkErrorLogs([]);
    try {
      const demo = demoInvoices[idx];
      setUploadedImageBase64(demo.imageUrl);

      const response = await fetch('/api/ocr/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageBase64: demo.imageUrl,
          mimeType: 'image/png'
        })
      });

      if (!response.ok) {
        throw new Error('Gemini failed to resolve the diagnostic preset invoice.');
      }

      const json = await response.json();
      const mappedRecord = {
        id: `INV-TEMP-${Date.now()}-${idx}`,
        fileName: `${demo.name}.png`,
        vendorName: json.vendorName,
        invoiceNumber: json.invoiceNumber,
        date: json.date,
        totalAmount: json.totalAmount,
        confidenceScore: json.confidenceScore || 98,
        lineItems: json.lineItems || [],
        validationAlerts: json.validationAlerts || []
      };

      setExtractedInvoices([mappedRecord]);
      setSelectedInvoiceIndex(0);
      showToast("Interactive preset scanned and validated perfectly!");
    } catch (err: any) {
      showToast(`Preset Scan issue: ${err.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle uploading files (Accepts one or multiple PDFs and images)
  const handleUploadedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsParsing(true);
    setBulkErrorLogs([]);
    
    try {
      const fileArray = Array.from(files);
      const base64Files = await Promise.all(
        fileArray.map(async (file) => {
          const res = await readAsBase64(file);
          return {
            base64: res.base64,
            name: file.name,
            mimeType: file.type
          };
        })
      );

      // If single file upload, set preview if image
      if (fileArray.length === 1 && fileArray[0].type.startsWith('image/')) {
        setUploadedImageBase64(base64Files[0].base64);
      } else {
        setUploadedImageBase64(null);
      }

      // POST to bulk background processing queue
      const response = await fetch('/api/ocr/bulk-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ files: base64Files })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start bulk ingestion.');
      }

      const data = await response.json();
      setBulkJobId(data.jobId);
      setBulkProgress({ current: 0, total: fileArray.length, successCount: 0, failedCount: 0 });
      
      // Start polling status
      startPollingBulkJob(data.jobId);
      showToast(`Asynchronous OCR queued: Parsing ${fileArray.length} document(s) in background...`);
    } catch (err: any) {
      showToast(`Upload Error: ${err.message}`, 'error');
      setIsParsing(false);
    }
  };

  const handleConfirmAndPostAIInvoice = async () => {
    if (extractedInvoices.length === 0) return;
    setIsParsing(true);
    try {
      // Find godownId to import to (default is GD-01)
      const targetGodownId = godowns[0]?.id || 'GD-01';

      // 1. Send all verified invoices to backend confirm-import controller
      const response = await fetch('/api/ocr/confirm-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          records: extractedInvoices,
          godownId: targetGodownId,
          approvedNewUnits: approvedNewUnits
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete final import.');
      }

      const result = await response.json();
      showToast(result.message || "Double Entry Compliance verified! Inflow registered & ledgers written.", 'success');
      
      // Clear working states
      setExtractedInvoices([]);
      setSelectedInvoiceIndex(-1);
      setUploadedImageBase64(null);
      refreshAllData();
    } catch (err: any) {
      showToast(`Final Save Error: ${err.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmSingleInvoiceImport = async (idx: number) => {
    const targetInvoice = extractedInvoices[idx];
    if (!targetInvoice) return;
    setIsParsing(true);
    try {
      const targetGodownId = godowns[0]?.id || 'GD-01';

      const response = await fetch('/api/ocr/confirm-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          records: [targetInvoice],
          godownId: targetGodownId,
          approvedNewUnits: approvedNewUnits
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import single invoice.');
      }

      const result = await response.json();
      showToast(result.message || `Successfully imported ${targetInvoice.invoiceNumber}!`, 'success');

      // Remove imported invoice from queue
      setExtractedInvoices(prev => prev.filter((_, i) => i !== idx));
      setSelectedInvoiceIndex(prev => {
        if (prev >= extractedInvoices.length - 1) return prev - 1;
        return prev;
      });
      refreshAllData();
    } catch (err: any) {
      showToast(`Single Save Error: ${err.message}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Option 2 Confirm Submit (Manual Entry)
  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name) {
      showToast("Please specify a valid item name.", 'warning');
      return;
    }

    try {
      const authHeader = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      };

      // 1. Duplicate detection: check if existing item name matches
      let existingItem = items.find(
        i => i.name.toLowerCase() === manualForm.name.toLowerCase()
      );
      let itemId: string;

      if (existingItem) {
        itemId = existingItem.id;
        showToast(`Adding stock units to existing catalog ID: ${existingItem.sku}`, 'info');
      } else {
        // Register new item first
        const itemRes = await fetch('/api/items', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({
            name: manualForm.name,
            hsnCode: manualForm.hsnCode || '3926',
            reorderLevel: 15,
            unitCost: manualForm.purchasePrice,
            sellingPrice: manualForm.sellingPrice || Math.round(manualForm.purchasePrice * 1.35),
            sku: scannedBarcodeForNewItem || undefined
          })
        });
        const newItemData = await itemRes.json();
        itemId = newItemData.id || 'ITM-01';
        items.push(newItemData);
      }

      // 2. Post inflow transaction to Stock Book
      await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          itemId,
          type: 'INFLOW',
          toGodownId: manualForm.godownId || 'GD-01',
          quantity: Number(manualForm.quantity),
          operatorEmail: user?.email || 'sarvesh@company.com',
          invoiceNumber: manualForm.supplierName ? `SUPP-${manualForm.supplierName.toUpperCase().slice(0,4)}` : 'MANUAL-ENTRY'
        })
      });

      showToast("Option 2 Manual Entry Saved Directly to Stock Book!");
      
      // Reset form
      setManualForm({
        name: '',
        hsnCode: '',
        category: 'General Hardware',
        quantity: 1,
        unit: 'Pcs',
        purchasePrice: 0,
        sellingPrice: 0,
        gstRate: 18,
        supplierName: '',
        date: new Date().toISOString().split('T')[0],
        godownId: godowns[0]?.id || 'GD-01'
      });
      setDuplicateWarning(null);
      setScannedBarcodeForNewItem(null);
      refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Barcode mock scanning process
  const triggerMockBarcodeScan = (code: string) => {
    setIsScanningCam(true);
    setTimeout(() => {
      setScannedCode(code);
      setIsScanningCam(false);
      
      if (code === '8901234567890') {
        const itemData = {
          name: 'Intel Xeon Gold 5118 Processor',
          hsnCode: '8471',
          purchasePrice: 24500,
          sellingPrice: 29900,
          unit: 'Nos',
          gstRate: 18,
          supplierName: 'Intel Chipset Logistics Pvt Ltd'
        };
        
        if (activeSegment === 'manual') {
          setManualForm(prev => ({
            ...prev,
            ...itemData
          }));
        } else {
          setActiveSegment('manual');
          setManualForm(prev => ({
            ...prev,
            ...itemData
          }));
        }
        showToast("Barcode Scanned! Auto-filled Intel Xeon Gold 5118 details.");
      } else if (code === '8901047101824') {
        const itemData = {
          name: 'Cisco Integrated Circuit Chipset SB3',
          hsnCode: '8517',
          purchasePrice: 8500,
          sellingPrice: 11200,
          unit: 'Pcs',
          gstRate: 18,
          supplierName: 'Cisco Hardware Distributorship'
        };
        if (activeSegment === 'manual') {
          setManualForm(prev => ({ ...prev, ...itemData }));
        } else {
          setActiveSegment('manual');
          setManualForm(prev => ({ ...prev, ...itemData }));
        }
        showToast("Barcode Scanned! Auto-filled Cisco Integrated Circuit SB3.");
      } else {
        showToast("Unknown barcode code. Try entering a custom barcode lookup!");
      }
      setIsBarcodeOpen(false);
    }, 1500);
  };

  // Autocomplete selecting existing products
  const handleSelectAutocompleteItem = (item: Item) => {
    setManualForm(prev => ({
      ...prev,
      name: item.name,
      hsnCode: item.hsnCode,
      purchasePrice: item.unitCost,
      sellingPrice: item.sellingPrice,
      gstRate: item.taxRate || 18
    }));
    setShowProductSuggestions(false);
    showToast(`Loaded details from preset SKU: ${item.sku}`);
  };

  // Edit action handler
  const handleOpenEditTx = (tx: StockTransaction) => {
    setEditingTx(tx);
    setEditForm({
      quantity: tx.quantity,
      unitCost: tx.unitCost,
      sellingPrice: tx.sellingPrice,
      invoiceNumber: tx.invoiceNumber || '',
      date: tx.timestamp.split('T')[0]
    });
  };

  // Save edited stock transaction
  const handleSaveEditedTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    try {
      const response = await fetch(`/api/inventory/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        throw new Error('Could not update stock transaction on server.');
      }

      showToast("Stock entry updated and ledger adjusted!");
      setEditingTx(null);
      refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete transaction handler
  const handleDeleteTx = async (id: string) => {
    if (!safeConfirm("Are you absolute sure you want to revert/delete this stock transaction record?")) {
      return;
    }

    try {
      const response = await fetch(`/api/inventory/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction record.');
      }

      showToast("Stock transaction deleted cleanly!");
      refreshAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filter stock increase transactions
  const inflowTransactions = transactions.filter(tx => tx.type === 'INFLOW');

  const filteredInflowHistory = inflowTransactions.filter(tx => {
    const textMatch = 
      tx.itemName.toLowerCase().includes(historySearch.toLowerCase()) || 
      tx.sku.toLowerCase().includes(historySearch.toLowerCase()) || 
      (tx.invoiceNumber && tx.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase()));

    const godownMatch = historyGodownFilter === 'ALL' || tx.toGodownId === historyGodownFilter;
    const operatorMatch = historySupplierFilter === 'ALL' || tx.operatorEmail.toLowerCase().includes(historySupplierFilter.toLowerCase());

    return textMatch && godownMatch && operatorMatch;
  });

  // Calculate dynamic statistics
  const totalInflowItemsCount = filteredInflowHistory.reduce((acc, cr) => acc + cr.quantity, 0);
  const totalInflowValuation = filteredInflowHistory.reduce((acc, cr) => acc + (cr.quantity * cr.unitCost), 0);

  const [isPdfOverlayOpen, setIsPdfOverlayOpen] = useState(false);

  // PDF Export simulation (Print)
  const handlePrintPDF = () => {
    setIsPdfOverlayOpen(true);
  };

  // CSV Export simulation
  const handleExportCSV = () => {
    const headers = 'Transaction ID,Date,Product Name,SKU,Quantity,Purchase Unit Cost,Invoice Number\n';
    const rows = filteredInflowHistory.map(tx => {
      const cleanName = tx.itemName.replace(/,/g, '');
      return `${tx.id},${tx.timestamp.split('T')[0]},${cleanName},${tx.sku},${tx.quantity},${tx.unitCost},${tx.invoiceNumber || 'N/A'}`;
    }).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Stock_Inflow_Report_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
    showToast("Excel/CSV backup report downloaded successfully!");
  };

  // GST dynamic tax calculation for Option 2
  const computedTotalAmount = Math.round(
    manualForm.quantity * manualForm.purchasePrice * (1 + Number(manualForm.gstRate) / 100)
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Banner and Segment Toggle */}
      <div className={`p-6 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
              <Building className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Stock Entry & Procurement Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-xl">
            Streamline warehouse procurement registers. Use auto-parsing with Gemini OCR to ingest multi-item partner slips instantly, or declare precision catalog updates manually below.
          </p>
        </div>

        {/* Material Design 3 Segmented Toggle Controls */}
        <div className={`flex p-1 rounded-full border border-slate-200 dark:border-slate-800 shrink-0 ${
          isLight ? 'bg-slate-50' : 'bg-slate-950/40'
        }`}>
          <button
            onClick={() => { setActiveSegment('ai'); setDuplicateWarning(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'ai'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Option 1 – AI Scan Bill
          </button>
          <button
            onClick={() => { setActiveSegment('manual'); setDuplicateWarning(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'manual'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Option 2 – Manual Entry
          </button>
        </div>
      </div>

      {/* D3 Interactive Net Stock Movement Timeline Chart */}
      <StockMovementTimelineChart
        items={items}
        transactions={transactions}
        isLight={isLight}
        showToast={showToast}
      />

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Core Input Panel */}
        <div className="lg:col-span-8 space-y-6">

          {/* Option 1: AI Scan Document Workspace */}
          {activeSegment === 'ai' && (
            <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/60 border-b flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-emerald-500 animate-pulse" /> Option 1 – AI Document Ingestion
                </span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded font-mono">Gemini-3.5 Active</span>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Drag and Drop Zone Container */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 rounded-2xl p-6 transition-all duration-300 ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-500/5 shadow-inner scale-[0.99]' 
                      : 'border-dashed border-slate-350 dark:border-slate-800'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Left Side: Drag & Drop File Loader & Presets */}
                    <div className="md:col-span-4 space-y-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Document Inbound</span>
                      
                      {/* File Upload Selector */}
                      <label className={`aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer relative group transition-all ${
                        isLight ? 'bg-slate-50 border-slate-300 hover:bg-slate-100' : 'bg-slate-950 border-slate-850 hover:bg-slate-900'
                      }`}>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          multiple
                          disabled={isParsing}
                          onChange={(e) => handleUploadedFiles(e.target.files)} 
                          className="hidden" 
                        />
                        <div className="flex flex-col items-center justify-center text-center gap-1">
                          <Upload className="w-6 h-6 text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Drag & Drop Invoices</span>
                          <span className="text-[9px] text-slate-400">Select Multiple PDFs or Images</span>
                        </div>
                      </label>

                      {/* Diagnostic presets */}
                      <div className="space-y-2 pt-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Interactive Preset Bills:</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {demoInvoices.map((demo, idx) => (
                            <button
                              key={idx}
                              disabled={isParsing}
                              onClick={() => handleLoadDemoInvoiceAndParse(idx)}
                              className={`p-2 text-left text-[11px] font-medium border rounded-lg transition-all truncate disabled:opacity-50 ${
                                isLight 
                                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
                                  : 'bg-slate-950/40 hover:bg-slate-800 border-slate-800 text-slate-450'
                              }`}
                              title={demo.name}
                            >
                              📄 {demo.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inbound Document Queue */}
                      {extractedInvoices.length > 0 && (
                        <div className="space-y-2 pt-4">
                          <div className="flex justify-between items-center border-b pb-1 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Parsed Queue ({extractedInvoices.length})
                            </span>
                            <button 
                              onClick={() => { setExtractedInvoices([]); setSelectedInvoiceIndex(-1); }}
                              className="text-[9px] text-rose-500 hover:underline font-bold"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            {extractedInvoices.map((inv, idx) => {
                              const errs = (inv.validationAlerts || []).filter(a => a.severity === 'error').length;
                              const warns = (inv.validationAlerts || []).filter(a => a.severity === 'warning').length;
                              const isActive = selectedInvoiceIndex === idx;

                              return (
                                <div
                                  key={inv.id}
                                  onClick={() => setSelectedInvoiceIndex(idx)}
                                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-start gap-2 ${
                                    isActive
                                      ? 'border-indigo-500 bg-indigo-500/5 shadow-sm'
                                      : isLight 
                                        ? 'bg-white border-slate-200 hover:border-slate-350' 
                                        : 'bg-slate-900/60 border-slate-850 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={inv.fileName}>
                                        {inv.fileName}
                                      </p>
                                    </div>
                                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">{inv.vendorName || 'Unknown Vendor'}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                        ₹{(inv.totalAmount || 0).toLocaleString('en-IN')}
                                      </span>
                                      <span className="text-[8.5px] text-slate-450 font-mono">#{inv.invoiceNumber}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    {errs > 0 ? (
                                      <span className="bg-red-500/10 text-red-600 text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <AlertCircle className="h-2.5 w-2.5" /> {errs} Err
                                      </span>
                                    ) : warns > 0 ? (
                                      <span className="bg-amber-500/10 text-amber-600 text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <AlertTriangle className="h-2.5 w-2.5" /> {warns} Warn
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-500/10 text-emerald-600 text-[8.5px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <Check className="h-2.5 w-2.5" /> OK
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExtractedInvoices(prev => prev.filter((_, i) => i !== idx));
                                        if (selectedInvoiceIndex === idx) setSelectedInvoiceIndex(-1);
                                      }}
                                      className="text-slate-450 hover:text-rose-500 transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side: Active Workspace Parser Frame */}
                    <div className="md:col-span-8 flex flex-col justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Interactive Verification Dashboard</span>
                      
                      {/* 1. Background parsing loader overlay */}
                      {isParsing && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl px-6">
                          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-3" />
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Processing Documents with Gemini...</span>
                          
                          {/* Live bulk status bars */}
                          {bulkProgress.total > 0 && (
                            <div className="w-full max-w-sm mt-4 space-y-2">
                              <div className="flex justify-between text-xs font-semibold text-slate-500">
                                <span>Ingestion Progress: {bulkProgress.current} of {bulkProgress.total} Files</span>
                                <span className="font-mono">{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-center gap-4 text-[10px] font-extrabold text-slate-450 mt-1">
                                <span className="text-emerald-500">✓ {bulkProgress.successCount} Success</span>
                                <span className="text-rose-500">✗ {bulkProgress.failedCount} Failed</span>
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-slate-500 mt-2 max-w-md">
                            Gemini is transcribing table cells, identifying supplier details, classifying HSN codes, and resolving potential duplicate entries in real-time.
                          </p>
                        </div>
                      )}

                      {/* 2. Empty State (No invoices loaded yet) */}
                      {!isParsing && extractedInvoices.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl">
                          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-300 block">Ingest review workspace empty</span>
                          <p className="text-[10px] text-slate-500 mt-1.5 max-w-sm">
                            Drop multiple purchase bill PDFs/images, load preset files, or select documents via file explorer to begin high-speed automated stock loading.
                          </p>
                        </div>
                      )}

                      {/* 3. Active Invoice Ingestion Form & Row Table */}
                      {!isParsing && selectedInvoiceIndex >= 0 && extractedInvoices[selectedInvoiceIndex] && (() => {
                        const activeInvoice = extractedInvoices[selectedInvoiceIndex];
                        const errAlerts = (activeInvoice.validationAlerts || []).filter(a => a.severity === 'error');
                        const warnAlerts = (activeInvoice.validationAlerts || []).filter(a => a.severity === 'warning');

                        return (
                          <div className="space-y-4 animate-fadeIn">
                            
                            {/* Ingestion header metadata info bar */}
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                  {activeInvoice.confidenceScore ? `${activeInvoice.confidenceScore}% Confidence` : 'AI Parsed'}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]" title={activeInvoice.fileName}>
                                  Source: {activeInvoice.fileName}
                                </span>
                              </div>
                              <button
                                onClick={() => handleConfirmSingleInvoiceImport(selectedInvoiceIndex)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="h-3 w-3" /> Import This Invoice Only
                              </button>
                            </div>

                            {/* Dynamic Validation Alerts Alert board */}
                            {(errAlerts.length > 0 || warnAlerts.length > 0) && (
                              <div className="space-y-1.5">
                                {errAlerts.map((alert, idx) => (
                                  <div key={idx} className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 px-3.5 py-2 rounded-xl text-[10.5px] font-bold flex items-start gap-1.5">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                                    <span>{alert.message}</span>
                                  </div>
                                ))}
                                {warnAlerts.map((alert, idx) => (
                                  <div key={idx} className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-3.5 py-2 rounded-xl text-[10.5px] font-medium flex items-start gap-1.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                    <span>{alert.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Core Invoice Metadata Form */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-850 rounded-xl text-xs font-sans">
                              <div>
                                <label className="text-[9px] text-slate-450 uppercase font-bold block mb-0.5">Supplier Name</label>
                                <input 
                                  type="text"
                                  value={activeInvoice.vendorName}
                                  onChange={(e) => updateInvoiceField(selectedInvoiceIndex, 'vendorName', e.target.value)}
                                  className="w-full text-slate-950 dark:text-white font-bold bg-transparent border-b border-slate-300 dark:border-slate-800 focus:outline-none focus:border-indigo-500 pb-0.5"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-450 uppercase font-bold block mb-0.5">Invoice #</label>
                                <input 
                                  type="text"
                                  value={activeInvoice.invoiceNumber}
                                  onChange={(e) => updateInvoiceField(selectedInvoiceIndex, 'invoiceNumber', e.target.value)}
                                  className="w-full text-slate-950 dark:text-white font-bold font-mono bg-transparent border-b border-slate-300 dark:border-slate-800 focus:outline-none focus:border-indigo-500 pb-0.5"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-450 uppercase font-bold block mb-0.5">Billing Date</label>
                                <input 
                                  type="date"
                                  value={activeInvoice.date}
                                  onChange={(e) => updateInvoiceField(selectedInvoiceIndex, 'date', e.target.value)}
                                  className="w-full text-slate-950 dark:text-white font-bold font-mono bg-transparent border-b border-slate-300 dark:border-slate-800 focus:outline-none focus:border-indigo-500 pb-0.5"
                                />
                              </div>
                            </div>

                            {/* Line items list with high-accuracy item matching */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Line Items ({activeInvoice.lineItems.length})</span>
                                <button
                                  onClick={() => addLineItemPlaceholder(selectedInvoiceIndex)}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-extrabold flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" /> Add Custom Line
                                </button>
                              </div>
                              
                              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                {activeInvoice.lineItems.map((line, lIdx) => {
                                  // Matches existing items intelligently by name or HSN code
                                  const matchedItem = items.find(
                                    i => i.name.toLowerCase() === line.itemName.toLowerCase() || i.hsnCode === line.hsnCode
                                  );

                                  return (
                                    <div 
                                      key={lIdx} 
                                      className={`p-3.5 border rounded-xl transition-all relative font-sans ${
                                        isLight ? 'bg-white border-slate-150 hover:border-slate-300 shadow-sm' : 'bg-slate-900 border-slate-850 hover:border-slate-700'
                                      }`}
                                    >
                                      {matchedItem ? (
                                        <span className="absolute -top-1.5 right-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase border border-emerald-500/15">
                                          SKU Matched: {matchedItem.sku}
                                        </span>
                                      ) : (
                                        <span className="absolute -top-1.5 right-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase border border-indigo-500/15">
                                          Auto-Create SKU on Inbound
                                        </span>
                                      )}

                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-xs">
                                        
                                        {/* Product Description */}
                                        <div className="md:col-span-5">
                                          <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Product Name</label>
                                          <input 
                                            type="text" 
                                            value={line.itemName} 
                                            onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'itemName', e.target.value)}
                                            className="w-full font-bold focus:outline-none bg-transparent text-slate-900 dark:text-slate-100"
                                            placeholder="Item Name"
                                          />
                                        </div>

                                        {/* HSN Code */}
                                        <div className="md:col-span-2">
                                          <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">HSN Code</label>
                                          <input 
                                            type="text" 
                                            value={line.hsnCode} 
                                            onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'hsnCode', e.target.value)}
                                            className="w-full font-semibold font-mono focus:outline-none bg-transparent text-slate-900 dark:text-slate-100"
                                            placeholder="3926"
                                          />
                                        </div>

                                        {/* Qty & Unit */}
                                        <div className="md:col-span-2">
                                          <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Quantity & Unit</label>
                                          <div className="flex items-center gap-1">
                                            <input 
                                              type="number" 
                                              value={line.quantity} 
                                              onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'quantity', Number(e.target.value))}
                                              className="w-12 font-bold font-mono focus:outline-none bg-transparent text-slate-900 dark:text-slate-100"
                                            />
                                            <input 
                                              type="text" 
                                              value={line.unit} 
                                              onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'unit', e.target.value)}
                                              className={`w-12 text-[11px] focus:outline-none bg-transparent font-bold ${
                                                (activeInvoice.validationAlerts || []).some(a => a.field === `lineItems[${lIdx}].unit`)
                                                  ? 'text-amber-500 underline decoration-dashed underline-offset-4' 
                                                  : 'text-slate-500'
                                              }`}
                                              placeholder="Pcs"
                                              title={(activeInvoice.validationAlerts || []).find(a => a.field === `lineItems[${lIdx}].unit`)?.message || 'Standard Unit'}
                                            />
                                            {(activeInvoice.validationAlerts || []).some(a => a.field === `lineItems[${lIdx}].unit`) && (
                                              <span className="text-amber-500 text-[10px] shrink-0 cursor-help" title={(activeInvoice.validationAlerts || []).find(a => a.field === `lineItems[${lIdx}].unit`)?.message}>⚠️</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Cost Rate */}
                                        <div className="md:col-span-2">
                                          <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Rate (Excl GST)</label>
                                          <div className="flex items-center gap-0.5">
                                            <span className="text-slate-450 font-mono">₹</span>
                                            <input 
                                              type="number" 
                                              value={line.unitPrice} 
                                              onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'unitPrice', Number(e.target.value))}
                                              className="w-full font-bold font-mono focus:outline-none bg-transparent text-slate-900 dark:text-slate-100"
                                            />
                                          </div>
                                        </div>

                                        {/* Line total column */}
                                        <div className="md:col-span-1 text-right">
                                          <span className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">GST %</span>
                                          <input 
                                            type="number" 
                                            value={line.taxRate} 
                                            onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'taxRate', Number(e.target.value))}
                                            className="w-8 font-bold font-mono focus:outline-none bg-transparent text-slate-900 dark:text-slate-100 text-right"
                                          />
                                        </div>
                                      </div>

                                      {/* Sub-row: Batch Number, Expiry Date & Delete Button */}
                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 text-xs mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-850">
                                        <div className="md:col-span-4 flex items-center gap-2">
                                          <label className="text-[8.5px] uppercase text-slate-450 font-extrabold shrink-0">Batch Number:</label>
                                          <input 
                                            type="text"
                                            value={line.batchNumber || ''}
                                            onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'batchNumber', e.target.value)}
                                            className="flex-1 font-mono text-[11.5px] focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-850 text-slate-700 dark:text-slate-350"
                                            placeholder="N/A"
                                          />
                                        </div>

                                        <div className="md:col-span-4 flex items-center gap-2">
                                          <label className="text-[8.5px] uppercase text-slate-450 font-extrabold shrink-0">Expiry Date:</label>
                                          <input 
                                            type="date"
                                            value={line.expiryDate || ''}
                                            onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'expiryDate', e.target.value)}
                                            className="flex-1 font-mono text-[11.5px] focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-850 text-slate-700 dark:text-slate-350"
                                          />
                                        </div>

                                        <div className="md:col-span-4 flex justify-end items-center gap-3">
                                          <div className="text-right">
                                            <span className="text-[8px] text-slate-450 font-bold block">LINE SUM</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-300 font-mono">
                                              ₹{(line.totalAmount || 0).toLocaleString('en-IN')}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => removeLineItem(selectedInvoiceIndex, lIdx)}
                                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer shrink-0"
                                            title="Delete Row"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Collapsible Physical Specs & Coil Parameters */}
                                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                                        <details className="group">
                                          <summary className="list-none flex items-center justify-between text-[10px] uppercase font-black text-indigo-600/70 dark:text-indigo-400/70 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none">
                                            <span className="flex items-center gap-1.5">
                                              <SlidersHorizontal className="h-3 w-3" />
                                              Physical Specifications & Coil Parameters
                                            </span>
                                            <span className="transition-transform group-open:rotate-180">
                                              <ChevronDown className="h-3.5 w-3.5" />
                                            </span>
                                          </summary>
                                          
                                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 pb-1 text-[11px]">
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Length</label>
                                              <input 
                                                type="text" 
                                                value={line.length || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'length', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 10m, 50ft"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Width</label>
                                              <input 
                                                type="text" 
                                                value={line.width || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'width', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 2m, 4ft"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Height</label>
                                              <input 
                                                type="text" 
                                                value={line.height || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'height', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 1.5m"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Thickness</label>
                                              <input 
                                                type="text" 
                                                value={line.thickness || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'thickness', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 2mm, 10 SWG"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Diameter</label>
                                              <input 
                                                type="text" 
                                                value={line.diameter || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'diameter', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 8mm, 1/2 inch"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Gauge</label>
                                              <input 
                                                type="text" 
                                                value={line.gauge || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'gauge', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 16 SWG"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Size</label>
                                              <input 
                                                type="text" 
                                                value={line.size || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'size', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. Medium, 12x15"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Dimension</label>
                                              <input 
                                                type="text" 
                                                value={line.dimension || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'dimension', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 10x10x15 cm"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Weight</label>
                                              <input 
                                                type="text" 
                                                value={line.weight || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'weight', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 15kg"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[8.5px] uppercase text-slate-450 font-bold block mb-1">Volume</label>
                                              <input 
                                                type="text" 
                                                value={line.volume || ''} 
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'volume', e.target.value)}
                                                className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                placeholder="e.g. 1L, 500ml"
                                              />
                                            </div>
                                          </div>

                                          {/* Coil-specific sub-card */}
                                          <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-100 dark:border-slate-850">
                                            <div className="flex items-center gap-2 mb-1.5">
                                              <input 
                                                type="checkbox" 
                                                id={`isCoil-${lIdx}`}
                                                checked={!!line.isCoil}
                                                onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'isCoil', e.target.checked)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                              />
                                              <label htmlFor={`isCoil-${lIdx}`} className="text-[9px] font-bold uppercase tracking-wide text-slate-650 dark:text-slate-300 cursor-pointer">
                                                Product is a Coil (Enable Coil Fields)
                                              </label>
                                            </div>

                                            {line.isCoil && (
                                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 pt-1 text-[11px]">
                                                <div>
                                                  <label className="text-[8px] uppercase text-slate-450 font-bold block mb-0.5">Coil Qty</label>
                                                  <input 
                                                    type="number" 
                                                    value={line.coilInfo?.coilQuantity || 1} 
                                                    onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'coilInfo', { ...(line.coilInfo || {}), coilQuantity: Number(e.target.value) })}
                                                    className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[8px] uppercase text-slate-450 font-bold block mb-0.5">Coil Length</label>
                                                  <input 
                                                    type="number" 
                                                    value={line.coilInfo?.coilLength || 0} 
                                                    onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'coilInfo', { ...(line.coilInfo || {}), coilLength: Number(e.target.value) })}
                                                    className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[8px] uppercase text-slate-450 font-bold block mb-0.5">Coil Unit</label>
                                                  <select
                                                    value={line.coilInfo?.coilLengthUnit || 'Meter'}
                                                    onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'coilInfo', { ...(line.coilInfo || {}), coilLengthUnit: e.target.value })}
                                                    className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                  >
                                                    <option value="Meter">Meter</option>
                                                    <option value="Feet">Feet</option>
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="text-[8px] uppercase text-slate-450 font-bold block mb-0.5">Coil Weight</label>
                                                  <input 
                                                    type="text" 
                                                    value={line.coilInfo?.coilWeight || ''} 
                                                    onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'coilInfo', { ...(line.coilInfo || {}), coilWeight: e.target.value })}
                                                    className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                    placeholder="e.g. 5kg"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[8px] uppercase text-slate-450 font-bold block mb-0.5">Coil Number</label>
                                                  <input 
                                                    type="text" 
                                                    value={line.coilInfo?.coilNumber || ''} 
                                                    onChange={(e) => updateLineItemField(selectedInvoiceIndex, lIdx, 'coilInfo', { ...(line.coilInfo || {}), coilNumber: e.target.value })}
                                                    className="w-full font-semibold focus:outline-none bg-transparent border-b border-dashed border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                                                    placeholder="Tag / Lot"
                                                  />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </details>
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Gross Calculated value and bulk action bar */}
                            <div className="flex flex-col md:flex-row gap-3 justify-between items-center p-4 bg-emerald-500/5 text-emerald-800 dark:text-emerald-450 border border-emerald-500/15 rounded-xl text-xs font-sans">
                              <div>
                                <span className="font-bold uppercase tracking-tight block">ACTIVE BILL SUM (ESTIMATED):</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Values are automatically recalculated inclusive of GST rate tiers</span>
                              </div>
                              <span className="font-black font-mono text-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                                ₹{(activeInvoice.totalAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* New Units Approval Panel */}
                            {(() => {
                              const unmapped = getUnrecognizedUnits(activeInvoice);
                              if (unmapped.length === 0) return null;
                              return (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2.5 animate-fadeIn">
                                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-amber-500" />
                                    <span className="text-xs font-black uppercase tracking-wider">New Unit(s) Requiring Approval:</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    The following custom Units of Measurement (UOM) were detected by AI OCR but do not exist in standard Unit Master. Approve to save them directly to standard Unit Master. Unchecked units will still be used in stock transactions but won't pollute standard directory.
                                  </p>
                                  <div className="flex flex-wrap gap-2.5 pt-1">
                                    {unmapped.map((uName) => {
                                      const isApproved = approvedNewUnits.includes(uName);
                                      return (
                                        <label 
                                          key={uName} 
                                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all select-none ${
                                            isApproved 
                                              ? 'bg-amber-500/15 border-amber-400 text-amber-800 dark:text-amber-300' 
                                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500'
                                          }`}
                                        >
                                          <input 
                                            type="checkbox" 
                                            checked={isApproved}
                                            onChange={() => handleToggleApprovedUnit(uName)}
                                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                                          />
                                          <span>📏 {uName}</span>
                                          <span className="text-[9px] font-mono opacity-80">
                                            ({isApproved ? 'Approved' : 'Ignored'})
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Final Action Handlers */}
                            <div className="flex justify-between items-center pt-2">
                              <div className="text-slate-400 text-[10.5px]">
                                Queue contains <span className="font-extrabold text-slate-650 dark:text-slate-300">{extractedInvoices.length} document(s)</span>
                              </div>
                              <div className="flex gap-2 text-xs font-bold">
                                <button 
                                  onClick={() => { setExtractedInvoices([]); setSelectedInvoiceIndex(-1); }}
                                  className="px-4 py-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  Reset
                                </button>
                                
                                {extractedInvoices.length > 1 && (
                                  <button
                                    onClick={handleConfirmAndPostAIInvoice}
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
                                  >
                                    <Check className="h-4 w-4 animate-bounce" /> One-Click Import All Verified ({extractedInvoices.length} Bills)
                                  </button>
                                )}

                                {extractedInvoices.length === 1 && (
                                  <button 
                                    onClick={handleConfirmAndPostAIInvoice}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="h-4 w-4" /> Ingest & Update Stock
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>

                {/* Bulk OCR Job diagnostic failure reports */}
                {bulkErrorLogs.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 animate-fadeIn text-xs">
                    <p className="font-extrabold text-red-700 dark:text-red-400 flex items-center gap-1.5 uppercase">
                      <AlertCircle className="h-4.5 w-4.5" /> Troubleshooting Guide: Unreadable Documents ({bulkErrorLogs.length})
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      The following documents encountered page processing errors during bulk parsing. You can manually adjust stock or re-upload high-resolution scans.
                    </p>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto font-mono">
                      {bulkErrorLogs.map((log, idx) => (
                        <div key={idx} className="flex justify-between items-start gap-4 p-2 bg-black/5 dark:bg-black/20 rounded-lg">
                          <span className="font-bold text-slate-700 dark:text-slate-350 truncate">{log.fileName}</span>
                          <span className="text-red-500 text-right shrink-0">{log.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Option 2: Manual Stock Registry */}
          {activeSegment === 'manual' && (
            <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/60 border-b flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-emerald-500 animate-spin-slow" /> Option 2 – Manual Stock Addition
                </span>
                <span className="text-[10px] bg-emerald-505/10 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded font-mono">Real-Time Sync</span>
              </div>

              <form onSubmit={handleSaveManualEntry} className="p-6 space-y-5">
                
                {/* Scanned Barcode Active for New Item */}
                {scannedBarcodeForNewItem && (
                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/80 rounded-xl flex items-start gap-2.5 text-xs text-indigo-800 dark:text-indigo-400">
                    <QrCode className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-extrabold flex items-center gap-1.5">
                          <span>New Barcode SKU Active!</span>
                        </p>
                        <button 
                          type="button" 
                          onClick={() => setScannedBarcodeForNewItem(null)}
                          className="text-[10px] text-indigo-500 hover:underline font-bold font-sans cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-[10.5px] mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">
                        This item will be registered with your scanned custom barcode SKU: <strong className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-200">{scannedBarcodeForNewItem}</strong>. Enter its name and details below to save it into the database.
                      </p>
                    </div>
                  </div>
                )}

                {/* Duplicate Notification alert */}
                {duplicateWarning && (
                  <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/80 rounded-xl flex items-start gap-2.5 text-xs text-indigo-800 dark:text-indigo-455">
                    <AlertTriangle className="h-4 w-4 text-indigo-505 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold flex items-center gap-1.5">
                        <span>Duplicate Product Detected!</span>
                        <span className="px-1.5 py-0.2 bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 text-[8px] font-mono rounded">
                          SKU ID: {duplicateWarning.sku}
                        </span>
                      </p>
                      <p className="text-[10.5px] mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">
                        This item already exists in the Warehouse stock book catalog directory database. Saving this entry will increment its current stock by {manualForm.quantity} {manualForm.unit} and update its purchase config. No duplicates will be created!
                      </p>
                    </div>
                  </div>
                )}

                {/* Main manual form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Name field with search suggestion autocomplete */}
                  <div className="relative">
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Product Description / Name</label>
                    <div className="relative">
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Cisco IC Hardware Switch C5"
                        value={manualForm.name}
                        onChange={(e) => {
                          setManualForm({ ...manualForm, name: e.target.value });
                          setShowProductSuggestions(true);
                        }}
                        className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      />
                      <Search className="h-4 w-4 text-slate-400 absolute right-3 top-3" />
                    </div>

                    {/* Autocomplete items sugestions dropdown matching search prefix */}
                    {showProductSuggestions && manualForm.name.trim().length > 0 && (
                      <div className={`absolute z-10 w-full mt-1.5 max-h-48 overflow-y-auto rounded-xl border shadow-lg divide-y ${
                        isLight ? 'bg-white border-slate-200 divide-slate-100 text-slate-800' : 'bg-slate-950 border-slate-800 divide-slate-850 text-slate-300'
                      }`}>
                        {items
                          .filter(i => i.name.toLowerCase().includes(manualForm.name.toLowerCase()))
                          .map(i => (
                            <button
                              key={i.id}
                              type="button"
                              onClick={() => handleSelectAutocompleteItem(i)}
                              className="w-full text-left font-semibold text-xs px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex justify-between items-center"
                            >
                              <div>
                                <span className="block font-bold">{i.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono">HSN: {i.hsnCode} • SKU: {i.sku}</span>
                              </div>
                              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold font-mono">₹{i.unitCost} →</span>
                            </button>
                          ))
                        }
                        {items.filter(i => i.name.toLowerCase().includes(manualForm.name.toLowerCase())).length === 0 && (
                          <div className="p-3 text-[10px] text-slate-400 text-center font-mono">
                            New Unique Product SKU will be registered in Stock Book!
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">HSN Lookup Code</label>
                    <select
                      value={manualForm.hsnCode}
                      onChange={(e) => {
                        const hsn = e.target.value;
                        const mappedRate = hsnCatalog[hsn] ? hsnCatalog[hsn].rate : 18;
                        setManualForm({ ...manualForm, hsnCode: hsn, gstRate: mappedRate });
                      }}
                      className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    >
                      <option value="">-- Choose custom HSN category --</option>
                      {Object.keys(hsnCatalog).map(code => (
                        <option key={code} value={code}>
                          {code} - {hsnCatalog[code].desc} ({hsnCatalog[code].rate}% GST)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity & Unit */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Inflow Qty</label>
                      <input 
                        type="number"
                        required
                        min={1}
                        value={manualForm.quantity}
                        onChange={(e) => setManualForm({ ...manualForm, quantity: Number(e.target.value) })}
                        className={`w-full text-xs font-bold font-mono rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Inventory Unit</label>
                      <select
                        value={manualForm.unit}
                        onChange={(e) => setManualForm({ ...manualForm, unit: e.target.value })}
                        className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border focus:outline-none¹ focus:ring-1 focus:ring-indigo-500 ${
                          isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      >
                        <option value="Pcs">Pcs (Pieces)</option>
                        <option value="Nos">Nos (Numbers)</option>
                        <option value="Boxes">Boxes</option>
                        <option value="Kgs">Kgs (Kilograms)</option>
                        <option value="Mtr">Mtr (Meters)</option>
                        <option value="Coils">Coils</option>
                      </select>
                    </div>
                  </div>

                  {/* Pricing and GST */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Purchase Cost (Excl GST)</label>
                      <div className="relative">
                        <span className="text-slate-440 absolute left-3 top-2.5 text-xs">₹</span>
                        <input 
                          type="number"
                          required
                          min={0}
                          value={manualForm.purchasePrice}
                          onChange={(e) => setManualForm({ ...manualForm, purchasePrice: Number(e.target.value) })}
                          className={`w-full text-xs font-bold font-mono rounded-xl pl-6 pr-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Selling Target price</label>
                      <div className="relative">
                        <span className="text-slate-440 absolute left-3 top-2.5 text-xs">₹</span>
                        <input 
                          type="number"
                          value={manualForm.sellingPrice}
                          onChange={(e) => setManualForm({ ...manualForm, sellingPrice: Number(e.target.value) })}
                          className={`w-full text-xs font-bold font-mono rounded-xl pl-6 pr-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Supplier & Category */}
                  <div>
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Supplier / Vendor Partner Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Delta Semiconductors India Ltd."
                      value={manualForm.supplierName}
                      onChange={(e) => setManualForm({ ...manualForm, supplierName: e.target.value })}
                      className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Select Yard / Godown Storage</label>
                    <select
                      value={manualForm.godownId}
                      onChange={(e) => setManualForm({ ...manualForm, godownId: e.target.value })}
                      className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    >
                      {godowns.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.location})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Record Ingestion Date</label>
                    <input 
                      type="date"
                      value={manualForm.date}
                      onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                      className={`w-full text-xs font-bold font-mono rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">GST Tax Slab Ratio (%)</label>
                    <input 
                      type="number"
                      value={manualForm.gstRate}
                      onChange={(e) => setManualForm({ ...manualForm, gstRate: Number(e.target.value) })}
                      className={`w-full text-xs font-bold font-mono rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        isLight ? 'bg-white border-slate-250 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    />
                  </div>

                </div>

                <div className={`p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center border gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                }`}>
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] uppercase text-slate-450 font-bold block">Dynamic Calculated Valuation (Incl GST):</span>
                    <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{computedTotalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-xs font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="h-4 w-4" /> Save Directly to Stock Book
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Real Camera QR/Barcode Scanner Modal */}
          <CameraBarcodeScanner
            isOpen={isBarcodeOpen}
            onClose={() => setIsBarcodeOpen(false)}
            items={items}
            transactions={transactions}
            onSelectProduct={handleSelectScannedProduct}
            isLight={isLight}
            showToast={showToast}
          />

          {/* Edit Transaction Modal */}
          {editingTx && (
            <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
              <form onSubmit={handleSaveEditedTx} className={`w-full max-w-md rounded-2xl border shadow-xl p-6 ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
              }`}>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h3 className="text-xs font-black uppercase text-indigo-505 flex items-center gap-1.5">
                    <Edit2 className="h-4 w-4" /> LEDGER TRANSACTION ADJUSTMENT [{editingTx.id}]
                  </h3>
                  <button type="button" onClick={() => setEditingTx(null)} className="text-slate-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-105">Product: {editingTx.itemName}</p>
                    <p className="text-slate-500 font-mono text-[10px]">SKU: {editingTx.sku}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Adjusted Qty</label>
                      <input 
                        type="number"
                        required
                        min={1}
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                        className="w-full text-xs font-mono p-2 border rounded dark:bg-slate-950 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-455 font-bold mb-1">Billing Value Cost</label>
                      <input 
                        type="number"
                        required
                        min={0}
                        value={editForm.unitCost}
                        onChange={(e) => setEditForm({ ...editForm, unitCost: Number(e.target.value) })}
                        className="w-full text-xs font-mono p-2 border rounded dark:bg-slate-950 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Invoice Number (Reference)</label>
                    <input 
                      type="text"
                      value={editForm.invoiceNumber}
                      onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                      className="w-full text-xs font-mono p-2 border rounded dark:bg-slate-950 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-450 font-bold mb-1">Record Date</label>
                    <input 
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full text-xs font-mono p-2 border rounded dark:bg-slate-950 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 text-xs font-bold pt-3 border-t">
                    <button type="button" onClick={() => setEditingTx(null)} className="px-4 py-2 hover:bg-slate-100 rounded dark:hover:bg-slate-800">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 bg-indigo-600 rounded text-white hover:bg-indigo-505">
                      Confirm Adjustments &rarr;
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Stock Increase History List */}
          <div className={`border rounded-2xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="px-5 py-4 border-b bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                  Stock Increase Ledger History
                </span>
                <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">Audit trails of historical stock inflows</span>
              </div>

              {/* PDF and Excel Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="px-3 py-1.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 text-slate-805 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 focus:outline-none border dark:border-slate-700 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print PDF Ledger
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 focus:outline-none border border-emerald-705 shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel Csv
                </button>
              </div>
            </div>

            {/* Quick Filter Bar */}
            <div className="p-4 bg-slate-50/20 dark:bg-slate-950/20 border-b flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="Query product name, SKU code or invoice reference..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full text-xs rounded-lg pl-9 pr-4 py-2 border dark:bg-slate-950 focus:outline-none"
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex gap-2">
                <select
                  value={historyGodownFilter}
                  onChange={(e) => setHistoryGodownFilter(e.target.value)}
                  className="text-xs rounded-lg border dark:bg-slate-950 px-3 py-2 cursor-pointer font-semibold"
                >
                  <option value="ALL">All Warehouses</option>
                  {godowns.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                <select
                  value={historySupplierFilter}
                  onChange={(e) => setHistorySupplierFilter(e.target.value)}
                  className="text-xs rounded-lg border dark:bg-slate-950 px-3 py-2 cursor-pointer font-semibold"
                >
                  <option value="ALL">All Suppliers</option>
                  <option value="Delta Semiconductors">Delta Semiconductors</option>
                  <option value="Intel Chipset">Intel Logistics</option>
                  <option value="Cisco Hardware">Cisco Distributorship</option>
                </select>
              </div>
            </div>

            {/* Ledger Inflows Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className={`border-b text-[10px] uppercase font-bold tracking-tight ${
                    isLight ? 'bg-slate-101 border-slate-200 text-slate-500' : 'bg-slate-950/60 border-slate-850 text-slate-400'
                  }`}>
                    <th className="px-4 py-3">Tx ID</th>
                    <th className="px-4 py-3">Timestamp / Date</th>
                    <th className="px-4 py-3">Product description / SKU</th>
                    <th className="px-4 py-3 text-center">Inflow Qty</th>
                    <th className="px-4 py-3">Purchase unit Price</th>
                    <th className="px-4 py-3">Supplier Invoice #</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono">
                  {filteredInflowHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20">
                      <td className="px-4 py-3 font-bold text-slate-500 font-mono text-[10.5px]">
                        {tx.id}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10.5px] whitespace-nowrap">
                        {tx.timestamp.split('T')[0]} <span className="text-[9px] text-slate-400">{tx.timestamp.split('T')[1]?.substring(0,5)}</span>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span className="block font-bold text-slate-900 dark:text-slate-150 text-xs">{tx.itemName}</span>
                        <span className="text-[9.5px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-950 px-1.5 py-0.2 rounded mt-0.5 inline-block">{tx.sku}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-extrabold text-blue-600 dark:text-indigo-400">
                        +{tx.quantity} units
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                        ₹{tx.unitCost.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-xs text-indigo-600 dark:text-indigo-405 font-semibold">
                        {tx.invoiceNumber || 'Manual Entry'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTx(tx)}
                            title="Edit Ledger Entry"
                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTx(tx.id)}
                            title="Delete Stock Inflow"
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInflowHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-10 text-xs text-slate-400 font-sans">
                        No inflow stock records located matching active search query constraints.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Right Pane Supplementary Widgets (Bento Grid cards) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Barcode Quick Trigger Widget */}
          <div className={`p-5 border rounded-2xl space-y-3.5 ${
            isLight ? 'bg-gradient-to-br from-indigo-50/50 to-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-400 font-extrabold uppercase tracking-wide">
              <QrCode className="h-4.5 w-4.5 text-rose-500 animate-pulse" /> Live Barcode Optical Scanner
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
              Scan barcode tags physically to instantly auto-fill the whole product form metadata using standardized laser lookup matrices!
            </p>
            <button
              onClick={() => {
                setIsBarcodeOpen(true);
                setScannedCode('');
                setBarcodeQuery('');
              }}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-650 to-teal-650 hover:from-indigo-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <QrCode className="h-4 w-4" /> Start Camera Scan
            </button>
          </div>

          {/* Summary stats widget */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-slate-205 shadow-sm' : 'bg-slate-900 border-slate-800'
          }`}>
            <span className="text-[10px] tracking-wider uppercase font-black text-emerald-600 dark:text-emerald-450 block">Active Ledger aggregate metrics</span>
            
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className={`p-3 border rounded-xl ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-850'}`}>
                <span className="text-[9px] uppercase font-sans font-bold text-slate-400 block">Sum Inflows Count</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{filteredInflowHistory.length} txs</span>
              </div>
              <div className={`p-3 border rounded-xl ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-850'}`}>
                <span className="text-[9px] uppercase font-sans font-bold text-slate-400 block">Cumulative Qty</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{totalInflowItemsCount} units</span>
              </div>
            </div>

            <div className={`p-3 border border-dashed rounded-xl flex items-center justify-between text-xs ${
              isLight ? 'bg-slate-50 border-slate-250' : 'bg-slate-950 border-slate-150'
            }`}>
              <span className="font-bold text-slate-400">Total Valuation cost:</span>
              <span className="font-extrabold font-mono text-emerald-600">₹{totalInflowValuation.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Quick FAQ / Guide */}
          <div className={`p-5 rounded-2xl border space-y-3 text-xs leading-relaxed ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
          }`}>
            <span className="font-bold uppercase text-slate-400 block tracking-wider text-[10px]">OPERATOR SAFETY POLICY SPEC:</span>
            <ul className="space-y-1.5 list-disc pl-4 text-[10.5px] text-slate-500 font-sans">
              <li>Use Option 1 with standard physical invoices of digital layout. Check calculations before saving.</li>
              <li>Option 2 includes strict real-time double product lookup algorithms to enforce no duplicate SKUs.</li>
              <li>Reverting transactions will immediately deduct catalog values.</li>
              <li>All pricing formats comply with GSTIN fiscal ledger tax regulations.</li>
            </ul>
          </div>

        </div>

      </div>

      <PdfProgressOverlay
        isOpen={isPdfOverlayOpen}
        onComplete={() => {
          setIsPdfOverlayOpen(false);
          window.print();
        }}
        documentTitle="Stock Inflow Ledger Report"
        pageCount={Math.max(1, Math.ceil(filteredInflowHistory.length / 10))}
      />

    </div>
  );
}
