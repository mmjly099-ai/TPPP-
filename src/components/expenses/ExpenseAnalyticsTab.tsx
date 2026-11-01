import React, { useState, useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Receipt,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Printer,
  FileSpreadsheet,
  Building,
  CreditCard,
  Truck,
  Zap,
  Users,
  Coffee,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Percent,
  Layers,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Expense, Order, Account } from '../../types';
import topStoreLogo from '../../assets/logo';

interface ExpenseAnalyticsTabProps {
  expenses: Expense[];
  orders: Order[];
  accounts: Account[];
  onOpenNewExpense?: () => void;
  onFilterByCategory?: (category: string) => void;
}

type TimeRangeFilter = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR';

const CATEGORY_COLORS: Record<string, string> = {
  'تشغيل': '#3b82f6',
  'إنترنت': '#6366f1',
  'شحن ونقل لوجستي': '#8b5cf6',
  'شحن': '#8b5cf6',
  'قات': '#10b981',
  'مواصلات': '#f59e0b',
  'تسويق': '#ec4899',
  'عشاء': '#14b8a6',
  'مصاريف عمال': '#f97316',
  'مصاريف أخرى': '#64748b',
  'نثريات': '#94a3b8',
  'رسوم تحويل': '#eab308',
  'رسوم بنكية': '#eab308',
  'أخرى': '#64748b'
};

const DEFAULT_COLOR = '#64748b';

