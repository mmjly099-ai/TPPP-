import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Package,
  CheckCircle2,
  Calendar,
  Wallet,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Bike,
  Printer,
  Trash2,
  Edit2,
  AlertTriangle,
  X,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Shipment, Order, DeliveryOrder } from '../types';
import { CouriersView } from './CouriersView';
import { NewDeliveryOrderModal } from './modals/NewDeliveryOrderModal';

interface ShipmentsViewProps {
  onOpenNewShipment: () => void;
  onNavigate?: (tab: any) => void;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({
  onOpenNewShipment,
  onNavigate
}) => {
  const {
    shipments = [],
    accounts = [],
    orders = [],
    customers = [],
    deliveryOrders = [],
    transactions = [],
    runningBalancesMap,
    updateShipmentStatus,
    updateShipment,
    deleteShipment,
    getAccountBalance,
    showNotification
  } = useStore();

  // Top Sub-tabs: 'carrier_shipments' | 'local_delivery'
  const [activeSubTab, setActiveSubTab] = useState<'carrier_shipments' | 'local_delivery'>('carrier_shipments');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedShipmentId, setExpandedShipmentId] = useState<number | null>(null);

  // Delivery order modal state
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [preselectedOrderIdForDelivery, setPreselectedOrderIdForDelivery] = useState<number | undefined>(undefined);

  // Print shipment manifest modal state
  const [printingShipment, setPrintingShipment] = useState<Shipment | null>(null);

