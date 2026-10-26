const fs = require('fs');
const path = require('path');

const oldPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-24_15-01_1e3e2044.json');
const newPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');

const oldB = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const newB = JSON.parse(fs.readFileSync(newPath, 'utf8'));

console.log('Old top keys:', Object.keys(oldB));
console.log('New top keys:', Object.keys(newB));
console.log('Old version:', oldB.version, 'createdAt:', oldB.createdAt, 'datasetId:', oldB.datasetId);
console.log('New version:', newB.version, 'createdAt:', newB.createdAt, 'datasetId:', newB.datasetId);

const oldTables = Object.keys(oldB.tables).sort();
const newTables = Object.keys(newB.tables).sort();
console.log('Same table keys?', JSON.stringify(oldTables) === JSON.stringify(newTables));

for (const t of newTables) {
  const oStr = JSON.stringify(oldB.tables[t]);
  const nStr = JSON.stringify(newB.tables[t]);
  if (oStr !== nStr) {
    console.log(`Table ${t} differs! Old length: ${oldB.tables[t]?.length}, New length: ${newB.tables[t]?.length}`);
    // Find first difference
    if (Array.isArray(oldB.tables[t]) && Array.isArray(newB.tables[t])) {
      for (let i = 0; i < Math.max(oldB.tables[t].length, newB.tables[t].length); i++) {
        const itemO = oldB.tables[t][i];
        const itemN = newB.tables[t][i];
        if (JSON.stringify(itemO) !== JSON.stringify(itemN)) {
          console.log(`First diff at index ${i} in ${t}:`);
          console.log('Old:', JSON.stringify(itemO)?.slice(0, 100));
          console.log('New:', JSON.stringify(itemN)?.slice(0, 100));
          break;
        }
      }
    }
  }
}
