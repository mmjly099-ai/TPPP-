import React, { useState, useMemo } from 'react';
import {
  Wallet,
  CreditCard,
  Building2,
  Banknote,
  ArrowLeftRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Filter,
  Eye,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Account, FinancialTransaction } from '../types';
import { AccountOperationsModal } from './modals/AccountOperationsModal';
import { RecordAccountTransactionModal } from './modals/RecordAccountTransactionModal';

interface AccountsViewProps {
  onOpenTransfer: (fromAccountId?: number) => void;
  onOpenAddAccount: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  onOpenTransfer,
  onOpenAddAccount
}) => {
  const { accounts, transactions, getAccountBalance, totalCashAndBanks, runningBalancesMap } = useStore();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(2);
  const [modalAccount, setModalAccount] = useState<Account | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Ledger filters
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'IN' | 'OUT' | 'TRANSFER'>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Record Inflow/Outflow modal state
  const [recordModalConfig, setRecordModalConfig] = useState<{
    isOpen: boolean;
    type: 'deposit' | 'withdrawal';
    accountId?: number;
  }>({
    isOpen: false,
    type: 'deposit'
  });

  const handleOpenRecord = (type: 'deposit' | 'withdrawal', accountId?: number) => {
    setRecordModalConfig({
      isOpen: true,
      type,
      accountId
    });
  };

  const filteredAccounts = accounts.filter(a => {
    if (a.type === 'حقوق ملكية') return false; // Handled in Equity section
    if (typeFilter === 'ALL') return true;
    return a.type === typeFilter;
  });

  // Calculate overall inflow (وارد) and outflow (صادر) across all active financial accounts
  const overallCashflow = useMemo(() => {
    let grandIn = 0;
    let grandOut = 0;
    let inCount = 0;
    let outCount = 0;

    const activeAccountIds = new Set(
      accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => Number(a.id))
    );

    transactions.forEach(trx => {
      if (activeAccountIds.has(Number(trx.accountId))) {
        const amt = parseFloat(String(trx.amount || 0)) || 0;
        const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
        if (isIncome) {
          grandIn += amt;
          inCount += 1;
        } else {
          grandOut += amt;
          outCount += 1;
        }
      }
    });

    return {
      grandIn,
      grandOut,
      inCount,
      outCount,
      netFlow: grandIn - grandOut
    };
  }, [accounts, transactions]);

  // Per-account stats cache
  const accountStatsMap = useMemo(() => {
    const map: Record<number, { totalIn: number; totalOut: number; inCount: number; outCount: number }> = {};
    accounts.forEach(acc => {
      map[Number(acc.id)] = { totalIn: 0, totalOut: 0, inCount: 0, outCount: 0 };
    });

    transactions.forEach(trx => {
      const accId = Number(trx.accountId);
      if (map[accId]) {
        const amt = parseFloat(String(trx.amount || 0)) || 0;
        const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
        if (isIncome) {
          map[accId].totalIn += amt;
          map[accId].inCount += 1;
        } else {
          map[accId].totalOut += amt;
          map[accId].outCount += 1;
        }
      }
    });
    return map;
  }, [accounts, transactions]);

  const getAccountTypeIcon = (type: Account['type']) => {
    switch (type) {
      case 'محفظة':
        return <Wallet className="w-5 h-5 text-amber-600" />;
      case 'بطاقة':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      case 'بنكي':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'نقدي':
        return <Banknote className="w-5 h-5 text-emerald-600" />;
      default:
        return <Wallet className="w-5 h-5 text-slate-600" />;
    }
  };

  const selectedAccount = accounts.find(a => Number(a.id) === Number(selectedAccountId));

  // Selected account transactions & filtering
  const rawAccountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    return transactions
      .filter(t => Number(t.accountId) === Number(selectedAccountId))
      .sort((a, b) => new Date(b.createdAt || b.transactionDate).getTime() - new Date(a.createdAt || a.transactionDate).getTime());
  }, [transactions, selectedAccountId]);

  const filteredAccountTransactions = useMemo(() => {
    return rawAccountTransactions.filter(trx => {
      const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
      const isTransfer = trx.type === 'transfer_in' || trx.type === 'transfer_out';

      if (ledgerFilter === 'IN' && !isIncome) return false;
      if (ledgerFilter === 'OUT' && isIncome) return false;
      if (ledgerFilter === 'TRANSFER' && !isTransfer) return false;

      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const matchDesc = trx.description?.toLowerCase().includes(q);
        const matchNum = trx.transactionNumber?.toLowerCase().includes(q);
        const matchAmt = String(trx.amount).includes(q);
        return matchDesc || matchNum || matchAmt;
      }
      return true;
    });
  }, [rawAccountTransactions, ledgerFilter, ledgerSearch]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">الصناديق والمحافظ والحسابات البنكية</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
              وارد وصادر فوري
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة ومراقبة حركة السيولة، تسجيل سندات الوارد (الإيداعات) وسندات الصادر (السحوبات) والتحويلات
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Inflow (سند وارد) */}
          <button
            onClick={() => handleOpenRecord('deposit')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>سند وارد (إيداع +)</span>
          </button>

          {/* Quick Outflow (سند صادر) */}
          <button
            onClick={() => handleOpenRecord('withdrawal')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shadow-rose-600/20 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>سند صادر (سحب -)</span>
          </button>

          {/* Transfer between accounts */}
          <button
            onClick={() => onOpenTransfer()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>تحويل بين الحسابات</span>
          </button>

          {/* Add Account */}
          <button
            onClick={onOpenAddAccount}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حساب/محفظة</span>
          </button>
        </div>
      </div>

      {/* Global Liquidity & Inflow/Outflow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Liquidity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">إجمالي السيولة النقدية والمصرفية</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-slate-900">
                {totalCashAndBanks.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500">ريال</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              في {filteredAccounts.length} حسابات وصناديق نشطة
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Total Inflow (إجمالي الوارد) */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              إجمالي الوارد (المقبوضات)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-950">
                +{overallCashflow.grandIn.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-emerald-700">ريال</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-mono mt-1 block">
              {overallCashflow.inCount} عملية إيداع وقبض
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Outflow (إجمالي الصادر) */}
        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-800 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              إجمالي الصادر (المدفوعات)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-rose-950">
                -{overallCashflow.grandOut.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-rose-700">ريال</span>
            </div>
            <span className="text-[10px] text-rose-700 font-mono mt-1 block">
              {overallCashflow.outCount} عملية صرف وسحب
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Net Flow (صافي التدفق) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">صافي التدفق النقدي (Net Flow)</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-black font-mono ${
                overallCashflow.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {overallCashflow.netFlow >= 0 ? '+' : ''}{overallCashflow.netFlow.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-slate-500">ريال</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              فارق الوارد عن الصادر
            </span>
          </div>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
            overallCashflow.netFlow >= 0
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-rose-50 text-rose-600 border-rose-200'
          }`}>
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'محفظة', 'بطاقة', 'بنكي', 'نقدي'].map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              typeFilter === type
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {type === 'ALL' ? 'جميع الحسابات' : type}
          </button>
        ))}
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAccounts.map(account => {
          const balance = getAccountBalance(account.id);
          const isSelected = selectedAccountId === account.id;
          const stats = accountStatsMap[account.id] || { totalIn: 0, totalOut: 0, inCount: 0, outCount: 0 };

          return (
            <div
              key={account.id}
              onClick={() => setSelectedAccountId(account.id)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-2xs">
                    {getAccountTypeIcon(account.type)}
                  </div>
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {account.type}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-3">{account.name}</h3>
                
                {parseFloat(String(account.openingBalance || 0)) > 0 && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    الافتتاحي: {parseFloat(String(account.openingBalance)).toLocaleString()} ريال
                  </span>
                )}

                {/* Inflow vs Outflow Mini Badges for this account */}
                <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg px-2 py-1">
                    <span className="text-[9px] text-emerald-700 font-semibold block flex items-center gap-0.5">
                      <ArrowDownLeft className="w-2.5 h-2.5" />
                      وارد (+)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-900 block">
                      +{stats.totalIn.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-rose-50/60 border border-rose-100 rounded-lg px-2 py-1">
                    <span className="text-[9px] text-rose-700 font-semibold block flex items-center gap-0.5">
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      صادر (-)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-rose-900 block">
                      -{stats.totalOut.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance & Quick Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[10px] text-slate-400">الرصيد الفعلي الحالي</span>
                  <div className="text-base sm:text-lg font-black font-mono text-slate-900">
                    {balance.toLocaleString()} <span className="text-[10px] font-sans text-slate-500 font-normal">ريال</span>
                  </div>
                </div>

                {/* Direct Action Buttons on Card */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenRecord('deposit', account.id);
                    }}
                    className="py-1 px-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-[10px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    title="تسجيل سند وارد لهذا الحساب"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>وارد</span>
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenRecord('withdrawal', account.id);
                    }}
                    className="py-1 px-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white text-[10px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    title="تسجيل سند صادر من هذا الحساب"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>صادر</span>
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onOpenTransfer(account.id);
                    }}
                    className="py-1 px-1 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-600 text-[10px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    title="تحويل من هذا الحساب"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>تحويل</span>
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setModalAccount(account);
                    }}
                    className="py-1 px-1 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-600 text-[10px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    title="عرض كشف العمليات والتفاصيل"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>كشف</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Account Ledger & Transactions */}
      {selectedAccount && (() => {
        const stats = accountStatsMap[selectedAccount.id] || { totalIn: 0, totalOut: 0, inCount: 0, outCount: 0 };
        const currentBal = getAccountBalance(selectedAccount.id);

        return (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            
            {/* Ledger Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">
                    كشف حركات وعمليات: {selectedAccount.name}
                  </h3>
                  <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                    الرصيد: {currentBal.toLocaleString()} ريال
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  سجل وتفاصيل الصادر والوارد والإيداعات والسحوبات والتحويلات
                </p>
              </div>

              {/* Action Buttons for this selected account */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenRecord('deposit', selectedAccount.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>وارد له (+)</span>
                </button>

                <button
                  onClick={() => handleOpenRecord('withdrawal', selectedAccount.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>صادر منه (-)</span>
                </button>

                <button
                  onClick={() => onOpenTransfer(selectedAccount.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>تحويل منه</span>
                </button>
              </div>
            </div>

            {/* Inflow vs Outflow Mini Highlight for the selected account */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 font-semibold block">الرصيد الفعلي الحالي</span>
                <span className="text-lg font-black font-mono text-slate-900 block mt-1">
                  {currentBal.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span>
                </span>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
                  <span className="flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    إجمالي الوارد (مقبوضات/إيداعات)
                  </span>
                  <span className="font-mono bg-emerald-100 px-1.5 py-0.2 rounded font-bold text-[10px]">
                    {stats.inCount} حركة
                  </span>
                </div>
                <span className="text-lg font-black font-mono text-emerald-950 block mt-1">
                  +{stats.totalIn.toLocaleString()} <span className="text-xs font-normal text-emerald-700">ريال</span>
                </span>
              </div>
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-rose-800 font-semibold">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    إجمالي الصادر (مدفوعات/مصاريف)
                  </span>
                  <span className="font-mono bg-rose-100 px-1.5 py-0.2 rounded font-bold text-[10px]">
                    {stats.outCount} حركة
                  </span>
                </div>
                <span className="text-lg font-black font-mono text-rose-950 block mt-1">
                  -{stats.totalOut.toLocaleString()} <span className="text-xs font-normal text-rose-700">ريال</span>
                </span>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setLedgerFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    ledgerFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  جميع العمليات ({rawAccountTransactions.length})
                </button>
                <button
                  onClick={() => setLedgerFilter('IN')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    ledgerFilter === 'IN'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>الوارد فقط ({stats.inCount})</span>
                </button>
                <button
                  onClick={() => setLedgerFilter('OUT')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    ledgerFilter === 'OUT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>الصادر فقط ({stats.outCount})</span>
                </button>
                <button
                  onClick={() => setLedgerFilter('TRANSFER')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    ledgerFilter === 'TRANSFER'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>التحويلات</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  placeholder="بحث في البيان أو رقم السند..."
                  className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Transactions Table */}
            {filteredAccountTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لا توجد حركات مسجلة مطابقة لمعايير البحث في هذا الحساب.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">رقم الحركة / السند</th>
                      <th className="py-2.5 px-4">التاريخ</th>
                      <th className="py-2.5 px-4">البيان والتفاصيل</th>
                      <th className="py-2.5 px-4 text-center">نوع الحركة (صادر / وارد)</th>
                      <th className="py-2.5 px-4 text-left">المبلغ</th>
                      <th className="py-2.5 px-4 text-left">الرصيد التراكمي بعد الحركة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAccountTransactions.map(trx => {
                      const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
                      const amt = parseFloat(String(trx.amount || 0));
                      const rb = runningBalancesMap.get(trx.id);

                      let label = 'تسوية';
                      if (trx.type === 'payment') label = 'سند قبض وارد';
                      else if (trx.type === 'deposit') label = 'سند وارد (إيداع)';
                      else if (trx.type === 'transfer_in') label = 'تحويل وارد';
                      else if (trx.type === 'transfer_out') label = 'تحويل صادر';
                      else if (trx.type === 'expense') label = 'مصروف صادر';
                      else if (trx.type === 'withdrawal') label = 'سند صادر (سحب)';

                      return (
                        <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                            {trx.transactionNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {new Date(trx.transactionDate).toLocaleDateString('ar-YE')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">{trx.description}</span>
                            {trx.notes && (
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                ملاحظة: {trx.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[10px] ${
                                isIncome
                                  ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-100/70 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {isIncome ? (
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              )}
                              <span>{label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-bold whitespace-nowrap">
                            <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                              {isIncome ? '+' : '-'} {amt.toLocaleString()} ريال
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
              </div>
            )}
          </div>
        );
      })()}

      {/* Account Operations Modal */}
      {modalAccount && (
        <AccountOperationsModal
          account={modalAccount}
          onClose={() => setModalAccount(null)}
          onOpenTransfer={fromAccId => {
            setModalAccount(null);
            onOpenTransfer(fromAccId);
          }}
          onOpenRecord={(recType, accId) => {
            setModalAccount(null);
            handleOpenRecord(recType, accId);
          }}
        />
      )}

      {/* Record Inflow/Outflow Modal */}
      <RecordAccountTransactionModal
        isOpen={recordModalConfig.isOpen}
        onClose={() => setRecordModalConfig(prev => ({ ...prev, isOpen: false }))}
        initialType={recordModalConfig.type}
        initialAccountId={recordModalConfig.accountId}
      />

    </div>
  );
};
