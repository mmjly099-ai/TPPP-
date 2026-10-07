import {
  TargetEntity,
  FieldMapping,
  ImportValidationResult,
  ImportValidationIssue,
  ImportPreviewRecord,
  DeduplicationMode
} from '../types/import';
import { Customer, Order, Payment, Expense, Account, PurchaseBatch, OtherReceivable } from '../types';

interface ExistingStoreData {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  accounts: Account[];
  purchaseBatches: PurchaseBatch[];
  otherReceivables: OtherReceivable[];
}

/**
 * Clean phone number to core digits for robust matching
 */
export function normalizePhoneNumber(phone: any): string {
  if (!phone) return '';
  const str = String(phone).replace(/[^\d]/g, '');
  // If Yemen local 9 digits (starts with 7) or international 9677...
  if (str.startsWith('967') && str.length >= 12) {
    return str.substring(3);
  }
  return str;
}

/**
 * Parse numeric values safely from strings like "4,500.00 ر.ي"
 */
export function parseNumberSafe(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val)
    .replace(/[^\d.-]/g, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalize date strings or Excel date serials
 */
export function parseDateSafe(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // Excel serial date number
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + val * 86400000);
    return date.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }
  // Check if YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(str)) {
    const parts = str.split('/');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  // Check if DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Validate imported rows against database and mappings
 */
