import { TargetEntity, TargetFieldDef, FieldMapping } from '../types/import';

export const TARGET_FIELDS: Record<TargetEntity, { label: string; fields: TargetFieldDef[] }> = {
  customers: {
    label: 'العملاء',
    fields: [
      { key: 'code', label: 'كود العميل', type: 'string', aliases: ['كود', 'رقم العميل', 'رمز العميل', 'code', 'customer code', 'id'] },
      { key: 'name', label: 'اسم العميل', required: true, type: 'string', aliases: ['اسم', 'الاسم', 'اسم العميل', 'name', 'customer name', 'client'] },
      { key: 'phone', label: 'رقم الهاتف', type: 'string', aliases: ['هاتف', 'الهاتف', 'جوال', 'تلفون', 'رقم الجوال', 'phone', 'mobile', 'tel'] },
      { key: 'governorate', label: 'المحافظة / المدينة', type: 'string', aliases: ['محافظة', 'المحافظة', 'المدينة', 'city', 'governorate', 'location'] },
      { key: 'pickupLocation', label: 'موقع الاستلام / العنوان', type: 'string', aliases: ['عنوان', 'العنوان', 'موقع', 'موقع الاستلام', 'نقطة الاستلام', 'address'] },
      { key: 'openingBalance', label: 'الرصيد الافتتاحي', type: 'number', aliases: ['رصيد', 'رصيد افتتاحي', 'الرصيد الافتتاحي', 'opening balance', 'balance'] },
      { key: 'notes', label: 'ملاحظات', type: 'string', aliases: ['ملاحظات', 'ملاحظة', 'notes', 'comment'] }
    ]
  },
  orders: {
    label: 'الطلبات والمبيعات',
    fields: [
      { key: 'orderNumber', label: 'رقم الطلب', required: true, type: 'string', aliases: ['رقم الطلب', 'طلب', 'رقم الفاتورة', 'الفاتورة', 'order', 'order number', 'invoice'] },
      { key: 'customerName', label: 'اسم العميل', type: 'string', aliases: ['اسم العميل', 'العميل', 'المشتري', 'customer', 'client', 'name'] },
      { key: 'customerPhone', label: 'هاتف العميل', type: 'string', aliases: ['هاتف العميل', 'رقم العميل', 'هاتف', 'phone', 'mobile'] },
      { key: 'customerCode', label: 'كود العميل', type: 'string', aliases: ['كود العميل', 'رمز العميل', 'customer code'] },
      { key: 'totalAmount', label: 'إجمالي الطلب', required: true, type: 'number', aliases: ['إجمالي', 'المبلغ', 'القيمة', 'المجموع', 'total', 'amount', 'total amount'] },
      { key: 'paidAmount', label: 'المبلغ المدفوع', type: 'number', aliases: ['مدفوع', 'المسدد', 'المدفوع', 'paid', 'paid amount'] },
      { key: 'deliveryFee', label: 'أجور التوصيل', type: 'number', aliases: ['توصيل', 'أجور التوصيل', 'شحن', 'delivery', 'shipping'] },
      { key: 'date', label: 'تاريخ الطلب', type: 'date', aliases: ['تاريخ', 'التاريخ', 'تاريخ الطلب', 'date', 'order date'] },
      { key: 'status', label: 'حالة الطلب', type: 'select', aliases: ['حالة', 'الحالة', 'حالة الطلب', 'status'] },
      { key: 'site', label: 'المتجر / الموقع', type: 'string', aliases: ['موقع', 'متجر', 'الفرع', 'site', 'store', 'shop'] },
      { key: 'notes', label: 'ملاحظات', type: 'string', aliases: ['ملاحظات', 'بيان', 'notes'] }
    ]
  },
  payments: {
    label: 'سندات القبض والدفعات',
    fields: [
      { key: 'paymentNumber', label: 'رقم السند', type: 'string', aliases: ['رقم السند', 'سند', 'رقم الإيصال', 'payment number', 'receipt'] },
      { key: 'amount', label: 'المبلغ', required: true, type: 'number', aliases: ['مبلغ', 'المبلغ', 'القيمة', 'amount', 'paid'] },
      { key: 'customerName', label: 'اسم العميل', type: 'string', aliases: ['اسم العميل', 'العميل', 'customer'] },
      { key: 'customerCode', label: 'كود العميل', type: 'string', aliases: ['كود العميل', 'رمز العميل', 'customer code'] },
      { key: 'accountId', label: 'حساب الإيداع / المحفظة', type: 'string', aliases: ['حساب', 'المحفظة', 'البنك', 'account', 'wallet'] },
      { key: 'date', label: 'تاريخ السند', type: 'date', aliases: ['تاريخ', 'التاريخ', 'date'] },
      { key: 'notes', label: 'ملاحظات / البيان', type: 'string', aliases: ['بيان', 'ملاحظات', 'الوصف', 'notes', 'description'] }
    ]
  },
  expenses: {
    label: 'المصروفات',
    fields: [
      { key: 'amount', label: 'مبلغ المصروف', required: true, type: 'number', aliases: ['مبلغ', 'المبلغ', 'القيمة', 'amount'] },
      { key: 'category', label: 'بند المصروف', type: 'string', aliases: ['بند', 'البند', 'تصنيف', 'category', 'type'] },
      { key: 'date', label: 'تاريخ المصروف', type: 'date', aliases: ['تاريخ', 'date'] },
      { key: 'accountId', label: 'طريقة الدفع / الحساب', type: 'string', aliases: ['حساب', 'طريقة الدفع', 'المحفظة', 'account'] },
      { key: 'notes', label: 'البيان / الوصف', type: 'string', aliases: ['بيان', 'ملاحظات', 'الوصف', 'notes', 'description'] }
    ]
  },
  accounts: {
    label: 'المحافظ والحسابات المالية',
    fields: [
      { key: 'name', label: 'اسم الحساب أو المحفظة', required: true, type: 'string', aliases: ['اسم الحساب', 'المحفظة', 'البنك', 'name', 'account name'] },
      { key: 'type', label: 'نوع الحساب', type: 'string', aliases: ['نوع', 'النوع', 'type'] },
      { key: 'accountNumber', label: 'رقم الحساب', type: 'string', aliases: ['رقم الحساب', 'account number', 'iban'] },
      { key: 'openingBalance', label: 'الرصيد الافتتاحي', type: 'number', aliases: ['رصيد', 'رصيد افتتاحي', 'balance', 'opening balance'] }
    ]
  },
  purchaseBatches: {
    label: 'دفعات المشتريات',
    fields: [
      { key: 'batchNumber', label: 'رقم الدفعة', type: 'string', aliases: ['رقم الدفعة', 'الدفعة', 'batch', 'batch number'] },
      { key: 'supplierName', label: 'اسم المورد', type: 'string', aliases: ['مورد', 'المورد', 'supplier'] },
      { key: 'totalCost', label: 'التكلفة الإجمالية', type: 'number', aliases: ['تكلفة', 'التكلفة', 'المبلغ', 'cost', 'total cost'] },
      { key: 'date', label: 'تاريخ الشراء', type: 'date', aliases: ['تاريخ', 'date'] }
    ]
  },
  financialTransactions: {
    label: 'الحركات المالية',
    fields: [
      { key: 'type', label: 'نوع الحركة', type: 'string', aliases: ['نوع الحركة', 'النوع', 'type'] },
      { key: 'amount', label: 'المبلغ', required: true, type: 'number', aliases: ['المبلغ', 'amount'] },
      { key: 'date', label: 'التاريخ', type: 'date', aliases: ['التاريخ', 'date'] },
      { key: 'description', label: 'البيان', type: 'string', aliases: ['بيان', 'الوصف', 'description'] }
    ]
  },
  otherReceivables: {
    label: 'المستحقات والذمم الأخرى',
    fields: [
      { key: 'partyName', label: 'اسم الجهة / الشخص', required: true, type: 'string', aliases: ['الاسم', 'الجهة', 'الطرف', 'name', 'party'] },
      { key: 'amount', label: 'المبلغ المستحق', required: true, type: 'number', aliases: ['المبلغ', 'amount'] },
      { key: 'type', label: 'نوع الذمة (لنا / علينا)', type: 'string', aliases: ['نوع', 'type'] },
      { key: 'date', label: 'التاريخ', type: 'date', aliases: ['تاريخ', 'date'] },
      { key: 'notes', label: 'ملاحظات', type: 'string', aliases: ['ملاحظات', 'notes'] }
    ]
  }
};

