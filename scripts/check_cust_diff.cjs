const fs = require('fs');
const path = require('path');

const newBackupPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');
const newBackup = JSON.parse(fs.readFileSync(newBackupPath, 'utf8'));

const content = fs.readFileSync(path.resolve(__dirname, '../src/data/initialData.ts'), 'utf8');
const marker = 'export const INITIAL_DATA: TopStoreBackup = ';
const startIdx = content.indexOf(marker);
const jsonStart = content.indexOf('{', startIdx);
const jsonEnd = content.lastIndexOf('};');
const jsonStr = content.slice(jsonStart, jsonEnd + 1);
const initialData = JSON.parse(jsonStr);

const initCustIds = new Set(initialData.tables.customers.map(c => c.id));
const newCusts = newBackup.tables.customers.filter(c => !initCustIds.has(c.id));
console.log('Customers in newBackup but not in initialData:', newCusts.map(c => ({ id: c.id, code: c.code, name: c.name })));

// Also check if any customers in initialData are not in newBackup
const newCustIds = new Set(newBackup.tables.customers.map(c => c.id));
const missingCusts = initialData.tables.customers.filter(c => !newCustIds.has(c.id));
console.log('Customers in initialData but not in newBackup:', missingCusts.map(c => ({ id: c.id, code: c.code, name: c.name })));

// Now check orders in newBackup vs initialData
const initOrderIds = new Set(initialData.tables.orders.map(o => o.id));
const newOrders = newBackup.tables.orders.filter(o => !initOrderIds.has(o.id));
console.log('\nOrders in newBackup but not in initialData:', newOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, totalAmount: o.totalAmount })));

// Check payments in newBackup vs initialData
const initPayIds = new Set(initialData.tables.payments.map(p => p.id));
const newPays = newBackup.tables.payments.filter(p => !initPayIds.has(p.id));
console.log('\nPayments in newBackup but not in initialData:', newPays.map(p => ({ id: p.id, receiptNumber: p.receiptNumber, amount: p.amount })));

// Check why TOP 022 and TOP 036 had ledger diffs:
console.log('\n--- Checking TOP 022 (ام عبد الوهاب) in initialData ---');
const c22 = initialData.tables.customers.find(c => c.name.includes('ام عبد الوهاب'));
console.log('Customer:', c22);
for (const je of initialData.tables.journalEntries) {
  for (const l of je.lines) {
    if (l.accountName && l.accountName.includes('ام عبد الوهاب')) {
      console.log(`JE ${je.id} (${je.entryNumber}): ${je.description} | Line: ${l.accountName} | ${l.side} ${l.amount}`);
    }
  }
}

console.log('\n--- Checking TOP 036 (احمد تمام) in initialData ---');
const c36 = initialData.tables.customers.find(c => c.code === 'TOP 036');
console.log('Customer TOP 036:', c36);
const c35 = initialData.tables.customers.find(c => c.code === 'TOP 035');
console.log('Customer TOP 035:', c35);
for (const je of initialData.tables.journalEntries) {
  for (const l of je.lines) {
    if (l.accountName && l.accountName.includes('احمد تمام')) {
      console.log(`JE ${je.id} (${je.entryNumber}): ${je.description} | Line: ${l.accountName} | ${l.side} ${l.amount}`);
    }
  }
}
