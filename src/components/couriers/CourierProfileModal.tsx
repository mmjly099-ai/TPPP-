import React, { useState, useMemo } from 'react';
import {
  X,
  Bike,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Printer,
  FileText,
  UserCheck,
  UserX,
  Package
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Courier, DeliveryOrder, CourierSettlement, DeliveryCashCollection } from '../../types';

interface CourierProfileModalProps {
  courier: Courier | null;
  onClose: () => void;
  onOpenSettlementForCourier?: (c: Courier) => void;
  onOpenReceiveCashFromCourier?: (c: Courier) => void;
}

export const CourierProfileModal: React.FC<CourierProfileModalProps> = ({
  courier,
  onClose,
  onOpenSettlementForCourier,
  onOpenReceiveCashFromCourier
}) => {
  const {
    deliveryOrders = [],
    courierSettlements = [],
    deliveryCashCollections = [],
    updateCourier
  } = useStore();

  const [activeTab, setActiveTab] = useState<'summary' | 'orders' | 'settlements' | 'cash_collections'>('summary');

  if (!courier) return null;

  // Courier's assigned orders
  const courierOrders = useMemo(() => {
    return deliveryOrders.filter(o => o.courierId === courier.id);
  }, [deliveryOrders, courier.id]);

  // Courier's settlements
  const courierSettlementList = useMemo(() => {
    return courierSettlements.filter(s => s.courierId === courier.id);
  }, [courierSettlements, courier.id]);

  // Courier's cash handover receipts
  const courierCashList = useMemo(() => {
    return deliveryCashCollections.filter(c => c.courierId === courier.id);
  }, [deliveryCashCollections, courier.id]);

  // Metrics
  const metrics = useMemo(() => {
    const totalAssigned = courierOrders.length;
    const delivered = courierOrders.filter(o => o.status === 'delivered').length;
    const inProgress = courierOrders.filter(
      o => o.status === 'pending_dispatch' || o.status === 'received_by_courier' || o.status === 'out_for_delivery'
    ).length;
    const failedOrReturned = courierOrders.filter(
      o => o.status === 'delivery_failed' || o.status === 'returned' || o.status === 'cancelled'
    ).length;

    // Total fees for orders
    const totalFees = courierOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    // Cash collected from customers by this courier
    const cashCollected = courierOrders
      .filter(o => o.collectionStatus === 'collected_cash' || (o.collectionMethod === 'cash_to_courier' && o.status === 'delivered'))
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    // Settled payouts from store wallets
    const totalSettledFromWallets = courierSettlementList
      .filter(s => s.status === 'confirmed')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // Cash handed over to management
    const totalCashHandedOver = courierCashList
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    // Current custody balance in his hands
    const currentCustody = Number(courier.currentCustodyBalance) || 0;

    // Current payable to him from store
    const currentPayable = Number(courier.currentPayableBalance) || 0;

    const successRate = totalAssigned > 0 ? Math.round((delivered / totalAssigned) * 100) : 0;

    return {
      totalAssigned,
      delivered,
      inProgress,
      failedOrReturned,
      totalFees,
      cashCollected,
      totalSettledFromWallets,
      totalCashHandedOver,
      currentCustody,
      currentPayable,
      successRate
    };
  }, [courierOrders, courierSettlementList, courierCashList, courier]);

  const handleToggleStatus = () => {
    const nextStatus = courier.status === 'active' || courier.status === 'available' ? 'inactive' : 'active';
    updateCourier({
      ...courier,
      status: nextStatus
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Navy & Gold Brand */}
        <div className="bg-[#1A3668] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-white print:text-slate-900 print:border-b-2 print:border-[#1A3668]">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-white p-1 border-2 border-[#C5A059] shadow-md flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/top_store_logo.jpg"
                alt="شعار توب ستور TOP STORE"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#C5A059] hidden sm:inline-block">كشف حساب موصل:</span>
                <h2 className="text-lg sm:text-xl font-black text-white print:text-slate-900">
                  {courier.name}
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">
                  {courier.code}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    courier.status === 'active' || courier.status === 'available'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                  }`}
                >
                  {courier.status === 'active' || courier.status === 'available' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <p className="text-xs text-blue-200 print:text-slate-600 mt-1 flex items-center gap-3">
                <span dir="ltr" className="font-mono">{courier.phone}</span>
                <span>• منطقة: {courier.zone || courier.coverageZones}</span>
                <span>• تاريخ البدء: {courier.startDate || courier.createdAt?.split('T')[0]}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleToggleStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                courier.status === 'active' || courier.status === 'available'
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
              }`}
            >
              {courier.status === 'active' || courier.status === 'available' ? (
                <>
                  <UserX className="w-3.5 h-3.5" />
                  <span>إيقاف الموصل</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>تنشيط الموصل</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#d6b063] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة كشف الحساب</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Subtabs (Hidden in Print) */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 flex items-center gap-2 text-xs font-bold print:hidden overflow-x-auto">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-3.5 border-b-2 cursor-pointer transition ${
              activeTab === 'summary'
                ? 'border-[#1A3668] text-[#1A3668] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            المؤشرات المالية والتشغيلية
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3.5 border-b-2 cursor-pointer transition ${
              activeTab === 'orders'
                ? 'border-[#1A3668] text-[#1A3668] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            الطلبات المسندة ({courierOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`py-3 px-3.5 border-b-2 cursor-pointer transition ${
              activeTab === 'settlements'
                ? 'border-[#1A3668] text-[#1A3668] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            سجل التسويات المصروفة ({courierSettlementList.length})
          </button>
          <button
            onClick={() => setActiveTab('cash_collections')}
            className={`py-3 px-3.5 border-b-2 cursor-pointer transition ${
              activeTab === 'cash_collections'
                ? 'border-[#1A3668] text-[#1A3668] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            توريدات النقدية للإدارة ({courierCashList.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: KPI Grid for this courier */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            
            {/* Total Assigned */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-slate-500 font-bold block">إجمالي الطلبات المسندة</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">
                {metrics.totalAssigned} طلب
              </span>
            </div>

            {/* Delivered */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-emerald-700 font-bold block">تم التسليم بنجاح</span>
              <span className="text-lg font-black text-emerald-800 mt-1 block">
                {metrics.delivered} طلب ({metrics.successRate}%)
              </span>
            </div>

            {/* In Progress */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-amber-800 font-bold block">قيد التوصيل</span>
              <span className="text-lg font-black text-amber-900 mt-1 block">
                {metrics.inProgress} طلب
              </span>
            </div>

            {/* Failed or Returned */}
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
              <span className="text-rose-700 font-bold block">متعثرة أو مرتجعة</span>
              <span className="text-lg font-black text-rose-800 mt-1 block">
                {metrics.failedOrReturned} طلب
              </span>
            </div>

          </div>

          {/* Section 2: Financial Balances Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            {/* Current Cash Custody in his hands */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">العهدة النقدية الحالية بذمته:</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-900 mt-2">
                {metrics.currentCustody.toLocaleString()} ريال
              </div>
              <p className="text-[11px] text-amber-800 font-medium mt-1">
                نقد استلمه من العميلات ولم يورده للإدارة بعد
              </p>
              {metrics.currentCustody > 0 && onOpenReceiveCashFromCourier && (
                <button
                  onClick={() => onOpenReceiveCashFromCourier(courier)}
                  className="mt-3 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  استلام وتوريد النقدية منه ←
                </button>
              )}
            </div>

            {/* Total Settled to Him from Wallets */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A3668]">ما تم تسويته له من المحافظ:</span>
                <Wallet className="w-4 h-4 text-[#1A3668]" />
              </div>
              <div className="text-xl font-black text-[#1A3668] mt-2">
                {metrics.totalSettledFromWallets.toLocaleString()} ريال
              </div>
              <p className="text-[11px] text-blue-800 font-medium mt-1">
                مدفوعات مستحقات محولة له من محافظ توب ستور
              </p>
            </div>

            {/* Current Payables Owed to Him */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/60 border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">مستحقات غير مسواة له:</span>
                <ArrowDownLeft className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-black text-purple-900 mt-2">
                {metrics.currentPayable.toLocaleString()} ريال
              </div>
              <p className="text-[11px] text-purple-800 font-medium mt-1">
                مستحقة للموصل بذمة الإدارة
              </p>
              {onOpenSettlementForCourier && (
                <button
                  onClick={() => onOpenSettlementForCourier(courier)}
                  className="mt-3 w-full py-1.5 bg-[#1A3668] hover:bg-[#234885] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  صرف وتسوية المستحقات ←
                </button>
              )}
            </div>

          </div>

          {/* Section 3: Notes if any */}
          {courier.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <span className="font-bold text-slate-900">ملاحظات الموصل: </span>
              {courier.notes}
            </div>
          )}

          {/* Tab 2: Orders List */}
          {(activeTab === 'summary' || activeTab === 'orders') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-slate-900">
                  سجل طلبات التوصيل المسندة إلى {courier.name} ({courierOrders.length})
                </h4>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">رقم التوصيل</th>
                      <th className="py-2.5 px-3 font-bold">طلب توب ستور</th>
                      <th className="py-2.5 px-3 font-bold">العميلة</th>
                      <th className="py-2.5 px-3 font-bold">العنوان</th>
                      <th className="py-2.5 px-3 font-bold">الأجرة</th>
                      <th className="py-2.5 px-3 font-bold">طريقة التحصيل</th>
                      <th className="py-2.5 px-3 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courierOrders.map(ord => (
                      <tr key={ord.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ord.deliveryNumber}</td>
                        <td className="py-2.5 px-3 font-bold text-blue-700">#{ord.orderNumber}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{ord.customerName}</td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">{ord.address}</td>
                        <td className="py-2.5 px-3 font-bold text-[#1A3668]">{ord.deliveryFee.toLocaleString()} ريال</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {ord.collectionMethod === 'cash_to_courier' ? 'نقداً للموصل' : ord.collectionMethod === 'transfer_to_wallet' ? 'محفظة' : 'معفاة'}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                            ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            ord.status === 'out_for_delivery' ? 'bg-amber-100 text-amber-800' :
                            ord.status === 'delivery_failed' || ord.status === 'returned' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {ord.status === 'delivered' ? 'تم التسليم' : ord.status === 'out_for_delivery' ? 'خرج للتوصيل' : ord.status === 'delivery_failed' ? 'تعذر' : ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {courierOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          لا توجد طلبات مسندة لهذا الموصل حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Settlements List */}
          {activeTab === 'settlements' && (
            <div className="space-y-3">
              <h4 className="font-black text-xs text-slate-900">سجل التسويات والمصروفات المحولة للموصل</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">رقم التسوية</th>
                      <th className="py-2.5 px-3 font-bold">تاريخ الدفع</th>
                      <th className="py-2.5 px-3 font-bold">المبلغ المسوى</th>
                      <th className="py-2.5 px-3 font-bold">المحفظة المسدد منها</th>
                      <th className="py-2.5 px-3 font-bold">رقم المرجع</th>
                      <th className="py-2.5 px-3 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courierSettlementList.map(stl => (
                      <tr key={stl.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{stl.settlementNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{stl.paymentDate}</td>
                        <td className="py-2.5 px-3 font-black text-emerald-700">{stl.amount.toLocaleString()} ريال</td>
                        <td className="py-2.5 px-3 font-bold text-blue-700">{stl.walletName}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{stl.referenceNumber || '—'}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">مؤكدة ✓</td>
                      </tr>
                    ))}
                    {courierSettlementList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          لا توجد تسويات مسجلة لهذا الموصل
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Cash Handover Collections */}
          {activeTab === 'cash_collections' && (
            <div className="space-y-3">
              <h4 className="font-black text-xs text-slate-900">سجل توريد واستلام النقدية من الموصل للإدارة</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">رقم السند</th>
                      <th className="py-2.5 px-3 font-bold">تاريخ الاستلام</th>
                      <th className="py-2.5 px-3 font-bold">المبلغ المورد</th>
                      <th className="py-2.5 px-3 font-bold">الحساب المستلم</th>
                      <th className="py-2.5 px-3 font-bold">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courierCashList.map(csh => (
                      <tr key={csh.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{csh.receiptNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{csh.receivedDate}</td>
                        <td className="py-2.5 px-3 font-black text-amber-700">{csh.amount.toLocaleString()} ريال</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{csh.receivedIntoAccountName || 'صندوق نقدي'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{csh.notes || '—'}</td>
                      </tr>
                    ))}
                    {courierCashList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          لا توجد توريدات نقدية مسجلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
