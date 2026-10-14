import { TopStoreBackup, JournalEntry, JournalLine, Customer, Order, Payment, Expense, FinancialTransaction, ChartAccount, AccountCategory, FiscalPeriod, FiscalYear, AppRole, Permission, IdempotencyRecord } from '../types';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';

export function getCategoryFromCode(code: string): AccountCategory {
  if (code.startsWith('1')) return 'asset';
  if (code.startsWith('2')) return 'liability';
  if (code.startsWith('3')) return 'equity';
  if (code.startsWith('4')) return 'revenue';
  return 'expense';
}

export interface AccountingIntegrityReport {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  imbalance: number;
  totalJournalEntries: number;
  totalJournalLines: number;
  draftEntriesCount: number;
  postedEntriesCount: number;
  reversedEntriesCount: number;
  voidEntriesCount: number;
  duplicateLineIdsCount: number;
  linesWithNullAccountId: number;
  unlinkedOperationalRecordsCount: number;
  customerBalancesMatchCount: number;
  customerBalancesMismatchCount: number;
  details: string[];
}

/**
 * Standard rounding to 2 decimal places to eliminate IEEE 754 float drift.
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Validates whether a journal entry is perfectly balanced (Total Debit == Total Credit).
 */
export function isJournalEntryBalanced(entry: JournalEntry): boolean {
  if (!entry.lines || entry.lines.length === 0) return false;
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of entry.lines) {
    const amt = typeof line.amount === 'string' ? parseFloat(line.amount) || 0 : (line.amount || 0);
    if (line.side === 'debit') {
      totalDebit = roundCurrency(totalDebit + amt);
    } else if (line.side === 'credit') {
      totalCredit = roundCurrency(totalCredit + amt);
    }
  }
  return Math.abs(totalDebit - totalCredit) < 0.001;
}

/**
 * Validates and enforces double-entry balance for an entire ledger.
 */
export function auditLedgerIntegrity(entries: JournalEntry[], lines?: JournalLine[]): {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  diff: number;
  unbalancedEntries: JournalEntry[];
} {
  let totalDebit = 0;
  let totalCredit = 0;
  const unbalanced: JournalEntry[] = [];

  for (const entry of entries) {
    let entryDebit = 0;
    let entryCredit = 0;
    const entryLines = entry.lines || [];
    for (const l of entryLines) {
      const amt = typeof l.amount === 'string' ? parseFloat(l.amount) || 0 : (l.amount || 0);
      if (l.side === 'debit') entryDebit = roundCurrency(entryDebit + amt);
      else if (l.side === 'credit') entryCredit = roundCurrency(entryCredit + amt);
    }
    if (Math.abs(entryDebit - entryCredit) > 0.001) {
      unbalanced.push(entry);
    }
    totalDebit = roundCurrency(totalDebit + entryDebit);
    totalCredit = roundCurrency(totalCredit + entryCredit);
  }

  const diff = roundCurrency(Math.abs(totalDebit - totalCredit));
  return {
    isBalanced: diff < 0.001 && unbalanced.length === 0,
    totalDebit,
    totalCredit,
    diff,
    unbalancedEntries: unbalanced
  };
}

/**
 * Verifies that a fiscal period is open for posting.
 * Rejects posting if period is CLOSED or LOCKED.
 */
export function assertFiscalPeriodOpen(dateStr: string, periods: FiscalPeriod[]): { allowed: boolean; reason?: string } {
  if (!periods || periods.length === 0) {
    return { allowed: true }; // Default open if no periods configured yet
  }
  const targetDate = new Date(dateStr);
  const matched = periods.find(p => {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return targetDate >= start && targetDate <= end;
  });

  if (!matched) {
    return { allowed: true }; // Unbounded future/past allowed unless explicitly defined
  }

  if (matched.status === 'locked') {
    return { allowed: false, reason: `الفترة المالية (${matched.periodName}) مقفلة نهائياً (LOCKED) ومحمية من أي تعديل أو ترحيل.` };
  }
  if (matched.status === 'closed') {
    return { allowed: false, reason: `الفترة المالية (${matched.periodName}) مغلقة (CLOSED). يتطلب التعديل فتح الفترة بصلاحية مدير النظام.` };
  }

  return { allowed: true };
}

/**
 * Checks idempotency key to prevent double execution.
 */
export function checkIdempotency(key: string, registry: IdempotencyRecord[]): { isDuplicate: boolean; previousRecord?: IdempotencyRecord } {
  if (!key) return { isDuplicate: false };
  const found = registry.find(r => r.key === key);
  if (found) {
    return { isDuplicate: true, previousRecord: found };
  }
  return { isDuplicate: false };
}

/**
 * Maps any transaction or operational account name to the standardized Chart of Accounts.
 */
