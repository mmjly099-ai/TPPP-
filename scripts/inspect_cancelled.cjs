const fs = require('fs');
const path = require('path');

const newBackupPath = path.resolve(__dirname, '../public/assets/aistudio/top_store_backup_2026-10-25_15-52_f5ddb71d.json');
const newBackup = JSON.parse(fs.readFileSync(newBackupPath, 'utf8'));
const tables = newBackup.tables;

// Let's inspect JE 1792007101815 and 1792007466635
console.log('--- JE 1792007101815 ---');
console.log(JSON.stringify(tables.journalEntries.find(j => j.id === 1792007101815), null, 2));
console.log('--- JE 1792007466635 ---');
console.log(JSON.stringify(tables.journalEntries.find(j => j.id === 1792007466635), null, 2));
