import React, { useState, useMemo } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Trophy,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Percent,
  Plus,
  Bike
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
  Legend
} from 'recharts';
import { useStore } from '../../context/StoreContext';
import { DeliveryOrder, Courier, CourierSettlement } from '../../types';

interface CourierDashboardTabProps {
  onNavigateTab: (tab: 'dashboard' | 'orders' | 'couriers' | 'settlements' | 'wallets' | 'reports' | 'audit') => void;
  onOpenNewOrder: () => void;
  onOpenSettlement: () => void;
  onOpenReceiveCash: () => void;
}

export const CourierDashboardTab: React.FC<CourierDashboardTabProps> = ({
  onNavigateTab,
  onOpenNewOrder,
  onOpenSettlement,
  onOpenReceiveCash
}) => {
  const { deliveryOrders = [], couriers = [], courierSettlements = [] } = useStore();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Filter delivery orders and settlements based on period
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const isMatch = (dateStr?: string) => {
      if (!dateStr || period === 'all') return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      if (period === 'today') {
        return dateStr.startsWith(todayStr);
      }
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      }
      if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return d >= monthAgo;
      }
      return true;
    };

    const periodOrders = deliveryOrders.filter(o => isMatch(o.dispatchDate || o.createdAt));
    const periodSettlements = courierSettlements.filter(s => isMatch(s.paymentDate || s.createdAt));

    return {
      orders: periodOrders,
      settlements: periodSettlements
    };
  }, [deliveryOrders, courierSettlements, period]);

  // Statistics calculation
  const stats = useMemo(() => {
    const orders = filteredData.orders;
    const totalOrders = orders.length;

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const deliveredCount = deliveredOrders.length;

    const inDeliveryOrders = orders.filter(
      o => o.status === 'out_for_delivery' || o.status === 'received_by_courier' || o.status === 'pending_dispatch'
    );
    const inDeliveryCount = inDeliveryOrders.length;

    const failedOrReturned = orders.filter(
      o => o.status === 'delivery_failed' || o.status === 'returned' || o.status === 'cancelled'
    );
    const failedCount = failedOrReturned.length;

    const successRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

    // Couriers
    const activeCouriers = couriers.filter(c => c.status === 'active' || c.status === 'available');

    // Courier performance map in this period
    const courierDeliveredMap: Record<number, number> = {};
    deliveredOrders.forEach(o => {
      courierDeliveredMap[o.courierId] = (courierDeliveredMap[o.courierId] || 0) + 1;
    });

    let topCourier: Courier | null = null;
    let maxDelivered = 0;
    couriers.forEach(c => {
      const count = courierDeliveredMap[c.id] || c.deliveredOrdersCount || 0;
      if (count > maxDelivered) {
        maxDelivered = count;
        topCourier = c;
      }
    });

    // Financial breakdown (Separated from brokerage profit!)
    // 1. Cash collected by couriers:
    const cashCollectedFees = orders
      .filter(o => o.collectionStatus === 'collected_cash' || (o.collectionMethod === 'cash_to_courier' && o.status === 'delivered'))
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    // Current unremitted cash custody across couriers:
    const currentTotalCustody = couriers.reduce((sum, c) => sum + (Number(c.currentCustodyBalance) || 0), 0);

    // 2. Transferred to store wallets:
    const walletTransferredFees = orders
      .filter(o => o.collectionStatus === 'transferred_to_wallet' || o.collectionMethod === 'transfer_to_wallet')
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    // 3. Paid out to couriers from wallets (settlements confirmed):
    const totalPaidToCouriers = filteredData.settlements
      .filter(s => s.status === 'confirmed')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // 4. Pending / unsettled courier payables:
    const totalPendingPayables = couriers.reduce((sum, c) => sum + (Number(c.currentPayableBalance) || 0), 0);

    return {
      totalOrders,
      deliveredCount,
      inDeliveryCount,
      failedCount,
      successRate,
      activeCouriersCount: activeCouriers.length,
      topCourier,
      topCourierDeliveries: maxDelivered,
      cashCollectedFees,
      currentTotalCustody,
      walletTransferredFees,
      totalPaidToCouriers,
      totalPendingPayables
    };
  }, [filteredData, couriers]);

  // Chart 1: Status Distribution
  const statusPieData = useMemo(() => [
    { name: 'تم التسليم بنجاح', value: stats.deliveredCount, color: '#10B981' },
    { name: 'قيد التوصيل والترحيل', value: stats.inDeliveryCount, color: '#3B82F6' },
    { name: 'تعذر / مرتجع / ملغي', value: stats.failedCount, color: '#EF4444' }
  ].filter(d => d.value > 0), [stats]);

  // Chart 2: Fee Collections Method
  const feeBarData = useMemo(() => [
    { name: 'نقدية بعهدة الموصل', amount: stats.cashCollectedFees, color: '#F59E0B' },
    { name: 'محولة لمحافظ الإدارة', amount: stats.walletTransferredFees, color: '#1A3668' },
    { name: 'مدفوعة للموصلين من المحافظ', amount: stats.totalPaidToCouriers, color: '#10B981' }
  ], [stats]);

  // Chart 3: Couriers Deliveries Ranking
  const courierRankingData = useMemo(() => {
    return couriers.map(c => {
      const delivered = filteredData.orders.filter(o => o.courierId === c.id && o.status === 'delivered').length;
      return {
        name: c.name,
        delivered: delivered || (c.deliveredOrdersCount || 0),
        custody: Number(c.currentCustodyBalance) || 0,
        payable: Number(c.currentPayableBalance) || 0
      };
    }).sort((a, b) => b.delivered - a.delivered).slice(0, 6);
  }, [couriers, filteredData.orders]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Period Selector */}
      <div className="bg-gradient-to-r from-[#1A3668] via-[#234885] to-[#1A3668] rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#C5A059] text-xs font-bold mb-2">
              <Bike className="w-3.5 h-3.5" />
              TOP STORE • لوحة مؤشرات التوزيع وتسليم الطلبات
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              إدارة الموصّلين وحسابات التوصيل المنفصلة
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 font-medium mt-1">
              فصل محاسبي كامل لأجور التوصيل والعهد النقدية عن إيرادات وساطة شي إن
            </p>
          </div>

          {/* Quick Actions & Period Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/20 flex items-center">
              <button
                onClick={() => setPeriod('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === 'today' ? 'bg-[#C5A059] text-slate-950 shadow-sm' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                اليوم
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === 'week' ? 'bg-[#C5A059] text-slate-950 shadow-sm' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                هذا الأسبوع
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === 'month' ? 'bg-[#C5A059] text-slate-950 shadow-sm' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                هذا الشهر
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === 'all' ? 'bg-[#C5A059] text-slate-950 shadow-sm' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                الكل
              </button>
            </div>

            <button
              onClick={onOpenNewOrder}
              className="px-4 py-2 bg-[#C5A059] hover:bg-[#d6b063] text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إسناد طلب جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (10 Required Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Metric 1: Total Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#1A3668]/30 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">إجمالي الطلبات المسندة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1A3668] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {stats.totalOrders} <span className="text-xs text-slate-500 font-medium">طلب</span>
          </div>
          <div className="text-[11px] text-blue-600 font-bold mt-1">
            موزعة على {stats.activeCouriersCount} موصّلين
          </div>
        </div>

        {/* Metric 2: Delivered Successfully */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">تم التسليم بنجاح</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {stats.deliveredCount} <span className="text-xs text-slate-500 font-medium">طلب</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
            <Percent className="w-3 h-3" />
            نسبة النجاح {stats.successRate}%
          </div>
        </div>

        {/* Metric 3: In Delivery */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">قيد التوصيل والترحيل</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            {stats.inDeliveryCount} <span className="text-xs text-slate-500 font-medium">طلب</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            مع الموصلين في الميدان
          </div>
        </div>

        {/* Metric 4: Failed / Returned */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">تعذّر تسليمه / مرتجع</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">
            {stats.failedCount} <span className="text-xs text-slate-500 font-medium">طلب</span>
          </div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">
            تتطلب متابعة أو إعادة جدولة
          </div>
        </div>

        {/* Metric 5: Active Couriers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">الموصّلون النشطون</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600">
            {stats.activeCouriersCount} <span className="text-xs text-slate-500 font-medium">موصل</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            من إجمالي {couriers.length} مسجلين
          </div>
        </div>

        {/* Metric 6: Top Courier */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-gradient-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-amber-900">أكثر موصل توصيلاً</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 truncate">
            {stats.topCourier ? (stats.topCourier as Courier).name : 'لا يوجد'}
          </div>
          <div className="text-[11px] text-amber-800 font-bold mt-1">
            {stats.topCourierDeliveries} طلب تم تسليمه بنجاح
          </div>
        </div>

        {/* Metric 7: Cash Collected Fees */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">أجور محصلة نقداً</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-700">
            {stats.cashCollectedFees.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </div>
          <div className="text-[11px] text-slate-600 font-bold mt-1">
            العهدة الحالية بالذمة: {stats.currentTotalCustody.toLocaleString()} ريال
          </div>
        </div>

        {/* Metric 8: Transferred to Wallets */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">أجور محولة للمحافظ</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1A3668] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-[#1A3668]">
            {stats.walletTransferredFees.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </div>
          <div className="text-[11px] text-blue-700 font-bold mt-1">
            تحويلات العميلات بمحافظ توب ستور
          </div>
        </div>

        {/* Metric 9: Paid Out to Couriers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مدفوع للموصلين من المحافظ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700">
            {stats.totalPaidToCouriers.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-bold mt-1">
            تسويات معتمدة ومصروفة
          </div>
        </div>

        {/* Metric 10: Pending Payables */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مستحقات غير مسواة للموصلين</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-700">
            {stats.totalPendingPayables.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </div>
          <div className="text-[11px] text-purple-800 font-bold mt-1">
            مستحقة للموصلين بذمة الإدارة
          </div>
        </div>

      </div>

      {/* Smart Alerts Box */}
      {(stats.currentTotalCustody > 0 || stats.failedCount > 0 || stats.totalPendingPayables > 0) && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-950 block">تنبيهات العمليات الجارية:</span>
              <p className="text-amber-900 mt-0.5">
                توجد عهد نقدية بـ <strong>{stats.currentTotalCustody.toLocaleString()} ريال</strong> في ذمة الموصلين،
                و <strong>{stats.totalPendingPayables.toLocaleString()} ريال</strong> مستحقات غير مسواة،
                و <strong>{stats.failedCount}</strong> طلبات بحاجة لمراجعة حالة التسليم.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenReceiveCash}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer transition shadow-xs"
            >
              استلام نقدية من موصل
            </button>
            <button
              onClick={onOpenSettlement}
              className="px-3 py-1.5 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl cursor-pointer transition shadow-xs"
            >
              تسوية مستحقات موصل
            </button>
          </div>
        </div>
      )}

      {/* Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Chart 1: Delivery Status Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900">توزيع حالات طلبات التوصيل</h3>
              <p className="text-xs text-slate-500">نسب الإنجاز والتعثر وفق الفترة المحددة</p>
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg">
              {stats.totalOrders} طلب
            </span>
          </div>

          <div className="h-64 w-full">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} طلب`, 'العدد']}
                    contentStyle={{ borderRadius: '12px', direction: 'rtl', textAlign: 'right' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                لا توجد طلبات توصيل مسجلة في هذه الفترة
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Fee Collections & Outflows */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-900">حركة أجور التوصيل والتحصيل</h3>
              <p className="text-xs text-slate-500">النقدية مع الموصلين مقابل تحويلات المحافظ والتسويات</p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
              حسابات توصيل مستقلة
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeBarData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ريال`, 'المبلغ']}
                  contentStyle={{ borderRadius: '12px', direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="amount" fill="#1A3668" radius={[8, 8, 0, 0]}>
                  {feeBarData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Couriers Ranking Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-slate-900">أداء وترتيب الموصّلين</h3>
            <p className="text-xs text-slate-500">عدد الطلبات المسلّمة بنجاح، العهد النقدية، والمستحقات</p>
          </div>
          <button
            onClick={() => onNavigateTab('couriers')}
            className="text-xs text-[#1A3668] hover:text-[#234885] font-bold hover:underline cursor-pointer"
          >
            عرض كافة الموصلين ({couriers.length}) ←
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold">الترتيب</th>
                <th className="py-2.5 px-3 font-bold">اسم الموصل</th>
                <th className="py-2.5 px-3 font-bold">الطلبات المسلمة</th>
                <th className="py-2.5 px-3 font-bold">العهدة النقدية الحالية</th>
                <th className="py-2.5 px-3 font-bold">المستحقات غير المسواة</th>
                <th className="py-2.5 px-3 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courierRankingData.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-black text-slate-700">
                    {idx === 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] font-black">
                        🥇 الأول
                      </span>
                    ) : idx === 1 ? (
                      <span className="text-slate-500 font-bold">🥈 الثاني</span>
                    ) : idx === 2 ? (
                      <span className="text-amber-700 font-bold">🥉 الثالث</span>
                    ) : (
                      `#${idx + 1}`
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-3 font-bold text-emerald-600">
                    {c.delivered} <span className="text-slate-400 font-normal">طلب</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-amber-700">
                    {c.custody > 0 ? `${c.custody.toLocaleString()} ريال` : 'لا توجد عهدة'}
                  </td>
                  <td className="py-3 px-3 font-bold text-purple-700">
                    {c.payable > 0 ? `${c.payable.toLocaleString()} ريال` : 'مسواة بالكامل'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onNavigateTab('couriers')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-[#1A3668] hover:text-white rounded-lg text-[11px] font-bold text-slate-700 transition cursor-pointer"
                    >
                      فتح الملف
                    </button>
                  </td>
                </tr>
              ))}
              {courierRankingData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    لا يوجد موصلون مسجلون حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
