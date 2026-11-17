import {
  Account,
  AuditLog,
  Courier,
  CourierSettlement,
  Customer,
  DeliveryCashCollection,
  DeliveryOrder,
  DiscountCode,
  Expense,
  FiscalPeriod,
  FiscalYear,
  InstallmentPlan,
  JournalEntry,
  MarketingCampaign,
  MarketingChannel,
  Order,
  OtherReceivable,
  Owner,
  Payment,
  PurchaseBatch,
  Shipment,
  TopStoreBackup,
  Worker
} from '../types';
import { auditLedgerIntegrity, isEntryActiveInLedger, reconcileCustomerBalances, roundCurrency } from './AccountingEngine';
import { runDataIntegrityTests } from './SecurityAndIntegrityTests';

export interface LiveStoreInputs {
  data: TopStoreBackup;
  accounts: Account[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
  shipments: Shipment[];
  transactions: any[];
  journalEntries: JournalEntry[];
  otherReceivables: OtherReceivable[];
  owners: Owner[];
  purchaseBatches: PurchaseBatch[];
  installmentPlans: InstallmentPlan[];
  couriers: Courier[];
  deliveryOrders: DeliveryOrder[];
  courierSettlements: CourierSettlement[];
  deliveryCashCollections: DeliveryCashCollection[];
  workers: Worker[];
  marketingCampaigns: MarketingCampaign[];
  marketingChannels: MarketingChannel[];
  discountCodes: DiscountCode[];
  marketingStats: any;
  fiscalPeriods: FiscalPeriod[];
  fiscalYears: FiscalYear[];
  auditLogs: AuditLog[];
  settings: Record<string, string>;
  getAccountBalance: (accountId: number) => number;
  getCustomerBalance: (customerId: number) => number;
  totalCashAndBanks: number;
  totalCustomerDebts: number;
  totalReceivables: number;
  totalExpenses: number;
  lastSyncTime?: string | null;
  realtimeStatus?: string;
}

export const num = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === '') return 0;
  const cleaned = String(v).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateOnly = (v?: string | null): string => {
  if (!v) return '';
  return String(v).slice(0, 10);
};

const monthKeyOf = (v?: string | null): string => {
  const d = dateOnly(v);
  return d.length >= 7 ? d.slice(0, 7) : '';
};

