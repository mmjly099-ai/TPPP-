export interface AppSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  updatedBy?: number;
  updatedAt?: string;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string;
  alternatePhone?: string | null;
  governorate: string;
  city?: string | null;
  pickupLocation?: string | null;
  notes?: string | null;
  openingBalance: string | number;
  openingBalanceDate?: string | null;
  openingBalanceNotes?: string | null;
  status: 'active' | 'inactive';
  marketingSource?: string | null;
  marketingCampaignId?: number | null;
  marketingChannelId?: number | null;
  campaignCode?: string | null;
  referralCode?: string | null;
  createdAt: string;
}

export interface Account {
  id: number;
  name: string;
  type: 'محفظة' | 'بنكي' | 'بطاقة' | 'نقدي' | 'حقوق ملكية';
  openingBalance: string | number;
  openingBalanceDate?: string | null;
  openingBalanceNotes?: string | null;
  status: 'active' | 'inactive';
  notes?: string | null;
  createdAt: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  accountId: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  code?: string; // Barcode or SKU
  unit?: string; // حبة، قطعة، كرتون، باكت، طقم، متر
  quantity: number;
  unitPrice: number;
  discount: number; // Value or %
  taxRate: number; // 0% or 15%
  taxAmount: number;
  subtotal: number;
  total: number;
}

export interface Order {
  id: number;
  orderNumber: string | number;
  customerId: number;
  customerCode?: string;
  customerName?: string;
  site: string; // SHEIN, AliExpress, etc.
  source?: string | null;
  shipmentNumber?: string;
  shipmentId?: number | null;
  itemsCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  deliveryFee: number;
  deliveryFeeCollectionStatus: 'unpaid' | 'collected' | 'cancelled';
  deliverySettlementStatus?: string | null;
  deliveryPaymentMethod?: string | null;
  deliverySettledAt?: string | null;
  deliveryFeeCollectedAt?: string | null;
  commission?: number | string | null;
  total?: number | string;
  paid?: number | string;
  paymentStatus?: string | null;
  status: 'pending' | 'purchased' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  notes?: string | null;
  customerOrderNumber?: string | number | null;
  internalNumber?: string | null;
  shippingFeeRecipient?: string | null;
  marketingCampaignId?: number | null;
  marketingChannelId?: number | null;
  marketingCode?: string | null;
  referralSource?: string | null;
  purchaseBatchId?: number | null;
  purchaseCost?: number | null;
  invoiceNumber?: string;
  invoiceStatus?: 'approved' | 'draft' | 'cancelled';
  invoiceType?: 'sales' | 'tax' | 'credit' | 'quote' | 'return';
  dueDate?: string;
  paymentMethod?: string;
  accountId?: number;
  taxRate?: number;
  taxAmount?: number;
  terms?: string;
  items?: InvoiceItem[];
  customerTaxNumber?: string;
  createdAt: string;
}

export interface Payment {
  id: number;
  paymentNumber: string;
  receiptNumber?: string;
  orderId?: number | null;
  customerId: number;
  accountId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  method?: string;
  deliverySettlementStatus?: string;
  paymentType?: 'دفعة أولى' | 'دفعة لاحقة' | 'دفعة نهائية' | string;
  statement?: string;
  notes?: string | null;
  reversalReason?: string | null;
  reversedAt?: string | null;
  status?: 'approved' | 'draft' | 'cancelled';
  createdBy?: number;
  createdByName?: string;
  updatedAt?: string;
  createdAt: string;
}

export type DocumentType =
  | 'order_invoice'
  | 'receipt'
  | 'consolidated_invoice'
  | 'customer_statement'
  | 'receivable_statement'
  | 'expense_voucher'
  | 'purchase_document'
  | 'invoice'
  | 'statement'
  | 'comprehensive_statement';

export type DocumentStatus = 'approved' | 'draft' | 'cancelled';

