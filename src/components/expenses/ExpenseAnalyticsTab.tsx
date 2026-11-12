import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Filter,
  DollarSign,
  Plus,
  ArrowUpRight,
  Layers,
  Wallet,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { Expense, Order, Account } from '../../types';

interface ExpenseAnalyticsTabProps {
  expenses: Expense[];
  orders: Order[];
  accounts: Account[];
  onOpenNewExpense: () => void;
  onFilterByCategory: (cat: string) => void;
}

const COLORS = [
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16'
];

export const ExpenseAnalyticsTab: React.FC<ExpenseAnalyticsTabProps> = ({
  expenses = [],
  orders = [],
  accounts = [],
  onOpenNewExpense,
  onFilterByCategory
}) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('all');

  // Robust numeric extractor
  const getExpenseAmount = (e: Expense): number => {
    return parseFloat(String(e.amount || 0)) || 0;
  };

  // Robust date extractor (YYYY-MM-DD)
  const getExpenseDate = (e: Expense): string => {
    const raw = (e as any).expenseDate || (e as any).date || e.createdAt || '';
    return raw ? String(raw).split('T')[0] : '';
  };

  const getOrderAmount = (o: Order): number => {
    return parseFloat(String(o.totalAmount || 0)) || 0;
  };

  const getOrderDate = (o: Order): string => {
    const raw = o.orderDate || o.createdAt || '';
    return raw ? String(raw).split('T')[0] : '';
  };

  // Filtered Expenses by Date Range and Account
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (e.status === 'cancelled') return false;
      const d = getExpenseDate(e);
      if (fromDate && d && d < fromDate) return false;
      if (toDate && d && d > toDate) return false;
      if (selectedAccountFilter !== 'all' && String(e.accountId) !== selectedAccountFilter) {
        return false;
      }
      return true;
    });
  }, [expenses, fromDate, toDate, selectedAccountFilter]);

  // Overall metrics - strictly numeric summation
  const totalExpenseSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + getExpenseAmount(e), 0);
  }, [filteredExpenses]);

  // Category breakdown - strictly numeric addition
  const categoryData = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const e of filteredExpenses) {
      const cat = e.category || 'غير محدد';
      if (!map[cat]) map[cat] = { count: 0, total: 0 };
      map[cat].count++;
      map[cat].total += getExpenseAmount(e);
    }
    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        count: val.count,
        total: Math.round(val.total),
        percentage: totalExpenseSum > 0 ? (val.total / totalExpenseSum) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, totalExpenseSum]);

  // Monthly / Period Trends - strictly numeric
  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredExpenses) {
      const d = getExpenseDate(e);
      const month = d ? d.substring(0, 7) : 'عام';
      map[month] = (map[month] || 0) + getExpenseAmount(e);
    }
    return Object.entries(map)
      .map(([month, amount]) => ({ month, amount: Math.round(amount) }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredExpenses]);

  // Expense vs Sales ratio
  const totalSalesInRange = useMemo(() => {
    return orders
      .filter(o => {
        if (o.status === 'cancelled') return false;
        const d = getOrderDate(o);
        if (fromDate && d && d < fromDate) return false;
        if (toDate && d && d > toDate) return false;
        return true;
      })
      .reduce((sum, o) => sum + getOrderAmount(o), 0);
  }, [orders, fromDate, toDate]);

  const expenseRatio = totalSalesInRange > 0 ? (totalExpenseSum / totalSalesInRange) * 100 : 0;

  // Date preset helper
  const handlePreset = (preset: 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_WEEK') => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      setFromDate(formatDate(startOfMonth));
      setToDate(formatDate(endOfMonth));
    } else if (preset === 'LAST_30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setFromDate(formatDate(thirtyDaysAgo));
      setToDate(formatDate(now));
    } else if (preset === 'THIS_WEEK') {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 6 ? 0 : -1);
      startOfWeek.setDate(diff);
      setFromDate(formatDate(startOfWeek));
      setToDate(formatDate(now));
    }
  };

  const isAllSelected = !fromDate && !toDate;

  return (
    <div className="space-y-6">
      {/* Date Filter & Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Quick Date Presets */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              type="button"
              onClick={() => handlePreset('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isAllSelected
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              كافة الفترات
            </button>
            <button
              type="button"
              onClick={() => handlePreset('THIS_MONTH')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer whitespace-nowrap"
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LAST_30_DAYS')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer whitespace-nowrap"
            >
              آخر 30 يوم
            </button>
            <button
              type="button"
              onClick={() => handlePreset('THIS_WEEK')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer whitespace-nowrap"
            >
              هذا الأسبوع
            </button>
          </div>

          <button
            onClick={onOpenNewExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer mr-auto"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>

        {/* Detailed Date Picker & Account Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-bold text-[11px]">من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-bold text-[11px]">إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs focus:outline-hidden"
            />
          </div>

          <select
            value={selectedAccountFilter}
            onChange={e => setSelectedAccountFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-bold"
          >
            <option value="all">كافة الحسابات والمحافظ</option>
            {accounts.map(acc => (
              <option key={acc.id} value={String(acc.id)}>
                {acc.name}
              </option>
            ))}
          </select>

          {(fromDate || toDate || selectedAccountFilter !== 'all') && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSelectedAccountFilter('all');
              }}
              className="text-xs text-rose-600 hover:underline cursor-pointer font-bold px-2 py-1"
            >
              إلغاء التصفية
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">إجمالي المصروفات (الفترة)</span>
          <div className="text-2xl font-black font-mono text-rose-600">
            {totalExpenseSum.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ر.ي</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {filteredExpenses.length} عملية صرف مسجلة
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">أعلى بند إنفاق</span>
          <div className="text-lg font-black text-slate-800 truncate">
            {categoryData[0]?.name || 'لا يوجد'}
          </div>
          <span className="text-[11px] text-rose-600 font-mono font-bold mt-1 block">
            {categoryData[0] ? `${categoryData[0].total.toLocaleString()} ر.ي (${Number.isFinite(categoryData[0].percentage) ? categoryData[0].percentage.toFixed(1) : '0.0'}%)` : '-'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">نسبة المصروفات من المبيعات</span>
          <div className="text-2xl font-black font-mono text-amber-600">
            {Number.isFinite(expenseRatio) ? expenseRatio.toFixed(1) : '0.0'}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            مبيعات الفترة: {totalSalesInRange.toLocaleString()} ر.ي
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">متوسط الصرف لكل بند</span>
          <div className="text-2xl font-black font-mono text-blue-600">
            {(filteredExpenses.length > 0 ? Math.round(totalExpenseSum / filteredExpenses.length) : 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">ر.ي</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            موزعة على {categoryData.length} بنود مختلفة
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-rose-500" />
              <span>توزيع المصروفات حسب البند</span>
            </h3>
            <span className="text-xs text-slate-400">النسبة المئوية</span>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              <PieIcon className="w-8 h-8 text-slate-300 mb-2" />
              <span>لا توجد بيانات مصروفات للفترة المحددة</span>
            </div>
          ) : (
            <div className="h-64 min-h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} ر.ي`, 'المبلغ']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryData.length > 0 && (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pt-2 border-t border-slate-100">
              {categoryData.map((cat, idx) => (
                <button
                  key={cat.name}
                  onClick={() => onFilterByCategory(cat.name)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-right transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-rose-600 truncate">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {Number.isFinite(cat.percentage) ? cat.percentage.toFixed(1) : '0.0'}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expense Trend Area Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>المسار الشهري والتراكمي للمصروفات</span>
            </h3>
            <span className="text-xs text-slate-400">حجم الإنفاق</span>
          </div>

          {trendData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <span>لا توجد بيانات اتجاهات للفترة المحددة</span>
            </div>
          ) : (
            <div className="h-64 min-h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} ر.ي`, 'إجمالي الإنفاق']} />
                  <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#expenseGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>إجمالي الفترات الممثلة: <strong>{trendData.length} شهور</strong></span>
            <span className="text-rose-600 font-bold font-mono">
              المتوسط الشهري: {trendData.length > 0 ? Math.round(totalExpenseSum / trendData.length).toLocaleString() : 0} ر.ي
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
