import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Wallet,
  LayoutGrid,
  Plus
} from 'lucide-react';
import { NavTab } from '../Navigation';
import { useStore } from '../../context/StoreContext';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickActions: () => void;
  onOpenAllSections: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickActions,
  onOpenAllSections
}) => {
  const { orders } = useStore();
  const pendingOrdersCount = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden pb-[calc(env(safe-area-inset-bottom,0px)+4px)]"
      aria-label="شريط التنقل السفلي للهاتف"
    >
      <div className="flex items-center justify-around px-2 py-1 relative">
        
        {/* 1. الرئيسية */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeTab === 'dashboard'
              ? 'text-amber-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 transition-transform ${activeTab === 'dashboard' ? 'scale-110 text-amber-600' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none">الرئيسية</span>
          {activeTab === 'dashboard' && (
            <span className="w-1 h-1 bg-amber-500 rounded-full mt-1"></span>
          )}
        </button>

        {/* 2. الطلبات */}
        <button
          onClick={() => onSelectTab('orders')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] relative ${
            activeTab === 'orders'
              ? 'text-amber-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 transition-transform ${activeTab === 'orders' ? 'scale-110 text-amber-600' : ''}`} />
            {pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono shadow-2xs">
                {pendingOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 leading-none">الطلبات</span>
          {activeTab === 'orders' && (
            <span className="w-1 h-1 bg-amber-500 rounded-full mt-1"></span>
          )}
        </button>

        {/* 3. زر الإجراء السريع المركزي (+) */}
        <div className="flex-1 flex items-center justify-center -mt-6">
          <button
            onClick={onOpenQuickActions}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/35 border-4 border-white transition-all active:scale-95 cursor-pointer hover:shadow-xl hover:shadow-amber-500/45"
            title="إجراء سريع جديد"
            aria-label="إجراء سريع جديد"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. الصناديق والمحافظ */}
        <button
          onClick={() => onSelectTab('accounts')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeTab === 'accounts'
              ? 'text-amber-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className={`w-5 h-5 transition-transform ${activeTab === 'accounts' ? 'scale-110 text-amber-600' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none">الصناديق</span>
          {activeTab === 'accounts' && (
            <span className="w-1 h-1 bg-amber-500 rounded-full mt-1"></span>
          )}
        </button>

        {/* 5. العملاء */}
        <button
          onClick={() => onSelectTab('customers')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeTab === 'customers'
              ? 'text-amber-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className={`w-5 h-5 transition-transform ${activeTab === 'customers' ? 'scale-110 text-amber-600' : ''}`} />
          <span className="text-[11px] mt-0.5 leading-none">العملاء</span>
          {activeTab === 'customers' && (
            <span className="w-1 h-1 bg-amber-500 rounded-full mt-1"></span>
          )}
        </button>

        {/* 6. المزيد / كامل الأقسام */}
        <button
          onClick={onOpenAllSections}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeTab !== 'dashboard' && activeTab !== 'orders' && activeTab !== 'accounts' && activeTab !== 'customers'
              ? 'text-amber-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 leading-none">المزيد</span>
          {activeTab !== 'dashboard' && activeTab !== 'orders' && activeTab !== 'accounts' && activeTab !== 'customers' && (
            <span className="w-1 h-1 bg-amber-500 rounded-full mt-1"></span>
          )}
        </button>

      </div>
    </nav>
  );
};