/**
 * Detect entity type from sheet title and header names
 */
export function detectSheetEntity(sheetName: string, headers: string[]): TargetEntity {
  const normSheet = (sheetName || '').toLowerCase().trim();
  const joinedHeaders = headers.map(h => (h || '').toLowerCase().trim()).join(' ');

  if (normSheet.includes('عميل') || normSheet.includes('عملاء') || normSheet.includes('customer')) {
    return 'customers';
  }
  if (normSheet.includes('طلب') || normSheet.includes('مبيع') || normSheet.includes('order') || normSheet.includes('فاتور')) {
    return 'orders';
  }
  if (normSheet.includes('سند') || normSheet.includes('قبض') || normSheet.includes('دفعة') || normSheet.includes('payment')) {
    return 'payments';
  }
  if (normSheet.includes('مصروف') || normSheet.includes('نفق') || normSheet.includes('expense')) {
    return 'expenses';
  }
  if (normSheet.includes('حساب') || normSheet.includes('محفظ') || normSheet.includes('بنك') || normSheet.includes('account')) {
    return 'accounts';
  }

  // Check headers if sheet name doesn't match
  if (joinedHeaders.includes('رقم الطلب') || joinedHeaders.includes('order number') || joinedHeaders.includes('أجور التوصيل')) {
    return 'orders';
  }
  if (joinedHeaders.includes('رقم السند') || joinedHeaders.includes('سند قبض')) {
    return 'payments';
  }
  if (joinedHeaders.includes('بند المصروف') || joinedHeaders.includes('مصروف')) {
    return 'expenses';
  }
  if (joinedHeaders.includes('كود العميل') || (joinedHeaders.includes('اسم العميل') && !joinedHeaders.includes('رقم الطلب'))) {
    return 'customers';
  }

  return 'orders';
}

