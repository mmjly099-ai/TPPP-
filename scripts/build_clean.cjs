const fs = require('fs');
const path = require('path');

const newBackupPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');
const rawBackup = JSON.parse(fs.readFileSync(newBackupPath, 'utf8'));

const cleaned = JSON.parse(JSON.stringify(rawBackup));
cleaned.format = 'top-store-backup';
cleaned.datasetId = 'top-store-audited-clean-2026-10-25';
cleaned.version = 4;
cleaned.createdAt = '2026-10-25T15:52:00.000Z';

// 1. Clean customers: deduplicate empty duplicates 420002 and 1020001
cleaned.tables.customers = cleaned.tables.customers.filter(c => c.id !== 420002 && c.id !== 1020001);

// 2. Orders: remove duplicate order 1790780597354 (keep 990005)
cleaned.tables.orders = cleaned.tables.orders.filter(o => o.id !== 1790780597354);

// In order 990005, update paidAmount to 36900 and remainingAmount to 9900 (21000 + 1000 + 14900 paid)
const ord9 = cleaned.tables.orders.find(o => o.id === 990005);
if (ord9) {
  ord9.paidAmount = 36900;
  ord9.remainingAmount = 9900;
  ord9.paid = '36900.00';
  ord9.total = '46800.00';
  ord9.totalAmount = 46800;
  ord9.paymentStatus = 'partial';
}

// 3. Payments:
for (const p of cleaned.tables.payments) {
  p.amount = Number(p.amount) || 0;
}

// a) Re-link payment 1791581959055 (RCT-2026-063) to order 990005
const p63 = cleaned.tables.payments.find(p => p.id === 1791581959055);
if (p63) {
  p63.orderId = 990005;
}

// b) Disambiguate duplicate receipt numbers:
// RCT-2026-046 on payment 1791065216032 -> RCT-2026-045
const p45 = cleaned.tables.payments.find(p => p.id === 1791065216032);
if (p45) {
  p45.receiptNumber = 'RCT-2026-045';
}
// RCT-2026-058 on payment 1791563164130 -> RCT-2026-061
const p61 = cleaned.tables.payments.find(p => p.id === 1791563164130);
if (p61) {
  p61.receiptNumber = 'RCT-2026-061';
}

// 4. Financial Transactions:
// Remove corrupted transaction 1791842715753 (16000 YER deposit)
cleaned.tables.financialTransactions = cleaned.tables.financialTransactions.filter(t => t.id !== 1791842715753);
// In transaction 1791581959056 (RCT-2026-063), link to order 990005
const trx63 = cleaned.tables.financialTransactions.find(t => t.id === 1791581959056);
if (trx63) {
  trx63.orderId = 990005;
}

// 5. Journal Entries to delete:
const jeIdsToDelete = new Set([
  // 9 unlinked duplicate payment JEs
  1791581959057, 1791581910582, 1791566565716, 1791566109357, 1791563164150,
  1791403342371, 1791321487830, 1791239656998, 1791239621609,
  // 10 unlinked duplicate order JEs
  1791566565724, 1791566295198, 1791566109366, 1791563706799, 1791563626222,
  1791563164159, 1791562926403, 1791562839369, 1791562577657, 1791321487839,
  // Duplicate order JE for deleted order 1790780597354
  3790780597354,
  // Unlinked manual transaction JE
  1791842715754,
  // Unlinked Halhali order adj
  1791239589272,
  // Erroneous cancelled order JEs
  1792007101815, 1792007466635
]);

cleaned.tables.journalEntries = cleaned.tables.journalEntries.filter(je => !jeIdsToDelete.has(je.id));

// Fix JE 3300001 line 2: other receivable repayment was mistakenly coded as 110 instead of 130
const je330 = cleaned.tables.journalEntries.find(j => j.id === 3300001);
if (je330 && je330.lines[1]) {
  je330.lines[1].chartAccountId = 130;
  je330.lines[1].chartAccountCode = '130';
  je330.lines[1].accountName = 'ذمة مدينة: احمد تمام';
}

