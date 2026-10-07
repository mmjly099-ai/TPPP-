import { TargetEntity, TargetFieldDef, FieldMapping } from '../types/import';

/**
 * System Target Fields Dictionary
 */
export const TARGET_FIELDS: Record<TargetEntity, { label: string; fields: TargetFieldDef[] }> = {
  customers: {
    label: 'العملاء (Customer Records)',
    fields: [
      {
        key: 'name',
        label: 'اسم العميل',
        required: true,
        type: 'string',
        aliases: ['الاسم', 'اسم العميل', 'العميل', 'اسم الزبون', 'الزبون', 'customer_name', 'client_name', 'name', 'fullname', 'full_name']
      },
      {
        key: 'phone',
        label: 'رقم الهاتف / الجوال',
        required: true,
        type: 'string',
        aliases: ['رقم الهاتف', 'الهاتف', 'الجوال', 'الموبايل', 'رقم الجوال', 'رقم التواصل', 'phone', 'mobile', 'phone_number', 'telephone', 'tel']
      },
      {
        key: 'code',
        label: 'رقم / كود العميل',
        required: false,
        type: 'string',
        aliases: ['رقم العميل', 'كود العميل', 'رمز العميل', 'معرف العميل', 'customer_code', 'customer_id', 'code', 'client_id', 'id']
      },
      {
        key: 'governorate',
        label: 'المحافظة',
        required: false,
        type: 'string',
        aliases: ['المحافظة', 'المدينة', 'المنطقة', 'الموقع', 'governorate', 'city', 'province', 'state']
      },
      {
        key: 'pickupLocation',
        label: 'العنوان / موقع الاستلام',
        required: false,
        type: 'string',
        aliases: ['العنوان', 'موقع الاستلام', 'نقطة الاستلام', 'الاستلام', 'مكان الاستلام', 'المديرية', 'address', 'pickup_location', 'location', 'district']
      },
      {
        key: 'openingBalance',
        label: 'الرصيد الافتتاحي',
        required: false,
        type: 'number',
        aliases: ['الرصيد الافتتاحي', 'الرصيد السابق', 'الرصيد', 'opening_balance', 'balance', 'previous_balance']
      },
      {
        key: 'notes',
        label: 'الملاحظات',
        required: false,
        type: 'string',
        aliases: ['الملاحظات', 'ملاحظات', 'ملاحظة', 'notes', 'remarks', 'comment']
      },
      {
        key: 'createdAt',
        label: 'تاريخ التسجيل',
        required: false,
        type: 'date',
        aliases: ['تاريخ التسجيل', 'تاريخ الإضافة', 'التاريخ', 'created_at', 'register_date', 'date']
      }
    ]
  },

  orders: {
    label: 'الطلبات (Orders)',
    fields: [
      {
        key: 'orderNumber',
        label: 'رقم الطلب',
        required: true,
        type: 'string',
        aliases: ['رقم الطلب', 'الطلب', 'كود الطلب', 'معرف الطلب', 'order_number', 'order_no', 'ordernumber', 'order_id', 'orderid']
      },
      {
        key: 'customerName',
        label: 'اسم العميل',
        required: false,
        type: 'string',
        aliases: ['اسم العميل', 'العميل', 'اسم الزبون', 'customer_name', 'client_name', 'customer']
      },
      {
        key: 'customerPhone',
        label: 'هاتف العميل',
        required: false,
        type: 'string',
        aliases: ['هاتف العميل', 'جوال العميل', 'رقم الهاتف', 'الهاتف', 'الجوال', 'customer_phone', 'phone', 'mobile']
      },
      {
        key: 'customerCode',
        label: 'كود / رقم العميل',
        required: false,
        type: 'string',
        aliases: ['رقم العميل', 'كود العميل', 'customer_code', 'customer_id']
      },
      {
        key: 'orderDate',
        label: 'تاريخ الطلب',
        required: false,
        type: 'date',
        aliases: ['تاريخ الطلب', 'التاريخ', 'تاريخ', 'order_date', 'date', 'created_at']
      },
      {
        key: 'site',
        label: 'الموقع / المتجر (شي إن، علي إكسبرس...)',
        required: false,
        type: 'string',
        aliases: ['الموقع', 'موقع الشراء', 'المتجر', 'المصدر', 'المتجر/الموقع', 'site', 'platform', 'source', 'store']
      },
      {
        key: 'shipmentNumber',
        label: 'رقم التتبع / الشحنة',
        required: false,
        type: 'string',
        aliases: ['رقم التتبع', 'التتبع', 'رقم الشحنة', 'الشحنة', 'كود التتبع', 'tracking_number', 'tracking_no', 'tracking', 'shipment_number']
      },
      {
        key: 'itemsCount',
        label: 'عدد المنتجات / القطع',
        required: false,
        type: 'number',
        aliases: ['عدد المنتجات', 'عدد القطع', 'الكمية', 'العدد', 'items_count', 'quantity', 'qty', 'count', 'pieces']
      },
      {
        key: 'totalAmount',
        label: 'المبلغ الإجمالي',
        required: true,
        type: 'number',
        aliases: ['الإجمالي', 'إجمالي الطلب', 'المبلغ الإجمالي', 'القيمة الإجمالية', 'المبلغ', 'total', 'total_amount', 'subtotal', 'amount']
      },
      {
        key: 'discount',
        label: 'الخصم / التخفيض',
        required: false,
        type: 'number',
        aliases: ['الخصم', 'التخفيض', 'قيمة الخصم', 'discount', 'discount_amount']
      },
      {
        key: 'paidAmount',
        label: 'المبلغ المدفوع (الواصل)',
        required: false,
        type: 'number',
        aliases: ['المدفوع', 'المبلغ المدفوع', 'الواصل', 'المسدد', 'paid', 'paid_amount', 'deposit']
      },
      {
        key: 'remainingAmount',
        label: 'المبلغ المتبقي (الآجل)',
        required: false,
        type: 'number',
        aliases: ['المتبقي', 'الباقي', 'المبلغ المتبقي', 'الآجل', 'الرصيد المتبقي', 'remaining', 'remaining_amount', 'balance', 'due']
      },
      {
        key: 'deliveryFee',
        label: 'رسوم التوصيل',
        required: false,
        type: 'number',
        aliases: ['رسوم التوصيل', 'التوصيل', 'شحن داخلي', 'أجرة التوصيل', 'delivery_fee', 'shipping_fee', 'delivery']
      },
      {
        key: 'paymentMethod',
        label: 'طريقة الدفع / المحفظة',
        required: false,
        type: 'string',
        aliases: ['طريقة الدفع', 'المحفظة', 'البنك', 'الحساب', 'payment_method', 'wallet', 'bank', 'account']
      },
      {
        key: 'status',
        label: 'حالة الطلب',
        required: false,
        type: 'string',
        aliases: ['حالة الطلب', 'الحالة', 'status', 'order_status', 'state']
      },
      {
        key: 'notes',
        label: 'الملاحظات',
        required: false,
        type: 'string',
        aliases: ['الملاحظات', 'ملاحظات', 'رابط السلة', 'السلة', 'notes', 'remarks', 'cart_link']
      }
    ]
  },

  payments: {
    label: 'المدفوعات وسندات القبض (Payments)',
    fields: [
      {
        key: 'paymentNumber',
        label: 'رقم السند / العملية',
        required: false,
        type: 'string',
        aliases: ['رقم العملية', 'رقم السند', 'سند القبض', 'رقم الإيصال', 'كود السند', 'payment_number', 'receipt_no', 'transaction_id', 'id']
      },
      {
        key: 'orderNumber',
        label: 'رقم الطلب المرتبط',
        required: false,
        type: 'string',
        aliases: ['رقم الطلب', 'الطلب', 'order_number', 'order_no', 'order_id']
      },
      {
        key: 'customerName',
        label: 'اسم العميل',
        required: false,
        type: 'string',
        aliases: ['اسم العميل', 'العميل', 'المسدد', 'customer_name', 'client_name']
      },
      {
        key: 'customerPhone',
        label: 'هاتف العميل',
        required: false,
        type: 'string',
        aliases: ['هاتف العميل', 'الهاتف', 'الجوال', 'customer_phone', 'phone']
      },
      {
        key: 'amount',
        label: 'المبلغ المقبوض',
        required: true,
        type: 'number',
        aliases: ['المبلغ', 'المبلغ المدفوع', 'المقبوض', 'القيمة', 'amount', 'paid_amount', 'value']
      },
      {
        key: 'paymentDate',
        label: 'تاريخ الدفع والسند',
        required: false,
        type: 'date',
        aliases: ['تاريخ الدفع', 'التاريخ', 'تاريخ السند', 'payment_date', 'date', 'created_at']
      },
      {
        key: 'accountName',
        label: 'المحفظة / البنك المستلم',
        required: false,
        type: 'string',
        aliases: ['المحفظة', 'البنك', 'طريقة الدفع', 'الحساب المستلم', 'الحساب', 'account', 'bank', 'wallet', 'payment_method']
      },
      {
        key: 'notes',
        label: 'البيان / الملاحظات',
        required: false,
        type: 'string',
        aliases: ['البيان', 'الملاحظات', 'الوصف', 'notes', 'description', 'remarks']
      }
    ]
  },

  expenses: {
    label: 'المصروفات وسندات الصرف (Expenses)',
    fields: [
      {
        key: 'expenseNumber',
        label: 'رقم المصروف / السند',
        required: false,
        type: 'string',
        aliases: ['رقم المصروف', 'رقم السند', 'سند الصرف', 'expense_number', 'id']
      },
      {
        key: 'category',
        label: 'نوع المصروف / البند',
        required: true,
        type: 'string',
        aliases: ['نوع المصروف', 'البند', 'التصنيف', 'النوع', 'category', 'expense_type', 'type']
      },
      {
        key: 'amount',
        label: 'المبلغ المنصرف',
        required: true,
        type: 'number',
        aliases: ['المبلغ', 'القيمة', 'المصروف', 'amount', 'cost', 'value']
      },
      {
        key: 'description',
        label: 'الوصف / البيان',
        required: false,
        type: 'string',
        aliases: ['الوصف', 'البيان', 'التفاصيل', 'description', 'details', 'title']
      },
      {
        key: 'accountName',
        label: 'المحفظة / البنك المصروف منه',
        required: false,
        type: 'string',
        aliases: ['الحساب المصروف منه', 'المحفظة', 'البنك', 'طريقة الدفع', 'الحساب', 'account', 'bank', 'wallet']
      },
      {
        key: 'vendorName',
        label: 'المورد / الجهة المستفيدة',
        required: false,
        type: 'string',
        aliases: ['المورد', 'الجهة', 'المستفيد', 'vendor', 'supplier', 'payee']
      },
      {
        key: 'expenseDate',
        label: 'تاريخ الصرف',
        required: false,
        type: 'date',
        aliases: ['تاريخ الصرف', 'التاريخ', 'تاريخ', 'expense_date', 'date', 'created_at']
      },
      {
        key: 'notes',
        label: 'الملاحظات',
        required: false,
        type: 'string',
        aliases: ['الملاحظات', 'notes', 'remarks']
      }
    ]
  },

  accounts: {
    label: 'المحافظ والبنوك والصناديق (Accounts)',
    fields: [
      {
        key: 'name',
        label: 'اسم المحفظة أو البنك',
        required: true,
        type: 'string',
        aliases: ['اسم المحفظة أو البنك', 'اسم المحفظة', 'اسم البنك', 'اسم الحساب', 'الحساب', 'الاسم', 'account_name', 'bank_name', 'name']
      },
      {
        key: 'type',
        label: 'نوع الحساب',
        required: false,
        type: 'string',
        aliases: ['نوع الحساب', 'النوع', 'type', 'account_type']
      },
      {
        key: 'openingBalance',
        label: 'الرصيد الافتتاحي',
        required: false,
        type: 'number',
        aliases: ['الرصيد الافتتاحي', 'الرصيد', 'opening_balance', 'balance']
      },
      {
        key: 'notes',
        label: 'الملاحظات',
        required: false,
        type: 'string',
        aliases: ['الملاحظات', 'notes', 'remarks']
      }
    ]
  },

  purchaseBatches: {
    label: 'دفعات المشتريات (Purchases)',
    fields: [
      {
        key: 'batchNumber',
        label: 'رقم عملية الشراء / الدفعة',
        required: true,
        type: 'string',
        aliases: ['رقم عملية الشراء', 'رقم الدفعة', 'كود الشراء', 'رقم العملية', 'batch_number', 'purchase_id', 'purchase_number']
      },
      {
        key: 'source',
        label: 'الموقع / المتجر',
        required: false,
        type: 'string',
        aliases: ['الموقع', 'المتجر', 'المصدر', 'source', 'platform', 'supplier']
      },
      {
        key: 'totalCost',
        label: 'الإجمالي بالريال اليمني',
        required: true,
        type: 'number',
        aliases: ['الإجمالي بالريال اليمني', 'الإجمالي بالريال', 'التكلفة الإجمالية', 'قيمة الشراء', 'total_cost', 'cost', 'amount']
      },
      {
        key: 'purchaseDate',
        label: 'تاريخ الشراء',
        required: false,
        type: 'date',
        aliases: ['تاريخ الشراء', 'التاريخ', 'تاريخ', 'purchase_date', 'date']
      },
      {
        key: 'accountName',
        label: 'حساب الدفع (بطاقة / بنك)',
        required: false,
        type: 'string',
        aliases: ['حساب الدفع', 'المحفظة', 'البنك', 'الحساب', 'account', 'bank']
      },
      {
        key: 'notes',
        label: 'الملاحظات',
        required: false,
        type: 'string',
        aliases: ['الملاحظات', 'notes', 'remarks']
      }
    ]
  },

  financialTransactions: {
    label: 'الحركات المالية والتحويلات (Transactions)',
    fields: [
      {
        key: 'transactionNumber',
        label: 'رقم الحركة',
        required: false,
        type: 'string',
        aliases: ['رقم الحركة', 'رقم العملية', 'رقم التحويل', 'transaction_number', 'id']
      },
      {
        key: 'transactionDate',
        label: 'تاريخ الحركة',
        required: false,
        type: 'date',
        aliases: ['تاريخ الحركة', 'التاريخ', 'transaction_date', 'date']
      },
      {
        key: 'type',
        label: 'نوع الحركة',
        required: true,
        type: 'string',
        aliases: ['نوع الحركة', 'النوع', 'type', 'transaction_type']
      },
      {
        key: 'accountName',
        label: 'الحساب',
        required: false,
        type: 'string',
        aliases: ['الحساب', 'المحفظة', 'البنك', 'account', 'bank', 'wallet']
      },
      {
        key: 'amount',
        label: 'المبلغ',
        required: true,
        type: 'number',
        aliases: ['المبلغ', 'القيمة', 'amount', 'value']
      },
      {
        key: 'description',
        label: 'الوصف / المرجع',
        required: false,
        type: 'string',
        aliases: ['الوصف', 'البيان', 'المرجع', 'description', 'reference']
      }
    ]
  },

  otherReceivables: {
    label: 'الذمم المدينة ورأس المال والأصول (Receivables & Assets)',
    fields: [
      {
        key: 'name',
        label: 'الاسم / الطرف',
        required: true,
        type: 'string',
        aliases: ['الاسم', 'اسم المدين', 'الطرف', 'الجهة', 'name']
      },
      {
        key: 'entityType',
        label: 'نوع الطرف / التصنيف',
        required: false,
        type: 'string',
        aliases: ['نوع الطرف', 'التصنيف', 'النوع', 'entity_type', 'type']
      },
      {
        key: 'reason',
        label: 'البيان / السبب',
        required: false,
        type: 'string',
        aliases: ['البيان', 'السبب', 'الوصف', 'reason', 'description']
      },
      {
        key: 'openingBalance',
        label: 'المبلغ / الرصيد',
        required: true,
        type: 'number',
        aliases: ['المبلغ', 'الرصيد', 'المبلغ المستحق', 'amount', 'balance']
      },
      {
        key: 'notes',
        label: 'الملاحظات',
        required: false,
        type: 'string',
        aliases: ['الملاحظات', 'notes', 'remarks']
      }
    ]
  }
};

