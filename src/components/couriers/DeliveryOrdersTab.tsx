import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Bike,
  Phone,
  MapPin,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  DollarSign,
  Wallet,
  Printer,
  ChevronDown,
  Edit,
  Trash2,
  ExternalLink,
  ArrowRightLeft
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DeliveryOrder, DeliveryOrderStatus, Courier } from '../../types';
import { DeliveryOrderWaybillModal } from './DeliveryOrderWaybillModal';

interface DeliveryOrdersTabProps {
  onOpenNewOrder: () => void;
  userRole?: 'admin' | 'accountant' | 'courier';
}

export const DeliveryOrdersTab: React.FC<DeliveryOrdersTabProps> = ({
  onOpenNewOrder,
  userRole = 'admin'
}) => {
  const {
    deliveryOrders = [],
    couriers = [],
    accounts = [],
    updateDeliveryOrderStatus,
    recordDeliveryCashToCourier,
    recordDeliveryTransferToWallet,
    deleteDeliveryOrder,
    showNotification
  } = useStore();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [collectionMethodFilter, setCollectionMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Selected Order for Waybill Print
  const [printingOrder, setPrintingOrder] = useState<DeliveryOrder | null>(null);

  // Status Change Dialog state
  const [statusModalOrder, setStatusModalOrder] = useState<DeliveryOrder | null>(null);
  const [targetStatus, setTargetStatus] = useState<DeliveryOrderStatus>('delivered');
  const [statusCourierId, setStatusCourierId] = useState<number>(couriers[0]?.id || 0);
  const [statusDeliveryFee, setStatusDeliveryFee] = useState<number>(1500);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusCollectionMethod, setStatusCollectionMethod] = useState<'cash_to_courier' | 'transfer_to_wallet' | 'waived'>('cash_to_courier');
  const [statusWalletId, setStatusWalletId] = useState<number>(accounts.find(a => a.type === 'محفظة')?.id || accounts[0]?.id || 0);
  const [statusWalletRef, setStatusWalletRef] = useState('');

  // Wallet Transfer Quick Modal state
  const [walletTransferModalOrder, setWalletTransferModalOrder] = useState<DeliveryOrder | null>(null);
  const [quickWalletId, setQuickWalletId] = useState<number>(accounts.find(a => a.type === 'محفظة')?.id || accounts[0]?.id || 0);
  const [quickWalletRef, setQuickWalletRef] = useState('');

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter(order => {
      // Search
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        order.deliveryNumber.toLowerCase().includes(term) ||
        String(order.orderNumber || '').toLowerCase().includes(term) ||
        (order.shipmentNumber && order.shipmentNumber.toLowerCase().includes(term)) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerPhone.includes(term) ||
        order.courierName.toLowerCase().includes(term) ||
        order.governorate.toLowerCase().includes(term) ||
        (order.district && order.district.toLowerCase().includes(term));

      // Status
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;

      // Courier
      const matchCourier = courierFilter === 'all' || String(order.courierId) === courierFilter;

      // Collection Method
      const matchMethod =
        collectionMethodFilter === 'all' || order.collectionMethod === collectionMethodFilter;

      // Date
      const matchDate = !dateFilter || (order.dispatchDate && order.dispatchDate.startsWith(dateFilter));

      return matchSearch && matchStatus && matchCourier && matchMethod && matchDate;
    });
  }, [deliveryOrders, searchTerm, statusFilter, courierFilter, collectionMethodFilter, dateFilter]);

  // Statistics of filtered list
  const summary = useMemo(() => {
    const total = filteredOrders.length;
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    const pending = filteredOrders.filter(
      o => o.status === 'pending_dispatch' || o.status === 'received_by_courier' || o.status === 'out_for_delivery'
    ).length;
    const failed = filteredOrders.filter(
      o => o.status === 'delivery_failed' || o.status === 'returned' || o.status === 'cancelled'
    ).length;
    const totalFees = filteredOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    return { total, delivered, pending, failed, totalFees };
  }, [filteredOrders]);

  // Status configuration helper
  const getStatusBadge = (status: DeliveryOrderStatus) => {
    switch (status) {
      case 'pending_dispatch':
        return {
          label: 'بانتظار تسليم الطلب للموصل',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Clock
        };
      case 'received_by_courier':
        return {
          label: 'استلمه الموصل',
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Bike
        };
      case 'out_for_delivery':
        return {
          label: 'خرج للتوصيل',
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Clock
        };
      case 'delivered':
        return {
          label: 'تم التسليم بنجاح',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2
        };
      case 'delivery_failed':
        return {
          label: 'تعذّر التسليم',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertCircle
        };
      case 'returned':
        return {
          label: 'أُعيد الطلب',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: ArrowRightLeft
        };
      case 'cancelled':
        return {
          label: 'أُلغي التوصيل',
          color: 'bg-slate-100 text-slate-500 border-slate-200',
          icon: XCircle
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Clock
        };
    }
  };

  const handleOpenStatusModal = (order: DeliveryOrder) => {
    setStatusModalOrder(order);
    setTargetStatus(order.status === 'pending_dispatch' ? 'delivered' : order.status);
    setStatusCourierId(order.courierId || couriers[0]?.id || 0);
    setStatusDeliveryFee(Number(order.deliveryFee) || 1500);
    setStatusCollectionMethod(order.collectionMethod === 'unassigned' ? 'cash_to_courier' : (order.collectionMethod as any));
    setStatusWalletId(order.walletId || accounts.find(a => a.type === 'محفظة')?.id || accounts[0]?.id || 0);
    setStatusWalletRef(order.walletReference || '');
    setStatusNotes(order.failedReason || '');
  };

  const handleConfirmStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalOrder) return;

    updateDeliveryOrderStatus(statusModalOrder.id, targetStatus, {
      courierId: statusCourierId,
      deliveryFee: Number(statusDeliveryFee) || 1500,
      failedReason: targetStatus === 'delivery_failed' || targetStatus === 'returned' ? statusNotes : undefined,
      deliveredAt: targetStatus === 'delivered' ? new Date().toISOString().split('T')[0] : undefined,
      collectionMethod: statusCollectionMethod,
      walletId: statusCollectionMethod === 'transfer_to_wallet' ? statusWalletId : undefined,
      walletReference: statusCollectionMethod === 'transfer_to_wallet' ? statusWalletRef : undefined
    });

    setStatusModalOrder(null);
  };

  const handleConfirmWalletTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletTransferModalOrder) return;

    recordDeliveryTransferToWallet({
      deliveryId: walletTransferModalOrder.id,
      walletId: quickWalletId,
      referenceNumber: quickWalletRef.trim(),
      transferDate: new Date().toISOString().split('T')[0]
    });

    setWalletTransferModalOrder(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Header & Summary Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#1A3668]" />
            جدول إدارة طلبات التوصيل وتسليم العميلات
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تتبع الحالات السبع للتوصيل، تحصيل الأجور المستقل، وتوثيق العهد النقدية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            إجمالي المعروض: <span className="text-[#1A3668] font-black">{summary.total}</span>
          </div>
          <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200">
            مسلّمة: <span className="font-black">{summary.delivered}</span>
          </div>
          <div className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-200">
            قيد التسليم: <span className="font-black">{summary.pending}</span>
          </div>
          <button
            onClick={onOpenNewOrder}
            className="px-4 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل طلب توصيل جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم التوصيل، رقم طلب شي إن، اسم العميلة، هاتفها، الموصل..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
            >
              <option value="all">كل حالات التوصيل (7 حالات)</option>
              <option value="pending_dispatch">1. بانتظار تسليم الطلب للموصل</option>
              <option value="received_by_courier">2. استلمه الموصل</option>
              <option value="out_for_delivery">3. خرج للتوصيل</option>
              <option value="delivered">4. تم التسليم بنجاح</option>
              <option value="delivery_failed">5. تعذّر التسليم</option>
              <option value="returned">6. أُعيد الطلب</option>
              <option value="cancelled">7. أُلغي التوصيل</option>
            </select>
          </div>

          {/* Courier Filter */}
          <div>
            <select
              value={courierFilter}
              onChange={e => setCourierFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
            >
              <option value="all">جميع الموصّلين</option>
              {couriers.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Collection Method Filter */}
          <div>
            <select
              value={collectionMethodFilter}
              onChange={e => setCollectionMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
            >
              <option value="all">جميع طرق التحصيل</option>
              <option value="cash_to_courier">نقداً للموصل (عهدة نقدية)</option>
              <option value="transfer_to_wallet">تحويل للمحفظة</option>
              <option value="waived">معفاة / بدون تحصيل</option>
            </select>
          </div>

        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#1A3668] text-white">
              <tr>
                <th className="py-3 px-3.5 font-bold">رقم التوصيل</th>
                <th className="py-3 px-3.5 font-bold">طلب توب ستور</th>
                <th className="py-3 px-3.5 font-bold">العميلة والعنوان</th>
                <th className="py-3 px-3.5 font-bold">الموصل المسؤول</th>
                <th className="py-3 px-3.5 font-bold">قيمة الطلب الأصلية</th>
                <th className="py-3 px-3.5 font-bold">أجرة التوصيل</th>
                <th className="py-3 px-3.5 font-bold text-center">حالة التوصيل</th>
                <th className="py-3 px-3.5 font-bold">طريقة التحصيل والعهدة</th>
                <th className="py-3 px-3.5 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => {
                const statusBadge = getStatusBadge(order.status);
                const BadgeIcon = statusBadge.icon;
                const assignedCourier = couriers.find(c => c.id === order.courierId);

                return (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Delivery Number */}
                    <td className="py-3.5 px-3.5 font-black text-slate-900 whitespace-nowrap">
                      <div>{order.deliveryNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {order.dispatchDate?.split('T')[0] || order.createdAt?.split('T')[0]}
                      </div>
                    </td>

                    {/* Order Reference */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="font-black text-[#1A3668] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg inline-block">
                        طلب رقم #{order.orderNumber || 'مباشر'}
                      </div>
                      {order.finalPaymentAmount ? (
                        <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                          الدفعة النهائية: {order.finalPaymentAmount.toLocaleString()} ريال
                        </div>
                      ) : null}
                      {order.shipmentNumber && (
                        <div className="text-[10px] text-slate-500">
                          شحنة: {order.shipmentNumber}
                        </div>
                      )}
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-3.5 min-w-[170px]">
                      <div className="font-bold text-slate-900">{order.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {order.customerPhone}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={order.address}>
                        {order.governorate} {order.district ? `(${order.district})` : ''} - {order.address}
                      </div>
                    </td>

                    {/* Courier */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {order.courierId && assignedCourier ? (
                        <>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-blue-600" />
                            {order.courierName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {assignedCourier.zone || assignedCourier.coverageZones}
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenStatusModal(order)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px] cursor-pointer"
                        >
                          اختر المندوب وطريقة الدفع ←
                        </button>
                      )}
                    </td>

                    {/* Original Value (Reference Only) */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg inline-block text-[11px]">
                        {order.orderOriginalValue ? `${order.orderOriginalValue.toLocaleString()} ريال` : '0 ريال'}
                      </div>
                      <span className="block text-[9px] text-slate-400 mt-0.5">قيمة الطلب</span>
                    </td>

                    {/* Delivery Fee */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="font-black text-sm text-[#1A3668]">
                        {order.deliveryFee.toLocaleString()} ريال
                      </div>
                      <span className="block text-[9px] text-slate-400">أجرة المندوب</span>
                    </td>

                    {/* Delivery Status */}
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenStatusModal(order)}
                        title="انقر لتحديث المندوب وحالة التوصيل وطريقة الدفع"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer hover:shadow-xs ${statusBadge.color}`}
                      >
                        <BadgeIcon className="w-3.5 h-3.5" />
                        <span>{statusBadge.label}</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>
                      {order.failedReason && (
                        <div className="text-[10px] text-rose-600 font-medium mt-1 truncate max-w-[140px]" title={order.failedReason}>
                          سبب: {order.failedReason}
                        </div>
                      )}
                    </td>

                    {/* Collection Status & Method */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {order.collectionMethod === 'cash_to_courier' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                            <DollarSign className="w-3 h-3" />
                            نقدي للمندوب نفسه
                          </span>
                          {order.collectionStatus === 'collected_cash' ? (
                            <div className="text-[10px] text-amber-800 font-black flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>
                                سُجّل برصيد المندوب: طلب رقم #{order.orderNumber} ({(Number(order.custodyRecordedAmount) || Number(order.finalPaymentAmount) || Number(order.deliveryFee)).toLocaleString()} ريال)
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => recordDeliveryCashToCourier(order.id)}
                              className="block text-[10px] text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer"
                            >
                              تسجيل برصيد المندوب الآن (طلب رقم #{order.orderNumber}) ✓
                            </button>
                          )}
                        </div>
                      ) : order.collectionMethod === 'transfer_to_wallet' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-300">
                            <Wallet className="w-3 h-3" />
                            محفظة ({order.walletName || 'تحويل'})
                          </span>
                          {order.collectionStatus === 'transferred_to_wallet' ? (
                            <div className="space-y-0.5">
                              <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>زاد رصيد المحفظة ({order.walletName || 'المحفظة'})</span>
                              </div>
                              <div className="text-[10px] text-purple-800 font-black bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                استحقاق للمندوب عندنا: {(Number(order.payableRecordedAmount) || Number(order.deliveryFee)).toLocaleString()} ريال (طلب رقم #{order.orderNumber})
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setWalletTransferModalOrder(order)}
                              className="block text-[10px] text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                            >
                              تأكيد المحفظة وإثبات استحقاق المندوب ✓
                            </button>
                          )}
                        </div>
                      ) : order.collectionMethod === 'unassigned' ? (
                        <button
                          onClick={() => handleOpenStatusModal(order)}
                          className="px-2.5 py-1 bg-[#1A3668] hover:bg-[#234885] text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          اختيار المندوب وطريقة الدفع
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                          معفاة / بدون تحصيل
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPrintingOrder(order)}
                          title="طباعة بوليصة التوصيل"
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#1A3668] hover:text-white text-slate-700 flex items-center justify-center transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenStatusModal(order)}
                          title="تحديث الحالة والتحصيل"
                          className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 flex items-center justify-center transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {userRole === 'admin' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف طلب التوصيل #${order.deliveryNumber}؟`)) {
                                deleteDeliveryOrder(order.id);
                              }
                            }}
                            title="حذف الطلب"
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 flex items-center justify-center transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    لا توجد طلبات توصيل مطابقة لمعايير البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waybill Print Modal */}
      {printingOrder && (
        <DeliveryOrderWaybillModal
          order={printingOrder}
          courier={couriers.find(c => c.id === printingOrder.courierId)}
          onClose={() => setPrintingOrder(null)}
        />
      )}

      {/* Status & Collection Update Modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1A3668] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm sm:text-base">تحديث حالة التوصيل وطريقة التحصيل</h3>
                <p className="text-xs text-blue-200">طلب #{statusModalOrder.deliveryNumber} - العميلة: {statusModalOrder.customerName}</p>
              </div>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="p-5 sm:p-6 space-y-4 text-xs">
              
              {/* Courier Selector & Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    المندوب الذي وصّل الطلب (طلب رقم #{statusModalOrder.orderNumber}):
                  </label>
                  <select
                    value={statusCourierId}
                    onChange={e => {
                      const cId = Number(e.target.value);
                      setStatusCourierId(cId);
                      const cObj = couriers.find(c => c.id === cId);
                      if (cObj?.defaultDeliveryFee) {
                        setStatusDeliveryFee(Number(cObj.defaultDeliveryFee));
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  >
                    {couriers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.zone || c.coverageZones || 'صنعاء'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    أجرة / استحقاق توصيل المندوب (ريال):
                  </label>
                  <input
                    type="number"
                    value={statusDeliveryFee}
                    onChange={e => setStatusDeliveryFee(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  />
                </div>
              </div>

              {/* Target Status Selection (7 statuses) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  حالة التوصيل الجديدة:
                </label>
                <select
                  value={targetStatus}
                  onChange={e => setTargetStatus(e.target.value as DeliveryOrderStatus)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
                >
                  <option value="pending_dispatch">1. بانتظار تسليم الطلب للموصل</option>
                  <option value="received_by_courier">2. استلمه الموصل</option>
                  <option value="out_for_delivery">3. خرج للتوصيل</option>
                  <option value="delivered">4. تم التسليم بنجاح ✓</option>
                  <option value="delivery_failed">5. تعذّر التسليم ⚠️</option>
                  <option value="returned">6. أُعيد الطلب ↩️</option>
                  <option value="cancelled">7. أُلغي التوصيل ✕</option>
                </select>
              </div>

              {/* Delivery Fee Collection Method */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  طريقة الدفع عند التسليم (طلب رقم #{statusModalOrder.orderNumber}):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusCollectionMethod('cash_to_courier')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition ${
                      statusCollectionMethod === 'cash_to_courier'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    نقدي للمندوب نفسه
                    <span className="block text-[10px] text-amber-700 font-normal mt-0.5">تسجل برصيد المندوب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusCollectionMethod('transfer_to_wallet')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition ${
                      statusCollectionMethod === 'transfer_to_wallet'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    محفظة إلكترونية
                    <span className="block text-[10px] text-purple-700 font-normal mt-0.5">يزداد رصيدها + استحقاق للمندوب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusCollectionMethod('waived')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition ${
                      statusCollectionMethod === 'waived'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    معفاة / مجانية
                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">بدون تحصيل</span>
                  </button>
                </div>
              </div>

              {/* Wallet fields if transfer */}
              {statusCollectionMethod === 'transfer_to_wallet' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">
                      المحفظة المستقبلة:
                    </label>
                    <select
                      value={statusWalletId}
                      onChange={e => setStatusWalletId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">
                      الرقم المرجعي للحوالة:
                    </label>
                    <input
                      type="text"
                      placeholder="رقم مرجع التحويل أو إشعار البنك"
                      value={statusWalletRef}
                      onChange={e => setStatusWalletRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Notes or Reason for Failure */}
              {(targetStatus === 'delivery_failed' || targetStatus === 'returned' || targetStatus === 'cancelled') && (
                <div>
                  <label className="block font-bold text-rose-700 mb-1">
                    سبب التعذر أو الإرجاع:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الهاتف مغلق، تأجيل من العميلة، العنوان غير دقيق..."
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-rose-50/50 border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusModalOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  تأكيد وحفظ التغييرات
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Quick Wallet Transfer Documentation Modal */}
      {walletTransferModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1A3668] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm">توثيق تحويل أجرة التوصيل لمحفظة TOP STORE</h3>
                <p className="text-xs text-blue-200">طلب #{walletTransferModalOrder.deliveryNumber}</p>
              </div>
              <button
                onClick={() => setWalletTransferModalOrder(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmWalletTransfer} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 font-bold">
                أجرة التوصيل: {walletTransferModalOrder.deliveryFee.toLocaleString()} ريال
                <span className="block text-[11px] font-normal text-blue-800 mt-0.5">
                  سيتم قيد المبلغ في المحفظة لحسابات التوصيل دون خلطه بإيرادات الوساطة.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المحفظة المستلمة:</label>
                <select
                  value={quickWalletId}
                  onChange={e => setQuickWalletId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم العملية أو المرجع:</label>
                <input
                  type="text"
                  placeholder="رقم مرجع التحويل"
                  value={quickWalletRef}
                  onChange={e => setQuickWalletRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWalletTransferModalOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  تأكيد الإيداع في المحفظة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
