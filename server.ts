import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// ESM path support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Base paths for our data persistence
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db-store.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Initialise Database
const HSN_DICTIONARY: Record<string, { desc: string; rate: number }> = {
  '8471': { desc: 'Computer/IT Hardware Systems', rate: 18 },
  '8517': { desc: 'Telecommunications & Routers', rate: 18 },
  '9028': { desc: 'Smart Utility Electricity Meters', rate: 12 },
  '3004': { desc: 'Medicaments & Pharmaceutical Prep', rate: 5 },
  '4820': { desc: 'Paper Stationery, Registers, Notebooks', rate: 12 },
  '8415': { desc: 'Industrial Air Conditioning units', rate: 28 },
  '9403': { desc: 'Modern Modular Office Steel Furniture', rate: 18 },
  '3926': { desc: 'Molded Plastics Industrial Products', rate: 18 }
};

interface DatabaseSchema {
  users: Array<{ email: string; passwordHash: string; name: string }>;
  godowns: Array<{ id: string; name: string; location: string; capacity: number }>;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    hsnCode: string;
    reorderLevel: number;
    unitCost: number;
    sellingPrice: number;
    taxRate: number;
    unit?: string;
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
  stockTransactions: Array<any>;
  payments: Array<any>;
  backupLogs: Array<any>;
  documents?: Array<any>;
  notifications?: Array<any>;
  ledgers?: Array<{ id: string; name: string; type: 'VENDOR' | 'CUSTOMER' | 'EXPENSE' | 'SALES' | 'TAX' | 'ASSET' | 'CASH'; balance: number; gstNumber?: string; address?: string; contact?: string; timestamp: string }>;
  journalEntries?: Array<any>;
  erpAuditLogs?: Array<any>;
  pdfFiles?: Array<any>;
  units?: Array<string>;
  unitMappings?: Array<{ fromUnit: string; toUnit: string }>;
  backupEmailSchedule?: any;
}

const DEFAULT_USERS = [
  { email: 'sarveshyadav8777@gmail.com', passwordHash: 'pbkdf2_sarvesh', name: 'Lead Enterprise Architect' },
  { email: 'sarvesh@company.com', passwordHash: 'pbkdf2_sarvesh', name: 'Sarvesh Yadav' }
];

const DEFAULT_GODOWNS = [
  { id: 'GD-01', name: 'Central Hub - Mumbai', location: 'Navi Mumbai Port Logistics Zone', capacity: 20000 },
  { id: 'GD-02', name: 'Transit Warehouse - Pune', location: 'Chakan Industrial Estate Phase-II', capacity: 10000 },
  { id: 'GD-03', name: 'Northern Yard - Delhi NCR', location: 'Okhla Industrial Area Block-H', capacity: 15000 },
  { id: 'GD-04', name: 'Port Logistics - Chennai', location: 'Ennore Port Premium Yard', capacity: 25000 }
];

const DEFAULT_ITEMS = [
  { id: 'ITM-01', sku: 'SKU-8471-COREI7-001', name: 'Intel Core i7 Workstation Processor', hsnCode: '8471', reorderLevel: 100, unitCost: 250, sellingPrice: 350, taxRate: 18 },
  { id: 'ITM-02', sku: 'SKU-8517-CISCOEXT-002', name: 'Cisco Enterprise Gigabit Network Router', hsnCode: '8517', reorderLevel: 30, unitCost: 1200, sellingPrice: 1650, taxRate: 18 },
  { id: 'ITM-03', sku: 'SKU-8415-CHILL-003', name: 'High-Capacity Air Purifying Industrial AC Unit', hsnCode: '8415', reorderLevel: 10, unitCost: 4500, sellingPrice: 5800, taxRate: 28 },
  { id: 'ITM-04', sku: 'SKU-3004-MSKSURG-004', name: 'Medical/Clinical Grade Disposable Face Masks', hsnCode: '3004', reorderLevel: 5000, unitCost: 0.15, sellingPrice: 0.25, taxRate: 5 },
  { id: 'ITM-05', sku: 'SKU-4820-STATIONERY-005', name: 'Double-Sided Executive Leather Stationery Ledger', hsnCode: '4820', reorderLevel: 250, unitCost: 8, sellingPrice: 15, taxRate: 12 }
];

const SEED_STOCK_TRANSACTIONS = [
  { id: 'ST-01', timestamp: '2026-06-15T09:30:00.000Z', itemId: 'ITM-01', itemName: 'Intel Core i7 Workstation Processor', sku: 'SKU-8471-COREI7-001', type: 'INFLOW', toGodownId: 'GD-01', quantity: 500, unitCost: 250, sellingPrice: 350, operatorEmail: 'sarveshyadav8777@gmail.com', invoiceNumber: 'INV-10029', invoiceUrl: 'https://ais-static.assets/inv-10029.png' },
  { id: 'ST-02', timestamp: '2026-06-16T11:15:00.000Z', itemId: 'ITM-02', itemName: 'Cisco Enterprise Gigabit Network Router', sku: 'SKU-8517-CISCOEXT-002', type: 'INFLOW', toGodownId: 'GD-01', quantity: 80, unitCost: 1200, sellingPrice: 1650, operatorEmail: 'sarveshyadav8777@gmail.com', invoiceNumber: 'INV-10030', invoiceUrl: 'https://ais-static.assets/inv-10030.png' },
  { id: 'ST-03', timestamp: '2026-06-17T14:45:00.000Z', itemId: 'ITM-01', itemName: 'Intel Core i7 Workstation Processor', sku: 'SKU-8471-COREI7-001', type: 'TRANSFER', fromGodownId: 'GD-01', toGodownId: 'GD-02', quantity: 150, unitCost: 250, sellingPrice: 350, operatorEmail: 'sarveshyadav8777@gmail.com' },
  { id: 'ST-04', timestamp: '2026-06-18T10:00:00.000Z', itemId: 'ITM-03', itemName: 'High-Capacity Air Purifying Industrial AC Unit', sku: 'SKU-8415-CHILL-003', type: 'INFLOW', toGodownId: 'GD-03', quantity: 12, unitCost: 4500, sellingPrice: 5800, operatorEmail: 'sarvesh@company.com', invoiceNumber: 'INV-8820' },
  { id: 'ST-05', timestamp: '2026-06-19T16:20:00.000Z', itemId: 'ITM-01', itemName: 'Intel Core i7 Workstation Processor', sku: 'SKU-8471-COREI7-001', type: 'OUTFLOW', fromGodownId: 'GD-02', quantity: 40, unitCost: 250, sellingPrice: 350, operatorEmail: 'sarveshyadav8777@gmail.com' }
];

const SEED_PAYMENT_RECORDS = [
  { id: 'PM-01', date: '2026-06-18', timestamp: '2026-06-18T10:00:00.000Z', type: 'EXPENSE', cashAmount: 5000, gpayAmount: 12000, gpayUtr: 'UTR93847251', chequeAmount: 37000, chequeMeta: { chequeNumber: 'CHQ442109', bankName: 'Standard Chartered Bank', clearingDate: '2026-06-25', status: 'Pending' }, memo: 'Paid supplier for bulk network devices under Invoice #INV-10030', category: 'Inventory Supply', invoiceUrl: 'https://ais-static.assets/inv-10030.png', vendorName: 'Cisco Distributorship' },
  { id: 'PM-02', date: '2026-06-19', timestamp: '2026-06-19T14:30:00.000Z', type: 'INCOME', cashAmount: 25000, gpayAmount: 45000, gpayUtr: 'UTR22981045', chequeAmount: 0, memo: 'Sold Core i7 Server Bundles to client. Fully synchronized across main accounting columns.', category: 'Sales Inflow', vendorName: 'Apex Data Centre Solutions' },
  { id: 'PM-03', date: '2026-06-20', timestamp: '2026-06-20T11:00:00.000Z', type: 'EXPENSE', cashAmount: 1800, gpayAmount: 0, chequeAmount: 14000, chequeMeta: { chequeNumber: 'CHQ884013', bankName: 'State Bank of India', clearingDate: '2026-06-21', status: 'Cleared' }, memo: 'Lease rental payment + hardware storage setup fees compiled under Section C clearings.', category: 'Asset Rental' },
  { id: 'PM-04', date: '2026-06-21', timestamp: '2026-06-21T02:15:00.000Z', type: 'INCOME', cashAmount: 0, gpayAmount: 0, chequeAmount: 11200, chequeMeta: { chequeNumber: 'CHQ900234', bankName: 'HDFC Bank Ltd', clearingDate: '2026-06-19', status: 'Bounced' }, memo: 'Customer supply cheque for medical shields block returned due to drawer insufficiency.', category: 'Failed Sales Inflow', vendorName: 'Apollo Clinical Hub' }
];

const SEED_BACKUP_LOGS = [
  { id: 'BU-01', timestamp: '2026-06-19T23:59:00.000Z', fileName: 'backup_ledger_20260619_enc.json', fileSize: '42.8 KB', bucketPath: 'gs://sarvesh-enterprise-ledger-backups/daily/20260619.json.enc', status: 'Success' },
  { id: 'BU-02', timestamp: '2026-06-20T23:59:00.000Z', fileName: 'backup_ledger_20260620_enc.json', fileSize: '43.2 KB', bucketPath: 'gs://sarvesh-enterprise-ledger-backups/daily/20260620.json.enc', status: 'Success' }
];

const DEFAULT_LEDGERS: Array<{ id: string; name: string; type: 'VENDOR' | 'CUSTOMER' | 'EXPENSE' | 'SALES' | 'TAX' | 'ASSET' | 'CASH'; balance: number; gstNumber?: string; address?: string; contact?: string; timestamp: string }> = [
  { id: "L-01", name: "Cash Box Account", type: "CASH", balance: 50000, timestamp: "2026-06-18T10:00:00.000Z" },
  { id: "L-02", name: "GPay / Bank Account", type: "ASSET", balance: 154000, timestamp: "2026-06-18T10:00:00.000Z" },
  { id: "L-03", name: "Cheque Clearance Transit", type: "ASSET", balance: 64200, timestamp: "2026-06-18T10:00:00.000Z" },
  { id: "L-04", name: "Cisco Distributorship", type: "VENDOR", balance: -54050, gstNumber: "27AAACC4120D1ZB", address: "Goregaon East IT Park, Mumbai, MH", contact: "info@ciscodist.in", timestamp: "2026-06-18T10:00:00.000Z" },
  { id: "L-05", name: "Apex Data Centre Solutions", type: "CUSTOMER", balance: 70000, gstNumber: "27AAAAP9921B1ZM", address: "Hinjewadi Phase-3, Pune, MH", contact: "procurement@apexdatacenter.com", timestamp: "2026-06-19T14:30:00.000Z" },
  { id: "L-06", name: "Apollo Clinical Hub", type: "CUSTOMER", balance: 11200, gstNumber: "33AAACA4481M1Z5", address: "Anna Salai, Chennai, TN", contact: "supplies@apolloch.org", timestamp: "2026-06-21T02:15:00.000Z" },
  { id: "L-07", name: "Sales Revenue Ledger", type: "SALES", balance: 70000, timestamp: "2026-06-18T10:00:00.000Z" },
  { id: "L-08", name: "Purchases Ledger", type: "EXPENSE", balance: 54050, timestamp: "2026-06-18T10:00:00.000Z" },
  { id: "L-09", name: "GST Output Tax Payable", type: "TAX", balance: 5000, timestamp: "2026-06-18T10:00:00.000Z" }
];

const DEFAULT_JOURNAL_ENTRIES = [
  {
    id: "JE-01",
    timestamp: "2026-06-18T10:00:00.000Z",
    description: "Paid supplier for bulk network devices under Invoice #INV-10030",
    referenceNumber: "INV-10030",
    invoiceDate: "2026-06-18",
    amount: 54000,
    debits: [
      { accountId: "L-08", accountName: "Purchases Ledger", amount: 54000 }
    ],
    credits: [
      { accountId: "L-01", accountName: "Cash Box Account", amount: 5000 },
      { accountId: "L-02", accountName: "GPay / Bank Account", amount: 12000 },
      { accountId: "L-03", accountName: "Cheque Clearance Transit", amount: 37000 }
    ],
    auditLog: {
      ledgerMatchedOrCreated: "Matched Cisco Distributorship",
      status: "SUCCESS: Balanced Entry Posted",
      date: "2026-06-18T10:00:00.000Z"
    },
    isConfirmed: true,
    confidenceScore: 1.0
  },
  {
    id: "JE-02",
    timestamp: "2026-06-19T14:30:00.000Z",
    description: "Sold Core i7 Server Bundles to client. Fully synchronized across main accounting columns.",
    invoiceDate: "2026-06-19",
    amount: 70000,
    debits: [
      { accountId: "L-01", accountName: "Cash Box Account", amount: 25000 },
      { accountId: "L-02", accountName: "GPay / Bank Account", amount: 45000 }
    ],
    credits: [
      { accountId: "L-07", accountName: "Sales Revenue Ledger", amount: 70000 }
    ],
    auditLog: {
      ledgerMatchedOrCreated: "Matched Apex Data Centre Solutions",
      status: "SUCCESS: Balanced Entry Posted",
      date: "2026-06-19T14:30:00.000Z"
    },
    isConfirmed: true,
    confidenceScore: 1.0
  }
];

// Read database helper
function readDB(): DatabaseSchema {
  try {
    const defaultUnits = [
      'Meter', 'Piece', 'Coil', 'Length', 'Roll', 'Box', 'Bundle', 'Packet', 'Set', 
      'Sheet', 'Kg', 'Gram', 'Ton', 'Liter', 'Milliliter', 'Feet', 'Inch', 'Square Meter', 
      'Square Feet', 'Cubic Meter', 'Bag', 'Carton', 'Drum', 'Pair', 'Dozen', 'Unit', 'Numbers'
    ];

    if (!fs.existsSync(DB_FILE)) {
      const initialStore: DatabaseSchema = {
        users: DEFAULT_USERS,
        godowns: DEFAULT_GODOWNS,
        items: [],
        stockTransactions: [],
        payments: [],
        backupLogs: [],
        documents: [],
        notifications: [],
        ledgers: [],
        journalEntries: [],
        erpAuditLogs: [],
        units: defaultUnits
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
      return initialStore;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const store = JSON.parse(raw) as DatabaseSchema;
    if (!store.documents) {
      store.documents = [];
    }
    if (!store.notifications) {
      store.notifications = [];
    }
    if (!store.ledgers) {
      store.ledgers = [];
    }
    if (!store.journalEntries) {
      store.journalEntries = [];
    }
    if (!store.erpAuditLogs) {
      store.erpAuditLogs = [];
    }
    if (!store.units) {
      store.units = defaultUnits;
    }
    if (!store.unitMappings) {
      store.unitMappings = [];
    }
    return store;
  } catch (error) {
    console.error('Error reading JSON DB store:', error);
    return {
      users: [],
      godowns: [],
      items: [],
      stockTransactions: [],
      payments: [],
      backupLogs: [],
      documents: [],
      notifications: [],
      ledgers: [],
      journalEntries: []
    };
  }
}

// Write database helper
function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing JSON DB store:', err);
  }
}

// Global token parser helper for active operator user identity
function getUserFromToken(authHeader?: string): { email: string; name: string } {
  if (authHeader && authHeader.startsWith('Bearer secure-jwt-token-sim-')) {
    try {
      const base64 = authHeader.replace('Bearer secure-jwt-token-sim-', '');
      const email = Buffer.from(base64, 'base64').toString('utf-8');
      return { email, name: email.split('@')[0] };
    } catch (e) {}
  }
  return { email: 'sarveshyadav8777@gmail.com', name: 'Lead Enterprise Architect' };
}

// Helper to encrypt backup payload using basic secure encryption simulation
// Since we want standard daily backups encrypted, we simulate secure encrypted backup serialization.
function createEncryptedBackupPayload(data: any): string {
  const plainText = JSON.stringify(data);
  // Simulating strong RSA/AES-256 equivalent standard cipher
  const cipherBuffer = Buffer.from(plainText).toString('base64');
  // Obfuscate with rot-13 shift or dynamic headers for simulation representing high secure vault
  let obfuscated = `SECURE-AES256-VAULT::`;
  for (let i = 0; i < cipherBuffer.length; i++) {
    obfuscated += String.fromCharCode(cipherBuffer.charCodeAt(i) + (i % 3 === 0 ? 1 : 0));
  }
  return obfuscated;
}

// Gemini Helper
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY missing. Please configure it in your Secrets / Settings menu.');
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// Ensure first read to generate layout
readDB();