/**
 * Normalize text for fuzzy matching Arabic & English strings
 */
export function normalizeToken(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    // Remove Arabic diacritics
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Unify Alef forms
    .replace(/[أإآ]/g, 'ا')
    // Unify Taa Marbuta & Haa
    .replace(/ة/g, 'ه')
    // Unify Yaa forms
    .replace(/ى/g, 'ي')
    // Remove symbols, spaces, underscores, dashes
    .replace(/[\s\-_.:/\\()[\],+]/g, '');
}

/**
 * Guess the most appropriate TargetEntity for a sheet
 */
export function detectSheetEntity(sheetName: string, headers: string[]): TargetEntity {
  const normName = normalizeToken(sheetName);

  if (normName.includes('عميل') || normName.includes('عملا') || normName.includes('زبون') || normName.includes('customer')) {
    return 'customers';
  }
  if (normName.includes('طلب') || normName.includes('طلبيات') || normName.includes('order')) {
    return 'orders';
  }
  if (normName.includes('دفع') || normName.includes('قبض') || normName.includes('سندقبض') || normName.includes('payment') || normName.includes('receipt')) {
    return 'payments';
  }
  if (normName.includes('صرف') || normName.includes('مصروف') || normName.includes('expense')) {
    return 'expenses';
  }
  if (normName.includes('محفظ') || normName.includes('بنوك') || normName.includes('صندوق') || normName.includes('حساب') || normName.includes('account') || normName.includes('bank')) {
    return 'accounts';
  }
  if (normName.includes('شراء') || normName.includes('دفعه') || normName.includes('مشتريات') || normName.includes('purchase') || normName.includes('batch')) {
    return 'purchaseBatches';
  }
  if (normName.includes('حرك') || normName.includes('تحويل') || normName.includes('transaction')) {
    return 'financialTransactions';
  }
  if (normName.includes('ذمم') || normName.includes('اصول') || normName.includes('راس') || normName.includes('receivable')) {
    return 'otherReceivables';
  }

  // If sheet name didn't match, score by headers
  let bestEntity: TargetEntity = 'orders';
  let bestScore = -1;

  for (const [entityKey, entityDef] of Object.entries(TARGET_FIELDS)) {
    let score = 0;
    for (const h of headers) {
      const normH = normalizeToken(h);
      for (const field of entityDef.fields) {
        if (field.aliases.some(a => normalizeToken(a) === normH)) {
          score += field.required ? 3 : 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntity = entityKey as TargetEntity;
    }
  }

  return bestEntity;
}

/**
 * Match headers to fields for a given entity
 */
export function autoMapColumns(
  headers: string[],
  entity: TargetEntity,
  sampleRows: Record<string, any>[]
): FieldMapping[] {
  const entityDef = TARGET_FIELDS[entity];
  const mappings: FieldMapping[] = [];

  for (const header of headers) {
    const normHeader = normalizeToken(header);
    let matchedFieldKey: string = '__skip__';
    let isAutoMatched = false;

    // Direct and alias matching
    for (const field of entityDef.fields) {
      const match = field.aliases.some(alias => {
        const normAlias = normalizeToken(alias);
        return normAlias === normHeader || normHeader.includes(normAlias) || normAlias.includes(normHeader);
      });

      if (match) {
        matchedFieldKey = field.key;
        isAutoMatched = true;
        break;
      }
    }

    // Extract samples (up to 3 non-empty values)
    const sampleValues: any[] = [];
    for (const r of sampleRows.slice(0, 10)) {
      const val = r[header];
      if (val !== undefined && val !== null && val !== '') {
        sampleValues.push(val);
        if (sampleValues.length >= 3) break;
      }
    }

    mappings.push({
      fileColumn: header,
      targetEntity: entity,
      targetField: matchedFieldKey,
      isAutoMatched,
      sampleValues
    });
  }

  return mappings;
}
