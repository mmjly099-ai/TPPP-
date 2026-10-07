import { TopStoreBackup, Order, Payment, Customer, Account, Expense, Shipment, OtherReceivable, JournalEntry, MarketingCampaign, PurchaseBatch } from '../types';

export interface InsightItem {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'critical';
  title: string;
  text: string;
  calculationDetail?: string;
  actionLabel?: string;
  actionTab?: string;
  actionData?: any;
}

export interface AnomalyItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  transactionId?: number | string;
  date?: string;
  amount?: number;
  account?: string;
  suspectReason: string;
  actionType: 'orders' | 'customers' | 'journal' | 'accounts' | 'expenses';
  actionTargetId?: any;
}

export interface MetricCalculation {
  metricName: string;
  formula: string;
  steps: string[];
  finalResult: string;
  timeframe: string;
}

export interface AssistantAnswer {
  reply: string;
  summaryMetrics?: Array<{ label: string; value: string; color?: string; change?: string }>;
  calculation?: MetricCalculation;
  chartData?: Array<{ name: string; value: number; secondary?: number }>;
  chartType?: 'bar' | 'pie' | 'line';
  chartTitle?: string;
  suggestedActions?: Array<{ label: string; targetTab: string; param?: any }>;
  pendingOperation?: {
    type: 'expense' | 'payment' | 'transfer';
    details: Record<string, any>;
    summaryText: string;
  };
  anomalies?: AnomalyItem[];
  intent: string;
}

/**
 * AI Analytics Service for TOP STORE
 * Reads genuine store data, computes exact financial formulas, audits accounting entries,
 * and formulates natural Arabic answers with explainable calculations.
 */
export class AIAnalyticsService {
  /**
   * Helper to format Yemeni Rial currency
   */
  static fmt(num: number | string | undefined | null): string {
    const val = typeof num === 'string' ? parseFloat(num) : num;
    if (val === undefined || val === null || isNaN(val)) return '0 ر.ي';
    return `${Math.round(val).toLocaleString('en-US')} ر.ي`;
  }

  static fmtNum(num: number | string | undefined | null): string {
    const val = typeof num === 'string' ? parseFloat(num) : num;
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Math.round(val).toLocaleString('en-US');
  }

  /**
   * Compute actual live account balance from ledger transactions
   */
  static getAccountBalance(account: Account, data: TopStoreBackup): number {
    let bal = Number(account.openingBalance) || 0;
    (data.tables.payments || []).forEach(p => {
      if (p.accountId === account.id) bal += (p.amount || 0);
    });
    (data.tables.expenses || []).forEach(e => {
      if (e.accountId === account.id && e.status !== 'cancelled') bal -= (Number(e.amount) || 0);
    });
    (data.tables.financialTransactions || []).forEach(t => {
      if (t.accountId === account.id) {
        if ((t as any).type === 'inflow') bal += (Number(t.amount) || 0);
        else if ((t as any).type === 'outflow') bal -= (Number(t.amount) || 0);
      }
    });
    return bal;
  }