export interface DocumentRecord {
  id: string;
  documentType: DocumentType;
  documentTypeLabel: string;
  documentNumber: string;
  customerId?: number | null;
  customerName?: string;
  customerCode?: string;
  customerPhone?: string;
  customerGovernorate?: string;
  orderId?: number | null;
  orderNumber?: string | number | null;
  customerOrderNumber?: string | number | null;
  shipmentNumber?: string | null;
  date: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  discount?: number;
  deliveryFee?: number;
  status: DocumentStatus;
  paymentMethod?: string;
  accountName?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string | null;
}

export interface Expense {
  id: number;
  expenseNumber: string;
  category: string;
  vendorName?: string;
  amount: string | number;
  paymentMethod: string;
  accountId: number;
  description: string;
  notes?: string | null;
  campaignId?: number | null;
  status: 'active' | 'cancelled';
  createdBy?: number;
  createdAt: string;
}

export interface Shipment {
  id: number;
  shipmentNumber: string;
  carrier: string;
  shippingCost: string | number;
  shippingCostPaidAt?: string | null;
  accountId: number;
  financialTransactionId?: number | null;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled' | 'delivery';
  notes?: string | null;
  orderIds?: number[];
  lastTrackingUpdate?: string | null;
  trackingHistory?: any[];
  archivedAt?: string | null;
  updatedAt?: string | null;
  createdAt: string;
}

export interface FinancialTransaction {
  id: number;
  transactionNumber: string;
  transactionDate: string;
  accountId: number;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'payment' | 'expense' | 'other';
  amount: string | number;
  description: string;
  orderId?: number | null;
  paymentId?: number | null;
  expenseId?: number | null;
  purchaseBatchId?: number | null;
  customerId?: number | null;
  transferGroup?: string | null;
  createdBy?: number;
  notes?: string | null;
  createdAt: string;
}

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface ChartAccount {
  id: number;
  code: string; // '101', '102', '110', '201', '301', '401', '501'
  name: string;
  category: AccountCategory;
  subCategory: string;
  balanceType: 'debit' | 'credit';
  linkedSystemAccountId?: number | null;
  description?: string;
  isSystem?: boolean;
  createdAt: string;
}

export type JournalEntryStatus = 'draft' | 'posted' | 'reversed' | 'void';

export interface FiscalPeriod {
  id: number;
  periodName: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  fiscalYear: number;
  closedAt?: string | null;
  closedBy?: number | null;
  createdAt?: string;
}

export interface FiscalYear {
  id: number;
  year: number;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  createdAt?: string;
}

export interface IdempotencyRecord {
  key: string;
  operationType: string;
  entityId?: string | number;
  createdAt: string;
  userId?: number;
}

export type AppRole = 'owner' | 'manager' | 'accountant' | 'sales' | 'shipping' | 'customer_service' | 'viewer';

export type Permission =
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  | 'orders.view'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.cancel'
  | 'payments.view'
  | 'payments.create'
  | 'payments.edit'
  | 'payments.reverse'
  | 'journal.view'
  | 'journal.create'
  | 'journal.post'
  | 'journal.reverse'
  | 'reports.view'
  | 'backup.create'
  | 'backup.restore'
  | 'users.manage'
  | 'settings.manage';

export interface JournalLine {
  id: number;
  journalEntryId: number;
  accountId: number | null;
  accountName: string;
  chartAccountId?: number | null;
  chartAccountCode?: string;
  side: 'debit' | 'credit';
  amount: string | number;
  currency?: string;
  exchangeRate?: number;
  baseAmount?: number;
  notes?: string;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  journalNumber?: string;
  transactionId?: number | null;
  sourceType?: 'order' | 'payment' | 'expense' | 'purchase_batch' | 'receivable' | 'manual' | 'reversal' | 'opening_balance';
  sourceId?: number | string | null;
  sourceNumber?: string | null;
  status?: JournalEntryStatus;
  date?: string;
  currency?: string;
  exchangeRate?: number;
  description: string;
  createdBy?: number | string;
  createdByName?: string;
  postedBy?: number | string;
  postedByName?: string;
  postedAt?: string;
  createdAt: string;
  isReversed?: boolean;
  reversedByEntryId?: number | null;
  reversesEntryId?: number | null;
  reversalReason?: string;
  lines: JournalLine[];
}