function resolveChartAccountRaw(
  accountName: string,
  side: 'debit' | 'credit' = 'debit',
  fallbackAccountId?: number | null
): { id: number; code: string; name: string } {
  const n = (accountName || '').toLowerCase().trim();

  // 1. Cash & In-Hand (101)
  if (n.includes('صندوق') || n === 'نقدي' || n.includes('خزينة') || n.includes('كاش')) {
    return { id: 101, code: '101', name: 'الصناديق النقدية (الخزينة الرئيسية)' };
  }

  // 2. Banks & E-Wallets (102)
  if (
    n.includes('جيب') ||
    n.includes('كريمي') ||
    n.includes('تضامن') ||
    n.includes('فلوس') ||
    n.includes('بنك') ||
    n.includes('فيزا') ||
    n.includes('محفظة')
  ) {
    return { id: 102, code: '102', name: 'الحسابات البنكية والمحافظ الإلكترونية' };
  }

  // 3. Accounts Receivable / Customer Debts (110)
  if (n.includes('عميل') || n.includes('ذمم مدين') || n.includes('زبون')) {
    return { id: 110, code: '110', name: 'ذمم العملاء المدينة (حسابات العملاء)' };
  }

  // 4. In-Transit Goods & Purchase Batches (120)
  if (n.includes('بضاعة') || n.includes('شحنة') || n.includes('لوجستي') || n.includes('مشتريات')) {
    return { id: 120, code: '120', name: 'بضاعة في الطريق ومشتريات الشحنات' };
  }

  // 5. Custodies & Other Receivables (130)
  if (n.includes('سلف') || n.includes('عهدة') || n.includes('ذمة مدينة') || n.includes('مستحقات')) {
    return { id: 130, code: '130', name: 'سلف وعهد ومستحقات أخرى' };
  }

  // 6. Fixed Assets (150)
  if (n.includes('أصول ثابتة') || n.includes('تجهيزات') || n.includes('أجهزة') || n.includes('معدات')) {
    return { id: 150, code: '150', name: 'الأصول الثابتة وتجهيزات ومعدات المتجر' };
  }

  // 7. Suppliers & Logistics Payables (201)
  if (n.includes('مورد') || n.includes('دائنون') || n.includes('شركات الشحن')) {
    return { id: 201, code: '201', name: 'ذمم الموردين وشركات الشحن (دائنون)' };
  }

  // 8. Customer Advance Deposits (202)
  if (n.includes('أمانات') || n.includes('عربون') || n.includes('دفعات مقدمة')) {
    return { id: 202, code: '202', name: 'أمانات ودفعات مقدمة من العملاء' };
  }

  // 9. Paid-in Capital / Opening Balance (301)
  if (n.includes('رأس المال') || n.includes('افتتاحي') || n.includes('رأس مال')) {
    return { id: 301, code: '301', name: 'رأس المال المدفوع' };
  }

  // 10. Retained Earnings (302)
  if (n.includes('أرباح مبقاة') || n.includes('أرباح مرحلة')) {
    return { id: 302, code: '302', name: 'الأرباح المبقاة والمرحلة' };
  }

  // 11. Owner Equity & Withdrawals (303)
  if (n.includes('جاري') || n.includes('مسحوبات') || n.includes('شخصية') || n.includes('شريك')) {
    return { id: 303, code: '303', name: 'جاري صاحب المنشأة والمسحوبات الشخصية' };
  }

  // 12. Sales & Brokerage Revenue (401)
  if (n.includes('إيراد') || n.includes('مبيعات') || n.includes('وساطة') || n.includes('عمولة')) {
    return { id: 401, code: '401', name: 'إيرادات المبيعات والوساطة التجارية' };
  }

  // 13. Delivery Fee Revenue (402)
  if (n.includes('توصيل') && side === 'credit') {
    return { id: 402, code: '402', name: 'إيرادات رسوم وأجور التوصيل' };
  }

  // 14. Other Revenues (409)
  if (n.includes('واردات') || n.includes('إيرادات أخرى') || n.includes('فروق صرف')) {
    return { id: 409, code: '409', name: 'إيرادات وأرباح متنوعة أخرى' };
  }

  // 15. COGS (501)
  if (n.includes('بضاعة مباعة') || n.includes('شراء فعلية') || n.includes('تكلفة البضاعة')) {
    return { id: 501, code: '501', name: 'تكلفة البضاعة المباعة وتكلفة الشراء الفعلية' };
  }

  // 16. International Freight & Customs (502)
  if (n.includes('شحن دولي') || n.includes('جمارك') || n.includes('تخليص')) {
    return { id: 502, code: '502', name: 'مصاريف الشحن الدولي والتخليص الجمركي' };
  }

  // 17. Marketing (503)
  if (n.includes('تسويق') || n.includes('إعلان') || n.includes('ممولة') || n.includes('حملة')) {
    return { id: 503, code: '503', name: 'مصاريف التسويق والإعلانات الممولة' };
  }

  // 18. Salaries & Wages (504)
  if (n.includes('رواتب') || n.includes('أجور') || n.includes('مكافآت') || n.includes('عاملين')) {
    return { id: 504, code: '504', name: 'مصاريف أجور ورواتب ومكافآت العاملين' };
  }

  // 19. Rent & Utilities (505)
  if (n.includes('إيجار') || n.includes('كهرباء') || n.includes('مياه') || n.includes('مقر')) {
    return { id: 505, code: '505', name: 'مصاريف الإيجار ومرافق المقر' };
  }

  // 20. Internet & Software (506)
  if (n.includes('إنترنت') || n.includes('اتصالات') || n.includes('برمجيات') || n.includes('سيرفر')) {
    return { id: 506, code: '506', name: 'مصاريف الإنترنت والاتصالات والبرمجيات' };
  }

  // 21. Delivery Couriers (507)
  if (n.includes('مندوب') || n.includes('مواصلات') || (n.includes('توصيل') && side === 'debit')) {
    return { id: 507, code: '507', name: 'أجور وعمولات مناديب التوصيل المحلي' };
  }

  // 22. Packaging & Printing (508)
  if (n.includes('تغليف') || n.includes('طباعة') || n.includes('قرطاسية') || n.includes('أكياس')) {
    return { id: 508, code: '508', name: 'مصاريف التغليف والطباعة والقرطاسية' };
  }

  // 23. General & Admin Expenses (509)
  if (n.includes('مصروف') || n.includes('نثريات') || n.includes('صادرات') || n.includes('تشغيل')) {
    return { id: 509, code: '509', name: 'مصاريف ونثريات تشغيلية متنوعة' };
  }

  // Default fallback to General Expenses
  return { id: 509, code: '509', name: 'مصاريف ونثريات تشغيلية متنوعة' };
}

