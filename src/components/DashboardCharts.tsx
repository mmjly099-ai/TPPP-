import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Order } from '../types';

interface DashboardChartsProps {
  orders: Order[];
  onNavigateToOrders: () => void;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  orders,
  onNavigateToOrders
}) => {
  // Compute monthly sales: Current month vs Previous month
  const salesComparison = useMemo(() => {
    // Determine reference date (most recent order or current date)
    let refDate = new Date();
    if (orders.length > 0) {
      const dates = orders
        .map(o => new Date(o.orderDate || o.createdAt).getTime())
        .filter(t => !isNaN(t));
      if (dates.length > 0) {
        refDate = new Date(Math.max(...dates));
      }
    }

    const currentYear = refDate.getFullYear();
    const currentMonth = refDate.getMonth(); // 0-indexed

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    let currentMonthSales = 0;
    let currentMonthOrdersCount = 0;
    let prevMonthSales = 0;
    let prevMonthOrdersCount = 0;

    orders.forEach(order => {
      const d = new Date(order.orderDate || order.createdAt);
      if (isNaN(d.getTime())) return;

      const amt = parseFloat(String(order.totalAmount || 0)) || 0;

      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        currentMonthSales += amt;
        currentMonthOrdersCount += 1;
      } else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
        prevMonthSales += amt;
        prevMonthOrdersCount += 1;
      }
    });

    const growthPercent =
      prevMonthSales > 0
        ? Math.round(((currentMonthSales - prevMonthSales) / prevMonthSales) * 100)
        : currentMonthSales > 0
        ? 100
        : 0;

    const data = [
      {
        month: monthNamesAr[prevMonth],
        fullName: `الشهر السابق (${monthNamesAr[prevMonth]})`,
        المبيعات: prevMonthSales,
        الطلبات: prevMonthOrdersCount
      },
      {
        month: monthNamesAr[currentMonth],
        fullName: `الشهر الحالي (${monthNamesAr[currentMonth]})`,
        المبيعات: currentMonthSales,
        الطلبات: currentMonthOrdersCount
      }
    ];

    return {
      data,
      currentMonthSales,
      prevMonthSales,
      growthPercent,
      currentMonthLabel: monthNamesAr[currentMonth],
      prevMonthLabel: monthNamesAr[prevMonth]
    };
  }, [orders]);

  // Compute Completed vs Pending Orders
  const ordersStatusData = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let processing = 0;
    let other = 0;

    orders.forEach(o => {
      const st = (o.status || '').trim();
      if (st === 'delivered' || st === 'مكتمل' || st === 'تم التوصيل' || st === 'completed') {
        completed += 1;
      } else if (st === 'pending' || st === 'معلق' || st === 'بانتظار التأكيد') {
        pending += 1;
      } else if (st === 'processing' || st === 'قيد التجهيز' || st === 'shipped' || st === 'تم الشحن') {
        processing += 1;
      } else {
        other += 1;
      }
    });

    return [
      { name: 'مكتملة', value: completed, color: '#10b981' },
      { name: 'معلقة / انتظار', value: pending, color: '#f59e0b' },
      { name: 'قيد التجهيز / الشحن', value: processing, color: '#3b82f6' }
    ].filter(item => item.value > 0);
  }, [orders]);

  const totalTrackedOrders = orders.length;
  const completedCount = ordersStatusData.find(d => d.name === 'مكتملة')?.value || 0;
  const pendingCount = ordersStatusData.find(d => d.name.includes('معلقة'))?.value || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly Sales Comparison Bar Chart */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  مقارنة المبيعات: الشهر الحالي مقابل السابق
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                إجمالي قيمة المبيعات بالريال مع مؤشر النمو بين {salesComparison.prevMonthLabel} و {salesComparison.currentMonthLabel}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-sans">نسبة التغير</span>
                <span
                  className={`text-xs font-black font-mono flex items-center gap-0.5 ${
                    salesComparison.growthPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {salesComparison.growthPercent >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  )}
                  {salesComparison.growthPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesComparison.data}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="fullName"
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'inherit' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ريال`, 'إجمالي المبيعات']}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    direction: 'rtl'
                  }}
                />
                <Bar
                  dataKey="المبيعات"
                  radius={[8, 8, 0, 0]}
                  fill="#059669"
                >
                  {salesComparison.data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 1 ? '#059669' : '#94a3b8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer info pills */}
        <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
            <span className="text-slate-500 font-medium">مبيعات {salesComparison.prevMonthLabel}:</span>
            <span className="font-mono font-bold text-slate-700">
              {salesComparison.prevMonthSales.toLocaleString()} ريال
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
            <span className="text-emerald-800 font-medium">مبيعات {salesComparison.currentMonthLabel}:</span>
            <span className="font-mono font-bold text-emerald-950">
              {salesComparison.currentMonthSales.toLocaleString()} ريال
            </span>
          </div>
        </div>
      </div>

      {/* Completed vs Pending Orders Doughnut Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  حالة الطلبات
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                المكتملة مقابل المعلقة وقيد التجهيز
              </p>
            </div>
            <button
              onClick={onNavigateToOrders}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          {/* Doughnut Chart */}
          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ordersStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} طلب`, name]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    direction: 'rtl'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black font-mono text-slate-800">
                {totalTrackedOrders}
              </span>
              <span className="text-[10px] text-slate-400">إجمالي الطلبات</span>
            </div>
          </div>
        </div>

        {/* Legend / Breakdown List */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-700 font-medium">الطلبات المكتملة</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold font-mono text-slate-900">{completedCount}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({totalTrackedOrders > 0 ? Math.round((completedCount / totalTrackedOrders) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-amber-50/70 border border-amber-200/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-amber-900 font-medium">المعلقة وبانتظار التأكيد</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold font-mono text-amber-950">{pendingCount}</span>
              <span className="text-[10px] text-amber-700 font-mono">
                ({totalTrackedOrders > 0 ? Math.round((pendingCount / totalTrackedOrders) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
