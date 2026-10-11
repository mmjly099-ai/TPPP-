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
  Sparkles,
  Bike
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
    couriers = [],
    deliveryOrders = [],
    recordPayment,
    getCustomerBalance
  } = useStore();

  // Selected Customer & Selected Order
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
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

  // Courier & Delivery System State for Final Payment
  const [courierId, setCourierId] = useState<number>(() => couriers[0]?.id || 0);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<'cash_to_courier' | 'transfer_to_wallet'>('cash_to_courier');
  const [deliveryFee, setDeliveryFee] = useState<number>(1500);
  const [courierCustodyAmount, setCourierCustodyAmount] = useState<number>(0);
  const [customCustodyEdited, setCustomCustodyEdited] = useState<boolean>(false);

  // Receipt Modal State
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);

  // Orders with remaining amount priority list
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'cancelled');
  }, [orders]);

  // Helper to get all orders for a specific customer (matches by customerId or exact customerName)
  const getOrdersForCustomer = (custId: number | null) => {
    if (!custId) return [];
    const custObj = customers.find(c => c.id === custId);
    return activeOrders.filter(o =>
      o.customerId === custId ||
      (custObj?.name && o.customerName && o.customerName.trim() === custObj.name.trim())
    );
  };

  // Set default selected customer and order if none is selected
  useEffect(() => {
    if (!selectedOrderId && activeOrders.length > 0) {
      // Prioritize order with remaining debt
      const withDebt = activeOrders.find(o => (o.remainingAmount || 0) > 0);
      const initialOrder = withDebt || activeOrders[0];
      setSelectedOrderId(initialOrder.id);
      if (initialOrder.customerId) {
        setSelectedCustomerId(initialOrder.customerId);
      } else {
        const matchedCust = customers.find(c => c.name?.trim() === initialOrder.customerName?.trim());
        if (matchedCust) setSelectedCustomerId(matchedCust.id);
      }
    }
  }, [activeOrders, selectedOrderId, customers]);

  // Handler when user selects a customer
  const handleSelectCustomer = (custId: number) => {
    setSelectedCustomerId(custId);
    const custOrders = getOrdersForCustomer(custId);
    if (custOrders.length > 0) {
      // Prioritize an order with remaining balance, otherwise pick the latest/first order
      const unpaidOrd = custOrders.find(o => (o.remainingAmount || 0) > 0);
      setSelectedOrderId(unpaidOrd ? unpaidOrd.id : custOrders[0].id);
    } else {
      setSelectedOrderId(null);
    }
  };

  // Handler when user selects an order directly
  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    if (order.customerId) {
      setSelectedCustomerId(order.customerId);
    } else {
      const matchedCust = customers.find(c => c.name?.trim() === order.customerName?.trim());
      if (matchedCust) setSelectedCustomerId(matchedCust.id);
    }
  };

  // Current Selected Order Object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Customer for Selected Customer ID or Selected Order
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId) {
      return customers.find(c => c.id === selectedCustomerId) || null;
    }
    if (!selectedOrder) return null;
    return customers.find(c => c.id === selectedOrder.customerId) || null;
  }, [customers, selectedCustomerId, selectedOrder]);

  // All orders belonging to the currently selected customer
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) {
      if (selectedOrder?.customerName) {
        return activeOrders.filter(o => o.customerName?.trim() === selectedOrder.customerName?.trim());
      }
      return [];
    }
    return activeOrders.filter(o =>
      o.customerId === selectedCustomer.id ||
      (selectedCustomer.name && o.customerName && o.customerName.trim() === selectedCustomer.name.trim())
    );
  }, [activeOrders, selectedCustomer, selectedOrder]);

  // Filtered customers for the customer selector search
  const customersWithOrderStats = useMemo(() => {
    return customers.map(c => {
      const cOrders = activeOrders.filter(
        o => o.customerId === c.id || (c.name && o.customerName && o.customerName.trim() === c.name.trim())
      );
      const totalRem = cOrders.reduce((sum, o) => sum + (Number(o.remainingAmount) || 0), 0);
      const totalVal = cOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      return {
        customer: c,
        ordersCount: cOrders.length,
        totalRemaining: totalRem,
        totalValue: totalVal
      };
    }).filter(item => {
      if (!customerSearchQuery.trim()) return true;
      const q = customerSearchQuery.toLowerCase().trim();
      return (
        (item.customer.name || '').toLowerCase().includes(q) ||
        (item.customer.phone || '').includes(q) ||
        (item.customer.code || '').toLowerCase().includes(q) ||
        (item.customer.governorate || '').toLowerCase().includes(q)
      );
    }).sort((a, b) => b.ordersCount - a.ordersCount || b.totalRemaining - a.totalRemaining);
  }, [customers, activeOrders, customerSearchQuery]);

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
      
      const pType = (selectedOrder.paidAmount || 0) === 0
        ? 'عربون / دفعة أولى'
        : (remaining <= 0 ? 'دفعة تسوية' : 'دفعة نهائية');
      setPaymentType(pType);
      setStatement(`سداد ${pType} للطلب #${selectedOrder.orderNumber} (${selectedOrder.site || 'شي إن'})`);
      setFormError('');

      const existingDlv = deliveryOrders.find(
        d => d.orderId === selectedOrder.id || String(d.orderNumber) === String(selectedOrder.orderNumber)
      );
      const initCourierId = selectedOrder.courierId || existingDlv?.courierId || couriers[0]?.id || 0;
      setCourierId(initCourierId);
      const cObj = couriers.find(c => c.id === initCourierId);
      setDeliveryFee(Number(selectedOrder.deliveryFee) || Number(existingDlv?.deliveryFee) || Number(cObj?.defaultDeliveryFee) || 1500);
      setCourierCustodyAmount(remaining);
      setCustomCustodyEdited(false);
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

  const isFinalPaymentFlow = Boolean(
    paymentType === 'دفعة نهائية' ||
    paymentType === 'دفعة استلام نهائية' ||
    (selectedOrder && numPayNow > 0 && remainingAfterPayment === 0)
  );
  const selectedCourier = couriers.find(c => c.id === courierId);
  const selectedAcc = accounts.find(a => a.id === selectedAccountId);

  useEffect(() => {
    if (!customCustodyEdited) {
      setCourierCustodyAmount(numPayNow);
    }
  }, [numPayNow, customCustodyEdited]);

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

    if (isFinalPaymentFlow && !courierId && couriers.length > 0) {
      setFormError('يرجى اختيار المندوب الذي وصّل الطلب ليتم قيده في نظام الموصلين');
      return;
    }

    if ((!isFinalPaymentFlow || deliveryPaymentMethod === 'transfer_to_wallet') && !selectedAccountId) {
      setFormError('يرجى تحديد حساب الدفع أو المحفظة');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const created = recordPayment({
        customerId: selectedOrder.customerId,
        orderId: selectedOrder.id,
        amount: numPayNow,
        accountId: selectedAccountId,
        paymentMethod: isFinalPaymentFlow && deliveryPaymentMethod === 'cash_to_courier'
          ? `نقدي للمندوب (${selectedCourier?.name || 'المندوب'})`
          : (selectedAcc?.name || 'محفظة'),
        paymentType: isFinalPaymentFlow ? 'دفعة نهائية' : paymentType,
        statement: statement.trim() || `سداد ${isFinalPaymentFlow ? 'دفعة نهائية' : paymentType} للطلب #${selectedOrder.orderNumber}`,
        notes: notes.trim() || undefined,
        courierId: isFinalPaymentFlow && courierId ? courierId : undefined,
        deliveryPaymentMethod: isFinalPaymentFlow && courierId ? deliveryPaymentMethod : undefined,
        deliveryFee: isFinalPaymentFlow && courierId ? Number(deliveryFee) : undefined,
        courierCustodyAmount: isFinalPaymentFlow && courierId && deliveryPaymentMethod === 'cash_to_courier'
          ? Number(courierCustodyAmount)
          : undefined
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

      {/* Step 1 & Step 2: Select Customer -> View All Customer Orders -> Pick Order */}
      <div className="bg-white rounded-2xl border-2 border-[#1A3668]/20 shadow-sm overflow-hidden">
        {/* Step 1: Customer Selection Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#1A3668]/5 via-slate-50 to-amber-50/40 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#1A3668] text-[#C5A059] flex items-center justify-center font-black shadow-sm shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#1A3668] text-white text-[10px] font-black">الخطوة 1</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">اختر العميل لعرض جميع طلباته</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  عند اختيار العميل ستظهر لك جميع طلباته فوراً، وعند اختيار أي طلب ستظهر كامل بياناته وسجل دفعاته
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              {/* Quick Search Customer */}
              <div className="relative sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  placeholder="ابحث باسم أو رقم العميل..."
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:outline-none focus:border-[#1A3668]"
                />
              </div>

              {/* Customer Dropdown Selector */}
              <div className="sm:w-80">
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val) handleSelectCustomer(val);
                  }}
                  className="w-full p-2.5 rounded-xl border-2 border-[#1A3668] bg-white text-xs font-black text-slate-900 focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>-- اختر العميل من القائمة --</option>
                  {customersWithOrderStats.map(({ customer: c, ordersCount, totalRemaining }) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.governorate || 'صنعاء'}) — {ordersCount} طلبات {totalRemaining > 0 ? `• المتبقي: ${totalRemaining.toLocaleString()} ر.ي` : '• مسدد'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Horizontal Customer Pills (Customers with orders) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">اختيار سريع للعميل:</span>
            {customersWithOrderStats.filter(x => x.ordersCount > 0).slice(0, 12).map(({ customer: c, ordersCount, totalRemaining }) => {
              const isCustSelected = selectedCustomer?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCustomer(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                    isCustSelected
                      ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#1A3668]/40 hover:bg-slate-50'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                    isCustSelected ? 'bg-[#C5A059] text-slate-950' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ordersCount} طلب
                  </span>
                  {totalRemaining > 0 && (
                    <span className={`text-[10px] font-mono ${isCustSelected ? 'text-amber-200' : 'text-rose-600'}`}>
                      ({totalRemaining.toLocaleString()})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: All Orders of the Selected Customer */}
        <div className="p-4 sm:p-5 bg-white space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black">الخطوة 2</span>
              <h4 className="text-sm font-black text-slate-900">
                جميع طلبات العميل: <span className="text-[#1A3668] underline decoration-[#C5A059]">{selectedCustomer?.name || selectedOrder?.customerName || 'غير محدد'}</span>
                <span className="mr-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono">
                  {selectedCustomerOrders.length} طلبات
                </span>
              </h4>
            </div>

            {selectedCustomerOrders.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-500">
                  إجمالي طلبات العميل: <strong className="font-mono text-slate-900">{selectedCustomerOrders.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString()} ر.ي</strong>
                </span>
                <span className="text-emerald-700">
                  المدفوع: <strong className="font-mono">{selectedCustomerOrders.reduce((s, o) => s + (o.paidAmount || 0), 0).toLocaleString()} ر.ي</strong>
                </span>
                <span className="text-rose-700">
                  المتبقي: <strong className="font-mono font-black">{selectedCustomerOrders.reduce((s, o) => s + (o.remainingAmount || 0), 0).toLocaleString()} ر.ي</strong>
                </span>
              </div>
            )}
          </div>

          {selectedCustomerOrders.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
              لا توجد طلبات مسجلة لهذا العميل حالياً. اختر عميلاً آخر من الأعلى لعرض طلباته.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedCustomerOrders.map(ord => {
                const isSelected = selectedOrder?.id === ord.id;
                const rem = ord.remainingAmount || 0;
                const paid = ord.paidAmount || 0;
                const total = ord.totalAmount || 0;
                const orderStatusLabel =
                  ord.status === 'delivered' ? 'تم التسليم للعميل' :
                  ord.status === 'shipped' ? 'في الشحن' :
                  ord.status === 'purchased' ? 'تم الشراء' : 'قيد الانتظار';

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleSelectOrder(ord)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'border-[#1A3668] bg-gradient-to-br from-[#1A3668]/5 via-blue-50/40 to-amber-50/40 shadow-md ring-2 ring-[#C5A059]/40'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-slate-950">
                            طلب #{ord.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-indigo-700">
                            {ord.site || 'شي إن'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>تاريخ: <strong className="font-mono">{ord.orderDate ? ord.orderDate.split('T')[0] : '—'}</strong></span>
                          <span>•</span>
                          <span>{ord.itemsCount || 1} قطع</span>
                          <span>•</span>
                          <span className="text-slate-700 font-semibold">{orderStatusLabel}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        rem === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : paid > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {rem === 0 ? 'مسدد بالكامل ✓' : paid > 0 ? 'مسدد جزئياً' : 'غير مسدد'}
                      </span>
                    </div>

                    {ord.notes && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/70">
                        {ord.notes}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/80 text-center text-[11px]">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block">الإجمالي</span>
                        <span className="font-mono font-black text-slate-900">{total.toLocaleString()}</span>
                      </div>
                      <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200/70">
                        <span className="text-[10px] text-emerald-700 block">المدفوع</span>
                        <span className="font-mono font-black text-emerald-700">{paid.toLocaleString()}</span>
                      </div>
                      <div className="bg-rose-50/70 p-1.5 rounded-lg border border-rose-200/70">
                        <span className="text-[10px] text-rose-700 block">المتبقي</span>
                        <span className="font-mono font-black text-rose-700">{rem.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className={`w-full py-1.5 px-3 rounded-xl text-center text-[11px] font-black transition ${
                      isSelected
                        ? 'bg-[#1A3668] text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-900'
                    }`}>
                      {isSelected ? '✓ الطلب المحدد حالياً (بياناته معروضة أدناه)' : 'اضغط لعرض بيانات الطلب وسداد دفعة'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Order Payment Workspace: 3 Panels */}
      {selectedOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Panel 1 & 2: Order Data + Previous Payments History (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Panel 1: بيانات الطلب المختار */}
            <div className="bg-white rounded-2xl border-2 border-[#1A3668]/20 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#1A3668] text-[#C5A059] flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">الخطوة 3</span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        بيانات الطلب المختار #{selectedOrder.orderNumber}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans">
                        {selectedOrder.site || 'شي إن SHEIN'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>تاريخ الطلب: <strong className="font-mono text-slate-800">{selectedOrder.orderDate ? selectedOrder.orderDate.split('T')[0] : '—'}</strong></span>
                      {selectedOrder.shipmentNumber && (
                        <span>• رقم الشحنة: <strong className="font-mono text-indigo-700">{selectedOrder.shipmentNumber}</strong></span>
                      )}
                      {selectedOrder.invoiceNumber && (
                        <span>• رقم الفاتورة: <strong className="font-mono text-slate-800">{selectedOrder.invoiceNumber}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
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
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#1A3668] font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">العميل صاحب الطلب:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{selectedCustomer?.name || selectedOrder.customerName}</span>
                      {(selectedCustomer?.governorate || selectedCustomer?.address) && (
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                          {selectedCustomer?.governorate} {selectedCustomer?.address ? `- ${selectedCustomer.address}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(selectedCustomer?.phone || (selectedOrder as any).customerPhone) && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedCustomer?.phone || (selectedOrder as any).customerPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-mono text-xs font-medium"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{selectedCustomer?.phone || (selectedOrder as any).customerPhone}</span>
                    </a>
                    <a
                      href={`https://wa.me/967${String(selectedCustomer?.phone || (selectedOrder as any).customerPhone).replace(/^0+/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs"
                      title="مراسلة عبر واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>واتساب</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Detailed Order Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">عدد القطع / الأصناف</span>
                  <span className="font-black text-slate-900 font-mono text-sm">{selectedOrder.itemsCount || 1} قطعة</span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">حالة الطلبية</span>
                  <span className="font-black text-indigo-900 text-xs">
                    {selectedOrder.status === 'delivered' ? 'تم التسليم ✓' :
                     selectedOrder.status === 'shipped' ? 'في الشحن الدولي/المحلي' :
                     selectedOrder.status === 'purchased' ? 'تم الشراء من الموقع' : 'قيد الانتظار والطلب'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">قيمة السلة / الفرعي</span>
                  <span className="font-black text-slate-800 font-mono text-xs">
                    {(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toLocaleString()} ر.ي
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">الشحن / التوصيل المحلي</span>
                  <span className="font-black text-slate-800 font-mono text-xs">
                    {((Number(selectedOrder.shippingFee) || 0) + (Number(selectedOrder.deliveryFee) || 0)).toLocaleString()} ر.ي
                  </span>
                </div>
              </div>

              {/* Description of items or Order Notes */}
              {((selectedOrder as any).itemsDescription || selectedOrder.notes) && (
                <div className="text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70">
                  <span className="font-black text-amber-950 block mb-1">تفاصيل وملاحظات الطلبية:</span>
                  <p className="leading-relaxed">{(selectedOrder as any).itemsDescription || selectedOrder.notes}</p>
                </div>
              )}

              {/* Order Items Table if available */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[11px] font-black text-slate-700">
                    بنود وأصناف الفاتورة ({selectedOrder.items.length})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={item.id || idx} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="text-[11px] text-slate-400 mr-2">({item.quantity} × {Number(item.unitPrice).toLocaleString()})</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{Number(item.total).toLocaleString()} ر.ي</span>
                      </div>
                    ))}
                  </div>
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

                {/* Payment Type & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">نوع الدفعة</label>
                    <select
                      value={paymentType}
                      onChange={e => {
                        setPaymentType(e.target.value);
                        if (selectedOrder) {
                          setStatement(`سداد ${e.target.value} للطلب #${selectedOrder.orderNumber}`);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 bg-white text-xs font-bold"
                    >
                      <option value="عربون / دفعة أولى">عربون / دفعة أولى</option>
                      <option value="دفعة ثانية (شحن)">دفعة ثانية (عند الشحن)</option>
                      <option value="دفعة نهائية">دفعة نهائية (عند التسليم للمندوب)</option>
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

                {/* Courier & Delivery System Integration when Final Payment */}
                {isFinalPaymentFlow ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1A3668]/5 via-blue-50/70 to-amber-50/50 border-2 border-[#1A3668]/25 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1A3668]/15 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#1A3668] text-[#C5A059] flex items-center justify-center">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-xs">
                            نظام الموصلين — الدفعة النهائية
                          </h4>
                          <p className="text-[10px] text-slate-600">
                            يظهر طلب العميل في نظام الموصلين باسم المندوب المختار
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#1A3668] text-white font-mono font-bold text-[10px]">
                        طلب رقم #{selectedOrder.orderNumber}
                      </span>
                    </div>

                    {/* 1. Select Courier */}
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        1. اختر المندوب الذي وصّل الطلب *
                      </label>
                      <select
                        value={courierId}
                        onChange={e => {
                          const cId = Number(e.target.value);
                          setCourierId(cId);
                          const cObj = couriers.find(c => c.id === cId);
                          if (cObj?.defaultDeliveryFee) {
                            setDeliveryFee(Number(cObj.defaultDeliveryFee));
                          }
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-xs"
                        required
                      >
                        {couriers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.zone || c.coverageZones || 'صنعاء'}) — رصيده الحالي: {(Number(c.currentCustodyBalance) || 0).toLocaleString()} ريال
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Payment Method: Cash to Courier vs Wallet */}
                    <div>
                      <label className="font-bold text-slate-800 block mb-1.5">
                        2. اختر طريقة الدفع *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryPaymentMethod('cash_to_courier')}
                          className={`p-2.5 rounded-xl border-2 text-right transition cursor-pointer ${
                            deliveryPaymentMethod === 'cash_to_courier'
                              ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-black text-xs flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                            <span>نقدي للمندوب نفسه</span>
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            تسجل برصيد المندوب <strong>طلب رقم #{selectedOrder.orderNumber}</strong>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeliveryPaymentMethod('transfer_to_wallet')}
                          className={`p-2.5 rounded-xl border-2 text-right transition cursor-pointer ${
                            deliveryPaymentMethod === 'transfer_to_wallet'
                              ? 'border-[#1A3668] bg-blue-50 text-[#1A3668] shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-black text-xs flex items-center gap-1">
                            <Wallet className="w-3.5 h-3.5 text-[#1A3668]" />
                            <span>محفظة إلكترونية</span>
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            يزداد رصيد المحفظة + <strong>استحقاق للمندوب عندنا</strong>
                          </div>
                        </button>
                      </div>
                    </div>

                    {deliveryPaymentMethod === 'cash_to_courier' ? (
                      <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl space-y-2">
                        <label className="font-bold text-amber-950 block text-[11px]">
                          المبلغ المسجل في رصيد المندوب ({selectedCourier?.name}) عن طلب رقم #{selectedOrder.orderNumber}:
                        </label>
                        <input
                          type="number"
                          value={courierCustodyAmount || ''}
                          onChange={e => {
                            setCourierCustodyAmount(Number(e.target.value));
                            setCustomCustodyEdited(true);
                          }}
                          className="w-full p-2 rounded-lg border border-amber-400 bg-white font-mono font-black text-amber-900 text-xs"
                        />
                        <div className="text-[10px] text-amber-900 font-bold">
                          ✓ يسجل برصيد المندوب {selectedCourier?.name}: <strong>طلب رقم #{selectedOrder.orderNumber}</strong> بمبلغ <strong>{(Number(courierCustodyAmount) || 0).toLocaleString()} ريال</strong>.
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-blue-100/60 border border-blue-300 rounded-xl space-y-2.5">
                        <div>
                          <label className="font-bold text-blue-950 block mb-1 text-[11px]">
                            المحفظة المستلمة (يزداد رصيدها) *
                          </label>
                          <select
                            required
                            value={selectedAccountId}
                            onChange={e => setSelectedAccountId(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border border-blue-300 bg-white font-bold text-slate-900 text-xs"
                          >
                            {accounts.filter(a => a.status === 'active').map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.type})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-purple-950 block mb-1 text-[11px]">
                            استحقاق المندوب عندنا (لازم ندفعه له) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={deliveryFee}
                            onChange={e => setDeliveryFee(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border border-purple-300 bg-white font-mono font-black text-purple-900 text-xs"
                          />
                        </div>
                        <div className="text-[10px] text-blue-950 font-bold space-y-0.5">
                          <div>✓ يزداد رصيد <strong>{selectedAcc?.name}</strong> بمبلغ <strong>{numPayNow.toLocaleString()} ريال</strong></div>
                          <div className="text-purple-900">✓ يسجل للمندوب <strong>{selectedCourier?.name}</strong> استحقاق عندنا: <strong>{Number(deliveryFee).toLocaleString()} ريال</strong> عن طلب رقم #{selectedOrder.orderNumber}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
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
                )}

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
                      onClick={() => handleSelectOrder(order)}
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
                        {(order as any).customerPhone && (
                          <span className="text-[11px] text-slate-400 font-mono">{(order as any).customerPhone}</span>
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
                            handleSelectOrder(order);
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