// Fix entryNumber on disambiguated payment JEs:
const jeP45 = cleaned.tables.journalEntries.find(j => j.sourceId === 1791065216032 || j.id === 5791065216032);
if (jeP45) {
  jeP45.sourceNumber = 'RCT-2026-045';
  jeP45.entryNumber = 'JE-PAY-RCT-2026-045';
  jeP45.description = jeP45.description.replace('RCT-2026-046', 'RCT-2026-045');
}
const jeP61 = cleaned.tables.journalEntries.find(j => j.sourceId === 1791563164130 || j.id === 5791563164130);
if (jeP61) {
  jeP61.sourceNumber = 'RCT-2026-061';
  jeP61.entryNumber = 'JE-PAY-RCT-2026-061';
  jeP61.description = jeP61.description.replace('RCT-2026-058', 'RCT-2026-061');
}

// Fix descriptions on 2000000... order JEs
for (const je of cleaned.tables.journalEntries) {
  if (String(je.id).startsWith('2000000')) {
    const linkedOrder = cleaned.tables.orders.find(o => o.id === je.sourceId);
    if (linkedOrder) {
      je.description = `فاتورة مبيعات للطلب #${linkedOrder.orderNumber} - العميل: ${linkedOrder.customerName}`;
      je.entryNumber = `JE-ORD-${String(linkedOrder.orderNumber).padStart(4, '0')}-${linkedOrder.id}`;
    }
  }
}

// Sync journalLines table
const allLines = [];
for (const je of cleaned.tables.journalEntries) {
  if (Array.isArray(je.lines)) {
    allLines.push(...je.lines);
  }
}
cleaned.tables.journalLines = allLines;

// Verification
console.log('=== VERIFICATION OF CLEANED DATASET ===');
console.log('Customers count:', cleaned.tables.customers.length);
console.log('Orders count:', cleaned.tables.orders.length);
console.log('Payments count:', cleaned.tables.payments.length);
console.log('JEs count:', cleaned.tables.journalEntries.length);
console.log('Journal Lines count:', cleaned.tables.journalLines.length);

let totalDebit = 0;
let totalCredit = 0;
for (const je of cleaned.tables.journalEntries) {
  for (const l of je.lines) {
    const amt = Number(l.amount) || 0;
    if (l.side === 'debit') totalDebit += amt;
    else if (l.side === 'credit') totalCredit += amt;
  }
}
console.log('Total Debit:', totalDebit);
console.log('Total Credit:', totalCredit);
console.log('Difference:', totalDebit - totalCredit);

let mismatches = 0;
for (const c of cleaned.tables.customers) {
  const cOrders = cleaned.tables.orders.filter(o => o.customerId === c.id && o.status !== 'cancelled');
  const cOrdersTotal = cOrders.reduce((sum, o) => sum + (Number(o.totalAmount || o.total) || 0), 0);
  const cPayments = cleaned.tables.payments.filter(p => p.customerId === c.id && p.status !== 'cancelled');
  const cPaymentsTotal = cPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const opBal = Number(c.openingBalance) || 0;
  const netDue = opBal + cOrdersTotal - cPaymentsTotal;
  
  let ledgerDebit = 0;
  let ledgerCredit = 0;
  for (const je of cleaned.tables.journalEntries) {
    if (je.status === 'void') continue;
    for (const l of (je.lines || [])) {
      if ((l.chartAccountCode === '110' || l.chartAccountId === 110) && l.accountName && (l.accountName.includes(c.name) || l.accountName.includes(c.code))) {
        const amt = Number(l.amount) || 0;
        if (l.side === 'debit') ledgerDebit += amt;
        else ledgerCredit += amt;
      }
    }
  }
  const ledgerBalance = ledgerDebit - ledgerCredit;
  if (Math.abs(netDue - ledgerBalance) > 0.01) {
    mismatches++;
    console.log(`Mismatch for [${c.code}] ${c.name}: NetDue=${netDue}, Ledger=${ledgerBalance}, Diff=${netDue - ledgerBalance}`);
  }
}
console.log('Total customer mismatches:', mismatches);

// Write to src/data/initialData.ts
const targetPath = path.resolve(__dirname, '../src/data/initialData.ts');
const fileContent = `import { TopStoreBackup } from '../types';\n\nexport const INITIAL_DATA: TopStoreBackup = ${JSON.stringify(cleaned, null, 2)};\n`;
fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('Successfully written pristine cleaned dataset to src/data/initialData.ts');
