import React from 'react';
import { Customer, Order, Payment } from '../../types';
import topStoreLogo from '../../assets/logo';
import { FileText, Phone, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface TopStoreOfficialStatementProps {
  customer: Customer;
  entries: any[];
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
  statementMode?: string;
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
  onOpenOrderInvoice,
  onOpenReceipt
}) => {
  const { data } = useStore();
  const settings = data?.settings || {
    storeName: 'TOP STORE',
    phone: '770000000',
    whatsapp: '770000000',
    address: 'صنعاء - الجمهورية اليمنية'
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs print:border-none print:shadow-none print:p-0 space-y-6">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b-2 border-[#1A3668] gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white p-1 border-2 border-[#C5A059] shadow-xs flex items-center justify-center shrink-0">
            <img src={topStoreLogo} alt="TOP STORE" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A3668]">{settings.storeName || 'TOP STORE'}</h1>
            <p className="text-xs text-[#C5A059] font-bold">كشف حساب رسمي معتمد</p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              هاتف: {settings.phone} {settings.whatsapp ? `| واتساب: ${settings.whatsapp}` : ''}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">تاريخ الإصدار:</span>
            <span className="font-mono font-bold text-slate-800">{new Date().toISOString().split('T')[0]}</span>
          </div>
          {(fromDate || toDate) && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">الفترة:</span>
              <span className="font-mono text-slate-700">
                {fromDate || 'البداية'} إلى {toDate || 'اليوم'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">كود العميل:</span>
            <span className="font-mono font-black text-[#1A3668]">{customer.code}</span>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-slate-500 block mb-0.5">العميل / الحساب:</span>
          <span className="font-bold text-slate-900 text-sm">{customer.name}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">رقم الهاتف:</span>
          <span className="font-mono font-bold text-slate-800">{customer.phone || 'غير مسجل'}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">المحافظة / العنوان:</span>
          <span className="text-slate-800">{customer.governorate} {customer.pickupLocation ? `(${customer.pickupLocation})` : ''}</span>
        </div>
      </div>

      {/* Summary Financial Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 block">الرصيد الافتتاحي</span>
          <span className="text-sm font-bold font-mono text-slate-800">{openingBalance.toLocaleString()} ر.ي</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 block">إجمالي المبيعات (مدين)</span>
          <span className="text-sm font-bold font-mono text-blue-700">{totalDebit.toLocaleString()} ر.ي</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 block">إجمالي المقبوضات (دائن)</span>
          <span className="text-sm font-bold font-mono text-emerald-700">{totalCredit.toLocaleString()} ر.ي</span>
        </div>
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
          <span className="text-[11px] text-amber-800 block font-bold">الرصيد النهائي المستحق</span>
          <span className={`text-base font-black font-mono ${netDue > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
            {netDue.toLocaleString()} ر.ي
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#1A3668] text-white">
            <tr>
              <th className="py-2.5 px-3">التاريخ</th>
              <th className="py-2.5 px-3">رقم المرجع</th>
              <th className="py-2.5 px-3">البيان والتفاصيل</th>
              <th className="py-2.5 px-3">مدين (عليك)</th>
              <th className="py-2.5 px-3">دائن (لك)</th>
              <th className="py-2.5 px-3">الرصيد التراكمي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  لا توجد حركات مسجلة خلال الفترة المحددة
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{entry.date}</td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-700">{entry.reference || entry.refNumber || '-'}</td>
                  <td className="py-2 px-3 text-slate-800">{entry.description || entry.notes || '-'}</td>
                  <td className="py-2 px-3 font-mono font-bold text-blue-700">
                    {entry.debit ? entry.debit.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                    {entry.credit ? entry.credit.toLocaleString() : '-'}
                  </td>
                  <td className="py-2 px-3 font-mono font-black text-slate-900">
                    {entry.balance !== undefined ? entry.balance.toLocaleString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Official Footer / Signatures */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>
          <span>المحاسب المعتمد: ..........................</span>
        </div>
        <div>
          <span>ختم المتجر والاعتماد: ..........................</span>
        </div>
        <div>
          <span>توقيع العميل بالمطابقة: ..........................</span>
        </div>
      </div>
    </div>
  );
};