export interface ReceivablePayment {
  id: number;
  amount: number;
  paymentDate: string;
  accountId: number;
  accountName: string;
  notes?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface OtherReceivable {
  id: number;
  name: string;
  phone?: string;
  entityType: string; // سلفة شخصية, سلفة موظف, عهدة مندوب توصيل, مورد, مصمم, شريك, بيت / عائلي, جهة أخرى
  reason: string;
  openingBalance: number; // المبلغ الأصلي المسلف
  paidAmount?: number;    // المبلغ المحاسب به والمسدد حتى الآن
  remainingBalance?: number; // المبلغ المتبقي المستحق
  openingDate: string;
  dueDate?: string;
  fromAccountId?: number; // الحساب أو المحفظة التي خرجت منها السلفة عند الإقراض
  sourceAccountName?: string;
  notes?: string;
  createdAt: string;
  status: 'unpaid' | 'partially_paid' | 'settled';
  payments?: ReceivablePayment[];
}

export interface InstallmentItem {
  id: string;
  installmentNumber: number; // 1, 2, 3...
  title: string; // e.g. "الدفعة الأولى (العربون)", "الدفعة الثانية (عند الشحن)", "الدفعة الأخيرة (عند الاستلام)"
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string; // YYYY-MM-DD
  paidDate?: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  paymentId?: number;
  receiptNumber?: string;
  accountId?: number;
  accountName?: string;
  notes?: string;
}

export interface InstallmentPlan {
  id: number;
  planNumber: string; // PLAN-2026-001
  title: string; // e.g. خطة دفعات طلبية شي إن #102
  customerId: number;
  customerName: string;
  customerPhone?: string;
  orderId?: number | null;
  orderNumber?: string | number | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  downPayment?: number;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  startDate: string;
  endDate?: string;
  notes?: string;
  installments: InstallmentItem[];
  createdAt: string;
}

export interface Courier {
  id: number;
  code: string; // e.g. "DLV-01"
  name: string;
  phone: string;
  vehicleType?: 'دراجة نارية' | 'سيارة' | 'دباب' | 'مكتب نقل' | 'أخرى';
  coverageZones: string; // e.g. "صنعاء - عصر، الستين، حدة"
  defaultDeliveryFee?: number; // أجرة التوصيل الافتراضية
  status: 'available' | 'on_delivery' | 'inactive';
  currentCustodyBalance: number; // رصيد العهدة النقدية في ذمته حالياً
  deliveredOrdersCount?: number;
  notes?: string;
  createdAt: string;
}

export interface DeliveryTripItem {
  orderId: number;
  orderNumber: string | number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  orderRemainingAmount: number; // المبلغ المتبقي من قيمة الطلب
  deliveryFee: number; // رسوم التوصيل
  totalDueFromCustomer: number; // المتبقي + التوصيل
  status: 'pending' | 'delivered' | 'returned' | 'postponed';
  collectedAmount: number; // المبلغ المحصل فعلياً
  deliveryFeeCollected: boolean; // هل تم تحصيل أجرة التوصيل؟
  deliveredAt?: string;
  notes?: string;
}

export interface DeliveryTrip {
  id: number;
  tripNumber: string; // e.g. "TRIP-2026-001"
  courierId: number;
  courierName: string;
  courierPhone: string;
  date: string;
  status: 'in_progress' | 'settled' | 'cancelled';
  items: DeliveryTripItem[];
  totalOrdersCount: number;
  deliveredCount: number;
  returnedCount: number;
  totalExpectedCash: number; // إجمالي المبالغ المتوقع تحصيلها
  totalCollectedCash: number; // إجمالي ما حصله الموصل
  courierCommissionTotal: number; // أجور الموصل المستحقة له
  netDepositedToStore: number; // الصافي المورد لخزينة أو محفظة المتجر
  depositAccountId?: number; // الصندوق أو المحفظة التي استلمت النقدية
  depositAccountName?: string;
  settledAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Owner {
  id: number;
  ownerNumber: string;
  name: string;
  ownershipPercentage: string | number;
  contributedCapital: string | number;
  notes?: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actorId?: number | null;
  performedBy?: string;
  action: string;
  entityType: string;
  entityId?: number | null;
  description: string;
  notes?: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface AssistantLog {
  id: number;
  actorId?: number | null;
  entityType?: string;
  entityId?: number | null;
  userMessage: string;
  intent: string;
  extractedData?: string;
  action: string;
  result?: string | null;
  status: string;
  confirmationStage?: string | number | null;
  confirmationCode?: string | null;
  confirmationExpiresAt?: string | null;
  createdAt: string;
}

export interface MarketingChannel {
  id: number;
  name: string;
  type: 'social' | 'messaging' | 'referral' | 'direct' | 'ads' | 'other';
  status: 'active' | 'inactive';
  costPerLead?: string | number;
  notes?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface MarketingCampaign {
  id: number;
  campaignNumber: string;
  name: string;
  platform: string;
  channelId?: number | null;
  channelName?: string | null;
  goal: string;
  objective?: string;
  offerUsed?: string | null;
  startDate: string;
  endDate?: string | null;
  budget: number;
  actualSpend: number;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
  targetAudience?: string | null;
  discountCode?: string | null;
  campaignUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DiscountCode {
  id: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  campaignId?: number | null;
  channelId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  usageCount: number;
  status: 'active' | 'inactive' | 'ended';
  createdAt: string;
}

export interface MarketingBudget {
  id: number;
  budgetType: 'monthly' | 'campaign' | 'channel';
  campaignId?: number | null;
  channelId?: number | null;
  title: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  alertThreshold: number; // percentage e.g. 80
  notes?: string | null;
  createdAt: string;
}

export interface Referral {
  id: number;
  referralNumber: string;
  referrerCustomerId: number;
  referrerCustomerName?: string;
  referredCustomerId: number;
  referredCustomerName?: string;
  referralDate: string;
  source?: string | null;
  status: 'new' | 'registered' | 'ordered' | 'delivered' | 'rewarded';
  orderId?: number | null;
  rewardAmount: number;
  rewardApproved: boolean;
  notes?: string | null;
  createdAt: string;
}

export interface PurchaseBatch {
  id: number;
  batchNumber: string;
  source: string; // SHEIN, AliExpress, etc.
  supplierOrderNumber?: string | null;
  purchaseDate: string;
  accountId: number;
  accountName?: string;
  purchaseCost: string | number;
  purchaseFees: string | number;
  transferFees: string | number;
  totalCost: string | number;
  orderIds?: number[];
  notes?: string | null;
  status: 'active' | 'cancelled';
  createdBy?: number;
  createdAt: string;
}

export interface TopStoreBackup {
  format: string;
  version: number;
  createdAt: string;
  tables: {
    appSettings: AppSetting[];
    customers: Customer[];
    orders: Order[];
    accounts: Account[];
    paymentMethods: PaymentMethod[];
    payments: Payment[];
    purchaseBatches?: PurchaseBatch[];
    purchaseBatchOrders?: any[];
    shipments: Shipment[];
    financialTransactions: FinancialTransaction[];
    journalEntries: any[];
    journalLines: JournalLine[];
    expenses: Expense[];
    marketingCampaigns?: MarketingCampaign[];
    marketingChannels?: MarketingChannel[];
    discountCodes?: DiscountCode[];
    marketingBudgets?: MarketingBudget[];
    referrals?: Referral[];
    returns?: any[];
    auditLogs: AuditLog[];
    assistantLogs: AssistantLog[];
    owners: Owner[];
    equityTransactions?: any[];
    liabilities?: any[];
    otherReceivables?: OtherReceivable[];
    installmentPlans?: InstallmentPlan[];
    couriers?: Courier[];
    deliveryTrips?: DeliveryTrip[];
    chartAccounts?: ChartAccount[];
    fiscalPeriods?: FiscalPeriod[];
    fiscalYears?: FiscalYear[];
    idempotencyRecords?: IdempotencyRecord[];
  };
}