const monthLabelAr = (ym: string): string => {
  if (!ym || ym.length < 7) return ym || 'غير محدد';
  const [y, m] = ym.split('-');
  const names = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || m} ${y}`;
};

export interface SystemGroundTruthSnapshot {
  meta: {
    generatedAt: string;
    todayStr: string;
    currentMonthKey: string;
    lastMonthKey: string;
    lastSyncTime: string | null;
    realtimeStatus: string;
  };
  liquidity: {
    totalCashAndBanks: number;
    activeLiquidityAccountsCount: number;
    visaCardsTotal: number;
    cashBoxesTotal: number;
    walletsAndBanksTotal: number;
    equityAccountsTotal: number;
    accounts: Array<{
      id: number;
      name: string;
      type: string;
      currency: string;
      status: string;
      openingBalance: number;
      currentBalance: number;
      isEquity: boolean;
    }>;
  };
  salesAndProfit: {
    dynamicCostRatio: number;
    allTime: {
      totalOrdersCount: number;
      activeOrdersCount: number;
      cancelledOrdersCount: number;
      deliveredCount: number;
      shippedCount: number;
      pendingOrPurchasedCount: number;
      totalSales: number;
      totalDiscounts: number;
      totalDeliveryFees: number;
      totalPaidOnOrders: number;
      totalRemainingOnOrders: number;
      totalPaymentsCollectedAllTime: number;
      totalPurchaseCost: number;
      grossProfit: number;
      grossMarginPercent: number;
      totalExpenses: number;
      netProfit: number;
      netProfitMarginPercent: number;
      netCollectedCash: number;
      aov: number;
      collectionRate: number;
    };
    today: {
      date: string;
      ordersCount: number;
      sales: number;
      paymentsCount: number;
      cashIn: number;
      expensesCount: number;
      cashOut: number;
      netCashFlow: number;
      pendingOrdersCount: number;
    };
    thisMonth: {
      monthKey: string;
      monthLabel: string;
      ordersCount: number;
      sales: number;
      purchaseCost: number;
      grossProfit: number;
      expenses: number;
      netProfit: number;
      cashIn: number;
    };
    lastMonth: {
      monthKey: string;
      monthLabel: string;
      ordersCount: number;
      sales: number;
      purchaseCost: number;
      grossProfit: number;
      expenses: number;
      netProfit: number;
      cashIn: number;
    };
    byPlatform: Array<{ platform: string; count: number; totalSales: number }>;
    byStatus: Record<string, { count: number; totalSales: number }>;
    monthlyTrend: Array<{
      monthKey: string;
      monthLabel: string;
      ordersCount: number;
      sales: number;
      purchaseCost: number;
      expenses: number;
      netProfit: number;
      cashIn: number;
    }>;
  };
  customersLedger: {
    totalCustomersCount: number;
    debtorsCount: number;
    creditorsCount: number;
    settledCount: number;
    totalPositiveCustomerDebts: number;
    totalNegativeCustomerCredits: number;
    netCustomerBalances: number;
    reconciliation: {
      reconciledCount: number;
      mismatchedCount: number;
      matchRate: number;
      totalOperationalBalance: number;
      totalLedgerBalance: number;
      netDifference: number;
      mismatchedCustomers: Array<{
        customerId: number;
        code: string;
        name: string;
        operationalBalance: number;
        ledgerBalance: number;
        difference: number;
      }>;
    };
    allCustomers: Array<{
      id: number;
      code: string;
      name: string;
      phone: string;
      openingBalance: number;
      ordersCount: number;
      totalOrdersDebit: number;
      totalPaymentsCredit: number;
      currentBalance: number;
      status: 'debtor' | 'creditor' | 'settled';
    }>;
  };
  expensesSummary: {
    totalExpensesAllActive: number;
    activeExpensesCount: number;
    cancelledExpensesCount: number;
    operationalExpensesTotal: number;
    shippingSyntheticTotal: number;
    expenseToSalesRatioPercent: number;
    byCategory: Array<{ category: string; count: number; total: number; sharePercent: number }>;
    byAccount: Array<{ accountName: string; count: number; total: number }>;
    byMonth: Array<{ monthKey: string; monthLabel: string; count: number; total: number }>;
    topVendors: Array<{ vendor: string; count: number; total: number }>;
  };
  shipmentsSummary: {
    totalCount: number;
    totalShippingCost: number;
    shipments: Array<{
      id: number;
      shipmentNumber: string;
      carrier: string;
      shippingCost: number;
      status: string;
      linkedOrdersCount: number;
      createdAt: string;
    }>;
  };
  purchaseBatchesSummary: {
    totalCount: number;
    totalPurchaseCost: number;
    totalPurchaseFees: number;
    totalTransferFees: number;
    grandTotalCost: number;
    totalPaidToSuppliers: number;
    totalRemainingToSuppliers: number;
    batches: Array<{
      id: number;
      batchNumber: string;
      supplier: string;
      supplierName?: string | null;
      purchaseDate: string;
      accountName: string;
      totalCost: number;
      paidAmount: number;
      remainingSupplierAmount: number;
      linkedOrdersCount: number;
      status: string;
    }>;
  };
  couriersSummary: {
    couriersCount: number;
    totalCustodyBalance: number;
    totalPayableBalance: number;
    deliveryOrdersCount: number;
    deliveredCount: number;
    inProgressCount: number;
    failedOrReturnedCount: number;
    settlementsTotal: number;
    cashCollectionsTotal: number;
    couriers: Array<{
      id: number;
      code: string;
      name: string;
      phone: string;
      zone: string;
      status: string;
      currentCustodyBalance: number;
      currentPayableBalance: number;
      deliveredOrdersCount: number;
    }>;
  };
  workersSummary: {
    workersCount: number;
    totalAllWorkerExpenses: number;
    workers: Array<{
      id: number;
      name: string;
      role: string;
      phone: string;
      status: string;
      expensesCount: number;
      qatTotal: number;
      dinnerTotal: number;
      transportTotal: number;
      internetTotal: number;
      otherTotal: number;
      totalSpent: number;
    }>;
  };
  receivablesAndEquity: {
    otherReceivablesCount: number;
    unsettledOpeningTotal: number;
    unsettledRemainingTotal: number;
    receivables: Array<{
      id: number;
      name: string;
      entityType: string;
      reason: string;
      openingBalance: number;
      paidAmount: number;
      remainingBalance: number;
      status: string;
      openingDate: string;
    }>;
    owners: Array<{
      id: number;
      name: string;
      ownershipPercentage: number;
      contributedCapital: number;
      status: string;
    }>;
    installmentPlansCount: number;
    activeInstallmentsCount: number;
    totalInstallmentsRemaining: number;
    returnsCount: number;
  };
  marketingSummary: {
    stats: any;
    campaigns: Array<{
      id: number;
      name: string;
      status: string;
      budget: number;
      actualSpend: number;
    }>;
    channels: Array<{ id: number; name: string; type: string; status: string }>;
    discountCodes: Array<{ id: number; code: string; usageCount: number; status: string }>;
  };
  accountingAudit: {
    passed: boolean;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    errors: string[];
    warnings: string[];
    metrics: any;
    ledgerTotalDebit: number;
    ledgerTotalCredit: number;
    ledgerDiff: number;
    activeJournalEntriesCount: number;
    totalJournalEntriesCount: number;
    fiscalPeriods: Array<{ name: string; status: string; startDate: string; endDate: string }>;
    recentAuditLogs: Array<{ action: string; entityType: string; description: string; createdAt: string }>;
  };
}

export function buildComprehensiveStoreSnapshot(store: LiveStoreInputs): SystemGroundTruthSnapshot {
  const now = new Date();
  const formatLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const todayStr = formatLocalDate(now);
  const currentMonthKey = todayStr.slice(0, 7);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = formatLocalDate(prevMonthDate).slice(0, 7);

  const accounts = store.accounts || [];
  const customers = store.customers || [];
  const orders = store.orders || [];
  const payments = store.payments || [];
  const expenses = store.expenses || [];
  const shipments = store.shipments || [];
  const purchaseBatches = store.purchaseBatches || [];
  const couriers = store.couriers || [];
  const deliveryOrders = store.deliveryOrders || [];
  const courierSettlements = store.courierSettlements || [];
  const deliveryCashCollections = store.deliveryCashCollections || [];
  const workers = store.workers || [];
  const otherReceivables = store.otherReceivables || [];
  const owners = store.owners || [];
  const installmentPlans = store.installmentPlans || [];
  const returns = store.data?.tables?.returns || [];
  const journalEntries = store.journalEntries || [];

  // 1. Liquidity & Accounts
  const accountDetails = accounts.map(a => {
    const isEquity = a.type === 'حقوق ملكية';
    const currentBalance = roundCurrency(store.getAccountBalance(a.id));
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      currency: (a as any).currency || 'ر.ي',
      status: a.status,
      openingBalance: num(a.openingBalance),
      currentBalance,
      isEquity
    };
  });

  const activeNonEquity = accountDetails.filter(a => a.status === 'active' && !a.isEquity);
  const visaCards = activeNonEquity.filter(
    a => a.type === 'بطاقة' || a.name.toLowerCase().includes('visa') || a.name.includes('بطاقة') || a.name.includes('فيزا')
  );
  const cashBoxes = activeNonEquity.filter(a => a.type === 'نقدي' || a.name.includes('صندوق') || a.name.includes('كاش'));
  const walletsAndBanks = activeNonEquity.filter(
    a => !visaCards.includes(a) && !cashBoxes.includes(a)
  );
  const equityAccounts = accountDetails.filter(a => a.status === 'active' && a.isEquity);

  // 2. Sales, Orders & Profit (exact formulas matching AnalyticsCenterView.tsx)
  const activeOrders = orders.filter(o => o.status !== 'cancelled');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const ordersWithCost = activeOrders.filter(o => num(o.purchaseCost) > 0);
  const recordedCostSum = ordersWithCost.reduce((s, o) => s + num(o.purchaseCost), 0);
  const recordedSalesSum = ordersWithCost.reduce((s, o) => s + num(o.totalAmount), 0);
  const dynamicCostRatio = recordedSalesSum > 0 ? recordedCostSum / recordedSalesSum : 0.7901;

  const getOrderCost = (o: Order): number => {
    const explicit = num(o.purchaseCost);
    if (explicit > 0) return explicit;
    const base = num(o.totalAmount || o.subtotal);
    return base > 0 ? Math.round(base * dynamicCostRatio) : 0;
  };

  const totalSales = roundCurrency(activeOrders.reduce((s, o) => s + num(o.totalAmount), 0));
  const totalDiscounts = roundCurrency(activeOrders.reduce((s, o) => s + num(o.discount), 0));
  const totalDeliveryFees = roundCurrency(activeOrders.reduce((s, o) => s + num(o.deliveryFee), 0));
  const totalPaidOnOrders = roundCurrency(activeOrders.reduce((s, o) => s + num(o.paidAmount), 0));
  const totalRemainingOnOrders = roundCurrency(activeOrders.reduce((s, o) => s + num(o.remainingAmount), 0));
  const totalPurchaseCost = roundCurrency(activeOrders.reduce((s, o) => s + getOrderCost(o), 0));

  const activePayments = payments.filter(p => p.status !== 'cancelled');
  const totalPaymentsCollectedAllTime = roundCurrency(activePayments.reduce((s, p) => s + num(p.amount), 0));

  const activeExpenses = expenses.filter(e => e.status !== 'cancelled');
  const cancelledExpenses = expenses.filter(e => e.status === 'cancelled');
  const totalActiveExpenses = roundCurrency(activeExpenses.reduce((s, e) => s + num(e.amount), 0));

  const grossProfit = roundCurrency(Math.max(0, totalSales - totalPurchaseCost));
  const netProfit = roundCurrency(grossProfit - totalActiveExpenses);
  const grossMarginPercent = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0;
  const netProfitMarginPercent = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;
  const netCollectedCash = roundCurrency(totalPaidOnOrders - totalActiveExpenses);
  const aov = activeOrders.length > 0 ? Math.round(totalSales / activeOrders.length) : 0;
  const collectionRate = totalSales > 0 ? Math.round((totalPaidOnOrders / totalSales) * 100) : 0;

  // Today metrics
  const todayOrders = activeOrders.filter(o => dateOnly(o.orderDate || o.createdAt) === todayStr);
  const todayPayments = activePayments.filter(p => dateOnly(p.paymentDate || p.createdAt) === todayStr);
  const todayExpensesList = activeExpenses.filter(e => dateOnly((e as any).expenseDate || (e as any).date || e.createdAt) === todayStr);
  const todayCashIn = roundCurrency(todayPayments.reduce((s, p) => s + num(p.amount), 0));
  const todayCashOut = roundCurrency(todayExpensesList.reduce((s, e) => s + num(e.amount), 0));

  // Period helper for a specific YYYY-MM
  const computeMonthStats = (mk: string) => {
    const mOrders = activeOrders.filter(o => monthKeyOf(o.orderDate || o.createdAt) === mk);
    const mExpenses = activeExpenses.filter(e => monthKeyOf((e as any).expenseDate || (e as any).date || e.createdAt) === mk);
    const mPayments = activePayments.filter(p => monthKeyOf(p.paymentDate || p.createdAt) === mk);
    const sales = roundCurrency(mOrders.reduce((s, o) => s + num(o.totalAmount), 0));
    const purchaseCost = roundCurrency(mOrders.reduce((s, o) => s + getOrderCost(o), 0));
    const gross = roundCurrency(Math.max(0, sales - purchaseCost));
    const exp = roundCurrency(mExpenses.reduce((s, e) => s + num(e.amount), 0));
    const net = roundCurrency(gross - exp);
    const cashIn = roundCurrency(mPayments.reduce((s, p) => s + num(p.amount), 0));
    return {
      monthKey: mk,
      monthLabel: monthLabelAr(mk),
      ordersCount: mOrders.length,
      sales,
      purchaseCost,
      grossProfit: gross,
      expenses: exp,
      netProfit: net,
      cashIn
    };
  };

  // Monthly trend across all months present in data
  const monthKeysSet = new Set<string>();
  activeOrders.forEach(o => {
    const mk = monthKeyOf(o.orderDate || o.createdAt);
    if (mk) monthKeysSet.add(mk);
  });
  activeExpenses.forEach(e => {
    const mk = monthKeyOf((e as any).expenseDate || (e as any).date || e.createdAt);
    if (mk) monthKeysSet.add(mk);
  });
  const monthlyTrend = Array.from(monthKeysSet)
    .sort()
    .map(mk => {
      const m = computeMonthStats(mk);
      return {
        monthKey: m.monthKey,
        monthLabel: m.monthLabel,
        ordersCount: m.ordersCount,
        sales: m.sales,
        purchaseCost: m.purchaseCost,
        expenses: m.expenses,
        netProfit: m.netProfit,
        cashIn: m.cashIn
      };
    });

  // By Platform & By Status
  const platformMap: Record<string, { count: number; totalSales: number }> = {};
  const statusMap: Record<string, { count: number; totalSales: number }> = {};
  activeOrders.forEach(o => {
    const rawSite = String(o.site || 'أخرى').toUpperCase();
    const platform = rawSite.includes('SHEIN') || rawSite.includes('شي')
      ? 'شي إن (SHEIN)'
      : rawSite.includes('ALI') || rawSite.includes('علي')
      ? 'علي إكسبرس (AliExpress)'
      : o.site || 'متاجر أخرى';
    if (!platformMap[platform]) platformMap[platform] = { count: 0, totalSales: 0 };
    platformMap[platform].count += 1;
    platformMap[platform].totalSales = roundCurrency(platformMap[platform].totalSales + num(o.totalAmount));

    const st = o.status || 'pending';
    if (!statusMap[st]) statusMap[st] = { count: 0, totalSales: 0 };
    statusMap[st].count += 1;
    statusMap[st].totalSales = roundCurrency(statusMap[st].totalSales + num(o.totalAmount));
  });

  // 3. Customers Ledger (exact StoreContext.getCustomerBalance)
  const allCustomersList = customers
    .map(c => {
      const opening = num(c.openingBalance);
      const custOrders = activeOrders.filter(o => o.customerId === c.id);
      const totalOrdersDebit = roundCurrency(custOrders.reduce((s, o) => s + num(o.totalAmount), 0));
      const custPayments = activePayments.filter(p => p.customerId === c.id);
      const totalPaymentsCredit = roundCurrency(custPayments.reduce((s, p) => s + num(p.amount), 0));
      const currentBalance = roundCurrency(store.getCustomerBalance(c.id));
      const status: 'debtor' | 'creditor' | 'settled' =
        currentBalance > 0.01 ? 'debtor' : currentBalance < -0.01 ? 'creditor' : 'settled';

      return {
        id: c.id,
        code: c.code || `CUST-${c.id}`,
        name: c.name,
        phone: c.phone || '',
        openingBalance: opening,
        ordersCount: custOrders.length,
        totalOrdersDebit,
        totalPaymentsCredit,
        currentBalance,
        status
      };
    })
    .sort((a, b) => b.currentBalance - a.currentBalance);

  const debtors = allCustomersList.filter(c => c.currentBalance > 0.01);
  const creditors = allCustomersList.filter(c => c.currentBalance < -0.01);
  const settled = allCustomersList.filter(c => Math.abs(c.currentBalance) <= 0.01);

  const totalPositiveCustomerDebts = roundCurrency(debtors.reduce((s, c) => s + c.currentBalance, 0));
  const totalNegativeCustomerCredits = roundCurrency(creditors.reduce((s, c) => s + Math.abs(c.currentBalance), 0));
  const netCustomerBalances = roundCurrency(totalPositiveCustomerDebts - totalNegativeCustomerCredits);

  const recReport = reconcileCustomerBalances(customers, orders, payments, journalEntries);
  const mismatchedCustomers = recReport.items
    .filter(item => !item.isReconciled)
    .map(item => ({
      customerId: item.customerId,
      code: item.customerCode,
      name: item.customerName,
      operationalBalance: item.operationalBalance,
      ledgerBalance: item.ledgerBalance,
      difference: item.difference
    }));

  // 4. Expenses Breakdown (exact ExpenseAnalyticsTab / StoreContext rules)
  const shippingExpensesList = activeExpenses.filter(
    e => e.expenseNumber?.startsWith('EXP-SHP-') || e.category === 'شحن ونقل لوجستي'
  );
  const shippingSyntheticTotal = roundCurrency(shippingExpensesList.reduce((s, e) => s + num(e.amount), 0));
  const operationalExpensesTotal = roundCurrency(totalActiveExpenses - shippingSyntheticTotal);

  const expCatMap: Record<string, { count: number; total: number }> = {};
  const expAccMap: Record<string, { count: number; total: number }> = {};
  const expMonthMap: Record<string, { count: number; total: number }> = {};
  const expVendorMap: Record<string, { count: number; total: number }> = {};

  activeExpenses.forEach(e => {
    const amt = num(e.amount);
    const cat = e.category || 'غير مصنف';
    if (!expCatMap[cat]) expCatMap[cat] = { count: 0, total: 0 };
    expCatMap[cat].count += 1;
    expCatMap[cat].total = roundCurrency(expCatMap[cat].total + amt);

    const accObj = accounts.find(a => Number(a.id) === Number(e.accountId));
    const accName = accObj?.name || e.paymentMethod || 'غير محدد';
    if (!expAccMap[accName]) expAccMap[accName] = { count: 0, total: 0 };
    expAccMap[accName].count += 1;
    expAccMap[accName].total = roundCurrency(expAccMap[accName].total + amt);

    const mk = monthKeyOf((e as any).expenseDate || (e as any).date || e.createdAt) || 'غير محدد';
    if (!expMonthMap[mk]) expMonthMap[mk] = { count: 0, total: 0 };
    expMonthMap[mk].count += 1;
    expMonthMap[mk].total = roundCurrency(expMonthMap[mk].total + amt);

    const vendor = (e.vendorName || '').trim() || 'غير محدد';
    if (!expVendorMap[vendor]) expVendorMap[vendor] = { count: 0, total: 0 };
    expVendorMap[vendor].count += 1;
    expVendorMap[vendor].total = roundCurrency(expVendorMap[vendor].total + amt);
  });

  // 5. Shipments & Purchase Batches
  const activeShipments = shipments.filter(s => s.status !== 'cancelled');
  const totalShippingCost = roundCurrency(activeShipments.reduce((s, sh) => s + num(sh.shippingCost), 0));

  const batchesSummary = {
    totalCount: purchaseBatches.length,
    totalPurchaseCost: roundCurrency(purchaseBatches.reduce((s, b) => s + num(b.purchaseCost), 0)),
    totalPurchaseFees: roundCurrency(purchaseBatches.reduce((s, b) => s + num(b.purchaseFees), 0)),
    totalTransferFees: roundCurrency(purchaseBatches.reduce((s, b) => s + num(b.transferFees), 0)),
    grandTotalCost: roundCurrency(purchaseBatches.reduce((s, b) => s + num(b.totalCost), 0)),
    totalPaidToSuppliers: roundCurrency(
      purchaseBatches
        .filter(b => b.status !== 'cancelled')
        .reduce((s, b) => s + (b.paidAmount !== undefined ? num(b.paidAmount) : num(b.totalCost)), 0)
    ),
    totalRemainingToSuppliers: roundCurrency(
      purchaseBatches
        .filter(b => b.status !== 'cancelled')
        .reduce((s, b) => s + (b.remainingSupplierAmount !== undefined ? num(b.remainingSupplierAmount) : 0), 0)
    ),
    batches: purchaseBatches.map(b => {
      const total = num(b.totalCost);
      const paid = b.paidAmount !== undefined ? num(b.paidAmount) : total;
      const remaining = b.remainingSupplierAmount !== undefined ? num(b.remainingSupplierAmount) : Math.max(0, total - paid);
      return {
        id: b.id,
        batchNumber: b.batchNumber || `BCH-${b.id}`,
        supplier: b.source || 'SHEIN',
        supplierName: b.supplierName || null,
        purchaseDate: b.purchaseDate || dateOnly(b.createdAt),
        accountName: b.accountName || 'غير محدد',
        totalCost: total,
        paidAmount: paid,
        remainingSupplierAmount: remaining,
        linkedOrdersCount: Array.isArray(b.orderIds) ? b.orderIds.length : 0,
        status: b.status || 'active'
      };
    })
  };

  // 6. Couriers & Delivery
  const totalCustodyBalance = roundCurrency(couriers.reduce((s, c) => s + num(c.currentCustodyBalance), 0));
  const totalPayableBalance = roundCurrency(couriers.reduce((s, c) => s + num(c.currentPayableBalance), 0));
  const deliveredDeliveryCount = deliveryOrders.filter(d => d.status === 'delivered').length;
  const inProgressDeliveryCount = deliveryOrders.filter(
    d => d.status === 'pending_dispatch' || d.status === 'received_by_courier' || d.status === 'out_for_delivery'
  ).length;
  const failedDeliveryCount = deliveryOrders.filter(
    d => d.status === 'delivery_failed' || d.status === 'returned' || d.status === 'cancelled'
  ).length;

  // 7. Workers (matching WorkersView.tsx exact algorithm)
  const workersList = workers.map(worker => {
    const wName = (worker.name || '').trim();
    const wExpenses = activeExpenses.filter(e => {
      const vendor = String(e.vendorName || '').trim();
      const desc = String(e.description || '').trim();
      return wName ? vendor.includes(wName) || desc.includes(wName) : false;
    });
    let qatTotal = 0;
    let dinnerTotal = 0;
    let transportTotal = 0;
    let internetTotal = 0;
    let otherTotal = 0;
    wExpenses.forEach(e => {
      const amt = num(e.amount);
      const cat = e.category || '';
      const desc = e.description || '';
      if (cat === 'قات' || desc.includes('قات')) qatTotal += amt;
      else if (cat === 'عشاء' || desc.includes('عشاء') || desc.includes('روتي')) dinnerTotal += amt;
      else if (cat === 'مواصلات' || desc.includes('مواصلات') || desc.includes('توصيل')) transportTotal += amt;
      else if (cat === 'إنترنت' || desc.includes('نت') || desc.includes('فورجي')) internetTotal += amt;
      else otherTotal += amt;
    });
    return {
      id: worker.id,
      name: worker.name,
      role: worker.role || 'عامل تشغيل',
      phone: worker.phone || '',
      status: worker.status,
      expensesCount: wExpenses.length,
      qatTotal: roundCurrency(qatTotal),
      dinnerTotal: roundCurrency(dinnerTotal),
      transportTotal: roundCurrency(transportTotal),
      internetTotal: roundCurrency(internetTotal),
      otherTotal: roundCurrency(otherTotal),
      totalSpent: roundCurrency(qatTotal + dinnerTotal + transportTotal + internetTotal + otherTotal)
    };
  });

  // 8. Receivables & Equity
  const unsettledReceivables = otherReceivables.filter(r => r.status !== 'settled');
  const unsettledOpeningTotal = roundCurrency(unsettledReceivables.reduce((s, r) => s + num(r.openingBalance), 0));
  const unsettledRemainingTotal = roundCurrency(
    unsettledReceivables.reduce((s, r) => s + num(r.remainingBalance !== undefined ? r.remainingBalance : r.openingBalance), 0)
  );

  // 9. Accounting Audit
  const integrityAudit = runDataIntegrityTests(store.data);
  const activeEntries = journalEntries.filter(je => isEntryActiveInLedger(je, journalEntries));
  const ledgerAudit = auditLedgerIntegrity(activeEntries);

  return {
    meta: {
      generatedAt: now.toISOString(),
      todayStr,
      currentMonthKey,
      lastMonthKey,
      lastSyncTime: store.lastSyncTime || null,
      realtimeStatus: store.realtimeStatus || 'connected'
    },
    liquidity: {
      totalCashAndBanks: roundCurrency(store.totalCashAndBanks),
      activeLiquidityAccountsCount: activeNonEquity.length,
      visaCardsTotal: roundCurrency(visaCards.reduce((s, a) => s + a.currentBalance, 0)),
      cashBoxesTotal: roundCurrency(cashBoxes.reduce((s, a) => s + a.currentBalance, 0)),
      walletsAndBanksTotal: roundCurrency(walletsAndBanks.reduce((s, a) => s + a.currentBalance, 0)),
      equityAccountsTotal: roundCurrency(equityAccounts.reduce((s, a) => s + a.currentBalance, 0)),
      accounts: accountDetails
    },
    salesAndProfit: {
      dynamicCostRatio: Number(dynamicCostRatio.toFixed(4)),
      allTime: {
        totalOrdersCount: orders.length,
        activeOrdersCount: activeOrders.length,
        cancelledOrdersCount: cancelledOrders.length,
        deliveredCount: activeOrders.filter(o => o.status === 'delivered').length,
        shippedCount: activeOrders.filter(o => o.status === 'shipped').length,
        pendingOrPurchasedCount: activeOrders.filter(o => o.status === 'pending' || o.status === 'purchased').length,
        totalSales,
        totalDiscounts,
        totalDeliveryFees,
        totalPaidOnOrders,
        totalRemainingOnOrders,
        totalPaymentsCollectedAllTime,
        totalPurchaseCost,
        grossProfit,
        grossMarginPercent,
        totalExpenses: totalActiveExpenses,
        netProfit,
        netProfitMarginPercent,
        netCollectedCash,
        aov,
        collectionRate
      },
      today: {
        date: todayStr,
        ordersCount: todayOrders.length,
        sales: roundCurrency(todayOrders.reduce((s, o) => s + num(o.totalAmount), 0)),
        paymentsCount: todayPayments.length,
        cashIn: todayCashIn,
        expensesCount: todayExpensesList.length,
        cashOut: todayCashOut,
        netCashFlow: roundCurrency(todayCashIn - todayCashOut),
        pendingOrdersCount: todayOrders.filter(o => o.status === 'pending').length
      },
      thisMonth: computeMonthStats(currentMonthKey),
      lastMonth: computeMonthStats(lastMonthKey),
      byPlatform: Object.entries(platformMap).map(([platform, v]) => ({
        platform,
        count: v.count,
        totalSales: v.totalSales
      })),
      byStatus: statusMap,
      monthlyTrend
    },
    customersLedger: {
      totalCustomersCount: customers.length,
      debtorsCount: debtors.length,
      creditorsCount: creditors.length,
      settledCount: settled.length,
      totalPositiveCustomerDebts,
      totalNegativeCustomerCredits,
      netCustomerBalances,
      reconciliation: {
        reconciledCount: recReport.reconciledCount,
        mismatchedCount: recReport.mismatchedCount,
        matchRate: recReport.matchRate,
        totalOperationalBalance: recReport.totalOperationalBalance,
        totalLedgerBalance: recReport.totalLedgerBalance,
        netDifference: recReport.netDifference,
        mismatchedCustomers
      },
      allCustomers: allCustomersList
    },
    expensesSummary: {
      totalExpensesAllActive: totalActiveExpenses,
      activeExpensesCount: activeExpenses.length,
      cancelledExpensesCount: cancelledExpenses.length,
      operationalExpensesTotal,
      shippingSyntheticTotal,
      expenseToSalesRatioPercent: totalSales > 0 ? Number(((totalActiveExpenses / totalSales) * 100).toFixed(1)) : 0,
      byCategory: Object.entries(expCatMap)
        .map(([category, v]) => ({
          category,
          count: v.count,
          total: v.total,
          sharePercent: totalActiveExpenses > 0 ? Number(((v.total / totalActiveExpenses) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.total - a.total),
      byAccount: Object.entries(expAccMap)
        .map(([accountName, v]) => ({ accountName, count: v.count, total: v.total }))
        .sort((a, b) => b.total - a.total),
      byMonth: Object.entries(expMonthMap)
        .map(([monthKey, v]) => ({ monthKey, monthLabel: monthLabelAr(monthKey), count: v.count, total: v.total }))
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
      topVendors: Object.entries(expVendorMap)
        .map(([vendor, v]) => ({ vendor, count: v.count, total: v.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15)
    },
    shipmentsSummary: {
      totalCount: shipments.length,
      totalShippingCost,
      shipments: shipments.map(s => ({
        id: s.id,
        shipmentNumber: s.shipmentNumber,
        carrier: s.carrier,
        shippingCost: num(s.shippingCost),
        status: s.status,
        linkedOrdersCount: Array.isArray(s.orderIds) ? s.orderIds.length : 0,
        createdAt: dateOnly(s.createdAt)
      }))
    },
    purchaseBatchesSummary: batchesSummary,
    couriersSummary: {
      couriersCount: couriers.length,
      totalCustodyBalance,
      totalPayableBalance,
      deliveryOrdersCount: deliveryOrders.length,
      deliveredCount: deliveredDeliveryCount,
      inProgressCount: inProgressDeliveryCount,
      failedOrReturnedCount: failedDeliveryCount,
      settlementsTotal: roundCurrency(
        courierSettlements.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + num(s.amount), 0)
      ),
      cashCollectionsTotal: roundCurrency(
        deliveryCashCollections.reduce((sum, c) => sum + num(c.amount), 0)
      ),
      couriers: couriers.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        phone: c.phone,
        zone: c.zone || c.coverageZones || '',
        status: c.status,
        currentCustodyBalance: num(c.currentCustodyBalance),
        currentPayableBalance: num(c.currentPayableBalance),
        deliveredOrdersCount: num(c.deliveredOrdersCount)
      }))
    },
    workersSummary: {
      workersCount: workers.length,
      totalAllWorkerExpenses: roundCurrency(workersList.reduce((s, w) => s + w.totalSpent, 0)),
      workers: workersList
    },
    receivablesAndEquity: {
      otherReceivablesCount: otherReceivables.length,
      unsettledOpeningTotal,
      unsettledRemainingTotal,
      receivables: otherReceivables.map(r => ({
        id: r.id,
        name: r.name,
        entityType: r.entityType,
        reason: r.reason,
        openingBalance: num(r.openingBalance),
        paidAmount: num(r.paidAmount),
        remainingBalance: r.status === 'settled' ? 0 : num(r.remainingBalance !== undefined ? r.remainingBalance : r.openingBalance),
        status: r.status,
        openingDate: dateOnly(r.openingDate || r.createdAt)
      })),
      owners: owners.map(o => ({
        id: o.id,
        name: o.name,
        ownershipPercentage: num(o.ownershipPercentage),
        contributedCapital: num(o.contributedCapital),
        status: o.status
      })),
      installmentPlansCount: installmentPlans.length,
      activeInstallmentsCount: installmentPlans.filter(p => p.status === 'active' || p.status === 'overdue').length,
      totalInstallmentsRemaining: roundCurrency(
        installmentPlans
          .filter(p => p.status === 'active' || p.status === 'overdue')
          .reduce((s, p) => s + num(p.remainingAmount), 0)
      ),
      returnsCount: returns.length
    },
    marketingSummary: {
      stats: store.marketingStats || {},
      campaigns: (store.marketingCampaigns || []).map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        budget: num(c.budget),
        actualSpend: num(c.actualSpend || (c as any).spentAmount)
      })),
      channels: (store.marketingChannels || []).map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        status: ch.status
      })),
      discountCodes: (store.discountCodes || []).map(dc => ({
        id: dc.id,
        code: dc.code,
        usageCount: num(dc.usageCount),
        status: dc.status
      }))
    },
    accountingAudit: {
      passed: integrityAudit.passed,
      totalChecks: integrityAudit.totalChecks,
      passedChecks: integrityAudit.passedChecks,
      failedChecks: integrityAudit.failedChecks,
      errors: integrityAudit.errors.slice(0, 15),
      warnings: integrityAudit.warnings.slice(0, 15),
      metrics: integrityAudit.metrics,
      ledgerTotalDebit: ledgerAudit.totalDebit,
      ledgerTotalCredit: ledgerAudit.totalCredit,
      ledgerDiff: ledgerAudit.diff,
      activeJournalEntriesCount: activeEntries.length,
      totalJournalEntriesCount: journalEntries.length,
      fiscalPeriods: (store.fiscalPeriods || []).map(fp => ({
        name: fp.periodName,
        status: fp.status,
        startDate: fp.startDate,
        endDate: fp.endDate
      })),
      recentAuditLogs: (store.auditLogs || []).slice(0, 12).map(al => ({
        action: al.action,
        entityType: al.entityType,
        description: al.description,
        createdAt: dateOnly(al.createdAt)
      }))
    }
  };
}

/**
 * Extracts deep item-level details matching keywords, customer names, order numbers,
 * accounts, workers, couriers, shipments, categories, or dates in the user query.
 */
export function extractQuerySpecificDetails(query: string, store: LiveStoreInputs): Record<string, any> {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/[\s،,؟?#!]+/).filter(t => t.length >= 2);
  const details: Record<string, any> = {};

  // 1. Match specific customers
  const matchedCustomers = (store.customers || []).filter(c => {
    const name = (c.name || '').toLowerCase();
    const code = (c.code || '').toLowerCase();
    const phone = (c.phone || '').toLowerCase();
    if (name && q.includes(name)) return true;
    if (code && q.includes(code)) return true;
    if (phone && phone.length >= 5 && q.includes(phone)) return true;
    return tokens.some(t => t.length >= 3 && (name.includes(t) || code.includes(t)));
  });

  if (matchedCustomers.length > 0 && matchedCustomers.length <= 8) {
    details.matchedCustomers = matchedCustomers.map(c => {
      const custOrders = (store.orders || [])
        .filter(o => o.customerId === c.id)
        .map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          internalNumber: o.internalNumber,
          invoiceNumber: o.invoiceNumber,
          shipmentNumber: o.shipmentNumber,
          site: o.site,
          status: o.status,
          orderDate: dateOnly(o.orderDate || o.createdAt),
          totalAmount: num(o.totalAmount),
          paidAmount: num(o.paidAmount),
          remainingAmount: num(o.remainingAmount),
          deliveryFee: num(o.deliveryFee),
          discount: num(o.discount)
        }));
      const custPayments = (store.payments || [])
        .filter(p => p.customerId === c.id && p.status !== 'cancelled')
        .map(p => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          orderId: p.orderId,
          amount: num(p.amount),
          paymentMethod: p.paymentMethod,
          paymentDate: dateOnly(p.paymentDate || p.createdAt),
          notes: p.notes
        }));
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        phone: c.phone,
        openingBalance: num(c.openingBalance),
        currentBalance: roundCurrency(store.getCustomerBalance(c.id)),
        orders: custOrders,
        payments: custPayments
      };
    });
  }

  // 2. Match specific orders (by orderNumber, internalNumber, invoiceNumber, shipmentNumber, or extracted digits)
  const numericMatches = q.match(/\d{2,}/g) || [];
  const matchedOrders = (store.orders || []).filter(o => {
    const ordNum = String(o.orderNumber || '').toLowerCase();
    const intNum = String(o.internalNumber || '').toLowerCase();
    const invNum = String(o.invoiceNumber || '').toLowerCase();
    const shpNum = String(o.shipmentNumber || '').toLowerCase();
    if (ordNum && q.includes(ordNum)) return true;
    if (intNum && q.includes(intNum)) return true;
    if (invNum && q.includes(invNum)) return true;
    if (shpNum && q.includes(shpNum)) return true;
    return numericMatches.some(n => ordNum === n || intNum.includes(n) || String(o.id) === n);
  });

  if (matchedOrders.length > 0 && matchedOrders.length <= 15) {
    details.matchedOrders = matchedOrders.map(o => {
      const cust = (store.customers || []).find(c => c.id === o.customerId);
      const linkedPayments = (store.payments || [])
        .filter(p => p.status !== 'cancelled' && (p.orderId === o.id || (Array.isArray((p as any).orderIds) && (p as any).orderIds.includes(o.id))))
        .map(p => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          amount: num(p.amount),
          paymentMethod: p.paymentMethod,
          paymentDate: dateOnly(p.paymentDate || p.createdAt)
        }));
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        internalNumber: o.internalNumber,
        invoiceNumber: o.invoiceNumber,
        shipmentNumber: o.shipmentNumber,
        customerName: cust?.name || o.customerName || 'غير معروف',
        customerCode: cust?.code || o.customerCode || '',
        site: o.site,
        status: o.status,
        orderDate: dateOnly(o.orderDate || o.createdAt),
        totalAmount: num(o.totalAmount),
        paidAmount: num(o.paidAmount),
        remainingAmount: num(o.remainingAmount),
        purchaseCost: num(o.purchaseCost),
        deliveryFee: num(o.deliveryFee),
        discount: num(o.discount),
        linkedPayments
      };
    });
  }

  // 3. Match specific accounts and provide recent transactions
  const matchedAccounts = (store.accounts || []).filter(a => {
    const name = (a.name || '').toLowerCase();
    if (name && q.includes(name)) return true;
    return tokens.some(t => t.length >= 3 && name.includes(t));
  });
  if (matchedAccounts.length > 0 && matchedAccounts.length <= 6) {
    details.matchedAccountsTransactions = matchedAccounts.map(acc => {
      const accTrx = (store.transactions || [])
        .filter(t => Number(t.accountId) === Number(acc.id))
        .slice(0, 25)
        .map(t => ({
          id: t.id,
          type: t.type,
          amount: num(t.amount),
          category: t.category,
          description: t.description,
          date: dateOnly(t.transactionDate || t.createdAt)
        }));
      return {
        accountId: acc.id,
        accountName: acc.name,
        currentBalance: roundCurrency(store.getAccountBalance(acc.id)),
        recentTransactions: accTrx
      };
    });
  }

  // 4. Recent orders / expenses / payments / deliveryOrders when user asks about latest operations or details
  if (
    q.includes('آخر') ||
    q.includes('أحدث') ||
    q.includes('اليوم') ||
    q.includes('تفاصيل') ||
    q.includes('الطلبات') ||
    q.includes('طلبيات')
  ) {
    details.recentOrders = [...(store.orders || [])]
      .sort((a, b) => new Date(b.orderDate || b.createdAt).getTime() - new Date(a.orderDate || a.createdAt).getTime())
      .slice(0, 15)
      .map(o => {
        const cust = (store.customers || []).find(c => c.id === o.customerId);
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          internalNumber: o.internalNumber,
          customerName: cust?.name || o.customerName,
          site: o.site,
          status: o.status,
          totalAmount: num(o.totalAmount),
          paidAmount: num(o.paidAmount),
          remainingAmount: num(o.remainingAmount),
          orderDate: dateOnly(o.orderDate || o.createdAt)
        };
      });
  }

  if (q.includes('مصروف') || q.includes('صرف') || q.includes('مصاريف') || q.includes('إنفاق')) {
    details.recentExpenses = [...(store.expenses || [])]
      .filter(e => e.status !== 'cancelled')
      .sort((a, b) => {
        const da = dateOnly((a as any).expenseDate || (a as any).date || a.createdAt);
        const db = dateOnly((b as any).expenseDate || (b as any).date || b.createdAt);
        return db.localeCompare(da);
      })
      .slice(0, 25)
      .map(e => ({
        id: e.id,
        expenseNumber: e.expenseNumber,
        category: e.category,
        vendorName: e.vendorName,
        amount: num(e.amount),
        description: e.description,
        date: dateOnly((e as any).expenseDate || (e as any).date || e.createdAt)
      }));
  }

  if (q.includes('موصل') || q.includes('مندوب') || q.includes('توصيل') || q.includes('عهدة')) {
    details.deliveryOrders = (store.deliveryOrders || []).map(d => ({
      id: d.id,
      orderNumber: d.orderNumber,
      customerName: d.customerName,
      governorate: d.governorate,
      courierName: d.courierName,
      status: d.status,
      deliveryFee: num(d.deliveryFee),
      orderRemainingAmount: num(d.orderRemainingAmount),
      collectionMethod: d.collectionMethod,
      dispatchDate: dateOnly(d.dispatchDate || d.createdAt)
    }));
  }

  // 5. Explicit date or Arabic month filter
  const isoDateMatch = q.match(/20\d{2}-\d{2}-\d{2}/);
  if (isoDateMatch) {
    const targetDate = isoDateMatch[0];
    const dayOrders = (store.orders || []).filter(o => o.status !== 'cancelled' && dateOnly(o.orderDate || o.createdAt) === targetDate);
    const dayPayments = (store.payments || []).filter(p => p.status !== 'cancelled' && dateOnly(p.paymentDate || p.createdAt) === targetDate);
    const dayExpenses = (store.expenses || []).filter(e => e.status !== 'cancelled' && dateOnly((e as any).expenseDate || (e as any).date || e.createdAt) === targetDate);
    details.specificDateBreakdown = {
      date: targetDate,
      ordersCount: dayOrders.length,
      sales: roundCurrency(dayOrders.reduce((s, o) => s + num(o.totalAmount), 0)),
      paymentsCount: dayPayments.length,
      cashIn: roundCurrency(dayPayments.reduce((s, p) => s + num(p.amount), 0)),
      expensesCount: dayExpenses.length,
      cashOut: roundCurrency(dayExpenses.reduce((s, e) => s + num(e.amount), 0))
    };
  }

  return details;
}