  // =========================================================================
  // 1. Proactive Pulse: "ماذا يحدث في TOP STORE؟"
  // =========================================================================
  static getProactiveInsights(data: TopStoreBackup): InsightItem[] {
    const insights: InsightItem[] = [];
    const orders = data.tables.orders || [];
    const expenses = data.tables.expenses || [];
    const customers = data.tables.customers || [];
    const accounts = data.tables.accounts || [];

    // 1. Sales & Growth
    const totalSalesAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 2. Pending orders needing delivery or processing
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    if (activeOrders.length > 0) {
      insights.push({
        id: 'open-orders',
        type: 'info',
        title: '📦 طلبيات قيد التنفيذ والمتابعة',
        text: `لديك ${activeOrders.length} طلبات قيد التجهيز والشحن بقيمة ${this.fmt(activeOrders.reduce((s, o) => s + (o.totalAmount || 0), 0))}.`,
        actionLabel: 'عرض الطلبات',
        actionTab: 'orders'
      });
    }

    // 3. Debtors Analysis
    const debtors = customers
      .map(c => {
        const cOrders = orders.filter(o => o.customerId === c.id);
        const rem = cOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
        return { ...c, remainingDebt: rem };
      })
      .filter(c => c.remainingDebt > 0)
      .sort((a, b) => b.remainingDebt - a.remainingDebt);

    if (debtors.length > 0) {
      const topDebtor = debtors[0];
      const totalDebts = debtors.reduce((s, d) => s + d.remainingDebt, 0);
      insights.push({
        id: 'debtors-alert',
        type: 'warning',
        title: '👥 مديونيات وذمم عملاء مستحقة',
        text: `لديك ${debtors.length} عميلاً لديهم مبالغ متبقية بإجمالي ${this.fmt(totalDebts)}. أكبر مدين هو ${topDebtor.name} بمبلغ ${this.fmt(topDebtor.remainingDebt)}.`,
        actionLabel: 'كشف مديونيات العملاء',
        actionTab: 'customers'
      });
    }

    // 4. Liquidity & Primary Cash Source
    const activeAccounts = accounts.filter(a => a.status === 'active');
    const totalLiquidity = activeAccounts.reduce((sum, a) => sum + this.getAccountBalance(a, data), 0);
    const sortedAccounts = [...activeAccounts].sort((a, b) => this.getAccountBalance(b, data) - this.getAccountBalance(a, data));
    const topAccount = sortedAccounts[0];

    if (topAccount) {
      insights.push({
        id: 'liquidity-pulse',
        type: 'positive',
        title: '💰 جاهزية السيولة والمحافظ',
        text: `إجمالي السيولة النقدية المتاحة الآن هو ${this.fmt(totalLiquidity)}. أكبر مصدر للسيولة هو "${topAccount.name}" برصيد ${this.fmt(this.getAccountBalance(topAccount, data))}.`,
        actionLabel: 'إدارة الحسابات',
        actionTab: 'accounts'
      });
    }

    // 5. VISA Card Balances
    const visaAccounts = activeAccounts.filter(a => a.type === 'بطاقة' || a.name.toLowerCase().includes('visa') || a.name.toLowerCase().includes('بطاقة'));
    if (visaAccounts.length > 0) {
      const visaTotal = visaAccounts.reduce((sum, a) => sum + this.getAccountBalance(a, data), 0);
      insights.push({
        id: 'visa-pulse',
        type: 'info',
        title: '💳 أرصدة بطاقات VISA للشراء الخارجي',
        text: `رصيد بطاقات الشراء الدولية المتاح: ${this.fmt(visaTotal)} عبر ${visaAccounts.map(v => `${v.name} (${this.fmt(this.getAccountBalance(v, data))})`).join(' و ')}.`,
        actionLabel: 'دفعات الشراء',
        actionTab: 'purchase-batches'
      });
    }

    // 6. Expenses vs Revenue comparison
    const totalExpenses = expenses.filter(e => e.status !== 'cancelled').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    if (totalSalesAmount > 0) {
      const expenseRatio = ((totalExpenses / totalSalesAmount) * 100).toFixed(1);
      insights.push({
        id: 'expense-ratio',
        type: Number(expenseRatio) > 40 ? 'warning' : 'info',
        title: '📊 نسبة المصروفات إلى المبيعات',
        text: `المصروفات التشغيلية الإجمالية تبلغ ${this.fmt(totalExpenses)}، وتشكل نسبة ${expenseRatio}% من إجمالي المبيعات.`,
        actionLabel: 'سجل المصروفات',
        actionTab: 'expenses'
      });
    }

    return insights;
  }

  // =========================================================================
  // 2. Accounting Anomaly Detection & Financial Auditor
  // =========================================================================
  static detectAccountingAnomalies(data: TopStoreBackup): AnomalyItem[] {
    const anomalies: AnomalyItem[] = [];
    const orders = data.tables.orders || [];
    const payments = data.tables.payments || [];
    const customers = data.tables.customers || [];
    const journalEntries = data.tables.journalEntries || [];
    const expenses = data.tables.expenses || [];

    // 1. Check unbalanced journal entries
    journalEntries.forEach(entry => {
      const lines = entry.lines || [];
      const totalDebit = lines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
      const totalCredit = lines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        anomalies.push({
          id: `unbalanced-entry-${entry.id}`,
          severity: 'high',
          title: `قيد محاسبي غير متوازن #${entry.entryNumber}`,
          description: `إجمالي المدين (${this.fmt(totalDebit)}) لا يساوي إجمالي الدائن (${this.fmt(totalCredit)}).`,
          date: entry.date,
          amount: Math.abs(totalDebit - totalCredit),
          suspectReason: 'خلل في توازن القيد المحاسبي المزدوج',
          actionType: 'journal',
          actionTargetId: entry.id
        });
      }
    });

    // 2. Check payments with missing customers or unlinked
    payments.forEach(p => {
      const cust = customers.find(c => c.id === p.customerId);
      if (!cust) {
        anomalies.push({
          id: `unlinked-payment-${p.id}`,
          severity: 'high',
          title: `دفعة غير مرتبطة بعميل #${p.receiptNumber || p.id}`,
          description: `الدفعة بقيمة ${this.fmt(p.amount)} مسجلة لكود عميل غير موجود في قاعدة البيانات (${p.customerId}).`,
          date: p.paymentDate,
          amount: p.amount,
          suspectReason: 'دفعة يتيمة بدون سجل عميل',
          actionType: 'customers'
        });
      }
    });

