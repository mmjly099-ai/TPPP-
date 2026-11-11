import * as XLSX from 'xlsx';
import JSZip from 'jszip';

/**
 * Triggers a file download in the browser from a Blob or URL
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports data to an Excel (.xlsx) file with multiple sheets for tables
 */
export function exportToXlsx(data: any, customFilename?: string): void {
  const wb = XLSX.utils.book_new();
  const tables = data?.tables || data || {};

  const sheetConfigs: { key: string; name: string }[] = [
    { key: 'customers', name: 'العملاء' },
    { key: 'orders', name: 'الطلبات' },
    { key: 'payments', name: 'سندات_القبض' },
    { key: 'expenses', name: 'المصروفات' },
    { key: 'accounts', name: 'المحافظ_والبنوك' },
    { key: 'financialTransactions', name: 'الحركات_المالية' },
    { key: 'couriers', name: 'الموصلين' },
    { key: 'deliveryOrders', name: 'طلبات_التوصيل' },
    { key: 'deliveryCashCollections', name: 'تحصيلات_التوصيل' },
    { key: 'otherReceivables', name: 'مستحقات_أخرى' }
  ];

  let addedSheets = 0;
  for (const conf of sheetConfigs) {
    const list = tables[conf.key];
    if (Array.isArray(list) && list.length > 0) {
      // Flatten complex objects if necessary
      const cleanRows = list.map((item: any) => {
        const flat: Record<string, any> = {};
        for (const [k, v] of Object.entries(item)) {
          if (v !== null && typeof v === 'object') {
            flat[k] = JSON.stringify(v);
          } else {
            flat[k] = v;
          }
        }
        return flat;
      });
      const ws = XLSX.utils.json_to_sheet(cleanRows);
      XLSX.utils.book_append_sheet(wb, ws, conf.name);
      addedSheets++;
    }
  }

  // If no predefined tables matched, try to create from raw data
  if (addedSheets === 0) {
    const defaultData = Array.isArray(data) ? data : [data];
    const ws = XLSX.utils.json_to_sheet(defaultData);
    XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `TOP_STORE_EXPORT_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exports an array of objects to a UTF-8 CSV file with BOM for Arabic excel compatibility
 */
export function exportToCsv(rows: Record<string, any>[], filenamePrefix: string): void {
  if (!rows || rows.length === 0) {
    throw new Error('لا توجد بيانات متاحة للتصدير');
  }

  const headers = Object.keys(rows[0]);
  const csvLines: string[] = [];

  // Header line
  csvLines.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of rows) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === undefined || val === null) return '""';
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    });
    csvLines.push(values.join(','));
  }

  // Prepend UTF-8 BOM (\uFEFF) for proper Arabic rendering in Excel
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().split('T')[0];
  triggerDownload(blob, `${filenamePrefix}_${dateStr}.csv`);
}

/**
 * Exports the full application store into a structured permanent ZIP archive
 */
export async function exportToZip(data: any, customFilename?: string): Promise<void> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = customFilename || `TOP_STORE_FULL_BACKUP_${dateStr}.zip`;

  // 1. Store complete JSON snapshot
  zip.file('backup.json', JSON.stringify(data, null, 2));

  // 2. Separate core tables for granular recovery
  const tables = data?.tables || {};
  const tablesFolder = zip.folder('tables');

  if (tablesFolder) {
    for (const [tableName, tableRows] of Object.entries(tables)) {
      if (Array.isArray(tableRows)) {
        tablesFolder.file(`${tableName}.json`, JSON.stringify(tableRows, null, 2));
      }
    }
  }

  // 3. Metadata summary
  const metadata = {
    exportDate: new Date().toISOString(),
    system: 'TOP STORE Management System',
    schemaVersion: data?.schemaVersion || '1.0',
    tableCounts: Object.entries(tables).reduce((acc, [k, v]) => {
      acc[k] = Array.isArray(v) ? v.length : 0;
      return acc;
    }, {} as Record<string, number>)
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Generate zip file and download
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, filename);
}
