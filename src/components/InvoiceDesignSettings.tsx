import React, { useState, useEffect } from 'react';
import { 
  Paintbrush, FileText, CheckCircle2, AlertCircle, RefreshCw, Sliders, 
  Download, Upload, X, Check, RotateCcw, Sparkles, Languages, Coins, 
  QrCode, Printer, Mail, MessageSquare, Clock, Laptop, Tablet, Smartphone, 
  Eye, Copy, Lock, History, FileJson, Award, Layers, Stamp, CheckSquare, Settings
} from 'lucide-react';

export interface InvoiceDesignConfig {
  // Theme
  theme: 'classic' | 'material' | 'apple' | 'corporate' | 'gold' | 'dark' | 'luxury' | 'minimal' | 'modern' | 'thermal';
  
  // Watermark
  watermarkEnabled: boolean;
  watermarkType: 'text' | 'logo' | 'background';
  watermarkText: string;
  watermarkLogoUrl: string;
  watermarkBgUrl: string;
  watermarkOpacity: number; // 0.05 - 0.30
  watermarkSize: 'small' | 'medium' | 'large' | 'full';
  watermarkPosition: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom';
  watermarkX: number; // custom X %
  watermarkY: number; // custom Y %
  
  // Header Symbol
  headerSymbolEnabled: boolean;
  headerSymbolType: 'ganpati' | 'om' | 'swastik' | 'lakshmi' | 'saraswati' | 'logo' | 'custom';
  headerSymbolCustomUrl: string;
  headerSymbolPosition: 'left' | 'center' | 'right';
  headerSymbolSize: number; // px
  headerSymbolOpacity: number; // 0 - 1
  
  // Center Symbol
  centerSymbolEnabled: boolean;
  centerSymbolType: 'ganpati' | 'om' | 'swastik' | 'logo' | 'custom_religious' | 'custom_business';
  centerSymbolCustomUrl: string;
  centerSymbolPlacement: 'watermark' | 'above_table' | 'above_signature' | 'behind_invoice';
  centerSymbolOpacity: number; // 0 - 1
  centerSymbolSize: number; // px
  
  // Branding Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerBg: string;
  footerBg: string;
  tableHeaderColor: string;
  tableHeaderTextColor: string;
  qrColor: string;
  barcodeColor: string;
  
  // Typography
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  headerFont: string;
  bodyFont: string;
  footerFont: string;
  invoiceTitleFont: string;
  
  // Digital Signatures
  signatureUrl: string;
  stampUrl: string;
  sealUrl: string;
  signatureDisplay: 'signature' | 'stamp' | 'both';
  signatureVerified: boolean;
  
  // Editable Footer contents
  termsAndConditions: string;
  declaration: string;
  thankYouMessage: string;
  notes: string;
  warranty: string;
  returnPolicy: string;
  
  // QR Code options
  qrEnabled: boolean;
  qrIncludeInvoiceNumber: boolean;
  qrIncludeCompanyDetails: boolean;
  qrIncludeGstDetails: boolean;
  qrIncludeWebsite: boolean;
  qrIncludeUpi: boolean;
  qrIncludeContact: boolean;
  qrCustomUrl: string;
  
  // Barcode options
  barcodeEnabled: boolean;
  barcodeType: 'code128' | 'code39' | 'ean13' | 'ean8';
  barcodeWidth: number;
  barcodeHeight: number;
  barcodeIncludeInvoice: boolean;
  barcodeIncludeProduct: boolean;
  
  // Advanced parameters
  templateId: 'slate' | 'borderless' | 'sidebar' | 'classical';
  letterheadEnabled: boolean;
  letterheadUrl: string;
  footerBannerEnabled: boolean;
  footerBannerUrl: string;
  roundedTables: boolean;
  alternateRowColors: boolean;
  autoPageNumber: boolean;
  stampType: 'none' | 'paid' | 'unpaid' | 'cancelled' | 'draft';
  confidentialWatermark: boolean;
  companySlogan: string;
  backgroundPattern: 'none' | 'dots' | 'grid' | 'waves' | 'lines';
  language: 'en' | 'hi' | 'mr' | 'gu' | 'es';
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  pdfPasswordProtected: boolean;
  pdfPassword?: string;
  branchLogoUrl?: string;
  branchName?: string;
  customerSpecificTemplate?: boolean;
  autoSaveDraftEnabled?: boolean;
}