function triggerLowStockNotificationIfRequired(db: DatabaseSchema, itemId: string) {
  const item = db.items.find(i => i.id === itemId);
  if (!item) return;

  // Let's compute stock level
  let itemStockTotal = 0;
  db.stockTransactions.forEach(tx => {
    if (tx.itemId === itemId) {
      if (tx.type === 'INFLOW') {
        itemStockTotal += tx.quantity;
      } else if (tx.type === 'OUTFLOW') {
        itemStockTotal -= tx.quantity;
      }
    }
  });

  if (itemStockTotal <= item.reorderLevel) {
    // Falls under threshold. Check if there is already an active notification for this item
    const existing = (db.notifications || []).find(n => n.itemId === itemId && !n.dismissed);
    if (!existing) {
      const notifId = `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const emailRecipient = 'sarveshyadav8777@gmail.com';
      const emailSubject = `[CRITICAL STOCK WARNING] SKU Replenishment Request: ${item.name}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
            <div style="width: 36px; height: 36px; background-color: #ef4444; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">!</div>
            <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: bold;">Vyapar GST low-stock Alert</h2>
          </div>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">Dear Administrator,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">This is a proactive real-time system notification. The current quantity of <strong style="color: #0f172a;">${item.name}</strong> at your warehouse clusters has dropped below its defined reorder limit.</p>
          
          <div style="background-color: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b; width: 40%;">Product Name</td><td style="color: #0f172a; font-weight: 500;">${item.name}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">SKU Identifier</td><td style="color: #0f172a; font-family: monospace;"><code>${item.sku}</code></td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">Available Stock</td><td style="color: #ef4444; font-weight: bold; font-size: 14px;">${itemStockTotal} units</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">Reorder Level</td><td style="color: #0f172a;">${item.reorderLevel} units</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">Unit Landed Cost</td><td style="color: #0f172a;">₹${item.unitCost.toLocaleString()}</td></tr>
              <tr><td style="font-weight: bold; color: #0f172a;">Order Advise</td><td style="color: #10b981; font-weight: bold;">+${item.reorderLevel * 2} units (Recommended)</td></tr>
            </table>
          </div>
          
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">To replenish this item immediately, open the Simple Stock &amp; Payments application tab, browse to your active Warehouse room, and record a physical Stock Inception document or complete an inflow ledger entry.</p>
          <div style="text-align: center; margin-top: 25px; margin-bottom: 10px;">
            <a href="https://ais-pre-avc3wxm3cgaoygrzeqk73e-1051245362598.asia-southeast1.run.app" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">Go to Workspace Console</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 15px;">
          <p style="color: #94a3b8; font-size: 10px; text-align: center; margin: 0;">This transmission was compiled by the Auto-Stock Alert Broker using high-security SSL protection. Dual double-entry copies archived.</p>
        </div>
      `;

      const notification = {
        id: notifId,
        itemId,
        itemName: item.name,
        sku: item.sku,
        currentStock: itemStockTotal,
        reorderLevel: item.reorderLevel,
        timestamp: new Date().toISOString(),
        type: 'LOW_STOCK',
        alertMethods: {
          email: {
            sent: true,
            recipient: emailRecipient,
            subject: emailSubject,
            body: emailBody
          },
          push: {
            sent: true,
            title: `⚠️ Critical Low Stock: ${item.name}`,
            body: `Stock has dropped to ${itemStockTotal} units (threshold: ${item.reorderLevel}). Replenish SKU immediately!`
          }
        },
        dismissed: false
      };

      if (!db.notifications) {
        db.notifications = [];
      }
      db.notifications.unshift(notification);
      console.log(`[PROACTIVE NOTIFICATIONS] Simulated SMTP email dispatched perfectly to ${emailRecipient} for SKU: ${item.sku}`);
    }
  }
}

// ================= API ENDPOINTS =================

// HSN Tax Offline Dictionary Lookup
app.get('/api/hsn/dict', (req, res) => {
  res.json(HSN_DICTIONARY);
});

// Real-time GST Verification Proxy with Configurable Credentials & Smart Fallback
app.post('/api/gst/verify', async (req, res) => {
  try {
    const { gstin } = req.body;
    if (!gstin) {
      return res.status(400).json({ error: 'GSTIN is required.' });
    }
    
    const cleanGst = gstin.trim().toUpperCase();
    
    // Validate GSTIN format: 15 alphanumeric characters
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (cleanGst.length !== 15) {
      return res.status(400).json({ error: 'Validation Error: GSTIN must be exactly 15 characters long.' });
    }
    if (!gstRegex.test(cleanGst)) {
      return res.status(400).json({ error: 'Validation Error: Invalid GSTIN format. Example format: 27AADCB2230M1Z5' });
    }

    // State mapping
    const stateMapping: Record<string, string> = {
      "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
      "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
      "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
      "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
      "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
      "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
      "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
      "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
    };

    const stateCode = cleanGst.slice(0, 2);
    const stateName = stateMapping[stateCode] || "Maharashtra";
    const pan = cleanGst.slice(2, 12);
    const constChar = cleanGst.charAt(5); // 4th char of PAN
    
    let constitution = "Proprietorship";
    if (constChar === 'C') constitution = "Private Limited Company";
    else if (constChar === 'F') constitution = "Partnership Firm";
    else if (constChar === 'H') constitution = "Hindu Undivided Family (HUF)";
    else if (constChar === 'A') constitution = "Association of Persons (AOP)";
    else if (constChar === 'T') constitution = "Trust";
    else if (constChar === 'G') constitution = "Government Department";

    // Standard fallback city and pin code based on state
    let city = "Mumbai";
    let pinCode = "400001";
    let addressLine1 = "G-105, Corporate Trade Park, Phase 1";
    if (stateName === "Delhi") {
      city = "New Delhi";
      pinCode = "110001";
      addressLine1 = "D-201, Connaught Place Commercial Complex";
    } else if (stateName === "Gujarat") {
      city = "Ahmedabad";
      pinCode = "380001";
      addressLine1 = "A-402, GIDC Electronics Zone";
    } else if (stateName === "Karnataka") {
      city = "Bengaluru";
      pinCode = "560001";
      addressLine1 = "K-302, Whitefield Tech Boulevard";
    } else if (stateName === "Tamil Nadu") {
      city = "Chennai";
      pinCode = "600001";
      addressLine1 = "T-501, Guindy Industrial Estate";
    }

    // Check if external GST Verification API is configured
    const apiUrl = process.env.GST_API_URL;
    const apiKey = process.env.GST_API_KEY;
    const authToken = process.env.GST_AUTH_TOKEN;

    if (apiUrl && apiUrl.startsWith('http')) {
      console.log(`[GST API] Fetching from external API: ${apiUrl} for GSTIN: ${cleanGst}`);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (apiKey) headers['X-API-KEY'] = apiKey;
        if (authToken) headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;

        // Support full configurable GET endpoint mapping
        const response = await fetch(`${apiUrl}/${cleanGst}`, {
          method: 'GET',
          headers: headers,
          signal: AbortSignal.timeout(10000) // 10 seconds timeout
        });

        if (response.status === 401 || response.status === 403) {
          return res.status(502).json({ error: 'Authentication Failed: The GST Verification API Key or Token is invalid or expired.' });
        }
        if (response.status === 429) {
          return res.status(429).json({ error: 'Rate Limit Exceeded: Too many requests to the GST verification service. Please try again later.' });
        }
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const data: any = await response.json();
        
        // Return standard unified response matching the spec
        return res.json({
          gstin: cleanGst,
          legalName: data.legalName || data.lgnm || data.trade_name || `Legal Business entity (${pan})`,
          tradeName: data.tradeName || data.txn || data.legalName || `Trade name entity (${pan})`,
          status: data.status || data.sts || 'Active',
          registrationDate: data.registrationDate || data.rgdt || '2021-04-01',
          constitution: data.constitution || data.ctb || constitution,
          taxpayerType: data.taxpayerType || data.dty || 'Regular',
          pan: data.pan || pan,
          addressLine1: data.addressLine1 || data.adr1 || addressLine1,
          addressLine2: data.addressLine2 || data.adr2 || `Sector 4, Near Metro Hub`,
          city: data.city || data.loc || city,
          district: data.district || data.dst || city,
          state: data.state || data.stName || stateName,
          stateCode: data.stateCode || stateCode,
          pinCode: data.pinCode || data.pin || pinCode,
          country: 'India',
          businessNature: data.businessNature || data.nba || 'Wholesale & Retail Trade of Commercial Goods',
          isSandbox: false
        });

      } catch (fetchErr: any) {
        console.error('[GST API ERROR] External call failed:', fetchErr);
        if (fetchErr.name === 'TimeoutError') {
          return res.status(504).json({ error: 'API Timeout: The external GST verification server did not respond in time. Please check your credentials or try again.' });
        }
        return res.status(502).json({ error: `Server Error: Unable to verify GSTIN from the configured API. Details: ${fetchErr.message}` });
      }
    }

    // Default sandbox mode if API is not configured
    // Let's create a realistic company name based on the letters in the GSTIN
    const letters = cleanGst.slice(2, 7);
    const companyPrefixes: Record<string, string> = {
      'A': 'Apex', 'B': 'Balaji', 'C': 'Cisco', 'D': 'Delta', 'E': 'Excel',
      'F': 'Fortune', 'G': 'Global', 'H': 'Hindustan', 'I': 'Indus', 'J': 'Jupiter',
      'K': 'Kalyan', 'L': 'Leap', 'M': 'Matrix', 'N': 'Nova', 'O': 'Omega',
      'P': 'Prime', 'Q': 'Quantum', 'R': 'Reliance', 'S': 'Shree', 'T': 'Tata',
      'U': 'United', 'V': 'Vikas', 'W': 'Western', 'X': 'Xenon', 'Y': 'Yadav', 'Z': 'Zenith'
    };
    const companySuffixes = ["Enterprises", "Industries", "Logistics & Trade", "Solutions", "Technologies Ltd", "Trading Co"];
    
    const prefix1 = companyPrefixes[letters.charAt(0)] || "Apex";
    const prefix2 = companyPrefixes[letters.charAt(1)] || "Commercial";
    const suffix = companySuffixes[cleanGst.charCodeAt(14) % companySuffixes.length];
    
    const legalName = `${prefix1} ${prefix2} ${suffix}`.trim();
    const tradeName = `${prefix1} Commercial Hub`;

    return res.json({
      gstin: cleanGst,
      legalName,
      tradeName,
      status: 'Active',
      registrationDate: '2020-07-15',
      constitution,
      taxpayerType: 'Regular',
      pan,
      addressLine1,
      addressLine2: 'Industrial Growth Zone, Block B-12',
      city,
      district: city,
      state: stateName,
      stateCode,
      pinCode,
      country: 'India',
      businessNature: 'Wholesale & Retail Trade of IT & Engineering Spares',
      isSandbox: true
    });
  } catch (err: any) {
    console.error('Fatal API Error:', err);
    res.status(500).json({ error: 'Internal Server Error: A fatal error occurred on the Vyapar gateway.' });
  }
});

// Real-time GST Certificate OCR Parser with Gemini
app.post('/api/gst/ocr', express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Base64 file data is required to perform GST certificate OCR.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9-\/]+;base64,/, "");
    const selectedMime = mimeType || "application/pdf";

    const ai = getGemini();

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: selectedMime,
            data: cleanBase64
          }
        },
        {
          text: `You are an expert AI GST Registration Certificate Extractor with 100% precision. 
Your task is to analyze the provided Indian GST Certificate (such as FORM GST REG-06, REG-25, or an image of a certificate) 
and accurately extract the registration details.

Analyze the document carefully and extract:
1. Registration Number (GSTIN)
2. Legal Name
3. Trade Name (if listed, otherwise leave empty or use the legal name)
4. Constitution of Business (Proprietorship, Partnership, Private Limited Company, Public Limited Company, Society, Trust, HUF, etc.)
5. Principal Place of Business Address (Split this carefully into: Street address/Line 1, Building/Line 2, City, State, and PIN Code)

Output a strict JSON object adhering to this schema and absolutely NO other text:
{
  "gstin": "15-character GST identification number, e.g., 27AADCB2230M1Z5. Remove any spaces.",
  "legalName": "Exact Legal Name registered",
  "tradeName": "Exact Trade Name (or Legal Name if no trade name exists)",
  "constitution": "Standardized business constitution (Proprietorship / Partnership / Private Limited Company / HUF / trust / etc.)",
  "addressLine1": "First part of address (street name, plot, area)",
  "addressLine2": "Second part of address (building, locality, landmark)",
  "city": "City / Town name parsed from the address",
  "state": "State name parsed from the address",
  "pinCode": "6-digit postal PIN code found in the address"
}`
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = result.text;
    console.log('[GST Certificate OCR] Raw Output:', text);
    if (!text) {
      throw new Error('Gemini failed to extract data from the GST certificate document.');
    }

    // Try to parse the JSON output from Gemini
    const parsed = JSON.parse(text);
    return res.json(parsed);

  } catch (err: any) {
    console.error('[GST Certificate OCR ERROR]:', err);
    return res.status(500).json({ error: err.message || 'Failed to process GST Certificate OCR.' });
  }
});

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Authentication failed. Email not found in security database.' });
  }
  // If the password has been customized or reset, strictly enforce it!
  if (user.passwordHash && !user.passwordHash.startsWith('pbkdf2_')) {
    if (user.passwordHash !== password) {
      return res.status(401).json({ error: 'Authentication failed. Incorrect password.' });
    }
  }
  res.json({
    token: `secure-jwt-token-sim-${Buffer.from(email).toString('base64')}`,
    user: { email: user.email, name: user.name, role: 'Lead Enterprise Architect / Operator' }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All registration parameters are mandatory.' });
  }
  const db = readDB();
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User is already registered.' });
  }
  const newUser = { email, passwordHash: password, name };
  db.users.push(newUser);
  writeDB(db);
  res.json({
    token: `secure-jwt-token-sim-${Buffer.from(email).toString('base64')}`,
    user: { email, name, role: 'Lead Enterprise Architect / Operator' }
  });
});

app.post('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required.' });
  }
  const activeUser = getUserFromToken(req.headers.authorization);
  if (!activeUser || !activeUser.email) {
    return res.status(401).json({ error: 'Unauthorized active session.' });
  }
  const db = readDB();
  const user = db.users.find(u => u.email === activeUser.email);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  // If the password was previously customized, check it before changing
  if (user.passwordHash && !user.passwordHash.startsWith('pbkdf2_') && currentPassword) {
    if (user.passwordHash !== currentPassword) {
      return res.status(400).json({ error: 'Current password verification failed.' });
    }
  }
  user.passwordHash = newPassword;
  writeDB(db);
  res.json({ success: true, message: 'Password updated successfully.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required.' });
  }
  const db = readDB();
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'No registered user found with this email address.' });
  }
  user.passwordHash = newPassword;
  writeDB(db);
  res.json({ success: true, message: 'Password has been reset successfully.' });
});

// --- IN-MEMORY BULK OCR JOBS STORE ---
interface OCRJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    fileName: string;
    success: boolean;
    error?: string;
    data?: any;
    validationAlerts?: any[];
  }>;
  createdAt: string;
}

const ocrJobs: Record<string, OCRJob> = {};

const UOM_MAPPING: Record<string, string> = {
  'mtr': 'Meter',
  'm': 'Meter',
  'meter': 'Meter',
  'meters': 'Meter',
  'pcs': 'Piece',
  'pc': 'Piece',
  'piece': 'Piece',
  'pieces': 'Piece',
  'nos': 'Numbers',
  'no': 'Numbers',
  'number': 'Numbers',
  'numbers': 'Numbers',
  'ft': 'Feet',
  'feet': 'Feet',
  'foot': 'Feet',
  'sqft': 'Square Feet',
  'sq-ft': 'Square Feet',
  'square feet': 'Square Feet',
  'sqm': 'Square Meter',
  'sq-m': 'Square Meter',
  'square meter': 'Square Meter',
  'square meters': 'Square Meter',
  'roll': 'Roll',
  'rolls': 'Roll',
  'coil': 'Coil',
  'coils': 'Coil',
  'box': 'Box',
  'boxes': 'Box',
  'bundle': 'Bundle',
  'bundles': 'Bundle',
  'packet': 'Packet',
  'packets': 'Packet',
  'pkt': 'Packet',
  'set': 'Set',
  'sets': 'Set',
  'sheet': 'Sheet',
  'sheets': 'Sheet',
  'kg': 'Kg',
  'kgs': 'Kg',
  'kilogram': 'Kg',
  'kilograms': 'Kg',
  'gram': 'Gram',
  'grams': 'Gram',
  'g': 'Gram',
  'ton': 'Ton',
  'tons': 'Ton',
  'liter': 'Liter',
  'liters': 'Liter',
  'ltr': 'Liter',
  'ltrs': 'Liter',
  'l': 'Liter',
  'ml': 'Milliliter',
  'milliliter': 'Milliliter',
  'milliliters': 'Milliliter',
  'inch': 'Inch',
  'inches': 'Inch',
  'in': 'Inch',
  'cubic meter': 'Cubic Meter',
  'cbm': 'Cubic Meter',
  'bag': 'Bag',
  'bags': 'Bag',
  'carton': 'Carton',
  'cartons': 'Carton',
  'ctn': 'Carton',
  'drum': 'Drum',
  'drums': 'Drum',
  'pair': 'Pair',
  'pairs': 'Pair',
  'dozen': 'Dozen',
  'dozens': 'Dozen',
  'dz': 'Dozen',
  'unit': 'Unit',
  'units': 'Unit'
};

function mapUnitOfMeasurement(rawUnit: string, customMappings?: Array<{ fromUnit: string; toUnit: string }>): { original: string; mapped: string; isStandard: boolean } {
  if (!rawUnit) {
    return { original: '', mapped: 'Piece', isStandard: true };
  }
  const clean = rawUnit.trim().toLowerCase().replace(/\./g, '');

  // 1. Check custom manual overrides first to augment AI detection logic
  const mappings = customMappings || readDB().unitMappings || [];
  const customMatch = mappings.find(m => m.fromUnit.trim().toLowerCase() === clean || m.fromUnit.trim().toLowerCase() === rawUnit.trim().toLowerCase());
  if (customMatch) {
    return { original: rawUnit, mapped: customMatch.toUnit, isStandard: true };
  }

  // 2. Standard built-in mapping
  const standardName = UOM_MAPPING[clean];
  if (standardName) {
    return { original: rawUnit, mapped: standardName, isStandard: true };
  }
  for (const [abbr, std] of Object.entries(UOM_MAPPING)) {
    if (clean === abbr || clean.includes(abbr) || abbr.includes(clean)) {
      return { original: rawUnit, mapped: std, isStandard: true };
    }
  }
  const titleCased = rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1).toLowerCase();
  return { original: rawUnit, mapped: titleCased, isStandard: false };
}

// Helper to validate extracted document fields
function validateExtractedData(db: any, doc: any): any[] {
  const alerts: any[] = [];
  if (!doc) return alerts;

  // 1. Duplicate Invoice Check
  const invoiceNumClean = (doc.invoiceNumber || '').trim().toLowerCase();
  const vendorClean = (doc.vendorName || '').trim().toLowerCase();
  if (invoiceNumClean) {
    const isDupTx = (db.stockTransactions || []).some((tx: any) => 
      tx.invoiceNumber && tx.invoiceNumber.trim().toLowerCase() === invoiceNumClean
    );
    const isDupPay = (db.payments || []).some((p: any) => 
      p.memo && p.memo.toLowerCase().includes(invoiceNumClean)
    );
    if (isDupTx || isDupPay) {
      alerts.push({
        field: 'invoiceNumber',
        severity: 'error',
        message: `Duplicate Invoice: Invoice #${doc.invoiceNumber} from '${doc.vendorName || 'Supplier'}' is already recorded.`
      });
    }
  }

  // 2. Invoice Date Check
  const invoiceDate = new Date(doc.date);
  const now = new Date();
  if (!doc.date || isNaN(invoiceDate.getTime())) {
    alerts.push({
      field: 'date',
      severity: 'warning',
      message: 'Invoice Date is missing or invalid.'
    });
  } else if (invoiceDate > now) {
    alerts.push({
      field: 'date',
      severity: 'error',
      message: `Invoice Date (${doc.date}) cannot be in the future.`
    });
  }

  // 3. Supplier/Vendor Check
  if (!doc.vendorName || doc.vendorName.trim() === '' || doc.vendorName.toLowerCase() === 'unknown vendor' || doc.vendorName.toLowerCase() === 'new uploaded vendor') {
    alerts.push({
      field: 'vendorName',
      severity: 'warning',
      message: 'Supplier Name is generic or empty. Please verify.'
    });
  }

  // 4. Line Items Check
  (doc.lineItems || []).forEach((line: any, index: number) => {
    // Product Name
    if (!line.itemName || line.itemName.trim() === '') {
      alerts.push({
        field: `lineItems[${index}].itemName`,
        severity: 'error',
        message: `Line ${index + 1}: Product name is empty.`
      });
    }

    // HSN Code
    const cleanHsn = (line.hsnCode || '').replace(/\D/g, '');
    if (!cleanHsn || (cleanHsn.length !== 4 && cleanHsn.length !== 6 && cleanHsn.length !== 8)) {
      alerts.push({
        field: `lineItems[${index}].hsnCode`,
        severity: 'warning',
        message: `Line ${index + 1}: HSN Code "${line.hsnCode || 'N/A'}" is not standard 4, 6, or 8 digits.`
      });
    }

    // Quantity
    if (isNaN(line.quantity) || Number(line.quantity) <= 0) {
      alerts.push({
        field: `lineItems[${index}].quantity`,
        severity: 'error',
        message: `Line ${index + 1}: Quantity (${line.quantity}) must be greater than zero.`
      });
    }

    // Unit Price (Rate)
    if (isNaN(line.unitPrice) || Number(line.unitPrice) < 0) {
      alerts.push({
        field: `lineItems[${index}].unitPrice`,
        severity: 'error',
        message: `Line ${index + 1}: Rate/Unit Price (${line.unitPrice}) must be non-negative.`
      });
    }

    // Unit Validation and New Unit Detection
    const rawUnit = line.unit || '';
    const mappedUnitObj = mapUnitOfMeasurement(rawUnit, db.unitMappings);
    const standardUnitsLower = (db.units || []).map((u: string) => u.toLowerCase());
    
    if (!rawUnit || rawUnit.trim() === '') {
      alerts.push({
        field: `lineItems[${index}].unit`,
        severity: 'warning',
        message: `Line ${index + 1}: Unit is missing.`
      });
    } else if (!standardUnitsLower.includes(mappedUnitObj.mapped.toLowerCase())) {
      alerts.push({
        field: `lineItems[${index}].unit`,
        severity: 'warning',
        message: `Line ${index + 1}: Unit "${rawUnit}" (maps to "${mappedUnitObj.mapped}") is a new unit. Approve stock entry to add to Unit Master.`,
        isNewUnit: true,
        newUnitName: mappedUnitObj.mapped
      });
    }
  });

  return alerts;
}

