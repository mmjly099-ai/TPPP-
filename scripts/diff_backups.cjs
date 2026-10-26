const fs = require('fs');
const path = require('path');

const oldPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-24_15-01_1e3e2044.json');
const newPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');

const oldB = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const newB = JSON.parse(fs.readFileSync(newPath, 'utf8'));

console.log('=== DIFF OLD vs NEW BACKUP ===');
for (const table of Object.keys(newB.tables)) {
  const oldList = oldB.tables[table] || [];
  const newList = newB.tables[table] || [];
  if (Array.isArray(newList)) {
    const oldIds = new Set(oldList.map(x => x.id || x.code || JSON.stringify(x)));
    const newItems = newList.filter(x => !oldIds.has(x.id || x.code || JSON.stringify(x)));
    const newIds = new Set(newList.map(x => x.id || x.code || JSON.stringify(x)));
    const removedItems = oldList.filter(x => !newIds.has(x.id || x.code || JSON.stringify(x)));
    if (newItems.length > 0 || removedItems.length > 0 || oldList.length !== newList.length) {
      console.log(`Table ${table}: Old length=${oldList.length}, New length=${newList.length}`);
      if (newItems.length > 0) {
        console.log(`  Added in new (${newItems.length}):`, newItems.map(x => x.id || x.code || x.orderNumber || x.expenseNumber || x.entryNumber));
      }
      if (removedItems.length > 0) {
        console.log(`  Removed in new (${removedItems.length}):`, removedItems.map(x => x.id || x.code || x.orderNumber || x.expenseNumber || x.entryNumber));
      }
    }
  }
}
