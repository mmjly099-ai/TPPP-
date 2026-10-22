import React, { useState, useEffect, useMemo } from 'react';
import { X, Receipt, CheckCircle2, Check, CreditCard, User, Wallet, Sparkles, ShieldCheck, Bike, DollarSign, Plus, Building2, Banknote, ChevronDown } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer, Order, Payment, Account } from '../../types';
import { numberToArabicWords } from '../../utils/tafqeet';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCustomer?: Customer | null;
  preSelectedOrder?: Order | null;
  paymentToEdit?: Payment | null;
  onPaymentSuccess?: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  preSelectedCustomer,
  preSelectedOrder,
  paymentToEdit,
  onPaymentSuccess
}) => {
  const { customers, orders, accounts, chartAccounts = [], couriers = [], deliveryOrders = [], recordPayment, updatePayment, getCustomerBalance, getAccountBalance, addAccount, payments } = useStore();

  const isEditMode = Boolean(paymentToEdit);
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [customerId, setCustomerId] = useState<number>(() => paymentToEdit?.customerId || preSelectedCustomer?.id || customers[0]?.id || 0);
  const [orderId, setOrderId] = useState<number | undefined>(() => paymentToEdit?.orderId || preSelectedOrder?.id || undefined);
  const [amount, setAmount] = useState<number>(() => paymentToEdit?.amount || preSelectedOrder?.remainingAmount || 0);

  // تجميع كافة الحسابات والمحافظ المالية (من جدول الحسابات + أي حساب مالي مضاف في شجرة الحسابات)
  const availableAccounts = useMemo(() => {
    const list = accounts.filter(a => a.status !== 'inactive' && a.type !== 'حقوق ملكية');
    const existingNames = new Set(list.map(a => a.name.trim().toLowerCase()));
    const extraFromChart: Account[] = [];

    (chartAccounts || []).forEach(ca => {
      if (
        ca.category === 'asset' &&
        (ca.code?.startsWith('101') ||
         ca.code?.startsWith('102') ||
         ca.subCategory?.includes('بنوك') ||
         ca.subCategory?.includes('محافظ') ||
         ca.subCategory?.includes('نقدية') ||
         ca.name?.includes('محفظة') ||
         ca.name?.includes('بنك') ||
         ca.name?.includes('كاش') ||
         ca.name?.includes('صندوق') ||
         ca.name?.includes('كريمي') ||
         ca.name?.includes('جيب') ||
         ca.name?.includes('ون كاش'))
      ) {
        if (!existingNames.has(ca.name.trim().toLowerCase())) {
          existingNames.add(ca.name.trim().toLowerCase());
          extraFromChart.push({
            id: ca.id,
            name: ca.name,
            type: ca.name.includes('محفظة')
              ? 'محفظة'
              : (ca.name.includes('بنك') ? 'بنكي' : (ca.name.includes('بطاقة') ? 'بطاقة' : 'نقدي')),
            openingBalance: 0,
            status: 'active',
            createdAt: ca.createdAt || new Date().toISOString()
          });
        }
      }
    });

    return [...list, ...extraFromChart];
  }, [accounts, chartAccounts]);

  const [accountId, setAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب') || a.name.includes('كريمي')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });

  // التأكد من تحديد محفظة صحيحة دائماً
  useEffect(() => {
    if (availableAccounts.length > 0 && !availableAccounts.some(a => a.id === accountId)) {
      const preferred = availableAccounts.find(a => a.name.includes('جيب') || a.name.includes('كريمي')) || availableAccounts[0];
      if (preferred) setAccountId(preferred.id);
    }
  }, [availableAccounts, accountId]);

  // قناة الاستلام: محفظة/بنك (افتراضي) أو نقداً في الصندوق أو نقدي مع المندوب
  const [paymentChannel, setPaymentChannel] = useState<'wallet' | 'cash' | 'courier'>('wallet');

  // إضافة محفظة أو حساب جديد سريعاً مباشرة داخل النافذة
  const [showQuickAddWallet, setShowQuickAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<Account['type']>('محفظة');
  const [newWalletBalance, setNewWalletBalance] = useState<number>(0);
  const [quickAddError, setQuickAddError] = useState('');

  const [paymentType, setPaymentType] = useState<string>('دفعة أولى');
  const [statement, setStatement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Courier & Delivery System Integration
  const activeCouriers = couriers.filter(c => c.status === 'active' || c.status === 'available');
  const [courierId, setCourierId] = useState<number>(() => preSelectedOrder?.courierId || activeCouriers[0]?.id || couriers[0]?.id || 0);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<'cash_to_courier' | 'transfer_to_wallet'>('transfer_to_wallet');
  const [deliveryFee, setDeliveryFee] = useState<number>(1500);
  const [courierCustodyAmount, setCourierCustodyAmount] = useState<number>(0);
  const [customCustodyEdited, setCustomCustodyEdited] = useState<boolean>(false);
  const [hasCourierDelivery, setHasCourierDelivery] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (paymentToEdit) {
      setCustomerId(paymentToEdit.customerId);
      setOrderId(paymentToEdit.orderId || undefined);
      setAmount(paymentToEdit.amount);
      const rawDate = paymentToEdit.paymentDate || (paymentToEdit.createdAt ? paymentToEdit.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
      setPaymentDate(rawDate);
      setReceiptNumber(paymentToEdit.receiptNumber || paymentToEdit.paymentNumber || '');
      setPaymentType(paymentToEdit.paymentType || 'سداد دفعة');
      setStatement(paymentToEdit.statement || '');
      setNotes(paymentToEdit.notes || '');

      if (paymentToEdit.accountId) {
        setAccountId(paymentToEdit.accountId);
      }

      const isCourier = Boolean(paymentToEdit.deliveryPaymentMethod === 'cash_to_courier' || paymentToEdit.courierId);
      const matchedAcc = accounts.find(a => a.id === paymentToEdit.accountId);
      if (isCourier) {
        setPaymentChannel('courier');
        setCourierId(paymentToEdit.courierId || activeCouriers[0]?.id || 0);
        setDeliveryPaymentMethod((paymentToEdit.deliveryPaymentMethod as any) || 'cash_to_courier');
        setDeliveryFee(paymentToEdit.deliveryFee || 1500);
        setCourierCustodyAmount(paymentToEdit.amount);
        setHasCourierDelivery(true);
      } else if (matchedAcc?.type === 'نقدي' || matchedAcc?.name.includes('صندوق') || matchedAcc?.name.includes('كاش')) {
        setPaymentChannel('cash');
        setHasCourierDelivery(false);
      } else {
        setPaymentChannel('wallet');
        setHasCourierDelivery(false);
      }
      return;
    }

    setReceiptNumber('');
    setPaymentDate(new Date().toISOString().split('T')[0]);

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
  }, [preSelectedCustomer, preSelectedOrder, paymentToEdit, isOpen]);

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
  const isFinalPaymentFlow = Boolean(
    paymentType === 'دفعة نهائية' ||
    (linkedOrder && Number(amount) > 0 && (Number(linkedOrder.remainingAmount || 0) - Number(amount)) <= 0)
  );

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

  const handleQuickAddWallet = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) {
      setQuickAddError('يرجى إدخال اسم المحفظة أو الحساب');
      return;
    }
    setQuickAddError('');
    const created = addAccount({
      name: newWalletName.trim(),
      type: newWalletType,
      openingBalance: Number(newWalletBalance) || 0,
      openingBalanceDate: new Date().toISOString(),
      status: 'active',
      notes: 'تمت إضافتها أثناء تسجيل دفعة'
    });
    if (created?.id) {
      setAccountId(created.id);
      setPaymentChannel(newWalletType === 'نقدي' ? 'cash' : 'wallet');
    }
    setShowQuickAddWallet(false);
    setNewWalletName('');
    setNewWalletBalance(0);
  };

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
    if (paymentChannel === 'courier' && !courierId && couriers.length > 0) {
      setFormError('يرجى اختيار المندوب المستلم ليتم تسجيل العهدة في حسابه');
      return;
    }
    setFormError('');
    setIsSubmitting(true);

    try {
      const isCashToCourier = paymentChannel === 'courier';
      const isDirectCash = paymentChannel === 'cash';
      let chosenAccountId = accountId;
      if (isDirectCash) {
        const cashAcc = availableAccounts.find(a => a.type === 'نقدي' || a.name.includes('الصندوق')) || availableAccounts[0];
        if (cashAcc) chosenAccountId = cashAcc.id;
      }

      const activeAcc = availableAccounts.find(a => a.id === chosenAccountId) || accounts.find(a => a.id === chosenAccountId);

      let createdOrUpdatedPayment: Payment | null = null;

      if (isEditMode && paymentToEdit) {
        const res = updatePayment(paymentToEdit.id, {
          customerId,
          orderId: orderId || null,
          amount: Number(amount),
          accountId: chosenAccountId,
          paymentMethod: isCashToCourier
            ? `نقدي للمندوب (${selectedCourier?.name || 'المندوب'})`
            : isDirectCash
            ? 'نقداً في الصندوق'
            : (activeAcc?.name || 'محفظة'),
          paymentType: isFinalPaymentFlow ? 'دفعة نهائية' : paymentType,
          paymentDate,
          receiptNumber: receiptNumber.trim() || undefined,
          statement: statement.trim() || undefined,
          notes: notes.trim() || undefined,
          courierId: (isCashToCourier || (hasCourierDelivery && courierId)) ? courierId : undefined,
          deliveryPaymentMethod: isCashToCourier ? 'cash_to_courier' : 'transfer_to_wallet',
          deliveryFee: (isCashToCourier || (hasCourierDelivery && courierId)) ? Number(deliveryFee) : undefined,
        });

        createdOrUpdatedPayment = (res as Payment) || {
          ...paymentToEdit,
          customerId,
          orderId: orderId || null,
          amount: Number(amount),
          accountId: chosenAccountId,
          paymentDate,
          receiptNumber: receiptNumber.trim() || paymentToEdit.receiptNumber
        };
      } else {
        createdOrUpdatedPayment = recordPayment({
          customerId,
          orderId: orderId || undefined,
          amount: Number(amount),
          accountId: chosenAccountId,
          paymentMethod: isCashToCourier
            ? `نقدي للمندوب (${selectedCourier?.name || 'المندوب'})`
            : isDirectCash
            ? 'نقداً في الصندوق'
            : (activeAcc?.name || 'محفظة'),
          paymentType: isFinalPaymentFlow ? 'دفعة نهائية' : paymentType,
          statement: statement.trim() || undefined,
          notes: notes.trim() || undefined,
          courierId: (isCashToCourier || (hasCourierDelivery && courierId)) ? courierId : undefined,
          deliveryPaymentMethod: isCashToCourier ? 'cash_to_courier' : 'transfer_to_wallet',
          deliveryFee: (isCashToCourier || (hasCourierDelivery && courierId)) ? Number(deliveryFee) : undefined,
          courierCustodyAmount: isCashToCourier && courierId ? Number(courierCustodyAmount) : undefined
        });
      }

      setIsSubmitting(false);
      onClose();

      if (onPaymentSuccess && createdOrUpdatedPayment) {
        onPaymentSuccess(createdOrUpdatedPayment);
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
            <div className={`w-9 h-9 rounded-xl ${isEditMode ? 'bg-amber-600' : 'bg-[#1A3668]'} text-white flex items-center justify-center font-bold`}>
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {isEditMode ? 'تعديل سند قبض / دفعة مالية' : 'إصدار سند قبض مالي رسمي'}
                </h3>
                {isEditMode && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                    وضع التعديل #{paymentToEdit?.receiptNumber || paymentToEdit?.paymentNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? 'تعديل بيانات المبلغ، الحساب، أو الطلب المرتبط مع تحديث القيود والأرصدة فورياً'
                  : 'إثبات استلام الدفعة وربط الدفعة النهائية بنظام الموصلين والقيود تلقائياً'}
              </p>
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

          {/* Payment Date & Receipt Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الدفعة / السند *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-900 text-xs bg-white font-bold focus:ring-2 focus:ring-[#1A3668]"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                رقم السند {isEditMode ? '(تعديل الرقم)' : '(تلقائي أو مخصص)'}
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                placeholder={isEditMode ? 'رقم السند' : 'اتركه فارغاً للترقيم التلقائي'}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-900 text-xs bg-white font-bold focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">المبلغ المقبوض للطلب (ريال) *</label>
              {isEditMode && paymentToEdit && (
                <span className="text-[11px] text-slate-500 font-mono">
                  المبلغ السابق: {paymentToEdit.amount.toLocaleString()} ريال
                </span>
              )}
            </div>
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

          {/* ============================================================== */}
          {/* SECTION: طريقة وقناة استلام الدفعة (محفظة / نقدي / مندوب) */}
          {/* ============================================================== */}
          <div className="space-y-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                طريقة وقناة استلام الدفعة *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentChannel('wallet')}
                  className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    paymentChannel === 'wallet'
                      ? 'border-[#1A3668] bg-blue-50/90 text-[#1A3668] shadow-xs font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-[#C5A059]" />
                  <span className="text-[11px]">محفظة / بنك</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentChannel('cash');
                    const cashAcc = availableAccounts.find(a => a.type === 'نقدي' || a.name.includes('الصندوق')) || availableAccounts[0];
                    if (cashAcc) setAccountId(cashAcc.id);
                  }}
                  className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    paymentChannel === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px]">نقداً في الصندوق</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentChannel('courier')}
                  className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    paymentChannel === 'courier'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs font-black'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <Bike className="w-4 h-4 text-amber-600" />
                  <span className="text-[11px]">نقدي للمندوب</span>
                </button>
              </div>
            </div>

            {/* CHANNEL 1: WALLET & BANK (DEFAULT & MAIN CHANNEL) */}
            {paymentChannel === 'wallet' && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-blue-700" />
                    <span>المحفظة / الحساب البنكي المودع فيه *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddWallet(!showQuickAddWallet)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A3668] hover:text-[#132c52] bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showQuickAddWallet ? 'إلغاء' : '+ إضافة محفظة جديدة'}</span>
                  </button>
                </div>

                {/* Inline Quick Add Wallet Card */}
                {showQuickAddWallet && (
                  <div className="p-3 bg-white border-2 border-blue-300 rounded-xl space-y-2.5 shadow-xs">
                    <div className="text-[11px] font-black text-blue-900 border-b border-blue-100 pb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>إضافة محفظة أو حساب بنكي جديد فوراً:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-0.5">اسم المحفظة / الحساب *</label>
                        <input
                          type="text"
                          value={newWalletName}
                          onChange={e => setNewWalletName(e.target.value)}
                          placeholder="مثال: محفظة ون كاش، حساب العمقي..."
                          className="w-full border border-blue-200 rounded-lg p-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-0.5">نوع الحساب</label>
                        <select
                          value={newWalletType}
                          onChange={e => setNewWalletType(e.target.value as Account['type'])}
                          className="w-full border border-blue-200 rounded-lg p-2 bg-white font-medium"
                        >
                          <option value="محفظة">محفظة إلكترونية</option>
                          <option value="بنكي">حساب بنكي</option>
                          <option value="بطاقة">بطاقة دفع (VISA)</option>
                          <option value="نقدي">صندوق نقدي</option>
                        </select>
                      </div>
                    </div>
                    {quickAddError && (
                      <div className="text-[11px] text-rose-600 font-bold">{quickAddError}</div>
                    )}
                    <button
                      type="button"
                      onClick={handleQuickAddWallet}
                      className="w-full py-2 bg-[#1A3668] hover:bg-[#132c52] text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>حفظ المحفظة واختيارها الآن للدفعة</span>
                    </button>
                  </div>
                )}

                {/* Interactive Visual Wallet Selection Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-white shadow-2xs">
                  {availableAccounts.map(a => {
                    const isSelected = a.id === accountId;
                    const bal = getAccountBalance(a.id);
                    const IconComp = a.type === 'بنكي' ? Building2 : (a.type === 'بطاقة' ? CreditCard : (a.type === 'نقدي' ? Banknote : Wallet));
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAccountId(a.id)}
                        className={`p-2 rounded-xl text-right transition-all border flex flex-col justify-between gap-1 cursor-pointer ${
                          isSelected
                            ? 'border-[#1A3668] bg-blue-50/90 ring-2 ring-[#1A3668]/30 shadow-xs'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1A3668]' : 'text-slate-400'}`} />
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-700 font-black" />}
                        </div>
                        <div className="font-bold text-[11px] text-slate-900 truncate" title={a.name}>
                          {a.name}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white border border-slate-200">{a.type}</span>
                          <span className="font-bold text-slate-700">{bal.toLocaleString()} YER</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Wallets Dropdown */}
                <div className="relative">
                  <select
                    value={accountId}
                    onChange={e => setAccountId(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 shadow-2xs pr-3 pl-8 cursor-pointer"
                    required
                  >
                    {availableAccounts.map(a => {
                      const bal = getAccountBalance(a.id);
                      return (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type}) — الرصيد: {bal.toLocaleString()} ريال
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Wallet Quick Info Badge */}
                {(() => {
                  const selAcc = availableAccounts.find(a => a.id === accountId);
                  if (!selAcc) return null;
                  const curBal = getAccountBalance(selAcc.id);
                  const newBal = curBal + (Number(amount) || 0);
                  return (
                    <div className="flex items-center justify-between text-[11px] bg-blue-50/80 border border-blue-200/70 p-2 rounded-xl text-blue-950 font-medium">
                      <span>المحفظة المستلمة: <strong>{selAcc.name}</strong></span>
                      <span className="font-mono">الرصيد بعد الإيداع: <strong>{newBal.toLocaleString()} ريال</strong></span>
                    </div>
                  );
                })()}

                {/* Optional Delivery Courier integration when paying to wallet */}
                {Boolean(orderId || isFinalPaymentFlow) && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none mb-1.5">
                      <input
                        type="checkbox"
                        checked={hasCourierDelivery}
                        onChange={e => setHasCourierDelivery(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span>هل تم توصيل هذا الطلب عبر مندوب؟ (تسجيل استحقاق أجور التوصيل له)</span>
                    </label>

                    {hasCourierDelivery && (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 mt-1.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">مندوب التوصيل *</label>
                            <select
                              value={courierId}
                              onChange={e => {
                                const cId = Number(e.target.value);
                                setCourierId(cId);
                                const cObj = couriers.find(c => c.id === cId);
                                if (cObj?.defaultDeliveryFee) setDeliveryFee(Number(cObj.defaultDeliveryFee));
                              }}
                              className="w-full border border-amber-300 rounded-lg p-2 bg-white font-bold text-slate-900 text-xs"
                            >
                              {couriers.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.zone || c.coverageZones || 'صنعاء'})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">أجرة التوصيل المستحقة للمندوب *</label>
                            <input
                              type="number"
                              min="0"
                              value={deliveryFee}
                              onChange={e => setDeliveryFee(Number(e.target.value))}
                              className="w-full border border-amber-300 rounded-lg p-2 bg-white font-mono font-bold text-amber-900 text-xs"
                            />
                          </div>
                        </div>
                        <div className="text-[10px] text-amber-900 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>يدخل المبلغ في محفظة المتجر، ويُسجل للمندوب استحقاق أجور توصيل {Number(deliveryFee).toLocaleString()} ريال.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CHANNEL 2: CASH (الصندوق) */}
            {paymentChannel === 'cash' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>استلام نقدي مباشر في خزينة وصندوق المتجر</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  سيتم تسجيل سند القبض وإيداع مبلغ <strong>{Number(amount).toLocaleString()} ريال</strong> مباشرة في حساب <strong>الصندوق النقدي</strong> وإثبات القيد المحاسبي فوراً.
                </p>
              </div>
            )}

            {/* CHANNEL 3: COURIER (نقدي مع المندوب) */}
            {paymentChannel === 'courier' && (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                  <div className="flex items-center gap-1.5 font-black text-amber-950 text-xs">
                    <Bike className="w-4 h-4 text-amber-700" />
                    <span>تسليم نقدي لمندوب التوصيل باليد</span>
                  </div>
                  {linkedOrder && (
                    <span className="font-mono font-bold text-[11px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded">
                      طلب #{linkedOrder.orderNumber}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">المندوب المستلم *</label>
                    <select
                      value={courierId}
                      onChange={e => {
                        const cId = Number(e.target.value);
                        setCourierId(cId);
                        const cObj = couriers.find(c => c.id === cId);
                        if (cObj?.defaultDeliveryFee) setDeliveryFee(Number(cObj.defaultDeliveryFee));
                      }}
                      className="w-full border border-amber-300 rounded-lg p-2 bg-white font-bold text-slate-900 text-xs"
                      required
                    >
                      {couriers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} — رصيده الحالي: {(Number(c.currentCustodyBalance) || 0).toLocaleString()} ريال
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">المبلغ المقيد في عهدة المندوب *</label>
                    <input
                      type="number"
                      value={courierCustodyAmount || ''}
                      onChange={e => {
                        setCourierCustodyAmount(Number(e.target.value));
                        setCustomCustodyEdited(true);
                      }}
                      className="w-full border border-amber-300 rounded-lg p-2 bg-white font-mono font-bold text-amber-900 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                  <span className="text-slate-500 font-bold">تحديد سريع:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCourierCustodyAmount(Number(amount));
                      setCustomCustodyEdited(false);
                    }}
                    className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
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
                    className={`px-2 py-0.5 rounded border font-bold cursor-pointer ${
                      courierCustodyAmount === Number(amount) + Number(deliveryFee)
                        ? 'bg-amber-700 text-white border-amber-700'
                        : 'bg-white text-amber-900 border-amber-300'
                    }`}
                  >
                    مع التوصيل ({(Number(amount) + Number(deliveryFee)).toLocaleString()})
                  </button>
                </div>

                <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    يُسجل في رصيد عهدة المندوب <strong>{selectedCourier?.name}</strong> مبلغ <strong>{(Number(courierCustodyAmount) || 0).toLocaleString()} ريال</strong>.
                  </span>
                </div>
              </div>
            )}
          </div>

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
                className={`px-5 py-2 rounded-xl text-white font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
                  isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#1A3668] hover:bg-[#152c54]'
                }`}
              >
                {isSubmitting
                  ? 'جاري الحفظ...'
                  : isEditMode
                  ? 'حفظ التعديلات وتحديث القيد والأرصدة'
                  : isFinalPaymentFlow
                  ? 'تأكيد الدفعة النهائية وترحيل للموصلين'
                  : 'إصدار سند القبض'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

