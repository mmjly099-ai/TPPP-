import { TopStoreBackup } from '../types';
import {
  buildComprehensiveStoreSnapshot,
  extractQuerySpecificDetails,
  LiveStoreInputs,
  num,
  SystemGroundTruthSnapshot
} from './systemSnapshotBuilder';

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
  engineSource?: 'gemini' | 'deterministic';
  generatedAt?: string;
  notice?: string;
}

export interface ChatHistoryItem {
  sender: 'user' | 'assistant';
  text: string;
}

/**
 * AI Analytics Service for TOP STORE
 * Computes 100% verified StoreContext snapshots and routes queries through
 * the server-side Gemini endpoint (/api/assistant/chat) with full deterministic fallback.
 */
export class AIAnalyticsService {
  static fmt(value: number | string | undefined | null): string {
    const val = num(value);
    return `${Math.round(val).toLocaleString('en-US')} ر.ي`;
  }

  static fmtNum(value: number | string | undefined | null): string {
    const val = num(value);
    return Math.round(val).toLocaleString('en-US');
  }

  static getAccountBalance(account: { id: number; openingBalance?: any }, data: TopStoreBackup): number {
    let bal = num(account.openingBalance);
    (data.tables.financialTransactions || []).forEach(trx => {
      if (Number(trx.accountId) === Number(account.id)) {
        const amt = num(trx.amount);
        if (trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment') {
          bal += amt;
        } else if (trx.type === 'withdrawal' || trx.type === 'transfer_out' || trx.type === 'expense') {
          bal -= amt;
        }
      }
    });
    return bal;
  }

  // =========================================================================
  // 1. Live Proactive Pulse ("ماذا يحدث في TOP STORE؟")
  // =========================================================================
  static getProactiveInsightsFromSnapshot(snap: SystemGroundTruthSnapshot): InsightItem[] {
    const insights: InsightItem[] = [];

    // 1. Liquidity
    const activeAccounts = snap.liquidity.accounts
      .filter(a => a.status === 'active' && !a.isEquity)
      .sort((a, b) => b.currentBalance - a.currentBalance);
    const topAcc = activeAccounts[0];
    insights.push({
      id: 'liquidity-pulse',
      type: 'positive',
      title: 'السيولة النقدية المتاحة',
      text: `إجمالي السيولة الفعلية الآن ${this.fmt(snap.liquidity.totalCashAndBanks)} عبر ${snap.liquidity.activeLiquidityAccountsCount} حسابات نشطة${topAcc ? ` (أعلاها "${topAcc.name}": ${this.fmt(topAcc.currentBalance)})` : ''}.`,
      actionLabel: 'الصناديق والمحافظ',
      actionTab: 'accounts'
    });

    // 2. Sales & Net Profit
    const sp = snap.salesAndProfit.allTime;
    insights.push({
      id: 'profit-pulse',
      type: sp.netProfit >= 0 ? 'positive' : 'critical',
      title: 'المبيعات وصافي الربح التقديري',
      text: `المبيعات ${this.fmt(sp.totalSales)} (${sp.activeOrdersCount} طلب) وصافي الربح ${this.fmt(sp.netProfit)} بهامش ${sp.netProfitMarginPercent}% بعد خصم المصروفات (${this.fmt(sp.totalExpenses)}).`,
      actionLabel: 'مركز التحليلات',
      actionTab: 'analytics'
    });

    // 3. Customer Debts & Credits
    const cl = snap.customersLedger;
    if (cl.debtorsCount > 0) {
      const topDebtor = cl.allCustomers.find(c => c.currentBalance > 0);
      insights.push({
        id: 'debtors-pulse',
        type: 'warning',
        title: 'ذمم ومديونيات العملاء',
        text: `لك عند ${cl.debtorsCount} عملاء مبلغ ${this.fmt(cl.totalPositiveCustomerDebts)}، وعندك أرصدة دائنة للعملاء بقيمة ${this.fmt(cl.totalNegativeCustomerCredits)} (الصافي: ${this.fmt(cl.netCustomerBalances)})${topDebtor ? `. أعلى مدين: ${topDebtor.name} (${this.fmt(topDebtor.currentBalance)})` : ''}.`,
        actionLabel: 'كشف العملاء',
        actionTab: 'customers'
      });
    }

    // 4. Pending / Shipped Orders
    if (sp.pendingOrPurchasedCount + sp.shippedCount > 0) {
      insights.push({
        id: 'active-orders-pulse',
        type: 'info',
        title: 'طلبات قيد التنفيذ والشحن',
        text: `يوجد ${sp.pendingOrPurchasedCount} طلب قيد الشراء والتجهيز و${sp.shippedCount} طلب قيد الشحن تحتاج متابعة التسليم.`,
        actionLabel: 'سجل الطلبات',
        actionTab: 'orders'
      });
    }

    // 5. Courier custody or payables
    if (snap.couriersSummary.totalCustodyBalance > 0 || snap.couriersSummary.totalPayableBalance > 0) {
      insights.push({
        id: 'couriers-pulse',
        type: snap.couriersSummary.totalCustodyBalance > 0 ? 'warning' : 'info',
        title: 'عهد ومستحقات الموصّلين',
        text: `عهدة نقدية لدى الموصلين: ${this.fmt(snap.couriersSummary.totalCustodyBalance)} | مستحقات توصيل لهم: ${this.fmt(snap.couriersSummary.totalPayableBalance)}.`,
        actionLabel: 'إدارة الموصلين',
        actionTab: 'couriers'
      });
    }

    // 6. Accounting Audit Status
    insights.push({
      id: 'audit-pulse',
      type: snap.accountingAudit.passed && snap.customersLedger.reconciliation.mismatchedCount === 0 ? 'positive' : 'warning',
      title: 'سلامة النظام والمطابقة المحاسبية',
      text: `تم اجتياز ${snap.accountingAudit.passedChecks}/${snap.accountingAudit.totalChecks} فحوصات، ونسبة مطابقة حسابات العملاء ${snap.customersLedger.reconciliation.matchRate}%.`,
      actionLabel: 'دفتر اليومية',
      actionTab: 'journal'
    });

    return insights;
  }

