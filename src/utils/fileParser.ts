import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { ParsedFileData, ParsedSheet, ImportFileType } from '../types/import';

/**
 * Detect file type from filename or MIME
 */
export function detectFileType(fileName: string): ImportFileType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.xls')) return 'xls';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.json')) return 'json';
  return 'xlsx'; // fallback
}

/**
 * Parse an uploaded File object (ZIP, XLSX, XLS, CSV, JSON)
 */
export async function parseImportFile(file: File): Promise<ParsedFileData> {
  const fileType = detectFileType(file.name);
  const fileSize = file.size;
  const fileName = file.name;
  const uploadDate = new Date().toISOString();

  if (fileType === 'zip') {
    return parseZipFile(file, fileName, fileSize, uploadDate);
  } else if (fileType === 'json') {
    return parseJsonFile(file, fileName, fileSize, uploadDate);
  } else {
    return parseSpreadsheetFile(file, fileName, fileSize, fileType, uploadDate);
  }
}

/**
 * Parse ZIP files containing TOP STORE JSON backups or Excel sheets
 */
async function parseZipFile(
  file: File,
  fileName: string,
  fileSize: number,
  uploadDate: string
): Promise<ParsedFileData> {
  const jszip = new JSZip();
  let zip: JSZip;
  try {
    zip = await jszip.loadAsync(file);
  } catch (err: any) {
    throw new Error(`تعذر فك ضغط ملف ZIP. تأكد من سلامة الملف المضغوط: ${err?.message || ''}`);
  }

  // 1. Look for .json files (e.g. top-store-accounting-permanent.json or top_store_backup_*.json)
  const jsonFileNames = Object.keys(zip.files).filter(
    name => !zip.files[name].dir && name.toLowerCase().endsWith('.json') && !name.includes('__MACOSX')
  );

  if (jsonFileNames.length > 0) {
    const targetJsonName =
      jsonFileNames.find(n => n.includes('permanent') || n.includes('backup') || n.includes('top') || n.includes('store')) ||
      jsonFileNames[0];
    const fileEntry = zip.file(targetJsonName);
    if (fileEntry) {
      const text = await fileEntry.async('string');
      try {
        const parsed = JSON.parse(text);
        const result = buildParsedFileDataFromJson(parsed, fileName, fileSize, uploadDate);
        result.fileType = 'zip';
        return result;
      } catch (err: any) {
        console.warn('Could not parse inner JSON in ZIP:', err);
      }
    }
  }

  // 2. Look for .xlsx or .xls or .csv inside ZIP
  const spreadsheetNames = Object.keys(zip.files).filter(
    name =>
      !zip.files[name].dir &&
      (name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls') || name.toLowerCase().endsWith('.csv')) &&
      !name.includes('__MACOSX')
  );

  if (spreadsheetNames.length > 0) {
    const targetSpreadsheetName = spreadsheetNames[0];
    const fileEntry = zip.file(targetSpreadsheetName);
    if (fileEntry) {
      const arrayBuffer = await fileEntry.async('arraybuffer');
      const wb = XLSX.read(new Uint8Array(arrayBuffer), {
        type: 'array',
        cellDates: true,
        raw: false
      });
      const result = buildParsedFileDataFromWorkbook(wb, fileName, fileSize, 'zip', uploadDate);
      return result;
    }
  }

  throw new Error('لم يتم العثور على ملفات محاسبية صالحة (JSON أو Excel) داخل هذا الملف المضغوط ZIP.');
}

/**
 * Build ParsedFileData from parsed JSON object
 */
function buildParsedFileDataFromJson(
  parsed: any,
  fileName: string,
  fileSize: number,
  uploadDate: string
): ParsedFileData {
  // Check if native TOP STORE backup
  const isTopStoreNative = !!(
    parsed &&
    typeof parsed === 'object' &&
    (parsed.format === 'top-store-backup' || (parsed.tables && typeof parsed.tables === 'object'))
  );

  const sheets: ParsedSheet[] = [];

  if (isTopStoreNative && parsed.tables) {
    const tableKeys = Object.keys(parsed.tables);
    for (const key of tableKeys) {
      const records = parsed.tables[key];
      if (Array.isArray(records) && records.length > 0) {
        const headers = Array.from(
          new Set(records.flatMap(r => (typeof r === 'object' && r !== null ? Object.keys(r) : [])))
        );
        sheets.push({
          sheetName: translateTableKeyToSheetName(key),
          headers,
          rows: records,
          totalRows: records.length
        });
      }
    }
  } else if (Array.isArray(parsed)) {
    const headers = Array.from(
      new Set(parsed.flatMap(r => (typeof r === 'object' && r !== null ? Object.keys(r) : [])))
    );
    sheets.push({
      sheetName: 'البيانات المستوردة',
      headers,
      rows: parsed,
      totalRows: parsed.length
    });
  } else if (typeof parsed === 'object' && parsed !== null) {
    let foundArray = false;
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value) && value.length > 0) {
        foundArray = true;
        const headers = Array.from(
          new Set(value.flatMap(r => (typeof r === 'object' && r !== null ? Object.keys(r) : [])))
        );
        sheets.push({
          sheetName: translateTableKeyToSheetName(key),
          headers,
          rows: value,
          totalRows: value.length
        });
      }
    }
    if (!foundArray) {
      sheets.push({
        sheetName: 'سجل واحد',
        headers: Object.keys(parsed),
        rows: [parsed],
        totalRows: 1
      });
    }
  }

  return {
    fileName,
    fileSize,
    fileType: 'json',
    uploadDate,
    sheets,
    isTopStoreNative,
    rawNativeData: isTopStoreNative ? parsed : undefined
  };
}

