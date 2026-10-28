import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Truck,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Receipt,
  User,
  ShoppingBag,
  CreditCard,
  Sparkles,
  Layers,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Phone,
  QrCode,
  Edit
} from 'lucide-react';
import { Order, Customer, Payment } from '../../types';
import { useStore } from '../../context/StoreContext';
import { numberToArabicWords } from '../../utils/tafqeet';
import { getShipmentMilestones } from '../../utils/shipmentMilestones';
import { TopStoreDocumentCard } from '../documents/TopStoreDocumentCard';

export type InvoiceDesignTemplate = 'official' | 'classic' | 'modern' | 'compact';

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReceipt?: (payment: Payment) => void;
  onOpenNewOrder?: () => void;
  onEditPayment?: (payment: Payment) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  isOpen,
  onClose,
  onOpenReceipt,
  onOpenNewOrder,
  onEditPayment
}) => {
  const { settings, customers, orders, payments, shipments } = useStore();

  // Selection states for automatic dynamic population
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [selectedOrderId, setSelectedOrderId] = useState<number>(0);
  const [activeDesign, setActiveDesign] = useState<InvoiceDesignTemplate>('official');
  const [copied, setCopied] = useState(false);

  // Sync state whenever modal opens or initial order changes
  useEffect(() => {
    if (isOpen) {
      if (order) {
        setSelectedOrderId(order.id);
        setSelectedCustomerId(order.customerId || 0);
      } else if (orders.length > 0) {
        const firstOrder = orders[0];
        setSelectedOrderId(firstOrder.id);
        setSelectedCustomerId(firstOrder.customerId || (customers[0]?.id ?? 0));
      } else if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
      }
    }
  }, [isOpen, order, orders, customers]);

  if (!isOpen) return null;

  // Filter orders for the selected customer
  const customerOrders = selectedCustomerId
    ? orders.filter(o => o.customerId === selectedCustomerId)
    : orders;

  // Active chosen order (from selector or initial prop)
  const activeOrder: Order | undefined = orders.find(o => o.id === selectedOrderId) || order || (customerOrders[0] ?? undefined);

  // Active chosen customer
  const activeCustomer: Customer | undefined = customers.find(c => c.id === (activeOrder?.customerId || selectedCustomerId));

  // Handle Customer Selection -> Auto-load customer's latest order
  const handleCustomerChange = (newCustId: number) => {
    setSelectedCustomerId(newCustId);
    const relatedOrders = orders.filter(o => o.customerId === newCustId);
    if (relatedOrders.length > 0) {
      // Auto-select the first order of this customer
      setSelectedOrderId(relatedOrders[0].id);
    } else {
      setSelectedOrderId(0);
    }
  };

  // Handle Order Selection -> Auto-sync customer
  const handleOrderChange = (newOrdId: number) => {
    setSelectedOrderId(newOrdId);
    const selectedOrd = orders.find(o => o.id === newOrdId);
    if (selectedOrd && selectedOrd.customerId) {
      setSelectedCustomerId(selectedOrd.customerId);
    }
  };

  // If no order exists at all
  const hasOrders = orders.length > 0;

  // Order data & calculations
  const orderPayments: Payment[] = activeOrder
    ? payments.filter(p => p.orderId === activeOrder.id && p.status !== 'cancelled')
    : [];

  const linkedShipment = activeOrder?.shipmentNumber
    ? shipments.find(s => s.shipmentNumber === activeOrder.shipmentNumber)
    : undefined;

  const storeName = settings.storeName || 'TOP STORE – توب ستور';
  const businessName = settings.businessName || 'وسيط شراء وتسوق إلكتروني';
  const phone = settings.phone || '772791991';
  const whatsapp = settings.whatsapp || '784960100';
  const address = settings.address || 'صنعاء ـ عصر ـ جوار جامعة سبأ';

  const invoiceNumber = activeOrder
    ? (activeOrder.invoiceNumber || `INV-${String(activeOrder.orderNumber || activeOrder.id).replace(/\D/g, '').padStart(3, '0') || activeOrder.id}`)
    : 'INV-000';

  // Strict Accounting Calculations: Paid is sum of payments, Remaining is Total - Paid
  const computedPaid = orderPayments.length > 0
    ? orderPayments.reduce((acc, p) => acc + p.amount, 0)
    : (activeOrder?.paidAmount || 0);

  const totalAmount = activeOrder?.totalAmount || 0;
  const computedRemaining = Math.max(0, totalAmount - computedPaid);

  const subtotalBeforeDiscount = activeOrder?.subtotal || totalAmount;
  const discountAmount = activeOrder?.discount || 0;
  const shippingFee = activeOrder?.shippingFee || 0;
  const deliveryFee = activeOrder?.deliveryFee || 0;

  const milestones = activeOrder
    ? getShipmentMilestones(activeOrder.status, activeOrder.shipmentNumber)
    : [];

  // Status flags
  const isPaidInFull = activeOrder ? computedRemaining === 0 : false;
  const isPartiallyPaid = activeOrder ? (computedPaid > 0 && computedRemaining > 0) : false;
  const isUnpaid = activeOrder ? computedPaid === 0 : true;

  const handlePrint = () => {
    document.body.classList.add('modal-print-active');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('modal-print-active');
    }, 1000);
  };

  const handleCopyWhatsAppSummary = () => {
    if (!activeOrder) return;
    const text = `🧾 *فاتورة شراء رسمية - ${storeName}*
----------------------------------
🔹 *رقم الفاتورة:* ${invoiceNumber}
🔹 *رقم الطلب:* ${activeOrder.orderNumber}
🔹 *العميل:* ${activeCustomer?.name || activeOrder.customerName || 'عميل نقدي'} (${activeCustomer?.code || activeOrder.customerCode || ''})
🔹 *الموقع/المنصة:* ${activeOrder.site} (${activeOrder.itemsCount} قطع)
🔹 *تاريخ الطلب:* ${activeOrder.orderDate}
${activeOrder.shipmentNumber ? `🔹 *رقم الشحنة:* #${activeOrder.shipmentNumber}` : ''}
----------------------------------
💰 *المبالغ والمالية:*
- إجمالي الطلب: ${totalAmount.toLocaleString()} ريال
- المبلغ المسدد: ${computedPaid.toLocaleString()} ريال
- المتبقي المطلوب سداده: ${computedRemaining.toLocaleString()} ريال
(${numberToArabicWords(computedRemaining)} متبقية)
----------------------------------
📦 *حالة الطلب:* ${activeOrder.status === 'delivered' ? 'تم التسليم للعميل' : 'جاري المعالجة والشحن'}
للمتابعة والاستفسار: ${whatsapp}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white touch-scroll">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-3 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 my-2 sm:my-6 print:shadow-none print:m-0 print:max-w-none print:p-0 border border-slate-200 pb-16 sm:pb-6">
        
        {/* ========================================================= */}
        {/* CONTROLS & DYNAMIC SELECTOR BAR (Hidden in Print) */}
        {/* ========================================================= */}
        <div className="space-y-3 pb-3 border-b border-slate-200 print:hidden">
          
          {/* Top Title & Main Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1A3668] text-[#C5A059] flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>مولّد وعارض الفواتير الآلي</span>
                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                    جلب تلقائي للبيانات
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  اختر العميل والطلب لجلب كافة التفاصيل والبيانات المحاسبية إلى التصميم مباشرة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleCopyWhatsAppSummary}
                disabled={!activeOrder}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer border border-emerald-200 disabled:opacity-50"
                title="نسخ ملخص الفاتورة للواتساب"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'نص الواتساب'}</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={!activeOrder}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="طباعة الفاتورة بتنسيق ورقة A4 كاملة"
              >
                <Printer className="w-4 h-4 text-[#C5A059]" />
                <span>طباعة A4</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Customer & Order Selection Strip */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            
            {/* 1. Customer Selector */}
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3 h-3 text-[#1A3668]" />
                <span>1. اختر العميل:</span>
              </label>
              <div className="relative">
                <select
                  value={selectedCustomerId || ''}
                  onChange={e => handleCustomerChange(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1A3668]/30 appearance-none cursor-pointer"
                >
                  <option value="">-- اختر العميل --</option>
                  {customers.map(c => {
                    const custOrdersCount = orders.filter(o => o.customerId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) - {custOrdersCount} طلبات
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. Order Selector */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-[#1A3668]" />
                  <span>2. اختر الطلب:</span>
                </span>
                {customerOrders.length > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {customerOrders.length} طلب متاح
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={activeOrder?.id || ''}
                  onChange={e => handleOrderChange(Number(e.target.value))}
                  disabled={customerOrders.length === 0}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1A3668]/30 appearance-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {customerOrders.length === 0 ? (
                    <option value="">لا توجد طلبات لهذا العميل</option>
                  ) : (
                    customerOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        طلب #{o.orderNumber} ({o.site} - {o.totalAmount.toLocaleString()} ريال)
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. Design Template Switcher ("تصاميم") */}
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#C5A059]" />
                <span>3. نمط التصميم والطباعة:</span>
              </label>
              <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveDesign('official')}
                  className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                    activeDesign === 'official'
                      ? 'bg-[#1A3668] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  سند طلب رسمي
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDesign('classic')}
                  className={`flex-1 py-1 rounded-md transition-all cursor-pointer ${
                    activeDesign === 'classic'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  التصميم الملكي
                </button>
              </div>
            </div>

          </div>

          {/* Quick Notice if Customer has no orders */}
          {selectedCustomerId > 0 && customerOrders.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>العميل المختار ليس لديه أي طلبات مسجلة حالياً في النظام.</span>
              </div>
              {onOpenNewOrder && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenNewOrder();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-800 text-white font-bold text-[11px] hover:bg-amber-900 transition-colors"
                >
                  إضافة طلب جديد له
                </button>
              )}
            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* PRINTABLE TEMPLATES AREA */}
        {/* ========================================================= */}
        {!activeOrder ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-sm text-slate-700">الرجاء اختيار عميل وطلب لعرض الفاتورة وتوليدها تلقائياً</p>
            <p className="text-xs text-slate-400">سيتم جلب جميع الحسابات والمبالغ وسندات القبض ومسار الشحن تلقائياً فور الاختيار</p>
          </div>
        ) : (
          <div>
            {/* DESIGN 0: TOP STORE OFFICIAL DOCUMENT CARD (Exact Match to User Reference PDF) */}
            {activeDesign === 'official' && (
              <div className="py-1 print:py-0">
                <TopStoreDocumentCard
                  documentType="order_invoice"
                  docNumber={invoiceNumber}
                  date={activeOrder.orderDate}
                  order={activeOrder}
                  customer={activeCustomer}
                  payment={orderPayments[0]}
                  customerPayments={orderPayments}
                  accountName={orderPayments[0]?.paymentMethod || 'حساب العميل'}
                  notes={activeOrder.notes}
                  isCancelled={activeOrder.status === 'cancelled'}
                />
              </div>
            )}

            {/* DESIGN 1: THE ROYAL OFFICIAL (Luxury, Minimal, High-Readability) */}
            {activeDesign === 'classic' && (
              <div className="space-y-4 print:space-y-3.5 text-slate-900 text-xs bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 print:border-none print:p-0 print:rounded-none a4-print-document print-avoid-break">
                
                {/* 1️⃣ HEADER: Clean, Luxurious, Compact */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 border-2 border-[#C5A059] shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src="/top_store_logo.jpg"
                        alt="شعار توب ستور TOP STORE"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-black text-[#1A3668] tracking-tight">TOP STORE</h1>
                        <span className="text-xs font-bold text-[#C5A059]">توب ستور</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">وسيط شراء وتسوق إلكتروني معتمد</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{phone} | {whatsapp}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="inline-flex items-center gap-1.5 bg-[#1A3668]/5 text-[#1A3668] border border-[#1A3668]/20 px-3 py-1 rounded-lg text-xs font-black">
                      <Receipt className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>فاتورة شراء</span>
                    </div>
                    <div className="text-left sm:text-left text-[11px] font-mono mt-1 space-y-0.5">
                      <div className="text-slate-900 font-bold">
                        <span className="text-slate-400 font-sans ml-1 text-[10px]">رقم الفاتورة:</span>
                        {invoiceNumber}
                      </div>
                      <div className="text-slate-600 text-[10px]">
                        <span className="text-slate-400 font-sans ml-1">التاريخ:</span>
                        {activeOrder.orderDate}
                      </div>
                      {activeOrder.shipmentNumber && (
                        <div className="text-[#1A3668] font-bold text-[10px]">
                          <span className="text-slate-400 font-sans ml-1">الشحنة:</span>
                          #{activeOrder.shipmentNumber}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2️⃣ SHIPMENT & ORDER TRAJECTORY (مسار الشحنة - ثابت أعلى بيانات العميل) */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#1A3668]" />
                      <span>مسار الطلب والشحنة المعتمد</span>
                    </span>
                    {activeOrder.shipmentNumber && (
                      <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        شحنة #{activeOrder.shipmentNumber} {linkedShipment ? `(${linkedShipment.carrier})` : ''}
                      </span>
                    )}
                  </div>

                  {/* Visual Node-Line Tracker: 7 Stages */}
                  <div className="overflow-x-auto pb-1 pt-1.5 scrollbar-none">
                    <div className="min-w-[540px] sm:min-w-0 flex items-center justify-between relative px-2">
                      {/* Connecting Background Line */}
                      <div className="absolute top-[13px] left-4 right-4 h-0.5 bg-slate-200 z-0 pointer-events-none" />

                      {milestones.map((m, idx) => {
                        const isCompleted = m.status === 'completed';
                        const isCurrent = m.status === 'current';

                        return (
                          <div key={m.id} className="relative z-10 flex flex-col items-center flex-1 text-center group">
                            {/* Dot / Node */}
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs transition-all shadow-2xs ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : isCurrent
                                  ? 'bg-[#1A3668] text-[#C5A059] ring-3 ring-[#C5A059]/40 font-black scale-110'
                                  : 'bg-white text-slate-400 border border-slate-300'
                              }`}
                            >
                              <span>{m.icon}</span>
                            </div>

                            {/* Stage Label */}
                            <span
                              className={`text-[9px] sm:text-[10px] mt-1.5 leading-tight font-medium ${
                                isCurrent
                                  ? 'font-black text-[#1A3668]'
                                  : isCompleted
                                  ? 'text-slate-700 font-semibold'
                                  : 'text-slate-400'
                              }`}
                            >
                              {m.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3️⃣ DEDICATED CUSTOMER & ORDER BOXES (Two Distinct Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                  {/* مربع بيانات العميل لحاله */}
                  <div className="bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#1A3668]/10 text-[#1A3668] flex items-center justify-center">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">بيانات العميل</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#1A3668] bg-[#1A3668]/5 border border-[#1A3668]/15 px-2 py-0.5 rounded-md">
                        {activeCustomer?.code || activeOrder.customerCode || 'TOP-001'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">اسم العميل:</span>
                        <strong className="text-slate-900 font-bold text-sm text-left truncate">
                          {activeCustomer?.name || activeOrder.customerName || 'عميل نقدي'}
                        </strong>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم العميل:</span>
                        <span className="font-mono text-slate-800 font-bold text-xs">
                          {activeCustomer?.code || activeOrder.customerCode || 'TOP-001'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم الهاتف:</span>
                        <span className="font-mono text-slate-800 font-bold text-xs" dir="ltr">
                          {activeCustomer?.phone || '-'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">المحافظة:</span>
                        <span className="text-slate-700 font-medium text-xs">
                          {activeCustomer?.governorate || 'صنعاء'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">العنوان / مكان الاستلام:</span>
                        <span className="text-slate-700 font-medium text-xs text-left truncate max-w-[170px]">
                          {activeCustomer?.pickupLocation || 'استلام من المقر الرئيسي'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* مربع بيانات الطلب لحاله */}
                  <div className="bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#C5A059]/15 text-[#8a6820] flex items-center justify-center">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">بيانات الطلب</span>
                        </div>
                      </div>

                      <div>
                        {isPaidInFull && (
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>مسدد بالكامل</span>
                          </span>
                        )}
                        {isPartiallyPaid && (
                          <span className="inline-flex items-center gap-1 text-[#8a6820] font-bold bg-amber-50/80 border border-amber-300 px-2.5 py-0.5 rounded-lg text-[10px]">
                            <Clock className="w-3 h-3 text-[#C5A059]" />
                            <span>مسدد جزئياً</span>
                          </span>
                        )}
                        {isUnpaid && (
                          <span className="inline-flex items-center gap-1 text-rose-800 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg text-[10px]">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>غير مسدد</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم الطلب (طلب العميل):</span>
                        <strong className="font-mono text-slate-900 font-black text-sm">
                          #{activeOrder.orderNumber}
                        </strong>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم الشحنة:</span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {activeOrder.shipmentNumber ? `#${activeOrder.shipmentNumber}` : 'قيد التجميع والفرز'}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">تاريخ الطلب:</span>
                        <span className="font-mono text-slate-700 text-xs">
                          {activeOrder.orderDate}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">المنصة / الموقع:</span>
                        <span className="font-bold text-[#1A3668] text-xs">
                          {activeOrder.site}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">عدد القطع:</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {activeOrder.itemsCount} قطع
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">حالة الطلب:</span>
                        <span className="text-xs font-bold text-[#1A3668]">
                          {activeOrder.status === 'delivered'
                            ? 'تم التوصيل للعميل'
                            : activeOrder.status === 'shipped'
                            ? 'تم الشحن وبمسار التوصيل'
                            : activeOrder.status === 'purchased'
                            ? 'تم الشراء من المورد'
                            : activeOrder.status === 'cancelled'
                            ? 'طلب ملغى'
                            : 'قيد التجهيز والمتابعة'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4️⃣ INVOICE DETAILS: Clean Products Table (Desktop) & Cards (Mobile) */}
                <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
                  {/* Desktop Table View */}
                  <div className="hidden sm:block">
                    <table className="w-full text-right">
                      <thead className="bg-[#1A3668]/5 font-bold text-slate-800 border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3.5">المتجر / الموقع</th>
                          <th className="py-2.5 px-3 text-center">الكمية</th>
                          <th className="py-2.5 px-3.5 text-left">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        <tr>
                          <td className="py-2.5 px-3.5">
                            <span className="font-semibold text-slate-900 block">{activeOrder.site}</span>
                            {activeOrder.notes && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">{activeOrder.notes}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{activeOrder.itemsCount}</td>
                          <td className="py-2.5 px-3.5 text-left font-mono font-bold text-slate-900">
                            {subtotalBeforeDiscount.toLocaleString()} ريال
                          </td>
                        </tr>

                        {/* Distinct Discount Row */}
                        {discountAmount > 0 && (
                          <tr className="bg-rose-50/40 text-rose-700">
                            <td colSpan={2} className="py-2 px-3.5 text-left font-medium">
                              خصم العميل:
                            </td>
                            <td className="py-2 px-3.5 text-left font-mono font-bold text-rose-700">
                              − {discountAmount.toLocaleString()} ريال
                            </td>
                          </tr>
                        )}

                        {shippingFee > 0 && (
                          <tr className="text-slate-600 text-[11px]">
                            <td colSpan={2} className="py-1.5 px-3.5 text-left">أجور الشحن والوساطة:</td>
                            <td className="py-1.5 px-3.5 text-left font-mono font-bold text-slate-800">+ {shippingFee.toLocaleString()} ريال</td>
                          </tr>
                        )}

                        {deliveryFee > 0 && (
                          <tr className="text-slate-600 text-[11px]">
                            <td colSpan={2} className="py-1.5 px-3.5 text-left">رسوم التوصيل الداخلي:</td>
                            <td className="py-1.5 px-3.5 text-left font-mono font-bold text-slate-800">+ {deliveryFee.toLocaleString()} ريال</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Row View */}
                  <div className="sm:hidden p-3 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="font-bold text-slate-900 block">{activeOrder.site}</span>
                        <span className="text-[11px] text-slate-500">الكمية: {activeOrder.itemsCount} قطع</span>
                        {activeOrder.notes && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">{activeOrder.notes}</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {subtotalBeforeDiscount.toLocaleString()} ريال
                      </span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-rose-700 font-medium text-xs bg-rose-50/60 p-2 rounded-lg">
                        <span>خصم العميل</span>
                        <span className="font-mono font-bold">− {discountAmount.toLocaleString()} ريال</span>
                      </div>
                    )}

                    {(shippingFee > 0 || deliveryFee > 0) && (
                      <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                        {shippingFee > 0 && (
                          <div className="flex justify-between">
                            <span>أجور الشحن:</span>
                            <span className="font-mono font-bold">+ {shippingFee.toLocaleString()} ريال</span>
                          </div>
                        )}
                        {deliveryFee > 0 && (
                          <div className="flex justify-between">
                            <span>التوصيل:</span>
                            <span className="font-mono font-bold">+ {deliveryFee.toLocaleString()} ريال</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5️⃣ DEDICATED AMOUNT & FINANCIAL BOX (مربع بيانات المبلغ لحاله) */}
                <div className="bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-800 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">بيانات المبلغ والحساب المالي</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                      العملة: ريال يمني
                    </span>
                  </div>

                  {/* Calculations & Adjustments if discount or delivery apply */}
                  {(discountAmount > 0 || shippingFee > 0 || deliveryFee > 0) && (
                    <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200/60 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>قيمة المشتريات (المجموع الفرعي):</span>
                        <span className="font-mono font-bold text-slate-800">{subtotalBeforeDiscount.toLocaleString()} ريال</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-rose-700 font-medium">
                          <span>خصم العميل:</span>
                          <span className="font-mono font-bold">− {discountAmount.toLocaleString()} ريال</span>
                        </div>
                      )}
                      {shippingFee > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>أجور الشحن والوساطة:</span>
                          <span className="font-mono font-bold">+ {shippingFee.toLocaleString()} ريال</span>
                        </div>
                      )}
                      {deliveryFee > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>رسوم التوصيل الداخلي:</span>
                          <span className="font-mono font-bold">+ {deliveryFee.toLocaleString()} ريال</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* The 3 Core Totals */}
                  <div className="space-y-2 pt-1">
                    {/* Step 1: Total */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                      <span className="font-bold text-slate-700 text-xs sm:text-sm">إجمالي الفاتورة:</span>
                      <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                        {totalAmount.toLocaleString()} ريال يمني
                      </span>
                    </div>

                    {/* Step 2: Paid */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 text-emerald-800">
                      <span className="font-medium text-xs">المبلغ المسدد (المدفوع):</span>
                      <span className="font-mono font-bold text-xs sm:text-sm">
                        {computedPaid.toLocaleString()} ريال
                      </span>
                    </div>

                    {/* Step 3: Remaining Due */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-black text-[#8a6820] text-sm">المتبقي المطلوب:</span>
                      <div className="text-left font-mono">
                        <span className="font-black text-base sm:text-lg text-[#8a6820]">
                          {computedRemaining.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-slate-600 mr-1 font-sans">ريال</span>
                      </div>
                    </div>
                  </div>

                  {/* Amount in Words (Tafqeet) inside Amount Box */}
                  <div className="bg-white border border-slate-200/80 rounded-lg px-3 py-2 text-center text-[11px] text-slate-600">
                    <span className="text-slate-400 font-normal">المبلغ كتابةً: </span>
                    <span className="font-bold text-[#1A3668]">
                      {computedRemaining > 0 ? `${numberToArabicWords(computedRemaining)} لا غير` : 'تم السداد بالكامل ولا توجد مبالغ متبقية'}
                    </span>
                  </div>
                </div>

                {/* 7️⃣ LINKED RECEIPT VOUCHERS: Clear, Compact Cards */}
                {orderPayments.length > 0 && (
                  <div className="border border-slate-200/90 rounded-xl p-3 space-y-2 bg-white">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                        <span>سندات القبض المرتبطة بهذا الطلب</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{orderPayments.length} سند</span>
                    </div>

                    <div className="space-y-1.5">
                      {orderPayments.map(p => (
                        <div
                          key={p.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs gap-1.5"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <span>🧾 سند قبض:</span>
                              <strong className="font-mono text-emerald-800">{p.receiptNumber || p.paymentNumber}</strong>
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">({p.paymentDate})</span>
                            <span className="text-slate-600 text-[11px]">طريقة الدفع: {p.paymentMethod}</span>
                            {p.paymentType && (
                              <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                {p.paymentType}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                            <span className="font-mono font-bold text-emerald-700 text-xs">
                              {p.amount.toLocaleString()} ريال
                            </span>
                            <div className="flex items-center gap-1">
                              {onOpenReceipt && (
                                <button
                                  onClick={() => onOpenReceipt(p)}
                                  className="px-2 py-0.5 rounded-md text-[10px] bg-white hover:bg-emerald-50 text-emerald-800 font-bold transition-colors cursor-pointer border border-emerald-200 print:hidden"
                                >
                                  عرض السند
                                </button>
                              )}
                              {onEditPayment && (
                                <button
                                  onClick={() => onEditPayment(p)}
                                  className="px-2 py-0.5 rounded-md text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition-colors cursor-pointer border border-amber-200 print:hidden inline-flex items-center gap-1"
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                  <span>تعديل</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8️⃣ OFFICIAL SIGN-OFF, STAMP & AUTHORIZATION (Requirement 13) */}
                <div className="pt-3 pb-2 border-t border-slate-200/90 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
                  {/* Status & Confirmation */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-medium">حالة الفاتورة المعتمدة:</span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{computedRemaining <= 0 ? 'فاتورة معتمدة (مسددة بالكامل)' : 'فاتورة معتمدة (قيد التحصيل)'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">المرجع: #{invoiceNumber}</div>
                  </div>

                  {/* Official Digital Seal */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-18 h-18 rounded-full border-2 border-dashed border-[#C5A059] bg-[#1A3668]/5 flex flex-col items-center justify-center p-1 text-center shadow-2xs">
                      <span className="text-[9px] font-black text-[#1A3668]">TOP STORE</span>
                      <span className="text-[8px] font-bold text-[#C5A059]">توب ستور</span>
                      <span className="text-[7px] text-slate-500">فاتورة معتمدة</span>
                      <span className="text-[7px] font-mono text-emerald-700">✓ OFFICIAL SEAL</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5">الختم المالي المعتمد</span>
                  </div>

                  {/* Signatures */}
                  <div className="text-left space-y-1 sm:border-r sm:pr-4 border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">المسؤول / أمين الصندوق:</span>
                    <strong className="text-slate-900 font-bold text-xs block">الإدارة المالية - توب ستور</strong>
                    <div className="h-6 border-b border-slate-300 w-32 ml-auto mt-1" />
                    <span className="text-[9px] text-slate-400 block">التوقيع والاعتماد</span>
                  </div>
                </div>

                {/* 9️⃣ FOOTER: Clean, Minimal, Professional */}
                <div className="text-center text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  <span className="font-bold text-[#1A3668]">TOP STORE – توب ستور</span>
                  <span>•</span>
                  <span className="text-[#C5A059] font-bold">سلتك اكيد TOP</span>
                  <span>•</span>
                  <span className="font-mono">واتساب: {whatsapp}</span>
                </div>

              </div>
            )}

            {/* DESIGN 2: THE MODERN CLEAN (High-contrast Stats Grid & Cards) */}
            {activeDesign === 'modern' && (
              <div className="space-y-4 print:space-y-3 text-slate-900 text-xs border border-slate-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-white print:border-none print:p-0 a4-print-document print-avoid-break">
                
                {/* Modern Brand Bar */}
                <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl">
                  <div>
                    <h2 className="text-base font-black text-white tracking-wide">{storeName}</h2>
                    <p className="text-[11px] text-slate-300">{businessName} • {phone}</p>
                  </div>

                  <div className="text-left font-mono">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold block mb-1">
                      فاتورة شراء إلكترونية
                    </span>
                    <div className="text-xs font-bold text-white">{invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400">{activeOrder.orderDate}</div>
                  </div>
                </div>

                {/* 3 Metric Highlight Stat Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] font-medium">إجمالي الفاتورة:</span>
                    <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                      {totalAmount.toLocaleString()}
                      <span className="text-[10px] font-sans font-normal text-slate-500 mr-1">ريال</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{activeOrder.itemsCount} قطع بضائع</span>
                  </div>

                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-emerald-700 block text-[10px] font-medium">المدفوع بالسندات:</span>
                    <div className="text-base sm:text-lg font-black text-emerald-800 font-mono mt-0.5">
                      {computedPaid.toLocaleString()}
                      <span className="text-[10px] font-sans font-normal text-emerald-600 mr-1">ريال</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-mono">{orderPayments.length} سندات قبض</span>
                  </div>

                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-amber-800 block text-[10px] font-medium">المتبقي المطلوب:</span>
                    <div className="text-base sm:text-lg font-black text-amber-900 font-mono mt-0.5">
                      {computedRemaining.toLocaleString()}
                      <span className="text-[10px] font-sans font-normal text-amber-700 mr-1">ريال</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800">
                      {computedRemaining === 0 ? '✓ مسدد بالكامل' : 'ذمة مستحقة'}
                    </span>
                  </div>
                </div>

                {/* 2-Column Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Customer Card */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-700" />
                        <span>بيانات العميل المستلم</span>
                      </span>
                      <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                        {activeCustomer?.code || activeOrder.customerCode || 'TOP-000'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {activeCustomer?.name || activeOrder.customerName || 'عميل نقدي'}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span dir="ltr" className="font-mono">{activeCustomer?.phone || '-'}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{activeCustomer?.governorate || 'صنعاء'} - {activeCustomer?.pickupLocation || 'استلام من المقر'}</span>
                    </div>
                  </div>

                  {/* Order & Shipment Card */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-slate-700" />
                        <span>بيانات الشحنة والمنصة</span>
                      </span>
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {activeOrder.site}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-800">
                      طلب رقم: <strong className="font-bold">{activeOrder.orderNumber}</strong>
                    </div>
                    <div className="text-xs font-mono text-slate-800">
                      رقم الشحنة: {activeOrder.shipmentNumber ? <strong className="text-indigo-700 font-bold">#{activeOrder.shipmentNumber}</strong> : 'قيد التجميع'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      تاريخ التوثيق: {activeOrder.orderDate}
                    </div>
                  </div>

                </div>

                {/* Progress Tracking Indicator */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>مرحلة الطلب والشحنة الحالية:</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      {activeOrder.status === 'delivered' ? 'تم التسليم بنجاح' : activeOrder.status === 'shipped' ? 'في مرحلة الشحن والنقل' : 'قيد التجهيز والمعالجة'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                    {milestones.map((m, i) => (
                      <div
                        key={m.id}
                        className={`flex-1 h-full border-r border-white first:border-none ${
                          m.status === 'completed'
                            ? 'bg-emerald-600'
                            : m.status === 'current'
                            ? 'bg-indigo-600 animate-pulse'
                            : 'bg-slate-200'
                        }`}
                        title={m.title}
                      />
                    ))}
                  </div>
                </div>

                {/* Items & Financial Summary Box */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-xs flex justify-between">
                    <span>تفاصيل المشتريات والحسابات</span>
                    <span className="font-mono">{activeOrder.site} ({activeOrder.itemsCount} قطع)</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">إجمالي القطع قبل الخصم:</span>
                      <span className="font-mono font-bold">{subtotalBeforeDiscount.toLocaleString()} ريال</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>الخصم المعتمد:</span>
                        <span className="font-mono">- {discountAmount.toLocaleString()} ريال</span>
                      </div>
                    )}
                    {shippingFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>أجور الشحن والوساطة:</span>
                        <span className="font-mono font-bold">+ {shippingFee.toLocaleString()} ريال</span>
                      </div>
                    )}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>أجور التوصيل الداخلي:</span>
                        <span className="font-mono font-bold">+ {deliveryFee.toLocaleString()} ريال</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm">
                      <span>صافي إجمالي الفاتورة:</span>
                      <span className="font-mono text-slate-900">{totalAmount.toLocaleString()} ريال يمني</span>
                    </div>
                  </div>
                </div>

                {/* Tafqeet & Authenticity Stamp */}
                <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block font-medium">المبلغ المطلوب كتابة باللغة العربية:</span>
                    <strong className="text-xs sm:text-sm font-bold text-amber-300">
                      {computedRemaining > 0 ? numberToArabicWords(computedRemaining) : 'تم السداد بالكامل'}
                    </strong>
                  </div>
                  <div className="text-left font-mono text-[10px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">معتمد وموثق نظاماً</span>
                  </div>
                </div>

              </div>
            )}

            {/* DESIGN 3: COMPACT THERMAL / EXPRESS VOUCHER (Clean receipt slip) */}
            {activeDesign === 'compact' && (
              <div className="max-w-md mx-auto bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 space-y-3 font-mono text-xs text-slate-800 print:border-none print:p-0">
                
                {/* Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 font-sans">
                  <h2 className="text-lg font-black text-[#1A3668]">{storeName}</h2>
                  <p className="text-[11px] text-slate-600">{businessName}</p>
                  <div className="inline-block bg-slate-900 text-white px-2.5 py-0.5 rounded text-[10px] font-bold font-mono">
                    وصل فاتورة سريعة
                  </div>
                </div>

                {/* Basic Details */}
                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">رقم الفاتورة:</span>
                    <strong className="font-bold">{invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">رقم الطلب:</span>
                    <strong className="font-bold">{activeOrder.orderNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">التاريخ:</span>
                    <span>{activeOrder.orderDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">العميل:</span>
                    <span className="font-sans font-bold">{activeCustomer?.name || activeOrder.customerName || 'عميل نقدي'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">كود العميل:</span>
                    <span>{activeCustomer?.code || activeOrder.customerCode || 'TOP-000'}</span>
                  </div>
                  {activeCustomer?.phone && (
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">الهاتف:</span>
                      <span dir="ltr">{activeCustomer.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">الموقع والقطع:</span>
                    <span className="font-sans">{activeOrder.site} ({activeOrder.itemsCount} قطع)</span>
                  </div>
                  {activeOrder.shipmentNumber && (
                    <div className="flex justify-between font-bold text-[#1A3668]">
                      <span className="font-sans">رقم الشحنة:</span>
                      <span>#{activeOrder.shipmentNumber}</span>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="space-y-1.5 py-1 text-xs">
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-600">إجمالي الطلب:</span>
                    <span className="font-bold">{totalAmount.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between font-sans text-emerald-800">
                    <span>المبلغ المسدد:</span>
                    <span className="font-bold">{computedPaid.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between font-sans font-black text-sm pt-1.5 border-t border-dashed border-slate-300 text-amber-900">
                    <span>المتبقي للدفع:</span>
                    <span className="text-base">{computedRemaining.toLocaleString()} ريال</span>
                  </div>
                </div>

                {/* Words */}
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] font-sans text-center text-slate-700 font-bold">
                  {computedRemaining > 0 ? numberToArabicWords(computedRemaining) : 'تم السداد بالكامل'}
                </div>

                {/* Footer QR / Info */}
                <div className="pt-2 text-center text-[10px] text-slate-500 font-sans space-y-1 border-t border-dashed border-slate-300">
                  <p>شكراً لتعاملكم مع {storeName}</p>
                  <p className="font-mono">هاتف/واتساب: {whatsapp}</p>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Mobile Sticky Floating Action Bar for Phone Users */}
        {activeOrder && (
          <div className="sm:hidden fixed bottom-3 left-3 right-3 z-50 flex items-center gap-2 p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1A3668] active:bg-[#152c54] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#C5A059]" />
              <span>طباعة فاتورة A4</span>
            </button>
            <button
              onClick={handleCopyWhatsAppSummary}
              className="py-3 px-3.5 rounded-xl bg-emerald-50 active:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم!' : 'واتساب'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-3 rounded-xl bg-slate-100 text-slate-500 active:bg-slate-200 cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