// Default configuration based on standard Classic GST
export const DEFAULT_INVOICE_DESIGN: InvoiceDesignConfig = {
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
  
  primaryColor: '#0f172a', // Slate 900
  secondaryColor: '#475569', // Slate 600
  accentColor: '#4f46e5', // Indigo 600
  headerBg: '#f8fafc', // Slate 50
  footerBg: '#ffffff',
  tableHeaderColor: '#f1f5f9', // Slate 100
  tableHeaderTextColor: '#1e293b', // Slate 800
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

// Preset Themes that populates all parameters with a single click
export const PRESET_THEMES: Record<InvoiceDesignConfig['theme'], Partial<InvoiceDesignConfig>> = {
  classic: {
    theme: 'classic',
    primaryColor: '#1e293b',
    secondaryColor: '#475569',
    accentColor: '#4f46e5',
    headerBg: '#f8fafc',
    tableHeaderColor: '#f1f5f9',
    tableHeaderTextColor: '#0f172a',
    roundedTables: true,
    alternateRowColors: true,
    fontFamily: 'Inter',
    fontSize: 'medium'
  },
  material: {
    theme: 'material',
    primaryColor: '#6750a4', // Material 3 Purple
    secondaryColor: '#625b71',
    accentColor: '#038da9',
    headerBg: '#f3edf7',
    tableHeaderColor: '#e8def8',
    tableHeaderTextColor: '#1d192b',
    roundedTables: true,
    alternateRowColors: false,
    fontFamily: 'Outfit',
    fontSize: 'medium'
  },
  apple: {
    theme: 'apple',
    primaryColor: '#000000', // Apple Black
    secondaryColor: '#86868b', // Grey
    accentColor: '#0071e3', // Apple Blue
    headerBg: '#f5f5f7',
    tableHeaderColor: '#fafafa',
    tableHeaderTextColor: '#1d1d1f',
    roundedTables: false,
    alternateRowColors: true,
    fontFamily: 'Inter',
    fontSize: 'small'
  },
  corporate: {
    theme: 'corporate',
    primaryColor: '#0369a1', // Sky 700
    secondaryColor: '#334155', // Slate 700
    accentColor: '#0284c7',
    headerBg: '#f0f9ff',
    tableHeaderColor: '#e0f2fe',
    tableHeaderTextColor: '#0369a1',
    roundedTables: true,
    alternateRowColors: true,
    fontFamily: 'Inter',
    fontSize: 'medium'
  },
  gold: {
    theme: 'gold',
    primaryColor: '#78350f', // Amber 900
    secondaryColor: '#b45309', // Amber 700
    accentColor: '#d97706', // Amber 600
    headerBg: '#fffbeb',
    tableHeaderColor: '#fef3c7',
    tableHeaderTextColor: '#78350f',
    roundedTables: true,
    alternateRowColors: true,
    fontFamily: 'Playfair Display',
    fontSize: 'medium'
  },
  dark: {
    theme: 'dark',
    primaryColor: '#090d16',
    secondaryColor: '#94a3b8',
    accentColor: '#6366f1',
    headerBg: '#1e293b',
    tableHeaderColor: '#0f172a',
    tableHeaderTextColor: '#f8fafc',
    roundedTables: true,
    alternateRowColors: true,
    fontFamily: 'JetBrains Mono',
    fontSize: 'small'
  },
  luxury: {
    theme: 'luxury',
    primaryColor: '#1a1a1a',
    secondaryColor: '#5c5240', // Bronze
    accentColor: '#d4af37', // Gold Metallic
    headerBg: '#faf8f5',
    tableHeaderColor: '#f3efe6',
    tableHeaderTextColor: '#1a1a1a',
    roundedTables: false,
    alternateRowColors: false,
    fontFamily: 'Playfair Display',
    fontSize: 'large'
  },
  minimal: {
    theme: 'minimal',
    primaryColor: '#000000',
    secondaryColor: '#000000',
    accentColor: '#000000',
    headerBg: '#ffffff',
    tableHeaderColor: '#ffffff',
    tableHeaderTextColor: '#000000',
    roundedTables: false,
    alternateRowColors: false,
    fontFamily: 'Inter',
    fontSize: 'small'
  },
  modern: {
    theme: 'modern',
    primaryColor: '#0f172a',
    secondaryColor: '#0284c7',
    accentColor: '#0d9488',
    headerBg: '#f0fdfa',
    tableHeaderColor: '#ccfbf1',
    tableHeaderTextColor: '#115e59',
    roundedTables: true,
    alternateRowColors: true,
    fontFamily: 'Space Grotesk',
    fontSize: 'medium'
  },
  thermal: {
    theme: 'thermal',
    primaryColor: '#000000',
    secondaryColor: '#000000',
    accentColor: '#000000',
    headerBg: '#ffffff',
    tableHeaderColor: '#e5e7eb',
    tableHeaderTextColor: '#000000',
    roundedTables: false,
    alternateRowColors: false,
    fontFamily: 'JetBrains Mono',
    fontSize: 'small'
  }
};

const SYMBOL_SVGS: Record<string, string> = {
  ganpati: "🐘",
  om: "🕉️",
  swastik: "卐",
  lakshmi: "🌸",
  saraswati: "🎻"
};

interface InvoiceDesignSettingsProps {
  isLight: boolean;
  onShowToast: (text: string, type?: 'success' | 'error') => void;
  onConfigChange?: (config: InvoiceDesignConfig) => void;
}

export const InvoiceDesignSettings: React.FC<InvoiceDesignSettingsProps> = ({
  isLight,
  onShowToast,
  onConfigChange
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'theme' | 'watermark' | 'symbols' | 'branding' | 'signatures' | 'documents' | 'history'>('theme');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [config, setConfig] = useState<InvoiceDesignConfig>(() => {
    try {
      const saved = localStorage.getItem('set_invoice_design');
      if (saved) {
        return { ...DEFAULT_INVOICE_DESIGN, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Failed to load invoice design config from localstorage", e);
    }
    return DEFAULT_INVOICE_DESIGN;
  });

  // Share histories saved in state
  const [printHistory, setPrintHistory] = useState<{id: string, number: string, client: string, date: string}[]>([
    { id: '1', number: 'INV-2026-002', client: 'Apex Data Centre Solutions', date: '2026-06-27 14:22' },
    { id: '2', number: 'INV-2026-004', client: 'Apollo Clinical Hub Private Ltd', date: '2026-06-28 09:15' }
  ]);
  const [emailHistory, setEmailHistory] = useState<{id: string, number: string, recipient: string, date: string, status: string}[]>([
    { id: '1', number: 'INV-2026-004', recipient: 'billing@apollo.com', date: '2026-06-28 09:18', status: 'Delivered' }
  ]);
  const [whatsappHistory, setWhatsappHistory] = useState<{id: string, number: string, phone: string, date: string}[]>([
    { id: '1', number: 'INV-2026-004', phone: '+91 99999 88888', date: '2026-06-28 09:20' }
  ]);
  const [revisionHistory, setRevisionHistory] = useState<{id: string, version: string, modifier: string, date: string, notes: string}[]>([
    { id: '1', version: 'v1.0', modifier: 'Sarvesh Yadav', date: '2026-06-28 05:00', notes: 'Initial design template' }
  ]);

  useEffect(() => {
    localStorage.setItem('set_invoice_design', JSON.stringify(config));
    if (onConfigChange) {
      onConfigChange(config);
    }
  }, [config, onConfigChange]);

  const updateConfig = (updates: Partial<InvoiceDesignConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleApplyTheme = (themeName: InvoiceDesignConfig['theme']) => {
    const themeOverrides = PRESET_THEMES[themeName];
    if (themeOverrides) {
      updateConfig({ ...themeOverrides, theme: themeName });
      onShowToast(`Applied ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Premium Theme in one-click!`, "success");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'watermarkLogoUrl' | 'watermarkBgUrl' | 'headerSymbolCustomUrl' | 'centerSymbolCustomUrl' | 'signatureUrl' | 'stampUrl' | 'sealUrl' | 'letterheadUrl' | 'footerBannerUrl' | 'branchLogoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateConfig({ [type]: base64 });
      onShowToast("Successfully processed and saved design asset locally!", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleExportTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `invoice_template_${config.theme}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast("Template exported as JSON successfully!");
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        updateConfig(parsed);
        onShowToast("Template imported and applied successfully!", "success");
      } catch (err) {
        onShowToast("Invalid template file format.", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to completely reset all Invoice Design parameters to classic defaults?")) {
      setConfig(DEFAULT_INVOICE_DESIGN);
      onShowToast("Invoice Design parameters restored to system default classic GST layout.");
    }
  };

  // Mock triggers for sharing
  const triggerEmailDispatch = () => {
    const email = window.prompt("Enter recipient email address:", "sarveshyadav8777@gmail.com");
    if (!email) return;
    onShowToast(`Generating fully configured ${config.theme.toUpperCase()} PDF payload...`);
    setTimeout(() => {
      onShowToast(`Successfully dispatched configured PDF with watermarks and branding to ${email}!`, "success");
      setEmailHistory(prev => [
        { id: Date.now().toString(), number: 'INV-2026-005', recipient: email, date: new Date().toISOString().replace('T', ' ').substring(0, 16), status: 'Delivered' },
        ...prev
      ]);
    }, 1200);
  };

  const triggerWhatsappDispatch = () => {
    const phone = window.prompt("Enter counterparty WhatsApp Mobile Number:", "+91 98765 43210");
    if (!phone) return;
    onShowToast(`Compressing branded graphics with ${config.fontFamily} styles...`);
    setTimeout(() => {
      onShowToast(`Constructed WhatsApp secure dispatch link!`, "success");
      setWhatsappHistory(prev => [
        { id: Date.now().toString(), number: 'INV-2026-005', phone, date: new Date().toISOString().replace('T', ' ').substring(0, 16) },
        ...prev
      ]);
      // Trigger API link safely
      window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(`Hi, please find attached our customized tax invoice with premium branding.`)}`, '_blank');
    }, 800);
  };

  return (
    <div className={`p-4 sm:p-6 space-y-6 ${isLight ? 'text-slate-800' : 'text-slate-200'}`} id="premium-invoice-customizer">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 to-indigo-950 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[9px] bg-yellow-500 text-yellow-950 font-black uppercase rounded tracking-wider animate-pulse flex items-center gap-1">
              <Award className="h-3 w-3" /> PREMIUM
            </span>
            <h3 className="text-sm font-extrabold tracking-wide uppercase">B2B Invoice designer studio</h3>
          </div>
          <p className="text-[10.5px] text-indigo-200">
            Design beautiful, high-fidelity corporate documents with religious headers, digital stamps, dual signatures, custom themes, and watermarks. Fully offline compatible.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportTemplate}
            className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-750 text-white border border-indigo-700 text-[10px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            title="Download Design Settings Config file"
          >
            <FileJson className="h-3 w-3" /> Export Template
          </button>
          <label className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-750 text-white border border-indigo-700 text-[10px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95">
            <Upload className="h-3 w-3" /> Import Template
            <input type="file" accept=".json" onChange={handleImportTemplate} className="hidden" />
          </label>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-rose-900 hover:bg-rose-850 text-white border border-rose-800 text-[10px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="h-3 w-3" /> Reset Design
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Control Columns (6/12) */}
        <div className="xl:col-span-7 space-y-6">
          {/* Sub Tab selection */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border dark:border-slate-800 scrollbar-none overflow-x-auto">
            {[
              { id: 'theme', label: 'Themes', icon: Paintbrush },
              { id: 'watermark', label: 'Watermark', icon: FileText },
              { id: 'symbols', label: 'Symbols', icon: Award },
              { id: 'branding', label: 'Branding', icon: Sliders },
              { id: 'signatures', label: 'Stamp & Sign', icon: Stamp },
              { id: 'documents', label: 'Layout Prefs', icon: Layers },
              { id: 'history', label: 'Share logs', icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-1 px-3 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    active 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/55 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-250' : 'bg-slate-900/40 border-slate-800'} space-y-5 shadow-sm`}>
            {/* SUB-PANEL 1: PREMIUM THEMES */}
            {activeSubTab === 'theme' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide">Premium Built-in Document Skins</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Toggle styles instantly. Pre-configures colors, typography and layouts.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'classic', label: 'Classic GST', color: 'bg-slate-700', text: 'slate' },
                    { id: 'material', label: 'Material Design 3', color: 'bg-purple-700', text: 'indigo' },
                    { id: 'apple', label: 'Apple Style', color: 'bg-zinc-900', text: 'black' },
                    { id: 'corporate', label: 'Corporate Blue', color: 'bg-blue-700', text: 'sky' },
                    { id: 'gold', label: 'Premium Gold', color: 'bg-amber-700', text: 'gold' },
                    { id: 'dark', label: 'Dark Space Theme', color: 'bg-slate-950 border border-slate-800', text: 'space' },
                    { id: 'luxury', label: 'Luxury Serif', color: 'bg-neutral-900', text: 'bronze' },
                    { id: 'minimal', label: 'Minimal Monochrome', color: 'bg-white border text-black', text: 'mono' },
                    { id: 'modern', label: 'Modern Business', color: 'bg-teal-700', text: 'teal' },
                    { id: 'thermal', label: 'Thermal Receipt', color: 'bg-slate-100 text-slate-800 border', text: 'ticket' }
                  ].map((theme) => {
                    const isSelected = config.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleApplyTheme(theme.id as any)}
                        className={`p-3 rounded-xl text-left border flex flex-col justify-between h-20 relative transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-950 scale-105 shadow-md' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-slate-100/50 dark:bg-slate-950/20'
                        }`}
                      >
                        <span className="text-[11px] font-black tracking-tight">{theme.label}</span>
                        <div className="flex items-center justify-between w-full mt-2">
                          <span className={`w-4 h-4 rounded-full ${theme.color}`}></span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-PANEL 2: WATERMARK SETTINGS */}
            {activeSubTab === 'watermark' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide">Watermark &amp; Background Designs</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Configure secure verification texts or logo backdrops.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="watermark-enabled-chk"
                      checked={config.watermarkEnabled}
                      onChange={(e) => updateConfig({ watermarkEnabled: e.target.checked })}
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="watermark-enabled-chk" className="text-xs font-bold uppercase tracking-wide cursor-pointer">Enabled</label>
                  </div>
                </div>

                {config.watermarkEnabled && (
                  <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Watermark Type</label>
                      <select
                        value={config.watermarkType}
                        onChange={(e) => updateConfig({ watermarkType: e.target.value as any })}
                        className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                      >
                        <option value="text">Custom Text (e.g. ORIGINAL, COPY)</option>
                        <option value="logo">Company Logo Backdrop</option>
                        <option value="background">Full Page Watermark Image</option>
                      </select>
                    </div>

                    {config.watermarkType === 'text' && (
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Watermark Stamp Text</label>
                        <input
                          type="text"
                          value={config.watermarkText}
                          onChange={(e) => updateConfig({ watermarkText: e.target.value.toUpperCase() })}
                          className="w-full text-xs font-mono font-bold rounded p-2.5 border dark:bg-slate-950"
                          placeholder="ORIGINAL / DUPLICATE / CONFIDENTIAL"
                        />
                      </div>
                    )}

                    {(config.watermarkType === 'logo' || config.watermarkType === 'background') && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">
                          Upload Custom watermark PNG/JPG/SVG
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, config.watermarkType === 'logo' ? 'watermarkLogoUrl' : 'watermarkBgUrl')}
                          className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-extrabold file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">
                        Watermark Opacity: {Math.round(config.watermarkOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.30"
                        step="0.01"
                        value={config.watermarkOpacity}
                        onChange={(e) => updateConfig({ watermarkOpacity: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-400">Strictly regulated between 5% and 30% for high text readability.</span>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Watermark Size scale</label>
                      <select
                        value={config.watermarkSize}
                        onChange={(e) => updateConfig({ watermarkSize: e.target.value as any })}
                        className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                      >
                        <option value="small">Small (Compact Stamp)</option>
                        <option value="medium">Medium Size (Balanced)</option>
                        <option value="large">Large Backdrop</option>
                        <option value="full">Full Page Grid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Watermark Layout Position</label>
                      <select
                        value={config.watermarkPosition}
                        onChange={(e) => updateConfig({ watermarkPosition: e.target.value as any })}
                        className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                      >
                        <option value="center">Centered Backdrop</option>
                        <option value="top">Header Top</option>
                        <option value="bottom">Footer Bottom</option>
                        <option value="left">Left Margin</option>
                        <option value="right">Right Margin</option>
                        <option value="custom">Custom Offset Coordinates</option>
                      </select>
                    </div>

                    {config.watermarkPosition === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-slate-400">X Position: {config.watermarkX}%</label>
                          <input type="range" min="10" max="90" value={config.watermarkX} onChange={(e) => updateConfig({ watermarkX: Number(e.target.value) })} className="w-full" />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-slate-400">Y Position: {config.watermarkY}%</label>
                          <input type="range" min="10" max="90" value={config.watermarkY} onChange={(e) => updateConfig({ watermarkY: Number(e.target.value) })} className="w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SUB-PANEL 3: SYMBOLS & DECORATIONS */}
            {activeSubTab === 'symbols' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Header symbol */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide">Top Header Symbol Decoration</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Add auspicious or corporate graphics in the top margins.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hdr-sym-chk"
                        checked={config.headerSymbolEnabled}
                        onChange={(e) => updateConfig({ headerSymbolEnabled: e.target.checked })}
                        className="h-4 w-4 rounded text-indigo-650"
                      />
                      <label htmlFor="hdr-sym-chk" className="text-xs font-bold uppercase tracking-wide cursor-pointer">Enabled</label>
                    </div>
                  </div>

                  {config.headerSymbolEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-dashed dark:border-slate-800 bg-white/40 dark:bg-slate-950/20">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Symbol Category</label>
                        <select
                          value={config.headerSymbolType}
                          onChange={(e) => updateConfig({ headerSymbolType: e.target.value as any })}
                          className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                        >
                          <option value="ganpati">Shree Ganpati (🐘)</option>
                          <option value="om">Om Symbol (🕉️)</option>
                          <option value="swastik">Swastik Symbol (卐)</option>
                          <option value="lakshmi">Maha Lakshmi Pad (🌸)</option>
                          <option value="saraswati">Saraswati Veena (🎻)</option>
                          <option value="logo">Use Company Logo</option>
                          <option value="custom">Upload Custom Asset</option>
                        </select>
                      </div>

                      {config.headerSymbolType === 'custom' && (
                        <div>
                          <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Upload symbol image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, 'headerSymbolCustomUrl')}
                            className="w-full text-xs"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Symbol Align Placement</label>
                        <select
                          value={config.headerSymbolPosition}
                          onChange={(e) => updateConfig({ headerSymbolPosition: e.target.value as any })}
                          className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                        >
                          <option value="left">Top Left Corner</option>
                          <option value="center">Top Center (Centered)</option>
                          <option value="right">Top Right Corner</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Size scale: {config.headerSymbolSize}px</label>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={config.headerSymbolSize}
                          onChange={(e) => updateConfig({ headerSymbolSize: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Opacity: {Math.round(config.headerSymbolOpacity * 100)}%</label>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={config.headerSymbolOpacity}
                          onChange={(e) => updateConfig({ headerSymbolOpacity: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Center symbol decoration */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide">Center Watermark / Layout Decoration</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Place a subtle background watermark symbol behind the sheets.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ctr-sym-chk"
                        checked={config.centerSymbolEnabled}
                        onChange={(e) => updateConfig({ centerSymbolEnabled: e.target.checked })}
                        className="h-4 w-4 rounded text-indigo-650"
                      />
                      <label htmlFor="ctr-sym-chk" className="text-xs font-bold uppercase tracking-wide cursor-pointer">Enabled</label>
                    </div>
                  </div>

                  {config.centerSymbolEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-dashed dark:border-slate-800 bg-white/40 dark:bg-slate-950/20">
                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Decoration Shape</label>
                        <select
                          value={config.centerSymbolType}
                          onChange={(e) => updateConfig({ centerSymbolType: e.target.value as any })}
                          className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                        >
                          <option value="om">Om (🕉️)</option>
                          <option value="ganpati">Ganpati (🐘)</option>
                          <option value="swastik">Swastik (卐)</option>
                          <option value="logo">Use Business Logo</option>
                          <option value="custom_religious">Custom Religious Asset</option>
                          <option value="custom_business">Custom Business Graphic</option>
                        </select>
                      </div>

                      {(config.centerSymbolType === 'custom_religious' || config.centerSymbolType === 'custom_business') && (
                        <div>
                          <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Upload graphic asset</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, 'centerSymbolCustomUrl')}
                            className="w-full text-xs"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Sheet Placement Anchor</label>
                        <select
                          value={config.centerSymbolPlacement}
                          onChange={(e) => updateConfig({ centerSymbolPlacement: e.target.value as any })}
                          className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                        >
                          <option value="behind_invoice">Behind Invoice (Center Watermark)</option>
                          <option value="above_table">Above Product Grid Table</option>
                          <option value="above_signature">Above Signatures Row</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Decoration Opacity: {Math.round(config.centerSymbolOpacity * 100)}%</label>
                        <input
                          type="range"
                          min="0.0"
                          max="1.0"
                          step="0.05"
                          value={config.centerSymbolOpacity}
                          onChange={(e) => updateConfig({ centerSymbolOpacity: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-PANEL 4: BRANDING COLORS & TYPOGRAPHY */}
            {activeSubTab === 'branding' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide">Brand Color Palettes &amp; Styling</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize base, alternate row, and vector colors.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-0.5">Primary brand color</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.primaryColor} onChange={(e) => updateConfig({ primaryColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer p-0" />
                      <span className="text-[10px] font-mono uppercase">{config.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-0.5">Secondary tone</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.secondaryColor} onChange={(e) => updateConfig({ secondaryColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer p-0" />
                      <span className="text-[10px] font-mono uppercase">{config.secondaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-0.5">Accent Color</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.accentColor} onChange={(e) => updateConfig({ accentColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer p-0" />
                      <span className="text-[10px] font-mono uppercase">{config.accentColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-0.5">Header background</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.headerBg} onChange={(e) => updateConfig({ headerBg: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer p-0" />
                      <span className="text-[10px] font-mono uppercase">{config.headerBg}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-0.5">Table Header Color</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.tableHeaderColor} onChange={(e) => updateConfig({ tableHeaderColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer p-0" />
                      <span className="text-[10px] font-mono uppercase">{config.tableHeaderColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-black text-slate-400 mb-0.5">Table Header Text</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={config.tableHeaderTextColor} onChange={(e) => updateConfig({ tableHeaderTextColor: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer p-0" />
                      <span className="text-[10px] font-mono uppercase">{config.tableHeaderTextColor}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wide">Document Fonts &amp; Sizing</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Global Font Family</label>
                      <select
                        value={config.fontFamily}
                        onChange={(e) => updateConfig({ fontFamily: e.target.value, headerFont: e.target.value, bodyFont: e.target.value, footerFont: e.target.value, invoiceTitleFont: e.target.value })}
                        className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                      >
                        <option value="Inter">Inter (Clean modern UI standard)</option>
                        <option value="Space Grotesk">Space Grotesk (Aesthetic Tech)</option>
                        <option value="Outfit">Outfit (Product Minimalist)</option>
                        <option value="Playfair Display">Playfair Display (Premium Serif Elegance)</option>
                        <option value="JetBrains Mono">JetBrains Mono (Technical Industrial)</option>
                        <option value="Georgia">Georgia (Classical Legal)</option>
                        <option value="Arial">Arial Standard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Base Font Size Scale</label>
                      <select
                        value={config.fontSize}
                        onChange={(e) => updateConfig({ fontSize: e.target.value as any })}
                        className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                      >
                        <option value="small">Small (Dense - 10.5px / fits more lines)</option>
                        <option value="medium">Medium Standard (12px / Highly Legible)</option>
                        <option value="large">Large Spaced (14px)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PANEL 5: SIGNATURES, STAMPS & SEALS */}
            {activeSubTab === 'signatures' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide">Stamps, Signatures &amp; Seals</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Upload brand assets to verify dispatch sheets.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Verify Signature PNG</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'signatureUrl')}
                      className="w-full text-xs"
                    />
                    <span className="text-[9px] text-slate-400">Prefer transparent background for elegant overlaying.</span>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Official Company Stamp</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload(e, 'stampUrl')}
                      className="w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Display Selection</label>
                    <select
                      value={config.signatureDisplay}
                      onChange={(e) => updateConfig({ signatureDisplay: e.target.value as any })}
                      className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950"
                    >
                      <option value="signature">Authorized Signature Only</option>
                      <option value="stamp">Official Company Stamp Only</option>
                      <option value="both">Render Both (Stamp overlaid with Sign)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] font-bold block">🔐 Play Integrity Certificate</span>
                      <span className="text-[9px] text-slate-400 block">Add "Verified Digitally" signature block</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.signatureVerified}
                      onChange={(e) => updateConfig({ signatureVerified: e.target.checked })}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PANEL 6: DOCUMENT FORMAT LAYOUTS & QR/BARCODES */}
            {activeSubTab === 'documents' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide">Table &amp; Sheet Styles</h4>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Rounded Grid Tables</label>
                        <input type="checkbox" checked={config.roundedTables} onChange={(e) => updateConfig({ roundedTables: e.target.checked })} className="h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Alternate Row Zebra Striping</label>
                        <input type="checkbox" checked={config.alternateRowColors} onChange={(e) => updateConfig({ alternateRowColors: e.target.checked })} className="h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Auto Page Numbering</label>
                        <input type="checkbox" checked={config.autoPageNumber} onChange={(e) => updateConfig({ autoPageNumber: e.target.checked })} className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide">Vintage Rubber Stamps</h4>
                    <select
                      value={config.stampType}
                      onChange={(e) => updateConfig({ stampType: e.target.value as any })}
                      className="w-full text-xs font-bold rounded p-2.5 border dark:bg-slate-950 mt-2"
                    >
                      <option value="none">No status overlay stamp</option>
                      <option value="paid">PAID (Rotated emerald stamp)</option>
                      <option value="unpaid">UNPAID (Rotated red stamp)</option>
                      <option value="cancelled">CANCELLED (Black draft stamp)</option>
                      <option value="draft">DRAFT COMPLIANCE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide">Integrated QR Code Generator</h4>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Enable QR Code</label>
                        <input type="checkbox" checked={config.qrEnabled} onChange={(e) => updateConfig({ qrEnabled: e.target.checked })} className="h-4 w-4" />
                      </div>
                      {config.qrEnabled && (
                        <>
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-slate-500">Include UPI Payment Payload</label>
                            <input type="checkbox" checked={config.qrIncludeUpi} onChange={(e) => updateConfig({ qrIncludeUpi: e.target.checked })} className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-slate-500">Include GST Details</label>
                            <input type="checkbox" checked={config.qrIncludeGstDetails} onChange={(e) => updateConfig({ qrIncludeGstDetails: e.target.checked })} className="h-3.5 w-3.5" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide">Digital Barcode Generator</h4>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Enable Document Barcode</label>
                        <input type="checkbox" checked={config.barcodeEnabled} onChange={(e) => updateConfig({ barcodeEnabled: e.target.checked })} className="h-4 w-4" />
                      </div>
                      {config.barcodeEnabled && (
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400">Barcode Format</label>
                          <select
                            value={config.barcodeType}
                            onChange={(e) => updateConfig({ barcodeType: e.target.value as any })}
                            className="w-full text-xs rounded p-1.5 border dark:bg-slate-950 mt-1"
                          >
                            <option value="code128">Standard Code-128</option>
                            <option value="code39">Code-39 Alphanumeric</option>
                            <option value="ean13">EAN-13 European</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide">Advanced Document Parameters</h4>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">PDF Password Protection</label>
                        <input type="checkbox" checked={config.pdfPasswordProtected} onChange={(e) => updateConfig({ pdfPasswordProtected: e.target.checked })} className="h-4 w-4" />
                      </div>
                      {config.pdfPasswordProtected && (
                        <input
                          type="password"
                          placeholder="Set PDF Owner Password"
                          value={config.pdfPassword || ''}
                          onChange={(e) => updateConfig({ pdfPassword: e.target.value })}
                          className="w-full text-xs p-2 border rounded dark:bg-slate-950 mt-1 font-mono"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wide">Slogan &amp; Letterhead</h4>
                    <input
                      type="text"
                      placeholder="Company Brand Slogan"
                      value={config.companySlogan}
                      onChange={(e) => updateConfig({ companySlogan: e.target.value })}
                      className="w-full text-xs p-2 border rounded dark:bg-slate-950 mt-2 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PANEL 7: SHARING LOGS */}
            {activeSubTab === 'history' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide">Digital Trail &amp; Share Histories</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Logs of all prints, downloads, and secure social transfers.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400">Email Dispatches ({emailHistory.length})</span>
                    <div className="mt-1 border rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-white/45 dark:bg-slate-950/20 max-h-24 overflow-y-auto text-[10.5px] font-mono p-1.5">
                      {emailHistory.map(h => (
                        <div key={h.id} className="flex justify-between py-1 text-slate-500">
                          <span>{h.number} ➔ {h.recipient}</span>
                          <span>{h.date} | <strong className="text-emerald-500">{h.status}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400">WhatsApp Shares ({whatsappHistory.length})</span>
                    <div className="mt-1 border rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-white/45 dark:bg-slate-950/20 max-h-24 overflow-y-auto text-[10.5px] font-mono p-1.5">
                      {whatsappHistory.map(h => (
                        <div key={h.id} className="flex justify-between py-1 text-slate-500">
                          <span>{h.number} ➔ {h.phone}</span>
                          <span>{h.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400">Print Sessions ({printHistory.length})</span>
                    <div className="mt-1 border rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-white/45 dark:bg-slate-950/20 max-h-24 overflow-y-auto text-[10.5px] font-mono p-1.5">
                      {printHistory.map(h => (
                        <div key={h.id} className="flex justify-between py-1 text-slate-500">
                          <span>{h.number} ({h.client})</span>
                          <span>{h.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Live Preview Column (5/12) */}
        <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-6">
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950 border p-2 rounded-xl dark:border-slate-800">
            <span className="text-[10.5px] font-black uppercase tracking-wider pl-1.5 flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 text-indigo-500" /> Interactive Live Preview
            </span>
            <div className="flex gap-1">
              {[
                { id: 'desktop', icon: Laptop, tooltip: 'Desktop Layout' },
                { id: 'tablet', icon: Tablet, tooltip: 'Tablet Layout' },
                { id: 'mobile', icon: Smartphone, tooltip: 'Mobile Page' }
              ].map(dev => {
                const Icon = dev.icon;
                return (
                  <button
                    key={dev.id}
                    onClick={() => setPreviewDevice(dev.id as any)}
                    className={`p-1.5 rounded transition-all cursor-pointer ${
                      previewDevice === dev.id 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                    title={dev.tooltip}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Frame Wrapper */}
          <div className={`mx-auto w-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 rounded-2xl shadow-inner p-3 overflow-hidden flex justify-center transition-all duration-300 ${
            previewDevice === 'mobile' ? 'max-w-sm h-[580px]' : previewDevice === 'tablet' ? 'max-w-xl h-[620px]' : 'max-w-full'
          }`}>
            <scroll-container className="w-full h-full overflow-y-auto pr-1">
              {/* Paper Invoice sheet */}
              <div 
                style={{ fontFamily: config.fontFamily }}
                className="relative p-6 bg-white text-slate-900 rounded-xl shadow-md border w-full max-w-full mx-auto select-none overflow-hidden"
              >
                {/* Background Full Page Watermark Image */}
                {config.watermarkEnabled && config.watermarkType === 'background' && config.watermarkBgUrl && (
                  <div className="absolute inset-0 pointer-events-none select-none z-0" style={{ opacity: config.watermarkOpacity }}>
                    <img src={config.watermarkBgUrl} alt="Watermark Background" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Classic Background pattern */}
                {config.backgroundPattern === 'dots' && (
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(#000 10%, transparent 10%)', backgroundSize: '12px 12px' }} />
                )}
                {config.backgroundPattern === 'grid' && (
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
                )}

                {/* 📄 SUBTLE BACKGROUND WATERMARK OPTION */}
                {config.watermarkEnabled && config.watermarkType === 'text' && config.watermarkText && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
                    style={{ opacity: config.watermarkOpacity }}
                  >
                    <div 
                      className="font-black tracking-[0.1em] text-slate-900 uppercase rotate-[-35deg] whitespace-nowrap text-center"
                      style={{ 
                        fontSize: config.watermarkSize === 'small' ? '2.5rem' : config.watermarkSize === 'medium' ? '4.5rem' : config.watermarkSize === 'large' ? '6.5rem' : '8.5rem'
                      }}
                    >
                      {config.watermarkText}
                    </div>
                  </div>
                )}

                {/* Logo Watermark */}
                {config.watermarkEnabled && config.watermarkType === 'logo' && config.watermarkLogoUrl && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
                    style={{ opacity: config.watermarkOpacity }}
                  >
                    <img 
                      src={config.watermarkLogoUrl} 
                      alt="Watermark Logo" 
                      style={{ 
                        width: config.watermarkSize === 'small' ? '100px' : config.watermarkSize === 'medium' ? '200px' : config.watermarkSize === 'large' ? '300px' : '500px'
                      }}
                    />
                  </div>
                )}

                {/* Auspicious religious header symbol */}
                {config.headerSymbolEnabled && config.headerSymbolType && (
                  <div 
                    className={`flex ${
                      config.headerSymbolPosition === 'left' ? 'justify-start' : config.headerSymbolPosition === 'right' ? 'justify-end' : 'justify-center'
                    } mb-3`}
                    style={{ opacity: config.headerSymbolOpacity }}
                  >
                    {config.headerSymbolType === 'custom' && config.headerSymbolCustomUrl ? (
                      <img src={config.headerSymbolCustomUrl} alt="Custom Symbol" style={{ height: `${config.headerSymbolSize}px` }} />
                    ) : (
                      <span className="font-sans font-black text-slate-800" style={{ fontSize: `${config.headerSymbolSize * 0.7}px` }}>
                        {SYMBOL_SVGS[config.headerSymbolType] || "卐"}
                      </span>
                    )}
                  </div>
                )}

                {/* Standard Header Banner */}
                <div className="border-b pb-4 mb-4" style={{ borderColor: config.secondaryColor }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      {/* Brand Logo & Name */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 rounded flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: config.primaryColor }}>SL</div>
                        <span className="font-black text-xs tracking-wider uppercase" style={{ color: config.primaryColor }}>STOCK &amp; LEDGER INC.</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-relaxed font-mono">
                        701, Antigravity Tech High Road, Navi Mumbai<br />
                        Maharashtra, IN | GSTIN: 27AASCE9904E1Z0
                      </p>
                      {config.companySlogan && (
                        <p className="text-[9px] italic mt-1" style={{ color: config.secondaryColor }}>
                          "{config.companySlogan}"
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <h1 className="text-sm font-black uppercase tracking-wider" style={{ color: config.primaryColor }}>
                        TAX INVOICE
                      </h1>
                      <p className="font-mono text-[9.5px] font-bold mt-1" style={{ color: config.accentColor }}>
                        Doc No: INV-2026-005
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mid Symbol Decoration (Above table) */}
                {config.centerSymbolEnabled && config.centerSymbolPlacement === 'above_table' && (
                  <div className="flex justify-center my-3" style={{ opacity: config.centerSymbolOpacity }}>
                    {config.centerSymbolType === 'logo' && config.watermarkLogoUrl ? (
                      <img src={config.watermarkLogoUrl} alt="Logo Decoration" style={{ height: `${config.centerSymbolSize}px` }} />
                    ) : (
                      <span className="font-sans font-black text-slate-800" style={{ fontSize: `${config.centerSymbolSize * 0.7}px` }}>
                        {SYMBOL_SVGS[config.centerSymbolType] || "🕉️"}
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata details */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-[10.5px] leading-relaxed">
                  <div>
                    <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Billed / Consigned To:</span>
                    <strong className="text-slate-900 block font-bold">APOLLO CLINICAL HUB PRIVATE LTD</strong>
                    <p className="text-slate-500 text-[10px]">702, Premium Tower, Sector 15-A, Gurugram, Haryana</p>
                    <span className="font-mono text-[8.5px] uppercase text-indigo-900 bg-indigo-50 px-1.5 py-0.2 rounded inline-block mt-0.5">GSTIN: 06AAAAA1111A1Z1</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Document Metadata:</span>
                    <p><span className="text-slate-400 font-semibold uppercase text-[8px]">Created Date:</span> <strong className="font-mono">2026-06-28</strong></p>
                    <p><span className="text-slate-400 font-semibold uppercase text-[8px]">Terms Limit:</span> <strong className="font-mono text-rose-600">2026-07-13</strong></p>
                    <p><span className="text-slate-400 font-semibold uppercase text-[8px]">Branch ID:</span> <span className="font-mono font-bold text-[9px]">{config.branchName}</span></p>
                  </div>
                </div>

                {/* Product list table */}
                <div className={`border overflow-hidden mb-4 ${config.roundedTables ? 'rounded-lg' : ''}`} style={{ borderColor: config.secondaryColor }}>
                  <table className="w-full text-left text-[10.5px] divide-y divide-slate-200">
                    <thead>
                      <tr className="font-bold uppercase text-[8px] tracking-tight" style={{ backgroundColor: config.tableHeaderColor, color: config.tableHeaderTextColor }}>
                        <th className="px-2 py-1.5 text-center w-8">#</th>
                        <th className="px-2 py-1.5">Line Specification Item</th>
                        <th className="px-2 py-1.5 text-right">Rate</th>
                        <th className="px-2 py-1.5 text-center w-10">Qty</th>
                        <th className="px-2 py-1.5 text-center w-10">GST</th>
                        <th className="px-2 py-1.5 text-right w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="text-slate-800">
                        <td className="px-2 py-1.5 text-center font-mono text-slate-400">1</td>
                        <td className="px-2 py-1.5 font-medium">Intel Core i7 Workstation Processor (8471)</td>
                        <td className="px-2 py-1.5 text-right font-mono">₹24,000</td>
                        <td className="px-2 py-1.5 text-center font-mono">5</td>
                        <td className="px-2 py-1.5 text-center font-mono">18%</td>
                        <td className="px-2 py-1.5 text-right font-mono font-bold">₹1,20,000</td>
                      </tr>
                      <tr className={`text-slate-800 ${config.alternateRowColors ? 'bg-slate-50/70' : ''}`}>
                        <td className="px-2 py-1.5 text-center font-mono text-slate-400">2</td>
                        <td className="px-2 py-1.5 font-medium">Cisco Enterprise Gigabit Network Router (8517)</td>
                        <td className="px-2 py-1.5 text-right font-mono">₹1,15,000</td>
                        <td className="px-2 py-1.5 text-center font-mono">1</td>
                        <td className="px-2 py-1.5 text-center font-mono">18%</td>
                        <td className="px-2 py-1.5 text-right font-mono font-bold">₹1,15,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals & QR / Barcodes */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-[10px] items-start border-b pb-3 mb-3">
                  <div className="sm:col-span-7 space-y-1">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-black block">Standard Terms:</span>
                    <p className="text-[8.5px] text-slate-500 leading-normal italic bg-slate-50 p-2 rounded border border-dashed font-sans whitespace-pre-line">
                      {config.termsAndConditions}
                    </p>
                    <p className="text-[8.5px] text-slate-500 bg-slate-50 p-2 rounded border border-dashed mt-1">
                      <strong>Declaration:</strong> {config.declaration}
                    </p>
                  </div>

                  <div className="sm:col-span-5 text-right space-y-1">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">₹2,35,000.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Integrated GST Tax:</span>
                      <span className="font-mono">₹42,300.00</span>
                    </div>
                    <div className="flex justify-between items-center font-black border-t pt-1 text-slate-900 text-xs">
                      <span>Grand Total:</span>
                      <span className="font-mono" style={{ color: config.accentColor }}>₹2,77,300.00</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Rubber Stamp Overlay */}
                {config.stampType !== 'none' && (
                  <div className="absolute right-36 top-1/2 transform -translate-y-1/2 rotate-[-25deg] pointer-events-none opacity-20 z-10">
                    <div className={`border-4 px-4 py-2 text-xl font-black rounded-lg uppercase tracking-widest ${
                      config.stampType === 'paid' ? 'border-emerald-600 text-emerald-600' :
                      config.stampType === 'unpaid' ? 'border-rose-600 text-rose-600' : 'border-slate-600 text-slate-600'
                    }`}>
                      {config.stampType}
                    </div>
                  </div>
                )}

                {/* QR Code and Barcode Layout row */}
                <div className="flex justify-between items-center gap-4 text-[9px] pt-2">
                  <div className="flex items-center gap-2">
                    {config.qrEnabled && (
                      <div className="flex flex-col items-center p-1 bg-slate-50 border rounded">
                        {/* Interactive Dynamic QR Image */}
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&color=${config.qrColor.replace('#', '')}&data=${encodeURIComponent('https://sarveshledger.org/invoice/INV-2026-005')}`} 
                          alt="Invoice QR" 
                          className="w-14 h-14" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[7px] text-slate-400 font-mono mt-0.5">UPI VERIFIED QR</span>
                      </div>
                    )}

                    {config.barcodeEnabled && (
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-24 bg-slate-100 flex items-center justify-center relative font-mono text-[7px] text-slate-600 border rounded tracking-widest p-0.5">
                          <span className="block border-l border-slate-950 h-full w-0.5 mx-0.5"></span>
                          <span className="block border-l border-slate-950 h-full w-0.5 mx-0.5"></span>
                          <span className="block border-l border-slate-950 h-full w-0.5 mx-0.2"></span>
                          <span className="block border-l border-slate-950 h-full w-1 mx-0.5"></span>
                          <span className="block border-l border-slate-950 h-full w-0.5 mx-0.2"></span>
                          <span className="block border-l border-slate-950 h-full w-0.5 mx-0.5"></span>
                          <span className="block border-l border-slate-950 h-full w-1 mx-0.5"></span>
                        </div>
                        <span className="text-[7.5px] text-slate-400 font-mono">INV-2026-005</span>
                      </div>
                    )}
                  </div>

                  {/* Signatures and seals row */}
                  <div className="text-right flex flex-col items-end">
                    <div className="relative group w-24 h-8 flex flex-col items-center justify-center border border-dashed rounded p-1 bg-slate-50/50 mb-1 overflow-hidden">
                      {config.signatureUrl ? (
                        <img src={config.signatureUrl} alt="Signature preview" className="max-h-full object-contain mix-blend-multiply" />
                      ) : (
                        <span className="text-[8px] text-slate-300 italic font-serif">(Sarvesh Yadav)</span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-400">Authorized Signatory</span>
                  </div>
                </div>

                {/* Thank you message */}
                {config.thankYouMessage && (
                  <p className="text-center text-[9px] text-slate-400 mt-3 italic border-t pt-2">
                    "{config.thankYouMessage}"
                  </p>
                )}
              </div>
            </scroll-container>
          </div>

          {/* Quick Sharing trigger buttons for Sandbox compliance */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={triggerEmailDispatch}
              className="p-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-250/30 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Mail className="h-4 w-4" /> Email Branded PDF
            </button>
            <button
              onClick={triggerWhatsappDispatch}
              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-250/30 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <MessageSquare className="h-4 w-4" /> Share via WhatsApp
            </button>
            <button
              onClick={() => {
                onShowToast("Opening standard print controller to package fully designed document with watermarks...", "success");
                window.print();
              }}
              className="p-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border dark:border-slate-800 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all col-span-2 active:scale-95"
            >
              <Printer className="h-4 w-4" /> Open Print &amp; PDF preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
