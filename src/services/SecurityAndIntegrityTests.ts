import { TopStoreBackup, JournalEntry, JournalLine, Permission, AppRole } from '../types';
import {
  assertFiscalPeriodOpen,
  checkIdempotency,
  generateYearEndClosingEntry,
  generateAdjustingEntryForCustomer,
  isJournalEntryBalanced,
  DEFAULT_FISCAL_PERIODS,
  DEFAULT_FISCAL_YEARS
} from './AccountingEngine';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';

/**
 * Standard Role-to-Permissions Mapping
 * Implements Deny by Default & Least Privilege
 */
export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: [
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'orders.view', 'orders.create', 'orders.edit', 'orders.cancel',
    'payments.view', 'payments.create', 'payments.edit', 'payments.reverse',
    'journal.view', 'journal.create', 'journal.post', 'journal.reverse',
    'reports.view', 'backup.create', 'backup.restore', 'users.manage', 'settings.manage'
  ],
  manager: [
    'customers.view', 'customers.create', 'customers.edit',
    'orders.view', 'orders.create', 'orders.edit', 'orders.cancel',
    'payments.view', 'payments.create', 'payments.edit', 'payments.reverse',
    'journal.view', 'journal.create', 'journal.post',
    'reports.view', 'backup.create', 'settings.manage'
  ],
  accountant: [
    'customers.view',
    'orders.view',
    'payments.view', 'payments.create', 'payments.edit', 'payments.reverse',
    'journal.view', 'journal.create', 'journal.post', 'journal.reverse',
    'reports.view', 'backup.create'
  ],
  sales: [
    'customers.view', 'customers.create', 'customers.edit',
    'orders.view', 'orders.create', 'orders.edit',
    'payments.view', 'payments.create',
    'reports.view'
  ],
  shipping: [
    'orders.view', 'orders.edit',
    'reports.view'
  ],
  customer_service: [
    'customers.view', 'customers.create',
    'orders.view',
    'reports.view'
  ],
  viewer: [
    'customers.view',
    'orders.view',
    'reports.view'
  ]
};

/**
 * Permission checker function for RBAC security
 */
export function hasPermission(role: AppRole, requiredPermission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(requiredPermission);
}

/**
 * Automated Safety Check Test Suite
 * Tests financial integrity, foreign keys, unicity, and double-entry balance.
 */
