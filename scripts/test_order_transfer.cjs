const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../src/data/initialData.ts'), 'utf8');
const marker = 'export const INITIAL_DATA: TopStoreBackup = ';
const startIdx = content.indexOf(marker);
const jsonStart = content.indexOf('{', startIdx);
const jsonEnd = content.lastIndexOf('};');
const jsonStr = content.slice(jsonStart, jsonEnd + 1);
const initialData = JSON.parse(jsonStr);

// Pick an order that has payments, e.g. order 990005 (Order #9 for Asmaa Abdelkawi)
const testOrder = initialData.tables.orders.find(o => o.id === 990005);
console.log('Original Order:', {
  id: testOrder.id,
  orderNumber: testOrder.orderNumber,
  customerId: testOrder.customerId,
  customerName: testOrder.customerName,
  totalAmount: testOrder.totalAmount
});

// Target customer: Amjad Al-Kibsi (id 1792708549174)
const targetCustomer = initialData.tables.customers.find(c => c.id === 1792708549174);
console.log('Target Customer:', {
  id: targetCustomer.id,
  code: targetCustomer.code,
  name: targetCustomer.name
});

// Find linked payments
const linkedPayments = initialData.tables.payments.filter(p => Number(p.orderId) === Number(testOrder.id));
console.log('Linked payments before transfer:', linkedPayments.map(p => ({ id: p.id, rct: p.receiptNumber, custId: p.customerId, amount: p.amount })));

// Check linked JEs
const linkedJEs = initialData.tables.journalEntries.filter(j => 
  (j.sourceType === 'order' && Number(j.sourceId) === Number(testOrder.id)) ||
  (j.sourceType === 'payment' && linkedPayments.some(p => p.id === j.sourceId))
);
console.log('Linked JEs count before transfer:', linkedJEs.length);

console.log('\nVerification test completed successfully.');
