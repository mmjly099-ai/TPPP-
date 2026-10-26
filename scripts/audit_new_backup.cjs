const fs = require('fs');
const path = require('path');

const newBackupPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');
const newBackup = JSON.parse(fs.readFileSync(newBackupPath, 'utf8'));

console.log('=== NEW BACKUP OVERVIEW ===');
console.log('Format:', newBackup.format);
console.log('Version:', newBackup.version);
console.log('DatasetId:', newBackup.datasetId);
console.log('CreatedAt:', newBackup.createdAt);
const tables = newBackup.tables;
console.log('Table counts:');
for (const key of Object.keys(tables)) {
  console.log(`  ${key}: ${Array.isArray(tables[key]) ? tables[key].length : typeof tables[key]}`);
}

// Check Orders
console.log('\n--- Orders Check ---');
const orderIds = tables.orders.map(o => o.id);
const orderDupes = orderIds.filter((id, index) => orderIds.indexOf(id) !== index);
console.log('Total orders:', tables.orders.length);
console.log('Duplicate order IDs:', orderDupes);

// Check Payments
console.log('\n--- Payments Check ---');
const paymentIds = tables.payments.map(p => p.id);
const paymentDupes = paymentIds.filter((id, index) => paymentIds.indexOf(id) !== index);
console.log('Total payments:', tables.payments.length);
console.log('Duplicate payment IDs:', paymentDupes);

// Check Payments linked to non-existent orders
const nonExistentOrdersInPayments = tables.payments.filter(p => p.orderId && !orderIds.includes(p.orderId));
console.log('Payments linked to non-existent orderId:', nonExistentOrdersInPayments.map(p => ({
  id: p.id,
  receiptNumber: p.receiptNumber,
  orderId: p.orderId,
  customerId: p.customerId,
  amount: p.amount
})));

// Check Financial Transactions
console.log('\n--- Financial Transactions Check ---');
const trxIds = tables.financialTransactions.map(t => t.id);
const trxDupes = trxIds.filter((id, index) => trxIds.indexOf(id) !== index);
console.log('Total transactions:', tables.financialTransactions.length);
console.log('Duplicate trx IDs:', trxDupes);

// Check Journal Entries & Lines
console.log('\n--- Journal Entries Check ---');
const jeIds = tables.journalEntries.map(j => j.id);
const jeDupes = jeIds.filter((id, index) => jeIds.indexOf(id) !== index);
console.log('Total JEs:', tables.journalEntries.length);
console.log('Duplicate JE IDs:', jeDupes);

// Check Journal Entry Debit/Credit balance
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
    unbalancedJEs.push({ id: je.id, entryNumber: je.entryNumber, debit: jeDebit, credit: jeCredit, diff: jeDebit - jeCredit });
  }
}
console.log('Total Debit across JEs:', totalDebit);
console.log('Total Credit across JEs:', totalCredit);
console.log('Difference:', totalDebit - totalCredit);
console.log('Unbalanced JEs count:', unbalancedJEs.length);
if (unbalancedJEs.length > 0) {
  console.log('Unbalanced JEs:', unbalancedJEs);
}

// Check journalLines table vs journalEntries.lines
console.log('\nTotal lines in journalLines table:', tables.journalLines?.length || 0);
let countNestedLines = 0;
for (const je of tables.journalEntries) {
  countNestedLines += (je.lines?.length || 0);
}
console.log('Total nested lines in journalEntries:', countNestedLines);

// Check Customers & customer balance vs orders & payments
console.log('\n--- Customer Balance Reconciliations ---');
for (const c of tables.customers) {
  const cOrders = tables.orders.filter(o => o.customerId === c.id && o.status !== 'cancelled');
  const cOrdersTotal = cOrders.reduce((sum, o) => sum + (Number(o.totalAmount || o.total) || 0), 0);
  const cPayments = tables.payments.filter(p => p.customerId === c.id && p.status !== 'cancelled');
  const cPaymentsTotal = cPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const opBal = Number(c.openingBalance) || 0;
  const netDue = opBal + cOrdersTotal - cPaymentsTotal;
  
  // Ledger debit/credit for customer account (chartAccountId 110 or accountName matching customer)
  let ledgerDebit = 0;
  let ledgerCredit = 0;
  for (const je of tables.journalEntries) {
    if (je.status === 'void') continue;
    for (const l of (je.lines || [])) {
      if (l.chartAccountCode === '110' || l.chartAccountId === 110 || (l.accountName && l.accountName.includes(c.name))) {
        // Check if this line is specifically for this customer
        if (l.accountName && l.accountName.includes(c.name)) {
          const amt = Number(l.amount) || 0;
          if (l.side === 'debit') ledgerDebit += amt;
          else ledgerCredit += amt;
        }
      }
    }
  }
  const ledgerBalance = ledgerDebit - ledgerCredit;
  if (Math.abs(netDue - ledgerBalance) > 0.01) {
    console.log(`Mismatch for [${c.code}] ${c.name}: NetDue=${netDue} (Op=${opBal}, Orders=${cOrdersTotal}, Pay=${cPaymentsTotal}), Ledger=${ledgerBalance} (Dr=${ledgerDebit}, Cr=${ledgerCredit}), Diff=${netDue - ledgerBalance}`);
  }
}