  // Edit shipment modal state
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editCarrier, setEditCarrier] = useState('');
  const [editCost, setEditCost] = useState<number>(0);
  const [editAccountId, setEditAccountId] = useState<number>(2);
  const [editNotes, setEditNotes] = useState('');

  // Delete shipment confirmation state
  const [deletingShipment, setDeletingShipment] = useState<Shipment | null>(null);

  // Calculate carriers list
  const uniqueCarriers = Array.from(new Set(shipments.map(s => s.carrier).filter(Boolean)));

  // Filtered shipments
  const filteredShipments = shipments.filter(s => {
    const term = searchTerm.trim().toLowerCase();
    const matchSearch =
      !term ||
      s.shipmentNumber.toLowerCase().includes(term) ||
      s.carrier.toLowerCase().includes(term) ||
      (s.notes && s.notes.toLowerCase().includes(term));

    const matchCarrier = carrierFilter === 'ALL' || s.carrier === carrierFilter;
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchSearch && matchCarrier && matchStatus;
  });

  const totalShippingCosts = shipments.reduce(
    (sum, s) => sum + (parseFloat(String(s.shippingCost || 0)) || 0),
    0
  );

  const totalLinkedOrders = shipments.reduce((sum, s) => {
    const linked = orders.filter(o =>
      (s.orderIds && s.orderIds.includes(o.id)) ||
      (o.shipmentId && o.shipmentId === s.id) ||
      o.shipmentNumber === s.shipmentNumber
    );
    return sum + linked.length;
  }, 0);

  const pendingLocalDeliveries = deliveryOrders.filter(
    d => d.status === 'out_for_delivery' || d.status === 'pending_dispatch' || d.status === 'received_by_courier'
  ).length;

  const toggleExpand = (id: number) => {
    setExpandedShipmentId(prev => (prev === id ? null : id));
  };

  const handleOpenDeliveryModalForOrder = (orderId: number) => {
    setPreselectedOrderIdForDelivery(orderId);
    setIsDeliveryModalOpen(true);
  };

  const handleStartEdit = (s: Shipment) => {
    setEditingShipment(s);
    setEditCarrier(s.carrier);
    setEditCost(Number(s.shippingCost) || 0);
    setEditAccountId(Number(s.accountId) || 2);
    setEditNotes(s.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    updateShipment({
      ...editingShipment,
      carrier: editCarrier.trim() || editingShipment.carrier,
      shippingCost: editCost,
      accountId: Number(editAccountId),
      notes: editNotes.trim() || undefined
    });
    setEditingShipment(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingShipment) return;
    deleteShipment(deletingShipment.id);
    setDeletingShipment(null);
  };

  return (
    <div className="space-y-6" dir="rtl">

      {/* Main Unified Section Selector */}
      <div className="bg-white rounded-3xl p-2.5 sm:p-3 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('carrier_shipments')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'carrier_shipments'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-purple-200" />
            <span>الشحنات وشركات النقل الدولية</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeSubTab === 'carrier_shipments' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {shipments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('local_delivery')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'local_delivery'
                ? 'bg-[#1A3668] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Bike className="w-4 h-4 text-[#C5A059]" />
            <span>مناديب التوصيل والتوزيع المحلي</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeSubTab === 'local_delivery' ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#1A3668]'
            }`}>
              {deliveryOrders.length}
            </span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setPreselectedOrderIdForDelivery(undefined);
              setIsDeliveryModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1A3668] border border-blue-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Bike className="w-3.5 h-3.5 text-[#1A3668]" />
            <span>طلب توصيل جديد</span>
          </button>

          <button
            onClick={onOpenNewShipment}
            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل شحنة وتضمين طلبات</span>
          </button>
        </div>
      </div>

      {/* RENDER VIEW ACCORDING TO ACTIVE SUBTAB */}
      {activeSubTab === 'local_delivery' ? (
        <CouriersView />
      ) : (
        <div className="space-y-6">

          {/* KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">إجمالي تكاليف الشحن (المصروفات اللوجستية)</span>
              <div className="text-xl font-black font-mono text-purple-700 mt-1">
                {totalShippingCosts.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>مخصومة من الأرباح الصافية في التقارير</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">عدد الشحنات المسجلة</span>
              <div className="text-xl font-black font-mono text-slate-900 mt-1">
                {shipments.length} <span className="text-xs text-slate-500 font-sans">شحنة</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5">
                الناقلون: {uniqueCarriers.join('، ') || 'المهيب، القدسي'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">الطلبات المشمولة بالشحنات</span>
              <div className="text-xl font-black font-mono text-indigo-700 mt-1">
                {totalLinkedOrders} <span className="text-xs text-slate-500 font-sans">طلبية</span>
              </div>
              <div className="text-[10px] text-indigo-600 mt-1.5">
                مرتبطة ببوالص الشحن والكراتين
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">طلبات التوصيل للمناديب</span>
              <div className="text-xl font-black font-mono text-blue-700 mt-1 flex items-center justify-between">
                <span>{deliveryOrders.length} <span className="text-xs text-slate-500 font-sans">طلب</span></span>
                {pendingLocalDeliveries > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {pendingLocalDeliveries} قيد التوزيع
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveSubTab('local_delivery')}
                className="text-[10px] text-blue-600 hover:underline font-bold mt-1.5 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>الانتقال لمنظومة التوصيل</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث برقم الشحنة (مثال: 2200) أو اسم الناقل (المهيب) أو الملاحظات..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Carrier Filter */}
              <select
                value={carrierFilter}
                onChange={e => setCarrierFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-bold focus:outline-hidden focus:border-purple-500"
              >
                <option value="ALL">جميع شركات النقل</option>
                {uniqueCarriers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-bold focus:outline-hidden focus:border-purple-500"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="in_transit">قيد الشحن الدولي</option>
                <option value="delivery">واصلة / قيد التوزيع</option>
                <option value="completed">مكتملة</option>
              </select>
            </div>
          </div>

          {/* Shipments Cards Grid */}
          {filteredShipments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                <Truck className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">لا توجد شحنات مطابقة للبحث أو الفلتر</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                يمكنك تسجيل شحنة طرود جديدة وربط طلبات شي إن وعلي إكسبرس بها بضغطة زر.
              </p>
              <button
                onClick={onOpenNewShipment}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل شحنة جديدة</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShipments.map(shipment => {
                const acc = accounts.find(a => a.id === shipment.accountId);
                const cost = parseFloat(String(shipment.shippingCost || 0));
                const isExpanded = expandedShipmentId === shipment.id;

                // Get all orders associated with this shipment
                const linkedOrders = orders.filter(o =>
                  (shipment.orderIds && shipment.orderIds.includes(o.id)) ||
                  (o.shipmentId && o.shipmentId === shipment.id) ||
                  o.shipmentNumber === shipment.shipmentNumber
                );

                const totalPieces = linkedOrders.reduce((sum, o) => sum + (o.itemsCount || 0), 0);
                const totalOrdersValue = linkedOrders.reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);

                const linkedTrx = transactions.find(t =>
                  (shipment.financialTransactionId && t.id === shipment.financialTransactionId) ||
                  (t.description && (t.description.includes(`الشحنة ${shipment.shipmentNumber}`) || t.description.includes(`الشحنة #${shipment.shipmentNumber}`)))
                );
                const rb = linkedTrx ? runningBalancesMap.get(linkedTrx.id) : null;

                return (
                  <div
                    key={shipment.id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md"
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-sm">
                              شحنة رقم #{shipment.shipmentNumber}
                            </h3>
                            <span className="text-xs text-slate-500 font-bold">الناقل: {shipment.carrier}</span>
                          </div>
                        </div>

                        {/* Interactive Status Selector */}
                        <div className="relative">
                          <select
                            value={shipment.status || 'completed'}
                            onChange={e => updateShipmentStatus(shipment.id, e.target.value as Shipment['status'])}
                            className={`text-[11px] font-black rounded-xl px-2.5 py-1 border transition cursor-pointer ${
                              shipment.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : shipment.status === 'delivery'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <option value="in_transit">🚚 في الشحن الخارجي</option>
                            <option value="delivery">📦 واصلة / للتوزيع</option>
                            <option value="completed">✅ مكتملة وموزعة</option>
                          </select>
                        </div>
                      </div>

                      {/* Shipment Financial & Data Block */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>تكلفة الشحن (المصروف):</span>
                          <span className="font-mono font-black text-purple-700">{cost.toLocaleString()} ريال</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span>دُفعت من حساب:</span>
                          <span className="font-semibold text-slate-800">{acc?.name || 'محفظة النقدية'}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-700">حالة الخصم والترحيل:</span>
                          {linkedTrx ? (
                            <div className="text-left">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                ✅ تم الخصم ({cost.toLocaleString()} ريال)
                              </span>
                              {rb && (
                                <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                                  الرصيد بعد الحركة: {rb.balanceAfter.toLocaleString()} ريال
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              قيد التأكيد
                            </span>
                          )}
                        </div>

                        {shipment.shippingCostPaidAt && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>تاريخ الشحن / السداد:</span>
                            <span className="font-mono text-slate-500">
                              {new Date(shipment.shippingCostPaidAt).toLocaleDateString('ar-YE')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-50">
                          <span>الطلبات المشمولة:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-purple-700 font-mono">{linkedOrders.length} طلبية</span>
                            {totalPieces > 0 && (
                              <span className="text-[10px] text-slate-400">({totalPieces} قطعة)</span>
                            )}
                          </div>
                        </div>

                        {totalOrdersValue > 0 && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>قيمة بضائع الشحنة:</span>
                            <span className="font-mono font-bold text-slate-900">{totalOrdersValue.toLocaleString()} ريال</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {shipment.notes && (
                      <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                        {shipment.notes}
                      </div>
                    )}

                    {/* Action Bar (Print, Edit, Delete) */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPrintingShipment(shipment)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="طباعة بيان وحمولة الشحنة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStartEdit(shipment)}
                          className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition cursor-pointer"
                          title="تعديل بيانات الشحنة"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingShipment(shipment)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                          title="حذف الشحنة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Orders Accordion Toggle */}
                      {linkedOrders.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(shipment.id)}
                          className="flex items-center gap-1.5 py-1 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5 text-purple-600" />
                          <span>الطلبات ({linkedOrders.length})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-purple-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded list of orders with 1-click dispatch to delivery */}
                    {isExpanded && linkedOrders.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 max-h-56 overflow-y-auto pr-1">
                        <div className="text-[10px] font-bold text-slate-400">
                          قائمة الطلبيات المشمولة وإسنادها للتوصيل:
                        </div>
                        {linkedOrders.map(order => {
                          const cust = customers.find(c => c.id === order.customerId);
                          const custName = cust?.name || order.customerName || 'عميل';
                          const hasDeliveryOrder = deliveryOrders.some(d => d.orderId === order.id);

                          return (
                            <div
                              key={order.id}
                              className="p-2.5 bg-slate-50 rounded-xl text-[11px] flex items-center justify-between border border-slate-100 gap-2"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                  <span className="font-mono text-purple-700">#{order.orderNumber}</span>
                                  <span className="truncate">{custName}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {order.site} • {order.itemsCount || 1} قطع • {Number(order.totalAmount || 0).toLocaleString()} ريال
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasDeliveryOrder ? (
                                  <span className="text-[9px] bg-blue-100 text-[#1A3668] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                    <Bike className="w-2.5 h-2.5" />
                                    <span>مسند للتوصيل</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenDeliveryModalForOrder(order.id)}
                                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                    title="إسناد هذا الطلب لمندوب توصيل محلي"
                                  >
                                    <Bike className="w-3 h-3" />
                                    <span>إسناد توصيل</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: NEW DELIVERY ORDER MODAL */}
      <NewDeliveryOrderModal
        isOpen={isDeliveryModalOpen}
        onClose={() => {
          setIsDeliveryModalOpen(false);
          setPreselectedOrderIdForDelivery(undefined);
        }}
        preselectedOrderId={preselectedOrderIdForDelivery}
      />

      {/* MODAL 2: PRINT SHIPMENT MANIFEST MODAL (WITH TOP STORE OFFICIAL LOGO) */}
      {printingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            {/* Modal Controls (Hidden in Print) */}
            <div className="bg-purple-900 text-white p-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-200" />
                <span className="font-bold text-sm">بيان وحمولة شحنة #{printingShipment.shipmentNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة البيان</span>
                </button>
                <button
                  onClick={() => setPrintingShipment(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Manifest Sheet */}
            <div className="p-6 sm:p-8 space-y-6 a4-print-document bg-white text-slate-900">
              
              {/* Header with Official Logo */}
              <div className="flex items-center justify-between border-b-2 border-purple-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 border-2 border-purple-900 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src="/top_store_logo.jpg"
                      alt="شعار توب ستور TOP STORE"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-purple-950 tracking-tight">
                      TOP STORE | متجر توب ستور
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      خدمات وساطة الشراء والتسوق الإلكتروني • بيان حمولة وشحنة البضائع
                    </p>
                  </div>
                </div>
                <div className="text-left font-mono text-xs">
                  <div className="text-slate-500 font-bold">بوليصة شحنة</div>
                  <div className="text-base font-black text-purple-900">#{printingShipment.shipmentNumber}</div>
                  <div className="text-[11px] text-slate-500">
                    {printingShipment.shippingCostPaidAt
                      ? new Date(printingShipment.shippingCostPaidAt).toLocaleDateString('ar-YE')
                      : new Date().toLocaleDateString('ar-YE')}
                  </div>
                </div>
              </div>

              {/* Cargo Specs */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">شركة النقل / الناقل:</span>
                  <span className="font-bold text-slate-900 text-sm">{printingShipment.carrier}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">أجور وتكلفة الشحن:</span>
                  <span className="font-bold text-purple-900 font-mono text-sm">
                    {Number(printingShipment.shippingCost || 0).toLocaleString()} ريال
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">حالة الشحنة:</span>
                  <span className="font-bold text-emerald-700">
                    {printingShipment.status === 'completed' ? 'مكتملة وموزعة' :
                     printingShipment.status === 'delivery' ? 'واصلة وللتوزيع' : 'في الشحن الخارجي'}
                  </span>
                </div>
              </div>

              {/* Orders Table */}
              <div>
                <h4 className="font-black text-sm text-slate-900 mb-2">
                  الطلبيات المشمولة بالكرتون / البوليصة ({orders.filter(o =>
                    (printingShipment.orderIds && printingShipment.orderIds.includes(o.id)) ||
                    (o.shipmentId && o.shipmentId === printingShipment.id) ||
                    o.shipmentNumber === printingShipment.shipmentNumber
                  ).length} طلبية):
                </h4>
                <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">رقم الطلب</th>
                      <th className="py-2.5 px-3">اسم العميلة</th>
                      <th className="py-2.5 px-3">المتجر</th>
                      <th className="py-2.5 px-3 text-center">القطع</th>
                      <th className="py-2.5 px-3 font-mono">قيمة الطلب</th>
                      <th className="py-2.5 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders
                      .filter(o =>
                        (printingShipment.orderIds && printingShipment.orderIds.includes(o.id)) ||
                        (o.shipmentId && o.shipmentId === printingShipment.id) ||
                        o.shipmentNumber === printingShipment.shipmentNumber
                      )
                      .map((ord, idx) => {
                        const cust = customers.find(c => c.id === ord.customerId);
                        return (
                          <tr key={ord.id}>
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-purple-900">#{ord.orderNumber}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{cust?.name || ord.customerName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{ord.site}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{ord.itemsCount || 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {Number(ord.totalAmount || 0).toLocaleString()} ريال
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {ord.status === 'delivered' ? 'مستلم' :
                               ord.status === 'shipped' ? 'في الشحن' : 'جاهز'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Footer */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-600">
                <div>
                  <span className="block font-bold">توقيع مسؤول الاستلام والمخزن:</span>
                  <div className="mt-8 border-b border-dashed border-slate-400 w-48 mx-auto" />
                </div>
                <div>
                  <span className="block font-bold">توقيع مندوب شركة النقل:</span>
                  <div className="mt-8 border-b border-dashed border-slate-400 w-48 mx-auto" />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SHIPMENT MODAL */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">تعديل بيانات الشحنة #{editingShipment.shipmentNumber}</h3>
              <button
                onClick={() => setEditingShipment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">شركة النقل / الناقل</label>
                <input
                  type="text"
                  value={editCarrier}
                  onChange={e => setEditCarrier(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">تكلفة الشحن (ريال)</label>
                <input
                  type="number"
                  min="0"
                  value={editCost}
                  onChange={e => setEditCost(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-purple-700"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">دُفعت من حساب النقدية / المحفظة</label>
                  {(() => {
                    const selectedAcc = accounts.find(a => Number(a.id) === Number(editAccountId));
                    const curBal = selectedAcc ? getAccountBalance(selectedAcc.id) : 0;
                    return (
                      <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                        الرصيد: {curBal.toLocaleString()} ريال
                      </span>
                    );
                  })()}
                </div>
                <select
                  value={editAccountId}
                  onChange={e => setEditAccountId(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium text-slate-900 focus:outline-hidden focus:border-purple-500"
                  required
                >
                  {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => {
                    const bal = getAccountBalance(a.id);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type}) — الرصيد: {bal.toLocaleString()} ريال
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات ومواصفات</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer shadow-xs"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE SHIPMENT CONFIRMATION */}
      {deletingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">تأكيد حذف الشحنة</h3>
                <p className="text-xs text-slate-500">سيتم حذف الشحنة ومصروفها واستعادة حالات الطلبات المرتبطة بها</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div>رقم الشحنة: <strong className="font-mono text-purple-700">#{deletingShipment.shipmentNumber}</strong></div>
              <div>الناقل: <strong>{deletingShipment.carrier}</strong></div>
              <div>تكلفة الشحن: <strong className="font-mono">{Number(deletingShipment.shippingCost).toLocaleString()} ريال</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingShipment(null)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer text-xs shadow-xs"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
