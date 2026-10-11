import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Search,
  Filter,
  DollarSign,
  Printer,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Building
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Account, FinancialTransaction } from '../../types';

interface DeliveryWalletsTabProps {
  onOpenAddWalletModal?: () => void;
  userRole?: 'admin' | 'accountant' | 'courier';
}

export const DeliveryWalletsTab: React.FC<DeliveryWalletsTabProps> = ({
  onOpenAddWalletModal,
  userRole = 'admin'
}) => {
  const {
    accounts = [],
    deliveryOrders = [],
    courierSettlements = [],
    deliveryCashCollections = [],
    transactions = [],
    getAccountBalance
  } = useStore();

  const [selectedWalletId, setSelectedWalletId] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Wallets list (filter or identify wallet accounts e.g. الكريمي, جيب, جوال موني, ون كاش, محفظتي)
  const wallets = useMemo(() => {
    return accounts.filter(
      a =>
        a.type === 'محفظة' ||
        a.type === 'بنك' ||
        a.name.includes('كريمي') ||
        a.name.includes('جيب') ||
        a.name.includes('ون كاش') ||
        a.name.includes('محفظ') ||
        a.name.includes('جوال')
    );
  }, [accounts]);

  // Compute breakdown for each wallet specifically for delivery operations
  const walletStats = useMemo(() => {
    return wallets.map(wallet => {
      // Inflows from delivery:
      // A) Delivery orders fee transferred to this wallet
      const orderInflows = deliveryOrders
        .filter(
          o =>
            (o.collectionStatus === 'transferred_to_wallet' || o.collectionMethod === 'transfer_to_wallet') &&
            o.walletId === wallet.id
        )
        .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

      // B) Cash collections remitted into this account from couriers
      const cashRemitInflows = deliveryCashCollections
        .filter(c => c.status === 'confirmed' && c.receivedIntoAccountId === wallet.id)
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      const totalDeliveryInflows = orderInflows + cashRemitInflows;

      // Outflows to couriers:
      // Settlements paid to couriers from this wallet
      const totalPaidToCouriers = courierSettlements
        .filter(s => s.status === 'confirmed' && s.walletId === wallet.id)
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      // Current balance
      const currentBalance = getAccountBalance(wallet.id);

      return {
        wallet,
        openingBalance: Number(wallet.balance) || 0,
        totalDeliveryInflows,
        orderInflows,
        cashRemitInflows,
        totalPaidToCouriers,
        currentBalance
      };
    });
  }, [wallets, deliveryOrders, deliveryCashCollections, courierSettlements, getAccountBalance]);

  // Transaction history for delivery operations across wallets
  const deliveryLedger = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      type: 'inflow' | 'outflow';
      amount: number;
      walletId: number;
      walletName: string;
      description: string;
      reference?: string;
      source: 'order_fee' | 'courier_settlement' | 'cash_remittance';
    }> = [];

    // Orders fees
    deliveryOrders.forEach(o => {
      if (
        (o.collectionStatus === 'transferred_to_wallet' || o.collectionMethod === 'transfer_to_wallet') &&
        o.walletId
      ) {
        const w = accounts.find(a => a.id === o.walletId);
        list.push({
          id: `ORD-${o.id}`,
          date: o.collectedAt?.split('T')[0] || o.dispatchDate?.split('T')[0] || o.createdAt?.split('T')[0],
          type: 'inflow',
          amount: Number(o.deliveryFee) || 0,
          walletId: o.walletId,
          walletName: w?.name || 'محفظة توب ستور',
          description: `تحويل أجرة توصيل الطلب #${o.orderNumber} للعميلة ${o.customerName}`,
          reference: o.walletReference,
          source: 'order_fee'
        });
      }
    });

    // Settlements paid out
    courierSettlements.forEach(s => {
      if (s.status === 'confirmed') {
        list.push({
          id: `STL-${s.id}`,
          date: s.paymentDate || s.createdAt?.split('T')[0],
          type: 'outflow',
          amount: Number(s.amount) || 0,
          walletId: s.walletId,
          walletName: s.walletName,
          description: `تسوية وصرف مستحقات الموصل ${s.courierName} بموجب سند #${s.settlementNumber}`,
          reference: s.referenceNumber,
          source: 'courier_settlement'
        });
      }
    });

    // Cash remittances
    deliveryCashCollections.forEach(c => {
      if (c.status === 'confirmed' && c.receivedIntoAccountId) {
        list.push({
          id: `REM-${c.id}`,
          date: c.receivedDate || c.createdAt?.split('T')[0],
          type: 'inflow',
          amount: Number(c.amount) || 0,
          walletId: c.receivedIntoAccountId,
          walletName: c.receivedIntoAccountName || 'صندوق / محفظة',
          description: `توريد عهدة نقدية من الموصل ${c.courierName} بسند #${c.receiptNumber}`,
          reference: c.receiptNumber,
          source: 'cash_remittance'
        });
      }
    });

    return list
      .filter(item => {
        if (selectedWalletId !== 'all' && item.walletId !== selectedWalletId) return false;
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          return (
            item.description.toLowerCase().includes(term) ||
            item.walletName.toLowerCase().includes(term) ||
            (item.reference && item.reference.toLowerCase().includes(term))
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deliveryOrders, courierSettlements, deliveryCashCollections, accounts, selectedWalletId, searchTerm]);

  // Overall totals
  const overall = useMemo(() => {
    const totalInflows = walletStats.reduce((sum, w) => sum + w.totalDeliveryInflows, 0);
    const totalPaid = walletStats.reduce((sum, w) => sum + w.totalPaidToCouriers, 0);
    const netDeliveryCash = totalInflows - totalPaid;

    return { totalInflows, totalPaid, netDeliveryCash };
  }, [walletStats]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#1A3668]" />
            إدارة محافظ التوصيل والأرصدة المنفصلة
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            متابعة حركة التحويلات الداخلة من العميلات والمبالغ المصروفة للموصلين عبر الكريمي، جيب، ون كاش، وغيرها
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAddWalletModal && userRole === 'admin' && (
            <button
              onClick={onOpenAddWalletModal}
              className="px-4 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة محفظة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي الداخل للمحافظ (توصيل)</span>
          <span className="text-xl font-black text-[#1A3668] mt-1 block">
            {overall.totalInflows.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </span>
          <span className="text-[11px] text-blue-700 font-medium mt-1 block">
            تحويلات العميلات وتوريدات العهد
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي المدفوع للموصلين من المحافظ</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            {overall.totalPaid.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </span>
          <span className="text-[11px] text-emerald-800 font-medium mt-1 block">
            تسويات مستحقات الموصلين
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-xs font-bold text-amber-900 block">صافي رصيد عمليات التوصيل بالمحافظ</span>
          <span className="text-xl font-black text-amber-900 mt-1 block">
            {overall.netDeliveryCash.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </span>
          <span className="text-[11px] text-amber-800 font-medium mt-1 block">
            فارق التحصيلات عن التسويات
          </span>
        </div>
      </div>

      {/* Wallets Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {walletStats.map(({ wallet, openingBalance, totalDeliveryInflows, totalPaidToCouriers, currentBalance }) => (
          <div
            key={wallet.id}
            onClick={() => setSelectedWalletId(wallet.id === selectedWalletId ? 'all' : wallet.id)}
            className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md space-y-3.5 ${
              selectedWalletId === wallet.id
                ? 'bg-blue-50/40 border-[#1A3668] ring-2 ring-[#1A3668]/20'
                : 'bg-white border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#1A3668] flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5 text-[#1A3668]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">{wallet.name}</h3>
                  <span className="text-[11px] text-slate-500 font-mono">{wallet.accountNumber || wallet.type}</span>
                </div>
              </div>
              <span className="text-xs font-black text-[#1A3668] bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                {currentBalance.toLocaleString()} ريال
              </span>
            </div>

            <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>الرصيد الافتتاحي:</span>
                <span className="font-bold text-slate-800">{openingBalance.toLocaleString()} ريال</span>
              </div>
              <div className="flex items-center justify-between text-blue-800">
                <span>مستلم متعلق بالتوصيل:</span>
                <span className="font-black">+{totalDeliveryInflows.toLocaleString()} ريال</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span>مدفوع للموصلين:</span>
                <span className="font-black">-{totalPaidToCouriers.toLocaleString()} ريال</span>
              </div>
            </div>

            <div className="text-[11px] font-bold text-center text-[#1A3668] hover:underline pt-1">
              {selectedWalletId === wallet.id ? 'عرض جميع المحافظ' : 'تصفية كشف الحركات لهذه المحفظة ←'}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Movement Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-xs text-slate-900">
              كشف حركات التوصيل التفصيلي بالمحافظ ({deliveryLedger.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              {selectedWalletId === 'all' ? 'عرض كافة المحافظ' : `تصفية: محفظة ${accounts.find(a => a.id === selectedWalletId)?.name}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث في البيان..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>
            {selectedWalletId !== 'all' && (
              <button
                onClick={() => setSelectedWalletId('all')}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                إلغاء التصفية
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#1A3668] text-white">
              <tr>
                <th className="py-2.5 px-3.5 font-bold">التاريخ</th>
                <th className="py-2.5 px-3.5 font-bold">نوع الحركة</th>
                <th className="py-2.5 px-3.5 font-bold">المحفظة</th>
                <th className="py-2.5 px-3.5 font-bold">البيان والتفاصيل</th>
                <th className="py-2.5 px-3.5 font-bold">رقم المرجع</th>
                <th className="py-2.5 px-3.5 font-bold text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveryLedger.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3.5 font-mono text-slate-600">{item.date}</td>
                  <td className="py-3 px-3.5 font-bold">
                    {item.type === 'inflow' ? (
                      <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 text-[11px]">
                        <ArrowDownLeft className="w-3 h-3" />
                        داخل (تحصيل/توريد)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                        <ArrowUpRight className="w-3 h-3" />
                        خارج (صرف لموصل)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 font-bold text-slate-900">{item.walletName}</td>
                  <td className="py-3 px-3.5 text-slate-700">{item.description}</td>
                  <td className="py-3 px-3.5 font-mono text-slate-500">{item.reference || '—'}</td>
                  <td className="py-3 px-3.5 font-black text-sm text-left">
                    <span className={item.type === 'inflow' ? 'text-blue-700' : 'text-emerald-700'}>
                      {item.type === 'inflow' ? '+' : '-'}{item.amount.toLocaleString()} ريال
                    </span>
                  </td>
                </tr>
              ))}

              {deliveryLedger.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد حركات توصيل مسجلة في المحفظة
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
