const fs = require('fs');
const path = require('path');

const newBackupPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');
const newBackup = JSON.parse(fs.readFileSync(newBackupPath, 'utf8'));
const tables = newBackup.tables;

console.log('Sample of 2000000... entries:');
const sampleJEs = tables.journalEntries.filter(j => String(j.id).startsWith('2000000'));
for (const j of sampleJEs.slice(0, 5)) {
  console.log(`JE ${j.id}: ${j.description}, sourceId=${j.sourceId}`);
  for (const l of j.lines) {
    console.log(`   line: ${l.accountName} | ${l.side} | ${l.amount}`);
  }
}
