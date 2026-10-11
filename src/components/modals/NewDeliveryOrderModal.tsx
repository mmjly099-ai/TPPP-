import React, { useState } from 'react';
import {
  X,
  Bike,
  Search,
  Package,
  Phone,
  MapPin,
  DollarSign,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order, Courier } from '../../types';

interface NewDeliveryOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedOrderId?: number;
}

export const NewDeliveryOrderModal: React.FC<NewDeliveryOrderModalProps> = ({
  isOpen,
  onClose,
  preselectedOrderId
}) => {
  const { orders, customers, couriers, accounts, shipments, createDeliveryOrder, showNotification } = useStore();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(preselectedOrderId || null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [selectedCourierId, setSelectedCourierId] = useState<number>(couriers[0]?.id || 0);

  // Manual or fetched fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [governorate, setGovernorate] = useState('صنعاء');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [orderOriginalValue, setOrderOriginalValue] = useState<number>(0);
  const [orderRemainingAmount, setOrderRemainingAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(1500);
  const [collectionMethod, setCollectionMethod] = useState<'cash_to_courier' | 'transfer_to_wallet' | 'waived' | 'unassigned'>('cash_to_courier');
  const [walletId, setWalletId] = useState<number>(accounts.find(a => a.type === 'محفظة')?.id || accounts[0]?.id || 0);
  const [walletReference, setWalletReference] = useState('');
  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Handle selecting an existing TOP STORE order
  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    const customer = customers.find(c => c.id === order.customerId);
    
    // Find shipment if order is associated with one
    const relatedShipment = shipments.find(s => s.orderIds && s.orderIds.includes(order.id));
    
    setCustomerName(customer?.name || order.customerName || 'عميلة');
    setCustomerPhone(customer?.phone || '');
    setGovernorate(customer?.governorate || 'صنعاء');
    setDistrict(customer?.city || '');
    setAddress(customer?.pickupLocation || customer?.governorate || 'صنعاء');
    setShipmentNumber(relatedShipment?.shipmentNumber || '');
    setOrderOriginalValue(order.totalAmount || 0);
    setOrderRemainingAmount(Math.max(0, order.remainingAmount || 0));

    // Choose courier's default fee or 1500
    const courier = couriers.find(c => c.id === selectedCourierId);
    setDeliveryFee(order.deliveryFee || courier?.defaultDeliveryFee || 1500);
  };

  const handleCourierChange = (cId: number) => {
    setSelectedCourierId(cId);
    const courier = couriers.find(c => c.id === cId);
    if (courier && !deliveryFee) {
      setDeliveryFee(courier.defaultDeliveryFee || 1500);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showNotification('يرجى إدخال اسم العميلة', 'warning');
      return;
    }
    if (!selectedCourierId) {
      showNotification('يرجى اختيار الموصل المسؤول', 'warning');
      return;
    }

    createDeliveryOrder({
      orderId: selectedOrderId,
      orderNumber: selectedOrderId ? orders.find(o => o.id === selectedOrderId)?.orderNumber : undefined,
      shipmentNumber: shipmentNumber.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      governorate: governorate.trim(),
      district: district.trim(),
      address: address.trim(),
      courierId: selectedCourierId,
      dispatchDate,
      orderOriginalValue,
      orderRemainingAmount,
      deliveryFee: Number(deliveryFee) || 1500,
      collectionMethod,
      walletId: collectionMethod === 'transfer_to_wallet' ? walletId : undefined,
      walletReference: collectionMethod === 'transfer_to_wallet' ? walletReference.trim() : undefined,
      notes: notes.trim()
    });

    onClose();
  };

  if (!isOpen) return null;

  // Filter existing orders
  const filteredOrders = orders
    .filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    .filter(o => {
      const term = orderSearchTerm.trim().toLowerCase();
      if (!term) return true;
      const num = String(o.orderNumber || o.id).toLowerCase();
      const name = String(o.customerName || '').toLowerCase();
      return num.includes(term) || name.includes(term);
    })
    .slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Navy & Gold Brand */}
        <div className="bg-[#1A3668] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-[#C5A059] text-slate-950 flex items-center justify-center font-bold shadow-lg">
              <Bike className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                إسناد وتسجيل طلب توصيل جديد للعميلة
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                TOP STORE | نظام التوزيع وتسليم طلبات شي إن وفصل حسابات التوصيل
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: Link with Existing TOP STORE Order */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#1A3668]" />
                الربط مع طلبية موجودة في نظام TOP STORE (جلب بيانات العميلة آلياً):
              </label>
              {selectedOrderId && (
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  إلغاء الربط والكتابة يدوياً
                </button>
              )}
            </div>

            {!selectedOrderId ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب أو اسم العميلة لجلب البيانات تلقائياً..."
                  value={orderSearchTerm}
                  onChange={e => setOrderSearchTerm(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                />
                {orderSearchTerm.trim() && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {filteredOrders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => handleSelectOrder(order)}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-[#1A3668] hover:bg-blue-50/50 cursor-pointer transition-all flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">#{order.orderNumber}</span>
                          <span className="text-slate-600 block">{order.customerName}</span>
                        </div>
                        <div className="text-left font-bold text-emerald-700">
                          {order.totalAmount.toLocaleString()} ريال
                        </div>
                      </div>
                    ))}
                    {filteredOrders.length === 0 && (
                      <div className="col-span-2 text-center py-2 text-xs text-slate-500">
                        لا توجد طلبات متطابقة مع البحث
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    تم الربط مع الطلب #{orders.find(o => o.id === selectedOrderId)?.orderNumber} - {customerName}
                  </span>
                </div>
                <span className="text-xs font-semibold text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  قيمة الطلب: {orderOriginalValue.toLocaleString()} ريال
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Customer & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم العميلة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="اسم العميلة الكامل"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الهاتف <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="77XXXXXXX"
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668] text-right"
                />
              </div>
            </div>

            {/* Governorate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المحافظة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={governorate}
                onChange={e => setGovernorate(e.target.value)}
                placeholder="صنعاء، عدن، تعز..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المديرية / الحي
              </label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="معين، السبعين، كريتر..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>

            {/* Full Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العنوان التفصيلي ونقطة الاستلام <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="الشارع، المعلم القريب، رقم المنزل..."
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                />
              </div>
            </div>

            {/* Shipment Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم شحنة الطلب (إن وجد)
              </label>
              <input
                type="text"
                value={shipmentNumber}
                onChange={e => setShipmentNumber(e.target.value)}
                placeholder="مثال: 2000 أو المهيب #1"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>

            {/* Assigned Courier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الموصل المسؤول <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedCourierId}
                onChange={e => handleCourierChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
              >
                {couriers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.zone || c.coverageZones})
                  </option>
                ))}
              </select>
            </div>

            {/* Dispatch Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ استلام الموصل للطلب
              </label>
              <input
                type="date"
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>

          </div>

          {/* Section 3: Financial & Delivery Fee Separation (أهم نقطة محاسبية) */}
          <div className="bg-amber-50/60 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-4">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm border-b border-amber-200/80 pb-2">
              <DollarSign className="w-5 h-5 text-[#C5A059]" />
              <span>فصل الحسابات المالية: قيمة منتجات شي إن مقابل أجرة التوصيل</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Order Original Value (Reference Only) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="block text-[11px] text-slate-500 font-semibold mb-1">
                  قيمة الطلب الأصلية (مرجعية فقط)
                </span>
                <div className="text-base font-black text-slate-800">
                  {orderOriginalValue.toLocaleString()} ريال
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  لا تُحسب ضمن إيرادات التوصيل
                </span>
              </div>

              {/* Delivery Fee */}
              <div className="p-3 bg-white rounded-xl border border-amber-300 ring-2 ring-amber-400/20">
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  أجرة التوصيل المستحقة (ريال) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-amber-700 mt-1 block font-medium">
                  حساب مستقل مفصول تماماً عن أرباح الوساطة
                </span>
              </div>

              {/* Collection Method */}
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  طريقة تحصيل أجرة التوصيل <span className="text-rose-500">*</span>
                </label>
                <select
                  value={collectionMethod}
                  onChange={e => setCollectionMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
                >
                  <option value="cash_to_courier">1. العميلة تدفع نقداً للموصل (عهدة كاش)</option>
                  <option value="transfer_to_wallet">2. العميلة تحول لمحفظة TOP STORE</option>
                  <option value="waived">3. معفاة / توصيل مجاني</option>
                  <option value="unassigned">4. لم تحدد بعد (قيد المتابعة)</option>
                </select>
              </div>

            </div>

            {/* Condition if transferred to wallet */}
            {collectionMethod === 'transfer_to_wallet' && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-blue-900 text-xs font-bold">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>تحديد المحفظة المستقبلة للحوالة (زيادة رصيد المحفظة بحساب التوصيل):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المحفظة المستلمة</label>
                    <select
                      value={walletId}
                      onChange={e => setWalletId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم مرجع الحوالة (إن وجد)</label>
                    <input
                      type="text"
                      value={walletReference}
                      onChange={e => setWalletReference(e.target.value)}
                      placeholder="رقم الإشعار / مرجع التحويل"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Condition if cash to courier notice */}
            {collectionMethod === 'cash_to_courier' && (
              <div className="text-xs text-amber-800 bg-amber-100/60 p-2.5 rounded-xl border border-amber-300/60 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  المبلغ سيُقيد كعهدة نقدية في ذمة الموصل ولن يُحتسب في أي محفظة أو إيراد للوساطة حتى يتم توريده رسمياً.
                </span>
              </div>
            )}

          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تعليمات خاصة بالطلب أو مواعيد التسليم..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Bike className="w-4 h-4 text-[#C5A059]" />
              <span>تأكيد إسناد طلب التوصيل</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
