import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  RotateCcw, Search, AlertTriangle, ClipboardCheck, ArrowLeftRight, 
  Layers, Database, Calendar, User, RefreshCw, ShoppingBag, CheckCircle2,
  Trash2, Plus, Minus, Info, Landmark, MapPin, FileSpreadsheet, FileText
} from 'lucide-react';
import { BusinessDocument, BusinessDocItem, Godown, StockTransaction } from '../types';

interface SalesReturnModuleProps {
  isLight: boolean;
  documents: BusinessDocument[];
  token: string;
  onRefreshData: () => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
  transactions: StockTransaction[];
  godowns: Godown[];
  onViewInDocumentHub?: (doc: BusinessDocument) => void;
}

interface ReturnLineItem {
  id: string;
  name: string;
  originalQty: number;
  returnQty: number;
  rate: number;
  taxRate: number;
  selected: boolean;
  targetGodownId: string;
  suggestedGodownId: string;
  suggestionReason: string;
  suggestionConfidence: 'high' | 'medium' | 'low';
}

export const SalesReturnModule: React.FC<SalesReturnModuleProps> = ({
  isLight,
  documents,
  token,
  onRefreshData,
  showToast,
  transactions,
  godowns,
  onViewInDocumentHub
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<BusinessDocument | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnLineItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7); // Defaults to current month, e.g. "2026-07"
  });

  const getGodownSuggestion = (itemName: string): { godownId: string; reason: string; confidence: 'high' | 'medium' | 'low' } => {
    if (!transactions || transactions.length === 0) {
      const defaultId = godowns?.[0]?.id || 'GD-01';
      return { godownId: defaultId, reason: 'System Default (No transactions available)', confidence: 'low' };
    }

    const inflowTx = transactions.filter(tx => 
      tx.type === 'INFLOW' && 
      tx.itemName.trim().toLowerCase() === itemName.trim().toLowerCase() && 
      tx.toGodownId
    );

    if (inflowTx.length === 0) {
      const defaultId = godowns?.[0]?.id || 'GD-01';
      return { godownId: defaultId, reason: 'System Default (No past inflow logs found)', confidence: 'low' };
    }

    // Count occurrences of each toGodownId
    const counts: { [id: string]: { count: number; lastDate: string; totalQty: number } } = {};
    inflowTx.forEach(tx => {
      const gId = tx.toGodownId!;
      if (!counts[gId]) {
        counts[gId] = { count: 0, lastDate: tx.timestamp, totalQty: 0 };
      }
      counts[gId].count += 1;
      counts[gId].totalQty += tx.quantity;
      if (new Date(tx.timestamp) > new Date(counts[gId].lastDate)) {
        counts[gId].lastDate = tx.timestamp;
      }
    });

    // Find the godown with the highest frequency
    let bestGodownId = '';
    let maxCount = -1;
    let maxQty = -1;
    let latestTimestamp = '';

    Object.entries(counts).forEach(([gId, stats]) => {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        bestGodownId = gId;
        maxQty = stats.totalQty;
        latestTimestamp = stats.lastDate;
      } else if (stats.count === maxCount) {
        // Tie breaker: use the one with the higher quantity, or more recent
        if (stats.totalQty > maxQty) {
          bestGodownId = gId;
          maxQty = stats.totalQty;
          latestTimestamp = stats.lastDate;
        } else if (new Date(stats.lastDate) > new Date(latestTimestamp)) {
          bestGodownId = gId;
          latestTimestamp = stats.lastDate;
        }
      }
    });

    const targetGodown = godowns.find(g => g.id === bestGodownId);
    const godownName = targetGodown ? targetGodown.name : bestGodownId;
    
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (maxCount >= 4) {
      confidence = 'high';
    } else if (maxCount > 1) {
      confidence = 'medium';
    }

    const reason = `Historically suggested: "${godownName}" (${maxCount} past inflow${maxCount > 1 ? 's' : ''}, totaling ${maxQty} units)`;
    return { godownId: bestGodownId, reason, confidence };
  };

  // Extract all unique months with CREDIT_NOTE documents
  const getMonthsList = () => {
    const list = new Set<string>();
    const currentYM = new Date().toISOString().slice(0, 7);
    list.add(currentYM);
    
    documents.forEach(doc => {
      if (doc.docType === 'CREDIT_NOTE' && doc.date) {
        const ym = doc.date.slice(0, 7);
        if (ym && ym.length === 7) {
          list.add(ym);
        }
      }
    });
    
    return Array.from(list).sort((a, b) => b.localeCompare(a));
  };

  const formatYearMonth = (ymStr: string) => {
    try {
      const [year, month] = ymStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (e) {
      return ymStr;
    }
  };

  const selectedMonthDocs = documents.filter(doc => {
    if (doc.docType !== 'CREDIT_NOTE') return false;
    return doc.date && doc.date.startsWith(selectedMonth);
  });

  const monthlyRevenueLoss = selectedMonthDocs.reduce((sum, doc) => sum + doc.grandTotal, 0);
  const monthlyRestockedValue = selectedMonthDocs.reduce((sum, doc) => sum + doc.subtotal, 0);
  const monthlyRestockedUnits = selectedMonthDocs.reduce((sum, doc) => {
    const itemsSum = doc.items ? doc.items.reduce((itemSum, item) => itemSum + item.qty, 0) : 0;
    return sum + itemsSum;
  }, 0);
  const creditNotesCount = selectedMonthDocs.length;

  const currentMonthString = new Date().toISOString().slice(0, 7);
  const currentMonthDocs = documents.filter(doc => {
    if (doc.docType !== 'CREDIT_NOTE') return false;
    return doc.date && doc.date.startsWith(currentMonthString);
  });

  const currentMonthRevenueLoss = currentMonthDocs.reduce((sum, doc) => sum + doc.grandTotal, 0);
  const currentMonthRestockedValue = currentMonthDocs.reduce((sum, doc) => sum + doc.subtotal, 0);
  const currentMonthRestockedUnits = currentMonthDocs.reduce((sum, doc) => {
    const itemsSum = doc.items ? doc.items.reduce((itemSum, item) => itemSum + item.qty, 0) : 0;
    return sum + itemsSum;
  }, 0);
  const currentMonthCreditNotesCount = currentMonthDocs.length;

  const currentMonthProductAggregation = React.useMemo(() => {
    const agg: { [name: string]: { qty: number; value: number; godowns: Set<string> } } = {};
    currentMonthDocs.forEach(doc => {
      if (doc.items) {
        doc.items.forEach(item => {
          if (!agg[item.name]) {
            agg[item.name] = { qty: 0, value: 0, godowns: new Set() };
          }
          agg[item.name].qty += item.qty;
          agg[item.name].value += item.qty * item.rate;
          if (item.toGodownId) {
            const gd = godowns.find(g => g.id === item.toGodownId);
            agg[item.name].godowns.add(gd ? gd.name : item.toGodownId);
          }
        });
      }
    });
    return Object.entries(agg).map(([name, data]) => ({
      name,
      qty: data.qty,
      value: data.value,
      godowns: Array.from(data.godowns).join(', ') || 'N/A'
    })).sort((a, b) => b.value - a.value);
  }, [currentMonthDocs, godowns]);

  const handleExportCSV = () => {
    try {
      const headers = [
        "Credit Note No.",
        "Date",
        "Referenced Invoice",
        "Client Name",
        "Client GST",
        "Subtotal (Asset Value)",
        "GST Offset",
        "Grand Total (Revenue Loss)",
        "Notes"
      ];

      const rows = selectedMonthDocs.map(doc => [
        doc.docNumber,
        doc.date,
        doc.linkedInvoiceNumber || 'N/A',
        `"${doc.clientName.replace(/"/g, '""')}"`,
        doc.clientGst || 'N/A',
        doc.subtotal.toFixed(2),
        doc.taxTotal.toFixed(2),
        doc.grandTotal.toFixed(2),
        `"${(doc.notes || '').replace(/"/g, '""')}"`
      ]);

      // Add summary rows at the bottom
      rows.push([]);
      rows.push(["Summary for " + formatYearMonth(selectedMonth)]);
      rows.push(["Total Credit Notes", creditNotesCount.toString()]);
      rows.push(["Total Restocked Inventory Asset Value", "INR " + monthlyRestockedValue.toFixed(2)]);
      rows.push(["Total Loss in Revenue", "INR " + monthlyRevenueLoss.toFixed(2)]);
      rows.push(["Total Returned Merchandise Units", monthlyRestockedUnits.toString() + " Units"]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Sales_Return_Report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Excel CSV Report for ${formatYearMonth(selectedMonth)} exported successfully.`, 'success');
    } catch (e: any) {
      showToast(`Export failed: ${e.message}`, 'error');
    }
  };

  const handleExportPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page width: 210mm, Height: 297mm
      pdf.setFont('helvetica', 'normal');

      // Draw header accent bar
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, 210, 15, 'F');

      // Title & Header info
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MONTHLY SALES RETURNS & REVENUE LOSS REPORT', 15, 9.5);

      // Period text
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`REPORT PERIOD: ${formatYearMonth(selectedMonth).toUpperCase()}`, 15, 24);

      // Metadata block
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 130, 24);
      pdf.text(`System Workspace: ERP Multi-Godown Stock Sync`, 130, 28);

      // Divider line
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.5);
      pdf.line(15, 32, 195, 32);

      // Key metrics panel
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.roundedRect(15, 37, 180, 45, 3, 3, 'F');
      pdf.setDrawColor(241, 245, 249); // slate-100
      pdf.roundedRect(15, 37, 180, 45, 3, 3, 'D');

      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXECUTIVE KEY METRICS SUMMARY', 20, 43);

      pdf.setLineWidth(0.25);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(20, 46, 190, 46);

      // Metric 1: Loss in Revenue
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('LOSS IN REVENUE (WITH TAX):', 22, 53);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(225, 29, 72); // rose-600
      pdf.text(`INR ${monthlyRevenueLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 22, 59);

      // Metric 2: Restocked Asset Value
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('RESTOCKED ASSET VALUE:', 78, 53);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(5, 150, 105); // emerald-600
      pdf.text(`INR ${monthlyRestockedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 78, 59);

      // Metric 3: Restocked Units
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('PHYSICAL MERCHANDISE RETURNED:', 135, 53);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(79, 70, 229); // indigo-600
      pdf.text(`${monthlyRestockedUnits} Units`, 135, 59);

      // Metric 4: Total Credit Notes
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('PROCESSED CREDIT NOTES COUNT:', 22, 69);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text(`${creditNotesCount} Documents`, 22, 75);

      // Metric 5: Average Return Ticket Value
      const avgTicket = creditNotesCount > 0 ? (monthlyRevenueLoss / creditNotesCount) : 0;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('AVG RETURN TICKET VALUE:', 78, 69);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text(`INR ${avgTicket.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 78, 75);

      // Metric 6: Tax Offset Recovered
      const taxOffset = monthlyRevenueLoss - monthlyRestockedValue;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('TAX (GST) OFFSETS CLAIMED:', 135, 69);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text(`INR ${taxOffset.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 135, 75);

      // Detailed credit notes ledger table
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DETAILED CREDIT NOTES (RETURNS) JOURNAL LEDGER', 15, 92);

      // Draw table headers
      const tableHeaders = [
        { label: 'CN Number', width: 25 },
        { label: 'Date', width: 22 },
        { label: 'Client / Debtor Name', width: 45 },
        { label: 'Invoice Ref', width: 25 },
        { label: 'Asset Value (Sub)', width: 30 },
        { label: 'Total Value (Grand)', width: 33 }
      ];

      let y = 97;
      pdf.setFillColor(241, 245, 249); // slate-100 header bg
      pdf.rect(15, y, 180, 8, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(15, y, 180, 8, 'D');

      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105); // slate-600

      let curX = 17;
      tableHeaders.forEach(h => {
        const isRightAlign = h.label.includes('Value') || h.label.includes('Total');
        if (isRightAlign) {
          pdf.text(h.label, curX + h.width - 4, y + 5.5, { align: 'right' });
        } else {
          pdf.text(h.label, curX, y + 5.5);
        }
        curX += h.width;
      });

      // Draw rows
      y += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);

      if (selectedMonthDocs.length === 0) {
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(148, 163, 184);
        pdf.text('No return documents or credit notes processed during this period.', 20, y + 6);
        pdf.line(15, y, 195, y);
        pdf.line(15, y + 10, 195, y + 10);
        y += 10;
      } else {
        selectedMonthDocs.forEach((doc, idx) => {
          if (y > 260) {
            pdf.addPage();
            y = 15;
            // Redraw small headers on new page
            pdf.setFillColor(241, 245, 249);
            pdf.rect(15, y, 180, 8, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.setTextColor(71, 85, 105);
            let txX = 17;
            tableHeaders.forEach(h => {
              const isRightAlign = h.label.includes('Value') || h.label.includes('Total');
              if (isRightAlign) {
                pdf.text(h.label, txX + h.width - 4, y + 5.5, { align: 'right' });
              } else {
                pdf.text(h.label, txX, y + 5.5);
              }
              txX += h.width;
            });
            y += 8;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(15, 23, 42);
          }

          if (idx % 2 === 1) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(15, y, 180, 7.5, 'F');
          }
          pdf.setDrawColor(241, 245, 249);
          pdf.line(15, y + 7.5, 195, y + 7.5);

          pdf.setFontSize(7.5);
          let rowX = 17;
          
          pdf.setFont('helvetica', 'bold');
          pdf.text(doc.docNumber || 'N/A', rowX, y + 5);
          rowX += 25;
          
          pdf.setFont('helvetica', 'normal');
          pdf.text(doc.date || 'N/A', rowX, y + 5);
          rowX += 22;

          let name = doc.clientName || 'N/A';
          if (name.length > 22) name = name.substring(0, 20) + '...';
          pdf.text(name, rowX, y + 5);
          rowX += 45;

          pdf.text(doc.linkedInvoiceNumber || 'N/A', rowX, y + 5);
          rowX += 25;

          pdf.setFont('courier', 'normal');
          pdf.text(`INR ${doc.subtotal.toFixed(2)}`, rowX + 30 - 4, y + 5, { align: 'right' });
          rowX += 30;

          pdf.setFont('courier', 'bold');
          pdf.text(`INR ${doc.grandTotal.toFixed(2)}`, rowX + 33 - 4, y + 5, { align: 'right' });

          y += 7.5;
        });
      }

      if (y > 240) {
        pdf.addPage();
        y = 15;
      }

      y += 15;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(15, y, 195, y);
      y += 8;

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text('This is an auto-compiled system audit report of the sales return credit journal.', 15, y);
      pdf.text('No manual edits have been made to these values. Double-entry ledgers have been locked.', 15, y + 3.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text('SYSTEM BOOKKEEPER AUDIT TRAIL', 145, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Status: COMPLIANT & LOCKED', 145, y + 3.5);

      pdf.save(`Sales_Return_Analytics_Report_${selectedMonth}.pdf`);
      showToast(`Professional PDF Summary Report for ${formatYearMonth(selectedMonth)} generated and downloaded successfully.`, 'success');
    } catch (e: any) {
      showToast(`PDF generation failed: ${e.message}`, 'error');
    }
  };

  const handleDownloadCreditNotePDF = (doc: BusinessDocument) => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Corporate Accent Bar
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, 210, 15, 'F');

      // Title & Header info
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BUSINESS TRANSACTION CREDIT NOTE', 15, 9.5);

      // Creditor Company Info (Stock & Ledger Inc.)
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('STOCK & LEDGER INC.', 15, 28);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500
      pdf.text('701, Antigravity Tech High Road, Navi Mumbai', 15, 33);
      pdf.text('Maharashtra, IN | Phone: +91 98765 43210', 15, 37);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('GSTIN: 27AASCE9904E1Z0', 15, 41);

      // Metadata box
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.roundedRect(130, 22, 65, 22, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.roundedRect(130, 22, 65, 22, 2, 2, 'D');

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`No: ${doc.docNumber}`, 134, 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Date: ${doc.date}`, 134, 33);
      pdf.text(`Ref Invoice: ${doc.linkedInvoiceNumber || 'N/A'}`, 134, 38);

      // Divider
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(15, 48, 195, 48);

      // Debtor/Client billing profile
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(79, 70, 229); // Indigo
      pdf.text('CREDITED TO CLIENT / CUSTOMER:', 15, 54);

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(doc.clientName, 15, 60);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(doc.clientAddress || 'No billing address specified.', 15, 65);
      pdf.text(`Phone: ${doc.clientMobile || 'N/A'} | Email: ${doc.clientEmail || 'N/A'}`, 15, 69);
      if (doc.clientGst) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Client GSTIN: ${doc.clientGst}`, 15, 73);
      }

      // Returned Items Table
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RETURNED MERCHANDISE ITEMIZATION', 15, 83);

      const itemHeaders = [
        { label: '#', width: 10 },
        { label: 'Item Name', width: 80 },
        { label: 'Returned Qty', width: 25 },
        { label: 'Rate (INR)', width: 20 },
        { label: 'Tax Rate (%)', width: 20 },
        { label: 'Line Total (INR)', width: 25 }
      ];

      let tableY = 87;
      pdf.setFillColor(241, 245, 249); // slate-100 header bg
      pdf.rect(15, tableY, 180, 7, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(15, tableY, 180, 7, 'D');

      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105); // slate-600

      let curX = 17;
      itemHeaders.forEach(h => {
        const isRightAlign = h.label.includes('Qty') || h.label.includes('Rate') || h.label.includes('Total');
        if (isRightAlign) {
          pdf.text(h.label, curX + h.width - 4, tableY + 4.5, { align: 'right' });
        } else {
          pdf.text(h.label, curX, tableY + 4.5);
        }
        curX += h.width;
      });

      tableY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);

      const items = doc.items || [];
      items.forEach((item, idx) => {
        if (idx % 2 === 1) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(15, tableY, 180, 7.5, 'F');
        }
        pdf.setDrawColor(241, 245, 249);
        pdf.line(15, tableY + 7.5, 195, tableY + 7.5);

        pdf.setFontSize(7.5);
        let rowX = 17;

        pdf.text((idx + 1).toString(), rowX, tableY + 5);
        rowX += 10;

        pdf.setFont('helvetica', 'bold');
        pdf.text(item.name || 'N/A', rowX, tableY + 5);
        rowX += 80;

        pdf.setFont('helvetica', 'normal');
        pdf.text(`${item.qty} Pcs`, rowX + 25 - 4, tableY + 5, { align: 'right' });
        rowX += 25;

        pdf.text(`₹${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rowX + 20 - 4, tableY + 5, { align: 'right' });
        rowX += 20;

        pdf.text(`${item.taxRate}%`, rowX + 20 - 4, tableY + 5, { align: 'right' });
        rowX += 20;

        pdf.setFont('helvetica', 'bold');
        pdf.text(`₹${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rowX + 25 - 4, tableY + 5, { align: 'right' });

        tableY += 7.5;
      });

      // Calculations Summary Block
      tableY += 5;
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.roundedRect(120, tableY, 75, 26, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(120, tableY, 75, 26, 2, 2, 'D');

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Untaxed Subtotal:', 124, tableY + 6);
      pdf.text('GST Output Offset:', 124, tableY + 12);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(`₹${doc.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 191, tableY + 6, { align: 'right' });
      pdf.text(`₹${doc.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 191, tableY + 12, { align: 'right' });

      pdf.setLineWidth(0.25);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(124, tableY + 16, 191, tableY + 16);

      pdf.setFontSize(9);
      pdf.setTextColor(225, 29, 72); // rose-600
      pdf.text('Grand Refund Total:', 124, tableY + 21);
      pdf.text(`₹${doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 191, tableY + 21, { align: 'right' });

      // Left notes block
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text('CREDIT NOTE NOTES:', 15, tableY + 6);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 116, 139);
      
      const notesText = doc.notes || "No special remarks specified.";
      const splitNotes = pdf.splitTextToSize(notesText, 95);
      pdf.text(splitNotes, 15, tableY + 11);

      // Bottom Signature Space
      tableY += 35;
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(148, 163, 184);
      pdf.line(15, tableY, 65, tableY);
      pdf.line(145, tableY, 195, tableY);

      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text('CUSTOMER SIGNATURE', 15, tableY + 4.5);
      pdf.text('AUTHORIZED SIGNATORY', 145, tableY + 4.5);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(148, 163, 184);
      pdf.text('Subject to verification on restock', 15, tableY + 8);
      pdf.text('STOCK & LEDGER INC.', 145, tableY + 8);

      pdf.save(`Credit_Note_${doc.docNumber}.pdf`);
      showToast(`Credit Note PDF for ${doc.docNumber} successfully downloaded.`, 'success');
    } catch (e: any) {
      showToast(`Credit Note PDF compilation failed: ${e.message}`, 'error');
    }
  };

  // Auto-fill from selected invoice
  const handleRecallInvoice = (num: string) => {
    const cleanNum = num.trim().toUpperCase();
    if (!cleanNum) {
      showToast('Please enter an invoice number to recall.', 'error');
      return;
    }

    const targetDoc = documents.find(d => 
      d.docNumber.trim().toUpperCase() === cleanNum && 
      (d.docType === 'INVOICE' || d.docType === 'RECEIPT')
    );

    if (!targetDoc) {
      showToast(`Invoice "${cleanNum}" not found in system database. Only itemized INVOICE/RECEIPT documents can be returned.`, 'error');
      setSelectedInvoice(null);
      setReturnItems([]);
      return;
    }

    setSelectedInvoice(targetDoc);
    const mappedItems = targetDoc.items.map(item => {
      const suggestion = getGodownSuggestion(item.name);
      return {
        id: item.id || `IT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: item.name,
        originalQty: item.qty,
        returnQty: item.qty, // default to return all, can be adjusted
        rate: item.rate,
        taxRate: item.taxRate || 18,
        selected: true, // default selected
        targetGodownId: suggestion.godownId,
        suggestedGodownId: suggestion.godownId,
        suggestionReason: suggestion.reason,
        suggestionConfidence: suggestion.confidence
      };
    });
    setReturnItems(mappedItems);
    setNotes(`Sales return credit note for original invoice ref: ${targetDoc.docNumber}`);
    showToast(`Recalled ${mappedItems.length} items from Invoice "${targetDoc.docNumber}". Adjust quantities for return.`, 'success');
  };

  // Toggle selection
  const handleToggleItem = (id: string) => {
    setReturnItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  // Adjust return quantity
  const handleQtyChange = (id: string, value: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === id) {
        // Quantities must be between 1 and original invoice quantity
        const safeQty = Math.max(1, Math.min(item.originalQty, value));
        return { ...item, returnQty: safeQty, selected: true };
      }
      return item;
    }));
  };

  // Adjust target godown
  const handleGodownChange = (id: string, value: string) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, targetGodownId: value };
      }
      return item;
    }));
  };

  // Calculate Returned totals
  const selectedItems = returnItems.filter(i => i.selected);
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.returnQty * item.rate), 0);
  const taxTotal = selectedItems.reduce((sum, item) => sum + (item.returnQty * item.rate * (item.taxRate / 100)), 0);
  const grandTotal = subtotal + taxTotal;

  // Clear / Reset all inputs and selected invoice to abort
  const handleClear = () => {
    setSelectedInvoice(null);
    setReturnItems([]);
    setInvoiceNumber('');
    setNotes('');
    showToast('Sales return workspace cleared successfully.', 'success');
  };

  // Process Credit Note Return
  const handleProcessReturn = async () => {
    if (!selectedInvoice) {
      showToast('Please load a valid invoice first.', 'error');
      return;
    }

    if (selectedItems.length === 0) {
      showToast('Please select at least one item to return.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        docType: 'CREDIT_NOTE',
        clientName: selectedInvoice.clientName,
        clientAddress: selectedInvoice.clientAddress || '',
        clientGst: selectedInvoice.clientGst || '',
        clientMobile: selectedInvoice.clientMobile || '',
        clientEmail: selectedInvoice.clientEmail || '',
        clientState: selectedInvoice.clientState || '',
        clientCountry: selectedInvoice.clientCountry || '',
        linkedInvoiceNumber: selectedInvoice.docNumber,
        date: new Date().toISOString().split('T')[0],
        items: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          qty: item.returnQty,
          rate: item.rate,
          taxRate: item.taxRate,
          total: item.returnQty * item.rate,
          toGodownId: item.targetGodownId
        })),
        subtotal,
        taxTotal,
        discount: 0,
        grandTotal,
        notes: notes.trim(),
        status: 'DRAFT'
      };

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to process return credit note.');
      }

      const createdCN = await response.json();
      showToast(`Sales return completed successfully! Credit Note ${createdCN.docNumber} created.`, 'success');
      
      // Reset State
      setSelectedInvoice(null);
      setReturnItems([]);
      setInvoiceNumber('');
      setNotes('');

      // Refresh data
      onRefreshData();
    } catch (err: any) {
      showToast(`Error processing return: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Banner Header */}
      <div className={`p-6 border rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
            <RotateCcw className="h-6 w-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase">
                Return Merchandising
              </span>
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Online Stock Sync</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1">
              Sales Return &amp; Credit Ledger Adjuster
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Input customer invoices to recall sold items, adjust returned merchandise, and process high-trust credit note adjustments instantly.
            </p>
          </div>
        </div>
        
        {/* Quick Help Box */}
        <div className="p-3 bg-indigo-500/5 dark:bg-indigo-950/20 rounded-xl border border-indigo-150 dark:border-indigo-900/40 text-[10px] text-indigo-755 dark:text-indigo-300 max-w-xs flex gap-2">
          <Info className="h-4 w-4 shrink-0 text-indigo-500" />
          <div>
            <span className="font-extrabold block uppercase">Inventory &amp; Ledger Automation</span>
            Processing return automatically restocks your Central Godown stock level and credits the customer outstanding balance.
          </div>
        </div>
      </div>

      {/* Monthly Sales Returns Analytics Dashboard */}
      <div className={`p-6 border rounded-2xl transition-all ${
        isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800 mb-5">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              Monthly Returns Analytics Dashboard
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Live system calculation of revenue impact, restocked inventory valuation, and processed double-entry ledger streams.
            </p>
          </div>
          
          {/* Month selector & Export Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">
                Selected Period:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`text-xs font-bold rounded-lg px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isLight ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              >
                {getMonthsList().map((ym) => (
                  <option key={ym} value={ym}>
                    {formatYearMonth(ym)} {ym === new Date().toISOString().slice(0, 7) ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportPDF}
                title="Download PDF Report"
                className={`px-3 py-2 text-xs font-extrabold uppercase rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-rose-500" />
                <span>PDF Report</span>
              </button>
              
              <button
                type="button"
                onClick={handleExportCSV}
                title="Export Excel CSV"
                className={`px-3 py-2 text-xs font-extrabold uppercase rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                <span>Excel CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Loss in Revenue */}
          <div className={`p-4 border rounded-xl flex flex-col justify-between space-y-3 transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                Loss in Revenue
              </span>
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase">
                Refunds
              </span>
            </div>
            <div>
              <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                ₹{monthlyRevenueLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1">
                Value of customer credit notes (inc. tax offsets) in {formatYearMonth(selectedMonth)}.
              </p>
            </div>
          </div>

          {/* Card 2: Restocked Inventory Value */}
          <div className={`p-4 border rounded-xl flex flex-col justify-between space-y-3 transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Restocked Asset Value
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">
                Assets
              </span>
            </div>
            <div>
              <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                ₹{monthlyRestockedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[9px] text-slate-455 dark:text-slate-500 mt-1">
                Total base taxable value of returned items put back into Central Godown stock.
              </p>
            </div>
          </div>

          {/* Card 3: Restocked Merchandise Units */}
          <div className={`p-4 border rounded-xl flex flex-col justify-between space-y-3 transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                Restocked Merchandise
              </span>
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase">
                Stock
              </span>
            </div>
            <div>
              <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {monthlyRestockedUnits} Units
              </span>
              <p className="text-[9px] text-slate-455 dark:text-slate-500 mt-1">
                Total physical items returned and added back to warehouse inventory levels.
              </p>
            </div>
          </div>

          {/* Card 4: Processed Returns Count */}
          <div className={`p-4 border rounded-xl flex flex-col justify-between space-y-3 transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                Processed Returns
              </span>
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase">
                Ledger
              </span>
            </div>
            <div>
              <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {creditNotesCount} Credit Notes
              </span>
              <p className="text-[9px] text-slate-455 dark:text-slate-500 mt-1">
                Returns transactions fully audited and posted to client credit ledgers.
              </p>
            </div>
          </div>

        </div>

        {/* Visual Analytics / Breakdown of the Current Calendar Month */}
        <div className="mt-6 pt-6 border-t border-slate-150 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Side: Financial Recovery Summary */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-wider">
                Financial Recovery Ratio ({formatYearMonth(currentMonthString)})
              </h4>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold font-mono uppercase">
                Live Auditing
              </span>
            </div>

            <div className={`p-4 rounded-xl border ${
              isLight ? 'bg-slate-100/30 border-slate-200' : 'bg-slate-950/40 border-slate-850'
            }`}>
              <div className="space-y-3.5">
                {/* Grand Total Refund / Revenue Loss */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mb-1">
                    <span>Gross Loss in Revenue (Refunding):</span>
                    <span className="font-mono text-rose-500 font-black">
                      ₹{currentMonthRevenueLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {/* Visual bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                {/* Taxable Subtotal / Inventory Asset Value */}
                <div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mb-1">
                    <span>Restocked Inventory Asset Value:</span>
                    <span className="font-mono text-emerald-500 font-black">
                      ₹{currentMonthRestockedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {/* Visual bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${currentMonthRevenueLoss > 0 ? Math.min(100, (currentMonthRestockedValue / currentMonthRevenueLoss) * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Recovered Ratio Indicator */}
                <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Value Recovery Rate</span>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Percentage of refunds recovered as physical inventory assets vs. tax offsets.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-emerald-500">
                      {currentMonthRevenueLoss > 0 
                        ? ((currentMonthRestockedValue / currentMonthRevenueLoss) * 100).toFixed(1) 
                        : '0.0'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Product Returns Frequency Table */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Most Returned Items &amp; Storage Locations ({formatYearMonth(currentMonthString)})
              </h4>
              <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
                {currentMonthProductAggregation.length} Unique Items
              </span>
            </div>

            <div className={`border rounded-xl overflow-hidden ${
              isLight ? 'border-slate-200 bg-white' : 'border-slate-850 bg-slate-950'
            }`}>
              <div className="max-h-[145px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[8.5px] uppercase font-bold text-slate-450 border-b select-none ${
                      isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-900 border-slate-850'
                    }`}>
                      <th className="px-3 py-2">Item Name</th>
                      <th className="px-3 py-2 text-center w-16">Qty</th>
                      <th className="px-3 py-2 text-right w-24">Asset Value</th>
                      <th className="px-3 py-2">Restock Warehouse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-sans text-[10px]">
                    {currentMonthProductAggregation.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                          No merchandise returns recorded in {formatYearMonth(currentMonthString)} yet.
                        </td>
                      </tr>
                    ) : (
                      currentMonthProductAggregation.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-350">
                          <td className="px-3 py-2 font-bold max-w-[150px] truncate">{item.name}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-rose-500">{item.qty} Pcs</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{item.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-medium truncate max-w-[120px]" title={item.godowns}>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-indigo-500" />
                              {item.godowns}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Search & Item Selection Controls */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Search Box Card */}
          <div className={`p-5 border rounded-xl shadow-xs transition-all ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className="text-xs font-black uppercase text-slate-850 dark:text-slate-150 mb-3 flex items-center gap-1.5">
              <Search className="h-4 w-4 text-indigo-500" />
              1. Search &amp; Recall Customer Invoice
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecallInvoice(invoiceNumber)}
                  className={`w-full text-xs font-mono font-bold rounded-lg p-3.5 pl-10 border focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                  placeholder="e.g. INV-2026-0001"
                />
                <span className="absolute left-3.5 top-3.5 text-slate-450 dark:text-slate-500 font-mono text-xs">#</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRecallInvoice(invoiceNumber)}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Recall Invoice
                </button>
                {(invoiceNumber || selectedInvoice) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Clear return selection"
                    className={`px-4 py-3.5 border rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                      isLight 
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick recent invoices list to click and recall quickly */}
            {documents.filter(d => d.docType === 'INVOICE').length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-2">
                  Recent Invoiced Bills in System:
                </span>
                <div className="flex flex-wrap gap-2">
                  {documents
                    .filter(d => d.docType === 'INVOICE')
                    .slice(0, 5)
                    .map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setInvoiceNumber(doc.docNumber);
                          handleRecallInvoice(doc.docNumber);
                        }}
                        className={`px-3 py-1.5 border text-[10px] font-mono rounded-md font-bold uppercase transition-all hover:border-indigo-400 cursor-pointer ${
                          selectedInvoice?.id === doc.id
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                            : 'bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {doc.docNumber} ({doc.clientName})
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Recalled Invoice Info & Return Items List */}
          {selectedInvoice ? (
            <div className={`p-5 border rounded-xl shadow-xs transition-all space-y-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              {/* Header metadata */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-650 dark:text-indigo-400">
                    Recalled Reference: {selectedInvoice.docNumber}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {selectedInvoice.clientName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="h-3.5 w-3.5" />
                      Invoice Date: {selectedInvoice.date}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Original Value</span>
                  <strong className="text-xs font-mono text-slate-800 dark:text-slate-200">
                    INR {selectedInvoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-black uppercase text-slate-850 dark:text-slate-150 mb-3 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-rose-500" />
                  2. Select Line Items and Quantities to Return
                </h3>
                
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-[10px] uppercase font-bold tracking-wider border-b ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        <th className="px-4 py-3 text-center w-12">Select</th>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3 text-right">Original Qty</th>
                        <th className="px-4 py-3 text-right">Return Qty</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">GST %</th>
                        <th className="px-4 py-3 min-w-[200px]">Restock Location (Auto-Suggestion)</th>
                        <th className="px-4 py-3 text-right">Returned Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {returnItems.map((item) => {
                        const lineTotal = item.returnQty * item.rate;
                        const lineTax = lineTotal * (item.taxRate / 100);
                        const lineGrand = lineTotal + lineTax;

                        return (
                          <tr 
                            key={item.id}
                            className={`text-xs transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-950/20 ${
                              item.selected 
                                ? 'bg-indigo-50/10 dark:bg-indigo-950/5' 
                                : 'opacity-60'
                            }`}
                          >
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(item.id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500 font-medium">
                              {item.originalQty}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-end gap-1">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* Decrement Button */}
                                  <button
                                    type="button"
                                    disabled={item.returnQty <= 1}
                                    onClick={() => handleQtyChange(item.id, item.returnQty - 1)}
                                    className={`p-1 border rounded transition-colors cursor-pointer select-none ${
                                      item.returnQty <= 1
                                        ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-400'
                                        : isLight
                                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                                    }`}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>

                                  {/* Core input */}
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.originalQty}
                                    value={item.returnQty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      handleQtyChange(item.id, isNaN(val) ? 1 : val);
                                    }}
                                    className={`w-14 p-1 border rounded text-center font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                                      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                                    } ${!item.selected ? 'opacity-55' : ''}`}
                                  />

                                  {/* Increment Button */}
                                  <button
                                    type="button"
                                    disabled={item.returnQty >= item.originalQty}
                                    onClick={() => handleQtyChange(item.id, item.returnQty + 1)}
                                    className={`p-1 border rounded transition-colors cursor-pointer select-none ${
                                      item.returnQty >= item.originalQty
                                        ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-400'
                                        : isLight
                                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                                    }`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>

                                {/* Return Proportion Badge */}
                                <div className="flex gap-1.5 mt-0.5">
                                  {item.selected ? (
                                    item.returnQty === item.originalQty ? (
                                      <span className="text-[9px] font-black uppercase text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.2 rounded scale-90 origin-right select-none">
                                        Full Return
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black uppercase text-amber-650 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.2 rounded scale-90 origin-right select-none">
                                        Partial ({item.returnQty}/{item.originalQty})
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[9px] font-medium uppercase text-slate-400 dark:text-slate-550 bg-slate-50 dark:bg-slate-950/30 px-1.5 py-0.2 rounded scale-90 origin-right select-none">
                                      Not Returning
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400 font-semibold">
                              ₹{item.rate.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500">
                              {item.taxRate}%
                            </td>
                            <td className="px-4 py-3">
                              {item.selected ? (
                                <div className="space-y-1 min-w-[180px]">
                                  <select
                                    value={item.targetGodownId}
                                    onChange={(e) => handleGodownChange(item.id, e.target.value)}
                                    className={`w-full text-xs font-bold rounded p-1.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                      isLight ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                                    }`}
                                  >
                                    {godowns.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.name}
                                      </option>
                                    ))}
                                  </select>
                                  
                                  {/* Suggestion explanation badge */}
                                  <div className="flex flex-col gap-0.5">
                                    <div className={`p-1 rounded text-[9px] font-medium flex items-start gap-1 ${
                                      item.suggestionConfidence === 'high' 
                                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-400' 
                                        : item.suggestionConfidence === 'medium'
                                        ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/25 dark:text-indigo-400'
                                        : 'bg-slate-50 text-slate-600 dark:bg-slate-950/25 dark:text-slate-400'
                                    }`}>
                                      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 mt-1 ${
                                        item.suggestionConfidence === 'high' ? 'bg-emerald-500' :
                                        item.suggestionConfidence === 'medium' ? 'bg-indigo-500' : 'bg-slate-400'
                                      }`} />
                                      <span className="leading-tight">{item.suggestionReason}</span>
                                    </div>
                                    {item.targetGodownId !== item.suggestedGodownId && (
                                      <button
                                        type="button"
                                        onClick={() => handleGodownChange(item.id, item.suggestedGodownId)}
                                        className="text-[9px] text-indigo-650 dark:text-indigo-400 hover:underline font-extrabold text-left uppercase tracking-wider mt-0.5"
                                      >
                                        [Reset to Recommended]
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-850 dark:text-slate-150">
                              {item.selected ? `₹${lineGrand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks/Notes */}
              <div className="pt-2">
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Credit Note Remarks / Reason for Return
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full text-xs rounded-lg p-2.5 border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                  placeholder="e.g. Damaged during shipment, Incorrect item size supplied, or customer feedback."
                />
              </div>

            </div>
          ) : (
            <div className={`p-8 border rounded-xl shadow-xs text-center space-y-3 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-400 mx-auto">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">No Invoice Loaded</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
                  Enter an invoice reference number above and click 'Recall Invoice' to review the original billed merchandise and begin returns adjustment.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Credit Note Calculation Summary & Processing Button */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Live Credit Calculation summary widget */}
          <div className={`p-5 border rounded-xl shadow-xs transition-all space-y-4 sticky top-6 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <h3 className="text-xs font-black uppercase text-slate-850 dark:text-slate-150 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-emerald-500" />
              3. Refund &amp; Credit Ledger Summary
            </h3>

            {/* Calculations block */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Selected Items count</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-250">{selectedItems.length} Products</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subtotal (Before Tax)</span>
                <span className="font-mono text-slate-800 dark:text-slate-250">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">GST Output Tax Offset</span>
                <span className="font-mono text-slate-800 dark:text-slate-250">₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-rose-500 font-extrabold uppercase block leading-none">Credit Note Value</span>
                  <span className="text-[8px] text-slate-400 uppercase font-semibold">Credited to customer ledger</span>
                </div>
                <strong className="text-lg font-mono text-rose-600 dark:text-rose-400">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Quick Ledger Insight */}
            {selectedInvoice && (
              <div className={`p-3 rounded-lg border text-[10px] leading-relaxed space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-150' : 'bg-slate-950 border-slate-850'
              }`}>
                <div className="flex items-center gap-1 text-slate-455 font-bold uppercase">
                  <Landmark className="h-3.5 w-3.5 text-indigo-500" />
                  Target Ledger Link
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  This transaction will automatically generate a <strong className="text-indigo-650 dark:text-indigo-400">Journal Adjustment Entry</strong>. 
                  It credits <strong className="font-semibold text-slate-700 dark:text-slate-300">"{selectedInvoice.clientName}"</strong>, reducing their outstanding debt balance by the Credit Note total of <strong className="font-mono">₹{grandTotal.toFixed(2)}</strong>.
                </p>
              </div>
            )}

            {/* Submit process return button */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isProcessing || !selectedInvoice || selectedItems.length === 0}
                onClick={handleProcessReturn}
                className={`w-full py-4 px-4 rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                  isProcessing || !selectedInvoice || selectedItems.length === 0
                    ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-lg hover:shadow-rose-500/10'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Compiling Ledgers...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    Process Return &amp; Credit Note
                  </>
                )}
              </button>

              {(selectedInvoice || invoiceNumber) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={`w-full py-3 px-4 rounded-xl font-extrabold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    isLight 
                      ? 'bg-white border-slate-250 text-slate-650 hover:bg-slate-50 hover:text-slate-900' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <RotateCcw className="h-4 w-4 text-slate-400" />
                  Cancel &amp; Clear Selection
                </button>
              )}
            </div>

            {/* Security Audit Path Footnote */}
            <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500 justify-center">
              <Database className="h-3.5 w-3.5 text-emerald-500" />
              Real-time audit log, double-entry posted.
            </div>

          </div>

        </div>

      </div>

      {/* 4. Monthly Processed Returns Ledger */}
      <div className={`p-5 border rounded-2xl shadow-xs transition-all ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-850 dark:text-slate-150 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-rose-500" />
              4. Monthly Processed Returns Ledger
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Review, inspect, or download formal credit notes issued for returned items during {formatYearMonth(selectedMonth)}.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-2.5 py-1 rounded-full uppercase">
            {selectedMonthDocs.length} Transactions
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className={`border-b text-[9px] uppercase font-bold tracking-tight text-slate-400 select-none ${
                isLight ? 'bg-slate-50 border-slate-150' : 'bg-slate-950 border-slate-800'
              }`}>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Credit Note No.</th>
                <th className="px-4 py-2.5">Ref Invoice</th>
                <th className="px-4 py-2.5">Client / Customer Name</th>
                <th className="px-4 py-2.5 text-right">Asset Value (Subtotal)</th>
                <th className="px-4 py-2.5 text-right">Refund Total (Grand)</th>
                <th className="px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-105 dark:divide-slate-800 font-mono text-[11px]">
              {selectedMonthDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs font-sans italic">
                    No return documents or credit notes processed during {formatYearMonth(selectedMonth)}. Recall an invoice above to process.
                  </td>
                </tr>
              ) : (
                selectedMonthDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300">
                    <td className="px-4 py-3">{doc.date}</td>
                    <td className="px-4 py-3 font-bold text-rose-600 dark:text-rose-400">{doc.docNumber}</td>
                    <td className="px-4 py-3 font-bold">{doc.linkedInvoiceNumber || '—'}</td>
                    <td className="px-4 py-3 font-sans font-bold pr-2 truncate max-w-[150px]">{doc.clientName}</td>
                    <td className="px-4 py-3 text-right">₹{doc.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      ₹{doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {onViewInDocumentHub && (
                          <button
                            type="button"
                            onClick={() => {
                              showToast(`Loading ${doc.docNumber} in Universal PDF Engine...`, 'success');
                              onViewInDocumentHub(doc);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 font-sans text-[10px] cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20"
                            title="Inspect in Universal PDF Engine"
                          >
                            <FileText className="h-3.5 w-3.5" /> Inspect PDF
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadCreditNotePDF(doc)}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 font-sans text-[10px] cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20"
                          title="Download Standalone PDF Note"
                        >
                          <FileText className="h-3.5 w-3.5" /> Standalone PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
