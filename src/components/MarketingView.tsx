import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Target,
  TrendingUp,
  Wallet,
  Users,
  ShoppingCart,
  Percent,
  Tag,
  Share2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  BarChart3,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MarketingCampaign, MarketingChannel, DiscountCode, MarketingBudget, Referral } from '../types';

export const MarketingView: React.FC = () => {
  const {
    marketingCampaigns,
    marketingChannels,
    discountCodes,
    marketingBudgets,
    referrals,
    orders,
    customers,
    marketingStats,
    addMarketingCampaign,
    updateMarketingCampaign,
    deleteMarketingCampaign,
    addMarketingChannel,
    addDiscountCode,
    updateDiscountCode,
    addMarketingBudget,
    addReferral,
    updateReferralStatus
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'campaigns' | 'channels' | 'discountCodes' | 'referrals' | 'budgets'>('overview');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const [isNewDiscountOpen, setIsNewDiscountOpen] = useState(false);
  const [isNewReferralOpen, setIsNewReferralOpen] = useState(false);
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false);

  // New Campaign Form
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    platform: 'Instagram',
    channelId: '',
    budget: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    objective: 'زيادة الطلبات والمبيعات',
    targetAudience: 'الفتيات والنساء في صنعاء والمحافظات',
    offerUsed: '',
    discountCode: '',
    campaignUrl: '',
    notes: '',
    status: 'active' as MarketingCampaign['status']
  });

  // New Channel Form
  const [channelForm, setChannelForm] = useState({
    name: '',
    type: 'social' as MarketingChannel['type'],
    costPerLead: '',
    notes: ''
  });

  // New Discount Form
  const [discountForm, setDiscountForm] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    campaignId: '',
    channelId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  // New Referral Form
  const [referralForm, setReferralForm] = useState({
    referrerCustomerId: '',
    referredCustomerId: '',
    orderId: '',
    rewardAmount: '1000',
    notes: ''
  });

  // New Budget Form
  const [budgetForm, setBudgetForm] = useState({
    title: '',
    budgetType: 'monthly' as 'monthly' | 'campaign' | 'channel',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    amount: '',
    alertThreshold: '80',
    notes: ''
  });

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return marketingCampaigns.filter(c => {
      if (startDate && c.startDate < startDate) return false;
      if (endDate && c.startDate > endDate) return false;
      return true;
    });
  }, [marketingCampaigns, startDate, endDate]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name) return;

    addMarketingCampaign({
      name: campaignForm.name,
      platform: campaignForm.platform,
      channelId: campaignForm.channelId ? Number(campaignForm.channelId) : null,
      budget: Number(campaignForm.budget) || 0,
      startDate: campaignForm.startDate,
      endDate: campaignForm.endDate || null,
      objective: campaignForm.objective || null,
      targetAudience: campaignForm.targetAudience || null,
      offerUsed: campaignForm.offerUsed || null,
      discountCode: campaignForm.discountCode || null,
      campaignUrl: campaignForm.campaignUrl || null,
      status: campaignForm.status,
      notes: campaignForm.notes || null
    });

    setIsNewCampaignOpen(false);
    setCampaignForm({
      name: '',
      platform: 'Instagram',
      channelId: '',
      budget: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      objective: 'زيادة الطلبات والمبيعات',
      targetAudience: 'الفتيات والنساء في صنعاء والمحافظات',
      offerUsed: '',
      discountCode: '',
      campaignUrl: '',
      notes: '',
      status: 'active'
    });
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.name) return;

    addMarketingChannel({
      name: channelForm.name,
      type: channelForm.type,
      costPerLead: Number(channelForm.costPerLead) || 0,
      status: 'active',
      notes: channelForm.notes || null
    });

    setIsNewChannelOpen(false);
    setChannelForm({ name: '', type: 'social', costPerLead: '', notes: '' });
  };

  const handleCreateDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.code || !discountForm.discountValue) return;

    addDiscountCode({
      code: discountForm.code.toUpperCase().trim(),
      discountType: discountForm.discountType,
      discountValue: Number(discountForm.discountValue) || 0,
      campaignId: discountForm.campaignId ? Number(discountForm.campaignId) : null,
      channelId: discountForm.channelId ? Number(discountForm.channelId) : null,
      startDate: discountForm.startDate || null,
      endDate: discountForm.endDate || null,
      status: 'active'
    });

    setIsNewDiscountOpen(false);
    setDiscountForm({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      campaignId: '',
      channelId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
  };

  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralForm.referrerCustomerId || !referralForm.referredCustomerId) return;

    addReferral({
      referrerCustomerId: Number(referralForm.referrerCustomerId),
      referredCustomerId: Number(referralForm.referredCustomerId),
      orderId: referralForm.orderId ? Number(referralForm.orderId) : null,
      referralDate: new Date().toISOString().split('T')[0],
      rewardAmount: Number(referralForm.rewardAmount) || 0,
      status: 'new',
      rewardApproved: false,
      notes: referralForm.notes || null
    });

    setIsNewReferralOpen(false);
    setReferralForm({
      referrerCustomerId: '',
      referredCustomerId: '',
      orderId: '',
      rewardAmount: '1000',
      notes: ''
    });
  };

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.title || !budgetForm.amount) return;

    addMarketingBudget({
      title: budgetForm.title,
      budgetType: budgetForm.budgetType,
      periodStart: budgetForm.periodStart,
      periodEnd: budgetForm.periodEnd,
      amount: Number(budgetForm.amount) || 0,
      alertThreshold: Number(budgetForm.alertThreshold) || 80,
      notes: budgetForm.notes || null
    });

    setIsNewBudgetOpen(false);
    setBudgetForm({
      title: '',
      budgetType: 'monthly',
      periodStart: new Date().toISOString().split('T')[0],
      periodEnd: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      amount: '',
      alertThreshold: '80',
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-l from-amber-600 via-amber-700 to-amber-900 rounded-2xl text-white p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-xs font-bold text-amber-200 mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              <span>النمو والتسويق وتحليل العائد التجاري</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">منظومة التسويق وقنوات الاستقطاب</h1>
            <p className="text-sm text-amber-100/90 mt-1 max-w-2xl">
              تتبع وربط كل ريال يُصرف على الإعلانات (إنستغرام، تيك توك، سناب شات) بالمبيعات والطلبيات والربح الحقيقي وحساب الـ ROAS والـ CAC بدقة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNewCampaignOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-amber-900 hover:bg-amber-50 font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>حملة إعلانية جديدة</span>
            </button>

            <button
              onClick={() => setIsNewDiscountOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs sm:text-sm"
            >
              <Tag className="w-4 h-4" />
              <span>كود خصم</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total Spend */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">إجمالي الإنفاق</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {marketingStats.totalSpend.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">مصاريف الحملات المباشرة</p>
        </div>

        {/* Marketing Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">مبيعات الحملات</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {marketingStats.totalSales.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{marketingStats.ordersCount} طلبات مرتبطة</p>
        </div>

        {/* ROAS (Return on Ad Spend) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">عائد الإنفاق ROAS</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-800 font-mono">
            {marketingStats.roas.toFixed(2)}x
          </div>
          <p className="text-[11px] text-slate-400 mt-1">المبيعات ÷ المصروف الإعلاني</p>
        </div>

        {/* CAC (Customer Acquisition Cost) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">تكلفة اكتساب العميل CAC</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-800 font-mono">
            {marketingStats.cac.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{marketingStats.customersCount} عملاء جدد</p>
        </div>

      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-amber-50/50 border border-amber-200/70 p-3.5 rounded-2xl">
        <div>
          <span className="text-xs text-slate-500 block">تكلفة الطلب الواحد (Cost/Order):</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{marketingStats.costPerOrder.toLocaleString()} YER</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">العائد على الاستثمار (ROI):</span>
          <span className={`text-sm font-bold font-mono ${marketingStats.roi >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {marketingStats.roi}%
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">متوسط السلة الشرائية (AOV):</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{marketingStats.aov.toLocaleString()} YER</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">أفضل حملة مبيعاً:</span>
          <span className="text-sm font-bold text-amber-900 truncate block">
            {marketingStats.bestCampaign ? marketingStats.bestCampaign.name : '—'}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'لوحة القيادة', icon: BarChart3 },
            { id: 'campaigns', label: `الحملات الإعلانية (${marketingCampaigns.length})`, icon: Megaphone },
            { id: 'channels', label: `القنوات التسويقية (${marketingChannels.length})`, icon: Layers },
            { id: 'discountCodes', label: `أكواد الخصم (${discountCodes.length})`, icon: Tag },
            { id: 'referrals', label: `إحالات العملاء (${referrals.length})`, icon: Share2 },
            { id: 'budgets', label: `الميزانيات المعتمدة (${marketingBudgets.length})`, icon: Wallet }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab 1: Overview Dashboard */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Active Campaigns Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">الحملات النشطة والجارية</h3>
                </div>
                <button
                  onClick={() => setActiveSubTab('campaigns')}
                  className="text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض الكل</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {marketingCampaigns.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">لا توجد حملات تسويقية بعد. أنشئ أول حملة!</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {marketingCampaigns.slice(0, 4).map(c => {
                    const campaignOrders = orders.filter(o => o.marketingCampaignId === c.id);
                    const campaignSales = campaignOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                    const budgetUsedPercent = c.budget > 0 ? Math.min(100, Math.round((c.actualSpend / c.budget) * 100)) : 0;

                    return (
                      <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 truncate">{c.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              {c.platform}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            الميزانية: <span className="font-mono text-slate-700 font-bold">{c.budget.toLocaleString()}</span> YER • المصروف: <span className="font-mono text-rose-600 font-bold">{c.actualSpend.toLocaleString()}</span> YER
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="text-xs font-bold text-emerald-700 font-mono">
                            {campaignSales.toLocaleString()} YER
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {campaignOrders.length} طلبات
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Performance by Channel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">توزيع العائد حسب القنوات</h3>
                </div>
                <button
                  onClick={() => setIsNewChannelOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة قناة</span>
                </button>
              </div>

              {marketingChannels.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">لا توجد قنوات تسويقية مسجلة.</div>
              ) : (
                <div className="space-y-3">
                  {marketingChannels.map(ch => {
                    const channelOrders = orders.filter(o => o.marketingChannelId === ch.id || o.referralSource === ch.name);
                    const channelSales = channelOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                    const channelCustomers = customers.filter(c => c.marketingChannelId === ch.id || c.marketingSource === ch.name);

                    return (
                      <div key={ch.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800">{ch.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                              {ch.type === 'social' ? 'شبكات تواصل' : ch.type === 'referral' ? 'إحالات' : 'مباشر'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {channelCustomers.length} عميل مستقطب • {channelOrders.length} طلب
                          </div>
                        </div>

                        <div className="text-left font-mono font-bold text-sm text-slate-900">
                          {channelSales.toLocaleString()} <span className="text-xs font-normal text-slate-400">YER</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Quick Active Discount Codes & Referrals summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Active Discount Codes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>أكواد الخصم النشطة</span>
                </h3>
                <button
                  onClick={() => setIsNewDiscountOpen(true)}
                  className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  + كود جديد
                </button>
              </div>

              <div className="space-y-2">
                {discountCodes.map(dc => (
                  <div key={dc.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs px-2 py-1 bg-amber-100 text-amber-900 rounded-md border border-amber-300">
                        {dc.code}
                      </span>
                      <span className="text-xs text-slate-600">
                        {dc.discountType === 'percentage' ? `${dc.discountValue}% خصم` : `${dc.discountValue.toLocaleString()} YER ثابت`}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      استُخدم {dc.usageCount} مرات
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Referrals Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-purple-600" />
                  <span>برنامج إحالات العملاء</span>
                </h3>
                <button
                  onClick={() => setIsNewReferralOpen(true)}
                  className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
                >
                  + تسجيل إحالة
                </button>
              </div>

              <div className="space-y-2">
                {referrals.slice(0, 3).map(ref => (
                  <div key={ref.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {ref.referrerCustomerName} ← {ref.referredCustomerName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        مكافأة: {ref.rewardAmount.toLocaleString()} YER
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ref.status === 'rewarded'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ref.status === 'qualified'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ref.status === 'rewarded' ? 'تمت المكافأة' : ref.status === 'qualified' ? 'مؤهل' : 'قيد الانتظار'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Sub-Tab 2: Campaigns List */}
      {activeSubTab === 'campaigns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">سجل الحملات التسويقية والترويجية</h2>
            </div>

            <button
              onClick={() => setIsNewCampaignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حملة جديدة</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم الحملة</th>
                  <th className="p-3">اسم الحملة والمنصة</th>
                  <th className="p-3">الهدف والجمهور</th>
                  <th className="p-3">تاريخ البداية</th>
                  <th className="p-3">الميزانية</th>
                  <th className="p-3">الإنفاق الفعلي</th>
                  <th className="p-3">المبيعات الناتجة</th>
                  <th className="p-3">ROAS</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marketingCampaigns.map(c => {
                  const campaignOrders = orders.filter(o => o.marketingCampaignId === c.id);
                  const sales = campaignOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                  const roas = c.actualSpend > 0 ? (sales / c.actualSpend).toFixed(2) : '—';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-700">{c.campaignNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.platform}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800 max-w-xs truncate">{c.objective || '—'}</div>
                        <div className="text-[11px] text-slate-400 max-w-xs truncate">{c.targetAudience}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{c.startDate}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{c.budget.toLocaleString()} YER</td>
                      <td className="p-3 font-mono font-bold text-rose-700">{c.actualSpend.toLocaleString()} YER</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{sales.toLocaleString()} YER</td>
                      <td className="p-3 font-mono font-bold text-blue-700">{roas}x</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'ended'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status === 'active' ? 'نشطة' : c.status === 'ended' ? 'منتهية' : c.status === 'paused' ? 'متوقفة' : 'مسودة'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Channels List */}
      {activeSubTab === 'channels' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">القنوات التسويقية وتتبع المصادر</h2>
              <p className="text-xs text-slate-500">القنوات التي يتعرف من خلالها العملاء على المتجر ويطلبون منها</p>
            </div>
            <button
              onClick={() => setIsNewChannelOpen(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قناة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketingChannels.map(ch => {
              const chOrders = orders.filter(o => o.marketingChannelId === ch.id || o.referralSource === ch.name);
              const chSales = chOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              const chCust = customers.filter(c => c.marketingChannelId === ch.id || c.marketingSource === ch.name);

              return (
                <div key={ch.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">{ch.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                        {ch.type}
                      </span>
                    </div>
                    {ch.notes && <p className="text-xs text-slate-500 mb-3">{ch.notes}</p>}
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">العملاء:</span>
                      <span className="font-bold text-slate-800">{chCust.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">الطلبات:</span>
                      <span className="font-bold text-slate-800">{chOrders.length}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-400 block text-[10px]">المبيعات:</span>
                      <span className="font-bold text-emerald-700 font-mono">{chSales.toLocaleString()} YER</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Discount Codes */}
      {activeSubTab === 'discountCodes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">أكواد الخصم والترويج</h2>
              <p className="text-xs text-slate-500">أكواد التخفيض الممنوحة للمؤثرين والحملات الإعلانية ومتابعة مرات الاستخدام</p>
            </div>
            <button
              onClick={() => setIsNewDiscountOpen(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء كود خصم</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">الكود</th>
                  <th className="p-3">نوع الخصم</th>
                  <th className="p-3">القيمة</th>
                  <th className="p-3">الحد الأدنى للطلب</th>
                  <th className="p-3">مرات الاستخدام</th>
                  <th className="p-3">تاريخ الصلاحية</th>
                  <th className="p-3">الوصف</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountCodes.map(dc => (
                  <tr key={dc.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className="font-mono font-black text-xs px-2.5 py-1 bg-amber-100 text-amber-900 rounded-md border border-amber-300">
                        {dc.code}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">
                      {dc.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-700">
                      {dc.discountType === 'percentage' ? `${dc.discountValue}%` : `${dc.discountValue.toLocaleString()} YER`}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {dc.channelId ? `قناة #${dc.channelId}` : 'عام'}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {dc.usageCount}
                    </td>
                    <td className="p-3 font-mono text-slate-500">{dc.endDate || 'مفتوح'}</td>
                    <td className="p-3 text-slate-600">{dc.campaignId ? `حملة #${dc.campaignId}` : '—'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {dc.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Referrals */}
      {activeSubTab === 'referrals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">سجل إحالات العملاء</h2>
              <p className="text-xs text-slate-500">برنامج التسويق بالإحالة للعملاء المكتسبين ومكافآتهم</p>
            </div>
            <button
              onClick={() => setIsNewReferralOpen(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل إحالة جديدة</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم الإحالة</th>
                  <th className="p-3">العميل صاحب الإحالة</th>
                  <th className="p-3">العميل الجديد المستقطب</th>
                  <th className="p-3">المكافأة المقررة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">اعتماد المكافأة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-700">{ref.referralNumber}</td>
                    <td className="p-3 font-bold text-slate-800">{ref.referrerCustomerName}</td>
                    <td className="p-3 text-slate-800">{ref.referredCustomerName}</td>
                    <td className="p-3 font-mono font-bold text-purple-700">
                      {ref.rewardAmount.toLocaleString()} YER مكافأة
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ref.status === 'rewarded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ref.status === 'ordered'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ref.status === 'rewarded' ? 'تم الصرف' : ref.status === 'ordered' ? 'قام بالطلب' : 'جديد'}
                      </span>
                    </td>
                    <td className="p-3">
                      {ref.status !== 'rewarded' ? (
                        <button
                          onClick={() => updateReferralStatus(ref.id, 'rewarded', true)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          اعتماد المكافأة
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">معتمدة ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 6: Marketing Budgets */}
      {activeSubTab === 'budgets' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">الميزانيات التسويقية والحدود المالية</h2>
              <p className="text-xs text-slate-500">تخصيص الميزانيات الترويجية الشهرية والربع سنوية ومقارنتها بالصرف الفعلي</p>
            </div>
            <button
              onClick={() => setIsNewBudgetOpen(true)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تخصيص ميزانية جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketingBudgets.map(b => {
              const spent = marketingStats.totalSpend;
              const percent = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;

              return (
                <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900">{b.title}</span>
                      <span className="text-xs text-slate-400 block">
                        {b.budgetType === 'monthly' ? 'شهري' : b.budgetType === 'campaign' ? 'لحملة' : 'لقناة'} • من {b.periodStart} إلى {b.periodEnd}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200">
                      {b.amount.toLocaleString()} YER
                    </span>
                  </div>

                  {b.notes && <p className="text-xs text-slate-500">{b.notes}</p>}

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">نسبة الاستهلاك الفعلي:</span>
                      <span className="font-bold font-mono text-slate-800">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${percent > 90 ? 'bg-rose-500' : percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal 1: Create Campaign */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">إنشاء حملة تسويقية جديدة</h3>
              <button onClick={() => setIsNewCampaignOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم الحملة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حملة فساتين العيد - إنستغرام"
                  value={campaignForm.name}
                  onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المنصة الإعلانية</label>
                  <select
                    value={campaignForm.platform}
                    onChange={e => setCampaignForm({ ...campaignForm, platform: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  >
                    <option value="Instagram">إنستغرام (Instagram)</option>
                    <option value="TikTok">تيك توك (TikTok)</option>
                    <option value="Snapchat">سناب شات (Snapchat)</option>
                    <option value="WhatsApp">واتساب (WhatsApp)</option>
                    <option value="Facebook">فيسبوك (Facebook)</option>
                    <option value="Influencer">مؤثر / بلوقر (Influencer)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">القناة المرتبطة</label>
                  <select
                    value={campaignForm.channelId}
                    onChange={e => setCampaignForm({ ...campaignForm, channelId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  >
                    <option value="">(اختياري - اختر قناة)</option>
                    {marketingChannels.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الميزانية المقررة (YER)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 50000"
                    value={campaignForm.budget}
                    onChange={e => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ الانطلاق *</label>
                  <input
                    type="date"
                    required
                    value={campaignForm.startDate}
                    onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الهدف الرئيسي للحملة</label>
                <input
                  type="text"
                  placeholder="مثال: استقطاب 50 طلب لفساتين شي إن"
                  value={campaignForm.objective}
                  onChange={e => setCampaignForm({ ...campaignForm, objective: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الجمهور المستهدف</label>
                <input
                  type="text"
                  placeholder="مثال: طالبات الجامعات والنساء في أمانة العاصمة"
                  value={campaignForm.targetAudience}
                  onChange={e => setCampaignForm({ ...campaignForm, targetAudience: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">العرض المستخدم وكود الخصم المرتبط</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="العرض: خصم 10% على الشحن"
                    value={campaignForm.offerUsed}
                    onChange={e => setCampaignForm({ ...campaignForm, offerUsed: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                  <input
                    type="text"
                    placeholder="كود الخصم: TOP10"
                    value={campaignForm.discountCode}
                    onChange={e => setCampaignForm({ ...campaignForm, discountCode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
                >
                  حفظ الحملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Channel */}
      {isNewChannelOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">إضافة قناة تسويقية جديدة</h3>
              <button onClick={() => setIsNewChannelOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم القناة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إعلانات تيك توك ممولة"
                  value={channelForm.name}
                  onChange={e => setChannelForm({ ...channelForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">النوع</label>
                <select
                  value={channelForm.type}
                  onChange={e => setChannelForm({ ...channelForm, type: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                >
                  <option value="social">شبكات التواصل الاجتماعي</option>
                  <option value="referral">إحالات وتوصيات عملاء</option>
                  <option value="influencer">مؤثرين وتسويق بالعمولة</option>
                  <option value="direct">مباشر ومحلي</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={channelForm.notes}
                  onChange={e => setChannelForm({ ...channelForm, notes: e.target.value })}
                  placeholder="أي تفاصيل حول القناة"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewChannelOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
                >
                  حفظ القناة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Discount Code */}
      {isNewDiscountOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">إنشاء كود خصم جديد</h3>
              <button onClick={() => setIsNewDiscountOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateDiscount} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">رمز كود الخصم (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: TOP15"
                  value={discountForm.code}
                  onChange={e => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase focus:outline-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع الخصم *</label>
                  <select
                    value={discountForm.discountType}
                    onChange={e => setDiscountForm({ ...discountForm, discountType: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (YER)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">قيمة الخصم *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="مثال: 10 أو 2000"
                    value={discountForm.discountValue}
                    onChange={e => setDiscountForm({ ...discountForm, discountValue: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    value={discountForm.startDate}
                    onChange={e => setDiscountForm({ ...discountForm, startDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={discountForm.endDate}
                    onChange={e => setDiscountForm({ ...discountForm, endDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewDiscountOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
                >
                  حفظ الكود
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Create Referral */}
      {isNewReferralOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">تسجيل إحالة عميل جديدة</h3>
              <button onClick={() => setIsNewReferralOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">العميل صاحب الإحالة (المرجع) *</label>
                <select
                  required
                  value={referralForm.referrerCustomerId}
                  onChange={e => setReferralForm({ ...referralForm, referrerCustomerId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                >
                  <option value="">اختر العميل الذي قام بالإحالة</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">العميل الجديد المستقطب *</label>
                <select
                  required
                  value={referralForm.referredCustomerId}
                  onChange={e => setReferralForm({ ...referralForm, referredCustomerId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                >
                  <option value="">اختر العميل الجديد المستقطب</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">مبلغ المكافأة المقررة (YER) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={referralForm.rewardAmount}
                  onChange={e => setReferralForm({ ...referralForm, rewardAmount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewReferralOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
                >
                  تسجيل الإحالة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Create Budget */}
      {isNewBudgetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">تخصيص ميزانية تسويقية جديدة</h3>
              <button onClick={() => setIsNewBudgetOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان الميزانية *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ميزانية التسويق لشهر رمضان"
                  value={budgetForm.title}
                  onChange={e => setBudgetForm({ ...budgetForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المبلغ المخصص (YER) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="مثال: 100000"
                    value={budgetForm.amount}
                    onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع الميزانية</label>
                  <select
                    value={budgetForm.budgetType}
                    onChange={e => setBudgetForm({ ...budgetForm, budgetType: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  >
                    <option value="monthly">شهرية</option>
                    <option value="campaign">حملة معينة</option>
                    <option value="channel">قناة تسويق</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    value={budgetForm.periodStart}
                    onChange={e => setBudgetForm({ ...budgetForm, periodStart: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={budgetForm.periodEnd}
                    onChange={e => setBudgetForm({ ...budgetForm, periodEnd: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewBudgetOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
                >
                  اعتماد الميزانية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
