import React, { useState, useEffect } from 'react';
import { 
  Sliders, FileText, Layout, Image, Settings, Sparkles, Check, CheckCircle, 
  Printer, Download, Share2, Stamp, Type, RefreshCw
} from 'lucide-react';

export interface PdfSettings {
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'Inter' | 'Space Grotesk' | 'JetBrains Mono' | 'Courier' | 'Helvetica';
  theme: 'classic' | 'modern' | 'minimal' | 'corporate' | 'dark' | 'luxury';
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  logoEnabled: boolean;
  logoUrl: string;
  headerVisible: boolean;
  footerVisible: boolean;
  qrEnabled: boolean;
  qrContent: string;
  barcodeEnabled: boolean;
  signatureEnabled: boolean;
  signatureUrl: string;
  marginSize: 'small' | 'medium' | 'large';
  autoDownload: boolean;
  autoPrint: boolean;
  autoShare: boolean;
  fileNamingFormat: string;
}

export const defaultPdfSettings: PdfSettings = {
  paperSize: 'a4',
  orientation: 'portrait',
  fontSize: 'medium',
  fontFamily: 'Inter',
  theme: 'classic',
  watermarkEnabled: true,
  watermarkText: 'STOCK & LEDGER CORP',
  watermarkOpacity: 0.1,
  logoEnabled: true,
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60', // beautiful abstract corporate logo
  headerVisible: true,
  footerVisible: true,
  qrEnabled: true,
  qrContent: 'https://ais-pre-avc3wxm3cgaoygrzeqk73e-1051245362598.asia-southeast1.run.app',
  barcodeEnabled: true,
  signatureEnabled: true,
  signatureUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=120&auto=format&fit=crop&q=60', // beautiful ink brush stroke signature representation
  marginSize: 'medium',
  autoDownload: false,
  autoPrint: false,
  autoShare: false,
  fileNamingFormat: '[Type]_[Number]_[Date]'
};

interface PdfSettingsManagerProps {
  isLight: boolean;
  onShowToast: (text: string, type?: 'success' | 'error') => void;
}