  static getProactiveInsights(data: TopStoreBackup): InsightItem[] {
    const orders = data.tables.orders || [];
    const accounts = data.tables.accounts || [];
    const expenses = (data.tables.expenses || []).filter(e => e.status !== 'cancelled');
    const customers = data.tables.customers || [];

    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const totalSales = activeOrders.reduce((s, o) => s + num(o.totalAmount), 0);
    const totalExp = expenses.reduce((s, e) => s + num(e.amount), 0);
    const activeAccs = accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية');
    const totalCash = activeAccs.reduce((s, a) => s + this.getAccountBalance(a, data), 0);

    return [
      {
        id: 'liq-fallback',
        type: 'positive',
        title: 'السيولة النقدية المتاحة',
        text: `إجمالي السيولة ${this.fmt(totalCash)} عبر ${activeAccs.length} حسابات نشطة.`,
        actionLabel: 'الحسابات والمحافظ',
        actionTab: 'accounts'
      },
      {
        id: 'sales-fallback',
        type: 'info',
        title: 'ملخص المبيعات والمصروفات',
        text: `إجمالي المبيعات ${this.fmt(totalSales)} (${activeOrders.length} طلب) وإجمالي المصروفات ${this.fmt(totalExp)} عبر ${customers.length} عميل.`,
        actionLabel: 'التحليلات',
        actionTab: 'analytics'
      }
    ];
  }

  // =========================================================================
  // 2. Accounting Anomaly Detection (Fallback / Direct Audit)
  // =========================================================================
  static detectAccountingAnomaliesFromSnapshot(snap: SystemGroundTruthSnapshot): AnomalyItem[] {
    const anomalies: AnomalyItem[] = [];

    snap.accountingAudit.errors.forEach((err, i) => {
      anomalies.push({
        id: `audit-err-${i}`,
        severity: 'high',
        title: 'خطأ محاسبي في فحص النظام',
        description: err,
        suspectReason: 'ملاحظة من محرك التدقيق المحاسبي',
        actionType: 'journal'
      });
    });

    snap.customersLedger.reconciliation.mismatchedCustomers.forEach((mc, i) => {
      anomalies.push({
        id: `cust-rec-${mc.customerId}-${i}`,
        severity: 'medium',
        title: `فارق مطابقة للعميل ${mc.name} (${mc.code})`,
        description: `الرصيد التشغيلي (${this.fmt(mc.operationalBalance)}) يختلف عن دفتر الأستاذ (${this.fmt(mc.ledgerBalance)}) بفارق ${this.fmt(mc.difference)}.`,
        amount: Math.abs(mc.difference),
        suspectReason: 'عدم تزامن قيد قديم مع الفواتير أو الدفعات',
        actionType: 'customers',
        actionTargetId: mc.customerId
      });
    });

    return anomalies;
  }

