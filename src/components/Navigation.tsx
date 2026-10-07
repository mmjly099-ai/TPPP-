import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Users,
  Wallet,
  Receipt,
  Truck,
  BookOpen,
  Scale,
  Bot,
  Settings,
  LayoutGrid,
  Menu,
  X,
  ChevronDown,
  Megaphone,
  PackageCheck,
  UploadCloud,
  FileText,
  CalendarDays,
  Bike
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export type NavTab =
  | 'dashboard'
  | 'analytics'
  | 'orders'
  | 'installments'
  | 'couriers'
  | 'invoices'
  | 'purchase-batches'
  | 'marketing'
  | 'customers'
  | 'accounts'
  | 'expenses'
  | 'shipments'
  | 'journal'
  | 'receivables'
  | 'assistant'
  | 'data-import'
  | 'settings';

interface NavigationProps {
  currentTab?: NavTab;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  setActiveTab?: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  setActiveTab
}) => {
  const { customers, orders, accounts, expenses, shipments, otherReceivables, purchaseBatches, marketingCampaigns, installmentPlans, couriers, deliveryTrips, journalEntries } = useStore();
  const [isFullMenuOpen, setIsFullMenuOpen] = useState(false);

  const selectedTab: NavTab = activeTab || currentTab || 'dashboard';

  const handleSwitchTab = (tabId: NavTab) => {
    if (setActiveTab) setActiveTab(tabId);
    if (onSelectTab) onSelectTab(tabId);
    setIsFullMenuOpen(false);
  };

  const activeAccountsCount = accounts.filter(a => a.status === 'active').length;
  const pendingOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const unsettledReceivables = otherReceivables.filter(r => r.status !== 'settled').length;
  const activeInstallmentsCount = installmentPlans.filter(p => p.status === 'active' || p.status === 'overdue').length;
  const activeTripsCount = (deliveryTrips || []).filter(t => t.status === 'in_progress').length;

  const tabs: {
    id: NavTab;
    label: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    badge?: number | string;
    color: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      description: 'نظرة عامة على السيولة النقدية، الإيرادات، وأهم المؤشرات المالية',
      icon: LayoutDashboard,
      color: 'amber'
    },
    {
      id: 'analytics',
      label: 'مركز التحليلات',
      description: 'تحليلات ذكية شاملة للمبيعات، السيولة، الأرباح، مصاريف التشغيل وسلوك العملاء',
      icon: BarChart3,
      color: 'emerald'
    },
    {
      id: 'orders',
      label: 'الطلبات والمشتريات',
      description: 'طلبيات الشراء من شي إن وعلي إكسبرس مع الفواتير وتتبع الدفعات',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      color: 'emerald'
    },
    {
      id: 'couriers',
      label: 'الموصلين والتوزيع',
      description: 'إدارة مناديب التوصيل، إنشاء رحلات التوزيع، تحصيلات COD وتصفية العهد النقدية',
      icon: Bike,
      badge: activeTripsCount > 0 ? activeTripsCount : (couriers?.length || undefined),
      color: 'blue'
    },
    {
      id: 'installments',
      label: 'نظام الدفعات والأقساط',
      description: 'جدولة أقساط العملاء (عربون، شحن، واستلام) وتتبع الدفعات المتأخرة وسندات القبض',
      icon: CalendarDays,
      badge: activeInstallmentsCount > 0 ? activeInstallmentsCount : undefined,
      color: 'amber'
    },
    {
      id: 'invoices',
      label: 'الفواتير وسندات القبض',
      description: 'فواتير الطلبات الرسمية، سندات القبض، كشوفات الحسابات والذمم المالية',
      icon: FileText,
      color: 'amber'
    },
    {
      id: 'purchase-batches',
      label: 'دفعات الشراء المجمعة',
      description: 'شراء طلبيات شي إن وعلي إكسبرس جماعياً بالبطاقات والمحافظ المصرفية',
      icon: PackageCheck,
      badge: purchaseBatches.length > 0 ? purchaseBatches.length : undefined,
      color: 'indigo'
    },
    {
      id: 'marketing',
      label: 'التسويق والعائد ROAS',
      description: 'قياس أداء إعلانات إنستغرام وتيك توك، أكواد الخصم، والإحالات وحساب CAC و ROAS',
      icon: Megaphone,
      badge: marketingCampaigns.length > 0 ? marketingCampaigns.length : undefined,
      color: 'amber'
    },
    {
      id: 'customers',
      label: 'العملاء والذمم',
      description: 'سجل العملاء، مديونياتهم، وكشوفات الحسابات التفصيلية للطباعة',
      icon: Users,
      badge: customers.length,
      color: 'blue'
    },
    {
      id: 'accounts',
      label: 'الصناديق والمحافظ',
      description: 'أرصدة محفظة جيب، الكريمي، أم فلوس، فيزا كارد، والتحويل بينها',
      icon: Wallet,
      badge: activeAccountsCount,
      color: 'indigo'
    },
    {
      id: 'expenses',
      label: 'المصاريف والتشغيل',
      description: 'تسجيل وتصنيف مصاريف الشحن، الإنترنت، الإيجار، والتسويق',
      icon: Receipt,
      badge: expenses.length,
      color: 'rose'
    },
    {
      id: 'shipments',
      label: 'الشحنات والتوصيل',
      description: 'شحنات شركات النقل (المهيب، القدسي) وتكاليف الشحن الخارجية',
      icon: Truck,
      badge: shipments.length,
      color: 'purple'
    },
    {
      id: 'journal',
      label: 'قيود اليومية والمحاسبة',
      description: 'دفتر الأستاذ والقيود المزدوجة الآلية مع ميزان المراجعة',
      icon: BookOpen,
      badge: journalEntries.length > 0 ? journalEntries.length : undefined,
      color: 'slate'
    },
    {
      id: 'receivables',
      label: 'ذمم مدينة وحقوق الملكية',
      description: 'متابعة حسابات وسلف المناديب ورأس مال الشركاء والمؤسسين',
      icon: Scale,
      badge: unsettledReceivables > 0 ? unsettledReceivables : undefined,
      color: 'teal'
    },
    {
      id: 'assistant',
      label: 'TOP STORE AI | المحلل الذكي',
      description: 'محلل مالي وتجاري ذكي يقرأ ويدقق بيانات المتجر لحظة بلحظة ويجيب بدقة',
      icon: Bot,
      color: 'purple'
    },
    {
      id: 'data-import',
      label: 'استيراد البيانات',
      description: 'استيراد وترحيل ملفات Excel و CSV و JSON مع فحص التكرار',
      icon: UploadCloud,
      color: 'indigo'
    },
    {
      id: 'settings',
      label: 'إعدادات المتجر',
      description: 'بيانات المتجر، النسخ الاحتياطي وتصدير واسترجاع ملفات JSON',
      icon: Settings,
      color: 'slate'
    }
  ];

  const currentActiveObject = tabs.find(t => t.id === selectedTab) || tabs[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-2">
      
      {/* Mobile/Tablet Bar with All Menus Toggle */}
      <div className="flex items-center justify-between gap-2 md:hidden pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {React.createElement(currentActiveObject.icon, { className: 'w-4 h-4 text-amber-600' })}
          <span className="text-xs font-bold text-slate-800">
            القسم الحالي: <span className="text-amber-700">{currentActiveObject.label}</span>
          </span>
        </div>

        <button
          onClick={() => setIsFullMenuOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>كامل القوائم ({tabs.length})</span>
        </button>
      </div>

      {/* Horizontal Nav Bar with Smooth Touch Scrolling */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth overscroll-x-contain touch-pan-x">
        
        <div className="flex items-center gap-1 shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => handleSwitchTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick full grid drawer opener on desktop */}
        <button
          onClick={() => setIsFullMenuOpen(true)}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 shrink-0 transition-colors cursor-pointer mr-1"
          title="عرض كامل القوائم والأقسام العشرة"
        >
          <LayoutGrid className="w-4 h-4 text-amber-600" />
          <span className="whitespace-nowrap">عرض القوائم</span>
        </button>
      </div>

      {/* Full Menus Modal / Directory (دليل القوائم الشامل) */}
      {isFullMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">دليل جميع أقسام وقوائم توب ستور</h3>
                  <p className="text-xs text-slate-500">اختر أي قسم للانتقال إليه مباشرة مع استعراض المهام المتاحة</p>
                </div>
              </div>

              <button
                onClick={() => setIsFullMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 10 Modules Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto p-1">
              {tabs.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = selectedTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSwitchTab(tab.id)}
                    className={`text-right p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                      isActive
                        ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {idx + 1}. {tab.label}
                        </span>

                        {tab.badge !== undefined && (
                          <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                            {tab.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {tab.description}
                      </p>

                      {isActive && (
                        <span className="inline-block mt-2 text-[10px] font-bold text-amber-700 bg-white border border-amber-200 px-2 py-0.5 rounded-md">
                          القسم النشط حالياً ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400">13 قسماً محاسبياً وتشغيلياً متكاملاً بالريال اليمني</span>
              <button
                onClick={() => setIsFullMenuOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