export function resolveChartAccount(
  accountName: string,
  side: 'debit' | 'credit' = 'debit',
  fallbackAccountId?: number | null
): { id: number; code: string; name: string; category: AccountCategory } {
  const raw = resolveChartAccountRaw(accountName, side, fallbackAccountId);
  return {
    ...raw,
    category: getCategoryFromCode(raw.code)
  };
}

export interface CustomerReconciliationItem {
  customerId: number;
  customerCode: string;
  customerName: string;
  openingBalance: number;
  totalOrders: number;
  totalPayments: number;
  operationalBalance: number;
  ledgerDebit: number;
  ledgerCredit: number;
  ledgerBalance: number;
  difference: number;
  isReconciled: boolean;
}

export interface CustomerReconciliationReport {
  totalCustomers: number;
  reconciledCount: number;
  mismatchedCount: number;
  matchRate: number;
  totalOperationalBalance: number;
  totalLedgerBalance: number;
  netDifference: number;
  items: CustomerReconciliationItem[];
}

/**
 * Determines whether a journal entry should be counted in active ledger balances.
 * - Excludes deleted ('void') entries.
 * - Excludes entries marked as 'reversed' or isReversed.
 * - Excludes reversal entries whose target entry is already marked as 'reversed'/isReversed (prevents double-subtraction).
 */
export function isEntryActiveInLedger(entry: JournalEntry, allEntries: JournalEntry[]): boolean {
  if (!entry) return false;
  if (entry.status === 'void') return false;
  if (entry.status === 'reversed' || entry.isReversed) return false;

  if (entry.sourceType === 'reversal' || entry.reversesEntryId) {
    const targetId = entry.reversesEntryId ?? (typeof entry.sourceId === 'number' ? entry.sourceId : Number(entry.sourceId));
    if (targetId) {
      const targetEntry = allEntries.find(e => Number(e.id) === Number(targetId));
      // If the target entry does not exist (orphaned reversal), or is already excluded (void or reversed), do not apply the reversal entry
      if (!targetEntry || targetEntry.status === 'void' || targetEntry.status === 'reversed' || targetEntry.isReversed) {
        return false;
      }
    } else {
      // Reversal entry with no valid target is an orphan and should not affect active balances
      return false;
    }
  }

  return true;
}

/**
 * Reconciles customer balances calculated from operational orders/payments
 * with General Ledger journal lines.
 */
