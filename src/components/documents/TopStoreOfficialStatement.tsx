import React from 'react';
import {
  User,
  ShieldCheck,
  RotateCcw,
  Headphones,
  ThumbsUp,
  FileText,
  Receipt,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  AlertCircle,
  Award,
  Package
} from 'lucide-react';
import { Customer, Order, Payment } from '../../types';
import { numberToArabicWords } from '../../utils/tafqeet';
import { useStore } from '../../context/StoreContext';
import topStoreLogo from '../../assets/logo';

export interface StatementEntry {
  id: string;
  date: string;
  type: 'order' | 'payment' | 'opening_balance';
  typeLabel: string;
  operationNumber: string;
  orderNumber: string;
  shipmentNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  rawOrder?: Order;
  rawPayment?: Payment;
}

interface TopStoreOfficialStatementProps {
  customer: Customer;
  entries: StatementEntry[];
  openingBalance: number;
  totalOrdersCount: number;
  totalOrdersValue: number;
  totalPaidSum: number;
  totalRemainingSum: number;
  totalDebit: number;
  totalCredit: number;
  netDue: number;
  fromDate?: string;
  toDate?: string;
  statementMode: 'standard' | 'comprehensive';
  onOpenOrderInvoice?: (order: Order) => void;
  onOpenReceipt?: (payment: Payment) => void;
}

