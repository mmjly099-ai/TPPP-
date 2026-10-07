import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Receipt,
  Users,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Truck,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer, Order, Payment, DocumentType } from '../../types';
import { TopStoreDocumentCard } from '../documents/TopStoreDocumentCard';

interface NewDocumentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: (docType: DocumentType, docId?: string) => void;
}

export const NewDocumentWizardModal: React.FC<NewDocumentWizardModalProps> = ({
  isOpen,
  onClose,
  onDocumentCreated
}) => {
  const {
    customers,
    orders,
    payments,
    accounts,
    paymentMethods,
    addCustomer,
    addOrder,
    recordPayment,
    updateOrder
  } = useStore();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [docType, setDocType] = useState<DocumentType>('order_invoice');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  
  // New Order / Amounts state
  const [isCreatingNewOrder, setIsCreatingNewOrder] = useState<boolean>(false);
  const [orderTotalAmount, setOrderTotalAmount] = useState<string>('8300');
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [deliveryFee, setDeliveryFee] = useState<string>('0');
  const [customerOrderNumber, setCustomerOrderNumber] = useState<string>('1');
  const [shipmentTracking, setShipmentTracking] = useState<string>('');
  const [purchaseSite, setPurchaseSite] = useState<string>('SHEIN');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Payment State
  const [includePayment, setIncludePayment] = useState<boolean>(true);
  const [paymentAmount, setPaymentAmount] = useState<string>('4300');
  const [selectedAccountId, setSelectedAccountId] = useState<number>(accounts[0]?.id || 1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('تحويل');
  const [paymentType, setPaymentType] = useState<string>('دفعة أولى');

  // Quick Customer Creation
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGov, setNewCustGov] = useState('مأرب');

  // Customer search in step 2
  const [customerSearch, setCustomerSearch] = useState('');

  if (!isOpen) return null;

  // Selected entities
  const selectedCustomer = customers.find(c => c.id === Number(selectedCustomerId)) || null;
  const customerOrdersList = orders.filter(o => o.customerId === Number(selectedCustomerId));
  const selectedOrder = orders.find(o => o.id === Number(selectedOrderId)) || null;

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  // Quick customer creation handler
  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      governorate: newCustGov.trim(),
      code: `TOP-${String(customers.length + 1).padStart(3, '0')}`,
      address: newCustGov.trim()
    });
    setSelectedCustomerId(created.id);
    setShowQuickCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  // Submit / Finalize Document
  const handleFinalize = () => {
    let finalOrder = selectedOrder;

    // 1. If user chose to create a new order
    if (isCreatingNewOrder && selectedCustomer) {
      const orderAmountNum = parseFloat(orderTotalAmount) || 0;
      const orderDiscountNum = parseFloat(orderDiscount) || 0;
      const deliveryFeeNum = parseFloat(deliveryFee) || 0;
      const payAmountNum = includePayment ? (parseFloat(paymentAmount) || 0) : 0;

      const createdOrder = addOrder(
        {
          customerId: selectedCustomer.id,
          orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
          customerOrderNumber: customerOrderNumber || '1',
          purchaseSite: purchaseSite || 'SHEIN',
          itemsCount: 1,
          orderPrice: orderAmountNum,
          discount: orderDiscountNum,
          deliveryFee: deliveryFeeNum,
          deliveryFeeCollectionStatus: 'unpaid',
          status: 'pending',
          orderDate: new Date().toISOString().split('T')[0],
          notes: orderNotes,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          invoiceStatus: 'approved'
        },
        includePayment && payAmountNum > 0
          ? {
              amount: payAmountNum,
              accountId: selectedAccountId,
              paymentMethod: selectedPaymentMethod
            }
          : undefined
      );
      finalOrder = createdOrder;
    } else if (finalOrder && includePayment) {
      // Record payment for existing order if needed
      const payAmountNum = parseFloat(paymentAmount) || 0;
      if (payAmountNum > 0 && selectedCustomer) {
        recordPayment({
          customerId: selectedCustomer.id,
          orderId: finalOrder.id,
          amount: payAmountNum,
          accountId: selectedAccountId,
          paymentMethod: selectedPaymentMethod,
          paymentType: paymentType,
          statement: `سند قبض للطلب #${finalOrder.customerOrderNumber || finalOrder.id}`
        });
      }
    }

    onDocumentCreated(docType, finalOrder ? `INV-${finalOrder.id}` : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[92vh]">
        {/* Wizard Header */}
        <div className="bg-[#1A3668] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                معالج إنشاء واعتماد مستند مالي جديد
              </h2>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              خطوة {currentStep} من 6 — ربط العمليات المحاسبية دون تكرار قيود
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 overflow-x-auto shrink-0">
          {[
            { step: 1, label: 'نوع المستند' },
            { step: 2, label: 'العميل' },
            { step: 3, label: 'الطلب والشحنة' },
            { step: 4, label: 'المبالغ' },
            { step: 5, label: 'الدفعة' },
            { step: 6, label: 'المعاينة والاعتماد' }
          ].map(s => (
            <div
              key={s.step}
              className={`flex items-center gap-1.5 whitespace-nowrap px-2 py-1 rounded-lg ${
                currentStep === s.step
                  ? 'bg-[#1A3668] text-white shadow-xs font-black'
                  : currentStep > s.step
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-current">
                {currentStep > s.step ? '✓' : s.step}
              </span>
              <span className="text-[11px] hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Wizard Step Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1: نوع المستند */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800">اختر نوع المستند المالي المطلوب إصداره:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'order_invoice',
                    title: 'فاتورة طلب رسمية',
                    desc: 'فاتورة رسمية تفصيلية لطلب محدد مع بيانات الشحنة والدفعات',
                    icon: FileText
                  },
                  {
                    id: 'receipt',
                    title: 'سند قبض معتمد',
                    desc: 'إيصال استلام دفعة مالية مع الحساب المستلم وبيانات العملية',
                    icon: Receipt
                  },
                  {
                    id: 'consolidated_invoice',
                    title: 'فاتورة موحدة للعميل',
                    desc: 'تجميع كافة طلبات ومشتريات العميل في فاتورة موحدة متكاملة',
                    icon: Layers
                  },
                  {
                    id: 'customer_statement',
                    title: 'كشف حساب عميل',
                    desc: 'كشف حركات تفصيلي بالمدين والدائن والأرصدة التاريخية',
                    icon: Users
                  },
                  {
                    id: 'receivable_statement',
                    title: 'بيان ذمة مالية',
                    desc: 'مستند إثبات مديونية أو ذمة مالية لطرف معين',
                    icon: CreditCard
                  },
                  {
                    id: 'expense_voucher',
                    title: 'سند صرف وتشغيل',
                    desc: 'توثيق صرف مبلغ لمورد أو مصاريف تسويق وتشغيل',
                    icon: DollarSign
                  }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = docType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDocType(item.id as DocumentType)}
                      className={`text-right p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-[#1A3668] bg-[#1A3668]/5 shadow-sm ring-2 ring-[#C5A059]/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#1A3668] text-[#C5A059]' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-xs sm:text-sm">{item.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: اختيار العميل */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">اختر العميل المعني بالمستند:</h3>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomer(!showQuickCustomer)}
                  className="text-xs font-bold text-[#1A3668] hover:underline flex items-center gap-1"
                >
                  {showQuickCustomer ? 'إغلاق الإضافة السريعة' : '+ إضافة عميل جديد سريعاً'}
                </button>
              </div>

              {/* Quick Customer Form */}
              {showQuickCustomer && (
                <form onSubmit={handleQuickAddCustomer} className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                  <div className="font-bold text-xs text-amber-900">تسجيل عميل جديد مباشرة:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="اسم العميل الكامل *"
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                      className="p-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#1A3668]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="رقم الهاتف"
                      value={newCustPhone}
                      onChange={e => setNewCustPhone(e.target.value)}
                      className="p-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#1A3668]"
                      dir="ltr"
                    />
                    <input
                      type="text"
                      placeholder="المحافظة (مثال: مأرب)"
                      value={newCustGov}
                      onChange={e => setNewCustGov(e.target.value)}
                      className="p-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#1A3668]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1A3668] text-white text-xs font-black rounded-xl hover:bg-[#112952]"
                  >
                    حفظ واختيار العميل
                  </button>
                </form>
              )}

              {/* Search customer */}
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الهاتف أو كود العميل..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1A3668] focus:outline-none"
              />

              {/* Customer List */}
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50/30">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-sm'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-black text-xs sm:text-sm">{c.name}</div>
                          <div className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-[#C5A059]' : 'text-slate-500'}`}>
                            {c.code} | {c.phone || 'بدون هاتف'} | {c.governorate || 'مأرب'}
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-[#C5A059]" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    لا يوجد عملاء مطابقين للبحث. يمكنك إضافة عميل جديد بالأعلى.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: الطلب والشحنة */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800">اختيار الطلب أو إنشاء طلب جديد مرتبط:</h3>

              {customerOrdersList.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    الطلبات السابقة المسجلة للعميل {selectedCustomer?.name}:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {customerOrdersList.map(o => {
                      const isSelected = !isCreatingNewOrder && selectedOrderId === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(o.id);
                            setIsCreatingNewOrder(false);
                            setOrderTotalAmount(String(o.totalAmount || 0));
                            setOrderDiscount(String(o.discount || 0));
                            setDeliveryFee(String(o.deliveryFee || 0));
                          }}
                          className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#1A3668] text-white border-[#1A3668]'
                              : 'bg-white hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-black text-xs">
                              طلب رقم #{o.customerOrderNumber || o.id} ({o.purchaseSite})
                            </div>
                            <div className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-[#C5A059]' : 'text-slate-500'}`}>
                              الإجمالي: {o.totalAmount?.toLocaleString()} ريال | المدفوع: {o.paidAmount?.toLocaleString()} ريال | المتبقي: {o.remainingAmount?.toLocaleString()} ريال
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#C5A059]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option to create a new order */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewOrder(true);
                    setSelectedOrderId('');
                  }}
                  className={`w-full p-3 rounded-xl border-2 text-right transition-all font-bold text-xs ${
                    isCreatingNewOrder
                      ? 'border-[#1A3668] bg-[#1A3668]/5 text-[#1A3668]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {customerOrdersList.length > 0
                    ? '+ إنشاء وتوثيق طلب جديد لهذا العميل'
                    : 'توثيق وتفاصيل الطلب الجديد:'}
                </button>
              </div>

              {isCreatingNewOrder && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">رقم طلب العميل:</label>
                    <input
                      type="text"
                      value={customerOrderNumber}
                      onChange={e => setCustomerOrderNumber(e.target.value)}
                      placeholder="1"
                      className="w-full p-2 bg-white border rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">منصة الشراء:</label>
                    <select
                      value={purchaseSite}
                      onChange={e => setPurchaseSite(e.target.value)}
                      className="w-full p-2 bg-white border rounded-xl text-xs"
                    >
                      <option value="SHEIN">SHEIN (شي إن)</option>
                      <option value="AliExpress">AliExpress (علي إكسبرس)</option>
                      <option value="Other">موقع آخر</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">رقم الشحنة الدولي (إن توفر):</label>
                    <input
                      type="text"
                      value={shipmentTracking}
                      onChange={e => setShipmentTracking(e.target.value)}
                      placeholder="مثال: SH-2026-988"
                      className="w-full p-2 bg-white border rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: المبالغ */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800">مراجعة وتحديد تفاصيل المبالغ المالية:</h3>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">قيمة الطلب (ريال):</label>
                    <input
                      type="number"
                      value={orderTotalAmount}
                      onChange={e => setOrderTotalAmount(e.target.value)}
                      className="w-full p-2.5 bg-white border rounded-xl text-xs font-black font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">الخصم (ريال):</label>
                    <input
                      type="number"
                      value={orderDiscount}
                      onChange={e => setOrderDiscount(e.target.value)}
                      className="w-full p-2.5 bg-white border rounded-xl text-xs font-mono text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">رسوم التوصيل (ريال):</label>
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(e.target.value)}
                      className="w-full p-2.5 bg-white border rounded-xl text-xs font-mono text-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-black">
                  <span className="text-[#1A3668]">الإجمالي النهائي المستحق:</span>
                  <span className="font-mono text-base text-[#1A3668]">
                    {(
                      Math.max(0, (parseFloat(orderTotalAmount) || 0) - (parseFloat(orderDiscount) || 0)) +
                      (parseFloat(deliveryFee) || 0)
                    ).toLocaleString()}{' '}
                    ريال
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: الدفعة والتحصيل */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">توثيق واستلام دفعة مالية (سند قبض):</h3>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includePayment}
                    onChange={e => setIncludePayment(e.target.checked)}
                    className="w-4 h-4 text-[#1A3668] rounded"
                  />
                  <span>تسجيل دفعة مع المستند</span>
                </label>
              </div>

              {includePayment ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">مبلغ الدفعة (ريال):</label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full p-2.5 bg-white border rounded-xl text-xs font-black font-mono text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">تصنيف الدفعة:</label>
                      <select
                        value={paymentType}
                        onChange={e => setPaymentType(e.target.value)}
                        className="w-full p-2.5 bg-white border rounded-xl text-xs"
                      >
                        <option value="دفعة أولى">دفعة أولى</option>
                        <option value="دفعة لاحقة">دفعة لاحقة</option>
                        <option value="دفعة نهائية">دفعة نهائية مسددة</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">طريقة الدفع:</label>
                      <select
                        value={selectedPaymentMethod}
                        onChange={e => setSelectedPaymentMethod(e.target.value)}
                        className="w-full p-2.5 bg-white border rounded-xl text-xs"
                      >
                        {paymentMethods.map(pm => (
                          <option key={pm.id} value={pm.name}>
                            {pm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">الحساب المستلم / الخزينة:</label>
                      <select
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(Number(e.target.value))}
                        className="w-full p-2.5 bg-white border rounded-xl text-xs"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  سيتم إصدار المستند كفاتورة مستحقة دون تسجيل حركة نقدية في الخزينة حالياً.
                </div>
              )}
            </div>
          )}

          {/* STEP 6: المعاينة والاعتماد */}
          {currentStep === 6 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-black text-slate-800">معاينة المستند الرسمي قبل الاعتماد النهائي:</span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  جاهز للاعتماد
                </span>
              </div>

              {/* Document Live Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm scale-95 origin-top">
                <TopStoreDocumentCard
                  documentType={docType}
                  docNumber={docType === 'receipt' ? 'PAY-50409065-8' : 'INV-870001'}
                  date={new Date().toLocaleDateString('ar-YE')}
                  customer={selectedCustomer}
                  order={
                    selectedOrder || {
                      id: 1,
                      customerId: selectedCustomer?.id || 1,
                      orderNumber: 'ORD-001',
                      customerOrderNumber: customerOrderNumber || '1',
                      totalAmount: parseFloat(orderTotalAmount) || 8300,
                      discount: parseFloat(orderDiscount) || 0,
                      deliveryFee: parseFloat(deliveryFee) || 0,
                      paidAmount: includePayment ? (parseFloat(paymentAmount) || 4300) : 0,
                      remainingAmount: Math.max(
                        0,
                        (parseFloat(orderTotalAmount) || 8300) -
                          (parseFloat(orderDiscount) || 0) +
                          (parseFloat(deliveryFee) || 0) -
                          (includePayment ? (parseFloat(paymentAmount) || 4300) : 0)
                      ),
                      status: 'pending',
                      orderDate: new Date().toLocaleDateString('ar-YE'),
                      purchaseSite: purchaseSite,
                      itemsCount: 1,
                      orderPrice: parseFloat(orderTotalAmount) || 8300,
                      deliveryFeeCollectionStatus: 'unpaid',
                      createdAt: new Date().toISOString()
                    }
                  }
                  payment={
                    includePayment
                      ? {
                          id: 1,
                          paymentNumber: 'PAY-50409065-8',
                          receiptNumber: 'PAY-50409065-8',
                          customerId: selectedCustomer?.id || 1,
                          accountId: selectedAccountId,
                          amount: parseFloat(paymentAmount) || 4300,
                          paymentDate: new Date().toLocaleDateString('ar-YE'),
                          paymentMethod: selectedPaymentMethod,
                          paymentType: paymentType,
                          createdAt: new Date().toISOString()
                        }
                      : null
                  }
                  accountName={accounts.find(a => a.id === selectedAccountId)?.name || 'أم فلوس'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 text-xs font-bold hover:text-slate-700"
            >
              إلغاء
            </button>
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 2 && !selectedCustomerId) {
                  alert('يرجى اختيار عميل للمتابعة');
                  return;
                }
                setCurrentStep(prev => prev + 1);
              }}
              className="px-5 py-2.5 bg-[#1A3668] text-white text-xs font-black rounded-xl hover:bg-[#112952] flex items-center gap-1.5 shadow-md transition-all"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              حفظ واعتماد المستند رسميًا
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
