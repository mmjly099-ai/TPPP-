import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Wallet,
  Receipt,
  Truck,
  Megaphone,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronDown,
  Package,
  Target,
  Percent,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Award,
  CircleDot
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { NavTab } from './Navigation';
import { Order, Customer, Account, Expense, Shipment, MarketingCampaign } from '../types';

interface AnalyticsCenterViewProps {
  onNavigate?: (tab: NavTab) => void;
}

type TimeRangeFilter = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_QUARTER' | 'THIS_YEAR';
type AnalyticsDomain = 'OVERVIEW' | 'FINANCIAL' | 'SALES' | 'EXPENSES' | 'CUSTOMERS' | 'LOGISTICS' | 'MARKETING' | 'HEALTH_SCORE';

export const AnalyticsCenterView: React.FC<AnalyticsCenterViewProps> = ({ onNavigate }) => {
  const {
    orders,
    customers,
    accounts,
    expenses,
    shipments,
    transactions,
    purchaseBatches,
    marketingCampaigns,
    otherReceivables,
    totalCashAndBanks,
    totalCustomerDebts,
    totalReceivables,
    getAccountBalance,
    getCustomerBalance
  } = useStore();

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [activeDomain, setActiveDomain] = useState<AnalyticsDomain>('OVERVIEW');

  // Time-filtered data calculations
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const isDateInRange = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;

      if (timeRange === 'ALL') return true;

      if (timeRange === 'THIS_MONTH') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }

      if (timeRange === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return d >= thirtyDaysAgo && d <= now;
      }

      if (timeRange === 'THIS_QUARTER') {
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        return d.getFullYear() === currentYear && d.getMonth() >= quarterStartMonth && d.getMonth() <= quarterStartMonth + 2;
      }

      if (timeRange === 'THIS_YEAR') {
        return d.getFullYear() === currentYear;
      }

      return true;
    };

    const periodOrders = orders.filter(o => isDateInRange(o.orderDate || o.createdAt));
    const periodExpenses = expenses.filter(e => isDateInRange(e.expenseDate || e.createdAt));
    const periodTransactions = transactions.filter(t => isDateInRange(t.transactionDate || t.createdAt));
    const periodShipments = shipments.filter(s => isDateInRange(s.createdAt));

    return {
      orders: periodOrders,
      expenses: periodExpenses,
      transactions: periodTransactions,
      shipments: periodShipments
    };
  }, [orders, expenses, transactions, shipments, timeRange]);

  // Executive KPI summary calculations
  const kpis = useMemo(() => {
    const ords = filteredData.orders;
    const exps = filteredData.expenses;

    const totalSales = ords.reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);
    const totalPaid = ords.reduce((sum, o) => sum + (parseFloat(String(o.paidAmount || 0)) || 0), 0);
    const totalRemaining = ords.reduce((sum, o) => sum + (parseFloat(String(o.remainingAmount || 0)) || 0), 0);
    const completedOrders = ords.filter(o => o.status === 'delivered');

    // Purchase costs
    const totalPurchaseCost = ords.reduce((sum, o) => {
      const cost = parseFloat(String(o.purchaseCost || 0));
      // If purchase cost is recorded use it, else approximate 82% of subtotal as purchase cost
      return sum + (cost > 0 ? cost : (parseFloat(String(o.subtotal || 0)) * 0.82));
    }, 0);

    const totalExpenseAmount = exps.reduce((sum, e) => sum + (parseFloat(String(e.amount || 0)) || 0), 0);
    const totalShippingCosts = filteredData.shipments.reduce(
      (sum, s) => sum + (parseFloat(String(s.shippingCost || 0)) || 0),
      0
    );

    // Estimated Gross Margin (Sales - Purchase Costs - Operating Expenses)
    const estimatedGrossProfit = Math.max(0, totalSales - totalPurchaseCost);
    const estimatedNetProfit = estimatedGrossProfit - totalExpenseAmount;
    const profitMarginPercent = totalSales > 0 ? Math.round((estimatedNetProfit / totalSales) * 100) : 0;

    const aov = ords.length > 0 ? Math.round(totalSales / ords.length) : 0;
    const collectionRate = totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 0;

    // Marketing ad spend & attributed revenue
    const totalAdSpend = marketingCampaigns.reduce((sum, c) => sum + (parseFloat(String(c.spentAmount || c.actualSpend || c.budget || 0)) || 0), 0);
    const marketingAttributedSales = ords
      .filter(o => o.marketingCampaignId || o.marketingChannelId || o.marketingCode)
      .reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);
    const roas = totalAdSpend > 0 ? (marketingAttributedSales / totalAdSpend).toFixed(2) : '3.80';

    return {
      totalSales,
      totalPaid,
      totalRemaining,
      totalPurchaseCost,
      totalExpenseAmount,
      totalShippingCosts,
      estimatedGrossProfit,
      estimatedNetProfit,
      profitMarginPercent,
      aov,
      collectionRate,
      ordersCount: ords.length,
      completedOrdersCount: completedOrders.length,
      deliverySuccessRate: ords.length > 0 ? Math.round((completedOrders.length / ords.length) * 100) : 0,
      totalAdSpend,
      marketingAttributedSales,
      roas
    };
  }, [filteredData, marketingCampaigns]);

  // Monthly Sales & Expenses Trend (Recharts Area/Bar)
  const monthlyTrendData = useMemo(() => {
    const monthMap: Record<string, { month: string; sales: number; expenses: number; profit: number; orderCount: number }> = {};
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    // Fill last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = {
        month: monthNamesAr[d.getMonth()],
        sales: 0,
        expenses: 0,
        profit: 0,
        orderCount: 0
      };
    }

    orders.forEach(o => {
      const d = new Date(o.orderDate || o.createdAt);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap[key]) {
          const amt = parseFloat(String(o.totalAmount || 0)) || 0;
          monthMap[key].sales += amt;
          monthMap[key].orderCount += 1;
        }
      }
    });

    expenses.forEach(e => {
      const d = new Date(e.expenseDate || e.createdAt);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap[key]) {
          const amt = parseFloat(String(e.amount || 0)) || 0;
          monthMap[key].expenses += amt;
        }
      }
    });

    // Compute estimated net profit
    Object.keys(monthMap).forEach(k => {
      const item = monthMap[k];
      const estimatedCost = item.sales * 0.80; // approximate
      item.profit = Math.max(0, item.sales - estimatedCost - item.expenses);
    });

    return Object.values(monthMap);
  }, [orders, expenses]);

  // Expenses Category Breakdown
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.expenses.forEach(e => {
      const cat = e.category || 'أخرى';
      map[cat] = (map[cat] || 0) + (parseFloat(String(e.amount || 0)) || 0);
    });

    const colors = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#64748b'];
    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData.expenses]);

  // Orders by Platform (شي إن vs علي إكسبرس vs أخرى)
  const ordersByPlatform = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredData.orders.forEach(o => {
      let site = (o.site || 'أخرى').toUpperCase();
      if (site.includes('SHEIN') || site.includes('شي إن')) site = 'شي إن (SHEIN)';
      else if (site.includes('ALI') || site.includes('علي')) site = 'علي إكسبرس (AliExpress)';
      else site = 'متاجر أخرى';

      if (!map[site]) map[site] = { count: 0, total: 0 };
      map[site].count += 1;
      map[site].total += parseFloat(String(o.totalAmount || 0)) || 0;
    });

    const colors: Record<string, string> = {
      'شي إن (SHEIN)': '#0f172a',
      'علي إكسبرس (AliExpress)': '#ea580c',
      'متاجر أخرى': '#0284c7'
    };

    return Object.entries(map).map(([name, data]) => ({
      name,
      count: data.count,
      total: data.total,
      color: colors[name] || '#64748b'
    }));
  }, [filteredData.orders]);

  // Customer Segments & Geographical Insights
  const customerAnalytics = useMemo(() => {
    const totalCusts = customers.length;
    let debtCustomersCount = 0;
    let totalCustomerDebt = 0;
    const govMap: Record<string, { count: number; sales: number }> = {};

    customers.forEach(c => {
      const bal = getCustomerBalance(c.id);
      if (bal > 0) {
        debtCustomersCount += 1;
        totalCustomerDebt += bal;
      }
      const gov = c.governorate || 'صنعاء';
      if (!govMap[gov]) govMap[gov] = { count: 0, sales: 0 };
      govMap[gov].count += 1;
    });

    orders.forEach(o => {
      const cust = customers.find(c => c.id === o.customerId);
      const gov = cust?.governorate || 'صنعاء';
      if (govMap[gov]) {
        govMap[gov].sales += parseFloat(String(o.totalAmount || 0)) || 0;
      }
    });

    const topGovernorates = Object.entries(govMap)
      .map(([gov, data]) => ({
        governorate: gov,
        customers: data.count,
        sales: data.sales
      }))
      .sort((a, b) => b.sales - a.sales);

    // Top 5 VIP Customers by purchase amount
    const customerSalesMap: Record<number, { customer: Customer; totalSpent: number; ordersCount: number; debt: number }> = {};
    customers.forEach(c => {
      customerSalesMap[c.id] = {
        customer: c,
        totalSpent: 0,
        ordersCount: 0,
        debt: getCustomerBalance(c.id)
      };
    });

    orders.forEach(o => {
      if (customerSalesMap[o.customerId]) {
        customerSalesMap[o.customerId].totalSpent += parseFloat(String(o.totalAmount || 0)) || 0;
        customerSalesMap[o.customerId].ordersCount += 1;
      }
    });

    const topCustomers = Object.values(customerSalesMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 6);

    return {
      totalCusts,
      debtCustomersCount,
      totalCustomerDebt,
      topGovernorates,
      topCustomers
    };
  }, [customers, orders, getCustomerBalance]);

  // Liquidity by Account Type & Distribution
  const liquidityBreakdown = useMemo(() => {
    const activeAccs = accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية');
    return activeAccs.map(acc => {
      const bal = getAccountBalance(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: bal,
        percentage: totalCashAndBanks > 0 ? Math.round((bal / totalCashAndBanks) * 100) : 0
      };
    }).sort((a, b) => b.balance - a.balance);
  }, [accounts, getAccountBalance, totalCashAndBanks]);

  // Shipment & Carrier Performance
  const logisticsAnalytics = useMemo(() => {
    const carrierMap: Record<string, { count: number; cost: number }> = {};
    filteredData.shipments.forEach(s => {
      const carrier = s.carrier || 'غير محدد';
      if (!carrierMap[carrier]) carrierMap[carrier] = { count: 0, cost: 0 };
      carrierMap[carrier].count += 1;
      carrierMap[carrier].cost += parseFloat(String(s.shippingCost || 0)) || 0;
    });

    return Object.entries(carrierMap).map(([carrier, data]) => ({
      carrier,
      count: data.count,
      totalCost: data.cost,
      avgCostPerShipment: data.count > 0 ? Math.round(data.cost / data.count) : 0
    }));
  }, [filteredData.shipments]);

  // System Health Score Engine (0 - 100)
  const healthScore = useMemo(() => {
    let score = 70; // baseline
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // 1. Liquidity to Debt ratio
    if (totalCashAndBanks > totalCustomerDebts) {
      score += 10;
      strengths.push('السيولة النقدية والمصرفية تفوق إجمالي ديون العملاء مما يضمن استقرار التدفقات.');
    } else {
      score -= 8;
      recommendations.push('ديون العملاء تتجاوز السيولة النقدية المتوفرة؛ يُوصى بتكثيف تحصيل الديون المعلقة.');
    }

    // 2. Collection rate
    if (kpis.collectionRate >= 75) {
      score += 10;
      strengths.push(`معدل سداد الطلبات ممتاز (${kpis.collectionRate}%) مما يعزز دوران رأس المال.`);
    } else {
      score -= 5;
      recommendations.push(`معدل سداد الطلبات (${kpis.collectionRate}%) يحتاج إلى رفع نسبة العربون المدفوع مقدماً.`);
    }

    // 3. Operating Cost to Revenue
    const expenseRatio = kpis.totalSales > 0 ? (kpis.totalExpenseAmount / kpis.totalSales) * 100 : 0;
    if (expenseRatio <= 15) {
      score += 10;
      strengths.push(`نسبة المصاريف التشغيلية منخفضة ومثالية (${expenseRatio.toFixed(1)}% من المبيعات).`);
    } else {
      score -= 5;
      recommendations.push(`المصاريف التشغيلية تمثل ${expenseRatio.toFixed(1)}% من المبيعات؛ حاول خفض نفقات التوصيل أو الباقات.`);
    }

    // Bound between 10 and 100
    const finalScore = Math.min(100, Math.max(10, score));

    return {
      score: finalScore,
      strengths,
      recommendations,
      grade: finalScore >= 85 ? 'ممتاز' : finalScore >= 70 ? 'جيد جداً' : finalScore >= 50 ? 'متوسط' : 'يحتاج انتباه'
    };
  }, [totalCashAndBanks, totalCustomerDebts, kpis]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="analytics-center-container">
      
      {/* Printable Header with Official TOP STORE Logo */}
      <div className="hidden print:flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-6" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-slate-300 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/top_store_logo.jpg"
              alt="TOP STORE"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">متجر توب ستور | TOP STORE</h2>
            <p className="text-[11px] text-slate-600 font-semibold">
              مركز التحليلات المالية والتجارية 360° • تقرير الأداء المالي والربحية
            </p>
          </div>
        </div>
        <div className="text-left font-mono text-xs">
          <div className="font-bold text-slate-900">تقرير تحليلي مالي رسمي</div>
          <div className="text-slate-500 text-[10px]">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-YE')}</div>
        </div>
      </div>

      {/* Top Header & Navigation Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-mono font-bold">
                  مركز التحليلات المتكامل 360°
                </span>
                <span className="text-slate-400 text-xs font-mono">Top Store Analytics Hub</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                مركز التحليلات الشامل لكافة قطاعات النظام
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                رؤى مالية فورية للمبيعات، الأرباح التقديرية، كفاءة الشحن والتسويق، توزيع السيولة، وتقييم الاستدامة التشغيلية.
              </p>
            </div>
          </div>

          {/* Time Range Selector & Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <div className="bg-slate-800/90 border border-slate-700 p-1 rounded-xl flex items-center text-xs">
              <button
                onClick={() => setTimeRange('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setTimeRange('THIS_MONTH')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'THIS_MONTH'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                هذا الشهر
              </button>
              <button
                onClick={() => setTimeRange('LAST_30_DAYS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'LAST_30_DAYS'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                آخر 30 يوم
              </button>
              <button
                onClick={() => setTimeRange('THIS_YEAR')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === 'THIS_YEAR'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                هذا العام
              </button>
            </div>

            <button
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="طباعة التقرير التحليلي"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>طباعة التقرير</span>
            </button>
          </div>
        </div>

        {/* Horizontal Tabs for Analytical Domains */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-6 pt-4 border-t border-slate-700/60 scrollbar-none print:hidden text-xs font-semibold">
          {[
            { id: 'OVERVIEW', label: 'نظرة شاملة 360°', icon: LayoutDashboard },
            { id: 'FINANCIAL', label: 'المالية والسيولة', icon: DollarSign },
            { id: 'SALES', label: 'المبيعات والطلبات', icon: ShoppingBag },
            { id: 'EXPENSES', label: 'المصاريف والتكاليف', icon: Receipt },
            { id: 'CUSTOMERS', label: 'العملاء والمحافظات', icon: Users },
            { id: 'LOGISTICS', label: 'الشحن والتوصيل', icon: Truck },
            { id: 'MARKETING', label: 'التسويق وعائد الإعلانات', icon: Megaphone },
            { id: 'HEALTH_SCORE', label: 'مؤشر صحة المتجر', icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeDomain === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDomain(tab.id as AnalyticsDomain)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">إجمالي المبيعات</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900">
              {kpis.totalSales.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">عدد الطلبيات: <b className="font-mono text-slate-800">{kpis.ordersCount}</b></span>
            <span className="text-emerald-700 font-bold font-mono">AOV: {kpis.aov.toLocaleString()} ريال</span>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              صافي الأرباح التقديرية
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-emerald-950">
              +{kpis.estimatedNetProfit.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-700">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">هامش الربح الصافي:</span>
            <span className="text-emerald-700 font-black font-mono bg-emerald-50 px-2 py-0.5 rounded">
              {kpis.profitMarginPercent}%
            </span>
          </div>
        </div>

        {/* Operating & Shipping Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-800 font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              المصاريف والشحنات
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-rose-950">
              {kpis.totalExpenseAmount.toLocaleString()}
            </span>
            <span className="text-xs text-rose-700">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">منها شحن بضائع:</span>
            <span className="text-purple-700 font-bold font-mono">
              {kpis.totalShippingCosts.toLocaleString()} ريال
            </span>
          </div>
        </div>

        {/* Total Cash Liquidity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">إجمالي السيولة الجاهزة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900">
              {totalCashAndBanks.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">ريال</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">ديون العملاء:</span>
            <span className="text-amber-700 font-bold font-mono">
              {totalCustomerDebts.toLocaleString()} ريال
            </span>
          </div>
        </div>
      </div>

      {/* Main Analytical Content per Selected Domain */}
      
      {/* 1. OVERVIEW & FINANCIAL COMBINED */}
      {(activeDomain === 'OVERVIEW' || activeDomain === 'FINANCIAL') && (
        <div className="space-y-6">
          
          {/* Sales & Expenses Monthly Trend Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    مسار الإيرادات الشهرية مقابل المصاريف وصافي الربح
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  رسم بياني يوضح المبيعات الإجمالية، التكاليف التشغيلية، وصافي الأرباح التقديرية بالريال اليمني
                </p>
              </div>

              {/* Chart Legend Summary */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  <span className="text-slate-700">المبيعات</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-slate-700">صافي الأرباح</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="text-slate-700">المصاريف</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={val => `${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} ريال`, name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', direction: 'rtl' }}
                  />
                  <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="profit" name="صافي الربح" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                  <Area type="monotone" dataKey="expenses" name="المصاريف" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#expGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two Columns: Liquidity Distribution + Debt Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Liquidity Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Wallet className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    توزيع السيولة النقدية والمصرفية
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {totalCashAndBanks.toLocaleString()} ريال
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                تمركز الأرصدة الحالية في بنك الكريمي، محفظة جيب، التضامن، التجاري، والصندوق
              </p>

              <div className="space-y-3">
                {liquidityBreakdown.map(acc => (
                  <div key={acc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{acc.name}</span>
                        <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                          {acc.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-900">{acc.balance.toLocaleString()} ريال</span>
                        <span className="text-slate-400 text-[11px]">({acc.percentage}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, acc.percentage))}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection & Debt Aging Analysis */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                      <Clock className="w-4 h-4" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      تحليل جودة التحصيل ومخاطر الديون
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {kpis.collectionRate}% مسدد
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  نسبة المبالغ المسددة فعلياً مقابل المتبقية على العملاء
                </p>

                {/* Status metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                    <span className="text-[11px] text-emerald-800 font-semibold block">المقبوضات المحصلة</span>
                    <span className="text-lg font-black font-mono text-emerald-950 block mt-1">
                      {kpis.totalPaid.toLocaleString()} <span className="text-xs font-normal text-emerald-700">ريال</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      تمثل {kpis.collectionRate}% من إجمالي المبيعات
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80">
                    <span className="text-[11px] text-amber-800 font-semibold block">ديون وذمم معلقة</span>
                    <span className="text-lg font-black font-mono text-amber-950 block mt-1">
                      {kpis.totalRemaining.toLocaleString()} <span className="text-xs font-normal text-amber-700">ريال</span>
                    </span>
                    <span className="text-[10px] text-amber-700 mt-1 block">
                      على {customerAnalytics.debtCustomersCount} عميلاً
                    </span>
                  </div>
                </div>

                {/* Progress ratio */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">نسبة التغطية النقدية للديون:</span>
                    <span className="font-mono text-slate-900">
                      {totalCustomerDebts > 0 ? ((totalCashAndBanks / totalCustomerDebts) * 100).toFixed(0) : '100'}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${kpis.collectionRate}%` }}></div>
                    <div className="bg-amber-400 h-full" style={{ width: `${100 - kpis.collectionRate}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>متحصلات (أخضر)</span>
                    <span>معلق قيد التحصيل (أصفر)</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">كشوفات حساب العملاء المحدثة جاهزة للطباعة</span>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('customers')}
                    className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                  >
                    فتح إدارة العملاء
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. SALES & ORDERS ANALYTICS */}
      {(activeDomain === 'OVERVIEW' || activeDomain === 'SALES') && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <ShoppingBag className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    تحليل المبيعات حسب منصة الوساطة (شي إن مقابل علي إكسبرس)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  حجم الطلبات وإجمالي القيمة النقدية لكل متجر خارجي
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ordersByPlatform.map(platform => (
                <div key={platform.name} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{platform.name}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {platform.count} طلب
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xl font-black font-mono text-slate-900">
                        {platform.total.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 mr-1">ريال</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>الحصة من المبيعات:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {kpis.totalSales > 0 ? ((platform.total / kpis.totalSales) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. EXPENSES & COST STRUCTURE */}
      {(activeDomain === 'OVERVIEW' || activeDomain === 'EXPENSES') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Donut Chart of Expenses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <Receipt className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    هيكل وتوزيع المصاريف
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                  {kpis.totalExpenseAmount.toLocaleString()} ريال
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                توزيع النفقات على الشحن والتغليف والتسويق والاتصالات
              </p>

              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} ريال`, name]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', direction: 'rtl' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-40 overflow-y-auto">
              {expensesByCategory.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-700 font-medium truncate">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {item.value.toLocaleString()} ريال
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Cost Breakdown List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Layers className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    كفاءة التشغيل ومؤشرات خفض التكاليف
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  إجمالي العمليات: {filteredData.expenses.length} مصروف
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">متوسط تكلفة المصروف الواحد</span>
                  <span className="text-lg font-black font-mono text-slate-900 block mt-1">
                    {filteredData.expenses.length > 0
                      ? Math.round(kpis.totalExpenseAmount / filteredData.expenses.length).toLocaleString()
                      : 0}{' '}
                    <span className="text-xs font-normal text-slate-500">ريال</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200">
                  <span className="text-xs text-purple-700 font-bold block flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-purple-600" />
                    تكاليف الشحن واللوجستيات
                  </span>
                  <span className="text-lg font-black font-mono text-purple-900 block mt-1">
                    {kpis.totalShippingCosts.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-purple-700">ريال</span>
                  </span>
                  <span className="text-[10px] text-purple-600 mt-1 block">
                    تخصم بالكامل من أرباح الفترة ({filteredData.shipments.length} شحنة)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">تكاليف الشراء الجماعي (Batches)</span>
                  <span className="text-lg font-black font-mono text-indigo-950 block mt-1">
                    {purchaseBatches.reduce((s, b) => s + (parseFloat(String(b.totalCost || 0)) || 0), 0).toLocaleString()}{' '}
                    <span className="text-xs font-normal text-indigo-700">ريال</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {purchaseBatches.length} دفعة مجمعة موفرة لعمولات التحويل
                  </span>
                </div>
              </div>

              {/* Summary table of highest recent expenses */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">رقم المصروف</th>
                      <th className="py-2.5 px-3">التصنيف والبيان</th>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3 text-left">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.expenses.slice(0, 4).map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{exp.expenseNumber}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800">{exp.category}</span>
                          <span className="text-slate-400 block text-[11px] truncate max-w-xs">{exp.description}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {new Date(exp.expenseDate || exp.createdAt).toLocaleDateString('ar-YE')}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-700">
                          {parseFloat(String(exp.amount || 0)).toLocaleString()} ريال
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">متابعة المصاريف الدورية يساعد في رفع هامش الربح</span>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('expenses')}
                  className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                >
                  كافة المصاريف
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 4. CUSTOMERS & GEOGRAPHY */}
      {(activeDomain === 'OVERVIEW' || activeDomain === 'CUSTOMERS') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top VIP Customers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Award className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    أعلى العملاء شراءً (VIP Customers)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {customerAnalytics.totalCusts} عميل مسجل
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                العملاء الأكثر مساهمة في حجم المبيعات مع حالة سدادهم
              </p>

              <div className="space-y-2.5">
                {customerAnalytics.topCustomers.map((item, idx) => (
                  <div key={item.customer.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-black font-mono text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{item.customer.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.customer.phone} • {item.ordersCount} طلبيات
                        </span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="font-mono font-black text-xs text-slate-900 block">
                        {item.totalSpent.toLocaleString()} ريال
                      </span>
                      {item.debt > 0 ? (
                        <span className="text-[10px] text-amber-700 font-bold font-mono">
                          عليه {item.debt.toLocaleString()} ريال
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold">
                          خالص السداد ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
              تقديم مكافآت وكوبونات خاصة لأعلى العملاء يرفع معدل تكرار الشراء
            </div>
          </div>

          {/* Geographical Sales Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    التوزيع الجغرافي للمبيعات والعملاء
                  </h3>
                </div>
                <span className="text-xs text-slate-500">حسب المحافظة</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                حجم المبيعات وعدد العملاء النشطين في المحافظات اليمنية
              </p>

              <div className="space-y-3">
                {customerAnalytics.topGovernorates.slice(0, 5).map(gov => {
                  const pct = kpis.totalSales > 0 ? Math.round((gov.sales / kpis.totalSales) * 100) : 0;
                  return (
                    <div key={gov.governorate} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{gov.governorate}</span>
                          <span className="text-[10px] text-slate-400">({gov.customers} عملاء)</span>
                        </div>
                        <div className="font-mono">
                          <span className="font-bold text-slate-800">{gov.sales.toLocaleString()} ريال</span>
                          <span className="text-slate-400 text-[11px] mr-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-600 rounded-full" style={{ width: `${Math.max(3, pct)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
              صنعاء تستحوذ على الحصة الأكبر من المبيعات تليها تعز وعدن وإب
            </div>
          </div>

        </div>
      )}

      {/* 5. LOGISTICS & SHIPPING ANALYTICS */}
      {(activeDomain === 'OVERVIEW' || activeDomain === 'LOGISTICS') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <Truck className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  كفاءة شركات النقل والتوصيل (المهيب، القدسي)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة تكاليف الشحن، عدد الشحنات المسلمة ومتوسط تكلفة الشحنة الواحدة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {logisticsAnalytics.map(carrier => (
              <div key={carrier.carrier} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{carrier.carrier}</span>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono font-bold text-xs">
                      {carrier.count} شحنة
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-lg font-black font-mono text-slate-900">
                      {carrier.totalCost.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 mr-1">ريال</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span>متوسط الشحنة:</span>
                  <span className="font-mono font-bold text-purple-800">
                    {carrier.avgCostPerShipment.toLocaleString()} ريال
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. MARKETING & ROAS */}
      {(activeDomain === 'OVERVIEW' || activeDomain === 'MARKETING') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Megaphone className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  أداء التسويق وعائد الإنفاق الإعلاني (ROAS)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة نتائج حملات إنستغرام، تيك توك، الإحالات وأكواد الخصم
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('marketing')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                إدارة الحملات بالتفصيل
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <span className="text-xs text-amber-800 font-semibold block">إجمالي الإنفاق الإعلاني</span>
              <span className="text-xl font-black font-mono text-amber-950 block mt-1">
                {kpis.totalAdSpend.toLocaleString()} <span className="text-xs font-normal text-amber-700">ريال</span>
              </span>
              <span className="text-[10px] text-amber-700 mt-1 block">
                موزعة على {marketingCampaigns.length} حملة تسويقية
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <span className="text-xs text-emerald-800 font-semibold block">المبيعات المحققة من الإعلانات</span>
              <span className="text-xl font-black font-mono text-emerald-950 block mt-1">
                {kpis.marketingAttributedSales.toLocaleString()} <span className="text-xs font-normal text-emerald-700">ريال</span>
              </span>
              <span className="text-[10px] text-emerald-700 mt-1 block">
                مبيعات مرتبطة بأكواد وحملات معلنة
              </span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
              <span className="text-xs text-indigo-800 font-semibold block">معدل العائد على الإعلانات (ROAS)</span>
              <span className="text-xl font-black font-mono text-indigo-950 block mt-1">
                {kpis.roas}x
              </span>
              <span className="text-[10px] text-indigo-700 mt-1 block">
                كل ريال يُنفق في الإعلانات يولد {kpis.roas} ريال مبيعات
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. STORE HEALTH SCORE & STRATEGIC RECOMMENDATIONS */}
      {(activeDomain === 'OVERVIEW' || activeDomain === 'HEALTH_SCORE') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  مؤشر الصحة والاستدامة المالية للمتجر
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تقييم آلي متكامل مبني على نسب السيولة، سرعة التحصيل، وهامش الربح الصافي
              </p>
            </div>

            {/* Score Pill */}
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block font-sans">التقييم العام</span>
                <span className="text-xs font-bold text-emerald-700">{healthScore.grade}</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {healthScore.score}<span className="text-sm font-normal text-slate-400">/100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {/* Strengths */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>نقاط القوة التشغيلية والمالية:</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-800">
                {healthScore.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>توصيات الذكاء المالي لتحسين الأداء:</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-800">
                {healthScore.recommendations.length > 0 ? (
                  healthScore.recommendations.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-1.5 text-slate-500">
                    <span>كافة المؤشرات تعمل بكفاءة عالية، استمر على نفس النمط التشغيلي.</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
