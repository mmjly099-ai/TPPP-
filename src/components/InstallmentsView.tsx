import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wallet,
  Search,
  Filter,
  DollarSign,
  User,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Phone,
  Check,
  CreditCard,
  FileText,
  BadgeAlert,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order, Payment, Customer } from '../types';
import { numberToArabicWords } from '../utils/tafqeet';
import { ReceiptModal } from './modals/ReceiptModal';

export const InstallmentsView: React.FC = () => {
  const {
    orders,
    payments,
    customers,
    accounts,
    recordPayment,
    getCustomerBalance
  } = useStore();

  // Selected Order
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Search & Filter for Orders list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid'>('all');

  // Form State: "الدفعة التي اريد ادفعها الان"
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب') || a.name.includes('كريمي')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });
  const [paymentType, setPaymentType] = useState<string>('عربون / دفعة أولى');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statement, setStatement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);

  // Orders with remaining amount priority list
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'cancelled');
  }, [orders]);

  // Set default selected order if none is selected
  useEffect(() => {
    if (!selectedOrderId && activeOrders.length > 0) {
      // Prioritize order with remaining debt
      const withDebt = activeOrders.find(o => (o.remainingAmount || 0) > 0);
      setSelectedOrderId(withDebt ? withDebt.id : activeOrders[0].id);
    }
  }, [activeOrders, selectedOrderId]);

  // Current Selected Order Object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Customer for Selected Order
  const selectedCustomer = useMemo(() => {
    if (!selectedOrder) return null;
    return customers.find(c => c.id === selectedOrder.customerId) || null;
  }, [customers, selectedOrder]);

  // Previous payments specifically for this order
  const previousPayments = useMemo(() => {
    if (!selectedOrder) return [];
    return payments
      .filter(p => p.orderId === selectedOrder.id && p.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
  }, [payments, selectedOrder]);

  // Update default payment amount and statement when selected order changes
  useEffect(() => {
    if (selectedOrder) {
      const remaining = selectedOrder.remainingAmount || 0;
      setPaymentAmount(remaining > 0 ? String(remaining) : '0');
      
      const pType = (selectedOrder.paidAmount || 0) === 0 ? 'عربون / دفعة أولى' : (remaining <= 0 ? 'دفعة تسوية' : 'دفعة لاحقة');
      setPaymentType(pType);
      setStatement(`سداد ${pType} للطلب ${selectedOrder.orderNumber} (${selectedOrder.site || 'شي إن'})`);
      setFormError('');
    }
  }, [selectedOrderId]);

  // Overall Financial Statistics
  const overallStats = useMemo(() => {
    const totalOrderValues = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCollected = activeOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalRemaining = activeOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
    const collectionRate = totalOrderValues > 0 ? Math.round((totalCollected / totalOrderValues) * 100) : 0;

    return {
      totalOrderValues,
      totalCollected,
      totalRemaining,
      collectionRate,
      unpaidCount: activeOrders.filter(o => (o.remainingAmount || 0) > 0).length,
      fullyPaidCount: activeOrders.filter(o => (o.remainingAmount || 0) === 0).length
    };
  }, [activeOrders]);

  // Filtered Orders for the Selection Table
  const filteredOrders = useMemo(() => {
    return activeOrders.filter(o => {
      const remaining = o.remainingAmount || 0;
      const paid = o.paidAmount || 0;

      // Status filter
      if (filterStatus === 'unpaid' && remaining <= 0) return false;
      if (filterStatus === 'paid' && remaining > 0) return false;
      if (filterStatus === 'partially_paid' && (paid === 0 || remaining <= 0)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = String(o.orderNumber || '').toLowerCase().includes(q);
        const nameMatch = (o.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (o.customerPhone || '').includes(q);
        const itemsMatch = (o.itemsDescription || '').toLowerCase().includes(q);
        const siteMatch = (o.site || '').toLowerCase().includes(q);
        return numMatch || nameMatch || phoneMatch || itemsMatch || siteMatch;
      }

      return true;
    });
  }, [activeOrders, filterStatus, searchQuery]);

  // Numeric calculations for form
  const numPayNow = Number(paymentAmount) || 0;
  const currentRem = selectedOrder ? (selectedOrder.remainingAmount || 0) : 0;
  const remainingAfterPayment = Math.max(0, currentRem - numPayNow);
  const amountWords = numPayNow > 0 ? numberToArabicWords(numPayNow) : '';

  // Handle Recording the Payment Now
  const handleRecordPaymentNow = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedOrder) {
      setFormError('يرجى اختيار الطلب أولاً');
      return;
    }

    if (numPayNow <= 0) {
      setFormError('يرجى إدخال مبلغ دفع صحيح أكبر من صفر');
      return;
    }

    if (!selectedAccountId) {
      setFormError('يرجى تحديد حساب الدفع أو المحفظة');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const selectedAcc = accounts.find(a => a.id === selectedAccountId);

      const created = recordPayment({
        customerId: selectedOrder.customerId,
        orderId: selectedOrder.id,
        amount: numPayNow,
        accountId: selectedAccountId,
        paymentMethod: selectedAcc?.name || 'محفظة',
        paymentType,
        statement: statement.trim() || `سداد ${paymentType} للطلب ${selectedOrder.orderNumber}`,
        notes: notes.trim() || undefined
      });

      setIsSubmitting(false);

      // Offer to view and print official receipt
      if (created) {
        setReceiptToPrint(created);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'حدث خطأ أثناء حفظ الدفعة');
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-amber-950 rounded-2xl text-white p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300 mb-2">
              <Receipt className="w-3.5 h-3.5" />
              <span>نظام دفعات الطلبات والتحصيل</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">إدارة دفعات الطلبات وسندات القبض</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              اختر أي طلبية للاطلاع على بياناتها وتاريخ دفعاتها السابقة وسداد الدفعة الحالية فوراً مع إصدار سند القبض الرسمي.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-left">
              <span className="text-[11px] text-amber-200 block font-medium">نسبة التحصيل الكلية</span>
              <span className="text-xl font-black font-mono text-white">{overallStats.collectionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي قيمة الطلبيات</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {overallStats.totalOrderValues.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-slate-400">{activeOrders.length} طلبيات نشطة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">المبالغ المحصلة (المدفوعة)</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {overallStats.totalCollected.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">{overallStats.fullyPaidCount} طلب مسدد بالكامل</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">المتبقي المطلوب تحصيله</span>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            {overallStats.totalRemaining.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-rose-600 font-bold">{overallStats.unpaidCount} طلب فيه مبالغ معلقة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">الطلب المختار حالياً</span>
          <div className="text-base sm:text-lg font-black text-indigo-700 font-mono truncate">
            {selectedOrder ? `#${selectedOrder.orderNumber}` : 'لم يُحدد'}
          </div>
          <span className="text-[11px] text-slate-500 truncate block">
            {selectedOrder?.customerName || 'اختر طلباً من القائمة أدناه'}
          </span>
        </div>
      </div>

      {/* Quick Order Switcher Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border-2 border-amber-500/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">اختيار الطلب الحالي للسداد والاستعراض</h3>
            <p className="text-[11px] text-slate-500">اختر أي طلبية مباشرة لعرض تفاصيلها ودفعاتها السابقة وسداد الدفعة الآن</p>
          </div>
        </div>

        <div className="w-full md:w-96">
          <select
            value={selectedOrderId || ''}
            onChange={e => setSelectedOrderId(Number(e.target.value))}
            className="w-full p-2.5 rounded-xl border-2 border-amber-500/50 focus:border-amber-500 bg-amber-50/40 text-xs font-black text-slate-900 focus:outline-none cursor-pointer"
          >
            {activeOrders.map(o => (
              <option key={o.id} value={o.id}>
                طلب #{o.orderNumber} • {o.customerName} • {o.site || 'شي إن'} (المتبقي: {(o.remainingAmount || 0).toLocaleString()} YER)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Order Payment Workspace: 3 Panels */}
      {selectedOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Panel 1 & 2: Order Data + Previous Payments History (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Panel 1: بيانات الطلب المختار */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        الطلب #{selectedOrder.orderNumber}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans">
                        {selectedOrder.site || 'شي إن SHEIN'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      تاريخ الطلب: <span className="font-mono text-slate-600">{selectedOrder.orderDate ? selectedOrder.orderDate.split('T')[0] : '—'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    (selectedOrder.remainingAmount || 0) === 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : (selectedOrder.paidAmount || 0) > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {(selectedOrder.remainingAmount || 0) === 0
                      ? 'مسدد بالكامل ✓'
                      : (selectedOrder.paidAmount || 0) > 0
                      ? 'مسدد جزئياً'
                      : 'بانتظار العربون'}
                  </span>
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">العميل صاحب الطلب:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedOrder.customerName}</span>
                  </div>
                </div>

                {selectedOrder.customerPhone && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedOrder.customerPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-mono text-xs font-medium"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{selectedOrder.customerPhone}</span>
                    </a>
                    <a
                      href={`https://wa.me/967${selectedOrder.customerPhone.replace(/^0+/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs"
                      title="مراسلة عبر واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>واتساب</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Description of items */}
              {selectedOrder.itemsDescription && (
                <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
                  <span className="font-bold text-amber-900 block mb-0.5">محتويات وأصناف الطلبية:</span>
                  <p>{selectedOrder.itemsDescription}</p>
                </div>
              )}

              {/* Order Financial Progress Cards */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">إجمالي قيمة الطلب</span>
                  <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                    {(selectedOrder.totalAmount || 0).toLocaleString()} <span className="text-[10px] text-slate-400">YER</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 block mb-1 font-bold">المبلغ المدفوع</span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                    {(selectedOrder.paidAmount || 0).toLocaleString()} <span className="text-[10px] text-emerald-600">YER</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[11px] text-rose-800 block mb-1 font-bold">المتبقي المطلوب</span>
                  <div className="text-base sm:text-lg font-black text-rose-700 font-mono">
                    {(selectedOrder.remainingAmount || 0).toLocaleString()} <span className="text-[10px] text-rose-600">YER</span>
                  </div>
                </div>
              </div>

              {/* Payment Progress Bar */}
              <div>
                {(() => {
                  const total = selectedOrder.totalAmount || 1;
                  const paid = selectedOrder.paidAmount || 0;
                  const pct = Math.min(100, Math.round((paid / total) * 100));
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">نسبة سداد قيمة الطلب:</span>
                        <span className="font-mono text-slate-900">{pct}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            pct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Panel 2: سجل الدفعات السابقة للطلب (Previous Payments) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    سجل الدفعات وسندات القبض السابقة للطلب ({previousPayments.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  إجمالي المسدد: {(selectedOrder.paidAmount || 0).toLocaleString()} YER
                </span>
              </div>

              {previousPayments.length === 0 ? (
                <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-700">لم تُسجل أي دفعات سابقة لهذا الطلب بعد</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    يمكنك تسجيل العربون أو الدفعة الأولى لهذا الطلب مباشرة عبر النموذج على اليسار.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {previousPayments.map((pmt, idx) => (
                    <div
                      key={pmt.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px] font-mono">
                          {previousPayments.length - idx}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {pmt.receiptNumber || pmt.paymentNumber}
                            </span>
                            <span className="px-2 py-0.2 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[10px]">
                              {pmt.paymentType || 'سداد دفعة'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            تاريخ: <span className="font-mono text-slate-700">{pmt.paymentDate ? pmt.paymentDate.split('T')[0] : '—'}</span> • الحساب: <span className="font-bold text-slate-800">{pmt.paymentMethod || 'محفظة'}</span>
                          </div>
                          {pmt.statement && (
                            <p className="text-[11px] text-slate-600 mt-0.5 italic">{pmt.statement}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <div className="font-mono font-black text-emerald-700 text-sm">
                          {Number(pmt.amount).toLocaleString()} YER
                        </div>
                        <button
                          onClick={() => setReceiptToPrint(pmt)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="طباعة وعرض سند القبض الرسمي"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>سند القبض</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>

          {/* Panel 3: الدفعة التي اريد ادفعها الان (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border-2 border-amber-500/40 shadow-md p-5 space-y-4 sticky top-20">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      الدفعة التي تريد دفعها الآن
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      تسجيل دفعة جديدة للطلب #{selectedOrder.orderNumber}
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  المتبقي: {currentRem.toLocaleString()} YER
                </span>
              </div>

              <form onSubmit={handleRecordPaymentNow} className="space-y-4 text-xs">
                
                {/* Payment Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800">
                      مبلغ الدفعة المراد سدادها الآن (YER) *
                    </label>
                    {currentRem > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(currentRem))}
                        className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                      >
                        سداد كامل المتبقي ({currentRem.toLocaleString()} YER)
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="أدخل المبلغ..."
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-amber-500/50 focus:border-amber-500 focus:outline-none text-base font-black font-mono text-slate-900"
                    />
                    <span className="absolute left-3 top-3.5 text-xs text-slate-400 font-bold">
                      ريال يمني
                    </span>
                  </div>

                  {/* Quick Shortcut Buttons for Amount */}
                  {currentRem > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(currentRem))}
                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold cursor-pointer transition"
                      >
                        كامل المبلغ ({currentRem.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(Math.round(currentRem / 2)))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition"
                      >
                        النصف ({Math.round(currentRem / 2).toLocaleString()})
                      </button>
                      {currentRem >= 5000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount('5000')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition"
                        >
                          5,000 YER
                        </button>
                      )}
                      {currentRem >= 10000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount('10000')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition"
                        >
                          10,000 YER
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tafqeet in Arabic Words */}
                  {amountWords && (
                    <div className="mt-1.5 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 font-medium">
                      فقط: <span className="font-bold text-slate-800">{amountWords} لا غير</span>
                    </div>
                  )}
                </div>

                {/* Account / Wallet Selector */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    الحساب / المحفظة المستلمة *
                  </label>
                  <select
                    required
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 bg-white font-medium text-xs"
                  >
                    {accounts.filter(a => a.status === 'active').map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Type & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">نوع الدفعة</label>
                    <select
                      value={paymentType}
                      onChange={e => {
                        setPaymentType(e.target.value);
                        if (selectedOrder) {
                          setStatement(`سداد ${e.target.value} للطلب ${selectedOrder.orderNumber}`);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 bg-white text-xs"
                    >
                      <option value="عربون / دفعة أولى">عربون / دفعة أولى</option>
                      <option value="دفعة ثانية (شحن)">دفعة ثانية (عند الشحن)</option>
                      <option value="دفعة استلام نهائية">دفعة استلام نهائية</option>
                      <option value="دفعة لاحقة">دفعة لاحقة</option>
                      <option value="سداد على الحساب">سداد على الحساب</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1">تاريخ السداد</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Statement & Notes */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">بيان سند القبض</label>
                  <input
                    type="text"
                    value={statement}
                    onChange={e => setStatement(e.target.value)}
                    placeholder="مثال: سداد عربون طلبية ملابس شي إن..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">ملاحظات إضافية (اختياري)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="رقم مرجع الحوالة أو ملاحظات التسليم..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 text-xs"
                  />
                </div>

                {/* Live Real-time Balance Calculation */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>المتبقي الحالي على الطلب:</span>
                    <span className="font-mono font-bold text-slate-900">{currentRem.toLocaleString()} YER</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>المبلغ المدفوع الآن:</span>
                    <span className="font-mono font-bold">- {numPayNow.toLocaleString()} YER</span>
                  </div>
                  <div className="h-px bg-amber-200 my-1"></div>
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>المتبقي الجديد بعد هذه الدفعة:</span>
                    <span className={`font-mono text-sm ${remainingAfterPayment === 0 ? 'text-emerald-700 font-black' : 'text-rose-700'}`}>
                      {remainingAfterPayment === 0 ? '0 YER (سيسدد بالكامل! ✓)' : `${remainingAfterPayment.toLocaleString()} YER`}
                    </span>
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                    {formError}
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || numPayNow <= 0}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>
                    {isSubmitting ? 'جاري الحفظ...' : `تأكيد وقبض الدفعة (${numPayNow.toLocaleString()} YER) ✓`}
                  </span>
                </button>
              </form>

            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-700">لا توجد طلبات محددة</h3>
          <p className="text-xs text-slate-400 mt-1">اختر أي طلب من الجدول أدناه لاستعراض بياناته وسداد دفعاته.</p>
        </div>
      )}

      {/* Orders Directory Table for Fast Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">قائمة طلبيات المتجر لاختيار وسداد الدفعات</h2>
            <span className="text-xs text-slate-400">({filteredOrders.length} طلبات)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب أو العميل..."
                className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilterStatus('unpaid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'unpaid' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                غير مسددة
              </button>
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'paid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مسددة بالكامل
              </button>
            </div>
          </div>
        </div>

        {/* Table Body */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لا توجد طلبيات تطابق معايير البحث المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم الطلب</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">المتجر / الموقع</th>
                  <th className="p-3">إجمالي الطلب</th>
                  <th className="p-3">المبلغ المدفوع</th>
                  <th className="p-3">المبلغ المتبقي</th>
                  <th className="p-3">نسبة السداد</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const isSelected = selectedOrderId === order.id;
                  const total = order.totalAmount || 1;
                  const paid = order.paidAmount || 0;
                  const rem = order.remainingAmount || 0;
                  const pct = Math.min(100, Math.round((paid / total) * 100));

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/80 font-bold border-r-4 border-r-amber-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900">
                        #{order.orderNumber}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{order.customerName}</span>
                        {order.customerPhone && (
                          <span className="text-[11px] text-slate-400 font-mono">{order.customerPhone}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium font-sans">
                          {order.site || 'شي إن'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {(order.totalAmount || 0).toLocaleString()} YER
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {paid.toLocaleString()} YER
                      </td>
                      <td className="p-3 font-mono font-black text-rose-700">
                        {rem > 0 ? `${rem.toLocaleString()} YER` : '0 (مسدد)'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900'
                          }`}
                        >
                          {isSelected ? 'محدد حالياً ✓' : 'اختيار وسداد'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Official Receipt Modal when Payment is printed / issued */}
      {receiptToPrint && (
        <ReceiptModal
          isOpen={true}
          payment={receiptToPrint}
          onClose={() => setReceiptToPrint(null)}
        />
      )}

    </div>
  );
};