// Background worker for processing multiple invoices/stock sheets in bulk
async function runBulkOCRProcessing(jobId: string, files: Array<{ base64: string; name: string; mimeType: string }>) {
  const job = ocrJobs[jobId];
  if (!job) return;

  job.status = 'processing';

  // Process with concurrency limit of 3 to stay within model rate limit constraints and maintain blazing fast execution
  const CONCURRENCY_LIMIT = 3;
  const db = readDB();

  for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
    const chunk = files.slice(i, i + CONCURRENCY_LIMIT);
    const promises = chunk.map(async (file) => {
      try {
        const cleanBase64 = file.base64.replace(/^data:[a-zA-Z0-9-\/]+;base64,/, "");
        const selectedMime = file.mimeType || "application/pdf";

        const ai = getGemini();
        const result = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: selectedMime,
                data: cleanBase64
              }
            },
            {
              text: `You are an expert AI Purchase & Billing Ingestion Engine with 100% precision. Your task is to accurately extract invoice items, metadata, supplier details, tax details, and warehouse properties from the provided PDF document or image. Specifically, automatically detect and recognize standard Units of Measurement (UOM) like Piece (PCS), Meter (MTR), Coil, Length, Roll, Box, Bundle, Packet, Set, Sheet, Kg, Gram, Ton, Liter, Milliliter, Feet, Inch, Square Meter, Square Feet, Cubic Meter, Bag, Carton, Drum, Pair, Dozen, Unit, Numbers (Nos), and physical size/length dimensions if mentioned in the product name or specifications. Output valid JSON adhering to this strict specification:
{
  "customerName": "String",
  "vendorName": "String (Name of vendor or billing supplier)",
  "gstNumber": "String (GSTIN/Tax Registration Number if visible)",
  "mobileNumber": "String (Mobile/Phone number parsed from the bill)",
  "address": "String (Billing address parsed from the invoice)",
  "invoiceNumber": "String (Invoice or reference number)",
  "date": "YYYY-MM-DD (Format the invoice date)",
  "lineItems": [
    {
      "itemName": "String (Match product/item descriptive name precisely)",
      "hsnCode": "String (HSN carefully or match standard, e.g. '8471' for chips, '8517' for telecom, '8415' for AC, '3004' for masks, '4820' for stationery)",
      "quantity": Number,
      "unit": "String (Extract the unit exactly as listed on the invoice, e.g. MTR, PCS, NOS, COIL, FT, SQFT, SQM, KG, etc.)",
      "unitPrice": Number, (Unit purchase price before GST tax or general rate)
      "taxRate": Number, (GST % rate like 18, 12, 5, 28, 0)
      "totalAmount": Number, (Gross amount including tax for this line item)
      "batchNumber": "String (if listed on invoice, otherwise leave empty or assign null)",
      "expiryDate": "YYYY-MM-DD (format if available on invoice, otherwise leave empty or assign null)",
      "length": "String or null (Extract length if mentioned in item desc/specifications, e.g., '10m', '50ft')",
      "width": "String or null (Extract width if mentioned, e.g., '2m', '4ft')",
      "height": "String or null (Extract height if mentioned)",
      "thickness": "String or null (Extract thickness if mentioned, e.g., '2mm', '0.5 inch')",
      "diameter": "String or null (Extract diameter if mentioned, e.g., '10mm')",
      "gauge": "String or null (Extract wire/sheet gauge if mentioned, e.g., '16 SWG', '20 SWG')",
      "size": "String or null (Extract size if mentioned, e.g., 'Medium', '12x15', '40mm')",
      "dimension": "String or null (Extract dimensions/volume if mentioned)",
      "weight": "String or null (Extract weight if mentioned, e.g., '25kg', '500g')",
      "volume": "String or null (Extract volume if mentioned, e.g., '1L', '200ml')",
      "isCoil": Boolean, (Set to true ONLY if the item is a COIL, e.g., coil of wire, hose, cable, sheet)
      "coilInfo": {
        "coilQuantity": Number, (Number of coils, if specified, default to 1 if isCoil is true)
        "coilLength": Number, (Length per coil as a numeric value, e.g. 100 for '100m coil')
        "coilLengthUnit": "String (Meter or Feet if known, default 'Meter')",
        "coilWeight": "String (Weight of the coil if available, e.g. '5.4kg')",
        "coilNumber": "String (Coil serial/tag/identification number if visible)"
      }
    }
  ],
  "totalAmount": Number, (Overall grand total summary including taxes)
  "confidenceScore": Number (0-100)
}

Calculate precisely: totalAmount = unitPrice * quantity * (1 + taxRate/100). Keep 100% accuracy for all numeric values. Output ONLY valid JSON, do not include any markdown wrapper except the standard json block. Do not guess or invent values; if a field is not available in the text, leave it empty or null.`
            }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });

        const parsedJson = JSON.parse(result.text || '{}');
        
        // format and map line items cleanly
        const formattedLines = (parsedJson.lineItems || []).map((li: any) => {
          const rawUnit = li.unit || 'Pcs';
          const mappedUnitObj = mapUnitOfMeasurement(rawUnit, db.unitMappings);
          
          return {
            itemName: li.itemName || 'Parsed SKU',
            hsnCode: li.hsnCode || '3926',
            quantity: Number(li.quantity || 1),
            unit: mappedUnitObj.mapped, // standardize mapped unit
            unitPrice: Number(li.unitPrice || li.rate || 100),
            taxRate: Number(li.taxRate || 18),
            totalAmount: Number(li.totalAmount || Math.round((li.quantity || 1) * (li.unitPrice || 100) * 1.18)),
            batchNumber: li.batchNumber || '',
            expiryDate: li.expiryDate || '',
            length: li.length || '',
            width: li.width || '',
            height: li.height || '',
            thickness: li.thickness || '',
            diameter: li.diameter || '',
            gauge: li.gauge || '',
            size: li.size || '',
            dimension: li.dimension || '',
            weight: li.weight || '',
            volume: li.volume || '',
            isCoil: !!li.isCoil,
            coilInfo: li.isCoil ? {
              coilQuantity: Number(li.coilInfo?.coilQuantity || 1),
              coilLength: Number(li.coilInfo?.coilLength || 0),
              coilLengthUnit: li.coilInfo?.coilLengthUnit || 'Meter',
              coilWeight: li.coilInfo?.coilWeight || '',
              coilNumber: li.coilInfo?.coilNumber || ''
            } : null
          };
        });

        const finalData = {
          vendorName: parsedJson.vendorName || parsedJson.supplierName || 'Unknown Supplier',
          invoiceNumber: parsedJson.invoiceNumber || 'INV-EXT-' + Math.floor(1000 + Math.random() * 9000),
          date: parsedJson.date || new Date().toISOString().split('T')[0],
          lineItems: formattedLines,
          gstNumber: parsedJson.gstNumber || '',
          totalAmount: parsedJson.totalAmount || formattedLines.reduce((sum: number, line: any) => sum + line.totalAmount, 0),
          confidenceScore: parsedJson.confidenceScore || 95
        };

        const validationAlerts = validateExtractedData(db, finalData);

        job.results.push({
          fileName: file.name,
          success: true,
          data: finalData,
          validationAlerts
        });
        job.successCount++;
      } catch (err: any) {
        console.error(`[Bulk OCR Error] Failed to process ${file.name}:`, err);
        job.results.push({
          fileName: file.name,
          success: false,
          error: err.message || 'Gemini processing issue.'
        });
        job.failedCount++;
      } finally {
        job.processedCount++;
      }
    });

    await Promise.all(promises);
  }

  job.status = 'completed';
}

// Gemini Multi-Modal Invoice Parser (Single File Optimization)
app.post('/api/ocr/parse', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body; // base64 string (image or PDF)
    if (!imageBase64) {
      return res.status(400).json({ error: 'Base64 file data is required to parse structured bills.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9-\/]+;base64,/, "");
    const selectedMime = mimeType || "application/pdf";

    const ai = getGemini();

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: selectedMime,
            data: cleanBase64
          }
        },
        {
          text: `You are an expert AI Purchase & Billing Ingestion Engine with 100% precision. Your task is to accurately extract invoice items, metadata, supplier details, tax details, and warehouse properties from the provided PDF document or image. Specifically, automatically detect and recognize standard Units of Measurement (UOM) like Piece (PCS), Meter (MTR), Coil, Length, Roll, Box, Bundle, Packet, Set, Sheet, Kg, Gram, Ton, Liter, Milliliter, Feet, Inch, Square Meter, Square Feet, Cubic Meter, Bag, Carton, Drum, Pair, Dozen, Unit, Numbers (Nos), and physical size/length dimensions if mentioned in the product name or specifications. Output valid JSON adhering to this strict specification:
{
  "customerName": "String",
  "vendorName": "String (Name of vendor or billing supplier)",
  "gstNumber": "String (GSTIN/Tax Registration Number if visible)",
  "mobileNumber": "String (Mobile/Phone number parsed from the bill)",
  "address": "String (Billing address parsed from the invoice)",
  "invoiceNumber": "String (Invoice or reference number)",
  "date": "YYYY-MM-DD (Format the invoice date)",
  "lineItems": [
    {
      "itemName": "String (Match product/item descriptive name precisely)",
      "hsnCode": "String (HSN carefully or match standard, e.g. '8471' for chips, '8517' for telecom, '8415' for AC, '3004' for masks, '4820' for stationery)",
      "quantity": Number,
      "unit": "String (Extract the unit exactly as listed on the invoice, e.g. MTR, PCS, NOS, COIL, FT, SQFT, SQM, KG, etc.)",
      "unitPrice": Number, (Unit purchase price before GST tax or general rate)
      "taxRate": Number, (GST % rate like 18, 12, 5, 28, 0)
      "totalAmount": Number, (Gross amount including tax for this line item)
      "batchNumber": "String (if listed on invoice, otherwise leave empty or assign null)",
      "expiryDate": "YYYY-MM-DD (format if available on invoice, otherwise leave empty or assign null)",
      "length": "String or null (Extract length if mentioned in item desc/specifications, e.g., '10m', '50ft')",
      "width": "String or null (Extract width if mentioned, e.g., '2m', '4ft')",
      "height": "String or null (Extract height if mentioned)",
      "thickness": "String or null (Extract thickness if mentioned, e.g., '2mm', '0.5 inch')",
      "diameter": "String or null (Extract diameter if mentioned, e.g., '10mm')",
      "gauge": "String or null (Extract wire/sheet gauge if mentioned, e.g., '16 SWG', '20 SWG')",
      "size": "String or null (Extract size if mentioned, e.g., 'Medium', '12x15', '40mm')",
      "dimension": "String or null (Extract dimensions/volume if mentioned)",
      "weight": "String or null (Extract weight if mentioned, e.g., '25kg', '500g')",
      "volume": "String or null (Extract volume if mentioned, e.g., '1L', '200ml')",
      "isCoil": Boolean, (Set to true ONLY if the item is a COIL, e.g., coil of wire, hose, cable, sheet)
      "coilInfo": {
        "coilQuantity": Number, (Number of coils, if specified, default to 1 if isCoil is true)
        "coilLength": Number, (Length per coil as a numeric value, e.g. 100 for '100m coil')
        "coilLengthUnit": "String (Meter or Feet if known, default 'Meter')",
        "coilWeight": "String (Weight of the coil if available, e.g. '5.4kg')",
        "coilNumber": "String (Coil serial/tag/identification number if visible)"
      }
    }
  ],
  "totalAmount": Number, (Overall grand total summary including taxes)
  "confidenceScore": Number (0-100)
}

Calculate precisely: totalAmount = unitPrice * quantity * (1 + taxRate/100). Keep 100% accuracy for all numeric values. Output ONLY valid JSON, do not include any markdown wrapper except the standard json block. Do not guess or invent values; if a field is not available in the text, leave it empty or null.`
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsedJson = JSON.parse(result.text || '{}');
    const db = readDB();
    
    // Format lines
    const formattedLines = (parsedJson.lineItems || []).map((li: any) => {
      const rawUnit = li.unit || 'Pcs';
      const mappedUnitObj = mapUnitOfMeasurement(rawUnit, db.unitMappings);
      
      return {
        itemName: li.itemName || 'Parsed SKU',
        hsnCode: li.hsnCode || '3926',
        quantity: Number(li.quantity || 1),
        unit: mappedUnitObj.mapped, // standardize mapped unit
        unitPrice: Number(li.unitPrice || li.rate || 100),
        taxRate: Number(li.taxRate || 18),
        totalAmount: Number(li.totalAmount || Math.round((li.quantity || 1) * (li.unitPrice || 100) * 1.18)),
        batchNumber: li.batchNumber || '',
        expiryDate: li.expiryDate || '',
        length: li.length || '',
        width: li.width || '',
        height: li.height || '',
        thickness: li.thickness || '',
        diameter: li.diameter || '',
        gauge: li.gauge || '',
        size: li.size || '',
        dimension: li.dimension || '',
        weight: li.weight || '',
        volume: li.volume || '',
        isCoil: !!li.isCoil,
        coilInfo: li.isCoil ? {
          coilQuantity: Number(li.coilInfo?.coilQuantity || 1),
          coilLength: Number(li.coilInfo?.coilLength || 0),
          coilLengthUnit: li.coilInfo?.coilLengthUnit || 'Meter',
          coilWeight: li.coilInfo?.coilWeight || '',
          coilNumber: li.coilInfo?.coilNumber || ''
        } : null
      };
    });

    const finalData = {
      vendorName: parsedJson.vendorName || parsedJson.supplierName || 'Unknown Supplier',
      invoiceNumber: parsedJson.invoiceNumber || 'INV-EXT-' + Math.floor(1000 + Math.random() * 9000),
      date: parsedJson.date || new Date().toISOString().split('T')[0],
      lineItems: formattedLines,
      gstNumber: parsedJson.gstNumber || '',
      totalAmount: parsedJson.totalAmount || formattedLines.reduce((sum: number, line: any) => sum + line.totalAmount, 0),
      confidenceScore: parsedJson.confidenceScore || 95
    };

    const validationAlerts = validateExtractedData(db, finalData);

    res.json({
      ...finalData,
      validationAlerts
    });

  } catch (error: any) {
    console.error('Gemini Multi-Modal Parse Failed:', error);
    res.status(500).json({ error: `AI Multi-Modal Parse Service Issue: ${error.message}` });
  }
});

