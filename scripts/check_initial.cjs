const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../src/data/initialData.ts'), 'utf8');
const marker = 'export const INITIAL_DATA: TopStoreBackup = ';
const startIdx = content.indexOf(marker);
const jsonStart = content.indexOf('{', startIdx);
const jsonEnd = content.lastIndexOf('};');
const jsonStr = content.slice(jsonStart, jsonEnd + 1);
const initialData = JSON.parse(jsonStr);

console.log('=== CURRENT INITIAL_DATA AUDIT ===');
console.log('Format:', initialData.format);
console.log('Version:', initialData.version);
console.log('DatasetId:', initialData.datasetId);
console.log('CreatedAt:', initialData.createdAt);

const tables = initialData.tables;
console.log('\nTable counts:');
for (const k of Object.keys(tables)) {
  console.log(`  ${k}: ${Array.isArray(tables[k]) ? tables[k].length : typeof tables[k]}`);
}

// Check Orders
const orderIds = tables.orders.map(o => o.id);
const orderDupes = orderIds.filter((id, index) => orderIds.indexOf(id) !== index);
console.log('\nTotal orders:', tables.orders.length);
console.log('Duplicate order IDs:', orderDupes);

// Check Payments
const paymentIds = tables.payments.map(p => p.id);
const paymentDupes = paymentIds.filter((id, index) => paymentIds.indexOf(id) !== index);
console.log('\nTotal payments:', tables.payments.length);
console.log('Duplicate payment IDs:', paymentDupes);

// Check Journal Entries
const jeIds = tables.journalEntries.map(j => j.id);
const jeDupes = jeIds.filter((id, index) => jeIds.indexOf(id) !== index);
console.log('\nTotal JEs:', tables.journalEntries.length);
console.log('Duplicate JE IDs:', jeDupes);

// Check Journal Entry Balance
let totalDebit = 0;
let totalCredit = 0;
let unbalancedJEs = [];
for (const je of tables.journalEntries) {
  let jeDebit = 0;
  let jeCredit = 0;
  for (const line of (je.lines || [])) {
    const amt = Number(line.amount) || 0;
    if (line.side === 'debit') jeDebit += amt;
    else if (line.side === 'credit') jeCredit += amt;
  }
  totalDebit += jeDebit;
  totalCredit += jeCredit;
  if (Math.abs(jeDebit - jeCredit) > 0.01) {
    unbalancedJEs.push({ id: je.id, entryNumber: je.entryNumber, debit: jeDebit, credit: jeCredit });
  }
}
console.log('\nTotal Debit across JEs:', totalDebit);
console.log('Total Credit across JEs:', totalCredit);
console.log('Difference:', totalDebit - totalCredit);
console.log('Unbalanced JEs count:', unbalancedJEs.length);

// Check customer reconciliations
console.log('\n--- Customer Reconciliations on INITIAL_DATA ---');
let mismatches = 0;
for (const c of tables.customers) {
  const cOrders = tables.orders.filter(o => o.customerId === c.id && o.status !== 'cancelled');
  const cOrdersTotal = cOrders.reduce((sum, o) => sum + (Number(o.totalAmount || o.total) || 0), 0);
  const cPayments = tables.payments.filter(p => p.customerId === c.id && p.status !== 'cancelled');
  const cPaymentsTotal = cPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const opBal = Number(c.openingBalance) || 0;
  const netDue = opBal + cOrdersTotal - cPaymentsTotal;
  
  let ledgerDebit = 0;
  let ledgerCredit = 0;
  for (const je of tables.journalEntries) {
    if (je.status === 'void') continue;
    for (const l of (je.lines || [])) {
      if (l.accountName && l.accountName.includes(c.name)) {
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
console.log('Total customer mismatches in INITIAL_DATA:', mismatches);