export const PdfSettingsManager: React.FC<PdfSettingsManagerProps> = ({ isLight, onShowToast }) => {
  const [settings, setSettings] = useState<PdfSettings>(defaultPdfSettings);
  const [activeTab, setActiveTab] = useState<'layout' | 'branding' | 'auto'>('layout');

  useEffect(() => {
    const saved = localStorage.getItem('pdf_generator_settings');
    if (saved) {
      try {
        setSettings({ ...defaultPdfSettings, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Error parsing stored PDF settings:', e);
      }
    }
  }, []);

  const saveSettings = (newSettings: PdfSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pdf_generator_settings', JSON.stringify(newSettings));
    onShowToast("PDF configuration updated. Settings applied system-wide.", "success");
    // Dispatch custom event to notify parent components of pdf settings change
    window.dispatchEvent(new Event('pdfSettingsChanged'));
  };

  const handleReset = () => {
    saveSettings(defaultPdfSettings);
    onShowToast("PDF layout and formatting settings restored to default.", "success");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header card with action */}
      <div className={`p-5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-850'
      }`}>
        <div className="text-left">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-indigo-500" />
            PDF Rendering &amp; Printing Engine settings
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Configure default paper formats, watermark layers, authorized signatures, barcodes, and automated download workflows.
          </p>
        </div>
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 text-[10px] font-black uppercase border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          Reset to Factory Default
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('layout')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'layout' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layout className="h-3.5 w-3.5" />
          Layout &amp; Margins
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'branding' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Image className="h-3.5 w-3.5" />
          Symbols, Watermark &amp; Branding
        </button>
        <button
          onClick={() => setActiveTab('auto')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'auto' 
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Automations &amp; Formats
        </button>
      </div>

      {/* Form content */}
      <div className="space-y-6">
        {activeTab === 'layout' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Paper Size */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">Paper Size Format</label>
              <div className="grid grid-cols-2 gap-2">
                {(['a4', 'letter'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => saveSettings({ ...settings, paperSize: size })}
                    className={`p-3 border rounded-xl text-left transition-all ${
                      settings.paperSize === size 
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold block uppercase">{size}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">
                      {size === 'a4' ? '210mm x 297mm (Standard International)' : '8.5" x 11" (US Enterprise Form)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">Default Document Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                {(['portrait', 'landscape'] as const).map(dir => (
                  <button
                    key={dir}
                    onClick={() => saveSettings({ ...settings, orientation: dir })}
                    className={`p-3 border rounded-xl text-left transition-all ${
                      settings.orientation === dir 
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold block uppercase">{dir}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">
                      {dir === 'portrait' ? 'Vertical layout (A4 Standard)' : 'Horizontal ledger grid'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">Primary Font Family</label>
              <select
                value={settings.fontFamily}
                onChange={(e) => saveSettings({ ...settings, fontFamily: e.target.value as any })}
                className="w-full text-xs font-bold rounded-xl p-3 border dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              >
                <option value="Inter">Inter (Sans-Serif Swiss Modern)</option>
                <option value="Space Grotesk">Space Grotesk (Tech-Forward Display)</option>
                <option value="JetBrains Mono">JetBrains Mono (Printers Courier Alternative)</option>
                <option value="Courier">Courier (System Classic Monospace)</option>
                <option value="Helvetica">Helvetica (Standard Sans-Serif)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">Base PDF Font Size Scale</label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map(fs => (
                  <button
                    key={fs}
                    onClick={() => saveSettings({ ...settings, fontSize: fs })}
                    className={`py-2 px-3 border rounded-xl font-bold text-xs transition-all ${
                      settings.fontSize === fs 
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="capitalize">{fs}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">Page Margins Size</label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => saveSettings({ ...settings, marginSize: m })}
                    className={`py-2 px-3 border rounded-xl font-bold text-xs transition-all ${
                      settings.marginSize === m 
                        ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="capitalize">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PDF Render Theme */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-450 block">Aesthetic Render Theme Style</label>
              <select
                value={settings.theme}
                onChange={(e) => saveSettings({ ...settings, theme: e.target.value as any })}
                className="w-full text-xs font-bold rounded-xl p-3 border dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              >
                <option value="classic">Classic Slate Vyapar (Minimalist Borders)</option>
                <option value="modern">Modern Indigo Gradient (Accent Panels)</option>
                <option value="minimal">Minimalist Editorial (High Negative Space)</option>
                <option value="corporate">Corporate Deep Navy (Professional Borders)</option>
                <option value="dark">Cosmic Obsidian (High Contrast Dark PDF)</option>
                <option value="luxury">Luxury Regal Gold (Warm Gold Accents)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Watermark controls */}
            <div className="p-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Watermark Overlay</h4>
                  <p className="text-[10px] text-slate-450">Draw standard corporate seal behind table grids</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.watermarkEnabled}
                  onChange={(e) => saveSettings({ ...settings, watermarkEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              {settings.watermarkEnabled && (
                <>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Watermark Text</label>
                    <input
                      type="text"
                      value={settings.watermarkText}
                      onChange={(e) => saveSettings({ ...settings, watermarkText: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-mono font-bold rounded p-2.5 mt-1 border dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 flex justify-between">
                      <span>Watermark Opacity</span>
                      <span>{(settings.watermarkOpacity * 100).toFixed(0)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.30"
                      step="0.05"
                      value={settings.watermarkOpacity}
                      onChange={(e) => saveSettings({ ...settings, watermarkOpacity: parseFloat(e.target.value) })}
                      className="w-full mt-2 cursor-pointer accent-indigo-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Corporate Logo Scale */}
            <div className="p-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Corporate Header Logo</h4>
                  <p className="text-[10px] text-slate-450">Mount brand image token on header card</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.logoEnabled}
                  onChange={(e) => saveSettings({ ...settings, logoEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              {settings.logoEnabled && (
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Public Image/Logo URL</label>
                  <input
                    type="url"
                    value={settings.logoUrl}
                    onChange={(e) => saveSettings({ ...settings, logoUrl: e.target.value })}
                    className="w-full text-xs font-mono rounded p-2.5 mt-1 border dark:bg-slate-950"
                    placeholder="https://example.com/logo.png"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <img referrerPolicy="no-referrer" src={settings.logoUrl} className="h-8 w-14 object-contain bg-slate-100 rounded p-1" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    <span className="text-[8px] text-slate-400">Preview of active logo vector. Only high-res PNGs/JPGs.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Signatures & Stamps */}
            <div className="p-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Authorized Digital Signature</h4>
                  <p className="text-[10px] text-slate-450">Draw signatory ink brush block on PDF bottom-right</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.signatureEnabled}
                  onChange={(e) => saveSettings({ ...settings, signatureEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              {settings.signatureEnabled && (
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Signature URL Token</label>
                  <input
                    type="url"
                    value={settings.signatureUrl}
                    onChange={(e) => saveSettings({ ...settings, signatureUrl: e.target.value })}
                    className="w-full text-xs font-mono rounded p-2.5 mt-1 border dark:bg-slate-950"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <img referrerPolicy="no-referrer" src={settings.signatureUrl} className="h-6 w-16 object-contain bg-slate-100 rounded p-1" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    <span className="text-[8px] text-slate-400">Signatory vector token visualizer</span>
                  </div>
                </div>
              )}
            </div>

            {/* QR Code and Barcode Toggles */}
            <div className="p-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Metadata QR &amp; Barcode Toggles</h4>
              
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-850">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">UPI QR Payments Block</span>
                  <span className="text-[9px] text-slate-400 block">Render dynamic UPI merchant checkout code</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.qrEnabled}
                  onChange={(e) => saveSettings({ ...settings, qrEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>

              {settings.qrEnabled && (
                <div>
                  <label className="text-[8px] font-black uppercase text-indigo-650 dark:text-indigo-400 block mb-0.5">Custom QR Target / UPI String</label>
                  <input
                    type="text"
                    value={settings.qrContent}
                    onChange={(e) => saveSettings({ ...settings, qrContent: e.target.value })}
                    className="w-full text-[10px] font-mono rounded p-2 border dark:bg-slate-950"
                  />
                </div>
              )}

              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Vector Invoice Barcodes</span>
                  <span className="text-[9px] text-slate-400 block">Display Code-128 barcode matching document ID</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.barcodeEnabled}
                  onChange={(e) => saveSettings({ ...settings, barcodeEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>
            </div>

            {/* Header / Footer Section Toggles */}
            <div className="p-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl space-y-3 md:col-span-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Default Header / Footer Blocks Visibility</h4>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-2.5 border border-slate-150 dark:border-slate-850 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Header Card Block</span>
                    <span className="text-[8.5px] text-slate-400 block">Company Info, GSTIN, Title, Doc metadata</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.headerVisible}
                    onChange={(e) => saveSettings({ ...settings, headerVisible: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 border border-slate-150 dark:border-slate-850 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Footer Card Block</span>
                    <span className="text-[8.5px] text-slate-400 block">T&amp;C legal note, Signature block, thank you note</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.footerVisible}
                    onChange={(e) => saveSettings({ ...settings, footerVisible: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'auto' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Automated Actions */}
            <div className="p-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Post-Save Automation Workflows</h4>
              <p className="text-[10px] text-slate-450">Trigger automatic native operations immediately when draft is saved</p>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-850 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Auto-Download Local Copy</span>
                    <span className="text-[9px] text-slate-400 block">Initiate silent file system transfer</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoDownload}
                    onChange={(e) => saveSettings({ ...settings, autoDownload: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-850 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Auto-Print Draft Preview</span>
                    <span className="text-[9px] text-slate-400 block">Open browser local OS print options immediately</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPrint}
                    onChange={(e) => saveSettings({ ...settings, autoPrint: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Auto-Share native Sheet</span>
                    <span className="text-[9px] text-slate-400 block">Trigger native Share Sheet options directly</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoShare}
                    onChange={(e) => saveSettings({ ...settings, autoShare: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                </label>
              </div>
            </div>

            {/* Custom file naming format */}
            <div className="p-4 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Dynamic File Naming Rule</h4>
              <p className="text-[10px] text-slate-450">Format rules to formulate PDF file export names automatically using brackets or braces.</p>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Filename Pattern</label>
                  <input
                    type="text"
                    value={settings.fileNamingFormat}
                    onChange={(e) => saveSettings({ ...settings, fileNamingFormat: e.target.value })}
                    className="w-full text-xs font-mono font-bold rounded p-2.5 mt-1 border dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="[Type]_[Number]_[Date]"
                  />
                </div>

                {/* Preset suggestions */}
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Common Templates:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Type_Number_Date', value: '[Type]_[Number]_[Date]' },
                      { label: 'Type-Number-Client', value: '[Type]-[Number]-[Client]' },
                      { label: 'Invoice_Number_Date', value: 'Invoice_{number}_{date}' },
                      { label: 'Client_Number', value: '[Client]_[Number]' }
                    ].map((tpl) => (
                      <button
                        key={tpl.value}
                        type="button"
                        onClick={() => saveSettings({ ...settings, fileNamingFormat: tpl.value })}
                        className={`px-2 py-1 text-[9px] font-mono font-extrabold uppercase rounded border cursor-pointer transition-all ${
                          settings.fileNamingFormat === tpl.value
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Placeholders interactive chips */}
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Click to Append Placeholder:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: '[Type]', desc: 'Doc type' },
                      { name: '[Number]', desc: 'Serial #' },
                      { name: '[Date]', desc: 'Date' },
                      { name: '[Client]', desc: 'Client Name' },
                      { name: '{type}', desc: 'Doc type' },
                      { name: '{number}', desc: 'Serial #' },
                      { name: '{date}', desc: 'Date' },
                      { name: '{client}', desc: 'Client' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          const currentVal = settings.fileNamingFormat || '';
                          const newVal = currentVal ? `${currentVal}_${item.name}` : item.name;
                          saveSettings({ ...settings, fileNamingFormat: newVal });
                        }}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-900/50 rounded text-[9px] text-indigo-700 dark:text-indigo-400 font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title={item.desc}
                      >
                        + {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-100 dark:bg-slate-950/60 rounded-lg text-[9px] leading-relaxed text-slate-500 space-y-1">
                  <span className="font-bold block uppercase tracking-wider text-slate-655 text-[8.5px]">Active Example Result:</span>
                  <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                    <p className="font-mono text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                      {(() => {
                        const fmt = settings.fileNamingFormat || '[Type]_[Number]_[Date]';
                        const num = '000125';
                        const dt = '2026-07-02';
                        const client = 'Apollo_Hub';
                        const typeStr = 'Invoice';
                        
                        let res = fmt;
                        const placeholders = [
                          { keys: ['{number}', '{Number}', '[number]', '[Number]'], value: num },
                          { keys: ['{date}', '{Date}', '[date]', '[Date]'], value: dt },
                          { keys: ['{client}', '{Client}', '[client]', '[Client]'], value: client },
                          { keys: ['{type}', '{Type}', '[type]', '[Type]'], value: typeStr.toUpperCase() }
                        ];

                        placeholders.forEach(({ keys, value }) => {
                          keys.forEach(key => {
                            res = res.split(key).join(value);
                          });
                        });

                        ['{type_lower}', '[type_lower]'].forEach(key => {
                          res = res.split(key).join(typeStr.toLowerCase());
                        });

                        res = res.replace(/[^a-zA-Z0-9_\.-]/g, '_');
                        if (!res || res === '.pdf') {
                          res = `INVOICE_${num}_${dt}`;
                        }
                        if (!res.endsWith('.pdf')) {
                          res += '.pdf';
                        }
                        return res;
                      })()}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-1">
                      Supports case-insensitive placeholders with braces {"{}"} or brackets []. Disallows special system characters in the output.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