export const TopStoreOfficialStatement: React.FC<TopStoreOfficialStatementProps> = ({
  customer,
  entries,
  openingBalance,
  totalOrdersCount,
  totalOrdersValue,
  totalPaidSum,
  totalRemainingSum,
  totalDebit,
  totalCredit,
  netDue,
  fromDate,
  toDate,
  statementMode,
  onOpenOrderInvoice,
  onOpenReceipt
}) => {
  const { settings } = useStore();
  const signature = settings.authorizedSignature || settings.signature;

  const isDebtFree = netDue <= 0;
  const todayDate = new Date().toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const tafqeetText = netDue > 0
    ? `${numberToArabicWords(netDue)} مستحقة بذمة العميل`
    : 'خالص الذمة المالية ولا توجد مبالغ مستحقة';

  const customerNotes = (customer.notes || '').trim();
  const hasNotes = customerNotes.length > 0;

  return (
    <div
      className="w-full max-w-[920px] mx-auto bg-white text-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border-2 border-[#112952] space-y-4 font-sans select-text relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full"
      dir="rtl"
      id="topstore-official-statement"
    >
      {/* ======================================================== */}
      {/* 1️⃣ HEADER SECTION: Deep Navy Block - Official Logo & Data */}
      {/* ======================================================== */}
      <div className="bg-[#112952] text-white rounded-2xl p-4 sm:p-5 relative shadow-md">
        <div className="flex flex-row items-center justify-between gap-3">
          
          {/* Right Side in RTL: Statement Data (Date, Customer Code, Period) */}
          <div className="text-right text-xs sm:text-sm font-bold space-y-1.5 shrink-0 min-w-[130px] sm:min-w-[155px]">
            <div className="flex items-center gap-1.5">
              <span className="text-white/80 text-[11px] sm:text-xs font-normal">التاريخ:</span>
              <span className="font-mono text-white text-xs sm:text-sm">{todayDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/80 text-[11px] sm:text-xs font-normal">كود العميل:</span>
              <span className="font-mono text-[#C5A059] bg-[#0c1e3d] px-2 py-0.5 rounded-md text-xs sm:text-sm border border-[#C5A059]/40 font-bold">
                {customer.code}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-white/80 font-sans">
              {statementMode === 'comprehensive' ? 'كامل الحركات الدفترية' : `الفترة: ${fromDate || 'البداية'} - ${toDate || 'الآن'}`}
            </div>
          </div>

          {/* Center: Title Pill + Speed/Trust/Security Sub-pill */}
          <div className="flex flex-col items-center justify-center flex-1 text-center px-1">
            {/* Main Title Badge */}
            <div className="bg-[#183668] border-2 border-[#C5A059] px-6 sm:px-10 py-2 rounded-2xl shadow-lg relative -top-1">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-sm">
                {statementMode === 'comprehensive' ? 'كشف حساب مالي شامل' : 'كشف حساب العميل المعتمد'}
              </h1>
            </div>

            {/* Slogan Pill: سلتك اكيد TOP */}
            <div className="bg-[#0c1e3d] border border-[#C5A059]/50 px-5 sm:px-7 py-1 rounded-full text-[10px] sm:text-[11px] font-bold text-white tracking-wider flex items-center justify-center gap-3 sm:gap-4 shadow-inner mt-1">
              <span className="text-[#C5A059]">سلتك اكيد TOP</span>
            </div>
          </div>

          {/* Left Side in RTL: Official TOP STORE Logo & Verification Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-left min-w-[130px] sm:min-w-[170px] justify-end">
            <div className="hidden sm:flex flex-col items-end text-left space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0c1e3d] border border-[#C5A059]/40 text-white text-[11px] font-bold">
                <Award className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>كشف حساب معتمد</span>
              </div>
              <div className="text-[10px] text-white/80 font-medium">
                متجر توب ستور للتسوق
              </div>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 print:w-14 print:h-14 rounded-2xl bg-white p-1 shadow-md border-2 border-[#C5A059] flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={topStoreLogo}
                alt="شعار توب ستور TOP STORE"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 2️⃣ ACCOUNT HEALTH TRACKER (شريط إحصائيات الحساب المتناسق) */}
      {/* ======================================================== */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between text-center relative px-1 sm:px-3">
          
          {/* Milestone 1: رصيد البداية */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs bg-[#112952] text-white ring-2 ring-[#112952]/30">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 mt-1 whitespace-nowrap">
              الرصيد الافتتاحي
            </span>
            <span className="text-[10px] font-mono text-slate-600 font-bold">
              {openingBalance.toLocaleString()} ر.ي
            </span>
          </div>

          <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

          {/* Milestone 2: إجمالي المبيعات */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs bg-[#112952] text-white ring-2 ring-[#112952]/30">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 mt-1 whitespace-nowrap">
              إجمالي الطلبات ({totalOrdersCount})
            </span>
            <span className="text-[10px] font-mono text-slate-600 font-bold">
              {totalOrdersValue.toLocaleString()} ر.ي
            </span>
          </div>

          <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

          {/* Milestone 3: إجمالي المسدد */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs bg-emerald-600 text-white ring-2 ring-emerald-600/30">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 mt-1 whitespace-nowrap">
              إجمالي المسدد
            </span>
            <span className="text-[10px] font-mono text-emerald-700 font-bold">
              {totalPaidSum.toLocaleString()} ر.ي
            </span>
          </div>

          <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

          {/* Milestone 4: الرصيد المستحق */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs ${
              isDebtFree ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30' : 'bg-amber-600 text-white ring-2 ring-amber-600/30'
            }`}>
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-bold mt-1 whitespace-nowrap ${isDebtFree ? 'text-emerald-800' : 'text-[#8a6820]'}`}>
              الرصيد المتبقي
            </span>
            <span className={`text-[10px] font-mono font-black ${isDebtFree ? 'text-emerald-700' : 'text-[#8a6820]'}`}>
              {netDue.toLocaleString()} ر.ي
            </span>
          </div>

          <div className="flex-1 border-t-2 border-dotted border-slate-300 mx-1 relative -top-3" />

          {/* Milestone 5: حالة الحساب */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-xs ${
              isDebtFree ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30' : 'bg-amber-500 text-white ring-2 ring-amber-500/30'
            }`}>
              {isDebtFree ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 mt-1 whitespace-nowrap">
              حالة الحساب
            </span>
            <span className={`text-[10px] font-bold ${isDebtFree ? 'text-emerald-700' : 'text-[#8a6820]'}`}>
              {isDebtFree ? 'خالص الذمة' : 'مستحق سداد'}
            </span>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3️⃣ TWO BOXES: بيانات العميل & ملخص الحساب المالي         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Right Box in Arabic: بيانات العميل */}
        <div className="border border-[#112952] rounded-2xl p-4 bg-white shadow-2xs relative pt-6">
          <div className="absolute -top-3.5 right-4 left-4 flex items-center justify-between bg-[#112952] text-white px-3 py-1.5 rounded-xl shadow-xs">
            <span className="font-bold text-xs sm:text-sm">بيانات العميل</span>
            <div className="w-6 h-6 rounded-full bg-[#C5A059] flex items-center justify-center text-white shadow-2xs">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-2 text-xs pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">اسم العميل:</span>
              <div className="flex items-center gap-1.5">
                <strong className="text-slate-900 font-black text-sm">{customer.name}</strong>
                <span className="text-[10px] font-mono text-[#112952] bg-[#112952]/10 px-1.5 py-0.5 rounded font-bold">
                  {customer.code}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">رقم الجوال:</span>
              <span className="font-mono text-slate-900 font-bold" dir="ltr">{customer.phone || '-'}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">رقم احتياطي:</span>
              <span className="font-mono text-slate-600" dir="ltr">{customer.alternativePhone || '-'}</span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 font-medium">موقع الاستلام:</span>
              <span className="text-slate-900 font-bold">{customer.pickupLocation || customer.governorate || 'صنعاء'}</span>
            </div>
          </div>
        </div>

        {/* Left Box in Arabic: ملخص الحساب المالي */}
        <div className="border border-[#112952] rounded-2xl p-4 bg-white shadow-2xs relative pt-6">
          <div className="absolute -top-3.5 right-4 left-4 flex items-center justify-between bg-[#112952] text-white px-3 py-1.5 rounded-xl shadow-xs">
            <span className="font-bold text-xs sm:text-sm">ملخص حركة الحساب</span>
            <div className="w-6 h-6 rounded-full bg-[#C5A059] flex items-center justify-center text-white shadow-2xs">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-2 text-xs pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">إجمالي المدين (عليه):</span>
              <span className="font-mono text-rose-700 font-black">{totalDebit.toLocaleString()} ريال</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">إجمالي الدائن (له):</span>
              <span className="font-mono text-emerald-700 font-black">{totalCredit.toLocaleString()} ريال</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">عدد الحركات المقيدة:</span>
              <span className="font-mono text-slate-900 font-bold">{entries.length} حركة محاسبية</span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 font-medium">صافي الرصيد المستحق:</span>
              <span className={`font-mono font-black text-sm ${netDue > 0 ? 'text-[#8a6820]' : 'text-emerald-700'}`}>
                {netDue.toLocaleString()} ريال
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4️⃣ DETAILED STATEMENT LEDGER TABLE                      */}
      {/* ======================================================== */}
      <div className="border border-[#112952] rounded-2xl overflow-hidden shadow-2xs relative bg-white">
        {/* Gold Header Bar */}
        <div className="bg-[#C5A059] text-white py-2 px-4 text-center font-black text-sm sm:text-base tracking-wide relative z-10 shadow-xs">
          جدول حركة الحساب المالي التفصيلي
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#112952] text-white font-bold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">التاريخ</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-center">نوع الحركة</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-center">رقم المرجع</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-center">رقم الطلب</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-center">رقم الشحنة</th>
                <th className="py-2.5 px-3 min-w-[170px]">البيان والتفاصيل</th>
                <th className="py-2.5 px-2 text-left text-rose-300 whitespace-nowrap">مدين (عليه)</th>
                <th className="py-2.5 px-2 text-left text-emerald-300 whitespace-nowrap">دائن (له)</th>
                <th className="py-2.5 px-3 text-left whitespace-nowrap text-[#C5A059]">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                    لا توجد حركات مسجلة للعميل تطابق شروط التصفية المحددة
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap text-center">{entry.date}</td>
                    
                    <td className="py-2 px-2 font-sans font-medium whitespace-nowrap text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.type === 'order'
                            ? 'bg-[#112952]/10 text-[#112952] border border-[#112952]/20'
                            : entry.type === 'payment'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {entry.typeLabel}
                      </span>
                    </td>

                    <td className="py-2 px-2 font-bold text-slate-800 whitespace-nowrap text-center">
                      {entry.type === 'order' && entry.rawOrder && onOpenOrderInvoice ? (
                        <button
                          onClick={() => onOpenOrderInvoice(entry.rawOrder!)}
                          className="text-[#112952] hover:underline cursor-pointer font-bold"
                          title="عرض فاتورة الطلب"
                        >
                          {entry.operationNumber}
                        </button>
                      ) : entry.type === 'payment' && entry.rawPayment && onOpenReceipt ? (
                        <button
                          onClick={() => onOpenReceipt(entry.rawPayment!)}
                          className="text-emerald-700 hover:underline cursor-pointer font-bold"
                          title="عرض سند القبض"
                        >
                          {entry.operationNumber}
                        </button>
                      ) : (
                        entry.operationNumber
                      )}
                    </td>

                    <td className="py-2 px-2 text-slate-700 font-bold whitespace-nowrap text-center">
                      {entry.orderNumber !== '-' ? `#${entry.orderNumber}` : '-'}
                    </td>

                    <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-center">
                      {entry.shipmentNumber !== '-' ? `#${entry.shipmentNumber}` : '-'}
                    </td>

                    <td className="py-2 px-3 font-sans text-slate-700 max-w-xs truncate" title={entry.description}>
                      {entry.description}
                    </td>

                    <td className="py-2 px-2 text-left font-bold text-rose-700 whitespace-nowrap">
                      {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                    </td>

                    <td className="py-2 px-2 text-left font-bold text-emerald-700 whitespace-nowrap">
                      {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                    </td>

                    <td className="py-2 px-3 text-left font-black text-slate-900 whitespace-nowrap">
                      {entry.balance.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Gold Summary & Tafqeet Bar */}
        <div className="bg-[#C5A059] text-white py-2.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between font-black text-xs sm:text-sm relative z-10 shadow-xs gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-white/90 font-bold">الرصيد كتابةً:</span>
            <span className="text-white">{tafqeetText}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/90 font-bold">صافي الرصيد النهائي:</span>
            <span className="font-mono text-sm sm:text-base text-white font-black bg-[#112952] px-3 py-0.5 rounded-lg border border-white/20">
              {netDue.toLocaleString()} ريال يمني
            </span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5️⃣ THREE BOXES: طرق السداد / إقرار وملاحظات / الاعتماد   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Box 1: طرق السداد المعتمدة (Right Box) */}
        <div className="border border-[#112952] rounded-2xl p-3.5 bg-white shadow-2xs relative pt-5">
          <div className="absolute -top-3.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-1 rounded-xl shadow-xs">
            <span className="font-bold text-xs">طرق السداد المعتمدة</span>
            <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
              💳
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-600 font-medium">بنك الكريمي:</span>
              <span className="font-mono font-bold text-slate-900">772791991</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-600 font-medium">محافظ إلكترونية:</span>
              <span className="font-bold text-slate-800">ون كاش / جوالي / جيب</span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-600 font-medium">حسابات أخرى:</span>
              <span className="font-bold text-slate-800">النجم / كاش / التحويل المباشر</span>
            </div>
          </div>
        </div>

        {/* Box 2: إقرار وملاحظات الحساب (Center Box) */}
        <div className="border border-[#112952] rounded-2xl p-3.5 bg-white shadow-2xs relative pt-5">
          <div className="absolute -top-3.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-1 rounded-xl shadow-xs">
            <span className="font-bold text-xs">{hasNotes ? 'ملاحظات العميل' : 'إقرار ومطابقة الرصيد'}</span>
            <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
              📝
            </div>
          </div>

          <div className="text-[11px] text-slate-800 leading-relaxed pt-2 min-h-[50px] flex flex-col justify-center">
            {hasNotes ? (
              <p className="line-clamp-3 font-medium">{customerNotes}</p>
            ) : (
              <p className="line-clamp-3 text-slate-600">
                تم استخراج هذا الكشف آلياً ومطابقته مع دفاتر اليومية وسجلات القبض. يعتبر الرصيد الموضح أعلاه هو المعتمد نظاماً.
              </p>
            )}
          </div>
        </div>

        {/* Box 3: التدقيق والمطابقة الدفترية (Left Box) */}
        <div className="border border-[#112952] rounded-2xl p-3.5 bg-white shadow-2xs relative pt-5">
          <div className="absolute -top-3.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-1 rounded-xl shadow-xs">
            <span className="font-bold text-xs">التدقيق المالي</span>
            <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
              🤝
            </div>
          </div>

          <div className="space-y-1 text-[11px] pt-2 min-h-[50px] flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">حالة المستند:</span>
              <strong className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>معتمد دفترياً</span>
              </strong>
            </div>
            <div className="text-[10px] text-slate-400">
              نظام المحاسبة وإدارة السندات الآلي
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 6️⃣ FEATURES & SIGNATURE ROW (الميزات والضمانات + الحسابات) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        
        {/* Right Signature Box: الحسابات (1 col, on the right in RTL) */}
        <div className="border border-[#112952] rounded-2xl p-3 bg-white shadow-2xs relative pt-5 flex flex-col justify-between order-2 md:order-1">
          <div className="absolute -top-3.5 right-3 left-3 flex items-center justify-between bg-[#112952] text-white px-2.5 py-1 rounded-xl shadow-xs">
            <span className="font-bold text-xs">الحسابات والاعتماد</span>
            <div className="w-5 h-5 rounded-full bg-[#C5A059] flex items-center justify-center text-white text-[10px]">
              ✍️
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center pt-2">
            {signature ? (
              <div className="flex flex-col items-center justify-center">
                <img
                  src={signature}
                  alt="التوقيع المعتمد"
                  className="max-h-14 max-w-[140px] object-contain drop-shadow-2xs"
                />
                <span className="text-[9px] text-slate-500 font-bold mt-1">الاعتماد والتوقيع المالي</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="h-8 border-b-2 border-dashed border-slate-300 w-28 mx-auto flex items-end justify-center pb-0.5">
                  <span className="text-[9px] text-slate-400 font-medium">التوقيع المعتمد</span>
                </div>
                <span className="text-[9px] text-slate-400 font-medium mt-1">الاعتماد والتوقيع المالي</span>
              </div>
            )}
          </div>
        </div>

        {/* Left Feature Box (3 cols, on the left in RTL): 4 Features */}
        <div className="md:col-span-3 border border-[#112952] rounded-2xl p-3 sm:p-4 bg-white shadow-2xs order-1 md:order-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <ShieldCheck className="w-5 h-5 text-[#C5A059]" />
              </div>
              <strong className="text-xs font-bold text-slate-900">دفع آمن وموثق</strong>
              <span className="text-[9px] text-slate-500 leading-tight mt-0.5">حماية كاملة لبياناتك وعملياتك</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <RotateCcw className="w-5 h-5 text-[#C5A059]" />
              </div>
              <strong className="text-xs font-bold text-slate-900">دقة محاسبية</strong>
              <span className="text-[9px] text-slate-500 leading-tight mt-0.5">قيود دفترية تلقائية ومطابقة</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <Headphones className="w-5 h-5 text-[#C5A059]" />
              </div>
              <strong className="text-xs font-bold text-slate-900">خدمة عملاء 24/7</strong>
              <span className="text-[9px] text-slate-500 leading-tight mt-0.5">جاهزون للإجابة على استفساراتك</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-[#112952]/5 text-[#112952] flex items-center justify-center mb-1">
                <ThumbsUp className="w-5 h-5 text-[#C5A059]" />
              </div>
              <strong className="text-xs font-bold text-slate-900">ضمان المعاملات</strong>
              <span className="text-[9px] text-slate-500 leading-tight mt-0.5">إثبات دقيق لكل طلب وسداد</span>
            </div>

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 7️⃣ BOTTOM FOOTER: شكرا لثقتك بنا! + متجر توب ستور          */}
      {/* ======================================================== */}
      <div className="border border-[#112952] rounded-2xl p-4 bg-white shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right relative z-10">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#112952]">
              شكرا لثقتك بنا!
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              نسعى دائما لتقديم أفضل تجربة تسوق وخدمات وساطة موثوقة
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-center sm:text-left justify-center sm:justify-start">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-0.5 border border-[#112952]/20 shadow-2xs shrink-0 overflow-hidden flex items-center justify-center">
              <img src={topStoreLogo} alt="TOP STORE" className="w-full h-full object-contain" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">متجر توب ستور</h4>
              <p className="text-[10px] text-slate-500">وسيطك في الشراء والتسوق من المواقع العالمية</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