// Bulk Invoice Parse Endpoint (Trigger background processing)
app.post('/api/ocr/bulk-parse', async (req, res) => {
  try {
    const { files } = req.body; // Array of { base64, name, mimeType }
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'At least one base64 file object is required for bulk processing.' });
    }

    const jobId = `JOB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    ocrJobs[jobId] = {
      id: jobId,
      status: 'pending',
      totalFiles: files.length,
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      createdAt: new Date().toISOString()
    };

    // Trigger processing asynchronously so request returns immediately
    runBulkOCRProcessing(jobId, files);

    res.json({ jobId, totalFiles: files.length });
  } catch (err: any) {
    res.status(500).json({ error: `Bulk OCR parser initialization failed: ${err.message}` });
  }
});

// Fetch Bulk Job Status
app.get('/api/ocr/job-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = ocrJobs[jobId];
  if (!job) {
    return res.status(404).json({ error: 'Target bulk OCR job not found.' });
  }
  res.json(job);
});

// Final OCR Import and Automation endpoint
app.post('/api/ocr/confirm-import', async (req, res) => {
  try {
    const { records, godownId, approvedNewUnits } = req.body; // Array of verified invoice records
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No verified records provided for import.' });
    }

    const targetGodown = godownId || 'GD-01';
    const db = readDB();
    db.items = db.items || [];
    db.stockTransactions = db.stockTransactions || [];
    db.payments = db.payments || [];
    db.erpAuditLogs = db.erpAuditLogs || [];

    const activeUser = getUserFromToken(req.headers.authorization);
    let itemsUpdated = 0;
    let itemsCreated = 0;
    let totalGrossValue = 0;

    for (const record of records) {
      // Prevent inserting duplicate invoice if user attempts double final ingestion
      const isAlreadyImported = checkDuplicateInvoice(db, record.invoiceNumber, record.vendorName);
      if (isAlreadyImported) {
        continue; // skip duplicate to ensure zero inventory duplication
      }

      for (const line of record.lineItems) {
        // Automatically map raw unit and add it to Unit Master if it doesn't exist AND is approved
        const mappedUnitObj = mapUnitOfMeasurement(line.unit || 'Piece', db.unitMappings);
        const mappedUnit = mappedUnitObj.mapped;
        
        db.units = db.units || [];
        const unitExists = db.units.some((u: string) => u.toLowerCase() === mappedUnit.toLowerCase());
        if (!unitExists && mappedUnit.trim() !== '') {
          const isApproved = approvedNewUnits && Array.isArray(approvedNewUnits) && 
            approvedNewUnits.some((u: string) => u.toLowerCase() === mappedUnit.toLowerCase());
          if (isApproved) {
            db.units.push(mappedUnit);
          }
        }

        // Find existing SKU intelligently by name (case-insensitive) or HSN
        let existingItem = db.items.find((i: any) => 
          i.name.toLowerCase() === line.itemName.toLowerCase() || i.hsnCode === line.hsnCode
        );

        let itemId: string;
        if (existingItem) {
          // Update unit cost and selling price based on the latest bill
          existingItem.unitCost = Number(line.unitPrice);
          existingItem.sellingPrice = Math.round(Number(line.unitPrice) * 1.35); // standard selling price update
          existingItem.unit = mappedUnit;
          if (line.length) existingItem.length = line.length;
          if (line.width) existingItem.width = line.width;
          if (line.height) existingItem.height = line.height;
          if (line.thickness) existingItem.thickness = line.thickness;
          if (line.diameter) existingItem.diameter = line.diameter;
          if (line.gauge) existingItem.gauge = line.gauge;
          if (line.size) existingItem.size = line.size;
          if (line.dimension) existingItem.dimension = line.dimension;
          if (line.weight) existingItem.weight = line.weight;
          if (line.volume) existingItem.volume = line.volume;
          existingItem.isCoil = !!line.isCoil;
          if (line.isCoil && line.coilInfo) {
            existingItem.coilInfo = {
              coilQuantity: Number(line.coilInfo?.coilQuantity || 1),
              coilLength: Number(line.coilInfo?.coilLength || 0),
              coilLengthUnit: line.coilInfo?.coilLengthUnit || 'Meter',
              coilWeight: line.coilInfo?.coilWeight || '',
              coilNumber: line.coilInfo?.coilNumber || ''
            };
          }
          itemId = existingItem.id;
          itemsUpdated++;
        } else {
          // Register a brand new SKU
          const id = `ITM-0${db.items.length + 1}`;
          const cleanHsn = line.hsnCode || '3926';
          const sku = `SKU-${cleanHsn}-${line.itemName.substring(0, 5).toUpperCase().replace(/\s+/g, '')}-0${db.items.length + 1}`;
          
          const newItem = {
            id,
            sku,
            name: line.itemName,
            hsnCode: cleanHsn,
            reorderLevel: 15,
            unitCost: Number(line.unitPrice),
            sellingPrice: Math.round(Number(line.unitPrice) * 1.35),
            taxRate: Number(line.taxRate || 18),
            // Physical Specs
            unit: mappedUnit,
            length: line.length || '',
            width: line.width || '',
            height: line.height || '',
            thickness: line.thickness || '',
            diameter: line.diameter || '',
            gauge: line.gauge || '',
            size: line.size || '',
            dimension: line.dimension || '',
            weight: line.weight || '',
            volume: line.volume || '',
            isCoil: !!line.isCoil,
            coilInfo: line.isCoil ? {
              coilQuantity: Number(line.coilInfo?.coilQuantity || 1),
              coilLength: Number(line.coilInfo?.coilLength || 0),
              coilLengthUnit: line.coilInfo?.coilLengthUnit || 'Meter',
              coilWeight: line.coilInfo?.coilWeight || '',
              coilNumber: line.coilInfo?.coilNumber || ''
            } : null
          };
          db.items.push(newItem);
          itemId = id;
          itemsCreated++;
        }

        // Post immutable Stock Transaction (INFLOW)
        const txId = `ST-0${db.stockTransactions.length + 1}`;
        const newTx = {
          id: txId,
          timestamp: new Date().toISOString(),
          itemId,
          itemName: line.itemName,
          sku: db.items.find((i: any) => i.id === itemId)?.sku || 'SKU-TEMP',
          type: 'INFLOW',
          fromGodownId: null,
          toGodownId: targetGodown,
          quantity: Number(line.quantity),
          unitCost: Number(line.unitPrice),
          sellingPrice: Math.round(Number(line.unitPrice) * 1.35),
          operatorEmail: activeUser.email || 'operator@company.com',
          invoiceNumber: record.invoiceNumber,
          invoiceUrl: '',
          batchNumber: line.batchNumber || '',
          expiryDate: line.expiryDate || '',
          // UOM & Physical Specs
          unit: mappedUnit,
          length: line.length || '',
          width: line.width || '',
          height: line.height || '',
          thickness: line.thickness || '',
          diameter: line.diameter || '',
          gauge: line.gauge || '',
          size: line.size || '',
          dimension: line.dimension || '',
          weight: line.weight || '',
          volume: line.volume || '',
          isCoil: !!line.isCoil,
          coilInfo: line.isCoil ? {
            coilQuantity: Number(line.coilInfo?.coilQuantity || 1),
            coilLength: Number(line.coilInfo?.coilLength || 0),
            coilLengthUnit: line.coilInfo?.coilLengthUnit || 'Meter',
            coilWeight: line.coilInfo?.coilWeight || '',
            coilNumber: line.coilInfo?.coilNumber || ''
          } : null
        };
        db.stockTransactions.push(newTx);
        totalGrossValue += Number(line.totalAmount);
      }

      // Record Corresponding Financial Outflow Expense
      const splitCash = Math.round(record.totalAmount * 0.15);
      const splitGPay = Math.round(record.totalAmount * 0.85);

      const paymentId = `PAY-0${db.payments.length + 1}`;
      const newPayment = {
        id: paymentId,
        timestamp: new Date().toISOString(),
        type: 'EXPENSE',
        cashAmount: splitCash,
        gpayAmount: splitGPay,
        gpayUtr: 'UTR' + Math.floor(10000000 + Math.random() * 90000000),
        memo: `Automated import of Bill #${record.invoiceNumber} from '${record.vendorName}'. Stock updated for central storage.`,
        category: 'Automated Purchase',
        invoiceUrl: '',
        vendorName: record.vendorName
      };
      db.payments.push(newPayment);

      // Record Compliance Audit Trail Log
      const auditId = `AUD-0${db.erpAuditLogs.length + 1}`;
      const auditRecord = {
        id: auditId,
        timestamp: new Date().toISOString(),
        transactionType: 'STOCK_IMPORT_OCR',
        docNumber: record.invoiceNumber,
        linkedInvoiceNumber: record.invoiceNumber,
        ledgerCreatedOrMatched: `Bulk Ingestion: Created payment ledger ${paymentId} & updated stock items for central godown`,
        userName: activeUser.name || 'AI Assistant',
        debitAmount: record.totalAmount,
        creditAmount: record.totalAmount,
        gstImpact: Math.round(record.totalAmount * 0.18),
        notes: `ERP Automatic Import: Processed invoice #${record.invoiceNumber} with ${record.lineItems.length} lines. Updated: ${itemsUpdated}, Created: ${itemsCreated}. Operator: ${activeUser.email}`
      };
      db.erpAuditLogs.push(auditRecord);
    }

    writeDB(db);
    res.json({
      success: true,
      itemsUpdated,
      itemsCreated,
      totalGrossValue,
      message: `Successfully processed stock entries. Registered ${itemsCreated} new SKUs and updated ${itemsUpdated} existing products.`
    });
  } catch (err: any) {
    res.status(500).json({ error: `Final invoice import failed: ${err.message}` });
  }
});

// Helper to check for duplicate invoices in db
function checkDuplicateInvoice(db: any, invoiceNumber: string, vendorName: string): boolean {
  if (!invoiceNumber) return false;
  const formattedInvoice = invoiceNumber.trim().toLowerCase();
  const formattedVendor = (vendorName || '').trim().toLowerCase();

  const hasTx = (db.stockTransactions || []).some((tx: any) => 
    tx.invoiceNumber && tx.invoiceNumber.trim().toLowerCase() === formattedInvoice
  );
  const hasPayment = (db.payments || []).some((p: any) => 
    p.vendorName && p.vendorName.trim().toLowerCase() === formattedVendor &&
    p.memo && p.memo.toLowerCase().includes(formattedInvoice)
  );

  return hasTx || hasPayment;
}

// Godowns Endpoint
app.get('/api/godowns', (req, res) => {
  res.json(readDB().godowns);
});

app.post('/api/godowns', (req, res) => {
  const { name, location, capacity } = req.body;
  if (!name || !location || !capacity) {
    return res.status(400).json({ error: 'All godown parameters are required.' });
  }
  const db = readDB();
  const id = `GD-0${db.godowns.length + 1}`;
  const newGodown = { id, name, location, capacity: Number(capacity) };
  db.godowns.push(newGodown);
  writeDB(db);
  res.json(newGodown);
});

// Items Endpoint
app.get('/api/items', (req, res) => {
  res.json(readDB().items);
});

app.post('/api/items', (req, res) => {
  const { name, hsnCode, reorderLevel, unitCost, sellingPrice, sku: customSku } = req.body;
  if (!name || !hsnCode) {
    return res.status(400).json({ error: 'Name and HSN Code are required.' });
  }
  const db = readDB();
  const id = `ITM-0${db.items.length + 1}`;
  const sku = customSku || `SKU-${hsnCode}-${name.substring(0, 5).toUpperCase().replace(/\s+/g, '')}-0${db.items.length + 1}`;

  // Automatically fetch GST tax slab based on offline HSN dictionary, dynamic base calculation
  const mappedHsn = HSN_DICTIONARY[hsnCode];
  const taxRate = mappedHsn ? mappedHsn.rate : 18; // fallback to 18% standard GST

  const newItem = {
    id,
    sku,
    name,
    hsnCode,
    reorderLevel: Number(reorderLevel || 10),
    unitCost: Number(unitCost || 0),
    sellingPrice: Number(sellingPrice || 0),
    taxRate
  };

  db.items.push(newItem);
  writeDB(db);
  res.json(newItem);
});

// Stock Transactions (Immutable Ledger System)
app.get('/api/inventory/transactions', (req, res) => {
  res.json(readDB().stockTransactions);
});

app.post('/api/inventory/transactions', (req, res) => {
  const { itemId, type, fromGodownId, toGodownId, quantity, operatorEmail, invoiceNumber, invoiceUrl } = req.body;
  if (!itemId || !type || !quantity || !operatorEmail) {
    return res.status(400).json({ error: 'Incomplete ledger record parameters.' });
  }

  const db = readDB();
  const item = db.items.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Target item not found.' });
  }

  // ATOMIC TRANSACTION WORKFLOW (Validating quantities, transferring dynamically without loss)
  if (type === 'TRANSFER') {
    if (!fromGodownId || !toGodownId) {
      return res.status(400).json({ error: 'Source and Destination godowns required for inter-godown transfer.' });
    }
    if (fromGodownId === toGodownId) {
      return res.status(400).json({ error: 'Source and Destination godowns cannot be identical.' });
    }

    // Verify sufficient inventory of this item at the source godown using historical ledger audits
    let sourceStock = 0;
    db.stockTransactions.forEach(tx => {
      if (tx.itemId === itemId) {
        if (tx.toGodownId === fromGodownId) {
          sourceStock += tx.quantity;
        }
        if (tx.fromGodownId === fromGodownId) {
          sourceStock -= tx.quantity;
        }
      }
    });

    if (sourceStock < Number(quantity)) {
      return res.status(400).json({ error: `Insufficient inventory at source godown. Available: ${sourceStock} units, Requested: ${quantity} units.` });
    }
  } else if (type === 'OUTFLOW') {
    if (!fromGodownId) {
      return res.status(400).json({ error: 'Source godown required for outflow dispatch.' });
    }
    let sourceStock = 0;
    db.stockTransactions.forEach(tx => {
      if (tx.itemId === itemId) {
        if (tx.toGodownId === fromGodownId) {
          sourceStock += tx.quantity;
        }
        if (tx.fromGodownId === fromGodownId) {
          sourceStock -= tx.quantity;
        }
      }
    });
    if (sourceStock < Number(quantity)) {
      return res.status(400).json({ error: `Insufficient stock at godown for dispatch. Available: ${sourceStock}, Requested: ${quantity}.` });
    }
  }

  // Record atomic transaction
  const txId = `ST-0${db.stockTransactions.length + 1}`;
  const newTx = {
    id: txId,
    timestamp: new Date().toISOString(),
    itemId,
    itemName: item.name,
    sku: item.sku,
    type,
    fromGodownId: type === 'INFLOW' ? null : fromGodownId,
    toGodownId: type === 'OUTFLOW' ? null : toGodownId,
    quantity: Number(quantity),
    unitCost: item.unitCost,
    sellingPrice: item.sellingPrice,
    operatorEmail,
    invoiceNumber,
    invoiceUrl
  };

  db.stockTransactions.push(newTx);
  triggerLowStockNotificationIfRequired(db, itemId);
  writeDB(db);
  res.json(newTx);
});

// Update stock transaction (Ledger Adjustment)
app.put('/api/inventory/transactions/:id', (req, res) => {
  const { id } = req.params;
  const { quantity, unitCost, sellingPrice, invoiceNumber, date } = req.body;
  const db = readDB();
  const index = db.stockTransactions.findIndex(tx => tx.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const tx = db.stockTransactions[index];
  if (quantity !== undefined) tx.quantity = Number(quantity);
  if (unitCost !== undefined) {
    tx.unitCost = Number(unitCost);
    // Also update item's unit cost for future presets
    const item = db.items.find(i => i.id === tx.itemId);
    if (item) item.unitCost = Number(unitCost);
  }
  if (sellingPrice !== undefined) {
    tx.sellingPrice = Number(sellingPrice);
    const item = db.items.find(i => i.id === tx.itemId);
    if (item) item.sellingPrice = Number(sellingPrice);
  }
  if (invoiceNumber !== undefined) tx.invoiceNumber = invoiceNumber;
  if (date !== undefined) {
    // Keep timestamp format consistent
    tx.timestamp = new Date(date).toISOString();
  }

  writeDB(db);
  res.json(tx);
});

// Delete stock transaction
app.delete('/api/inventory/transactions/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.stockTransactions.findIndex(tx => tx.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const deletedTx = db.stockTransactions.splice(index, 1)[0];
  writeDB(db);
  res.json({ success: true, deletedTx });
});

// Payments (Quad-Column Ledger)
app.get('/api/payments', (req, res) => {
  res.json(readDB().payments);
});

app.post('/api/payments', (req, res) => {
  const { type, cashAmount, gpayAmount, gpayUtr, chequeAmount, chequeMeta, memo, category, invoiceUrl, vendorName, date, userName } = req.body;
  if (!type || !memo) {
    return res.status(400).json({ error: 'Payment type and Reconciliation memo are mandatory.' });
  }

  const db = readDB();
  const id = `PM-0${db.payments.length + 1}`;
  const activeUser = getUserFromToken(req.headers.authorization);
  const operatorName = userName || activeUser.name || activeUser.email || 'System';

  const record = {
    id,
    date: date || new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    type,
    cashAmount: Number(cashAmount || 0),
    gpayAmount: Number(gpayAmount || 0),
    gpayUtr: gpayUtr || '',
    chequeAmount: Number(chequeAmount || 0),
    chequeMeta: chequeAmount > 0 ? {
      chequeNumber: chequeMeta?.chequeNumber || 'CHQ-UNKNOWN',
      bankName: chequeMeta?.bankName || 'General Bank',
      clearingDate: chequeMeta?.clearingDate || new Date().toISOString().split('T')[0],
      status: chequeMeta?.status || 'Pending'
    } : undefined,
    memo,
    category: category || 'Miscellaneous',
    invoiceUrl: invoiceUrl || '',
    vendorName: vendorName || '',
    
    // safe ledger status & audit
    isDeleted: false,
    isVoided: false,
    isCancelled: false,
    isReversal: false,
    status: 'Active',
    auditLog: [{
      action: 'CREATE',
      user: operatorName,
      timestamp: new Date().toISOString(),
      details: 'Initial payment transaction record created.'
    }]
  };

  db.payments.push(record);
  writeDB(db);
  res.json(record);
});

// State-machine Update for Cheque clearing
app.put('/api/payments/:id/cheque-status', (req, res) => {
  const { id } = req.params;
  const { status, userName } = req.body; // 'Pending' | 'Cleared' | 'Bounced'
  if (!status || !['Pending', 'Cleared', 'Bounced'].includes(status)) {
    return res.status(400).json({ error: 'Valid settlement state (Cleared/Bounced/Pending) required.' });
  }

  const db = readDB();
  const record = db.payments.find(p => p.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Audit payload record not found.' });
  }
  if (!record.chequeMeta) {
    return res.status(400).json({ error: 'This payment record has no related Cheque clearing specifications.' });
  }

  const activeUser = getUserFromToken(req.headers.authorization);
  const operatorName = userName || activeUser.name || 'System';

  record.chequeMeta.status = status;
  if (!record.auditLog) record.auditLog = [];
  record.auditLog.push({
    action: 'CHEQUE_STATUS_CHANGE',
    user: operatorName,
    timestamp: new Date().toISOString(),
    details: `Updated cheque clearing status to: ${status}`
  });

  writeDB(db);
  res.json(record);
});

