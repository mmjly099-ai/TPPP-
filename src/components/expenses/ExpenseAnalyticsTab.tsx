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

  return (
    <div className="space-y-6">
      {/* Date Filter & Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-bold">من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-transparent text-slate-800 text-xs focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 font-bold">إلى:</span>
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
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
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
              className="text-xs text-rose-600 hover:underline cursor-pointer font-bold"
            >
              إلغاء التصفية
            </button>
          )}
        </div>

        <button
          onClick={onOpenNewExpense}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل مصروف جديد</span>
        </button>
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

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
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
