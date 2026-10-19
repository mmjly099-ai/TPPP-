import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Building2,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Eye,
  Filter,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Account, FinancialTransaction } from '../types';

interface WalletsOperationsSectionProps {
  onOpenTransfer: (fromAccountId?: number) => void;
  onViewAccountDetails: (account: Account) => void;
  onNavigateToAccounts: () => void;
  onNavigateToJournal: () => void;
  onOpenRecord?: (type: 'deposit' | 'withdrawal', accountId?: number) => void;
}

export const WalletsOperationsSection: React.FC<WalletsOperationsSectionProps> = ({
  onOpenTransfer,
  onViewAccountDetails,
  onNavigateToAccounts,
  onNavigateToJournal,
  onOpenRecord
}) => {
  const { accounts, transactions, getAccountBalance, runningBalancesMap } = useStore();
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'ALL'>(2);
  const [trxTypeFilter, setTrxTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Filter accounts (excluding Equity accounts)
  const activeFinancialAccounts = useMemo(() => {
    return accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية');
  }, [accounts]);

  // Compute Inflow (الوارد) and Outflow (الصادر) per account
  const accountStatsMap = useMemo(() => {
    const stats: Record<number, { totalIn: number; totalOut: number; inCount: number; outCount: number; balance: number }> = {};

    activeFinancialAccounts.forEach(acc => {
      stats[acc.id] = {
        totalIn: 0,
        totalOut: 0,
        inCount: 0,
        outCount: 0,
        balance: getAccountBalance(acc.id)
      };
    });

    transactions.forEach(trx => {
      if (stats[trx.accountId]) {
        const amt = parseFloat(String(trx.amount || 0)) || 0;
        const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
        if (isIncome) {
          stats[trx.accountId].totalIn += amt;
          stats[trx.accountId].inCount += 1;
        } else {
          stats[trx.accountId].totalOut += amt;
          stats[trx.accountId].outCount += 1;
        }
      }
    });

    return stats;
  }, [activeFinancialAccounts, transactions, getAccountBalance]);

  // Overall totals across all accounts
  const overallStats = useMemo(() => {
    let grandIn = 0;
    let grandOut = 0;
    let grandBalance = 0;

    Object.values(accountStatsMap).forEach((s: { totalIn: number; totalOut: number; balance: number }) => {
      grandIn += s.totalIn;
      grandOut += s.totalOut;
      grandBalance += s.balance;
    });

    return { grandIn, grandOut, grandBalance };
  }, [accountStatsMap]);

  // Filtered transactions for the ledger view
  const displayedTransactions = useMemo(() => {
    let list = transactions;

    // Filter by account
    if (selectedAccountId !== 'ALL') {
      list = list.filter(t => t.accountId === selectedAccountId);
    }

    // Filter by type (IN vs OUT)
    if (trxTypeFilter === 'IN') {
      list = list.filter(t => t.type === 'deposit' || t.type === 'transfer_in' || t.type === 'payment');
    } else if (trxTypeFilter === 'OUT') {
      list = list.filter(t => t.type !== 'deposit' && t.type !== 'transfer_in' && t.type !== 'payment');
    }

    return list
      .sort((a, b) => new Date(b.createdAt || b.transactionDate).getTime() - new Date(a.createdAt || a.transactionDate).getTime())
      .slice(0, 15); // Show top 15 recent operations in this dashboard section
  }, [transactions, selectedAccountId, trxTypeFilter]);

  const selectedAccountObj = selectedAccountId !== 'ALL' ? accounts.find(a => a.id === selectedAccountId) : null;

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'محفظة':
        return <Wallet className="w-4 h-4 text-amber-600" />;
      case 'بنكي':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'بطاقة':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case 'نقدي':
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      default:
        return <Wallet className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
      
      {/* Header & Overall Summaries */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
              حركة الصادر والوارد
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              عمليات الصناديق والمحافظ والبنوك
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة دقيقة لكل عملية واردة (سند قبض، إيداع، تحويل وارد) وصادرة (مصروف، شحن، تحويل صادر) لكل حساب
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onOpenRecord && (
            <>
              <button
                onClick={() => onOpenRecord('deposit', selectedAccountId === 'ALL' ? undefined : selectedAccountId)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="تسجيل سند وارد إيداع"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>وارد (+)</span>
              </button>
              <button
                onClick={() => onOpenRecord('withdrawal', selectedAccountId === 'ALL' ? undefined : selectedAccountId)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="تسجيل سند صادر سحب"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>صادر (-)</span>
              </button>
            </>
          )}
          <button
            onClick={() => onOpenTransfer()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>تحويل</span>
          </button>
          <button
            onClick={onNavigateToAccounts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <span>كافة الحسابات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Overview Totals: Total Balance, Total Inflow (وارد), Total Outflow (صادر) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Liquidity */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">إجمالي السيولة في كافة الحسابات</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-slate-900">
                {overallStats.grandBalance.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500">ريال</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Total Inflow (وارد) */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              إجمالي الوارد (المقبوضات والإيداعات)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-emerald-950">
                +{overallStats.grandIn.toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-700">ريال</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Outflow (صادر) */}
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-800 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              إجمالي الصادر (المدفوعات والمصاريف)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black font-mono text-rose-950">
                {overallStats.grandOut.toLocaleString()}
              </span>
              <span className="text-[11px] text-rose-700">ريال</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-2xs">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Horizontal Scroll / Grid of Accounts with In/Out and Quick Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            اختر محفظة أو بنك لعرض كشف عملياته بالتفصيل:
          </h3>
          <span className="text-[11px] text-slate-400">
            انقر على الحساب لتصفيته أو انقر على زر (كشف العمليات) لفتحه بملء الشاشة
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* ALL Button */}
          <button
            onClick={() => setSelectedAccountId('ALL')}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
              selectedAccountId === 'ALL'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  شامل
                </span>
                <Layers className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs mt-2">كافة المحافظ والبنوك</h4>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] font-mono font-bold text-slate-700">
              {overallStats.grandBalance.toLocaleString()} ريال
            </div>
          </button>

          {/* Individual Account Cards */}
          {activeFinancialAccounts.map(acc => {
            const stats = accountStatsMap[acc.id] || { totalIn: 0, totalOut: 0, balance: 0 };
            const isSelected = selectedAccountId === acc.id;

            return (
              <div
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {getAccountIcon(acc.type)}
                      <span className="text-[10px] font-medium text-slate-500">{acc.type}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onViewAccountDetails(acc);
                        }}
                        className="p-1 rounded-md bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-500 transition-colors"
                        title="عرض كشف العمليات الكامل"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenTransfer(acc.id);
                        }}
                        className="p-1 rounded-md bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-500 transition-colors"
                        title="تحويل من هذا الحساب"
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs mt-2 truncate" title={acc.name}>
                    {acc.name}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <div className="text-xs font-black font-mono text-slate-900">
                    {stats.balance.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-400 font-sans">ريال</span>
                  </div>

                  {/* Micro In/Out preview */}
                  <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-1 border-t border-dashed border-slate-100">
                    <span className="text-emerald-700" title="وارد">
                      ↓ +{(stats.totalIn / 1000).toFixed(0)}k
                    </span>
                    <span className="text-rose-700" title="صادر">
                      ↑ -{(stats.totalOut / 1000).toFixed(0)}k
                    </span>
                  </div>

                  {onOpenRecord && (
                    <div className="grid grid-cols-2 gap-1 mt-2 pt-1.5 border-t border-slate-100">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenRecord('deposit', acc.id);
                        }}
                        className="py-0.5 px-1 rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
                        title="سند وارد إيداع"
                      >
                        <ArrowDownLeft className="w-2.5 h-2.5" />
                        <span>وارد</span>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenRecord('withdrawal', acc.id);
                        }}
                        className="py-0.5 px-1 rounded bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
                        title="سند صادر سحب"
                      >
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        <span>صادر</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Account Operations Ledger (جدول كشف العمليات والصادر والوارد) */}
      <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-4">
        
        {/* Ledger Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {selectedAccountObj ? `كشف عمليات: ${selectedAccountObj.name}` : 'جميع عمليات الصادر والوارد'}
              </h3>
              {selectedAccountObj && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                  الرصيد: {getAccountBalance(selectedAccountObj.id).toLocaleString()} ريال
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedAccountObj
                ? `عرض تفصيلي لعمليات الإيداع، سندات القبض، المصاريف والتحويلات الخاصة بـ ${selectedAccountObj.name}`
                : 'سجل أحدث الحركات المالية المنفذة عبر كافة المحافظ والبنوك'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedAccountObj && onOpenRecord && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenRecord('deposit', selectedAccountObj.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>وارد له (+)</span>
                </button>
                <button
                  onClick={() => onOpenRecord('withdrawal', selectedAccountObj.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>صادر منه (-)</span>
                </button>
              </div>
            )}

            {/* In / Out Filters */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setTrxTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                trxTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setTrxTypeFilter('IN')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                trxTypeFilter === 'IN'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-100/50'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>الوارد فقط</span>
            </button>
            <button
              onClick={() => setTrxTypeFilter('OUT')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                trxTypeFilter === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-700 hover:bg-rose-100/50'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>الصادر فقط</span>
            </button>
          </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
          {displayedTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              لا توجد عمليات مسجلة تطابق التحديد الحالي.
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">رقم الحركة</th>
                  <th className="py-2.5 px-4">التاريخ</th>
                  <th className="py-2.5 px-4">المحفظة / البنك</th>
                  <th className="py-2.5 px-4">البيان والتفاصيل</th>
                  <th className="py-2.5 px-4 text-center">نوع الحركة</th>
                  <th className="py-2.5 px-4 text-left">المبلغ بالريال</th>
                  <th className="py-2.5 px-4 text-left">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTransactions.map(trx => {
                  const acc = accounts.find(a => a.id === trx.accountId);
                  const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
                  const amt = parseFloat(String(trx.amount || 0));
                  const rb = runningBalancesMap.get(trx.id);

                  let typeLabel = 'تسوية';
                  if (trx.type === 'payment') typeLabel = 'سند قبض وارد';
                  else if (trx.type === 'deposit') typeLabel = 'إيداع وارد';
                  else if (trx.type === 'transfer_in') typeLabel = 'تحويل وارد';
                  else if (trx.type === 'transfer_out') typeLabel = 'تحويل صادر';
                  else if (trx.type === 'expense') typeLabel = 'مصروف صادر';
                  else if (trx.type === 'withdrawal') typeLabel = 'سحب صادر';

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {trx.transactionNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {new Date(trx.transactionDate || trx.createdAt).toLocaleDateString('ar-YE')}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            if (acc) setSelectedAccountId(acc.id);
                          }}
                          className="font-bold text-slate-800 hover:text-amber-600 flex items-center gap-1.5 cursor-pointer"
                        >
                          {acc && getAccountIcon(acc.type)}
                          <span>{acc?.name || 'حساب غير محدد'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {trx.description || 'بدون بيان'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
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
                          <span>{typeLabel}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold whitespace-nowrap text-sm">
                        <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                          {amt.toLocaleString()}{' '}
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
                              السابق: {rb.balanceBefore.toLocaleString()} ريال
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

        {/* Ledger Bottom Summary & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-2">
          <span>
            يتم تحديث قيود اليومية المحاسبية المزدوجة آلياً لكل حركة صادر ووارد
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToJournal}
              className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
            >
              عرض القيود اليومية العامة
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
