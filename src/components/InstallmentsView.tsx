import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Wallet,
  Search,
  Filter,
  DollarSign,
  User,
  ShoppingBag,
  Share2,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Percent,
  Check,
  Building2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { InstallmentPlan, InstallmentItem, Customer, Order } from '../types';

export const InstallmentsView: React.FC = () => {
  const {
    installmentPlans,
    customers,
    orders,
    accounts,
    addInstallmentPlan,
    payInstallment,
    deleteInstallmentPlan,
    cancelInstallmentPlan
  } = useStore();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed' | 'cancelled'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);

  // New Plan Modal State
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [planCustomerId, setPlanCustomerId] = useState<string>('');
  const [planOrderId, setPlanOrderId] = useState<string>('');
  const [planTitle, setPlanTitle] = useState('');
  const [planTotalAmount, setPlanTotalAmount] = useState<string>('');
  const [planDownPayment, setPlanDownPayment] = useState<string>('');
  const [planDownPaymentAccountId, setPlanDownPaymentAccountId] = useState<string>('');
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [planNotes, setPlanNotes] = useState('');
  const [planTemplate, setPlanTemplate] = useState<'shein_3' | 'split_2' | 'monthly_3' | 'custom'>('shein_3');
  const [customInstallments, setCustomInstallments] = useState<
    { title: string; amount: number; dueDate: string; notes?: string }[]
  >([]);
  const [formError, setFormError] = useState('');

  // Pay Installment Modal State
  const [payingPlan, setPayingPlan] = useState<InstallmentPlan | null>(null);
  const [payingInstallment, setPayingInstallment] = useState<InstallmentItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');

  // Share / Print Modal State
  const [printPlan, setPrintPlan] = useState<InstallmentPlan | null>(null);

  // Customer Orders lookup for dropdown
  const customerOrders = useMemo(() => {
    if (!planCustomerId) return [];
    const cId = Number(planCustomerId);
    return orders.filter(o => o.customerId === cId);
  }, [planCustomerId, orders]);

  // When customer is selected, if they have an order with remaining balance, auto-fill
  const handleCustomerChange = (customerIdStr: string) => {
    setPlanCustomerId(customerIdStr);
    setPlanOrderId('');
    const cId = Number(customerIdStr);
    const cust = customers.find(c => c.id === cId);
    if (!cust) return;

    const uncompletedOrder = orders.find(o => o.customerId === cId && o.remainingAmount > 0);
    if (uncompletedOrder) {
      setPlanOrderId(String(uncompletedOrder.id));
      setPlanTotalAmount(String(uncompletedOrder.totalAmount));
      setPlanDownPayment(String(uncompletedOrder.paidAmount || 0));
      setPlanTitle(`خطة دفعات طلبية #${uncompletedOrder.orderNumber} - ${cust.name}`);
    } else {
      setPlanTitle(`خطة دفعات ومشتريات - ${cust.name}`);
    }
  };

  const handleOrderChange = (orderIdStr: string) => {
    setPlanOrderId(orderIdStr);
    if (!orderIdStr) return;
    const ord = orders.find(o => o.id === Number(orderIdStr));
    if (ord) {
      setPlanTotalAmount(String(ord.totalAmount));
      setPlanDownPayment(String(ord.paidAmount || 0));
      const cust = customers.find(c => c.id === ord.customerId);
      setPlanTitle(`خطة دفعات طلبية #${ord.orderNumber} - ${cust?.name || ''}`);
    }
  };

  // Recompute template installments whenever total, downpayment, or template changes
  const computedTemplateInstallments = useMemo(() => {
    const total = parseFloat(planTotalAmount) || 0;
    const down = parseFloat(planDownPayment) || 0;
    const remaining = Math.max(0, total - down);
    const today = planStartDate || new Date().toISOString().split('T')[0];

    const addDays = (baseDateStr: string, days: number): string => {
      const d = new Date(baseDateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    if (planTemplate === 'shein_3') {
      // 3 Batches: Down Payment (today), Shipping Batch (12 days), Final Delivery Batch (24 days)
      const part1 = down > 0 ? down : Math.round(total * 0.4);
      const remainingAfterDown = Math.max(0, total - part1);
      const part2 = Math.round(remainingAfterDown * 0.5);
      const part3 = Math.max(0, remainingAfterDown - part2);

      return [
        {
          title: 'الدفعة الأولى (العربون عند تأكيد الطلب)',
          amount: part1,
          dueDate: today,
          notes: 'عربون البدء والشراء من الموقع'
        },
        {
          title: 'الدفعة الثانية (عند الشحن الدولي والتتبع)',
          amount: part2,
          dueDate: addDays(today, 12),
          notes: 'تسدد عند وصول الشحنة لمستودع التجميع أو إصدار بوليصة الشحن'
        },
        {
          title: 'الدفعة الثالثة (عند الوصول والاستلام النهائي)',
          amount: part3,
          dueDate: addDays(today, 24),
          notes: 'تسدد نقداً أو تحويلاً عند استلام العميل للطلب'
        }
      ];
    } else if (planTemplate === 'split_2') {
      // 2 Batches: 50% Down, 50% Delivery
      const part1 = down > 0 ? down : Math.round(total * 0.5);
      const part2 = Math.max(0, total - part1);
      return [
        {
          title: 'الدفعة الأولى (مقدم الشراء والعربون)',
          amount: part1,
          dueDate: today,
          notes: 'مقدم شراء الطلبية'
        },
        {
          title: 'الدفعة الأخيرة (عند الاستلام والتسليم)',
          amount: part2,
          dueDate: addDays(today, 18),
          notes: 'المبلغ المتبقي عند تسليم الطلبية'
        }
      ];
    } else if (planTemplate === 'monthly_3') {
      // 3 Monthly equal parts
      const rem = remaining > 0 ? remaining : total;
      const count = 3;
      const piece = Math.round(rem / count);
      const res: { title: string; amount: number; dueDate: string; notes?: string }[] = [];

      if (down > 0) {
        res.push({
          title: 'الدفعة الأولى (العربون المبدئي)',
          amount: down,
          dueDate: today,
          notes: 'عربون مسدد مقدماً'
        });
      }

      for (let i = 1; i <= count; i++) {
        const isLast = i === count;
        const amt = isLast ? Math.max(0, rem - piece * (count - 1)) : piece;
        res.push({
          title: `القسط الشهري #${i}`,
          amount: amt,
          dueDate: addDays(today, i * 30),
          notes: `قسط دوري رقم ${i}`
        });
      }
      return res;
    } else {
      // Custom
      return customInstallments;
    }
  }, [planTotalAmount, planDownPayment, planTemplate, planStartDate, customInstallments]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalScheduled = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    const nowStr = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    installmentPlans.forEach(plan => {
      if (plan.status === 'cancelled') return;
      totalScheduled += Number(plan.totalAmount) || 0;
      totalCollected += Number(plan.paidAmount) || 0;
      totalRemaining += Number(plan.remainingAmount) || 0;

      plan.installments.forEach(inst => {
        if (inst.status !== 'paid') {
          if (inst.dueDate < nowStr) {
            overdueCount++;
          } else if (inst.dueDate <= sevenDaysStr) {
            dueSoonCount++;
          }
        }
      });
    });

    return {
      plansCount: installmentPlans.filter(p => p.status !== 'cancelled').length,
      totalScheduled,
      totalCollected,
      totalRemaining,
      overdueCount,
      dueSoonCount
    };
  }, [installmentPlans]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return installmentPlans.filter(plan => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          const hasOverdue = plan.installments.some(i => i.status !== 'paid' && i.dueDate < today);
          if (!hasOverdue) return false;
        } else if (plan.status !== statusFilter) {
          return false;
        }
      }

      // Customer filter
      if (selectedCustomerId !== 'all' && String(plan.customerId) !== selectedCustomerId) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCust = plan.customerName.toLowerCase().includes(q);
        const matchesPlan = plan.planNumber.toLowerCase().includes(q);
        const matchesOrder = plan.orderNumber ? String(plan.orderNumber).toLowerCase().includes(q) : false;
        const matchesPhone = plan.customerPhone ? plan.customerPhone.includes(q) : false;
        const matchesTitle = plan.title.toLowerCase().includes(q);
        if (!matchesCust && !matchesPlan && !matchesOrder && !matchesPhone && !matchesTitle) {
          return false;
        }
      }

      return true;
    });
  }, [installmentPlans, statusFilter, selectedCustomerId, searchTerm]);

  // Create Plan Submit
  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planCustomerId) {
      setFormError('يرجى اختيار العميل');
      return;
    }
    const total = parseFloat(planTotalAmount) || 0;
    if (total <= 0) {
      setFormError('يرجى إدخال إجمالي مبلغ خطة الدفعات');
      return;
    }
    const down = parseFloat(planDownPayment) || 0;
    if (down > 0 && !planDownPaymentAccountId) {
      setFormError('يرجى اختيار الحساب أو المحفظة التي استلمت مبلغ العربون / الدفعة الأولى');
      return;
    }

    const itemsToSave = computedTemplateInstallments;
    if (!itemsToSave || itemsToSave.length === 0) {
      setFormError('يجب أن تحتوي خطة الدفعات على قسط واحد على الأقل');
      return;
    }

    setFormError('');

    addInstallmentPlan({
      title: planTitle.trim() || `خطة دفعات - ${customers.find(c => c.id === Number(planCustomerId))?.name}`,
      customerId: Number(planCustomerId),
      orderId: planOrderId ? Number(planOrderId) : null,
      totalAmount: total,
      downPayment: down,
      downPaymentAccountId: down > 0 ? Number(planDownPaymentAccountId) : undefined,
      startDate: planStartDate,
      notes: planNotes.trim() || undefined,
      installments: itemsToSave
    });

    setIsNewPlanOpen(false);
    // Reset Form
    setPlanCustomerId('');
    setPlanOrderId('');
    setPlanTitle('');
    setPlanTotalAmount('');
    setPlanDownPayment('');
    setPlanDownPaymentAccountId('');
    setPlanNotes('');
  };

  // Open Payment for an Installment
  const handleOpenPayInstallment = (plan: InstallmentPlan, inst: InstallmentItem) => {
    setPayingPlan(plan);
    setPayingInstallment(inst);
    setPayAmount(String(inst.remainingAmount));
    setPayAccountId(String(accounts[0]?.id || ''));
    setPayNotes(`سداد ${inst.title} لخطة الدفعات #${plan.planNumber}`);
    setPayError('');
  };

  // Submit Payment for an Installment
  const handleSubmitPayInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPlan || !payingInstallment) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      setPayError('يرجى إدخال مبلغ صحيح للسداد');
      return;
    }
    if (amt > payingInstallment.remainingAmount) {
      setPayError(`المبلغ المدخل أكبر من المتبقي من هذا القسط (${payingInstallment.remainingAmount} ريال)`);
      return;
    }
    if (!payAccountId) {
      setPayError('يرجى اختيار حساب أو محفظة الإيداع');
      return;
    }

    setPayError('');
    const acc = accounts.find(a => a.id === Number(payAccountId));

    payInstallment(payingPlan.id, payingInstallment.id, {
      amount: amt,
      accountId: Number(payAccountId),
      paymentMethod: acc?.name || 'نقدي',
      notes: payNotes.trim()
    });

    setPayingPlan(null);
    setPayingInstallment(null);
  };

  // Share WhatsApp Reminder
  const handleShareWhatsApp = (plan: InstallmentPlan, inst?: InstallmentItem) => {
    const cust = customers.find(c => c.id === plan.customerId);
    const phone = plan.customerPhone || cust?.phone;
    if (!phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا العميل');
      return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    if (!cleanPhone.startsWith('967')) cleanPhone = '967' + cleanPhone;

    let msg = `مرحباً أ/ ${plan.customerName}،\nتحية طيبة من متجر TOP STORE 🛍️\n\n`;
    if (inst) {
      msg += `نود تذكيركم بموعد استحقاق:\n*${inst.title}*\nالمبلغ المستحق: *${inst.remainingAmount.toLocaleString()} ريال*\nتاريخ الاستحقاق: *${inst.dueDate}*\n`;
    } else {
      msg += `تفاصيل خطة الدفعات رقم (${plan.planNumber}):\nإجمالي الخطة: *${plan.totalAmount.toLocaleString()} ريال*\nالمسدد حتى الآن: *${plan.paidAmount.toLocaleString()} ريال*\nالمتبقي الكلي: *${plan.remainingAmount.toLocaleString()} ريال*\n`;
    }
    msg += `\nيسعدنا خدمتكم دائماً، وشكراً لتعاملكم الراقي مع توب ستور! ✨`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">نظام الدفعات والأقساط</h2>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
              جدولة وتحصيل الأقساط
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            جدولة دفعات العملاء (عربون مقدم، دفعة عند الشحن، ودفعة عند الاستلام) مع التنبيهات وسندات القبض الآلية
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewPlanOpen(true);
            if (accounts.length > 0) setPlanDownPaymentAccountId(String(accounts[0].id));
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء خطة دفعات جديدة</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold">إجمالي الدفعات المجدولة</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {stats.totalScheduled.toLocaleString()} <span className="text-xs font-sans text-slate-500">ريال</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            في {stats.plansCount} خطة دفعات نشطة
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold">الأقساط المحصلة فعلياً</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
            {stats.totalCollected.toLocaleString()} <span className="text-xs font-sans text-slate-500">ريال</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{
                width: `${stats.totalScheduled > 0 ? Math.min(100, Math.round((stats.totalCollected / stats.totalScheduled) * 100)) : 0}%`
              }}
            />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold">المتبقي قيد التحصيل</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-700">
            {stats.totalRemaining.toLocaleString()} <span className="text-xs font-sans text-slate-500">ريال</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            مستحقات مجدولة على العملاء
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-bold">أقساط متأخرة أو قريبة</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-700">
              {stats.overdueCount}
            </span>
            <span className="text-xs text-rose-600 font-bold">متأخر</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-black font-mono text-amber-600">
              {stats.dueSoonCount}
            </span>
            <span className="text-[11px] text-slate-500">هذا الأسبوع</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            تحتاج لمتابعة وتذكير بالواتساب
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم العميل، رقم الهاتف، رقم الخطة، أو رقم الطلب..."
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Customer filter */}
          <div className="w-full sm:w-56">
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
            >
              <option value="all">جميع العملاء</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع الخطط ({installmentPlans.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سارية ونشطة ({installmentPlans.filter(p => p.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            متأخرة تستحق المتابعة ({stats.overdueCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            مكتملة ومسددة ({installmentPlans.filter(p => p.status === 'completed').length})
          </button>
        </div>
      </div>

      {/* Plans List */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">لا توجد خطط دفعات مطابقة</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            يمكنك إنشاء خطة دفعات جديدة لأي طلب أو عميل لتقسيط المبالغ على دفعات مرحلية مع التنبيهات التلقائية.
          </p>
          <button
            onClick={() => setIsNewPlanOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء أول خطة دفعات الآن</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlans.map(plan => {
            const isExpanded = expandedPlanId === plan.id;
            const percentPaid =
              plan.totalAmount > 0
                ? Math.min(100, Math.round((plan.paidAmount / plan.totalAmount) * 100))
                : 100;
            const todayStr = new Date().toISOString().split('T')[0];

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-amber-300"
              >
                {/* Plan Main Header Card */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                          {plan.planNumber}
                        </span>
                        {plan.orderNumber && (
                          <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            طلب #{plan.orderNumber}
                          </span>
                        )}
                        {plan.status === 'completed' ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            مسددة بالكامل
                          </span>
                        ) : plan.status === 'overdue' ? (
                          <span className="bg-rose-50 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            متأخرة
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            سارية ({plan.installments.filter(i => i.status === 'paid').length} من {plan.installments.length} دفعات)
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{plan.customerName}</span>
                        {plan.customerPhone && (
                          <span className="text-xs font-mono font-normal text-slate-500" dir="ltr">
                            {plan.customerPhone}
                          </span>
                        )}
                      </h3>

                      <p className="text-xs text-slate-500">{plan.title}</p>
                    </div>

                    {/* Right: Amounts & Actions */}
                    <div className="flex flex-wrap items-center gap-4 lg:gap-6 justify-between lg:justify-end">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">إجمالي الخطة</span>
                        <span className="text-base font-black font-mono text-slate-900">
                          {plan.totalAmount.toLocaleString()} ريال
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">المسدد</span>
                        <span className="text-base font-black font-mono text-emerald-700">
                          {plan.paidAmount.toLocaleString()} ريال
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">المتبقي</span>
                        <span className="text-base font-black font-mono text-amber-700">
                          {plan.remainingAmount.toLocaleString()} ريال
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleShareWhatsApp(plan)}
                          title="مشاركة عبر الواتساب"
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'إخفاء الدفعات' : 'عرض الدفعات'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">{percentPaid}%</span>
                  </div>
                </div>

                {/* Expanded Installments Schedule */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-200 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700">
                        جدول ومواعيد دفعات الخطة ({plan.installments.length} أقساط)
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        تاريخ البدء: {plan.startDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {plan.installments.map((inst, idx) => {
                        const isPaid = inst.status === 'paid';
                        const isPartiallyPaid = inst.status === 'partially_paid';
                        const isOverdue = !isPaid && inst.dueDate < todayStr;

                        return (
                          <div
                            key={inst.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isPaid
                                ? 'bg-white border-emerald-200 shadow-2xs'
                                : isOverdue
                                ? 'bg-rose-50/50 border-rose-200 shadow-2xs'
                                : 'bg-white border-slate-200 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-slate-500">
                                قسط #{inst.installmentNumber}
                              </span>
                              {isPaid ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  مسدد
                                </span>
                              ) : isPartiallyPaid ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  مسدد جزئياً
                                </span>
                              ) : isOverdue ? (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  متأخر
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  بانتظار الاستحقاق
                                </span>
                              )}
                            </div>

                            <h5 className="text-xs font-bold text-slate-900 mb-1">{inst.title}</h5>

                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-slate-500">
                                <span>المبلغ المطلوب:</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {inst.amount.toLocaleString()} ريال
                                </span>
                              </div>
                              {inst.paidAmount > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                  <span>المسدد منه:</span>
                                  <span className="font-mono font-bold">
                                    {inst.paidAmount.toLocaleString()} ريال
                                  </span>
                                </div>
                              )}
                              {!isPaid && (
                                <div className="flex justify-between text-amber-700 font-bold">
                                  <span>المتبقي للدفع:</span>
                                  <span className="font-mono">
                                    {inst.remainingAmount.toLocaleString()} ريال
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-100">
                                <span>تاريخ الاستحقاق:</span>
                                <span className="font-mono">{inst.dueDate}</span>
                              </div>
                              {inst.receiptNumber && (
                                <div className="flex justify-between text-slate-400 text-[10px]">
                                  <span>سند القبض:</span>
                                  <span className="font-mono">{inst.receiptNumber}</span>
                                </div>
                              )}
                            </div>

                            {/* Actions on this installment */}
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                              {!isPaid ? (
                                <button
                                  onClick={() => handleOpenPayInstallment(plan, inst)}
                                  className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>تسديد القسط</span>
                                </button>
                              ) : (
                                <div className="flex-1 py-1 text-center text-emerald-700 text-[11px] font-bold bg-emerald-50 rounded-lg">
                                  تم سداده بنجاح ✓
                                </div>
                              )}

                              <button
                                onClick={() => handleShareWhatsApp(plan, inst)}
                                title="تذكير العميل بالواتساب"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 transition-colors cursor-pointer"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Plan Footer notes & deletion */}
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{plan.notes ? `ملاحظات: ${plan.notes}` : ''}</span>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف خطة الدفعات ${plan.planNumber}؟`)) {
                            deleteInstallmentPlan(plan.id);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-bold hover:underline cursor-pointer"
                      >
                        حذف الخطة
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Create New Installment Plan */}
      {isNewPlanOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">إنشاء خطة دفعات وأقساط جديدة</h3>
                  <p className="text-xs text-slate-500">
                    تقسيط طلبية أو مديونية على دفعات مرحلية ومجدولة بتواريخ استحقاق
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewPlanOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              {/* Row 1: Customer & Linked Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">العميل *</label>
                  <select
                    value={planCustomerId}
                    onChange={e => handleCustomerChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:border-amber-500 focus:outline-hidden"
                    required
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الطلب المرتبط (اختياري)</label>
                  <select
                    value={planOrderId}
                    onChange={e => handleOrderChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:border-amber-500 focus:outline-hidden"
                    disabled={!planCustomerId}
                  >
                    <option value="">-- خطة عامة بدون طلب محدد --</option>
                    {customerOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        طلب #{o.orderNumber} - {o.site} ({o.totalAmount} ريال - المتبقي {o.remainingAmount})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Start Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">عنوان / بيان الخطة</label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={e => setPlanTitle(e.target.value)}
                    placeholder="مثال: خطة دفعات طلبية فساتين شي إن"
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-medium focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={planStartDate}
                    onChange={e => setPlanStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-medium focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Amounts & Down Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">إجمالي المبلغ المقسط (ريال) *</label>
                  <input
                    type="number"
                    value={planTotalAmount}
                    onChange={e => setPlanTotalAmount(e.target.value)}
                    placeholder="مثال: 50000"
                    min="1"
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold font-mono focus:border-amber-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">العربون / الدفعة الأولى (ريال)</label>
                  <input
                    type="number"
                    value={planDownPayment}
                    onChange={e => setPlanDownPayment(e.target.value)}
                    placeholder="0 إذا لم يسدد بعد"
                    min="0"
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold font-mono focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">محفظة استلام العربون</label>
                  <select
                    value={planDownPaymentAccountId}
                    onChange={e => setPlanDownPaymentAccountId(e.target.value)}
                    disabled={!planDownPayment || Number(planDownPayment) <= 0}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:border-amber-500 focus:outline-hidden disabled:bg-slate-100"
                  >
                    <option value="">-- اختر محفظة العربون --</option>
                    {accounts
                      .filter(a => a.status === 'active' && a.type !== 'حقوق ملكية')
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">نموذج توزيع الأقساط</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanTemplate('shein_3')}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      planTemplate === 'shein_3'
                        ? 'border-amber-500 bg-amber-50/70 font-bold text-amber-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">قالب شي إن (3 دفعات)</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      عربون 40% + عند الشحن 30% + عند الاستلام 30%
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanTemplate('split_2')}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      planTemplate === 'split_2'
                        ? 'border-amber-500 bg-amber-50/70 font-bold text-amber-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">قالب دفعتين (مناصفة)</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      عربون 50% + عند التسليم 50%
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanTemplate('monthly_3')}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      planTemplate === 'monthly_3'
                        ? 'border-amber-500 bg-amber-50/70 font-bold text-amber-900 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">أقساط دورية (شهرية)</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      تقسيم المتبقي إلى 3 دفعات شهرية
                    </div>
                  </button>
                </div>
              </div>

              {/* Preview of the generated Installments */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  معاينة جدول الدفعات المحسوب ({computedTemplateInstallments.length} أقساط)
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {computedTemplateInstallments.map((inst, i) => (
                    <div key={i} className="p-2.5 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{inst.title}</span>
                        <span className="text-[11px] text-slate-400 block">{inst.notes}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-bold text-amber-800">{inst.amount.toLocaleString()} ريال</span>
                        <span className="text-[11px] text-slate-500 block">تاريخ: {inst.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
                <textarea
                  value={planNotes}
                  onChange={e => setPlanNotes(e.target.value)}
                  placeholder="أي شروط أو اتفاقيات خاصة مع العميل..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-medium focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPlanOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  حفظ وتفعيل خطة الدفعات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Pay Specific Installment */}
      {payingPlan && payingInstallment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">تسديد وتحصيل قسط</h3>
                  <p className="text-xs text-slate-500">
                    العميل: {payingPlan.customerName} ({payingInstallment.title})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPayingPlan(null);
                  setPayingInstallment(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayInstallment} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>إجمالي القسط:</span>
                  <span className="font-mono font-bold">{payingInstallment.amount.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>المتبقي المطلوب سداده:</span>
                  <span className="font-mono">{payingInstallment.remainingAmount.toLocaleString()} ريال</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">المبلغ المراد تحصيله وتسديده الآن (ريال) *</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  max={payingInstallment.remainingAmount}
                  min="1"
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-black font-mono text-emerald-800 text-base focus:border-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">حساب / محفظة الإيداع *</label>
                <select
                  value={payAccountId}
                  onChange={e => setPayAccountId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium focus:border-emerald-500 focus:outline-hidden"
                  required
                >
                  <option value="">-- اختر المحفظة أو البنك --</option>
                  {accounts
                    .filter(a => a.status === 'active' && a.type !== 'حقوق ملكية')
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  سيتم زيادة رصيد هذا الحساب تلقائياً وإصدار سند قبض وإثبات القيد المحاسبي المزدوج.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">البيان / ملاحظات السداد</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayingPlan(null);
                    setPayingInstallment(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                >
                  تأكيد السداد وإصدار سند القبض
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