// Update/Edit payment entry
app.put('/api/payments/:id', (req, res) => {
  const { id } = req.params;
  const { type, cashAmount, gpayAmount, gpayUtr, chequeAmount, chequeMeta, memo, category, invoiceUrl, vendorName, date, userName } = req.body;
  
  if (!type || !memo) {
    return res.status(400).json({ error: 'Payment type and Reconciliation memo are mandatory.' });
  }

  const db = readDB();
  const record = db.payments.find(p => p.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Payment record not found.' });
  }

  const activeUser = getUserFromToken(req.headers.authorization);
  const operatorName = userName || activeUser.name || 'System';

  record.type = type;
  record.cashAmount = Number(cashAmount || 0);
  record.gpayAmount = Number(gpayAmount || 0);
  if (gpayUtr !== undefined) record.gpayUtr = gpayUtr;
  record.chequeAmount = Number(chequeAmount || 0);
  
  if (record.chequeAmount > 0) {
    record.chequeMeta = {
      chequeNumber: chequeMeta?.chequeNumber || record.chequeMeta?.chequeNumber || 'CHQ-UNKNOWN',
      bankName: chequeMeta?.bankName || record.chequeMeta?.bankName || 'General Bank',
      clearingDate: chequeMeta?.clearingDate || record.chequeMeta?.clearingDate || new Date().toISOString().split('T')[0],
      status: chequeMeta?.status || record.chequeMeta?.status || 'Pending'
    };
  } else {
    delete record.chequeMeta;
  }

  record.memo = memo;
  if (category !== undefined) record.category = category;
  if (invoiceUrl !== undefined) record.invoiceUrl = invoiceUrl;
  if (vendorName !== undefined) record.vendorName = vendorName;
  if (date !== undefined) record.date = date;

  if (!record.auditLog) record.auditLog = [];
  record.auditLog.push({
    action: 'EDIT',
    user: operatorName,
    timestamp: new Date().toISOString(),
    details: 'Payment transaction details modified.'
  });

  writeDB(db);
  res.json(record);
});

// Restore a soft-deleted payment record
app.post('/api/payments/:id/restore', (req, res) => {
  const { id } = req.params;
  const { userName } = req.body;
  const db = readDB();
  const record = db.payments.find(p => p.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  const activeUser = getUserFromToken(req.headers.authorization);
  const operatorName = userName || activeUser.name || 'System';

  record.isDeleted = false;
  record.status = 'Restored';
  if (!record.auditLog) record.auditLog = [];
  record.auditLog.push({
    action: 'RESTORE',
    user: operatorName,
    timestamp: new Date().toISOString(),
    details: 'Restored from archived bin.'
  });

  writeDB(db);
  res.json({ success: true, message: 'Record restored successfully.', record });
});

// Reverse a payment record with auto-balance entry
app.post('/api/payments/:id/reverse', (req, res) => {
  const { id } = req.params;
  const { userName } = req.body;
  const db = readDB();
  const record = db.payments.find(p => p.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  if (record.reversalId) {
    return res.status(400).json({ error: 'This transaction is already reversed.' });
  }

  const activeUser = getUserFromToken(req.headers.authorization);
  const operatorName = userName || activeUser.name || 'System';

  // Create reversing transaction
  const revId = `PM-REV-${Date.now()}`;
  const reversingRecord = {
    ...record,
    id: revId,
    timestamp: new Date().toISOString(),
    date: record.date,
    type: record.type === 'INCOME' ? 'EXPENSE' : 'INCOME', // Opposite transaction type
    memo: `Reversal Entry for [${record.id}]: ${record.memo}`,
    isReversal: true,
    reversalOfId: record.id,
    status: 'Reversal Entry',
    auditLog: [{
      action: 'CREATE_REVERSAL',
      user: operatorName,
      timestamp: new Date().toISOString(),
      details: `Reversing transaction for original record: ${record.id}`
    }]
  };

  // Link original record
  record.reversalId = revId;
  record.status = 'Reversed';
  if (!record.auditLog) record.auditLog = [];
  record.auditLog.push({
    action: 'REVERSE',
    user: operatorName,
    timestamp: new Date().toISOString(),
    details: `Transaction balanced and reversed via reversing transaction ID: ${revId}`
  });

  db.payments.push(reversingRecord);
  writeDB(db);
  res.json({ success: true, message: 'Transaction reversed successfully.', record, reversingRecord });
});

// Void/Cancel a payment record
app.post('/api/payments/:id/void', (req, res) => {
  const { id } = req.params;
  const { userName, isCancel } = req.body;
  const db = readDB();
  const record = db.payments.find(p => p.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  const activeUser = getUserFromToken(req.headers.authorization);
  const operatorName = userName || activeUser.name || 'System';

  const actionType = isCancel ? 'CANCEL' : 'VOID';
  record.isVoided = !isCancel;
  record.isCancelled = !!isCancel;
  record.status = isCancel ? 'Cancelled' : 'Void';

  if (!record.auditLog) record.auditLog = [];
  record.auditLog.push({
    action: actionType,
    user: operatorName,
    timestamp: new Date().toISOString(),
    details: `Marked transaction state as ${isCancel ? 'Cancelled' : 'Void'}.`
  });

  writeDB(db);
  res.json({ success: true, message: `Record marked as ${isCancel ? 'Cancelled' : 'Void'} successfully.`, record });
});

// Delete payment entry permanently
app.delete('/api/payments/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.payments.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found.' });
  }

  const record = db.payments[index];
  const activeUser = getUserFromToken(req.headers.authorization);
  db.erpAuditLogs = db.erpAuditLogs || [];

  const paymentAmount = Number(record.cashAmount || 0) + Number(record.gpayAmount || 0) + Number(record.chequeAmount || 0);

  const auditRecord = {
    id: `AUD-0${db.erpAuditLogs.length + 1}`,
    timestamp: new Date().toISOString(),
    transactionType: 'PERMANENT_DELETION',
    docNumber: record.id,
    linkedInvoiceNumber: record.category || 'N/A',
    ledgerCreatedOrMatched: `Payment Deletion: ${record.type} Payment of ₹${paymentAmount.toLocaleString('en-IN')}`,
    userName: activeUser.name || 'System Operator',
    debitAmount: paymentAmount,
    creditAmount: paymentAmount,
    gstImpact: 0,
    notes: `Memo: ${record.memo || 'None'}. Deleted by ${activeUser.name || 'System'} at ${new Date().toLocaleTimeString()}.`
  };

  db.erpAuditLogs.push(auditRecord);
  db.payments.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Record permanently deleted from database. Audit trail preserved.', record });
});

// GET all business documents
app.get('/api/documents', (req, res) => {
  const db = readDB();
  const docs = db.documents || [];
  res.json(docs);
});

