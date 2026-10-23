import React, { useState } from 'react';
import {
  X,
  Search,
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  PackageCheck,
  Megaphone,
  Users,
  Wallet,
  Receipt,
  Truck,
  BookOpen,
  Scale,
  Bot,
  Settings,
  FileDown,
  ChevronLeft,
  UploadCloud,
  FileText,
  CalendarDays,
  Bike,
  Activity,
  Banknote
} from 'lucide-react';
import { NavTab } from '../Navigation';
import { useStore } from '../../context/StoreContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface MobileAllSectionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenBackup: () => void;
}

export const MobileAllSectionsSheet: React.FC<MobileAllSectionsSheetProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenBackup
}) => {
  const { orders, accounts, otherReceivables, customers, payments } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const pendingOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const unsettledReceivables = otherReceivables.filter(r => r.status !== 'settled').length;
  const activeAccountsCount = accounts.filter(a => a.status === 'active').length;

  const duplicatePaymentsCount = React.useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    (payments || []).forEach(p => {
      if (p.status === 'cancelled') return;
      const k = `${p.customerId}_${p.orderId || 'gen'}_${p.amount}_${p.paymentDate || p.createdAt?.split('T')[0]}_${p.accountId}`;
      if (seen.has(k)) {
        dupes++;
      } else {
        seen.add(k);
      }
    });
    return dupes;
  }, [payments]);

  const sections: {
    category: string;
    items: {
      id: NavTab;
      label: string;
      description: string;
      icon: React.FC<{ className?: string }>;
      badge?: number | string;
      color: string;
    }[];
  }[] = [
    {
      category: 'العمليات والطلبيات اليومية',
      items: [
        {
          id: 'dashboard',
          label: 'لوحة التحكم',
          description: 'نظرة عامة ومؤشرات السيولة والأرباح',
          icon: LayoutDashboard,
          color: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          id: 'orders',
          label: 'الطلبات والمشتريات',
          description: 'طلبيات شي إن وعلي إكسبرس وتتبع الدفعات',
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} قيد التنفيذ` : undefined,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        {
          id: 'payments',
          label: 'الدفعات والتحصيلات',
          description: 'سجل الدفعات المباشر، التعديل الفوري، وتنظيف الدفعات المكررة',
          icon: Banknote,
          badge: duplicatePaymentsCount > 0 ? `${duplicatePaymentsCount} مكررة!` : payments?.length || undefined,
          color: duplicatePaymentsCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        {
          id: 'couriers',
          label: 'الموصلين والتوزيع',
          description: 'إدارة مناديب التوصيل، إنشاء رحلات التوزيع، تحصيلات COD وتصفية العهد',
          icon: Bike,
          color: 'bg-blue-50 text-blue-700 border-blue-200'
        },
        {
          id: 'installments',
          label: 'دفعات الطلبات والتحصيل',
          description: 'استعراض بيانات الطلب وسجل الدفعات السابقة وسداد الدفعة الحالية',
          icon: Receipt,
          color: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          id: 'invoices',
          label: 'الفواتير وسندات القبض',
          description: 'فواتير الطلبات، سندات القبض، وكشوفات الحسابات والذمم',
          icon: FileText,
          color: 'bg-amber-50 text-amber-800 border-amber-200'
        },
        {
          id: 'purchase-batches',
          label: 'دفعات الشراء المجمعة',
          description: 'تنفيذ الشراء بالبطاقات والمحافظ المصرفية',
          icon: PackageCheck,
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        },
        {
          id: 'customers',
          label: 'سجل العملاء والمشترين',
          description: 'إدارة ديون وحسابات وكشوفات العملاء',
          icon: Users,
          badge: `${customers.length} عميل`,
          color: 'bg-blue-50 text-blue-700 border-blue-200'
        },
        {
          id: 'shipments',
          label: 'الشحنات والطرود الدولية',
          description: 'تتبع كراتين الشحن وشركات النقل والتكاليف',
          icon: Truck,
          color: 'bg-teal-50 text-teal-700 border-teal-200'
        }
      ]
    },
    {
      category: 'الحسابات والمالية والقيود',
      items: [
        {
          id: 'accounts',
          label: 'الصناديق والمحافظ والبنوك',
          description: 'الوارد والصادر والسيولة والتحويلات النقدية',
          icon: Wallet,
          badge: `${activeAccountsCount} حسابات نشطة`,
          color: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          id: 'expenses',
          label: 'سندات الصرف والمصاريف',
          description: 'إيجارات، شحن، كهرباء، رواتب وصرفيات تشغيل',
          icon: Receipt,
          color: 'bg-rose-50 text-rose-700 border-rose-200'
        },
        {
          id: 'workers',
          label: 'العمال وصرفياتهم',
          description: 'صرفيات القات، العشاء، المواصلات والسلف لكل عامل',
          icon: Users,
          color: 'bg-amber-50 text-amber-700 border-amber-200'
        },
        {
          id: 'journal',
          label: 'دفتر قيود اليومية المحاسبية',
          description: 'شجرة الحسابات، ميزان المراجعة، والقيد المزدوج',
          icon: BookOpen,
          color: 'bg-slate-100 text-slate-800 border-slate-300'
        },
        {
          id: 'receivables',
          label: 'الذمم المدينة ورأس المال',
          description: 'عهدة المندوبين، السلف، وحقوق الملكية',
          icon: Scale,
          badge: unsettledReceivables > 0 ? `${unsettledReceivables} معلقة` : undefined,
          color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
        }
      ]
    },
    {
      category: 'التحليلات والتسويق والإدارة',
      items: [
        {
          id: 'analytics',
          label: 'مركز التحليلات الشامل',
          description: 'تحليلات ذكية شاملة ومؤشرات أداء المتجر',
          icon: BarChart3,
          color: 'bg-violet-50 text-violet-700 border-violet-200'
        },
        {
          id: 'marketing',
          label: 'الحملات التسويقية والقنوات',
          description: 'كوبونات الخصم، تكلفة الاستحواذ، وعائد الإعلانات',
          icon: Megaphone,
          color: 'bg-pink-50 text-pink-700 border-pink-200'
        },
        {
          id: 'assistant',
          label: 'TOP STORE AI (المحلل الذكي)',
          description: 'محلل مالي وتجاري ذكي متصل بالبيانات الحقيقية',
          icon: Bot,
          color: 'bg-purple-50 text-purple-700 border-purple-200'
        },
        {
          id: 'data-import',
          label: 'استيراد البيانات ونقلها',
          description: 'استيراد وترحيل ملفات Excel و CSV و JSON بأمان',
          icon: UploadCloud,
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        },
        {
          id: 'supabase-monitor',
          label: 'مراقبة ومزامنة Supabase',
          description: 'حالة اتصال السحابة وتوقيت آخر مزامنة بين اللابتوب والجوال',
          icon: Activity,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        },
        {
          id: 'settings',
          label: 'إعدادات النظام والعملات',
          description: 'بيانات المتجر والنسب والطباعة',
          icon: Settings,
          color: 'bg-slate-50 text-slate-700 border-slate-200'
        }
      ]
    }
  ];

  const filteredSections = sections.map(sec => ({
    ...sec,
    items: sec.items.filter(item => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    })
  })).filter(sec => sec.items.length > 0);

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl p-5 border-t border-slate-200 max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Grab Handle */}
        <div className="flex justify-center -mt-1 mb-2">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">جميع أقسام توب ستور (14)</h3>
            <p className="text-xs text-slate-500">انتقال فوري وسريع بين جميع وظائف النظام</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search inside menu */}
        <div className="my-3 relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث سريع عن قسم أو تقرير..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Scrollable Modules List */}
        <div className="overflow-y-auto space-y-4 flex-1 pr-0.5">
          {filteredSections.map(group => (
            <div key={group.category} className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 px-1 block">
                {group.category}
              </span>

              <div className="space-y-1.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full text-right p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white border-slate-200/90 hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isActive ? 'bg-white/20 text-white border-white/30' : item.color
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold block truncate ${
                                isActive ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                                  isActive
                                    ? 'bg-white/25 text-white'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[11px] block truncate mt-0.5 ${
                              isActive ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <ChevronLeft
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* PWA Install Button Banner */}
          <div className="pt-2">
            <PWAInstallButton variant="banner" />
          </div>

          {/* Quick Backup Action Row */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenBackup();
              }}
              className="w-full p-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 flex items-center justify-between cursor-pointer transition-colors text-right"
            >
              <div className="flex items-center gap-2.5">
                <FileDown className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">تصدير واستعادة نسخة احتياطية (JSON)</span>
                  <span className="text-[10px] text-amber-800/80 block mt-0.5">تنزيل ملف البيانات أو استعادته بضغطة زر</span>
                </div>
              </div>
              <span className="text-[10px] bg-amber-200/80 px-2 py-1 rounded-lg font-bold">
                نسخ آمن
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 mt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
          >
            إغلاق القائمة
          </button>
        </div>

      </div>
    </div>
  );
};
