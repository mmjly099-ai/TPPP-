import React from 'react';
import {
  Package,
  FileCheck,
  Plane,
  Truck,
  CheckCircle2,
  User,
  ShieldCheck,
  RotateCcw,
  Headphones,
  CheckSquare,
  Square,
  ThumbsUp,
  CreditCard,
  FileText,
  Clock,
  Award,
  Printer,
  Share2
} from 'lucide-react';
import { Order, Customer, Payment } from '../../types';
import { numberToArabicWords } from '../../utils/tafqeet';
import { useStore } from '../../context/StoreContext';

interface TopStoreOfficialVoucherProps {
  voucherType?: 'receipt' | 'invoice' | 'delivery_proof';
  voucherTitle?: string; // Default: 'سند قبض'
  docNumber: string;
  date: string;
  order?: Order;
  customer?: Customer;
  payment?: Payment;
  accountName?: string;
  notes?: string;
  commission?: number | string;
  isCancelled?: boolean;
  onPrint?: () => void;
}

export const TopStoreOfficialVoucher: React.FC<TopStoreOfficialVoucherProps> = ({
  voucherType = 'receipt',
  voucherTitle = 'سند قبض',
  docNumber,
  date,
  order,
  customer,
  payment,
  accountName,
  notes,
  commission,
  isCancelled = false,
  onPrint
}) => {
  const { settings } = useStore();
  const signature = settings.authorizedSignature || settings.signature;

  // Financial computations
  const totalAmount = order ? order.totalAmount : (payment ? payment.amount : 0);
  const discount = order?.discount || 0;
  const amountAfterDiscount = Math.max(0, totalAmount - discount);
  const paidAmount = payment ? payment.amount : (order ? order.paidAmount : 0);
  const remainingAmount = order ? order.remainingAmount : 0;
  const deliveryFee = order?.deliveryFee || 0;
  const grandTotalWithDelivery = amountAfterDiscount + deliveryFee;

  // Payment method classification
  const paymentMethod = payment?.paymentMethod || order?.paymentMethod || 'نقداً';
  const isCash = paymentMethod.includes('نقد') || paymentMethod.toLowerCase().includes('cash');
  const isBank =
    paymentMethod.includes('بنك') ||
    paymentMethod.includes('تحويل') ||
    paymentMethod.includes('الكريمي') ||
    paymentMethod.includes('التضامن') ||
    paymentMethod.includes('القطيبي') ||
    paymentMethod.includes('حساب');
  const isWallet =
    paymentMethod.includes('محفظ') ||
    paymentMethod.includes('جوالي') ||
    paymentMethod.includes('كاش') ||
    paymentMethod.includes('جيب') ||
    paymentMethod.includes('ون كاش') ||
    paymentMethod.includes('فلوسك');

  const bankName = isBank ? (accountName || paymentMethod) : '';
  const walletName = isWallet ? (accountName || paymentMethod) : '';

  // Order timeline state
  const orderStatus = order?.status || 'pending';
  const isDelivered = orderStatus === 'delivered';
  const isShipped = isDelivered || orderStatus === 'shipped';
  const isProcessing = isShipped || orderStatus === 'purchased';
  const isReceived = true; // Always received in receipt/order

  // Commission logic: ONLY show if registered on the customer/order
  const parsedCommission = typeof commission === 'number'
    ? commission
    : (commission ? parseFloat(String(commission)) : 0);
  const orderCommission = (order as any)?.commission ? Number((order as any).commission) : 0;
  const effectiveCommission = parsedCommission > 0 ? parsedCommission : orderCommission;
  const hasCommission = effectiveCommission > 0;
  const commissionText = hasCommission ? `${effectiveCommission.toLocaleString()} ريال` : '';

  // Notes logic: ONLY show if the customer/order actually has notes
  const orderNotes = (order?.notes || '').trim();
  const explicitNotes = (notes || '').trim();
  const customerNotes = orderNotes || explicitNotes;
  const hasNotes = customerNotes.length > 0;

  return (
    <div
      className="w-full max-w-[850px] mx-auto bg-white text-slate-900 rounded-3xl p-4 sm:p-7 shadow-2xl border-2 border-[#112952] space-y-3.5 sm:space-y-4 font-sans select-text relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-2.5 print-avoid-break a4-print-document"
      dir="rtl"
      id="topstore-official-voucher"
    >
      {/* Cancelled Watermark */}
      {isCancelled && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none opacity-20 rotate-[-25deg]">
          <span className="text-7xl sm:text-8xl font-black text-rose-600 border-8 border-rose-600 px-10 py-3 rounded-3xl tracking-wider">
            سند ملغى
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1️⃣ HEADER SECTION: Deep Navy Block - No Logo, Data on Right */}
      {/* ======================================================== */}
      <div className="bg-[#112952] text-white rounded-2xl p-3.5 sm:p-5 print:p-2.5 relative shadow-md print:shadow-none">
        <div className="flex flex-row items-center justify-between gap-3">
          
          {/* Right Side in RTL: Document Data (Date, Voucher #, Customer Code) */}
          <div className="text-right text-xs sm:text-sm font-bold space-y-1 sm:space-y-1.5 shrink-0 min-w-[120px] sm:min-w-[155px]">
            <div className="flex items-center gap-1.5">
              <span className="text-white/80 text-[11px] sm:text-xs font-normal">التاريخ:</span>
              <span className="font-mono text-white tracking-tight text-xs sm:text-sm">{date || '2026/09/20'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/80 text-[11px] sm:text-xs font-normal">رقم السند:</span>
              <span className="font-mono text-[#C5A059] font-black text-xs sm:text-sm">{docNumber}</span>
            </div>
            {customer?.code && (
              <div className="flex items-center gap-1.5">
                <span className="text-white/80 text-[11px] sm:text-xs font-normal">كود العميل:</span>
                <span className="font-mono text-white bg-[#0c1e3d] px-2 py-0.5 rounded text-[11px] border border-[#C5A059]/40 font-bold">
                  {customer.code}
                </span>
              </div>
            )}
          </div>

          {/* Center: Title Pill + Speed/Trust/Security Sub-pill */}
          <div className="flex flex-col items-center justify-center flex-1 text-center px-1">
            {/* Main Title Badge */}
            <div className="bg-[#183668] border-2 border-[#C5A059] px-6 sm:px-12 py-1.5 sm:py-2 rounded-2xl shadow-lg relative -top-0.5 sm:-top-1 print:py-1">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide drop-shadow-sm print:text-base">
                {voucherTitle}
              </h1>
            </div>

            {/* Slogan Pill: سرعة ثقة أمان */}
            <div className="bg-[#0c1e3d] border border-[#C5A059]/50 px-4 sm:px-7 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[11px] font-bold text-white tracking-wider flex items-center justify-center gap-2 sm:gap-4 shadow-inner mt-1 print:text-[9px]">
              <span>سرعة</span>
              <span className="text-[#C5A059] font-bold">•</span>
              <span>ثقة</span>
              <span className="text-[#C5A059] font-bold">•</span>
              <span>أمان</span>
            </div>
          </div>

          {/* Left Side in RTL: Clean Verification & Store Badge (No Logo Image) */}
          <div className="text-left text-xs space-y-1 shrink-0 min-w-[120px] sm:min-w-[155px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[#0c1e3d] border border-[#C5A059]/40 text-white text-[10px] sm:text-[11px] font-bold">
              <Award className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>مستند مالي معتمد</span>
            </div>
            <div className="text-[10px] text-white/70 print:text-[9px]">
              متجر توب ستور للتسوق
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 2️⃣ TIMELINE BAR: Order Shipping Track OR Payment Audit Track */}
      {/* ======================================================== */}
      <div className="border border-[#112952] rounded-2xl px-3 sm:px-6 py-2.5 sm:py-3.5 print:py-1.5 print:px-3 bg-white shadow-2xs">
        {order ? (
          /* Order Shipping Lifecycle */
          <div className="flex items-center justify-between text-center gap-1 sm:gap-2">
            {/* Step 1: تم الاستلام */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs ${
                isReceived ? 'bg-[#C5A059] text-white ring-2 ring-[#C5A059]/30' : 'bg-slate-100 text-slate-400'
              }`}>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                تم الاستلام
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            {/* Step 2: جاري التجهيز */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs ${
                isProcessing ? 'bg-[#112952] text-white ring-2 ring-[#112952]/30' : 'bg-slate-100 text-slate-400'
              }`}>
                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                جاري التجهيز
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            {/* Step 3: تم الشحن */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs ${
                isShipped ? 'bg-[#112952] text-white ring-2 ring-[#112952]/30' : 'bg-slate-100 text-slate-400'
              }`}>
                <Plane className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                تم الشحن
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            {/* Step 4: في الطريق */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs ${
                isShipped ? 'bg-[#112952] text-white ring-2 ring-[#112952]/30' : 'bg-slate-100 text-slate-400'
              }`}>
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                في الطريق
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            {/* Step 5: تم التسليم */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs ${
                isDelivered ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30' : 'bg-slate-100 text-slate-400'
              }`}>
                <Package className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                تم التسليم
              </span>
            </div>
          </div>
        ) : (
          /* Payment & Clearance Lifecycle for receipts without direct order */
          <div className="flex items-center justify-between text-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs bg-[#C5A059] text-white ring-2 ring-[#C5A059]/30">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                استلام المبلغ
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs bg-[#112952] text-white ring-2 ring-[#112952]/30">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                التحقق والتدقيق
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs bg-[#112952] text-white ring-2 ring-[#112952]/30">
                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                القيد المحاسبي
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs bg-[#112952] text-white ring-2 ring-[#112952]/30">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                تحديث الرصيد
              </span>
            </div>

            <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-full flex items-center justify-center shadow-xs bg-emerald-600 text-white ring-2 ring-emerald-600/30">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 print:w-3.5 print:h-3.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-slate-800 mt-1 whitespace-nowrap">
                سند معتمد
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3️⃣ TWO BOXES: بيانات العميل (يمين) & معلومات الطلب (يسار)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 sm:gap-4 print:gap-2.5 text-right">
        
        {/* Right Box in RTL: بيانات العميل (Placed first in DOM) */}
        <div className="border border-[#112952] rounded-2xl p-3 sm:p-4 print:p-2 bg-white shadow-2xs relative pt-5 sm:pt-6 print:pt-3.5">
          {/* Floating Pill Header */}
          <div className="absolute -top-3.5 print:-top-2.5 right-3 left-3 sm:right-4 sm:left-4 flex items-center justify-between bg-[#112952] text-white px-3 py-1 print:py-0.5 rounded-xl shadow-xs">
            <span className="font-bold text-xs sm:text-sm print:text-xs">بيانات العميل</span>
            <div className="w-6 h-6 print:w-5 print:h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white shadow-2xs">
              <User className="w-3.5 h-3.5 print:w-3 print:h-3" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 text-xs print:text-[11px] pt-1 sm:pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">اسم العميل:</span>
              <strong className="text-slate-900 font-bold text-right">{customer?.name || order?.customerName || 'عميل نقدي'}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">رقم الجوال:</span>
              <span className="font-mono text-slate-900 font-bold" dir="ltr">{customer?.phone || '-'}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">رقم احتياطي:</span>
              <span className="font-mono text-slate-600" dir="ltr">{customer?.alternativePhone || '-'}</span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 font-medium">موقع الاستلام:</span>
              <span className="text-slate-900 font-medium">{customer?.pickupLocation || customer?.governorate || 'صنعاء'}</span>
            </div>
          </div>
        </div>

        {/* Left Box in RTL: معلومات الطلب */}
        <div className="border border-[#112952] rounded-2xl p-3 sm:p-4 print:p-2 bg-white shadow-2xs relative pt-5 sm:pt-6 print:pt-3.5">
          {/* Floating Pill Header */}
          <div className="absolute -top-3.5 print:-top-2.5 right-3 left-3 sm:right-4 sm:left-4 flex items-center justify-between bg-[#112952] text-white px-3 py-1 print:py-0.5 rounded-xl shadow-xs">
            <span className="font-bold text-xs sm:text-sm print:text-xs">معلومات الطلب</span>
            <div className="w-6 h-6 print:w-5 print:h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white shadow-2xs">
              <Package className="w-3.5 h-3.5 print:w-3 print:h-3" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 text-xs print:text-[11px] pt-1 sm:pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">موقع الطلب:</span>
              <strong className="text-slate-900 font-bold text-right">{order?.site || 'موقع عالمي'}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">عدد القطع:</span>
              <span className="font-mono text-slate-900 font-bold">{order?.itemsCount ?? 1} قطعة</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-500 font-medium">رقم الشحنه:</span>
              <span className="font-mono text-[#112952] font-black">{order?.shipmentNumber ? `#${order.shipmentNumber}` : '-'}</span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 font-medium">رقم الطلب:</span>
              <span className="font-mono text-slate-900 font-black">{order ? `#${order.orderNumber}` : (payment?.orderId ? `#${payment.orderId}` : '-')}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4️⃣ FINANCIAL BREAKDOWN TABLE (تفاصيل المبلغ)             */}
      {/* ======================================================== */}
      <div className="border border-[#112952] rounded-2xl overflow-hidden shadow-2xs relative bg-white print:shadow-none">
        
        {/* Gold Header Bar */}
        <div className="bg-[#C5A059] text-white py-1.5 sm:py-2 px-4 text-center font-black text-xs sm:text-base tracking-wide relative z-10 shadow-xs print:py-1 print:text-xs">
          {voucherType === 'receipt' ? 'تفاصيل المبلغ وسند القبض' : 'تفاصيل المبلغ والفاتورة'}
        </div>

        {/* Breakdown Rows */}
        <div className="divide-y divide-slate-200 text-xs sm:text-sm print:text-[11px] font-medium relative z-10">
          
          {voucherType === 'receipt' ? (
            /* Specific Highlight for Receipt */
            <>
              <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-2.5 print:py-1 print:px-3 bg-emerald-50/60">
                <span className="text-emerald-950 font-black text-xs sm:text-base print:text-xs">المبلغ المقبوض / المستلم:</span>
                <span className="font-mono font-black text-emerald-800 text-sm sm:text-lg print:text-sm">{paidAmount.toLocaleString()} ريال يمني</span>
              </div>

              <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3 bg-slate-50/80">
                <span className="text-slate-600 font-bold">المبلغ كتابةً وتفقيطاً:</span>
                <span className="font-bold text-[#112952] text-[11px] sm:text-sm print:text-[10px]">{numberToArabicWords(paidAmount)}</span>
              </div>

              {order && (
                <>
                  <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                    <span className="text-slate-700">إجمالي قيمة الطلب:</span>
                    <span className="font-mono font-bold text-slate-900">{totalAmount.toLocaleString()} ريال</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                      <span className="text-slate-700">الخصم الممنوح:</span>
                      <span className="font-mono font-bold text-rose-600">-{discount.toLocaleString()} ريال</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                    <span className="text-slate-700">إجمالي المسدد حتى الآن:</span>
                    <span className="font-mono font-bold text-emerald-700">{(order.paidAmount || paidAmount).toLocaleString()} ريال</span>
                  </div>

                  <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                    <span className="text-slate-700">المبلغ المتبقي بذمة العميل:</span>
                    <span className="font-mono font-bold text-amber-800">{remainingAmount.toLocaleString()} ريال</span>
                  </div>
                </>
              )}

              {customer && !order && (
                <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                  <span className="text-slate-700">الرصيد المتبقي بذمة العميل:</span>
                  <span className="font-mono font-bold text-amber-800">{Math.max(0, (customer.balance || 0)).toLocaleString()} ريال</span>
                </div>
              )}
            </>
          ) : (
            /* Invoice Breakdown */
            <>
              <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                <span className="text-slate-700">المبلغ الاجمالي:</span>
                <span className="font-mono font-bold text-slate-900">{totalAmount.toLocaleString()} ريال</span>
              </div>

              <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                <span className="text-slate-700">الخصم:</span>
                <span className="font-mono font-bold text-rose-600">{discount > 0 ? `-${discount.toLocaleString()}` : '0'} ريال</span>
              </div>

              <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                <span className="text-slate-700">المبلغ بعد الخصم:</span>
                <span className="font-mono font-bold text-slate-900">{amountAfterDiscount.toLocaleString()} ريال</span>
              </div>

              <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                <span className="text-slate-700">المبلغ المدفوع:</span>
                <span className="font-mono font-bold text-emerald-700">{paidAmount.toLocaleString()} ريال</span>
              </div>

              <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                <span className="text-slate-700">المبلغ المتبقي:</span>
                <span className="font-mono font-bold text-amber-800">{remainingAmount.toLocaleString()} ريال</span>
              </div>

              <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2 print:py-0.5 print:px-3">
                <span className="text-slate-700">رسوم التوصيل للمنزل:</span>
                <span className="font-mono font-bold text-slate-800">{deliveryFee > 0 ? `${deliveryFee.toLocaleString()} ريال` : 'مجاناً / غير محدد'}</span>
              </div>
            </>
          )}

        </div>

        {/* Gold Footer Bar */}
        <div className="bg-[#C5A059] text-white py-2 sm:py-2.5 px-3 sm:px-6 print:py-1.5 print:px-3 flex items-center justify-between font-black text-xs sm:text-sm relative z-10 shadow-xs">
          {voucherType === 'receipt' ? (
            <>
              <span>إجمالي سند القبض المعتمد:</span>
              <span className="font-mono text-xs sm:text-base print:text-xs text-white font-black bg-[#112952] px-2.5 sm:px-3 py-0.5 rounded-lg border border-white/20">
                {paidAmount.toLocaleString()} ريال يمني
              </span>
            </>
          ) : (
            <>
              <span>الاجمالي شامل التوصيل:</span>
              <span className="font-mono text-xs sm:text-base print:text-xs text-white font-black bg-[#112952] px-2.5 sm:px-3 py-0.5 rounded-lg border border-white/20">
                {grandTotalWithDelivery.toLocaleString()} ريال
              </span>
            </>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5️⃣ BOXES: طريقه الدفع / ملاحظة (مشروطة) / عموله (مشروطة)  */}
      {/* ======================================================== */}
      <div className={`grid grid-cols-1 ${
        hasNotes && hasCommission ? 'md:grid-cols-3 print:grid-cols-3' : (hasNotes || hasCommission ? 'md:grid-cols-2 print:grid-cols-2' : 'md:grid-cols-2 print:grid-cols-2')
      } gap-2.5 sm:gap-3 print:gap-2 text-right`}>
        
        {/* Box 1: طريقه الدفع */}
        <div className="border border-[#112952] rounded-2xl p-3 sm:p-3.5 print:p-2 bg-white shadow-2xs relative pt-4 sm:pt-5 print:pt-3">
          <div className="absolute -top-3.5 print:-top-2.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-0.5 sm:py-1 rounded-xl shadow-xs">
            <span className="font-bold text-xs print:text-[10px]">طريقه الدفع</span>
            <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
              💳
            </div>
          </div>

          <div className="space-y-1 sm:space-y-1.5 text-[11px] print:text-[10px] pt-1.5 sm:pt-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">نقد:</span>
              <div className="flex items-center gap-1 font-mono">
                {isCash ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className="text-[10px]">{isCash ? 'نقداً' : '-'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">بنوك:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[120px]">{isBank ? bankName : '-'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">محافظ الكترونيه:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[120px]">{isWallet ? walletName : '-'}</span>
            </div>
          </div>
        </div>

        {/* Box 2: ملاحظة (ONLY rendered if the customer/order has notes) */}
        {hasNotes && (
          <div className="border border-[#112952] rounded-2xl p-3 sm:p-3.5 print:p-2 bg-white shadow-2xs relative pt-4 sm:pt-5 print:pt-3">
            <div className="absolute -top-3.5 print:-top-2.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-0.5 sm:py-1 rounded-xl shadow-xs">
              <span className="font-bold text-xs print:text-[10px]">ملاحظات الطلب</span>
              <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
                📝
              </div>
            </div>

            <div className="text-[11px] print:text-[10px] text-slate-800 leading-relaxed pt-1.5 sm:pt-2 min-h-[42px] flex items-center font-medium">
              <p className="line-clamp-2">{customerNotes}</p>
            </div>
          </div>
        )}

        {/* Box 3: عموله (ONLY rendered if a commission is recorded on the customer/order) */}
        {hasCommission && (
          <div className="border border-[#112952] rounded-2xl p-3 sm:p-3.5 print:p-2 bg-white shadow-2xs relative pt-4 sm:pt-5 print:pt-3">
            <div className="absolute -top-3.5 print:-top-2.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-0.5 sm:py-1 rounded-xl shadow-xs">
              <span className="font-bold text-xs print:text-[10px]">العمولة المسجلة</span>
              <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
                🤝
              </div>
            </div>

            <div className="space-y-0.5 text-[11px] print:text-[10px] pt-1.5 sm:pt-2 min-h-[42px] flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">العمولة المقررة:</span>
                <strong className="font-bold text-[#112952] font-mono text-xs sm:text-sm">{commissionText}</strong>
              </div>
              <div className="text-[9px] text-slate-400">
                وساطة تسوق وشحن توب ستور
              </div>
            </div>
          </div>
        )}

        {/* Fallback Box: When neither notes nor commission exists, show Account & Document status */}
        {!hasNotes && !hasCommission && (
          <div className="border border-[#112952] rounded-2xl p-3 sm:p-3.5 print:p-2 bg-white shadow-2xs relative pt-4 sm:pt-5 print:pt-3">
            <div className="absolute -top-3.5 print:-top-2.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-0.5 sm:py-1 rounded-xl shadow-xs">
              <span className="font-bold text-xs print:text-[10px]">مطابقة القيد المحاسبي</span>
              <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
                ⚖️
              </div>
            </div>

            <div className="space-y-1 text-[11px] print:text-[10px] pt-1.5 sm:pt-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">حالة السند:</span>
                <span className="font-bold text-emerald-700">مرحل ومطابق دفترياً</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">المرجع المالي:</span>
                <span className="font-mono text-slate-800">{docNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">توثيق النظام:</span>
                <span className="text-slate-500">معتمد في حساب العميل</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* 6️⃣ FEATURES & SIGNATURE ROW (الحسابات + الميزات)          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 print:grid-cols-4 gap-2.5 sm:gap-3 print:gap-2">
        
        {/* Right Signature Box: الحسابات (1 col, on the right in RTL) */}
        <div className="border border-[#112952] rounded-2xl p-2.5 sm:p-3 print:p-1.5 bg-white shadow-2xs relative pt-4 sm:pt-5 print:pt-2.5 flex flex-col justify-between order-2 md:order-1 print:order-1 print:col-span-1">
          <div className="absolute -top-3.5 print:-top-2.5 right-2 left-2 sm:right-3 sm:left-3 flex items-center justify-between bg-[#112952] text-white px-2 py-0.5 rounded-xl shadow-xs">
            <span className="font-bold text-[11px] sm:text-xs print:text-[9px]">الحسابات والاعتماد</span>
            <div className="w-4.5 h-4.5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[9px]">
              ✍️
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pt-1.5">
            {signature ? (
              <div className="flex flex-col items-center justify-center">
                <img
                  src={signature}
                  alt="التوقيع المعتمد"
                  className="max-h-11 sm:max-h-14 max-w-[120px] object-contain drop-shadow-2xs print:max-h-10"
                />
                <span className="text-[8px] sm:text-[9px] text-slate-500 font-bold mt-0.5">الاعتماد والتوقيع المالي</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-1">
                <div className="h-6 sm:h-7 border-b-2 border-dashed border-slate-300 w-24 sm:w-28 mx-auto flex items-end justify-center pb-0.5">
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">التوقيع المعتمد</span>
                </div>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium mt-0.5">الاعتماد والتوقيع المالي</span>
              </div>
            )}
          </div>
        </div>

        {/* Left Feature Box (3 cols, on the left in RTL): 4 Features */}
        <div className="md:col-span-3 print:col-span-3 border border-[#112952] rounded-2xl p-2.5 sm:p-4 print:p-1.5 bg-white shadow-2xs order-1 md:order-2 print:order-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2 sm:gap-3 print:gap-1 text-center">
            
            {/* Feature 1: دفع امن (Rightmost inside this box) */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
              </div>
              <strong className="text-[11px] sm:text-xs print:text-[10px] font-bold text-slate-900">دفع آمن</strong>
              <span className="text-[8px] sm:text-[9px] print:text-[8px] text-slate-500 leading-tight mt-0.5">حماية كاملة للبيانات</span>
            </div>

            {/* Feature 2: سياسه الارجاع */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
              </div>
              <strong className="text-[11px] sm:text-xs print:text-[10px] font-bold text-slate-900">سياسة الإرجاع</strong>
              <span className="text-[8px] sm:text-[9px] print:text-[8px] text-slate-500 leading-tight mt-0.5">استرجاع في حال وجود مشكلة</span>
            </div>

            {/* Feature 3: خدمه عملاء 24 */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
              </div>
              <strong className="text-[11px] sm:text-xs print:text-[10px] font-bold text-slate-900">خدمة عملاء 24/7</strong>
              <span className="text-[8px] sm:text-[9px] print:text-[8px] text-slate-500 leading-tight mt-0.5">مساعدتك في أي وقت</span>
            </div>

            {/* Feature 4: ضمان على الطلب (Leftmost inside this box) */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-7 print:h-7 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
              </div>
              <strong className="text-[11px] sm:text-xs print:text-[10px] font-bold text-slate-900">ضمان على الطلب</strong>
              <span className="text-[8px] sm:text-[9px] print:text-[8px] text-slate-500 leading-tight mt-0.5">نضمن وصول طلبك</span>
            </div>

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 7️⃣ BOTTOM FOOTER: شكرا لثقتك بنا! + متجر توب ستور          */}
      {/* ======================================================== */}
      <div className="border border-[#112952] rounded-2xl p-2.5 sm:p-4 print:p-2 bg-white shadow-2xs relative overflow-hidden print:shadow-none">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-center sm:text-right relative z-10">
          
          {/* Right Text */}
          <div>
            <h3 className="text-sm sm:text-base print:text-xs font-black text-[#112952]">
              شكرا لثقتك بنا!
            </h3>
            <p className="text-[10px] sm:text-xs print:text-[9px] text-slate-600 font-medium mt-0.5">
              نسعى دائما لتقديم افضل المنتجات واسرع خدمه لك
            </p>
          </div>

          {/* Left Text */}
          <div className="text-center sm:text-left">
            <h4 className="text-xs sm:text-sm print:text-[10px] font-black text-slate-900">متجر توب ستور</h4>
            <p className="text-[9px] sm:text-[10px] print:text-[8px] text-slate-500">متخصصون في طلب وشحن المنتجات من المواقع العالمية</p>
          </div>

        </div>
      </div>

      {/* Direct In-Voucher Quick Actions (Print & Share) - Hidden when printing */}
      <div className="pt-1 print:hidden flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Award className="w-4 h-4 text-[#C5A059]" />
          <span>مستند محاسبي رسمي جاهز للطباعة على ورقة A4 كاملة</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrint || (() => window.print())}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#112952] hover:bg-[#183668] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ring-2 ring-[#C5A059]/50"
            title="طباعة الفاتورة والسند فوراً"
          >
            <Printer className="w-4 h-4 text-[#C5A059]" />
            <span>طباعة المستند (A4)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
