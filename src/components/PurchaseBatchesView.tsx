import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  ShoppingBag,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  Search,
  Filter,
  Trash2,
  X,
  AlertTriangle,
  Receipt,
  User,
  Hash,
  Share2,
  Printer,
  Edit2,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Percent,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PurchaseBatch, Order, Account } from '../types';

export const PurchaseBatchesView: React.FC = () => {
  const {
    purchaseBatches,
    orders,
    accounts,
    getAccountBalance,
    addPurchaseBatch,
    updatePurchaseBatch,
    cancelPurchaseBatch,
    deletePurchaseBatch
  } = useStore();

  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PurchaseBatch | null>(null);
  const [editingBatch, setEditingBatch] = useState<PurchaseBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<PurchaseBatch | null>(null);
  const [completedBatchSummary, setCompletedBatchSummary] = useState<{
    source: string;
    ordersCount: number;
    ordersSellingTotal: number;
    purchaseCost: number;
    transferFees: number;
    purchaseFees: number;
    exchangeRateDiff: number;
    fees: number;
    totalCost: number;
    netProfit: number;
    margin: number;
    paymentMode?: 'single' | 'split';
    accountName?: string;
    card1Amount?: number;
    accountName2?: string | null;
    card2Amount?: number;
  } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'SHEIN' | 'AliExpress' | 'Other'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');

  // Overall Statistics including Profit Calculation
  const stats = useMemo(() => {
    const activeBatches = purchaseBatches.filter(b => b.status !== 'cancelled');
    const totalSpent = activeBatches.reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);
    const totalFees = activeBatches.reduce((sum, b) => sum + ((Number(b.purchaseFees) || 0) + (Number(b.transferFees) || 0) + (Number(b.exchangeRateDiff) || 0)), 0);
    const totalOrdersCovered = activeBatches.reduce((sum, b) => sum + ((b.orderIds || []).length), 0);

    const totalOrdersSelling = activeBatches.reduce((sum, b) => {
      const bOrderIds = b.orderIds || [];
      return sum + orders
        .filter(o => bOrderIds.includes(o.id))
        .reduce((oSum, o) => oSum + (Number(o.totalAmount) || 0), 0);
    }, 0);

    const totalNetProfit = totalOrdersSelling - totalSpent;
    const profitMargin = totalOrdersSelling > 0 ? (totalNetProfit / totalOrdersSelling) * 100 : 0;

    return {
      batchesCount: activeBatches.length,
      totalSpent,
      totalFees,
      totalOrdersCovered,
      totalOrdersSelling,
      totalNetProfit,
      profitMargin
    };
  }, [purchaseBatches, orders]);

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return purchaseBatches.filter(b => {
      // Source filter
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'Other') {
          if (b.source === 'SHEIN' || b.source === 'شي ان' || b.source === 'AliExpress' || b.source === 'علي اكسبرس') {
            return false;
          }
        } else if (sourceFilter === 'SHEIN') {
          if (b.source !== 'SHEIN' && b.source !== 'شي ان' && b.source !== 'شي إن') return false;
        } else if (sourceFilter === 'AliExpress') {
          if (b.source !== 'AliExpress' && b.source !== 'علي اكسبرس' && b.source !== 'علي إكسبرس') return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isCancelled = b.status === 'cancelled';
        if (statusFilter === 'active' && isCancelled) return false;
        if (statusFilter === 'cancelled' && !isCancelled) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBatch = (b.batchNumber || '').toLowerCase().includes(q);
        const matchSupplier = (b.supplierOrderNumber || '').toLowerCase().includes(q);
        const matchSource = (b.source || '').toLowerCase().includes(q);
        const matchAccount = (b.accountName || '').toLowerCase().includes(q);
        return matchBatch || matchSupplier || matchSource || matchAccount;
      }

      return true;
    });
  }, [purchaseBatches, sourceFilter, statusFilter, searchQuery]);

  const handleOpenNewBatch = () => {
    setIsNewBatchOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 rounded-2xl text-white p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300 mb-2">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>قسم المشتريات والدفع بالفيزا</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">المشتريات ودفعات الشراء (شي إن / علي إكسبرس)</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              تجميع طلبيات العملاء والشراء من المواقع، مع خيار الدفع الكامل من فيزا واحدة أو الدفع المجزأ من فيزتين (بنك التضامن وبنك التجاري) وتوزيع السحب تلقائياً مع احتساب الأرباح اللحظية.
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>دفع من فيزا واحدة</span>
              </span>
              <span className="bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>دفع مجزأ من فيزتين (تضامن + تجاري) مع تحديد كم سحبت من كل فيزا</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenNewBatch}
            className="inline-flex items-center gap-2 px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition-all cursor-pointer text-xs sm:text-sm shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>تسجيل عملية شراء جديدة (دفع بالفيزا)</span>
          </button>
        </div>
      </div>

      {/* Visa Cards Live Balance Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30 shrink-0">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>أرصدة بطاقات الفيزا المعتمدة للشراء الدولي (شي إن وعلي إكسبرس)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  سحب مباشر فوري
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                تخصم تكلفة الشراء من رصيد الفيزا المختارة فور تسجيل الدفعة بدقة محاسبية متكاملة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
            {/* Tadhamon Visa */}
            <div className="p-2.5 px-3.5 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 ring-2 ring-indigo-400/40"></span>
                <div>
                  <span className="text-[11px] text-indigo-200 font-bold block">فيزا كارد بنك التضامن</span>
                  <span className="text-[10px] text-slate-400 font-mono">حساب #1</span>
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="text-sm sm:text-base font-black text-white block">
                  {getAccountBalance(1).toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-300">YER</span>
              </div>
            </div>

            {/* Commercial Visa */}
            <div className="p-2.5 px-3.5 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-2 ring-teal-400/40"></span>
                <div>
                  <span className="text-[11px] text-teal-200 font-bold block">فيزا كارد بنك التجاري</span>
                  <span className="text-[10px] text-slate-400 font-mono">حساب #120002</span>
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="text-sm sm:text-base font-black text-emerald-300 block">
                  {getAccountBalance(120002).toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-300">YER</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats with Profit Metric */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">دفعات الشراء</span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.batchesCount}
          </div>
          <span className="text-[11px] text-slate-400">دفعة شراء نشطة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">الطلبات المشمولة</span>
          <div className="text-2xl font-black text-indigo-700 font-mono">
            {stats.totalOrdersCovered}
          </div>
          <span className="text-[11px] text-slate-400">طلب تم شراؤه</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">مبيعات الطلبيات</span>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
            {stats.totalOrdersSelling.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-slate-400">قيمة البيع للعملاء</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">تكلفة الشراء والرسوم</span>
          <div className="text-lg sm:text-xl font-black text-slate-700 font-mono">
            {stats.totalSpent.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-slate-400">رسوم: {stats.totalFees.toLocaleString()} YER</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs text-emerald-800 font-bold flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            صافي أرباح المشتريات
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
            {stats.totalNetProfit >= 0 ? '+' : ''}{stats.totalNetProfit.toLocaleString()} <span className="text-[10px] font-normal text-emerald-600">YER</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-800">
            هامش ربح {stats.profitMargin.toFixed(1)}%
          </span>
        </div>

      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الدفعة أو المورد أو الحساب..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                sourceFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSourceFilter('SHEIN')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                sourceFilter === 'SHEIN' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              شي إن
            </button>
            <button
              onClick={() => setSourceFilter('AliExpress')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                sourceFilter === 'AliExpress' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              علي إكسبرس
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold focus:outline-amber-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">النشطة فقط</option>
            <option value="cancelled">الملغاة</option>
          </select>
        </div>

      </div>

      {/* Batches List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">سجل دفعات الشراء الجماعية</h2>
          </div>
          <span className="text-xs text-slate-500">
            {filteredBatches.length} من أصل {purchaseBatches.length} دفعة
          </span>
        </div>

        {filteredBatches.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-slate-600 font-bold text-sm">لا توجد دفعات شراء مطابقة للشروط المحددة.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              يمكنك تسجيل دفعة شراء جماعية جديدة بالضغط على الزر أعلاه لتسجيل مشتريات شي إن وعلي إكسبرس بضغطة واحدة.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBatches.map(batch => {
              const orderIdList = batch.orderIds || [];
              const batchOrders = orders.filter(o => orderIdList.includes(o.id));
              const isCancelled = batch.status === 'cancelled';
              const batchOrdersSellingTotal = batchOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
              const batchTotalCost = Number(batch.totalCost) || 0;
              const batchNetProfit = batchOrdersSellingTotal - batchTotalCost;
              const batchMargin = batchOrdersSellingTotal > 0 ? (batchNetProfit / batchOrdersSellingTotal) * 100 : 0;
              const avgProfitPerOrder = batchOrders.length > 0 ? Math.round(batchNetProfit / batchOrders.length) : 0;

              return (
                <div
                  key={batch.id}
                  className={`p-4 transition-colors space-y-3 ${
                    isCancelled ? 'bg-slate-50/60 opacity-75' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="font-mono font-black text-xs px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200 shrink-0">
                        {batch.batchNumber}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">شراء مجمع من {batch.source}</span>
                          {isCancelled && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                              ملغى
                            </span>
                          )}
                          {batch.supplierOrderNumber && (
                            <span className="text-xs text-slate-600 font-mono bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                              رقم المورد: {batch.supplierOrderNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <span>تاريخ الشراء: <strong className="font-mono text-slate-700">{batch.purchaseDate}</strong></span>
                          <span>•</span>
                          {batch.paymentMode === 'split' && batch.accountId2 ? (
                            <span className="inline-flex items-center gap-1.5 text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-lg font-medium border border-indigo-200 shadow-2xs">
                              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="font-bold">سحب مجزأ من فيزتين:</span>
                              <span className="font-mono font-bold text-indigo-950">{batch.accountName} ({(Number(batch.card1Amount) || 0).toLocaleString()} YER)</span>
                              <span className="text-indigo-400 font-bold">+</span>
                              <span className="font-mono font-bold text-teal-950">{batch.accountName2 || 'فيزا 2'} ({(Number(batch.card2Amount) || 0).toLocaleString()} YER)</span>
                            </span>
                          ) : (
                            <span>الحساب المسحوب منه: <strong className="text-slate-800 font-bold">{batch.accountName}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left flex items-center sm:flex-col sm:items-end justify-between gap-1">
                      <div className="text-base font-black text-slate-900 font-mono">
                        {(batch.totalCost || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">YER</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-end gap-1 font-mono">
                        <span>صافي شراء: {(Number(batch.purchaseCost) || 0).toLocaleString()}</span>
                        <span>+</span>
                        <span>عمولات تحويل: {(Number(batch.transferFees) || 0).toLocaleString()}</span>
                        <span>+</span>
                        <span>رسوم: {(Number(batch.purchaseFees) || 0).toLocaleString()}</span>
                        {Number(batch.exchangeRateDiff || 0) > 0 && (
                          <>
                            <span>+</span>
                            <span>فروق صرف: {(Number(batch.exchangeRateDiff) || 0).toLocaleString()}</span>
                          </>
                        )}
                        <span>YER</span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Batch Profit Breakdown Ribbon */}
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCancelled
                      ? 'bg-slate-100/70 border-slate-200 text-slate-500'
                      : batchNetProfit >= 0
                        ? 'bg-gradient-to-l from-emerald-50 via-teal-50/20 to-white border-emerald-200 shadow-2xs'
                        : 'bg-gradient-to-l from-rose-50 via-red-50/20 to-white border-rose-200 shadow-2xs'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCancelled
                          ? 'bg-slate-200 text-slate-600'
                          : batchNetProfit >= 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}>
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                          <span>صافي ربح هذه العملية:</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (قيمة الطلبيات: {batchOrdersSellingTotal.toLocaleString()} - التكلفة: {batchTotalCost.toLocaleString()})
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className={`font-mono font-black text-base ${
                            isCancelled
                              ? 'text-slate-600 line-through'
                              : batchNetProfit >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                          }`}>
                            {batchNetProfit >= 0 ? '+' : ''}{batchNetProfit.toLocaleString()} YER
                          </span>
                          {!isCancelled && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              batchNetProfit >= 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              هامش {batchMargin.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:border-r sm:border-slate-200/80 sm:pr-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">متوسط ربح الطلب:</span>
                        <span className={`font-mono font-bold text-xs ${batchNetProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                          ~{avgProfitPerOrder.toLocaleString()} YER
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">إجمالي مبيعات الطلبيات:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {batchOrdersSellingTotal.toLocaleString()} YER
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Orders in this batch */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                    <div className="text-[11px] font-bold text-slate-500 mb-2 flex flex-wrap items-center justify-between gap-1">
                      <span>الطلبات المتضمنة في هذه الدفعة ({batchOrders.length} طلبات):</span>
                      <span className="text-[10px] text-slate-400">
                        تكلفة الشراء المقدرة للطلب: ~{orderIdList.length > 0 ? Math.round((batch.purchaseCost || 0) / orderIdList.length).toLocaleString() : 0} YER
                      </span>
                    </div>

                    {batchOrders.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">لا توجد طلبات مرتبطة بالدفعة حالياً</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {batchOrders.map(o => (
                          <span
                            key={o.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 shadow-2xs"
                          >
                            <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                            <span className="text-slate-400">|</span>
                            <span className="font-medium text-slate-600">{o.customerName}</span>
                            <span className="text-slate-400">|</span>
                            <span className="font-mono font-bold text-emerald-700">{(o.totalAmount || 0).toLocaleString()} YER</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions & Notes Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      {batch.notes ? (
                        <span className="italic">ملاحظات: {batch.notes}</span>
                      ) : (
                        <span className="text-slate-400">لا توجد ملاحظات إضافية</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setSelectedBatch(batch)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        title="عرض تفاصيل الدفعة والطلبات"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>التفاصيل</span>
                      </button>

                      <button
                        onClick={() => setEditingBatch(batch)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-amber-200"
                        title="تعديل بيانات عملية الشراء"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      {!isCancelled && (
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من إلغاء دفعة الشراء ${batch.batchNumber}؟ سيتم استرجاع الرصيد وإعادة الطلبات لحالة قيد التنفيذ.`)) {
                              cancelPurchaseBatch(batch.id);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          title="إلغاء دفعة الشراء"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>إلغاء</span>
                        </button>
                      )}

                      <button
                        onClick={() => setDeletingBatch(batch)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="حذف عملية الشراء نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Batch Details View */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs" dir="rtl">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    تفاصيل دفعة الشراء {selectedBatch.batchNumber}
                  </h3>
                  <span className="text-xs text-slate-500">
                    مصدر الشراء: {selectedBatch.source} • تاريخ: {selectedBatch.purchaseDate}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial & Profit Summary */}
            {(() => {
              const selBatchOrders = orders.filter(o => (selectedBatch.orderIds || []).includes(o.id));
              const selBatchOrdersSelling = selBatchOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
              const selBatchTotalCost = Number(selectedBatch.totalCost) || 0;
              const selBatchNetProfit = selBatchOrdersSelling - selBatchTotalCost;
              const selBatchMargin = selBatchOrdersSelling > 0 ? (selBatchNetProfit / selBatchOrdersSelling) * 100 : 0;
              const selBatchPerOrderCost = selBatchOrders.length > 0 ? Math.round(selBatchTotalCost / selBatchOrders.length) : 0;

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5 text-[11px]">مبيعات الطلبات (مع الخصم)</span>
                      <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                        {selBatchOrdersSelling.toLocaleString()} YER
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5 text-[11px]">تكلفة الشراء الصافية</span>
                      <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                        {(Number(selectedBatch.purchaseCost) || 0).toLocaleString()} YER
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5 text-[11px]">عمولات التحويل البنكي</span>
                      <span className="font-mono font-black text-amber-800 text-xs sm:text-sm">
                        {(Number(selectedBatch.transferFees) || 0).toLocaleString()} YER
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5 text-[11px]">رسوم الشراء والدفع</span>
                      <span className="font-mono font-black text-amber-800 text-xs sm:text-sm">
                        {(Number(selectedBatch.purchaseFees) || 0).toLocaleString()} YER
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block mb-0.5 text-[11px]">فروق الصرف</span>
                      <span className="font-mono font-black text-amber-800 text-xs sm:text-sm">
                        {(Number(selectedBatch.exchangeRateDiff) || 0).toLocaleString()} YER
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-amber-900 block mb-0.5 text-[11px] font-bold">إجمالي المبلغ المسحوب</span>
                      <span className="font-mono font-black text-amber-950 text-xs sm:text-sm">
                        {selBatchTotalCost.toLocaleString()} YER
                      </span>
                    </div>
                  </div>

                  {/* Net Profit Card */}
                  <div className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selBatchNetProfit >= 0
                      ? 'bg-gradient-to-l from-emerald-50 via-teal-50/20 to-white border-emerald-300'
                      : 'bg-gradient-to-l from-rose-50 via-red-50/20 to-white border-rose-300'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        selBatchNetProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 font-bold block">
                          صافي ربح هذه العملية بالكامل:
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className={`font-mono font-black text-base ${
                            selBatchNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {selBatchNetProfit >= 0 ? '+' : ''}{selBatchNetProfit.toLocaleString()} YER
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            selBatchNetProfit >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            هامش {selBatchMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-400 block">متوسط ربح الطلب الواحد:</span>
                      <span className={`text-xs font-bold ${selBatchNetProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                        ~{Math.round(selBatchNetProfit / (selBatchOrders.length || 1)).toLocaleString()} YER
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-600 font-bold">طريقة وقناة الدفع والسحب:</span>
                        {selectedBatch.paymentMode === 'split' && selectedBatch.accountId2 ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                            تجزئة الدفع بين فيزتين
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                            فيزا واحدة
                          </span>
                        )}
                      </div>
                      {selectedBatch.supplierOrderNumber && (
                        <div>
                          <span className="text-slate-500">رقم طلب المورد: </span>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {selectedBatch.supplierOrderNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedBatch.paymentMode === 'split' && selectedBatch.accountId2 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                        <div className="p-2.5 bg-white rounded-lg border border-indigo-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block">الفيزا الأولى:</span>
                            <span className="font-bold text-slate-800">{selectedBatch.accountName}</span>
                          </div>
                          <span className="font-mono font-black text-indigo-700 text-xs sm:text-sm">
                            {(Number(selectedBatch.card1Amount) || 0).toLocaleString()} YER
                          </span>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-teal-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block">الفيزا الثانية:</span>
                            <span className="font-bold text-slate-800">{selectedBatch.accountName2 || 'الفيزا الثانية'}</span>
                          </div>
                          <span className="font-mono font-black text-teal-700 text-xs sm:text-sm">
                            {(Number(selectedBatch.card2Amount) || 0).toLocaleString()} YER
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-slate-500">الحساب المسحوب منه كامل المبلغ: </span>
                        <span className="font-bold text-slate-900">{selectedBatch.accountName}</span>
                        <span className="font-mono text-slate-600 mr-1">({(Number(selectedBatch.totalCost) || 0).toLocaleString()} YER)</span>
                      </div>
                    )}
                  </div>

                  {/* Orders Included with individual profit breakdown */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 mb-2">
                      الطلبيات المشمولة في هذه الدفعة ({selBatchOrders.length} طلبات):
                    </h4>
                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                      {selBatchOrders.map(ord => {
                        const ordSelling = Number(ord.totalAmount) || 0;
                        const ordProfit = ordSelling - selBatchPerOrderCost;

                        return (
                          <div key={ord.id} className="p-3 flex items-center justify-between hover:bg-slate-50 gap-2">
                            <div>
                              <div className="font-bold text-slate-900">
                                {ord.orderNumber} • {ord.customerName}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {ord.itemsDescription || 'طلبية ملابس ومنتجات'}
                              </div>
                            </div>
                            <div className="text-left font-mono shrink-0">
                              <div className="font-bold text-slate-900">
                                {ordSelling.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">بيع</span>
                              </div>
                              <div className={`text-[11px] font-bold ${ordProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {ordProfit >= 0 ? '+' : ''}{ordProfit.toLocaleString()} YER ربح
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {selectedBatch.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">ملاحظات:</span>
                <p className="text-slate-600">{selectedBatch.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const b = selectedBatch;
                    setSelectedBatch(null);
                    setEditingBatch(b);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل هذه الدفعة</span>
                </button>
                <button
                  onClick={() => {
                    const b = selectedBatch;
                    setSelectedBatch(null);
                    setDeletingBatch(b);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedBatch(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Purchase Batch (تسجيل دفعة شراء جديدة) */}
      {isNewBatchOpen && (
        <NewPurchaseBatchModal
          orders={orders}
          accounts={accounts}
          onClose={() => setIsNewBatchOpen(false)}
          onSubmit={batchData => {
            const selectedOrders = orders.filter(o => batchData.orderIds.includes(o.id));
            const selling = selectedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
            const pCost = Number(batchData.purchaseCost) || 0;
            const tFees = Number(batchData.transferFees) || 0;
            const pFees = Number(batchData.purchaseFees) || 0;
            const fxDiff = Number(batchData.exchangeRateDiff) || 0;
            const totalSpent = pCost + tFees + pFees + fxDiff;
            const profit = selling - totalSpent;
            const margin = selling > 0 ? (profit / selling) * 100 : 0;

            const isSplit = batchData.paymentMode === 'split' && Boolean(batchData.accountId2);
            const acc1 = accounts.find(a => a.id === batchData.accountId);
            const acc2 = isSplit && batchData.accountId2 ? accounts.find(a => a.id === batchData.accountId2) : undefined;

            addPurchaseBatch(batchData);
            setIsNewBatchOpen(false);

            setCompletedBatchSummary({
              source: batchData.source,
              ordersCount: batchData.orderIds.length,
              ordersSellingTotal: selling,
              purchaseCost: pCost,
              transferFees: tFees,
              purchaseFees: pFees,
              exchangeRateDiff: fxDiff,
              fees: tFees + pFees + fxDiff,
              totalCost: totalSpent,
              netProfit: profit,
              margin,
              paymentMode: batchData.paymentMode,
              accountName: acc1?.name,
              card1Amount: batchData.card1Amount,
              accountName2: acc2?.name,
              card2Amount: batchData.card2Amount
            });
          }}
        />
      )}

      {/* Modal: Post-Purchase Profit Summary Dialog (ملخص ربح العملية الفوري) */}
      {completedBatchSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              completedBatchSummary.netProfit >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <TrendingUp className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                تم تسجيل عملية الشراء بنجاح!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ملخص أرباح العملية المجمعة من {completedBatchSummary.source}
              </p>
            </div>

            {/* Big Profit Highlight */}
            <div className={`p-4 rounded-xl border ${
              completedBatchSummary.netProfit >= 0
                ? 'bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-emerald-300'
                : 'bg-gradient-to-br from-rose-50 via-red-50/40 to-white border-rose-300'
            }`}>
              <span className="text-xs text-slate-500 font-bold block mb-1">صافي الربح المحقق من هذه العملية:</span>
              <div className={`text-2xl sm:text-3xl font-black font-mono ${
                completedBatchSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {completedBatchSummary.netProfit >= 0 ? '+' : ''}{completedBatchSummary.netProfit.toLocaleString()} YER
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  completedBatchSummary.netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  هامش ربح {completedBatchSummary.margin.toFixed(1)}%
                </span>
                <span className="text-[11px] text-slate-500 font-bold">
                  ({completedBatchSummary.ordersCount} طلبات مشمولة)
                </span>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-right">
              <div className="flex justify-between text-slate-700">
                <span>إجمالي مبيعات الطلبات للعملاء (المسجلة مع الخصم):</span>
                <strong className="font-mono text-slate-900">{completedBatchSummary.ordersSellingTotal.toLocaleString()} YER</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>تكلفة الشراء الصافية بالموقع:</span>
                <strong className="font-mono text-slate-900">{completedBatchSummary.purchaseCost.toLocaleString()} YER</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>عمولات التحويل البنكي:</span>
                <strong className="font-mono text-amber-800">{completedBatchSummary.transferFees.toLocaleString()} YER</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>رسوم الشراء وبطاقات الدفع:</span>
                <strong className="font-mono text-amber-800">{completedBatchSummary.purchaseFees.toLocaleString()} YER</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>فروق الصرف:</span>
                <strong className="font-mono text-amber-800">{completedBatchSummary.exchangeRateDiff.toLocaleString()} YER</strong>
              </div>
              <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-200">
                <span>إجمالي المبلغ المسحوب الكلي:</span>
                <strong className="font-mono text-slate-900">{completedBatchSummary.totalCost.toLocaleString()} YER</strong>
              </div>

              {/* Visa Withdrawal Details */}
              {completedBatchSummary.paymentMode === 'split' && completedBatchSummary.accountName2 ? (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5 text-right text-xs space-y-1.5 mt-2">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تم السحب مجزأ من فيزتين بنجاح:</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-mono text-[11px] pr-2">
                    <span>• {completedBatchSummary.accountName || 'الفيزا الأولى'}:</span>
                    <strong className="text-indigo-950 font-bold">{(completedBatchSummary.card1Amount || 0).toLocaleString()} YER</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 font-mono text-[11px] pr-2">
                    <span>• {completedBatchSummary.accountName2 || 'الفيزا الثانية'}:</span>
                    <strong className="text-teal-950 font-bold">{(completedBatchSummary.card2Amount || 0).toLocaleString()} YER</strong>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-2 text-right text-[11px] flex justify-between items-center">
                  <span className="text-slate-600">تم السحب بالكامل من:</span>
                  <strong className="text-slate-900 font-bold">{completedBatchSummary.accountName || 'البطاقة / الحساب'}</strong>
                </div>
              )}

              <div className="flex justify-between text-indigo-700 font-bold pt-1">
                <span>متوسط ربح الطلب الواحد:</span>
                <strong className="font-mono">
                  ~{completedBatchSummary.ordersCount > 0 ? Math.round(completedBatchSummary.netProfit / completedBatchSummary.ordersCount).toLocaleString() : 0} YER
                </strong>
              </div>
            </div>

            <button
              onClick={() => setCompletedBatchSummary(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              تم ومتابعة دفعات الشراء
            </button>
          </div>
        </div>
      )}

      {/* Modal: Edit Purchase Batch */}
      {editingBatch && (
        <EditPurchaseBatchModal
          batch={editingBatch}
          orders={orders}
          accounts={accounts}
          onClose={() => setEditingBatch(null)}
          onSave={updatedData => {
            updatePurchaseBatch(editingBatch.id, updatedData);
            setEditingBatch(null);
          }}
        />
      )}

      {/* Modal: Cascading Delete Purchase Batch Confirmation */}
      {deletingBatch && (
        <DeletePurchaseBatchModal
          batch={deletingBatch}
          orders={orders}
          onClose={() => setDeletingBatch(null)}
          onConfirm={() => {
            deletePurchaseBatch(deletingBatch.id);
            setDeletingBatch(null);
          }}
        />
      )}

    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: NEW PURCHASE BATCH MODAL (تسجيل دفعة شراء جماعية جديدة)
// =====================================================================
interface NewPurchaseBatchModalProps {
  orders: Order[];
  accounts: Account[];
  onClose: () => void;
  onSubmit: (batchData: {
    source: string;
    supplierOrderNumber?: string;
    paymentMode?: 'single' | 'split';
    accountId: number;
    card1Amount?: number;
    accountId2?: number | null;
    card2Amount?: number;
    purchaseCost: number;
    purchaseFees: number;
    transferFees: number;
    exchangeRateDiff?: number;
    orderIds: number[];
    notes?: string;
  }) => void;
}

const NewPurchaseBatchModal: React.FC<NewPurchaseBatchModalProps> = ({
  orders,
  accounts,
  onClose,
  onSubmit
}) => {
  const { getAccountBalance } = useStore();
  const [source, setSource] = useState('SHEIN');
  const [supplierOrderNumber, setSupplierOrderNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // البحث عن فيزا بنك التضامن وفيزا بنك التجاري بدقة متناهية
  const tadamonCard = useMemo(() => {
    return accounts.find(a => Number(a.id) === 1) ||
           accounts.find(a => a.name.includes('التضامن') && (a.name.includes('فيزا') || a.type === 'بطاقة')) ||
           accounts.find(a => a.name.includes('التضامن')) ||
           accounts.find(a => a.type === 'بطاقة') || accounts[0];
  }, [accounts]);

  const commercialCard = useMemo(() => {
    return accounts.find(a => Number(a.id) === 120002) ||
           accounts.find(a => a.name.includes('التجاري') && (a.name.includes('فيزا') || a.type === 'بطاقة')) ||
           accounts.find(a => Number(a.id) !== Number(tadamonCard?.id) && (a.name.includes('فيزا') || a.type === 'بطاقة')) ||
           accounts.find(a => Number(a.id) !== Number(tadamonCard?.id) && a.name.includes('التجاري')) ||
           accounts[1] || accounts[0];
  }, [accounts, tadamonCard]);

  // حالة طريقة وقناة الدفع: إما فيزا واحدة أو فيزتين
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');

  // خيار فيزا واحدة
  const defaultAccId = tadamonCard?.id || accounts.find(a => a.type === 'بطاقة' || a.name.includes('فيزا'))?.id || accounts[0]?.id || '';
  const [accountId, setAccountId] = useState<string>(String(defaultAccId));

  // خيار فيزتين (تجزئة الدفع بين فيزا بنك التضامن وفيزا بنك التجاري)
  const [card1Id, setCard1Id] = useState<string>(String(tadamonCard?.id || 1));
  const [card2Id, setCard2Id] = useState<string>(String(commercialCard?.id || 120002));
  const [card1Amount, setCard1Amount] = useState<string>('');
  const [card2Amount, setCard2Amount] = useState<string>('');

  const [purchaseCost, setPurchaseCost] = useState('');
  const [transferFees, setTransferFees] = useState('0');
  const [purchaseFees, setPurchaseFees] = useState('0');
  const [exchangeRateDiff, setExchangeRateDiff] = useState('0');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [orderFilterMode, setOrderFilterMode] = useState<'pending' | 'all'>('pending');
  const [orderModalSearch, setOrderModalSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Eligible orders for purchasing
  const eligibleOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'cancelled') return false;
      if (orderFilterMode === 'pending') {
        return (o.status === 'pending' || !o.purchaseBatchId) && o.status !== 'delivered';
      }
      return true;
    });
  }, [orders, orderFilterMode]);

  const filteredEligibleOrders = useMemo(() => {
    if (!orderModalSearch.trim()) return eligibleOrders;
    const q = orderModalSearch.toLowerCase().trim();
    return eligibleOrders.filter(o =>
      String(o.orderNumber).toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.itemsDescription || '').toLowerCase().includes(q)
    );
  }, [eligibleOrders, orderModalSearch]);

  // تجميع إجمالي الطلبات من واقع قيمتها المسجلة بدقة بدون خصم إضافي (الطلبات مسجلة مع الخصم أصلاً)
  const selectedOrdersTotal = useMemo(() => {
    return orders
      .filter(o => selectedOrderIds.includes(o.id))
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [orders, selectedOrderIds]);

  // التكلفة الكلية = تكلفة الشراء الصافية + عمولات التحويل البنكي + رسوم الشراء + فروق الصرف
  const totalCalculated =
    (Number(purchaseCost) || 0) +
    (Number(transferFees) || 0) +
    (Number(purchaseFees) || 0) +
    (Number(exchangeRateDiff) || 0);

  const netProfit = selectedOrdersTotal - totalCalculated;
  const margin = selectedOrdersTotal > 0 ? (netProfit / selectedOrdersTotal) * 100 : 0;
  const avgProfitPerOrder = selectedOrderIds.length > 0 ? Math.round(netProfit / selectedOrderIds.length) : 0;

  // دوال مساعدة لتوزيع المبالغ المسحوبة بين الفيزتين
  const handleSplit5050 = () => {
    if (totalCalculated <= 0) return;
    const half = Math.floor(totalCalculated / 2);
    setCard1Amount(String(half));
    setCard2Amount(String(totalCalculated - half));
    setFormError('');
  };

  const handleFullOnCard1 = () => {
    if (totalCalculated <= 0) return;
    if (tadamonCard?.id) setCard1Id(String(tadamonCard.id));
    setCard1Amount(String(totalCalculated));
    setCard2Amount('0');
    setFormError('');
  };

  const handleFullOnCard2 = () => {
    if (totalCalculated <= 0) return;
    if (commercialCard?.id) setCard2Id(String(commercialCard.id));
    setCard1Amount('0');
    setCard2Amount(String(totalCalculated));
    setFormError('');
  };

  const handleCard1Change = (val: string) => {
    setCard1Amount(val);
    setFormError('');
    const n = Number(val);
    if (!isNaN(n) && n >= 0 && n <= totalCalculated && totalCalculated > 0) {
      setCard2Amount(String(totalCalculated - n));
    }
  };

  const handleCard2Change = (val: string) => {
    setCard2Amount(val);
    setFormError('');
    const n = Number(val);
    if (!isNaN(n) && n >= 0 && n <= totalCalculated && totalCalculated > 0) {
      setCard1Amount(String(totalCalculated - n));
    }
  };

  const handleAutoBalance = () => {
    const c1 = Number(card1Amount) || 0;
    setCard2Amount(String(Math.max(0, totalCalculated - c1)));
    setFormError('');
  };

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredEligibleOrders.length && filteredEligibleOrders.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredEligibleOrders.map(o => o.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseCost || Number(purchaseCost) <= 0) {
      setFormError('يرجى إدخال تكلفة الشراء الصافية');
      return;
    }
    if (selectedOrderIds.length === 0) {
      setFormError('يرجى تحديد طلبية واحدة على الأقل لتضمينها في هذه الدفعة');
      return;
    }

    if (paymentMode === 'split') {
      const c1 = Number(card1Amount) || 0;
      const c2 = Number(card2Amount) || 0;
      if (!card1Id || !card2Id) {
        setFormError('يرجى تحديد كلتا الفيزتين للسحب المجزأ');
        return;
      }
      if (card1Id === card2Id) {
        setFormError('يرجى اختيار بطاقتين مختلفتين (مثال: فيزا بنك التضامن وفيزا بنك التجاري)');
        return;
      }
      if (c1 <= 0 && c2 <= 0) {
        setFormError('يرجى إدخال المبالغ المسحوبة من الفيزتين');
        return;
      }
      if (c1 + c2 !== totalCalculated) {
        setFormError(`مجموع المبالغ المسحوبة من الفيزتين (${(c1 + c2).toLocaleString()} YER) لا يتطابق مع إجمالي التكلفة المطلوبة (${totalCalculated.toLocaleString()} YER). اضغط على زر ضبط الفارق.`);
        return;
      }

      onSubmit({
        source,
        supplierOrderNumber: supplierOrderNumber.trim() || undefined,
        paymentMode: 'split',
        accountId: Number(card1Id),
        card1Amount: c1,
        accountId2: Number(card2Id),
        card2Amount: c2,
        purchaseCost: Number(purchaseCost) || 0,
        transferFees: Number(transferFees) || 0,
        purchaseFees: Number(purchaseFees) || 0,
        exchangeRateDiff: Number(exchangeRateDiff) || 0,
        orderIds: selectedOrderIds,
        notes: notes.trim() || undefined
      });
    } else {
      if (!accountId) {
        setFormError('يرجى اختيار حساب الدفع أو البطاقة البنكية المسحوب منها');
        return;
      }

      onSubmit({
        source,
        supplierOrderNumber: supplierOrderNumber.trim() || undefined,
        paymentMode: 'single',
        accountId: Number(accountId),
        card1Amount: totalCalculated,
        accountId2: null,
        card2Amount: undefined,
        purchaseCost: Number(purchaseCost) || 0,
        transferFees: Number(transferFees) || 0,
        purchaseFees: Number(purchaseFees) || 0,
        exchangeRateDiff: Number(exchangeRateDiff) || 0,
        orderIds: selectedOrderIds,
        notes: notes.trim() || undefined
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                تسجيل دفعة شراء جماعية جديدة
              </h3>
              <p className="text-xs text-slate-500">
                تجميع طلبيات العملاء وشراء البضاعة مع احتساب صافي الأرباح اللحظية وقيد العمليات
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">مصدر الشراء / المنصة *</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
              >
                <option value="SHEIN">شي إن (SHEIN)</option>
                <option value="AliExpress">علي إكسبرس (AliExpress)</option>
                <option value="Alibaba">علي بابا (Alibaba)</option>
                <option value="Zara">زارا (Zara)</option>
                <option value="Amazon">أمازون (Amazon)</option>
                <option value="Other">موقع آخر</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم طلب المورد (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: SHEIN-YE-981423"
                value={supplierOrderNumber}
                onChange={e => setSupplierOrderNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الشراء *</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                تكلفة الشراء الصافية (YER) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="مثال: 120000"
                value={purchaseCost}
                onChange={e => setPurchaseCost(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">قيمة المنتجات بالموقع بدون رسوم</span>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                عمولات التحويل البنكي (YER)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={transferFees}
                onChange={e => setTransferFees(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">عمولات الإيداع أو الحوالات البنكية</span>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                رسوم الشراء (YER)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={purchaseFees}
                onChange={e => setPurchaseFees(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">رسوم بوابة الدفع أو البطاقة</span>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                فروق الصرف (YER)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={exchangeRateDiff}
                onChange={e => setExchangeRateDiff(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">فوارق صرف العملات إن وجدت</span>
            </div>
          </div>

          {/* REAL-TIME PROFIT CALCULATION PANEL */}
          <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
            netProfit >= 0
              ? 'bg-gradient-to-l from-emerald-50 via-teal-50/20 to-white border-emerald-300 shadow-2xs'
              : 'bg-gradient-to-l from-rose-50 via-red-50/20 to-white border-rose-300 shadow-2xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-bold block">
                    صافي ربح هذه العملية المتوقع:
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`font-mono font-black text-base sm:text-lg ${
                      netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} YER
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      netProfit >= 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      هامش {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">إجمالي المسحوب:</span>
                  <span className="font-bold text-slate-800">{totalCalculated.toLocaleString()} YER</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">متوسط ربح الطلب:</span>
                  <span className={`font-bold ${netProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                    ~{avgProfitPerOrder.toLocaleString()} YER
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Formula breakdown */}
            <div className="text-[11px] text-slate-700 bg-white/95 p-3 rounded-xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-1.5 font-mono shadow-2xs">
              <span>(إجمالي الطلبات مع الخصم: {selectedOrdersTotal.toLocaleString()} YER)</span>
              <span className="text-slate-400 font-bold">-</span>
              <span>(تكلفة الشراء الصافية: {Number(purchaseCost || 0).toLocaleString()} YER)</span>
              <span className="text-slate-400 font-bold">-</span>
              <span>(عمولات التحويل: {Number(transferFees || 0).toLocaleString()} YER)</span>
              <span className="text-slate-400 font-bold">-</span>
              <span>(رسوم الشراء: {Number(purchaseFees || 0).toLocaleString()} YER)</span>
              <span className="text-slate-400 font-bold">-</span>
              <span>(فروق الصرف: {Number(exchangeRateDiff || 0).toLocaleString()} YER)</span>
              <span className="text-slate-400 font-bold">=</span>
              <span className={`font-black text-xs ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                صافي الربح: {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} YER
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION: خيارات الدفع من الفيزا (فيزا واحدة أو فيزتين)            */}
          {/* ============================================================== */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-slate-50 to-indigo-50/50 border-2 border-amber-300/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <label className="font-bold text-slate-900 text-xs block">
                    طريقة وقناة الدفع والسحب من الفيزا *
                  </label>
                  <span className="text-[10px] text-slate-500">
                    اختر ما إذا كان السحب تم من فيزا واحدة أو مجزأ بين فيزتين (تضامن وتجاري)
                  </span>
                </div>
              </div>

              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-400 block">إجمالي المبلغ المطلوب تغطيته:</span>
                <span className="text-xs font-black text-slate-900">{totalCalculated.toLocaleString()} YER</span>
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPaymentMode('single')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  paymentMode === 'single'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>خيار الدفع من فيزا واحدة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode('split');
                  if (!card1Amount && !card2Amount && totalCalculated > 0) {
                    const half = Math.floor(totalCalculated / 2);
                    setCard1Amount(String(half));
                    setCard2Amount(String(totalCalculated - half));
                  }
                }}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  paymentMode === 'split'
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>خيار الدفع من فيزتين (سحب مجزأ)</span>
              </button>
            </div>

            {/* OPTION 1: SINGLE VISA */}
            {paymentMode === 'single' && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap gap-2">
                  {tadamonCard && (
                    <button
                      type="button"
                      onClick={() => setAccountId(String(tadamonCard.id))}
                      className={`flex-1 min-w-[200px] p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        Number(accountId) === tadamonCard.id
                          ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/40 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center text-sm font-bold">
                          💳
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{tadamonCard.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">الرصيد المتاح: {getAccountBalance(tadamonCard.id).toLocaleString()} YER</span>
                        </div>
                      </div>
                      {Number(accountId) === tadamonCard.id && (
                        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                    </button>
                  )}

                  {commercialCard && (
                    <button
                      type="button"
                      onClick={() => setAccountId(String(commercialCard.id))}
                      className={`flex-1 min-w-[200px] p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        Number(accountId) === commercialCard.id
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-400/40 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center text-sm font-bold">
                          💳
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{commercialCard.name}</span>
                          <span className="text-[10px] text-emerald-700 font-bold font-mono">الرصيد المتاح: {getAccountBalance(commercialCard.id).toLocaleString()} YER</span>
                        </div>
                      </div>
                      {Number(accountId) === commercialCard.id && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">أو اختر حساب أو محفظة أخرى من القائمة:</label>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-amber-500 text-xs font-medium"
                  >
                    <option value="">اختر الحساب المسحوب منه المبلغ</option>
                    {accounts.filter(a => a.status === 'active').map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type}) — الرصيد: {getAccountBalance(a.id).toLocaleString()} YER
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    <span>سيتم سحب كامل تكلفة الشراء من هذه الفيزا:</span>
                  </div>
                  <strong className="font-mono font-black text-amber-950 text-sm">
                    {totalCalculated.toLocaleString()} YER
                  </strong>
                </div>
              </div>
            )}

            {/* OPTION 2: TWO VISAS (SPLIT) */}
            {paymentMode === 'split' && (
              <div className="space-y-3 pt-1">
                {/* Fast presets buttons */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs">
                  <span className="font-bold text-indigo-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>توزيع سريع للمبالغ:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSplit5050}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 font-bold rounded-lg border border-indigo-200 transition cursor-pointer text-[11px] shadow-2xs"
                    >
                      مناصفة (50% / 50%)
                    </button>
                    <button
                      type="button"
                      onClick={handleFullOnCard1}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 font-bold rounded-lg border border-indigo-200 transition cursor-pointer text-[11px] shadow-2xs"
                    >
                      كامل المبلغ على فيزا التضامن ({getAccountBalance(tadamonCard?.id || 1).toLocaleString()} YER)
                    </button>
                    <button
                      type="button"
                      onClick={handleFullOnCard2}
                      className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-900 font-bold rounded-lg border border-teal-200 transition cursor-pointer text-[11px] shadow-2xs"
                    >
                      كامل المبلغ على فيزا التجاري ({getAccountBalance(commercialCard?.id || 120002).toLocaleString()} YER)
                    </button>
                  </div>
                </div>

                {/* The Two Visa Cards Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: Tadhamon */}
                  <div className="p-3 bg-white rounded-xl border-2 border-indigo-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                        <span>الفيزا الأولى (بنك التضامن)</span>
                      </span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100">بطاقة أساسية</span>
                    </div>

                    <select
                      value={card1Id}
                      onChange={e => setCard1Id(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold focus:outline-indigo-500 bg-slate-50"
                    >
                      {accounts.filter(a => a.status === 'active').map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type}) — الرصيد: {getAccountBalance(a.id).toLocaleString()} YER
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                      <span>الرصيد المتاح بالفيزا:</span>
                      <span className="font-bold text-indigo-900">{getAccountBalance(Number(card1Id)).toLocaleString()} YER</span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                        كم سحبت من الفيزا الأولى؟ (YER) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="المبلغ المسحوب"
                          value={card1Amount}
                          onChange={e => handleCard1Change(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-indigo-300 text-sm font-mono font-black text-indigo-950 focus:outline-indigo-500 pl-12 bg-indigo-50/20"
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-indigo-600 font-bold font-mono">
                          YER
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Commercial */}
                  <div className="p-3 bg-white rounded-xl border-2 border-teal-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                        <span>الفيزا الثانية (بنك التجاري)</span>
                      </span>
                      <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-100">بطاقة مساعدة</span>
                    </div>

                    <select
                      value={card2Id}
                      onChange={e => setCard2Id(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold focus:outline-teal-500 bg-slate-50"
                    >
                      {accounts.filter(a => a.status === 'active').map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type}) — الرصيد: {getAccountBalance(a.id).toLocaleString()} YER
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                      <span>الرصيد المتاح بالفيزا:</span>
                      <span className="font-bold text-teal-900">{getAccountBalance(Number(card2Id)).toLocaleString()} YER</span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                        كم سحبت من الفيزا الثانية؟ (YER) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="المبلغ المسحوب"
                          value={card2Amount}
                          onChange={e => handleCard2Change(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-teal-300 text-sm font-mono font-black text-teal-950 focus:outline-teal-500 pl-12 bg-teal-50/20"
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-teal-600 font-bold font-mono">
                          YER
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Split Match Validation Banner */}
                {(() => {
                  const sumCards = (Number(card1Amount) || 0) + (Number(card2Amount) || 0);
                  const diff = totalCalculated - sumCards;
                  const isMatch = Math.abs(diff) === 0 && totalCalculated > 0;

                  return (
                    <div className={`p-3 rounded-xl border text-xs transition ${
                      isMatch
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50/90 border-amber-300 text-amber-950'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isMatch ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>المجموع المسحوب من الفيزتين:</span>
                              <span className="font-mono text-sm font-black">{sumCards.toLocaleString()} YER</span>
                              <span className="text-slate-400 font-normal">|</span>
                              <span className="text-slate-600 font-medium">المطلوب: {totalCalculated.toLocaleString()} YER</span>
                            </div>
                            <span className="text-[11px] block mt-0.5">
                              {isMatch ? (
                                <span className="text-emerald-700 font-bold">
                                  ✓ المبالغ مطابقة تماماً لإجمالي تكلفة الشراء والرسوم (100%)
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-amber-800 font-bold">
                                  متبقي لتغطية التكلفة بالكامل: {diff.toLocaleString()} YER
                                </span>
                              ) : (
                                <span className="text-rose-700 font-bold">
                                  المبالغ المدخلة تزيد عن التكلفة بمقدار: {Math.abs(diff).toLocaleString()} YER
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {!isMatch && totalCalculated > 0 && (
                          <button
                            type="button"
                            onClick={handleAutoBalance}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
                          >
                            ضبط الفارق تلقائياً
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Clarity Box: Orders Total Registered with Actual Discounts */}
          {selectedOrderIds.length > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-emerald-950">
                    إجمالي مبيعات الطلبات المحددة ({selectedOrderIds.length} طلبات):
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-800">
                    {selectedOrdersTotal.toLocaleString()} YER
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchaseCost(String(selectedOrdersTotal))}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold cursor-pointer transition shadow-2xs text-[11px]"
                >
                  نسخ كـ تكلفة شراء صافية ({selectedOrdersTotal.toLocaleString()})
                </button>
              </div>
              <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                ✓ يتم احتساب إجمالي مبيعات الطلبات بدقة من واقع المبالغ المسجلة في كل طلب (متضمنة الخصم الفعلي الممنوح لكل عميل مسبقاً) دون تطبيق أي خصم إضافي تلقائي من النظام.
              </p>
            </div>
          )}

          {/* Order Selection Controls */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="font-bold text-slate-800">
                الطلبيات المشمولة في هذه الدفعة * ({selectedOrderIds.length} محددة)
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrderFilterMode(prev => prev === 'pending' ? 'all' : 'pending')}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
                >
                  {orderFilterMode === 'pending' ? 'عرض كل الطلبات' : 'فقط الطلبات المعلقة'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllOrders}
                  className="text-[11px] text-amber-800 hover:text-amber-950 font-bold bg-amber-100 px-2 py-0.5 rounded cursor-pointer"
                >
                  {selectedOrderIds.length === filteredEligibleOrders.length && filteredEligibleOrders.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>
            </div>

            {/* Search input for modal orders */}
            <div className="mb-2">
              <input
                type="text"
                value={orderModalSearch}
                onChange={e => setOrderModalSearch(e.target.value)}
                placeholder="ابحث برقم الطلب أو اسم العميل لاختياره..."
                className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {filteredEligibleOrders.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                لا توجد طلبات معلقة بانتظار الشراء حالياً.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredEligibleOrders.map(o => {
                  const isChecked = selectedOrderIds.includes(o.id);
                  return (
                    <div
                      key={o.id}
                      onClick={() => handleToggleOrder(o.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOrder(o.id)}
                          className="rounded text-amber-600 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{o.orderNumber} • {o.customerName}</div>
                          <div className="text-[11px] text-slate-400">
                            {o.itemsDescription || 'طلبية ملابس ومنتجات'}
                          </div>
                        </div>
                      </div>

                      <div className="text-left font-mono font-bold text-slate-800">
                        {(o.totalAmount || 0).toLocaleString()} YER
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات حول الدفعة</label>
            <textarea
              rows={2}
              placeholder="أي ملاحظات حول كرتون الشحن أو رابط الدفعة"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={selectedOrderIds.length === 0 || !purchaseCost}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              <span>تسجيل الدفعة</span>
              {netProfit !== 0 && (
                <span className={`text-[11px] px-2 py-0.5 rounded-md ${
                  netProfit > 0 ? 'bg-emerald-900 text-emerald-100' : 'bg-rose-900 text-rose-100'
                }`}>
                  ربح {netProfit > 0 ? '+' : ''}{netProfit.toLocaleString()} YER
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: EDIT PURCHASE BATCH MODAL
// =====================================================================
interface EditPurchaseBatchModalProps {
  batch: PurchaseBatch;
  orders: Order[];
  accounts: Account[];
  onClose: () => void;
  onSave: (updatedData: {
    source: string;
    supplierOrderNumber?: string | null;
    purchaseDate: string;
    paymentMode?: 'single' | 'split';
    accountId: number;
    card1Amount?: number;
    accountId2?: number | null;
    card2Amount?: number;
    purchaseCost: number;
    purchaseFees: number;
    transferFees: number;
    exchangeRateDiff?: number;
    orderIds: number[];
    notes?: string | null;
  }) => void;
}

const EditPurchaseBatchModal: React.FC<EditPurchaseBatchModalProps> = ({
  batch,
  orders,
  accounts,
  onClose,
  onSave
}) => {
  const { getAccountBalance } = useStore();
  const [source, setSource] = useState(batch.source || 'SHEIN');
  const [supplierOrderNumber, setSupplierOrderNumber] = useState(batch.supplierOrderNumber || '');
  const [purchaseDate, setPurchaseDate] = useState(batch.purchaseDate || new Date().toISOString().split('T')[0]);

  // البحث عن فيزا بنك التضامن وفيزا بنك التجاري
  const tadamonCard = useMemo(() => {
    return accounts.find(a => Number(a.id) === 1) ||
           accounts.find(a => a.name.includes('التضامن') && (a.name.includes('فيزا') || a.type === 'بطاقة')) ||
           accounts.find(a => a.name.includes('التضامن')) ||
           accounts.find(a => a.type === 'بطاقة') || accounts[0];
  }, [accounts]);

  const commercialCard = useMemo(() => {
    return accounts.find(a => Number(a.id) === 120002) ||
           accounts.find(a => a.name.includes('التجاري') && (a.name.includes('فيزا') || a.type === 'بطاقة')) ||
           accounts.find(a => Number(a.id) !== Number(tadamonCard?.id) && (a.name.includes('فيزا') || a.type === 'بطاقة')) ||
           accounts.find(a => Number(a.id) !== Number(tadamonCard?.id) && a.name.includes('التجاري')) ||
           accounts[1] || accounts[0];
  }, [accounts, tadamonCard]);

  // طريقة الدفع المسجلة مسبقاً (فيزا واحدة أو فيزتين)
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>(batch.paymentMode || 'single');

  // خيار فيزا واحدة
  const normalizedBatchAccId = Number(batch.accountId) === 120001 ? 120002 : batch.accountId;
  const defaultAccId = normalizedBatchAccId || tadamonCard?.id || accounts[0]?.id || '';
  const [accountId, setAccountId] = useState<string>(String(defaultAccId));

  // خيار فيزتين
  const normalizedBatchAccId2 = Number(batch.accountId2) === 120001 ? 120002 : batch.accountId2;
  const initialCard1 = normalizedBatchAccId || tadamonCard?.id || defaultAccId;
  const initialCard2 = normalizedBatchAccId2 || commercialCard?.id || 120002;
  const [card1Id, setCard1Id] = useState<string>(String(initialCard1));
  const [card2Id, setCard2Id] = useState<string>(String(initialCard2));
  const [card1Amount, setCard1Amount] = useState<string>(batch.paymentMode === 'split' && batch.card1Amount !== undefined ? String(batch.card1Amount) : '');
  const [card2Amount, setCard2Amount] = useState<string>(batch.paymentMode === 'split' && batch.card2Amount !== undefined ? String(batch.card2Amount) : '');

  const [purchaseCost, setPurchaseCost] = useState<string>(String(batch.purchaseCost || ''));
  const [transferFees, setTransferFees] = useState<string>(String(batch.transferFees || '0'));
  const [purchaseFees, setPurchaseFees] = useState<string>(String(batch.purchaseFees || '0'));
  const [exchangeRateDiff, setExchangeRateDiff] = useState<string>(String(batch.exchangeRateDiff || '0'));
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>(batch.orderIds || []);
  const [orderModalSearch, setOrderModalSearch] = useState('');
  const [orderFilterMode, setOrderFilterMode] = useState<'all' | 'pending'>('all');
  const [notes, setNotes] = useState(batch.notes || '');
  const [formError, setFormError] = useState('');

  // Eligible orders: include current batch's orders PLUS pending/unpurchased orders
  const eligibleOrders = useMemo(() => {
    const currentBatchOrders = batch.orderIds || [];
    return orders.filter(o => {
      if (o.status === 'cancelled') return false;
      // If already in this batch, always eligible
      if (currentBatchOrders.includes(o.id) || o.purchaseBatchId === batch.id) return true;
      // Otherwise eligible if pending or not assigned to another batch
      if (orderFilterMode === 'pending') {
        return (o.status === 'pending' || !o.purchaseBatchId) && o.status !== 'delivered';
      }
      return !o.purchaseBatchId || o.purchaseBatchId === batch.id;
    });
  }, [orders, batch, orderFilterMode]);

  const filteredEligibleOrders = useMemo(() => {
    if (!orderModalSearch.trim()) return eligibleOrders;
    const q = orderModalSearch.toLowerCase().trim();
    return eligibleOrders.filter(o =>
      String(o.orderNumber).toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.itemsDescription || '').toLowerCase().includes(q)
    );
  }, [eligibleOrders, orderModalSearch]);

  // إجمالي الطلبات بدون أي خصومات إضافية - مسجلة مع الخصم أصلاً
  const selectedOrdersTotal = useMemo(() => {
    return orders
      .filter(o => selectedOrderIds.includes(o.id))
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [orders, selectedOrderIds]);

  const totalCalculated =
    (Number(purchaseCost) || 0) +
    (Number(transferFees) || 0) +
    (Number(purchaseFees) || 0) +
    (Number(exchangeRateDiff) || 0);

  // دوال مساعدة لتوزيع المبالغ المسحوبة بين الفيزتين
  const handleSplit5050 = () => {
    if (totalCalculated <= 0) return;
    const half = Math.floor(totalCalculated / 2);
    setCard1Amount(String(half));
    setCard2Amount(String(totalCalculated - half));
    setFormError('');
  };

  const handleFullOnCard1 = () => {
    if (totalCalculated <= 0) return;
    if (tadamonCard?.id) setCard1Id(String(tadamonCard.id));
    setCard1Amount(String(totalCalculated));
    setCard2Amount('0');
    setFormError('');
  };

  const handleFullOnCard2 = () => {
    if (totalCalculated <= 0) return;
    if (commercialCard?.id) setCard2Id(String(commercialCard.id));
    setCard1Amount('0');
    setCard2Amount(String(totalCalculated));
    setFormError('');
  };

  const handleCard1Change = (val: string) => {
    setCard1Amount(val);
    setFormError('');
    const n = Number(val);
    if (!isNaN(n) && n >= 0 && n <= totalCalculated && totalCalculated > 0) {
      setCard2Amount(String(totalCalculated - n));
    }
  };

  const handleCard2Change = (val: string) => {
    setCard2Amount(val);
    setFormError('');
    const n = Number(val);
    if (!isNaN(n) && n >= 0 && n <= totalCalculated && totalCalculated > 0) {
      setCard1Amount(String(totalCalculated - n));
    }
  };

  const handleAutoBalance = () => {
    const c1 = Number(card1Amount) || 0;
    setCard2Amount(String(Math.max(0, totalCalculated - c1)));
    setFormError('');
  };

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredEligibleOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredEligibleOrders.map(o => o.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseCost || Number(purchaseCost) <= 0) {
      setFormError('يرجى إدخال تكلفة الشراء الصافية');
      return;
    }
    if (selectedOrderIds.length === 0) {
      setFormError('يرجى تحديد طلبية واحدة على الأقل لتضمينها في هذه الدفعة');
      return;
    }

    if (paymentMode === 'split') {
      const c1 = Number(card1Amount) || 0;
      const c2 = Number(card2Amount) || 0;
      if (!card1Id || !card2Id) {
        setFormError('يرجى تحديد كلتا الفيزتين للسحب المجزأ');
        return;
      }
      if (card1Id === card2Id) {
        setFormError('يرجى اختيار بطاقتين مختلفتين (مثال: فيزا بنك التضامن وفيزا بنك التجاري)');
        return;
      }
      if (c1 <= 0 && c2 <= 0) {
        setFormError('يرجى إدخال المبالغ المسحوبة من الفيزتين');
        return;
      }
      if (c1 + c2 !== totalCalculated) {
        setFormError(`مجموع المبالغ المسحوبة من الفيزتين (${(c1 + c2).toLocaleString()} YER) لا يتطابق مع إجمالي التكلفة المطلوبة (${totalCalculated.toLocaleString()} YER). اضغط على زر ضبط الفارق.`);
        return;
      }

      onSave({
        source,
        supplierOrderNumber: supplierOrderNumber.trim() || null,
        purchaseDate,
        paymentMode: 'split',
        accountId: Number(card1Id),
        card1Amount: c1,
        accountId2: Number(card2Id),
        card2Amount: c2,
        purchaseCost: Number(purchaseCost) || 0,
        transferFees: Number(transferFees) || 0,
        purchaseFees: Number(purchaseFees) || 0,
        exchangeRateDiff: Number(exchangeRateDiff) || 0,
        orderIds: selectedOrderIds,
        notes: notes.trim() || null
      });
    } else {
      if (!accountId) {
        setFormError('يرجى اختيار حساب الدفع أو البطاقة البنكية');
        return;
      }

      onSave({
        source,
        supplierOrderNumber: supplierOrderNumber.trim() || null,
        purchaseDate,
        paymentMode: 'single',
        accountId: Number(accountId),
        card1Amount: totalCalculated,
        accountId2: null,
        card2Amount: undefined,
        purchaseCost: Number(purchaseCost) || 0,
        transferFees: Number(transferFees) || 0,
        purchaseFees: Number(purchaseFees) || 0,
        exchangeRateDiff: Number(exchangeRateDiff) || 0,
        orderIds: selectedOrderIds,
        notes: notes.trim() || null
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                تعديل دفعة الشراء {batch.batchNumber}
              </h3>
              <p className="text-xs text-slate-500">
                تعديل التكلفة والمصدر والطلبيات وتحديث القيود المالية تلقائياً
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">مصدر الشراء / المنصة *</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
              >
                <option value="SHEIN">شي إن (SHEIN)</option>
                <option value="AliExpress">علي إكسبرس (AliExpress)</option>
                <option value="Alibaba">علي بابا (Alibaba)</option>
                <option value="Zara">زارا (Zara)</option>
                <option value="Amazon">أمازون (Amazon)</option>
                <option value="Other">موقع آخر</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم طلب المورد (Supplier Order No)</label>
              <input
                type="text"
                placeholder="مثال: SHEIN-YE-981423"
                value={supplierOrderNumber}
                onChange={e => setSupplierOrderNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الشراء *</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                تكلفة الشراء الصافية (YER) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="مثال: 120000"
                value={purchaseCost}
                onChange={e => setPurchaseCost(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">قيمة المنتجات بالموقع بدون رسوم</span>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                عمولات التحويل البنكي (YER)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={transferFees}
                onChange={e => setTransferFees(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">عمولات الإيداع أو الحوالات البنكية</span>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                رسوم الشراء (YER)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={purchaseFees}
                onChange={e => setPurchaseFees(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">رسوم بوابة الدفع أو البطاقة</span>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                فروق الصرف (YER)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={exchangeRateDiff}
                onChange={e => setExchangeRateDiff(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">فوارق صرف العملات إن وجدت</span>
            </div>
          </div>

          {/* Real-time Profit Calculation Card in Edit Modal */}
          {(() => {
            const netProfit = selectedOrdersTotal - totalCalculated;
            const margin = selectedOrdersTotal > 0 ? (netProfit / selectedOrdersTotal) * 100 : 0;
            const avgProfit = selectedOrderIds.length > 0 ? Math.round(netProfit / selectedOrderIds.length) : 0;

            return (
              <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                netProfit >= 0
                  ? 'bg-gradient-to-l from-emerald-50 via-teal-50/20 to-white border-emerald-300 shadow-2xs'
                  : 'bg-gradient-to-l from-rose-50 via-red-50/20 to-white border-rose-300 shadow-2xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-bold block">
                        صافي أرباح هذه العملية بعد التعديل:
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className={`font-mono font-black text-base sm:text-lg ${
                          netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} YER
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          netProfit >= 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          هامش {margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">المسحوب الكلي:</span>
                      <span className="font-bold text-slate-800">{totalCalculated.toLocaleString()} YER</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">متوسط ربح الطلب:</span>
                      <span className={`font-bold ${netProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                        ~{avgProfit.toLocaleString()} YER
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 bg-white/95 p-3 rounded-xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-1.5 font-mono shadow-2xs">
                  <span>(إجمالي الطلبات مع الخصم: {selectedOrdersTotal.toLocaleString()} YER)</span>
                  <span className="text-slate-400 font-bold">-</span>
                  <span>(تكلفة الشراء الصافية: {Number(purchaseCost || 0).toLocaleString()} YER)</span>
                  <span className="text-slate-400 font-bold">-</span>
                  <span>(عمولات التحويل: {Number(transferFees || 0).toLocaleString()} YER)</span>
                  <span className="text-slate-400 font-bold">-</span>
                  <span>(رسوم الشراء: {Number(purchaseFees || 0).toLocaleString()} YER)</span>
                  <span className="text-slate-400 font-bold">-</span>
                  <span>(فروق الصرف: {Number(exchangeRateDiff || 0).toLocaleString()} YER)</span>
                  <span className="text-slate-400 font-bold">=</span>
                  <span className={`font-black text-xs ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    صافي الربح: {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} YER
                  </span>
                </div>
              </div>
            );
          })()}

          {/* ============================================================== */}
          {/* SECTION: خيارات الدفع من الفيزا (فيزا واحدة أو فيزتين) - تعديل   */}
          {/* ============================================================== */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-slate-50 to-indigo-50/50 border-2 border-amber-300/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <label className="font-bold text-slate-900 text-xs block">
                    طريقة وقناة الدفع والسحب من الفيزا *
                  </label>
                  <span className="text-[10px] text-slate-500">
                    اختر ما إذا كان السحب تم من فيزا واحدة أو مجزأ بين فيزتين (تضامن وتجاري)
                  </span>
                </div>
              </div>

              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-400 block">إجمالي المبلغ المطلوب تغطيته:</span>
                <span className="text-xs font-black text-slate-900">{totalCalculated.toLocaleString()} YER</span>
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPaymentMode('single')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  paymentMode === 'single'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>خيار الدفع من فيزا واحدة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode('split');
                  if (!card1Amount && !card2Amount && totalCalculated > 0) {
                    const half = Math.floor(totalCalculated / 2);
                    setCard1Amount(String(half));
                    setCard2Amount(String(totalCalculated - half));
                  }
                }}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  paymentMode === 'split'
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>خيار الدفع من فيزتين (سحب مجزأ)</span>
              </button>
            </div>

            {/* OPTION 1: SINGLE VISA */}
            {paymentMode === 'single' && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap gap-2">
                  {tadamonCard && (
                    <button
                      type="button"
                      onClick={() => setAccountId(String(tadamonCard.id))}
                      className={`flex-1 min-w-[200px] p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        Number(accountId) === tadamonCard.id
                          ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/40 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center text-sm font-bold">
                          💳
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{tadamonCard.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">الرصيد المتاح: {getAccountBalance(tadamonCard.id).toLocaleString()} YER</span>
                        </div>
                      </div>
                      {Number(accountId) === tadamonCard.id && (
                        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                    </button>
                  )}

                  {commercialCard && (
                    <button
                      type="button"
                      onClick={() => setAccountId(String(commercialCard.id))}
                      className={`flex-1 min-w-[200px] p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        Number(accountId) === commercialCard.id
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-400/40 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center text-sm font-bold">
                          💳
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{commercialCard.name}</span>
                          <span className="text-[10px] text-emerald-700 font-bold font-mono">الرصيد المتاح: {getAccountBalance(commercialCard.id).toLocaleString()} YER</span>
                        </div>
                      </div>
                      {Number(accountId) === commercialCard.id && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">أو اختر حساب أو محفظة أخرى من القائمة:</label>
                  <select
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-amber-500 text-xs font-medium"
                  >
                    <option value="">اختر الحساب المسحوب منه المبلغ</option>
                    {accounts.filter(a => a.status === 'active').map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type}) — الرصيد: {getAccountBalance(a.id).toLocaleString()} YER
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    <span>سيتم سحب كامل تكلفة الشراء من هذه الفيزا:</span>
                  </div>
                  <strong className="font-mono font-black text-amber-950 text-sm">
                    {totalCalculated.toLocaleString()} YER
                  </strong>
                </div>
              </div>
            )}

            {/* OPTION 2: TWO VISAS (SPLIT) */}
            {paymentMode === 'split' && (
              <div className="space-y-3 pt-1">
                {/* Fast presets buttons */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs">
                  <span className="font-bold text-indigo-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>توزيع سريع للمبالغ:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSplit5050}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 font-bold rounded-lg border border-indigo-200 transition cursor-pointer text-[11px] shadow-2xs"
                    >
                      مناصفة (50% / 50%)
                    </button>
                    <button
                      type="button"
                      onClick={handleFullOnCard1}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 font-bold rounded-lg border border-indigo-200 transition cursor-pointer text-[11px] shadow-2xs"
                    >
                      كامل المبلغ على فيزا التضامن ({getAccountBalance(tadamonCard?.id || 1).toLocaleString()} YER)
                    </button>
                    <button
                      type="button"
                      onClick={handleFullOnCard2}
                      className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-900 font-bold rounded-lg border border-teal-200 transition cursor-pointer text-[11px] shadow-2xs"
                    >
                      كامل المبلغ على فيزا التجاري ({getAccountBalance(commercialCard?.id || 120002).toLocaleString()} YER)
                    </button>
                  </div>
                </div>

                {/* The Two Visa Cards Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: Tadhamon */}
                  <div className="p-3 bg-white rounded-xl border-2 border-indigo-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                        <span>الفيزا الأولى (بنك التضامن)</span>
                      </span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100">بطاقة أساسية</span>
                    </div>

                    <select
                      value={card1Id}
                      onChange={e => setCard1Id(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold focus:outline-indigo-500 bg-slate-50"
                    >
                      {accounts.filter(a => a.status === 'active').map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type}) — الرصيد: {getAccountBalance(a.id).toLocaleString()} YER
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                      <span>الرصيد المتاح بالفيزا:</span>
                      <span className="font-bold text-indigo-900">{getAccountBalance(Number(card1Id)).toLocaleString()} YER</span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                        كم سحبت من الفيزا الأولى؟ (YER) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="المبلغ المسحوب"
                          value={card1Amount}
                          onChange={e => handleCard1Change(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-indigo-300 text-sm font-mono font-black text-indigo-950 focus:outline-indigo-500 pl-12 bg-indigo-50/20"
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-indigo-600 font-bold font-mono">
                          YER
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Commercial */}
                  <div className="p-3 bg-white rounded-xl border-2 border-teal-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                        <span>الفيزا الثانية (بنك التجاري)</span>
                      </span>
                      <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-100">بطاقة مساعدة</span>
                    </div>

                    <select
                      value={card2Id}
                      onChange={e => setCard2Id(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs font-bold focus:outline-teal-500 bg-slate-50"
                    >
                      {accounts.filter(a => a.status === 'active').map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type}) — الرصيد: {getAccountBalance(a.id).toLocaleString()} YER
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                      <span>الرصيد المتاح بالفيزا:</span>
                      <span className="font-bold text-teal-900">{getAccountBalance(Number(card2Id)).toLocaleString()} YER</span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                        كم سحبت من الفيزا الثانية؟ (YER) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="المبلغ المسحوب"
                          value={card2Amount}
                          onChange={e => handleCard2Change(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-teal-300 text-sm font-mono font-black text-teal-950 focus:outline-teal-500 pl-12 bg-teal-50/20"
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-teal-600 font-bold font-mono">
                          YER
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Split Match Validation Banner */}
                {(() => {
                  const sumCards = (Number(card1Amount) || 0) + (Number(card2Amount) || 0);
                  const diff = totalCalculated - sumCards;
                  const isMatch = Math.abs(diff) === 0 && totalCalculated > 0;

                  return (
                    <div className={`p-3 rounded-xl border text-xs transition ${
                      isMatch
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50/90 border-amber-300 text-amber-950'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isMatch ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>المجموع المسحوب من الفيزتين:</span>
                              <span className="font-mono text-sm font-black">{sumCards.toLocaleString()} YER</span>
                              <span className="text-slate-400 font-normal">|</span>
                              <span className="text-slate-600 font-medium">المطلوب: {totalCalculated.toLocaleString()} YER</span>
                            </div>
                            <span className="text-[11px] block mt-0.5">
                              {isMatch ? (
                                <span className="text-emerald-700 font-bold">
                                  ✓ المبالغ مطابقة تماماً لإجمالي تكلفة الشراء والرسوم (100%)
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-amber-800 font-bold">
                                  متبقي لتغطية التكلفة بالكامل: {diff.toLocaleString()} YER
                                </span>
                              ) : (
                                <span className="text-rose-700 font-bold">
                                  المبالغ المدخلة تزيد عن التكلفة بمقدار: {Math.abs(diff).toLocaleString()} YER
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {!isMatch && totalCalculated > 0 && (
                          <button
                            type="button"
                            onClick={handleAutoBalance}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
                          >
                            ضبط الفارق تلقائياً
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Clarity Box: Orders Total Registered with Actual Discounts */}
          {selectedOrderIds.length > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-emerald-950">
                    إجمالي مبيعات الطلبات المحددة ({selectedOrderIds.length} طلبات):
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-800">
                    {selectedOrdersTotal.toLocaleString()} YER
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPurchaseCost(String(selectedOrdersTotal))}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold cursor-pointer transition shadow-2xs text-[11px]"
                >
                  نسخ كـ تكلفة شراء صافية ({selectedOrdersTotal.toLocaleString()})
                </button>
              </div>
              <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                ✓ يتم احتساب إجمالي مبيعات الطلبات بدقة من واقع المبالغ المسجلة في كل طلب (متضمنة الخصم الفعلي الممنوح لكل عميل مسبقاً) دون تطبيق أي خصم إضافي تلقائي من النظام.
              </p>
            </div>
          )}

          {/* Order Selection Controls */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="font-bold text-slate-800">
                الطلبيات المشمولة في هذه الدفعة * ({selectedOrderIds.length} محددة)
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrderFilterMode(prev => prev === 'pending' ? 'all' : 'pending')}
                  className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
                >
                  {orderFilterMode === 'pending' ? 'عرض طلبات الدفعة والمعلقة' : 'فقط الطلبات المعلقة'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllOrders}
                  className="text-[11px] text-amber-800 hover:text-amber-950 font-bold bg-amber-100 px-2 py-0.5 rounded cursor-pointer"
                >
                  {selectedOrderIds.length === filteredEligibleOrders.length && filteredEligibleOrders.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>
            </div>

            {/* Search input for modal orders */}
            <div className="mb-2">
              <input
                type="text"
                value={orderModalSearch}
                onChange={e => setOrderModalSearch(e.target.value)}
                placeholder="ابحث برقم الطلب أو اسم العميل لاختياره أو استبعاده..."
                className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {filteredEligibleOrders.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                لا توجد طلبات تطابق معايير البحث.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredEligibleOrders.map(o => {
                  const isChecked = selectedOrderIds.includes(o.id);
                  return (
                    <div
                      key={o.id}
                      onClick={() => handleToggleOrder(o.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOrder(o.id)}
                          className="rounded text-amber-600"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{o.orderNumber} • {o.customerName}</div>
                          <div className="text-[11px] text-slate-400">
                            {o.itemsDescription || 'طلبية ملابس ومنتجات'}
                          </div>
                        </div>
                      </div>

                      <div className="text-left font-mono font-bold text-slate-800">
                        {(o.totalAmount || 0).toLocaleString()} YER
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات حول الدفعة</label>
            <textarea
              rows={2}
              placeholder="أي ملاحظات حول كرتون الشحن أو رابط الدفعة"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={selectedOrderIds.length === 0 || !purchaseCost}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black cursor-pointer shadow-xs disabled:opacity-50"
            >
              حفظ التعديلات وتحديث القيود
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: DELETE PURCHASE BATCH MODAL (Cascading Deletion)
// =====================================================================
interface DeletePurchaseBatchModalProps {
  batch: PurchaseBatch;
  orders: Order[];
  onClose: () => void;
  onConfirm: () => void;
}

const DeletePurchaseBatchModal: React.FC<DeletePurchaseBatchModalProps> = ({
  batch,
  orders,
  onClose,
  onConfirm
}) => {
  const batchOrders = orders.filter(o => (batch.orderIds || []).includes(o.id));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">حذف عملية الشراء والترابط المحاسبي</h3>
            <p className="text-xs text-slate-500">حذف متزامن ذكي (Cascading Deletion)</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
          <div className="flex justify-between font-bold text-slate-800">
            <span>رقم دفعة الشراء:</span>
            <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {batch.batchNumber}
            </span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>مصدر الشراء:</span>
            <span className="font-bold text-slate-900">{batch.source}</span>
          </div>
          {batch.supplierOrderNumber && (
            <div className="flex justify-between text-slate-700">
              <span>رقم طلب المورد:</span>
              <span className="font-mono text-slate-900">{batch.supplierOrderNumber}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-700">
            <span>الحساب المسحوب منه:</span>
            <span className="font-bold text-slate-900">{batch.accountName}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
            <span>إجمالي المبلغ المسحوب:</span>
            <span className="font-mono text-rose-600 text-sm">
              {(Number(batch.totalCost) || 0).toLocaleString()} YER
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
          <span className="font-bold block">⚠️ سيقوم النظام تلقائياً وبشكل فوري بما يلي:</span>
          <ul className="list-disc list-inside space-y-1 text-slate-700 pr-1">
            <li>
              إعادة جميع الطلبيات المشمولة ({batchOrders.length} طلبات) إلى حالة <strong className="text-amber-800">قيد التنفيذ</strong> وفك ارتباطها بالدفعة.
            </li>
            <li>
              إلغاء حركة السحب المالي لحساب <strong className="text-slate-900">{batch.accountName}</strong> واسترجاع رصيده.
            </li>
            <li>
              إلغاء وحذف قيد اليومية المحاسبي المزدوج التابع للدفعة للحفاظ على سلامة وتوازن الدفاتر المحاسبية.
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>تأكيد الحذف التام</span>
          </button>
        </div>
      </div>
    </div>
  );
};