/**
 * Automatically map file headers to target entity fields
 */
export function autoMapColumns(
  headers: string[],
  entity: TargetEntity,
  rows: Record<string, any>[] = []
): FieldMapping[] {
  const entityDef = TARGET_FIELDS[entity];
  if (!entityDef) return [];

  const mappings: FieldMapping[] = [];

  for (const header of headers) {
    const normHeader = (header || '').toLowerCase().trim().replace(/[_-\s]+/g, ' ');
    let matchedField = '__skip__';
    let isAutoMatched = false;

    // Search for match among field definitions
    for (const field of entityDef.fields) {
      if (normHeader === field.key.toLowerCase() || normHeader === field.label.toLowerCase()) {
        matchedField = field.key;
        isAutoMatched = true;
        break;
      }

      const aliasMatch = field.aliases.some(alias => {
        const normAlias = alias.toLowerCase().trim();
        return normHeader === normAlias || normHeader.includes(normAlias) || normAlias.includes(normHeader);
      });

      if (aliasMatch) {
        matchedField = field.key;
        isAutoMatched = true;
        break;
      }
    }

    // Sample values from first few rows
    const sampleValues: any[] = [];
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      const val = rows[i]?.[header];
      if (val !== undefined && val !== null && val !== '') {
        sampleValues.push(val);
      }
    }

    mappings.push({
      fileColumn: header,
      targetEntity: entity,
      targetField: matchedField,
      isAutoMatched,
      sampleValues
    });
  }

  return mappings;
}
