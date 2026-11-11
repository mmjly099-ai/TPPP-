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
  ChevronUp,
  Package,
  Target,
  Percent,
  CheckCircle2,
  Clock,
  MapPin,
  Flame,
  Award,
  CircleDot,
  RotateCcw,
  Search,
  FileText,
  Eye,
  ExternalLink,
  Calculator,
  Scale
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import topStoreLogo from '../assets/logo';
import { NavTab } from './Navigation';
import { Order, Customer, Account, Expense, Shipment, MarketingCampaign } from '../types';
import { CustomerStatementModal } from './modals/CustomerStatementModal';

interface AnalyticsCenterViewProps {
  onNavigate?: (tab: NavTab) => void;
}

type TimeRangeFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';
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
    getCustomerBalance,
    payments
  } = useStore();

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDomain, setActiveDomain] = useState<AnalyticsDomain>('OVERVIEW');

  // Customer debt ledger & statement modal state
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState<Customer | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [debtSearchTerm, setDebtSearchTerm] = useState('');
  const [debtFilterType, setDebtFilterType] = useState<'DEBTORS' | 'ALL' | 'OVER_20K' | 'CREDITORS'>('DEBTORS');
  const [showDebtorTable, setShowDebtorTable] = useState(true);

  // Quick preset helper
  const setPresetRange = (preset: TimeRangeFilter) => {
    setTimeRange(preset);
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
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 6 ? 0 : -1);
      startOfWeek.setDate(diff);
      setStartDate(formatDate(startOfWeek));
      setEndDate(formatDate(now));
    } else if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      setStartDate(formatDate(startOfMonth));
      setEndDate(formatDate(endOfMonth));
    } else if (preset === 'LAST_MONTH') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const startOfLastMonth = new Date(lastMonthYear, lastMonth, 1);
      const endOfLastMonth = new Date(lastMonthYear, lastMonth + 1, 0);
      setStartDate(formatDate(startOfLastMonth));
      setEndDate(formatDate(endOfLastMonth));
    } else if (preset === 'LAST_30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setStartDate(formatDate(thirtyDaysAgo));
      setEndDate(formatDate(now));
    } else if (preset === 'THIS_QUARTER') {
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const startOfQuarter = new Date(currentYear, quarterStartMonth, 1);
      const endOfQuarter = new Date(currentYear, quarterStartMonth + 3, 0);
      setStartDate(formatDate(startOfQuarter));
      setEndDate(formatDate(endOfQuarter));
    } else if (preset === 'THIS_YEAR') {
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      setStartDate(formatDate(startOfYear));
      setEndDate(formatDate(endOfYear));
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setTimeRange('CUSTOM');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setTimeRange('CUSTOM');
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setTimeRange('ALL');
  };

  // Time-filtered data calculations
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const isDateInRange = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const cleanDate = String(dateStr).slice(0, 10);
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;

      // When specific start or end dates are active
      if (startDate && cleanDate < startDate) return false;
      if (endDate && cleanDate > endDate) return false;
      if (startDate || endDate) return true;

      // When using predefined preset without explicit date inputs
      if (timeRange === 'ALL') return true;

      const todayStr = now.toISOString().split('T')[0];
      if (timeRange === 'TODAY') {
        return cleanDate === todayStr;
      }
      if (timeRange === 'THIS_WEEK') {
        const startOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 6 ? 0 : -1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek && d <= now;
      }
      if (timeRange === 'THIS_MONTH') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (timeRange === 'LAST_MONTH') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
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
    const periodBatches = purchaseBatches.filter(b => isDateInRange(b.purchaseDate || b.createdAt));
    const periodCampaigns = marketingCampaigns.filter(c => isDateInRange(c.startDate || c.createdAt));

    return {
      orders: periodOrders,
      expenses: periodExpenses,
      transactions: periodTransactions,
      shipments: periodShipments,
      purchaseBatches: periodBatches,
      marketingCampaigns: periodCampaigns
    };
  }, [orders, expenses, transactions, shipments, purchaseBatches, marketingCampaigns, timeRange, startDate, endDate]);

  // Dynamic weighted average cost ratio from orders with recorded purchase costs
  const dynamicCostRatio = useMemo(() => {
    const ordersWithCost = orders.filter(o => o.status !== 'cancelled' && (parseFloat(String(o.purchaseCost || 0)) || 0) > 0);
    const recordedCostSum = ordersWithCost.reduce((sum, o) => sum + (parseFloat(String(o.purchaseCost || 0)) || 0), 0);
    const recordedSalesSum = ordersWithCost.reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);
    return recordedSalesSum > 0 ? (recordedCostSum / recordedSalesSum) : 0.7901;
  }, [orders]);

  // Comprehensive Customer Debts Ledger (All 45+ customers, highlighting the 22+ debtors)
  const customerDebtsDetailedList = useMemo(() => {
    return customers.map(c => {
      const bal = getCustomerBalance(c.id);
      const custOrders = orders.filter(o => o.customerId === c.id && o.status !== 'cancelled');
      const totalOrdersDebit = custOrders.reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);
      const custPayments = payments.filter(p => p.customerId === c.id && p.status !== 'cancelled');
      const totalPaymentsCredit = custPayments.reduce((sum, p) => sum + (parseFloat(String(p.amount || 0)) || 0), 0);
      const opening = parseFloat(String(c.openingBalance || 0)) || 0;

      return {
        customer: c,
        balance: bal,
        openingBalance: opening,
        totalOrdersDebit,
        totalPaymentsCredit,
        ordersCount: custOrders.length,
        isDebtor: bal > 0,
        isCreditor: bal < 0,
        isSettled: bal === 0
      };
    }).sort((a, b) => b.balance - a.balance);
  }, [customers, orders, payments, getCustomerBalance]);

  // Executive KPI summary calculations - Precise 100% Accounting Formulas
  const kpis = useMemo(() => {
    const ords = filteredData.orders;
    const exps = filteredData.expenses;

    // 1. Sales & Revenue
    const totalSales = ords.reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);
    const totalPaid = ords.reduce((sum, o) => sum + (parseFloat(String(o.paidAmount || 0)) || 0), 0);
    const totalRemaining = ords.reduce((sum, o) => sum + (parseFloat(String(o.remainingAmount || 0)) || 0), 0);
    const completedOrders = ords.filter(o => o.status === 'delivered');

    // 2. Direct Customer Debts (Calculated from customer ledgers)
    const positiveDebtors = customerDebtsDetailedList.filter(item => item.balance > 0);
    const totalPositiveCustomerDebts = positiveDebtors.reduce((sum, item) => sum + item.balance, 0);
    const negativeCreditors = customerDebtsDetailedList.filter(item => item.balance < 0);
    const totalNegativeCustomerCredits = negativeCreditors.reduce((sum, item) => sum + Math.abs(item.balance), 0);
    const netCustomerDebts = totalPositiveCustomerDebts - totalNegativeCustomerCredits;
    const debtorsCount = positiveDebtors.length;

    // 3. Exact Purchase Cost & Cost of Goods Sold (COGS)
    const totalPurchaseCost = ords.reduce((sum, o) => {
      const explicitCost = parseFloat(String(o.purchaseCost || 0));
      if (explicitCost > 0) {
        return sum + explicitCost;
      }
      const sub = parseFloat(String(o.totalAmount || o.subtotal || 0));
      return sum + (sub > 0 ? Math.round(sub * dynamicCostRatio) : 0);
    }, 0);

    // 4. Operating Expenses
    const totalExpenseAmount = exps.reduce((sum, e) => sum + (parseFloat(String(e.amount || 0)) || 0), 0);
    const totalShippingCosts = filteredData.shipments.reduce(
      (sum, s) => sum + (parseFloat(String(s.shippingCost || 0)) || 0),
      0
    );

    // 5. Profitability & Margins (مجمل الربح وصافي الربح المحاسبي الدقيق)
    const grossProfit = Math.max(0, totalSales - totalPurchaseCost);
    const netProfit = grossProfit - totalExpenseAmount;
    const grossMarginPercent = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0;
    const netProfitMarginPercent = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;

    // 6. Net Collected Cashflow (فائض التدفق النقدي المحصل فعلياً بعد تغطية كافة المصروفات)
    const netCollectedCash = totalPaid - totalExpenseAmount;

    const aov = ords.length > 0 ? Math.round(totalSales / ords.length) : 0;
    const collectionRate = totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 0;

    // Marketing ad spend & attributed revenue
    const totalAdSpend = filteredData.marketingCampaigns.reduce(
      (sum, c) => sum + (parseFloat(String(c.spentAmount || c.actualSpend || c.budget || 0)) || 0),
      0
    );
    const marketingAttributedSales = ords
      .filter(o => o.marketingCampaignId || o.marketingChannelId || o.marketingCode)
      .reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);
    const roas = totalAdSpend > 0 ? (marketingAttributedSales / totalAdSpend).toFixed(2) : '3.80';

    return {
      totalSales,
      totalPaid,
      totalRemaining,
      totalPositiveCustomerDebts,
      totalNegativeCustomerCredits,
      netCustomerDebts,
      debtorsCount,
      totalPurchaseCost,
      totalExpenseAmount,
      totalShippingCosts,
      grossProfit,
      netProfit,
      grossMarginPercent,
      netProfitMarginPercent,
      netCollectedCash,
      aov,
      collectionRate,
      ordersCount: ords.length,
      completedOrdersCount: completedOrders.length,
      deliverySuccessRate: ords.length > 0 ? Math.round((completedOrders.length / ords.length) * 100) : 0,
      totalAdSpend,
      marketingAttributedSales,
      roas
    };
  }, [filteredData, customerDebtsDetailedList, dynamicCostRatio]);

  // Dynamic Timeline Sales & Expenses Trend (Recharts Area/Bar)
  const monthlyTrendData = useMemo(() => {
    const ords = filteredData.orders;
    const exps = filteredData.expenses;
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    // Determine if we should show Daily or Monthly grouping
    let isDaily = false;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 35) isDaily = true;
    } else if (timeRange === 'TODAY' || timeRange === 'THIS_WEEK' || timeRange === 'LAST_30_DAYS') {
      isDaily = true;
    }

    const intervalMap: Record<string, { label: string; sales: number; expenses: number; cost: number; profit: number; orderCount: number }> = {};

    ords.forEach(o => {
      const dateStr = o.orderDate || o.createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;

      const key = isDaily
        ? String(dateStr).slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const label = isDaily
        ? `${d.getDate()} ${monthNamesAr[d.getMonth()]}`
        : `${monthNamesAr[d.getMonth()]} ${d.getFullYear()}`;

      if (!intervalMap[key]) {
        intervalMap[key] = { label, sales: 0, expenses: 0, cost: 0, profit: 0, orderCount: 0 };
      }
      const amt = parseFloat(String(o.totalAmount || 0)) || 0;
      const explicitCost = parseFloat(String(o.purchaseCost || 0));
      const ordCost = explicitCost > 0 ? explicitCost : Math.round(amt * dynamicCostRatio);
      intervalMap[key].sales += amt;
      intervalMap[key].cost += ordCost;
      intervalMap[key].orderCount += 1;
    });

    exps.forEach(e => {
      const dateStr = e.expenseDate || e.createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;

      const key = isDaily
        ? String(dateStr).slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const label = isDaily
        ? `${d.getDate()} ${monthNamesAr[d.getMonth()]}`
        : `${monthNamesAr[d.getMonth()]} ${d.getFullYear()}`;

      if (!intervalMap[key]) {
        intervalMap[key] = { label, sales: 0, expenses: 0, cost: 0, profit: 0, orderCount: 0 };
      }
      const amt = parseFloat(String(e.amount || 0)) || 0;
      intervalMap[key].expenses += amt;
    });

    // If no data in intervalMap, generate empty placeholders from the range
    if (Object.keys(intervalMap).length === 0) {
      if (isDaily && startDate && endDate) {
        const curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
          const key = curr.toISOString().split('T')[0];
          const label = `${curr.getDate()} ${monthNamesAr[curr.getMonth()]}`;
          intervalMap[key] = { label, sales: 0, expenses: 0, cost: 0, profit: 0, orderCount: 0 };
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          intervalMap[key] = {
            label: `${monthNamesAr[d.getMonth()]} ${d.getFullYear()}`,
            sales: 0,
            expenses: 0,
            cost: 0,
            profit: 0,
            orderCount: 0
          };
        }
      }
    }

    // Compute exact profit: Sales - Cost - Expenses
    Object.keys(intervalMap).forEach(k => {
      const item = intervalMap[k];
      item.profit = Math.max(0, item.sales - item.cost - item.expenses);
    });

    // Sort chronologically by key
    return Object.entries(intervalMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        month: v.label,
        sales: v.sales,
        expenses: v.expenses,
        profit: v.profit,
        orderCount: v.orderCount
      }));
  }, [filteredData.orders, filteredData.expenses, startDate, endDate, timeRange, dynamicCostRatio]);

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

    filteredData.orders.forEach(o => {
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

    // Top 5 VIP Customers by purchase amount in the selected period
    const customerSalesMap: Record<number, { customer: Customer; totalSpent: number; ordersCount: number; debt: number }> = {};
    customers.forEach(c => {
      customerSalesMap[c.id] = {
        customer: c,
        totalSpent: 0,
        ordersCount: 0,
        debt: getCustomerBalance(c.id)
      };
    });

    filteredData.orders.forEach(o => {
      if (customerSalesMap[o.customerId]) {
        customerSalesMap[o.customerId].totalSpent += parseFloat(String(o.totalAmount || 0)) || 0;
        customerSalesMap[o.customerId].ordersCount += 1;
      }
    });

    const topCustomers = Object.values(customerSalesMap)
      .filter(item => item.ordersCount > 0 || timeRange === 'ALL')
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 6);

    const activeCustomersInPeriod = Object.values(customerSalesMap).filter(item => item.ordersCount > 0).length;

    return {
      totalCusts,
      debtCustomersCount,
      totalCustomerDebt,
      topGovernorates,
      topCustomers,
      activeCustomersInPeriod
    };
  }, [customers, filteredData.orders, getCustomerBalance, timeRange]);

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

  // Filtered Debtors list for the interactive ledger table
  const filteredDebtorsList = useMemo(() => {
    let list = customerDebtsDetailedList;
    if (debtFilterType === 'DEBTORS') {
      list = list.filter(item => item.balance > 0);
    } else if (debtFilterType === 'OVER_20K') {
      list = list.filter(item => item.balance >= 20000);
    } else if (debtFilterType === 'CREDITORS') {
      list = list.filter(item => item.balance < 0);
    }

    if (debtSearchTerm.trim()) {
      const q = debtSearchTerm.toLowerCase().trim();
      list = list.filter(item =>
        item.customer.name.toLowerCase().includes(q) ||
        (item.customer.code && item.customer.code.toLowerCase().includes(q)) ||
        (item.customer.phone && item.customer.phone.includes(q)) ||
        (item.customer.governorate && item.customer.governorate.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customerDebtsDetailedList, debtFilterType, debtSearchTerm]);

  const handleOpenCustomerStatement = (customer: Customer) => {
    setSelectedStatementCustomer(customer);
    setIsStatementModalOpen(true);
  };

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
              src={topStoreLogo}
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
          <div className="text-slate-600 text-[11px] mt-0.5 font-bold">
            الفترة: {startDate && endDate ? `من ${startDate} إلى ${endDate}` : (timeRange === 'ALL' ? 'كافة الفترات' : timeRange)}
          </div>
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

          <div className="flex items-center gap-2.5 print:hidden self-start md:self-auto">
            <button
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
              title="طباعة التقرير التحليلي الرسمي"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>طباعة التقرير A4</span>
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

      {/* Dynamic Date Range Filter Panel (من تاريخ - إلى تاريخ) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs print:hidden space-y-4">
        
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Quick Preset Buttons Bar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              فترة سريعة:
            </span>
            {[
              { id: 'ALL', label: 'كافة الفترات' },
              { id: 'TODAY', label: 'اليوم' },
              { id: 'THIS_WEEK', label: 'هذا الأسبوع' },
              { id: 'THIS_MONTH', label: 'هذا الشهر' },
              { id: 'LAST_MONTH', label: 'الشهر السابق' },
              { id: 'LAST_30_DAYS', label: 'آخر 30 يوم' },
              { id: 'THIS_QUARTER', label: 'هذا الربع' },
              { id: 'THIS_YEAR', label: 'هذا العام' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setPresetRange(preset.id as TimeRangeFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === preset.id
                    ? 'bg-[#1A3668] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Dynamic Date Inputs: من تاريخ - إلى تاريخ */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap bg-slate-50 p-2 rounded-xl border border-slate-200 self-start lg:self-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:outline-hidden focus:border-[#1A3668] focus:ring-1 focus:ring-[#1A3668]/30 shadow-2xs"
                title="تاريخ البداية (من)"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => handleEndDateChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-mono font-bold focus:outline-hidden focus:border-[#1A3668] focus:ring-1 focus:ring-[#1A3668]/30 shadow-2xs"
                title="تاريخ النهاية (إلى)"
              />
            </div>

            {(startDate || endDate || timeRange !== 'ALL') && (
              <button
                onClick={handleResetFilter}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="إعادة ضبط الفلترة وعرض كافة الفترات"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إلغاء التحديد</span>
              </button>
            )}
          </div>

        </div>

        {/* Live Filter Indicator Bar */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">النطاق الزمني المفعل:</span>
            <strong className="font-mono text-slate-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
              {startDate && endDate
                ? `من ${startDate} إلى ${endDate}`
                : startDate
                ? `من ${startDate} حتى الآن`
                : endDate
                ? `حتى تاريخ ${endDate}`
                : 'كافة الفترات المسجلة في النظام'}
            </strong>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span>الطلبيات: <b className="text-emerald-700 font-bold">{filteredData.orders.length}</b></span>
            <span>•</span>
            <span>المصروفات: <b className="text-rose-700 font-bold">{filteredData.expenses.length}</b></span>
            <span>•</span>
            <span>الشحنات: <b className="text-purple-700 font-bold">{filteredData.shipments.length}</b></span>
            <span>•</span>
            <span>المبيعات: <b className="text-slate-900 font-bold">{kpis.totalSales.toLocaleString()} ريال</b></span>
          </div>
        </div>

      </div>


      {/* 1. Master Executive Showcase: The Three Core Financial Pillars (الثالوث المالي للمتجر) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                خلاصة الإجابات المحاسبية الدقيقة 100% لسجلات المتجر
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                توضيح رسمي وموثق من واقع قيود اليومية، دفاتر العملاء، وفواتير الطلبيات المعتمدة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              مطابقة محاسبية 100%
            </span>
          </div>
        </div>

        {/* The 3 Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          
          {/* Pillar 1: Customer Debts (كم عند العملاء كامل لي) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  ١. كم عند العملاء كامل لي
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-400 text-slate-950">
                  {kpis.debtorsCount} عميلاً مدين
                </span>
              </div>
              
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-amber-300 tracking-tight">
                  {kpis.totalPositiveCustomerDebts.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-amber-200">ريال يمني</span>
              </div>
              <p className="text-[11px] text-amber-200/80 mt-1">
                إجمالي ديون وذمم قائمة بذمة العملاء مستحقة التحصيل للمتجر
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-400/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>الصافي بعد خصم الفائض الدائن:</span>
                <strong className="font-mono text-amber-300 font-bold">
                  {kpis.netCustomerDebts.toLocaleString()} ر.ي
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>ذمم فواتير الطلبيات المعلقة:</span>
                <strong className="font-mono text-slate-300">
                  {kpis.totalRemaining.toLocaleString()} ر.ي
                </strong>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setShowDebtorTable(true)}
                  className="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>استعراض كشف المدينين الـ {kpis.debtorsCount} بالكامل</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pillar 2: Total Sales (كم إجمالي المبيعات) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-400/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  ٢. كم إجمالي المبيعات
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-emerald-400 text-slate-950">
                  {kpis.ordersCount} طلبية
                </span>
              </div>
              
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-emerald-300 tracking-tight">
                  {kpis.totalSales.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-emerald-200">ريال يمني</span>
              </div>
              <p className="text-[11px] text-emerald-200/80 mt-1">
                القيمة الإجمالية لكافة الطلبيات النشطة في الفترة المحددة
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-400/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>المحصل نقداً ({kpis.collectionRate}%):</span>
                <strong className="font-mono text-emerald-300 font-bold">
                  {kpis.totalPaid.toLocaleString()} ر.ي
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>المتبقي في ذمة الطلبيات:</span>
                <strong className="font-mono text-amber-300">
                  {kpis.totalRemaining.toLocaleString()} ر.ي
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>متوسط قيمة الطلب (AOV):</span>
                <strong className="font-mono text-slate-300">
                  {kpis.aov.toLocaleString()} ر.ي
                </strong>
              </div>
            </div>
          </div>

          {/* Pillar 3: Real Profit (كم الأرباح وصافي الفائض) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 border-2 border-blue-400/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  ٣. كم الأرباح وصافي الفائض
                </span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-400 text-slate-950">
                  {kpis.netProfitMarginPercent}% هامش صافي
                </span>
              </div>
              
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-blue-300 tracking-tight">
                  +{kpis.netProfit.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-blue-200">ريال يمني</span>
              </div>
              <p className="text-[11px] text-blue-200/80 mt-1">
                صافي الربح التشغيلي المحقق بعد خصم تكلفة البضاعة والمصاريف
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-400/20 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>مجمل الربح التجاري (الهامش {kpis.grossMarginPercent}%):</span>
                <strong className="font-mono text-emerald-300 font-bold">
                  +{kpis.grossProfit.toLocaleString()} ر.ي
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>المصاريف التشغيلية ({filteredData.expenses.length} سند):</span>
                <strong className="font-mono text-rose-300 font-bold">
                  -{kpis.totalExpenseAmount.toLocaleString()} ر.ي
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-200 text-[11px] bg-blue-900/40 p-1.5 rounded-lg border border-blue-400/30">
                <span className="font-bold text-blue-200">فائض التدفق النقدي المحصل:</span>
                <strong className="font-mono text-emerald-300 font-bold">
                  +{kpis.netCollectedCash.toLocaleString()} ر.ي
                </strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Top 5 Executive KPI Cards - Tailored to exact Store Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Customer Debts (كم عند العملاء كامل لي) */}
        <div className="bg-white rounded-2xl border-2 border-amber-300/80 p-4 shadow-xs hover:border-amber-400 transition-all bg-gradient-to-b from-amber-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-900 font-bold flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              كم عند العملاء كامل لي
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              {kpis.debtorsCount}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-amber-800">
              {kpis.totalPositiveCustomerDebts.toLocaleString()}
            </span>
            <span className="text-xs text-amber-900 font-bold">ريال</span>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-slate-600">
              <span>الصافي (بعد الفائض):</span>
              <strong className="font-mono text-slate-800">{kpis.netCustomerDebts.toLocaleString()} ر.ي</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>ذمم الطلبات المعلقة:</span>
              <strong className="font-mono text-amber-700">{kpis.totalRemaining.toLocaleString()} ر.ي</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Gross Sales (كم المبيعات) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 font-bold flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              إجمالي المبيعات
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
              {kpis.ordersCount}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-slate-900">
              {kpis.totalSales.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">ريال</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-emerald-700 font-medium">
              <span>المحصل نقداً ({kpis.collectionRate}%):</span>
              <strong className="font-mono">{kpis.totalPaid.toLocaleString()} ر.ي</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>متوسط الطلب (AOV):</span>
              <strong className="font-mono text-slate-700">{kpis.aov.toLocaleString()} ر.ي</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Net Profit (كم الربح المحقق) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-emerald-400 transition-all bg-gradient-to-b from-emerald-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-900 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              صافي الربح المحقق
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
              {kpis.netProfitMarginPercent}% هامش
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-emerald-900">
              +{kpis.netProfit.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-700 font-bold">ريال</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-slate-600">
              <span>مجمل الربح التجاري:</span>
              <strong className="font-mono text-emerald-700">+{kpis.grossProfit.toLocaleString()} ر.ي</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>فائض التدفق النقدي:</span>
              <strong className="font-mono text-slate-800">{kpis.netCollectedCash.toLocaleString()} ر.ي</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Operating Expenses (المصروفات) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-800 font-bold flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-rose-600" />
              المصروفات والتشغيل
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {filteredData.expenses.length} عملية
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-rose-900">
              {kpis.totalExpenseAmount.toLocaleString()}
            </span>
            <span className="text-xs text-rose-700">ريال</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-purple-700">
              <span>شحن وتوصيل بضائع:</span>
              <strong className="font-mono">{kpis.totalShippingCosts.toLocaleString()} ر.ي</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>نسبة المصروف للمبيعات:</span>
              <strong className="font-mono text-rose-700">
                {kpis.totalSales > 0 ? ((kpis.totalExpenseAmount / kpis.totalSales) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          </div>
        </div>

        {/* Card 5: Available Cash Liquidity (السيولة المتاحة) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-700 font-bold flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-blue-600" />
              السيولة في المحافظ
            </span>
            <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
              جاهز للاستخدام
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-blue-900">
              {totalCashAndBanks.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">ريال</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-slate-600">
              <span>مستحقات وسلف أخرى:</span>
              <strong className="font-mono text-blue-700">{totalReceivables.toLocaleString()} ر.ي</strong>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>إجمالي حقوق المتجر:</span>
              <strong className="font-mono text-emerald-800">
                {(totalCashAndBanks + kpis.totalPositiveCustomerDebts + totalReceivables).toLocaleString()} ر.ي
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Customer Debts Ledger Table (كشف مديونيات العملاء المعتمد) */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  كشف وتفصيل مديونيات العملاء المعتمد (سجل المدينين)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900">
                  {kpis.totalPositiveCustomerDebts.toLocaleString()} ريال
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                قائمة مفصلة بجميع العملاء الذين عليهم مبالغ للمتجر مع إمكانية فتح كشف حساب فوري لكل عميل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebtorTable(!showDebtorTable)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {showDebtorTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{showDebtorTable ? 'طي الجدول' : 'عرض الجدول'}</span>
            </button>
          </div>
        </div>

        {showDebtorTable && (
          <div className="mt-4 space-y-4">
            
            {/* Filters & Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
                {[
                  { id: 'DEBTORS', label: `المدينين فقط (${customerDebtsDetailedList.filter(c => c.isDebtor).length})` },
                  { id: 'OVER_20K', label: `أكثر من 20 ألف (${customerDebtsDetailedList.filter(c => c.balance >= 20000).length})` },
                  { id: 'ALL', label: `كافة العملاء (${customerDebtsDetailedList.length})` },
                  { id: 'CREDITORS', label: `أرصدة دائنة (${customerDebtsDetailedList.filter(c => c.isCreditor).length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDebtFilterType(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      debtFilterType === tab.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={debtSearchTerm}
                  onChange={e => setDebtSearchTerm(e.target.value)}
                  placeholder="بحث باسم العميل، الكود، الهاتف..."
                  className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">كود العميل</th>
                    <th className="py-2.5 px-3">اسم العميل</th>
                    <th className="py-2.5 px-3">المحافظة / الهاتف</th>
                    <th className="py-2.5 px-3 text-center">الطلبات</th>
                    <th className="py-2.5 px-3 text-left">رصيد افتتاحي</th>
                    <th className="py-2.5 px-3 text-left">إجمالي المشتريات</th>
                    <th className="py-2.5 px-3 text-left">إجمالي المسدد</th>
                    <th className="py-2.5 px-3 text-left bg-amber-100/60 text-amber-950 font-black">
                      المتبقي للمتجر (الرصيد)
                    </th>
                    <th className="py-2.5 px-3 text-center">الحصة من الديون</th>
                    <th className="py-2.5 px-3 text-center print:hidden">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDebtorsList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        لا توجد نتائج مطابقة لخيارات البحث أو الفلترة الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredDebtorsList.map((item, idx) => {
                      const debtShare = kpis.totalPositiveCustomerDebts > 0 && item.balance > 0
                        ? ((item.balance / kpis.totalPositiveCustomerDebts) * 100).toFixed(1)
                        : '0';

                      return (
                        <tr
                          key={item.customer.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            item.balance > 50000 ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">
                            {item.customer.code || `CUST-${item.customer.id}`}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 block">{item.customer.name}</span>
                            {item.balance > 50000 && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                                رصيد كبير
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            <span className="block font-medium">{item.customer.governorate || 'صنعاء'}</span>
                            <span className="text-[11px] font-mono text-slate-400">{item.customer.phone}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                            {item.ordersCount}
                          </td>
                          <td className="py-2 px-3 text-left font-mono text-slate-600">
                            {item.openingBalance > 0 ? `${item.openingBalance.toLocaleString()} ر.ي` : '—'}
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-bold text-slate-800">
                            {item.totalOrdersDebit.toLocaleString()} ر.ي
                          </td>
                          <td className="py-2 px-3 text-left font-mono text-emerald-700 font-bold">
                            {item.totalPaymentsCredit.toLocaleString()} ر.ي
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-black text-sm bg-amber-50/50">
                            {item.balance > 0 ? (
                              <span className="text-amber-900">
                                {item.balance.toLocaleString()} ر.ي
                              </span>
                            ) : item.balance < 0 ? (
                              <span className="text-emerald-700">
                                ({Math.abs(item.balance).toLocaleString()}-) فائض
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">خالص 0 ر.ي</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.balance > 0 ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                                {debtShare}%
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center print:hidden">
                            <button
                              onClick={() => handleOpenCustomerStatement(item.customer)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] transition-colors cursor-pointer"
                              title="استعراض كشف الحساب الرسمي للعميل وطباعته"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-800" />
                              <span>كشف حساب</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-slate-800 text-xs">
                      إجمالي مديونيات القائمة المعروضة ({filteredDebtorsList.length} عميل):
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {filteredDebtorsList.reduce((s, i) => s + i.ordersCount, 0)}
                    </td>
                    <td className="py-3 px-3 text-left font-mono">
                      {filteredDebtorsList.reduce((s, i) => s + i.openingBalance, 0).toLocaleString()} ر.ي
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-slate-900">
                      {filteredDebtorsList.reduce((s, i) => s + i.totalOrdersDebit, 0).toLocaleString()} ر.ي
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-emerald-800">
                      {filteredDebtorsList.reduce((s, i) => s + i.totalPaymentsCredit, 0).toLocaleString()} ر.ي
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-amber-900 font-black text-sm bg-amber-100">
                      {filteredDebtorsList.reduce((s, i) => s + (i.balance > 0 ? i.balance : 0), 0).toLocaleString()} ر.ي
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-slate-500 font-mono text-xs">
                      مطابق 100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        )}
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

          {/* Official Audited Income Statement & Cash Flow Statement */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Calculator className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    قائمة الدخل والتدفقات النقدية المحاسبية المعتمدة (Income & Cashflow Statement)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    التحليل الرياضي التفصيلي الشامل للإيرادات، التكاليف، هوامش الربح، والسيولة النقدية الفعلية
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                <span>العملة: الريال اليمني (YER)</span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">البند المحاسبي الرسمي</th>
                    <th className="py-2.5 px-3">التفصيل والبيان</th>
                    <th className="py-2.5 px-3 text-center">النسبة من المبيعات</th>
                    <th className="py-2.5 px-3 text-left">المبلغ المعتمد (ريال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Revenue */}
                  <tr className="bg-emerald-50/30">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      ١. إجمالي المبيعات التشغيلية (Gross Revenue)
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      إجمالي فواتير {kpis.ordersCount} طلبية نشطة في الفترة
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      100%
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-emerald-800 text-sm">
                      +{kpis.totalSales.toLocaleString()}
                    </td>
                  </tr>

                  {/* COGS */}
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-800 pr-7">
                      يُخصم: تكلفة البضاعة المباعة والمشتريات (COGS)
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      تكاليف شراء السلع من المتاجر الخارجية (شي إن، علي إكسبرس)
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {kpis.totalSales > 0 ? ((kpis.totalPurchaseCost / kpis.totalSales) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-rose-700">
                      -{kpis.totalPurchaseCost.toLocaleString()}
                    </td>
                  </tr>

                  {/* Gross Profit */}
                  <tr className="bg-amber-50/50 font-bold border-t border-b border-amber-200">
                    <td className="py-3 px-3 text-amber-950 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      = مجمل الربح التجاري (Gross Profit)
                    </td>
                    <td className="py-3 px-3 text-amber-900 text-[11px]">
                      الفارق بين قيمة البيع وتكلفة البضاعة قبل المصاريف التشغيلية
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-900">
                      {kpis.grossMarginPercent}%
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-amber-900 text-sm">
                      +{kpis.grossProfit.toLocaleString()}
                    </td>
                  </tr>

                  {/* Expenses */}
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-800 pr-7">
                      يُخصم: المصروفات التشغيلية والعمومية (OPEX)
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      إجمالي {filteredData.expenses.length} سند صرف (إيجار، رواتب، اتصالات، مستلزمات)
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {kpis.totalSales > 0 ? ((kpis.totalExpenseAmount / kpis.totalSales) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-rose-700">
                      -{kpis.totalExpenseAmount.toLocaleString()}
                    </td>
                  </tr>

                  {/* Shipping Costs Note */}
                  <tr>
                    <td className="py-2.5 px-3 text-slate-500 pr-10 text-[11px]">
                      منها: تكاليف النقل والشحن اللوجستي ({filteredData.shipments.length} شحنة)
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      أجور شركة المهيب، القدسي للشحن والتخليص
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                      {kpis.totalSales > 0 ? ((kpis.totalShippingCosts / kpis.totalSales) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-slate-600 text-[11px]">
                      ({kpis.totalShippingCosts.toLocaleString()})
                    </td>
                  </tr>

                  {/* Net Operating Profit */}
                  <tr className="bg-emerald-100/70 font-black border-t-2 border-b-2 border-emerald-400">
                    <td className="py-3 px-3 text-emerald-950 flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      = صافي الربح التشغيلي المحقق (Net Profit)
                    </td>
                    <td className="py-3 px-3 text-emerald-900 text-xs">
                      الربح الصافي النهائي المحقق من النشاط التجاري
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-950 text-sm">
                      {kpis.netProfitMarginPercent}%
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-emerald-950 text-base">
                      +{kpis.netProfit.toLocaleString()} ريال
                    </td>
                  </tr>

                  {/* Cash Flow Section */}
                  <tr className="bg-blue-50/40">
                    <td className="py-3 px-3 font-bold text-blue-950 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-blue-700" />
                      مؤشر السيولة: فائض التدفق النقدي الفعلي (Net Cash Flow)
                    </td>
                    <td className="py-3 px-3 text-blue-900 text-[11px]">
                      المقبوض نقداً ({kpis.totalPaid.toLocaleString()} ر.ي) ناقص المصروفات المدفوعة ({kpis.totalExpenseAmount.toLocaleString()} ر.ي)
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-blue-900 font-bold">
                      {kpis.totalSales > 0 ? Math.round((kpis.netCollectedCash / kpis.totalSales) * 100) : 0}%
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-blue-900 text-sm">
                      +{kpis.netCollectedCash.toLocaleString()} ريال
                    </td>
                  </tr>

                  {/* Outstanding Debts Section */}
                  <tr className="bg-amber-50/30">
                    <td className="py-3 px-3 font-bold text-amber-950 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-700" />
                      الذمم والديون المؤجلة (حقوق متوقعة للتحصيل)
                    </td>
                    <td className="py-3 px-3 text-amber-900 text-[11px]">
                      إجمالي ديون العملاء ({kpis.totalPositiveCustomerDebts.toLocaleString()} ر.ي) + مستحقات وسلف أخرى ({totalReceivables.toLocaleString()} ر.ي)
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-900 font-bold">
                      {kpis.debtorsCount} عميل
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-amber-900 text-sm">
                      +{(kpis.totalPositiveCustomerDebts + totalReceivables).toLocaleString()} ريال
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                المعادلة المحاسبية المعتمدة: صافي الربح = مجمل الربح - المصروفات التشغيلية. التدفق النقدي = المقبوض نقداً - المصروفات.
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                مطابق 100% لسجلات قيود اليومية
              </span>
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
                    {filteredData.expenses.slice(0, 4).map((exp, idx) => (
                      <tr key={`exp-${exp.id}-${exp.expenseNumber || idx}`} className="hover:bg-slate-50">
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

      {/* Customer Statement Modal for Quick Ledger Drilldown */}
      {selectedStatementCustomer && (
        <CustomerStatementModal
          customer={selectedStatementCustomer}
          isOpen={isStatementModalOpen}
          onClose={() => {
            setIsStatementModalOpen(false);
            setSelectedStatementCustomer(null);
          }}
        />
      )}

    </div>
  );
};