  // =========================================================================
  // 3. Main Hybrid Entry Point (Server Gemini + Verified Snapshot + Exact Fallback)
  // =========================================================================
  async processUserQuery(
    query: string,
    storeInputs: LiveStoreInputs,
    history: ChatHistoryItem[] = []
  ): Promise<AssistantAnswer> {
    const trimmed = query.trim();
    const q = trimmed.toLowerCase();

    // Check for explicit quick expense command first ("أضف مصروف ..." / "سجل مصروف ...")
    if (
      (q.includes('أضف مصروف') || q.includes('اضف مصروف') || q.includes('سجل مصروف')) &&
      !q.includes('كيف') &&
      !q.includes('كم')
    ) {
      const amountMatch = trimmed.match(/\d[\d,]*/);
      const amount = amountMatch ? num(amountMatch[0]) : 0;
      if (amount > 0) {
        const activeAccounts = (storeInputs.accounts || []).filter(
          a => a.status === 'active' && a.type !== 'حقوق ملكية'
        );
        let matchedAcc = activeAccounts[0] || storeInputs.accounts[0];
        activeAccounts.forEach(a => {
          if (q.includes(a.name.toLowerCase())) {
            matchedAcc = a;
          }
        });

        let category = 'مصاريف تشغيل';
        if (q.includes('تسويق') || q.includes('إعلان') || q.includes('اعلان')) category = 'تسويق وإعلانات';
        else if (q.includes('شحن') || q.includes('توصيل')) category = 'شحن ونقل لوجستي';
        else if (q.includes('مواصلات')) category = 'مواصلات';
        else if (q.includes('قات')) category = 'قات';
        else if (q.includes('عشاء') || q.includes('غداء') || q.includes('وجب')) category = 'عشاء';
        else if (q.includes('إنترنت') || q.includes('انترنت') || q.includes('نت')) category = 'إنترنت';

        return {
          reply:
            `تم تجهيز سند الصرف التالي بالاعتماد على الحسابات النشطة في النظام:\n` +
            `• نوع العملية: سند صرف (مصروف)\n` +
            `• التصنيف: ${category}\n` +
            `• المبلغ: ${AIAnalyticsService.fmt(amount)}\n` +
            `• الحساب المصروف منه: ${matchedAcc?.name || 'الخزينة'}\n\n` +
            `يرجى مراجعة التفاصيل وتأكيد الحفظ من نافذة الاعتماد.`,
          intent: 'operation_confirm_prompt',
          engineSource: 'deterministic',
          generatedAt: new Date().toISOString(),
          pendingOperation: {
            type: 'expense',
            details: {
              amount,
              category,
              accountId: matchedAcc?.id || 1,
              accountName: matchedAcc?.name || 'الخزينة',
              description: `مصروف مسجل عبر المساعد الذكي: ${trimmed}`
            },
            summaryText: `صرف مبلغ ${AIAnalyticsService.fmt(amount)} من "${matchedAcc?.name || 'الخزينة'}" تحت بند "${category}"`
          }
        };
      }
    }

    // Build 100% live verified snapshot & query-specific records directly from StoreContext
    const snapshot = buildComprehensiveStoreSnapshot(storeInputs);
    const queryDetails = extractQuerySpecificDetails(trimmed, storeInputs);

    // Call Server-Side Gemini Endpoint (/api/assistant/chat)
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history,
          snapshot,
          queryDetails
        })
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success && json?.data?.reply) {
        return {
          reply: json.data.reply,
          intent: json.data.intent || 'gemini_analysis',
          summaryMetrics: json.data.summaryMetrics || [],
          suggestedActions: json.data.suggestedActions || [],
          engineSource: 'gemini',
          generatedAt: snapshot.meta.generatedAt
        };
      }

      // If Gemini API key is missing or server error occurred, fall back to exact 100% local deterministic analyzer
      const fallback = AIAnalyticsService.buildDeterministicAnswer(trimmed, snapshot, queryDetails);
      const isKeyIssue = json?.errorCode === 'MISSING_API_KEY' || json?.errorCode === 'API_KEY_INVALID';
      return {
        ...fallback,
        notice: isKeyIssue
          ? 'تم التحليل من المحرك المحاسبي المحلي بدقة 100%. لتفعيل التحليل الذكي المتقدم، تأكد من ضبط مفتاح Gemini في Settings > Secrets.'
          : 'تم التحليل من المحرك المحاسبي المحلي المتزامن بدقة 100%.'
      };
    } catch {
      const fallback = AIAnalyticsService.buildDeterministicAnswer(trimmed, snapshot, queryDetails);
      return {
        ...fallback,
        notice: 'تم التحليل من المحرك المحاسبي المحلي المتزامن بدقة 100%.'
      };
    }
  }

  /**
   * Backward-compatible static helper
   */
  static processNaturalQuery(query: string, data: TopStoreBackup): AssistantAnswer {
    const accounts = data.tables.accounts || [];
    const customers = data.tables.customers || [];
    const orders = data.tables.orders || [];
    const payments = data.tables.payments || [];
    const expenses = data.tables.expenses || [];
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const totalSales = activeOrders.reduce((s, o) => s + num(o.totalAmount), 0);
    const totalExp = expenses.filter(e => e.status !== 'cancelled').reduce((s, e) => s + num(e.amount), 0);
    const totalCash = accounts
      .filter(a => a.status === 'active' && a.type !== 'حقوق ملكية')
      .reduce((s, a) => s + this.getAccountBalance(a, data), 0);

    return {
      reply:
        `ملخص سريع من بيانات المتجر (${customers.length} عميل، ${activeOrders.length} طلب):\n` +
        `• السيولة المتاحة: ${this.fmt(totalCash)}\n` +
        `• إجمالي المبيعات: ${this.fmt(totalSales)}\n` +
        `• إجمالي المصروفات: ${this.fmt(totalExp)}`,
      intent: 'general_briefing',
      engineSource: 'deterministic',
      summaryMetrics: [
        { label: 'السيولة', value: this.fmt(totalCash), color: 'text-emerald-700' },
        { label: 'المبيعات', value: this.fmt(totalSales), color: 'text-blue-700' },
        { label: 'المصروفات', value: this.fmt(totalExp), color: 'text-rose-700' }
      ],
      suggestedActions: [{ label: 'فتح مركز التحليلات', targetTab: 'analytics' }]
    };
  }

  // =========================================================================
  // 4. Comprehensive 100% Accurate Deterministic Analyzer (Fallback Engine)
  // =========================================================================
  static buildDeterministicAnswer(
    query: string,
    snap: SystemGroundTruthSnapshot,
    details: Record<string, any>
  ): AssistantAnswer {
    const q = query.trim().toLowerCase();
    const f = (n: number) => this.fmt(n);

    // 1. Specific matched customer(s)
    if (Array.isArray(details.matchedCustomers) && details.matchedCustomers.length > 0) {
      const custs = details.matchedCustomers;
      const lines = custs.map((c: any) => {
        const balStatus =
          c.currentBalance > 0.01
            ? `عليه للمتجر: ${f(c.currentBalance)}`
            : c.currentBalance < -0.01
            ? `رصيد دائن له (مقدم): ${f(Math.abs(c.currentBalance))}`
            : 'مسدد بالكامل (0 ر.ي)';
        return (
          `• العميل: ${c.name} (${c.code}) ${c.phone ? `- هاتف: ${c.phone}` : ''}\n` +
          `  - الرصيد الافتتاحي: ${f(c.openingBalance)} | عدد الطلبات: ${c.orders.length}\n` +
          `  - إجمالي الطلبات: ${f(c.totalOrdersDebit || c.orders.reduce((s: number, o: any) => s + o.totalAmount, 0))}\n` +
          `  - إجمالي المدفوعات المعتمدة: ${f(c.payments.reduce((s: number, p: any) => s + p.amount, 0))}\n` +
          `  - الصافي الحالي: ${balStatus}`
        );
      });

      return {
        reply: `كشف تفصيلي دقيق للعملاء المطابقين لسؤالك:\n\n${lines.join('\n\n')}`,
        intent: 'customer_lookup',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: custs.slice(0, 3).map((c: any) => ({
          label: c.name,
          value: f(c.currentBalance),
          color: c.currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
        })),
        suggestedActions: [
          { label: 'سجل العملاء', targetTab: 'customers' },
          { label: 'سند قبض جديد', targetTab: 'invoices' }
        ]
      };
    }

    // 2. Specific matched order(s)
    if (Array.isArray(details.matchedOrders) && details.matchedOrders.length > 0 && !q.includes('كل الطلبات')) {
      const ords = details.matchedOrders;
      const text = ords
        .slice(0, 5)
        .map(
          (o: any) =>
            `• طلب #${o.orderNumber} (${o.internalNumber || `ID:${o.id}`}) — العميل: ${o.customerName}\n` +
            `  - الموقع: ${o.site} | الحالة: ${o.status} | التاريخ: ${o.orderDate}\n` +
            `  - الإجمالي: ${f(o.totalAmount)} | المدفوع: ${f(o.paidAmount)} | المتبقي: ${f(o.remainingAmount)}` +
            (o.shipmentNumber ? ` | رقم الشحنة: ${o.shipmentNumber}` : '')
        )
        .join('\n\n');

      return {
        reply: `تفاصيل الطلبات المطابقة من السجلات الحية:\n\n${text}`,
        intent: 'order_lookup',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        suggestedActions: [
          { label: 'إدارة الطلبات', targetTab: 'orders' },
          { label: 'الفواتير', targetTab: 'invoices' }
        ]
      };
    }

    // 3. System Audit / Health Check
    if (q.includes('فحص') || q.includes('مشكلة') || q.includes('مشاكل') || q.includes('أخطاء') || q.includes('سلامة') || q.includes('تدقيق') || q.includes('تطابق')) {
      const au = snap.accountingAudit;
      const rec = snap.customersLedger.reconciliation;
      const reply =
        `نتيجة الفحص الشامل لسلامة النظام المحاسبي:\n\n` +
        `• الفحوصات المجتازة: ${au.passedChecks} من أصل ${au.totalChecks}\n` +
        `• توازن دفتر الأستاذ العام: إجمالي المدين (${f(au.ledgerTotalDebit)}) مقابل إجمالي الدائن (${f(au.ledgerTotalCredit)}) — الفارق: ${f(au.ledgerDiff)}\n` +
        `• مطابقة أرصدة العملاء (${snap.customersLedger.totalCustomersCount} عميل): متطابق ${rec.reconciledCount} | غير متطابق ${rec.mismatchedCount} (نسبة التطابق ${rec.matchRate}%)\n` +
        (au.errors.length > 0 ? `\nأخطاء مكتشفة (${au.errors.length}):\n${au.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}` : '\n• لا توجد أخطاء حرجة في القيود أو الأكواد.') +
        (au.warnings.length > 0 ? `\n\nتنبيهات (${au.warnings.length}):\n${au.warnings.slice(0, 6).map((w, i) => `${i + 1}. ${w}`).join('\n')}` : '');

      return {
        reply,
        intent: 'system_audit',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'الفحوصات الناجحة', value: `${au.passedChecks}/${au.totalChecks}`, color: au.passed ? 'text-emerald-700' : 'text-amber-700' },
          { label: 'مطابقة العملاء', value: `${rec.matchRate}%`, color: rec.mismatchedCount === 0 ? 'text-emerald-700' : 'text-amber-700' },
          { label: 'فارق الميزان', value: f(au.ledgerDiff), color: au.ledgerDiff < 1 ? 'text-emerald-700' : 'text-rose-700' }
        ],
        suggestedActions: [
          { label: 'دفتر اليومية', targetTab: 'journal' },
          { label: 'كشف العملاء', targetTab: 'customers' }
        ]
      };
    }

    // 4. Couriers / Delivery
    if (q.includes('موصل') || q.includes('مندوب') || q.includes('توصيل') || q.includes('عهد')) {
      const cs = snap.couriersSummary;
      const list = cs.couriers
        .map(
          c =>
            `• ${c.name} (${c.code}): عهدة نقدية ${f(c.currentCustodyBalance)} | مستحقات له ${f(c.currentPayableBalance)} | طلبات مسلّمة: ${c.deliveredOrdersCount}`
        )
        .join('\n');
      return {
        reply:
          `تقرير الموصلين والتوصيل:\n\n` +
          `• إجمالي الموصلين: ${cs.couriersCount} | طلبات التوصيل: ${cs.deliveryOrdersCount} (مسلّم: ${cs.deliveredCount}، قيد التوصيل: ${cs.inProgressCount}، تعذر/راجع: ${cs.failedOrReturnedCount})\n` +
          `• إجمالي العهد النقدية بذمة الموصلين: ${f(cs.totalCustodyBalance)}\n` +
          `• إجمالي المستحقات للموصلين: ${f(cs.totalPayableBalance)}\n\n` +
          `التفصيل لكل موصل:\n${list || 'لا يوجد موصلون مسجلون.'}`,
        intent: 'couriers_analysis',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'عهد الموصلين', value: f(cs.totalCustodyBalance), color: 'text-amber-700' },
          { label: 'مستحقاتهم', value: f(cs.totalPayableBalance), color: 'text-blue-700' },
          { label: 'الطلبات المسلّمة', value: `${cs.deliveredCount}`, color: 'text-emerald-700' }
        ],
        suggestedActions: [{ label: 'إدارة الموصلين', targetTab: 'couriers' }]
      };
    }

    // 5. Workers
    if (q.includes('عامل') || q.includes('عمال') || q.includes('موظف') || q.includes('رواتب')) {
      const ws = snap.workersSummary;
      const list = ws.workers
        .map(
          w =>
            `• ${w.name} (${w.role}): الإجمالي ${f(w.totalSpent)} (${w.expensesCount} عملية) — مواصلات: ${f(w.transportTotal)}، عشاء: ${f(w.dinnerTotal)}، قات: ${f(w.qatTotal)}، نت: ${f(w.internetTotal)}، أخرى: ${f(w.otherTotal)}`
        )
        .join('\n');
      return {
        reply: `تقرير العمال ومصروفاتهم (${ws.workersCount} عمال):\n\n• إجمالي مصروفات فريق العمل: ${f(ws.totalAllWorkerExpenses)}\n\n${list || 'لا يوجد عمال مسجلون.'}`,
        intent: 'workers_analysis',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'عدد العمال', value: `${ws.workersCount}`, color: 'text-slate-800' },
          { label: 'إجمالي منصرف العمال', value: f(ws.totalAllWorkerExpenses), color: 'text-rose-700' }
        ],
        suggestedActions: [{ label: 'شؤون العمال', targetTab: 'workers' }]
      };
    }

    // 6. Shipments & Purchase Batches
    if (q.includes('شحن') || q.includes('طرد') || q.includes('دفعات الشراء') || q.includes('دفعة')) {
      const ss = snap.shipmentsSummary;
      const pb = snap.purchaseBatchesSummary;
      return {
        reply:
          `ملخص الشحنات ودفعات الشراء الدولية:\n\n` +
          `• الشحنات المسجلة: ${ss.totalCount} شحنات بإجمالي تكلفة شحن ${f(ss.totalShippingCost)}\n` +
          `${ss.shipments.map(s => `  - شحنة #${s.shipmentNumber} (${s.carrier}): ${f(s.shippingCost)} | ${s.linkedOrdersCount} طلب | الحالة: ${s.status}`).join('\n')}\n\n` +
          `• دفعات الشراء الجماعي: ${pb.totalCount} دفعات بإجمالي تكلفة ${f(pb.grandTotalCost)} (بضاعة: ${f(pb.totalPurchaseCost)} + رسوم شراء وتحويل: ${f(pb.totalPurchaseFees + pb.totalTransferFees)})`,
        intent: 'logistics_batches',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'تكلفة الشحنات', value: f(ss.totalShippingCost), color: 'text-amber-700' },
          { label: 'إجمالي دفعات الشراء', value: f(pb.grandTotalCost), color: 'text-blue-700' }
        ],
        suggestedActions: [
          { label: 'الشحنات', targetTab: 'shipments' },
          { label: 'دفعات الشراء', targetTab: 'purchase-batches' }
        ]
      };
    }

    // 7. Customers & Debts
    if (q.includes('عميل') || q.includes('عملاء') || q.includes('دين') || q.includes('ديون') || q.includes('مديونية') || q.includes('ذمم') || q.includes('فلوس عند')) {
      const cl = snap.customersLedger;
      const topDebtors = cl.allCustomers.filter(c => c.currentBalance > 0).slice(0, 7);
      const creditors = cl.allCustomers.filter(c => c.currentBalance < 0).slice(0, 5);

      return {
        reply:
          `تقرير أرصدة وذمم العملاء الكامل (${cl.totalCustomersCount} عميل):\n\n` +
          `• إجمالي المستحق لنا عند العملاء المدينين (${cl.debtorsCount} عملاء): ${f(cl.totalPositiveCustomerDebts)}\n` +
          `• إجمالي الأرصدة الدائنة للعملاء (${cl.creditorsCount} عملاء لهم رصيد مقدم): ${f(cl.totalNegativeCustomerCredits)}\n` +
          `• صافي رصيد العملاء الإجمالي: ${f(cl.netCustomerBalances)}\n` +
          `• العملاء المسددون بالكامل (صفر): ${cl.settledCount} عميل\n\n` +
          `أعلى العملاء مديونية:\n${topDebtors.map((d, i) => `${i + 1}. ${d.name} (${d.code}): ${f(d.currentBalance)} (${d.ordersCount} طلبات)`).join('\n') || 'لا توجد مديونيات'}` +
          (creditors.length > 0
            ? `\n\nأبرز العملاء ذوي الرصيد الدائن (مبالغ مقدمة لهم):\n${creditors.map(c => `• ${c.name} (${c.code}): ${f(Math.abs(c.currentBalance))}`).join('\n')}`
            : ''),
        intent: 'customers_ledger',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'المستحق لنا (مدينون)', value: f(cl.totalPositiveCustomerDebts), color: 'text-rose-700' },
          { label: 'أرصدة دائنة للعملاء', value: f(cl.totalNegativeCustomerCredits), color: 'text-blue-700' },
          { label: 'صافي أرصدة العملاء', value: f(cl.netCustomerBalances), color: 'text-slate-800' }
        ],
        chartData: topDebtors.slice(0, 5).map(d => ({ name: d.name.split(' ')[0] || d.code, value: d.currentBalance })),
        chartType: 'bar',
        chartTitle: 'أعلى 5 مديونيات عملاء',
        suggestedActions: [
          { label: 'كشف العملاء', targetTab: 'customers' },
          { label: 'سند قبض', targetTab: 'invoices' }
        ]
      };
    }

    // 8. Liquidity / Accounts / Wallets / Visa
    if (q.includes('سيول') || q.includes('كم معي') || q.includes('محفظ') || q.includes('صندوق') || q.includes('بنك') || q.includes('فيزا') || q.includes('حسابات')) {
      const liq = snap.liquidity;
      const activeList = liq.accounts.filter(a => a.status === 'active' && !a.isEquity);
      return {
        reply:
          `تفصيل السيولة النقدية وأرصدة الحسابات والمحافظ:\n\n` +
          `• إجمالي السيولة الفعلية المتاحة: ${f(liq.totalCashAndBanks)}\n` +
          `• محافظ وبنوك: ${f(liq.walletsAndBanksTotal)} | صناديق نقدية: ${f(liq.cashBoxesTotal)} | بطاقات فيزا: ${f(liq.visaCardsTotal)}\n\n` +
          `الأرصدة التفصيلية:\n${activeList.map(a => `• ${a.name} (${a.type}): ${f(a.currentBalance)}`).join('\n')}`,
        intent: 'liquidity_check',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'إجمالي السيولة', value: f(liq.totalCashAndBanks), color: 'text-emerald-700' },
          { label: 'بطاقات الفيزا', value: f(liq.visaCardsTotal), color: 'text-blue-700' },
          { label: 'ذمم العملاء (غير سائلة)', value: f(snap.customersLedger.totalPositiveCustomerDebts), color: 'text-amber-700' }
        ],
        chartData: activeList.filter(a => a.currentBalance > 0).slice(0, 6).map(a => ({ name: a.name, value: a.currentBalance })),
        chartType: 'pie',
        chartTitle: 'توزيع السيولة عبر الحسابات',
        suggestedActions: [{ label: 'الصناديق والمحافظ', targetTab: 'accounts' }]
      };
    }

    // 9. Expenses Breakdown
    if (q.includes('مصروف') || q.includes('مصاريف') || q.includes('صرف') || q.includes('نفقات')) {
      const ex = snap.expensesSummary;
      return {
        reply:
          `التحليل الكامل للمصروفات (${ex.activeExpensesCount} عملية معتمدة):\n\n` +
          `• إجمالي المصروفات الكلي: ${f(ex.totalExpensesAllActive)} (بنسبة ${ex.expenseToSalesRatioPercent}% من المبيعات)\n` +
          `• المصروفات التشغيلية: ${f(ex.operationalExpensesTotal)} | تكاليف الشحن اللوجستي: ${f(ex.shippingSyntheticTotal)}\n\n` +
          `أعلى بنود الصرف:\n${ex.byCategory.slice(0, 6).map((c, i) => `${i + 1}. ${c.category}: ${f(c.total)} (${c.sharePercent}% - ${c.count} عملية)`).join('\n')}`,
        intent: 'expense_breakdown',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'إجمالي المصروفات', value: f(ex.totalExpensesAllActive), color: 'text-rose-700' },
          { label: 'أعلى بند', value: ex.byCategory[0]?.category || '—', color: 'text-slate-800' },
          { label: 'نسبة من المبيعات', value: `${ex.expenseToSalesRatioPercent}%`, color: 'text-amber-700' }
        ],
        chartData: ex.byCategory.slice(0, 6).map(c => ({ name: c.category, value: c.total })),
        chartType: 'pie',
        chartTitle: 'توزيع المصروفات حسب التصنيف',
        suggestedActions: [{ label: 'سجل المصروفات', targetTab: 'expenses' }]
      };
    }

    // 10. Profit, Sales & Monthly Analysis
    if (q.includes('ربح') || q.includes('أرباح') || q.includes('مبيعات') || q.includes('هذا الشهر') || q.includes('الشهر')) {
      const sp = snap.salesAndProfit.allTime;
      const tm = snap.salesAndProfit.thisMonth;
      const lm = snap.salesAndProfit.lastMonth;
      return {
        reply:
          `تقرير المبيعات والأرباح الدقيق:\n\n` +
          `1. الإجمالي العام (${sp.activeOrdersCount} طلب نشط):\n` +
          `• إجمالي المبيعات: ${f(sp.totalSales)} (متوسط الطلب: ${f(sp.aov)})\n` +
          `• تكلفة البضاعة المقدرة/الفعلية: -${f(sp.totalPurchaseCost)}\n` +
          `• مجمل الربح: ${f(sp.grossProfit)} (${sp.grossMarginPercent}%)\n` +
          `• المصروفات التشغيلية واللوجستية: -${f(sp.totalExpenses)}\n` +
          `• صافي الربح المحاسبي: ${f(sp.netProfit)} (هامش صافي: ${sp.netProfitMarginPercent}%)\n` +
          `• المحصل من الطلبات: ${f(sp.totalPaidOnOrders)} (${sp.collectionRate}%) | المتبقي على الطلبات: ${f(sp.totalRemainingOnOrders)}\n\n` +
          `2. هذا الشهر (${tm.monthLabel}):\n` +
          `• الطلبات: ${tm.ordersCount} | المبيعات: ${f(tm.sales)} | المصروفات: ${f(tm.expenses)} | صافي الربح: ${f(tm.netProfit)}\n\n` +
          `3. الشهر الماضي (${lm.monthLabel}):\n` +
          `• الطلبات: ${lm.ordersCount} | المبيعات: ${f(lm.sales)} | المصروفات: ${f(lm.expenses)} | صافي الربح: ${f(lm.netProfit)}`,
        intent: 'profit_analysis',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'إجمالي المبيعات', value: f(sp.totalSales), color: 'text-slate-800' },
          { label: 'مجمل الربح', value: f(sp.grossProfit), color: 'text-blue-700' },
          { label: 'صافي الربح', value: f(sp.netProfit), color: sp.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700' }
        ],
        chartData: [
          { name: 'المبيعات', value: sp.totalSales },
          { name: 'تكلفة الشراء', value: sp.totalPurchaseCost },
          { name: 'المصروفات', value: sp.totalExpenses },
          { name: 'صافي الربح', value: Math.max(0, sp.netProfit) }
        ],
        chartType: 'bar',
        chartTitle: 'ملخص الإيرادات والتكاليف والأرباح',
        suggestedActions: [
          { label: 'مركز التحليلات', targetTab: 'analytics' },
          { label: 'سجل الطلبات', targetTab: 'orders' }
        ]
      };
    }

    // 11. Today Summary
    if (q.includes('اليوم')) {
      const td = snap.salesAndProfit.today;
      return {
        reply:
          `ملخص حركة المتجر اليوم (${td.date}):\n\n` +
          `• الطلبات الجديدة اليوم: ${td.ordersCount} طلب بقيمة ${f(td.sales)}\n` +
          `• المقبوضات النقدية اليوم: +${f(td.cashIn)} (${td.paymentsCount} سندات قبض)\n` +
          `• المصروفات اليوم: -${f(td.cashOut)} (${td.expensesCount} عمليات صرف)\n` +
          `• صافي التدفق النقدي اليوم: ${f(td.netCashFlow)}`,
        intent: 'daily_summary',
        engineSource: 'deterministic',
        generatedAt: snap.meta.generatedAt,
        summaryMetrics: [
          { label: 'مبيعات اليوم', value: f(td.sales), color: 'text-slate-800' },
          { label: 'مقبوضات اليوم', value: f(td.cashIn), color: 'text-emerald-700' },
          { label: 'مصروفات اليوم', value: f(td.cashOut), color: 'text-rose-700' }
        ],
        suggestedActions: [{ label: 'لوحة التحكم', targetTab: 'dashboard' }]
      };
    }

    // 12. Comprehensive 360 System Executive Overview (Default)
    const sp = snap.salesAndProfit.allTime;
    const cl = snap.customersLedger;
    const liq = snap.liquidity;
    const rec = snap.receivablesAndEquity;
    const cs = snap.couriersSummary;

    return {
      reply:
        `ملخص تنفيذي شامل 100% لجميع قطاعات نظام TOP STORE (متزامن لحظياً):\n\n` +
        `1. السيولة والأموال المتاحة:\n` +
        `• إجمالي السيولة في الصناديق والمحافظ والفيزا: ${f(liq.totalCashAndBanks)}\n\n` +
        `2. المبيعات والربحية (${sp.activeOrdersCount} طلب نشط):\n` +
        `• إجمالي المبيعات: ${f(sp.totalSales)} | مجمل الربح: ${f(sp.grossProfit)} | صافي الربح المحاسبي: ${f(sp.netProfit)} (${sp.netProfitMarginPercent}%)\n\n` +
        `3. العملاء والذمم (${cl.totalCustomersCount} عميل):\n` +
        `• المستحق لنا عند العملاء المدينين (${cl.debtorsCount}): ${f(cl.totalPositiveCustomerDebts)}\n` +
        `• الأرصدة الدائنة للعملاء (${cl.creditorsCount}): ${f(cl.totalNegativeCustomerCredits)} | الصافي: ${f(cl.netCustomerBalances)}\n\n` +
        `4. المصروفات والتشغيل:\n` +
        `• إجمالي المصروفات (التشغيلية + الشحن): ${f(snap.expensesSummary.totalExpensesAllActive)}\n` +
        `• مصروفات العمال (${snap.workersSummary.workersCount} عمال): ${f(snap.workersSummary.totalAllWorkerExpenses)}\n` +
        `• عهد الموصلين: ${f(cs.totalCustodyBalance)} | سلف وذمم أخرى غير مسددة: ${f(rec.unsettledRemainingTotal)}\n\n` +
        `5. السلامة المحاسبية:\n` +
        `• نسبة مطابقة حسابات العملاء: ${cl.reconciliation.matchRate}% | فحص النظام: ${snap.accountingAudit.passedChecks}/${snap.accountingAudit.totalChecks}`,
      intent: 'comprehensive_overview',
      engineSource: 'deterministic',
      generatedAt: snap.meta.generatedAt,
      summaryMetrics: [
        { label: 'السيولة المتاحة', value: f(liq.totalCashAndBanks), color: 'text-emerald-700' },
        { label: 'إجمالي المبيعات', value: f(sp.totalSales), color: 'text-slate-800' },
        { label: 'صافي الربح', value: f(sp.netProfit), color: sp.netProfit >= 0 ? 'text-blue-700' : 'text-rose-700' },
        { label: 'ذمم العملاء لنا', value: f(cl.totalPositiveCustomerDebts), color: 'text-amber-700' }
      ],
      suggestedActions: [
        { label: 'مركز التحليلات', targetTab: 'analytics' },
        { label: 'كشف العملاء', targetTab: 'customers' },
        { label: 'الحسابات والمحافظ', targetTab: 'accounts' }
      ]
    };
  }
}
