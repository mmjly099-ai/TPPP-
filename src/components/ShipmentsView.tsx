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
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Shipment } from '../types';

interface ShipmentsViewProps {
  onOpenNewShipment: () => void;
}

export const ShipmentsView: React.FC<ShipmentsViewProps> = ({ onOpenNewShipment }) => {
  const { shipments, accounts, orders, customers } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedShipmentId, setExpandedShipmentId] = useState<number | null>(null);

  const filteredShipments = shipments.filter(s =>
    s.shipmentNumber.includes(searchTerm) ||
    s.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  const toggleExpand = (id: number) => {
    setExpandedShipmentId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">إدارة الشحنات وشركات النقل</h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              لوجستيات ومصروفات
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تتبع شحنات البضائع الخارجية وتضمين الطلبات المشمولة بها مع خصم تكلفة الشحن كمصروف معتمد من الأرباح
          </p>
        </div>

        <button
          onClick={onOpenNewShipment}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل شحنة وتضمين طلبات</span>
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">إجمالي تكاليف الشحن (المصروفات اللوجستية)</span>
          <div className="text-xl font-black font-mono text-purple-700 mt-1">
            {totalShippingCosts.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>مخصومة من الأرباح الصافية في التقارير</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">عدد الشحنات المسجلة</span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {shipments.length} <span className="text-xs text-slate-500 font-sans">شحنة</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5">
            الناقلون: المهيب، القدسي للنقل
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">الطلبات المشمولة بالشحنات</span>
          <div className="text-xl font-black font-mono text-indigo-700 mt-1">
            {totalLinkedOrders} <span className="text-xs text-slate-500 font-sans">طلبية</span>
          </div>
          <div className="text-[10px] text-indigo-600 mt-1.5">
            مرتبطة ببوالص الشحن والكراتين
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">متوسط تكلفة الشحنة</span>
          <div className="text-xl font-black font-mono text-slate-800 mt-1">
            {shipments.length > 0 ? Math.round(totalShippingCosts / shipments.length).toLocaleString() : 0} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5">
            معدل الصرف اللوجستي لكل شحنة
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم الشحنة (مثال: 223) أو اسم شركة النقل (المهيب) أو الملاحظات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
          />
        </div>
      </div>

      {/* Shipments Cards Grid */}
      {filteredShipments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">لا توجد شحنات مطابقة للبحث</h3>
          <p className="text-xs text-slate-400 mt-1">يمكنك إضافة شحنة جديدة وتضمين الطلبات بها بالضغط على زر "تسجيل شحنة وتضمين طلبات".</p>
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

            return (
              <div
                key={shipment.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          شحنة رقم #{shipment.shipmentNumber}
                        </h3>
                        <span className="text-xs text-slate-500">الناقل: {shipment.carrier}</span>
                      </div>
                    </div>

                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      مكتملة
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>تكلفة الشحن (المصروف):</span>
                      <span className="font-mono font-bold text-purple-700">{cost.toLocaleString()} ريال</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>دُفعت من حساب:</span>
                      <span className="font-semibold text-slate-800">{acc?.name || 'محفظة'}</span>
                    </div>

                    {shipment.shippingCostPaidAt && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span>تاريخ السداد:</span>
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
                  </div>
                </div>

                {shipment.notes && (
                  <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {shipment.notes}
                  </div>
                )}

                {/* Orders Accordion Toggle */}
                {linkedOrders.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleExpand(shipment.id)}
                      className="w-full flex items-center justify-between py-1.5 px-3 bg-purple-50/60 hover:bg-purple-100/60 text-purple-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-600" />
                        <span>عرض تفاصيل الطلبات المشمولة ({linkedOrders.length})</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-purple-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-purple-600" />
                      )}
                    </button>

                    {/* Expanded list of orders */}
                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {linkedOrders.map(order => {
                          const cust = customers.find(c => c.id === order.customerId);
                          const custName = cust?.name || order.customerName || 'عميل';

                          return (
                            <div
                              key={order.id}
                              className="p-2 bg-slate-50 rounded-lg text-[11px] flex items-center justify-between border border-slate-100"
                            >
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <span className="font-mono text-purple-700">#{order.orderNumber}</span>
                                  <span>{custName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {order.site} • {order.itemsCount || 1} قطع • {Number(order.totalAmount || 0).toLocaleString()} ريال
                                </div>
                              </div>

                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {order.status === 'delivered' ? 'مكتمل' :
                                 order.status === 'shipped' ? 'في الشحن' :
                                 order.status === 'purchased' ? 'تم الشراء' : 'معلق'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
