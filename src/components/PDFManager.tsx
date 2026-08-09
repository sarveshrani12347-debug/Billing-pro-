import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, Download, Share2, FileText, Search, RotateCw, ZoomIn, ZoomOut, 
  Maximize2, ChevronLeft, ChevronRight, Trash2, Copy, Edit, Check, X, Eye, 
  Settings, Folder, Mail, MessageSquare, CheckCircle2, AlertTriangle, RefreshCw,
  ExternalLink
} from 'lucide-react';
import { BusinessDocument, User } from '../types';

interface PDFFileMetadata {
  id: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  fileName: string;
  fileSize: string;
  createdTime: string;
  pdfData?: string; // Optional raw base64 data
}

interface PDFManagerProps {
  isLight: boolean;
  user: User | null;
  documents: BusinessDocument[];
  onRefreshData?: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  bizDetails?: any;
  activeDocToGenerate?: BusinessDocument | null;
  onClearActiveDoc?: () => void;
}

export const PDFManager: React.FC<PDFManagerProps> = ({
  isLight,
  user,
  documents,
  onRefreshData,
  onShowToast,
  bizDetails,
  activeDocToGenerate,
  onClearActiveDoc
}) => {
  // --- STATE DECLARATIONS ---
  const [pdfFiles, setPdfFiles] = useState<PDFFileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Visual Progress Overlay for PDF Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [generationPages, setGenerationPages] = useState(1);
  const [generatingDoc, setGeneratingDoc] = useState<BusinessDocument | null>(null);

  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);
  
  // Viewer state
  const [selectedPdf, setSelectedPdf] = useState<PDFFileMetadata | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [viewerDarkMode, setViewerDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Dialog State
  const [autoOpenDialog, setAutoOpenDialog] = useState<{
    open: boolean;
    pdfId: string;
    invoiceNumber: string;
  } | null>(null);
  
  // Custom Download state
  const [downloadDialog, setDownloadDialog] = useState<{
    open: boolean;
    pdf: PDFFileMetadata;
  } | null>(null);
  const [downloadFolder, setDownloadFolder] = useState<string>('Invoices');
  const [downloadFileName, setDownloadFileName] = useState<string>('');
  
  // Rename state
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    pdf: PDFFileMetadata;
    newName: string;
  } | null>(null);

  // Print Settings state
  const [printFormat, setPrintFormat] = useState<'A4_P' | 'A4_L' | '58MM' | '80MM'>('A4_P');
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  // --- REAL PDF.JS VIEW ENGINE ---
  const [pdfRendering, setPdfRendering] = useState<boolean>(false);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Convert base64 to Blob URL
  const getBlobUrl = (b64: string): string => {
    try {
      if (!b64) return '';
      const binaryString = window.atob(b64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Error creating blob URL:", e);
      return '';
    }
  };

  // Open PDF Blob URL in new browser tab
  const handlePreviewInNewTab = async (pdfId: string) => {
    setLoading(true);
    try {
      const b64 = await fetchPdfContent(pdfId);
      if (!b64) throw new Error('Could not download pdf content.');
      
      const blobUrl = getBlobUrl(b64);
      if (blobUrl) {
        window.open(blobUrl, '_blank');
        onShowToast('PDF opened in new browser tab.', 'success');
      } else {
        throw new Error('Failed to create Blob URL.');
      }
    } catch (e: any) {
      onShowToast(`New Tab Preview Failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Dynamically load PDF.js libraries from Cloudflare CDN
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          resolve(pdfjsLib);
        } else {
          reject(new Error('pdfjsLib initialization failed on window.'));
        }
      };
      script.onerror = () => {
        reject(new Error('CDN failed to load PDF.js script.'));
      };
      document.head.appendChild(script);
    });
  };

  // Run PDF.js Canvas Page Renderer whenever state changes
  useEffect(() => {
    if (!pdfBase64 || !viewerOpen) return;
    
    let isCancelled = false;
    setPdfRendering(true);
    setPdfRenderError(null);
    
    const renderPDF = async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        if (isCancelled) return;
        
        // Convert base64 to binary array
        const binaryString = window.atob(pdfBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        
        if (isCancelled) return;
        setTotalPages(doc.numPages);
        
        // Render the current page
        const page = await doc.getPage(currentPage);
        if (isCancelled) return;
        
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }
        
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not acquire 2D canvas context.");
        
        // Calculate scale based on zoom
        const viewport = page.getViewport({ scale: zoom, rotation: rotation });
        
        // Support high-DPI retina screens
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";
        
        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;
          
        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        if (!isCancelled) {
          setPdfRendering(false);
        }
      } catch (err: any) {
        console.error("PDF.js Vector Render Failed:", err);
        if (!isCancelled) {
          setPdfRenderError(err.message || 'Error occurred during standard PDF.js rendering.');
          setPdfRendering(false);
        }
      }
    };
    
    // Allow React a micro-tick to render the canvas element in DOM
    const timer = setTimeout(() => {
      renderPDF();
    }, 50);
    
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pdfBase64, currentPage, zoom, rotation, viewerOpen]);

  // Search filter for PDF File Manager
  const [pdfSearch, setPdfSearch] = useState('');

  // Fetch all saved PDFs on mount
  useEffect(() => {
    fetchPdfList();
  }, []);

  // Handle trigger for active doc generation
  useEffect(() => {
    if (activeDocToGenerate) {
      handleGeneratePDF(activeDocToGenerate);
    }
  }, [activeDocToGenerate]);

  const fetchPdfList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pdfs');
      if (!res.ok) throw new Error('Failed to retrieve PDF directory.');
      const data = await res.json();
      setPdfFiles(data);
    } catch (err: any) {
      onShowToast(err.message || 'Could not load PDF archive.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPdfContent = async (id: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/pdfs/${id}`);
      if (!res.ok) throw new Error('PDF file could not be read.');
      const data = await res.json();
      return data.pdfData;
    } catch (err: any) {
      onShowToast(err.message, 'error');
      return null;
    }
  };

  // --- PROGRAMMATIC GST PDF GENERATOR (High-Performance Client-Side Engine) ---
  const handleGeneratePDF = async (doc: BusinessDocument) => {
    setLoading(true);
    setIsGenerating(true);
    setGeneratingDoc(doc);
    setGenerationProgress(5);
    setGenerationStage('Initializing compilation engine...');
    
    // Estimate page count: 1 page for up to 5 items, adding a page for every additional 6 items
    const estimatedPages = Math.max(1, Math.ceil((doc.items?.length || 1) / 5));
    setGenerationPages(estimatedPages);
    
    onShowToast(`Generating professional GST invoice layout for ${doc.docNumber}...`, 'info');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationProgress(15);
      setGenerationStage('Reading corporate identity design settings...');
      // Load configurations from local storage saved by Settings -> Invoice Design
      let config: any = null;
      try {
        const saved = localStorage.getItem('set_invoice_design');
        if (saved) {
          config = JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Could not read invoice design config from local storage", e);
      }

      // Safe defaults fallback
      if (!config) {
        config = {
          theme: 'classic',
          watermarkEnabled: true,
          watermarkType: 'text',
          watermarkText: 'ORIGINAL',
          watermarkLogoUrl: '',
          watermarkBgUrl: '',
          watermarkOpacity: 0.08,
          watermarkSize: 'medium',
          watermarkPosition: 'center',
          watermarkX: 50,
          watermarkY: 50,
          
          headerSymbolEnabled: false,
          headerSymbolType: 'swastik',
          headerSymbolCustomUrl: '',
          headerSymbolPosition: 'center',
          headerSymbolSize: 40,
          headerSymbolOpacity: 0.8,
          
          centerSymbolEnabled: false,
          centerSymbolType: 'om',
          centerSymbolCustomUrl: '',
          centerSymbolPlacement: 'above_table',
          centerSymbolOpacity: 0.5,
          centerSymbolSize: 50,
          
          primaryColor: '#0f172a',
          secondaryColor: '#475569',
          accentColor: '#4f46e5',
          headerBg: '#f8fafc',
          footerBg: '#ffffff',
          tableHeaderColor: '#f1f5f9',
          tableHeaderTextColor: '#1e293b',
          qrColor: '#000000',
          barcodeColor: '#000000',
          
          fontFamily: 'Inter',
          fontSize: 'medium',
          headerFont: 'Inter',
          bodyFont: 'Inter',
          footerFont: 'Inter',
          invoiceTitleFont: 'Inter',
          
          signatureUrl: '',
          stampUrl: '',
          sealUrl: '',
          signatureDisplay: 'signature',
          signatureVerified: true,
          
          termsAndConditions: '1. Goods once sold will not be taken back.\n2. Subject to Mumbai Jurisdiction.\n3. Payment is due within 15 days of invoice date.',
          declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
          thankYouMessage: 'Thank you for your business! We appreciate your partnership.',
          notes: 'Bank Details: HDFC Bank Corporate Cell | A/C: 50200012345678 | IFSC: HDFC0000123',
          warranty: '12 Months standard manufacture warranty covers internal hardware malfunctions.',
          returnPolicy: 'Easy return within 7 days in original packed state with intact seal.',
          
          qrEnabled: true,
          qrIncludeInvoiceNumber: true,
          qrIncludeCompanyDetails: true,
          qrIncludeGstDetails: true,
          qrIncludeWebsite: true,
          qrIncludeUpi: true,
          qrIncludeContact: true,
          qrCustomUrl: '',
          
          barcodeEnabled: true,
          barcodeType: 'code128',
          barcodeWidth: 1.5,
          barcodeHeight: 35,
          barcodeIncludeInvoice: true,
          barcodeIncludeProduct: false,
          
          templateId: 'slate',
          letterheadEnabled: false,
          letterheadUrl: '',
          footerBannerEnabled: false,
          footerBannerUrl: '',
          roundedTables: true,
          alternateRowColors: true,
          autoPageNumber: true,
          stampType: 'paid',
          confidentialWatermark: false,
          companySlogan: 'Your Trusted Technology Supply Partner',
          backgroundPattern: 'none',
          language: 'en',
          currency: 'INR',
          pdfPasswordProtected: false,
          pdfPassword: '',
          branchLogoUrl: '',
          branchName: 'Mumbai Corporate HQ',
          customerSpecificTemplate: false,
          autoSaveDraftEnabled: true
        };
      }

      // Color utility helpers
      const hexToRgb = (hex: string): [number, number, number] => {
        const cleanHex = (hex || '#000000').replace('#', '');
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return [isNaN(r) ? 15 : r, isNaN(g) ? 23 : g, isNaN(b) ? 42 : b];
      };

      // Font mapping for standard jsPDF fonts
      const getPdfFont = (fontName: string) => {
        const f = (fontName || '').toLowerCase();
        if (f.includes('serif') || f.includes('playfair') || f.includes('times')) return 'times';
        if (f.includes('mono') || f.includes('jetbrains') || f.includes('fira') || f.includes('courier')) return 'courier';
        return 'helvetica';
      };

      const pdfFont = getPdfFont(config.fontFamily);
      const currencySign = config.currency === 'USD' ? '$' : config.currency === 'EUR' ? '€' : config.currency === 'GBP' ? '£' : 'Rs';

      // Parse Brand Colors
      const pColor = hexToRgb(config.primaryColor || '#0f172a');
      const sColor = hexToRgb(config.secondaryColor || '#475569');
      const aColor = hexToRgb(config.accentColor || '#4f46e5');
      const hBgColor = hexToRgb(config.headerBg || '#f8fafc');
      const thBgColor = hexToRgb(config.tableHeaderColor || '#f1f5f9');
      const thTextColor = hexToRgb(config.tableHeaderTextColor || '#1e293b');

      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationProgress(35);
      setGenerationStage('Generating document canvasses & security watermarks...');

      // Create jsPDF Instance (A4 size by default, Portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const biz = bizDetails || {
        name: "Shree Billing Pro Inc.",
        address: "701, Antigravity Tech High Road, Navi Mumbai",
        gstin: "27AASCE9904E1Z0",
        owner: "Sarvesh Yadav",
        phone: "+91 98765 43210",
        email: "sarveshyadav8777@gmail.com"
      };

      // --- WATERMARK & CONFIDENTIAL DRAWING (Behind Content) ---
      if (config.watermarkEnabled) {
        try {
          pdf.saveGraphicsState();
          // @ts-ignore
          const GStateClass = pdf.constructor.GState || (jsPDF as any).GState;
          if (GStateClass) {
            const gState = new GStateClass({ opacity: config.watermarkOpacity || 0.08 });
            pdf.setGState(gState);
          }
        } catch (e) {
          console.warn("setGState not supported in jsPDF, drawing watermark directly", e);
        }

        if (config.watermarkType === 'text') {
          pdf.setFont(pdfFont, 'bold');
          pdf.setFontSize(config.watermarkSize === 'small' ? 30 : config.watermarkSize === 'medium' ? 55 : config.watermarkSize === 'large' ? 85 : 120);
          pdf.setTextColor(200, 200, 200);
          
          let wx = 105;
          let wy = 148;
          let angle = 45;
          
          if (config.watermarkPosition === 'top') { wx = 105; wy = 50; angle = 0; }
          else if (config.watermarkPosition === 'bottom') { wx = 105; wy = 250; angle = 0; }
          else if (config.watermarkPosition === 'left') { wx = 40; wy = 148; angle = 90; }
          else if (config.watermarkPosition === 'right') { wx = 170; wy = 148; angle = 90; }
          else if (config.watermarkPosition === 'custom') {
            wx = ((config.watermarkX || 50) / 100) * 210;
            wy = ((config.watermarkY || 50) / 100) * 297;
          }
          
          pdf.text(config.watermarkText || 'ORIGINAL', wx, wy, {
            align: 'center',
            angle: angle
          });
        } else if (config.watermarkType === 'logo' && config.watermarkLogoUrl) {
          let wx = 105;
          let wy = 148;
          let wSize = config.watermarkSize === 'small' ? 30 : config.watermarkSize === 'medium' ? 65 : config.watermarkSize === 'large' ? 105 : 170;
          
          if (config.watermarkPosition === 'top') { wx = 105; wy = 50; }
          else if (config.watermarkPosition === 'bottom') { wx = 105; wy = 250; }
          else if (config.watermarkPosition === 'left') { wx = 40; wy = 148; }
          else if (config.watermarkPosition === 'right') { wx = 170; wy = 148; }
          else if (config.watermarkPosition === 'custom') {
            wx = ((config.watermarkX || 50) / 100) * 210;
            wy = ((config.watermarkY || 50) / 100) * 297;
          }
          try {
            pdf.addImage(config.watermarkLogoUrl, 'PNG', wx - wSize / 2, wy - wSize / 2, wSize, wSize, undefined, 'FAST');
          } catch (err) {
            console.warn("Watermark logo failed to render", err);
          }
        } else if (config.watermarkType === 'background' && config.watermarkBgUrl) {
          try {
            pdf.addImage(config.watermarkBgUrl, 'PNG', 5, 5, 200, 287, undefined, 'FAST');
          } catch (err) {
            console.warn("Watermark bg failed to render", err);
          }
        }

        try {
          pdf.restoreGraphicsState();
        } catch (e) {}
      }

      // Draw Confidential Text Watermark
      if (config.confidentialWatermark) {
        try {
          pdf.saveGraphicsState();
          // @ts-ignore
          const GStateClass = pdf.constructor.GState || (jsPDF as any).GState;
          if (GStateClass) {
            const gState = new GStateClass({ opacity: 0.08 });
            pdf.setGState(gState);
          }
          pdf.setFont(pdfFont, 'bold');
          pdf.setFontSize(70);
          pdf.setTextColor(239, 68, 68);
          pdf.text("CONFIDENTIAL", 105, 175, { align: 'center', angle: -25 });
          pdf.restoreGraphicsState();
        } catch (e) {}
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationProgress(55);
      setGenerationStage('Compiling corporate header & tax billing entities (Page 1)...');

      // --- PAGE 1 DESIGN & DRAWING ---
      // Document frame border styled with Primary brand color
      pdf.setDrawColor(pColor[0], pColor[1], pColor[2]);
      pdf.setLineWidth(0.4);
      pdf.rect(5, 5, 200, 287); // Page border

      // 1. Corporate Header Banner (Top section or Custom Letterhead Banner)
      if (config.letterheadEnabled && config.letterheadUrl) {
        try {
          pdf.addImage(config.letterheadUrl, 'PNG', 5, 5, 200, 25, undefined, 'FAST');
        } catch (err) {
          console.warn("Letterhead image failed, falling back to corporate header banner", err);
          pdf.setFillColor(pColor[0], pColor[1], pColor[2]);
          pdf.rect(5, 5, 200, 15, 'F');
        }
      } else {
        pdf.setFillColor(pColor[0], pColor[1], pColor[2]);
        pdf.rect(5, 5, 200, 15, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(pdfFont, 'bold');
        pdf.setFontSize(14);
        const getDocHeaderTitle = (type: string) => {
          switch (type) {
            case 'QUOTATION': return 'OFFICIAL B2B QUOTATION';
            case 'ESTIMATE': return 'COMMERCIAL VALUE ESTIMATE';
            case 'INVOICE': return 'TAX INVOICE - INDIAN GST COMPLIANT';
            case 'PURCHASE_ORDER': return 'OFFICIAL PURCHASE ORDER';
            case 'DELIVERY_NOTE': return 'DELIVERY NOTE / CHALLAN';
            case 'RECEIPT': return 'SALES & PAYMENT RECEIPT';
            case 'CREDIT_NOTE': return 'CREDIT NOTE - ERP RECONCILIATION';
            case 'DEBIT_NOTE': return 'DEBIT NOTE - ERP RECONCILIATION';
            default: return 'BUSINESS TRANSACTION DOCUMENT';
          }
        };
        pdf.text(getDocHeaderTitle(doc.docType), 10, 14);
        pdf.setFontSize(9.5);
        pdf.setFont(pdfFont, 'normal');
        pdf.text(`Original Copy • UTC Generation Time: ${new Date().toLocaleTimeString()}`, 115, 14);
      }

      // Header symbols
      if (config.headerSymbolEnabled) {
        try {
          pdf.saveGraphicsState();
          // @ts-ignore
          const GStateClass = pdf.constructor.GState || (jsPDF as any).GState;
          if (GStateClass) {
            const gState = new GStateClass({ opacity: config.headerSymbolOpacity || 0.8 });
            pdf.setGState(gState);
          }
          
          let symX = 105;
          if (config.headerSymbolPosition === 'left') symX = 15;
          else if (config.headerSymbolPosition === 'right') symX = 195;
          
          const symY = 12;
          const hSymbolSize = config.headerSymbolSize || 30;
          
          if (config.headerSymbolType === 'custom' && config.headerSymbolCustomUrl) {
            pdf.addImage(config.headerSymbolCustomUrl, 'PNG', symX - hSymbolSize / 6, symY - hSymbolSize / 6, hSymbolSize / 3, hSymbolSize / 3, undefined, 'FAST');
          } else if (config.headerSymbolType === 'logo' && config.watermarkLogoUrl) {
            pdf.addImage(config.watermarkLogoUrl, 'PNG', symX - hSymbolSize / 6, symY - hSymbolSize / 6, hSymbolSize / 3, hSymbolSize / 3, undefined, 'FAST');
          } else {
            const symMap: Record<string, string> = {
              ganpati: "|| Shree Ganeshay Namah ||",
              om: "🕉 OM 🕉",
              swastik: "卐 SWASTIK 卐",
              lakshmi: "🌸 SHREE LAKSHMI 🌸",
              saraswati: "🎻 SHREE SARASWATI 🎻"
            };
            const symText = symMap[config.headerSymbolType] || "";
            if (symText) {
              pdf.setTextColor(255, 255, 255);
              pdf.setFont(pdfFont, 'bold');
              pdf.setFontSize(Math.max(6, hSymbolSize * 0.18));
              pdf.text(symText, symX, symY + 1.5, { align: 'center' });
            }
          }
          pdf.restoreGraphicsState();
        } catch (e) {}
      }

      // 2. Company Billing Entity & Slogan (Top Left)
      pdf.setTextColor(pColor[0], pColor[1], pColor[2]);
      pdf.setFont(pdfFont, 'bold');
      pdf.setFontSize(13);
      pdf.text(biz.name, 10, 31);
      
      let nextTextY = 36;
      if (config.companySlogan) {
        pdf.setFont(pdfFont, 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(aColor[0], aColor[1], aColor[2]);
        pdf.text(config.companySlogan, 10, 36);
        nextTextY = 41;
      }
      
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
      pdf.text(biz.address, 10, nextTextY);
      pdf.text(`Phone: ${biz.phone}  |  Email: ${biz.email}`, 10, nextTextY + 5);
      
      pdf.setFont(pdfFont, 'bold');
      pdf.setTextColor(pColor[0], pColor[1], pColor[2]);
      pdf.text(`GSTIN Number: ${biz.gstin}`, 10, nextTextY + 10);

      if (config.branchName) {
        pdf.setFont(pdfFont, 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(110, 110, 110);
        pdf.text(`Corporate Branch: ${config.branchName}`, 10, nextTextY + 14);
      }

      // 3. Invoice Metadata Box (Top Right with primary theme colors)
      pdf.setFillColor(hBgColor[0], hBgColor[1], hBgColor[2]);
      pdf.rect(130, 24, 70, 26, 'F');
      pdf.setDrawColor(pColor[0], pColor[1], pColor[2]);
      pdf.rect(130, 24, 70, 26);

      pdf.setTextColor(pColor[0], pColor[1], pColor[2]);
      pdf.setFont(pdfFont, 'bold');
      pdf.setFontSize(10);
      pdf.text(`No: ${doc.docNumber}`, 134, 31);
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
      pdf.text(`Date: ${doc.date}`, 134, 36);
      if (doc.dueDate) {
        pdf.text(`Due Date: ${doc.dueDate}`, 134, 41);
      }
      pdf.text(`Status: ${doc.status}`, 134, 46);

      // Divider Line
      pdf.setDrawColor(pColor[0], pColor[1], pColor[2]);
      pdf.setLineWidth(0.4);
      pdf.line(5, 56, 205, 56);

      // 4. Client / Consignee Billing Profile
      pdf.setFont(pdfFont, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(aColor[0], aColor[1], aColor[2]);
      pdf.text('BILL TO CLIENT / RECIPIENT:', 10, 62);

      pdf.setTextColor(pColor[0], pColor[1], pColor[2]);
      pdf.setFontSize(11);
      pdf.text(doc.clientName, 10, 68);
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
      pdf.text(doc.clientAddress || 'No primary billing address registered.', 10, 73);
      pdf.text(`Phone: ${doc.clientMobile || 'N/A'}  |  Email: ${doc.clientEmail || 'N/A'}`, 10, 78);
      if (doc.clientGst) {
        pdf.setFont(pdfFont, 'bold');
        pdf.setTextColor(pColor[0], pColor[1], pColor[2]);
        pdf.text(`Client GSTIN: ${doc.clientGst}`, 10, 83);
      }

      // Center Symbol Decorations
      if (config.centerSymbolEnabled) {
        try {
          pdf.saveGraphicsState();
          // @ts-ignore
          const GStateClass = pdf.constructor.GState || (jsPDF as any).GState;
          if (GStateClass) {
            const gState = new GStateClass({ opacity: config.centerSymbolOpacity || 0.4 });
            pdf.setGState(gState);
          }
          
          let cx = 105;
          let cy = 150;
          if (config.centerSymbolPlacement === 'above_table') {
            cx = 105;
            cy = 85;
          } else if (config.centerSymbolPlacement === 'above_signature') {
            cx = 165;
            cy = 225;
          }
          const cSize = config.centerSymbolSize || 45;
          
          if ((config.centerSymbolType === 'custom_religious' || config.centerSymbolType === 'custom_business') && config.centerSymbolCustomUrl) {
            pdf.addImage(config.centerSymbolCustomUrl, 'PNG', cx - cSize / 2, cy - cSize / 2, cSize, cSize, undefined, 'FAST');
          } else if (config.centerSymbolType === 'logo' && config.watermarkLogoUrl) {
            pdf.addImage(config.watermarkLogoUrl, 'PNG', cx - cSize / 2, cy - cSize / 2, cSize, cSize, undefined, 'FAST');
          } else {
            const symMapCenter: Record<string, string> = {
              ganpati: "🐘 Shree Ganesh 🐘",
              om: "🕉 OM 🕉",
              swastik: "卐 SWASTIK 卐",
            };
            const cText = symMapCenter[config.centerSymbolType] || "卐";
            pdf.setFont(pdfFont, 'bold');
            pdf.setFontSize(cSize * 0.35);
            pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
            pdf.text(cText, cx, cy, { align: 'center' });
          }
          pdf.restoreGraphicsState();
        } catch (e) {}
      }

      // Divider Line
      pdf.setDrawColor(pColor[0], pColor[1], pColor[2]);
      pdf.setLineWidth(0.4);
      pdf.line(5, 87, 205, 87);

      await new Promise(resolve => setTimeout(resolve, 350));
      setGenerationProgress(75);
      setGenerationStage(`Processing itemizations & calculating financial aggregates (Pages: 1 of ${estimatedPages})...`);

      // 5. Line Items Grid Headers with customizable theme
      let yOffset = 92;
      pdf.setFillColor(pColor[0], pColor[1], pColor[2]);
      
      // Rounded table headers option
      if (config.roundedTables) {
        pdf.roundedRect(5, yOffset, 200, 7.5, 1, 1, 'F');
      } else {
        pdf.rect(5, yOffset, 200, 7.5, 'F');
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFont(pdfFont, 'bold');
      pdf.setFontSize(8.5);
      pdf.text('SNo', 7, yOffset + 5);
      pdf.text('Billing Item particulars Description', 18, yOffset + 5);
      pdf.text('Qty', 115, yOffset + 5);
      pdf.text('Rate', 130, yOffset + 5);
      pdf.text('GST %', 150, yOffset + 5);
      pdf.text('CGST+SGST', 165, yOffset + 5);
      pdf.text('Total Valuation', 185, yOffset + 5);

      // Draw Grid Content
      yOffset += 7.5;
      pdf.setTextColor(pColor[0], pColor[1], pColor[2]);
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(8.5);

      doc.items.forEach((item, index) => {
        const taxPercent = Number(item.taxRate || 0);
        const itemSubtotal = item.qty * item.rate;
        const taxAmount = itemSubtotal * (taxPercent / 100);
        const halfTax = taxAmount / 2;

        const rowBg = config.alternateRowColors 
          ? (index % 2 === 0 ? 255 : 248)
          : 255;
          
        pdf.setFillColor(rowBg, rowBg, rowBg);
        pdf.rect(5, yOffset, 200, 8, 'F');
        pdf.setDrawColor(230, 230, 230);
        pdf.rect(5, yOffset, 200, 8);

        pdf.text(String(index + 1), 7, yOffset + 5.5);
        pdf.text(item.name, 18, yOffset + 5.5);
        pdf.text(String(item.qty), 115, yOffset + 5.5);
        pdf.text(`${currencySign} ${item.rate.toFixed(2)}`, 130, yOffset + 5.5);
        pdf.text(`${taxPercent}%`, 150, yOffset + 5.5);
        pdf.text(`${currencySign} ${(halfTax * 2).toFixed(2)}`, 165, yOffset + 5.5);
        pdf.text(`${currencySign} ${item.total.toFixed(2)}`, 185, yOffset + 5.5);

        yOffset += 8;
      });

      // 6. Balance calculations summary
      yOffset += 6;
      pdf.setDrawColor(pColor[0], pColor[1], pColor[2]);
      pdf.line(125, yOffset, 205, yOffset);

      yOffset += 5;
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
      pdf.text('Aggregate Subtotal Amount:', 128, yOffset);
      pdf.text(`${currencySign} ${doc.subtotal.toFixed(2)}`, 185, yOffset);

      yOffset += 5;
      pdf.text('Total GST Cess Posting:', 128, yOffset);
      pdf.text(`${currencySign} ${doc.taxTotal.toFixed(2)}`, 185, yOffset);

      if (doc.discount > 0) {
        yOffset += 5;
        pdf.text('Cash Discount Incentives:', 128, yOffset);
        pdf.text(`- ${currencySign} ${doc.discount.toFixed(2)}`, 185, yOffset);
      }

      yOffset += 6;
      pdf.setFillColor(thBgColor[0], thBgColor[1], thBgColor[2]);
      pdf.rect(125, yOffset - 4.5, 80, 7.5, 'F');
      pdf.setFont(pdfFont, 'bold');
      pdf.setTextColor(thTextColor[0], thTextColor[1], thTextColor[2]);
      pdf.text('GRAND RECEIVABLE SUM:', 128, yOffset);
      pdf.text(`${currencySign} ${doc.grandTotal.toFixed(2)}`, 185, yOffset);

      // Amount in words
      yOffset += 11;
      pdf.setTextColor(pColor[0], pColor[1], pColor[2]);
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(8.5);
      pdf.text('Total Invoice Sum in Words:', 10, yOffset);
      pdf.setFont(pdfFont, 'bold');
      pdf.text(`${numberToEnglishWords(doc.grandTotal)} Only`, 10, yOffset + 4.5);

      // --- PAID / UNPAID / DRAFT STAMPS (Rotated Overlay) ---
      if (config.stampType && config.stampType !== 'none') {
        try {
          pdf.saveGraphicsState();
          // @ts-ignore
          const GStateClass = pdf.constructor.GState || (jsPDF as any).GState;
          if (GStateClass) {
            const gState = new GStateClass({ opacity: 0.16 });
            pdf.setGState(gState);
          }
          
          let stampText = 'PAID';
          let stampColor: [number, number, number] = [34, 197, 94]; // Green
          
          if (config.stampType === 'unpaid') {
            stampText = 'UNPAID';
            stampColor = [239, 68, 68]; // Red
          } else if (config.stampType === 'cancelled') {
            stampText = 'CANCELLED';
            stampColor = [156, 163, 175]; // Grey
          } else if (config.stampType === 'draft') {
            stampText = 'DRAFT';
            stampColor = [59, 130, 246]; // Blue
          }
          
          pdf.setFont(pdfFont, 'bold');
          pdf.setFontSize(35);
          pdf.setTextColor(stampColor[0], stampColor[1], stampColor[2]);
          pdf.text(stampText, 145, 62, { angle: -12 });
          pdf.restoreGraphicsState();
        } catch (err) {}
      }

      // 7. Statutory declaration, Bank and signatures
      yOffset += 18;
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.line(5, yOffset, 205, yOffset);

      // Bank Details block (Left with custom bank notes)
      yOffset += 5;
      pdf.setFont(pdfFont, 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(aColor[0], aColor[1], aColor[2]);
      pdf.text('BANK DETAILS & SETTLEMENT INST:', 10, yOffset);
      pdf.setFont(pdfFont, 'normal');
      pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
      
      const bankRows = (config.notes || `Bank Holder Name: ${biz.name}\nBanker Brand Name: State Bank of India\nCredit Account Number: 4099052028711\nIFSC Clearance Code: SBIN0000301`).split('\n');
      bankRows.forEach((row: string, i: number) => {
        pdf.text(row.substring(0, 75), 10, yOffset + 4 + (i * 3.8));
      });

      // QR Code with custom Color & customized options
      if (config.qrEnabled) {
        const qrColorVal = hexToRgb(config.qrColor || '#000000');
        pdf.setDrawColor(qrColorVal[0], qrColorVal[1], qrColorVal[2]);
        pdf.setFillColor(252, 252, 252);
        pdf.rect(115, yOffset - 1, 23, 23, 'F');
        pdf.rect(115, yOffset - 1, 23, 23);
        
        pdf.setFont(pdfFont, 'bold');
        pdf.setFontSize(6);
        pdf.setTextColor(qrColorVal[0], qrColorVal[1], qrColorVal[2]);
        pdf.text('UPI PAY QR', 119, yOffset + 4);
        
        pdf.setFillColor(qrColorVal[0], qrColorVal[1], qrColorVal[2]);
        pdf.rect(117, yOffset + 6, 4, 4, 'F');
        pdf.rect(132, yOffset + 6, 4, 4, 'F');
        pdf.rect(117, yOffset + 17, 4, 4, 'F');
        pdf.rect(123, yOffset + 11, 2.5, 2.5, 'F');
        pdf.rect(128, yOffset + 13, 2.5, 2.5, 'F');
        pdf.rect(126, yOffset + 17, 3, 3, 'F');
      }

      // Authorised Signature Box & Stamps / Seals (Right)
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
      pdf.text('Certified / Authorised Signatory', 150, yOffset + 17);
      pdf.setDrawColor(sColor[0], sColor[1], sColor[2]);
      pdf.line(145, yOffset + 13, 195, yOffset + 13);
      pdf.setFont(pdfFont, 'italic');
      pdf.text(biz.owner, 160, yOffset + 11);

      // Render custom uploaded digital signatures / stamp / seals
      if (config.signatureDisplay === 'signature' && config.signatureUrl) {
        try {
          pdf.addImage(config.signatureUrl, 'PNG', 148, yOffset - 1, 35, 10, undefined, 'FAST');
        } catch (e) {}
      } else if (config.signatureDisplay === 'stamp' && config.stampUrl) {
        try {
          pdf.addImage(config.stampUrl, 'PNG', 150, yOffset - 5, 22, 14, undefined, 'FAST');
        } catch (e) {}
      } else if (config.signatureDisplay === 'both') {
        if (config.signatureUrl) {
          try {
            pdf.addImage(config.signatureUrl, 'PNG', 146, yOffset - 1, 26, 9, undefined, 'FAST');
          } catch (e) {}
        }
        if (config.stampUrl) {
          try {
            pdf.addImage(config.stampUrl, 'PNG', 174, yOffset - 5, 18, 11, undefined, 'FAST');
          } catch (e) {}
        }
      }
      
      // Stamp seal
      if (config.sealUrl) {
        try {
          pdf.addImage(config.sealUrl, 'PNG', 117, yOffset + 6, 19, 13, undefined, 'FAST');
        } catch (e) {}
      }

      // Barcode with customized width / height / color
      if (config.barcodeEnabled) {
        const barColorVal = hexToRgb(config.barcodeColor || '#000000');
        pdf.setFillColor(barColorVal[0], barColorVal[1], barColorVal[2]);
        
        const bStart = 145;
        const bY = yOffset + 21;
        const bH = config.barcodeHeight ? Math.min(15, config.barcodeHeight * 0.25) : 8;
        const bWFactor = config.barcodeWidth ? Math.min(2.0, config.barcodeWidth * 0.8) : 1.0;
        
        let currentX = bStart;
        const barWidths = [0.3, 0.6, 0.3, 0.9, 0.3, 0.3, 0.6, 0.9, 0.3, 0.6, 0.3, 0.6, 0.9, 0.3, 0.3, 0.6, 0.3, 0.9, 0.3, 0.6];
        barWidths.forEach((w) => {
          pdf.rect(currentX, bY, w * bWFactor, bH, 'F');
          currentX += (w * bWFactor) + 0.4;
        });
        
        pdf.setFont(pdfFont, 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
        pdf.text(`BARCODE: ${doc.docNumber}`, bStart + 1, bY + bH + 2.8);
      }

      // Custom Footer Banner
      if (config.footerBannerEnabled && config.footerBannerUrl) {
        try {
          pdf.addImage(config.footerBannerUrl, 'PNG', 5, 273, 200, 10, undefined, 'FAST');
        } catch (e) {}
      }

      // Terms, Warranties and Auto-page numbers
      yOffset += 33;
      pdf.setFont(pdfFont, 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(130, 130, 130);
      
      const tcTextVal = `Terms & Conditions: ${config.termsAndConditions || 'Goods once dispatched shall not be subject to credit returns.'}`;
      const decTextVal = `Declaration: ${config.declaration || 'This is a computer-generated digital tax document requiring no physical ink signatures.'}`;
      const warrantyVal = config.warranty ? `Warranty: ${config.warranty}` : '';
      const returnVal = config.returnPolicy ? `Return Policy: ${config.returnPolicy}` : '';
      
      pdf.text(tcTextVal.substring(0, 115), 10, yOffset);
      pdf.text(decTextVal.substring(0, 115), 10, yOffset + 3.2);
      
      let extraLinesY = yOffset + 6.4;
      if (warrantyVal || returnVal) {
        const fullExtra = [warrantyVal, returnVal].filter(Boolean).join(' | ');
        pdf.text(fullExtra.substring(0, 115), 10, extraLinesY);
        extraLinesY += 3.2;
      }
      
      if (config.thankYouMessage) {
        pdf.setFont(pdfFont, 'bold');
        pdf.setTextColor(aColor[0], aColor[1], aColor[2]);
        pdf.text(config.thankYouMessage, 10, extraLinesY);
      }

      // Auto page number footer
      if (config.autoPageNumber) {
        pdf.setFont(pdfFont, 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(150, 150, 150);
        pdf.text("Page 1 of 1", 195, 287, { align: 'right' });
      }

      await new Promise(resolve => setTimeout(resolve, 350));
      setGenerationProgress(88);
      setGenerationStage('Generating high-resolution 300 DPI vector pages & base64 encoding...');

      // Save PDF via Backend API
      const pdfBase64Data = pdf.output('datauristring').split(',')[1];
      const byteLength = Math.round((pdfBase64Data.length * 3) / 4);
      const sizeStr = formatBytes(byteLength);

      // Load file naming format pattern from PDF settings
      let fileNamingPattern = '[Type]_[Number]_[Date]';
      try {
        const pdfSettingsSaved = localStorage.getItem('pdf_generator_settings');
        if (pdfSettingsSaved) {
          const parsed = JSON.parse(pdfSettingsSaved);
          if (parsed.fileNamingFormat) {
            fileNamingPattern = parsed.fileNamingFormat;
          }
        }
      } catch (e) {
        console.warn("Could not read pdf generator settings from local storage", e);
      }

      const numClean = doc.docNumber.replace(/[^a-zA-Z0-9_-]/g, '');
      const dtClean = doc.date.replace(/[^0-9-]/g, '');
      const clientClean = doc.clientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const typeClean = doc.docType || 'INVOICE';

      let formattedFileName = fileNamingPattern;
      const placeholders = [
        { keys: ['{number}', '{Number}', '[number]', '[Number]'], value: numClean },
        { keys: ['{date}', '{Date}', '[date]', '[Date]'], value: dtClean },
        { keys: ['{client}', '{Client}', '[client]', '[Client]'], value: clientClean },
        { keys: ['{type}', '{Type}', '[type]', '[Type]'], value: typeClean.toUpperCase() }
      ];

      placeholders.forEach(({ keys, value }) => {
        keys.forEach(key => {
          formattedFileName = formattedFileName.split(key).join(value);
        });
      });

      ['{type_lower}', '[type_lower]'].forEach(key => {
        formattedFileName = formattedFileName.split(key).join(typeClean.toLowerCase());
      });

      formattedFileName = formattedFileName.replace(/[^a-zA-Z0-9_\.-]/g, '_');
      if (!formattedFileName || formattedFileName === '.pdf') {
        formattedFileName = `${typeClean.toUpperCase()}_${numClean}_${dtClean}`;
      }
      if (!formattedFileName.endsWith('.pdf')) {
        formattedFileName += '.pdf';
      }

      const payload = {
        invoiceNumber: doc.docNumber,
        customerName: doc.clientName,
        date: doc.date,
        fileName: formattedFileName,
        fileSize: sizeStr,
        pdfData: pdfBase64Data
      };

      await new Promise(resolve => setTimeout(resolve, 350));
      setGenerationProgress(95);
      setGenerationStage('Uploading compliance backup securely to Cloud DB vaults...');

      const saveRes = await fetch('/api/pdfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) throw new Error('Database backup failed for PDF document.');
      const savedMetadata = await saveRes.json();

      onShowToast(`Professional PDF generated and backed up securely to Cloud! (${sizeStr})`, 'success');
      fetchPdfList();

      // Trigger Auto-open Options Dialog
      setAutoOpenDialog({
        open: true,
        pdfId: savedMetadata.id,
        invoiceNumber: doc.docNumber
      });
    } catch (err: any) {
      onShowToast(err.message || 'Error occurred during high-fidelity PDF layout compilation.', 'error');
    } finally {
      setGenerationProgress(100);
      setGenerationStage('Compilation completed!');
      await new Promise(resolve => setTimeout(resolve, 400));
      setIsGenerating(false);
      setLoading(false);
      setGeneratingDoc(null);
      if (onClearActiveDoc) onClearActiveDoc();
      if (onRefreshData) onRefreshData();
    }
  };

  // --- ACTIONS FOR INDIVIDUAL PDF FILES ---
  const handleOpenPdf = async (pdfId: string) => {
    setLoading(true);
    try {
      const b64 = await fetchPdfContent(pdfId);
      if (!b64) throw new Error('Could not download pdf content.');
      
      const fileMeta = pdfFiles.find(p => p.id === pdfId);
      setSelectedPdf(fileMeta || null);
      setPdfBase64(b64);
      setZoom(1.0);
      setRotation(0);
      setViewerOpen(true);
    } catch (e: any) {
      onShowToast(`PDF Open Failed: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPdf = async (pdfId: string) => {
    setLoading(true);
    try {
      const b64 = await fetchPdfContent(pdfId);
      if (!b64) throw new Error('Could not fetch PDF binary for printing.');
      
      // Trigger standard print job using helper iframe
      const pdfDataUri = `data:application/pdf;base64,${b64}`;
      const printIframe = document.createElement('iframe');
      printIframe.style.display = 'none';
      document.body.appendChild(printIframe);
      
      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (e) {
          onShowToast('Direct printer mapping failed. Please download the file to print.', 'error');
        }
      };
      
      printIframe.src = pdfDataUri;
      onShowToast('Print job routed to standard system print queue.', 'success');
    } catch (err: any) {
      onShowToast(`Printer Not Found or Access Denied: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPrint = async () => {
    if (selectedPdfIds.length === 0) {
      onShowToast('Please select at least one document to batch print.', 'info');
      return;
    }

    setLoading(true);
    onShowToast(`Consolidating ${selectedPdfIds.length} documents for unified printing...`, 'info');
    try {
      // 1. Fetch all PDF contents in parallel
      const fetchPromises = selectedPdfIds.map(async (id) => {
        const b64 = await fetchPdfContent(id);
        if (!b64) {
          throw new Error(`Failed to fetch content for PDF ID: ${id}`);
        }
        return b64;
      });

      const b64List = await Promise.all(fetchPromises);

      // 2. Initialize unified PDF using pdf-lib
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < b64List.length; i++) {
        const b64 = b64List[i];
        if (!b64) continue;
        
        // Convert base64 to Uint8Array
        const binaryString = window.atob(b64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        const pdfDoc = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // Save the merged PDF as bytes
      const mergedPdfBytes = await mergedPdf.save();
      const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const mergedBlobUrl = URL.createObjectURL(mergedBlob);

      // 3. Create print iframe and trigger printing
      const printIframe = document.createElement('iframe');
      printIframe.style.display = 'none';
      document.body.appendChild(printIframe);
      
      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          // Clean up URL and iframe after trigger
          setTimeout(() => {
            URL.revokeObjectURL(mergedBlobUrl);
            document.body.removeChild(printIframe);
          }, 4000);
        } catch (e) {
          onShowToast('Direct printer mapping failed. Please try again or download the files.', 'error');
        }
      };
      
      printIframe.src = mergedBlobUrl;
      onShowToast(`Successfully consolidated ${selectedPdfIds.length} documents into 1 print job!`, 'success');
    } catch (err: any) {
      onShowToast(`Batch Print failed: ${err.message}`, 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (pdf: PDFFileMetadata) => {
    setDownloadFileName(pdf.fileName);
    setDownloadDialog({ open: true, pdf });
  };

  const handleConfirmDownload = async () => {
    if (!downloadDialog) return;
    setLoading(true);
    try {
      const b64 = await fetchPdfContent(downloadDialog.pdf.id);
      if (!b64) throw new Error('Failed to retrieve PDF data.');

      // Standard browser download
      const blob = base64ToBlob(b64, 'application/pdf');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadFileName || downloadDialog.pdf.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      onShowToast(`File saved successfully in directory: ${downloadFolder}/${downloadFileName}`, 'success');
      setDownloadDialog(null);
    } catch (err: any) {
      onShowToast(`Download Failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePdf = async (pdfId: string, channel: string) => {
    setLoading(true);
    try {
      const fileMeta = pdfFiles.find(p => p.id === pdfId);
      if (!fileMeta) throw new Error('File meta not found.');
      const b64 = await fetchPdfContent(pdfId);
      if (!b64) throw new Error('File contents missing.');

      const blob = base64ToBlob(b64, 'application/pdf');
      const file = new File([blob], fileMeta.fileName, { type: 'application/pdf' });
      
      if (channel === 'SYSTEM_SHARE' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Tax Invoice ${fileMeta.invoiceNumber}`,
          text: `Please find attached GST Tax Invoice ${fileMeta.invoiceNumber} for your review.`
        });
        onShowToast('Share dialog routed successfully.', 'success');
      } else {
        // Fallback links
        const message = `Dear Customer, please find attached your Invoice ${fileMeta.invoiceNumber}. Click to view online.`;
        let shareUrl = '';
        if (channel === 'WHATSAPP') {
          shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        } else if (channel === 'GMAIL' || channel === 'EMAIL') {
          shareUrl = `mailto:?subject=${encodeURIComponent(`Tax Invoice ${fileMeta.invoiceNumber}`)}&body=${encodeURIComponent(message)}`;
        } else {
          // Copy shareable data URL link
          await navigator.clipboard.writeText(`data:application/pdf;base64,${b64}`);
          onShowToast('Secure base64 PDF shareable link copied to clipboard.', 'success');
          return;
        }
        window.open(shareUrl, '_blank');
        onShowToast(`Routing to share channel: ${channel}`, 'success');
      }
    } catch (err: any) {
      onShowToast(`Sharing aborted or failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicatePdf = async (pdf: PDFFileMetadata) => {
    if (!confirm(`Are you sure you want to duplicate PDF file ${pdf.fileName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pdfs/${pdf.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicate: true, fileName: `Copy_of_${pdf.fileName}` })
      });
      if (!res.ok) throw new Error('Duplication failed.');
      onShowToast('PDF Duplicated and stored as new version.', 'success');
      fetchPdfList();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRenamePdf = (pdf: PDFFileMetadata) => {
    setRenameDialog({ open: true, pdf, newName: pdf.fileName });
  };

  const handleConfirmRename = async () => {
    if (!renameDialog) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pdfs/${renameDialog.pdf.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: renameDialog.newName })
      });
      if (!res.ok) throw new Error('Failed to rename file.');
      onShowToast('File renamed successfully.', 'success');
      setRenameDialog(null);
      fetchPdfList();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this PDF document? This action is irreversible.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pdfs/${pdfId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete file.');
      onShowToast('PDF document deleted from Cloud storage.', 'success');
      fetchPdfList();
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- UTILS ---
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const base64ToBlob = (base64: string, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const numberToEnglishWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if ((num = Math.floor(num)) === 0) return 'Zero';
    
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += Number(n[1]) != 0 ? (a[Number(n[1])] || b[Number(n[1].substr(0, 1))] + ' ' + a[Number(n[1].substr(1))]) + 'Crore ' : '';
    str += Number(n[2]) != 0 ? (a[Number(n[2])] || b[Number(n[2].substr(0, 1))] + ' ' + a[Number(n[2].substr(1))]) + 'Lakh ' : '';
    str += Number(n[3]) != 0 ? (a[Number(n[3])] || b[Number(n[3].substr(0, 1))] + ' ' + a[Number(n[3].substr(1))]) + 'Thousand ' : '';
    str += Number(n[4]) != 0 ? (a[Number(n[4])] || b[Number(n[4].substr(0, 1))] + ' ' + a[Number(n[4].substr(1))]) + 'Hundred ' : '';
    str += Number(n[5]) != 0 ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5].substr(0, 1))] + ' ' + a[Number(n[5].substr(1))]) : '';
    return str + 'Rupees';
  };

  // Filtered PDF files list
  const filteredPdfs = pdfFiles.filter(p => {
    const searchLower = pdfSearch.toLowerCase();
    return (
      p.invoiceNumber.toLowerCase().includes(searchLower) ||
      p.customerName.toLowerCase().includes(searchLower) ||
      p.fileName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* 1. PDF File Manager list view */}
      <div className={`p-5 rounded-2xl border ${
        isLight ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <FileText className="h-5 w-5" />
              </span>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                GST Compliance Digital PDF Archives
              </h2>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Browse, preview, download, and print standard verified GST invoice PDF copies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Archives..."
                value={pdfSearch}
                onChange={(e) => setPdfSearch(e.target.value)}
                className={`w-48 sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 border ${
                  isLight ? 'bg-slate-50 border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </div>

            <button
              onClick={fetchPdfList}
              className={`p-2 rounded-xl border hover:opacity-80 transition-opacity ${
                isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Refresh ledger database"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Batch Actions Toolbar */}
        {selectedPdfIds.length > 0 && (
          <div className={`mb-4 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight 
              ? 'bg-indigo-50/80 border-indigo-150 text-indigo-900' 
              : 'bg-indigo-950/30 border-indigo-900/60 text-indigo-100'
          }`}>
            <div className="flex items-center gap-2.5 text-xs font-sans">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white font-mono animate-pulse">
                {selectedPdfIds.length}
              </span>
              <span className="font-semibold">
                {selectedPdfIds.length} {selectedPdfIds.length === 1 ? 'document' : 'documents'} selected for batch operations
              </span>
            </div>
            
            <div className="flex items-center gap-2 font-sans">
              <button
                onClick={handleBatchPrint}
                disabled={loading}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Batch Print (Unified PDF Job)</span>
              </button>
              
              <button
                onClick={() => setSelectedPdfIds([])}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                  isLight 
                    ? 'bg-white hover:bg-slate-50 border-slate-250 text-slate-700' 
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                }`}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Archives Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800/80">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                isLight ? 'bg-slate-50 text-slate-450 border-slate-200' : 'bg-slate-950/60 text-slate-500 border-slate-800'
              }`}>
                <th className="px-4 py-3 text-center min-w-[140px]">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      id="select-all-pdfs-page"
                      checked={filteredPdfs.length > 0 && selectedPdfIds.length === filteredPdfs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPdfIds(filteredPdfs.map(p => p.id));
                        } else {
                          setSelectedPdfIds([]);
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5 accent-indigo-600"
                    />
                    <label 
                      htmlFor="select-all-pdfs-page"
                      className="cursor-pointer text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      Select All This Page
                    </label>
                  </div>
                </th>
                <th className="px-4 py-3">Doc Ref</th>
                <th className="px-4 py-3">Customer Profile</th>
                <th className="px-4 py-3">Archived File Name</th>
                <th className="px-4 py-3">File Weight</th>
                <th className="px-4 py-3">Archived Timestamp</th>
                <th className="px-4 py-3 text-center">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-700 dark:text-slate-300">
              {filteredPdfs.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedPdfIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPdfIds(prev => [...prev, p.id]);
                        } else {
                          setSelectedPdfIds(prev => prev.filter(id => id !== p.id));
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                    {p.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">{p.customerName}</span>
                    <span className="text-[10px] text-slate-400">{p.date}</span>
                  </td>
                  <td className="px-4 py-3 font-sans text-xs max-w-[180px] truncate" title={p.fileName}>
                    {p.fileName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {p.fileSize}
                  </td>
                  <td className="px-4 py-3 text-[10px] text-slate-400">
                    {new Date(p.createdTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center font-sans">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenPdf(p.id)}
                        className="p-1 text-indigo-550 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                        title="Open in built-in previewer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handlePreviewInNewTab(p.id)}
                        className="p-1 text-teal-650 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition-colors"
                        title="Open real PDF blob in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(p)}
                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                        title="Download to client folder"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handlePrintPdf(p.id)}
                        className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded transition-colors"
                        title="Direct system print"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSharePdf(p.id, 'SYSTEM_SHARE')}
                        className="p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded transition-colors"
                        title="System Share options"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRenamePdf(p)}
                        className="p-1 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 rounded transition-colors"
                        title="Rename file name"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicatePdf(p)}
                        className="p-1 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition-colors"
                        title="Duplicate as copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePdf(p.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPdfs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-sans">
                    No compliant PDF invoice backups recorded in archive store.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- BUILT-IN PREMIUM PDF PREVIEW MODAL / VIEWER PANEL --- */}
      {viewerOpen && selectedPdf && (
        <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-slate-900/95 backdrop-blur-md">
          {/* Header Controls */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950 text-white select-none">
            <div className="flex items-center gap-3">
              <span className="p-1.5 bg-indigo-650 rounded-lg text-white">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                  {selectedPdf.invoiceNumber} — Built-in Viewer
                </h3>
                <span className="text-[10px] text-slate-400 font-mono block">
                  File name: {selectedPdf.fileName}
                </span>
              </div>
            </div>

            {/* Viewer action bar */}
            <div className="flex items-center gap-1.5">
              
              {/* Zoom Buttons */}
              <button 
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-mono w-12 text-center text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1"></div>

              {/* Fit Options */}
              <button 
                onClick={() => setZoom(1.0)} 
                className="px-2 py-1 text-[9px] font-bold bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
              >
                Fit Page
              </button>
              <button 
                onClick={() => setZoom(1.4)} 
                className="px-2 py-1 text-[9px] font-bold bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
              >
                Fit Width
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1"></div>

              {/* Rotate Button */}
              <button 
                onClick={() => setRotation(r => (r + 90) % 360)} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300"
                title="Rotate Clockwise 90"
              >
                <RotateCw className="h-4 w-4" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1"></div>

              {/* Dark mode toggle */}
              <button 
                onClick={() => setViewerDarkMode(!viewerDarkMode)}
                className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${
                  viewerDarkMode ? 'bg-yellow-500 border-yellow-500 text-slate-950' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {viewerDarkMode ? 'PDF Light' : 'PDF Contrast'}
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1"></div>

              {/* Print in A4/thermal options */}
              <div className="relative">
                <button 
                  onClick={() => setShowPrintOptions(!showPrintOptions)}
                  className="px-2.5 py-1 text-[9px] font-bold bg-indigo-650 hover:bg-indigo-600 rounded text-white flex items-center gap-1"
                >
                  <Printer className="h-3 w-3" />
                  Print Options
                </button>
                {showPrintOptions && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl z-50 space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block px-2 pb-1">Print Presets</span>
                    <button 
                      onClick={() => { handlePrintPdf(selectedPdf.id); setShowPrintOptions(false); }}
                      className="w-full text-left text-[10px] p-1.5 hover:bg-slate-800 rounded text-slate-200 font-sans"
                    >
                      A4 Standard Portrait
                    </button>
                    <button 
                      onClick={() => { alert('Loading Landscape Print Layout...'); handlePrintPdf(selectedPdf.id); setShowPrintOptions(false); }}
                      className="w-full text-left text-[10px] p-1.5 hover:bg-slate-800 rounded text-slate-200 font-sans"
                    >
                      A4 Landscape Layout
                    </button>
                    <button 
                      onClick={() => { alert('Formatting for 58mm POS thermal tape...'); handlePrintPdf(selectedPdf.id); setShowPrintOptions(false); }}
                      className="w-full text-left text-[10px] p-1.5 hover:bg-slate-800 rounded text-slate-200 font-sans"
                    >
                      58mm Thermal Printer
                    </button>
                    <button 
                      onClick={() => { alert('Formatting for 80mm POS thermal tape...'); handlePrintPdf(selectedPdf.id); setShowPrintOptions(false); }}
                      className="w-full text-left text-[10px] p-1.5 hover:bg-slate-800 rounded text-slate-200 font-sans"
                    >
                      80mm Thermal Printer
                    </button>
                  </div>
                )}
              </div>

              {/* Preview in New Tab */}
              <button 
                onClick={() => {
                  const blobUrl = getBlobUrl(pdfBase64 || '');
                  if (blobUrl) {
                    window.open(blobUrl, '_blank');
                    onShowToast('PDF opened in new browser tab.', 'success');
                  } else {
                    onShowToast('Could not open PDF in new tab.', 'error');
                  }
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-sky-450 cursor-pointer transition-colors"
                title="Open real PDF blob in new browser tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              {/* Download */}
              <button 
                onClick={() => handleDownloadPdf(selectedPdf)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-emerald-455 cursor-pointer transition-colors"
                title="Download local"
              >
                <Download className="h-4 w-4" />
              </button>

              <button 
                onClick={() => setViewerOpen(false)}
                className="p-1.5 hover:bg-red-500 rounded-lg text-slate-300 hover:text-white transition-colors ml-2"
                title="Exit Viewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Search bar */}
          <div className="bg-slate-950/80 px-6 py-2 border-b border-slate-850 flex items-center gap-4">
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Search matching text in document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-850 rounded-lg text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="h-3 w-3 text-slate-500 absolute left-2.5 top-2" />
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300"
                title="Previous page"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span className="font-mono">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 bg-slate-900 hover:bg-slate-800 rounded text-slate-300"
                title="Next page"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Canvas viewport area with Scroll */}
          <div className="flex-1 overflow-auto p-8 flex flex-col items-center bg-slate-950/40">
            {pdfRendering && (
              <div className="mb-4 text-xs font-semibold text-indigo-400 flex items-center gap-2 animate-pulse bg-indigo-950/30 border border-indigo-900/40 px-3 py-1.5 rounded-lg">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span>Rendering high-fidelity PDF pages with PDF.js Vector Engine...</span>
              </div>
            )}
            {pdfRenderError && (
              <div className="mb-4 text-xs font-semibold text-rose-400 p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg max-w-lg text-center">
                ⚠️ {pdfRenderError}. Graded fallback mockup rendering active.
              </div>
            )}

            <div className="flex flex-col items-center justify-start min-h-full">
              {/* PDF Canvas Viewport */}
              <div 
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out'
                }}
                className={`shadow-2xl relative select-text transition-colors border rounded overflow-hidden ${
                  viewerDarkMode 
                    ? 'bg-slate-900 border-slate-800 shadow-slate-950/50' 
                    : 'bg-white border-slate-300'
                }`}
              >
                {/* Real Vector PDF Canvas */}
                <canvas 
                  ref={canvasRef} 
                  className={`mx-auto ${pdfRenderError ? 'hidden' : 'block'}`}
                  style={{
                    filter: viewerDarkMode ? 'invert(0.9) hue-rotate(180deg)' : 'none',
                    maxWidth: '100%'
                  }}
                />

                {/* Styled static backup layout (shown only on error) */}
                {pdfRenderError && (
                  <div className="w-[210mm] min-h-[297mm] p-12 font-sans flex flex-col justify-between bg-white text-slate-900">
                    <div>
                      {/* Top stamp mark */}
                      <div className="flex justify-between items-center pb-6 border-b border-slate-200">
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-500">
                          OFFICIAL ELECTRONIC GST MEMO (FALLBACK)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {selectedPdf.id}
                        </span>
                      </div>

                      {/* Body particulars representation */}
                      <div className="mt-8 grid grid-cols-2 gap-8">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                            SUPPLYING COMPANY DETAILS
                          </span>
                          <strong className="text-sm block font-bold mb-1">{bizDetails?.name || 'Stock & Ledger Inc.'}</strong>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {bizDetails?.address || '701, Antigravity Tech High Road, Navi Mumbai'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Phone: {bizDetails?.phone || '+91 98765 43210'}
                          </p>
                          <strong className="text-xs text-indigo-600 block mt-2 font-mono">
                            GSTIN: {bizDetails?.gstin || '27AASCE9904E1Z0'}
                          </strong>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                            TAX INVOICE DETAILS
                          </span>
                          <strong className="text-sm text-indigo-600 block mb-1 font-mono">
                            {selectedPdf.invoiceNumber}
                          </strong>
                          <p className="text-xs text-slate-500">
                            Generation Date: {selectedPdf.date}
                          </p>
                          <p className="text-xs text-slate-500">
                            Status Code: Compliant
                          </p>
                          <p className="text-xs text-slate-400 mt-1 font-mono">
                            File Weight: {selectedPdf.fileSize}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          BILL TO CONSIGNEE
                        </span>
                        <strong className="text-sm block font-bold mb-1 text-slate-800">
                          {selectedPdf.customerName}
                        </strong>
                        <p className="text-xs text-slate-500">
                          Authorized B2B Trade Partner account linked in ledgers database.
                        </p>
                      </div>

                      {/* Highlights matching text */}
                      <div className="mt-10 p-5 rounded-xl border border-dashed text-xs text-slate-500 leading-relaxed">
                        {searchQuery ? (
                          <p>
                            {highlightText(
                              `This document acts as an automated certified electronic copy of tax invoice ${selectedPdf.invoiceNumber}. Reconciliations have been successfully logged in double-entry journal logs on the company mainframe under the supervisor of Operator ${user?.name || 'Lead Architect'}.`,
                              searchQuery
                            )}
                          </p>
                        ) : (
                          <p>
                            This document acts as an automated certified electronic copy of tax invoice <strong className="text-indigo-600">{selectedPdf.invoiceNumber}</strong>. Reconciliations have been successfully logged in double-entry journal logs on the company mainframe under the supervisor of Operator <strong>{user?.name || 'Lead Architect'}</strong>.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6 mt-16 flex justify-between items-end text-[10px] text-slate-400">
                      <p>Certified Digital Compliance Copy • Powered by Vyapar AI</p>
                      <p className="font-mono">Page 1 of 1</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. AUTO OPEN OPTIONS DIALOG (TRIGGERED IMMEDIATELY ON GENERATION) --- */}
      {autoOpenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl border w-full max-w-sm font-sans animate-scaleIn ${
            isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex flex-col items-center text-center">
              <span className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-full text-indigo-600 dark:text-indigo-400 mb-4 animate-pulse">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                PDF Generated Successfully
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Compliance PDF record for invoice <strong>{autoOpenDialog.invoiceNumber}</strong> has been generated and saved.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6">
              <button
                onClick={() => {
                  const pdfId = autoOpenDialog.pdfId;
                  setAutoOpenDialog(null);
                  handleOpenPdf(pdfId);
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow"
              >
                Open Now
              </button>
              <button
                onClick={() => {
                  const pdfId = autoOpenDialog.pdfId;
                  setAutoOpenDialog(null);
                  handlePrintPdf(pdfId);
                }}
                className={`w-full py-2 font-bold text-xs rounded-xl border transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
              >
                Print Direct
              </button>
              <button
                onClick={() => {
                  const pdfId = autoOpenDialog.pdfId;
                  setAutoOpenDialog(null);
                  handleSharePdf(pdfId, 'SYSTEM_SHARE');
                }}
                className={`w-full py-2 font-bold text-xs rounded-xl border transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
              >
                Share File
              </button>
              <button
                onClick={() => setAutoOpenDialog(null)}
                className={`w-full py-2 font-bold text-xs rounded-xl border transition-colors cursor-pointer ${
                  isLight ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. CUSTOM FOLDER & VERSION DOWNLOAD DIALOG --- */}
      {downloadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl border w-full max-w-sm font-sans animate-scaleIn ${
            isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
              Configure PDF Download Specifications
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal mb-4">
              Choose the target download catalog folder and version file name preferences below.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] text-slate-400 uppercase font-black mb-1">
                  Target Destination catalog
                </label>
                <select
                  value={downloadFolder}
                  onChange={(e) => setDownloadFolder(e.target.value)}
                  className={`w-full text-xs rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isLight ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                >
                  <option value="Downloads">Downloads Folder (Default)</option>
                  <option value="Documents">Documents Catalog</option>
                  <option value="Invoices">Invoices Secure Vault</option>
                  <option value="Custom Folder">Custom Enterprise Catalog</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 uppercase font-black mb-1">
                  Revision File Name
                </label>
                <input
                  type="text"
                  value={downloadFileName}
                  onChange={(e) => setDownloadFileName(e.target.value)}
                  className={`w-full text-xs font-bold rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isLight ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmDownload}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow"
                >
                  Save File
                </button>
                <button
                  onClick={() => setDownloadDialog(null)}
                  className={`flex-1 py-2 font-bold text-xs rounded-xl border transition-colors cursor-pointer ${
                    isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 4. RENAME DIALOG --- */}
      {renameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl border w-full max-w-sm font-sans animate-scaleIn ${
            isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
              Rename Archived PDF File
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal mb-4">
              Enter the new file name below for reference index mapping.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] text-slate-400 uppercase font-black mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={renameDialog.newName}
                  onChange={(e) => setRenameDialog({ ...renameDialog, newName: e.target.value })}
                  className={`w-full text-xs font-bold rounded-xl p-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isLight ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleConfirmRename}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow"
                >
                  Rename
                </button>
                <button
                  onClick={() => setRenameDialog(null)}
                  className={`flex-1 py-2 font-bold text-xs rounded-xl border transition-colors cursor-pointer ${
                    isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 5. PROGRESS OVERLAY FOR PDF GENERATION --- */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`p-8 rounded-2xl border w-full max-w-md font-sans text-center shadow-2xl relative ${
                isLight ? 'bg-white border-slate-200/80' : 'bg-slate-900 border-slate-800'
              }`}
            >
              {/* Pulsing neon icon container */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mb-5 relative overflow-hidden">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3,
                    ease: "easeInOut"
                  }}
                >
                  <FileText className="h-8 w-8 text-indigo-500" />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/10 to-transparent animate-pulse" />
              </div>

              {/* Title Header */}
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                Digital GST Compilation
              </h3>
              
              {generatingDoc && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1 font-mono">
                  {generatingDoc.docType || 'INVOICE'}: {generatingDoc.docNumber}
                </p>
              )}

              {/* Progress Circle Visualizer & Percentage Text */}
              <div className="my-8 relative flex items-center justify-center">
                {/* Visual Radial SVG Arc Track */}
                <svg className="w-32 h-32 transform -rotate-90">
                  {/* Outer shadow track */}
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Glowing active progress stroke */}
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="52"
                    className="stroke-indigo-600 dark:stroke-indigo-500"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 52}
                    animate={{
                      strokeDashoffset: (2 * Math.PI * 52) * (1 - generationProgress / 100)
                    }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </svg>
                {/* Floating exact percentage value in center */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">
                    {generationProgress}%
                  </span>
                  <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">
                    Compiling
                  </span>
                </div>
              </div>

              {/* Step indicator description stage */}
              <div className="min-h-[44px]">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed px-2">
                  {generationStage}
                </p>
                {generatingDoc && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Customer: {generatingDoc.clientName}
                  </p>
                )}
              </div>

              {/* Multi-page notification banner */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-950/40 rounded-full border border-slate-150 dark:border-slate-850/60 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-medium font-sans">
                    Multi-page Pagination: Estimated <strong className="font-extrabold text-slate-800 dark:text-slate-200">{generationPages} page(s)</strong>
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Helper to highlight search text matches in custom preview layout
const highlightText = (text: string, search: string) => {
  if (!search) return text;
  const parts = text.split(new RegExp(`(${search})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-750 text-slate-900 px-0.5 rounded font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};
