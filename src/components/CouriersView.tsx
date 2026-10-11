import React, { useState } from 'react';
import {
  Bike,
  Package,
  Wallet,
  FileSpreadsheet,
  ShieldCheck,
  LayoutDashboard,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Courier } from '../types';

// Modular Subtabs
import { CourierDashboardTab } from './couriers/CourierDashboardTab';
import { DeliveryOrdersTab } from './couriers/DeliveryOrdersTab';
import { CouriersListTab } from './couriers/CouriersListTab';
import { SettlementsAndCollectionsTab } from './couriers/SettlementsAndCollectionsTab';
import { DeliveryWalletsTab } from './couriers/DeliveryWalletsTab';
import { DeliveryReportsTab } from './couriers/DeliveryReportsTab';
import { DeliveryAuditLogTab } from './couriers/DeliveryAuditLogTab';

// Modals
import { NewDeliveryOrderModal } from './modals/NewDeliveryOrderModal';
import { SettleCourierPayableModal } from './modals/SettleCourierPayableModal';
import { ReceiveCashFromCourierModal } from './modals/ReceiveCashFromCourierModal';

export type CourierSystemSubTab =
  | 'dashboard'
  | 'orders'
  | 'couriers'
  | 'settlements'
  | 'wallets'
  | 'reports'
  | 'audit';

export const CouriersView: React.FC = () => {
  const { couriers = [], deliveryOrders = [], courierSettlements = [] } = useStore();

  // Active SubTab
  const [activeTab, setActiveTab] = useState<CourierSystemSubTab>('dashboard');

  // Role Switcher: 'admin' | 'accountant' | 'courier'
  const [userRole, setUserRole] = useState<'admin' | 'accountant' | 'courier'>('admin');

  // Modals state
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isReceiveCashModalOpen, setIsReceiveCashModalOpen] = useState(false);

  // Preselected courier for modals
  const [preselectedCourierId, setPreselectedCourierId] = useState<number | undefined>(undefined);

  const handleOpenSettlementForCourier = (c: Courier) => {
    setPreselectedCourierId(c.id);
    setIsSettlementModalOpen(true);
  };

  const handleOpenReceiveCashFromCourier = (c: Courier) => {
    setPreselectedCourierId(c.id);
    setIsReceiveCashModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      
      {/* System Sub-Navigation Bar */}
      <div className="bg-white rounded-3xl p-2.5 sm:p-3 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Subtabs list */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#C5A059]" />
            <span>لوحة التحكم</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'orders'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-[#C5A059]" />
            <span>طلبات التوصيل</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-[#1A3668] font-bold">
              {deliveryOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('couriers')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'couriers'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Bike className="w-4 h-4 text-[#C5A059]" />
            <span>الموصّلون</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-bold">
              {couriers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settlements')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'settlements'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>التسويات والعهد</span>
          </button>

          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'wallets'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>محافظ التوصيل</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'reports'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#C5A059]" />
            <span>التقارير</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'audit'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>الصلاحيات والتدقيق</span>
          </button>
        </div>

        {/* Quick Role & Action Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>الصلاحية: </span>
            <span className="text-[#1A3668] font-black">
              {userRole === 'admin' ? 'المدير' : userRole === 'accountant' ? 'المحاسب' : 'موظف التوصيل'}
            </span>
          </div>

          <button
            onClick={() => {
              setPreselectedCourierId(undefined);
              setIsNewOrderModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#C5A059] hover:bg-[#d6b063] text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">طلب توصيل جديد</span>
          </button>
        </div>

      </div>

      {/* Main Tab Render */}
      {activeTab === 'dashboard' && (
        <CourierDashboardTab
          onNavigateTab={setActiveTab}
          onOpenNewOrder={() => {
            setPreselectedCourierId(undefined);
            setIsNewOrderModalOpen(true);
          }}
          onOpenSettlement={() => {
            setPreselectedCourierId(undefined);
            setIsSettlementModalOpen(true);
          }}
          onOpenReceiveCash={() => {
            setPreselectedCourierId(undefined);
            setIsReceiveCashModalOpen(true);
          }}
        />
      )}

      {activeTab === 'orders' && (
        <DeliveryOrdersTab
          onOpenNewOrder={() => {
            setPreselectedCourierId(undefined);
            setIsNewOrderModalOpen(true);
          }}
          userRole={userRole}
        />
      )}

      {activeTab === 'couriers' && (
        <CouriersListTab
          onOpenSettlementForCourier={handleOpenSettlementForCourier}
          onOpenReceiveCashFromCourier={handleOpenReceiveCashFromCourier}
          userRole={userRole}
        />
      )}

      {activeTab === 'settlements' && (
        <SettlementsAndCollectionsTab
          onOpenSettlementModal={() => {
            setPreselectedCourierId(undefined);
            setIsSettlementModalOpen(true);
          }}
          onOpenReceiveCashModal={() => {
            setPreselectedCourierId(undefined);
            setIsReceiveCashModalOpen(true);
          }}
          userRole={userRole}
        />
      )}

      {activeTab === 'wallets' && (
        <DeliveryWalletsTab userRole={userRole} />
      )}

      {activeTab === 'reports' && (
        <DeliveryReportsTab />
      )}

      {activeTab === 'audit' && (
        <DeliveryAuditLogTab
          currentRole={userRole}
          onRoleChange={setUserRole}
        />
      )}

      {/* Modals */}
      {isNewOrderModalOpen && (
        <NewDeliveryOrderModal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
        />
      )}

      {isSettlementModalOpen && (
        <SettleCourierPayableModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          preselectedCourierId={preselectedCourierId}
        />
      )}

      {isReceiveCashModalOpen && (
        <ReceiveCashFromCourierModal
          isOpen={isReceiveCashModalOpen}
          onClose={() => setIsReceiveCashModalOpen(false)}
          preselectedCourierId={preselectedCourierId}
        />
      )}

    </div>
  );
};
