import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Plus,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Printer,
  Bike,
  ShieldCheck,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CourierSettlement, DeliveryCashCollection, Courier } from '../../types';

interface SettlementsAndCollectionsTabProps {
  onOpenSettlementModal: () => void;
  onOpenReceiveCashModal: () => void;
  userRole?: 'admin' | 'accountant' | 'courier';
}

export const SettlementsAndCollectionsTab: React.FC<SettlementsAndCollectionsTabProps> = ({
  onOpenSettlementModal,
  onOpenReceiveCashModal,
  userRole = 'admin'
}) => {
  const {
    couriers = [],
    courierSettlements = [],
    deliveryCashCollections = [],
    accounts = [],
    cancelCourierSettlement,
    deleteDeliveryCashCollection,
    showNotification
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'settlements' | 'cash_handover'>('settlements');
  const [searchTerm, setSearchTerm] = useState('');
  const [courierFilter, setCourierFilter] = useState('all');

  // Cancel & Delete Modals state
  const [settlementToCancel, setSettlementToCancel] = useState<CourierSettlement | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [collectionToDelete, setCollectionToDelete] = useState<DeliveryCashCollection | null>(null);

  // Settlements filtering
  const filteredSettlements = useMemo(() => {
    return courierSettlements.filter(s => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        s.settlementNumber.toLowerCase().includes(term) ||
        s.courierName.toLowerCase().includes(term) ||
        s.walletName.toLowerCase().includes(term) ||
        (s.referenceNumber && s.referenceNumber.toLowerCase().includes(term));

      const matchCourier = courierFilter === 'all' || String(s.courierId) === courierFilter;

      return matchSearch && matchCourier;
    });
  }, [courierSettlements, searchTerm, courierFilter]);

  // Cash Handover Collections filtering
  const filteredCashCollections = useMemo(() => {
    return deliveryCashCollections.filter(c => {
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        c.receiptNumber.toLowerCase().includes(term) ||
        c.courierName.toLowerCase().includes(term) ||
        (c.receivedIntoAccountName && c.receivedIntoAccountName.toLowerCase().includes(term));

      const matchCourier = courierFilter === 'all' || String(c.courierId) === courierFilter;

      return matchSearch && matchCourier;
    });
  }, [deliveryCashCollections, searchTerm, courierFilter]);

  // Summary KPIs
  const summary = useMemo(() => {
    const totalSettled = courierSettlements
      .filter(s => s.status === 'confirmed')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const totalCashHandedOver = deliveryCashCollections
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const totalCustodyInHand = couriers.reduce((sum, c) => sum + (Number(c.currentCustodyBalance) || 0), 0);
    const totalPayablesPending = couriers.reduce((sum, c) => sum + (Number(c.currentPayableBalance) || 0), 0);

    return {
      totalSettled,
      totalCashHandedOver,
      totalCustodyInHand,
      totalPayablesPending
    };
  }, [courierSettlements, deliveryCashCollections, couriers]);

  const handleCancelSettlement = (settlement: CourierSettlement) => {
    if (settlement.status === 'cancelled') return;
    const reason = window.prompt(
      `هل أنت متأكد من إلغاء التسوية #${settlement.settlementNumber} وإرجاع المبلغ (${settlement.amount} ريال) لرصيد المحفظة ${settlement.walletName}؟ يرجى إدخال سبب الإلغاء:`
    );
    if (reason !== null) {
      cancelCourierSettlement(settlement.id, reason.trim() || 'إلغاء بناء على طلب المستخدم');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Header & Fast Action Buttons */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#1A3668]" />
            تسوية مستحقات الموصّلين وتوريد العهد النقدية
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            صرف أجور الموصلين من المحافظ المعتمدة واستلام النقدية الموردة للإدارة مع قيود عكسية آمنة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {userRole !== 'courier' && (
            <>
              <button
                onClick={onOpenReceiveCashModal}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>استلام نقدية من موصل</span>
              </button>

              <button
                onClick={onOpenSettlementModal}
                className="px-4 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>تسوية مستحقات موصل من محفظة</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4 Financial Balances Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total Settled */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي ما صُرف للموصلين</span>
          <span className="text-lg sm:text-xl font-black text-emerald-700 mt-1 block">
            {summary.totalSettled.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </span>
          <span className="text-[11px] text-emerald-800 font-bold mt-1 block">
            صُرفت من محافظ توب ستور
          </span>
        </div>

        {/* Total Cash Handed Over */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">إجمالي النقد المورد للإدارة</span>
          <span className="text-lg sm:text-xl font-black text-amber-700 mt-1 block">
            {summary.totalCashHandedOver.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </span>
          <span className="text-[11px] text-amber-800 font-bold mt-1 block">
            سُلّمت للإدارة بسندات استلام
          </span>
        </div>

        {/* Total Cash Custody Remaining */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-xs font-bold text-amber-900 block">العهد النقدية المتبقية معهم</span>
          <span className="text-lg sm:text-xl font-black text-amber-900 mt-1 block">
            {summary.totalCustodyInHand.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </span>
          <span className="text-[11px] text-amber-800 font-bold mt-1 block">
            في ذمة الموصلين حالياً
          </span>
        </div>

        {/* Total Pending Payables */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-xs">
          <span className="text-xs font-bold text-purple-900 block">مستحقات معلقة للموصلين</span>
          <span className="text-lg sm:text-xl font-black text-purple-900 mt-1 block">
            {summary.totalPayablesPending.toLocaleString()} <span className="text-xs text-slate-500 font-medium">ريال</span>
          </span>
          <span className="text-[11px] text-purple-800 font-bold mt-1 block">
            بانتظار الصرف والتسوية
          </span>
        </div>

      </div>

      {/* Subtabs & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Subtabs switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab('settlements')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubTab === 'settlements'
                  ? 'bg-[#1A3668] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>تسويات مستحقات الموصلين ({courierSettlements.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('cash_handover')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubTab === 'cash_handover'
                  ? 'bg-[#1A3668] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>استلام وتوريد النقدية ({deliveryCashCollections.length})</span>
            </button>
          </div>

          {/* Courier Selector Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={courierFilter}
              onChange={e => setCourierFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            >
              <option value="all">كافة الموصلين</option>
              {couriers.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Table View */}
      {activeSubTab === 'settlements' ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-xs text-slate-800">
              سجل تسويات مستحقات الموصّلين المصروفة من محافظ TOP STORE
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              * الدفع من المحفظة يخفض رصيدها تلقائياً ويوثق في سجل المحفظة المنفصل
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A3668] text-white">
                <tr>
                  <th className="py-3 px-3.5 font-bold">رقم العملية</th>
                  <th className="py-3 px-3.5 font-bold">اسم الموصل</th>
                  <th className="py-3 px-3.5 font-bold">المبلغ المسوى</th>
                  <th className="py-3 px-3.5 font-bold">المحفظة المسدد منها</th>
                  <th className="py-3 px-3.5 font-bold">تاريخ الدفع</th>
                  <th className="py-3 px-3.5 font-bold">المرجع / إشعار التحويل</th>
                  <th className="py-3 px-3.5 font-bold">الحالة</th>
                  <th className="py-3 px-3.5 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSettlements.map(settlement => {
                  const isCancelled = settlement.status === 'cancelled';

                  return (
                    <tr
                      key={settlement.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCancelled ? 'bg-rose-50/30 opacity-70 line-through text-slate-400' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3.5 font-mono font-black text-slate-900">
                        {settlement.settlementNumber}
                      </td>
                      <td className="py-3.5 px-3.5 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Bike className="w-3.5 h-3.5 text-blue-600" />
                          <span>{settlement.courierName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 font-black text-emerald-700 text-sm whitespace-nowrap">
                        {settlement.amount.toLocaleString()} ريال
                      </td>
                      <td className="py-3.5 px-3.5 font-bold text-[#1A3668]">
                        <div className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-blue-600" />
                          <span>{settlement.walletName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-slate-600">
                        {settlement.paymentDate}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-slate-700">
                        {settlement.referenceNumber || '—'}
                      </td>
                      <td className="py-3.5 px-3.5 font-bold whitespace-nowrap">
                        {isCancelled ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                            ملغاة بقيد عكسي
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            مؤكدة ومصروفة
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {!isCancelled && userRole === 'admin' && (
                            <button
                              onClick={() => handleCancelSettlement(settlement)}
                              title="إلغاء التسوية بقيد عكسي وإعادة المبلغ للمحفظة"
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>إلغاء وعكس</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredSettlements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      لا توجد تسويات مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-xs text-slate-800">
              سندات توريد واستلام النقدية من الموصّلين للإدارة
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              * يقلل من رصيد العهدة النقدية في ذمة الموصل ويثبت دخول المال إلى الصندوق/المحفظة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A3668] text-white">
                <tr>
                  <th className="py-3 px-3.5 font-bold">رقم السند</th>
                  <th className="py-3 px-3.5 font-bold">اسم الموصل</th>
                  <th className="py-3 px-3.5 font-bold">المبلغ المستلم</th>
                  <th className="py-3 px-3.5 font-bold">الحساب أو الصندوق المودع فيه</th>
                  <th className="py-3 px-3.5 font-bold">تاريخ الاستلام</th>
                  <th className="py-3 px-3.5 font-bold">ملاحظات</th>
                  <th className="py-3 px-3.5 font-bold text-center">الحالة</th>
                  <th className="py-3 px-3.5 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCashCollections.map(collection => (
                  <tr key={collection.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3.5 font-mono font-black text-slate-900">
                      {collection.receiptNumber}
                    </td>
                    <td className="py-3.5 px-3.5 font-bold text-slate-800">
                      {collection.courierName}
                    </td>
                    <td className="py-3.5 px-3.5 font-black text-amber-800 text-sm">
                      {collection.amount.toLocaleString()} ريال
                    </td>
                    <td className="py-3.5 px-3.5 font-bold text-slate-700">
                      {collection.receivedIntoAccountName || 'صندوق نقدي للإدارة'}
                    </td>
                    <td className="py-3.5 px-3.5 font-mono text-slate-600">
                      {collection.receivedDate}
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-500">
                      {collection.notes || '—'}
                    </td>
                    <td className="py-3.5 px-3.5 text-center">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-bold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تم التوريد
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      {userRole === 'admin' && (
                        <button
                          onClick={() => setCollectionToDelete(collection)}
                          title="حذف سند التوريد"
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 inline-flex items-center justify-center transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredCashCollections.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      لا توجد توريدات نقدية مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Settlement Modal */}
      {settlementToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-black text-base">إلغاء وعكس تسوية الموصل</h3>
              </div>
              <button
                onClick={() => setSettlementToCancel(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950 space-y-1">
                <div className="font-black text-sm">تسوية #{settlementToCancel.settlementNumber} للموصل: {settlementToCancel.courierName}</div>
                <div className="font-bold text-rose-800">المبلغ: {settlementToCancel.amount.toLocaleString()} ريال • المحفظة: {settlementToCancel.walletName}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب الإلغاء والعكس:</label>
                <input
                  type="text"
                  placeholder="سبب إلغاء التسوية..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettlementToCancel(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelCourierSettlement(settlementToCancel.id, cancelReason.trim() || 'إلغاء بناء على طلب المستخدم');
                    setSettlementToCancel(null);
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تأكيد الإلغاء والعكس</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cash Collection Modal */}
      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-black text-base">تأكيد حذف سند توريد النقدية</h3>
              </div>
              <button
                onClick={() => setCollectionToDelete(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950 space-y-1">
                <div className="font-black text-sm">سند توريد: {collectionToDelete.receiptNumber}</div>
                <div className="text-slate-700">الموصل: {collectionToDelete.courierName}</div>
                <div className="font-bold text-rose-800">المبلغ: {collectionToDelete.amount.toLocaleString()} ريال</div>
              </div>

              <p className="text-slate-700 font-medium leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا السند نهائياً؟
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollectionToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteDeliveryCashCollection(collectionToDelete.id);
                    setCollectionToDelete(null);
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تأكيد حذف السند</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