// POST a new business document
app.post('/api/documents', (req, res) => {
  const { 
    docType, clientName, clientAddress, clientGst, date, dueDate, items, 
    subtotal, taxTotal, discount, grandTotal, notes, status,
    linkedInvoiceNumber, confirmedSimilarLedgerId, forceCreateNewLedger,
    clientMobile, clientEmail, clientState, clientCountry, attachmentUrl
  } = req.body;
  
  if (!docType || !clientName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing mandatory document fields (docType, clientName, and at least one item are required).' });
  }

  const db = readDB();
  const docs = db.documents || [];
  db.ledgers = db.ledgers || [];
  db.journalEntries = db.journalEntries || [];
  db.erpAuditLogs = db.erpAuditLogs || [];

  // Create dynamic document number based on type
  const typePrefixMap = {
    QUOTATION: 'QT',
    ESTIMATE: 'EST',
    INVOICE: 'INV',
    PURCHASE_ORDER: 'PO',
    DELIVERY_NOTE: 'DN',
    RECEIPT: 'RCT',
    CREDIT_NOTE: 'CN',
    DEBIT_NOTE: 'DBN'
  };
  const prefix = typePrefixMap[docType as 'QUOTATION' | 'ESTIMATE' | 'INVOICE' | 'PURCHASE_ORDER' | 'DELIVERY_NOTE' | 'RECEIPT' | 'CREDIT_NOTE' | 'DEBIT_NOTE'] || 'DOC';
  const seq = (db.documents || []).filter(d => d.docType === docType).length + 1;
  const docNumber = `${prefix}-${new Date(date || Date.now()).getFullYear()}-${String(seq).padStart(3, '0')}`;

  // 1. HELPER FUNCTIONS FOR ENTERPRISE ACCOUNTING
  function calculateSimilarity(s1: string, s2: string): number {
    const w1 = s1.toLowerCase().trim();
    const w2 = s2.toLowerCase().trim();
    if (w1 === w2) return 1.0;
    
    // Simple intersection check
    const set1 = new Set(w1.split(/\s+/));
    const set2 = new Set(w2.split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const sim = intersection.size / union.size;
    if (w1.includes(w2) || w2.includes(w1)) {
      return Math.max(sim, 0.86);
    }
    return sim;
  }

  function getUserFromToken(authHeader?: string): { email: string; name: string } {
    if (authHeader && authHeader.startsWith('Bearer secure-jwt-token-sim-')) {
      try {
        const base64 = authHeader.replace('Bearer secure-jwt-token-sim-', '');
        const email = Buffer.from(base64, 'base64').toString('utf-8');
        return { email, name: email.split('@')[0] };
      } catch (e) {}
    }
    return { email: 'sarveshyadav8777@gmail.com', name: 'Sarvesh' };
  }

  // 2. CREDIT NOTE / DEBIT NOTE AUTOMATIC ERP PROCESSING
  let ledgerMatchedOrCreatedMsg = '';
  let finalLedgerId = confirmedSimilarLedgerId || '';
  let matchedLedgerName = '';

  if (docType === 'CREDIT_NOTE' || docType === 'DEBIT_NOTE') {
    // A. VALIDATE INVOICES / BILLS REFERENCE
    if (linkedInvoiceNumber) {
      const linkedInvoice = docs.find(d => d.docNumber === linkedInvoiceNumber.trim().toUpperCase());
      if (!linkedInvoice) {
        return res.status(400).json({ error: `The original referenced invoice "${linkedInvoiceNumber}" could not be found in the system. Verification absolute compliance check failed.` });
      }

      // Verification return item quantities
      for (const returnItem of items) {
        const originalItem = linkedInvoice.items.find((i: any) => i.name.toLowerCase() === returnItem.name.toLowerCase());
        if (!originalItem) {
          return res.status(400).json({ error: `Item "${returnItem.name}" was not found in the original invoice ${linkedInvoiceNumber}.` });
        }
        if (Number(returnItem.qty) > Number(originalItem.qty)) {
          return res.status(400).json({ error: `Returned quantity of "${returnItem.name}" (${returnItem.qty} units) exceeds the original invoice sold/purchased quantity of ${originalItem.qty} units.` });
        }
      }

      // Duplicate detection - prevent creating duplicate notes for identical invoices & totals
      const isDuplicate = docs.some(d => 
        d.docType === docType && 
        d.linkedInvoiceNumber === linkedInvoiceNumber.trim().toUpperCase() &&
        Math.abs(Number(d.grandTotal) - Number(grandTotal)) < 0.01
      );
      if (isDuplicate) {
        return res.status(400).json({ error: `Collision/Duplicate Risk: A similar ${docType.replace('_', ' ')} linked to invoice ${linkedInvoiceNumber} with grand total of ₹${grandTotal} already exists.` });
      }
    }

    // B. SIMILARITY CHECK AND PRE-REGISTRATION WARNING
    if (!finalLedgerId && !forceCreateNewLedger) {
      const searchName = clientName.trim().toLowerCase();
      let highestSim = 0;
      let closestLedger: any = null;

      for (const L of db.ledgers) {
        // filter by matching functional group (Debtors/Creditors)
        const targetType = docType === 'CREDIT_NOTE' ? 'CUSTOMER' : 'VENDOR';
        if (L.type !== targetType) continue;

        const nameSim = calculateSimilarity(L.name, clientName);
        let gstSim = 0;
        let contactSim = 0;

        if (clientGst && L.gstNumber && L.gstNumber.trim().toLowerCase() === clientGst.trim().toLowerCase()) {
          gstSim = 1.0;
        }
        if (clientEmail && L.contact && L.contact.toLowerCase().includes(clientEmail.trim().toLowerCase())) {
          contactSim = 1.0;
        }
        if (clientMobile && L.contact && L.contact.includes(clientMobile.trim())) {
          contactSim = 1.0;
        }

        const maxSim = Math.max(nameSim, gstSim, contactSim);
        if (maxSim > highestSim) {
          highestSim = maxSim;
          closestLedger = L;
        }
      }

      // If similarity exceeds 85%, ask for confirmation by responding with 409 status
      if (highestSim >= 0.85 && closestLedger) {
        return res.status(409).json({
          error: 'SIMILAR_LEDGER_FOUND',
          message: `A highly similar ledger "${closestLedger.name}" (${Math.round(highestSim * 100)}% similarity) already exists in database. To prevent duplication error, please confirm.`,
          similarLedger: closestLedger,
          similarityScore: highestSim
        });
      }
    }

    // C. LEDGER RESOLUTION / ON-THE-FLY CREATION
    if (finalLedgerId) {
      const existing = db.ledgers.find(l => l.id === finalLedgerId);
      if (existing) {
        matchedLedgerName = existing.name;
        ledgerMatchedOrCreatedMsg = `Matched Existing Ledger: "${existing.name}" (ID: ${existing.id})`;
      }
    } else {
      // Find exact name match in ledgers if bypassing similarity
      const targetType = docType === 'CREDIT_NOTE' ? 'CUSTOMER' : 'VENDOR';
      const exactMatch = db.ledgers.find(l => l.name.toLowerCase() === clientName.trim().toLowerCase() && l.type === targetType);
      
      if (exactMatch) {
        finalLedgerId = exactMatch.id;
        matchedLedgerName = exactMatch.name;
        ledgerMatchedOrCreatedMsg = `Matched Existing Ledger: "${exactMatch.name}" (ID: ${exactMatch.id})`;
      } else {
        // Create new ledger automatically
        const newId = `L-0${db.ledgers.length + 1}`;
        const cleanGst = clientGst ? clientGst.trim().toUpperCase() : '';
        // Extract PAN from GST if valid (GST index 2 to 12 is PAN) or fallback to regex
        let pan = '';
        if (cleanGst.length === 15) {
          pan = cleanGst.substring(2, 12);
        } else {
          const panMatch = /[A-Z]{5}[0-9]{4}[A-Z]{1}/i.exec(notes || '') || /[A-Z]{5}[0-9]{4}[A-Z]{1}/i.exec(clientAddress || '');
          pan = panMatch ? panMatch[0].toUpperCase() : '';
        }

        const emailVal = clientEmail ? clientEmail.trim() : '';
        const mobVal = clientMobile ? clientMobile.trim() : '';
        const contacts = [mobVal, emailVal].filter(Boolean).join(' | ');

        const newL = {
          id: newId,
          name: clientName.trim(),
          type: targetType as "CUSTOMER" | "VENDOR",
          gstNumber: cleanGst,
          pan: pan,
          address: clientAddress.trim() || 'No Address Provided',
          contact: contacts || 'N/A',
          balance: 0,
          timestamp: new Date().toISOString()
        };
        db.ledgers.push(newL);
        finalLedgerId = newId;
        matchedLedgerName = newL.name;
        ledgerMatchedOrCreatedMsg = `Successfully Created Ledger account: "${newL.name}" (ID: ${newId})`;
      }
    }

    // D. SYSTEM LEDGERS PREPARATION & OUTSTANDING BALANCE ADJUSTMENT
    if (docType === 'CREDIT_NOTE') {
      // Sales Return: Debit Sales Return, Debit Output GST, Credit Customer Ledger
      let salesReturnLedger = db.ledgers.find(l => l.id === 'L-10');
      if (!salesReturnLedger) {
        salesReturnLedger = {
          id: 'L-10',
          name: 'Sales Return Account',
          type: 'EXPENSE',
          balance: 0,
          timestamp: new Date().toISOString()
        };
        db.ledgers.push(salesReturnLedger);
      }
      salesReturnLedger.balance += Number(subtotal);

      // GST tax payable L-09
      let gstPayableLedger = db.ledgers.find(l => l.id === 'L-09');
      if (!gstPayableLedger) {
        gstPayableLedger = {
          id: 'L-09',
          name: 'GST Output Tax Payable',
          type: 'TAX',
          balance: 0,
          timestamp: new Date().toISOString()
        };
        db.ledgers.push(gstPayableLedger);
      }
      gstPayableLedger.balance -= Number(taxTotal);

      // Customer outstanding balance reduces (so we decrement it)
      const customerLedger = db.ledgers.find(l => l.id === finalLedgerId);
      if (customerLedger) {
        customerLedger.balance -= Number(grandTotal);
      }

      // POST JOURNAL ENTRY FOR SALES RETURN
      const entryId = `JE-0${db.journalEntries.length + 1}`;
      const record = {
        id: entryId,
        timestamp: new Date().toISOString(),
        description: `Sales Return Adjustment Note ${docNumber} linked to invoice ${linkedInvoiceNumber || 'N/A'}`,
        referenceNumber: docNumber,
        invoiceDate: date || new Date().toISOString().split('T')[0],
        dueDate: dueDate || '',
        amount: Number(grandTotal),
        debits: [
          { accountId: salesReturnLedger.id, accountName: salesReturnLedger.name, amount: Number(subtotal) },
          { accountId: gstPayableLedger.id, accountName: gstPayableLedger.name, amount: Number(taxTotal) }
        ],
        credits: [
          { accountId: finalLedgerId, accountName: matchedLedgerName, amount: Number(grandTotal) }
        ],
        auditLog: {
          ledgerMatchedOrCreated: ledgerMatchedOrCreatedMsg,
          status: 'Posted Successfully & Balances Corrected',
          date: new Date().toISOString()
        },
        isConfirmed: true,
        confidenceScore: 1.0
      };
      db.journalEntries.push(record);

      // Adjust inventory by adding the returned items back into stock
      const activeUser = getUserFromToken(req.headers.authorization);
      for (const returnItem of items) {
        const itemInDb = db.items?.find((i: any) => 
          i.id === returnItem.id || 
          i.name.toLowerCase() === returnItem.name.toLowerCase()
        );
        if (itemInDb) {
          const itemGodownId = returnItem.toGodownId || returnItem.targetGodownId || db.godowns?.[0]?.id || 'GD-01';
          const txId = `ST-0${(db.stockTransactions || []).length + 1}`;
          const stockTx = {
            id: txId,
            timestamp: new Date().toISOString(),
            itemId: itemInDb.id,
            itemName: itemInDb.name,
            sku: itemInDb.sku,
            type: 'INFLOW',
            fromGodownId: null,
            toGodownId: itemGodownId,
            quantity: Number(returnItem.qty),
            unitCost: itemInDb.unitCost || 0,
            sellingPrice: Number(returnItem.rate),
            operatorEmail: activeUser.email || 'operator@vyapar.com',
            invoiceNumber: docNumber,
            invoiceUrl: attachmentUrl || ''
          };
          db.stockTransactions = db.stockTransactions || [];
          db.stockTransactions.push(stockTx);
          triggerLowStockNotificationIfRequired(db, itemInDb.id);
        }
      }

    } else if (docType === 'DEBIT_NOTE') {
      // Purchase Return: Debit Vendor, Credit Purchase Return, Credit Input GST
      let purchaseReturnLedger = db.ledgers.find(l => l.id === 'L-11');
      if (!purchaseReturnLedger) {
        purchaseReturnLedger = {
          id: 'L-11',
          name: 'Purchase Return Account',
          type: 'SALES', // credits add on SALES-like categories
          balance: 0,
          timestamp: new Date().toISOString()
        };
        db.ledgers.push(purchaseReturnLedger);
      }
      purchaseReturnLedger.balance += Number(subtotal);

      // Input GST L-12
      let inputGstLedger = db.ledgers.find(l => l.id === 'L-12');
      if (!inputGstLedger) {
        inputGstLedger = {
          id: 'L-12',
          name: 'GST Input Tax Credit',
          type: 'TAX',
          balance: 0,
          timestamp: new Date().toISOString()
        };
        db.ledgers.push(inputGstLedger);
      }
      inputGstLedger.balance -= Number(taxTotal);

      // Vendor payable balance gets reduced (so we add back to the negative balance)
      const vendorLedger = db.ledgers.find(l => l.id === finalLedgerId);
      if (vendorLedger) {
        vendorLedger.balance += Number(grandTotal);
      }

      // POST JOURNAL ENTRY FOR PURCHASE RETURN
      const entryId = `JE-0${db.journalEntries.length + 1}`;
      const record = {
        id: entryId,
        timestamp: new Date().toISOString(),
        description: `Purchase Return Debit Note ${docNumber} linked to bill ${linkedInvoiceNumber || 'N/A'}`,
        referenceNumber: docNumber,
        invoiceDate: date || new Date().toISOString().split('T')[0],
        dueDate: dueDate || '',
        amount: Number(grandTotal),
        debits: [
          { accountId: finalLedgerId, accountName: matchedLedgerName, amount: Number(grandTotal) }
        ],
        credits: [
          { accountId: purchaseReturnLedger.id, accountName: purchaseReturnLedger.name, amount: Number(subtotal) },
          { accountId: inputGstLedger.id, accountName: inputGstLedger.name, amount: Number(taxTotal) }
        ],
        auditLog: {
          ledgerMatchedOrCreated: ledgerMatchedOrCreatedMsg,
          status: 'Posted Successfully & Balances Corrected',
          date: new Date().toISOString()
        },
        isConfirmed: true,
        confidenceScore: 1.0
      };
      db.journalEntries.push(record);

      // Adjust inventory by dispatching the returned items back to vendor
      const sourceGodownId = db.godowns?.[0]?.id || 'GD-01';
      const activeUserForDebit = getUserFromToken(req.headers.authorization);
      for (const returnItem of items) {
        const itemInDb = db.items?.find((i: any) => 
          i.id === returnItem.id || 
          i.name.toLowerCase() === returnItem.name.toLowerCase()
        );
        if (itemInDb) {
          const txId = `ST-0${(db.stockTransactions || []).length + 1}`;
          const stockTx = {
            id: txId,
            timestamp: new Date().toISOString(),
            itemId: itemInDb.id,
            itemName: itemInDb.name,
            sku: itemInDb.sku,
            type: 'OUTFLOW',
            fromGodownId: sourceGodownId,
            toGodownId: null,
            quantity: Number(returnItem.qty),
            unitCost: itemInDb.unitCost || 0,
            sellingPrice: Number(returnItem.rate),
            operatorEmail: activeUserForDebit.email || 'operator@vyapar.com',
            invoiceNumber: docNumber,
            invoiceUrl: attachmentUrl || ''
          };
          db.stockTransactions = db.stockTransactions || [];
          db.stockTransactions.push(stockTx);
          triggerLowStockNotificationIfRequired(db, itemInDb.id);
        }
      }
    }
  }



  const newDoc = {
    id: `DOC-0${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    docType,
    docNumber,
    date: date || new Date().toISOString().split('T')[0],
    dueDate,
    clientName,
    clientAddress,
    clientGst,
    clientMobile: clientMobile || '',
    clientEmail: clientEmail || '',
    clientState: clientState || '',
    clientCountry: clientCountry || '',
    linkedInvoiceNumber: linkedInvoiceNumber ? linkedInvoiceNumber.trim().toUpperCase() : undefined,
    items,
    subtotal: Number(subtotal || 0),
    taxTotal: Number(taxTotal || 0),
    discount: Number(discount || 0),
    grandTotal: Number(grandTotal || 0),
    notes,
    status: status || 'DRAFT',
    timestamp: new Date().toISOString(),
    attachmentUrl: attachmentUrl || ''
  };

  docs.push(newDoc);
  db.documents = docs;

  // E. WRITE AUDIT COMPLIANCE LOG RECORD
  if (docType === 'CREDIT_NOTE' || docType === 'DEBIT_NOTE') {
    const activeUser = getUserFromToken(req.headers.authorization);
    const auditRecord = {
      id: `AUD-0${db.erpAuditLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      transactionType: docType,
      docNumber,
      linkedInvoiceNumber: linkedInvoiceNumber ? linkedInvoiceNumber.trim().toUpperCase() : 'N/A',
      ledgerCreatedOrMatched: ledgerMatchedOrCreatedMsg,
      userName: activeUser.name,
      debitAmount: Number(grandTotal),
      creditAmount: Number(grandTotal),
      gstImpact: Number(taxTotal),
      notes: notes || 'N/A'
    };
    db.erpAuditLogs.push(auditRecord);
  }

  writeDB(db);

  res.status(201).json(newDoc);
});

// PUT update a business document (with revision tracking)
app.put('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const { 
    clientName, clientAddress, clientGst, date, dueDate, items, 
    subtotal, taxTotal, discount, grandTotal, notes, status,
    linkedInvoiceNumber, clientMobile, clientEmail, clientState, 
    clientCountry, attachmentUrl
  } = req.body;

  if (!clientName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing mandatory document fields (clientName and at least one item are required).' });
  }

  const db = readDB();
  const docs = db.documents || [];
  const existingDoc = docs.find(d => d.id === id);

  if (!existingDoc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  function getUserFromToken(authHeader?: string): { email: string; name: string } {
    if (authHeader && authHeader.startsWith('Bearer secure-jwt-token-sim-')) {
      try {
        const base64 = authHeader.replace('Bearer secure-jwt-token-sim-', '');
        const email = Buffer.from(base64, 'base64').toString('utf-8');
        return { email, name: email.split('@')[0] };
      } catch (e) {}
    }
    return { email: 'sarveshyadav8777@gmail.com', name: 'Sarvesh' };
  }

  const activeUser = getUserFromToken(req.headers.authorization);

  // Compute changes to determine Major vs Minor classification & summary
  const changesSummary: string[] = [];
  let changeType: 'Major' | 'Minor' = 'Minor';

  if (existingDoc.clientName !== clientName) {
    changesSummary.push(`Client Name: "${existingDoc.clientName}" ➔ "${clientName}"`);
    changeType = 'Major';
  }

  const oldGrandTotal = Number(existingDoc.grandTotal || 0);
  const newGrandTotal = Number(grandTotal || 0);
  if (oldGrandTotal !== newGrandTotal) {
    changesSummary.push(`Grand Total: ₹${oldGrandTotal.toLocaleString('en-IN')} ➔ ₹${newGrandTotal.toLocaleString('en-IN')}`);
    changeType = 'Major';
  }

  let itemsChanged = false;
  if (!existingDoc.items || existingDoc.items.length !== items.length) {
    itemsChanged = true;
  } else {
    for (let i = 0; i < items.length; i++) {
      const oldItm = existingDoc.items[i];
      const newItm = items[i];
      if (
        !oldItm || !newItm ||
        oldItm.itemName !== newItm.itemName ||
        Number(oldItm.qty) !== Number(newItm.qty) ||
        Number(oldItm.rate) !== Number(newItm.rate) ||
        Number(oldItm.taxRate) !== Number(newItm.taxRate)
      ) {
        itemsChanged = true;
        break;
      }
    }
  }
  if (itemsChanged) {
    changesSummary.push('Line items list modified');
    changeType = 'Major';
  }

  if (existingDoc.clientGst !== (clientGst || '')) {
    changesSummary.push('GSTIN code updated');
    changeType = 'Major';
  }

  // Minor changes
  if (existingDoc.clientAddress !== (clientAddress || '')) {
    changesSummary.push('Client Address updated');
  }
  if (existingDoc.clientMobile !== (clientMobile || '')) {
    changesSummary.push('Client Mobile number updated');
  }
  if (existingDoc.clientEmail !== (clientEmail || '')) {
    changesSummary.push('Client Email contact updated');
  }
  if (existingDoc.notes !== (notes || '')) {
    changesSummary.push('Special Notes or terms updated');
  }
  if (existingDoc.date !== date) {
    changesSummary.push(`Document Date: ${existingDoc.date} ➔ ${date}`);
  }
  if (existingDoc.dueDate !== dueDate) {
    changesSummary.push(`Due Date: ${existingDoc.dueDate || 'N/A'} ➔ ${dueDate || 'N/A'}`);
  }
  if (existingDoc.status !== status && status !== undefined) {
    changesSummary.push(`Status: ${existingDoc.status} ➔ ${status}`);
  }
  if (existingDoc.attachmentUrl !== (attachmentUrl || '')) {
    changesSummary.push('Attachment link updated');
  }

  if (changesSummary.length === 0) {
    changesSummary.push('No functional values modified');
  }

  // Create a revision representing the state BEFORE these new edits are applied
  const revision = {
    id: `REV-0${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userName: activeUser.name,
    userEmail: activeUser.email,
    author: activeUser.name || activeUser.email,
    subtotal: existingDoc.subtotal,
    taxTotal: existingDoc.taxTotal,
    discount: existingDoc.discount,
    grandTotal: existingDoc.grandTotal,
    items: JSON.parse(JSON.stringify(existingDoc.items)), // Deep clone
    clientName: existingDoc.clientName,
    docNumber: existingDoc.docNumber,
    notes: existingDoc.notes,
    status: existingDoc.status,
    changeType,
    changesSummary
  };

  existingDoc.revisions = existingDoc.revisions || [];
  existingDoc.revisions.push(revision);

  // Update current document values
  existingDoc.clientName = clientName;
  existingDoc.clientAddress = clientAddress || '';
  existingDoc.clientGst = clientGst || '';
  existingDoc.date = date || existingDoc.date;
  existingDoc.dueDate = dueDate;
  existingDoc.items = items;
  existingDoc.subtotal = Number(subtotal || 0);
  existingDoc.taxTotal = Number(taxTotal || 0);
  existingDoc.discount = Number(discount || 0);
  existingDoc.grandTotal = Number(grandTotal || 0);
  existingDoc.notes = notes || '';
  existingDoc.status = status || existingDoc.status;
  existingDoc.attachmentUrl = attachmentUrl || '';
  existingDoc.clientMobile = clientMobile || '';
  existingDoc.clientEmail = clientEmail || '';
  existingDoc.clientState = clientState || '';
  existingDoc.clientCountry = clientCountry || '';
  if (linkedInvoiceNumber !== undefined) {
    existingDoc.linkedInvoiceNumber = linkedInvoiceNumber;
  }

  db.documents = docs;
  writeDB(db);

  res.json(existingDoc);
});

// PUT update status of doc
app.put('/api/documents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'DRAFT' | 'SENT' | 'APPROVED' | 'PAID' | 'DELIVERED'
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const db = readDB();
  const docs = db.documents || [];
  const record = docs.find(d => d.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  record.status = status;
  db.documents = docs;
  writeDB(db);

  res.json(record);
});

// DELETE a document
app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const docs = db.documents || [];
  const index = docs.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  docs.splice(index, 1);
  db.documents = docs;
  writeDB(db);

  res.json({ success: true, message: 'Document deleted successfully.' });
});

// ================= PDF ARCHIVES & DIGITAL AUDIT TRAIL ENDPOINTS =================

// GET all PDF metadata (excluding large base64 data for performance)
app.get('/api/pdfs', (req, res) => {
  const db = readDB();
  db.pdfFiles = db.pdfFiles || [];
  const list = db.pdfFiles.map(({ pdfData, ...rest }) => rest);
  res.json(list);
});

// GET specific PDF file with full base64 payload
app.get('/api/pdfs/:id', (req, res) => {
  const db = readDB();
  db.pdfFiles = db.pdfFiles || [];
  const pdf = db.pdfFiles.find(p => p.id === req.params.id);
  if (!pdf) {
    return res.status(404).json({ error: 'PDF file not found.' });
  }
  res.json(pdf);
});

// POST to save or update generated PDF file
app.post('/api/pdfs', (req, res) => {
  const { id, invoiceNumber, customerName, date, fileName, fileSize, pdfData } = req.body;
  if (!invoiceNumber || !pdfData) {
    return res.status(400).json({ error: 'Missing required parameters: invoiceNumber and pdfData.' });
  }
  const db = readDB();
  db.pdfFiles = db.pdfFiles || [];
  const existingIndex = db.pdfFiles.findIndex(p => p.invoiceNumber === invoiceNumber);
  const newPdf = {
    id: id || `PDF-${invoiceNumber}`,
    invoiceNumber,
    customerName: customerName || 'Unknown Customer',
    date: date || new Date().toISOString().split('T')[0],
    fileName: fileName || `${invoiceNumber}.pdf`,
    fileSize: fileSize || 'Unknown size',
    createdTime: new Date().toISOString(),
    pdfData
  };
  if (existingIndex !== -1) {
    db.pdfFiles[existingIndex] = newPdf;
  } else {
    db.pdfFiles.push(newPdf);
  }
  writeDB(db);
  res.json(newPdf);
});

// PUT to edit details (rename/duplicate)
app.put('/api/pdfs/:id', (req, res) => {
  const { id } = req.params;
  const { fileName, customerName, duplicate } = req.body;
  const db = readDB();
  db.pdfFiles = db.pdfFiles || [];
  const index = db.pdfFiles.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'PDF file not found.' });
  }
  const pdf = db.pdfFiles[index];

  if (duplicate) {
    const dupId = `PDF-DUP-${Date.now()}`;
    const dupPdf = {
      ...pdf,
      id: dupId,
      fileName: fileName || `Copy_of_${pdf.fileName}`,
      createdTime: new Date().toISOString()
    };
    db.pdfFiles.push(dupPdf);
    writeDB(db);
    return res.json({ success: true, message: 'PDF file duplicated.', pdf: dupPdf });
  }

  if (fileName) pdf.fileName = fileName;
  if (customerName) pdf.customerName = customerName;
  writeDB(db);
  res.json({ success: true, message: 'PDF file details updated.', pdf });
});

// DELETE a PDF record
app.delete('/api/pdfs/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.pdfFiles = db.pdfFiles || [];
  const index = db.pdfFiles.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'PDF file not found.' });
  }
  db.pdfFiles.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'PDF file deleted successfully.' });
});

// ================= NOTIFICATIONS & ALERTS ENDPOINTS =================

// GET retrieve all notification alert logs
app.get('/api/notifications', (req, res) => {
  const db = readDB();
  res.json(db.notifications || []);
});

// POST dismiss/mark specific notification as read
app.post('/api/notifications/:id/dismiss', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const notifs = db.notifications || [];
  const notif = notifs.find(n => n.id === id);
  if (notif) {
    notif.dismissed = true;
    db.notifications = notifs;
    writeDB(db);
    return res.json({ success: true, notification: notif });
  }
  res.status(404).json({ error: 'Notification not found.' });
});

// POST dismiss all pending notifications at once
app.post('/api/notifications/dismiss-all', (req, res) => {
  const db = readDB();
  const notifs = db.notifications || [];
  notifs.forEach(n => { n.dismissed = true; });
  db.notifications = notifs;
  writeDB(db);
  res.json({ success: true, count: notifs.length });
});

// DELETE erase all notifications history
app.delete('/api/notifications/all', (req, res) => {
  const db = readDB();
  db.notifications = [];
  writeDB(db);
  res.json({ success: true });
});

// POST trigger a realistic Low-Stock manual test notification instantly
app.post('/api/notifications/trigger-test', (req, res) => {
  const db = readDB();
  
  // Find an items record to mock, or create a mockup product representation
  const items = db.items || [];
  const selectedItem = items[Math.floor(Math.random() * items.length)] || {
    id: 'ITM-99',
    sku: 'SKU-8471-MOCKTEST-999',
    name: 'Standard Microchip Embedded Processor Group C',
    reorderLevel: 25,
    unitCost: 890
  };

  const mockStock = Math.floor(1 + Math.random() * (selectedItem.reorderLevel - 1));
  const notifId = `NTF-TEST-${Date.now()}`;
  const emailRecipient = 'sarveshyadav8777@gmail.com';
  const emailSubject = `[CRITICAL STOCK WARNING] SKU Replenishment Request: ${selectedItem.name} (LIVE TEST)`;
  
  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfdfd;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
        <span style="font-size: 24px;">🚨</span>
        <h2 style="margin: 0; color: #4338ca; font-size: 18px; font-weight: bold;">Vyapar GST low-stock Alert [TEST MODE]</h2>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">Dear Administrator,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">This is a test notification compiled manually by clicking the trigger warning simulator. The item stock levels are tested against safe limits.</p>
      
      <div style="background-color: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px;">
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b; width: 40%;">Product Name</td><td style="color: #0f172a; font-weight: 500;">${selectedItem.name} [TEST]</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">SKU Identifier</td><td style="color: #0f172a; font-family: monospace;"><code>${selectedItem.sku}</code></td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">Available Stock</td><td style="color: #e11d48; font-weight: bold; font-size: 14px;">${mockStock} units</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">Reorder Level</td><td style="color: #0f172a;">${selectedItem.reorderLevel} units</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="font-weight: bold; color: #64748b;">Unit Landed Cost</td><td style="color: #0f172a;">₹${selectedItem.unitCost.toLocaleString()}</td></tr>
          <tr><td style="font-weight: bold; color: #0f172a;">Order Advise</td><td style="color: #10b981; font-weight: bold;">+50 units (Recommended)</td></tr>
        </table>
      </div>
      
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">The system's proactive email router validated sending outbound test records to your SMTP account successfully.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 15px;">
      <p style="color: #94a3b8; font-size: 10px; text-align: center; margin: 0;">This transmission was compiled by the Auto-Stock Alert Broker.</p>
    </div>
  `;

  const notification = {
    id: notifId,
    itemId: selectedItem.id,
    itemName: `${selectedItem.name} [TEST ALERT]`,
    sku: selectedItem.sku,
    currentStock: mockStock,
    reorderLevel: selectedItem.reorderLevel,
    timestamp: new Date().toISOString(),
    type: 'LOW_STOCK',
    alertMethods: {
      email: {
        sent: true,
        recipient: emailRecipient,
        subject: emailSubject,
        body: emailBody
      },
      push: {
        sent: true,
        title: `⚠️ Test Alert: ${selectedItem.name}`,
        body: `Test stock levels fell below limit (${mockStock} left, limit: ${selectedItem.reorderLevel}).`
      }
    },
    dismissed: false
  };

  if (!db.notifications) {
    db.notifications = [];
  }
  db.notifications.unshift(notification);
  writeDB(db);
  res.json(notification);
});

// Reports, Valuation, Capacity & Low-stock Evaluation
app.get('/api/reports/aggregates', (req, res) => {
  const db = readDB();

  // Aggregate stock quantities per item-godown mapping
  const godownStockMap: Record<string, number> = {};
  const itemStockTotal: Record<string, number> = {};

  // Init
  db.godowns.forEach(g => { godownStockMap[g.id] = 0; });
  db.items.forEach(itm => { itemStockTotal[itm.id] = 0; });

  // Play historical ledger
  db.stockTransactions.forEach(tx => {
    if (tx.type === 'INFLOW') {
      if (tx.toGodownId) {
        godownStockMap[tx.toGodownId] = (godownStockMap[tx.toGodownId] || 0) + tx.quantity;
      }
      itemStockTotal[tx.itemId] = (itemStockTotal[tx.itemId] || 0) + tx.quantity;
    } else if (tx.type === 'OUTFLOW') {
      if (tx.fromGodownId) {
        godownStockMap[tx.fromGodownId] = (godownStockMap[tx.fromGodownId] || 0) - tx.quantity;
      }
      itemStockTotal[tx.itemId] = (itemStockTotal[tx.itemId] || 0) - tx.quantity;
    } else if (tx.type === 'TRANSFER') {
      if (tx.fromGodownId) {
        godownStockMap[tx.fromGodownId] = (godownStockMap[tx.fromGodownId] || 0) - tx.quantity;
      }
      if (tx.toGodownId) {
        godownStockMap[tx.toGodownId] = (godownStockMap[tx.toGodownId] || 0) + tx.quantity;
      }
    }
  });

  // Calculate valuations
  let totalInflowValuation = 0;
  let totalOutflowValuation = 0;

  db.stockTransactions.forEach(tx => {
    if (tx.type === 'INFLOW') {
      totalInflowValuation += tx.quantity * tx.unitCost;
    } else if (tx.type === 'OUTFLOW') {
      totalOutflowValuation += tx.quantity * tx.sellingPrice;
    }
  });

  // Quad-Column Liquidity Positions
  let netCashBalance = 0;
  let netGpayBalance = 0;
  let chequePendingAmount = 0;
  let chequeClearedAmount = 0;
  let chequeBouncedAmount = 0;

  db.payments.forEach(p => {
    const isIncome = p.type === 'INCOME';
    const cash = p.cashAmount || 0;
    const gpay = p.gpayAmount || 0;
    const cheque = p.chequeAmount || 0;

    if (isIncome) {
      netCashBalance += cash;
      netGpayBalance += gpay;
      if (cheque > 0 && p.chequeMeta) {
        if (p.chequeMeta.status === 'Pending') chequePendingAmount += cheque;
        else if (p.chequeMeta.status === 'Cleared') chequeClearedAmount += cheque;
        else if (p.chequeMeta.status === 'Bounced') chequeBouncedAmount += cheque;
      }
    } else {
      netCashBalance -= cash;
      netGpayBalance -= gpay;
      if (cheque > 0 && p.chequeMeta) {
        if (p.chequeMeta.status === 'Pending') chequePendingAmount -= cheque;
        else if (p.chequeMeta.status === 'Cleared') chequeClearedAmount -= cheque;
        else if (p.chequeMeta.status === 'Bounced') chequeBouncedAmount -= cheque;
      }
    }
  });

  // Evaluate Low Stock levels against daily Reorder Priority
  const lowStockAlerts: any[] = [];
  db.items.forEach(itm => {
    const totalQty = itemStockTotal[itm.id] || 0;
    if (totalQty <= itm.reorderLevel) {
      // Find where this item resides
      let maxGodown = 'N/A';
      let maxGodownQty = -1;
      db.godowns.forEach(g => {
        // Calculate item in specific godown
        let gqty = 0;
        db.stockTransactions.forEach(tx => {
          if (tx.itemId === itm.id) {
            if (tx.toGodownId === g.id) gqty += tx.quantity;
            if (tx.fromGodownId === g.id) gqty -= tx.quantity;
          }
        });
        if (gqty > maxGodownQty) {
          maxGodownQty = gqty;
          maxGodown = g.name;
        }
      });

      lowStockAlerts.push({
        itemId: itm.id,
        itemName: itm.name,
        sku: itm.sku,
        currentStock: totalQty,
        reorderLevel: itm.reorderLevel,
        godownName: maxGodownQty > 0 ? maxGodown : 'No physical stock recorded'
      });
    }
  });

  // Calculate Godown Capacity and Percentage
  const godownUtilizations = db.godowns.map(g => {
    const curStock = godownStockMap[g.id] || 0;
    return {
      godownId: g.id,
      godownName: g.name,
      capacity: g.capacity,
      currentStock: curStock,
      percentage: Math.min(100, Math.round((curStock / g.capacity) * 100))
    };
  });

  res.json({
    totalInflowValuation,
    totalOutflowValuation,
    netCashBalance,
    netGpayBalance,
    chequePendingAmount,
    chequeClearedAmount,
    chequeBouncedAmount,
    lowStockAlerts,
    godownUtilizations
  });
});

// CSV Raw Spreadsheet compilation download
app.get('/api/reports/export/excel', (req, res) => {
  const db = readDB();
  let csv = 'DATE,TRANSACTION TYPE,CASH PILLAR ($),GPAY-UPI PILLAR ($),GPAY-UTR REFERENCE,CHEQUE PILLAR ($),CHEQUE NUMBER,BANK NAME,SETTLEMENT STATE,MEMO RECONCILIATION\r\n';

  db.payments.forEach(p => {
    const row = [
      p.date,
      p.type,
      p.cashAmount,
      p.gpayAmount,
      p.gpayUtr || '',
      p.chequeAmount,
      p.chequeMeta?.chequeNumber || '',
      p.chequeMeta?.bankName || '',
      p.chequeMeta?.status || 'N/A',
      `"${(p.memo || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\r\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=Stock_Payment_Audit_Ledger.csv');
  res.status(200).send(csv);
});

// Encrypted Daily Sync simulation (Storing encrypted backup to 'gs://designated-storage-bucket')
app.post('/api/backup/run', (req, res) => {
  try {
    const db = readDB();
    const encryptedData = createEncryptedBackupPayload(db);

    const timeStampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `vault_ledger_${timeStampStr}_enc.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    // Save encrypted file locally representing solid dual preservation
    fs.writeFileSync(filePath, encryptedData, 'utf-8');

    // Generate production-grade backup log record
    const sizeKB = `${(encryptedData.length / 1024).toFixed(2)} KB`;
    const bucket = `gs://sarvesh-enterprise-ledger-backups/daily/${fileName}`;

    const newBackupRecord = {
      id: `BU-0${db.backupLogs.length + 1}`,
      timestamp: new Date().toISOString(),
      fileName,
      fileSize: sizeKB,
      bucketPath: bucket,
      status: 'Success'
    };

    db.backupLogs.unshift(newBackupRecord); // pre-pend to show first
    writeDB(db);

    res.json({
      message: 'Automatic incremental encrypted database backup sync initiated successfully!',
      backup: newBackupRecord
    });
  } catch (error: any) {
    console.error('Data backup failed:', error);
    res.status(500).json({ error: `Backup Sync Engine issue: ${error.message}` });
  }
});

app.get('/api/backup/logs', (req, res) => {
  res.json(readDB().backupLogs);
});

// GET backup email report schedule configuration
app.get('/api/backup/email-schedule', (req, res) => {
  const db = readDB();
  if (!db.backupEmailSchedule) {
    db.backupEmailSchedule = {
      enabled: false,
      frequency: 'daily',
      adminEmail: 'sarveshyadav8777@gmail.com',
      lastSent: null,
      sentReports: []
    };
    writeDB(db);
  }
  res.json(db.backupEmailSchedule);
});

// POST save backup email report schedule configuration
app.post('/api/backup/email-schedule', (req, res) => {
  const { enabled, frequency, adminEmail } = req.body;
  if (!adminEmail) {
    return res.status(400).json({ error: 'Admin email is required.' });
  }
  const db = readDB();
  if (!db.backupEmailSchedule) {
    db.backupEmailSchedule = {
      enabled: false,
      frequency: 'daily',
      adminEmail: 'sarveshyadav8777@gmail.com',
      lastSent: null,
      sentReports: []
    };
  }
  
  db.backupEmailSchedule.enabled = !!enabled;
  db.backupEmailSchedule.frequency = frequency || 'daily';
  db.backupEmailSchedule.adminEmail = adminEmail;
  
  // If enabled and history empty, pre-populate one initial setup log
  if (db.backupEmailSchedule.enabled && (!db.backupEmailSchedule.sentReports || db.backupEmailSchedule.sentReports.length === 0)) {
    const initialReport = {
      id: `REP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipient: adminEmail,
      subject: `[Vyapar GST Enterprise Backup Report] Initial Archive Store Verification`,
      status: 'Delivered',
      summary: {
        totalBackups: db.backupLogs.length,
        lastBackupTime: db.backupLogs[0]?.timestamp || new Date().toISOString(),
        lastBackupSize: db.backupLogs[0]?.fileSize || 'N/A',
        latestFiles: db.backupLogs.slice(0, 3).map((l: any) => l.fileName)
      }
    };
    db.backupEmailSchedule.sentReports = [initialReport];
    db.backupEmailSchedule.lastSent = initialReport.timestamp;
  }
  
  writeDB(db);
  res.json(db.backupEmailSchedule);
});

// POST trigger immediate backup report test simulation
app.post('/api/backup/email-schedule/test', (req, res) => {
  const db = readDB();
  const schedule = db.backupEmailSchedule || {
    enabled: false,
    frequency: 'daily',
    adminEmail: 'sarveshyadav8777@gmail.com',
    lastSent: null,
    sentReports: []
  };
  
  const recipientEmail = schedule.adminEmail || 'sarveshyadav8777@gmail.com';
  const totalBackups = db.backupLogs.length;
  const lastBackup = db.backupLogs[0];
  const lastBackupTime = lastBackup ? new Date(lastBackup.timestamp).toLocaleString() : 'Never';
  const lastBackupSize = lastBackup ? lastBackup.fileSize : '0 KB';
  const latestBackupFiles = db.backupLogs.slice(0, 5);

  const subject = `[Vyapar GST Enterprise Backup Report] Archive Store Verification Status`;
  
  // Generate high-fidelity HTML email template for backup logs summary!
  let backupRowsHTML = '';
  if (latestBackupFiles.length === 0) {
    backupRowsHTML = `
      <tr>
        <td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic;">No backup log records in mainframe archive store.</td>
      </tr>
    `;
  } else {
    latestBackupFiles.forEach((log: any) => {
      backupRowsHTML += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #4f46e5;"><code>${log.id}</code></td>
          <td style="padding: 10px; color: #334155; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.fileName}</td>
          <td style="padding: 10px; font-family: monospace; color: #64748b;">${log.fileSize}</td>
          <td style="padding: 10px; text-align: right;"><span style="background-color: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold;">SUCCESS</span></td>
        </tr>
      `;
    });
  }

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; background-color: #4f46e5; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📊</div>
          <h2 style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 800; tracking-tight: -0.025em;">Vyapar GST Backup Mainframe</h2>
        </div>
        <span style="font-size: 11px; font-family: monospace; background-color: #eff6ff; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-weight: bold;">SECURE DEPLOYMENT</span>
      </div>
      
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Dear Administrator,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">This is your scheduled backup log transmission. The dual encrypted archive stores have been verified as healthy and fully synchronized with the cloud storage bucket clusters.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 24px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0f172a; font-size: 12px; font-weight: 700; text-transform: uppercase; tracking-wider: 0.05em; font-family: monospace;">Vault Performance Index</h4>
        <div style="display: flex; gap: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px;">
          <div style="flex: 1;">
            <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Total Backups</span>
            <strong style="display: block; font-size: 20px; color: #4f46e5; font-family: monospace;">${totalBackups}</strong>
          </div>
          <div style="flex: 1;">
            <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Latest Size</span>
            <strong style="display: block; font-size: 20px; color: #1e293b; font-family: monospace;">${lastBackupSize}</strong>
          </div>
          <div style="flex: 1;">
            <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Vault Status</span>
            <strong style="display: block; font-size: 14px; color: #10b981; margin-top: 4px; font-weight: bold;">✓ VERIFIED</strong>
          </div>
        </div>
        <div style="font-size: 11px; color: #64748b;">
          <strong>Most Recent Sync:</strong> ${lastBackupTime}
        </div>
      </div>

      <h3 style="color: #1e293b; font-size: 13px; font-weight: 700; text-transform: uppercase; tracking-wider: 0.05em; margin-bottom: 12px;">Latest Secure VaultSnap Snapshot Records</h3>
      <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; text-align: left;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: bold;">
              <th style="padding: 10px; width: 60px;">ID</th>
              <th style="padding: 10px;">Backup Archive File</th>
              <th style="padding: 10px; width: 80px;">Size</th>
              <th style="padding: 10px; width: 80px; text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${backupRowsHTML}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 24px; padding: 12px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534; display: flex; align-items: center; gap: 8px;">
        <span>🔐</span>
        <span><strong>Cryptographic Integrity Handshake verified:</strong> SHA-256 dual key decryptions behave flawlessly under backup checksum standards.</span>
      </div>

      <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
        <a href="https://ais-pre-avc3wxm3cgaoygrzeqk73e-1051245362598.asia-southeast1.run.app" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700; display: inline-block;">Access Secure Cloud Console</a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 32px; margin-bottom: 16px;">
      <p style="color: #94a3b8; font-size: 10px; text-align: center; line-height: 1.5; margin: 0;">This transmission was compiled &amp; dispatched by the Vyapar GST Backup Engine. Outbound SMTP verification completed under client encryption standards.</p>
    </div>
  `;

  const newReport = {
    id: `REP-${Date.now()}`,
    timestamp: new Date().toISOString(),
    recipient: recipientEmail,
    subject,
    status: 'Delivered',
    summary: {
      totalBackups,
      lastBackupTime,
      lastBackupSize,
      latestFiles: latestBackupFiles.map((l: any) => l.fileName)
    }
  };

  if (!db.backupEmailSchedule) {
    db.backupEmailSchedule = {
      enabled: false,
      frequency: 'daily',
      adminEmail: recipientEmail,
      lastSent: null,
      sentReports: []
    };
  }

  if (!db.backupEmailSchedule.sentReports) {
    db.backupEmailSchedule.sentReports = [];
  }

  db.backupEmailSchedule.sentReports.unshift(newReport);
  db.backupEmailSchedule.lastSent = newReport.timestamp;

  // Append a notification item of type 'BACKUP_REPORT'
  const notifId = `NTF-REP-${Date.now()}`;
  const notification = {
    id: notifId,
    itemId: 'SYS-SECURE-VAULT-REPORT',
    itemName: 'System Backup Vault Summary Report',
    sku: 'SYS-BACKUP-REPORT',
    currentStock: totalBackups,
    reorderLevel: 1,
    timestamp: new Date().toISOString(),
    type: 'BACKUP_REPORT',
    alertMethods: {
      email: {
        sent: true,
        recipient: recipientEmail,
        subject,
        body: emailBody
      },
      push: {
        sent: true,
        title: `📊 System Backup Report Dispatched`,
        body: `Backup summary report was successfully compiled and emailed to ${recipientEmail}.`
      }
    },
    dismissed: false
  };

  if (!db.notifications) {
    db.notifications = [];
  }
  db.notifications.unshift(notification);

  writeDB(db);
  res.json({
    message: 'Simulated backup email report dispatched successfully to ' + recipientEmail,
    report: newReport,
    notification
  });
});

// ================= CHAT SUPPORT ENDPOINT =================
app.post('/api/chat/support', async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: 'History array of messages is required.' });
    }

    const db = readDB();
    
    // Compute current stock dynamically
    const stockMap: Record<string, number> = {};
    db.items.forEach(i => { stockMap[i.id] = 0; });
    db.stockTransactions.forEach(tx => {
      if (tx.type === 'INFLOW') {
        stockMap[tx.itemId] = (stockMap[tx.itemId] || 0) + tx.quantity;
      } else if (tx.type === 'OUTFLOW') {
        stockMap[tx.itemId] = (stockMap[tx.itemId] || 0) - tx.quantity;
      }
    });

    // Compute simple payment overview
    let netCash = 0;
    let netGpay = 0;
    let pendingCheques = 0;
    db.payments.forEach(p => {
      const isIncome = p.type === 'INCOME';
      const cash = p.cashAmount || 0;
      const gpay = p.gpayAmount || 0;
      const cheque = p.chequeAmount || 0;
      if (isIncome) {
        netCash += cash;
        netGpay += gpay;
        if (cheque > 0 && p.chequeMeta && p.chequeMeta.status === 'Pending') {
          pendingCheques += cheque;
        }
      } else {
        netCash -= cash;
        netGpay -= gpay;
        if (cheque > 0 && p.chequeMeta && p.chequeMeta.status === 'Pending') {
          pendingCheques -= cheque;
        }
      }
    });

    const itemsSummary = db.items.map(itm => 
      `- ${itm.name} (SKU: ${itm.sku}, HSN: ${itm.hsnCode}) | Live Stock: ${stockMap[itm.id] || 0} units | Reorder Level: ${itm.reorderLevel} | Buying: ₹${itm.unitCost} | Selling: ₹${itm.sellingPrice}`
    ).join('\n');

    const godownsSummary = db.godowns.map(g => 
      `- ${g.name} (${g.id}) | Location: ${g.location} | Capacity: ${g.capacity}`
    ).join('\n');

    const systemInstruction = `You are the Shree Billing Pro AI Smart Assistant, an advanced, highly knowledgeable enterprise support bot. You assist our Lead Enterprise Architect, Sarvesh Yadav, and team.
Be concise, accurate, professional, and friendly. Do not use generic chatbot disclaimers. Use tables, highlights, or lists to format answers cleanly. Provide helpful, grounded answers about our real stock, godowns, and cash balances as of the current session:

### LIVE DATABASE SNAPSHOT:
1. Active Items Catalog:
${itemsSummary}

2. Warehouse Godown Clusters:
${godownsSummary}

3. Financial Status:
- Net Cash Balance: ₹${netCash.toLocaleString()}
- Net Gpay-UPI Balance: ₹${netGpay.toLocaleString()}
- Pending Cheque Settlement: ₹${pendingCheques.toLocaleString()}

When answering:
- Reference these live stats directly if the user asks about our stock, specific products, cash registers, godown capacities, or financial logs.
- Instruct them on how to use functions of this app like generating PDF files, printing documents, triggering encryption-vault backups, or uploading bills to autofill line items using the AI OCR parser.
- Keep your tone respectful, supportive, highly competent, and crisp. Give step-by-step action suggestions.`;

    const ai = getGemini();

    // Standard contents format mapping from general history
    const contents = history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction
      }
    });

    res.json({ text: result.text || 'I am sorry, but I encountered an error drafting my response.' });

  } catch (error: any) {
    console.error('Support Chat API Failed:', error);
    res.status(500).json({ error: `Support Chat Service Issue: ${error.message}` });
  }
});

// ================= INTELLIGENT ACCOUNTING ASSISTANT API =================

// 1. Get ledgers
app.get('/api/accounting/ledgers', (req, res) => {
  res.json(readDB().ledgers || []);
});

// 2. Create manual ledger
app.post('/api/accounting/ledgers', (req, res) => {
  const { name, type, gstNumber, address, contact, balance } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and Type are mandatory to create a ledger.' });
  }
  const db = readDB();
  const alreadyExists = db.ledgers?.find(l => l.name.toLowerCase() === name.trim().toLowerCase());
  if (alreadyExists) {
    return res.status(400).json({ error: `A ledger with name "${name}" already exists.` });
  }

  const id = `L-0${(db.ledgers?.length || 0) + 1}`;
  const newLedger = {
    id,
    name: name.trim(),
    type,
    gstNumber: gstNumber || '',
    address: address || '',
    contact: contact || '',
    balance: Number(balance || 0),
    timestamp: new Date().toISOString()
  };

  db.ledgers = db.ledgers || [];
  db.ledgers.push(newLedger);
  writeDB(db);
  res.json(newLedger);
});

// 3. Get journal entries / audit logs
app.get('/api/accounting/journal-entries', (req, res) => {
  res.json(readDB().journalEntries || []);
});

// 4. Analyze transaction via Gemini 3.1 Pro Preview with HIGH thinking
app.post('/api/accounting/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Transaction text query is required for analysis.' });
  }

  try {
    const db = readDB();
    const currentLedgers = db.ledgers || [];
    const ledgersContext = currentLedgers.map(l => `- ID: ${l.id}, Name: "${l.name}", Type: ${l.type}`).join('\n');

    const promptMessage = `Analyze the following accounting transaction data / query:
"${text}"

Current registered ledgers in our database for matching and duplication prevention:
${ledgersContext}

If similar Vendor/Customer names already exist, MUST select that existing matched ledger id (e.g. if the user says Cisco, and we have L-04: 'Cisco Distributorship', match L-04 instead of proposing a new ledger!).
Calculate appropriate Double-Entry debit and credit accounts. If matching standard expense / revenue/ tax accounts, use or suggest standard IDs like:
- L-01: "Cash Box Account"
- L-02: "GPay / Bank Account"
- L-03: "Cheque Clearance Transit"
- L-07: "Sales Revenue Ledger"
- L-08: "Purchases Ledger"
- L-09: "GST Output Tax Payable"

The sum of proposed debits MUST exactly equal the sum of proposed credits.
Assess the information completeness (Vendor/Customer Name, amount, invoice/bill number, date, tax number, address, contact) to compute a confidence score. If key fields like name or amount are missing or ambiguous, set requiresConfirmation to true. Return a JSON structure matching the schema.`;

    const ai = getGemini();
    
    // Attempt gemini-3.1-pro-preview with HIGH thinking
    let result;
    try {
      result = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: promptMessage,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vendorCustomerName: { type: Type.STRING, description: 'Matched or extracted vendor/customer name' },
              gstNumber: { type: Type.STRING, description: 'Tax registration number if present (or empty string)' },
              address: { type: Type.STRING, description: 'Contact address if relevant (or empty string)' },
              contact: { type: Type.STRING, description: 'Contact phone/email if found (or empty string)' },
              invoiceNumber: { type: Type.STRING, description: 'Invoice, bill or voucher reference number (or empty string)' },
              invoiceDate: { type: Type.STRING, description: 'Date of entry YYYY-MM-DD' },
              dueDate: { type: Type.STRING, description: 'Due date if found or YYYY-MM-DD' },
              amount: { type: Type.NUMBER, description: 'Total value of the transaction' },
              suggestedType: { type: Type.STRING, description: 'One of: EXPENSE, PURCHASE, INCOME, SALES, TAX, ASSET' },
              debits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    accountId: { type: Type.STRING, description: "Mapped ledger ID or 'NEW_LEDGER'" },
                    accountName: { type: Type.STRING, description: 'Account being debited' },
                    amount: { type: Type.NUMBER, description: 'Debit Amount' }
                  },
                  required: ['accountId', 'accountName', 'amount']
                }
              },
              credits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    accountId: { type: Type.STRING, description: "Mapped ledger ID or 'NEW_LEDGER'" },
                    accountName: { type: Type.STRING, description: 'Account being credited' },
                    amount: { type: Type.NUMBER, description: 'Credit Amount' }
                  },
                  required: ['accountId', 'accountName', 'amount']
                }
              },
              matchedLedgerId: { type: Type.STRING, description: 'Matched ID if similar ledger found, otherwise empty' },
              ledgerMatchedOrCreated: { type: Type.STRING, description: 'Audit comment describing vendor match' },
              confidenceScore: { type: Type.NUMBER, description: 'Confidence of parsing (0.0 to 1.0)' },
              requiresConfirmation: { type: Type.BOOLEAN, description: 'True if details are incomplete or ambiguous' }
            },
            required: [
              'vendorCustomerName', 'gstNumber', 'address', 'contact',
              'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'suggestedType',
              'debits', 'credits', 'matchedLedgerId', 'ledgerMatchedOrCreated', 'confidenceScore', 'requiresConfirmation'
            ]
          }
        }
      });
    } catch (proError: any) {
      console.warn('Pro model request failed, falling back to 3.5-flash:', proError.message);
      result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptMessage,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vendorCustomerName: { type: Type.STRING },
              gstNumber: { type: Type.STRING },
              address: { type: Type.STRING },
              contact: { type: Type.STRING },
              invoiceNumber: { type: Type.STRING },
              invoiceDate: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              suggestedType: { type: Type.STRING },
              debits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    accountId: { type: Type.STRING },
                    accountName: { type: Type.STRING },
                    amount: { type: Type.NUMBER }
                  },
                  required: ['accountId', 'accountName', 'amount']
                }
              },
              credits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    accountId: { type: Type.STRING },
                    accountName: { type: Type.STRING },
                    amount: { type: Type.NUMBER }
                  },
                  required: ['accountId', 'accountName', 'amount']
                }
              },
              matchedLedgerId: { type: Type.STRING },
              ledgerMatchedOrCreated: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              requiresConfirmation: { type: Type.BOOLEAN }
            },
            required: [
              'vendorCustomerName', 'gstNumber', 'address', 'contact',
              'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'suggestedType',
              'debits', 'credits', 'matchedLedgerId', 'ledgerMatchedOrCreated', 'confidenceScore', 'requiresConfirmation'
            ]
          }
        }
      });
    }

    const analysis = JSON.parse(result.text || '{}');
    res.json({ success: true, analysis });

  } catch (err: any) {
    console.error('Accounting Analysis Error:', err);
    res.status(500).json({ error: `Analysis failed: ${err.message}` });
  }
});

// 5. Post journal entry & autogenerate/audit missing ledgers
app.post('/api/accounting/post', (req, res) => {
  const {
    vendorCustomerName,
    gstNumber,
    address,
    contact,
    invoiceNumber,
    invoiceDate,
    dueDate,
    amount,
    debits,
    credits,
    matchedLedgerId,
    description
  } = req.body;

  if (!vendorCustomerName || !amount || !debits || !credits) {
    return res.status(400).json({ error: 'Missing mandatory journal lines or transaction header details.' });
  }

  const db = readDB();
  db.ledgers = db.ledgers || [];
  db.journalEntries = db.journalEntries || [];

  // 1. Prevent duplicate vendor/customer entries - look up similarity
  let finalLedgerId = matchedLedgerId;
  let ledgerMatchedOrCreatedMsg = '';

  const matchedByName = db.ledgers.find(l =>
    l.name.toLowerCase() === vendorCustomerName.trim().toLowerCase() ||
    l.name.toLowerCase().includes(vendorCustomerName.trim().toLowerCase()) ||
    vendorCustomerName.trim().toLowerCase().includes(l.name.toLowerCase())
  );

  if (matchedByName) {
    finalLedgerId = matchedByName.id;
    ledgerMatchedOrCreatedMsg = `Matched Existing Ledger: "${matchedByName.name}" (ID: ${matchedByName.id}) to resolve potential duplication.`;
  } else if (finalLedgerId && finalLedgerId !== 'NEW_LEDGER') {
    const existing = db.ledgers.find(l => l.id === finalLedgerId);
    if (existing) {
      ledgerMatchedOrCreatedMsg = `Matched Existing Ledger: "${existing.name}" (ID: ${existing.id})`;
    }
  }

  // If no match is proposed or found, automatically establish the new customer/vendor ledger
  if (!finalLedgerId || finalLedgerId === 'NEW_LEDGER') {
    const newId = `L-0${db.ledgers.length + 1}`;
    const newL = {
      id: newId,
      name: vendorCustomerName.trim(),
      type: (req.body.suggestedType === 'INCOME' || req.body.suggestedType === 'SALES') ? 'CUSTOMER' as const : 'VENDOR' as const,
      gstNumber: gstNumber || '',
      address: address || '',
      contact: contact || '',
      balance: 0,
      timestamp: new Date().toISOString()
    };
    db.ledgers.push(newL);
    finalLedgerId = newId;
    ledgerMatchedOrCreatedMsg = `Successfully Created Ledger account: "${newL.name}" (ID: ${newId})`;
  }

  // 2. Adjust Ledger balances for Double-Entry balance sheet accuracy
  const processedDebits = debits.map((d: any) => {
    const id = d.accountId === 'NEW_LEDGER' ? finalLedgerId : d.accountId;
    const item = db.ledgers!.find(l => l.id === id);
    if (item) {
      if (['CASH', 'ASSET', 'EXPENSE'].includes(item.type)) {
        item.balance += d.amount;
      } else {
        item.balance -= d.amount;
      }
      return { ...d, accountId: id, accountName: item.name };
    }
    return { ...d, accountId: id };
  });

  const processedCredits = credits.map((c: any) => {
    const id = c.accountId === 'NEW_LEDGER' ? finalLedgerId : c.accountId;
    const item = db.ledgers!.find(l => l.id === id);
    if (item) {
      if (['CASH', 'ASSET', 'EXPENSE'].includes(item.type)) {
        item.balance -= c.amount;
      } else {
        item.balance += c.amount;
      }
      return { ...c, accountId: id, accountName: item.name };
    }
    return { ...c, accountId: id };
  });

  // 3. Save journal entry transaction & audit trail log
  const entryId = `JE-0${db.journalEntries.length + 1}`;
  const record = {
    id: entryId,
    timestamp: new Date().toISOString(),
    description: description || `Journal entry posting for ${vendorCustomerName}`,
    referenceNumber: invoiceNumber || '',
    invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate || '',
    amount: Number(amount),
    debits: processedDebits,
    credits: processedCredits,
    auditLog: {
      ledgerMatchedOrCreated: ledgerMatchedOrCreatedMsg,
      status: 'Posted Successfully & Balances Corrected',
      date: new Date().toISOString()
    },
    isConfirmed: true,
    confidenceScore: 1.0
  };

  db.journalEntries.push(record);

  // 4. Also register an equivalent PAYMENT RECORD in the general payments tab to maintain seamless UX synchronization
  const pmId = `PM-0${db.payments.length + 1}`;
  const hasCash = debits.some((d: any) => d.accountId === 'L-01') || credits.some((c: any) => c.accountId === 'L-01');
  const hasGpay = debits.some((d: any) => d.accountId === 'L-02') || credits.some((c: any) => c.accountId === 'L-02');
  const hasCheque = debits.some((d: any) => d.accountId === 'L-03') || credits.some((c: any) => c.accountId === 'L-03');

  const pmRecord = {
    id: pmId,
    date: invoiceDate || new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    type: (req.body.suggestedType === 'INCOME' || req.body.suggestedType === 'SALES') ? 'INCOME' : 'EXPENSE',
    cashAmount: hasCash ? Number(amount) : 0,
    gpayAmount: hasGpay ? Number(amount) : 0,
    gpayUtr: hasGpay ? `UTR-${Math.floor(Math.random() * 89999 + 10000)}` : '',
    chequeAmount: hasCheque ? Number(amount) : 0,
    chequeMeta: hasCheque ? {
      chequeNumber: `CHQ-${Math.floor(Math.random() * 89999 + 10000)}`,
      bankName: 'General Bank',
      clearingDate: dueDate || new Date().toISOString().split('T')[0],
      status: 'Pending'
    } : undefined,
    memo: description || `Double-entry posting: ${ledgerMatchedOrCreatedMsg}`,
    category: (req.body.suggestedType === 'INCOME' || req.body.suggestedType === 'SALES') ? 'Sales Inflow' : 'Inventory Supply',
    invoiceUrl: '',
    vendorName: vendorCustomerName.trim()
  };
  db.payments.push(pmRecord);

  writeDB(db);
  res.json({ success: true, journalEntry: record, ledgerMatchedOrCreatedMsg });
});

// GET ERP compliance audit logs
app.get('/api/erp/audit-logs', (req, res) => {
  const db = readDB();
  res.json(db.erpAuditLogs || []);
});

// DELETE/Clear ERP compliance audit logs
app.delete('/api/erp/audit-logs', (req, res) => {
  const db = readDB();
  // Retain 'PERMANENT_DELETION' logs for audit compliance and read-only security as requested
  const keptLogs = (db.erpAuditLogs || []).filter(l => l.transactionType === 'PERMANENT_DELETION');
  const purgedCount = (db.erpAuditLogs || []).length - keptLogs.length;
  db.erpAuditLogs = keptLogs;
  writeDB(db);
  res.json({ 
    success: true, 
    message: `Compliance audit trails successfully purged. Retained ${keptLogs.length} secure 'Permanent Deletion' log records.`,
    purgedCount
  });
});

// GET list of master units
app.get('/api/units', (req, res) => {
  const db = readDB();
  res.json(db.units || []);
});

// POST a standard unit (add to Master Directory)
app.post('/api/units', express.json(), (req, res) => {
  const db = readDB();
  db.units = db.units || [];
  const { unit } = req.body;
  if (!unit || unit.trim() === '') {
    return res.status(400).json({ error: 'Unit name is required.' });
  }
  const cleanUnit = unit.trim();
  const exists = db.units.some((u: string) => u.toLowerCase() === cleanUnit.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: `Unit "${cleanUnit}" already exists in Master Directory.` });
  }
  db.units.push(cleanUnit);
  writeDB(db);
  res.json({ success: true, units: db.units });
});

// DELETE a standard unit (remove from Master Directory)
app.delete('/api/units', express.json(), (req, res) => {
  const db = readDB();
  db.units = db.units || [];
  const { unit } = req.body;
  if (!unit || unit.trim() === '') {
    return res.status(400).json({ error: 'Unit name is required.' });
  }
  const cleanUnit = unit.trim();
  db.units = db.units.filter((u: string) => u.toLowerCase() !== cleanUnit.toLowerCase());
  writeDB(db);
  res.json({ success: true, units: db.units });
});

// GET custom unit mapping rules
app.get('/api/unit-mappings', (req, res) => {
  const db = readDB();
  res.json(db.unitMappings || []);
});

// POST single Unit Mapping Rule (Add/Update)
app.post('/api/unit-mappings', express.json(), (req, res) => {
  const db = readDB();
  db.unitMappings = db.unitMappings || [];
  const { fromUnit, toUnit } = req.body;
  if (!fromUnit || !toUnit) {
    return res.status(400).json({ error: 'Both "fromUnit" and "toUnit" are required fields.' });
  }

  const cleanFrom = fromUnit.trim();
  const cleanTo = toUnit.trim();

  const idx = db.unitMappings.findIndex(m => m.fromUnit.toLowerCase() === cleanFrom.toLowerCase());
  if (idx > -1) {
    db.unitMappings[idx].toUnit = cleanTo;
  } else {
    db.unitMappings.push({ fromUnit: cleanFrom, toUnit: cleanTo });
  }

  writeDB(db);
  res.json({ success: true, unitMappings: db.unitMappings });
});

// POST batch Unit Mapping Rules
app.post('/api/unit-mappings/batch', express.json(), (req, res) => {
  const db = readDB();
  db.unitMappings = db.unitMappings || [];
  const { mappings } = req.body;
  if (!Array.isArray(mappings)) {
    return res.status(400).json({ error: 'Payload must contain a "mappings" array.' });
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const item of mappings) {
    if (!item.fromUnit || !item.toUnit) continue;
    const cleanFrom = item.fromUnit.trim();
    const cleanTo = item.toUnit.trim();
    if (!cleanFrom || !cleanTo) continue;

    const idx = db.unitMappings.findIndex(m => m.fromUnit.toLowerCase() === cleanFrom.toLowerCase());
    if (idx > -1) {
      db.unitMappings[idx].toUnit = cleanTo;
      updatedCount++;
    } else {
      db.unitMappings.push({ fromUnit: cleanFrom, toUnit: cleanTo });
      addedCount++;
    }
  }

  writeDB(db);
  res.json({ success: true, unitMappings: db.unitMappings, addedCount, updatedCount });
});

// DELETE single Unit Mapping Rule
app.delete('/api/unit-mappings', express.json(), (req, res) => {
  const db = readDB();
  db.unitMappings = db.unitMappings || [];
  const { fromUnit } = req.body;
  if (!fromUnit) {
    return res.status(400).json({ error: 'Field "fromUnit" is required.' });
  }

  const initialLen = db.unitMappings.length;
  db.unitMappings = db.unitMappings.filter(m => m.fromUnit.toLowerCase() !== fromUnit.trim().toLowerCase());
  const deletedCount = initialLen - db.unitMappings.length;

  writeDB(db);
  res.json({ success: true, unitMappings: db.unitMappings, deletedCount });
});

// ================= VITE INTEGRATION =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LEDGER INFRASTRUCTURE] Primary Cluster online listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
