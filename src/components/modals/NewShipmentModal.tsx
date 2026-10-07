import React, { useState, useMemo } from 'react';
import { X, Truck, Package, Search, CheckSquare, Square, Info, Layers } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewShipmentModal: React.FC<NewShipmentModalProps> = ({ isOpen, onClose }) => {
  const { accounts, orders, customers, addShipment } = useStore();

  const [shipmentNumber, setShipmentNumber] = useState('');
  const [carrier, setCarrier] = useState('المهيب');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [accountId, setAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });
  const [notes, setNotes] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderFilterMode, setOrderFilterMode] = useState<'eligible' | 'all'>('eligible');
  const [updateOrderStatusToShipped, setUpdateOrderStatusToShipped] = useState(true);
  const [formError, setFormError] = useState('');

  // Filter orders according to user selection
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filtering
      if (orderFilterMode === 'eligible') {
        const isEligible = order.status === 'purchased' || order.status === 'pending' || !order.shipmentNumber;
        if (!isEligible && !selectedOrderIds.includes(order.id)) return false;
      }

      // Search filtering
      if (orderSearchTerm.trim()) {
        const term = orderSearchTerm.trim().toLowerCase();
        const orderNum = String(order.orderNumber).toLowerCase();
        const cust = customers.find(c => c.id === order.customerId);
        const custName = (cust?.name || order.customerName || '').toLowerCase();
        const site = (order.site || '').toLowerCase();
        const match = orderNum.includes(term) || custName.includes(term) || site.includes(term);
        if (!match) return false;
      }

      return true;
    });
  }, [orders, customers, orderFilterMode, orderSearchTerm, selectedOrderIds]);

  // Selected orders metrics
  const selectedMetrics = useMemo(() => {
    const selected = orders.filter(o => selectedOrderIds.includes(o.id));
    const totalItems = selected.reduce((sum, o) => sum + (o.itemsCount || 0), 0);
    const totalAmount = selected.reduce((sum, o) => sum + (parseFloat(String(o.totalAmount || 0)) || 0), 0);
    return {
      count: selected.length,
      totalItems,
      totalAmount
    };
  }, [orders, selectedOrderIds]);

  if (!isOpen) return null;

  const toggleOrderSelection = (id: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredOrders.map(o => o.id);
    setSelectedOrderIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAll = () => {
    setSelectedOrderIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentNumber.trim()) {
      setFormError('يرجى إدخال رقم الشحنة');
      return;
    }
    if (shippingCost <= 0) {
      setFormError('يرجى إدخال تكلفة الشحن (أكبر من صفر)');
      return;
    }
    setFormError('');

    addShipment({
      shipmentNumber: shipmentNumber.trim(),
      carrier: carrier.trim(),
      shippingCost: Number(shippingCost),
      accountId,
      notes: notes.trim() || undefined,
      orderIds: selectedOrderIds,
      updateOrderStatusToShipped
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تسجيل شحنة وتوصيل جديدة</h3>
              <p className="text-xs text-slate-500">إثبات تكلفة الشحن اللوجستي كمصروف وتضمين الطلبات التابعة لها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Main Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الشحنة (بوليصة / كرتون) *</label>
              <input
                type="text"
                value={shipmentNumber}
                onChange={e => setShipmentNumber(e.target.value)}
                placeholder="مثال: 224 أو SHP-904"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:outline-hidden focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">شركة النقل / الناقل *</label>
              <input
                type="text"
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                placeholder="مثال: المهيب، القدسي للنقل، الرويشان..."
                className="w-full border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-hidden focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                تكلفة الشحن (ريال) * <span className="text-[10px] text-purple-600 font-normal">(مصروف تشغيلي يخصم من الأرباح)</span>
              </label>
              <input
                type="number"
                min="1"
                value={shippingCost || ''}
                onChange={e => setShippingCost(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-purple-700 text-sm focus:outline-hidden focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">دُفعت من حساب النقدية / المحفظة *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium text-slate-900 focus:outline-hidden focus:border-purple-500"
                required
              >
                {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات ومواصفات الشحنة</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: واصلة فرع عصر، كرتون ملابس شي إن، تاريخ الاستلام..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800"
            />
          </div>

          {/* Orders Inclusion Section (خيار تضمين الطلبات في الشحنة) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-700" />
                <span className="font-bold text-slate-900 text-xs">
                  تضمين الطلبات في هذه الشحنة
                </span>
                <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {selectedOrderIds.length} طلبية محددة
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-purple-700 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                >
                  تحديد المعروض ({filteredOrders.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Filter controls & search */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="بحث باسم العميل أو رقم الطلب أو المتجر..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="w-full pr-8 pl-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setOrderFilterMode('eligible')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    orderFilterMode === 'eligible'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الطلبات الجاهزة للشحن
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilterMode('all')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    orderFilterMode === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  عرض جميع الطلبات
                </button>
              </div>
            </div>

            {/* Orders Selection List */}
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl">
              {filteredOrders.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  لا توجد طلبات مطابقة لمعايير البحث
                </div>
              ) : (
                filteredOrders.map(order => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const cust = customers.find(c => c.id === order.customerId);
                  const customerName = cust?.name || order.customerName || 'عميل غير مسجل';

                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-purple-50/70 border-r-4 border-r-purple-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-purple-600">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 fill-purple-600 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              #{order.orderNumber}
                            </span>
                            <span className="font-bold text-slate-800">
                              {customerName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {order.site}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{order.itemsCount || 1} قطع</span>
                            <span>•</span>
                            <span>{Number(order.totalAmount || 0).toLocaleString()} ريال</span>
                            {order.shipmentNumber && (
                              <span className="text-amber-600">
                                (شحنة سابقة: #{order.shipmentNumber})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          order.status === 'purchased' ? 'bg-indigo-50 text-indigo-700' :
                          order.status === 'shipped' ? 'bg-purple-50 text-purple-700' :
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {order.status === 'purchased' ? 'تم الشراء' :
                           order.status === 'shipped' ? 'في الشحن' :
                           order.status === 'delivered' ? 'مكتمل' : 'قيد المعالجة'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Summary Bar */}
            {selectedMetrics.count > 0 && (
              <div className="flex items-center justify-between bg-purple-100/60 text-purple-900 px-3 py-2 rounded-xl text-[11px] font-bold">
                <div className="flex items-center gap-3">
                  <span>تم اختيار: {selectedMetrics.count} طلبيات</span>
                  <span>•</span>
                  <span>إجمالي القطع: {selectedMetrics.totalItems}</span>
                  <span>•</span>
                  <span>القيمة: {selectedMetrics.totalAmount.toLocaleString()} ريال</span>
                </div>
              </div>
            )}

            {/* Checkbox: auto update order status */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={updateOrderStatusToShipped}
                onChange={e => setUpdateOrderStatusToShipped(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span>تحديث حالة الطلبات المحددة تلقائياً إلى <strong className="text-purple-700">"في الشحن (shipped)"</strong></span>
            </label>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-purple-600" />
              <span>ستُسجل تكلفة الشحن كمصروف معتمد يخصم من الأرباح</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>حفظ الشحنة وتضمين الطلبات</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
