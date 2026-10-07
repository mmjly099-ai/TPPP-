import React, { useState } from 'react';
import {
  Scale,
  Plus,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Building,
  DollarSign,
  Wallet,
  Clock,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { OtherReceivable } from '../types';

interface ReceivablesEquityViewProps {
  onOpenAddReceivable: () => void;
}

export const ReceivablesEquityView: React.FC<ReceivablesEquityViewProps> = ({
  onOpenAddReceivable
}) => {
  const { otherReceivables, owners, settleReceivable, accounts, totalReceivables } = useStore();
  const [selectedReceivableForSettle, setSelectedReceivableForSettle] = useState<OtherReceivable | null>(null);
  const [targetAccountId, setTargetAccountId] = useState<number>(() => accounts[0]?.id || 1);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleNotes, setSettleNotes] = useState<string>('');

  const totalCapital = owners.reduce(
    (sum, o) => sum + (parseFloat(String(o.contributedCapital || 0)) || 0),
    0
  );

  const handleOpenSettle = (rec: OtherReceivable) => {
    setSelectedReceivableForSettle(rec);
    const rem = rec.remainingBalance !== undefined ? rec.remainingBalance : (Number(rec.openingBalance) - (rec.paidAmount || 0));
    setSettleAmount(String(rem));
    setSettleNotes(`تحصيل دفعة من ${rec.name}`);
    if (accounts.length > 0) setTargetAccountId(accounts[0].id);
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivableForSettle) return;
    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0) return;

    settleReceivable(selectedReceivableForSettle.id, targetAccountId, amt, settleNotes);
    setSelectedReceivableForSettle(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">الذمم المدينة والسلفيات وحقوق الملكية</h2>
          <p className="text-xs text-slate-500">
            متابعة إقراض وتسليف الأطراف والمناديب، استرداد الديون، ورأس مال الشركاء والمؤسسين
          </p>
        </div>

        <button
          onClick={onOpenAddReceivable}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل سلفة / ذمة مدينة جديدة</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي السلف والذمم المدينة المستحقة</span>
          <div className="text-2xl font-black font-mono text-blue-700">
            {totalReceivables.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <span className="text-xs text-slate-400 block mt-2">
            مبالغ تم إقراضها لأشخاص أو جهات وقيد التحصيل والمحاسبة
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي رأس المال المسجل للشركاء</span>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {totalCapital.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <span className="text-xs text-slate-400 block mt-2">
            حصص الشركاء والمؤسسين في توب ستور
          </span>
        </div>
      </div>

      {/* Part 1: Other Receivables Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">سجل السلف والذمم المدينة</h3>
            <p className="text-xs text-slate-500">متابعة المبالغ المسلفة والمحاسبة والمسدد منها والمتبقي</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">الاسم / الطرف</th>
                <th className="py-3 px-3">الصفة</th>
                <th className="py-3 px-3">السبب / البيان</th>
                <th className="py-3 px-3">مصدر السلفة</th>
                <th className="py-3 px-3">تاريخ الإقراض</th>
                <th className="py-3 px-3">المبلغ المسلف</th>
                <th className="py-3 px-3">المسدد</th>
                <th className="py-3 px-3">المتبقي</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-3 text-center">المحاسبة والسداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {otherReceivables.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    لا توجد سلف أو ذمم مدينة مسجلة بعد.
                  </td>
                </tr>
              ) : (
                otherReceivables.map(rec => {
                  const isSettled = rec.status === 'settled';
                  const isPartiallyPaid = rec.status === 'partially_paid';
                  const paid = rec.paidAmount || 0;
                  const remaining = rec.remainingBalance !== undefined ? rec.remainingBalance : (Number(rec.openingBalance) - paid);
                  const sourceAcc = accounts.find(a => a.id === rec.fromAccountId);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        <div>{rec.name}</div>
                        {rec.phone && <div className="text-[10px] text-slate-400 font-mono">{rec.phone}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {rec.entityType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs">
                        <div>{rec.reason}</div>
                        {rec.notes && <span className="text-[10px] text-slate-400 block">{rec.notes}</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {sourceAcc ? (
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-amber-600" />
                            {sourceAcc.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{rec.openingDate}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 text-xs">
                        {Number(rec.openingBalance).toLocaleString()} ريال
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700 text-xs">
                        {paid.toLocaleString()} ريال
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700 text-xs">
                        {remaining.toLocaleString()} ريال
                      </td>
                      <td className="py-3 px-3">
                        {isSettled ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تمت المحاسبة
                          </span>
                        ) : isPartiallyPaid ? (
                          <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <Clock className="w-3.5 h-3.5" />
                            مسدد جزئياً
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3.5 h-3.5" />
                            غير مسدد
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {!isSettled ? (
                          <button
                            onClick={() => handleOpenSettle(rec)}
                            className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            محاسبة وسداد
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">مكتمل ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part 2: Owners & Equity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">حقوق الملكية ورأس المال</h3>
          <p className="text-xs text-slate-500">هيكل الملكية وحصص الشركاء في متجر توب ستور</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {owners.map(owner => (
            <div
              key={owner.id}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                    {owner.ownerNumber}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{owner.name}</h4>
                </div>
                {owner.notes && <span className="text-xs text-slate-500 block mt-1">{owner.notes}</span>}
                <span className="text-xs text-slate-500 block mt-1">
                  نسبة الشراكة: <strong className="font-mono text-slate-800">{owner.ownershipPercentage}%</strong>
                </span>
              </div>

              <div className="text-left">
                <span className="text-xs text-slate-400 block">رأس المال المساهم</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {parseFloat(String(owner.contributedCapital || 0)).toLocaleString()} ريال
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settle Modal */}
      {selectedReceivableForSettle && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              محاسبة وسداد ذمة: {selectedReceivableForSettle.name}
            </h3>
            
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>المبلغ الأصلي المسلف:</span>
                <span className="font-mono font-bold">{Number(selectedReceivableForSettle.openingBalance).toLocaleString()} ريال</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>المسدد سابقاً:</span>
                <span className="font-mono font-bold">{(selectedReceivableForSettle.paidAmount || 0).toLocaleString()} ريال</span>
              </div>
              <div className="flex justify-between text-blue-700 font-bold border-t border-slate-200 pt-1">
                <span>المتبقي المستحق:</span>
                <span className="font-mono font-bold">
                  {(selectedReceivableForSettle.remainingBalance ?? (Number(selectedReceivableForSettle.openingBalance) - (selectedReceivableForSettle.paidAmount || 0))).toLocaleString()} ريال
                </span>
              </div>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  المبلغ المسدد الآن (ريال) *
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  max={selectedReceivableForSettle.remainingBalance ?? Number(selectedReceivableForSettle.openingBalance)}
                  min="1"
                  className="w-full border border-slate-200 rounded-lg p-2.5 font-black font-mono text-emerald-700 text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  الحساب أو المحفظة المستلمة للمبلغ:
                </label>
                <select
                  value={targetAccountId}
                  onChange={e => setTargetAccountId(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
                >
                  {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ملاحظات أو بيان السداد:
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReceivableForSettle(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                >
                  تأكيد المحاسبة والإيداع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