/**
 * Parse JSON files (supporting both TOP STORE native backups and general JSON arrays)
 */
async function parseJsonFile(
  file: File,
  fileName: string,
  fileSize: number,
  uploadDate: string
): Promise<ParsedFileData> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`تعذر قراءة ملف JSON. تأكد من أن الملف سليم ولا يحتوي على أخطاء صياغة: ${err?.message || ''}`);
  }

  return buildParsedFileDataFromJson(parsed, fileName, fileSize, uploadDate);
}

/**
 * Build ParsedFileData from SheetJS Workbook
 */
function buildParsedFileDataFromWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  fileSize: number,
  fileType: ImportFileType,
  uploadDate: string
): ParsedFileData {
  const sheets: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
      blankrows: false
    });

    if (rawRows.length === 0) continue;

    const headersSet = new Set<string>();
    for (const row of rawRows) {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach(k => {
          const cleanK = k.trim();
          if (cleanK) headersSet.add(cleanK);
        });
      }
    }

    const headers = Array.from(headersSet);

    const cleanedRows = rawRows
      .map(row => {
        const cleanRow: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
          const trimmedKey = key.trim();
          if (trimmedKey) {
            cleanRow[trimmedKey] = typeof val === 'string' ? val.trim() : val;
          }
        }
        return cleanRow;
      })
      .filter(row => {
        return Object.values(row).some(v => v !== '' && v !== null && v !== undefined);
      });

    if (cleanedRows.length > 0) {
      sheets.push({
        sheetName,
        headers,
        rows: cleanedRows,
        totalRows: cleanedRows.length
      });
    }
  }

  if (sheets.length === 0) {
    throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات قابلة للقراءة.');
  }

  return {
    fileName,
    fileSize,
    fileType,
    uploadDate,
    sheets,
    isTopStoreNative: false
  };
}

/**
 * Parse Excel (XLSX, XLS) or CSV file with SheetJS
 */
async function parseSpreadsheetFile(
  file: File,
  fileName: string,
  fileSize: number,
  fileType: ImportFileType,
  uploadDate: string
): Promise<ParsedFileData> {
  const arrayBuffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;

  try {
    if (fileType === 'csv') {
      const uint8 = new Uint8Array(arrayBuffer);
      let csvContent = '';
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        csvContent = decoder.decode(uint8);
      } catch {
        try {
          const decoder = new TextDecoder('windows-1256');
          csvContent = decoder.decode(uint8);
        } catch {
          const decoder = new TextDecoder('utf-8');
          csvContent = decoder.decode(uint8);
        }
      }

      workbook = XLSX.read(csvContent, {
        type: 'string',
        raw: false,
        cellDates: true,
        codepage: 65001
      });
    } else {
      workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        raw: false,
        codepage: 65001
      });
    }
  } catch (err: any) {
    throw new Error(`تعذر فك ترميز ملف Excel/CSV. يرجى التأكد من سلامة الملف وصيغته: ${err?.message || ''}`);
  }

  return buildParsedFileDataFromWorkbook(workbook, fileName, fileSize, fileType, uploadDate);
}

/**
 * Translate database table names to friendly Arabic sheet names
 */
function translateTableKeyToSheetName(key: string): string {
  const map: Record<string, string> = {
    customers: 'العملاء',
    orders: 'الطلبات',
    payments: 'المدفوعات وسندات القبض',
    expenses: 'المصروفات',
    accounts: 'المحافظ والبنوك',
    purchaseBatches: 'دفعات المشتريات',
    financialTransactions: 'الحركات المالية',
    journalEntries: 'قيود اليومية',
    otherReceivables: 'الذمم المدينة والأصول والسلف',
    installmentPlans: 'نظام الدفعات والأقساط',
    shipments: 'الشحنات',
    marketingCampaigns: 'الحملات التسويقية',
    marketingChannels: 'القنوات التسويقية',
    owners: 'حقوق الملكية والشركاء',
    appSettings: 'إعدادات النظام'
  };
  return map[key] || key;
}