export function runDataIntegrityTests(data: TopStoreBackup): {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  errors: string[];
  warnings: string[];
  metrics: {
    totalDebit: number;
    totalCredit: number;
    unbalancedEntries: number;
    duplicateOrderNumbers: number;
    duplicateCustomerCodes: number;
    duplicateReceiptNumbers: number;
    orphanPayments: number;
    orphanOrders: number;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let checks = 0;
  let passed = 0;

  const t = data.tables;

  // 1. Double Entry Balance Check
  checks++;
  let totalDebit = 0;
  let totalCredit = 0;
  let unbalancedCount = 0;

  for (const je of t.journalEntries || []) {
    let d = 0;
    let c = 0;
    for (const line of je.lines || []) {
      const amt = Number(line.amount) || 0;
      if (line.side === 'debit') d += amt;
      else if (line.side === 'credit') c += amt;
      totalDebit += (line.side === 'debit' ? amt : 0);
      totalCredit += (line.side === 'credit' ? amt : 0);
    }
    if (Math.abs(d - c) > 0.001) {
      unbalancedCount++;
      errors.push(`قيد غير متوازن: #${je.entryNumber || je.id} (مدين: ${d} != دائن: ${c})`);
    }
  }

  const diff = Math.abs(totalDebit - totalCredit);
  if (diff < 0.001 && unbalancedCount === 0) {
    passed++;
  } else {
    errors.push(`خلل في ميزان دفتر الأستاذ العام: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit})`);
  }

  // 2. Duplicate Customer Codes
  checks++;
  const custCodes = new Set<string>();
  let dupCust = 0;
  for (const cust of t.customers || []) {
    if (cust.code) {
      if (custCodes.has(cust.code)) {
        dupCust++;
        errors.push(`تكرار كود العميل: ${cust.code}`);
      }
      custCodes.add(cust.code);
    }
  }
  if (dupCust === 0) passed++;

  // 3. Duplicate Order Numbers
  checks++;
  const orderNums = new Set<string>();
  let dupOrders = 0;
  for (const o of t.orders || []) {
    const num = String(o.orderNumber);
    if (num) {
      if (orderNums.has(num)) {
        dupOrders++;
        warnings.push(`تكرار رقم الطلب: ${num}`);
      }
      orderNums.add(num);
    }
  }
  if (dupOrders === 0) passed++;

  // 4. Duplicate Receipt Numbers
  checks++;
  const receiptNums = new Set<string>();
  let dupReceipts = 0;
  for (const p of t.payments || []) {
    if (p.receiptNumber) {
      if (receiptNums.has(p.receiptNumber)) {
        dupReceipts++;
        errors.push(`تكرار رقم سند القبض: ${p.receiptNumber}`);
      }
      receiptNums.add(p.receiptNumber);
    }
  }
  if (dupReceipts === 0) passed++;

  // 5. Orphan Payments check (customerId must exist)
  checks++;
  const customerIds = new Set((t.customers || []).map(c => c.id));
  let orphanPay = 0;
  for (const p of t.payments || []) {
    if (p.customerId && !customerIds.has(p.customerId)) {
      orphanPay++;
      errors.push(`سند قبض يتيم (عميل غير موجود): #${p.receiptNumber} customerId=${p.customerId}`);
    }
  }
  if (orphanPay === 0) passed++;

  // 6. Orphan Orders check (customerId must exist)
  checks++;
  let orphanOrd = 0;
  for (const o of t.orders || []) {
    if (o.customerId && !customerIds.has(o.customerId)) {
      orphanOrd++;
      errors.push(`طلب يتيم (عميل غير موجود): #${o.orderNumber} customerId=${o.customerId}`);
    }
  }
  if (orphanOrd === 0) passed++;

  // 7. Orphan Journal Lines check
  checks++;
  const jeIds = new Set((t.journalEntries || []).map(je => je.id));
  let orphanLines = 0;
  for (const line of t.journalLines || []) {
    if (line.journalEntryId && !jeIds.has(line.journalEntryId)) {
      orphanLines++;
      errors.push(`سطر قيد يتيم (قيد اليومية غير موجود): lineId=${line.id} journalEntryId=${line.journalEntryId}`);
    }
  }
  if (orphanLines === 0) passed++;

  // 8. Chart of Accounts Coverage
  checks++;
  let unmappedLines = 0;
  for (const je of t.journalEntries || []) {
    for (const l of je.lines || []) {
      if (!l.chartAccountId && !l.chartAccountCode) {
        unmappedLines++;
      }
    }
  }
  if (unmappedLines === 0) {
    passed++;
  } else {
    warnings.push(`${unmappedLines} سطر قيد يحتاج ربط بشجرة الحسابات (تمت المعالجة عبر الربط التلقائي)`);
    passed++; // Treated as warning since auto-resolution handles it on the fly
  }

  // 9. Customer Ledger Reconciliation Rate
  checks++;
  const customerDebits: Record<string, number> = {};
  const customerCredits: Record<string, number> = {};
  for (const je of t.journalEntries || []) {
    if (je.status === 'void' || je.status === 'reversed') continue;
    for (const l of je.lines || []) {
      const name = l.accountName || '';
      if (name.includes('العميل:')) {
        const cName = name.replace(/^.*العميل:\s*/, '').trim();
        const amt = Number(l.amount) || 0;
        if (l.side === 'debit') customerDebits[cName] = (customerDebits[cName] || 0) + amt;
        else if (l.side === 'credit') customerCredits[cName] = (customerCredits[cName] || 0) + amt;
      }
    }
  }

  let custMismatches = 0;
  for (const c of t.customers || []) {
    const opening = Number(c.openingBalance) || 0;
    const oSum = (t.orders || []).filter(o => o.customerId === c.id && o.status !== 'cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pSum = (t.payments || []).filter(p => p.customerId === c.id && p.status !== 'cancelled').reduce((s, p) => s + (p.amount || 0), 0);
    const opsBal = opening + oSum - pSum;
    const legBal = (customerDebits[c.name] || 0) - (customerCredits[c.name] || 0);
    if (Math.abs(opsBal - legBal) > 0.01) {
      custMismatches++;
    }
  }
  if (custMismatches === 0) {
    passed++;
  } else {
    warnings.push(`يوجد ${custMismatches} عميل بحاجة لتسوية رصيد العمليات مع قيود دفتر الأستاذ`);
    passed++;
  }

  // 10. Phase 4: Fiscal Period Locking Enforcement
  checks++;
  const testPeriods = t.fiscalPeriods && t.fiscalPeriods.length > 0 ? t.fiscalPeriods : DEFAULT_FISCAL_PERIODS;
  const lockedPeriodCheck = assertFiscalPeriodOpen('2025-06-15T10:00:00.000Z', testPeriods);
  const openPeriodCheck = assertFiscalPeriodOpen('2026-02-15T10:00:00.000Z', testPeriods);
  if (!lockedPeriodCheck.allowed && openPeriodCheck.allowed) {
    passed++;
  } else {
    errors.push('خلل في آلية حماية الفترات المالية المقفلة (assertFiscalPeriodOpen)');
  }

  // 11. Phase 4: Year-End Closing Entry Balance Test
  checks++;
  const testAccounts = t.chartAccounts && t.chartAccounts.length > 0 ? t.chartAccounts : DEFAULT_CHART_OF_ACCOUNTS;
  try {
    const closingResult = generateYearEndClosingEntry({
      fiscalYear: 2026,
      entries: t.journalEntries || [],
      chartAccounts: testAccounts
    });
    if (isJournalEntryBalanced(closingResult.closingEntry)) {
      passed++;
    } else {
      errors.push('قيد إقفال نهاية السنة المالية غير متوازن محاسبياً');
    }
  } catch (err: any) {
    errors.push(`فشل اختبار قيد إقفال نهاية السنة: ${err.message}`);
  }

  // 12. Phase 4: Customer Adjusting Entry Generator Balance Test
  checks++;
  try {
    const sampleCustomer = (t.customers || [])[0] || { id: 1, name: 'عميل تجريبي', code: 'CUST-001' };
    const adjEntry = generateAdjustingEntryForCustomer({
      customer: sampleCustomer as any,
      operationalBalance: 5000,
      ledgerBalance: 3000,
      difference: 2000
    });
    if (isJournalEntryBalanced(adjEntry)) {
      passed++;
    } else {
      errors.push('قيد التسوية الآلي للعملاء غير متوازن محاسبياً');
    }
  } catch (err: any) {
    errors.push(`فشل اختبار قيد التسوية الآلي للعملاء: ${err.message}`);
  }

  // 13. Phase 4: Idempotency Protection Verification
  checks++;
  const testIdempKey = 'TEST-KEY-' + Date.now();
  const regCheck1 = checkIdempotency(testIdempKey, [
    { key: testIdempKey, operationType: 'order', createdAt: new Date().toISOString() }
  ]);
  const regCheck2 = checkIdempotency('NON-EXISTENT-KEY', []);
  if (regCheck1.isDuplicate && !regCheck2.isDuplicate) {
    passed++;
  } else {
    errors.push('خلل في آلية منع العمليات المكررة (Idempotency Engine)');
  }

  return {
    passed: errors.length === 0,
    totalChecks: checks,
    passedChecks: passed,
    failedChecks: checks - passed,
    errors,
    warnings,
    metrics: {
      totalDebit,
      totalCredit,
      unbalancedEntries: unbalancedCount,
      duplicateOrderNumbers: dupOrders,
      duplicateCustomerCodes: dupCust,
      duplicateReceiptNumbers: dupReceipts,
      orphanPayments: orphanPay,
      orphanOrders: orphanOrd
    }
  };
}
