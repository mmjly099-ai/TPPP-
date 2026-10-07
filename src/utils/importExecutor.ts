import {
  TargetEntity,
  FieldMapping,
  DeduplicationMode,
  ImportFileType,
  ImportOperationRecord,
  ImportCreatedIds
} from '../types/import';
import {
  TopStoreBackup,
  Customer,
  Order,
  Payment,
  Expense,
  Account,
  PurchaseBatch,
  OtherReceivable,
  FinancialTransaction,
  AuditLog
} from '../types';
import { parseNumberSafe, parseDateSafe, normalizePhoneNumber } from './importValidator';

const IMPORT_HISTORY_STORAGE_KEY = 'top_store_import_history';

/**
 * Get all past import operations from localStorage
 */
export function getStoredImportHistory(): ImportOperationRecord[] {
  try {
    const raw = localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save an import operation into history
 */
export function saveImportOperationToHistory(operation: ImportOperationRecord): void {
  try {
    const list = getStoredImportHistory();
    const updated = [operation, ...list.filter(op => op.id !== operation.id)];
    localStorage.setItem(IMPORT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save import operation to history:', err);
  }
}

/**
 * Update an existing operation in history
 */
export function updateImportOperationInHistory(operation: ImportOperationRecord): void {
  try {
    const list = getStoredImportHistory();
    const updated = list.map(op => (op.id === operation.id ? operation : op));
    localStorage.setItem(IMPORT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update import operation in history:', err);
  }
}

export interface ExecuteImportParams {
  currentData: TopStoreBackup;
  entity: TargetEntity;
  rows: Record<string, any>[];
  mappings: FieldMapping[];
  deduplicationMode: DeduplicationMode;
  fileInfo: {
    name: string;
    type: ImportFileType;
    size: number;
  };
  currentUser?: string;
  onProgress?: (stage: string, percent: number, details?: string) => void;
}

export interface ExecuteImportResult {
  updatedData: TopStoreBackup;
  operation: ImportOperationRecord;
  success: boolean;
  message: string;
}

/**
 * Execute Batch Import with Safe Backup & Referential Integrity
 */
export async function executeImportBatch(params: ExecuteImportParams): Promise<ExecuteImportResult> {
  const {
    currentData,
    entity,
    rows,
    mappings,
    deduplicationMode,
    fileInfo,
    currentUser = 'المدير العام (مالك مجلي)',
    onProgress
  } = params;

  // 1. Mandatory Automated Pre-Import Backup
  onProgress?.('إنشاء النسخة الاحتياطية الآلية قبل الاستيراد', 5, 'حفظ نسخة أمان كاملة لقاعدة البيانات...');
  await sleep(60);

  const snapshotTimestamp = Date.now();
  const backupSnapshotId = `TOP_STORE_PRE_IMPORT_BACKUP_${snapshotTimestamp}`;
  try {
    const backupPayload = JSON.stringify(currentData);
    localStorage.setItem(backupSnapshotId, backupPayload);
    // Verify backup integrity
    const verify = localStorage.getItem(backupSnapshotId);
    if (!verify || verify.length < 50) {
      throw new Error('فشل التحقق من سلامة النسخة الاحتياطية في المتصفح.');
    }
  } catch (err: any) {
    throw new Error(`فشل إنشاء النسخة الاحتياطية الإلزامية: ${err?.message || ''}. تم إلغاء الاستيراد لحماية بياناتك.`);
  }

  onProgress?.('النسخة الاحتياطية جاهزة', 15, 'بدء معالجة الدفعات...');
  await sleep(40);

  // Clone existing tables
  const customers: Customer[] = [...currentData.tables.customers];
  const orders: Order[] = [...currentData.tables.orders];
  const payments: Payment[] = [...currentData.tables.payments];
  const expenses: Expense[] = [...currentData.tables.expenses];
  const accounts: Account[] = [...currentData.tables.accounts];
  const purchaseBatches: PurchaseBatch[] = [...(currentData.tables.purchaseBatches || [])];
  const otherReceivables: OtherReceivable[] = [...(currentData.tables.otherReceivables || [])];
  const financialTransactions: FinancialTransaction[] = [...currentData.tables.financialTransactions];
  const auditLogs: AuditLog[] = [...currentData.tables.auditLogs];

  const createdRecordIds: ImportCreatedIds = {
    customers: [],
    orders: [],
    payments: [],
    expenses: [],
    accounts: [],
    purchaseBatches: [],
    financialTransactions: [],
    otherReceivables: []
  };

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const activeMappings = mappings.filter(m => m.targetField !== '__skip__');

  // Customer ID generator
  let maxCustomerId = customers.reduce((max, c) => Math.max(max, c.id), 100000);
  let nextCustomerNum = customers.length + 1;

  // Order ID generator
  let maxOrderId = orders.reduce((max, o) => Math.max(max, o.id), 1000);

  // Payment ID generator
  let maxPaymentId = payments.reduce((max, p) => Math.max(max, p.id), 1000);

  // Expense ID generator
  let maxExpenseId = expenses.reduce((max, e) => Math.max(max, e.id), 1000);

  // Account ID generator
  let maxAccountId = accounts.reduce((max, a) => Math.max(max, a.id), 100);

  // Default fallback account
  const defaultAccount = accounts.find(a => a.status === 'active') || accounts[0];
  const defaultAccountId = defaultAccount ? defaultAccount.id : 1;

  // Chunk configuration
  const chunkSize = 25;
  const totalChunks = Math.ceil(rows.length / chunkSize);

  for (let cIdx = 0; cIdx < totalChunks; cIdx++) {
    const chunkStart = cIdx * chunkSize;
    const chunkEnd = Math.min(chunkStart + chunkSize, rows.length);
    const chunk = rows.slice(chunkStart, chunkEnd);

    for (let rIdx = 0; rIdx < chunk.length; rIdx++) {
      const rawRow = chunk[rIdx];
      const record: Record<string, any> = {};

      for (const mapping of activeMappings) {
        record[mapping.targetField] = rawRow[mapping.fileColumn];
      }

      try {
        if (entity === 'customers') {
          const name = String(record.name || '').trim();
          const phone = normalizePhoneNumber(record.phone);
          const code = String(record.code || '').trim();

          if (!name) {
            errorCount++;
            continue;
          }

          // Duplicate check
          const existingIdx = customers.findIndex(
            c => (phone && normalizePhoneNumber(c.phone) === phone) || (code && c.code.toLowerCase() === code.toLowerCase())
          );

          if (existingIdx !== -1) {
            if (deduplicationMode === 'skip') {
              skippedCount++;
              continue;
            } else if (deduplicationMode === 'update') {
              customers[existingIdx] = {
                ...customers[existingIdx],
                name: name || customers[existingIdx].name,
                governorate: record.governorate || customers[existingIdx].governorate,
                pickupLocation: record.pickupLocation || customers[existingIdx].pickupLocation,
                notes: record.notes || customers[existingIdx].notes
              };
              updatedCount++;
              continue;
            }
          }

          // Add new customer
          maxCustomerId++;
          nextCustomerNum++;
          const newCode = code || `TOP ${String(nextCustomerNum).padStart(3, '0')}`;
          const newCustomer: Customer = {
            id: maxCustomerId,
            code: newCode,
            name,
            phone: phone || record.phone || '000000000',
            alternatePhone: record.alternatePhone || null,
            governorate: record.governorate || 'صنعاء',
            city: record.city || null,
            pickupLocation: record.pickupLocation || null,
            notes: record.notes || null,
            openingBalance: parseNumberSafe(record.openingBalance),
            openingBalanceDate: record.openingBalanceDate ? parseDateSafe(record.openingBalanceDate) : null,
            status: 'active',
            createdAt: parseDateSafe(record.createdAt)
          };

          customers.push(newCustomer);
          createdRecordIds.customers.push(newCustomer.id);
          addedCount++;
        } else if (entity === 'orders') {
          const orderNumber = String(record.orderNumber || '').trim();
          const totalAmount = parseNumberSafe(record.totalAmount);
          const paidAmount = parseNumberSafe(record.paidAmount);
          const discount = parseNumberSafe(record.discount);
          const deliveryFee = parseNumberSafe(record.deliveryFee);
          const itemsCount = parseInt(record.itemsCount) || 1;
          const orderDate = parseDateSafe(record.orderDate);
          const site = String(record.site || 'SHEIN').trim();
          const customerName = String(record.customerName || '').trim();
          const customerPhone = normalizePhoneNumber(record.customerPhone);
          const customerCode = String(record.customerCode || '').trim();

          if (!orderNumber && totalAmount <= 0) {
            errorCount++;
            continue;
          }

          // Deduplication
          const existingOrderIdx = orders.findIndex(
            o => String(o.orderNumber).trim().toLowerCase() === orderNumber.toLowerCase()
          );

          if (existingOrderIdx !== -1) {
            if (deduplicationMode === 'skip') {
              skippedCount++;
              continue;
            } else if (deduplicationMode === 'update') {
              orders[existingOrderIdx] = {
                ...orders[existingOrderIdx],
                totalAmount: totalAmount || orders[existingOrderIdx].totalAmount,
                paidAmount: paidAmount || orders[existingOrderIdx].paidAmount,
                remainingAmount: Math.max(0, (totalAmount || orders[existingOrderIdx].totalAmount) - (paidAmount || orders[existingOrderIdx].paidAmount)),
                status: (record.status as any) || orders[existingOrderIdx].status,
                notes: record.notes || orders[existingOrderIdx].notes
              };
              updatedCount++;
              continue;
            }
          }

          // Referential Integrity: Link or create Customer
          let matchedCustomer = customers.find(
            c => (customerPhone && normalizePhoneNumber(c.phone) === customerPhone) ||
                 (customerCode && c.code.toLowerCase() === customerCode.toLowerCase()) ||
                 (customerName && c.name.toLowerCase() === customerName.toLowerCase())
          );

          if (!matchedCustomer) {
            maxCustomerId++;
            nextCustomerNum++;
            matchedCustomer = {
              id: maxCustomerId,
              code: customerCode || `TOP ${String(nextCustomerNum).padStart(3, '0')}`,
              name: customerName || `عميل طلب ${orderNumber}`,
              phone: customerPhone || '770000000',
              governorate: 'صنعاء',
              openingBalance: 0,
              status: 'active',
              createdAt: orderDate
            };
            customers.push(matchedCustomer);
            createdRecordIds.customers.push(matchedCustomer.id);
          }

          maxOrderId++;
          const remainingAmount = Math.max(0, totalAmount - paidAmount);
          const newOrder: Order = {
            id: maxOrderId,
            orderNumber: orderNumber || `ORD-${maxOrderId}`,
            customerId: matchedCustomer.id,
            customerCode: matchedCustomer.code,
            customerName: matchedCustomer.name,
            site: site || 'SHEIN',
            shipmentNumber: record.shipmentNumber || undefined,
            itemsCount,
            subtotal: Math.max(0, totalAmount - deliveryFee),
            discount,
            shippingFee: 0,
            totalAmount,
            paidAmount,
            remainingAmount,
            deliveryFee,
            deliveryFeeCollectionStatus: 'unpaid',
            status: (record.status as any) || (remainingAmount === 0 ? 'delivered' : 'purchased'),
            orderDate,
            notes: record.notes || null,
            createdAt: orderDate
          };

          orders.push(newOrder);
          createdRecordIds.orders.push(newOrder.id);
          addedCount++;

          // If order has a paid amount, automatically record the payment to maintain balance
          if (paidAmount > 0) {
            maxPaymentId++;
            const paymentMethodName = record.paymentMethod || defaultAccount.name;
            const targetAccount = accounts.find(a => a.name.includes(paymentMethodName)) || defaultAccount;

            const newPayment: Payment = {
              id: maxPaymentId,
              paymentNumber: `PAY-${maxPaymentId}`,
              orderId: newOrder.id,
              customerId: matchedCustomer.id,
              accountId: targetAccount.id,
              amount: paidAmount,
              paymentDate: orderDate,
              paymentMethod: paymentMethodName,
              notes: `دفعة مستوردة للطلب رقم ${newOrder.orderNumber}`,
              createdAt: orderDate
            };
            payments.push(newPayment);
            createdRecordIds.payments.push(newPayment.id);
          }
        } else if (entity === 'payments') {
          const amount = parseNumberSafe(record.amount);
          const paymentNumber = String(record.paymentNumber || '').trim();
          const paymentDate = parseDateSafe(record.paymentDate);

          if (amount <= 0) {
            errorCount++;
            continue;
          }

          if (paymentNumber) {
            const existingPayment = payments.find(p => p.paymentNumber === paymentNumber);
            if (existingPayment) {
              if (deduplicationMode === 'skip') {
                skippedCount++;
                continue;
              }
            }
          }

          // Link customer
          const customerPhone = normalizePhoneNumber(record.customerPhone);
          const customerName = String(record.customerName || '').trim();
          let matchedCustomer = customers.find(
            c => (customerPhone && normalizePhoneNumber(c.phone) === customerPhone) ||
                 (customerName && c.name.toLowerCase() === customerName.toLowerCase())
          );

          if (!matchedCustomer) {
            matchedCustomer = customers[0];
          }

          // Link order if orderNumber given
          const orderNumber = String(record.orderNumber || '').trim();
          const matchedOrder = orderNumber ? orders.find(o => String(o.orderNumber).toLowerCase() === orderNumber.toLowerCase()) : undefined;

          // Link account
          const accName = String(record.accountName || '').trim();
          const matchedAccount = accounts.find(a => a.name.toLowerCase().includes(accName.toLowerCase())) || defaultAccount;

          maxPaymentId++;
          const newPayment: Payment = {
            id: maxPaymentId,
            paymentNumber: paymentNumber || `PAY-${maxPaymentId}`,
            orderId: matchedOrder ? matchedOrder.id : null,
            customerId: matchedCustomer ? matchedCustomer.id : 1,
            accountId: matchedAccount.id,
            amount,
            paymentDate,
            paymentMethod: matchedAccount.name,
            notes: record.notes || null,
            createdAt: paymentDate
          };

          payments.push(newPayment);
          createdRecordIds.payments.push(newPayment.id);
          addedCount++;

          // Update order remaining if linked
          if (matchedOrder) {
            matchedOrder.paidAmount += amount;
            matchedOrder.remainingAmount = Math.max(0, matchedOrder.totalAmount - matchedOrder.paidAmount);
          }
        } else if (entity === 'expenses') {
          const amount = parseNumberSafe(record.amount);
          const category = String(record.category || 'تشغيل').trim();
          const expenseDate = parseDateSafe(record.expenseDate);

          if (amount <= 0) {
            errorCount++;
            continue;
          }

          const accName = String(record.accountName || '').trim();
          const matchedAccount = accounts.find(a => a.name.toLowerCase().includes(accName.toLowerCase())) || defaultAccount;

          maxExpenseId++;
          const newExpense: Expense = {
            id: maxExpenseId,
            expenseNumber: record.expenseNumber || `EXP-${maxExpenseId}`,
            category,
            vendorName: record.vendorName || undefined,
            amount,
            paymentMethod: matchedAccount.name,
            accountId: matchedAccount.id,
            description: record.description || `مصروف مستورد - ${category}`,
            notes: record.notes || null,
            status: 'active',
            createdAt: expenseDate
          };

          expenses.push(newExpense);
          createdRecordIds.expenses.push(newExpense.id);
          addedCount++;
        } else if (entity === 'accounts') {
          const name = String(record.name || '').trim();
          if (!name) {
            errorCount++;
            continue;
          }

          const existingAcc = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
          if (existingAcc) {
            if (deduplicationMode === 'skip') {
              skippedCount++;
              continue;
            } else if (deduplicationMode === 'update') {
              existingAcc.openingBalance = parseNumberSafe(record.openingBalance) || existingAcc.openingBalance;
              updatedCount++;
              continue;
            }
          }

          maxAccountId++;
          const newAccount: Account = {
            id: maxAccountId,
            name,
            type: (record.type as any) || 'محفظة',
            openingBalance: parseNumberSafe(record.openingBalance),
            status: 'active',
            notes: record.notes || null,
            createdAt: new Date().toISOString()
          };

          accounts.push(newAccount);
          createdRecordIds.accounts.push(newAccount.id);
          addedCount++;
        } else if (entity === 'purchaseBatches') {
          const totalCost = parseNumberSafe(record.totalCost);
          const batchNumber = String(record.batchNumber || `BATCH-${Date.now()}`).trim();
          const purchaseDate = parseDateSafe(record.purchaseDate);

          const newBatch: PurchaseBatch = {
            id: Date.now() + rIdx,
            batchNumber,
            source: record.source || 'SHEIN',
            purchaseDate,
            accountId: defaultAccountId,
            purchaseCost: totalCost,
            purchaseFees: 0,
            transferFees: 0,
            totalCost,
            orderIds: [],
            status: 'active',
            createdAt: purchaseDate
          };
          purchaseBatches.push(newBatch);
          createdRecordIds.purchaseBatches.push(newBatch.id);
          addedCount++;
        } else if (entity === 'otherReceivables') {
          const amount = parseNumberSafe(record.openingBalance);
          const name = String(record.name || '').trim();
          if (!name) {
            errorCount++;
            continue;
          }

          const newReceivable: OtherReceivable = {
            id: Date.now() + rIdx,
            name,
            entityType: record.entityType || 'طرف مدين',
            reason: record.reason || 'رصيد مرحل',
            openingBalance: amount,
            openingDate: parseDateSafe(record.openingDate),
            status: 'unpaid',
            createdAt: new Date().toISOString()
          };
          otherReceivables.push(newReceivable);
          createdRecordIds.otherReceivables.push(newReceivable.id);
          addedCount++;
        }
      } catch (rowErr) {
        errorCount++;
      }
    }

    // Report batch progress
    const progressPercent = Math.min(95, Math.round(20 + ((cIdx + 1) / totalChunks) * 75));
    onProgress?.('استيراد البيانات وتحديث العلاقات', progressPercent, `تمت معالجة ${chunkEnd} من أصل ${rows.length} سجل...`);
    await sleep(20);
  }

  // Generate operation ID
  const history = getStoredImportHistory();
  const nextOpNum = String(history.length + 1).padStart(4, '0');
  const operationId = `IMP-#${nextOpNum}`;

  // Log in AuditLog
  const auditLog: AuditLog = {
    id: Date.now(),
    action: 'استيراد بيانات ونقل سجلات',
    entityType: 'import_operation',
    entityId: history.length + 1,
    description: `قام ${currentUser} باستيراد ملف (${fileInfo.name}). تم إضافة ${addedCount} سجل، وتحديث ${updatedCount}، وتخطي ${skippedCount} مكرر.`,
    createdAt: new Date().toISOString()
  };
  auditLogs.unshift(auditLog);

  const operationRecord: ImportOperationRecord = {
    id: operationId,
    fileName: fileInfo.name,
    fileType: fileInfo.type,
    fileSize: fileInfo.size,
    timestamp: new Date().toISOString(),
    performedBy: currentUser,
    status: 'completed',
    deduplicationMode,
    totalRecords: rows.length,
    addedCount,
    updatedCount,
    skippedCount,
    errorCount,
    entityCounts: {
      [entity]: addedCount + updatedCount
    },
    backupSnapshotId,
    createdRecordIds,
    notes: `تم الاستيراد بنجاح (${addedCount} جديد، ${updatedCount} محدث، ${skippedCount} متخطي)`
  };

  // Save to history
  saveImportOperationToHistory(operationRecord);

  onProgress?.('اكتمل الاستيراد بنجاح!', 100, `تم إدخال البيانات وحفظ سجل العملية #${operationId}`);
  await sleep(100);

  const updatedData: TopStoreBackup = {
    ...currentData,
    tables: {
      ...currentData.tables,
      customers,
      orders,
      payments,
      expenses,
      accounts,
      purchaseBatches,
      otherReceivables,
      financialTransactions,
      auditLogs
    }
  };

  return {
    updatedData,
    operation: operationRecord,
    success: true,
    message: `تم استيراد ${addedCount} سجل بنجاح، وتحديث ${updatedCount}، وتخطي ${skippedCount} مكرر.`
  };
}

/**
 * Roll back an import operation safely
 */
export function rollbackImportOperation(
  currentData: TopStoreBackup,
  operationId: string,
  restoreMode: 'remove_created_only' | 'restore_snapshot' = 'remove_created_only'
): { success: boolean; message: string; updatedData?: TopStoreBackup } {
  const history = getStoredImportHistory();
  const opIndex = history.findIndex(op => op.id === operationId);

  if (opIndex === -1) {
    return { success: false, message: 'لم يتم العثور على العملية المطلوبة في سجل الاستيراد.' };
  }

  const op = history[opIndex];
  if (op.status === 'rolled_back') {
    return { success: false, message: 'تم التراجع عن هذه العملية مسبقاً بالفعل.' };
  }

  let updatedData: TopStoreBackup;

  if (restoreMode === 'restore_snapshot' && op.backupSnapshotId) {
    const rawSnapshot = localStorage.getItem(op.backupSnapshotId);
    if (!rawSnapshot) {
      return { success: false, message: 'تعذر العثور على النسخة الاحتياطية الخاصة بهذه العملية في ذاكرة المتصفح.' };
    }
    try {
      updatedData = JSON.parse(rawSnapshot);
    } catch {
      return { success: false, message: 'فشل فك شفرة النسخة الاحتياطية المحفوظة.' };
    }
  } else {
    // Cleanly filter out only the IDs created in this specific operation
    const created = op.createdRecordIds;

    const custIds = new Set(created.customers || []);
    const orderIds = new Set(created.orders || []);
    const payIds = new Set(created.payments || []);
    const expIds = new Set(created.expenses || []);
    const accIds = new Set(created.accounts || []);
    const batchIds = new Set(created.purchaseBatches || []);
    const recIds = new Set(created.otherReceivables || []);

    const newCustomers = currentData.tables.customers.filter(c => !custIds.has(c.id));
    const newOrders = currentData.tables.orders.filter(o => !orderIds.has(o.id));
    const newPayments = currentData.tables.payments.filter(p => !payIds.has(p.id));
    const newExpenses = currentData.tables.expenses.filter(e => !expIds.has(e.id));
    const newAccounts = currentData.tables.accounts.filter(a => !accIds.has(a.id));
    const newBatches = (currentData.tables.purchaseBatches || []).filter(b => !batchIds.has(b.id));
    const newReceivables = (currentData.tables.otherReceivables || []).filter(r => !recIds.has(r.id));

    const auditLog: AuditLog = {
      id: Date.now(),
      action: 'تراجع عن استيراد بيانات',
      entityType: 'rollback_operation',
      entityId: opIndex + 1,
      description: `تم التراجع عن عملية الاستيراد (${op.id}) لملف ${op.fileName}. وحذف ${op.addedCount} سجل تم إنشاؤها بالعملية.`,
      createdAt: new Date().toISOString()
    };

    updatedData = {
      ...currentData,
      tables: {
        ...currentData.tables,
        customers: newCustomers,
        orders: newOrders,
        payments: newPayments,
        expenses: newExpenses,
        accounts: newAccounts,
        purchaseBatches: newBatches,
        otherReceivables: newReceivables,
        auditLogs: [auditLog, ...currentData.tables.auditLogs]
      }
    };
  }

  // Mark operation status as rolled_back
  op.status = 'rolled_back';
  op.notes = `تم التراجع عن العملية في ${new Date().toLocaleString('ar-YE')}`;
  history[opIndex] = op;
  localStorage.setItem(IMPORT_HISTORY_STORAGE_KEY, JSON.stringify(history));

  return {
    success: true,
    message: `تم التراجع عن العملية (${operationId}) بنجاح وإلغاء السجلات المنشأة دون المساس بالبيانات القديمة!`,
    updatedData
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