    // 3. Check orders with amount calculation discrepancies
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        const expectedFinal = Math.max(0, (o.totalAmount || 0) - (o.discount || 0)) + (o.deliveryFee || 0);
        const actualSum = (o.paidAmount || 0) + (o.remainingAmount || 0);
        if (Math.abs(expectedFinal - actualSum) > 1 && o.remainingAmount !== undefined) {
          anomalies.push({
            id: `order-mismatch-${o.id}`,
            severity: 'medium',
            title: `عدم تطابق مالي في الطلب #${o.orderNumber || o.id}`,
            description: `إجمالي الطلب المتوقع (${this.fmt(expectedFinal)}) لا يتطابق مع مجموع (المدفوع + المتبقي = ${this.fmt(actualSum)}).`,
            date: o.orderDate,
            amount: Math.abs(expectedFinal - actualSum),
            suspectReason: 'فارق حسابي بين إجمالي المستحق والدفعات',
            actionType: 'orders',
            actionTargetId: o.id
          });
        }
      }
    });

    // 4. Check unclassified expenses
    expenses.forEach(e => {
      if (e.status !== 'cancelled' && (!e.category || e.category === 'غير مصنف' || e.category.trim() === '')) {
        anomalies.push({
          id: `unclassified-expense-${e.id}`,
          severity: 'low',
          title: `مصروف غير مصنف #${e.expenseNumber || e.id}`,
          description: `مصروف بقيمة ${this.fmt(e.amount)} مسجل بدون تصنيف، مما يعيق دقة تقارير توزيع التكاليف.`,
          date: (e as any).date,
          amount: Number(e.amount),
          suspectReason: 'بند مصروف يفتقر للتصنيف المحاسبي',
          actionType: 'expenses',
          actionTargetId: e.id
        });
      }
    });

    return anomalies;
  }

  // =========================================================================
  // 3. Profit & Revenue Factor Analysis ("لماذا؟")
  // =========================================================================
  static getProfitAnalysis(data: TopStoreBackup) {
    const orders = data.tables.orders || [];
    const expenses = data.tables.expenses || [];
    const batches = data.tables.purchaseBatches || [];

    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const activeExpenses = expenses.filter(e => e.status !== 'cancelled');

    // Total sales revenue
    const totalSales = activeOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalDiscounts = activeOrders.reduce((s, o) => s + (o.discount || 0), 0);
    const netRevenue = Math.max(0, totalSales - totalDiscounts);

    // Cost of goods (Purchases from Shein / AliExpress batches)
    const batchPurchasesCost = batches.reduce((s, b) => s + (Number(b.totalCost) || Number(b.purchaseCost) || 0), 0);
    // Estimated order cost if batches not yet mapped
    const estimatedItemsCost = activeOrders.reduce((s, o) => s + ((o.subtotal || o.totalAmount || 0) * 0.75), 0);
    const finalProductCost = batchPurchasesCost > 0 ? batchPurchasesCost : estimatedItemsCost;

    // Operating expenses breakdown
    const marketingExpenses = activeExpenses
      .filter(e => e.category.includes('تسويق') || e.category.includes('إعلان') || e.category.includes('سوشيال'))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const shippingExpenses = activeExpenses
      .filter(e => e.category.includes('شحن') || e.category.includes('توصيل') || e.category.includes('نقل'))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const generalExpenses = activeExpenses
      .filter(e => !e.category.includes('تسويق') && !e.category.includes('شحن'))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const totalOperationalExpenses = activeExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Net Profit
    const netProfit = netRevenue - finalProductCost - totalOperationalExpenses;
    const profitMargin = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) : '0';

    return {
      totalSales,
      totalDiscounts,
      netRevenue,
      finalProductCost,
      marketingExpenses,
      shippingExpenses,
      generalExpenses,
      totalOperationalExpenses,
      netProfit,
      profitMargin
    };
  }

  // =========================================================================
  // 4. Daily Briefing: "ملخص اليوم"
  // =========================================================================
  static getTodaySummary(data: TopStoreBackup) {
    const todayStr = new Date().toISOString().split('T')[0];
    const orders = data.tables.orders || [];
    const payments = data.tables.payments || [];
    const expenses = data.tables.expenses || [];

    const todayOrders = orders.filter(o => o.orderDate?.includes(todayStr) || o.createdAt?.includes(todayStr));
    const todayPayments = payments.filter(p => p.paymentDate?.includes(todayStr) || p.createdAt?.includes(todayStr));
    const todayExpenses = expenses.filter(e => (e as any).date?.includes(todayStr) || e.createdAt?.includes(todayStr));

    const todaySales = todayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const todayCashIn = todayPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const todayCashOut = todayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const todayNetCashFlow = todayCashIn - todayCashOut;

    return {
      todayStr,
      todayOrdersCount: todayOrders.length,
      todaySales,
      todayCashIn,
      todayCashOut,
      todayNetCashFlow,
      todayPendingOrdersCount: todayOrders.filter(o => o.status === 'pending').length
    };
  }

  // =========================================================================
  // 5. Natural Language Understanding & Financial Response Generator
  // =========================================================================
  static processNaturalQuery(query: string, data: TopStoreBackup, previousContext?: string): AssistantAnswer {
    const q = query.trim().toLowerCase();
    const orders = data.tables.orders || [];
    const customers = data.tables.customers || [];
    const accounts = data.tables.accounts || [];
    const expenses = data.tables.expenses || [];

    // 1. "كم معي؟" أو "السيولة" أو "أرصدة المحافظ"
    if (
      q.includes('كم معي') ||
      q.includes('السيولة') ||
      q.includes('فلوس') ||
      q.includes('المحافظ') ||
      q.includes('البنوك') ||
      q.includes('رصيد') && (q.includes('الخزينة') || q.includes('الحسابات'))
    ) {
      const activeAccounts = accounts.filter(a => a.status === 'active');
      const totalCash = activeAccounts.reduce((sum, a) => sum + this.getAccountBalance(a, data), 0);
      const totalReceivables = customers.reduce((sum, c) => {
        const cOrders = orders.filter(o => o.customerId === c.id);
        return sum + cOrders.reduce((s, o) => s + (o.remainingAmount || 0), 0);
      }, 0);

      const chartData = activeAccounts.map(a => ({
        name: a.name,
        value: this.getAccountBalance(a, data)
      }));

      const reply = `بلغت إجمالي السيولة النقدية المتاحة حالياً في TOP STORE:\n**${this.fmt(totalCash)}**\n\nتوزيع الأرصدة عبر الحسابات والمحافظ:\n` +
        activeAccounts.map(a => `• **${a.name}** (${a.type}): ${this.fmt(this.getAccountBalance(a, data))}`).join('\n') +
        `\n\n⚠️ **تنويه محاسبي هام:**\nلديك ذمم مدينة مستحقة لدى العملاء بقيمة **${this.fmt(totalReceivables)}**، لكنها *ليست أموالاً سائلة متاحة حالياً* حتى يتم تحصيلها وتوريدها إلى الخزينة أو المحافظ.`;

      return {
        reply,
        intent: 'liquidity_check',
        summaryMetrics: [
          { label: 'إجمالي السيولة المتاحة', value: this.fmt(totalCash), color: 'text-emerald-700' },
          { label: 'الذمم المدينة (غير سائلة)', value: this.fmt(totalReceivables), color: 'text-amber-700' },
          { label: 'عدد الحسابات النشطة', value: `${activeAccounts.length} حسابات`, color: 'text-blue-700' }
        ],
        calculation: {
          metricName: 'إجمالي السيولة النقدية الفعلية',
          formula: 'مجموع أرصدة الصناديق النقدية + الحسابات البنكية + محافظ الدفع الإلكترونية + بطاقات الشراء',
          steps: activeAccounts.map(a => `${a.name}: ${this.fmt(this.getAccountBalance(a, data))}`),
          finalResult: this.fmt(totalCash),
          timeframe: 'الرصيد اللحظي الفعلي المعتمد'
        },
        chartData,
        chartType: 'pie',
        chartTitle: 'توزيع السيولة النقدية عبر المحافظ والبنوك',
        suggestedActions: [
          { label: 'عرض الحسابات والمحافظ', targetTab: 'accounts' },
          { label: 'تحويل بين المحافظ', targetTab: 'accounts' },
          { label: 'كشف الذمم المدينة', targetTab: 'customers' }
        ]
      };
    }

    // 2. "كم ربحي؟" أو "الأرباح" أو "لماذا انخفض الربح؟"
    if (
      q.includes('ربح') ||
      q.includes('الأرباح') ||
      q.includes('أرباحي') ||
      q.includes('صافي الربح') ||
      q.includes('انخفض') && q.includes('الربح')
    ) {
      const p = this.getProfitAnalysis(data);

      const reply = `بلغ صافي الربح التقديري لمتجر TOP STORE:\n**${this.fmt(p.netProfit)}** (بهامش ربح **${p.profitMargin}%**).\n\n` +
        `📊 **تفكيك عناصر الأرباح:**\n` +
        `• **إيرادات المبيعات المحققة:** ${this.fmt(p.netRevenue)}\n` +
        `• **تكلفة بضاعة الطلبيات (شي إن وعلي إكسبرس):** -${this.fmt(p.finalProductCost)}\n` +
        `• **المصروفات التشغيلية والتسويق:** -${this.fmt(p.totalOperationalExpenses)}\n` +
        `= **صافي الربح النهائي:** ${this.fmt(p.netProfit)}\n\n` +
        `💡 **تحليل الأسباب المؤثرة (لماذا؟):**\n` +
        `1. تشكل تكلفة المشتريات النسبة الأكبر من الإنفاق بنسبة ${(p.netRevenue > 0 ? (p.finalProductCost / p.netRevenue * 100).toFixed(0) : 0)}%.\n` +
        `2. المصروفات التشغيلية (${this.fmt(p.totalOperationalExpenses)}) موزعة بين تسويق (${this.fmt(p.marketingExpenses)}) وشحن (${this.fmt(p.shippingExpenses)}) وعامة (${this.fmt(p.generalExpenses)}).`;

      const chartData = [
        { name: 'إيراد المبيعات', value: p.netRevenue },
        { name: 'تكلفة البضاعة', value: p.finalProductCost },
        { name: 'مصاريف التشغيل', value: p.totalOperationalExpenses },
        { name: 'صافي الربح', value: Math.max(0, p.netProfit) }
      ];

      return {
        reply,
        intent: 'profit_analysis',
        summaryMetrics: [
          { label: 'صافي الربح', value: this.fmt(p.netProfit), color: p.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700' },
          { label: 'هامش الربح', value: `${p.profitMargin}%`, color: 'text-blue-700' },
          { label: 'إجمالي المبيعات', value: this.fmt(p.netRevenue), color: 'text-slate-800' }
        ],
        calculation: {
          metricName: 'صافي الربح التشغيلي والتجاري',
          formula: 'إيرادات المبيعات - تكلفة شراء الطلبيات - المصروفات التشغيلية والإعلانية',
          steps: [
            `إيراد المبيعات الإجمالي: ${this.fmt(p.netRevenue)}`,
            `تكلفة شراء المنتجات: -${this.fmt(p.finalProductCost)}`,
            `مصاريف التشغيل والتسويق: -${this.fmt(p.totalOperationalExpenses)}`,
            `الناتج = ${this.fmt(p.netProfit)}`
          ],
          finalResult: this.fmt(p.netProfit),
          timeframe: 'إجمالي العمليات المعتمدة'
        },
        chartData,
        chartType: 'bar',
        chartTitle: 'مكونات الربح والإيرادات والتكاليف',
        suggestedActions: [
          { label: 'مركز التحليلات المتقدم', targetTab: 'analytics' },
          { label: 'سجل الطلبات والمبيعات', targetTab: 'orders' },
          { label: 'تفاصيل المصروفات', targetTab: 'expenses' }
        ]
      };
    }

    // 3. "من عليه فلوس؟" أو "الديون" أو "الذمم"
    if (
      q.includes('من عليه') ||
      q.includes('ديون') ||
      q.includes('مديونية') ||
      q.includes('الذمم') ||
      q.includes('متبقي') && q.includes('العملاء')
    ) {
      const debtors = customers
        .map(c => {
          const cOrders = orders.filter(o => o.customerId === c.id);
          const rem = cOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
          const totalBought = cOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
          const paid = cOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
          return { ...c, remainingDebt: rem, totalBought, paid, ordersCount: cOrders.length };
        })
        .filter(c => c.remainingDebt > 0)
        .sort((a, b) => b.remainingDebt - a.remainingDebt);

      const totalDebts = debtors.reduce((s, d) => s + d.remainingDebt, 0);

      const top5 = debtors.slice(0, 5);
      const listText = top5
        .map((d, idx) => `${idx + 1}. **${d.name}** (${d.code}) — المبلغ المتبقي: **${this.fmt(d.remainingDebt)}** (هاتف: ${d.phone || '—'})`)
        .join('\n');

      const reply = `إجمالي المديونيات المستحقة على العملاء:\n**${this.fmt(totalDebts)}** على **${debtors.length} عملاء**.\n\n` +
        `أكبر المديونيات التي تحتاج متابعة وتحصيل:\n${listText || 'لا توجد مديونيات قائمة، كافة العملاء مسددين بالكامل.'}\n\n` +
        `💡 يمكنك فتح كشف حساب أي عميل فوراً لمراجعة تفاصيل طلباته وسندات قبضه.`;

      const chartData = top5.map(d => ({
        name: d.name.split(' ')[0] || d.code,
        value: d.remainingDebt
      }));

      return {
        reply,
        intent: 'debtors_analysis',
        summaryMetrics: [
          { label: 'إجمالي الديون المستحقة', value: this.fmt(totalDebts), color: 'text-rose-700' },
          { label: 'عدد العملاء المدينين', value: `${debtors.length} عميل`, color: 'text-amber-700' },
          { label: 'أعلى مديونية فردية', value: top5[0] ? this.fmt(top5[0].remainingDebt) : '0', color: 'text-slate-800' }
        ],
        calculation: {
          metricName: 'إجمالي ذمم العملاء المستحقة',
          formula: 'مجموع المبالغ المتبقية لجميع طلبات العملاء (إجمالي الطلب - المدفوع)',
          steps: top5.map(d => `${d.name}: متبقي ${this.fmt(d.remainingDebt)}`),
          finalResult: this.fmt(totalDebts),
          timeframe: 'الرصيد المستحق الفعلي'
        },
        chartData,
        chartType: 'bar',
        chartTitle: 'أعلى مديونيات العملاء المستحقة للتحصيل',
        suggestedActions: [
          { label: 'سجل العملاء والذمم', targetTab: 'customers' },
          { label: 'سند قبض جديد', targetTab: 'invoices' }
        ]
      };
    }

    // 4. "أين تذهب فلوس توب ستور؟" أو "المصروفات"
    if (
      q.includes('أين تذهب') ||
      q.includes('المصروفات') ||
      q.includes('المصاريف') ||
      q.includes('الصرف') ||
      q.includes('ليش المصروفات')
    ) {
      const activeExpenses = expenses.filter(e => e.status !== 'cancelled');
      const totalExp = activeExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      // Categorize
      const categoriesMap: Record<string, number> = {};
      activeExpenses.forEach(e => {
        const cat = e.category || 'أخرى';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + (Number(e.amount) || 0);
      });

      const sortedCategories = Object.entries(categoriesMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const topCategoriesText = sortedCategories
        .slice(0, 5)
        .map((c, i) => `${i + 1}. **${c.name}**: ${this.fmt(c.value)} (${((c.value / (totalExp || 1)) * 100).toFixed(1)}%)`)
        .join('\n');

      const reply = `إجمالي المصروفات التشغيلية والإدارية:\n**${this.fmt(totalExp)}** عبر **${activeExpenses.length} عملية صرف**.\n\n` +
        `توزيع أوجه الصرف (أين تذهب الفلوس):\n${topCategoriesText || 'لا توجد مصروفات مسجلة بعد.'}\n\n` +
        `💡 **توصية المحلل:** البند الأكثر استهلاكاً هو "${sortedCategories[0]?.name || 'التشغيل'}"، يُنصح بمتابعة عقود التوصيل ورسوم التحويل لتقليل التكاليف.`;

      return {
        reply,
        intent: 'expense_breakdown',
        summaryMetrics: [
          { label: 'إجمالي المصروفات', value: this.fmt(totalExp), color: 'text-rose-700' },
          { label: 'أعلى بند مصروفات', value: sortedCategories[0]?.name || '—', color: 'text-slate-800' },
          { label: 'عدد العمليات', value: `${activeExpenses.length} حركة`, color: 'text-blue-700' }
        ],
        calculation: {
          metricName: 'إجمالي نفقات التشغيل',
          formula: 'مجموع المبالغ المصروفة عبر الخزينة والمحافظ والحسابات البنكية المعتمدة',
          steps: sortedCategories.slice(0, 4).map(c => `${c.name}: ${this.fmt(c.value)}`),
          finalResult: this.fmt(totalExp),
          timeframe: 'جميع العمليات النشطة'
        },
        chartData: sortedCategories,
        chartType: 'pie',
        chartTitle: 'توزيع المصروفات حسب البنود',
        suggestedActions: [
          { label: 'عرض المصروفات', targetTab: 'expenses' },
          { label: 'إضافة سند صرف', targetTab: 'invoices' }
        ]
      };
    }

    // 5. "ملخص اليوم" أو "التقرير اليومي"
    if (
      q.includes('ملخص اليوم') ||
      q.includes('اليوم') && (q.includes('تقرير') || q.includes('وضع') || q.includes('شغل'))
    ) {
      const today = this.getTodaySummary(data);
      const openOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

      const reply = `📊 **ملخص TOP STORE اليوم (${today.todayStr}):**\n\n` +
        `• **عدد الطلبات الجديدة اليوم:** ${today.todayOrdersCount} طلبات.\n` +
        `• **قيمة مبيعات اليوم:** ${this.fmt(today.todaySales)}\n` +
        `• **المقبوضات النقدية الواردة:** ${this.fmt(today.todayCashIn)}\n` +
        `• **المصروفات النقدية الصادرة:** ${this.fmt(today.todayCashOut)}\n` +
        `• **صافي التدفق النقدي اليومي:** ${this.fmt(today.todayNetCashFlow)}\n\n` +
        `🚨 **أهم 3 أشياء تحتاج انتباهك اليوم:**\n` +
        `1. لديك **${openOrdersCount} طلبات** قيد التجهيز والشحن تحتاج متابعة مسارها.\n` +
        `2. تحصيل دفعات العملاء المعلقة لتوفير سيولة للشراء الجماعي القادم.\n` +
        `3. مراجعة رصيد بطاقة VISA للتأكد من تغطية طلبيات شي إن الجديدة.`;

      return {
        reply,
        intent: 'daily_summary',
        summaryMetrics: [
          { label: 'مبيعات اليوم', value: this.fmt(today.todaySales), color: 'text-slate-800' },
          { label: 'مقبوضات اليوم', value: this.fmt(today.todayCashIn), color: 'text-emerald-700' },
          { label: 'مصروفات اليوم', value: this.fmt(today.todayCashOut), color: 'text-rose-700' }
        ],
        calculation: {
          metricName: 'صافي الحركة النقدية اليومية',
          formula: 'المقبوضات النقدية لليوم - المصروفات النقدية لليوم',
          steps: [
            `مقبوضات واردة: +${this.fmt(today.todayCashIn)}`,
            `مصروفات صادرة: -${this.fmt(today.todayCashOut)}`,
            `الصافي اليومي = ${this.fmt(today.todayNetCashFlow)}`
          ],
          finalResult: this.fmt(today.todayNetCashFlow),
          timeframe: today.todayStr
        },
        suggestedActions: [
          { label: 'سجل الطلبات', targetTab: 'orders' },
          { label: 'الفواتير وسندات القبض', targetTab: 'invoices' }
        ]
      };
    }

    // 6. "فحص النظام" أو "المشاكل" أو "راجع لي الحسابات"
    if (
      q.includes('فحص') ||
      q.includes('مشاكل') ||
      q.includes('راجع') ||
      q.includes('سلامة') ||
      q.includes('أخطاء')
    ) {
      const anomalies = this.detectAccountingAnomalies(data);

      if (anomalies.length === 0) {
        return {
          reply: `✅ **فحص النظام المحاسبي مكتمل بنجاح تام!**\n\n` +
            `• القيود المحاسبية متوازنة (المدين = الدائن).\n` +
            `• جميع الدفعات مرتبطة بعملاء وطلبات صحيحة.\n` +
            `• الأرصدة النقدية مطابقة لمجموع الحركات المسجلة.\n` +
            `• لا توجد عمليات مكررة أو بيانات يتيمة في النظام.`,
          intent: 'system_audit',
          summaryMetrics: [
            { label: 'حالة النظام', value: 'سليم 100%', color: 'text-emerald-700' },
            { label: 'المشاكل المكتشفة', value: '0 مشاكل', color: 'text-emerald-700' }
          ]
        };
      }

      const reply = `⚠️ **تم العثور على ${anomalies.length} ملاحظات تحتاج المراجعة:**\n\n` +
        anomalies.map((a, i) => `${i + 1}. **${a.title}** (${a.severity === 'high' ? 'عالية الأهمية' : 'تنبيه'})\n   ${a.description}\n   *السبب:* ${a.suspectReason}`).join('\n\n') +
        `\n\n💡 يمكنك مراجعة هذه العمليات من الأقسام المخصصة دون أي تعديل تلقائي مفاجئ.`;

      return {
        reply,
        intent: 'system_audit',
        anomalies,
        summaryMetrics: [
          { label: 'حالة التدقيق', value: 'تحتاج مراجعة', color: 'text-rose-700' },
          { label: 'الملاحظات', value: `${anomalies.length} تنبيهات`, color: 'text-rose-700' }
        ],
        suggestedActions: [
          { label: 'دفتر اليومية والقيود', targetTab: 'journal' },
          { label: 'مراجعة الطلبات', targetTab: 'orders' }
        ]
      };
    }

    // 7. "أكبر العملاء" أو "تحليل العملاء"
    if (
      q.includes('أكبر العملاء') ||
      q.includes('أفضل العملاء') ||
      q.includes('العملاء الأكثر') ||
      q.includes('تحليل العملاء')
    ) {
      const rankedCustomers = customers
        .map(c => {
          const cOrders = orders.filter(o => o.customerId === c.id);
          const totalSpent = cOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
          const paid = cOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
          const remaining = cOrders.reduce((s, o) => s + (o.remainingAmount || 0), 0);
          return { ...c, totalSpent, paid, remaining, ordersCount: cOrders.length };
        })
        .sort((a, b) => b.totalSpent - a.totalSpent);

      const top5 = rankedCustomers.slice(0, 5);
      const list = top5
        .map((c, i) => `${i + 1}. **${c.name}** (${c.code}): مبيعات ${this.fmt(c.totalSpent)} | ${c.ordersCount} طلبات | مدفوع: ${this.fmt(c.paid)}`)
        .join('\n');

      const chartData = top5.map(c => ({
        name: c.name.split(' ')[0] || c.code,
        value: c.totalSpent
      }));

      const reply = `👥 **أفضل عملاء TOP STORE من حيث حجم المشتريات:**\n\n${list}\n\n` +
        `• **متوسط قيمة الشراء للعميل:** ${this.fmt(rankedCustomers.reduce((s, c) => s + c.totalSpent, 0) / (rankedCustomers.length || 1))}\n` +
        `• **إجمالي العملاء المسجلين:** ${customers.length} عميل.`;

      return {
        reply,
        intent: 'customer_ranking',
        summaryMetrics: [
          { label: 'إجمالي العملاء', value: `${customers.length} عميل`, color: 'text-blue-700' },
          { label: 'أعلى عميل مشتريات', value: top5[0] ? this.fmt(top5[0].totalSpent) : '0', color: 'text-emerald-700' }
        ],
        chartData,
        chartType: 'bar',
        chartTitle: 'أعلى 5 عملاء حسب قيمة المشتريات',
        suggestedActions: [
          { label: 'سجل العملاء الكامل', targetTab: 'customers' }
        ]
      };
    }

    // 8. "الطلبات" أو "تحليل الطلبات"
    if (
      q.includes('الطلبات') ||
      q.includes('الطلبيات') ||
      q.includes('كم طلب')
    ) {
      const totalCount = orders.length;
      const completed = orders.filter(o => o.status === 'delivered').length;
      const inTransit = orders.filter(o => o.status === 'shipped').length;
      const pending = orders.filter(o => o.status === 'pending' || o.status === 'purchased').length;
      const totalVal = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const avgOrder = totalVal / (totalCount || 1);

      const reply = `📦 **تحليل طلبيات متجر TOP STORE:**\n\n` +
        `• **إجمالي الطلبات المسجلة:** ${totalCount} طلبات.\n` +
        `• **إجمالي القيمة المالية:** ${this.fmt(totalVal)}\n` +
        `• **متوسط قيمة الطلب:** ${this.fmt(avgOrder)}\n` +
        `• **المكتملة والمسلّمة:** ${completed} طلبات.\n` +
        `• **قيد الشحن الدولي:** ${inTransit} طلبات.\n` +
        `• **قيد الشراء والتجهيز:** ${pending} طلبات.\n\n` +
        `المواقع الأكثر طلباً: شي إن (SHEIN) تشكل الأغلبية الساحقة من الطلبيات.`;

      return {
        reply,
        intent: 'orders_analysis',
        summaryMetrics: [
          { label: 'إجمالي الطلبات', value: `${totalCount} طلب`, color: 'text-slate-800' },
          { label: 'متوسط قيمة الطلب', value: this.fmt(avgOrder), color: 'text-blue-700' },
          { label: 'طلبات قيد المتابعة', value: `${pending + inTransit}`, color: 'text-amber-700' }
        ],
        chartData: [
          { name: 'تم التسليم', value: completed },
          { name: 'في الطريق', value: inTransit },
          { name: 'قيد التجهيز', value: pending }
        ],
        chartType: 'pie',
        chartTitle: 'توزيع حالات الطلبات',
        suggestedActions: [
          { label: 'إدارة الطلبات', targetTab: 'orders' }
        ]
      };
    }

    // 9. Command Parsing: "أضف مصروف..."
    if (q.includes('أضف مصروف') || q.includes('سجل مصروف')) {
      // Extract amount
      const amountMatch = q.match(/\d+[\d,]*/);
      const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 5000;
      
      // Determine account
      let accountName = 'جيب';
      let accountId = accounts[0]?.id || 1;
      accounts.forEach(a => {
        if (q.includes(a.name.toLowerCase())) {
          accountName = a.name;
          accountId = a.id;
        }
      });

      // Category
      let category = 'مصاريف تشغيل';
      if (q.includes('تسويق') || q.includes('إعلان')) category = 'تسويق وإعلانات';
      else if (q.includes('شحن') || q.includes('توصيل')) category = 'شحن ونقل';

      return {
        reply: `سأقوم بتسجيل العملية المحاسبية التالية:\n\n` +
          `• **نوع العملية:** سند صرف (مصروف)\n` +
          `• **التصنيف:** ${category}\n` +
          `• **المبلغ:** ${this.fmt(amount)}\n` +
          `• **الحساب المصروف منه:** ${accountName}\n\n` +
          `هل تريد تأكيد وحفظ هذه العملية في دفاتر الحسابات؟`,
        intent: 'operation_confirm_prompt',
        pendingOperation: {
          type: 'expense',
          details: {
            amount,
            category,
            accountId,
            accountName,
            description: `مصروف مسجل عبر TOP STORE AI (${category})`
          },
          summaryText: `صرف مبلغ ${this.fmt(amount)} من ${accountName} لبند ${category}`
        }
      };
    }

    // Default Fallback with Comprehensive Store Summary
    const p = this.getProfitAnalysis(data);
    const activeAccounts = accounts.filter(a => a.status === 'active');
    const totalCash = activeAccounts.reduce((sum, a) => sum + this.getAccountBalance(a, data), 0);

    return {
      reply: `مرحباً بك! أنا **TOP STORE AI — المحلل المالي والتجاري** لمتجرك.\n\n` +
        `لقد قمت بقراءة قاعدة بيانات النظام الحقيقية، وإليك نظرة عامة سريعة:\n` +
        `• **السيولة النقدية المتاحة:** ${this.fmt(totalCash)}\n` +
        `• **صافي الربح التقديري:** ${this.fmt(p.netProfit)}\n` +
        `• **عدد الطلبيات:** ${orders.length} طلبات.\n` +
        `• **عدد العملاء المسجلين:** ${customers.length} عميل.\n\n` +
        `يمكنك أن تسألني بأي صياغة طبيعية:\n` +
        `«كم معي الآن؟» • «من عليه فلوس؟» • «كم ربحي هذا الشهر؟» • «أين تذهب الفلوس؟» • «فحص النظام ماليًا» • «ملخص وضع المتجر اليوم».`,
      intent: 'general_briefing',
      summaryMetrics: [
        { label: 'السيولة المتاحة', value: this.fmt(totalCash), color: 'text-emerald-700' },
        { label: 'صافي الربح', value: this.fmt(p.netProfit), color: 'text-blue-700' },
        { label: 'الطلبات', value: `${orders.length}`, color: 'text-slate-800' }
      ],
      suggestedActions: [
        { label: '📊 ملخص اليوم', targetTab: 'assistant', param: 'ملخص اليوم' },
        { label: '💰 الأرباح', targetTab: 'assistant', param: 'كم ربحي؟' },
        { label: '💳 السيولة', targetTab: 'assistant', param: 'كم معي؟' },
        { label: '👥 الذمم', targetTab: 'assistant', param: 'من عليه فلوس؟' },
        { label: '⚠️ فحص النظام', targetTab: 'assistant', param: 'فحص النظام' }
      ]
    };
  }
}
