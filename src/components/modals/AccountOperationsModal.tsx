import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Building2,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Calendar,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Account, FinancialTransaction } from '../../types';

interface AccountOperationsModalProps {
  account: Account | null;
  isOpen?: boolean;
  onClose: () => void;
  onOpenTransfer: (fromAccountId?: number) => void;
  onOpenRecord?: (type: 'deposit' | 'withdrawal', accountId: number) => void;
}

export const AccountOperationsModal: React.FC<AccountOperationsModalProps> = ({
  account,
  isOpen = true,
  onClose,
  onOpenTransfer,
  onOpenRecord
}) => {
  const { transactions, getAccountBalance, runningBalancesMap } = useStore();
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !account) return null;

  const currentBalance = getAccountBalance(account.id);

  // Filter transactions for this specific account
  const accountTransactions = transactions
    .filter(t => t.accountId === account.id)
    .sort((a, b) => new Date(b.createdAt || b.transactionDate).getTime() - new Date(a.createdAt || a.transactionDate).getTime());

  // Inflow (الوارد) vs Outflow (الصادر) totals
  let totalIn = 0;
  let totalOut = 0;
  let inCount = 0;
  let outCount = 0;

  accountTransactions.forEach(trx => {
    const amt = parseFloat(String(trx.amount || 0)) || 0;
    const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
    if (isIncome) {
      totalIn += amt;
      inCount += 1;
    } else {
      totalOut += amt;
      outCount += 1;
    }
  });

  const filteredTransactions = accountTransactions.filter(trx => {
    const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
    if (filterType === 'IN' && !isIncome) return false;
    if (filterType === 'OUT' && isIncome) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = trx.description?.toLowerCase().includes(q);
      const matchNum = trx.transactionNumber?.toLowerCase().includes(q);
      const matchAmt = String(trx.amount).includes(q);
      return matchDesc || matchNum || matchAmt;
    }
    return true;
  });

  const getAccountIcon = () => {
    switch (account.type) {
      case 'محفظة':
        return <Wallet className="w-5 h-5 text-amber-600" />;
      case 'بنكي':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'بطاقة':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      case 'نقدي':
        return <Banknote className="w-5 h-5 text-emerald-600" />;
      default:
        return <Wallet className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTransactionTypeName = (type: FinancialTransaction['type']) => {
    switch (type) {
      case 'payment':
        return { label: 'سند قبض وارد', isIncome: true };
      case 'deposit':
        return { label: 'إيداع نقدي وارد', isIncome: true };
      case 'transfer_in':
        return { label: 'تحويل وارد', isIncome: true };
      case 'transfer_out':
        return { label: 'تحويل صادر', isIncome: false };
      case 'expense':
        return { label: 'مصروف تشغيلي صادر', isIncome: false };
      case 'withdrawal':
        return { label: 'سحب نقدي صادر', isIncome: false };
      default:
        return { label: 'تسوية رصيد', isIncome: false };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              {getAccountIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{account.name}</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                  {account.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                كشف تفصيلي لحركات الصادر والوارد وتاريخ العمليات المالية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {onOpenRecord && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onOpenRecord('deposit', account.id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="سند وارد إيداع في هذا الحساب"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>وارد (+)</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenRecord('withdrawal', account.id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="سند صادر سحب من هذا الحساب"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>صادر (-)</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenTransfer(account.id);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>تحويل</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Account Financial Highlights (Balance, Inflows, Outflows) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 bg-white border-b border-slate-100">
          {/* Current Balance */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>الرصيد الفعلي الحالي</span>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {currentBalance.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500">ريال</span>
            </div>
            {parseFloat(String(account.openingBalance || 0)) > 0 && (
              <span className="text-[10px] text-slate-400 mt-1 block">
                افتتاحي: {parseFloat(String(account.openingBalance)).toLocaleString()} ريال
              </span>
            )}
          </div>

          {/* Inflow Card (الوارد) */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
              <span className="flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                إجمالي الوارد (المقبوضات)
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                {inCount} حركة
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
                +{totalIn.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-emerald-700">ريال</span>
            </div>
            <span className="text-[10px] text-emerald-700 mt-1 block">
              سندات قبض وإيداعات وتحويلات داخلة
            </span>
          </div>

          {/* Outflow Card (الصادر) */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-rose-800 font-semibold">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                إجمالي الصادر (المدفوعات)
              </span>
              <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                {outCount} حركة
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-rose-950">
                -{totalOut.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-rose-700">ريال</span>
            </div>
            <span className="text-[10px] text-rose-700 mt-1 block">
              مصاريف تشغيلية، شحن، وتحويلات خارجة
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:px-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Filter Pills (All / In / Out) */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع العمليات ({accountTransactions.length})
            </button>
            <button
              onClick={() => setFilterType('IN')}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                filterType === 'IN'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-100/60'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>الوارد فقط ({inCount})</span>
            </button>
            <button
              onClick={() => setFilterType('OUT')}
              className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                filterType === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-700 hover:bg-rose-100/60'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>الصادر فقط ({outCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث برقم الحركة أو البيان..."
              className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-y-auto flex-1 p-0">
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">لا توجد عمليات مطابقة</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {accountTransactions.length === 0
                  ? 'لم يتم تسجيل أي عمليات واردة أو صادرة على هذا الحساب حتى الآن'
                  : 'جرب تغيير خيارات التصفية أو البحث'}
              </p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">رقم العملية</th>
                  <th className="py-2.5 px-4">التاريخ والوقت</th>
                  <th className="py-2.5 px-4">البيان والتفاصيل</th>
                  <th className="py-2.5 px-4 text-center">نوع الحركة</th>
                  <th className="py-2.5 px-4 text-left">المبلغ</th>
                  <th className="py-2.5 px-4 text-left">الرصيد التراكمي بعد الحركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(trx => {
                  const amt = parseFloat(String(trx.amount || 0));
                  const { label, isIncome } = getTransactionTypeName(trx.type);
                  const rb = runningBalancesMap.get(trx.id);
                  const dateStr = new Date(trx.transactionDate || trx.createdAt).toLocaleString('ar-YE', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 font-medium">
                        {trx.transactionNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {trx.description || 'بدون بيان'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-rose-600 shrink-0" />
                          )}
                          <span>{label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold whitespace-nowrap text-sm">
                        <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                          {isIncome ? '+' : '-'} {amt.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-400">ريال</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-mono whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-slate-900 text-xs">
                            {rb ? `${rb.balanceAfter.toLocaleString()} ريال` : '-'}
                          </span>
                          {rb && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({rb.balanceBefore.toLocaleString()} {rb.impact >= 0 ? '+' : '-'} {Math.abs(rb.impact).toLocaleString()})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>عدد العمليات المعروضة:</span>
            <span className="font-mono font-bold text-slate-900">{filteredTransactions.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
