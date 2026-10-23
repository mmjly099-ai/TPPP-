import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Search,
  Filter,
  Trash2,
  Edit,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Copy,
  Wallet,
  User,
  ShoppingBag,
  Calendar,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Payment } from '../types';

interface PaymentsViewProps {
  onEditPayment: (payment: Payment) => void;
  onOpenReceipt: (payment: Payment) => void;
  onOpenNewPayment: () => void;
  onNavigate?: (tab: any) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onEditPayment,
  onOpenReceipt,
  onOpenNewPayment,
  onNavigate
}) => {
  const {
    payments,
    orders,
    customers,
    accounts,
    deletePayment,
    cancelPayment,
    cleanDuplicatePayments,
    showNotification
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'duplicates' | 'today' | 'month' | 'cancelled'>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // Map helpers
  const customerMap = useMemo(() => {
    const map = new Map<number, string>();
    customers.forEach(c => map.set(c.id, c.name));
    return map;
  }, [customers]);

  const orderMap = useMemo(() => {
    const map = new Map<number, { orderNumber: string; platform: string; totalAmount: number; remainingAmount: number }>();
    orders.forEach(o => map.set(o.id, {
      orderNumber: o.orderNumber,
      platform: o.platform,
      totalAmount: o.totalAmount,
      remainingAmount: o.remainingAmount || 0
    }));
    return map;
  }, [orders]);

  const accountMap = useMemo(() => {
    const map = new Map<number, string>();
    accounts.forEach(a => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  // Identify duplicate payments
  const { duplicateGroups, duplicatePaymentIds, totalDuplicateAmount } = useMemo(() => {
    const groups = new Map<string, Payment[]>();
    const dupIds = new Set<number>();

    // Group active payments by (customerId, orderId, amount, date, accountId)
    payments.forEach(p => {
      if (p.status === 'cancelled') return;
      const dateKey = p.paymentDate?.split('T')[0] || p.createdAt?.split('T')[0] || '';
      const key = `${p.customerId}_${p.orderId || 'none'}_${Number(p.amount)}_${dateKey}_${p.accountId}`;
      
      const current = groups.get(key) || [];
      current.push(p);
      groups.set(key, current);
    });

    // Filter to only groups that have 2 or more payments
    const actualDuplicateGroups: { key: string; payments: Payment[]; extraCount: number; extraAmount: number }[] = [];
    let extraAmountSum = 0;

    groups.forEach((groupPayments, key) => {
      if (groupPayments.length > 1) {
        // Keep the first one as original, the rest as duplicates
        const duplicates = groupPayments.slice(1);
        duplicates.forEach(d => dupIds.add(d.id));
        const extraSum = duplicates.reduce((sum, p) => sum + Number(p.amount), 0);
        extraAmountSum += extraSum;
        actualDuplicateGroups.push({
          key,
          payments: groupPayments,
          extraCount: duplicates.length,
          extraAmount: extraSum
        });
      }
    });

    return {
      duplicateGroups: actualDuplicateGroups,
      duplicatePaymentIds: dupIds,
      totalDuplicateAmount: extraAmountSum
    };
  }, [payments]);

  // KPIs
  const kpis = useMemo(() => {
    const activePayments = payments.filter(p => p.status !== 'cancelled');
    const totalCollected = activePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPayments = activePayments.filter(p => (p.paymentDate || p.createdAt)?.startsWith(todayStr));
    const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      totalCount: payments.length,
      activeCount: activePayments.length,
      totalCollected,
      todayTotal,
      todayCount: todayPayments.length,
      duplicateCount: duplicatePaymentIds.size
    };
  }, [payments, duplicatePaymentIds]);

  // Handle Clean Duplicates
  const handleCleanDuplicates = () => {
    if (duplicatePaymentIds.size === 0) {
      showNotification('لا توجد دفعات مكررة حالياً في النظام.', 'info');
      return;
    }

    if (window.confirm(`هل أنت متأكد من تنظيف وحذف ${duplicatePaymentIds.size} دفعة مكررة وتصحيح أرصدة الطلبات؟`)) {
      setIsCleaning(true);
      try {
        const result = cleanDuplicatePayments();
        if (result && result.removedCount > 0) {
          showNotification(`تم بنجاح إزالة ${result.removedCount} دفعة مكررة واستعادة أرصدة الطلبات بدقة.`, 'success');
        }
      } catch (err: any) {
        showNotification(err?.message || 'حدث خطأ أثناء تنظيف الدفعات', 'error');
      } finally {
        setIsCleaning(false);
      }
    }
  };

  // Handle Single Delete (Permanent for duplicates)
  const handleDeletePayment = (payment: Payment) => {
    const isDuplicate = duplicatePaymentIds.has(payment.id);
    if (isDuplicate) {
      deletePayment(payment.id, { permanent: true });
      setConfirmDeleteId(null);
    } else {
      cancelPayment(payment.id, 'إلغاء سند القبض من سجل الدفعات');
      setConfirmDeleteId(null);
    }
  };

  // Filtered & Sorted Payments List
  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => {
        // Filter by tab
        if (selectedFilter === 'duplicates' && !duplicatePaymentIds.has(p.id)) return false;
        if (selectedFilter === 'cancelled' && p.status !== 'cancelled') return false;
        if (selectedFilter === 'today') {
          const todayStr = new Date().toISOString().split('T')[0];
          if (!(p.paymentDate || p.createdAt)?.startsWith(todayStr)) return false;
        }
        if (selectedFilter === 'month') {
          const currentMonth = new Date().toISOString().slice(0, 7);
          if (!(p.paymentDate || p.createdAt)?.startsWith(currentMonth)) return false;
        }

        // Filter by Account
        if (selectedAccount !== 'all' && String(p.accountId) !== selectedAccount) return false;

        // Filter by Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const customerName = (customerMap.get(p.customerId) || '').toLowerCase();
          const orderInfo = p.orderId ? orderMap.get(p.orderId) : null;
          const orderNumber = (orderInfo?.orderNumber || '').toLowerCase();
          const receiptNo = (p.receiptNumber || p.paymentNumber || '').toLowerCase();
          const notes = (p.notes || '').toLowerCase();
          const amountStr = String(p.amount);

          const matches =
            customerName.includes(q) ||
            orderNumber.includes(q) ||
            receiptNo.includes(q) ||
            notes.includes(q) ||
            amountStr.includes(q);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.paymentDate || a.createdAt).getTime() - new Date(b.paymentDate || b.createdAt).getTime();
        }
        if (sortBy === 'amount-desc') {
          return Number(b.amount) - Number(a.amount);
        }
        if (sortBy === 'amount-asc') {
          return Number(a.amount) - Number(b.amount);
        }
        return 0;
      });
  }, [payments, selectedFilter, selectedAccount, searchQuery, sortBy, duplicatePaymentIds, customerMap, orderMap]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Banknote className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  سجل الدفعات والتحصيلات المباشر
                  {duplicatePaymentIds.size > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                      {duplicatePaymentIds.size} دفعة مكررة
                    </span>
                  )}
                </h1>
                <p className="text-sm text-slate-300">
                  إدارة وتعديل فوري للدفعات النقدية والمصرفية، وكشف الدفعات المكررة وتصحيح أرصدة الطلبات
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {duplicatePaymentIds.size > 0 && (
              <button
                onClick={handleCleanDuplicates}
                disabled={isCleaning}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>تنظيف الدفعات المكررة ({duplicatePaymentIds.size})</span>
              </button>
            )}

            <button
              onClick={onOpenNewPayment}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل دفعة جديدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Alert Card Banner (If duplicates exist) */}
      {duplicatePaymentIds.size > 0 ? (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-950">
                  تنبيه: تم رصد {duplicatePaymentIds.size} دفعات مكررة في النظام بإجمالي {totalDuplicateAmount.toLocaleString()} ر.ي!
                </h3>
                <p className="text-xs text-amber-800 mt-1">
                  تكرار هذه الدفعات يؤدي لإنقاص مبالغ الطلبات المتبقية بشكل غير صحيح وتضخيم رصيد الصندوق. يمكنك حذف الدفعات المكررة بنقرة واحدة لتصحيح أرصدة الطلبات تلقائياً.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setSelectedFilter('duplicates')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors"
              >
                استعراض المكررات فقط
              </button>
              <button
                onClick={handleCleanDuplicates}
                disabled={isCleaning}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow transition-all"
              >
                ⚡ إزالة المكررات الآن
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">سجل الدفعات نظيف 100%:</span>
            <span>لا توجد أي دفعات مكررة متطابقة، وأرصدة الطلبات والعملاء متطابقة مع القيود المالية.</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">إجمالي المقبوضات النشطة</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">
            {kpis.totalCollected.toLocaleString()} <span className="text-xs font-normal text-slate-500">ر.ي</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            من إجمالي {kpis.activeCount} دفعة معتمدة
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">مقبوضات اليوم</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-700">
            {kpis.todayTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">ر.ي</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {kpis.todayCount} دفعات تم تحصيلها اليوم
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">عدد الدفعات الكلي</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">
            {kpis.totalCount} <span className="text-xs font-normal text-slate-500">سجل</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            موثقة بأرقام سندات رسمية
          </div>
        </div>

        <div className={`rounded-2xl p-4 border shadow-sm ${
          duplicatePaymentIds.size > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">الدفعات المكررة</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              duplicatePaymentIds.size > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-black ${duplicatePaymentIds.size > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {duplicatePaymentIds.size > 0 ? `${duplicatePaymentIds.size} مكررة` : 'صفر'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {duplicatePaymentIds.size > 0 ? 'تتطلب التنظيف الفوري' : 'لا توجد أخطاء تكرار'}
          </div>
        </div>
      </div>

      {/* Filter Tabs and Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              كافة الدفعات ({payments.length})
            </button>

            {duplicatePaymentIds.size > 0 && (
              <button
                onClick={() => setSelectedFilter('duplicates')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedFilter === 'duplicates'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                الدفعات المكررة ({duplicatePaymentIds.size})
              </button>
            )}

            <button
              onClick={() => setSelectedFilter('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              دفعات اليوم ({kpis.todayCount})
            </button>

            <button
              onClick={() => setSelectedFilter('month')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedFilter === 'month'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              هذا الشهر
            </button>

            <button
              onClick={() => setSelectedFilter('cancelled')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedFilter === 'cancelled'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              الملغاة / المعكوسة
            </button>
          </div>

          {/* Account selector and Sort */}
          <div className="flex items-center gap-3">
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">كافة الحسابات والمحافظ</option>
              {accounts.map(a => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date-desc">الأحدث أولاً</option>
              <option value="date-asc">الأقدم أولاً</option>
              <option value="amount-desc">الأعلى مبلغاً</option>
              <option value="amount-asc">الأقل مبلغاً</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم العميل، رقم الطلب، رقم سند القبض، المبلغ، أو الملاحظات..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-3 text-xs text-slate-400 hover:text-slate-600"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Main Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>سجل الدفعات</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {filteredPayments.length} دفعة
            </span>
          </div>

          <div className="text-xs text-slate-400">
            انقر على زر "تعديل" لتعديل أي دفعة، أو "حذف المكرر" لإزالة التكرارات فوراً
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Banknote className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-700">لا توجد دفعات مطابقة</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? 'لم يتم العثور على نتائج تطابق معايير البحث' : 'لا توجد دفعات مسجلة في هذا القسم'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">رقم السند</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الطلب المرتبط</th>
                  <th className="py-3 px-4">المبلغ المحصل</th>
                  <th className="py-3 px-4">المحفظة / الحساب</th>
                  <th className="py-3 px-4">نوع الدفعة والملاحظات</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات المباشرة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(p => {
                  const isDuplicate = duplicatePaymentIds.has(p.id);
                  const isCancelled = p.status === 'cancelled';
                  const custName = customerMap.get(p.customerId) || `عميل #${p.customerId}`;
                  const order = p.orderId ? orderMap.get(p.orderId) : null;
                  const accName = accountMap.get(p.accountId) || 'الحساب';
                  const pDate = p.paymentDate ? p.paymentDate.split('T')[0] : p.createdAt?.split('T')[0] || '';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDuplicate ? 'bg-rose-50/50 border-r-4 border-r-rose-500' : ''
                      } ${isCancelled ? 'opacity-60 bg-slate-50/60' : ''}`}
                    >
                      {/* Receipt Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{p.receiptNumber || p.paymentNumber || `#${p.id}`}</span>
                          {isDuplicate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-sans font-bold">
                              مكرر!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {pDate}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{custName}</span>
                        </div>
                      </td>

                      {/* Order */}
                      <td className="py-3 px-4 text-slate-600">
                        {order ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-bold text-slate-800">{order.orderNumber}</span>
                            <span className="text-[10px] px-1 rounded bg-slate-100 text-slate-600 font-sans">
                              {order.platform}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">دفعة عامة في الحساب</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 font-black text-slate-900 text-sm whitespace-nowrap">
                        <span className={isDuplicate ? 'text-rose-700' : 'text-emerald-700'}>
                          {Number(p.amount).toLocaleString()}
                        </span>{' '}
                        <span className="text-[10px] font-normal text-slate-500">ر.ي</span>
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{accName}</span>
                        </div>
                      </td>

                      {/* Type & Notes */}
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        <div className="flex items-center gap-1">
                          {p.paymentType && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium whitespace-nowrap">
                              {p.paymentType}
                            </span>
                          )}
                          <span className="truncate">{p.notes || p.paymentMethod || '—'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <XCircle className="w-3 h-3" />
                            معكوسة / ملغاة
                          </span>
                        ) : isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            دفعة مكررة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            معتمدة
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => onEditPayment(p)}
                            title="تعديل بيانات وقيمة ومحفظة الدفعة"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all shadow-sm hover:scale-105"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-600" />
                            <span>تعديل</span>
                          </button>

                          {/* Print / View Receipt */}
                          <button
                            onClick={() => onOpenReceipt(p)}
                            title="عرض وطباعة سند القبض الرسمي"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs transition-all hover:scale-105"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Duplicate / Cancel Payment */}
                          {isDuplicate ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف هذه الدفعة المكررة (#${p.receiptNumber || p.paymentNumber}) بقيمة ${p.amount} ر.ي وتصحيح رصيد الطلب؟`)) {
                                  deletePayment(p.id, { permanent: true });
                                }
                              }}
                              title="حذف هذه الدفعة المكررة وتصحيح رصيد الطلب فوراً"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow hover:scale-105"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف المكرر</span>
                            </button>
                          ) : !isCancelled ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من إلغاء سند القبض #${p.receiptNumber || p.paymentNumber} وعكس أثره المالي؟`)) {
                                  cancelPayment(p.id, 'إلغاء سند القبض من سجل الدفعات');
                                }
                              }}
                              title="إلغاء رسمي عبر قيد عكسي"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explanatory Help Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>التكامل المالي:</strong> عند تعديل أي دفعة، يتم تلقائياً تحديث رصيد الطلب، ورصيد العميل، وحركة المحفظة الصندوقية وقيد اليومية في الأستاذ العام بدون أي تضارب.
          </span>
        </div>
        <div className="text-slate-400 text-[11px] whitespace-nowrap">
          نظام توب ستور المحاسبي 2026
        </div>
      </div>
    </div>
  );
};
