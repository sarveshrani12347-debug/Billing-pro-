export interface InvoiceLineItem {
  itemName: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 18 for 18%
  totalAmount: number;
}

export interface ParsedInvoice {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  date: string;
  lineItems: InvoiceLineItem[];
  imageUrl?: string; // Digital Audit Trail Source URL
  isConfirmed: boolean;
}

export interface Godown {
  id: string;
  name: string;
  location: string;
  capacity: number; // Max holding item quantites or volume
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  hsnCode: string;
  reorderLevel: number;
  unitCost: number;
  sellingPrice: number;
  description?: string;
  taxRate: number; // Auto mapped GST slab rate (e.g. 12, 18)
}

export type StockTransactionType = 'INFLOW' | 'OUTFLOW' | 'TRANSFER';

export interface StockTransaction {
  id: string;
  timestamp: string;
  itemId: string;
  itemName: string;
  sku: string;
  type: StockTransactionType;
  fromGodownId?: string | null;
  toGodownId?: string | null;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  operatorEmail: string;
  invoiceNumber?: string;
  invoiceUrl?: string; // Digital Audit Trail link
}

export type ChequeStatus = 'Pending' | 'Cleared' | 'Bounced';

export interface ChequeMetadata {
  chequeNumber: string;
  bankName: string;
  clearingDate: string;
  status: ChequeStatus;
}

export type PaymentType = 'INCOME' | 'EXPENSE';

export interface PaymentRecord {
  id: string;
  date: string;
  timestamp: string;
  type: PaymentType;
  cashAmount: number; // Column 1: Cash Account
  gpayAmount: number; // Column 2: GPay / UPI Account
  gpayUtr?: string;
  chequeAmount: number; // Column 3: Cheque Clearing Account
  chequeMeta?: ChequeMetadata;
  memo: string; // Column 4: Multi-ledger Reconciliation Memo (Markdown)
  category: string;
  invoiceUrl?: string; // Digital Audit trail mapping
  vendorName?: string;
  
  // Safe Financial Ledger Tracking Fields
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deleteReason?: string;
  isVoided?: boolean;
  isCancelled?: boolean;
  isReversal?: boolean;
  reversalOfId?: string;
  reversalId?: string;
  status?: string; // 'Active' | 'Deleted' | 'Reversed' | 'Cancelled' | 'Void' | 'Restored'
  auditLog?: Array<{
    action: string;
    user: string;
    timestamp: string;
    device?: string;
    details?: string;
  }>;
}

export interface DashboardStats {
  totalInflowValuation: number;
  totalOutflowValuation: number;
  netCashBalance: number;
  netGpayBalance: number;
  chequePendingAmount: number;
  chequeClearedAmount: number;
  chequeBouncedAmount: number;
  lowStockAlerts: {
    itemId: string;
    itemName: string;
    sku: string;
    currentStock: number;
    reorderLevel: number;
    godownName: string;
  }[];
  godownUtilizations: {
    godownId: string;
    godownName: string;
    capacity: number;
    currentStock: number;
    percentage: number;
  }[];
}

export interface BackupLog {
  id: string;
  timestamp: string;
  fileName: string;
  fileSize: string;
  bucketPath: string;
  status: 'Success' | 'Failed';
}

export interface User {
  email: string;
  name: string;
  role: string;
}

export type BusinessDocType = 'QUOTATION' | 'ESTIMATE' | 'INVOICE' | 'PURCHASE_ORDER' | 'DELIVERY_NOTE' | 'RECEIPT' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface BusinessDocItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  taxRate: number; // e.g. 18 for 18%
  total: number;
}

export interface DocumentRevision {
  id: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  subtotal: number;
  taxTotal: number;
  discount: number;
  grandTotal: number;
  items: BusinessDocItem[];
  clientName: string;
  docNumber: string;
  notes?: string;
  status: string;
}

export interface BusinessDocument {
  id: string;
  docType: BusinessDocType;
  docNumber: string;
  date: string;
  dueDate?: string; // or delivery target date
  clientName: string;
  clientAddress?: string;
  clientGst?: string;
  clientMobile?: string;
  clientEmail?: string;
  clientState?: string;
  clientCountry?: string;
  linkedInvoiceNumber?: string;
  items: BusinessDocItem[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  grandTotal: number;
  notes?: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'PAID' | 'DELIVERED';
  timestamp: string;
  attachmentUrl?: string;
  revisions?: DocumentRevision[];
}

export interface ERPLedger {
  id: string;
  name: string;
  type: 'VENDOR' | 'CUSTOMER' | 'EXPENSE' | 'SALES' | 'TAX' | 'ASSET' | 'CASH';
  balance: number;
  gstNumber?: string;
  pan?: string;
  address?: string;
  contact?: string;
  timestamp: string;
}

export interface ERPAuditLog {
  id: string;
  timestamp: string;
  transactionType: 'CREDIT_NOTE' | 'DEBIT_NOTE';
  docNumber: string;
  linkedInvoiceNumber: string;
  ledgerCreatedOrMatched: string;
  userName: string;
  debitAmount: number;
  creditAmount: number;
  gstImpact: number;
  notes?: string;
}

export interface StockNotification {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  timestamp: string;
  type: 'LOW_STOCK';
  alertMethods: {
    email: {
      sent: boolean;
      recipient: string;
      subject: string;
      body: string;
    };
    push: {
      sent: boolean;
      title: string;
      body: string;
    };
  };
  dismissed: boolean;
}

export const safeConfirm = (message: string): boolean => {
  try {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
  } catch (e) {
    console.warn("window.confirm is blocked or unavailable inside iframe context", e);
  }
  return true; // Fallback to allowing standard actions in test runners and sandboxes
};

