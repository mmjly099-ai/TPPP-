import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Filter,
  CheckCircle,
  Truck,
  Clock,
  Printer,
  DollarSign,
  AlertCircle,
  ChevronDown,
  Edit2,
  Trash2,
  ShieldAlert,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';
import { PackageCheck } from 'lucide-react';

interface OrdersViewProps {
  onOpenNewOrder: () => void;
  onOpenPaymentForOrder?: (order: Order) => void;
  onPrintInvoice?: (order: Order) => void;
  onViewInvoice?: (order: Order) => void;
  onNavigate?: (tab: any) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onOpenNewOrder,
  onOpenPaymentForOrder,
  onPrintInvoice,
  onViewInvoice,
  onNavigate
}) => {
  const { orders, customers, accounts, updateOrderStatus, collectDeliveryFee, updateOrder, deleteOrder } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit & Delete Modal states
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    const custName = o.customerName || '';
    const custCode = o.customerCode || '';
    const ordNum = String(o.orderNumber || '');
    const shipNum = o.shipmentNumber || '';

    const matchesSearch =
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ordNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipNum.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSite = siteFilter === 'ALL' || o.site === siteFilter;
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

    return matchesSearch && matchesSite && matchesStatus;
  });

  // Financial aggregates
  const totalOrdersAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  const totalRemaining = orders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-md font-semibold">قيد المعالجة</span>;
      case 'purchased':
        return <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded-md font-semibold">تم الشراء</span>;
      case 'shipped':
        return <span className="bg-purple-100 text-purple-800 text-[11px] px-2 py-0.5 rounded-md font-semibold">في الشحن</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-md font-semibold">تم التسليم</span>;
      case 'cancelled':
        return <span className="bg-rose-100 text-rose-800 text-[11px] px-2 py-0.5 rounded-md font-semibold">ملغي</span>;
    }
  };

  const handleDeliveryFeeCollect = (orderId: number) => {
    // Default to the first active wallet (e.g. جيب or الصندوق)
    const wallet = accounts.find(a => a.name.includes('جيب')) || accounts.find(a => a.type === 'نقدي') || accounts[0];
    if (wallet) {
      collectDeliveryFee(orderId, wallet.id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">إدارة الطلبات والوساطة</h2>
          <p className="text-xs text-slate-500">طلبات المشتريات من SHEIN و AliExpress مع تتبع الدفعات والتوصيل</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onNavigate && (
            <button
              onClick={() => onNavigate('purchase-batches')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>دفعات الشراء المجمعة ({orders.filter(o => o.status === 'pending').length} معلق)</span>
            </button>
          )}

          <button
            onClick={onOpenNewOrder}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طلب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">إجمالي قيمة الطلبات</span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {totalOrdersAmount.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">إجمالي المبالغ المحصلة</span>
          <div className="text-xl font-black font-mono text-emerald-600 mt-1">
            {totalPaid.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">المتبقي تحت التحصيل</span>
          <div className="text-xl font-black font-mono text-amber-600 mt-1">
            {totalRemaining.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم الطلب، اسم العميل، كود العميل (TOP 001)، أو رقم الشحنة..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={siteFilter}
            onChange={e => setSiteFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">جميع المواقع</option>
            <option value="SHEIN">شي ان (SHEIN)</option>
            <option value="AliExpress">علي إكسبرس (AliExpress)</option>
            <option value="موقع آخر">موقع آخر</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="pending">قيد المعالجة</option>
            <option value="purchased">تم الشراء</option>
            <option value="shipped">في الشحن</option>
            <option value="delivered">تم التسليم</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {/* Orders Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            لا توجد طلبات مطابقة لمعايير البحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">رقم الطلب</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الموقع والشحنة</th>
                  <th className="py-3 px-4">القطع</th>
                  <th className="py-3 px-4">الإجمالي</th>
                  <th className="py-3 px-4">المدفوع</th>
                  <th className="py-3 px-4">المتبقي</th>
                  <th className="py-3 px-4">رسوم التوصيل</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{order.customerName}</div>
                        <span className="text-[10px] font-mono text-slate-400">{order.customerCode}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700 block">{order.site}</span>
                        {order.shipmentNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">شحنة #{order.shipmentNumber}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        {order.itemsCount} قطع
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {order.totalAmount.toLocaleString()} ريال
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        {order.paidAmount.toLocaleString()} ريال
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {order.remainingAmount > 0 ? (
                          <span className="text-amber-600">{order.remainingAmount.toLocaleString()} ريال</span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            مسدد
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {order.deliveryFee > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{order.deliveryFee.toLocaleString()}</span>
                            {order.deliveryFeeCollectionStatus === 'collected' ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                تم التحصيل
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeliveryFeeCollect(order.id)}
                                className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold hover:bg-amber-100 cursor-pointer"
                              >
                                تحصيل
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={order.status}
                          onChange={e => updateOrderStatus(order.id, e.target.value as Order['status'])}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 cursor-pointer font-medium"
                        >
                          <option value="pending">قيد المعالجة</option>
                          <option value="purchased">تم الشراء</option>
                          <option value="shipped">في الشحن</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {order.remainingAmount > 0 && onOpenPaymentForOrder && (
                            <button
                              onClick={() => onOpenPaymentForOrder(order)}
                              className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors cursor-pointer"
                              title="سند تحصيل دفعة"
                            >
                              قبض
                            </button>
                          )}
                          {(onViewInvoice || onPrintInvoice) && (
                            <button
                              onClick={() => {
                                if (onViewInvoice) onViewInvoice(order);
                                else if (onPrintInvoice) onPrintInvoice(order);
                              }}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="عرض وطباعة فاتورة الطلب"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                            title="تعديل بيانات الطلب وقيده المحاسبي"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingOrder(order)}
                            className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                            title="حذف الطلب وقيوده وسنداته المتزامنة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={updated => {
            updateOrder(updated);
            setEditingOrder(null);
          }}
        />
      )}

      {/* Cascading Delete Order Warning Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">حذف الطلب والترابط المحاسبي</h3>
                <p className="text-xs text-slate-500">حذف متزامن ذكي (Cascading Deletion)</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between font-bold text-slate-800">
                <span>رقم الطلب:</span>
                <span className="font-mono text-amber-600">#{deletingOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>العميل:</span>
                <span className="font-bold">{deletingOrder.customerName}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>إجمالي الفاتورة:</span>
                <span className="font-mono text-rose-600">{deletingOrder.totalAmount?.toLocaleString()} ريال</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
              <span className="font-bold block">⚠️ سيقوم النظام تلقائياً وبشكل فوري بما يلي:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pr-1">
                <li>حذف قيد المبيعات المحاسبي التابع لهذا الطلب كلياً.</li>
                <li>حذف سندات القبض والدفعات المسجلة للطلب مع قيودها وحركاتها المالية.</li>
                <li>إعادة احتساب رصيد العميل ورصيد الصندوق/البنك لمنع أي قيود معلقة (No Orphan Entries).</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteOrder(deletingOrder.id);
                  setDeletingOrder(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-xs cursor-pointer"
              >
                تأكيد الحذف التام
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: EDIT ORDER MODAL
// =====================================================================
interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSave: (updated: Order) => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, onClose, onSave }) => {
  const [subtotal, setSubtotal] = useState<number>(order.subtotal || 0);
  const [shippingFee, setShippingFee] = useState<number>(order.shippingFee || 0);
  const [discount, setDiscount] = useState<number>(order.discount || 0);
  const [deliveryFee, setDeliveryFee] = useState<number>(order.deliveryFee || 0);
  const [site, setSite] = useState(order.site || 'SHEIN');
  const [notes, setNotes] = useState(order.notes || '');

  const computedTotal = Math.max(0, subtotal + shippingFee - discount);
  const paid = order.paidAmount || 0;
  const remaining = Math.max(0, computedTotal - paid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...order,
      subtotal,
      shippingFee,
      discount,
      deliveryFee,
      site,
      notes,
      totalAmount: computedTotal,
      remainingAmount: remaining
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">تعديل الطلب #{order.orderNumber}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">موقع الشراء:</label>
              <select
                value={site}
                onChange={e => setSite(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 font-bold"
              >
                <option value="SHEIN">SHEIN</option>
                <option value="AliExpress">AliExpress</option>
                <option value="Amazon">Amazon</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">قيمة المنتجات (Subtotal):</label>
              <input
                type="number"
                min="0"
                value={subtotal}
                onChange={e => setSubtotal(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">أجور الشحن:</label>
              <input
                type="number"
                min="0"
                value={shippingFee}
                onChange={e => setShippingFee(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">الخصم:</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">رسوم التوصيل:</label>
              <input
                type="number"
                min="0"
                value={deliveryFee}
                onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">ملاحظات الطلب:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2"
            />
          </div>

          {/* Real-time calculated total */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between font-mono font-bold">
            <span className="font-sans text-amber-900">الإجمالي الجديد للفاتورة والقيد المحاسبي:</span>
            <span className="text-base text-amber-900">{computedTotal.toLocaleString()} ريال</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition shadow-xs cursor-pointer"
            >
              حفظ وتحديث القيد المحاسبي
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