export const ExpenseAnalyticsTab: React.FC<ExpenseAnalyticsTabProps> = ({
  expenses,
  orders,
  accounts,
  onOpenNewExpense,
  onFilterByCategory
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');

  // Filter expenses by time and account
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.filter(e => {
      if (e.status === 'cancelled') return false;

      // Filter by account
      if (selectedAccountFilter !== 'ALL' && String(e.accountId) !== selectedAccountFilter) {
        return false;
      }

      if (timeRange === 'ALL') return true;

      const dateStr = e.expenseDate || e.date;
      if (!dateStr) return true;

      const expDate = new Date(dateStr);
      if (isNaN(expDate.getTime())) return true;

      if (timeRange === 'THIS_MONTH') {
        return expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;
      }

      if (timeRange === 'LAST_MONTH') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return expDate.getFullYear() === lastMonthYear && expDate.getMonth() === lastMonth;
      }

      if (timeRange === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return expDate >= thirtyDaysAgo && expDate <= now;
      }

      if (timeRange === 'THIS_YEAR') {
        return expDate.getFullYear() === currentYear;
      }

      return true;
    });
  }, [expenses, timeRange, selectedAccountFilter]);

  // Overall Financial KPIs
  const kpis = useMemo(() => {
    const totalSpent = filteredExpenses.reduce((sum, e) => sum + (parseFloat(String(e.amount)) || 0), 0);
    const count = filteredExpenses.length;
    const avgExpense = count > 0 ? Math.round(totalSpent / count) : 0;

    // Split Logistics vs Operations vs Personal/Daily
    let logisticsTotal = 0;
    let operationsTotal = 0;
    let personalDailyTotal = 0;

    filteredExpenses.forEach(e => {
      const amt = parseFloat(String(e.amount)) || 0;
      const cat = e.category || '';
      if (cat === 'شحن ونقل لوجستي' || cat === 'شحن' || String(e.expenseNumber || '').startsWith('EXP-SHP-')) {
        logisticsTotal += amt;
      } else if (cat === 'قات' || cat === 'عشاء' || cat === 'مواصلات') {
        personalDailyTotal += amt;
      } else {
        operationsTotal += amt;
      }
    });

    // Related sales
    const totalSales = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const expenseToSalesRatio = totalSales > 0 ? ((totalSpent / totalSales) * 100).toFixed(1) : '0';

    return {
      totalSpent,
      count,
      avgExpense,
      logisticsTotal,
      operationsTotal,
      personalDailyTotal,
      totalSales,
      expenseToSalesRatio
    };
  }, [filteredExpenses, orders]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number; max: number; topDesc: string }> = {};

    filteredExpenses.forEach(e => {
      const cat = e.category || 'أخرى';
      const amt = parseFloat(String(e.amount)) || 0;

      if (!map[cat]) {
        map[cat] = { total: 0, count: 0, max: 0, topDesc: '' };
      }
      map[cat].total += amt;
      map[cat].count += 1;
      if (amt > map[cat].max) {
        map[cat].max = amt;
        map[cat].topDesc = e.description || '';
      }
    });

    const total = kpis.totalSpent || 1;

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        max: data.max,
        topDesc: data.topDesc,
        percentage: Number(((data.total / total) * 100).toFixed(1)),
        color: CATEGORY_COLORS[name] || DEFAULT_COLOR
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, kpis.totalSpent]);

  // Account / Source Breakdown
  const accountBreakdown = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};

    filteredExpenses.forEach(e => {
      const accId = e.accountId ? String(e.accountId) : 'unknown';
      const matchedAcc = accounts.find(a => String(a.id) === accId);
      const accName = matchedAcc ? matchedAcc.name : (e.accountName || 'الصندوق الرئيسي');
      const amt = parseFloat(String(e.amount)) || 0;

      if (!map[accName]) {
        map[accName] = { name: accName, total: 0, count: 0 };
      }
      map[accName].total += amt;
      map[accName].count += 1;
    });

    const total = kpis.totalSpent || 1;

    return Object.values(map)
      .map(item => ({
        ...item,
        percentage: Number(((item.total / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, accounts, kpis.totalSpent]);

  // Top Payees / Vendors
  const topPayees = useMemo(() => {
    const map: Record<string, { total: number; count: number; category: string }> = {};

    filteredExpenses.forEach(e => {
      const vendor = (e.vendorName || e.beneficiaryName || '').trim();
      if (!vendor) return;

      const amt = parseFloat(String(e.amount)) || 0;
      if (!map[vendor]) {
        map[vendor] = { total: 0, count: 0, category: e.category || 'نثريات' };
      }
      map[vendor].total += amt;
      map[vendor].count += 1;
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        category: data.category
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredExpenses]);

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredExpenses.map((e, idx) => ({
      '#': idx + 1,
      'رقم المصروف': e.expenseNumber,
      'التاريخ': e.expenseDate || e.date,
      'التصنيف': e.category,
      'البيان': e.description,
      'المبلغ (YER)': Number(e.amount) || 0,
      'المستفيد/المورد': e.vendorName || e.beneficiaryName || '-',
      'الحساب المسدد منه': e.accountName || accounts.find(a => a.id === e.accountId)?.name || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تحليل المصروفات');
    XLSX.writeFile(wb, `TopStore_Expense_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">

      {/* Printable Header - Visible Only when printing */}
      <div className="hidden print:flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-6" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white p-1 border-2 border-[#C5A059] shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
            <img src={topStoreLogo} alt="TOP STORE" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">TOP STORE | تقرير تحليل المصروفات المالي</h1>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">سلتك اكيد TOP • تحليل هيكل النفقات والمصاريف التشغيلية</p>
          </div>
        </div>
        <div className="text-left font-mono text-xs text-slate-600">
          <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</div>
          <div>الفترة: {timeRange === 'ALL' ? 'كافة الفترات' : timeRange}</div>
        </div>
      </div>

      {/* 1. Filter & Actions Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 font-bold ml-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            الفترة:
          </span>
          {[
            { id: 'ALL', label: 'كل الفترات' },
            { id: 'THIS_MONTH', label: 'هذا الشهر' },
            { id: 'LAST_MONTH', label: 'الشهر الماضي' },
            { id: 'LAST_30_DAYS', label: 'آخر 30 يوم' },
            { id: 'THIS_YEAR', label: 'هذا العام' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id as TimeRangeFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === t.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Account Filter & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedAccountFilter}
            onChange={e => setSelectedAccountFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 font-bold text-slate-700 focus:outline-hidden focus:border-rose-500"
          >
            <option value="ALL">جميع الحسابات والصناديق</option>
            {accounts.map(acc => (
              <option key={acc.id} value={String(acc.id)}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            title="تصدير إلى إكسل"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="طباعة تقرير التحليل"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>طباعة A4</span>
          </button>
        </div>

      </div>

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Spent */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">إجمالي المصروفات الكلية</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-rose-600">
              {kpis.totalSpent.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{kpis.count} بند مسجل</span>
            <span className="text-rose-700 font-bold font-mono">
              {kpis.expenseToSalesRatio}% من المبيعات
            </span>
          </div>
        </div>

        {/* Operational & General */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">المصاريف التشغيلية العامة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-blue-900">
              {kpis.operationsTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>إنترنت، تشغيل، تسويق، رسوم</span>
            <span className="font-bold text-blue-700">
              {kpis.totalSpent > 0 ? ((kpis.operationsTotal / kpis.totalSpent) * 100).toFixed(0) : 0}% من النفقات
            </span>
          </div>
        </div>

        {/* Logistics & Shipping */}
        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-xs bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">الشحن واللوجستيات والنقل</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-purple-900">
              {kpis.logisticsTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>شحن خارجي، مخلصين، نقل</span>
            <span className="font-bold text-purple-700">
              {kpis.totalSpent > 0 ? ((kpis.logisticsTotal / kpis.totalSpent) * 100).toFixed(0) : 0}% من النفقات
            </span>
          </div>
        </div>

        {/* Personal & Daily */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">اليوميات (قات، عشاء، مواصلات)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-emerald-900">
              {kpis.personalDailyTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>متوسط البند: {kpis.avgExpense.toLocaleString()} ريال</span>
            <span className="font-bold text-emerald-700">
              {kpis.totalSpent > 0 ? ((kpis.personalDailyTotal / kpis.totalSpent) * 100).toFixed(0) : 0}% من النفقات
            </span>
          </div>
        </div>

      </div>

      {/* 3. Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Donut Chart: Categories */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <Receipt className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  هيكل النفقات حسب التصنيف
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                {categoryBreakdown.length} تصنيفات
              </span>
            </div>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="total"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cat-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} ريال`, name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', direction: 'rtl' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mini Legend List */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 max-h-44 overflow-y-auto">
            {categoryBreakdown.slice(0, 5).map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs p-1 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="font-bold text-slate-900">{item.total.toLocaleString()} ريال</span>
                  <span className="text-[10px] text-slate-400">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Top Categories Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  مقارنة أحجام الإنفاق حسب التصنيفات الرئيسية
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">مرتبة تنازلياً</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown.slice(0, 7)} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} ريال`, 'إجمالي الإنفاق']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', direction: 'rtl' }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {categoryBreakdown.slice(0, 7).map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100">
            <span>أعلى تصنيف إنفاق: <strong className="text-slate-900">{categoryBreakdown[0]?.name || '-'}</strong> ({categoryBreakdown[0]?.total.toLocaleString()} ريال)</span>
            <span className="text-emerald-700 font-bold">نسبة التغطية: 100% مسجلة وموثقة</span>
          </div>
        </div>

      </div>

      {/* 4. Category Deep-Dive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              جدول التحليل التفصيلي لكافة بنود وتصنيفات المصاريف
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {categoryBreakdown.length} تصنيف نشط
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4 text-center">العمليات</th>
                <th className="py-3 px-4">الإجمالي (YER)</th>
                <th className="py-3 px-4">النسبة المئوية</th>
                <th className="py-3 px-4">أعلى عملية مسجلة</th>
                <th className="py-3 px-4 text-center print:hidden">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryBreakdown.map((cat, idx) => (
                <tr key={cat.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                    {cat.count}
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-rose-700 text-sm">
                    {cat.total.toLocaleString()} ريال
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                        <span>{cat.percentage}%</span>
                      </div>
                      <div className="w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="font-mono text-xs font-bold text-slate-800">
                      {cat.max.toLocaleString()} ريال
                    </div>
                    {cat.topDesc && (
                      <span className="text-[10px] text-slate-400 block truncate max-w-xs">{cat.topDesc}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center print:hidden">
                    {onFilterByCategory && (
                      <button
                        onClick={() => onFilterByCategory(cat.name)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                      >
                        عرض البنود
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Payment Accounts Source & Top Payees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Account Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CreditCard className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                قنوات وحسابات الصرف (من أين خرجت الأموال؟)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {accountBreakdown.length} حسابات
            </span>
          </div>

          <div className="space-y-2.5">
            {accountBreakdown.map(acc => (
              <div key={acc.name} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    {acc.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <strong className="font-black text-rose-700">{acc.total.toLocaleString()} ريال</strong>
                    <span className="text-[10px] text-slate-400">({acc.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 rounded-full"
                    style={{ width: `${Math.min(acc.percentage, 100)}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>عدد عمليات الصرف: {acc.count}</span>
                  <span>متوسط العملية: {Math.round(acc.total / (acc.count || 1)).toLocaleString()} ريال</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendors / Payees */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                أبرز الجهات والموردين استلاماً للمدفوعات
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">أعلى 6 جهات</span>
          </div>

          {topPayees.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              لا توجد بيانات مستفيدين مسجلة بالأسماء حتى الآن
            </div>
          ) : (
            <div className="space-y-2">
              {topPayees.map((payee, i) => (
                <div key={payee.name} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-mono font-bold flex items-center justify-center text-[11px]">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{payee.name}</span>
                      <span className="text-[10px] text-slate-400">{payee.category} • {payee.count} مدفوعات</span>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <strong className="text-slate-900 font-bold block">{payee.total.toLocaleString()} ريال</strong>
                    <span className="text-[10px] text-slate-400">
                      {kpis.totalSpent > 0 ? ((payee.total / kpis.totalSpent) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Tip / Financial Safety */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">توجيه مالي لضبط التكاليف:</strong>
              <span>
                تعتبر مصاريف الشحن اللوجستي والتشغيل أعلى بنود التكلفة لديك. الاستمرار في توثيق سندات الصرف يضمن دقة حساب الأرباح الصافية بدقة 100%.
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