export function validateImportBatch(
  entity: TargetEntity,
  rows: Record<string, any>[],
  mappings: FieldMapping[],
  existingData: ExistingStoreData,
  deduplicationMode: DeduplicationMode
): ImportValidationResult {
  const issues: ImportValidationIssue[] = [];
  const previewRecords: ImportPreviewRecord[] = [];

  let readyCount = 0;
  let reviewCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  // Active mappings (ignoring __skip__)
  const activeMappings = mappings.filter(m => m.targetField !== '__skip__');

  // Track duplicates within the file itself
  const seenKeysInFile = new Set<string>();

  for (let idx = 0; idx < rows.length; idx++) {
    const rawRow = rows[idx];
    const rowNumber = idx + 1;
    const mappedRecord: Record<string, any> = {};

    // Apply mappings
    for (const mapping of activeMappings) {
      const rawVal = rawRow[mapping.fileColumn];
      mappedRecord[mapping.targetField] = rawVal;
    }

    let hasError = false;
    let hasWarning = false;
    let isDuplicate = false;
    let issueMsg = '';
    let duplicateMatchField = '';

    // Entity-specific validation & duplicate detection
    if (entity === 'customers') {
      const name = String(mappedRecord.name || '').trim();
      const phone = normalizePhoneNumber(mappedRecord.phone);
      const code = String(mappedRecord.code || '').trim();

      if (!name) {
        hasError = true;
        issueMsg = 'اسم العميل فارغ';
        issues.push({ rowNumber, entity, field: 'name', type: 'error', message: issueMsg });
      }

      if (!phone) {
        hasWarning = true;
        issueMsg = issueMsg || 'رقم الهاتف غير محدد';
        issues.push({ rowNumber, entity, field: 'phone', type: 'warning', message: 'رقم هاتف العميل غير متوفر' });
      }

      // Check duplicates
      const dupKey = phone ? `phone:${phone}` : `name:${name}`;
      if (seenKeysInFile.has(dupKey)) {
        isDuplicate = true;
        duplicateMatchField = phone ? 'رقم الهاتف (مكرر بالملف)' : 'الاسم (مكرر بالملف)';
      } else {
        seenKeysInFile.add(dupKey);
      }

      // Check against existing DB
      const existingCustomer = existingData.customers.find(
        c => (phone && normalizePhoneNumber(c.phone) === phone) || (code && c.code.toLowerCase() === code.toLowerCase())
      );

      if (existingCustomer) {
        isDuplicate = true;
        duplicateMatchField = existingCustomer.code ? `كود العميل: ${existingCustomer.code}` : `الهاتف: ${existingCustomer.phone}`;
        issueMsg = `العميل موجود مسبقاً (${existingCustomer.name} - ${existingCustomer.code})`;
        issues.push({
          rowNumber,
          entity,
          field: 'phone',
          type: 'duplicate',
          message: `عميل موجود مسبقاً في النظام: ${existingCustomer.name}`
        });
      }
    } else if (entity === 'orders') {
      const orderNumber = String(mappedRecord.orderNumber || '').trim();
      const totalAmount = parseNumberSafe(mappedRecord.totalAmount);
      const customerName = String(mappedRecord.customerName || '').trim();
      const customerPhone = normalizePhoneNumber(mappedRecord.customerPhone);

      if (!orderNumber && !mappedRecord.site) {
        hasError = true;
        issueMsg = 'رقم الطلب فارغ';
        issues.push({ rowNumber, entity, field: 'orderNumber', type: 'error', message: 'رقم الطلب فارغ' });
      }

      if (totalAmount <= 0) {
        hasWarning = true;
        issueMsg = issueMsg || 'إجمالي الطلب 0 أو غير محدد';
        issues.push({ rowNumber, entity, field: 'totalAmount', type: 'warning', message: 'المبلغ الإجمالي 0 ريال' });
      }

      if (!customerName && !customerPhone && !mappedRecord.customerCode) {
        hasWarning = true;
        issueMsg = issueMsg || 'طلب بدون عميل محدد';
        issues.push({ rowNumber, entity, field: 'customerName', type: 'warning', message: 'طلب بدون تحديد اسم أو هاتف العميل' });
      }

      // Duplicate check
      if (orderNumber) {
        if (seenKeysInFile.has(`order:${orderNumber}`)) {
          isDuplicate = true;
          duplicateMatchField = 'رقم الطلب مكرر بالملف';
        } else {
          seenKeysInFile.add(`order:${orderNumber}`);
        }

        const existingOrder = existingData.orders.find(o => String(o.orderNumber).trim().toLowerCase() === orderNumber.toLowerCase());
        if (existingOrder) {
          isDuplicate = true;
          duplicateMatchField = `رقم الطلب: ${existingOrder.orderNumber}`;
          issueMsg = `طلب موجود مسبقاً في النظام (#${existingOrder.orderNumber})`;
          issues.push({
            rowNumber,
            entity,
            field: 'orderNumber',
            type: 'duplicate',
            message: `طلب مسجل مسبقاً في النظام برقم #${existingOrder.orderNumber}`
          });
        }
      }
    } else if (entity === 'payments') {
      const amount = parseNumberSafe(mappedRecord.amount);
      const paymentNumber = String(mappedRecord.paymentNumber || '').trim();

      if (amount <= 0) {
        hasError = true;
        issueMsg = 'مبلغ السند 0 أو غير صالح';
        issues.push({ rowNumber, entity, field: 'amount', type: 'error', message: 'المبلغ يجب أن يكون أكبر من صفر' });
      }

      if (paymentNumber) {
        const existingPayment = existingData.payments.find(p => p.paymentNumber === paymentNumber);
        if (existingPayment) {
          isDuplicate = true;
          duplicateMatchField = `رقم السند: ${paymentNumber}`;
          issueMsg = `سند قبض مسجل مسبقاً (${paymentNumber})`;
        }
      }
    } else if (entity === 'expenses') {
      const amount = parseNumberSafe(mappedRecord.amount);
      const category = String(mappedRecord.category || '').trim();

      if (amount <= 0) {
        hasError = true;
        issueMsg = 'مبلغ المصروف غير صالح';
        issues.push({ rowNumber, entity, field: 'amount', type: 'error', message: 'مبلغ المصروف غير صالح' });
      }

      if (!category) {
        hasWarning = true;
        mappedRecord.category = 'تشغيل';
        issueMsg = issueMsg || 'تم تعيين بند المصروف افتراضياً إلى (تشغيل)';
      }
    } else if (entity === 'accounts') {
      const name = String(mappedRecord.name || '').trim();
      if (!name) {
        hasError = true;
        issueMsg = 'اسم المحفظة أو البنك فارغ';
        issues.push({ rowNumber, entity, field: 'name', type: 'error', message: 'اسم الحساب مطلوب' });
      } else {
        const existingAcc = existingData.accounts.find(a => a.name.trim().toLowerCase() === name.toLowerCase());
        if (existingAcc) {
          isDuplicate = true;
          duplicateMatchField = `اسم الحساب: ${existingAcc.name}`;
          issueMsg = `الحساب موجود مسبقاً في النظام (${existingAcc.name})`;
        }
      }
    } else {
      // General fallback validation
      const firstVal = Object.values(mappedRecord)[0];
      if (!firstVal) {
        hasWarning = true;
        issueMsg = 'سجل يحتوي على حقول فارغة';
      }
    }

    // Determine overall status
    let status: 'ready' | 'review' | 'duplicate' | 'error' = 'ready';
    if (hasError) {
      status = 'error';
      errorCount++;
    } else if (isDuplicate) {
      status = 'duplicate';
      duplicateCount++;
    } else if (hasWarning) {
      status = 'review';
      reviewCount++;
    } else {
      readyCount++;
    }

    previewRecords.push({
      rowNumber,
      entity,
      data: mappedRecord,
      status,
      issueMessage: issueMsg,
      duplicateMatchField
    });
  }

  return {
    totalRows: rows.length,
    readyCount,
    reviewCount,
    duplicateCount,
    errorCount,
    entityBreakdown: {
      customers: entity === 'customers' ? rows.length : 0,
      orders: entity === 'orders' ? rows.length : 0,
      payments: entity === 'payments' ? rows.length : 0,
      expenses: entity === 'expenses' ? rows.length : 0,
      accounts: entity === 'accounts' ? rows.length : 0,
      purchaseBatches: entity === 'purchaseBatches' ? rows.length : 0,
      financialTransactions: entity === 'financialTransactions' ? rows.length : 0,
      otherReceivables: entity === 'otherReceivables' ? rows.length : 0
    },
    issues,
    previewRecords
  };
}