export function reconcileCustomerBalances(
  customers: Customer[],
  orders: Order[],
  payments: Payment[],
  journalEntries: JournalEntry[]
): CustomerReconciliationReport {
  const ledgerDebitsById: Record<number, number> = {};
  const ledgerCreditsById: Record<number, number> = {};

  const ordersById = new Map<number, Order>();
  orders.forEach(o => ordersById.set(Number(o.id), o));

  const paymentsById = new Map<number, Payment>();
  payments.forEach(p => paymentsById.set(Number(p.id), p));

  const customersById = new Map<number, Customer>();
  customers.forEach(c => customersById.set(Number(c.id), c));

  // Resolve customer ID from entry context or customer name
  const resolveCustomerIdForLine = (entry: JournalEntry, rawAccountName: string): number | null => {
    const srcId = entry.sourceId != null ? Number(entry.sourceId) : null;
    if (entry.sourceType === 'order' && srcId && ordersById.has(srcId)) {
      return ordersById.get(srcId)!.customerId;
    }
    if (entry.sourceType === 'payment' && srcId && paymentsById.has(srcId)) {
      return paymentsById.get(srcId)!.customerId;
    }
    if ((entry.sourceType === 'opening_balance' || entry.sourceType === 'manual') && srcId && customersById.has(srcId)) {
      return srcId;
    }

    const custName = rawAccountName.replace(/^.*العميل:\s*/, '').trim();
    if (!custName) return null;

    const matchingCustomers = customers.filter(c => c.name.trim() === custName);
    if (matchingCustomers.length === 1) {
      return matchingCustomers[0].id;
    }
    if (matchingCustomers.length > 1) {
      // Prefer the customer that has active orders, payments, or opening balance
      const activeMatch = matchingCustomers.find(c =>
        (Number(c.openingBalance) || 0) > 0 ||
        orders.some(o => o.customerId === c.id) ||
        payments.some(p => p.customerId === c.id)
      );
      return (activeMatch || matchingCustomers[matchingCustomers.length - 1]).id;
    }
    return null;
  };

  // Aggregate active posted entries
  journalEntries.forEach(entry => {
    if (!isEntryActiveInLedger(entry, journalEntries)) return;
    (entry.lines || []).forEach(line => {
      const name = line.accountName || '';
      if (name.includes('العميل:')) {
        const custId = resolveCustomerIdForLine(entry, name);
        if (custId != null) {
          const amt = typeof line.amount === 'string' ? parseFloat(line.amount) || 0 : (line.amount || 0);
          if (line.side === 'debit') {
            ledgerDebitsById[custId] = roundCurrency((ledgerDebitsById[custId] || 0) + amt);
          } else if (line.side === 'credit') {
            ledgerCreditsById[custId] = roundCurrency((ledgerCreditsById[custId] || 0) + amt);
          }
        }
      }
    });
  });

  const items: CustomerReconciliationItem[] = [];
  let reconciledCount = 0;
  let totalOps = 0;
  let totalLedger = 0;

  customers.forEach(cust => {
    const opening = parseFloat(String(cust.openingBalance || 0)) || 0;
    const custOrders = orders
      .filter(o => o.customerId === cust.id && o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const custPayments = payments
      .filter(p => p.customerId === cust.id && p.status !== 'cancelled')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const operationalBalance = roundCurrency(opening + custOrders - custPayments);
    const legDebit = ledgerDebitsById[cust.id] || 0;
    const legCredit = ledgerCreditsById[cust.id] || 0;
    const ledgerBalance = roundCurrency(legDebit - legCredit);
    const difference = roundCurrency(operationalBalance - ledgerBalance);
    const isReconciled = Math.abs(difference) < 0.01;

    if (isReconciled) {
      reconciledCount++;
    }

    totalOps = roundCurrency(totalOps + operationalBalance);
    totalLedger = roundCurrency(totalLedger + ledgerBalance);

    items.push({
      customerId: cust.id,
      customerCode: cust.code || `CUST-${cust.id}`,
      customerName: cust.name,
      openingBalance: opening,
      totalOrders: custOrders,
      totalPayments: custPayments,
      operationalBalance,
      ledgerDebit: legDebit,
      ledgerCredit: legCredit,
      ledgerBalance,
      difference,
      isReconciled
    });
  });

  const totalCustomers = customers.length;
  const mismatchedCount = totalCustomers - reconciledCount;
  const matchRate = totalCustomers > 0 ? roundCurrency((reconciledCount / totalCustomers) * 100) : 100;
  const netDifference = roundCurrency(totalOps - totalLedger);

  return {
    totalCustomers,
    reconciledCount,
    mismatchedCount,
    matchRate,
    totalOperationalBalance: totalOps,
    totalLedgerBalance: totalLedger,
    netDifference,
    items
  };
}

/**
 * Standard System Fiscal Years & Periods configuration
 */
export const DEFAULT_FISCAL_YEARS: FiscalYear[] = [
  {
    id: 2026,
    year: 2026,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 2025,
    year: 2025,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'closed',
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

export const DEFAULT_FISCAL_PERIODS: FiscalPeriod[] = [
  {
    id: 202601,
    periodName: 'الربع الأول 2026 (Q1)',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'open',
    fiscalYear: 2026,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 202602,
    periodName: 'الربع الثاني 2026 (Q2)',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'open',
    fiscalYear: 2026,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 202603,
    periodName: 'الربع الثالث 2026 (Q3)',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    status: 'open',
    fiscalYear: 2026,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 202604,
    periodName: 'الربع الرابع 2026 (Q4)',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'open',
    fiscalYear: 2026,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 202512,
    periodName: 'الفترة المالية السنوية 2025 (مقفلة)',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'closed',
    fiscalYear: 2025,
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

/**
 * Phase 4: Year-End Closing Engine
 * Closes all nominal accounts (Revenue 4xx & Expense 5xx) to Retained Earnings (302).
 * Leaves Balance Sheet accounts intact for the new fiscal year.
 */
export function generateYearEndClosingEntry(params: {
  fiscalYear: number;
  entries: JournalEntry[];
  chartAccounts: ChartAccount[];
  performedByName?: string;
  closingDate?: string;
}): {
  closingEntry: JournalEntry;
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
  closedAccountsCount: number;
} {
  const { fiscalYear, entries, chartAccounts, performedByName = 'المحاسب المالي', closingDate } = params;
  const dateStr = closingDate || `${fiscalYear}-12-31T23:59:59.000Z`;

  const accountBalances: Record<string, { debit: number; credit: number; name: string; code: string; category: string }> = {};

  for (const ca of chartAccounts) {
    accountBalances[ca.code] = {
      debit: 0,
      credit: 0,
      name: ca.name,
      code: ca.code,
      category: ca.category
    };
  }

  for (const je of entries) {
    if (je.status !== 'posted') continue;
    const jeYear = new Date(je.createdAt).getFullYear();
    if (jeYear !== fiscalYear) continue;

    for (const l of je.lines || []) {
      const code = l.chartAccountCode || String(l.chartAccountId || '');
      const amt = Number(l.amount) || 0;
      if (!accountBalances[code]) {
        const resolved = resolveChartAccount(l.accountName, l.side, l.accountId);
        accountBalances[resolved.code] = {
          debit: 0,
          credit: 0,
          name: resolved.name,
          code: resolved.code,
          category: resolved.category
        };
      }
      if (l.side === 'debit') accountBalances[code].debit += amt;
      else if (l.side === 'credit') accountBalances[code].credit += amt;
    }
  }

  const lines: JournalLine[] = [];
  const jeId = Date.now();
  let lineIdx = 1;
  let totalRevenue = 0;
  let totalExpense = 0;
  let closedAccountsCount = 0;

  // 1. Close Revenue accounts (normal Credit balance -> DEBIT to zero out)
  for (const code of Object.keys(accountBalances)) {
    const acc = accountBalances[code];
    if (acc.category === 'revenue' || code.startsWith('4')) {
      const netCredit = roundCurrency(acc.credit - acc.debit);
      if (Math.abs(netCredit) > 0.001) {
        closedAccountsCount++;
        totalRevenue += netCredit;
        if (netCredit > 0) {
          lines.push({
            id: jeId + lineIdx++,
            journalEntryId: jeId,
            accountId: Number(code) || null,
            accountName: acc.name,
            side: 'debit',
            amount: netCredit,
            chartAccountId: Number(code) || 401,
            chartAccountCode: code,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: netCredit,
            notes: `إقفال حساب الإيراد (${acc.name}) لنهاية السنة ${fiscalYear}`
          });
        } else {
          lines.push({
            id: jeId + lineIdx++,
            journalEntryId: jeId,
            accountId: Number(code) || null,
            accountName: acc.name,
            side: 'credit',
            amount: Math.abs(netCredit),
            chartAccountId: Number(code) || 401,
            chartAccountCode: code,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: Math.abs(netCredit),
            notes: `إقفال حساب الإيراد (${acc.name}) لنهاية السنة ${fiscalYear}`
          });
        }
      }
    }
  }

  // 2. Close Expense accounts (normal Debit balance -> CREDIT to zero out)
  for (const code of Object.keys(accountBalances)) {
    const acc = accountBalances[code];
    if (acc.category === 'expense' || code.startsWith('5')) {
      const netDebit = roundCurrency(acc.debit - acc.credit);
      if (Math.abs(netDebit) > 0.001) {
        closedAccountsCount++;
        totalExpense += netDebit;
        if (netDebit > 0) {
          lines.push({
            id: jeId + lineIdx++,
            journalEntryId: jeId,
            accountId: Number(code) || null,
            accountName: acc.name,
            side: 'credit',
            amount: netDebit,
            chartAccountId: Number(code) || 501,
            chartAccountCode: code,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: netDebit,
            notes: `إقفال حساب المصروف (${acc.name}) لنهاية السنة ${fiscalYear}`
          });
        } else {
          lines.push({
            id: jeId + lineIdx++,
            journalEntryId: jeId,
            accountId: Number(code) || null,
            accountName: acc.name,
            side: 'debit',
            amount: Math.abs(netDebit),
            chartAccountId: Number(code) || 501,
            chartAccountCode: code,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: Math.abs(netDebit),
            notes: `إقفال حساب المصروف (${acc.name}) لنهاية السنة ${fiscalYear}`
          });
        }
      }
    }
  }

  const netIncome = roundCurrency(totalRevenue - totalExpense);

  const retainedEarningsAcc = chartAccounts.find(a => a.code === '302') || {
    id: 302,
    code: '302',
    name: 'الأرباح المبقاة / الأرباح والخسائر المدورة',
    category: 'equity' as const
  };

  if (netIncome > 0) {
    // Net Profit: Credit Retained Earnings
    lines.push({
      id: jeId + lineIdx++,
      journalEntryId: jeId,
      accountId: retainedEarningsAcc.id,
      accountName: retainedEarningsAcc.name,
      side: 'credit',
      amount: netIncome,
      chartAccountId: retainedEarningsAcc.id,
      chartAccountCode: '302',
      currency: 'YER',
      exchangeRate: 1,
      baseAmount: netIncome,
      notes: `ترحيل صافي الأرباح المحققة للسنة المالية ${fiscalYear} إلى الأرباح المبقاة`
    });
  } else if (netIncome < 0) {
    // Net Loss: Debit Retained Earnings
    const lossAmount = Math.abs(netIncome);
    lines.push({
      id: jeId + lineIdx++,
      journalEntryId: jeId,
      accountId: retainedEarningsAcc.id,
      accountName: retainedEarningsAcc.name,
      side: 'debit',
      amount: lossAmount,
      chartAccountId: retainedEarningsAcc.id,
      chartAccountCode: '302',
      currency: 'YER',
      exchangeRate: 1,
      baseAmount: lossAmount,
      notes: `ترحيل صافي الخسارة المحققة للسنة المالية ${fiscalYear} إلى الأرباح المبقاة`
    });
  }

  const closingEntry: JournalEntry = {
    id: jeId,
    entryNumber: `YE-CLOSE-${fiscalYear}`,
    description: `قيد إقفال الحسابات الاسمية والأرباح والخسائر لنهاية السنة المالية ${fiscalYear}`,
    sourceType: 'year_end_close' as any,
    sourceId: fiscalYear,
    sourceNumber: `YEAR-${fiscalYear}`,
    status: 'posted',
    currency: 'YER',
    exchangeRate: 1,
    createdAt: dateStr,
    postedAt: dateStr,
    postedByName: performedByName,
    lines
  };

  return {
    closingEntry,
    totalRevenue,
    totalExpense,
    netIncome,
    closedAccountsCount
  };
}

/**
 * Phase 4: Customer Adjusting Journal Entry Generator
 * Automatically creates a balanced adjusting journal entry to bring customer ledger
 * in 100% harmony with their operational records.
 */
export function generateAdjustingEntryForCustomer(params: {
  customer: Customer;
  operationalBalance: number;
  ledgerBalance: number;
  difference: number;
  performedByName?: string;
}): JournalEntry {
  const { customer, difference, performedByName = 'المحاسب المعتمد' } = params;
  const jeId = Date.now();
  const amt = roundCurrency(Math.abs(difference));
  const isDebit = difference > 0;

  const lines: JournalLine[] = [
    {
      id: jeId + 1,
      journalEntryId: jeId,
      accountId: null,
      accountName: `ذمم مدينة - العميل: ${customer.name}`,
      side: isDebit ? 'debit' : 'credit',
      amount: amt,
      chartAccountId: 110,
      chartAccountCode: '110',
      currency: 'YER',
      exchangeRate: 1,
      baseAmount: amt,
      notes: `تسوية رصيد العميل (${customer.name}) لمطابقة العمليات مع دفتر الأستاذ`
    },
    {
      id: jeId + 2,
      journalEntryId: jeId,
      accountId: null,
      accountName: 'تسويات فروقات أرصدة افتتاحية ومحاسبية',
      side: isDebit ? 'credit' : 'debit',
      amount: amt,
      chartAccountId: 303,
      chartAccountCode: '303',
      currency: 'YER',
      exchangeRate: 1,
      baseAmount: amt,
      notes: `الطرف المقابل لتسوية رصيد العميل #${customer.code || customer.id}`
    }
  ];

  return {
    id: jeId,
    entryNumber: `ADJ-CUST-${customer.code || customer.id}-${Date.now().toString().slice(-4)}`,
    description: `قيد تسوية وتصحيح رصيد العميل: ${customer.name} (مطابقة الأستاذ مع العمليات)`,
    sourceType: 'manual',
    sourceId: customer.id,
    sourceNumber: customer.code || String(customer.id),
    status: 'posted',
    currency: 'YER',
    exchangeRate: 1,
    createdAt: new Date().toISOString(),
    postedAt: new Date().toISOString(),
    postedByName: performedByName,
    lines
  };
}

/**
 * Automatically sanitizes, deduplicates, and reconciles journal entries in a TopStoreBackup:
 * 1. Attaches missing embedded lines from tables.journalLines.
 * 2. Removes duplicate legacy 179* JE-PAY, JE-EXP, JE-ORD, and JE-SHP entries that were duplicated by canonical entries.
 * 3. Fixes corrupted sourceType/sourceId on JE-IN, JE-OUT, JE-TRF, JE-REC, and JE-SHP entries.
 * 4. Deduplicates multiple active entries pointing to the same order, payment, expense, or opening_balance.
 * 5. Ensures every active order, payment, and customer opening balance has a balanced journal entry (preserving soft-deleted 'void' entries unless forceRestoreMissing is true).
 * 6. Resolves chartAccountId and chartAccountCode on all lines and syncs tables.journalLines.
 */
export function sanitizeAndReconcileJournalEntries(
  backup: TopStoreBackup,
  options?: { forceRestoreMissing?: boolean }
): TopStoreBackup {
  if (!backup || !backup.tables) return backup;

  const forceRestore = Boolean(options?.forceRestoreMissing);
  const t = backup.tables;
  const customers = t.customers || [];
  const rawOrders = t.orders || [];
  const payments = t.payments || [];
  const accounts = t.accounts || [];
  const rawEntries = Array.isArray(t.journalEntries) ? t.journalEntries : [];
  const rawLines = Array.isArray(t.journalLines) ? t.journalLines : [];

  // Normalize orders: ensure all orders are purely numbered by their actual order number (رقم الطلب) and not automatic system strings (ORD-xxx)
  const cleanedOrders = rawOrders.map(o => {
    let num = String(o.orderNumber || '').trim();
    if (o.customerOrderNumber != null && String(o.customerOrderNumber).trim()) {
      num = String(o.customerOrderNumber).trim();
    } else {
      num = num.replace(/^ORD-/, '').trim();
    }
    if (num === '1  1' || num === '1 ') num = '1';
    const cust = customers.find(c => c.id === o.customerId);
    return {
      ...o,
      orderNumber: num,
      customerOrderNumber: num,
      customerName: o.customerName || cust?.name || undefined,
      customerCode: o.customerCode || cust?.code || undefined,
      internalNumber: num
    };
  });
  t.orders = cleanedOrders;
  const orders = cleanedOrders;

  if (Array.isArray(t.deliveryOrders)) {
    t.deliveryOrders = t.deliveryOrders.map(d => ({
      ...d,
      orderNumber: String(d.orderNumber || '').replace(/^ORD-/, '').trim()
    }));
  }

  const hasSyntheticCanonicalSet = rawEntries.some(
    j => String(j.id).length >= 13 && !String(j.id).startsWith('179')
  );

  // Step 1: Hydrate lines & filter out known legacy duplicate 179* entries
  let entries: JournalEntry[] = [];
  for (const rawJe of rawEntries) {
    if (!rawJe) continue;
    const idStr = String(rawJe.id || '');
    const numStr = String(rawJe.entryNumber || '');

    if (hasSyntheticCanonicalSet && idStr.startsWith('179') && idStr.length === 13) {
      // Legacy 179* JE-PAY, JE-EXP, JE-ORD, and JE-SHP-427527 were duplicated by canonical 2000*/3000*/4000*/5000* entries
      if (
        numStr.startsWith('JE-PAY-') ||
        numStr.startsWith('JE-EXP-') ||
        numStr.startsWith('JE-ORD-') ||
        numStr === 'JE-SHP-427527'
      ) {
        // Only skip if it wasn't created recently after 2026-10-05 (all legacy corrupted ones have id <= 1791150000000)
        if (Number(rawJe.id) <= 1791150000000) {
          continue;
        }
      }
    }

    const hydratedLines =
      Array.isArray(rawJe.lines) && rawJe.lines.length > 0
        ? rawJe.lines
        : rawLines.filter(l => Number(l.journalEntryId) === Number(rawJe.id));

    let fixedSourceType = rawJe.sourceType;
    let fixedSourceId = rawJe.sourceId;
    let fixedSourceNumber = rawJe.sourceNumber;

    // Fix corrupted sourceType: 'order' on non-order entries
    if (numStr.startsWith('JE-IN-') || numStr.startsWith('JE-OUT-') || numStr.startsWith('JE-TRF-')) {
      fixedSourceType = 'manual';
      fixedSourceId = null;
      fixedSourceNumber = numStr;
    } else if (numStr.startsWith('JE-REC-')) {
      fixedSourceType = 'receivable';
      if (fixedSourceType !== rawJe.sourceType) {
        fixedSourceId = null;
        fixedSourceNumber = numStr;
      }
    } else if (numStr.startsWith('JE-SHP-')) {
      fixedSourceType = 'expense';
      if (rawJe.sourceType === 'order') {
        fixedSourceId = null;
        fixedSourceNumber = numStr;
      }
    } else if (numStr.startsWith('JE-EXP-')) {
      fixedSourceType = 'expense';
    } else if (numStr.startsWith('JE-PAY-')) {
      fixedSourceType = 'payment';
    } else if (numStr.startsWith('JE-ORD-')) {
      fixedSourceType = 'order';
    } else if (numStr.startsWith('JE-REV-')) {
      fixedSourceType = 'reversal';
    } else if (numStr.startsWith('JE-PB-')) {
      fixedSourceType = 'purchase_batch';
    } else if (numStr.startsWith('JE-OPEN-')) {
      fixedSourceType = 'opening_balance';
    }

    const normalizedLines: JournalLine[] = hydratedLines.map((l, idx) => {
      const amt = roundCurrency(typeof l.amount === 'string' ? parseFloat(l.amount) || 0 : (Number(l.amount) || 0));
      const resolved = resolveChartAccount(l.accountName || '', l.side || 'debit', l.accountId);
      return {
        ...l,
        id: l.id || Number(rawJe.id) * 10 + idx + 1,
        journalEntryId: Number(rawJe.id),
        side: l.side === 'credit' ? 'credit' : 'debit',
        amount: amt,
        baseAmount: amt,
        currency: l.currency || 'YER',
        exchangeRate: l.exchangeRate || 1,
        chartAccountId: l.chartAccountId || resolved.id,
        chartAccountCode: l.chartAccountCode || resolved.code
      };
    });

    const resolvedStatus =
      rawJe.status === 'void'
        ? (forceRestore ? 'posted' : 'void')
        : rawJe.isReversed || rawJe.status === 'reversed'
        ? 'reversed'
        : rawJe.status || 'posted';

    entries.push({
      ...rawJe,
      sourceType: fixedSourceType || 'manual',
      sourceId: fixedSourceId ?? null,
      sourceNumber: fixedSourceNumber ?? null,
      status: resolvedStatus,
      deletedAt: resolvedStatus === 'void' ? rawJe.deletedAt || new Date().toISOString() : null,
      deleteReason: resolvedStatus === 'void' ? rawJe.deleteReason || null : null,
      lines: normalizedLines
    });
  }

  // Step 2: Deduplicate entries with same ID or duplicate active (sourceType, sourceId) for singular operational docs
  const seenIds = new Set<number>();
  const seenSourceKeys = new Set<string>();
  const dedupedEntries: JournalEntry[] = [];

  for (const je of entries) {
    const numId = Number(je.id);
    if (seenIds.has(numId)) continue;

    if (
      je.status !== 'void' &&
      je.sourceId != null &&
      (je.sourceType === 'order' || je.sourceType === 'payment' || je.sourceType === 'expense' || je.sourceType === 'opening_balance')
    ) {
      const key = `${je.sourceType}:${je.sourceId}`;
      if (seenSourceKeys.has(key)) {
        continue;
      }
      seenSourceKeys.add(key);
    }

    seenIds.add(numId);
    dedupedEntries.push(je);
  }
  entries = dedupedEntries;

  // Step 3: Ensure every non-cancelled Order has a balanced JE-ORD entry
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    const totalAmt = roundCurrency(Number(o.totalAmount) || 0);
    if (totalAmt <= 0) continue;

    const existing = entries.find(
      je => je.sourceType === 'order' && Number(je.sourceId) === Number(o.id)
    );

    if (existing) {
      // If active, ensure customer name and amount match the order if it's a standard 2-line order entry
      const cust = customers.find(c => c.id === o.customerId);
      const custName = cust?.name || o.customerName || 'العميل';
      if (existing.status !== 'void' && existing.lines.length === 2) {
        existing.lines = existing.lines.map(l => {
          if (l.side === 'debit') {
            return {
              ...l,
              accountName: `حـ/ العميل: ${custName}`,
              amount: totalAmt,
              baseAmount: totalAmt
            };
          }
          return {
            ...l,
            amount: totalAmt,
            baseAmount: totalAmt
          };
        });
      }
      continue;
    }

    // Create missing order journal entry
    const cust = customers.find(c => c.id === o.customerId);
    const custName = cust?.name || o.customerName || 'العميل';
    const jeId = 2000000000000 + Number(o.id);
    const ordCustChart = resolveChartAccount(`حـ/ العميل: ${custName}`, 'debit');
    const ordSalesChart = resolveChartAccount('حـ/ إيرادات المبيعات والوساطة', 'credit');
    const createdAt = o.createdAt || o.orderDate || new Date().toISOString();

    const cleanNum = String(o.orderNumber || o.id).trim().replace(/^ORD-/, '');
    entries.push({
      id: jeId,
      entryNumber: `JE-ORD-${cleanNum.padStart(4, '0')}`,
      sourceType: 'order',
      sourceId: o.id,
      sourceNumber: cleanNum,
      status: 'posted',
      currency: 'YER',
      exchangeRate: 1,
      createdBy: 'admin',
      postedBy: 'admin',
      postedAt: createdAt,
      description: `فاتورة مبيعات للطلب #${cleanNum} - العميل: ${custName}`,
      createdAt,
      lines: [
        {
          id: jeId * 10 + 1,
          journalEntryId: jeId,
          accountId: null,
          accountName: `حـ/ العميل: ${custName}`,
          chartAccountId: ordCustChart.id,
          chartAccountCode: ordCustChart.code,
          side: 'debit',
          amount: totalAmt,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: totalAmt
        },
        {
          id: jeId * 10 + 2,
          journalEntryId: jeId,
          accountId: null,
          accountName: 'حـ/ إيرادات المبيعات والوساطة',
          chartAccountId: ordSalesChart.id,
          chartAccountCode: ordSalesChart.code,
          side: 'credit',
          amount: totalAmt,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: totalAmt
        }
      ]
    });
  }

  // Step 4: Ensure every non-cancelled Payment has a balanced JE-PAY entry
  for (const p of payments) {
    if (p.status === 'cancelled') continue;
    const payAmt = roundCurrency(Number(p.amount) || 0);
    if (payAmt <= 0) continue;

    const existing = entries.find(
      je => je.sourceType === 'payment' && Number(je.sourceId) === Number(p.id)
    );
    if (existing) continue;

    const cust = customers.find(c => c.id === p.customerId);
    const custName = cust?.name || 'العميل';
    const acc = accounts.find(a => a.id === p.accountId);
    const accName = acc?.name || p.paymentMethod || 'الصندوق';
    const jeId = 4000000000000 + Number(p.id);
    const rctNum = p.receiptNumber || p.paymentNumber || `PAY-${p.id}`;
    const payAccChart = resolveChartAccount(accName, 'debit', p.accountId);
    const payCustChart = resolveChartAccount(`حـ/ العميل: ${custName}`, 'credit');
    const createdAt = p.createdAt || p.paymentDate || new Date().toISOString();

    entries.push({
      id: jeId,
      entryNumber: `JE-PAY-${rctNum}`,
      sourceType: 'payment',
      sourceId: p.id,
      sourceNumber: rctNum,
      status: 'posted',
      currency: 'YER',
      exchangeRate: 1,
      createdBy: 'admin',
      postedBy: 'admin',
      postedAt: createdAt,
      description: `سند قبض #${rctNum} من العميل: ${custName}`,
      createdAt,
      lines: [
        {
          id: jeId * 10 + 1,
          journalEntryId: jeId,
          accountId: p.accountId || null,
          accountName: accName,
          chartAccountId: payAccChart.id,
          chartAccountCode: payAccChart.code,
          side: 'debit',
          amount: payAmt,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: payAmt
        },
        {
          id: jeId * 10 + 2,
          journalEntryId: jeId,
          accountId: null,
          accountName: `حـ/ العميل: ${custName}`,
          chartAccountId: payCustChart.id,
          chartAccountCode: payCustChart.code,
          side: 'credit',
          amount: payAmt,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: payAmt
        }
      ]
    });
  }

  // Step 5: Ensure every Customer with openingBalance > 0 has a balanced JE-OPEN entry
  for (const c of customers) {
    const openBal = roundCurrency(parseFloat(String(c.openingBalance || 0)) || 0);
    if (openBal <= 0) continue;

    const existing = entries.find(
      je => je.sourceType === 'opening_balance' && Number(je.sourceId) === Number(c.id)
    );
    if (existing) {
      if (existing.status !== 'void' && existing.lines.length === 2) {
        existing.lines = existing.lines.map(l => ({
          ...l,
          amount: openBal,
          baseAmount: openBal
        }));
      }
      continue;
    }

    const jeId = 1000000000000 + Number(c.id);
    const custChart = resolveChartAccount(`حـ/ العميل: ${c.name}`, 'debit');
    const capChart = resolveChartAccount('حـ/ الأرصدة الافتتاحية ورأس المال', 'credit');
    const createdAt = c.openingBalanceDate || c.createdAt || new Date().toISOString();
    const codeClean = (c.code || String(c.id)).replace(/\s+/g, '');

    entries.push({
      id: jeId,
      entryNumber: `JE-OPEN-${codeClean}`,
      sourceType: 'opening_balance',
      sourceId: c.id,
      sourceNumber: c.code || String(c.id),
      status: 'posted',
      currency: 'YER',
      exchangeRate: 1,
      createdBy: 'admin',
      postedBy: 'admin',
      postedAt: createdAt,
      description: `إثبات الرصيد الافتتاحي للعميل: ${c.name} (${c.code || ''})`,
      createdAt,
      lines: [
        {
          id: jeId * 10 + 1,
          journalEntryId: jeId,
          accountId: null,
          accountName: `حـ/ العميل: ${c.name}`,
          chartAccountId: custChart.id,
          chartAccountCode: custChart.code,
          side: 'debit',
          amount: openBal,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: openBal
        },
        {
          id: jeId * 10 + 2,
          journalEntryId: jeId,
          accountId: null,
          accountName: 'حـ/ الأرصدة الافتتاحية ورأس المال',
          chartAccountId: capChart.id,
          chartAccountCode: capChart.code,
          side: 'credit',
          amount: openBal,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: openBal
        }
      ]
    });
  }

  // Sort newest first
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const syncedLines = entries.flatMap(e => e.lines || []);

  return {
    ...backup,
    tables: {
      ...backup.tables,
      journalEntries: entries,
      journalLines: syncedLines
    }
  };
}
