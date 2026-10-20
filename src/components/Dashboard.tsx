import React from 'react';
import {
  Wallet,
  Users,
  Receipt,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChevronLeft,
  FileDown,
  Database,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { NavTab } from './Navigation';
import { DashboardCharts } from './DashboardCharts';
import { WalletsOperationsSection } from './WalletsOperationsSection';
import { AccountOperationsModal } from './modals/AccountOperationsModal';
import { RecordAccountTransactionModal } from './modals/RecordAccountTransactionModal';
import { Account } from '../types';
import { sortTransactionsChronologicalDesc } from '../utils/runningBalance';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenTransfer: (fromAccountId?: number) => void;
  onOpenNewOrder: () => void;
  onOpenPayment: () => void;
  onOpenBackup?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenTransfer,
  onOpenNewOrder,
  onOpenPayment,
  onOpenBackup
}) => {
  const {
    accounts,
    customers,
    orders,
    expenses,
    transactions,
    totalCashAndBanks,
    totalCustomerDebts,
    totalReceivables,
    totalExpenses,
    getAccountBalance,
    getCustomerBalance,
    downloadBackupFile
  } = useStore();

  const [downloadSuccessMsg, setDownloadSuccessMsg] = React.useState<string | null>(null);
  const [selectedAccountForModal, setSelectedAccountForModal] = React.useState<Account | null>(null);

  const [recordModalConfig, setRecordModalConfig] = React.useState<{
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

  const handleQuickDownload = () => {
    const res = downloadBackupFile();
    setDownloadSuccessMsg(`تم تنزيل ${res.filename} (${res.sizeKb} ك.ب)`);
    setTimeout(() => setDownloadSuccessMsg(null), 4000);
  };

  // Active wallets/accounts sorted by highest balance
  const activeAccounts = accounts
    .filter(a => a.status === 'active' && a.type !== 'حقوق ملكية')
    .map(a => ({ ...a, currentBalance: getAccountBalance(a.id) }))
    .sort((a, b) => b.currentBalance - a.currentBalance);

  // Customers with pending balance
  const debtors = customers
    .map(c => ({ ...c, debt: getCustomerBalance(c.id) }))
    .filter(c => c.debt > 0)
    .sort((a, b) => b.debt - a.debt);

  // Recent 6 transactions (chronologically descending)
  const recentTransactions = sortTransactionsChronologicalDesc(transactions).slice(0, 6);

  return (
    <div className="space-y-6">
      
      {/* Analytics Center Quick Launch Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                مركز التحليلات الشامل لكافة قطاعات النظام
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.2 rounded font-mono font-bold">
                تحليل 360°
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              استكشف مسار الأرباح التقديرية، توزيع السيولة، كفاءة الشحن والتسويق، ومؤشر صحة المتجر
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('analytics')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          <span>فتح مركز التحليلات</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Top Welcome & KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Cash & Wallets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الخزينة والمحافظ</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {totalCashAndBanks.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500 mr-1.5">ريال يمني</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>{activeAccounts.length} محافظ وبنوك نشطة</span>
            <button
              onClick={() => onNavigate('accounts')}
              className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-0.5 cursor-pointer"
            >
              عرض الكل <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Customer Receivables / Debts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">مديونيات العملاء</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-700 tracking-tight font-mono">
              {totalCustomerDebts.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500 mr-1.5">ريال</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>{debtors.length} عميل عليهم مبالغ مستحقة</span>
            <button
              onClick={() => onNavigate('customers')}
              className="text-amber-700 hover:text-amber-800 font-medium flex items-center gap-0.5 cursor-pointer"
            >
              تفاصيل <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Other Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ذمم مدينة أخرى (مندوبين/سلف)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-700 tracking-tight font-mono">
              {totalReceivables.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500 mr-1.5">ريال</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>أحمد تمام، هلال، سلفيات</span>
            <button
              onClick={() => onNavigate('receivables')}
              className="text-blue-700 hover:text-blue-800 font-medium flex items-center gap-0.5 cursor-pointer"
            >
              مطابقة <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي المصاريف والتشغيل</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-700 tracking-tight font-mono">
              {totalExpenses.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-500 mr-1.5">ريال</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>{expenses.length} مصاريف مسجلة</span>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-rose-700 hover:text-rose-800 font-medium flex items-center gap-0.5 cursor-pointer"
            >
              تقرير <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
      
      {/* Recharts Analytics: Current vs Previous Month Sales & Completed vs Pending Orders */}
      <DashboardCharts
        orders={orders}
        onNavigateToOrders={() => onNavigate('orders')}
      />

      {/* Wallets & Banks Inflow/Outflow Operations Section (الصادر والوارد وعمليات كل محفظة وبنك) */}
      <WalletsOperationsSection
        onOpenTransfer={onOpenTransfer}
        onOpenRecord={handleOpenRecord}
        onViewAccountDetails={acc => setSelectedAccountForModal(acc)}
        onNavigateToAccounts={() => onNavigate('accounts')}
        onNavigateToJournal={() => onNavigate('journal')}
      />

      {/* Two Column Layout: Recent Transactions + Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">آخر الحركات المالية والقيود</h2>
              <p className="text-xs text-slate-500">حركات الإيداع، السحب، وسندات القبض ومصاريف التشغيل</p>
            </div>
            <button
              onClick={() => onNavigate('journal')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              عرض القيود اليومية
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTransactions.map(trx => {
              const acc = accounts.find(a => a.id === trx.accountId);
              const isIncome = trx.type === 'deposit' || trx.type === 'transfer_in' || trx.type === 'payment';
              const amt = parseFloat(String(trx.amount || 0));

              return (
                <div key={`dash-trx-${trx.id}-${trx.transactionNumber || ''}`} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{trx.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <span>{acc?.name || 'حساب'}</span>
                        <span>•</span>
                        <span>{new Date(trx.transactionDate).toLocaleDateString('ar-YE')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span
                      className={`font-black font-mono text-sm ${
                        isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIncome ? `+${Math.abs(amt).toLocaleString()}` : Math.abs(amt).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">ريال</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Debtors & Quick Actions */}
        <div className="space-y-6">
          
          {/* Top Debtors Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">أعلى العملاء مديونية</h2>
                <p className="text-xs text-slate-500">مبالغ مستحقة من طلبات وأرصدة سابقة</p>
              </div>
              <button
                onClick={() => onNavigate('customers')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                الكل ({debtors.length})
              </button>
            </div>

            {debtors.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                لا توجد أي مديونيات متأخرة على العملاء!
              </div>
            ) : (
              <div className="space-y-3">
                {debtors.slice(0, 5).map(cust => (
                  <div
                    key={cust.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          {cust.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{cust.name}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{cust.phone}</span>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-black font-mono text-amber-700 block">
                        {cust.debt.toLocaleString()} ريال
                      </span>
                      <button
                        onClick={onOpenPayment}
                        className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        سند قبض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-1">خدمات توب ستور السريعة</h3>
            <p className="text-xs text-slate-300 mb-4">
              وسيط الشراء المباشر من المواقع العالمية: شي إن SHEIN وعلي إكسبرس AliExpress
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={onOpenNewOrder}
                className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>إضافة طلبية</span>
              </button>
              <button
                onClick={onOpenPayment}
                className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تحصيل دفعة</span>
              </button>
              <button
                onClick={() => onNavigate('purchase-batches')}
                className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer col-span-1 sm:col-span-1 shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                <span>المشتريات والدفع بالفيزا</span>
              </button>
            </div>
          </div>

          {/* Data Backup & Export Card */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold text-amber-950">حفظ وتصدير البيانات</h3>
              </div>
              <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-md">
                JSON Backup
              </span>
            </div>
            <p className="text-xs text-amber-800 mb-3">
              قم بتنزيل نسخة احتياطية محلية متكاملة لجميع العملاء ({customers.length})، الطلبيات ({orders.length})، والحسابات والمحافظ ({accounts.length}) لحمايتها على جهازك.
            </p>
            {downloadSuccessMsg && (
              <div className="mb-3 p-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{downloadSuccessMsg}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickDownload}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>تنزيل النسخة الاحتياطية الآن</span>
              </button>
              {onOpenBackup && (
                <button
                  onClick={onOpenBackup}
                  className="px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="عرض تفاصيل النسخة الاحتياطية"
                >
                  تفاصيل
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
      
      {/* Account Operations Modal (عرض كشف عمليات كل محفظة وبنك مع الصادر والوارد) */}
      {selectedAccountForModal && (
        <AccountOperationsModal
          account={selectedAccountForModal}
          onClose={() => setSelectedAccountForModal(null)}
          onOpenTransfer={fromAccId => {
            setSelectedAccountForModal(null);
            onOpenTransfer(fromAccId);
          }}
          onOpenRecord={(recType, accId) => {
            setSelectedAccountForModal(null);
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
