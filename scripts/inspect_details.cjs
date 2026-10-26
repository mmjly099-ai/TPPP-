const fs = require('fs');
const path = require('path');

const newBackupPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');
const newBackup = JSON.parse(fs.readFileSync(newBackupPath, 'utf8'));
const tables = newBackup.tables;

// 1. Inspect orders for duplicates
console.log('--- Checking Duplicate Orders ---');
const ordersByCustomer = {};
for (const o of tables.orders) {
  const key = `${o.customerId}_${o.orderNumber}_${o.totalAmount}`;
  if (!ordersByCustomer[key]) ordersByCustomer[key] = [];
  ordersByCustomer[key].push(o);
}
for (const key of Object.keys(ordersByCustomer)) {
  if (ordersByCustomer[key].length > 1) {
    console.log(`Duplicate order group [${key}]:`, ordersByCustomer[key].map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      totalAmount: o.totalAmount,
      status: o.status,
      paidAmount: o.paidAmount,
      remainingAmount: o.remainingAmount,
      createdAt: o.createdAt
    })));
  }
}

// 2. Inspect payments
console.log('\n--- Checking Duplicate Payments ---');
const paymentsByReceipt = {};
for (const p of tables.payments) {
  const rct = p.receiptNumber || p.paymentNumber;
  if (!paymentsByReceipt[rct]) paymentsByReceipt[rct] = [];
  paymentsByReceipt[rct].push(p);
}
for (const rct of Object.keys(paymentsByReceipt)) {
  if (paymentsByReceipt[rct].length > 1) {
    console.log(`Duplicate payment receipt [${rct}]:`, paymentsByReceipt[rct].map(p => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: p.amount,
      customerId: p.customerId,
      orderId: p.orderId,
      status: p.status
    })));
  }
}

// 3. Inspect Journal Entries
console.log('\n--- Inspecting JEs with prefix 5791 or 3791 or 2000000 or duplicates ---');
const jeBySource = {};
for (const je of tables.journalEntries) {
  const key = `${je.sourceType}_${je.sourceId}_${je.sourceNumber}`;
  if (!jeBySource[key]) jeBySource[key] = [];
  jeBySource[key].push(je);
}
for (const key of Object.keys(jeBySource)) {
  if (jeBySource[key].length > 1 && key !== 'manual_null_null') {
    console.log(`Duplicate JE for source [${key}]:`, jeBySource[key].map(j => ({
      id: j.id,
      entryNumber: j.entryNumber,
      description: j.description,
      amount: j.lines?.[0]?.amount
    })));
  }
}

// 4. Let's inspect JEs with description includes "حنان علي محسن النجار"
console.log('\n--- Hanan Al-Najjar JEs ---');
const hananJEs = tables.journalEntries.filter(j => j.description && j.description.includes('حنان علي محسن النجار'));
console.log('Total JEs mentioning Hanan Al-Najjar:', hananJEs.length);
for (const j of hananJEs) {
  console.log(`JE ${j.id} (${j.entryNumber}): ${j.description} | Source: ${j.sourceType} ${j.sourceId} | Lines: ${j.lines.length} | Amount: ${j.lines[0]?.amount}`);
}
