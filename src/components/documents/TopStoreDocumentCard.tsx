import React from 'react';
import {
  FileText,
  Receipt,
  User,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  CreditCard,
  Building2,
  DollarSign,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  ShoppingBag,
  PackageCheck
} from 'lucide-react';
import { Order, Payment, Customer, Expense, OtherReceivable, PurchaseBatch } from '../../types';
import { numberToArabicWords } from '../../utils/tafqeet';

export interface TopStoreDocumentCardProps {
  documentType:
    | 'order_invoice'
    | 'receipt'
    | 'consolidated_invoice'
    | 'customer_statement'
    | 'receivable_statement'
    | 'expense_voucher'
    | 'purchase_document';
  docNumber: string;
  date: string;
  customer?: Customer | null;
  order?: Order | null;
  payment?: Payment | null;
  expense?: Expense | null;
  receivable?: OtherReceivable | null;
  purchaseBatch?: PurchaseBatch | null;
  customerOrders?: Order[];
  customerPayments?: Payment[];
  statementEntries?: Array<{
    date: string;
    description: string;
    orderNumber?: string | number;
    debit?: number;
    credit?: number;
    balance?: number;
  }>;
  accountName?: string;
  notes?: string;
  isCancelled?: boolean;
}

export const TopStoreDocumentCard: React.FC<TopStoreDocumentCardProps> = ({
  documentType,
  docNumber,
  date,
  customer,
  order,
  payment,
  expense,
  receivable,
  purchaseBatch,
  customerOrders = [],
  customerPayments = [],
  statementEntries = [],
  accountName,
  notes,
  isCancelled = false
}) => {
  // Title mapping
  const getDocumentTitle = () => {
    switch (documentType) {
      case 'order_invoice':
        return 'فاتورة طلب';
      case 'receipt':
        return 'سند قبض';
      case 'consolidated_invoice':
        return 'فاتورة موحدة للعميل';
      case 'customer_statement':
        return 'كشف حساب العميل';
      case 'receivable_statement':
        return 'بيان ذمة مالية';
      case 'expense_voucher':
        return 'سند صرف';
      case 'purchase_document':
        return 'مستند مشتريات وشحن';
      default:
        return 'مستند مالي';
    }
  };

  // Determine shipment timeline step (1 to 5)
  // 1: تم الاستلام, 2: جاري التجهيز, 3: تم الشحن, 4: في الطريق, 5: تم التسليم
  const getShipmentStep = (): number => {
    if (!order) {
      if (documentType === 'purchase_document') return 3;
      return 1;
    }
    switch (order.status) {
      case 'delivered':
        return 5;
      case 'shipped':
        return 4; // in transit / shipped
      case 'purchased':
        return 2; // processing / purchased
      case 'pending':
      default:
        return 1; // received
    }
  };

  const currentStep = getShipmentStep();

  // Helper currency formatter
  const fmt = (num?: number | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-US');
  };

  // Calculations for Order / Receipt
  const orderTotal = order ? order.totalAmount : 0;
  const orderDiscount = order?.discount || 0;
  const deliveryFee = order?.deliveryFee || 0;
  const orderFinalTotal = Math.max(0, orderTotal - orderDiscount) + deliveryFee;
  const orderPaid = order ? order.paidAmount : (payment ? payment.amount : 0);
  const orderRemaining = order ? order.remainingAmount : 0;

  // Payments related to order
  const relatedPayments = customerPayments.filter(p => order && p.orderId === order.id);

  // Consolidated customer stats
  const totalCustomerOrdersSum = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalCustomerPaidSum = customerOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalCustomerRemainingSum = customerOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);

  return (
    <div
      id="topstore-document-print-card"
      dir="rtl"
      className="w-full max-w-[850px] mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden font-sans select-text relative print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none text-slate-800 a4-print-document print-avoid-break"
    >
      {/* Cancelled Watermark if document is cancelled */}
      {isCancelled && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none opacity-20 rotate-[-25deg]">
          <span className="text-7xl sm:text-8xl font-black text-rose-600 border-8 border-rose-600 px-10 py-3 rounded-3xl tracking-wider">
            مستند ملغى
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP HEADER BANNER: Deep Navy (#1A3668)                */}
      {/* ======================================================== */}
      <div className="bg-[#1A3668] text-white px-5 sm:px-7 py-3.5 flex items-center justify-between shadow-md print:shadow-none">
        {/* Right in RTL: Logo & Store Name */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white rounded-xl shadow flex flex-col items-center justify-center p-1 shrink-0 border border-[#C5A059]/40">
            <span className="text-[11px] font-black text-[#1A3668] leading-none">TOP</span>
            <span className="text-[8px] font-extrabold text-[#C5A059] leading-none mt-0.5">STORE</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">TOP STORE</h1>
              <span className="text-xs font-bold text-[#C5A059] hidden sm:inline-block">توب ستور</span>
            </div>
            <p className="text-[11px] text-slate-200 font-medium">نظام الإدارة المالية والتجارية</p>
          </div>
        </div>

        {/* Left in RTL: Brand Slogan */}
        <div className="text-left text-xs font-medium">
          <span className="text-[#C5A059] font-bold text-xs sm:text-sm block">أسواق العالم بين يديك</span>
          <span className="text-[10px] text-slate-300 font-mono hidden sm:block">وثيقة معتمدة ومسجلة</span>
        </div>
      </div>

      {/* Golden Accent Line */}
      <div className="h-1 bg-gradient-to-r from-[#C5A059] via-[#ecd599] to-[#C5A059]" />

      {/* ======================================================== */}
      {/* 2. SUBHEADER: Document Title, Number, and Date          */}
      {/* ======================================================== */}
      <div className="px-5 sm:px-7 pt-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
        <div>
          <span className="text-[11px] font-bold text-slate-400 block mb-0.5">مستند مالي</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#1A3668] tracking-tight">
            {getDocumentTitle()}
          </h2>
        </div>

        <div className="text-left">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block">رقم المستند</span>
          <div className="text-sm sm:text-base font-black font-mono text-[#1A3668] tracking-wide">
            {docNumber}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono mt-0.5">
            التاريخ: {date}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TIMELINE: مسار الشحن (Shipment Track 5 Stages)       */}
      {/* ======================================================== */}
      <div className="px-5 sm:px-7 py-3">
        <div className="border border-slate-200/90 rounded-xl p-3.5 bg-slate-50/40">
          <div className="text-center text-xs font-bold text-slate-600 mb-3">مسار الشحن</div>
          
          <div className="relative flex items-center justify-between max-w-lg mx-auto px-2">
            {/* Horizontal Line background */}
            <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
            
            {/* Step 1: تم الاستلام */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep >= 1
                    ? 'bg-[#1A3668] text-white shadow-sm ring-2 ring-[#C5A059]'
                    : 'bg-white text-slate-400 border border-slate-300'
                }`}
              >
                1
              </div>
              <span className={`text-[10px] mt-1 font-bold ${currentStep >= 1 ? 'text-[#1A3668]' : 'text-slate-400'}`}>
                تم الاستلام
              </span>
            </div>

            {/* Step 2: جاري التجهيز */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep >= 2
                    ? 'bg-[#1A3668] text-white shadow-sm ring-2 ring-[#C5A059]'
                    : 'bg-white text-slate-400 border border-slate-300'
                }`}
              >
                2
              </div>
              <span className={`text-[10px] mt-1 font-bold ${currentStep >= 2 ? 'text-[#1A3668]' : 'text-slate-400'}`}>
                جاري التجهيز
              </span>
            </div>

            {/* Step 3: تم الشحن */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep >= 3
                    ? 'bg-[#1A3668] text-white shadow-sm ring-2 ring-[#C5A059]'
                    : 'bg-white text-slate-400 border border-slate-300'
                }`}
              >
                3
              </div>
              <span className={`text-[10px] mt-1 font-bold ${currentStep >= 3 ? 'text-[#1A3668]' : 'text-slate-400'}`}>
                تم الشحن
              </span>
            </div>

            {/* Step 4: في الطريق */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep >= 4
                    ? 'bg-[#1A3668] text-white shadow-sm ring-2 ring-[#C5A059]'
                    : 'bg-white text-slate-400 border border-slate-300'
                }`}
              >
                4
              </div>
              <span className={`text-[10px] mt-1 font-bold ${currentStep >= 4 ? 'text-[#1A3668]' : 'text-slate-400'}`}>
                في الطريق
              </span>
            </div>

            {/* Step 5: تم التسليم */}
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep >= 5
                    ? 'bg-[#1A3668] text-white shadow-sm ring-2 ring-[#C5A059]'
                    : 'bg-white text-slate-400 border border-slate-300'
                }`}
              >
                5
              </div>
              <span className={`text-[10px] mt-1 font-bold ${currentStep >= 5 ? 'text-[#1A3668]' : 'text-slate-400'}`}>
                تم التسليم
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. CUSTOMER INFO CARD: بيانات العميل                     */}
      {/* ======================================================== */}
      {customer && (
        <div className="px-5 sm:px-7 py-2">
          <div className="text-xs font-bold text-slate-700 mb-1">بيانات العميل</div>
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-right">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">رقم العميل</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 font-mono">
                  {customer.code || `TOP-${String(customer.id).padStart(3, '0')}`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">الاسم</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block">
                  {customer.name}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">الهاتف</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono" dir="ltr">
                  {customer.phone || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">المحافظة</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {customer.governorate || 'مأرب'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. BODY: Specialized per Document Type                   */}
      {/* ======================================================== */}

      {/* ---------------- TYPE 1: سند قبض (RECEIPT) ---------------- */}
      {documentType === 'receipt' && (
        <div className="px-5 sm:px-7 py-2 space-y-3">
          {/* Operation Data Card */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-right">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">رقم الطلب</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {order ? (order.customerOrderNumber || order.orderNumber || order.id) : (payment?.orderId || '—')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">رقم الشحنة</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono">
                  {order?.trackingNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">طريقة الدفع</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {payment?.paymentMethod || order?.paymentMethod || 'تحويل'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">الحساب المستلم</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {accountName || 'أم فلوس'}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-bold bg-slate-50/70">
              <span className="text-slate-600">إجمالي الطلب</span>
              <span className="font-mono text-slate-900 font-black">{fmt(orderTotal)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs text-slate-600">
              <span>رسوم التوصيل — تُدفع للموصل</span>
              <span className="font-mono">{fmt(deliveryFee)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-black bg-amber-50/40 text-amber-900">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" />
                هذه الدفعة ({payment?.paymentType || 'دفعة'})
              </span>
              <span className="font-mono text-sm text-[#1A3668]">{fmt(payment?.amount || orderPaid)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-bold text-emerald-800 bg-emerald-50/30">
              <span>إجمالي المدفوع</span>
              <span className="font-mono">{fmt(orderPaid)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-black text-slate-900 bg-slate-50">
              <span>المتبقي</span>
              <span className="font-mono text-rose-700">{fmt(orderRemaining)} ريال</span>
            </div>
          </div>

          {/* Tafqeet (Arabic Words Amount) */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5 text-center text-xs font-bold text-[#1A3668]">
            المبلغ كتابةً: {numberToArabicWords(payment?.amount || orderPaid)}
          </div>
        </div>
      )}

      {/* ---------------- TYPE 2: فاتورة طلب (ORDER INVOICE) ---------------- */}
      {documentType === 'order_invoice' && (
        <div className="px-5 sm:px-7 py-2 space-y-3">
          {/* Order Details Card */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-right">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">رقم العميل</span>
                <span className="text-xs sm:text-sm font-black text-slate-800 font-mono">
                  {customer?.code || `TOP-${order?.customerId || '001'}`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">رقم طلب العميل</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {order ? (order.customerOrderNumber || order.orderNumber || order.id) : 1}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">رقم الشحنة</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono">
                  {order?.trackingNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">تاريخ الطلب</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                  {order?.orderDate || date}
                </span>
              </div>
            </div>
          </div>

          {/* Amounts Summary */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-bold bg-slate-50/70">
              <span className="text-slate-700">قيمة الطلب</span>
              <span className="font-mono font-black text-slate-900">{fmt(orderTotal)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs text-slate-600">
              <span>الخصم</span>
              <span className="font-mono text-emerald-700">{fmt(orderDiscount)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs text-slate-600">
              <span>رسوم التوصيل — تُدفع للموصل</span>
              <span className="font-mono">{fmt(deliveryFee)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-black bg-[#1A3668]/5 text-[#1A3668]">
              <span>الإجمالي النهائي</span>
              <span className="font-mono text-sm">{fmt(orderFinalTotal)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-bold text-emerald-800 bg-emerald-50/20">
              <span>المدفوع</span>
              <span className="font-mono">{fmt(orderPaid)} ريال</span>
            </div>
            <div className="flex items-center justify-between p-2.5 px-4 text-xs font-black text-slate-900 bg-slate-50">
              <span>المتبقي</span>
              <span className="font-mono text-rose-700">{fmt(orderRemaining)} ريال</span>
            </div>
          </div>

          {/* Related Payments Table */}
          <div className="space-y-1.5 pt-1">
            <div className="text-xs font-bold text-slate-700">الدفعات المرتبطة بالطلب</div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1A3668] text-white text-[11px] font-bold">
                  <tr>
                    <th className="p-2 px-3">رقم الدفعة</th>
                    <th className="p-2">النوع</th>
                    <th className="p-2">المبلغ</th>
                    <th className="p-2">التاريخ</th>
                    <th className="p-2">طريقة الدفع</th>
                    <th className="p-2">الحساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {relatedPayments.length > 0 ? (
                    relatedPayments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium">
                        <td className="p-2 px-3 font-mono font-bold text-[#1A3668]">
                          {p.receiptNumber || p.paymentNumber || `PAY-${p.id}`}
                        </td>
                        <td className="p-2 text-slate-600">{p.paymentType || 'first'}</td>
                        <td className="p-2 font-mono font-bold text-emerald-700">{fmt(p.amount)} ريال</td>
                        <td className="p-2 font-mono text-slate-600">{p.paymentDate}</td>
                        <td className="p-2 text-slate-700">{p.paymentMethod}</td>
                        <td className="p-2 text-slate-700">{accountName || 'أم فلوس'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="font-medium">
                      <td className="p-2 px-3 font-mono font-bold text-[#1A3668]">
                        {payment?.receiptNumber || payment?.paymentNumber || (order ? `PAY-${order.id}-1` : 'PAY-50409065-8')}
                      </td>
                      <td className="p-2 text-slate-600">{payment?.paymentType || 'first'}</td>
                      <td className="p-2 font-mono font-bold text-emerald-700">{fmt(orderPaid || 4300)} ريال</td>
                      <td className="p-2 font-mono text-slate-600">{payment?.paymentDate || date}</td>
                      <td className="p-2 text-slate-700">{payment?.paymentMethod || 'تحويل'}</td>
                      <td className="p-2 text-slate-700">{accountName || 'أم فلوس'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TYPE 3: فاتورة موحدة للعميل (CONSOLIDATED) ---------------- */}
      {documentType === 'consolidated_invoice' && (
        <div className="px-5 sm:px-7 py-2 space-y-3">
          {/* Customer Orders Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A3668] text-white text-[11px] font-bold">
                <tr>
                  <th className="p-2 px-3">رقم الطلب</th>
                  <th className="p-2">الشحنة</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">التوصيل</th>
                  <th className="p-2">الإجمالي</th>
                  <th className="p-2">المدفوع</th>
                  <th className="p-2">المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {customerOrders.length > 0 ? (
                  customerOrders.map((o, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-medium">
                      <td className="p-2 px-3 font-mono font-bold text-slate-900">
                        {o.customerOrderNumber || o.orderNumber || o.id}
                      </td>
                      <td className="p-2 font-mono text-slate-500">{o.trackingNumber || '—'}</td>
                      <td className="p-2 font-mono text-slate-600">{o.orderDate}</td>
                      <td className="p-2 text-slate-600">{fmt(o.deliveryFee)} للموصل</td>
                      <td className="p-2 font-mono font-bold text-slate-900">{fmt(o.totalAmount)}</td>
                      <td className="p-2 font-mono font-bold text-emerald-700">{fmt(o.paidAmount)}</td>
                      <td className="p-2 font-mono font-bold text-rose-700">{fmt(o.remainingAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="font-medium">
                    <td className="p-2 px-3 font-mono font-bold text-slate-900">1</td>
                    <td className="p-2 font-mono text-slate-500">—</td>
                    <td className="p-2 font-mono text-slate-600">{date}</td>
                    <td className="p-2 text-slate-600">0 للموصل</td>
                    <td className="p-2 font-mono font-bold text-slate-900">8,300</td>
                    <td className="p-2 font-mono font-bold text-emerald-700">4,300</td>
                    <td className="p-2 font-mono font-bold text-rose-700">4,000</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 3 Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-500 block font-medium">إجمالي الطلبات</span>
              <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                {fmt(totalCustomerOrdersSum || 8300)} ريال
              </span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-emerald-700 block font-medium">إجمالي المدفوع</span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono">
                {fmt(totalCustomerPaidSum || 4300)} ريال
              </span>
            </div>
            <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-rose-700 block font-medium">إجمالي المتبقي</span>
              <span className="text-sm sm:text-base font-black text-rose-800 font-mono">
                {fmt(totalCustomerRemainingSum || 4000)} ريال
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TYPE 4: كشف حساب العميل (STATEMENT) ---------------- */}
      {documentType === 'customer_statement' && (
        <div className="px-5 sm:px-7 py-2 space-y-3">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-500 block font-medium">إجمالي المبيعات</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                {fmt(totalCustomerOrdersSum || 8300)} ريال
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-500 block font-medium">الخصومات</span>
              <span className="text-xs sm:text-sm font-black text-slate-700 font-mono">
                0 ريال
              </span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-emerald-700 block font-medium">إجمالي المدفوع</span>
              <span className="text-xs sm:text-sm font-black text-emerald-800 font-mono">
                {fmt(totalCustomerPaidSum || 4300)} ريال
              </span>
            </div>
            <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-rose-700 block font-medium">المتبقي</span>
              <span className="text-xs sm:text-sm font-black text-rose-800 font-mono">
                {fmt(totalCustomerRemainingSum || 4000)} ريال
              </span>
            </div>
          </div>

          {/* Statement Movements Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A3668] text-white text-[11px] font-bold">
                <tr>
                  <th className="p-2 px-3">التاريخ</th>
                  <th className="p-2">البيان</th>
                  <th className="p-2">الطلب</th>
                  <th className="p-2">مدين</th>
                  <th className="p-2">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {statementEntries.length > 0 ? (
                  statementEntries.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-medium">
                      <td className="p-2 px-3 font-mono text-slate-600">{e.date}</td>
                      <td className="p-2 text-slate-800 font-bold">{e.description}</td>
                      <td className="p-2 font-mono text-slate-700">{e.orderNumber || '—'}</td>
                      <td className="p-2 font-mono font-bold text-slate-900">{e.debit ? fmt(e.debit) : '—'}</td>
                      <td className="p-2 font-mono font-bold text-emerald-700">{e.credit ? fmt(e.credit) : '—'}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="font-medium">
                      <td className="p-2 px-3 font-mono text-slate-600">2026/9/18</td>
                      <td className="p-2 text-slate-800 font-bold">طلب</td>
                      <td className="p-2 font-mono text-slate-700">1</td>
                      <td className="p-2 font-mono font-bold text-slate-900">8,300</td>
                      <td className="p-2 font-mono text-slate-400">—</td>
                    </tr>
                    <tr className="font-medium bg-slate-50/40">
                      <td className="p-2 px-3 font-mono text-slate-600">2026/9/21</td>
                      <td className="p-2 text-slate-800 font-bold">دفعة</td>
                      <td className="p-2 font-mono text-slate-700">1</td>
                      <td className="p-2 font-mono text-slate-400">—</td>
                      <td className="p-2 font-mono font-bold text-emerald-700">4,300</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TYPE 5: بيان ذمة مالية (RECEIVABLE) ---------------- */}
      {documentType === 'receivable_statement' && (
        <div className="px-5 sm:px-7 py-2 space-y-3">
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-right">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">الطرف المعني</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {receivable?.name || customer?.name || 'طرف مدين'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">سبب الذمة</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {receivable?.reason || 'رصيد ذمة مالية معتمد'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">الهاتف</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-800" dir="ltr">
                  {receivable?.phone || customer?.phone || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">تاريخ النشأة</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-800">
                  {receivable?.date || date}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-500 block font-medium">الرصيد الافتتاحي</span>
              <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                {fmt(receivable?.amount || 0)} ريال
              </span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-emerald-700 block font-medium">المسدد</span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono">
                {fmt(receivable?.settledAmount || 0)} ريال
              </span>
            </div>
            <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-rose-700 block font-medium">المتبقي المطلوب</span>
              <span className="text-sm sm:text-base font-black text-rose-800 font-mono">
                {fmt((Number(receivable?.amount) || 0) - (Number(receivable?.settledAmount) || 0))} ريال
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TYPE 6: سند صرف (EXPENSE VOUCHER) ---------------- */}
      {documentType === 'expense_voucher' && (
        <div className="px-5 sm:px-7 py-2 space-y-3">
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-right">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">بند المصروف</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {expense?.category || 'مصاريف تشغيل'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">المستفيد / المورد</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {expense?.vendorName || 'إدارة التشغيل'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">الحساب المصروف منه</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {accountName || 'الصندوق'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">طريقة الدفع</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {expense?.paymentMethod || 'نقداً'}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">المبلغ المصروف</span>
              <span className="text-xl font-black text-rose-700 font-mono">
                {fmt(Number(expense?.amount) || 0)} ريال
              </span>
            </div>
            <div className="text-left text-xs font-bold text-[#1A3668]">
              {numberToArabicWords(Number(expense?.amount) || 0)}
            </div>
          </div>
          {expense?.description && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700">
              <span className="font-bold text-slate-900 block mb-0.5">الشرح / البيان:</span>
              {expense.description}
            </div>
          )}
        </div>
      )}

      {/* ---------------- TYPE 7: مستند المشتريات (PURCHASE BATCH) ---------------- */}
      {documentType === 'purchase_document' && (
        <div className="px-5 sm:px-7 py-2 space-y-3">
          <div className="border border-slate-200 rounded-xl p-3 bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-right">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">المنصة</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {purchaseBatch?.platform || 'SHEIN'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">بطاقة / وسيلة الدفع</span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {purchaseBatch?.cardName || accountName || 'فيزا كارد بنك التضامن'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">عدد الطلبات</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                  {purchaseBatch?.ordersCount || 1}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">التاريخ</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                  {purchaseBatch?.batchDate || date}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-500 block font-medium">المبلغ بالعملة الأجنبية</span>
              <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                {purchaseBatch?.foreignAmount ? `${purchaseBatch.foreignAmount} ${purchaseBatch.foreignCurrency || '$'}` : '—'}
              </span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-[11px] text-emerald-700 block font-medium">إجمالي التكلفة بالريال</span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono">
                {fmt(purchaseBatch?.totalCostYen || 0)} ريال
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notes section if provided */}
      {notes && (
        <div className="px-5 sm:px-7 py-2">
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-2.5 text-xs text-amber-900">
            <span className="font-bold ml-1">ملاحظات المستند:</span>
            {notes}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. FOOTER: TOP STORE Document Authentication             */}
      {/* ======================================================== */}
      <div className="px-5 sm:px-7 py-4 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          TOP STORE — مستند صادر من بيانات النظام الأصلية
        </p>
      </div>
    </div>
  );
};
