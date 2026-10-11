import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, User, Wallet, Sparkles, ShieldCheck, Bike, DollarSign } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer, Order, Payment } from '../../types';
import { numberToArabicWords } from '../../utils/tafqeet';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCustomer?: Customer | null;
  preSelectedOrder?: Order | null;
  onPaymentSuccess?: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  preSelectedCustomer,
  preSelectedOrder,
  onPaymentSuccess
}) => {
  const { customers, orders, accounts, couriers = [], deliveryOrders = [], recordPayment, getCustomerBalance, payments } = useStore();

  const [customerId, setCustomerId] = useState<number>(() => preSelectedCustomer?.id || customers[0]?.id || 0);
  const [orderId, setOrderId] = useState<number | undefined>(() => preSelectedOrder?.id || undefined);
  const [amount, setAmount] = useState<number>(() => preSelectedOrder?.remainingAmount || 0);
  const [accountId, setAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب') || a.name.includes('كريمي')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });
  const [paymentType, setPaymentType] = useState<string>('دفعة أولى');
  const [statement, setStatement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Courier & Delivery System Integration for Final Payment
  const activeCouriers = couriers.filter(c => c.status === 'active' || c.status === 'available');
  const [courierId, setCourierId] = useState<number>(() => preSelectedOrder?.courierId || activeCouriers[0]?.id || couriers[0]?.id || 0);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<'cash_to_courier' | 'transfer_to_wallet'>('cash_to_courier');
  const [deliveryFee, setDeliveryFee] = useState<number>(1500);
  const [courierCustodyAmount, setCourierCustodyAmount] = useState<number>(0);
  const [customCustodyEdited, setCustomCustodyEdited] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const initCustomer = preSelectedCustomer || customers.find(c => c.id === customerId) || customers[0];
    if (initCustomer) {
      setCustomerId(initCustomer.id);
    }

    if (preSelectedOrder) {
      setOrderId(preSelectedOrder.id);
      setCustomerId(preSelectedOrder.customerId);
      setAmount(preSelectedOrder.remainingAmount);
      const pType = preSelectedOrder.paidAmount === 0 ? 'عربون / دفعة أولى' : 'دفعة نهائية';
      setPaymentType(pType);
      setStatement(`سداد ${pType} للطلب #${preSelectedOrder.orderNumber} (${preSelectedOrder.site})`);

      const existingDlv = deliveryOrders.find(d => d.orderId === preSelectedOrder.id || String(d.orderNumber) === String(preSelectedOrder.orderNumber));
      const initialCourierId = (preSelectedOrder as any).courierId || existingDlv?.courierId || activeCouriers[0]?.id || couriers[0]?.id || 0;
      setCourierId(initialCourierId);
      const cObj = couriers.find(c => c.id === initialCourierId);
      const fee = Number(preSelectedOrder.deliveryFee) || Number(existingDlv?.deliveryFee) || Number(cObj?.defaultDeliveryFee) || 1500;
      setDeliveryFee(fee);
      setCourierCustodyAmount(preSelectedOrder.remainingAmount);
      setCustomCustodyEdited(false);
    } else if (initCustomer) {
      const custOrds = orders.filter(
        o =>
          o.status !== 'cancelled' &&
          (o.customerId === initCustomer.id || (initCustomer.name && o.customerName && o.customerName.trim() === initCustomer.name.trim()))
      );
      if (custOrds.length > 0) {
        const targetOrd = custOrds.find(o => (o.remainingAmount || 0) > 0) || custOrds[0];
        setOrderId(targetOrd.id);
        setAmount(targetOrd.remainingAmount > 0 ? targetOrd.remainingAmount : 0);
        const pType = targetOrd.paidAmount === 0 ? 'عربون / دفعة أولى' : 'دفعة نهائية';
        setPaymentType(pType);
        setStatement(`سداد ${pType} للطلب #${targetOrd.orderNumber} (${targetOrd.site || 'شي إن'})`);
        setCourierCustodyAmount(targetOrd.remainingAmount > 0 ? targetOrd.remainingAmount : 0);
        setCustomCustodyEdited(false);
      } else {
        setOrderId(undefined);
        const debt = getCustomerBalance(initCustomer.id);
        setAmount(debt > 0 ? debt : 0);
        setStatement('سداد دفعة على الحساب');
      }
    }
  }, [preSelectedCustomer, preSelectedOrder, isOpen]);

  // Keep courierCustodyAmount synced with amount unless manually customized
  useEffect(() => {
    if (!customCustodyEdited) {
      setCourierCustodyAmount(Number(amount) || 0);
    }
  }, [amount, customCustodyEdited]);

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => c.id === customerId);
  const currentDebt = selectedCustomer ? getCustomerBalance(selectedCustomer.id) : 0;
  // All non-cancelled orders for this customer (matched by customerId or customerName)
  const customerOrders = orders.filter(
    o =>
      o.status !== 'cancelled' &&
      (o.customerId === customerId ||
        (selectedCustomer?.name && o.customerName && o.customerName.trim() === selectedCustomer.name.trim()))
  );
  const linkedOrder = orderId ? orders.find(o => o.id === orderId) : undefined;
  const selectedCourier = couriers.find(c => c.id === courierId);
  const selectedAcc = accounts.find(a => a.id === accountId);

  const handleSelectOrderInModal = (ord: Order | undefined) => {
    if (ord) {
      setOrderId(ord.id);
      setAmount(ord.remainingAmount > 0 ? ord.remainingAmount : 0);
      const nextPType = ord.paidAmount > 0 ? 'دفعة نهائية' : 'عربون / دفعة أولى';
      setPaymentType(nextPType);
      setStatement(`سداد ${nextPType} للطلب #${ord.orderNumber} (${ord.site || 'شي إن'})`);
      if ((ord as any).courierId) setCourierId((ord as any).courierId);
      const cObj = couriers.find(c => c.id === ((ord as any).courierId || courierId));
      setDeliveryFee(Number(ord.deliveryFee) || Number(cObj?.defaultDeliveryFee) || 1500);
      setCourierCustodyAmount(ord.remainingAmount > 0 ? ord.remainingAmount : 0);
      setCustomCustodyEdited(false);
    } else {
      setOrderId(undefined);
      setStatement('سداد دفعة على الحساب');
      setPaymentType('سداد حساب');
    }
  };

  // Show Courier & Delivery System panel when paying Final Payment (الدفعة النهائية) or settling remaining order amount
  const isFinalPaymentFlow = Boolean(
    paymentType === 'دفعة نهائية' ||
    (linkedOrder && amount > 0 && amount >= linkedOrder.remainingAmount && linkedOrder.paidAmount > 0)
  );

  const amountInWords = amount > 0 ? numberToArabicWords(amount) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!customerId) {
      setFormError('يرجى تحديد العميل المستلم منه');
      return;
    }
    if (amount <= 0) {
      setFormError('يرجى إدخال مبلغ دفع صحيح أكبر من الصفر');
      return;
    }
    if (isFinalPaymentFlow && !courierId && couriers.length > 0) {
      setFormError('يرجى اختيار المندوب الذي وصّل الطلب ليتم تسجيله في نظام الموصلين');
      return;
    }
    setFormError('');
    setIsSubmitting(true);

    try {
      const createdPayment = recordPayment({
        customerId,
        orderId: orderId || undefined,
        amount: Number(amount),
        accountId,
        paymentMethod: isFinalPaymentFlow && deliveryPaymentMethod === 'cash_to_courier'
          ? `نقدي للمندوب (${selectedCourier?.name || 'المندوب'})`
          : (selectedAcc?.name || 'محفظة'),
        paymentType: isFinalPaymentFlow ? 'دفعة نهائية' : paymentType,
        statement: statement.trim() || undefined,
        notes: notes.trim() || undefined,
        courierId: isFinalPaymentFlow && courierId ? courierId : undefined,
        deliveryPaymentMethod: isFinalPaymentFlow && courierId ? deliveryPaymentMethod : undefined,
        deliveryFee: isFinalPaymentFlow && courierId ? Number(deliveryFee) : undefined,
        courierCustodyAmount: isFinalPaymentFlow && courierId && deliveryPaymentMethod === 'cash_to_courier'
          ? Number(courierCustodyAmount)
          : undefined
      });

      setIsSubmitting(false);
      onClose();

      if (onPaymentSuccess && createdPayment) {
        onPaymentSuccess(createdPayment);
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setFormError('حدث خطأ أثناء حفظ سند القبض');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#1A3668] text-white flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">إصدار سند قبض مالي رسمي</h3>
              <p className="text-xs text-slate-500">إثبات استلام الدفعة وربط الدفعة النهائية بنظام الموصلين والقيود تلقائياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Customer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">1. اختر العميل لعرض جميع طلباته *</label>
              {selectedCustomer && (
                <span className="text-[11px] text-amber-900 bg-amber-50 font-mono font-bold px-2 py-0.5 rounded-md border border-amber-200">
                  إجمالي الذمة المستحقة: {currentDebt.toLocaleString()} ريال
                </span>
              )}
            </div>
            <select
              value={customerId}
              onChange={e => {
                const id = Number(e.target.value);
                setCustomerId(id);
                const cObj = customers.find(c => c.id === id);
                const custOrds = orders.filter(
                  o =>
                    o.status !== 'cancelled' &&
                    (o.customerId === id || (cObj?.name && o.customerName && o.customerName.trim() === cObj.name.trim()))
                );
                if (custOrds.length > 0) {
                  const unpaidOrd = custOrds.find(o => (o.remainingAmount || 0) > 0) || custOrds[0];
                  handleSelectOrderInModal(unpaidOrd);
                } else {
                  setOrderId(undefined);
                  const debt = getCustomerBalance(id);
                  if (debt > 0) setAmount(debt);
                }
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-bold text-slate-900"
              required
            >
              {customers.map(c => {
                const cOrdsCount = orders.filter(
                  o => o.status !== 'cancelled' && (o.customerId === c.id || (c.name && o.customerName?.trim() === c.name.trim()))
                ).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name} ({c.governorate || 'صنعاء'}) — ({cOrdsCount} طلبات)
                  </option>
                );
              })}
            </select>
          </div>

          {/* All Orders of the Selected Customer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                2. جميع طلبات العميل ({customerOrders.length} طلبات) — اختر الطلب لعرض بياناته *
              </label>
              {orderId && (
                <button
                  type="button"
                  onClick={() => handleSelectOrderInModal(undefined)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  تحويل لدفعة عامة على الحساب
                </button>
              )}
            </div>

            {customerOrders.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-[11px] text-slate-500">
                لا توجد طلبات مسجلة لهذا العميل (سيتم قيد الدفعة على حساب العميل مباشرة).
              </div>
            ) : (
              <>
                <select
                  value={orderId || ''}
                  onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    const ord = val ? orders.find(o => o.id === val) : undefined;
                    handleSelectOrderInModal(ord);
                  }}
                  className="w-full border-2 border-[#1A3668]/30 rounded-xl p-2.5 bg-white font-bold text-slate-900"
                >
                  <option value="">-- دفعة عامة على الحساب بدون ربط بطلب --</option>
                  {customerOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      طلب رقم #{o.orderNumber} • {o.site || 'شي إن'} • الإجمالي: {(o.totalAmount || 0).toLocaleString()} ر.ي • المتبقي: {(o.remainingAmount || 0).toLocaleString()} ر.ي
                    </option>
                  ))}
                </select>

                {/* Clickable Cards for All Customer Orders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {customerOrders.map(o => {
                    const isSelected = orderId === o.id;
                    const rem = o.remainingAmount || 0;
                    return (
                      <div
                        key={o.id}
                        onClick={() => handleSelectOrderInModal(o)}
                        className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected
                            ? 'border-[#1A3668] bg-blue-50/60 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/70 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xs text-slate-900">
                            طلب #{o.orderNumber} ({o.site || 'شي إن'})
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            rem === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rem === 0 ? 'مسدد ✓' : `المتبقي: ${rem.toLocaleString()}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>الإجمالي: {(o.totalAmount || 0).toLocaleString()} ر.ي</span>
                          <span>المدفوع: {(o.paidAmount || 0).toLocaleString()} ر.ي</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Order Details & Previous Payments Panel */}
          {linkedOrder && (() => {
            const prevPayments = payments.filter(p => p.orderId === linkedOrder.id && p.status !== 'cancelled');
            return (
              <div className="bg-slate-50 border-2 border-[#1A3668]/20 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="font-black text-slate-900 text-xs block">
                      بيانات الطلب المختار #{linkedOrder.orderNumber} ({linkedOrder.site || 'شي إن'})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      تاريخ الطلب: <strong className="font-mono">{linkedOrder.orderDate ? linkedOrder.orderDate.split('T')[0] : '—'}</strong> • عدد القطع: <strong>{linkedOrder.itemsCount || 1} قطع</strong>
                      {linkedOrder.shipmentNumber ? ` • شحنة: ${linkedOrder.shipmentNumber}` : ''}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#1A3668] text-white">
                    إجمالي الطلب: {(linkedOrder.totalAmount || 0).toLocaleString()} YER
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-center">
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block font-medium text-[10px]">قيمة الطلب</span>
                    <span className="font-mono font-black text-slate-900 text-xs">{(linkedOrder.totalAmount || 0).toLocaleString()} YER</span>
                  </div>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-emerald-800 block font-medium text-[10px]">المدفوع سابقاً</span>
                    <span className="font-mono font-black text-emerald-900 text-xs">{(linkedOrder.paidAmount || 0).toLocaleString()} YER</span>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-rose-800 block font-medium text-[10px]">المتبقي المطلوب</span>
                    <span className="font-mono font-black text-rose-900 text-xs">{(linkedOrder.remainingAmount || 0).toLocaleString()} YER</span>
                  </div>
                </div>

                {linkedOrder.notes && (
                  <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-950">
                    <strong>تفاصيل وملاحظات الطلب:</strong> {linkedOrder.notes}
                  </div>
                )}

                {/* Previous Payments History */}
                {prevPayments.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">
                      الدفعات السابقة المسجلة للطلب ({prevPayments.length}):
                    </span>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {prevPayments.map((pmt) => (
                        <div key={pmt.id} className="p-1.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800 font-mono">#{pmt.receiptNumber || pmt.paymentNumber}</span>
                            <span className="text-slate-400 mx-1">•</span>
                            <span className="text-slate-600">{pmt.paymentType || 'دفعة'} ({pmt.paymentMethod})</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-700">{Number(pmt.amount).toLocaleString()} YER</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Payment Type */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">نوع الدفعة</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['عربون / دفعة أولى', 'دفعة لاحقة', 'دفعة نهائية', 'سداد حساب'].map(pt => (
                <button
                  type="button"
                  key={pt}
                  onClick={() => {
                    setPaymentType(pt);
                    if (linkedOrder) {
                      setStatement(`سداد ${pt} للطلب #${linkedOrder.orderNumber} (${linkedOrder.site})`);
                    }
                  }}
                  className={`py-2 px-2 rounded-lg text-center text-[11px] font-bold transition-colors cursor-pointer ${
                    paymentType === pt
                      ? 'bg-[#1A3668] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">المبلغ المقبوض للطلب (ريال) *</label>
            <input
              type="number"
              min="1"
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-emerald-700 text-sm focus:border-[#1A3668]"
              required
            />
          </div>

          {/* COURIER & DELIVERY SYSTEM PANEL (Appears on Final Payment) */}
          {isFinalPaymentFlow && (
            <div className="bg-gradient-to-br from-[#1A3668]/5 via-blue-50/60 to-amber-50/40 border-2 border-[#1A3668]/25 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#1A3668]/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1A3668] text-[#C5A059] flex items-center justify-center">
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xs">
                      ترحيل الطلب لنظام الموصلين (الدفعة النهائية)
                    </h4>
                    <p className="text-[10px] text-slate-600">
                      سيظهر {linkedOrder ? `طلب رقم #${linkedOrder.orderNumber}` : 'طلب العميل'} تلقائياً في نظام الموصلين مع المندوب المختار
                    </p>
                  </div>
                </div>
                {linkedOrder && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#1A3668] text-white font-mono font-black text-[11px]">
                    طلب رقم #{linkedOrder.orderNumber}
                  </span>
                )}
              </div>

              {/* 1. Select Courier who delivered the order */}
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
                    if (cObj && cObj.defaultDeliveryFee) {
                      setDeliveryFee(Number(cObj.defaultDeliveryFee));
                    }
                  }}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900"
                  required
                >
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.zone || c.coverageZones || 'صنعاء'}) — رصيده النقدي الحالي: {(Number(c.currentCustodyBalance) || 0).toLocaleString()} ريال
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select Payment Method (نقدي للمندوب نفسه vs محفظة) */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  2. اختر طريقة دفع العميل عند الاستلام *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryPaymentMethod('cash_to_courier')}
                    className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                      deliveryPaymentMethod === 'cash_to_courier'
                        ? 'border-amber-600 bg-amber-50/90 text-amber-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      deliveryPaymentMethod === 'cash_to_courier' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs">نقدي للمندوب نفسه</div>
                      <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                        تسجل برصيد المندوب ({selectedCourier?.name || 'المندوب'}) باسم <strong>طلب رقم #{linkedOrder?.orderNumber || orderId || ''}</strong>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryPaymentMethod('transfer_to_wallet')}
                    className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                      deliveryPaymentMethod === 'transfer_to_wallet'
                        ? 'border-[#1A3668] bg-blue-50/90 text-[#1A3668] shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      deliveryPaymentMethod === 'transfer_to_wallet' ? 'bg-[#1A3668] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs">محفظة (تحويل للمحفظة)</div>
                      <div className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">
                        يزداد رصيد المحفظة ويكون للمندوب <strong>استحقاق عندنا لازم ندفعه</strong>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Details based on Delivery Payment Method */}
              {deliveryPaymentMethod === 'cash_to_courier' ? (
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-amber-950 text-[11px]">
                      المبلغ الذي يُسجل في رصيد المندوب ({selectedCourier?.name}) عن طلب رقم #{linkedOrder?.orderNumber || ''}:
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        value={courierCustodyAmount || ''}
                        onChange={e => {
                          setCourierCustodyAmount(Number(e.target.value));
                          setCustomCustodyEdited(true);
                        }}
                        className="w-full border border-amber-400 rounded-xl p-2 bg-white font-mono font-black text-amber-900 text-sm"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCourierCustodyAmount(Number(amount));
                          setCustomCustodyEdited(false);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          courierCustodyAmount === Number(amount)
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'bg-white text-amber-900 border-amber-300'
                        }`}
                      >
                        مبلغ الدفعة ({Number(amount).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCourierCustodyAmount(Number(amount) + Number(deliveryFee));
                          setCustomCustodyEdited(true);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          courierCustodyAmount === Number(amount) + Number(deliveryFee)
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'bg-white text-amber-900 border-amber-300'
                        }`}
                      >
                        مع التوصيل ({(Number(amount) + Number(deliveryFee)).toLocaleString()})
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      سيُقيد في رصيد المندوب <strong>{selectedCourier?.name}</strong>: <strong>طلب رقم #{linkedOrder?.orderNumber || orderId || 'مباشر'}</strong> بمبلغ <strong>{(Number(courierCustodyAmount) || 0).toLocaleString()} ريال</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-100/60 border border-blue-300 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-black text-blue-950 block mb-1 text-[11px]">
                        المحفظة التي يزداد رصيدها *
                      </label>
                      <select
                        value={accountId}
                        onChange={e => setAccountId(Number(e.target.value))}
                        className="w-full border border-blue-300 rounded-xl p-2 bg-white font-bold text-slate-900"
                        required
                      >
                        {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-black text-purple-950 block mb-1 text-[11px]">
                        استحقاق المندوب عندنا (لازم ندفعه) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={deliveryFee}
                        onChange={e => setDeliveryFee(Number(e.target.value))}
                        className="w-full border border-purple-300 rounded-xl p-2 bg-white font-mono font-black text-purple-900"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-blue-950 font-bold space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        يزداد رصيد <strong>{selectedAcc?.name}</strong> بمبلغ <strong>{Number(amount).toLocaleString()} ريال</strong>.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-900">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span>
                        يُسجل للمندوب <strong>{selectedCourier?.name}</strong> استحقاق عندنا بقيمة <strong>{Number(deliveryFee).toLocaleString()} ريال</strong> عن <strong>طلب رقم #{linkedOrder?.orderNumber || orderId || 'مباشر'}</strong>.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standard Account selector when NOT in Final Payment Courier flow */}
          {!isFinalPaymentFlow && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">المحفظة / الحساب المودع فيه *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium"
                required
              >
                {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          )}

          {/* Tafqeet in words preview */}
          {amountInWords && (
            <div className="bg-[#1A3668]/5 border border-[#1A3668]/15 rounded-xl p-2.5 text-[11px]">
              <span className="text-slate-500 font-medium">المبلغ كتابة: </span>
              <strong className="text-[#1A3668] font-bold">{amountInWords}</strong>
            </div>
          )}

          {/* Statement & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">البيان (وذلك عن)</label>
              <input
                type="text"
                value={statement}
                onChange={e => setStatement(e.target.value)}
                placeholder="مثال: سداد دفعة نهائية للطلب..."
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية أو رقم الحوالة</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="مثال: رقم الحوالة، اسم المودع، إلخ..."
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>يرحل تلقائياً للقيود ونظام الموصلين</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحفظ...' : isFinalPaymentFlow ? 'تأكيد الدفعة النهائية وترحيل للموصلين' : 'إصدار سند القبض'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

