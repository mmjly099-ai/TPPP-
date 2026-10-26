const fs = require('fs');
const path = require('path');

const newBackupPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');
const newBackup = JSON.parse(fs.readFileSync(newBackupPath, 'utf8'));
const tables = newBackup.tables;

console.log('=== FULL ANALYSIS OF NEW BACKUP ===');
console.log('Orders count:', tables.orders.length);
console.log('Payments count:', tables.payments.length);
console.log('Financial Transactions count:', tables.financialTransactions.length);
console.log('Journal Entries count:', tables.journalEntries.length);

// 1. Let's check each order and what JEs exist for it
const orderJeMap = {};
for (const je of tables.journalEntries) {
  if (je.sourceType === 'order') {
    const sid = je.sourceId ? String(je.sourceId) : 'null';
    if (!orderJeMap[sid]) orderJeMap[sid] = [];
    orderJeMap[sid].push(je);
  }
}
console.log('\nOrders with multiple order-type JEs:');
for (const sid of Object.keys(orderJeMap)) {
  if (orderJeMap[sid].length > 1 && sid !== 'null') {
    console.log(`Order ${sid}: has ${orderJeMap[sid].length} JEs:`, orderJeMap[sid].map(j => ({ id: j.id, entryNumber: j.entryNumber, amount: j.lines[0]?.amount })));
  }
}
if (orderJeMap['null']) {
  console.log(`\nOrder JEs with sourceId === null: ${orderJeMap['null'].length} entries:`);
  for (const j of orderJeMap['null']) {
    console.log(`  JE ${j.id} (${j.entryNumber}): ${j.description} amt=${j.lines[0]?.amount}`);
  }
}

// 2. Let's check each payment and what JEs exist for it
const paymentJeMap = {};
for (const je of tables.journalEntries) {
  if (je.sourceType === 'payment') {
    const sid = je.sourceId ? String(je.sourceId) : 'null';
    if (!paymentJeMap[sid]) paymentJeMap[sid] = [];
    paymentJeMap[sid].push(je);
  }
}
console.log('\nPayments with multiple payment-type JEs:');
for (const sid of Object.keys(paymentJeMap)) {
  if (paymentJeMap[sid].length > 1 && sid !== 'null') {
    console.log(`Payment ${sid}: has ${paymentJeMap[sid].length} JEs:`, paymentJeMap[sid].map(j => ({ id: j.id, entryNumber: j.entryNumber, amount: j.lines[0]?.amount })));
  }
}
if (paymentJeMap['null']) {
  console.log(`\nPayment JEs with sourceId === null: ${paymentJeMap['null'].length} entries:`);
  for (const j of paymentJeMap['null']) {
    console.log(`  JE ${j.id} (${j.entryNumber}): ${j.description} amt=${j.lines[0]?.amount}`);
  }
}

// 3. Let's check manual JEs
const manualJEs = tables.journalEntries.filter(j => j.sourceType === 'manual');
console.log('\nManual JEs count:', manualJEs.length);
