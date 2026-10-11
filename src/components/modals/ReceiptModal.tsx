import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  User,
  ShoppingBag,
  CreditCard,
  FileText,
  Sparkles,
  Layers
} from 'lucide-react';
import { Payment, Customer, Order } from '../../types';
import { useStore } from '../../context/StoreContext';
import { numberToArabicWords } from '../../utils/tafqeet';
import { TopStoreOfficialVoucher } from '../documents/TopStoreOfficialVoucher';

interface ReceiptModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onEditPayment?: (payment: Payment) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  isOpen,
  onClose,
  onEditPayment
}) => {
  const { settings, customers, orders, accounts, cancelPayment } = useStore();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'official' | 'classic'>('official');
  const [voucherTitle, setVoucherTitle] = useState<string>('سند قبض');

  if (!isOpen || !payment) return null;

  const customer: Customer | undefined = customers.find(c => c.id === payment.customerId);
  const linkedOrder: Order | undefined = payment.orderId ? orders.find(o => o.id === payment.orderId) : undefined;
  const account = accounts.find(a => a.id === payment.accountId);

  const storeName = settings.storeName || 'TOP STORE – توب ستور';
  const businessName = settings.businessName || 'وسيط شراء وتسوق إلكتروني';
  const phone = settings.phone || '772791991';
  const whatsapp = settings.whatsapp || '784960100';

  const receiptNumber = payment.receiptNumber || payment.paymentNumber.replace('PAY-', 'RCT-');
  const amountInWords = numberToArabicWords(payment.amount);
  const statementText = payment.statement || payment.notes || (linkedOrder ? `سداد دفعة للطلب #${linkedOrder.orderNumber}` : 'سداد دفعة نقدية على الحساب');

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsAppText = () => {
    const text = `🧾 *سند قبض رسمي - ${storeName}*
----------------------------------
🔹 *رقم السند:* ${receiptNumber}
🔹 *التاريخ:* ${payment.paymentDate}
🔹 *المستلم من:* ${customer?.name || 'العميل'} (${customer?.code || ''})
🔹 *المبلغ:* ${payment.amount.toLocaleString()} ريال يمني
🔹 *المبلغ كتابة:* ${amountInWords} ريال يمني لا غير
🔹 *طريقة الدفع:* ${payment.paymentMethod}
🔹 *الحساب المستلم:* ${account?.name || 'الحساب'}
🔹 *نوع الدفعة:* ${payment.paymentType || 'سداد دفعة'}
${linkedOrder ? `🔹 *الطلب المرتبط:* #${linkedOrder.orderNumber} (${linkedOrder.site})` : ''}
${linkedOrder?.shipmentNumber ? `🔹 *رقم الشحنة:* #${linkedOrder.shipmentNumber}` : ''}
${linkedOrder ? `🔹 *المتبقي على الطلب:* ${linkedOrder.remainingAmount.toLocaleString()} ريال` : ''}
🔹 *البيان:* ${statementText}
----------------------------------
شكراً لثقتكم بتوب ستور لخدمات التسوق والوساطة الإلكترونية ✨
للتواصل والمتابعة: ${whatsapp}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExecuteCancel = () => {
    if (!payment) return;
    cancelPayment(payment.id, cancelReason || 'إلغاء بطلب من الإدارة');
    setShowCancelConfirm(false);
    onClose();
  };

  const isCancelled = payment.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-1 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white touch-scroll" dir="rtl">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-2.5 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 my-1 sm:my-6 print:shadow-none print:m-0 print:max-w-none print:p-0 border border-slate-200 pb-20 sm:pb-6 relative">
        
        {/* Modal Controls (Sticky on top so it never scrolls out of view) */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 py-2.5 px-1 sm:px-2 gap-2.5 print:hidden rounded-t-xl shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-800 text-xs sm:text-sm">سند مالي:</span>
            <span className="font-mono text-xs bg-[#112952] text-[#C5A059] px-2.5 py-0.5 rounded-full font-bold">
              {receiptNumber}
            </span>
            {isCancelled && (
              <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
                ملغى
              </span>
            )}

            {/* Layout Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold mr-0 sm:mr-2">
              <button
                type="button"
                onClick={() => setLayoutMode('official')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutMode === 'official'
                    ? 'bg-[#112952] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="text-[11px] sm:text-xs">النموذج الرسمي</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('classic')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutMode === 'classic'
                    ? 'bg-white text-[#1A3668] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs">الكلاسيكي</span>
              </button>
            </div>

            {/* Document Title Selector if official */}
            {layoutMode === 'official' && (
              <select
                value={voucherTitle}
                onChange={(e) => setVoucherTitle(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-bold focus:outline-none cursor-pointer"
              >
                <option value="سند قبض">عنوان: سند قبض</option>
                <option value="سند استلام وتسليم">عنوان: سند استلام وتسليم</option>
                <option value="إثبات تسليم طلب">عنوان: إثبات تسليم طلب</option>
                <option value="فاتورة ومخالصة">عنوان: فاتورة ومخالصة</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleCopyWhatsAppText}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
              title="نسخ نص السند لإرساله للعميل عبر واتساب"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نص الواتساب'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#112952] hover:bg-[#152c54] text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md ring-2 ring-[#C5A059]/40 active:scale-95"
              title="طباعة السند بتنسيق ورقة A4 كاملة"
            >
              <Printer className="w-4 h-4 text-[#C5A059]" />
              <span>طباعة سند A4</span>
            </button>

            {!isCancelled && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer border border-rose-200"
                title="إلغاء سند القبض وعكس القيد المحاسبي"
              >
                إلغاء
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cancellation Confirmation Alert */}
        {showCancelConfirm && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3 print:hidden">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>تأكيد إلغاء سند القبض وعكس القيد المحاسبي</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              إلغاء هذا السند سيقوم بإعادة إثبات مديونية العميل بمبلغ ({payment.amount.toLocaleString()} ريال)، وخصم المبلغ من الحساب، وإنشاء قيد محاسبي عكسي في دفتر اليومية مع توثيقه في سجل التدقيق.
            </p>
            <input
              type="text"
              placeholder="سبب الإلغاء (اختياري)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-rose-300 bg-white"
            />
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                تراجع
              </button>
              <button
                onClick={handleExecuteCancel}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
              >
                نعم، إلغاء السند وعكس القيد
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DOCUMENT BODY: Official Voucher (Default) OR Classic Form */}
        {/* ========================================================= */}
        {layoutMode === 'official' ? (
          <div className="py-1">
            <TopStoreOfficialVoucher
              voucherType="receipt"
              voucherTitle={voucherTitle}
              docNumber={receiptNumber}
              date={payment.paymentDate}
              order={linkedOrder}
              customer={customer}
              payment={payment}
              accountName={account?.name}
              notes={payment.statement || payment.notes}
              isCancelled={isCancelled}
              onPrint={handlePrint}
            />
          </div>
        ) : (
          /* Printable Classic Receipt Document */
          <div className="space-y-4 print:space-y-3 text-slate-900 relative">
          
          {/* Watermark for Cancelled */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 rotate-[-25deg]">
              <span className="text-7xl font-black text-rose-600 border-4 border-rose-600 px-8 py-2 rounded-2xl">
                سند ملغى
              </span>
            </div>
          )}

          {/* Top Brand Header with Official Logo */}
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
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>سند قبض مالي</span>
              </div>
              <div className="text-left sm:text-left text-[11px] font-mono mt-1 space-y-0.5">
                <div className="text-slate-900 font-bold">
                  <span className="text-slate-400 font-sans ml-1 text-[10px]">رقم السند:</span>
                  {receiptNumber}
                </div>
                <div className="text-slate-600 text-[10px]">
                  <span className="text-slate-400 font-sans ml-1">التاريخ:</span>
                  {payment.paymentDate}
                </div>
                <div className="text-emerald-700 font-sans font-bold flex items-center gap-1 sm:justify-end text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>{isCancelled ? 'سند ملغى' : 'معتمد ومقيد محاسبياً'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 1️⃣ DEDICATED CUSTOMER & ORDER BOXES (Two Separate Boxes) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
            {/* مربع بيانات العميل لحاله */}
            <div className="bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#1A3668]/10 text-[#1A3668] flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">بيانات العميل (المستلم منه)</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#1A3668] bg-[#1A3668]/5 border border-[#1A3668]/15 px-2 py-0.5 rounded">
                  {customer?.code || 'TOP-001'}
                </span>
              </div>

              <div className="space-y-2 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">اسم العميل:</span>
                  <strong className="text-slate-900 font-bold text-sm text-left truncate">
                    {customer?.name || 'عميل نقدي'}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم العميل:</span>
                  <span className="font-mono text-slate-800 font-bold text-xs">
                    {customer?.code || 'TOP-001'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم الهاتف:</span>
                  <span className="font-mono text-slate-800 font-bold text-xs" dir="ltr">
                    {customer?.phone || '-'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">المحافظة:</span>
                  <span className="text-slate-700 font-medium text-xs">
                    {customer?.governorate || 'صنعاء'}
                  </span>
                </div>
              </div>
            </div>

            {/* مربع بيانات الطلب والعملية لحاله */}
            <div className="bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#C5A059]/15 text-[#8a6820] flex items-center justify-center">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">بيانات الطلب والعملية</span>
                </div>
                {linkedOrder && (
                  <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    طلب #{linkedOrder.orderNumber}
                  </span>
                )}
              </div>

              <div className="space-y-2 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم الطلب:</span>
                  <span className="font-mono text-slate-800 font-bold text-xs">
                    {linkedOrder ? `#${linkedOrder.orderNumber} (${linkedOrder.site})` : 'دفعة عامة على الحساب'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">رقم الشحنة:</span>
                  <span className="font-mono text-slate-800 font-bold text-xs">
                    {linkedOrder?.shipmentNumber ? `#${linkedOrder.shipmentNumber}` : '-'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">نوع الدفعة:</span>
                  <span className="inline-block text-[11px] font-bold text-[#8a6820] bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                    {payment.paymentType || 'سداد دفعة'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-slate-400 font-medium text-[11px] shrink-0">الحساب المستلم:</span>
                  <span className="text-slate-800 font-bold text-xs">
                    {account?.name || 'الصندوق الرئيسي'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2️⃣ OFFICIAL RECEIPT CLAUSE (النص الرسمي للاستلام - Requirement 5) */}
          <div className="bg-white border-2 border-[#1A3668]/15 rounded-xl p-4 text-xs leading-relaxed text-slate-800 text-right shadow-2xs">
            <p className="text-[13px] font-medium leading-loose">
              استلمنا من الأخ/الأخت <strong className="font-black text-[#1A3668]">{customer?.name || 'العميل'}</strong> مبلغاً وقدره <strong className="font-mono font-black text-emerald-800 text-sm">{payment.amount.toLocaleString()} ريال يمني</strong> (<strong className="text-slate-900 font-bold">{amountInWords} ريال يمني لا غير</strong>)، وذلك مقابل <span className="font-bold text-[#8a6820]">{statementText}</span>.
            </p>
          </div>

          {/* 3️⃣ DEDICATED AMOUNT & PAYMENT BOX (مربع بيانات المبلغ المقبوض تحت آخر شيء) */}
          <div className="bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-800 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-800 text-xs sm:text-sm">بيانات المبلغ المقبوض</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-800 shadow-2xs">
                <span>طريقة الدفع: {payment.paymentMethod}</span>
                {account && <span className="text-slate-500 font-normal">({account.name})</span>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">المبلغ المقبوض رقماً:</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-[#1A3668]">
                    {payment.amount.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-600">ريال يمني (YER)</span>
                </div>
              </div>

              {linkedOrder && (
                <div className="text-right sm:text-left bg-white border border-slate-200/80 rounded-lg p-2 text-xs">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-400">إجمالي الطلب:</span>
                    <span className="font-mono font-bold text-slate-800">{linkedOrder.totalAmount.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px] mt-1">
                    <span className="text-slate-400">المتبقي بعد الدفعة:</span>
                    <span className="font-mono font-bold text-[#8a6820]">{linkedOrder.remainingAmount.toLocaleString()} ريال</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-center text-xs text-emerald-900 font-medium">
              <span className="text-slate-400 font-normal">المبلغ كتابةً: </span>
              <span>فقط </span>
              <strong className="font-bold">{amountInWords} ريال يمني لا غير</strong>
            </div>
          </div>

          {/* 4️⃣ OFFICIAL SIGN-OFF, STAMP & AUTHORIZATION (Requirement 13) */}
          <div className="pt-3 pb-1 border-t border-slate-200/90 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
            {/* Status & Confirmation */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">حالة السند المالي:</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isCancelled ? 'سند ملغى' : 'سند معتمد ومقيد محاسبياً'}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">المرجع: #{receiptNumber}</div>
            </div>

            {/* Official Digital Seal */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-18 h-18 rounded-full border-2 border-dashed border-[#C5A059] bg-[#1A3668]/5 flex flex-col items-center justify-center p-1 text-center shadow-2xs">
                <span className="text-[9px] font-black text-[#1A3668]">TOP STORE</span>
                <span className="text-[8px] font-bold text-[#C5A059]">توب ستور</span>
                <span className="text-[7px] text-slate-500">سند قبض معتمد</span>
                <span className="text-[7px] font-mono text-emerald-700">✓ OFFICIAL SEAL</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5">الختم المالي المعتمد</span>
            </div>

            {/* Signatures */}
            <div className="text-left space-y-1 sm:border-r sm:pr-4 border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">المسؤول / الإدارة المالية:</span>
              <strong className="text-slate-900 font-bold text-xs block">الإدارة المالية - توب ستور</strong>
              <div className="h-6 border-b border-slate-300 w-32 ml-auto mt-1" />
              <span className="text-[9px] text-slate-400 block">التوقيع والاعتماد</span>
            </div>
          </div>

          {/* Clean Footer */}
          <div className="text-center text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="font-bold text-[#1A3668]">TOP STORE – توب ستور</span>
            <span>•</span>
            <span>سند مالي رسمي صادر من المنظومة المحاسبية</span>
            <span>•</span>
            <span className="font-mono">واتساب: {whatsapp}</span>
          </div>

        </div>
        )}

        {/* Mobile Sticky Floating Action Bar for Phone Users */}
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-50 flex items-center gap-2 p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-[#112952] active:bg-[#152c54] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C5A059]" />
            <span>طباعة سند A4</span>
          </button>
          <button
            onClick={handleCopyWhatsAppText}
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

      </div>
    </div>
  );
};
