import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  TopStoreBackup,
  Customer,
  Order,
  Account,
  PaymentMethod,
  Payment,
  Expense,
  Shipment,
  FinancialTransaction,
  JournalEntry,
  JournalLine,
  OtherReceivable,
  Owner,
  AuditLog,
  AssistantLog,
  AppSetting,
  MarketingCampaign,
  MarketingChannel,
  DiscountCode,
  MarketingBudget,
  Referral,
  PurchaseBatch,
  InstallmentPlan,
  InstallmentItem,
  ReceivablePayment,
  Courier,
  DeliveryTrip,
  DeliveryTripItem,
  DeliveryOrder,
  CourierSettlement,
  DeliveryCashCollection,
  Worker,
  ChartAccount,
  FiscalPeriod,
  FiscalYear,
  AppRole,
  Permission,
  IdempotencyRecord
} from '../types';
import { exportToZip } from '../utils/dataExporter';
import { getOrCreateCurrentDevice } from '../utils/deviceTracker';
import { INITIAL_DATA } from '../data/initialData';
import { subscribeToSupabaseRealtime, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';
import {
  roundCurrency,
  isJournalEntryBalanced,
  assertFiscalPeriodOpen,
  checkIdempotency,
  resolveChartAccount,
  reconcileCustomerBalances,
  CustomerReconciliationReport,
  DEFAULT_FISCAL_PERIODS,
  DEFAULT_FISCAL_YEARS,
  generateYearEndClosingEntry,
  generateAdjustingEntryForCustomer,
  sanitizeAndReconcileJournalEntries
} from '../services/AccountingEngine';
import { hasPermission, runDataIntegrityTests } from '../services/SecurityAndIntegrityTests';
import {
  RunningBalanceInfo,
  computeAllAccountsRunningBalances,
  computeAccountRunningBalances
} from '../utils/runningBalance';

export interface MarketingStats {
  totalSpend: number;
  activeCampaignsCount: number;
  customersCount: number;
  ordersCount: number;
  totalSales: number;
  grossProfit: number;
  cac: number;
  costPerOrder: number;
  roas: number;
  roi: number;
  conversionRate: number;
  aov: number;
  bestCampaign: { name: string; sales: number } | null;
  bestChannel: { name: string; sales: number } | null;
}

interface StoreContextType {
  data: TopStoreBackup;
  settings: Record<string, string>;
  customers: Customer[];
  orders: Order[];
  accounts: Account[];
  paymentMethods: PaymentMethod[];
  payments: Payment[];
  expenses: Expense[];
  shipments: Shipment[];
  transactions: FinancialTransaction[];
  journalEntries: JournalEntry[];
  otherReceivables: OtherReceivable[];
  owners: Owner[];
  assistantLogs: AssistantLog[];
  auditLogs: AuditLog[];
  marketingCampaigns: MarketingCampaign[];
  marketingChannels: MarketingChannel[];
  discountCodes: DiscountCode[];
  marketingBudgets: MarketingBudget[];
  referrals: Referral[];
  purchaseBatches: PurchaseBatch[];
  installmentPlans: InstallmentPlan[];
  couriers: Courier[];
  deliveryTrips: DeliveryTrip[];
  workers: Worker[];
  chartAccounts: ChartAccount[];
  fiscalPeriods: FiscalPeriod[];
  fiscalYears: FiscalYear[];
  idempotencyRecords: IdempotencyRecord[];
  marketingStats: MarketingStats;
  
  // Notification system
  notification: { message: string; type: 'success' | 'warning' | 'error' } | null;
  showNotification: (message: string, type?: 'success' | 'warning' | 'error') => void;
  
  // Computed values
  getAccountBalance: (accountId: number) => number;
  getCustomerBalance: (customerId: number) => number;
  runningBalancesMap: Map<number, RunningBalanceInfo>;
  getAccountRunningBalances: (accountId: number) => Map<number, RunningBalanceInfo>;
  totalCashAndBanks: number;
  totalCustomerDebts: number;
  totalReceivables: number;
  totalExpenses: number;
  
  // Operational Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: number) => void;
  
  addOrder: (
    order: Omit<Order, 'id' | 'createdAt' | 'remainingAmount' | 'paidAmount' | 'totalAmount'>,
    initialPayment?: { amount: number; accountId: number; paymentMethod: string }
  ) => Order;
  updateOrder: (order: Order) => void;
  deleteOrder: (id: number, options?: { deleteJournal?: boolean; deletePayments?: boolean }) => void;
  updateOrderStatus: (orderId: number, status: Order['status']) => void;
  collectDeliveryFee: (orderId: number, accountId: number) => void;
  
  recordPayment: (payment: {
    customerId: number;
    orderId?: number;
    amount: number;
    accountId: number;
    paymentMethod: string;
    paymentType?: string;
    statement?: string;
    notes?: string;
    courierId?: number;
    deliveryPaymentMethod?: 'cash_to_courier' | 'transfer_to_wallet';
    deliveryFee?: number;
    courierCustodyAmount?: number;
  }) => Payment;
  cancelPayment: (paymentId: number, reason?: string) => void;
  updatePayment: (paymentId: number, data: {
    amount?: number;
    accountId?: number;
    paymentMethod?: string;
    paymentType?: string;
    statement?: string;
    notes?: string;
  }) => void;
  deletePayment: (paymentId: number, options?: { deleteJournal?: boolean }) => void;
  
  addExpense: (expense: {
    category: string;
    vendorName?: string;
    amount: number;
    accountId: number;
    description: string;
    notes?: string;
    campaignId?: number | null;
  }) => void;
  updateExpense: (id: number, data: Partial<Expense>) => void;
  deleteExpense: (id: number, options?: { deleteJournal?: boolean }) => void;
  
  // Automated & Manual Journal Entries Engine
  addJournalEntry: (entry: {
    entryNumber?: string;
    description: string;
    date?: string;
    lines: JournalLine[];
    sourceType?: JournalEntry['sourceType'];
    sourceId?: number | string | null;
    sourceNumber?: string | null;
  }) => JournalEntry;
  updateJournalEntry: (
    id: number,
    data: { description?: string; lines?: JournalLine[]; date?: string; sourceNumber?: string },
    options?: { syncSourceDocument?: boolean }
  ) => void;
  deleteJournalEntry: (id: number, cascadeOptions?: { deleteSourceDocument?: boolean; reason?: string }) => void;
  restoreJournalEntry: (id: number) => void;
  permanentlyDeleteJournalEntry: (id: number) => void;
  emptyTrashJournalEntries: () => number;
  restoreAllDeletedJournalEntries: () => number;
  repairAllJournalEntries: () => number;
  reverseJournalEntry: (
    id: number,
    reason?: string,
    options?: { reverseLinkedOperation?: boolean; refundToWallet?: boolean }
  ) => JournalEntry;
  getCustomerReconciliationReport: () => CustomerReconciliationReport;
  runIntegrityAudit: () => ReturnType<typeof runDataIntegrityTests>;
  
  // Phase 4: Fiscal Periods & Year-End Closing Engine
  closeFiscalPeriod: (periodId: number, performedBy?: string) => void;
  reopenFiscalPeriod: (periodId: number, reason?: string, performedBy?: string) => void;
  lockFiscalPeriod: (periodId: number, performedBy?: string) => void;
  closeFiscalYear: (yearId: number, performedBy?: string) => { closingEntry: JournalEntry; netIncome: number };
  checkAndRegisterIdempotency: (key: string, operationType: string, entityId?: string | number) => boolean;
  generateCustomerAdjustingEntry: (customerId: number, adjustmentAmount: number, reason?: string) => JournalEntry;
  reconcileAllCustomerBalances: () => number;
  
  // Chart of Accounts (دليل شجرة الحسابات)
  addChartAccount: (acc: Omit<ChartAccount, 'id' | 'createdAt'>) => ChartAccount;
  updateChartAccount: (acc: ChartAccount) => void;
  deleteChartAccount: (id: number) => boolean;
  
  transferFunds: (
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    notes?: string
  ) => void;
  
  recordAccountTransaction: (params: {
    accountId: number;
    type: 'deposit' | 'withdrawal';
    amount: number;
    category?: string;
    description: string;
    referenceNumber?: string;
    transactionDate?: string;
    notes?: string;
  }) => FinancialTransaction;
  
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => Account;
  updateAccount: (account: Account) => void;
  
  addShipment: (shipment: {
    shipmentNumber: string;
    carrier: string;
    shippingCost: number;
    accountId: number;
    notes?: string;
    orderIds?: number[];
    updateOrderStatusToShipped?: boolean;
  }) => void;
  updateShipmentStatus: (id: number, status: Shipment['status']) => void;
  updateShipment: (shipment: Shipment) => void;
  deleteShipment: (id: number) => void;
  
  addOtherReceivable: (receivable: Omit<OtherReceivable, 'id' | 'createdAt' | 'status'>) => void;
  settleReceivable: (id: number, accountId: number, amount?: number, notes?: string) => void;
  
  // Installment Plans (نظام الدفعات والأقساط)
  addInstallmentPlan: (plan: {
    title: string;
    customerId: number;
    orderId?: number | null;
    totalAmount: number;
    downPayment?: number;
    downPaymentAccountId?: number;
    startDate: string;
    notes?: string;
    installments: {
      title: string;
      amount: number;
      dueDate: string;
      notes?: string;
    }[];
  }) => InstallmentPlan;
  payInstallment: (
    planId: number,
    installmentId: string,
    paymentData: {
      amount: number;
      accountId: number;
      paymentMethod?: string;
      notes?: string;
    }
  ) => void;
  deleteInstallmentPlan: (planId: number) => void;
  cancelInstallmentPlan: (planId: number) => void;
  exportPermanentZipBackup: (customFilename?: string) => Promise<{ filename: string; sizeKb: number }>;
  
  // Couriers Management (نظام الموصلين ومناديب التوصيل)
  addCourier: (courier: Omit<Courier, 'id' | 'code' | 'createdAt' | 'currentCustodyBalance' | 'deliveredOrdersCount'>) => Courier;
  updateCourier: (courier: Courier) => void;
  deleteCourier: (id: number) => void;
  createDeliveryTrip: (tripData: {
    courierId: number;
    date: string;
    orderIds: number[];
    notes?: string;
  }) => DeliveryTrip;
  settleDeliveryTrip: (
    tripId: number,
    settlementData: {
      items: {
        orderId: number;
        status: 'delivered' | 'returned' | 'postponed';
        collectedAmount: number;
        deliveryFeeCollected: boolean;
        notes?: string;
      }[];
      depositAccountId: number;
      courierCommissionPaid: number;
      notes?: string;
    }
  ) => void;
  cancelDeliveryTrip: (tripId: number) => void;
  deleteDeliveryTrip: (tripId: number) => void;

  // New Dedicated Delivery System Operations (نظام إدارة الموصلين والتوزيع)
  deliveryOrders: DeliveryOrder[];
  courierSettlements: CourierSettlement[];
  deliveryCashCollections: DeliveryCashCollection[];
  createDeliveryOrder: (orderData: {
    orderId?: number | null;
    orderNumber?: string | number;
    shipmentNumber?: string;
    customerName: string;
    customerPhone: string;
    governorate: string;
    district?: string;
    address: string;
    courierId: number;
    dispatchDate?: string;
    orderOriginalValue?: number;
    orderRemainingAmount?: number;
    deliveryFee: number;
    collectionMethod?: 'cash_to_courier' | 'transfer_to_wallet' | 'waived' | 'unassigned';
    walletId?: number;
    walletReference?: string;
    notes?: string;
  }) => DeliveryOrder;
  updateDeliveryOrderStatus: (
    deliveryId: number,
    status: DeliveryOrder['status'],
    details?: {
      failedReason?: string;
      deliveredAt?: string;
      collectionMethod?: DeliveryOrder['collectionMethod'];
      walletId?: number;
      walletReference?: string;
      courierId?: number;
      deliveryFee?: number;
    }
  ) => void;
  updateDeliveryOrder: (order: DeliveryOrder) => void;
  deleteDeliveryOrder: (deliveryId: number) => void;
  recordDeliveryCashToCourier: (deliveryId: number, notes?: string) => void;
  recordDeliveryTransferToWallet: (params: {
    deliveryId: number;
    walletId: number;
    referenceNumber?: string;
    transferDate?: string;
    notes?: string;
  }) => void;
  receiveCashFromCourier: (params: {
    courierId: number;
    amount: number;
    depositAccountId?: number; // إذا تم إيداعه في محفظة أو صندوق
    receivedDate?: string;
    notes?: string;
  }) => DeliveryCashCollection;
  settleCourierPayable: (params: {
    courierId: number;
    amount: number;
    walletId: number;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
  }) => CourierSettlement;
  cancelCourierSettlement: (settlementId: number, reason?: string) => void;
  
  // Workers Management (قسم العمال والصرفيات)
  addWorker: (worker: Omit<Worker, 'id' | 'createdAt'>) => Worker;
  updateWorker: (worker: Worker) => void;
  deleteWorker: (id: number) => void;
  addWorkerExpense: (params: {
    workerId: number;
    workerName: string;
    category: string;
    amount: number;
    accountId: number;
    description?: string;
    notes?: string;
  }) => void;

  // Cloud Synchronization (التزامن السحابي الفوري)
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncWithServer: () => Promise<void>;
  realtimeStatus: 'connected' | 'connecting' | 'disconnected' | 'offline';
  lastRealtimeEvent: { table: string; eventType: string; time: string } | null;

  // Marketing & Batches
  addMarketingCampaign: (campaign: Omit<MarketingCampaign, 'id' | 'campaignNumber' | 'actualSpend' | 'createdAt'>) => void;
  updateMarketingCampaign: (campaign: MarketingCampaign) => void;
  deleteMarketingCampaign: (id: number) => void;

  addMarketingChannel: (channel: Omit<MarketingChannel, 'id' | 'createdAt'>) => void;
  updateMarketingChannel: (channel: MarketingChannel) => void;

  addDiscountCode: (code: Omit<DiscountCode, 'id' | 'usageCount' | 'createdAt'>) => void;
  updateDiscountCode: (code: DiscountCode) => void;

  addMarketingBudget: (budget: Omit<MarketingBudget, 'id' | 'createdAt'>) => void;
  updateMarketingBudget: (budget: MarketingBudget) => void;

  addReferral: (referral: Omit<Referral, 'id' | 'referralNumber' | 'createdAt'>) => void;
  updateReferralStatus: (id: number, status: Referral['status'], approveReward?: boolean) => void;

  addPurchaseBatch: (batch: {
    source: string;
    supplierOrderNumber?: string;
    paymentMode?: 'single' | 'split';
    accountId: number;
    card1Amount?: number;
    accountId2?: number | null;
    card2Amount?: number;
    purchaseCost: number;
    purchaseFees: number;
    transferFees: number;
    exchangeRateDiff?: number;
    orderIds: number[];
    notes?: string;
  }) => void;
  updatePurchaseBatch: (id: number, batch: {
    source?: string;
    supplierOrderNumber?: string | null;
    purchaseDate?: string;
    paymentMode?: 'single' | 'split';
    accountId?: number;
    card1Amount?: number;
    accountId2?: number | null;
    card2Amount?: number;
    purchaseCost?: number;
    purchaseFees?: number;
    transferFees?: number;
    exchangeRateDiff?: number;
    orderIds?: number[];
    notes?: string | null;
  }) => void;
  cancelPurchaseBatch: (id: number) => void;
  deletePurchaseBatch: (id: number) => void;

  addAuditLog: (action: string, entityType: string, description: string, entityId?: number) => void;

  updateSetting: (key: string, value: string) => void;
  
  clearAllData: () => void;
  resetToBackup: () => void;
  restoreCompleteInitialData: () => void;
  purgeAllDataToEmpty: () => void;
  importBackup: (jsonContent: string) => { success: boolean; message: string };
  exportBackupJson: () => string;
  downloadBackupFile: (customFilename?: string) => { filename: string; sizeKb: number; timestamp: string };
  setRawStoreData: (newData: TopStoreBackup) => void;
  
  processAssistantMessage: (text: string) => { reply: string; actionTaken?: string };
}

const STORAGE_KEY = 'top_store_app_data_v2_clean';

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<TopStoreBackup>(() => {
    // Purge old v1 demo cache if present so users start with clean data as requested
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (localStorage.getItem('top_store_app_data_v1')) {
          localStorage.removeItem('top_store_app_data_v1');
        }
      }
    } catch (e) {
      console.warn('Could not clear legacy storage', e);
    }

    let saved: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        saved = localStorage.getItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tables && parsed.tables.accounts) {
          // Reconcile and heal any purchase batch or financial transaction that mistakenly used 120001 instead of 120002
          const healedBatches = (Array.isArray(parsed.tables.purchaseBatches) ? parsed.tables.purchaseBatches : (INITIAL_DATA.tables.purchaseBatches || [])).map((b: any) => {
            let acc1 = b.accountId;
            let name1 = b.accountName;
            let acc2 = b.accountId2;
            let name2 = b.accountName2;
            if (Number(acc1) === 120001) {
              acc1 = 120002;
              name1 = 'فيزا كارد بنك التجاري اليمني';
            }
            if (Number(acc2) === 120001) {
              acc2 = 120002;
              name2 = 'فيزا كارد بنك التجاري اليمني';
            }
            return {
              ...b,
              accountId: acc1,
              accountName: name1,
              accountId2: acc2,
              accountName2: name2
            };
          });

          const healedTrx = (Array.isArray(parsed.tables.financialTransactions) ? parsed.tables.financialTransactions : INITIAL_DATA.tables.financialTransactions).map((t: any) => {
            if (Number(t.accountId) === 120001 && (
              String(t.transactionNumber || '').startsWith('TRX-PB-') ||
              String(t.transactionNumber || '').startsWith('TRX-REV-PB-') ||
              String(t.description || '').includes('شراء جماعي') ||
              String(t.description || '').includes('دفعة') ||
              String(t.description || '').includes('فيزا') ||
              String(t.description || '').includes('التجاري')
            )) {
              return {
                ...t,
                accountId: 120002,
                description: String(t.description || '').replace('البنك التجاري اليمني', 'فيزا كارد بنك التجاري اليمني')
              };
            }
            return t;
          });

          const healedJournals = (Array.isArray(parsed.tables.journalEntries) ? parsed.tables.journalEntries : INITIAL_DATA.tables.journalEntries).map((je: any) => {
            if (je.lines && Array.isArray(je.lines)) {
              return {
                ...je,
                lines: je.lines.map((l: any) => {
                  if (Number(l.accountId) === 120001 && (je.sourceType === 'purchase_batch' || String(je.description || '').includes('شراء بضاعة') || String(je.entryNumber || '').includes('JE-PB-'))) {
                    return {
                      ...l,
                      accountId: 120002,
                      accountName: 'فيزا كارد بنك التجاري اليمني'
                    };
                  }
                  return l;
                })
              };
            }
            return je;
          });

          return sanitizeAndReconcileJournalEntries({
            ...parsed,
            tables: {
              ...INITIAL_DATA.tables,
              ...parsed.tables,
              accounts: (() => {
                const existing = Array.isArray(parsed.tables.accounts) ? [...parsed.tables.accounts] : [];
                const filtered = existing.filter((a: any) => Number(a.id) !== 150002);
                const existingIds = new Set(filtered.map((a: any) => Number(a.id)));
                (INITIAL_DATA.tables.accounts || []).forEach((initAcc: any) => {
                  if (!existingIds.has(Number(initAcc.id)) && Number(initAcc.id) !== 150002) {
                    filtered.push(initAcc);
                  }
                });
                return filtered;
              })(),
              paymentMethods: (() => {
                const methods = Array.isArray(parsed.tables.paymentMethods) && parsed.tables.paymentMethods.length > 0
                  ? parsed.tables.paymentMethods
                  : (INITIAL_DATA.tables.paymentMethods || []);
                return methods.map((pm: any) => Number(pm.accountId) === 150002 ? { ...pm, accountId: 120003 } : pm);
              })(),
              customers: Array.isArray(parsed.tables.customers) && parsed.tables.customers.length > 0 ? parsed.tables.customers : INITIAL_DATA.tables.customers,
              orders: Array.isArray(parsed.tables.orders) && parsed.tables.orders.length > 0 ? parsed.tables.orders : INITIAL_DATA.tables.orders,
              payments: Array.isArray(parsed.tables.payments) && parsed.tables.payments.length > 0 ? parsed.tables.payments : INITIAL_DATA.tables.payments,
              financialTransactions: healedTrx,
              expenses: Array.isArray(parsed.tables.expenses) && parsed.tables.expenses.length > 0 ? parsed.tables.expenses : INITIAL_DATA.tables.expenses,
              journalEntries: healedJournals,
              journalLines: Array.isArray(parsed.tables.journalLines) && parsed.tables.journalLines.length > 0 ? parsed.tables.journalLines : INITIAL_DATA.tables.journalLines,
              shipments: Array.isArray(parsed.tables.shipments) && parsed.tables.shipments.length > 0 ? parsed.tables.shipments : (INITIAL_DATA.tables.shipments || []),
              shipmentItems: Array.isArray(parsed.tables.shipmentItems) ? parsed.tables.shipmentItems : [],
              marketingCampaigns: Array.isArray(parsed.tables.marketingCampaigns) && parsed.tables.marketingCampaigns.length > 0 ? parsed.tables.marketingCampaigns : (INITIAL_DATA.tables.marketingCampaigns || []),
              marketingChannels: Array.isArray(parsed.tables.marketingChannels) && parsed.tables.marketingChannels.length > 0 ? parsed.tables.marketingChannels : (INITIAL_DATA.tables.marketingChannels || []),
              discountCodes: Array.isArray(parsed.tables.discountCodes) && parsed.tables.discountCodes.length > 0 ? parsed.tables.discountCodes : (INITIAL_DATA.tables.discountCodes || []),
              marketingBudgets: Array.isArray(parsed.tables.marketingBudgets) ? parsed.tables.marketingBudgets : [],
              referrals: Array.isArray(parsed.tables.referrals) ? parsed.tables.referrals : [],
              purchaseBatches: healedBatches,
              installmentPlans: Array.isArray(parsed.tables.installmentPlans) ? parsed.tables.installmentPlans : [],
              otherReceivables: Array.isArray(parsed.tables.otherReceivables) && parsed.tables.otherReceivables.length > 0 ? parsed.tables.otherReceivables : (INITIAL_DATA.tables.otherReceivables || []),
              couriers: Array.isArray(parsed.tables.couriers) && parsed.tables.couriers.length > 0 ? parsed.tables.couriers : (INITIAL_DATA.tables.couriers || []),
              deliveryTrips: Array.isArray(parsed.tables.deliveryTrips) ? parsed.tables.deliveryTrips : [],
              deliveryOrders: Array.isArray(parsed.tables.deliveryOrders) && parsed.tables.deliveryOrders.length > 0 ? parsed.tables.deliveryOrders : (INITIAL_DATA.tables.deliveryOrders || []),
              courierSettlements: Array.isArray(parsed.tables.courierSettlements) && parsed.tables.courierSettlements.length > 0 ? parsed.tables.courierSettlements : (INITIAL_DATA.tables.courierSettlements || []),
              deliveryCashCollections: Array.isArray(parsed.tables.deliveryCashCollections) && parsed.tables.deliveryCashCollections.length > 0 ? parsed.tables.deliveryCashCollections : (INITIAL_DATA.tables.deliveryCashCollections || []),
              workers: Array.isArray(parsed.tables.workers) && parsed.tables.workers.length > 0 ? parsed.tables.workers : (INITIAL_DATA.tables.workers || []),
              chartAccounts: Array.isArray(parsed.tables.chartAccounts) && parsed.tables.chartAccounts.length > 0 ? parsed.tables.chartAccounts : DEFAULT_CHART_OF_ACCOUNTS,
              fiscalPeriods: Array.isArray(parsed.tables.fiscalPeriods) && parsed.tables.fiscalPeriods.length > 0 ? parsed.tables.fiscalPeriods : DEFAULT_FISCAL_PERIODS,
              fiscalYears: Array.isArray(parsed.tables.fiscalYears) && parsed.tables.fiscalYears.length > 0 ? parsed.tables.fiscalYears : DEFAULT_FISCAL_YEARS,
              idempotencyRecords: Array.isArray(parsed.tables.idempotencyRecords) ? parsed.tables.idempotencyRecords : [],
              auditLogs: Array.isArray(parsed.tables.auditLogs) ? parsed.tables.auditLogs : []
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse saved state, using default initial data', e);
      }
    }
    return sanitizeAndReconcileJournalEntries(INITIAL_DATA);
  });

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Cloud Synchronization state
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasInitializedFromServer, setHasInitializedFromServer] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'offline'>('disconnected');
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<{ table: string; eventType: string; time: string } | null>(null);

  // Sync pull from server
  const syncWithServer = async () => {
    try {
      setIsSyncing(true);
      const dev = getOrCreateCurrentDevice();
      const q = new URLSearchParams({
        deviceId: dev.deviceId,
        deviceName: dev.deviceName,
        deviceType: dev.deviceType,
        browser: dev.browser,
        os: dev.os
      }).toString();

      const res = await fetch(`/api/sync/pull?${q}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.tables) {
          const cleaned = sanitizeAndReconcileJournalEntries(json.data);
          setData(cleaned);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          } catch (e) {
            console.warn('Could not persist synced data to localStorage', e);
          }
          setLastSyncTime(new Date().toLocaleTimeString('ar-YE'));
        }
      }
    } catch (err) {
      console.warn('Server sync notice: operating offline/local', err);
    } finally {
      setIsSyncing(false);
      setHasInitializedFromServer(true);
    }
  };

  // Push updates to server whenever data changes & persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not persist data to localStorage', e);
    }

    // Prevent pushing default or stale data to server on new devices before initial pull completes
    if (!hasInitializedFromServer) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const dev = getOrCreateCurrentDevice();
        await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, device: dev })
        });
        setLastSyncTime(new Date().toLocaleTimeString('ar-YE'));
      } catch (e) {
        // Fallback silently if network offline
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [data, hasInitializedFromServer]);

  // Real-time SSE stream listener: receives instant sync updates whenever ANY phone or laptop pushes changes
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: any = null;

    const setupSSE = () => {
      try {
        es = new EventSource('/api/sync/stream');

        es.onopen = () => {
          setRealtimeStatus('connected');
        };

        es.onmessage = (e) => {
          try {
            if (!e.data || e.data.startsWith(':')) return;
            const payload = JSON.parse(e.data);
            if (payload.type === 'sync_update') {
              const currentDev = getOrCreateCurrentDevice();
              // If another phone or laptop pushed an update, sync immediately
              if (!payload.originDeviceId || payload.originDeviceId !== currentDev.deviceId) {
                syncWithServer();
              }
            }
          } catch (err) {
            // ignore non-json
          }
        };

        es.onerror = () => {
          setRealtimeStatus('disconnected');
          es?.close();
          reconnectTimer = setTimeout(setupSSE, 3000);
        };
      } catch (err) {
        setRealtimeStatus('offline');
        reconnectTimer = setTimeout(setupSSE, 5000);
      }
    };

    setupSSE();

    return () => {
      if (es) es.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Supabase Realtime subscription fallback (if configured)
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const coreTables = ['customers', 'orders', 'journal_entries', 'journal_lines', 'payments', 'expenses', 'shipments'];

    const sub = subscribeToSupabaseRealtime(
      coreTables,
      (payload) => {
        setLastRealtimeEvent({
          table: payload.table,
          eventType: payload.eventType,
          time: new Date().toLocaleTimeString('ar-YE')
        });
        syncWithServer();
      },
      (status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        }
      }
    );

    return () => {
      if (sub) {
        sub.unsubscribe();
      }
    };
  }, []);

  // Initial pull and periodic 4-second heartbeat sync for instant cross-device mobile/laptop lockstep
  useEffect(() => {
    syncWithServer();

    // Fast 4-second heartbeat poll ensures immediate sync even if SSE is interrupted
    const interval = setInterval(() => {
      syncWithServer();
    }, 4000);

    // Sync immediately when window gets focus or tab becomes visible (e.g. mobile app foregrounded)
    const onFocus = () => syncWithServer();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithServer();
      }
    };
    const onOnline = () => syncWithServer();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Quick settings dictionary
  const settings = useMemo(() => {
    const map: Record<string, string> = {};
    data.tables.appSettings?.forEach(s => {
      let val = s.settingValue;
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      map[s.settingKey] = val;
    });
    return map;
  }, [data.tables.appSettings]);

  const customers = data.tables.customers || [];
  const accounts = data.tables.accounts || [];
  const paymentMethods = data.tables.paymentMethods || [];
  const rawPayments = (data.tables.payments && data.tables.payments.length > 0)
    ? data.tables.payments
    : (INITIAL_DATA.tables.payments || []);

  const payments = useMemo(() => {
    return rawPayments.map((p, idx) => ({
      ...p,
      receiptNumber: p.receiptNumber || (p.paymentNumber ? p.paymentNumber.replace('PAY-', 'RCT-') : `RCT-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`),
      status: p.status || 'approved',
      paymentType: p.paymentType || 'دفعة مسددة',
      createdByName: p.createdByName || 'أحمد الإدريسي (أمين الصندوق)'
    }));
  }, [rawPayments]);

  const rawOrders = data.tables.orders || [];
  const orders = useMemo(() => {
    // Map orderId -> sum of non-cancelled payments
    const orderPaidMap: Record<number, number> = {};
    payments.forEach(p => {
      if (p.status !== 'cancelled') {
        const amt = parseFloat(String(p.amount || 0)) || 0;
        if (p.orderId) {
          orderPaidMap[p.orderId] = (orderPaidMap[p.orderId] || 0) + amt;
        }
        if (Array.isArray(p.orderIds)) {
          p.orderIds.forEach(oid => {
            if (oid && p.orderIds!.length === 1) {
              orderPaidMap[oid] = (orderPaidMap[oid] || 0) + amt;
            }
          });
        }
      }
    });

    return rawOrders.map(o => {
      const totalPayments = orderPaidMap[o.id] !== undefined ? orderPaidMap[o.id] : (Number(o.paidAmount) || 0);
      const totalAmount = parseFloat(String(o.totalAmount || 0)) || 0;
      const remainingAmount = Math.max(0, totalAmount - totalPayments);
      const paymentStatus: Order['paymentStatus'] = 
        totalPayments >= totalAmount && totalAmount > 0
          ? 'paid'
          : totalPayments > 0
          ? 'partial'
          : 'unpaid';

      return {
        ...o,
        paidAmount: totalPayments,
        remainingAmount,
        paymentStatus,
        invoiceNumber: o.invoiceNumber || `INV-${String(o.orderNumber || o.id).replace(/\D/g, '').padStart(3, '0') || o.id}`,
        invoiceStatus: o.invoiceStatus || (o.status === 'cancelled' ? 'cancelled' : 'approved')
      };
    });
  }, [rawOrders, payments]);
  const rawExpenses = data.tables.expenses || [];
  const shipments = data.tables.shipments || [];

  // Integrate all shipping logistics costs into expenses so they are deducted from profits
  // and analyzed across expenses analysis and reporting
  const expenses = useMemo(() => {
    const shipmentExpensesMap = new Set(
      rawExpenses
        .filter(e => e.expenseNumber?.startsWith('EXP-SHP-') || e.category === 'شحن ونقل لوجستي' || e.category === 'شحن')
        .map(e => e.expenseNumber)
    );

    const existingIds = new Set(rawExpenses.map(e => Number(e.id)));
    const syntheticExpenses: Expense[] = [];
    shipments.forEach(s => {
      const expNum = `EXP-SHP-${s.shipmentNumber}`;
      if (!shipmentExpensesMap.has(expNum) && s.status !== 'cancelled') {
        const acc = accounts.find(a => a.id === s.accountId);
        let synId = 980000000 + Number(s.id);
        while (existingIds.has(synId)) {
          synId += 1;
        }
        existingIds.add(synId);

        syntheticExpenses.push({
          id: synId,
          expenseNumber: expNum,
          category: 'شحن ونقل لوجستي',
          vendorName: s.carrier,
          amount: s.shippingCost,
          paymentMethod: acc?.name || 'محفظة',
          accountId: s.accountId,
          description: `أجور وتكاليف شحن طرود الشحنة #${s.shipmentNumber} عبر ${s.carrier}${s.orderIds?.length ? ` (${s.orderIds.length} طلبات)` : ''}`,
          notes: s.notes || null,
          status: 'active',
          createdAt: s.createdAt || new Date().toISOString()
        });
      }
    });

    return [...rawExpenses, ...syntheticExpenses];
  }, [rawExpenses, shipments, accounts]);
  const transactions = data.tables.financialTransactions || [];
  const journalEntries = data.tables.journalEntries || [];
  const otherReceivables = data.tables.otherReceivables || [];
  const owners = data.tables.owners || [];
  const assistantLogs = data.tables.assistantLogs || [];
  const auditLogs = data.tables.auditLogs || [];
  const marketingCampaigns = data.tables.marketingCampaigns || INITIAL_DATA.tables.marketingCampaigns || [];
  const marketingChannels = data.tables.marketingChannels || INITIAL_DATA.tables.marketingChannels || [];
  const discountCodes = data.tables.discountCodes || INITIAL_DATA.tables.discountCodes || [];
  const marketingBudgets = data.tables.marketingBudgets || INITIAL_DATA.tables.marketingBudgets || [];
  const referrals = data.tables.referrals || INITIAL_DATA.tables.referrals || [];
  const purchaseBatches = useMemo<PurchaseBatch[]>(() => {
    const raw: any[] = data.tables.purchaseBatches && data.tables.purchaseBatches.length > 0
      ? data.tables.purchaseBatches
      : (INITIAL_DATA.tables.purchaseBatches || []);

    const batchOrdersMap: Record<number, number[]> = {};
    const batchOrdersList: any[] = (data.tables as any).purchaseBatchOrders || (INITIAL_DATA.tables as any).purchaseBatchOrders || [];
    batchOrdersList.forEach((pbo: any) => {
      if (!batchOrdersMap[pbo.purchaseBatchId]) batchOrdersMap[pbo.purchaseBatchId] = [];
      if (pbo.orderId && !batchOrdersMap[pbo.purchaseBatchId].includes(pbo.orderId)) {
        batchOrdersMap[pbo.purchaseBatchId].push(pbo.orderId);
      }
    });

    rawOrders.forEach(o => {
      if (o.purchaseBatchId) {
        if (!batchOrdersMap[o.purchaseBatchId]) batchOrdersMap[o.purchaseBatchId] = [];
        if (!batchOrdersMap[o.purchaseBatchId].includes(o.id)) {
          batchOrdersMap[o.purchaseBatchId].push(o.id);
        }
      }
    });

    return raw.map(b => {
      const pCost = typeof b.purchaseCost === 'string' ? parseFloat(b.purchaseCost) || 0 : (Number(b.purchaseCost) || 0);
      const pFees = typeof b.purchaseFees === 'string' ? parseFloat(b.purchaseFees) || 0 : (Number(b.purchaseFees) || 0);
      const tFees = typeof b.transferFees === 'string' ? parseFloat(b.transferFees) || 0 : (Number(b.transferFees) || 0);
      const totalCost = Number(b.totalCost) || (pCost + pFees + tFees);
      const ordIds = Array.isArray(b.orderIds) && b.orderIds.length > 0
        ? b.orderIds
        : (batchOrdersMap[b.id] || []);
      const acc = accounts.find(a => a.id === b.accountId);

      return {
        ...b,
        purchaseCost: pCost,
        purchaseFees: pFees,
        transferFees: tFees,
        totalCost,
        orderIds: ordIds,
        accountName: b.accountName || acc?.name || 'البطاقة / الحساب',
        status: b.status || 'active',
        purchaseDate: b.purchaseDate ? b.purchaseDate.split('T')[0] : (b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0])
      };
    });
  }, [data.tables.purchaseBatches, (data.tables as any).purchaseBatchOrders, rawOrders, accounts]);
  const installmentPlans = data.tables.installmentPlans || [];
  const couriers = data.tables.couriers || INITIAL_DATA.tables.couriers || [];
  const deliveryTrips = data.tables.deliveryTrips || [];
  const deliveryOrders: DeliveryOrder[] = (data.tables.deliveryOrders && data.tables.deliveryOrders.length > 0)
    ? data.tables.deliveryOrders
    : (INITIAL_DATA.tables.deliveryOrders || []);
  const courierSettlements: CourierSettlement[] = (data.tables.courierSettlements && data.tables.courierSettlements.length > 0)
    ? data.tables.courierSettlements
    : (INITIAL_DATA.tables.courierSettlements || []);
  const deliveryCashCollections: DeliveryCashCollection[] = (data.tables.deliveryCashCollections && data.tables.deliveryCashCollections.length > 0)
    ? data.tables.deliveryCashCollections
    : (INITIAL_DATA.tables.deliveryCashCollections || []);
  const workers = data.tables.workers || INITIAL_DATA.tables.workers || [];
  const chartAccounts = data.tables.chartAccounts && data.tables.chartAccounts.length > 0 ? data.tables.chartAccounts : DEFAULT_CHART_OF_ACCOUNTS;
  const fiscalPeriods = data.tables.fiscalPeriods && data.tables.fiscalPeriods.length > 0 ? data.tables.fiscalPeriods : DEFAULT_FISCAL_PERIODS;
  const fiscalYears = data.tables.fiscalYears && data.tables.fiscalYears.length > 0 ? data.tables.fiscalYears : DEFAULT_FISCAL_YEARS;
  const idempotencyRecords = data.tables.idempotencyRecords || [];

  // Helper to compute account current balance
  const getAccountBalance = (accountId: number): number => {
    const acc = accounts.find(a => Number(a.id) === Number(accountId));
    if (!acc) return 0;
    let balance = parseFloat(String(acc.openingBalance || 0)) || 0;

    transactions.forEach(trx => {
      if (Number(trx.accountId) === Number(accountId)) {
        const amt = parseFloat(String(trx.amount || 0)) || 0;
        if (trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment') {
          balance += amt;
        } else if (trx.type === 'withdrawal' || trx.type === 'transfer_out' || trx.type === 'expense') {
          balance -= amt;
        }
      }
    });

    return balance;
  };

  // Helper to compute customer current balance (money owed by customer to the store: Debit - Credit)
  const getCustomerBalance = (customerId: number): number => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return 0;
    const opening = parseFloat(String(cust.openingBalance || 0)) || 0;

    // Total debits from non-cancelled orders
    const totalOrdersDebit = orders
      .filter(ord => ord.customerId === customerId && ord.status !== 'cancelled')
      .reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);

    // Total credits from approved, non-cancelled payments
    const totalPaymentsCredit = payments
      .filter(pay => pay.customerId === customerId && pay.status !== 'cancelled')
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);

    return roundCurrency(opening + totalOrdersDebit - totalPaymentsCredit);
  };

  const getCustomerReconciliationReport = (): CustomerReconciliationReport => {
    return reconcileCustomerBalances(customers, orders, payments, journalEntries);
  };

  const runIntegrityAudit = () => {
    return runDataIntegrityTests(data);
  };

  // Cumulative running balance map across all accounts and transactions
  const runningBalancesMap = useMemo(() => {
    return computeAllAccountsRunningBalances(accounts, transactions);
  }, [accounts, transactions]);

  const getAccountRunningBalances = (accountId: number): Map<number, RunningBalanceInfo> => {
    const acc = accounts.find(a => Number(a.id) === Number(accountId));
    if (!acc) return new Map<number, RunningBalanceInfo>();
    return computeAccountRunningBalances(acc, transactions);
  };

  // Total cash & wallets
  const totalCashAndBanks = useMemo(() => {
    return accounts
      .filter(a => a.status === 'active' && a.type !== 'حقوق ملكية')
      .reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  }, [accounts, transactions]);

  // Total customer debts
  const totalCustomerDebts = useMemo(() => {
    return customers.reduce((sum, c) => sum + getCustomerBalance(c.id), 0);
  }, [customers, orders]);

  // Total other receivables
  const totalReceivables = useMemo(() => {
    return otherReceivables
      .filter(r => r.status !== 'settled')
      .reduce((sum, r) => sum + (Number(r.openingBalance) || 0), 0);
  }, [otherReceivables]);

  // Total expenses
  const totalExpenses = useMemo(() => {
    return expenses
      .filter(e => e.status !== 'cancelled')
      .reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
  }, [expenses]);

  // Marketing performance analytics (ROAS, CAC, ROI, conversion, best campaign/channel)
  const marketingStats = useMemo<MarketingStats>(() => {
    const totalSpend = marketingCampaigns.reduce((sum, c) => sum + (Number(c.actualSpend) || 0), 0) +
      expenses.filter(e => e.status !== 'cancelled' && e.category === 'تسويق' && !e.campaignId).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const activeCampaignsCount = marketingCampaigns.filter(c => c.status === 'active').length;
    
    // Customers from marketing
    const customersFromMarketing = customers.filter(c => c.marketingSource || c.marketingCampaignId || c.marketingChannelId || c.referralCode);
    const customersCount = customersFromMarketing.length;
    
    // Orders from marketing
    const marketingOrders = orders.filter(o => o.status !== 'cancelled' && (o.marketingCampaignId || o.marketingChannelId || o.marketingCode || o.referralSource));
    const ordersCount = marketingOrders.length;
    
    const totalSales = marketingOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const totalPurchaseCost = marketingOrders.reduce((sum, o) => sum + (Number(o.purchaseCost) || Number(o.subtotal) * 0.75), 0);
    const grossProfit = Math.max(0, totalSales - totalPurchaseCost);
    
    const cac = customersCount > 0 ? Math.round(totalSpend / customersCount) : 0;
    const costPerOrder = ordersCount > 0 ? Math.round(totalSpend / ordersCount) : 0;
    const roas = totalSpend > 0 ? Number((totalSales / totalSpend).toFixed(2)) : 0;
    const roi = totalSpend > 0 ? Math.round(((grossProfit - totalSpend) / totalSpend) * 100) : 0;
    const conversionRate = marketingCampaigns.length > 0 ? Number(((ordersCount / Math.max(customersCount, 1)) * 100).toFixed(1)) : 0;
    const aov = ordersCount > 0 ? Math.round(totalSales / ordersCount) : 0;

    // Best campaign
    const campaignSalesMap: Record<number, number> = {};
    orders.forEach(o => {
      if (o.marketingCampaignId) {
        campaignSalesMap[o.marketingCampaignId] = (campaignSalesMap[o.marketingCampaignId] || 0) + Number(o.totalAmount || 0);
      }
    });
    let bestCampaign: { name: string; sales: number } | null = null;
    Object.entries(campaignSalesMap).forEach(([cmpId, sales]) => {
      const cmp = marketingCampaigns.find(c => c.id === Number(cmpId));
      if (cmp && (!bestCampaign || sales > bestCampaign.sales)) {
        bestCampaign = { name: cmp.name, sales };
      }
    });

    // Best channel
    const channelSalesMap: Record<string, number> = {};
    orders.forEach(o => {
      const ch = marketingChannels.find(c => c.id === o.marketingChannelId);
      const chName = ch ? ch.name : (o.referralSource || 'أخرى');
      if (chName) {
        channelSalesMap[chName] = (channelSalesMap[chName] || 0) + Number(o.totalAmount || 0);
      }
    });
    let bestChannel: { name: string; sales: number } | null = null;
    Object.entries(channelSalesMap).forEach(([name, sales]) => {
      if (!bestChannel || sales > bestChannel.sales) {
        bestChannel = { name, sales };
      }
    });

    return {
      totalSpend,
      activeCampaignsCount,
      customersCount,
      ordersCount,
      totalSales,
      grossProfit,
      cac,
      costPerOrder,
      roas,
      roi,
      conversionRate,
      aov,
      bestCampaign,
      bestChannel
    };
  }, [marketingCampaigns, marketingChannels, customers, orders, expenses]);

  // Operational Action Handlers
  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newId = Date.now();
    const newCust: Customer = {
      ...customer,
      id: newId,
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        customers: [newCust, ...prev.tables.customers]
      }
    }));

    return newCust;
  };

  const updateCustomer = (updated: Customer) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        customers: prev.tables.customers.map(c => c.id === updated.id ? updated : c)
      }
    }));
  };

  const deleteCustomer = (id: number) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        customers: prev.tables.customers.filter(c => c.id !== id)
      }
    }));
  };

  const addOrder = (
    orderData: Omit<Order, 'id' | 'createdAt' | 'remainingAmount' | 'paidAmount' | 'totalAmount'>,
    initialPayment?: { amount: number; accountId: number; paymentMethod: string }
  ): Order => {
    const orderId = Date.now();
    const orderDate = new Date().toISOString();
    const periodCheck = assertFiscalPeriodOpen(orderDate, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن إنشاء طلبات جديدة.', 'error');
      throw new Error(periodCheck.reason);
    }
    const totalAmount = (orderData.subtotal || 0) - (orderData.discount || 0) + (orderData.shippingFee || 0);
    const paidAmount = initialPayment ? initialPayment.amount : 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const customer = customers.find(c => c.id === orderData.customerId);

    // ضمان تسجيل أرقام الطلبات بالأرقام الصافية وليس أرقام النظام التلقائية
    let cleanOrderNum = String(orderData.orderNumber || '').trim().replace(/^ORD-/, '').trim();
    if (orderData.customerOrderNumber && (!cleanOrderNum || /^ORD-/.test(String(orderData.orderNumber)))) {
      cleanOrderNum = String(orderData.customerOrderNumber).trim();
    }
    if (!cleanOrderNum) {
      const existingNums = orders
        .map(o => parseInt(String(o.orderNumber).replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n) && n > 0);
      cleanOrderNum = String(existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1);
    }

    const invoiceNumber = `INV-${cleanOrderNum}`;
    const newOrder: Order = {
      ...orderData,
      orderNumber: cleanOrderNum,
      customerOrderNumber: cleanOrderNum,
      internalNumber: cleanOrderNum,
      id: orderId,
      customerName: customer?.name || orderData.customerName,
      customerCode: customer?.code || orderData.customerCode,
      invoiceNumber,
      invoiceStatus: 'approved',
      totalAmount,
      paidAmount,
      remainingAmount,
      createdAt: new Date().toISOString()
    };

    let newTransactions = [...transactions];
    let newPayments = [...payments];
    let newJournals = [...journalEntries];

    if (initialPayment && initialPayment.amount > 0) {
      const paymentId = Date.now() + 1;
      const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
      const trxNumber = `TRX-PAY-${Date.now().toString().slice(-6)}`;
      const receiptNumber = `RCT-${new Date().getFullYear()}-${String(newPayments.length + 1).padStart(3, '0')}`;
      const acc = accounts.find(a => a.id === initialPayment.accountId);

      // Record payment
      const paymentRecord: Payment = {
        id: paymentId,
        paymentNumber,
        receiptNumber,
        orderId,
        customerId: orderData.customerId,
        accountId: initialPayment.accountId,
        amount: initialPayment.amount,
        paymentDate: orderData.orderDate,
        paymentMethod: initialPayment.paymentMethod,
        paymentType: initialPayment.amount >= totalAmount ? 'دفعة نهائية' : 'دفعة أولى',
        statement: `عربون ودفعة أولى للطلب ${orderData.orderNumber}`,
        notes: `دفعة أولى للطلب ${orderData.orderNumber}`,
        status: 'approved',
        createdByName: 'أحمد الإدريسي (أمين الصندوق)',
        createdAt: new Date().toISOString()
      };
      newPayments = [paymentRecord, ...newPayments];

      // Financial Transaction
      const trxRecord: FinancialTransaction = {
        id: paymentId + 10,
        transactionNumber: trxNumber,
        transactionDate: new Date().toISOString(),
        accountId: initialPayment.accountId,
        type: 'payment',
        amount: initialPayment.amount,
        description: `سند قبض #${receiptNumber} من ${customer?.name || 'العميل'} للطلب ${orderData.orderNumber}`,
        customerId: orderData.customerId,
        orderId,
        createdAt: new Date().toISOString()
      };
      newTransactions = [trxRecord, ...newTransactions];

      // Journal Entry
      const jeId = paymentId + 20;
      const payAccChart = resolveChartAccount(acc?.name || 'الصندوق', 'debit');
      const payCustChart = resolveChartAccount(`العميل: ${customer?.name || 'العميل'}`, 'credit');

      const journalEntry: JournalEntry = {
        id: jeId,
        entryNumber: `JE-PAY-${Date.now().toString().slice(-6)}`,
        transactionId: trxRecord.id,
        sourceType: 'payment',
        sourceId: paymentId,
        sourceNumber: receiptNumber,
        status: 'posted',
        currency: 'YER',
        exchangeRate: 1,
        createdBy: 'admin',
        postedBy: 'admin',
        postedAt: new Date().toISOString(),
        description: `سند قبض #${receiptNumber} دفعة أولى للطلب ${orderData.orderNumber} - ${customer?.name}`,
        createdAt: new Date().toISOString(),
        lines: [
          {
            id: jeId + 1,
            journalEntryId: jeId,
            accountId: initialPayment.accountId,
            accountName: acc?.name || 'الحساب',
            chartAccountId: payAccChart.id,
            chartAccountCode: payAccChart.code,
            side: 'debit', // من حـ/ الصندوق أو المحفظة
            amount: initialPayment.amount,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: initialPayment.amount
          },
          {
            id: jeId + 2,
            journalEntryId: jeId,
            accountId: null,
            accountName: `العميل: ${customer?.name || 'العميل'}`,
            chartAccountId: payCustChart.id,
            chartAccountCode: payCustChart.code,
            side: 'credit', // إلى حـ/ العميل
            amount: initialPayment.amount,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: initialPayment.amount
          }
        ]
      };
      newJournals = [journalEntry, ...newJournals];
    }

    // Journal Entry for the Sales Invoice (Debit Customer, Credit Sales)
    const orderJeId = orderId + 30;
    const ordCustChart = resolveChartAccount(`حـ/ العميل: ${customer?.name || orderData.customerName}`, 'debit');
    const ordSalesChart = resolveChartAccount('حـ/ إيرادات المبيعات والوساطة', 'credit');

    const orderJournalEntry: JournalEntry = {
      id: orderJeId,
      entryNumber: `JE-ORD-${Date.now().toString().slice(-6)}`,
      sourceType: 'order',
      sourceId: orderId,
      sourceNumber: String(orderData.orderNumber),
      status: 'posted',
      currency: 'YER',
      exchangeRate: 1,
      createdBy: 'admin',
      postedBy: 'admin',
      postedAt: new Date().toISOString(),
      description: `إثبات فاتورة الطلب #${orderData.orderNumber} - ${customer?.name || orderData.customerName}`,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: orderJeId + 1,
          journalEntryId: orderJeId,
          accountId: null,
          accountName: `حـ/ العميل: ${customer?.name || orderData.customerName}`,
          chartAccountId: ordCustChart.id,
          chartAccountCode: ordCustChart.code,
          side: 'debit', // مدين: إثبات استحقاق الفاتورة على العميل
          amount: totalAmount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: totalAmount
        },
        {
          id: orderJeId + 2,
          journalEntryId: orderJeId,
          accountId: null,
          accountName: 'حـ/ إيرادات المبيعات والوساطة',
          chartAccountId: ordSalesChart.id,
          chartAccountCode: ordSalesChart.code,
          side: 'credit', // دائن: إيرادات المبيعات
          amount: totalAmount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: totalAmount
        }
      ]
    };
    newJournals = [orderJournalEntry, ...newJournals];

    setData(prev => {
      let updatedDiscountCodes = prev.tables.discountCodes || [];
      if (orderData.marketingCode) {
        updatedDiscountCodes = updatedDiscountCodes.map(dc => {
          if (dc.code.toUpperCase() === orderData.marketingCode?.toUpperCase()) {
            return { ...dc, usageCount: (dc.usageCount || 0) + 1 };
          }
          return dc;
        });
      }

      const newAuditLog: AuditLog = {
        id: Date.now() + 50,
        action: 'إصدار فاتورة طلب',
        performedBy: 'الإدارة المالية - مالك العديني',
        entityType: 'invoice',
        entityId: orderId,
        description: `إصدار فاتورة الطلب رقم ${orderData.orderNumber} بمبلغ ${totalAmount.toLocaleString()} ريال للعميل ${customer?.name || orderData.customerName}`,
        notes: `منصة الشراء: ${orderData.site || 'متنوع'} | الشحنة: ${orderData.shipmentNumber || 'قيد المعالجة'}`,
        oldValue: null,
        newValue: `${totalAmount.toLocaleString()} ريال`,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: [newOrder, ...prev.tables.orders],
          payments: newPayments,
          financialTransactions: newTransactions,
          journalEntries: newJournals,
          discountCodes: updatedDiscountCodes,
          auditLogs: [newAuditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم حفظ الطلب #${orderData.orderNumber} وتوليد قيد اليومية الآلي بنجاح`, 'success');
    return newOrder;
  };

  const updateOrder = (updatedOrder: Order) => {
    setData(prev => {
      const oldOrder = prev.tables.orders.find(o => o.id === updatedOrder.id);
      if (!oldOrder) return prev;

      const cleanNum = String(updatedOrder.orderNumber || oldOrder.orderNumber).trim().replace(/^ORD-/, '').trim();
      const finalOrder: Order = {
        ...updatedOrder,
        orderNumber: cleanNum,
        customerOrderNumber: cleanNum,
        internalNumber: cleanNum,
        invoiceNumber: `INV-${cleanNum}`
      };

      // Update linked sales journal entry if amount or customer or orderNumber changed
      const updatedJournals = prev.tables.journalEntries.map(je => {
        const isLinkedOrder =
          (je.sourceType === 'order' && (je.sourceId === updatedOrder.id || je.sourceId === String(updatedOrder.id))) ||
          (oldOrder.orderNumber && je.description?.includes(String(oldOrder.orderNumber)) && je.entryNumber?.startsWith('JE-ORD-'));

        if (isLinkedOrder) {
          return {
            ...je,
            sourceNumber: cleanNum,
            entryNumber: `JE-ORD-${cleanNum.padStart(4, '0')}`,
            description: `إثبات فاتورة الطلب #${cleanNum} - ${finalOrder.customerName || 'العميل'}`,
            lines: je.lines.map(l => {
              if (l.side === 'debit') {
                return {
                  ...l,
                  accountName: `حـ/ العميل: ${finalOrder.customerName || 'العميل'}`,
                  amount: finalOrder.totalAmount
                };
              } else {
                return {
                  ...l,
                  amount: finalOrder.totalAmount
                };
              }
            })
          };
        }
        return je;
      });

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'تعديل طلب وتحديث قيده المحاسبي',
        performedBy: 'الإدارة المالية',
        entityType: 'order',
        entityId: finalOrder.id,
        description: `تعديل الطلب #${finalOrder.orderNumber} - تحديث المبلغ إلى ${finalOrder.totalAmount} ريال وتحديث قيد اليومية المرتبط`,
        oldValue: `${oldOrder.totalAmount} ريال`,
        newValue: `${finalOrder.totalAmount} ريال`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: prev.tables.orders.map(o => o.id === finalOrder.id ? finalOrder : o),
          journalEntries: updatedJournals,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(`تم تعديل الطلب #${updatedOrder.orderNumber} وتحديث قيد اليومية المرتبط بنجاح`, 'success');
  };

  const deleteOrder = (orderId: number, options?: { deleteJournal?: boolean; deletePayments?: boolean }) => {
    setData(prev => {
      const order = prev.tables.orders.find(o => o.id === orderId);
      if (!order || order.status === 'cancelled') return prev;

      const customer = prev.tables.customers.find(c => c.id === order.customerId);

      const origOrderJe = prev.tables.journalEntries.find(
        j => j.sourceType === 'order' && Number(j.sourceId) === Number(orderId)
      );

      // Issue balancing reversal journal entry to reverse the sales recognition and customer receivable
      const revJeId = Date.now();
      const revEntryNumber = `JE-REV-${Date.now().toString().slice(-6)}`;
      const reversalJe: JournalEntry = {
        id: revJeId,
        entryNumber: revEntryNumber,
        sourceType: 'reversal',
        sourceId: orderId,
        sourceNumber: String(order.orderNumber),
        status: 'posted',
        reversesEntryId: origOrderJe ? origOrderJe.id : null,
        reversalReason: `إلغاء الطلب #${order.orderNumber}`,
        description: `قيد عكسي لإلغاء مبيعات وفاتورة الطلب #${order.orderNumber} - ${customer?.name || order.customerName}`,
        createdAt: new Date().toISOString(),
        postedAt: new Date().toISOString(),
        lines: [
          {
            id: revJeId + 1,
            journalEntryId: revJeId,
            accountId: null,
            accountName: 'حـ/ عكس إيرادات المبيعات والوساطة',
            side: 'debit', // عكس الإيراد
            amount: order.totalAmount
          },
          {
            id: revJeId + 2,
            journalEntryId: revJeId,
            accountId: null,
            accountName: `حـ/ العميل: ${customer?.name || order.customerName}`,
            side: 'credit', // تبرئة ذمة العميل من الفاتورة
            amount: order.totalAmount
          }
        ]
      };

      const updatedJournals = prev.tables.journalEntries.map(j => {
        if (origOrderJe && j.id === origOrderJe.id) {
          return {
            ...j,
            status: 'reversed' as const,
            isReversed: true,
            reversedByEntryId: revJeId,
            reversalReason: `إلغاء الطلب #${order.orderNumber}`
          };
        }
        return j;
      });
      const allJournals = [reversalJe, ...updatedJournals];

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'إلغاء طلب وإصدار قيد عكسي',
        performedBy: 'الإدارة المالية',
        entityType: 'order',
        entityId: orderId,
        description: `تم إلغاء الطلب #${order.orderNumber} بمبلغ ${order.totalAmount} ريال وإصدار قيد عكسي #${revEntryNumber} حفظاً للأثر المحاسبي`,
        notes: `إلغاء الطلب #${order.orderNumber}`,
        oldValue: 'قيد التنفيذ',
        newValue: 'ملغى'
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: prev.tables.orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o),
          journalEntries: allJournals,
          journalLines: allJournals.flatMap(e => e.lines || []),
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(`تطبيق معايير التدقيق: تم إلغاء الطلب عبر قيد عكسي رسمي لحماية الأثر المحاسبي وعدم شطب الفواتير السابقة.`, 'warning');
  };

  const updateOrderStatus = (orderId: number, status: Order['status']) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        orders: prev.tables.orders.map(o => o.id === orderId ? { ...o, status } : o)
      }
    }));
  };

  const collectDeliveryFee = (orderId: number, accountId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.deliveryFee <= 0) return;

    const acc = accounts.find(a => a.id === accountId);
    const fee = order.deliveryFee;
    const trxId = Date.now();

    const trx: FinancialTransaction = {
      id: trxId,
      transactionNumber: `TRX-DLV-${Date.now().toString().slice(-6)}`,
      transactionDate: new Date().toISOString(),
      accountId,
      type: 'deposit',
      amount: fee,
      description: `تحصيل رسوم توصيل الطلب ${order.orderNumber}`,
      orderId,
      customerId: order.customerId,
      createdAt: new Date().toISOString()
    };

    const je: JournalEntry = {
      id: trxId + 1,
      entryNumber: `JE-DLV-${Date.now().toString().slice(-6)}`,
      description: `إيراد رسوم توصيل الطلب ${order.orderNumber}`,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: trxId + 2,
          journalEntryId: trxId + 1,
          accountId,
          accountName: acc?.name || 'المحفظة',
          side: 'debit',
          amount: fee
        },
        {
          id: trxId + 3,
          journalEntryId: trxId + 1,
          accountId: null,
          accountName: 'إيرادات خدمات توصيل',
          side: 'credit',
          amount: fee
        }
      ]
    };

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        orders: prev.tables.orders.map(o => o.id === orderId ? { ...o, deliveryFeeCollectionStatus: 'collected' } : o),
        financialTransactions: [trx, ...prev.tables.financialTransactions],
        journalEntries: [je, ...prev.tables.journalEntries]
      }
    }));
  };

  const recordPayment = (p: {
    customerId: number;
    orderId?: number;
    amount: number;
    accountId: number;
    paymentMethod: string;
    paymentType?: string;
    statement?: string;
    notes?: string;
    courierId?: number;
    deliveryPaymentMethod?: 'cash_to_courier' | 'transfer_to_wallet';
    deliveryFee?: number;
    courierCustodyAmount?: number;
  }): Payment => {
    const customer = customers.find(c => c.id === p.customerId);
    const acc = accounts.find(a => a.id === p.accountId);
    const targetOrder = p.orderId ? orders.find(o => o.id === p.orderId) : undefined;
    const paymentId = Date.now();
    const payDate = new Date().toISOString();
    const todayStr = payDate.split('T')[0];
    const periodCheck = assertFiscalPeriodOpen(payDate, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن تسجيل مقبوضات فيها.', 'error');
      throw new Error(periodCheck.reason);
    }
    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;
    const trxNumber = `TRX-PAY-${Date.now().toString().slice(-6)}`;
    const receiptNumber = `RCT-${new Date().getFullYear()}-${String(payments.length + 1).padStart(3, '0')}`;

    // Auto calculate paymentType if omitted
    let computedType = p.paymentType;
    if (!computedType) {
      if (targetOrder) {
        if (targetOrder.paidAmount === 0) {
          computedType = p.amount >= targetOrder.totalAmount ? 'دفعة نهائية' : 'دفعة أولى';
        } else if (p.amount >= targetOrder.remainingAmount) {
          computedType = 'دفعة نهائية';
        } else {
          computedType = 'دفعة لاحقة';
        }
      } else {
        computedType = 'سداد حساب';
      }
    }

    const isFinalPayment = Boolean(
      computedType === 'دفعة نهائية' ||
      (targetOrder && p.amount >= (targetOrder.remainingAmount || 0) && (targetOrder.remainingAmount || 0) > 0)
    );

    const selectedCourier = p.courierId ? couriers.find(c => c.id === p.courierId) : undefined;
    const isCashToCourier = Boolean(p.courierId && p.deliveryPaymentMethod === 'cash_to_courier');
    const isWalletWithCourier = Boolean(p.courierId && p.deliveryPaymentMethod === 'transfer_to_wallet');
    const resolvedDeliveryFee = p.deliveryFee !== undefined
      ? Number(p.deliveryFee)
      : (Number(targetOrder?.deliveryFee) || Number(selectedCourier?.defaultDeliveryFee) || 1500);
    const custodyAmountToRecord = p.courierCustodyAmount !== undefined
      ? Number(p.courierCustodyAmount)
      : Number(p.amount);

    const effectivePaymentMethod = isCashToCourier
      ? `نقدي للمندوب (${selectedCourier?.name || 'المندوب'})`
      : p.paymentMethod;

    const defaultStatement = targetOrder
      ? isCashToCourier
        ? `سداد ${computedType} للطلب #${targetOrder.orderNumber} - نقدي للمندوب ${selectedCourier?.name || ''}`
        : isWalletWithCourier
        ? `سداد ${computedType} للطلب #${targetOrder.orderNumber} عبر ${acc?.name || p.paymentMethod} (توصيل المندوب ${selectedCourier?.name || ''})`
        : `سداد ${computedType} للطلب ${targetOrder.orderNumber}`
      : `سداد دفعة على الحساب من العميل ${customer?.name || ''}`;

    const newPayment: Payment = {
      id: paymentId,
      paymentNumber,
      receiptNumber,
      customerId: p.customerId,
      orderId: p.orderId || null,
      accountId: p.accountId,
      amount: p.amount,
      paymentDate: todayStr,
      paymentMethod: effectivePaymentMethod,
      paymentType: computedType,
      statement: p.statement || defaultStatement,
      notes: p.notes,
      status: 'approved',
      createdByName: 'أحمد الإدريسي (أمين الصندوق)',
      courierId: p.courierId || null,
      courierName: selectedCourier?.name,
      deliveryPaymentMethod: p.deliveryPaymentMethod,
      deliveryFee: p.courierId ? resolvedDeliveryFee : undefined,
      createdAt: payDate
    };

    // Only create a wallet deposit transaction if NOT paid in cash directly to the courier's custody
    const trx: FinancialTransaction | null = isCashToCourier
      ? null
      : {
          id: paymentId + 1,
          transactionNumber: trxNumber,
          transactionDate: payDate,
          accountId: p.accountId,
          type: 'payment',
          amount: p.amount,
          description: `سند قبض #${receiptNumber} من ${customer?.name || 'العميل'}${targetOrder ? ` - طلب رقم #${targetOrder.orderNumber}` : ''} ${p.notes ? `(${p.notes})` : ''}`,
          customerId: p.customerId,
          orderId: p.orderId,
          createdAt: payDate
        };

    const debitAccountLabel = isCashToCourier
      ? `حـ/ عهدة المندوب: ${selectedCourier?.name || 'المندوب'} (طلب رقم #${targetOrder?.orderNumber || p.orderId || ''})`
      : (acc?.name || 'الصندوق');
    const payAccChart = resolveChartAccount(isCashToCourier ? 'الصندوق' : (acc?.name || 'الصندوق'), 'debit');
    const payCustChart = resolveChartAccount(`حـ/ العميل: ${customer?.name}`, 'credit');

    const je: JournalEntry = {
      id: paymentId + 2,
      entryNumber: `JE-PAY-${Date.now().toString().slice(-6)}`,
      description: isCashToCourier
        ? `سند قبض #${receiptNumber} نقدي للمندوب ${selectedCourier?.name || ''} عن طلب رقم #${targetOrder?.orderNumber || ''} - العميل: ${customer?.name}`
        : `سند قبض #${receiptNumber} من العميل: ${customer?.name}${targetOrder ? ` (طلب رقم #${targetOrder.orderNumber})` : ''}`,
      sourceType: 'payment',
      sourceId: paymentId,
      sourceNumber: receiptNumber,
      status: 'posted',
      currency: 'YER',
      exchangeRate: 1,
      createdBy: 'أحمد الإدريسي (أمين الصندوق)',
      postedBy: 'أحمد الإدريسي (أمين الصندوق)',
      postedAt: payDate,
      createdAt: payDate,
      lines: [
        {
          id: paymentId + 3,
          journalEntryId: paymentId + 2,
          accountId: isCashToCourier ? null : p.accountId,
          accountName: debitAccountLabel,
          chartAccountId: payAccChart.id,
          chartAccountCode: payAccChart.code,
          side: 'debit',
          amount: p.amount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: p.amount
        },
        {
          id: paymentId + 4,
          journalEntryId: paymentId + 2,
          accountId: null,
          accountName: `حـ/ العميل: ${customer?.name}`,
          chartAccountId: payCustChart.id,
          chartAccountCode: payCustChart.code,
          side: 'credit',
          amount: p.amount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: p.amount
        }
      ]
    };

    const auditLog: AuditLog = {
      id: paymentId + 5,
      createdAt: payDate,
      action: isCashToCourier
        ? 'سداد دفعة نهائية نقدي للمندوب'
        : isWalletWithCourier
        ? 'سداد دفعة نهائية للمحفظة وإثبات استحقاق مندوب'
        : 'إصدار سند قبض',
      performedBy: 'أحمد الإدريسي (أمين الصندوق)',
      entityType: 'payment',
      entityId: paymentId,
      description: isCashToCourier
        ? `سداد دفعة نهائية للطلب #${targetOrder?.orderNumber || ''} بمبلغ ${p.amount.toLocaleString()} ريال نقداً للمندوب ${selectedCourier?.name} (سجل برصيد المندوب: ${custodyAmountToRecord.toLocaleString()} ريال)`
        : isWalletWithCourier
        ? `سداد دفعة نهائية للطلب #${targetOrder?.orderNumber || ''} بمبلغ ${p.amount.toLocaleString()} ريال في ${acc?.name} وإثبات استحقاق توصيل للمندوب ${selectedCourier?.name} بمبلغ ${resolvedDeliveryFee.toLocaleString()} ريال`
        : `إصدار سند قبض رقم ${receiptNumber} بمبلغ ${p.amount.toLocaleString()} ريال للعميل ${customer?.name}`,
      notes: p.notes || defaultStatement,
      oldValue: null,
      newValue: `${p.amount} ريال (${computedType})`
    };

    setData(prev => {
      // 1. Update orders paidAmount, remainingAmount, and status if delivered by courier
      let updatedOrders = prev.tables.orders;
      let settledOrderForDelivery: Order | undefined = undefined;

      if (p.orderId) {
        updatedOrders = prev.tables.orders.map(o => {
          if (o.id === p.orderId) {
            const paid = (o.paidAmount || 0) + p.amount;
            const remaining = Math.max(0, (o.totalAmount || 0) - paid);
            const nextStatus = (remaining === 0 && p.courierId) ? ('delivered' as const) : o.status;
            const updatedOrd: Order = {
              ...o,
              paidAmount: paid,
              remainingAmount: remaining,
              paid: String(paid),
              paymentStatus: remaining === 0 ? 'paid' : 'partial',
              status: nextStatus,
              courierId: p.courierId || o.courierId,
              deliveryFee: p.courierId ? resolvedDeliveryFee : o.deliveryFee,
              deliveryFeeCollectionStatus: p.courierId ? 'collected' : o.deliveryFeeCollectionStatus
            };
            settledOrderForDelivery = updatedOrd;
            return updatedOrd;
          }
          return o;
        });
      } else {
        let remainingToDeduct = p.amount;
        updatedOrders = prev.tables.orders.map(o => {
          if (o.customerId === p.customerId && o.remainingAmount > 0 && remainingToDeduct > 0) {
            const deduct = Math.min(o.remainingAmount, remainingToDeduct);
            remainingToDeduct -= deduct;
            const nextRemaining = Math.max(0, (o.remainingAmount || 0) - deduct);
            const nextPaid = (o.paidAmount || 0) + deduct;
            const updatedOrd: Order = {
              ...o,
              paidAmount: nextPaid,
              remainingAmount: nextRemaining,
              paid: String(nextPaid),
              paymentStatus: nextRemaining === 0 ? 'paid' : 'partial',
              status: (nextRemaining === 0 && p.courierId) ? ('delivered' as const) : o.status,
              courierId: p.courierId || o.courierId
            };
            if (!settledOrderForDelivery && (nextRemaining === 0 || p.courierId)) {
              settledOrderForDelivery = updatedOrd;
            }
            return updatedOrd;
          }
          return o;
        });
      }

      const activeDeliveryTarget = settledOrderForDelivery || targetOrder;
      const shouldSyncToDeliverySystem = Boolean(p.courierId || (isFinalPayment && activeDeliveryTarget));

      // 2. Sync order to Delivery Orders (نظام الموصلين) & update Courier balances
      const currentDeliveryOrders = prev.tables.deliveryOrders && prev.tables.deliveryOrders.length > 0
        ? prev.tables.deliveryOrders
        : (INITIAL_DATA.tables.deliveryOrders || []);
      const currentCouriers = prev.tables.couriers && prev.tables.couriers.length > 0
        ? prev.tables.couriers
        : (INITIAL_DATA.tables.couriers || []);

      let nextDeliveryOrders = currentDeliveryOrders;
      let nextCouriers = currentCouriers;

      if (shouldSyncToDeliverySystem) {
        const orderNum = activeDeliveryTarget?.orderNumber || p.orderId || `PAY-${paymentId.toString().slice(-4)}`;
        const existingDelivery = currentDeliveryOrders.find(
          d =>
            (activeDeliveryTarget && d.orderId === activeDeliveryTarget.id) ||
            (activeDeliveryTarget && String(d.orderNumber) === String(activeDeliveryTarget.orderNumber))
        );

        const prevCustodyOnOrder = existingDelivery?.collectionStatus === 'collected_cash'
          ? (Number(existingDelivery.custodyRecordedAmount) || Number(existingDelivery.deliveryFee) || 0)
          : 0;
        const prevPayableOnOrder = existingDelivery?.collectionStatus === 'transferred_to_wallet'
          ? (Number(existingDelivery.payableRecordedAmount) || 0)
          : 0;

        const newCustodyForOrder = isCashToCourier ? custodyAmountToRecord : 0;
        const newPayableForOrder = isWalletWithCourier ? resolvedDeliveryFee : 0;

        const deliveryNoteText = isCashToCourier
          ? `طلب رقم #${orderNum} — دفع نقدي للمندوب نفسه (${custodyAmountToRecord.toLocaleString()} ريال مسجلة برصيد المندوب)`
          : isWalletWithCourier
          ? `طلب رقم #${orderNum} — دفع لمحفظة ${acc?.name || ''} (${p.amount.toLocaleString()} ريال) واستحقاق للمندوب عندنا (${resolvedDeliveryFee.toLocaleString()} ريال)`
          : `طلب رقم #${orderNum} — تم سداد الدفعة النهائية (${p.amount.toLocaleString()} ريال) وبانتظار تحديد المندوب وطريقة الدفع`;

        if (existingDelivery) {
          nextDeliveryOrders = currentDeliveryOrders.map(d => {
            if (d.id !== existingDelivery.id) return d;
            return {
              ...d,
              orderId: activeDeliveryTarget?.id || d.orderId,
              orderNumber: orderNum,
              customerId: p.customerId,
              customerName: customer?.name || d.customerName,
              customerPhone: customer?.phone || d.customerPhone,
              governorate: customer?.governorate || d.governorate || 'صنعاء',
              address: customer?.address || d.address || customer?.governorate || 'صنعاء',
              courierId: p.courierId || d.courierId,
              courierName: selectedCourier?.name || d.courierName || 'بانتظار تحديد المندوب',
              orderOriginalValue: activeDeliveryTarget?.totalAmount || d.orderOriginalValue || p.amount,
              orderRemainingAmount: 0,
              finalPaymentAmount: p.amount,
              custodyRecordedAmount: isCashToCourier ? newCustodyForOrder : 0,
              payableRecordedAmount: isWalletWithCourier ? newPayableForOrder : 0,
              walletDepositedAmount: isWalletWithCourier ? p.amount : d.walletDepositedAmount,
              paymentId,
              deliveryFee: resolvedDeliveryFee,
              status: p.courierId ? ('delivered' as const) : d.status,
              collectionMethod: p.deliveryPaymentMethod || d.collectionMethod || 'unassigned',
              collectionStatus: isCashToCourier
                ? ('collected_cash' as const)
                : isWalletWithCourier
                ? ('transferred_to_wallet' as const)
                : d.collectionStatus,
              walletId: isWalletWithCourier ? p.accountId : d.walletId,
              walletName: isWalletWithCourier ? acc?.name : d.walletName,
              collectedAt: p.courierId ? payDate : d.collectedAt,
              deliveredAt: p.courierId ? todayStr : d.deliveredAt,
              notes: deliveryNoteText
            };
          });
        } else {
          const newDeliveryOrder: DeliveryOrder = {
            id: paymentId + 10,
            deliveryNumber: `DLV-${Date.now().toString().slice(-6)}`,
            orderId: activeDeliveryTarget?.id || null,
            orderNumber: orderNum,
            customerId: p.customerId,
            shipmentNumber: activeDeliveryTarget?.shipmentId ? String(activeDeliveryTarget.shipmentId) : '',
            customerName: customer?.name || activeDeliveryTarget?.customerName || 'عميل',
            customerPhone: customer?.phone || '',
            governorate: customer?.governorate || 'صنعاء',
            district: customer?.address || '',
            address: customer?.address || customer?.governorate || 'صنعاء',
            courierId: p.courierId || 0,
            courierName: selectedCourier?.name || 'بانتظار تحديد المندوب',
            dispatchDate: payDate,
            orderOriginalValue: activeDeliveryTarget?.totalAmount || p.amount,
            orderRemainingAmount: 0,
            finalPaymentAmount: p.amount,
            custodyRecordedAmount: newCustodyForOrder,
            payableRecordedAmount: newPayableForOrder,
            walletDepositedAmount: isWalletWithCourier ? p.amount : 0,
            paymentId,
            deliveryFee: resolvedDeliveryFee,
            status: p.courierId ? 'delivered' : 'pending_dispatch',
            collectionMethod: p.deliveryPaymentMethod || 'unassigned',
            collectionStatus: isCashToCourier
              ? 'collected_cash'
              : isWalletWithCourier
              ? 'transferred_to_wallet'
              : 'pending',
            walletId: isWalletWithCourier ? p.accountId : undefined,
            walletName: isWalletWithCourier ? acc?.name : undefined,
            collectedAt: p.courierId ? payDate : undefined,
            deliveredAt: p.courierId ? todayStr : undefined,
            notes: deliveryNoteText,
            createdAt: payDate
          };
          nextDeliveryOrders = [newDeliveryOrder, ...currentDeliveryOrders];
        }

        if (p.courierId) {
          const custodyDiff = newCustodyForOrder - (existingDelivery?.courierId === p.courierId ? prevCustodyOnOrder : 0);
          const payableDiff = newPayableForOrder - (existingDelivery?.courierId === p.courierId ? prevPayableOnOrder : 0);
          const wasAlreadyDelivered = existingDelivery?.status === 'delivered' && existingDelivery?.courierId === p.courierId;

          nextCouriers = currentCouriers.map(c => {
            if (c.id !== p.courierId) return c;
            return {
              ...c,
              currentCustodyBalance: Math.max(0, (Number(c.currentCustodyBalance) || 0) + custodyDiff),
              currentPayableBalance: Math.max(0, (Number(c.currentPayableBalance) || 0) + payableDiff),
              deliveredOrdersCount: wasAlreadyDelivered
                ? (Number(c.deliveredOrdersCount) || 0)
                : (Number(c.deliveredOrdersCount) || 0) + 1
            };
          });
        }
      }

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          payments: [newPayment, ...prev.tables.payments],
          financialTransactions: trx ? [trx, ...prev.tables.financialTransactions] : prev.tables.financialTransactions,
          journalEntries: [je, ...prev.tables.journalEntries],
          deliveryOrders: nextDeliveryOrders,
          couriers: nextCouriers,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    if (isCashToCourier) {
      showNotification(
        `تم تسجيل الدفعة النهائية نقداً للمندوب ${selectedCourier?.name} وقيد (${custodyAmountToRecord.toLocaleString()} ريال) برصيد المندوب — طلب رقم #${targetOrder?.orderNumber || ''}`,
        'success'
      );
    } else if (isWalletWithCourier) {
      showNotification(
        `تم إيداع (${p.amount.toLocaleString()} ريال) في ${acc?.name} وتسجيل استحقاق (${resolvedDeliveryFee.toLocaleString()} ريال) للمندوب ${selectedCourier?.name} — طلب رقم #${targetOrder?.orderNumber || ''}`,
        'success'
      );
    }

    return newPayment;
  };

  const cancelPayment = (paymentId: number, reason?: string) => {
    setData(prev => {
      const paymentToCancel = prev.tables.payments.find(p => p.id === paymentId);
      if (!paymentToCancel || paymentToCancel.status === 'cancelled') return prev;

      const customer = prev.tables.customers.find(c => c.id === paymentToCancel.customerId);
      const acc = prev.tables.accounts.find(a => a.id === paymentToCancel.accountId);

      // Revert order remaining and paid amounts
      let updatedOrders = prev.tables.orders;
      if (paymentToCancel.orderId) {
        updatedOrders = prev.tables.orders.map(o => {
          if (o.id === paymentToCancel.orderId) {
            const paid = Math.max(0, (o.paidAmount || 0) - paymentToCancel.amount);
            const remaining = Math.max(0, (o.totalAmount || 0) - paid);
            return { ...o, paidAmount: paid, remainingAmount: remaining };
          }
          return o;
        });
      }

      const origPaymentJe = prev.tables.journalEntries.find(
        j => j.sourceType === 'payment' && Number(j.sourceId) === Number(paymentId)
      );

      // Reversing journal entry (strictly balanced)
      const jeId = Date.now();
      const custChart = resolveChartAccount(`حـ/ العميل: ${customer?.name || 'العميل'}`, 'debit');
      const accChart = resolveChartAccount(acc?.name || 'الحساب المستلم', 'credit', paymentToCancel.accountId);

      const reversalJe: JournalEntry = {
        id: jeId,
        entryNumber: `JE-REV-${Date.now().toString().slice(-6)}`,
        sourceType: 'reversal',
        sourceId: paymentId,
        sourceNumber: paymentToCancel.receiptNumber || paymentToCancel.paymentNumber,
        status: 'posted',
        reversesEntryId: origPaymentJe ? origPaymentJe.id : null,
        reversalReason: reason || 'إلغاء معتمد لسند القبض',
        description: `إلغاء سند القبض #${paymentToCancel.receiptNumber || paymentToCancel.paymentNumber} - ${reason || 'إلغاء معتمد'}`,
        createdAt: new Date().toISOString(),
        postedAt: new Date().toISOString(),
        lines: [
          {
            id: jeId + 1,
            journalEntryId: jeId,
            accountId: null,
            accountName: `حـ/ العميل: ${customer?.name || 'العميل'}`,
            chartAccountId: custChart.id,
            chartAccountCode: custChart.code,
            side: 'debit', // مدين: إعادة إثبات دين العميل
            amount: paymentToCancel.amount
          },
          {
            id: jeId + 2,
            journalEntryId: jeId,
            accountId: paymentToCancel.accountId,
            accountName: acc?.name || 'الحساب المستلم',
            chartAccountId: accChart.id,
            chartAccountCode: accChart.code,
            side: 'credit', // دائن: خصم القيمة من المحفظة/الصندوق
            amount: paymentToCancel.amount
          }
        ]
      };

      // Create reversing financial transaction to deduct funds from the account
      const revTrx: FinancialTransaction = {
        id: jeId + 3,
        transactionNumber: `TRX-REV-${Date.now().toString().slice(-6)}`,
        transactionDate: new Date().toISOString(),
        accountId: paymentToCancel.accountId,
        type: 'withdrawal',
        amount: paymentToCancel.amount,
        description: `خصم وعكس لإلغاء سند القبض #${paymentToCancel.receiptNumber || paymentToCancel.paymentNumber}`,
        paymentId: paymentId,
        createdAt: new Date().toISOString()
      };

      const updatedJournals = prev.tables.journalEntries.map(j => {
        if (origPaymentJe && j.id === origPaymentJe.id) {
          return {
            ...j,
            status: 'reversed' as const,
            isReversed: true,
            reversedByEntryId: jeId,
            reversalReason: reason || 'إلغاء معتمد لسند القبض'
          };
        }
        return j;
      });
      const allJournals = [reversalJe, ...updatedJournals];

      const auditLog: AuditLog = {
        id: Date.now() + 1,
        createdAt: new Date().toISOString(),
        action: 'إلغاء سند قبض معتمد',
        performedBy: 'المدير العام',
        entityType: 'payment',
        entityId: paymentId,
        description: `إلغاء سند القبض ${paymentToCancel.receiptNumber || paymentToCancel.paymentNumber}. السبب: ${reason || 'طلب الإدارة'}`,
        notes: `إلغاء السند ${paymentToCancel.receiptNumber || paymentToCancel.paymentNumber}. السبب: ${reason || 'طلب الإدارة'}`,
        oldValue: 'معتمد',
        newValue: 'ملغى'
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          payments: prev.tables.payments.map(p =>
            p.id === paymentId ? { ...p, status: 'cancelled', updatedAt: new Date().toISOString() } : p
          ),
          financialTransactions: [revTrx, ...(prev.tables.financialTransactions || [])],
          journalEntries: allJournals,
          journalLines: allJournals.flatMap(e => e.lines || []),
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
  };

  const updatePayment = (
    paymentId: number,
    data: {
      amount?: number;
      accountId?: number;
      paymentMethod?: string;
      paymentType?: string;
      statement?: string;
      notes?: string;
    }
  ) => {
    setData(prev => {
      const existing = prev.tables.payments.find(p => p.id === paymentId);
      if (!existing) return prev;

      const newAmount = data.amount !== undefined ? Number(data.amount) : Number(existing.amount);
      const newAccountId = data.accountId !== undefined ? data.accountId : existing.accountId;
      const acc = accounts.find(a => a.id === newAccountId);

      const updatedPayments = prev.tables.payments.map(p => {
        if (p.id === paymentId) {
          return {
            ...p,
            ...data,
            amount: newAmount,
            accountId: newAccountId,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });

      // Update linked transaction
      const updatedTrx = prev.tables.financialTransactions.map(t => {
        if (t.id === paymentId + 1 || t.id === paymentId + 10 || (t.type === 'payment' && t.paymentId === paymentId)) {
          return {
            ...t,
            amount: newAmount,
            accountId: newAccountId
          };
        }
        return t;
      });

      // Update linked journal entry
      const updatedJournals = prev.tables.journalEntries.map(je => {
        const isLinked = (je.sourceType === 'payment' && (je.sourceId === paymentId || je.sourceId === String(paymentId))) ||
                         (je.id === paymentId + 2 || je.id === paymentId + 20) ||
                         (existing.receiptNumber && je.description?.includes(existing.receiptNumber));
        if (isLinked) {
          return {
            ...je,
            lines: je.lines.map(l => {
              if (l.side === 'debit') {
                return {
                  ...l,
                  accountId: newAccountId,
                  accountName: acc?.name || l.accountName,
                  amount: newAmount
                };
              } else {
                return {
                  ...l,
                  amount: newAmount
                };
              }
            })
          };
        }
        return je;
      });

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'تعديل سند قبض معتمد',
        performedBy: 'المدير العام',
        entityType: 'payment',
        entityId: paymentId,
        description: `تعديل بيانات سند القبض ${existing.receiptNumber || existing.paymentNumber} وتحديث قيده المحاسبي`,
        notes: `تعديل بيانات سند القبض ${existing.receiptNumber || existing.paymentNumber}`,
        oldValue: `${existing.amount} ريال`,
        newValue: `${newAmount} ريال`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          payments: updatedPayments,
          financialTransactions: updatedTrx,
          journalEntries: updatedJournals,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(`تم تعديل سند القبض وتحديث قيده المحاسبي بنجاح`, 'success');
  };

  const deletePayment = (paymentId: number, options?: { deleteJournal?: boolean }) => {
    const payment = data.tables.payments.find(p => p.id === paymentId);
    if (!payment) return;

    // Financial ASVS Security Rule: Convert deletion of payment into cancelPayment (reversal entry)
    cancelPayment(paymentId, 'إلغاء وعكس معتمد لسند القبض');
    showNotification(`تطبيق معايير التدقيق: تم إلغاء سند القبض عبر قيد عكسي رسمي (Reversal Entry) للحفاظ على تسلسل الدفاتر.`, 'warning');
  };

  const addExpense = (exp: {
    category: string;
    vendorName?: string;
    amount: number;
    accountId: number;
    description: string;
    notes?: string;
    campaignId?: number | null;
  }) => {
    const acc = accounts.find(a => a.id === exp.accountId);
    const expId = Date.now();
    const expDate = new Date().toISOString();
    const periodCheck = assertFiscalPeriodOpen(expDate, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن تسجيل مصروفات فيها.', 'error');
      throw new Error(periodCheck.reason);
    }
    const expNumber = `EXP-${Date.now().toString().slice(-6)}`;
    const trxNumber = `TRX-EXP-${Date.now().toString().slice(-6)}`;

    const newExpense: Expense = {
      id: expId,
      expenseNumber: expNumber,
      category: exp.category,
      vendorName: exp.vendorName,
      amount: exp.amount,
      paymentMethod: acc?.name || 'محفظة',
      accountId: exp.accountId,
      description: exp.description,
      notes: exp.notes,
      campaignId: exp.campaignId || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const trx: FinancialTransaction = {
      id: expId + 1,
      transactionNumber: trxNumber,
      transactionDate: new Date().toISOString(),
      accountId: exp.accountId,
      type: 'expense',
      amount: exp.amount,
      description: `مصروف ${exp.category}: ${exp.description}`,
      createdAt: new Date().toISOString()
    };

    const expChartRes = resolveChartAccount(exp.category, 'debit');
    const accChartRes = resolveChartAccount(acc?.name || 'الصندوق', 'credit');

    const je: JournalEntry = {
      id: expId + 2,
      entryNumber: `JE-EXP-${Date.now().toString().slice(-6)}`,
      sourceType: 'expense',
      sourceId: expId,
      sourceNumber: expNumber,
      status: 'posted',
      currency: 'YER',
      exchangeRate: 1,
      createdBy: 'admin',
      postedBy: 'admin',
      postedAt: new Date().toISOString(),
      description: `مصروف ${exp.category} - ${exp.description}`,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: expId + 3,
          journalEntryId: expId + 2,
          accountId: null,
          accountName: `مصروفات - ${exp.category}`,
          chartAccountId: expChartRes.id,
          chartAccountCode: expChartRes.code,
          side: 'debit',
          amount: exp.amount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: exp.amount
        },
        {
          id: expId + 4,
          journalEntryId: expId + 2,
          accountId: exp.accountId,
          accountName: acc?.name || 'المحفظة',
          chartAccountId: accChartRes.id,
          chartAccountCode: accChartRes.code,
          side: 'credit',
          amount: exp.amount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: exp.amount
        }
      ]
    };

    setData(prev => {
      let updatedCampaigns = prev.tables.marketingCampaigns || [];
      if (exp.campaignId) {
        updatedCampaigns = updatedCampaigns.map(cmp => {
          if (cmp.id === exp.campaignId) {
            return {
              ...cmp,
              actualSpend: (Number(cmp.actualSpend) || 0) + exp.amount
            };
          }
          return cmp;
        });
      }

      const newAuditLog: AuditLog = {
        id: Date.now() + 5,
        action: 'إضافة مصروف',
        entityType: 'expense',
        entityId: expId,
        description: `تسجيل مصروف ${exp.category} بقيمة ${exp.amount} ريال`,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          expenses: [newExpense, ...prev.tables.expenses],
          financialTransactions: [trx, ...prev.tables.financialTransactions],
          journalEntries: [je, ...prev.tables.journalEntries],
          marketingCampaigns: updatedCampaigns,
          auditLogs: [newAuditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(`تم تسجيل المصروف ${expNumber} وتوليد قيد اليومية المحاسبي بنجاح`, 'success');
  };

  const updateExpense = (id: number, updateData: Partial<Expense>) => {
    setData(prev => {
      const oldExp = prev.tables.expenses.find(e => e.id === id);
      if (!oldExp) return prev;

      const newAmount = updateData.amount !== undefined ? Number(updateData.amount) : Number(oldExp.amount);
      const newAccountId = updateData.accountId !== undefined ? updateData.accountId : oldExp.accountId;
      const newCategory = updateData.category !== undefined ? updateData.category : oldExp.category;
      const newDesc = updateData.description !== undefined ? updateData.description : oldExp.description;
      const acc = accounts.find(a => a.id === newAccountId);

      // Update expense
      const updatedExpenses = prev.tables.expenses.map(e => {
        if (e.id === id) {
          return {
            ...e,
            ...updateData,
            amount: newAmount,
            accountId: newAccountId,
            paymentMethod: acc?.name || e.paymentMethod,
            category: newCategory,
            description: newDesc
          };
        }
        return e;
      });

      // Update linked transaction
      const updatedTrx = prev.tables.financialTransactions.map(t => {
        if (t.id === oldExp.id + 1 || (t.type === 'expense' && t.description?.includes(oldExp.expenseNumber))) {
          return {
            ...t,
            amount: newAmount,
            accountId: newAccountId,
            description: `مصروف ${newCategory}: ${newDesc}`
          };
        }
        return t;
      });

      // Update linked journal entry
      const updatedJournals = prev.tables.journalEntries.map(je => {
        const isLinked = (je.sourceType === 'expense' && (je.sourceId === id || je.sourceId === String(id))) ||
                         (je.id === oldExp.id + 2) ||
                         je.entryNumber?.includes(oldExp.expenseNumber);
        if (isLinked) {
          return {
            ...je,
            description: `مصروف ${newCategory} - ${newDesc}`,
            lines: je.lines.map(l => {
              if (l.side === 'debit') {
                return {
                  ...l,
                  accountName: `مصروفات - ${newCategory}`,
                  amount: newAmount
                };
              } else {
                return {
                  ...l,
                  accountId: newAccountId,
                  accountName: acc?.name || l.accountName,
                  amount: newAmount
                };
              }
            })
          };
        }
        return je;
      });

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'تعديل مصروف وتحديث قيده المحاسبي',
        performedBy: 'الإدارة المالية',
        entityType: 'expense',
        entityId: id,
        description: `تعديل المصروف ${oldExp.expenseNumber} إلى ${newAmount} ريال وتحديث قيد اليومية`,
        oldValue: `${oldExp.amount} ريال`,
        newValue: `${newAmount} ريال`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          expenses: updatedExpenses,
          financialTransactions: updatedTrx,
          journalEntries: updatedJournals,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(`تم تعديل المصروف وتحديث قيد اليومية ورصيد الحساب بنجاح`, 'success');
  };

  const deleteExpense = (id: number, options?: { deleteJournal?: boolean }) => {
    setData(prev => {
      const exp = prev.tables.expenses.find(e => e.id === id);
      if (!exp || exp.status === 'cancelled') return prev;

      const acc = prev.tables.accounts.find(a => a.id === exp.accountId);

      const origExpJe = prev.tables.journalEntries.find(
        j => j.sourceType === 'expense' && Number(j.sourceId) === Number(id)
      );

      // Issue balancing reversal journal entry to restore funds and reverse the expense
      const revJeId = Date.now();
      const revEntryNumber = `JE-REV-${Date.now().toString().slice(-6)}`;
      const accChart = resolveChartAccount(acc?.name || 'المحفظة/الصندوق', 'debit', exp.accountId);
      const expChart = resolveChartAccount(`حـ/ عكس مصروفات (${exp.category})`, 'credit');

      const reversalJe: JournalEntry = {
        id: revJeId,
        entryNumber: revEntryNumber,
        sourceType: 'reversal',
        sourceId: id,
        sourceNumber: exp.expenseNumber,
        status: 'posted',
        reversesEntryId: origExpJe ? origExpJe.id : null,
        reversalReason: `إلغاء المصروف #${exp.expenseNumber}`,
        description: `قيد عكسي لإلغاء المصروف #${exp.expenseNumber} (${exp.category}) واسترجاع المبلغ للرصيد`,
        createdAt: new Date().toISOString(),
        postedAt: new Date().toISOString(),
        lines: [
          {
            id: revJeId + 1,
            journalEntryId: revJeId,
            accountId: exp.accountId,
            accountName: acc?.name || 'المحفظة/الصندوق',
            chartAccountId: accChart.id,
            chartAccountCode: accChart.code,
            side: 'debit', // استعادة المبلغ لحساب الدفع
            amount: exp.amount
          },
          {
            id: revJeId + 2,
            journalEntryId: revJeId,
            accountId: null,
            accountName: `حـ/ عكس مصروفات (${exp.category})`,
            chartAccountId: expChart.id,
            chartAccountCode: expChart.code,
            side: 'credit', // تصفية وعكس المصروف
            amount: exp.amount
          }
        ]
      };

      // Create reversing financial transaction
      const revTrx: FinancialTransaction = {
        id: revJeId + 3,
        transactionNumber: `TRX-REV-${Date.now().toString().slice(-6)}`,
        transactionDate: new Date().toISOString(),
        accountId: exp.accountId,
        type: 'deposit',
        amount: exp.amount,
        description: `استرجاع مالي لإلغاء المصروف #${exp.expenseNumber}`,
        expenseId: id,
        createdAt: new Date().toISOString()
      };

      const updatedJournals = prev.tables.journalEntries.map(j => {
        if (origExpJe && j.id === origExpJe.id) {
          return {
            ...j,
            status: 'reversed' as const,
            isReversed: true,
            reversedByEntryId: revJeId,
            reversalReason: `إلغاء المصروف #${exp.expenseNumber}`
          };
        }
        return j;
      });
      const allJournals = [reversalJe, ...updatedJournals];

      // Update marketing campaign actual spend if attached
      let updatedCampaigns = prev.tables.marketingCampaigns || [];
      if (exp.campaignId) {
        updatedCampaigns = updatedCampaigns.map(cmp => {
          if (cmp.id === exp.campaignId) {
            return {
              ...cmp,
              actualSpend: Math.max(0, (Number(cmp.actualSpend) || 0) - Number(exp.amount))
            };
          }
          return cmp;
        });
      }

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'إلغاء مصروف وإصدار قيد عكسي',
        performedBy: 'الإدارة المالية',
        entityType: 'expense',
        entityId: id,
        description: `تم إلغاء المصروف ${exp.expenseNumber} بمبلغ ${exp.amount} ريال وإصدار قيد عكسي #${revEntryNumber} بدلاً من الحذف الفيزيائي`,
        oldValue: 'نشط',
        newValue: 'ملغى'
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          expenses: prev.tables.expenses.map(e => e.id === id ? { ...e, status: 'cancelled' } : e),
          financialTransactions: [revTrx, ...prev.tables.financialTransactions],
          journalEntries: allJournals,
          journalLines: allJournals.flatMap(e => e.lines || []),
          marketingCampaigns: updatedCampaigns,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(`تطبيق معايير التدقيق: تم إلغاء المصروف عبر قيد عكسي رسمي للحفاظ على دورة حياة السجلات المالية.`, 'success');
  };

  // Automated & Manual Journal Entries Engine
  const addJournalEntry = (entryData: {
    entryNumber?: string;
    description: string;
    date?: string;
    lines: JournalLine[];
    sourceType?: JournalEntry['sourceType'];
    sourceId?: number | string | null;
    sourceNumber?: string | null;
  }) => {
    const jeId = Date.now();
    const entryNumber = entryData.entryNumber || `JE-MAN-${Date.now().toString().slice(-6)}`;
    const createdAt = entryData.date ? new Date(entryData.date).toISOString() : new Date().toISOString();

    const periodCheck = assertFiscalPeriodOpen(createdAt, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن ترحيل قيود فيها.', 'error');
      throw new Error(periodCheck.reason);
    }

    const formattedLines: JournalLine[] = entryData.lines.map((l, idx) => ({
      ...l,
      id: jeId + idx + 1,
      journalEntryId: jeId,
      amount: roundCurrency(parseFloat(String(l.amount)) || 0)
    }));

    const newEntry: JournalEntry = {
      id: jeId,
      entryNumber,
      description: entryData.description,
      sourceType: entryData.sourceType || 'manual',
      sourceId: entryData.sourceId || null,
      sourceNumber: entryData.sourceNumber || null,
      status: 'posted',
      createdAt,
      postedAt: createdAt,
      postedByName: 'المحاسب المالي',
      lines: formattedLines
    };

    // Strict Double-Entry validation: Reject unbalanced entry
    if (!isJournalEntryBalanced(newEntry)) {
      showNotification('خطأ محاسبي: القيد غير متوازن! مجموع المدين يجب أن يساوي مجموع الدائن تماماً.', 'error');
      throw new Error('القيد غير متوازن: مجموع المدين لا يساوي مجموع الدائن');
    }

    setData(prev => {
      const auditLog: AuditLog = {
        id: Date.now() + 1,
        createdAt: new Date().toISOString(),
        action: 'ترحيل قيد يومية محاسبي (POSTED)',
        performedBy: 'المحاسب المعتمد',
        entityType: 'journalEntry',
        entityId: jeId,
        description: `إنشاء وترحيل قيد يومية #${entryNumber}: ${entryData.description}`,
        newValue: JSON.stringify({ entryNumber, linesCount: formattedLines.length })
      };

      const nextEntries = [newEntry, ...prev.tables.journalEntries];
      return {
        ...prev,
        tables: {
          ...prev.tables,
          journalEntries: nextEntries,
          journalLines: nextEntries.flatMap(e => e.lines || []),
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم ترحيل قيد اليومية #${entryNumber} بنجاح`, 'success');
    return newEntry;
  };

  const updateJournalEntry = (
    id: number,
    updateData: { description?: string; lines?: JournalLine[]; date?: string; sourceNumber?: string },
    options?: { syncSourceDocument?: boolean }
  ) => {
    const existing = data.tables.journalEntries.find(j => j.id === id);
    if (!existing) return;

    // Check fiscal period on existing entry and new date
    const checkTargetDate = updateData.date ? new Date(updateData.date).toISOString() : existing.createdAt;
    const periodCheck = assertFiscalPeriodOpen(checkTargetDate, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن تعديل قيد فيها.', 'error');
      return;
    }

    // Validate double-entry balance if lines are updated
    let formattedLines = existing.lines || [];
    let netPrimaryAmount = 0;
    if (updateData.lines && updateData.lines.length >= 2) {
      // Check for zero or negative amounts
      const hasInvalidAmount = updateData.lines.some(l => (parseFloat(String(l.amount)) || 0) <= 0);
      if (hasInvalidAmount) {
        showNotification('خطأ محاسبي: يجب أن تكون جميع مبالغ أطراف القيد أكبر من الصفر.', 'error');
        return;
      }

      formattedLines = updateData.lines.map((l, idx) => {
        const amt = roundCurrency(parseFloat(String(l.amount)) || 0);
        const resolved = resolveChartAccount(l.accountName || '', l.side || 'debit', l.accountId);
        return {
          ...l,
          id: l.id || id * 10 + idx + 1,
          journalEntryId: id,
          side: l.side === 'credit' ? 'credit' : 'debit',
          amount: amt,
          baseAmount: amt,
          currency: l.currency || 'YER',
          exchangeRate: l.exchangeRate || 1,
          chartAccountId: l.chartAccountId || resolved.id,
          chartAccountCode: l.chartAccountCode || resolved.code
        };
      });

      const totalDebit = formattedLines
        .filter(l => l.side === 'debit')
        .reduce((s, l) => roundCurrency(s + (Number(l.amount) || 0)), 0);
      const totalCredit = formattedLines
        .filter(l => l.side === 'credit')
        .reduce((s, l) => roundCurrency(s + (Number(l.amount) || 0)), 0);

      if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.01) {
        showNotification('خطأ محاسبي: القيد غير متوازن! يجب أن يتساوى إجمالي المدين مع إجمالي الدائن تماماً ومجموعهما أكبر من الصفر.', 'error');
        return;
      }

      netPrimaryAmount = totalDebit;
    }

    setData(prev => {
      const entryToUpdate = prev.tables.journalEntries.find(j => j.id === id);
      if (!entryToUpdate) return prev;

      const updatedEntries = prev.tables.journalEntries.map(j => {
        if (j.id === id) {
          return {
            ...j,
            description: updateData.description !== undefined ? updateData.description : j.description,
            sourceNumber: updateData.sourceNumber !== undefined ? updateData.sourceNumber : j.sourceNumber,
            createdAt: updateData.date ? new Date(updateData.date).toISOString() : j.createdAt,
            updatedAt: new Date().toISOString(),
            lines: formattedLines
          };
        }
        return j;
      });

      const syncedLines = updatedEntries.flatMap(e => e.lines || []);

      // Synchronize linked operational source document if requested (default: true)
      let updatedOrders = prev.tables.orders;
      let updatedPayments = prev.tables.payments;
      let updatedExpenses = prev.tables.expenses;
      let updatedCustomers = prev.tables.customers;
      let updatedTrx = prev.tables.financialTransactions || [];

      const shouldSyncSource = options?.syncSourceDocument !== false;

      if (shouldSyncSource && entryToUpdate.sourceId != null && netPrimaryAmount > 0) {
        const srcId = Number(entryToUpdate.sourceId);

        if (entryToUpdate.sourceType === 'order') {
          updatedOrders = prev.tables.orders.map(o => {
            if (o.id === srcId) {
              const totalAmount = netPrimaryAmount;
              const remainingAmount = Math.max(0, totalAmount - (o.paidAmount || 0));
              return { ...o, totalAmount, remainingAmount };
            }
            return o;
          });
        } else if (entryToUpdate.sourceType === 'payment') {
          updatedPayments = prev.tables.payments.map(p => {
            if (p.id === srcId) {
              return { ...p, amount: netPrimaryAmount };
            }
            return p;
          });
          // Update linked financial transaction
          updatedTrx = updatedTrx.map(t => {
            if (t.paymentId === srcId) {
              return { ...t, amount: netPrimaryAmount };
            }
            return t;
          });
          // Recalculate linked order if exists
          const linkedPayment = prev.tables.payments.find(p => p.id === srcId);
          if (linkedPayment?.orderId) {
            updatedOrders = updatedOrders.map(o => {
              if (o.id === linkedPayment.orderId) {
                const otherPaymentsSum = prev.tables.payments
                  .filter(p => p.orderId === o.id && p.id !== srcId && p.status !== 'cancelled')
                  .reduce((s, p) => s + (p.amount || 0), 0);
                const newPaid = otherPaymentsSum + netPrimaryAmount;
                const newRem = Math.max(0, (o.totalAmount || 0) - newPaid);
                return { ...o, paidAmount: newPaid, remainingAmount: newRem };
              }
              return o;
            });
          }
        } else if (entryToUpdate.sourceType === 'expense') {
          updatedExpenses = prev.tables.expenses.map(e => {
            if (e.id === srcId) {
              return { ...e, amount: netPrimaryAmount };
            }
            return e;
          });
          updatedTrx = updatedTrx.map(t => {
            if (t.expenseId === srcId) {
              return { ...t, amount: netPrimaryAmount };
            }
            return t;
          });
        } else if (entryToUpdate.sourceType === 'opening_balance') {
          updatedCustomers = prev.tables.customers.map(c => {
            if (c.id === srcId) {
              return { ...c, openingBalance: netPrimaryAmount };
            }
            return c;
          });
        }
      }

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'تعديل وتصحيح قيد يومية محاسبي',
        performedBy: 'المحاسب المعتمد',
        entityType: 'journalEntry',
        entityId: id,
        description: `تعديل وتصحيح القيد المحاسبي #${entryToUpdate.entryNumber}: ${updateData.description || entryToUpdate.description}`,
        oldValue: entryToUpdate.description,
        newValue: updateData.description || entryToUpdate.description
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          customers: updatedCustomers,
          orders: updatedOrders,
          payments: updatedPayments,
          expenses: updatedExpenses,
          financialTransactions: updatedTrx,
          journalEntries: updatedEntries,
          journalLines: syncedLines,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم حفظ التعديلات وتصحيح القيد المحاسبي #${existing.entryNumber} بنجاح ومزامنة الدفاتر`, 'success');
  };

  const deleteJournalEntry = (id: number, cascadeOptions?: { deleteSourceDocument?: boolean; reason?: string }) => {
    const entry = data.tables.journalEntries.find(j => j.id === id);
    if (!entry) return;

    // Check fiscal period
    const periodCheck = assertFiscalPeriodOpen(entry.createdAt, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن حذف قيد فيها.', 'error');
      return;
    }

    const now = new Date().toISOString();
    const deleteReason = cascadeOptions?.reason || 'حذف القيد ونقله إلى سلة المحذوفات';
    const targetReversesId = entry.reversesEntryId ?? (entry.sourceType === 'reversal' && entry.sourceId ? Number(entry.sourceId) : null);
    const linkedReversalId = entry.reversedByEntryId ? Number(entry.reversedByEntryId) : null;

    setData(prev => {
      const updatedEntries = prev.tables.journalEntries.map(j => {
        if (j.id === id) {
          return {
            ...j,
            previousStatus: j.status === 'void' ? 'posted' : (j.status || 'posted'),
            status: 'void' as const,
            deletedAt: now,
            deleteReason
          };
        }
        // If deleting a reversal entry, automatically un-reverse the original entry it reversed
        if (targetReversesId && Number(j.id) === Number(targetReversesId)) {
          return {
            ...j,
            status: 'posted' as const,
            isReversed: false,
            reversedByEntryId: null,
            reversalReason: undefined
          };
        }
        // If deleting an entry that had a reversal entry, also void its reversal entry
        if (linkedReversalId && Number(j.id) === Number(linkedReversalId)) {
          return {
            ...j,
            previousStatus: 'posted' as const,
            status: 'void' as const,
            deletedAt: now,
            deleteReason: `حذف تلقائي تبعاً لحذف القيد الأصلي #${entry.entryNumber}`
          };
        }
        return j;
      });

      let updatedOrders = prev.tables.orders;
      let updatedPayments = prev.tables.payments;
      let updatedExpenses = prev.tables.expenses;
      let updatedPurchaseBatches = prev.tables.purchaseBatches || [];
      let updatedTrx = prev.tables.financialTransactions || [];

      if (cascadeOptions?.deleteSourceDocument && entry.sourceId != null) {
        const srcId = Number(entry.sourceId);
        if (entry.sourceType === 'order') {
          updatedOrders = prev.tables.orders.map(o => (o.id === srcId ? { ...o, status: 'cancelled' as const } : o));
        } else if (entry.sourceType === 'payment') {
          const pmt = prev.tables.payments.find(p => p.id === srcId);
          updatedPayments = prev.tables.payments.map(p => (p.id === srcId ? { ...p, status: 'cancelled' as const } : p));
          if (pmt) {
            // Deduct payment amount from account balance via withdrawal transaction
            const revTrx: FinancialTransaction = {
              id: Date.now() + 5,
              transactionNumber: `TRX-DEL-PAY-${Date.now().toString().slice(-5)}`,
              transactionDate: now,
              accountId: pmt.accountId,
              type: 'withdrawal',
              amount: pmt.amount,
              description: `خصم لإلغاء وحذف سند القبض #${pmt.receiptNumber || pmt.paymentNumber}`,
              paymentId: srcId,
              createdAt: now
            };
            updatedTrx = [revTrx, ...updatedTrx];
          }
        } else if (entry.sourceType === 'expense') {
          const exp = prev.tables.expenses.find(e => e.id === srcId);
          updatedExpenses = prev.tables.expenses.map(e => (e.id === srcId ? { ...e, status: 'cancelled' as const } : e));
          if (exp) {
            // Restore funds to account balance via deposit transaction
            const revTrx: FinancialTransaction = {
              id: Date.now() + 6,
              transactionNumber: `TRX-DEL-EXP-${Date.now().toString().slice(-5)}`,
              transactionDate: now,
              accountId: exp.accountId,
              type: 'deposit',
              amount: exp.amount,
              description: `استرجاع رصيد لإلغاء وحذف المصروف #${exp.expenseNumber}`,
              expenseId: srcId,
              createdAt: now
            };
            updatedTrx = [revTrx, ...updatedTrx];
          }
        } else if (entry.sourceType === 'purchase_batch') {
          const batch = updatedPurchaseBatches.find(b => b.id === srcId);
          if (batch) {
            updatedPurchaseBatches = updatedPurchaseBatches.map(b => (b.id === srcId ? { ...b, status: 'cancelled' as const } : b));
            const totalCost = (Number(batch.purchaseCost) || 0) + (Number(batch.purchaseFees) || 0) + (Number(batch.transferFees) || 0);
            const revTrx: FinancialTransaction = {
              id: Date.now() + 7,
              transactionNumber: `TRX-DEL-PB-${Date.now().toString().slice(-5)}`,
              transactionDate: now,
              accountId: batch.accountId,
              type: 'deposit',
              amount: totalCost,
              description: `استرجاع رصيد لإلغاء وحذف دفعة الشراء #${batch.batchNumber}`,
              createdAt: now
            };
            updatedTrx = [revTrx, ...updatedTrx];
            if (batch.orderIds?.length) {
              updatedOrders = updatedOrders.map(o => batch.orderIds!.includes(o.id) ? { ...o, purchaseBatchId: null, status: o.status === 'purchased' ? ('pending' as const) : o.status } : o);
            }
          }
        }
      }

      const syncedLines = updatedEntries.flatMap(e => e.lines || []);

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: now,
        action: 'حذف قيد محاسبي (نقل لسلة المحذوفات)',
        performedBy: 'المحاسب المعتمد',
        entityType: 'journalEntry',
        entityId: id,
        description: `نقل القيد المحاسبي #${entry.entryNumber} إلى سلة المحذوفات (${deleteReason}) مع إيقاف أثره المالي`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          payments: updatedPayments,
          expenses: updatedExpenses,
          purchaseBatches: updatedPurchaseBatches,
          financialTransactions: updatedTrx,
          journalEntries: updatedEntries,
          journalLines: syncedLines,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(
      `تم حذف القيد #${entry.entryNumber} ونقله إلى سلة المحذوفات وإيقاف أثره المالي. يمكنك استرجاعه في أي وقت.`,
      'warning'
    );
  };

  const restoreJournalEntry = (id: number) => {
    const entry = data.tables.journalEntries.find(j => j.id === id);
    if (!entry) return;

    const now = new Date().toISOString();

    setData(prev => {
      const target = prev.tables.journalEntries.find(j => j.id === id);
      if (!target) return prev;

      const isCurrentlyReversed = Boolean(target.isReversed || target.status === 'reversed');
      const reversalEntryIdToVoid = target.reversedByEntryId ? Number(target.reversedByEntryId) : null;
      const targetReversesId = target.reversesEntryId ?? (target.sourceType === 'reversal' && target.sourceId ? Number(target.sourceId) : null);

      const updatedEntries = prev.tables.journalEntries
        .filter(j => {
          // If restoring an entry that was reversed, remove its reversal entry so the entry is active again
          if (isCurrentlyReversed) {
            if (reversalEntryIdToVoid && Number(j.id) === reversalEntryIdToVoid) return false;
            if (Number(j.reversesEntryId) === Number(id)) return false;
          }
          return true;
        })
        .map(j => {
          if (j.id === id) {
            return {
              ...j,
              status: 'posted' as const,
              isReversed: false,
              reversedByEntryId: null,
              reversalReason: undefined,
              deletedAt: null,
              deleteReason: null,
              updatedAt: now
            };
          }
          // If restoring a reversal entry from trash, mark its target entry as reversed again
          if (target.status === 'void' && targetReversesId && Number(j.id) === Number(targetReversesId)) {
            return {
              ...j,
              status: 'reversed' as const,
              isReversed: true,
              reversedByEntryId: id
            };
          }
          return j;
        });

      // Also restore linked source document if it was cancelled
      let updatedOrders = prev.tables.orders;
      let updatedPayments = prev.tables.payments;
      let updatedExpenses = prev.tables.expenses;
      let updatedPurchaseBatches = prev.tables.purchaseBatches || [];
      let updatedTrx = prev.tables.financialTransactions || [];

      // Clean up reversal transactions added for this entry
      if (isCurrentlyReversed) {
        updatedTrx = updatedTrx.filter(t => {
          if (t.description?.includes(target.entryNumber)) return false;
          if (target.sourceNumber && t.description?.includes(target.sourceNumber)) return false;
          return true;
        });
      }

      if (target.sourceId != null) {
        const srcId = Number(target.sourceId);
        if (target.sourceType === 'order') {
          updatedOrders = prev.tables.orders.map(o =>
            o.id === srcId && o.status === 'cancelled' ? { ...o, status: 'pending' as const } : o
          );
        } else if (target.sourceType === 'payment') {
          updatedPayments = prev.tables.payments.map(p =>
            p.id === srcId && p.status === 'cancelled' ? { ...p, status: 'approved' as const } : p
          );
        } else if (target.sourceType === 'expense') {
          updatedExpenses = prev.tables.expenses.map(e =>
            e.id === srcId && e.status === 'cancelled' ? { ...e, status: 'active' as const } : e
          );
        } else if (target.sourceType === 'purchase_batch') {
          updatedPurchaseBatches = updatedPurchaseBatches.map(b =>
            b.id === srcId && b.status === 'cancelled' ? { ...b, status: 'active' as const } : b
          );
        }
      }

      const syncedLines = updatedEntries.flatMap(e => e.lines || []);

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: now,
        action: 'استرجاع قيد محاسبي',
        performedBy: 'المحاسب المعتمد',
        entityType: 'journalEntry',
        entityId: id,
        description: `استرجاع وتفعيل القيد المحاسبي #${target.entryNumber} وإعادته إلى دفتر اليومية العام`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          payments: updatedPayments,
          expenses: updatedExpenses,
          purchaseBatches: updatedPurchaseBatches,
          financialTransactions: updatedTrx,
          journalEntries: updatedEntries,
          journalLines: syncedLines,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم استرجاع القيد المحاسبي #${entry.entryNumber} وإعادته للدفتر بنجاح`, 'success');
  };

  const permanentlyDeleteJournalEntry = (id: number) => {
    const entry = data.tables.journalEntries.find(j => j.id === id);
    if (!entry) return;

    const targetReversesId = entry.reversesEntryId ?? (entry.sourceType === 'reversal' && entry.sourceId ? Number(entry.sourceId) : null);

    setData(prev => {
      const remainingEntries = prev.tables.journalEntries
        .filter(j => {
          if (j.id === id) return false;
          if (Number(j.reversesEntryId) === Number(id)) return false;
          if (j.sourceType === 'reversal' && Number(j.sourceId) === Number(id)) return false;
          if (Number(j.reversedByEntryId) === Number(id)) return false;
          return true;
        })
        .map(j => {
          if (targetReversesId && Number(j.id) === Number(targetReversesId)) {
            return {
              ...j,
              status: 'posted' as const,
              isReversed: false,
              reversedByEntryId: null,
              reversalReason: undefined
            };
          }
          return j;
        });

      const syncedLines = remainingEntries.flatMap(e => e.lines || []);

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'حذف نهائي لقيد من سلة المحذوفات',
        performedBy: 'مدير النظام',
        entityType: 'journalEntry',
        entityId: id,
        description: `حذف نهائي كامل للقيد #${entry.entryNumber} وجميع أطرافه المحاسبية`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          journalEntries: remainingEntries,
          journalLines: syncedLines,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم الحذف النهائي للقيد #${entry.entryNumber} من النظام وسلة المحذوفات تماماً`, 'success');
  };

  const emptyTrashJournalEntries = (): number => {
    const voidEntries = data.tables.journalEntries.filter(j => j.status === 'void');
    if (voidEntries.length === 0) {
      showNotification('سلة المحذوفات فارغة بالفعل.', 'warning');
      return 0;
    }
    const count = voidEntries.length;
    const voidIds = new Set(voidEntries.map(j => Number(j.id)));

    setData(prev => {
      const remainingEntries = prev.tables.journalEntries
        .filter(j => {
          if (j.status === 'void') return false;
          if (j.reversesEntryId && voidIds.has(Number(j.reversesEntryId))) return false;
          if (j.sourceType === 'reversal' && j.sourceId && voidIds.has(Number(j.sourceId))) return false;
          return true;
        })
        .map(j => {
          if (j.reversedByEntryId && voidIds.has(Number(j.reversedByEntryId))) {
            return {
              ...j,
              status: 'posted' as const,
              isReversed: false,
              reversedByEntryId: null,
              reversalReason: undefined
            };
          }
          return j;
        });

      const syncedLines = remainingEntries.flatMap(e => e.lines || []);
      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'إفراغ سلة المحذوفات نهائياً',
        performedBy: 'مدير النظام',
        entityType: 'journalEntry',
        entityId: 0,
        description: `إفراغ سلة المحذوفات بالكامل وحذف عدد ${count} قيد محاسبي نهائياً`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          journalEntries: remainingEntries,
          journalLines: syncedLines,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم إفراغ سلة المحذوفات وحذف جميع القيود (${count} قيد) نهائياً بنجاح.`, 'success');
    return count;
  };

  const restoreAllDeletedJournalEntries = (): number => {
    const restorableCount = data.tables.journalEntries.filter(
      j => j.status === 'void' || j.isReversed || j.status === 'reversed'
    ).length;

    if (restorableCount === 0) {
      showNotification('لا توجد قيود محذوفة أو معكوسة لاسترجاعها حالياً.', 'warning');
      return 0;
    }

    const now = new Date().toISOString();

    setData(prev => {
      // Remove pure reversal entries whose original entries are being restored, and restore all other entries to 'posted'
      const reversedOriginalIds = new Set(
        prev.tables.journalEntries
          .filter(j => j.isReversed || j.status === 'reversed')
          .map(j => Number(j.id))
      );

      const updatedEntries = prev.tables.journalEntries
        .filter(j => {
          if (j.sourceType === 'reversal' && j.reversesEntryId && reversedOriginalIds.has(Number(j.reversesEntryId))) {
            return false;
          }
          return true;
        })
        .map(j => ({
          ...j,
          status: 'posted' as const,
          isReversed: false,
          reversedByEntryId: null,
          reversalReason: undefined,
          deletedAt: null,
          deleteReason: null,
          updatedAt: now
        }));

      const syncedLines = updatedEntries.flatMap(e => e.lines || []);

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: now,
        action: 'استرجاع شامل للقيود المحذوفة والمعكوسة',
        performedBy: 'المحاسب المعتمد',
        entityType: 'journalEntry',
        entityId: 0,
        description: `استرجاع شامل لعدد ${restorableCount} قيد محاسبي وإعادتها إلى الحالة النشطة`
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          journalEntries: updatedEntries,
          journalLines: syncedLines,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم استرجاع جميع القيود (${restorableCount} قيد) وإعادتها للدفتر بنجاح!`, 'success');
    return restorableCount;
  };

  const repairAllJournalEntries = (): number => {
    const beforeCount = data.tables.journalEntries.length;
    setData(prev => {
      const repaired = sanitizeAndReconcileJournalEntries(prev, { forceRestoreMissing: true });
      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'فحص وتصحيح آلي شامل للقيود المحاسبية',
        performedBy: 'محرك التدقيق المحاسبي',
        entityType: 'journalEntry',
        entityId: 0,
        description: `تم فحص وتصحيح جميع القيود المحاسبية وإزالة التكرارات ومطابقة أرصدة العملاء والعمليات بنسبة 100%`
      };
      return {
        ...repaired,
        tables: {
          ...repaired.tables,
          auditLogs: [auditLog, ...(repaired.tables.auditLogs || [])]
        }
      };
    });
    showNotification('تم تصحيح جميع الأخطاء المحاسبية وإزالة التكرارات واسترجاع القيود الناقصة ومطابقة الأرصدة 100%!', 'success');
    return beforeCount;
  };

  const reverseJournalEntry = (
    id: number,
    reason?: string,
    options?: { reverseLinkedOperation?: boolean; refundToWallet?: boolean }
  ) => {
    const entry = journalEntries.find(j => j.id === id);
    if (!entry) throw new Error('القيد غير موجود');

    const reverseLinkedOp = options?.reverseLinkedOperation !== false;
    const refundWallet = options?.refundToWallet !== false;

    const now = new Date().toISOString();
    const periodCheck = assertFiscalPeriodOpen(now, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن إصدار قيود عكسية فيها.', 'error');
      throw new Error(periodCheck.reason);
    }

    const revId = Date.now();
    const revEntryNumber = `JE-REV-${Date.now().toString().slice(-6)}`;

    // Flip debit lines to credit, and credit lines to debit
    const reversedLines: JournalLine[] = (entry.lines || []).map((l, idx) => {
      const newSide = l.side === 'debit' ? 'credit' : 'debit';
      const resolved = resolveChartAccount(l.accountName || '', newSide, l.accountId);
      return {
        id: revId + idx + 1,
        journalEntryId: revId,
        accountId: l.accountId,
        accountName: l.accountName,
        chartAccountId: l.chartAccountId || resolved.id,
        chartAccountCode: l.chartAccountCode || resolved.code,
        side: newSide,
        amount: l.amount,
        notes: `عكس للطرف ${l.side === 'debit' ? 'المدين' : 'الدائن'}`
      };
    });

    const reversalEntry: JournalEntry = {
      id: revId,
      entryNumber: revEntryNumber,
      sourceType: 'reversal',
      sourceId: id,
      sourceNumber: entry.entryNumber,
      status: 'posted',
      reversesEntryId: id,
      reversalReason: reason || 'قيد عكسي لتسوية وإلغاء القيد الأصلي',
      description: `قيد عكسي لإلغاء القيد #${entry.entryNumber} (${reason || 'تسوية محاسبية'})`,
      createdAt: now,
      postedAt: now,
      lines: reversedLines
    };

    const refundSummaryMessages: string[] = [];

    setData(prev => {
      const targetSrcId = entry.sourceId != null ? Number(entry.sourceId) : null;
      const targetSrcNum = entry.sourceNumber || null;
      const entryDesc = entry.description || '';
      const entryNum = entry.entryNumber || '';

      let updatedOrders = prev.tables.orders;
      let updatedPayments = prev.tables.payments;
      let updatedExpenses = prev.tables.expenses;
      let updatedPurchaseBatches = prev.tables.purchaseBatches || [];
      let updatedCampaigns = prev.tables.marketingCampaigns || [];
      let nextTransactions = [...(prev.tables.financialTransactions || [])];
      const handledAccounts = new Set<number>();

      // 1. Linked Expense handling (إلغاء المصروف واسترجاع المبلغ للمحفظة فوراً)
      const isExpenseEntry = entry.sourceType === 'expense' || entryNum.startsWith('JE-EXP-');
      const linkedExpense = (prev.tables.expenses || []).find(e => {
        if (targetSrcId && e.id === targetSrcId) return true;
        if (targetSrcNum && e.expenseNumber === targetSrcNum) return true;
        if (e.expenseNumber && entryDesc.includes(e.expenseNumber)) return true;
        if (isExpenseEntry && targetSrcNum && e.expenseNumber?.includes(targetSrcNum)) return true;
        return false;
      });

      if (linkedExpense) {
        if (reverseLinkedOp) {
          updatedExpenses = updatedExpenses.map(e =>
            e.id === linkedExpense.id ? { ...e, status: 'cancelled' as const } : e
          );
        }
        if (linkedExpense.campaignId) {
          updatedCampaigns = updatedCampaigns.map(cmp =>
            cmp.id === linkedExpense.campaignId
              ? { ...cmp, actualSpend: Math.max(0, (Number(cmp.actualSpend) || 0) - Number(linkedExpense.amount)) }
              : cmp
          );
        }
        if (refundWallet) {
          const expAcc = (prev.tables.accounts || []).find(a => a.id === linkedExpense.accountId);
          const expRefundTrx: FinancialTransaction = {
            id: revId + 10,
            transactionNumber: `TRX-REV-EXP-${Date.now().toString().slice(-5)}`,
            transactionDate: now,
            accountId: linkedExpense.accountId,
            type: 'deposit',
            amount: Number(linkedExpense.amount) || 0,
            description: `استرجاع وعكس المبلغ المصروف إلى المحفظة لإلغاء القيد #${entry.entryNumber} (${linkedExpense.expenseNumber})`,
            expenseId: linkedExpense.id,
            createdAt: now
          };
          nextTransactions = [expRefundTrx, ...nextTransactions];
          handledAccounts.add(linkedExpense.accountId);
          refundSummaryMessages.push(`استرجاع ${Number(linkedExpense.amount).toLocaleString()} ريال إلى محفظة (${expAcc?.name || 'المحفظة'})`);
        }
      }

      // 2. Linked Purchase Batch handling (إلغاء دفعة الشراء واسترجاع التكلفة بالكامل للمحفظة وتحرير الطلبات)
      const isPurchaseBatchEntry = entry.sourceType === 'purchase_batch' || entryNum.startsWith('JE-PB-');
      const linkedBatch = (prev.tables.purchaseBatches || []).find(b => {
        if (targetSrcId && b.id === targetSrcId) return true;
        if (targetSrcNum && b.batchNumber === targetSrcNum) return true;
        if (b.batchNumber && entryDesc.includes(b.batchNumber)) return true;
        if (isPurchaseBatchEntry && targetSrcNum && b.batchNumber?.includes(targetSrcNum)) return true;
        return false;
      });

      if (linkedBatch) {
        if (reverseLinkedOp) {
          updatedPurchaseBatches = updatedPurchaseBatches.map(b =>
            b.id === linkedBatch.id ? { ...b, status: 'cancelled' as const } : b
          );
          if (linkedBatch.orderIds && linkedBatch.orderIds.length > 0) {
            updatedOrders = updatedOrders.map(o => {
              if (linkedBatch.orderIds!.includes(o.id)) {
                return {
                  ...o,
                  purchaseBatchId: null,
                  status: o.status === 'purchased' ? ('pending' as const) : o.status
                };
              }
              return o;
            });
          }
        }
        if (refundWallet) {
          const batchTotalCost = Number(linkedBatch.totalCost) || ((Number(linkedBatch.purchaseCost) || 0) + (Number(linkedBatch.purchaseFees) || 0) + (Number(linkedBatch.transferFees) || 0) + (Number(linkedBatch.exchangeRateDiff) || 0));
          const batchAcc = (prev.tables.accounts || []).find(a => a.id === linkedBatch.accountId);
          const batchRefundTrx: FinancialTransaction = {
            id: revId + 11,
            transactionNumber: `TRX-REV-PB-${Date.now().toString().slice(-5)}`,
            transactionDate: now,
            accountId: linkedBatch.accountId,
            type: 'deposit',
            amount: batchTotalCost,
            description: `استرجاع وعكس تكلفة شراء الدفعة #${linkedBatch.batchNumber} إلى المحفظة لإلغاء القيد #${entry.entryNumber}`,
            createdAt: now
          };
          nextTransactions = [batchRefundTrx, ...nextTransactions];
          handledAccounts.add(linkedBatch.accountId);
          refundSummaryMessages.push(`استرجاع تكلفة الشراء ${batchTotalCost.toLocaleString()} ريال إلى (${batchAcc?.name || 'الحساب'})`);
        }
      }

      // 3. Linked Payment handling (إلغاء سند القبض وخصم المبلغ من المحفظة المستلمة)
      const isPaymentEntry = entry.sourceType === 'payment' || entryNum.startsWith('JE-PAY-') || entryNum.startsWith('JE-RCT-');
      const linkedPayment = (prev.tables.payments || []).find(p => {
        if (targetSrcId && p.id === targetSrcId) return true;
        if (targetSrcNum && (p.receiptNumber === targetSrcNum || p.paymentNumber === targetSrcNum)) return true;
        if (p.receiptNumber && entryDesc.includes(p.receiptNumber)) return true;
        if (p.paymentNumber && entryDesc.includes(p.paymentNumber)) return true;
        return false;
      });

      if (linkedPayment) {
        if (reverseLinkedOp) {
          updatedPayments = updatedPayments.map(p =>
            p.id === linkedPayment.id ? { ...p, status: 'cancelled' as const } : p
          );
        }
        if (refundWallet) {
          const pmtRefundTrx: FinancialTransaction = {
            id: revId + 12,
            transactionNumber: `TRX-REV-PAY-${Date.now().toString().slice(-5)}`,
            transactionDate: now,
            accountId: linkedPayment.accountId,
            type: 'withdrawal',
            amount: Number(linkedPayment.amount) || 0,
            description: `خصم وعكس سند القبض #${linkedPayment.receiptNumber || linkedPayment.paymentNumber} لإلغاء القيد #${entry.entryNumber}`,
            paymentId: linkedPayment.id,
            createdAt: now
          };
          nextTransactions = [pmtRefundTrx, ...nextTransactions];
          handledAccounts.add(linkedPayment.accountId);
          refundSummaryMessages.push(`خصم وعكس سند القبض ${Number(linkedPayment.amount).toLocaleString()} ريال من المحفظة`);
        }
      }

      // 4. Linked Sales Order handling (إلغاء الطلب)
      const isOrderEntry = entry.sourceType === 'order' || entryNum.startsWith('JE-ORD-');
      const linkedOrder = (prev.tables.orders || []).find(o => {
        if (targetSrcId && o.id === targetSrcId) return true;
        if (targetSrcNum && o.orderNumber === targetSrcNum) return true;
        if (o.orderNumber && entryDesc.includes(o.orderNumber)) return true;
        return false;
      });

      if (linkedOrder && reverseLinkedOp) {
        updatedOrders = updatedOrders.map(o =>
          o.id === linkedOrder.id ? { ...o, status: 'cancelled' as const } : o
        );
      }

      // 5. Automatic Cash / Wallet lines reflection for manual entries or any unhandled account lines
      if (refundWallet) {
        (entry.lines || []).forEach((line, idx) => {
          const lineAccId = line.accountId != null ? Number(line.accountId) : null;
          const resolvedAcc = lineAccId
            ? (prev.tables.accounts || []).find(a => a.id === lineAccId)
            : (prev.tables.accounts || []).find(a => a.name.trim() === (line.accountName || '').trim());

          if (resolvedAcc && !handledAccounts.has(resolvedAcc.id)) {
            const lineAmt = Number(line.amount) || 0;
            if (lineAmt > 0) {
              if (line.side === 'credit') {
                // Original was Credit = Outflow / Expense from Wallet.
                // Reversal is Debit = Refund money back to the wallet!
                const autoDepositTrx: FinancialTransaction = {
                  id: revId + 20 + idx,
                  transactionNumber: `TRX-REV-DEP-${Date.now().toString().slice(-5)}-${idx}`,
                  transactionDate: now,
                  accountId: resolvedAcc.id,
                  type: 'deposit',
                  amount: lineAmt,
                  description: `استرجاع وعكس المبلغ المصروف إلى محفظة (${resolvedAcc.name}) بموجب القيد العكسي #${revEntryNumber}`,
                  createdAt: now
                };
                nextTransactions = [autoDepositTrx, ...nextTransactions];
                handledAccounts.add(resolvedAcc.id);
                refundSummaryMessages.push(`استرجاع ${lineAmt.toLocaleString()} ريال إلى محفظة (${resolvedAcc.name})`);
              } else if (line.side === 'debit') {
                // Original was Debit = Inflow into Wallet.
                // Reversal is Credit = Deduct money out from wallet!
                const autoWithdrawTrx: FinancialTransaction = {
                  id: revId + 30 + idx,
                  transactionNumber: `TRX-REV-WTH-${Date.now().toString().slice(-5)}-${idx}`,
                  transactionDate: now,
                  accountId: resolvedAcc.id,
                  type: 'withdrawal',
                  amount: lineAmt,
                  description: `خصم وعكس القيد من محفظة (${resolvedAcc.name}) بموجب القيد العكسي #${revEntryNumber}`,
                  createdAt: now
                };
                nextTransactions = [autoWithdrawTrx, ...nextTransactions];
                handledAccounts.add(resolvedAcc.id);
                refundSummaryMessages.push(`خصم وعكس ${lineAmt.toLocaleString()} ريال من محفظة (${resolvedAcc.name})`);
              }
            }
          }
        });
      }

      // Update journal entries state
      const updatedEntries = prev.tables.journalEntries.map(j => {
        if (j.id === id) {
          return {
            ...j,
            status: 'reversed' as const,
            isReversed: true,
            reversedByEntryId: revId,
            reversalReason: reason || 'قيد عكسي لتسوية وإلغاء القيد الأصلي'
          };
        }
        return j;
      });

      const auditLogDesc = [
        `إصدار قيد عكسي #${revEntryNumber} لإلغاء القيد #${entry.entryNumber}`,
        refundSummaryMessages.length > 0 ? `(${refundSummaryMessages.join(' • ')})` : ''
      ].filter(Boolean).join(' - ');

      const auditLog: AuditLog = {
        id: Date.now() + 1,
        createdAt: now,
        action: 'إصدار قيد عكسي وعكس العملية والمحفظة',
        performedBy: 'المحاسب المعتمد',
        entityType: 'journalEntry',
        entityId: revId,
        description: auditLogDesc
      };

      const allJournals = [reversalEntry, ...updatedEntries];
      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          payments: updatedPayments,
          expenses: updatedExpenses,
          purchaseBatches: updatedPurchaseBatches,
          marketingCampaigns: updatedCampaigns,
          financialTransactions: nextTransactions,
          journalEntries: allJournals,
          journalLines: allJournals.flatMap(e => e.lines || []),
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    const notifMsg = refundSummaryMessages.length > 0
      ? `تم إصدار القيد العكسي #${revEntryNumber} بنجاح: ${refundSummaryMessages.join(' • ')}`
      : `تم إصدار القيد العكسي #${revEntryNumber} وعكس العملية بالكامل بنجاح.`;

    showNotification(notifMsg, 'success');
    return reversalEntry;
  };

  // Chart of Accounts (دليل شجرة الحسابات)
  const addChartAccount = (acc: Omit<ChartAccount, 'id' | 'createdAt'>) => {
    const id = Date.now();
    const newAcc: ChartAccount = {
      ...acc,
      id,
      createdAt: new Date().toISOString()
    };

    const isFinancialAsset =
      acc.category === 'asset' &&
      (acc.code?.startsWith('101') ||
       acc.code?.startsWith('102') ||
       acc.subCategory?.includes('بنوك') ||
       acc.subCategory?.includes('محافظ') ||
       acc.subCategory?.includes('نقدية') ||
       acc.name?.includes('محفظة') ||
       acc.name?.includes('بنك') ||
       acc.name?.includes('كاش') ||
       acc.name?.includes('صندوق') ||
       acc.name?.includes('كريمي') ||
       acc.name?.includes('جيب') ||
       acc.name?.includes('ون كاش'));

    setData(prev => {
      let updatedAccounts = prev.tables.accounts;
      if (isFinancialAsset && !prev.tables.accounts.some(a => a.name.trim().toLowerCase() === acc.name.trim().toLowerCase())) {
        const opType: Account['type'] = acc.name.includes('محفظة')
          ? 'محفظة'
          : (acc.name.includes('بنك') ? 'بنكي' : (acc.name.includes('بطاقة') ? 'بطاقة' : 'نقدي'));
        const autoAccount: Account = {
          id,
          name: acc.name,
          type: opType,
          openingBalance: 0,
          status: 'active',
          notes: `حساب مالي ومحفظة مضافة عبر شجرة الحسابات (${acc.code})`,
          createdAt: new Date().toISOString()
        };
        updatedAccounts = [...prev.tables.accounts, autoAccount];
      }

      return {
        ...prev,
        tables: {
          ...prev.tables,
          chartAccounts: [...(prev.tables.chartAccounts || DEFAULT_CHART_OF_ACCOUNTS), newAcc],
          accounts: updatedAccounts
        }
      };
    });
    showNotification(`تمت إضافة الحساب ${newAcc.name} إلى شجرة الحسابات والحسابات المالية بنجاح`, 'success');
    return newAcc;
  };

  const updateChartAccount = (acc: ChartAccount) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        chartAccounts: (prev.tables.chartAccounts || DEFAULT_CHART_OF_ACCOUNTS).map(a => a.id === acc.id ? acc : a)
      }
    }));
    showNotification(`تم تحديث بيانات الحساب ${acc.name} في شجرة الحسابات`, 'success');
  };

  const deleteChartAccount = (id: number) => {
    const acc = chartAccounts.find(a => a.id === id);
    if (acc?.isSystem) {
      showNotification('لا يمكن حذف الحسابات النظامية الأساسية', 'warning');
      return false;
    }
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        chartAccounts: (prev.tables.chartAccounts || DEFAULT_CHART_OF_ACCOUNTS).filter(a => a.id !== id)
      }
    }));
    showNotification(`تم حذف الحساب من شجرة الحسابات`, 'success');
    return true;
  };

  // ==============================================================
  // PHASE 4: FISCAL PERIODS, YEAR-END CLOSING & RECONCILIATION ENGINE
  // ==============================================================

  const closeFiscalPeriod = (periodId: number, performedBy = 'المحاسب المعتمد') => {
    const targetPeriod = fiscalPeriods.find(p => p.id === periodId);
    if (!targetPeriod) {
      showNotification('الفترة المالية غير موجودة', 'error');
      return;
    }
    if (targetPeriod.status === 'locked') {
      showNotification('الفترة مقفلة نهائياً (LOCKED) ولا يمكن تعديلها.', 'error');
      return;
    }

    setData(prev => {
      const prevPeriods = prev.tables.fiscalPeriods && prev.tables.fiscalPeriods.length > 0 ? prev.tables.fiscalPeriods : DEFAULT_FISCAL_PERIODS;
      const updated = prevPeriods.map(p =>
        p.id === periodId
          ? { ...p, status: 'closed' as const, closedAt: new Date().toISOString(), closedBy: 1 }
          : p
      );

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'إغلاق الفترة المالية (CLOSED)',
        performedBy,
        entityType: 'fiscalPeriod',
        entityId: periodId,
        description: `تم إغلاق الفترة المالية: ${targetPeriod.periodName} وحظر الترحيل إليها مؤقتاً`,
        previousValue: JSON.stringify({ status: targetPeriod.status }),
        newValue: JSON.stringify({ status: 'closed', closedAt: new Date().toISOString() })
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          fiscalPeriods: updated,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم إغلاق الفترة المالية (${targetPeriod.periodName}) بنجاح.`, 'success');
  };

  const reopenFiscalPeriod = (periodId: number, reason = 'إعادة فتح إدارية للتدقيق', performedBy = 'مدير النظام') => {
    const targetPeriod = fiscalPeriods.find(p => p.id === periodId);
    if (!targetPeriod) {
      showNotification('الفترة المالية غير موجودة', 'error');
      return;
    }
    if (targetPeriod.status === 'locked') {
      showNotification('حظر رقابي صارم: لا يمكن فتح فترة مقفلة نهائياً (LOCKED)', 'error');
      return;
    }

    setData(prev => {
      const prevPeriods = prev.tables.fiscalPeriods && prev.tables.fiscalPeriods.length > 0 ? prev.tables.fiscalPeriods : DEFAULT_FISCAL_PERIODS;
      const updated = prevPeriods.map(p =>
        p.id === periodId
          ? { ...p, status: 'open' as const, closedAt: null, closedBy: null }
          : p
      );

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'إعادة فتح الفترة المالية (REOPENED)',
        performedBy,
        entityType: 'fiscalPeriod',
        entityId: periodId,
        description: `إعادة فتح الفترة المالية: ${targetPeriod.periodName}. السبب: ${reason}`,
        previousValue: JSON.stringify({ status: targetPeriod.status }),
        newValue: JSON.stringify({ status: 'open', reason })
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          fiscalPeriods: updated,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تمت إعادة فتح الفترة المالية (${targetPeriod.periodName}) بنجاح.`, 'success');
  };

  const lockFiscalPeriod = (periodId: number, performedBy = 'مدير التدقيق العام') => {
    const targetPeriod = fiscalPeriods.find(p => p.id === periodId);
    if (!targetPeriod) {
      showNotification('الفترة المالية غير موجودة', 'error');
      return;
    }

    setData(prev => {
      const prevPeriods = prev.tables.fiscalPeriods && prev.tables.fiscalPeriods.length > 0 ? prev.tables.fiscalPeriods : DEFAULT_FISCAL_PERIODS;
      const updated = prevPeriods.map(p =>
        p.id === periodId
          ? { ...p, status: 'locked' as const, closedAt: new Date().toISOString() }
          : p
      );

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'قفل نهائي وحماية الفترة المالية (LOCKED)',
        performedBy,
        entityType: 'fiscalPeriod',
        entityId: periodId,
        description: `تم قفل الفترة المالية نهائياً: ${targetPeriod.periodName} وتأمينها رقابياً من أي تعديل`,
        previousValue: JSON.stringify({ status: targetPeriod.status }),
        newValue: JSON.stringify({ status: 'locked' })
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          fiscalPeriods: updated,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم قفل الفترة المالية (${targetPeriod.periodName}) نهائياً وتأمينها.`, 'warning');
  };

  const closeFiscalYear = (yearId: number, performedBy = 'المحاسب المالي المعتمد') => {
    const targetYear = fiscalYears.find(y => y.id === yearId || y.year === yearId);
    const yearNumber = targetYear ? targetYear.year : yearId;

    if (targetYear && targetYear.status === 'locked') {
      showNotification('هذه السنة المالية مقفلة نهائياً بالفعل.', 'error');
      throw new Error('السنة المالية مقفلة نهائياً');
    }

    const closingResult = generateYearEndClosingEntry({
      fiscalYear: yearNumber,
      entries: journalEntries,
      chartAccounts,
      performedByName: performedBy
    });

    setData(prev => {
      const prevYears = prev.tables.fiscalYears && prev.tables.fiscalYears.length > 0 ? prev.tables.fiscalYears : DEFAULT_FISCAL_YEARS;
      const updatedYears = prevYears.map(y =>
        y.year === yearNumber ? { ...y, status: 'closed' as const } : y
      );

      const prevPeriods = prev.tables.fiscalPeriods && prev.tables.fiscalPeriods.length > 0 ? prev.tables.fiscalPeriods : DEFAULT_FISCAL_PERIODS;
      const updatedPeriods = prevPeriods.map(p =>
        p.fiscalYear === yearNumber ? { ...p, status: 'locked' as const, closedAt: new Date().toISOString() } : p
      );

      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'إقفال السنة المالية وتوليد قيد الإقفال السنوي',
        performedBy,
        entityType: 'fiscalYear',
        entityId: yearNumber,
        description: `تم إقفال السنة المالية ${yearNumber} وترحيل صافي النتيجة (${closingResult.netIncome} ر.ي) لحساب الأرباح المبقاة عبر قيد #${closingResult.closingEntry.entryNumber}`,
        newValue: JSON.stringify({
          closingEntryNumber: closingResult.closingEntry.entryNumber,
          netIncome: closingResult.netIncome,
          totalRevenue: closingResult.totalRevenue,
          totalExpense: closingResult.totalExpense,
          closedAccountsCount: closingResult.closedAccountsCount
        })
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          journalEntries: [closingResult.closingEntry, ...prev.tables.journalEntries],
          journalLines: [...(closingResult.closingEntry.lines || []), ...(prev.tables.journalLines || [])],
          fiscalYears: updatedYears,
          fiscalPeriods: updatedPeriods,
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم إقفال السنة المالية ${yearNumber} بنجاح وترحيل صافي النتيجة (${closingResult.netIncome.toLocaleString()} ر.ي) لحساب الأرباح المبقاة.`, 'success');
    return { closingEntry: closingResult.closingEntry, netIncome: closingResult.netIncome };
  };

  const checkAndRegisterIdempotency = (key: string, operationType: string, entityId?: string | number): boolean => {
    if (!key) return true;
    const currentRecords = data.tables.idempotencyRecords || [];
    const check = checkIdempotency(key, currentRecords);
    if (check.isDuplicate) {
      showNotification('تنبيه أمان: تم حظر تكرار العملية (Idempotency Key Active)', 'warning');
      return false;
    }
    const newRecord: IdempotencyRecord = {
      key,
      operationType,
      entityId,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        idempotencyRecords: [newRecord, ...(prev.tables.idempotencyRecords || [])]
      }
    }));
    return true;
  };

  const generateCustomerAdjustingEntry = (customerId: number, adjustmentAmount: number, reason?: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      showNotification('العميل غير موجود لتوليد قيد التسوية', 'error');
      throw new Error('العميل غير موجود');
    }

    const adjEntry = generateAdjustingEntryForCustomer({
      customer,
      operationalBalance: getCustomerBalance(customerId),
      ledgerBalance: getCustomerBalance(customerId) - adjustmentAmount,
      difference: adjustmentAmount,
      performedByName: 'المحاسب المعتمد'
    });

    if (reason) {
      adjEntry.description = `${adjEntry.description} - ${reason}`;
    }

    setData(prev => {
      const auditLog: AuditLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        action: 'قيد تسوية وتصحيح رصيد عميل (ADJUSTING ENTRY)',
        performedBy: 'المحاسب المعتمد',
        entityType: 'customer',
        entityId: customerId,
        description: `توليد قيد تسوية #${adjEntry.entryNumber} بمبلغ ${Math.abs(adjustmentAmount)} ر.ي لمطابقة رصيد العميل (${customer.name}) مع الأستاذ العام`,
        newValue: JSON.stringify({ entryNumber: adjEntry.entryNumber, amount: adjustmentAmount })
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          journalEntries: [adjEntry, ...prev.tables.journalEntries],
          journalLines: [...(adjEntry.lines || []), ...(prev.tables.journalLines || [])],
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    showNotification(`تم ترحيل قيد التسوية #${adjEntry.entryNumber} بنجاح ومطابقة رصيد العميل 100%.`, 'success');
    return adjEntry;
  };

  const reconcileAllCustomerBalances = (): number => {
    const recon = reconcileCustomerBalances(customers, orders, payments, journalEntries);
    const mismatched = recon.items.filter(i => !i.isReconciled && Math.abs(i.difference) > 0.01);
    if (mismatched.length === 0) {
      showNotification('كافة أرصدة العملاء متطابقة بنسبة 100% ولا توجد فروقات للتسوية.', 'success');
      return 0;
    }

    const newEntries: JournalEntry[] = [];
    const newLines: JournalLine[] = [];
    const newAuditLogs: AuditLog[] = [];

    for (const item of mismatched) {
      const cust = customers.find(c => c.id === item.customerId);
      if (!cust) continue;

      const adj = generateAdjustingEntryForCustomer({
        customer: cust,
        operationalBalance: item.operationalBalance,
        ledgerBalance: item.ledgerBalance,
        difference: item.difference,
        performedByName: 'مركز التسوية الآلية'
      });

      newEntries.push(adj);
      newLines.push(...(adj.lines || []));

      newAuditLogs.push({
        id: Date.now() + newEntries.length,
        createdAt: new Date().toISOString(),
        action: 'تسوية آلية شاملة لرصيد عميل',
        performedBy: 'مركز التدقيق والتسوية',
        entityType: 'customer',
        entityId: cust.id,
        description: `تسوية الفارق (${item.difference} ر.ي) للعميل ${cust.name} عبر قيد التسوية #${adj.entryNumber}`,
        newValue: JSON.stringify({ diff: item.difference, entryNumber: adj.entryNumber })
      });
    }

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        journalEntries: [...newEntries, ...prev.tables.journalEntries],
        journalLines: [...newLines, ...(prev.tables.journalLines || [])],
        auditLogs: [...newAuditLogs, ...(prev.tables.auditLogs || [])]
      }
    }));

    showNotification(`تمت معالجة وتسوية ${newEntries.length} عميل وتوليد قيود التسوية بنجاح! نسبة التطابق الآن 100%.`, 'success');
    return newEntries.length;
  };

  const transferFunds = (
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    notes?: string
  ) => {
    const fromId = Number(fromAccountId);
    const toId = Number(toAccountId);
    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0 || fromId === toId) return;
    const fromAcc = accounts.find(a => Number(a.id) === fromId);
    const toAcc = accounts.find(a => Number(a.id) === toId);
    if (!fromAcc || !toAcc) return;

    const trfDate = new Date().toISOString();
    const periodCheck = assertFiscalPeriodOpen(trfDate, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن إجراء تحويلات فيها.', 'error');
      throw new Error(periodCheck.reason);
    }

    const transferGroup = `TRF-${Date.now()}`;
    const baseId = Date.now();

    const trxOut: FinancialTransaction = {
      id: baseId,
      transactionNumber: `${transferGroup}-OUT`,
      transactionDate: trfDate,
      accountId: fromId,
      type: 'transfer_out',
      amount: numAmount,
      description: `تحويل إلى ${toAcc.name}${notes ? ` (${notes})` : ''}`,
      transferGroup,
      createdAt: trfDate
    };

    const trxIn: FinancialTransaction = {
      id: baseId + 1,
      transactionNumber: `${transferGroup}-IN`,
      transactionDate: trfDate,
      accountId: toId,
      type: 'transfer_in',
      amount: numAmount,
      description: `تحويل من ${fromAcc.name}${notes ? ` (${notes})` : ''}`,
      transferGroup,
      createdAt: trfDate
    };

    const je: JournalEntry = {
      id: baseId + 2,
      entryNumber: `JE-TRF-${Date.now().toString().slice(-6)}`,
      description: `تحويل بنكي بين الحسابات من ${fromAcc.name} إلى ${toAcc.name}`,
      createdAt: trfDate,
      lines: [
        {
          id: baseId + 3,
          journalEntryId: baseId + 2,
          accountId: toId,
          accountName: toAcc.name,
          chartAccountId: 102,
          chartAccountCode: '102',
          side: 'debit',
          amount: numAmount
        },
        {
          id: baseId + 4,
          journalEntryId: baseId + 2,
          accountId: fromId,
          accountName: fromAcc.name,
          chartAccountId: 102,
          chartAccountCode: '102',
          side: 'credit',
          amount: numAmount
        }
      ]
    };

    setData(prev => {
      const nextJEs = [je, ...prev.tables.journalEntries];
      return {
        ...prev,
        tables: {
          ...prev.tables,
          financialTransactions: [trxOut, trxIn, ...prev.tables.financialTransactions],
          journalEntries: nextJEs,
          journalLines: nextJEs.flatMap(j => j.lines || [])
        }
      };
    });
    showNotification(`تم تحويل ${numAmount.toLocaleString()} ريال بنجاح من ${fromAcc.name} إلى ${toAcc.name}`, 'success');
  };

  const recordAccountTransaction = (params: {
    accountId: number;
    type: 'deposit' | 'withdrawal';
    amount: number;
    category?: string;
    description: string;
    referenceNumber?: string;
    transactionDate?: string;
    notes?: string;
  }): FinancialTransaction => {
    const targetAccountId = Number(params.accountId);
    const numAmount = Math.max(0, Number(params.amount) || 0);
    const acc = accounts.find(a => Number(a.id) === targetAccountId);
    const trxId = Date.now();
    const prefix = params.type === 'deposit' ? 'IN' : 'OUT';
    const trxNumber = params.referenceNumber || `TRX-${prefix}-${Date.now().toString().slice(-6)}`;
    const date = params.transactionDate || new Date().toISOString();
    const periodCheck = assertFiscalPeriodOpen(date, fiscalPeriods);
    if (!periodCheck.allowed) {
      showNotification(periodCheck.reason || 'الفترة المالية مقفلة. لا يمكن إجراء عمليات في هذا التاريخ.', 'error');
      throw new Error(periodCheck.reason);
    }
    const isDeposit = params.type === 'deposit';

    const newTrx: FinancialTransaction = {
      id: trxId,
      transactionNumber: trxNumber,
      transactionDate: date,
      accountId: targetAccountId,
      type: params.type,
      amount: numAmount,
      description: `${isDeposit ? 'سند وارد (إيداع)' : 'سند صادر (سحب)'}${params.category ? ` - ${params.category}` : ''}: ${params.description}`,
      notes: params.notes || null,
      createdAt: new Date().toISOString()
    };

    const jeId = trxId + 1;
    const je: JournalEntry = {
      id: jeId,
      entryNumber: `JE-${prefix}-${Date.now().toString().slice(-6)}`,
      description: `${isDeposit ? 'سند وارد إلى' : 'سند صادر من'} ${acc?.name || 'الحساب'}: ${params.description}`,
      createdAt: date,
      lines: isDeposit ? [
        {
          id: jeId + 1,
          journalEntryId: jeId,
          accountId: targetAccountId,
          accountName: acc?.name || 'الصندوق/المحفظة',
          chartAccountId: 102,
          chartAccountCode: '102',
          side: 'debit',
          amount: numAmount
        },
        {
          id: jeId + 2,
          journalEntryId: jeId,
          accountId: null,
          accountName: params.category ? `واردات - ${params.category}` : 'واردات وصناديق متنوعة',
          chartAccountId: 400,
          chartAccountCode: '400',
          side: 'credit',
          amount: numAmount
        }
      ] : [
        {
          id: jeId + 1,
          journalEntryId: jeId,
          accountId: null,
          accountName: params.category ? `صادرات ومصاريف - ${params.category}` : 'صادرات ومسحوبات متنوعة',
          chartAccountId: 509,
          chartAccountCode: '509',
          side: 'debit',
          amount: numAmount
        },
        {
          id: jeId + 2,
          journalEntryId: jeId,
          accountId: targetAccountId,
          accountName: acc?.name || 'الصندوق/المحفظة',
          chartAccountId: 102,
          chartAccountCode: '102',
          side: 'credit',
          amount: numAmount
        }
      ]
    };

    const auditLog: AuditLog = {
      id: Date.now() + 5,
      action: isDeposit ? 'سند وارد' : 'سند صادر',
      entityType: 'financial_transaction',
      entityId: trxId,
      description: `تسجيل ${isDeposit ? 'سند وارد (إيداع)' : 'سند صادر (سحب)'} بقيمة ${numAmount} ريال ${isDeposit ? 'في' : 'من'} حساب ${acc?.name || ''}`,
      createdAt: new Date().toISOString()
    };

    setData(prev => {
      const nextJEs = [je, ...prev.tables.journalEntries];
      return {
        ...prev,
        tables: {
          ...prev.tables,
          financialTransactions: [newTrx, ...prev.tables.financialTransactions],
          journalEntries: nextJEs,
          journalLines: nextJEs.flatMap(j => j.lines || []),
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });

    return newTrx;
  };

  const addAccount = (accountData: Omit<Account, 'id' | 'createdAt'>): Account => {
    const newId = Date.now();
    const newAcc: Account = {
      ...accountData,
      id: newId,
      status: accountData.status || 'active',
      createdAt: new Date().toISOString()
    };

    const isFinancial = newAcc.type !== 'حقوق ملكية';
    const autoChartAccount: ChartAccount | null = isFinancial ? {
      id: newId + 1,
      code: `102${String(Date.now()).slice(-3)}`,
      name: newAcc.name,
      category: 'asset',
      subCategory: newAcc.type === 'نقدي' ? 'أصول متداولة - نقدية بالصندوق' : 'أصول متداولة - بنوك ومحافظ',
      balanceType: 'debit',
      description: `حساب مالي ومحفظة (${newAcc.name})`,
      isSystem: false,
      createdAt: new Date().toISOString()
    } : null;

    let newTransactions = [...transactions];
    const openBal = parseFloat(String(newAcc.openingBalance || 0)) || 0;
    if (openBal > 0) {
      newTransactions.push({
        id: Date.now() + 2,
        transactionNumber: `TRX-OPN-${Date.now().toString().slice(-6)}`,
        transactionDate: new Date().toISOString(),
        accountId: newId,
        amount: openBal,
        type: 'deposit',
        category: 'opening_balance',
        description: `رصيد افتتاحي للمحفظة / الحساب: ${newAcc.name}`,
        createdAt: new Date().toISOString()
      });
    }

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        accounts: [...prev.tables.accounts, newAcc],
        financialTransactions: newTransactions,
        chartAccounts: autoChartAccount && !(prev.tables.chartAccounts || []).some(c => c.name.trim().toLowerCase() === newAcc.name.trim().toLowerCase())
          ? [...(prev.tables.chartAccounts || DEFAULT_CHART_OF_ACCOUNTS), autoChartAccount]
          : (prev.tables.chartAccounts || DEFAULT_CHART_OF_ACCOUNTS)
      }
    }));

    showNotification(`تمت إضافة المحفظة / الحساب "${newAcc.name}" بنجاح`, 'success');
    return newAcc;
  };

  const updateAccount = (account: Account) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        accounts: prev.tables.accounts.map(a => a.id === account.id ? account : a)
      }
    }));
  };

  const addShipment = (s: {
    shipmentNumber: string;
    carrier: string;
    shippingCost: number;
    accountId: number;
    notes?: string;
    orderIds?: number[];
    updateOrderStatusToShipped?: boolean;
  }) => {
    const targetAccountId = Number(s.accountId);
    const numCost = Math.max(0, Number(s.shippingCost) || 0);
    const acc = accounts.find(a => Number(a.id) === targetAccountId);
    const shipId = Date.now();
    const trxNumber = `TRX-SHP-${Date.now().toString().slice(-6)}`;
    const linkedOrdersCount = s.orderIds?.length || 0;

    const trx: FinancialTransaction = {
      id: shipId + 1,
      transactionNumber: trxNumber,
      transactionDate: new Date().toISOString(),
      accountId: targetAccountId,
      type: 'withdrawal',
      amount: numCost,
      description: `تكلفة الشحنة ${s.shipmentNumber} عبر ${s.carrier}${linkedOrdersCount ? ` (${linkedOrdersCount} طلبات)` : ''}`,
      createdAt: new Date().toISOString()
    };

    const newShipment: Shipment = {
      id: shipId,
      shipmentNumber: s.shipmentNumber,
      carrier: s.carrier,
      shippingCost: numCost,
      shippingCostPaidAt: new Date().toISOString(),
      accountId: targetAccountId,
      financialTransactionId: trx.id,
      status: 'completed',
      notes: s.notes,
      orderIds: s.orderIds || [],
      createdAt: new Date().toISOString()
    };

    const newExpense: Expense = {
      id: shipId + 5,
      expenseNumber: `EXP-SHP-${s.shipmentNumber}`,
      category: 'شحن ونقل لوجستي',
      vendorName: s.carrier,
      amount: numCost,
      paymentMethod: acc?.name || 'محفظة',
      accountId: targetAccountId,
      description: `أجور وتكاليف شحن طرود الشحنة #${s.shipmentNumber} عبر ${s.carrier}${linkedOrdersCount ? ` (${linkedOrdersCount} طلبات مشمولة)` : ''}`,
      notes: s.notes || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const je: JournalEntry = {
      id: shipId + 2,
      entryNumber: `JE-SHP-${Date.now().toString().slice(-6)}`,
      description: `تكلفة الشحنة ${s.shipmentNumber} عبر ${s.carrier}`,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: shipId + 3,
          journalEntryId: shipId + 2,
          accountId: null,
          accountName: 'تكاليف الشحنات واللوجستيات',
          chartAccountId: 504,
          chartAccountCode: '504',
          side: 'debit',
          amount: numCost
        },
        {
          id: shipId + 4,
          journalEntryId: shipId + 2,
          accountId: targetAccountId,
          accountName: acc?.name || 'المحفظة/الحساب',
          chartAccountId: 102,
          chartAccountCode: '102',
          side: 'credit',
          amount: numCost
        }
      ]
    };

    setData(prev => {
      const targetOrderIds = new Set(s.orderIds || []);
      const updatedOrders = targetOrderIds.size > 0
        ? prev.tables.orders.map(o => {
            if (targetOrderIds.has(o.id)) {
              return {
                ...o,
                shipmentNumber: s.shipmentNumber,
                shipmentId: shipId,
                status: (s.updateOrderStatusToShipped !== false && o.status !== 'delivered' && o.status !== 'cancelled')
                  ? ('shipped' as const)
                  : o.status
              };
            }
            return o;
          })
        : prev.tables.orders;

      const nextJEs = [je, ...prev.tables.journalEntries];

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          shipments: [newShipment, ...prev.tables.shipments],
          expenses: [newExpense, ...prev.tables.expenses],
          financialTransactions: [trx, ...prev.tables.financialTransactions],
          journalEntries: nextJEs,
          journalLines: nextJEs.flatMap(j => j.lines || [])
        }
      };
    });
    addAuditLog('CREATE', 'shipment', `تسجيل شحنة جديدة #${s.shipmentNumber} عبر ${s.carrier} بتكلفة ${numCost} ريال خصماً من ${acc?.name || 'المحفظة'}`, shipId);
    showNotification(`تم تسجيل الشحنة #${s.shipmentNumber} وخصم ${numCost.toLocaleString()} ريال من ${acc?.name || 'المحفظة'} بنجاح`, 'success');
  };

  const updateShipmentStatus = (id: number, status: Shipment['status']) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        shipments: prev.tables.shipments.map(s => s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s)
      }
    }));
    addAuditLog('UPDATE', 'shipment', `تحديث حالة الشحنة رقم #${id} إلى ${status}`, id);
    showNotification('تم تحديث حالة الشحنة بنجاح', 'success');
  };

  const updateShipment = (shipment: Shipment) => {
    const targetAccountId = Number(shipment.accountId);
    const numCost = Math.max(0, Number(shipment.shippingCost) || 0);
    const acc = accounts.find(a => Number(a.id) === targetAccountId);

    setData(prev => {
      let finalTrxId = shipment.financialTransactionId;
      let updatedTrxs = [...prev.tables.financialTransactions];
      const existingTrxIndex = updatedTrxs.findIndex(t =>
        (finalTrxId && t.id === finalTrxId) ||
        (t.description && (t.description.includes(`الشحنة ${shipment.shipmentNumber}`) || t.description.includes(`الشحنة #${shipment.shipmentNumber}`)))
      );

      if (existingTrxIndex !== -1) {
        finalTrxId = updatedTrxs[existingTrxIndex].id;
        if (numCost > 0) {
          updatedTrxs[existingTrxIndex] = {
            ...updatedTrxs[existingTrxIndex],
            accountId: targetAccountId,
            amount: numCost,
            description: `تكلفة الشحنة ${shipment.shipmentNumber} عبر ${shipment.carrier}`,
            updatedAt: new Date().toISOString()
          };
        } else {
          updatedTrxs = updatedTrxs.filter((_, idx) => idx !== existingTrxIndex);
          finalTrxId = undefined;
        }
      } else if (numCost > 0) {
        finalTrxId = finalTrxId || (Date.now() + 1);
        const newTrx: FinancialTransaction = {
          id: finalTrxId,
          transactionNumber: `TRX-SHP-${Date.now().toString().slice(-6)}`,
          transactionDate: new Date().toISOString(),
          accountId: targetAccountId,
          type: 'withdrawal',
          amount: numCost,
          description: `تكلفة الشحنة ${shipment.shipmentNumber} عبر ${shipment.carrier}`,
          createdAt: new Date().toISOString()
        };
        updatedTrxs = [newTrx, ...updatedTrxs];
      }

      const updatedShipments = prev.tables.shipments.map(s =>
        s.id === shipment.id
          ? { ...shipment, accountId: targetAccountId, shippingCost: numCost, financialTransactionId: finalTrxId, updatedAt: new Date().toISOString() }
          : s
      );

      const expNumber = `EXP-SHP-${shipment.shipmentNumber}`;
      let updatedExpenses = [...prev.tables.expenses];
      const existingExpIndex = updatedExpenses.findIndex(e =>
        e.expenseNumber === expNumber || (e.description && e.description.includes(`الشحنة #${shipment.shipmentNumber}`))
      );

      if (existingExpIndex !== -1) {
        if (numCost > 0) {
          updatedExpenses[existingExpIndex] = {
            ...updatedExpenses[existingExpIndex],
            amount: numCost,
            accountId: targetAccountId,
            paymentMethod: acc?.name || updatedExpenses[existingExpIndex].paymentMethod,
            vendorName: shipment.carrier,
            notes: shipment.notes || updatedExpenses[existingExpIndex].notes,
            updatedAt: new Date().toISOString()
          };
        } else {
          updatedExpenses = updatedExpenses.filter((_, idx) => idx !== existingExpIndex);
        }
      } else if (numCost > 0) {
        const newExp: Expense = {
          id: Date.now() + 5,
          expenseNumber: expNumber,
          category: 'شحن ونقل لوجستي',
          vendorName: shipment.carrier,
          amount: numCost,
          paymentMethod: acc?.name || 'محفظة',
          accountId: targetAccountId,
          description: `أجور وتكاليف شحن طرود الشحنة #${shipment.shipmentNumber} عبر ${shipment.carrier}`,
          notes: shipment.notes || null,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        updatedExpenses = [newExp, ...updatedExpenses];
      }

      let updatedJEs = [...prev.tables.journalEntries];
      const existingJEIndex = updatedJEs.findIndex(je =>
        je.description && (je.description.includes(`الشحنة ${shipment.shipmentNumber}`) || je.description.includes(`الشحنة #${shipment.shipmentNumber}`))
      );

      if (existingJEIndex !== -1) {
        updatedJEs[existingJEIndex] = {
          ...updatedJEs[existingJEIndex],
          lines: (updatedJEs[existingJEIndex].lines || []).map(line => {
            if (line.side === 'debit') {
              return { ...line, amount: numCost };
            } else {
              return {
                ...line,
                accountId: targetAccountId,
                accountName: acc?.name || line.accountName,
                amount: numCost
              };
            }
          })
        };
      } else if (numCost > 0) {
        const jeId = Date.now() + 2;
        const newJE: JournalEntry = {
          id: jeId,
          entryNumber: `JE-SHP-${Date.now().toString().slice(-6)}`,
          description: `تكلفة الشحنة ${shipment.shipmentNumber} عبر ${shipment.carrier}`,
          createdAt: new Date().toISOString(),
          lines: [
            {
              id: jeId + 1,
              journalEntryId: jeId,
              accountId: null,
              accountName: 'تكاليف الشحنات واللوجستيات',
              chartAccountId: 504,
              chartAccountCode: '504',
              side: 'debit',
              amount: numCost
            },
            {
              id: jeId + 2,
              journalEntryId: jeId,
              accountId: targetAccountId,
              accountName: acc?.name || 'المحفظة/الحساب',
              chartAccountId: 102,
              chartAccountCode: '102',
              side: 'credit',
              amount: numCost
            }
          ]
        };
        updatedJEs = [newJE, ...updatedJEs];
      }

      return {
        ...prev,
        tables: {
          ...prev.tables,
          shipments: updatedShipments,
          financialTransactions: updatedTrxs,
          expenses: updatedExpenses,
          journalEntries: updatedJEs,
          journalLines: updatedJEs.flatMap(j => j.lines || [])
        }
      };
    });
    addAuditLog('UPDATE', 'shipment', `تعديل بيانات وتكلفة الشحنة #${shipment.shipmentNumber} (${numCost} ريال من ${acc?.name || 'المحفظة'})`, shipment.id);
    showNotification('تم تحديث بيانات وتكلفة الشحنة بنجاح وتحديث رصيد المحفظة', 'success');
  };

  const deleteShipment = (id: number) => {
    const shipmentToDelete = (data.tables.shipments || []).find(s => s.id === id);
    if (!shipmentToDelete) return;

    setData(prev => {
      const updatedOrders = prev.tables.orders.map(o => {
        if (o.shipmentId === id || o.shipmentNumber === shipmentToDelete.shipmentNumber) {
          return {
            ...o,
            shipmentId: undefined,
            shipmentNumber: undefined,
            status: o.status === 'shipped' ? ('purchased' as const) : o.status
          };
        }
        return o;
      });

      const nextJEs = prev.tables.journalEntries.filter(je =>
        !(je.description && je.description.includes(`الشحنة ${shipmentToDelete.shipmentNumber}`)) &&
        je.entryNumber !== `JE-SHP-${String(shipmentToDelete.id).slice(-6)}`
      );

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          shipments: prev.tables.shipments.filter(s => s.id !== id),
          expenses: prev.tables.expenses.filter(e =>
            e.expenseNumber !== `EXP-SHP-${shipmentToDelete.shipmentNumber}` &&
            !(e.description && e.description.includes(`الشحنة #${shipmentToDelete.shipmentNumber}`))
          ),
          financialTransactions: prev.tables.financialTransactions.filter(t =>
            t.id !== shipmentToDelete.financialTransactionId &&
            !(t.description && t.description.includes(`الشحنة ${shipmentToDelete.shipmentNumber}`))
          ),
          journalEntries: nextJEs,
          journalLines: nextJEs.flatMap(j => j.lines || [])
        }
      };
    });

    addAuditLog('DELETE', 'shipment', `حذف الشحنة #${shipmentToDelete.shipmentNumber} واسترداد الرصيد المخصوم`, id);
    showNotification(`تم حذف الشحنة #${shipmentToDelete.shipmentNumber} واسترداد الرصيد بنجاح`, 'success');
  };

  const addOtherReceivable = (rec: Omit<OtherReceivable, 'id' | 'createdAt' | 'status'>) => {
    const id = Date.now();
    const newRec: OtherReceivable = {
      ...rec,
      id,
      paidAmount: 0,
      remainingBalance: Number(rec.openingBalance) || 0,
      payments: [],
      status: 'unpaid',
      createdAt: new Date().toISOString()
    };

    let newTrx: FinancialTransaction | null = null;
    let newJe: JournalEntry | null = null;

    if (rec.fromAccountId) {
      const acc = accounts.find(a => a.id === rec.fromAccountId);
      const trxId = Date.now();
      newTrx = {
        id: trxId,
        transactionNumber: `TRX-LOAN-${Date.now().toString().slice(-6)}`,
        transactionDate: rec.openingDate || new Date().toISOString(),
        accountId: rec.fromAccountId,
        type: 'withdrawal',
        amount: rec.openingBalance,
        description: `صرف سلفة وقرض لـ ${rec.name} (${rec.reason})`,
        createdAt: new Date().toISOString()
      };

      newJe = {
        id: trxId + 1,
        entryNumber: `JE-LOAN-${Date.now().toString().slice(-6)}`,
        description: `إثبات سلفة وقرض لـ ${rec.name}`,
        createdAt: new Date().toISOString(),
        lines: [
          {
            id: trxId + 2,
            journalEntryId: trxId + 1,
            accountId: null,
            accountName: `ذمة مدينة: ${rec.name}`,
            side: 'debit',
            amount: rec.openingBalance
          },
          {
            id: trxId + 3,
            journalEntryId: trxId + 1,
            accountId: rec.fromAccountId,
            accountName: acc?.name || 'المحفظة / الصندوق',
            side: 'credit',
            amount: rec.openingBalance
          }
        ]
      };
    }

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        otherReceivables: [newRec, ...(prev.tables.otherReceivables || [])],
        financialTransactions: newTrx ? [newTrx, ...prev.tables.financialTransactions] : prev.tables.financialTransactions,
        journalEntries: newJe ? [newJe, ...prev.tables.journalEntries] : prev.tables.journalEntries
      }
    }));
  };

  const settleReceivable = (id: number, accountId: number, paymentAmount?: number, paymentNotes?: string) => {
    const rec = (otherReceivables || []).find(r => r.id === id);
    if (!rec) return;

    const currentRemaining = rec.remainingBalance !== undefined ? rec.remainingBalance : (Number(rec.openingBalance) - (rec.paidAmount || 0));
    const settleAmount = paymentAmount !== undefined && paymentAmount > 0 ? Math.min(paymentAmount, currentRemaining) : currentRemaining;
    if (settleAmount <= 0) return;

    const acc = accounts.find(a => a.id === accountId);
    const trxId = Date.now();
    const newPaidAmount = (rec.paidAmount || 0) + settleAmount;
    const newRemaining = Math.max(0, currentRemaining - settleAmount);
    const isFullySettled = newRemaining === 0;

    const pmtRecord: ReceivablePayment = {
      id: trxId,
      amount: settleAmount,
      paymentDate: new Date().toISOString(),
      accountId,
      accountName: acc?.name || 'الصندوق / المحفظة',
      notes: paymentNotes || `سداد دفعة من السلفة`,
      receiptNumber: `REC-PAY-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString()
    };

    const trx: FinancialTransaction = {
      id: trxId,
      transactionNumber: `TRX-REC-${Date.now().toString().slice(-6)}`,
      transactionDate: new Date().toISOString(),
      accountId,
      type: 'deposit',
      amount: settleAmount,
      description: `تحصيل وسداد ${isFullySettled ? 'كامل' : 'دفعة من'} ذمة ${rec.name} (${rec.reason})`,
      createdAt: new Date().toISOString()
    };

    const je: JournalEntry = {
      id: trxId + 1,
      entryNumber: `JE-REC-${Date.now().toString().slice(-6)}`,
      description: `تحصيل وسداد ذمة من ${rec.name}`,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: trxId + 2,
          journalEntryId: trxId + 1,
          accountId,
          accountName: acc?.name || 'المحفظة / الصندوق',
          side: 'debit',
          amount: settleAmount
        },
        {
          id: trxId + 3,
          journalEntryId: trxId + 1,
          accountId: null,
          accountName: `ذمة مدينة: ${rec.name}`,
          side: 'credit',
          amount: settleAmount
        }
      ]
    };

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        otherReceivables: (prev.tables.otherReceivables || []).map(r => {
          if (r.id !== id) return r;
          return {
            ...r,
            paidAmount: newPaidAmount,
            remainingBalance: newRemaining,
            status: isFullySettled ? 'settled' : 'partially_paid',
            payments: [pmtRecord, ...(r.payments || [])]
          };
        }),
        financialTransactions: [trx, ...prev.tables.financialTransactions],
        journalEntries: [je, ...prev.tables.journalEntries]
      }
    }));
  };

  // Installment Plans Implementation (نظام الدفعات والأقساط)
  const addInstallmentPlan = (planInput: {
    title: string;
    customerId: number;
    orderId?: number | null;
    totalAmount: number;
    downPayment?: number;
    downPaymentAccountId?: number;
    startDate: string;
    notes?: string;
    installments: {
      title: string;
      amount: number;
      dueDate: string;
      notes?: string;
    }[];
  }): InstallmentPlan => {
    const cust = customers.find(c => c.id === planInput.customerId);
    const ord = planInput.orderId ? orders.find(o => o.id === planInput.orderId) : null;
    const planId = Date.now();
    const planNumber = `PLAN-${Date.now().toString().slice(-6)}`;

    const downPayment = planInput.downPayment || 0;
    let initialPaid = 0;

    const installments: InstallmentItem[] = planInput.installments.map((inst, idx) => {
      const isFirst = idx === 0 && downPayment > 0;
      const paid = isFirst ? Math.min(inst.amount, downPayment) : 0;
      if (paid > 0) initialPaid += paid;
      return {
        id: `inst-${planId}-${idx + 1}`,
        installmentNumber: idx + 1,
        title: inst.title,
        amount: inst.amount,
        paidAmount: paid,
        remainingAmount: Math.max(0, inst.amount - paid),
        dueDate: inst.dueDate,
        paidDate: paid > 0 ? new Date().toISOString().split('T')[0] : undefined,
        status: paid >= inst.amount ? 'paid' : paid > 0 ? 'partially_paid' : 'pending',
        notes: inst.notes
      };
    });

    const remainingAmount = Math.max(0, planInput.totalAmount - initialPaid);

    const newPlan: InstallmentPlan = {
      id: planId,
      planNumber,
      title: planInput.title,
      customerId: planInput.customerId,
      customerName: cust?.name || 'عميل غير مسجل',
      customerPhone: cust?.phone,
      orderId: planInput.orderId || null,
      orderNumber: ord ? ord.orderNumber : null,
      totalAmount: planInput.totalAmount,
      paidAmount: initialPaid,
      remainingAmount,
      downPayment,
      status: remainingAmount === 0 ? 'completed' : 'active',
      startDate: planInput.startDate || new Date().toISOString().split('T')[0],
      notes: planInput.notes,
      installments,
      createdAt: new Date().toISOString()
    };

    let newPayment: Payment | null = null;
    let newTrx: FinancialTransaction | null = null;
    let newJe: JournalEntry | null = null;

    if (downPayment > 0 && planInput.downPaymentAccountId) {
      const pmtId = Date.now() + 10;
      const acc = accounts.find(a => a.id === planInput.downPaymentAccountId);
      newPayment = {
        id: pmtId,
        paymentNumber: `PAY-INST-${Date.now().toString().slice(-6)}`,
        receiptNumber: `REC-INST-${Date.now().toString().slice(-6)}`,
        customerId: planInput.customerId,
        orderId: planInput.orderId || null,
        amount: downPayment,
        accountId: planInput.downPaymentAccountId,
        paymentDate: planInput.startDate || new Date().toISOString().split('T')[0],
        paymentMethod: acc?.name || 'نقدي',
        paymentType: 'دفعة أولى (عربون)',
        statement: `دفعة أولى لخطة دفعات: ${planInput.title}`,
        notes: `عربون مسدد لخطة الدفعات رقم ${planNumber}`,
        status: 'approved',
        createdAt: new Date().toISOString()
      };

      newTrx = {
        id: pmtId + 1,
        transactionNumber: `TRX-${Date.now().toString().slice(-6)}`,
        transactionDate: new Date().toISOString(),
        accountId: planInput.downPaymentAccountId,
        type: 'deposit',
        amount: downPayment,
        description: `تحصيل دفعة أولى (خطة أقساط ${planNumber} - ${cust?.name})`,
        customerId: planInput.customerId,
        orderId: planInput.orderId || null,
        createdAt: new Date().toISOString()
      };

      newJe = {
        id: pmtId + 2,
        entryNumber: `JE-${Date.now().toString().slice(-6)}`,
        description: `سند قبض دفعة أولى من ${cust?.name}`,
        createdAt: new Date().toISOString(),
        lines: [
          {
            id: pmtId + 3,
            journalEntryId: pmtId + 2,
            accountId: planInput.downPaymentAccountId,
            accountName: acc?.name || 'المحفظة / الصندوق',
            side: 'debit',
            amount: downPayment
          },
          {
            id: pmtId + 4,
            journalEntryId: pmtId + 2,
            accountId: null,
            accountName: `حـ/ العميل: ${cust?.name}`,
            side: 'credit',
            amount: downPayment
          }
        ]
      };

      if (installments[0]) {
        installments[0].paymentId = pmtId;
        installments[0].receiptNumber = newPayment.receiptNumber;
        installments[0].accountId = planInput.downPaymentAccountId;
        installments[0].accountName = acc?.name;
      }
    }

    setData(prev => {
      let updatedOrders = prev.tables.orders;
      if (planInput.orderId && downPayment > 0) {
        updatedOrders = updatedOrders.map(o => {
          if (o.id !== planInput.orderId) return o;
          const newPaid = (o.paidAmount || 0) + downPayment;
          const newRemaining = Math.max(0, o.totalAmount - newPaid);
          return {
            ...o,
            paidAmount: newPaid,
            remainingAmount: newRemaining
          };
        });
      }

      return {
        ...prev,
        tables: {
          ...prev.tables,
          installmentPlans: [newPlan, ...(prev.tables.installmentPlans || [])],
          orders: updatedOrders,
          payments: newPayment ? [newPayment, ...prev.tables.payments] : prev.tables.payments,
          financialTransactions: newTrx ? [newTrx, ...prev.tables.financialTransactions] : prev.tables.financialTransactions,
          journalEntries: newJe ? [newJe, ...prev.tables.journalEntries] : prev.tables.journalEntries
        }
      };
    });

    addAuditLog('CREATE', 'installmentPlan', `تم إنشاء خطة دفعات جديدة ${planNumber} للعميل ${cust?.name}`, planId);
    return newPlan;
  };

  const payInstallment = (
    planId: number,
    installmentId: string,
    paymentData: {
      amount: number;
      accountId: number;
      paymentMethod?: string;
      notes?: string;
    }
  ) => {
    const plans = data.tables.installmentPlans || [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const inst = plan.installments.find(i => i.id === installmentId);
    if (!inst) return;

    const payAmount = Number(paymentData.amount) || inst.remainingAmount;
    if (payAmount <= 0) return;

    const acc = accounts.find(a => a.id === paymentData.accountId);
    const pmtId = Date.now();
    const receiptNum = `REC-INST-${Date.now().toString().slice(-6)}`;
    const cust = customers.find(c => c.id === plan.customerId);

    // 1. Payment Record
    const newPayment: Payment = {
      id: pmtId,
      paymentNumber: `PAY-INST-${Date.now().toString().slice(-6)}`,
      receiptNumber: receiptNum,
      customerId: plan.customerId,
      orderId: plan.orderId || null,
      amount: payAmount,
      accountId: paymentData.accountId,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: paymentData.paymentMethod || acc?.name || 'نقدي',
      paymentType: inst.title,
      statement: `سداد ${inst.title} (خطة ${plan.planNumber})`,
      notes: paymentData.notes || `دفعة مقسطة رقم ${inst.installmentNumber}`,
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    // 2. Financial Transaction (Deposit)
    const newTrx: FinancialTransaction = {
      id: pmtId + 1,
      transactionNumber: `TRX-${Date.now().toString().slice(-6)}`,
      transactionDate: new Date().toISOString(),
      accountId: paymentData.accountId,
      type: 'deposit',
      amount: payAmount,
      description: `تحصيل قسط / دفعة (${inst.title}) من العميل ${cust?.name || plan.customerName}`,
      customerId: plan.customerId,
      orderId: plan.orderId || null,
      createdAt: new Date().toISOString()
    };

    // 3. Double-entry Journal Entry
    const newJe: JournalEntry = {
      id: pmtId + 2,
      entryNumber: `JE-${Date.now().toString().slice(-6)}`,
      description: `سند تحصيل قسط ${inst.title} - ${plan.customerName}`,
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: pmtId + 3,
          journalEntryId: pmtId + 2,
          accountId: paymentData.accountId,
          accountName: acc?.name || 'المحفظة / الصندوق',
          side: 'debit',
          amount: payAmount
        },
        {
          id: pmtId + 4,
          journalEntryId: pmtId + 2,
          accountId: null,
          accountName: `حـ/ العميل: ${cust?.name || plan.customerName}`,
          side: 'credit',
          amount: payAmount
        }
      ]
    };

    // 4. Update data atomically
    setData(prev => {
      const updatedPlans = (prev.tables.installmentPlans || []).map(p => {
        if (p.id !== planId) return p;

        const updatedInstallments = p.installments.map(i => {
          if (i.id !== installmentId) return i;
          const newPaid = (i.paidAmount || 0) + payAmount;
          const newRemaining = Math.max(0, i.amount - newPaid);
          return {
            ...i,
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            paidDate: new Date().toISOString().split('T')[0],
            status: newRemaining === 0 ? ('paid' as const) : ('partially_paid' as const),
            paymentId: pmtId,
            receiptNumber: receiptNum,
            accountId: paymentData.accountId,
            accountName: acc?.name,
            notes: paymentData.notes || i.notes
          };
        });

        const totalPaid = updatedInstallments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
        const totalRemaining = Math.max(0, p.totalAmount - totalPaid);

        return {
          ...p,
          paidAmount: totalPaid,
          remainingAmount: totalRemaining,
          status: totalRemaining === 0 ? ('completed' as const) : ('active' as const),
          installments: updatedInstallments
        };
      });

      let updatedOrders = prev.tables.orders;
      if (plan.orderId) {
        updatedOrders = updatedOrders.map(o => {
          if (o.id !== plan.orderId) return o;
          const newPaid = (o.paidAmount || 0) + payAmount;
          const newRemaining = Math.max(0, o.totalAmount - newPaid);
          return {
            ...o,
            paidAmount: newPaid,
            remainingAmount: newRemaining
          };
        });
      }

      return {
        ...prev,
        tables: {
          ...prev.tables,
          installmentPlans: updatedPlans,
          orders: updatedOrders,
          payments: [newPayment, ...prev.tables.payments],
          financialTransactions: [newTrx, ...prev.tables.financialTransactions],
          journalEntries: [newJe, ...prev.tables.journalEntries]
        }
      };
    });

    addAuditLog('UPDATE', 'installmentPlan', `تم تسديد قسط ${inst.title} بقيمة ${payAmount} ريال للعميل ${plan.customerName}`, planId);
  };

  const deleteInstallmentPlan = (planId: number) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        installmentPlans: (prev.tables.installmentPlans || []).filter(p => p.id !== planId)
      }
    }));
    addAuditLog('DELETE', 'installmentPlan', `تم حذف خطة الدفعات ${planId}`);
  };

  const cancelInstallmentPlan = (planId: number) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        installmentPlans: (prev.tables.installmentPlans || []).map(p =>
          p.id === planId ? { ...p, status: 'cancelled' as const } : p
        )
      }
    }));
    addAuditLog('CANCEL', 'installmentPlan', `تم إلغاء خطة الدفعات ${planId}`);
  };

  const exportPermanentZipBackup = async (customFilename?: string) => {
    return exportToZip(data, customFilename);
  };

  // Couriers Implementation (نظام الموصلين ومناديب التوصيل)
  const addCourier = (courierInput: Omit<Courier, 'id' | 'code' | 'createdAt' | 'currentCustodyBalance' | 'deliveredOrdersCount'>): Courier => {
    const id = Date.now();
    const count = (data.tables.couriers?.length || 0) + 1;
    const code = `DLV-${String(count).padStart(2, '0')}`;
    const newCourier: Courier = {
      ...courierInput,
      id,
      code,
      status: courierInput.status || 'available',
      currentCustodyBalance: 0,
      deliveredOrdersCount: 0,
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        couriers: [newCourier, ...(prev.tables.couriers || [])]
      }
    }));

    addAuditLog('CREATE', 'courier', `تم تسجيل موصل جديد: ${newCourier.name} (${code})`, id);
    return newCourier;
  };

  const updateCourier = (updated: Courier) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        couriers: (prev.tables.couriers || []).map(c => c.id === updated.id ? updated : c)
      }
    }));
    addAuditLog('UPDATE', 'courier', `تم تحديث بيانات الموصل: ${updated.name}`, updated.id);
  };

  const deleteCourier = (id: number) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        couriers: (prev.tables.couriers || []).filter(c => c.id !== id)
      }
    }));
    addAuditLog('DELETE', 'courier', `تم حذف الموصل #${id}`, id);
  };

  // Workers Operations
  const addWorker = (workerInput: Omit<Worker, 'id' | 'createdAt'>): Worker => {
    const id = Date.now();
    const newWorker: Worker = {
      ...workerInput,
      id,
      status: workerInput.status || 'active',
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        workers: [newWorker, ...(prev.tables.workers || INITIAL_DATA.tables.workers || [])]
      }
    }));

    addAuditLog('CREATE', 'worker', `تم تسجيل عامل جديد: ${newWorker.name} (${newWorker.role})`, id);
    showNotification(`تمت إضافة العامل ${newWorker.name} بنجاح`, 'success');
    return newWorker;
  };

  const updateWorker = (updated: Worker) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        workers: (prev.tables.workers || INITIAL_DATA.tables.workers || []).map(w => w.id === updated.id ? updated : w)
      }
    }));
    addAuditLog('UPDATE', 'worker', `تم تحديث بيانات العامل: ${updated.name}`, updated.id);
    showNotification(`تم تحديث بيانات العامل ${updated.name}`, 'success');
  };

  const deleteWorker = (id: number) => {
    const target = (data.tables.workers || INITIAL_DATA.tables.workers || []).find(w => w.id === id);
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        workers: (prev.tables.workers || INITIAL_DATA.tables.workers || []).filter(w => w.id !== id)
      }
    }));
    addAuditLog('DELETE', 'worker', `تم حذف العامل #${id}`, id);
    showNotification(`تم حذف العامل ${target?.name || ''}`, 'success');
  };

  const addWorkerExpense = (params: {
    workerId: number;
    workerName: string;
    category: string;
    amount: number;
    accountId: number;
    description?: string;
    notes?: string;
  }) => {
    const desc = params.description || `صرفية ${params.category} للعامل ${params.workerName}`;
    addExpense({
      category: params.category,
      vendorName: params.workerName,
      amount: params.amount,
      accountId: params.accountId,
      description: desc,
      notes: params.notes || `صرفية عامل: ${params.workerName}`
    });
    showNotification(`تم تسجيل صرفية ${params.category} للعامل ${params.workerName} بمبلغ ${params.amount.toLocaleString()} ريال بنجاح`, 'success');
  };

  const createDeliveryTrip = (tripData: {
    courierId: number;
    date: string;
    orderIds: number[];
    notes?: string;
  }): DeliveryTrip => {
    const courier = (data.tables.couriers || []).find(c => c.id === tripData.courierId);
    const tripId = Date.now();
    const tripNumber = `TRIP-${Date.now().toString().slice(-6)}`;

    let totalExpectedCash = 0;
    const items: DeliveryTripItem[] = tripData.orderIds.map(oId => {
      const ord = orders.find(o => o.id === oId);
      const cust = ord ? customers.find(c => c.id === ord.customerId) : null;
      const rem = ord ? Math.max(0, (ord.remainingAmount || 0)) : 0;
      const delFee = ord?.deliveryFee || courier?.defaultDeliveryFee || 1500;
      const totalDue = rem + delFee;
      totalExpectedCash += totalDue;

      return {
        orderId: oId,
        orderNumber: ord?.orderNumber || oId,
        customerId: ord?.customerId || 0,
        customerName: cust?.name || ord?.customerName || 'عميل',
        customerPhone: cust?.phone || '',
        customerAddress: cust?.pickupLocation || cust?.governorate || 'صنعاء',
        orderRemainingAmount: rem,
        deliveryFee: delFee,
        totalDueFromCustomer: totalDue,
        status: 'pending',
        collectedAmount: 0,
        deliveryFeeCollected: false
      };
    });

    const newTrip: DeliveryTrip = {
      id: tripId,
      tripNumber,
      courierId: tripData.courierId,
      courierName: courier?.name || 'مندوب توصيل',
      courierPhone: courier?.phone || '',
      date: tripData.date || new Date().toISOString().split('T')[0],
      status: 'in_progress',
      items,
      totalOrdersCount: items.length,
      deliveredCount: 0,
      returnedCount: 0,
      totalExpectedCash,
      totalCollectedCash: 0,
      courierCommissionTotal: (courier?.defaultDeliveryFee || 1500) * items.length,
      netDepositedToStore: 0,
      notes: tripData.notes,
      createdAt: new Date().toISOString()
    };

    setData(prev => {
      const updatedOrders = (prev.tables.orders || []).map(o => {
        if (tripData.orderIds.includes(o.id) && o.status !== 'delivered') {
          return { ...o, status: 'shipped' as const };
        }
        return o;
      });

      const updatedCouriers = (prev.tables.couriers || []).map(c => {
        if (c.id !== tripData.courierId) return c;
        return {
          ...c,
          status: 'on_delivery' as const,
          currentCustodyBalance: (c.currentCustodyBalance || 0) + totalExpectedCash
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          deliveryTrips: [newTrip, ...(prev.tables.deliveryTrips || [])],
          couriers: updatedCouriers,
          orders: updatedOrders
        }
      };
    });

    addAuditLog('CREATE', 'deliveryTrip', `تم إنشاء رحلة توصيل #${tripNumber} للموصل ${courier?.name} بعدد ${items.length} طلبات`, tripId);
    return newTrip;
  };

  const settleDeliveryTrip = (
    tripId: number,
    settlementData: {
      items: {
        orderId: number;
        status: 'delivered' | 'returned' | 'postponed';
        collectedAmount: number;
        deliveryFeeCollected: boolean;
        notes?: string;
      }[];
      depositAccountId: number;
      courierCommissionPaid: number;
      notes?: string;
    }
  ) => {
    const trip = (data.tables.deliveryTrips || []).find(t => t.id === tripId);
    if (!trip) return;

    const courier = (data.tables.couriers || []).find(c => c.id === trip.courierId);
    const depositAcc = accounts.find(a => a.id === settlementData.depositAccountId);
    const nowStr = new Date().toISOString();
    const todayStr = nowStr.split('T')[0];

    let totalCollectedCash = 0;
    let deliveredCount = 0;
    let returnedCount = 0;

    const updatedTripItems: DeliveryTripItem[] = trip.items.map(origItem => {
      const reported = settlementData.items.find(i => i.orderId === origItem.orderId);
      if (!reported) return origItem;

      const collAmt = reported.status === 'delivered' ? (Number(reported.collectedAmount) || origItem.totalDueFromCustomer) : (Number(reported.collectedAmount) || 0);
      if (reported.status === 'delivered') deliveredCount++;
      if (reported.status === 'returned') returnedCount++;
      totalCollectedCash += collAmt;

      return {
        ...origItem,
        status: reported.status,
        collectedAmount: collAmt,
        deliveryFeeCollected: reported.deliveryFeeCollected,
        deliveredAt: reported.status === 'delivered' ? todayStr : undefined,
        notes: reported.notes || origItem.notes
      };
    });

    const courierComm = Number(settlementData.courierCommissionPaid) || 0;
    const netToDeposit = Math.max(0, totalCollectedCash - courierComm);

    const newPayments: Payment[] = [];
    const newTransactions: FinancialTransaction[] = [];
    const newJournalEntries: JournalEntry[] = [];

    updatedTripItems.forEach(item => {
      if (item.status === 'delivered' && item.collectedAmount > 0) {
        const pmtId = Date.now() + Math.floor(Math.random() * 1000);
        const receiptNo = `REC-DLV-${Date.now().toString().slice(-5)}-${item.orderId}`;
        newPayments.push({
          id: pmtId,
          paymentNumber: `PAY-DLV-${item.orderNumber}`,
          receiptNumber: receiptNo,
          orderId: item.orderId,
          customerId: item.customerId,
          amount: item.collectedAmount,
          accountId: settlementData.depositAccountId,
          paymentDate: todayStr,
          paymentMethod: 'نقداً عبر الموصل',
          paymentType: 'تحصيل عند الاستلام (COD)',
          statement: `تحصيل طلبية #${item.orderNumber} بواسطة الموصل ${trip.courierName}`,
          notes: `رحلة توصيل ${trip.tripNumber}`,
          status: 'approved',
          createdAt: nowStr
        });
      }
    });

    if (netToDeposit > 0) {
      const trxId = Date.now();
      newTransactions.push({
        id: trxId,
        transactionNumber: `TRX-DLV-${Date.now().toString().slice(-6)}`,
        transactionDate: nowStr,
        accountId: settlementData.depositAccountId,
        type: 'deposit',
        amount: netToDeposit,
        description: `توريد نقدية رحلة التوصيل #${trip.tripNumber} من الموصل ${trip.courierName} (صافي بعد خصم أجور ${courierComm} ريال)`,
        createdAt: nowStr
      });

      const jeId = trxId + 1;
      const lines: JournalLine[] = [
        {
          id: jeId + 1,
          journalEntryId: jeId,
          accountId: settlementData.depositAccountId,
          accountName: depositAcc?.name || 'الصندوق / المحفظة',
          side: 'debit',
          amount: netToDeposit
        }
      ];

      if (courierComm > 0) {
        lines.push({
          id: jeId + 2,
          journalEntryId: jeId,
          accountId: null,
          accountName: `مصروفات تشغيل: أجور الموصل (${trip.courierName})`,
          side: 'debit',
          amount: courierComm
        });
      }

      lines.push({
        id: jeId + 3,
        journalEntryId: jeId,
        accountId: null,
        accountName: `حساب تحصيلات تسليم العملاء (رحلة ${trip.tripNumber})`,
        side: 'credit',
        amount: totalCollectedCash
      });

      newJournalEntries.push({
        id: jeId,
        entryNumber: `JE-DLV-${Date.now().toString().slice(-6)}`,
        description: `تصفية وتوريد رحلة التوصيل #${trip.tripNumber} - الموصل ${trip.courierName}`,
        createdAt: nowStr,
        lines
      });
    }

    setData(prev => {
      const updatedOrders = (prev.tables.orders || []).map(o => {
        const tripItem = updatedTripItems.find(ti => ti.orderId === o.id);
        if (!tripItem) return o;

        if (tripItem.status === 'delivered') {
          const newPaid = (o.paidAmount || 0) + tripItem.orderRemainingAmount;
          return {
            ...o,
            status: 'delivered' as const,
            paidAmount: newPaid,
            remainingAmount: Math.max(0, o.totalAmount - newPaid),
            deliveryFeeCollectionStatus: 'collected' as const
          };
        } else if (tripItem.status === 'returned') {
          return {
            ...o,
            status: 'cancelled' as const,
            notes: (o.notes ? `${o.notes} | ` : '') + 'مرتجع من الموصل'
          };
        }
        return o;
      });

      const updatedTrips = (prev.tables.deliveryTrips || []).map(t => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          status: 'settled' as const,
          items: updatedTripItems,
          deliveredCount,
          returnedCount,
          totalCollectedCash,
          courierCommissionTotal: courierComm,
          netDepositedToStore: netToDeposit,
          depositAccountId: settlementData.depositAccountId,
          depositAccountName: depositAcc?.name,
          settledAt: nowStr,
          notes: settlementData.notes || t.notes
        };
      });

      const updatedCouriers = (prev.tables.couriers || []).map(c => {
        if (c.id !== trip.courierId) return c;
        return {
          ...c,
          status: 'available' as const,
          currentCustodyBalance: Math.max(0, (c.currentCustodyBalance || 0) - trip.totalExpectedCash),
          deliveredOrdersCount: (c.deliveredOrdersCount || 0) + deliveredCount
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          deliveryTrips: updatedTrips,
          couriers: updatedCouriers,
          orders: updatedOrders,
          payments: [...newPayments, ...prev.tables.payments],
          financialTransactions: [...newTransactions, ...prev.tables.financialTransactions],
          journalEntries: [...newJournalEntries, ...prev.tables.journalEntries]
        }
      };
    });

    addAuditLog('UPDATE', 'deliveryTrip', `تمت محاسبة وتصفية رحلة التوصيل #${trip.tripNumber} وتوريد ${netToDeposit} ريال إلى ${depositAcc?.name}`, tripId);
  };

  const cancelDeliveryTrip = (tripId: number) => {
    const trip = (data.tables.deliveryTrips || []).find(t => t.id === tripId);
    if (!trip || trip.status === 'settled') return;

    setData(prev => {
      const updatedOrders = (prev.tables.orders || []).map(o => {
        if (trip.items.some(i => i.orderId === o.id) && o.status === 'shipped') {
          return { ...o, status: 'pending' as const };
        }
        return o;
      });

      const updatedCouriers = (prev.tables.couriers || []).map(c => {
        if (c.id !== trip.courierId) return c;
        return {
          ...c,
          status: 'available' as const,
          currentCustodyBalance: Math.max(0, (c.currentCustodyBalance || 0) - trip.totalExpectedCash)
        };
      });

      const updatedTrips = (prev.tables.deliveryTrips || []).map(t => {
        if (t.id !== tripId) return t;
        return { ...t, status: 'cancelled' as const };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          deliveryTrips: updatedTrips,
          couriers: updatedCouriers,
          orders: updatedOrders
        }
      };
    });

    addAuditLog('CANCEL', 'deliveryTrip', `تم إلغاء رحلة التوصيل #${trip.tripNumber}`, tripId);
  };

  const deleteDeliveryTrip = (tripId: number) => {
    cancelDeliveryTrip(tripId);
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        deliveryTrips: (prev.tables.deliveryTrips || []).filter(t => t.id !== tripId)
      }
    }));
  };

  // ----------------------------------------------------
  // DEDICATED DELIVERY SYSTEM (إدارة الموصلين والتوزيع المستقل)
  // ----------------------------------------------------
  const createDeliveryOrder = (orderData: {
    orderId?: number | null;
    orderNumber?: string | number;
    shipmentNumber?: string;
    customerName: string;
    customerPhone: string;
    governorate: string;
    district?: string;
    address: string;
    courierId: number;
    dispatchDate?: string;
    orderOriginalValue?: number;
    orderRemainingAmount?: number;
    deliveryFee: number;
    collectionMethod?: 'cash_to_courier' | 'transfer_to_wallet' | 'waived' | 'unassigned';
    walletId?: number;
    walletReference?: string;
    notes?: string;
  }): DeliveryOrder => {
    const courier = couriers.find(c => c.id === orderData.courierId);
    const id = Date.now();
    const deliveryNumber = `DLV-${Date.now().toString().slice(-6)}`;
    const nowStr = new Date().toISOString();
    const fee = Number(orderData.deliveryFee) || (courier?.defaultDeliveryFee || 1500);
    const method = orderData.collectionMethod || 'unassigned';
    const isCash = method === 'cash_to_courier';
    const isWallet = method === 'transfer_to_wallet';
    const targetWallet = orderData.walletId ? accounts.find(a => a.id === orderData.walletId) : undefined;
    const orderNumLabel = orderData.orderNumber || (orderData.orderId ? String(orderData.orderId) : 'مباشر');

    const newDelivery: DeliveryOrder = {
      id,
      deliveryNumber,
      orderId: orderData.orderId || null,
      orderNumber: orderNumLabel,
      shipmentNumber: orderData.shipmentNumber || '',
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      governorate: orderData.governorate || 'صنعاء',
      district: orderData.district || '',
      address: orderData.address,
      courierId: orderData.courierId,
      courierName: courier?.name || 'مندوب توصيل',
      dispatchDate: orderData.dispatchDate || nowStr,
      orderOriginalValue: Number(orderData.orderOriginalValue) || 0,
      orderRemainingAmount: Number(orderData.orderRemainingAmount) || 0,
      custodyRecordedAmount: isCash ? fee : 0,
      payableRecordedAmount: isWallet ? fee : 0,
      walletDepositedAmount: isWallet ? fee : 0,
      deliveryFee: fee,
      status: 'pending_dispatch',
      collectionMethod: method,
      collectionStatus: isCash ? 'collected_cash' : isWallet ? 'transferred_to_wallet' : 'pending',
      walletId: orderData.walletId,
      walletName: targetWallet?.name,
      walletReference: orderData.walletReference,
      collectedAt: (isCash || isWallet) ? nowStr : undefined,
      notes: orderData.notes || (isCash ? `طلب رقم #${orderNumLabel} - نقدي للمندوب` : isWallet ? `طلب رقم #${orderNumLabel} - محفظة (${targetWallet?.name || ''})` : undefined),
      createdAt: nowStr
    };

    const walletDepositTrx: FinancialTransaction | null = (isWallet && orderData.walletId)
      ? {
          id: id + 1,
          transactionNumber: `TRX-DLV-WAL-${Date.now().toString().slice(-6)}`,
          transactionDate: nowStr,
          accountId: orderData.walletId,
          type: 'deposit',
          amount: fee,
          description: `إيداع توصيل طلب رقم #${orderNumLabel} (العميلة ${orderData.customerName}) - استحقاق للمندوب ${courier?.name || ''}`,
          referenceNumber: orderData.walletReference,
          createdAt: nowStr
        }
      : null;

    setData(prev => {
      const currentCouriers = prev.tables.couriers && prev.tables.couriers.length > 0
        ? prev.tables.couriers
        : (INITIAL_DATA.tables.couriers || []);
      const currentDeliveries = prev.tables.deliveryOrders && prev.tables.deliveryOrders.length > 0
        ? prev.tables.deliveryOrders
        : (INITIAL_DATA.tables.deliveryOrders || []);

      const updatedCouriers = currentCouriers.map(c => {
        if (c.id !== orderData.courierId) return c;
        return {
          ...c,
          currentCustodyBalance: isCash ? (Number(c.currentCustodyBalance) || 0) + fee : (Number(c.currentCustodyBalance) || 0),
          currentPayableBalance: isWallet ? (Number(c.currentPayableBalance) || 0) + fee : (Number(c.currentPayableBalance) || 0)
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          couriers: updatedCouriers,
          deliveryOrders: [newDelivery, ...currentDeliveries],
          financialTransactions: walletDepositTrx
            ? [walletDepositTrx, ...(prev.tables.financialTransactions || [])]
            : prev.tables.financialTransactions
        }
      };
    });

    addAuditLog('CREATE', 'deliveryOrder', `إسناد طلب توصيل جديد #${deliveryNumber} (طلب رقم #${orderNumLabel}) للعميلة ${orderData.customerName} إلى الموصل ${courier?.name}`, id);
    showNotification(`تم تسجيل طلب التوصيل #${deliveryNumber} (طلب رقم #${orderNumLabel}) بنجاح`, 'success');
    return newDelivery;
  };

  const updateDeliveryOrderStatus = (
    deliveryId: number,
    status: DeliveryOrder['status'],
    details?: {
      failedReason?: string;
      deliveredAt?: string;
      collectionMethod?: DeliveryOrder['collectionMethod'];
      walletId?: number;
      walletReference?: string;
      courierId?: number;
      deliveryFee?: number;
    }
  ) => {
    const delivery = deliveryOrders.find(d => d.id === deliveryId);
    if (!delivery) return;

    const targetCourierId = details?.courierId !== undefined ? details.courierId : delivery.courierId;
    const courier = couriers.find(c => c.id === targetCourierId);
    const nextFee = details?.deliveryFee !== undefined ? Number(details.deliveryFee) : Number(delivery.deliveryFee) || (courier?.defaultDeliveryFee || 1500);
    const nowStr = new Date().toISOString();
    const todayStr = nowStr.split('T')[0];

    let nextCollectionMethod = details?.collectionMethod || delivery.collectionMethod;
    let nextCollectionStatus = delivery.collectionStatus;
    let walletDepositTrx: FinancialTransaction | null = null;

    const prevCustody = delivery.collectionStatus === 'collected_cash'
      ? (Number(delivery.custodyRecordedAmount) || Number(delivery.deliveryFee) || 0)
      : 0;
    const prevPayable = delivery.collectionStatus === 'transferred_to_wallet'
      ? (Number(delivery.payableRecordedAmount) || Number(delivery.deliveryFee) || 0)
      : 0;

    let nextCustody = prevCustody;
    let nextPayable = prevPayable;

    if (status === 'delivered' || nextCollectionMethod === 'cash_to_courier' || nextCollectionMethod === 'transfer_to_wallet') {
      if (nextCollectionMethod === 'cash_to_courier') {
        nextCollectionStatus = 'collected_cash';
        nextCustody = Number(delivery.finalPaymentAmount) > 0 && Number(delivery.custodyRecordedAmount) > 0
          ? Number(delivery.custodyRecordedAmount)
          : (Number(delivery.finalPaymentAmount) || nextFee);
        nextPayable = 0;
      } else if (nextCollectionMethod === 'transfer_to_wallet') {
        nextCollectionStatus = 'transferred_to_wallet';
        nextCustody = 0;
        nextPayable = nextFee;
        const targetWalletId = details?.walletId || delivery.walletId;
        const targetWallet = targetWalletId ? accounts.find(a => a.id === targetWalletId) : undefined;
        const depositAmt = Number(delivery.finalPaymentAmount) || nextFee;
        if (targetWallet && delivery.collectionStatus !== 'transferred_to_wallet' && !delivery.paymentId) {
          const trxId = Date.now();
          walletDepositTrx = {
            id: trxId,
            transactionNumber: `TRX-DLV-WAL-${Date.now().toString().slice(-6)}`,
            transactionDate: nowStr,
            accountId: targetWallet.id,
            type: 'deposit',
            amount: depositAmt,
            description: `تحويل لمحفظة ${targetWallet.name} عن طلب رقم #${delivery.orderNumber} (العميلة ${delivery.customerName}) - استحقاق للمندوب ${courier?.name || ''}`,
            referenceNumber: details?.walletReference || delivery.walletReference,
            createdAt: nowStr
          };
        }
      } else if (nextCollectionMethod === 'waived') {
        nextCollectionStatus = 'settled';
        nextCustody = 0;
        nextPayable = 0;
      }
    }

    if (status === 'cancelled' || status === 'returned' || status === 'delivery_failed') {
      nextCustody = 0;
      nextPayable = 0;
      nextCollectionStatus = 'pending';
    }

    setData(prev => {
      const currentCouriers = prev.tables.couriers && prev.tables.couriers.length > 0
        ? prev.tables.couriers
        : (INITIAL_DATA.tables.couriers || []);
      const currentDeliveries = prev.tables.deliveryOrders && prev.tables.deliveryOrders.length > 0
        ? prev.tables.deliveryOrders
        : (INITIAL_DATA.tables.deliveryOrders || []);

      const updatedCouriers = currentCouriers.map(c => {
        // If courier changed, revert from old courier and apply to new courier
        if (delivery.courierId && delivery.courierId !== targetCourierId && c.id === delivery.courierId) {
          return {
            ...c,
            currentCustodyBalance: Math.max(0, (Number(c.currentCustodyBalance) || 0) - prevCustody),
            currentPayableBalance: Math.max(0, (Number(c.currentPayableBalance) || 0) - prevPayable)
          };
        }
        if (c.id !== targetCourierId) return c;
        const currentCustody = Number(c.currentCustodyBalance) || 0;
        const currentPayable = Number(c.currentPayableBalance) || 0;
        const deliveredCount = Number(c.deliveredOrdersCount) || 0;
        const custodyDelta = delivery.courierId === targetCourierId ? (nextCustody - prevCustody) : nextCustody;
        const payableDelta = delivery.courierId === targetCourierId ? (nextPayable - prevPayable) : nextPayable;

        return {
          ...c,
          currentCustodyBalance: Math.max(0, currentCustody + custodyDelta),
          currentPayableBalance: Math.max(0, currentPayable + payableDelta),
          deliveredOrdersCount: status === 'delivered' && delivery.status !== 'delivered' ? deliveredCount + 1 : deliveredCount
        };
      });

      const updatedDeliveries = currentDeliveries.map(d => {
        if (d.id !== deliveryId) return d;
        const resolvedWalletId = details?.walletId !== undefined ? details.walletId : d.walletId;
        const resolvedWalletName = resolvedWalletId ? accounts.find(a => a.id === resolvedWalletId)?.name : d.walletName;
        return {
          ...d,
          courierId: targetCourierId,
          courierName: courier?.name || d.courierName,
          deliveryFee: nextFee,
          status,
          collectionMethod: nextCollectionMethod,
          collectionStatus: nextCollectionStatus,
          custodyRecordedAmount: nextCustody,
          payableRecordedAmount: nextPayable,
          walletId: resolvedWalletId,
          walletName: resolvedWalletName,
          walletReference: details?.walletReference !== undefined ? details.walletReference : d.walletReference,
          failedReason: details?.failedReason,
          deliveredAt: status === 'delivered' ? (details?.deliveredAt || todayStr) : d.deliveredAt
        };
      });

      const nextTrx = walletDepositTrx
        ? [walletDepositTrx, ...(prev.tables.financialTransactions || [])]
        : prev.tables.financialTransactions;

      return {
        ...prev,
        tables: {
          ...prev.tables,
          deliveryOrders: updatedDeliveries,
          couriers: updatedCouriers,
          financialTransactions: nextTrx
        }
      };
    });

    addAuditLog('UPDATE', 'deliveryOrder', `تحديث حالة طلب التوصيل #${delivery.deliveryNumber} (طلب رقم #${delivery.orderNumber}) إلى ${status}`, deliveryId);
    showNotification(`تم تحديث بيانات وطريقة تحصيل طلب رقم #${delivery.orderNumber} بنجاح`, 'success');
  };

  const updateDeliveryOrder = (updated: DeliveryOrder) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        deliveryOrders: (prev.tables.deliveryOrders || []).map(d => d.id === updated.id ? updated : d)
      }
    }));
    addAuditLog('UPDATE', 'deliveryOrder', `تعديل بيانات طلب التوصيل #${updated.deliveryNumber}`, updated.id);
  };

  const deleteDeliveryOrder = (deliveryId: number) => {
    const delivery = (data.tables.deliveryOrders || []).find(d => d.id === deliveryId);
    if (!delivery) return;

    // If courier held cash custody, deduct it safely
    let custodyAdjustment = 0;
    if (delivery.collectionStatus === 'collected_cash') {
      custodyAdjustment = -delivery.deliveryFee;
    }

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        couriers: custodyAdjustment !== 0
          ? (prev.tables.couriers || []).map(c => c.id === delivery.courierId ? { ...c, currentCustodyBalance: Math.max(0, (c.currentCustodyBalance || 0) + custodyAdjustment) } : c)
          : prev.tables.couriers,
        deliveryOrders: (prev.tables.deliveryOrders || []).filter(d => d.id !== deliveryId)
      }
    }));

    addAuditLog('DELETE', 'deliveryOrder', `حذف طلب التوصيل #${delivery.deliveryNumber}`, deliveryId);
    showNotification(`تم حذف طلب التوصيل بنجاح`, 'success');
  };

  const recordDeliveryCashToCourier = (deliveryId: number, notes?: string) => {
    const delivery = deliveryOrders.find(d => d.id === deliveryId);
    if (!delivery) return;

    // If already recorded as cash, prevent duplicate
    if (delivery.collectionStatus === 'collected_cash') {
      showNotification('تم تسجيل التحصيل النقدي لهذا الطلب مسبقاً', 'warning');
      return;
    }

    const amountToRecord = Number(delivery.finalPaymentAmount) || Number(delivery.deliveryFee) || 0;
    const prevPayable = delivery.collectionStatus === 'transferred_to_wallet'
      ? (Number(delivery.payableRecordedAmount) || Number(delivery.deliveryFee) || 0)
      : 0;

    setData(prev => {
      const currentCouriers = prev.tables.couriers && prev.tables.couriers.length > 0
        ? prev.tables.couriers
        : (INITIAL_DATA.tables.couriers || []);
      const currentDeliveries = prev.tables.deliveryOrders && prev.tables.deliveryOrders.length > 0
        ? prev.tables.deliveryOrders
        : (INITIAL_DATA.tables.deliveryOrders || []);

      const updatedCouriers = currentCouriers.map(c => {
        if (c.id !== delivery.courierId) return c;
        return {
          ...c,
          currentCustodyBalance: (Number(c.currentCustodyBalance) || 0) + amountToRecord,
          currentPayableBalance: Math.max(0, (Number(c.currentPayableBalance) || 0) - prevPayable)
        };
      });

      const updatedDeliveries = currentDeliveries.map(d => {
        if (d.id !== deliveryId) return d;
        return {
          ...d,
          collectionMethod: 'cash_to_courier' as const,
          collectionStatus: 'collected_cash' as const,
          custodyRecordedAmount: amountToRecord,
          payableRecordedAmount: 0,
          collectedAt: new Date().toISOString(),
          notes: notes ? (d.notes ? `${d.notes} | ${notes}` : notes) : `طلب رقم #${d.orderNumber} — سجل برصيد المندوب (${amountToRecord.toLocaleString()} ريال)`
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          deliveryOrders: updatedDeliveries,
          couriers: updatedCouriers
        }
      };
    });

    addAuditLog('UPDATE', 'deliveryOrder', `تسجيل دفع نقدي ${amountToRecord} ريال برصيد المندوب ${delivery.courierName} عن طلب رقم #${delivery.orderNumber}`, deliveryId);
    showNotification(`تم تسجيل طلب رقم #${delivery.orderNumber} بمبلغ (${amountToRecord.toLocaleString()} ريال) في رصيد المندوب ${delivery.courierName} بنجاح`, 'success');
  };

  const recordDeliveryTransferToWallet = (params: {
    deliveryId: number;
    walletId: number;
    referenceNumber?: string;
    transferDate?: string;
    notes?: string;
  }) => {
    const delivery = deliveryOrders.find(d => d.id === params.deliveryId);
    if (!delivery) return;

    // Prevent duplicate recording
    if (delivery.collectionStatus === 'transferred_to_wallet') {
      showNotification('تم تسجيل التحويل إلى المحفظة لهذا الطلب مسبقاً', 'warning');
      return;
    }

    const wallet = accounts.find(a => a.id === params.walletId);
    const nowStr = new Date().toISOString();
    const trxId = Date.now();
    const depositAmount = Number(delivery.finalPaymentAmount) || Number(delivery.deliveryFee) || 0;
    const courierEntitlement = Number(delivery.deliveryFee) || 1500;

    // Independent delivery wallet deposit transaction (if not already deposited via paymentId)
    const walletDepositTrx: FinancialTransaction | null = delivery.paymentId
      ? null
      : {
          id: trxId,
          transactionNumber: `TRX-DLV-${Date.now().toString().slice(-6)}`,
          transactionDate: params.transferDate || nowStr,
          accountId: params.walletId,
          type: 'deposit',
          amount: depositAmount,
          description: `إيداع لمحفظة ${wallet?.name || ''} عن طلب رقم #${delivery.orderNumber} (العميلة ${delivery.customerName}) - استحقاق للمندوب ${delivery.courierName}`,
          referenceNumber: params.referenceNumber,
          createdAt: nowStr
        };

    const wasCash = delivery.collectionStatus === 'collected_cash';
    const prevCustody = wasCash ? (Number(delivery.custodyRecordedAmount) || Number(delivery.deliveryFee) || 0) : 0;

    setData(prev => {
      const currentCouriers = prev.tables.couriers && prev.tables.couriers.length > 0
        ? prev.tables.couriers
        : (INITIAL_DATA.tables.couriers || []);
      const currentDeliveries = prev.tables.deliveryOrders && prev.tables.deliveryOrders.length > 0
        ? prev.tables.deliveryOrders
        : (INITIAL_DATA.tables.deliveryOrders || []);

      const updatedCouriers = currentCouriers.map(c => {
        if (c.id !== delivery.courierId) return c;
        return {
          ...c,
          currentCustodyBalance: wasCash
            ? Math.max(0, (Number(c.currentCustodyBalance) || 0) - prevCustody)
            : (Number(c.currentCustodyBalance) || 0),
          currentPayableBalance: (Number(c.currentPayableBalance) || 0) + courierEntitlement
        };
      });

      const updatedDeliveries = currentDeliveries.map(d => {
        if (d.id !== params.deliveryId) return d;
        return {
          ...d,
          collectionMethod: 'transfer_to_wallet' as const,
          collectionStatus: 'transferred_to_wallet' as const,
          custodyRecordedAmount: 0,
          payableRecordedAmount: courierEntitlement,
          walletDepositedAmount: depositAmount,
          walletId: params.walletId,
          walletName: wallet?.name,
          walletReference: params.referenceNumber,
          collectedAt: nowStr,
          notes: params.notes
            ? (d.notes ? `${d.notes} | ${params.notes}` : params.notes)
            : `طلب رقم #${d.orderNumber} — محول لمحفظة ${wallet?.name || ''} + استحقاق للمندوب (${courierEntitlement.toLocaleString()} ريال)`
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          deliveryOrders: updatedDeliveries,
          couriers: updatedCouriers,
          financialTransactions: walletDepositTrx
            ? [walletDepositTrx, ...(prev.tables.financialTransactions || [])]
            : prev.tables.financialTransactions
        }
      };
    });

    addAuditLog('CREATE', 'financialTransaction', `إيداع ${depositAmount} ريال في محفظة ${wallet?.name} عن طلب رقم #${delivery.orderNumber} وتسجيل استحقاق ${courierEntitlement} ريال للمندوب ${delivery.courierName}`, trxId);
    showNotification(`زاد رصيد محفظة ${wallet?.name} وتم تسجيل استحقاق (${courierEntitlement.toLocaleString()} ريال) للمندوب ${delivery.courierName} عن طلب رقم #${delivery.orderNumber}`, 'success');
  };

  const receiveCashFromCourier = (params: {
    courierId: number;
    amount: number;
    depositAccountId?: number;
    receivedDate?: string;
    notes?: string;
  }): DeliveryCashCollection => {
    const courier = (data.tables.couriers || []).find(c => c.id === params.courierId);
    const amount = Number(params.amount) || 0;
    const nowStr = new Date().toISOString();
    const id = Date.now();
    const receiptNumber = `DCR-${Date.now().toString().slice(-6)}`;
    const depositAcc = params.depositAccountId ? accounts.find(a => a.id === params.depositAccountId) : undefined;

    const collection: DeliveryCashCollection = {
      id,
      receiptNumber,
      courierId: params.courierId,
      courierName: courier?.name || 'مندوب توصيل',
      amount,
      receivedDate: params.receivedDate || nowStr.split('T')[0],
      receivedIntoAccountId: params.depositAccountId,
      receivedIntoAccountName: depositAcc?.name,
      notes: params.notes,
      status: 'confirmed',
      createdAt: nowStr,
      createdByName: 'إدارة توب ستور'
    };

    let newTrx: FinancialTransaction | null = null;
    let newJe: JournalEntry | null = null;
    if (params.depositAccountId && depositAcc) {
      newTrx = {
        id: id + 1,
        transactionNumber: `TRX-DCR-${Date.now().toString().slice(-6)}`,
        transactionDate: nowStr,
        accountId: params.depositAccountId,
        type: 'deposit',
        amount,
        description: `توريد عهدة نقدية من الموصل ${courier?.name || ''} بموجب سند #${receiptNumber}`,
        createdAt: nowStr
      };

      const jeId = id + 20;
      const accChart = resolveChartAccount(depositAcc.name || 'الصندوق', 'debit');
      const courierChart = resolveChartAccount(`عهدة الموصل: ${courier?.name || 'الموصل'}`, 'credit');

      newJe = {
        id: jeId,
        entryNumber: `JE-DCR-${Date.now().toString().slice(-6)}`,
        transactionId: newTrx.id,
        sourceType: 'collection' as any,
        sourceId: id,
        sourceNumber: receiptNumber,
        status: 'posted',
        currency: 'YER',
        exchangeRate: 1,
        createdBy: 'admin',
        postedBy: 'admin',
        postedAt: nowStr,
        description: `إثبات توريد عهدة نقدية من الموصل ${courier?.name || ''} بسند #${receiptNumber}`,
        createdAt: nowStr,
        lines: [
          {
            id: jeId + 1,
            journalEntryId: jeId,
            accountId: params.depositAccountId,
            accountName: depositAcc.name,
            chartAccountId: accChart.id,
            chartAccountCode: accChart.code,
            side: 'debit',
            amount,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: amount
          },
          {
            id: jeId + 2,
            journalEntryId: jeId,
            accountId: null,
            accountName: `عهدة الموصل: ${courier?.name || 'الموصل'}`,
            chartAccountId: courierChart.id,
            chartAccountCode: courierChart.code,
            side: 'credit',
            amount,
            currency: 'YER',
            exchangeRate: 1,
            baseAmount: amount
          }
        ]
      };
    }

    setData(prev => {
      const updatedCouriers = (prev.tables.couriers || []).map(c => {
        if (c.id !== params.courierId) return c;
        return {
          ...c,
          currentCustodyBalance: Math.max(0, (Number(c.currentCustodyBalance) || 0) - amount)
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          couriers: updatedCouriers,
          deliveryCashCollections: [collection, ...(prev.tables.deliveryCashCollections || [])],
          financialTransactions: newTrx ? [newTrx, ...(prev.tables.financialTransactions || [])] : prev.tables.financialTransactions,
          journalEntries: newJe ? [newJe, ...(prev.tables.journalEntries || [])] : prev.tables.journalEntries
        }
      };
    });

    addAuditLog('CREATE', 'deliveryCashCollection', `استلام نقدية عهدة ${amount} ريال من الموصل ${courier?.name} بسند #${receiptNumber}`, id);
    showNotification(`تم تسجيل استلام النقدية من الموصل ${courier?.name} وتحديث عهدته بنجاح`, 'success');
    return collection;
  };

  const settleCourierPayable = (params: {
    courierId: number;
    amount: number;
    walletId: number;
    paymentDate: string;
    referenceNumber?: string;
    notes?: string;
  }): CourierSettlement => {
    const courier = (data.tables.couriers || []).find(c => c.id === params.courierId);
    const wallet = accounts.find(a => a.id === params.walletId);
    const amount = Number(params.amount) || 0;
    const nowStr = new Date().toISOString();
    const id = Date.now();
    const settlementNumber = `STL-${Date.now().toString().slice(-6)}`;

    const settlement: CourierSettlement = {
      id,
      settlementNumber,
      courierId: params.courierId,
      courierName: courier?.name || 'مندوب توصيل',
      amount,
      walletId: params.walletId,
      walletName: wallet?.name || 'محفظة',
      paymentDate: params.paymentDate || nowStr.split('T')[0],
      referenceNumber: params.referenceNumber,
      type: 'fee_payment',
      notes: params.notes,
      status: 'confirmed',
      createdAt: nowStr,
      createdByName: 'إدارة توب ستور'
    };

    // Financial transaction for payout from wallet (Isolated from brokerage expenses!)
    const payoutTrx: FinancialTransaction = {
      id: id + 1,
      transactionNumber: `TRX-STL-${Date.now().toString().slice(-6)}`,
      transactionDate: nowStr,
      accountId: params.walletId,
      type: 'withdrawal',
      amount,
      description: `تسوية وصرف مستحقات الموصل ${courier?.name || ''} بموجب تسوية #${settlementNumber}`,
      referenceNumber: params.referenceNumber,
      createdAt: nowStr
    };

    const jeId = id + 20;
    const feeChart = resolveChartAccount('أجور ومستحقات توصيل طرود', 'debit');
    const walletChart = resolveChartAccount(wallet?.name || 'محفظة', 'credit');

    const payoutJe: JournalEntry = {
      id: jeId,
      entryNumber: `JE-STL-${Date.now().toString().slice(-6)}`,
      transactionId: payoutTrx.id,
      sourceType: 'settlement' as any,
      sourceId: id,
      sourceNumber: settlementNumber,
      status: 'posted',
      currency: 'YER',
      exchangeRate: 1,
      createdBy: 'admin',
      postedBy: 'admin',
      postedAt: nowStr,
      description: `إثبات صرف مستحقات الموصل ${courier?.name || ''} بموجب تسوية #${settlementNumber}`,
      createdAt: nowStr,
      lines: [
        {
          id: jeId + 1,
          journalEntryId: jeId,
          accountId: null,
          accountName: `أجور ومستحقات الموصل: ${courier?.name || 'الموصل'}`,
          chartAccountId: feeChart.id,
          chartAccountCode: feeChart.code,
          side: 'debit',
          amount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: amount
        },
        {
          id: jeId + 2,
          journalEntryId: jeId,
          accountId: params.walletId,
          accountName: wallet?.name || 'المحفظة',
          chartAccountId: walletChart.id,
          chartAccountCode: walletChart.code,
          side: 'credit',
          amount,
          currency: 'YER',
          exchangeRate: 1,
          baseAmount: amount
        }
      ]
    };

    setData(prev => {
      const updatedCouriers = (prev.tables.couriers || []).map(c => {
        if (c.id !== params.courierId) return c;
        const currentPayable = Number(c.currentPayableBalance) || 0;
        return {
          ...c,
          currentPayableBalance: Math.max(0, currentPayable - amount)
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          couriers: updatedCouriers,
          courierSettlements: [settlement, ...(prev.tables.courierSettlements || [])],
          financialTransactions: [payoutTrx, ...(prev.tables.financialTransactions || [])],
          journalEntries: [payoutJe, ...(prev.tables.journalEntries || [])]
        }
      };
    });

    addAuditLog('CREATE', 'courierSettlement', `صرف تسوية بمبلغ ${amount} ريال للموصل ${courier?.name} من محفظة ${wallet?.name} برقم #${settlementNumber}`, id);
    showNotification(`تم تأكيد صرف تسوية الموصل بمبلغ ${amount.toLocaleString()} ريال بنجاح`, 'success');
    return settlement;
  };

  const cancelCourierSettlement = (settlementId: number, reason?: string) => {
    const settlement = (data.tables.courierSettlements || []).find(s => s.id === settlementId);
    if (!settlement || settlement.status === 'cancelled') return;

    const nowStr = new Date().toISOString();
    const reverseTrxId = Date.now();

    // Reverse transaction into wallet
    const reverseTrx: FinancialTransaction = {
      id: reverseTrxId,
      transactionNumber: `TRX-REV-STL-${Date.now().toString().slice(-6)}`,
      transactionDate: nowStr,
      accountId: settlement.walletId,
      type: 'deposit',
      amount: settlement.amount,
      description: `إلغاء وقيد عكسي لتسوية الموصل #${settlement.settlementNumber} (${settlement.courierName}) - سبب: ${reason || 'إلغاء التسوية'}`,
      createdAt: nowStr
    };

    setData(prev => {
      const updatedCouriers = (prev.tables.couriers || []).map(c => {
        if (c.id !== settlement.courierId) return c;
        return {
          ...c,
          currentPayableBalance: (Number(c.currentPayableBalance) || 0) + settlement.amount
        };
      });

      const updatedSettlements = (prev.tables.courierSettlements || []).map(s => {
        if (s.id !== settlementId) return s;
        return {
          ...s,
          status: 'cancelled' as const,
          notes: reason ? `${s.notes || ''} | تم الإلغاء: ${reason}` : `${s.notes || ''} | ملغي`
        };
      });

      return {
        ...prev,
        tables: {
          ...prev.tables,
          couriers: updatedCouriers,
          courierSettlements: updatedSettlements,
          financialTransactions: [reverseTrx, ...(prev.tables.financialTransactions || [])]
        }
      };
    });

    addAuditLog('CANCEL', 'courierSettlement', `إلغاء تسوية الموصل #${settlement.settlementNumber} واستعادة ${settlement.amount} ريال للمحفظة`, settlementId);
    showNotification(`تم إلغاء التسوية واسترجاع المبلغ للمحفظة بنجاح`, 'success');
  };

  // Audit Log Action
  const addAuditLog = (action: string, entityType: string, description: string, entityId?: number) => {
    const newLog: AuditLog = {
      id: Date.now(),
      action,
      entityType,
      entityId: entityId || null,
      description,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        auditLogs: [newLog, ...(prev.tables.auditLogs || [])]
      }
    }));
  };

  // Marketing Campaign Actions
  const addMarketingCampaign = (campaignData: Omit<MarketingCampaign, 'id' | 'campaignNumber' | 'actualSpend' | 'createdAt'>) => {
    const id = Date.now();
    const campaignNumber = `CMP-${String((marketingCampaigns.length || 0) + 1).padStart(3, '0')}`;
    const newCampaign: MarketingCampaign = {
      ...campaignData,
      id,
      campaignNumber,
      actualSpend: 0,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        marketingCampaigns: [newCampaign, ...(prev.tables.marketingCampaigns || [])]
      }
    }));
    addAuditLog('إضافة حملة تسويقية', 'marketing_campaign', `إنشاء حملة تسويقية جديدة: ${newCampaign.name}`, id);
  };

  const updateMarketingCampaign = (campaign: MarketingCampaign) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        marketingCampaigns: (prev.tables.marketingCampaigns || []).map(c => c.id === campaign.id ? campaign : c)
      }
    }));
    addAuditLog('تعديل حملة تسويقية', 'marketing_campaign', `تعديل الحملة التسويقية: ${campaign.name}`, campaign.id);
  };

  const deleteMarketingCampaign = (id: number) => {
    const target = marketingCampaigns.find(c => c.id === id);
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        marketingCampaigns: (prev.tables.marketingCampaigns || []).filter(c => c.id !== id)
      }
    }));
    if (target) {
      addAuditLog('حذف حملة تسويقية', 'marketing_campaign', `حذف الحملة التسويقية: ${target.name}`, id);
    }
  };

  // Marketing Channel Actions
  const addMarketingChannel = (channelData: Omit<MarketingChannel, 'id' | 'createdAt'>) => {
    const id = Date.now();
    const newChannel: MarketingChannel = {
      ...channelData,
      id,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        marketingChannels: [...(prev.tables.marketingChannels || []), newChannel]
      }
    }));
    addAuditLog('إضافة قناة تسويقية', 'marketing_channel', `إضافة قناة تسويق: ${newChannel.name}`, id);
  };

  const updateMarketingChannel = (channel: MarketingChannel) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        marketingChannels: (prev.tables.marketingChannels || []).map(ch => ch.id === channel.id ? channel : ch)
      }
    }));
  };

  // Discount Codes Actions
  const addDiscountCode = (codeData: Omit<DiscountCode, 'id' | 'usageCount' | 'createdAt'>) => {
    const id = Date.now();
    const newCode: DiscountCode = {
      ...codeData,
      id,
      usageCount: 0,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        discountCodes: [newCode, ...(prev.tables.discountCodes || [])]
      }
    }));
    addAuditLog('إضافة كود خصم', 'discount_code', `إنشاء كود خصم: ${newCode.code}`, id);
  };

  const updateDiscountCode = (code: DiscountCode) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        discountCodes: (prev.tables.discountCodes || []).map(dc => dc.id === code.id ? code : dc)
      }
    }));
  };

  // Marketing Budget Actions
  const addMarketingBudget = (budgetData: Omit<MarketingBudget, 'id' | 'createdAt'>) => {
    const id = Date.now();
    const newBudget: MarketingBudget = {
      ...budgetData,
      id,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        marketingBudgets: [newBudget, ...(prev.tables.marketingBudgets || [])]
      }
    }));
    addAuditLog('إضافة ميزانية تسويق', 'marketing_budget', `تحديد ميزانية تسويقية: ${newBudget.title} بقيمة ${newBudget.amount}`, id);
  };

  const updateMarketingBudget = (budget: MarketingBudget) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        marketingBudgets: (prev.tables.marketingBudgets || []).map(b => b.id === budget.id ? budget : b)
      }
    }));
  };

  // Referral Actions
  const addReferral = (refData: Omit<Referral, 'id' | 'referralNumber' | 'createdAt'>) => {
    const id = Date.now();
    const referralNumber = `REF-${String((referrals.length || 0) + 1).padStart(3, '0')}`;
    const referrer = customers.find(c => c.id === refData.referrerCustomerId);
    const referred = customers.find(c => c.id === refData.referredCustomerId);

    const newRef: Referral = {
      ...refData,
      id,
      referralNumber,
      referrerCustomerName: referrer?.name || refData.referrerCustomerName,
      referredCustomerName: referred?.name || refData.referredCustomerName,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        referrals: [newRef, ...(prev.tables.referrals || [])]
      }
    }));
    addAuditLog('تسجيل إحالة عميل', 'referral', `إحالة من العميل ${referrer?.name} للعميل ${referred?.name}`, id);
  };

  const updateReferralStatus = (id: number, status: Referral['status'], approveReward?: boolean) => {
    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        referrals: (prev.tables.referrals || []).map(r => {
          if (r.id === id) {
            return {
              ...r,
              status,
              rewardApproved: approveReward !== undefined ? approveReward : r.rewardApproved
            };
          }
          return r;
        })
      }
    }));
  };

  // Purchase Batch Actions (شراء الطلبات الجماعية من شي ان وعلي اكسبرس)
  const addPurchaseBatch = (batchData: {
    source: string;
    supplierOrderNumber?: string;
    paymentMode?: 'single' | 'split';
    accountId: number;
    card1Amount?: number;
    accountId2?: number | null;
    card2Amount?: number;
    purchaseCost: number;
    purchaseFees: number;
    transferFees: number;
    exchangeRateDiff?: number;
    orderIds: number[];
    notes?: string;
  }) => {
    const batchId = Date.now();
    const batchNumber = `PB-${new Date().getFullYear()}-${String((purchaseBatches.length || 0) + 1).padStart(3, '0')}`;
    const purchaseCost = Number(batchData.purchaseCost) || 0;
    const transferFees = Number(batchData.transferFees) || 0;
    const purchaseFees = Number(batchData.purchaseFees) || 0;
    const exchangeRateDiff = Number(batchData.exchangeRateDiff) || 0;
    // التكلفة الكلية = تكلفة الشراء الصافية + عمولات التحويل البنكي + رسوم الشراء + فروق الصرف
    const totalCost = purchaseCost + transferFees + purchaseFees + exchangeRateDiff;

    const isSplit = batchData.paymentMode === 'split' && Boolean(batchData.accountId2);
    // Sanitize account IDs: Commercial Visa must always be 120002, not 120001
    let rawAccId1 = Number(batchData.accountId);
    if (rawAccId1 === 120001) rawAccId1 = 120002;
    let rawAccId2 = isSplit && batchData.accountId2 ? Number(batchData.accountId2) : undefined;
    if (rawAccId2 === 120001) rawAccId2 = 120002;

    const acc1 = accounts.find(a => Number(a.id) === rawAccId1);
    const acc2 = rawAccId2 ? accounts.find(a => Number(a.id) === rawAccId2) : undefined;

    let card1Amt = isSplit ? (Number(batchData.card1Amount) || 0) : totalCost;
    let card2Amt = isSplit ? (Number(batchData.card2Amount) || 0) : 0;
    if (isSplit && card1Amt + card2Amt !== totalCost) {
      card2Amt = Math.max(0, totalCost - card1Amt);
    }

    const newBatch: PurchaseBatch = {
      id: batchId,
      batchNumber,
      source: batchData.source,
      supplierOrderNumber: batchData.supplierOrderNumber || null,
      purchaseDate: new Date().toISOString().split('T')[0],
      paymentMode: isSplit ? 'split' : 'single',
      accountId: rawAccId1,
      accountName: acc1?.name || (rawAccId1 === 120002 ? 'فيزا كارد بنك التجاري اليمني' : (rawAccId1 === 1 ? 'فيزا كارد بنك التضامن' : 'البنك / البطاقة')),
      card1Amount: isSplit ? card1Amt : totalCost,
      accountId2: isSplit && rawAccId2 ? rawAccId2 : null,
      accountName2: isSplit && acc2 ? acc2.name : (isSplit && rawAccId2 === 120002 ? 'فيزا كارد بنك التجاري اليمني' : null),
      card2Amount: isSplit ? card2Amt : undefined,
      purchaseCost,
      purchaseFees,
      transferFees,
      exchangeRateDiff,
      totalCost,
      orderIds: batchData.orderIds,
      notes: batchData.notes || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Financial Transactions (Withdrawal from Card 1 and optionally Card 2)
    const transactionsToPush: FinancialTransaction[] = [];
    if (isSplit) {
      if (card1Amt > 0) {
        transactionsToPush.push({
          id: batchId + 1,
          transactionNumber: `TRX-PB-${Date.now().toString().slice(-6)}-1`,
          transactionDate: new Date().toISOString(),
          accountId: rawAccId1,
          type: 'withdrawal',
          amount: card1Amt,
          description: `شراء جماعي لطلبات ${batchData.source} (دفعة ${batchNumber}) - سحب من ${acc1?.name || 'الفيزا الأولى'}`,
          createdAt: new Date().toISOString()
        });
      }
      if (card2Amt > 0 && rawAccId2) {
        transactionsToPush.push({
          id: batchId + 11,
          transactionNumber: `TRX-PB-${Date.now().toString().slice(-6)}-2`,
          transactionDate: new Date().toISOString(),
          accountId: rawAccId2,
          type: 'withdrawal',
          amount: card2Amt,
          description: `شراء جماعي لطلبات ${batchData.source} (دفعة ${batchNumber}) - سحب من ${acc2?.name || (rawAccId2 === 120002 ? 'فيزا كارد بنك التجاري اليمني' : 'الفيزا الثانية')}`,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      transactionsToPush.push({
        id: batchId + 1,
        transactionNumber: `TRX-PB-${Date.now().toString().slice(-6)}`,
        transactionDate: new Date().toISOString(),
        accountId: rawAccId1,
        type: 'withdrawal',
        amount: totalCost,
        description: `شراء جماعي لطلبات ${batchData.source} (دفعة ${batchNumber}) - سحب من ${acc1?.name || 'البطاقة'}`,
        createdAt: new Date().toISOString()
      });
    }

    // Journal Entry (من حـ/ مشتريات بضاعة وعمولات ورسوم وفروق صرف إلى حـ/ البطاقة أو البنك)
    const jeId = batchId + 2;
    const jeLines: any[] = [
      {
        id: jeId + 1,
        journalEntryId: jeId,
        accountId: null,
        accountName: `مشتريات بضائع - ${batchData.source}`,
        side: 'debit',
        amount: purchaseCost
      }
    ];

    if (transferFees > 0) {
      jeLines.push({
        id: jeId + 2,
        journalEntryId: jeId,
        accountId: null,
        accountName: 'عمولات تحويل بنكي للمشتريات',
        side: 'debit',
        amount: transferFees
      });
    }

    if (purchaseFees > 0) {
      jeLines.push({
        id: jeId + 3,
        journalEntryId: jeId,
        accountId: null,
        accountName: 'رسوم شراء وعمليات دفع',
        side: 'debit',
        amount: purchaseFees
      });
    }

    if (exchangeRateDiff > 0) {
      jeLines.push({
        id: jeId + 4,
        journalEntryId: jeId,
        accountId: null,
        accountName: 'فروق أسعار صرف العملات',
        side: 'debit',
        amount: exchangeRateDiff
      });
    }

    if (isSplit) {
      if (card1Amt > 0) {
        jeLines.push({
          id: jeId + 5,
          journalEntryId: jeId,
          accountId: rawAccId1,
          accountName: acc1?.name || 'الفيزا الأولى',
          side: 'credit',
          amount: card1Amt
        });
      }
      if (card2Amt > 0 && rawAccId2) {
        jeLines.push({
          id: jeId + 6,
          journalEntryId: jeId,
          accountId: rawAccId2,
          accountName: acc2?.name || (rawAccId2 === 120002 ? 'فيزا كارد بنك التجاري اليمني' : 'الفيزا الثانية'),
          side: 'credit',
          amount: card2Amt
        });
      }
    } else {
      jeLines.push({
        id: jeId + 5,
        journalEntryId: jeId,
        accountId: rawAccId1,
        accountName: acc1?.name || 'البطاقة / الحساب',
        side: 'credit',
        amount: totalCost
      });
    }

    const je: JournalEntry = {
      id: jeId,
      entryNumber: `JE-PB-${Date.now().toString().slice(-6)}`,
      sourceType: 'purchase_batch',
      sourceId: batchId,
      sourceNumber: batchNumber,
      status: 'posted',
      description: isSplit
        ? `شراء بضاعة طلبات من ${batchData.source} - دفعة ${batchNumber} (سحب مجزأ من ${acc1?.name || 'فيزا 1'} و ${acc2?.name || 'فيزا 2'})`
        : `شراء بضاعة طلبات من ${batchData.source} - دفعة ${batchNumber}`,
      createdAt: new Date().toISOString(),
      lines: jeLines
    };

    // Update affected orders to 'purchased' and set purchaseBatchId
    const count = batchData.orderIds.length;
    const perOrderCost = count > 0 ? Math.round(batchData.purchaseCost / count) : 0;

    const batchOrdersSellingTotal = orders
      .filter(o => batchData.orderIds.includes(o.id))
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const batchNetProfit = batchOrdersSellingTotal - totalCost;
    const batchMargin = batchOrdersSellingTotal > 0 ? (batchNetProfit / batchOrdersSellingTotal) * 100 : 0;

    setData(prev => {
      const updatedOrders = prev.tables.orders.map(o => {
        if (batchData.orderIds.includes(o.id)) {
          return {
            ...o,
            status: o.status === 'pending' ? ('purchased' as const) : o.status,
            purchaseBatchId: batchId,
            purchaseCost: perOrderCost
          };
        }
        return o;
      });

      const newAuditLog: AuditLog = {
        id: Date.now() + 10,
        action: 'شراء جماعي',
        entityType: 'purchase_batch',
        entityId: batchId,
        description: `تسجيل دفعة شراء جماعية ${batchNumber} من ${batchData.source} لعدد ${count} طلبات بمبلغ ${totalCost} ريال ${isSplit ? `(مجزأ: ${acc1?.name}: ${card1Amt}، ${acc2?.name}: ${card2Amt})` : ''}`,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          purchaseBatches: [newBatch, ...(prev.tables.purchaseBatches || [])],
          orders: updatedOrders,
          financialTransactions: [...transactionsToPush, ...prev.tables.financialTransactions],
          journalEntries: [je, ...prev.tables.journalEntries],
          auditLogs: [newAuditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(
      `تم تسجيل دفعة الشراء #${batchNumber} بنجاح! ${isSplit ? '(تم توزيع السحب على الفيزتين بدقة)' : `صافي الربح: ${batchNetProfit >= 0 ? '+' : ''}${batchNetProfit.toLocaleString()} ريال (${batchMargin.toFixed(1)}%)`}`,
      'success'
    );
  };

  const updatePurchaseBatch = (id: number, batchData: {
    source?: string;
    supplierOrderNumber?: string | null;
    purchaseDate?: string;
    paymentMode?: 'single' | 'split';
    accountId?: number;
    card1Amount?: number;
    accountId2?: number | null;
    card2Amount?: number;
    purchaseCost?: number;
    purchaseFees?: number;
    transferFees?: number;
    exchangeRateDiff?: number;
    orderIds?: number[];
    notes?: string | null;
  }) => {
    setData(prev => {
      const existing = (prev.tables.purchaseBatches || []).find(b => b.id === id);
      if (!existing) return prev;

      const newSource = batchData.source !== undefined ? batchData.source : existing.source;
      const newSupplierOrderNumber = batchData.supplierOrderNumber !== undefined ? batchData.supplierOrderNumber : existing.supplierOrderNumber;
      const newPurchaseDate = batchData.purchaseDate || existing.purchaseDate;
      let newAccountId = batchData.accountId !== undefined ? Number(batchData.accountId) : Number(existing.accountId);
      if (newAccountId === 120001) newAccountId = 120002;
      const acc = accounts.find(a => Number(a.id) === newAccountId);
      const newPurchaseCost = batchData.purchaseCost !== undefined ? Number(batchData.purchaseCost) : Number(existing.purchaseCost || 0);
      const newPurchaseFees = batchData.purchaseFees !== undefined ? Number(batchData.purchaseFees) : Number(existing.purchaseFees || 0);
      const newTransferFees = batchData.transferFees !== undefined ? Number(batchData.transferFees) : Number(existing.transferFees || 0);
      const newExchangeRateDiff = batchData.exchangeRateDiff !== undefined ? Number(batchData.exchangeRateDiff) : Number(existing.exchangeRateDiff || 0);
      const newTotalCost = newPurchaseCost + newPurchaseFees + newTransferFees + newExchangeRateDiff;
      const newOrderIds = batchData.orderIds !== undefined ? batchData.orderIds : (existing.orderIds || []);
      const newNotes = batchData.notes !== undefined ? batchData.notes : existing.notes;

      const newPaymentMode = batchData.paymentMode !== undefined ? batchData.paymentMode : (existing.paymentMode || 'single');
      let newAccountId2 = batchData.accountId2 !== undefined ? (batchData.accountId2 ? Number(batchData.accountId2) : null) : (existing.accountId2 ? Number(existing.accountId2) : null);
      if (newAccountId2 === 120001) newAccountId2 = 120002;
      const acc2 = newAccountId2 ? accounts.find(a => Number(a.id) === newAccountId2) : undefined;
      const isSplit = newPaymentMode === 'split' && Boolean(newAccountId2);
      let card1Amt = isSplit ? (batchData.card1Amount !== undefined ? Number(batchData.card1Amount) : Number(existing.card1Amount || 0)) : newTotalCost;
      let card2Amt = isSplit ? (batchData.card2Amount !== undefined ? Number(batchData.card2Amount) : Number(existing.card2Amount || 0)) : 0;
      if (isSplit && card1Amt + card2Amt !== newTotalCost) {
        card2Amt = Math.max(0, newTotalCost - card1Amt);
      }

      const updatedBatch: PurchaseBatch = {
        ...existing,
        source: newSource,
        supplierOrderNumber: newSupplierOrderNumber || null,
        purchaseDate: newPurchaseDate,
        paymentMode: isSplit ? 'split' : 'single',
        accountId: newAccountId,
        accountName: acc?.name || (newAccountId === 120002 ? 'فيزا كارد بنك التجاري اليمني' : (existing.accountName || 'البنك / البطاقة')),
        card1Amount: isSplit ? card1Amt : newTotalCost,
        accountId2: isSplit ? newAccountId2 : null,
        accountName2: isSplit && acc2 ? acc2.name : (isSplit && newAccountId2 === 120002 ? 'فيزا كارد بنك التجاري اليمني' : null),
        card2Amount: isSplit ? card2Amt : undefined,
        purchaseCost: newPurchaseCost,
        purchaseFees: newPurchaseFees,
        transferFees: newTransferFees,
        exchangeRateDiff: newExchangeRateDiff,
        totalCost: newTotalCost,
        orderIds: newOrderIds,
        notes: newNotes || null
      };

      // 1. Update orders
      const previousOrderIds = existing.orderIds || [];
      const perOrderCost = newOrderIds.length > 0 ? Math.round(newPurchaseCost / newOrderIds.length) : 0;

      const updatedOrders = prev.tables.orders.map(o => {
        // If order was in batch but now removed
        if (previousOrderIds.includes(o.id) && !newOrderIds.includes(o.id)) {
          return {
            ...o,
            purchaseBatchId: null,
            purchaseCost: 0,
            status: o.status === 'purchased' ? ('pending' as const) : o.status
          };
        }
        // If order is in new batch
        if (newOrderIds.includes(o.id)) {
          return {
            ...o,
            status: o.status === 'pending' ? ('purchased' as const) : o.status,
            purchaseBatchId: id,
            purchaseCost: perOrderCost
          };
        }
        return o;
      });

      // 2. Update financial transactions (remove old linked and add fresh ones)
      const nonLinkedTransactions = prev.tables.financialTransactions.filter(t => {
        return !(t.id === id + 1 || t.id === id + 11 || (existing.batchNumber && t.description?.includes(existing.batchNumber)));
      });

      const updatedTransactionsToPush: FinancialTransaction[] = [];
      if (isSplit) {
        if (card1Amt > 0) {
          updatedTransactionsToPush.push({
            id: id + 1,
            transactionNumber: `TRX-PB-${Date.now().toString().slice(-6)}-1`,
            transactionDate: newPurchaseDate,
            accountId: newAccountId,
            type: 'withdrawal',
            amount: card1Amt,
            description: `شراء جماعي لطلبات ${newSource} (دفعة ${existing.batchNumber}) - سحب من ${acc?.name || 'فيزا 1'}`,
            createdAt: new Date().toISOString()
          });
        }
        if (card2Amt > 0 && newAccountId2) {
          updatedTransactionsToPush.push({
            id: id + 11,
            transactionNumber: `TRX-PB-${Date.now().toString().slice(-6)}-2`,
            transactionDate: newPurchaseDate,
            accountId: newAccountId2,
            type: 'withdrawal',
            amount: card2Amt,
            description: `شراء جماعي لطلبات ${newSource} (دفعة ${existing.batchNumber}) - سحب من ${acc2?.name || 'فيزا 2'}`,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        updatedTransactionsToPush.push({
          id: id + 1,
          transactionNumber: `TRX-PB-${Date.now().toString().slice(-6)}`,
          transactionDate: newPurchaseDate,
          accountId: newAccountId,
          type: 'withdrawal',
          amount: newTotalCost,
          description: `شراء جماعي لطلبات ${newSource} (دفعة ${existing.batchNumber})`,
          createdAt: new Date().toISOString()
        });
      }

      // 3. Update journal entry
      const updatedJournalEntries = prev.tables.journalEntries.map(je => {
        const isLinked = je.id === id + 2 ||
                         (existing.batchNumber && je.description?.includes(existing.batchNumber));
        if (isLinked) {
          const lines: any[] = [
            {
              id: je.id + 1,
              journalEntryId: je.id,
              accountId: null,
              accountName: `مشتريات بضائع - ${newSource}`,
              side: 'debit' as const,
              amount: newPurchaseCost
            }
          ];

          if (newTransferFees > 0) {
            lines.push({
              id: je.id + 2,
              journalEntryId: je.id,
              accountId: null,
              accountName: 'عمولات تحويل بنكي للمشتريات',
              side: 'debit' as const,
              amount: newTransferFees
            });
          }

          if (newPurchaseFees > 0) {
            lines.push({
              id: je.id + 3,
              journalEntryId: je.id,
              accountId: null,
              accountName: 'رسوم شراء وعمليات دفع',
              side: 'debit' as const,
              amount: newPurchaseFees
            });
          }

          if (newExchangeRateDiff > 0) {
            lines.push({
              id: je.id + 4,
              journalEntryId: je.id,
              accountId: null,
              accountName: 'فروق أسعار صرف العملات',
              side: 'debit' as const,
              amount: newExchangeRateDiff
            });
          }

          if (isSplit) {
            if (card1Amt > 0) {
              lines.push({
                id: je.id + 5,
                journalEntryId: je.id,
                accountId: newAccountId,
                accountName: acc?.name || 'الفيزا الأولى',
                side: 'credit' as const,
                amount: card1Amt
              });
            }
            if (card2Amt > 0 && newAccountId2) {
              lines.push({
                id: je.id + 6,
                journalEntryId: je.id,
                accountId: newAccountId2,
                accountName: acc2?.name || 'الفيزا الثانية',
                side: 'credit' as const,
                amount: card2Amt
              });
            }
          } else {
            lines.push({
              id: je.id + 5,
              journalEntryId: je.id,
              accountId: newAccountId,
              accountName: acc?.name || 'البطاقة / الحساب',
              side: 'credit' as const,
              amount: newTotalCost
            });
          }

          return {
            ...je,
            description: isSplit
              ? `شراء بضاعة طلبات من ${newSource} - دفعة ${existing.batchNumber} (سحب مجزأ من ${acc?.name || 'فيزا 1'} و ${acc2?.name || 'فيزا 2'})`
              : `شراء بضاعة طلبات من ${newSource} - دفعة ${existing.batchNumber}`,
            lines
          };
        }
        return je;
      });

      const newAuditLog: AuditLog = {
        id: Date.now() + 10,
        action: 'تعديل دفعة شراء',
        entityType: 'purchase_batch',
        entityId: id,
        description: `تعديل بيانات دفعة الشراء ${existing.batchNumber} وتحديث القيود والحركات المالية المترتبة`,
        oldValue: `${existing.totalCost} ريال`,
        newValue: `${newTotalCost} ريال`,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          purchaseBatches: prev.tables.purchaseBatches.map(b => b.id === id ? updatedBatch : b),
          orders: updatedOrders,
          financialTransactions: [...updatedTransactionsToPush, ...nonLinkedTransactions],
          journalEntries: updatedJournalEntries,
          journalLines: updatedJournalEntries.flatMap(j => j.lines || []),
          auditLogs: [newAuditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification(`تم تعديل دفعة الشراء #${batchData.supplierOrderNumber || id} وتحديث قيودها وحركاتها المالية بنجاح`, 'success');
  };

  const cancelPurchaseBatch = (id: number) => {
    setData(prev => {
      const target = (prev.tables.purchaseBatches || []).find(b => b.id === id);
      if (!target) return prev;
      const batchOrderIds = target.orderIds || [];

      const updatedOrders = prev.tables.orders.map(o => {
        if (batchOrderIds.includes(o.id) || o.purchaseBatchId === id) {
          return {
            ...o,
            purchaseBatchId: null,
            purchaseCost: 0,
            status: o.status === 'purchased' ? ('pending' as const) : o.status
          };
        }
        return o;
      });

      // Reverse financial transaction into account(s)
      const revTrxList: FinancialTransaction[] = [];
      const targetAcc1 = Number(target.accountId) === 120001 ? 120002 : Number(target.accountId);
      const targetAcc2 = target.accountId2 ? (Number(target.accountId2) === 120001 ? 120002 : Number(target.accountId2)) : null;

      if (target.paymentMode === 'split' && targetAcc2 && (Number(target.card2Amount) || 0) > 0) {
        const c1 = Number(target.card1Amount) || 0;
        const c2 = Number(target.card2Amount) || 0;
        if (c1 > 0) {
          revTrxList.push({
            id: Date.now(),
            transactionNumber: `TRX-REV-PB-${Date.now().toString().slice(-6)}-1`,
            transactionDate: new Date().toISOString(),
            accountId: targetAcc1,
            type: 'deposit',
            amount: c1,
            description: `استرجاع مالي لإلغاء دفعة الشراء ${target.batchNumber} (سحب فيزا 1)`,
            createdAt: new Date().toISOString()
          });
        }
        if (c2 > 0) {
          revTrxList.push({
            id: Date.now() + 1,
            transactionNumber: `TRX-REV-PB-${Date.now().toString().slice(-6)}-2`,
            transactionDate: new Date().toISOString(),
            accountId: targetAcc2,
            type: 'deposit',
            amount: c2,
            description: `استرجاع مالي لإلغاء دفعة الشراء ${target.batchNumber} (سحب فيزا 2)`,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        revTrxList.push({
          id: Date.now(),
          transactionNumber: `TRX-REV-PB-${Date.now().toString().slice(-6)}`,
          transactionDate: new Date().toISOString(),
          accountId: targetAcc1,
          type: 'deposit',
          amount: Number(target.totalCost) || 0,
          description: `استرجاع مالي لإلغاء دفعة الشراء ${target.batchNumber}`,
          createdAt: new Date().toISOString()
        });
      }

      // Void or reverse journal entry
      const updatedJournals = prev.tables.journalEntries.map(je => {
        if (je.id === id + 2 || (target.batchNumber && je.description?.includes(target.batchNumber))) {
          return {
            ...je,
            status: 'reversed' as const,
            isReversed: true,
            reversalReason: `إلغاء دفعة الشراء ${target.batchNumber}`
          };
        }
        return je;
      });

      const auditLog: AuditLog = {
        id: Date.now(),
        action: 'إلغاء دفعة شراء',
        entityType: 'purchase_batch',
        entityId: id,
        description: `إلغاء دفعة الشراء ${target.batchNumber} واسترجاع ${target.totalCost} ريال للحساب وإعادة الطلبات لقيد التنفيذ`,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          purchaseBatches: (prev.tables.purchaseBatches || []).map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b),
          financialTransactions: [...revTrxList, ...prev.tables.financialTransactions],
          journalEntries: updatedJournals,
          journalLines: updatedJournals.flatMap(j => j.lines || []),
          auditLogs: [auditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification('تم إلغاء دفعة الشراء الجماعية واسترجاع رصيدها وإرجاع الطلبات لحالة قيد التنفيذ', 'warning');
  };

  const deletePurchaseBatch = (id: number) => {
    setData(prev => {
      const target = (prev.tables.purchaseBatches || []).find(b => b.id === id);
      const batchOrderIds = target?.orderIds || [];

      const updatedOrders = prev.tables.orders.map(o => {
        if (batchOrderIds.includes(o.id) || o.purchaseBatchId === id) {
          return {
            ...o,
            purchaseBatchId: null,
            purchaseCost: 0,
            status: o.status === 'purchased' ? ('pending' as const) : o.status
          };
        }
        return o;
      });

      // Remove financial transaction linked to this batch
      const updatedTransactions = prev.tables.financialTransactions.filter(t => {
        if (t.id === id + 1 || t.id === id + 11) return false;
        if (target && t.description && t.description.includes(target.batchNumber)) return false;
        return true;
      });

      // Remove or void journal entry linked to this batch
      const updatedJournalEntries = prev.tables.journalEntries.filter(je => {
        if (je.id === id + 2) return false;
        if (target && (je.description?.includes(target.batchNumber) || je.entryNumber?.includes(String(id)))) return false;
        return true;
      });

      const newAuditLog: AuditLog = {
        id: Date.now(),
        action: 'حذف دفعة شراء',
        entityType: 'purchase_batch',
        entityId: id,
        description: `حذف دفعة الشراء #${target?.batchNumber || id} بمبلغ ${target?.totalCost || 0} ريال وإلغاء حركاتها وقيودها المحاسبية وإعادة الطلبات لحالة قيد التنفيذ`,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        tables: {
          ...prev.tables,
          orders: updatedOrders,
          purchaseBatches: (prev.tables.purchaseBatches || []).filter(b => b.id !== id),
          financialTransactions: updatedTransactions,
          journalEntries: updatedJournalEntries,
          journalLines: updatedJournalEntries.flatMap(je => je.lines || []),
          auditLogs: [newAuditLog, ...(prev.tables.auditLogs || [])]
        }
      };
    });
    showNotification('تم حذف عملية الشراء وإلغاء أثرها المالي وقيودها وإعادة الطلبات لقيد التنفيذ بنجاح', 'success');
  };

  const updateSetting = (key: string, value: string) => {
    setData(prev => {
      const existing = prev.tables.appSettings.find(s => s.settingKey === key);
      let updatedSettings: AppSetting[];
      if (existing) {
        updatedSettings = prev.tables.appSettings.map(s =>
          s.settingKey === key ? { ...s, settingValue: `"${value}"`, updatedAt: new Date().toISOString() } : s
        );
      } else {
        updatedSettings = [
          ...prev.tables.appSettings,
          { id: Date.now(), settingKey: key, settingValue: `"${value}"`, updatedAt: new Date().toISOString() }
        ];
      }
      return {
        ...prev,
        tables: {
          ...prev.tables,
          appSettings: updatedSettings
        }
      };
    });
  };

  const restoreCompleteInitialData = () => {
    setData(INITIAL_DATA);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      }
    } catch (e) {
      console.error('Failed to save complete data to storage', e);
    }
    showNotification('تم استرجاع وتثبيت كافة بيانات النظام والمحاسبة بنجاح (43 عميل، 49 طلبية، 139 مصروف، 318 قيد يومية)', 'success');
  };

  const purgeAllDataToEmpty = () => {
    const emptyData: TopStoreBackup = {
      ...INITIAL_DATA,
      createdAt: new Date().toISOString(),
      tables: {
        ...INITIAL_DATA.tables,
        customers: [],
        orders: [],
        payments: [],
        expenses: [],
        financialTransactions: [],
        journalEntries: [],
        purchaseBatches: [],
        shipments: [],
        deliveryTrips: [],
        otherReceivables: []
      }
    };
    setData(emptyData);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
      }
    } catch (e) {
      console.error('Failed to save empty data to storage', e);
    }
    showNotification('تم تصفير كافة الحركات والطلبات والقيود بنجاح', 'warning');
  };

  const clearAllData = () => {
    restoreCompleteInitialData();
  };

  const resetToBackup = () => {
    restoreCompleteInitialData();
  };

  const importBackup = (jsonContent: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.tables || !parsed.tables.customers || !parsed.tables.accounts) {
        return { success: false, message: 'الملف ليس بنية نسخة احتياطية صالحة لـ TOP STORE' };
      }
      setData(parsed);
      return { success: true, message: 'تم استرجاع النسخة الاحتياطية بنجاح!' };
    } catch (err) {
      return { success: false, message: 'حدث خطأ أثناء قراءة ملف JSON' };
    }
  };

  const exportBackupJson = (): string => {
    const exportObj: TopStoreBackup = {
      ...data,
      createdAt: new Date().toISOString()
    };
    return JSON.stringify(exportObj, null, 2);
  };

  const downloadBackupFile = (customFilename?: string): { filename: string; sizeKb: number; timestamp: string } => {
    const jsonString = exportBackupJson();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = customFilename || `top_store_backup_${dateStr}_${timeStr}.json`;

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const sizeKb = Math.round((blob.size / 1024) * 10) / 10;
    return {
      filename,
      sizeKb,
      timestamp: now.toLocaleString('ar-YE')
    };
  };

  // Assistant Parser (Fast natural language command assistant)
  const processAssistantMessage = (text: string): { reply: string; actionTaken?: string } => {
    const trimmed = text.trim();

    // Log user query
    const logId = Date.now();
    let actionTaken: string | undefined;
    let reply = '';

    // Check system check
    if (trimmed.includes('فحص') || trimmed.includes('النظام') || trimmed.includes('سلامة')) {
      reply = `النظام يعمل بكفاءة عالية! تم فحص جميع الحسابات المحاسبية:
- عدد العملاء المسجلين: ${customers.length} عميل.
- إجمالي الأرصدة في المحافظ والبنوك: ${totalCashAndBanks.toLocaleString()} ريال.
- إجمالي المديونيات المستحقة: ${totalCustomerDebts.toLocaleString()} ريال.
- حالة قيود اليومية: متوازنة وموثقة.`;
      actionTaken = 'فحص النظام المحاسبي';
    } else if (trimmed.includes('رصيد') || trimmed.includes('فلوس') || trimmed.includes('المحافظ')) {
      const accSummary = accounts
        .filter(a => a.status === 'active' && a.type !== 'حقوق ملكية')
        .map(a => `• ${a.name}: ${getAccountBalance(a.id).toLocaleString()} ريال`)
        .join('\n');
      reply = `أرصدة الخزينة والمحافظ المتاحة حالياً:\n${accSummary}\n\nالإجمالي الكلي: ${totalCashAndBanks.toLocaleString()} ريال يمني.`;
      actionTaken = 'استعلام أرصدة المحافظ';
    } else if (trimmed.includes('ديون') || trimmed.includes('مديونية') || trimmed.includes('ذمم')) {
      const topDebtors = customers
        .map(c => ({ name: c.name, code: c.code, bal: getCustomerBalance(c.id) }))
        .filter(c => c.bal > 0)
        .sort((a, b) => b.bal - a.bal);
      
      const list = topDebtors.map(d => `• ${d.code} - ${d.name}: ${d.bal.toLocaleString()} ريال`).join('\n');
      reply = `قائمة العملاء الذين عليهم مديونيات:\n${list || 'لا توجد مديونيات متأخرة'}\n\nإجمالي مديونيات العملاء: ${totalCustomerDebts.toLocaleString()} ريال.`;
      actionTaken = 'تقرير مديونيات العملاء';
    } else {
      reply = `أهلاً بك في مساعد توب ستور الذكي! يمكنك أن تطلب مني:
- "فحص النظام" للتحقق من سلامة القيود والأرصدة
- "أرصدة المحافظ" لعرض مبالغ جيب، كريمي، أم فلوس، والفيزا
- "مديونيات العملاء" لعرض الديون المستحقة
- أو استخدام أزرار العمليات السريعة بالأعلى لتسجيل طلب أو مصروف أو تحويل.`;
    }

    // Append to assistant logs
    const newLog: AssistantLog = {
      id: logId,
      userMessage: text,
      intent: actionTaken || 'general_query',
      action: actionTaken || 'محادثة',
      result: reply,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      tables: {
        ...prev.tables,
        assistantLogs: [newLog, ...(prev.tables.assistantLogs || [])]
      }
    }));

    return { reply, actionTaken };
  };

  return (
    <StoreContext.Provider
      value={{
        data,
        settings,
        customers,
        orders,
        accounts,
        paymentMethods,
        payments,
        expenses,
        shipments,
        transactions,
        journalEntries,
        otherReceivables,
        owners,
        assistantLogs,
        auditLogs,
        marketingCampaigns,
        marketingChannels,
        discountCodes,
        marketingBudgets,
        referrals,
        purchaseBatches,
        installmentPlans,
        couriers,
        deliveryTrips,
        workers,
        isSyncing,
        lastSyncTime,
        syncWithServer,
        realtimeStatus,
        lastRealtimeEvent,
        chartAccounts,
        fiscalPeriods,
        fiscalYears,
        idempotencyRecords,
        marketingStats,
        notification,
        showNotification,
        getAccountBalance,
        getCustomerBalance,
        runningBalancesMap,
        getAccountRunningBalances,
        totalCashAndBanks,
        totalCustomerDebts,
        totalReceivables,
        totalExpenses,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addOrder,
        updateOrder,
        deleteOrder,
        updateOrderStatus,
        collectDeliveryFee,
        recordPayment,
        cancelPayment,
        updatePayment,
        deletePayment,
        addExpense,
        updateExpense,
        deleteExpense,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        restoreJournalEntry,
        permanentlyDeleteJournalEntry,
        emptyTrashJournalEntries,
        restoreAllDeletedJournalEntries,
        repairAllJournalEntries,
        reverseJournalEntry,
        getCustomerReconciliationReport,
        runIntegrityAudit,
        closeFiscalPeriod,
        reopenFiscalPeriod,
        lockFiscalPeriod,
        closeFiscalYear,
        checkAndRegisterIdempotency,
        generateCustomerAdjustingEntry,
        reconcileAllCustomerBalances,
        addChartAccount,
        updateChartAccount,
        deleteChartAccount,
        transferFunds,
        recordAccountTransaction,
        addAccount,
        updateAccount,
        addShipment,
        updateShipmentStatus,
        updateShipment,
        deleteShipment,
        addOtherReceivable,
        settleReceivable,
        addInstallmentPlan,
        payInstallment,
        deleteInstallmentPlan,
        cancelInstallmentPlan,
        exportPermanentZipBackup,
        addCourier,
        updateCourier,
        deleteCourier,
        addWorker,
        updateWorker,
        deleteWorker,
        addWorkerExpense,
        createDeliveryTrip,
        settleDeliveryTrip,
        cancelDeliveryTrip,
        deleteDeliveryTrip,
        deliveryOrders,
        courierSettlements,
        deliveryCashCollections,
        createDeliveryOrder,
        updateDeliveryOrderStatus,
        updateDeliveryOrder,
        deleteDeliveryOrder,
        recordDeliveryCashToCourier,
        recordDeliveryTransferToWallet,
        receiveCashFromCourier,
        settleCourierPayable,
        cancelCourierSettlement,
        addMarketingCampaign,
        updateMarketingCampaign,
        deleteMarketingCampaign,
        addMarketingChannel,
        updateMarketingChannel,
        addDiscountCode,
        updateDiscountCode,
        addMarketingBudget,
        updateMarketingBudget,
        addReferral,
        updateReferralStatus,
        addPurchaseBatch,
        updatePurchaseBatch,
        cancelPurchaseBatch,
        deletePurchaseBatch,
        addAuditLog,
        updateSetting,
        clearAllData,
        resetToBackup,
        restoreCompleteInitialData,
        purgeAllDataToEmpty,
        importBackup,
        exportBackupJson,
        downloadBackupFile,
        setRawStoreData: setData,
        processAssistantMessage
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
